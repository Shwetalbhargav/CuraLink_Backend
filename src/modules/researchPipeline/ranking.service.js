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
      .map((item) => ({
        ...item,
        score: scoreEvidence(item, context),
      }))
      .sort((left, right) => right.score - left.score)
      .slice(0, publicationLimit);

    const clinicalTrials = retrievalResult.clinicalTrials
      .filter((item) => shouldKeepEvidence(item, context))
      .map((item) => ({
        ...item,
        score: scoreEvidence(item, context),
      }))
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
  const yearScore = item.year ? Math.max(0, item.year - 2018) * 0.08 : 0;
  const text = `${item.title} ${item.snippet}`.toLowerCase();
  const diseaseScore = context.disease && text.includes(context.disease.toLowerCase()) ? 1.5 : 0;
  const locationScore = context.location && String(item.location || "").toLowerCase().includes(context.location.toLowerCase()) ? 0.8 : 0;
  const topicScore = context.topic && text.includes(context.topic.toLowerCase()) ? 1.2 : 0;
  const tokenCoverageScore = calculateTokenCoverage(text, context) * 2.2;
  const sourceCredibilityScore = sourceWeight(item.platform);
  const trialStatusScore = item.type === "clinical-trial" ? clinicalTrialStatusWeight(item.status) : 0;
  const treatmentKeywordScore =
    context.intent === "treatment-evidence" && /(treat|therapy|immunotherapy|chemotherapy|targeted|surgery)/.test(text)
      ? 0.9
      : 0;
  const supplementKeywordScore =
    context.intent === "supplement-evidence" && /(vitamin|calcitriol|supplement|nutrition|dietary)/.test(text)
      ? 1
      : 0;
  const mismatchPenalty =
    context.topic && !text.includes(context.topic.toLowerCase()) && context.intent === "supplement-evidence" ? -1.5 : 0;

  return (
    Number(item.rawScore || 0) +
    yearScore +
    diseaseScore +
    locationScore +
    topicScore +
    tokenCoverageScore +
    sourceCredibilityScore +
    trialStatusScore +
    treatmentKeywordScore +
    supplementKeywordScore +
    mismatchPenalty
  );
}

function shouldKeepEvidence(item, context) {
  const text = `${item.title} ${item.snippet}`.toLowerCase();

  if (context.disease && !text.includes(context.disease.toLowerCase()) && item.type === "publication") {
    if (context.intent === "supplement-evidence" || context.intent === "treatment-evidence") {
      return false;
    }
  }

  if (context.intent === "supplement-evidence") {
    return /(vitamin|calcitriol|supplement|dietary|nutrition)/.test(text);
  }

  if (context.intent === "treatment-evidence") {
    return /(treat|therapy|immunotherapy|chemotherapy|surgery|trial|targeted)/.test(text);
  }

  return true;
}

function calculateTokenCoverage(text, context) {
  const tokens = [...tokenize(context.disease), ...tokenize(context.topic), ...tokenize(context.message)];

  if (!tokens.length) {
    return 0;
  }

  const matched = tokens.filter((token) => text.includes(token)).length;
  return matched / tokens.length;
}

function tokenize(value) {
  return [...new Set(String(value || "").toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length > 2))];
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
