const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "for",
  "from",
  "how",
  "i",
  "in",
  "is",
  "latest",
  "me",
  "of",
  "on",
  "or",
  "recent",
  "studies",
  "study",
  "the",
  "to",
  "trial",
  "trials",
  "what",
  "with",
]);

const INTENT_ALIASES = {
  "treatment-evidence": ["treatment", "therapy", "clinical study"],
  "supplement-evidence": ["supplement", "nutrition", "vitamin"],
  "clinical-trials": ["clinical trial", "recruiting study", "interventional study"],
  publications: ["publication", "journal article", "research paper"],
};

const queryExpansionService = {
  expand(payload = {}) {
    const disease = normalizePhrase(payload.disease);
    const query = normalizePhrase(payload.query || payload.message);
    const topic = normalizePhrase(payload.topic);
    const intent = normalizePhrase(payload.intent);
    const location = normalizePhrase(payload.location);
    const patientName = normalizePhrase(payload.patientName);

    const baseTopic = topic || query || intent;
    const keywordTokens = buildKeywordTokens([disease, baseTopic, intent, location]);
    const intentTerms = deriveIntentTerms(intent, baseTopic);

    const publicationQueries = buildPublicationQueries({
      disease,
      baseTopic,
      location,
      intentTerms,
      keywordTokens,
    });
    const clinicalTrialQueries = buildClinicalTrialQueries({
      disease,
      baseTopic,
      location,
      intentTerms,
      keywordTokens,
    });

    return {
      raw: payload,
      normalized: {
        patientName,
        disease,
        query,
        topic: baseTopic,
        intent,
        location,
      },
      combined: [baseTopic, disease, location].filter(Boolean).join(" | "),
      publicationSearch: publicationQueries[0] || [baseTopic, disease].filter(Boolean).join(" AND "),
      clinicalTrialSearch: clinicalTrialQueries[0] || [disease, baseTopic, location].filter(Boolean).join(" | "),
      publicationQueries,
      clinicalTrialQueries,
      keywordTokens,
      intentTerms,
      filters: {
        disease,
        location,
      },
    };
  },
};

function buildPublicationQueries({ disease, baseTopic, location, intentTerms, keywordTokens }) {
  return uniqueNonEmpty([
    joinWithAnd([baseTopic, disease]),
    joinWithAnd([baseTopic, disease, intentTerms[0]]),
    joinWithAnd([disease, intentTerms[0], "systematic review"]),
    joinWithAnd([disease, baseTopic, "clinical study"]),
    joinWithAnd([baseTopic, disease, location]),
    keywordTokens.slice(0, 6).join(" "),
  ]);
}

function buildClinicalTrialQueries({ disease, baseTopic, location, intentTerms, keywordTokens }) {
  return uniqueNonEmpty([
    joinWithSpace([disease, baseTopic]),
    joinWithSpace([disease, baseTopic, "clinical trial"]),
    joinWithSpace([disease, intentTerms[0], "recruiting"]),
    joinWithSpace([disease, baseTopic, location]),
    keywordTokens.slice(0, 6).join(" "),
  ]);
}

function deriveIntentTerms(intent, topic) {
  const normalizedIntent = normalizePhrase(intent);
  const aliases = INTENT_ALIASES[normalizedIntent];

  if (aliases?.length) {
    return aliases;
  }

  if (/(trial|recruit)/i.test(topic)) {
    return ["clinical trial", "recruiting study"];
  }

  if (/(vitamin|supplement|nutrition|diet)/i.test(topic)) {
    return ["supplement", "nutrition", "vitamin"];
  }

  if (/(surgery|therapy|treat|drug|management)/i.test(topic)) {
    return ["treatment", "therapy", "clinical study"];
  }

  return ["research evidence", "clinical study"];
}

function buildKeywordTokens(values) {
  return uniqueNonEmpty(
    values
      .flatMap((value) => String(value || "").toLowerCase().split(/[^a-z0-9]+/))
      .map((token) => token.trim())
      .filter((token) => token && !STOP_WORDS.has(token))
  );
}

function joinWithAnd(parts) {
  return uniqueNonEmpty(parts).join(" AND ");
}

function joinWithSpace(parts) {
  return uniqueNonEmpty(parts).join(" ");
}

function uniqueNonEmpty(values) {
  return [...new Set(values.map(normalizePhrase).filter(Boolean))];
}

function normalizePhrase(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

module.exports = { queryExpansionService };
