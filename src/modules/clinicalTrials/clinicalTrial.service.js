const { AppError } = require("../../utils/appError");
const { HTTP_STATUS } = require("../../constants/httpStatus");
const { clinicalTrialsClient } = require("../../services/external/clinicalTrials.client");
const { queryExpansionService } = require("../researchPipeline/queryExpansion.service");
const { retrievalService } = require("../researchPipeline/retrieval.service");
const { rankingService } = require("../researchPipeline/ranking.service");

const clinicalTrialService = {
  describeModule() {
    return {
      module: "clinical-trials",
      provider: clinicalTrialsClient.describe(),
      capabilities: [
        "broad-retrieval",
        "recruiting-priority-ranking",
        "eligibility-extraction",
        "location-and-contact-formatting",
      ],
      endpoints: {
        search: "/api/v1/clinical-trials/search",
      },
      filters: ["page", "limit", "status", "phase", "studyType", "recruitingOnly", "location"],
    };
  },

  async searchClinicalTrials(payload = {}) {
    const rankingContext = buildClinicalTrialContext(payload);

    if (!rankingContext.disease && !rankingContext.topic && !rankingContext.message) {
      throw new AppError(
        "Provide at least one of disease, query, message, or topic to search clinical trials.",
        HTTP_STATUS.BAD_REQUEST
      );
    }

    const expandedQuery = queryExpansionService.expand(rankingContext);
    const retrievalResult = await retrievalService.retrieve(expandedQuery, {
      ...rankingContext,
      requestedSource: "clinical-trials",
    });
    const rankedEvidence = rankingService.rank(retrievalResult, {
      ...rankingContext,
      outputLimits: {
        clinicalTrials: rankingContext.page * rankingContext.limit,
      },
    });
    const filteredItems = filterClinicalTrials(rankedEvidence.clinicalTrials, rankingContext);
    const paginated = paginate(filteredItems, rankingContext.page, rankingContext.limit);

    return {
      module: "clinical-trials",
      query: {
        disease: rankingContext.disease,
        topic: rankingContext.topic,
        intent: rankingContext.intent,
        location: rankingContext.location,
        status: rankingContext.status || null,
      },
      appliedFilters: {
        page: rankingContext.page,
        limit: rankingContext.limit,
        status: rankingContext.status,
        phase: rankingContext.phase,
        studyType: rankingContext.studyType,
        recruitingOnly: rankingContext.recruitingOnly,
        location: rankingContext.location,
      },
      expandedQuery: {
        clinicalTrialSearch: expandedQuery.clinicalTrialSearch,
        clinicalTrialQueries: expandedQuery.clinicalTrialQueries,
        keywordTokens: expandedQuery.keywordTokens,
      },
      retrievalMeta: rankedEvidence.meta,
      items: paginated.items.map((item) => formatClinicalTrial(item, rankingContext)),
      total: filteredItems.length,
      page: paginated.page,
      limit: paginated.limit,
      hasMore: paginated.hasMore,
    };
  },
};

function buildClinicalTrialContext(payload) {
  const normalized = queryExpansionService.expand(payload).normalized;

  return {
    ...payload,
    ...normalized,
    requestedSource: "clinical-trials",
    message: payload.message || payload.query || normalized.topic,
    topic: normalized.topic,
    disease: normalized.disease,
    location: normalized.location,
    intent: normalized.intent || payload.intent || "clinical-trials",
    status: normalizePhrase(payload.status),
    phase: normalizePhrase(payload.phase),
    studyType: normalizePhrase(payload.studyType),
    recruitingOnly: String(payload.recruitingOnly || "").toLowerCase() === "true" || payload.recruitingOnly === true,
    page: Math.max(1, Number(payload.page) || 1),
    limit: Math.min(50, Math.max(1, Number(payload.limit) || 10)),
  };
}

function formatClinicalTrial(item, context) {
  return {
    id: item.sourceId,
    title: item.title,
    recruitingStatus: item.status || "UNKNOWN",
    phase: item.phase || "",
    studyType: item.studyType || "",
    eligibilityCriteria: item.eligibility || "",
    location: item.location || "",
    contactInformation: item.contact || "",
    source: item.platform,
    url: item.url || "",
    summary: item.snippet || "",
    score: item.score,
    publicationYear: item.year || null,
    tags: Array.isArray(item.tags) ? item.tags : [],
    saveSupported: true,
    relevance: {
      disease: context.disease || null,
      topic: context.topic || null,
      locationPreference: context.location || null,
    },
  };
}

function filterClinicalTrials(items, context) {
  let filtered = [...items];

  if (context.status) {
    filtered = filtered.filter((item) => String(item.status || "").toLowerCase() === context.status.toLowerCase());
  }

  if (context.recruitingOnly) {
    filtered = filtered.filter((item) => String(item.status || "").toUpperCase() === "RECRUITING");
  }

  if (context.phase) {
    filtered = filtered.filter((item) => String(item.phase || "").toLowerCase().includes(context.phase.toLowerCase()));
  }

  if (context.studyType) {
    filtered = filtered.filter((item) =>
      String(item.studyType || "").toLowerCase().includes(context.studyType.toLowerCase())
    );
  }

  if (context.location) {
    filtered = filtered.filter((item) => String(item.location || "").toLowerCase().includes(context.location.toLowerCase()));
  }

  return filtered.sort((left, right) => (right.score || 0) - (left.score || 0));
}

function paginate(items, page, limit) {
  const start = (page - 1) * limit;
  const pageItems = items.slice(start, start + limit);
  return {
    items: pageItems,
    page,
    limit,
    hasMore: start + pageItems.length < items.length,
  };
}

function normalizePhrase(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

module.exports = { clinicalTrialService };
