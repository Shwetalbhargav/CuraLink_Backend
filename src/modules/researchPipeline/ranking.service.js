const rankingService = {
  describePlan() {
    return {
      strategy: "hybrid",
      factors: [
        "query-term-coverage",
        "disease-match",
        "recency",
        "source-credibility",
        "clinical-context",
        "recruiting-priority",
      ],
      outputLimit: {
        publications: 6,
        clinicalTrials: 4,
      },
    };
  },

  rank(retrievalResult, context = {}) {
    const publicationLimit = Number(context.outputLimits?.publications) || 6;
    const clinicalTrialLimit = Number(context.outputLimits?.clinicalTrials) || 4;
    const publications = retrievalResult.publications
      .filter((item) => shouldKeepEvidence(item, context))
      .map((item) => buildRankedEvidence(item, context))
      .sort((left, right) => right.score - left.score)
      .slice(0, publicationLimit);

    const clinicalTrials = retrievalResult.clinicalTrials
      .filter((item) => shouldKeepEvidence(item, context))
      .map((item) => buildRankedEvidence(item, context))
      .sort((left, right) => right.score - left.score)
      .slice(0, clinicalTrialLimit);

    return {
      publications,
      clinicalTrials,
      meta: {
        totals: {
          publications: retrievalResult.publications.length,
          clinicalTrials: retrievalResult.clinicalTrials.length,
        },
        returned: {
          publications: publications.length,
          clinicalTrials: clinicalTrials.length,
        },
        diagnostics: retrievalResult.diagnostics,
      },
    };
  },
};

function scoreEvidence(item, context) {
  const relevance = buildRelevanceSignals(item, context);
  const yearScore = item.year ? Math.max(0, item.year - 2018) * 0.08 : 0;
  const treatmentKeywordScore =
    context.intent === "treatment-evidence" && relevance.matchFlags.treatmentKeyword ? 0.9 : 0;
  const supplementKeywordScore =
    context.intent === "supplement-evidence" && relevance.matchFlags.supplementKeyword ? 1 : 0;
  const topicPenalty =
    context.topic && item.type === "publication" && !relevance.matchFlags.topicPhrase && relevance.topicTokenCoverage < 0.2
      ? -2.4
      : 0;
  const diseasePenalty =
    context.disease && item.type === "publication" && !relevance.matchFlags.diseasePhrase && relevance.diseaseTokenCoverage < 0.5
      ? -1.8
      : 0;
  const sourceCredibilityScore = sourceWeight(item.platform);
  const trialStatusScore = item.type === "clinical-trial" ? clinicalTrialStatusWeight(item.status) : 0;

  return (
    Number(item.rawScore || 0) +
    yearScore +
    relevance.signalScores.disease +
    relevance.signalScores.location +
    relevance.signalScores.topic +
    relevance.signalScores.tokenCoverage +
    sourceCredibilityScore +
    trialStatusScore +
    treatmentKeywordScore +
    supplementKeywordScore +
    topicPenalty +
    diseasePenalty
  );
}

function shouldKeepEvidence(item, context) {
  const relevance = buildRelevanceSignals(item, context);

  if (
    item.type === "publication" &&
    context.disease &&
    !relevance.matchFlags.diseasePhrase &&
    relevance.diseaseTokenCoverage < 0.5 &&
    (context.intent === "supplement-evidence" || context.intent === "treatment-evidence")
  ) {
    return false;
  }

  if (context.intent === "supplement-evidence") {
    return relevance.matchFlags.supplementKeyword;
  }

  if (context.intent === "treatment-evidence") {
    return relevance.matchFlags.treatmentKeyword && relevance.topicTokenCoverage >= 0.2;
  }

  if (item.type === "publication" && context.topic) {
    return (
      relevance.matchFlags.topicPhrase ||
      relevance.topicTokenCoverage >= 0.35 ||
      (relevance.matchFlags.diseasePhrase && relevance.topicTokenCoverage >= 0.2)
    );
  }

  return true;
}

function buildRankedEvidence(item, context) {
  const relevance = buildRelevanceSignals(item, context);
  const score = scoreEvidence(item, context);

  return {
    ...item,
    score: Number(score.toFixed(3)),
    ranking: {
      confidence: deriveConfidence(score, relevance, item),
      explanation: buildRankingExplanation(relevance, item),
      matchFlags: relevance.matchFlags,
      tokenCoverage: {
        topic: relevance.topicTokenCoverage,
        disease: relevance.diseaseTokenCoverage,
        combined: relevance.combinedTokenCoverage,
      },
    },
  };
}

function buildRelevanceSignals(item, context) {
  const text = `${item.title} ${item.snippet} ${item.journal || ""} ${item.location || ""}`.toLowerCase();
  const diseasePhrase = normalizePhrase(context.disease);
  const topicPhrase = normalizePhrase(context.topic);
  const locationPhrase = normalizePhrase(context.location);
  const diseaseTokenCoverage = calculateTokenCoverage(text, context.disease);
  const topicTokenCoverage = calculateTokenCoverage(text, context.topic);
  const combinedTokenCoverage = calculateTokenCoverage(text, [context.disease, context.topic, context.message].join(" "));

  return {
    text,
    diseaseTokenCoverage,
    topicTokenCoverage,
    combinedTokenCoverage,
    matchFlags: {
      diseasePhrase: Boolean(diseasePhrase && text.includes(diseasePhrase)),
      topicPhrase: Boolean(topicPhrase && text.includes(topicPhrase)),
      locationPhrase:
        Boolean(locationPhrase && text.includes(locationPhrase)) ||
        Boolean(context.location && String(item.location || "").toLowerCase().includes(context.location.toLowerCase())),
      treatmentKeyword: /(treat|therapy|immunotherapy|chemotherapy|surgery|trial|targeted|device|stimulation)/.test(text),
      supplementKeyword: /(vitamin|calcitriol|supplement|dietary|nutrition|omega|magnesium)/.test(text),
    },
    signalScores: {
      disease:
        diseasePhrase && text.includes(diseasePhrase)
          ? 1.8
          : diseaseTokenCoverage >= 0.75
            ? 1.2
            : diseaseTokenCoverage >= 0.5
              ? 0.6
              : 0,
      topic:
        topicPhrase && text.includes(topicPhrase)
          ? 1.5
          : topicTokenCoverage >= 0.6
            ? 1.1
            : topicTokenCoverage >= 0.35
              ? 0.6
              : 0,
      location: locationPhrase && text.includes(locationPhrase) ? 0.8 : 0,
      tokenCoverage: combinedTokenCoverage * 1.8,
    },
  };
}

function calculateTokenCoverage(text, value) {
  const tokens = tokenize(value);

  if (!tokens.length) {
    return 0;
  }

  const matched = tokens.filter((token) => text.includes(token)).length;
  return matched / tokens.length;
}

function tokenize(value) {
  return [...new Set(String(value || "").toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length > 2))];
}

function normalizePhrase(value) {
  return String(value || "").replace(/\s+/g, " ").trim().toLowerCase();
}

function deriveConfidence(score, relevance, item) {
  if (
    item.type === "clinical-trial" &&
    (relevance.matchFlags.diseasePhrase || relevance.diseaseTokenCoverage >= 0.5) &&
    (relevance.matchFlags.topicPhrase || relevance.topicTokenCoverage >= 0.2)
  ) {
    return score >= 4.2 ? "high" : "medium";
  }

  if (
    relevance.matchFlags.diseasePhrase &&
    (relevance.matchFlags.topicPhrase || relevance.topicTokenCoverage >= 0.5) &&
    score >= 4.5
  ) {
    return "high";
  }

  if (
    (relevance.matchFlags.diseasePhrase || relevance.diseaseTokenCoverage >= 0.5) &&
    relevance.topicTokenCoverage >= 0.25 &&
    score >= 2.8
  ) {
    return "medium";
  }

  return "low";
}

function buildRankingExplanation(relevance, item) {
  const reasons = [];

  if (relevance.matchFlags.diseasePhrase) {
    reasons.push("direct disease match");
  } else if (relevance.diseaseTokenCoverage >= 0.5) {
    reasons.push("partial disease term coverage");
  }

  if (relevance.matchFlags.topicPhrase) {
    reasons.push("direct topic match");
  } else if (relevance.topicTokenCoverage >= 0.35) {
    reasons.push("partial topic coverage");
  }

  if (relevance.matchFlags.locationPhrase && item.type === "clinical-trial") {
    reasons.push("location-aligned trial site");
  }

  if (item.type === "clinical-trial" && item.status) {
    reasons.push(`trial status ${String(item.status).toLowerCase()}`);
  }

  if (!reasons.length) {
    reasons.push("weak lexical match");
  }

  return reasons.join(", ");
}

function sourceWeight(platform) {
  switch (String(platform || "").toLowerCase()) {
    case "pubmed":
      return 1.2;
    case "clinicaltrials.gov":
      return 1.15;
    case "openalex":
      return 0.9;
    default:
      return 0.5;
  }
}

function clinicalTrialStatusWeight(status) {
  switch (String(status || "").toUpperCase()) {
    case "RECRUITING":
      return 1.3;
    case "ACTIVE_NOT_RECRUITING":
      return 1;
    case "NOT_YET_RECRUITING":
      return 0.9;
    case "COMPLETED":
      return 0.7;
    default:
      return 0.3;
  }
}

module.exports = { rankingService };
