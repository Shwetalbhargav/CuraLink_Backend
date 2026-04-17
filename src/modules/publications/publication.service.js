const { AppError } = require("../../utils/appError");
const { HTTP_STATUS } = require("../../constants/httpStatus");
const { openAlexClient } = require("../../services/external/openAlex.client");
const { pubMedClient } = require("../../services/external/pubMed.client");
const { queryExpansionService } = require("../researchPipeline/queryExpansion.service");
const { retrievalService } = require("../researchPipeline/retrieval.service");
const { rankingService } = require("../researchPipeline/ranking.service");

const publicationService = {
  describeModule() {
    return {
      module: "publications",
      providers: [openAlexClient.describe(), pubMedClient.describe()],
      capabilities: [
        "broad-retrieval",
        "cross-source-normalization",
        "deduplication",
        "ranking-ready-evidence",
      ],
      endpoints: {
        search: "/api/v1/publications/search",
      },
      filters: ["page", "limit", "sort", "dateFrom", "dateTo", "studyType", "population", "source"],
    };
  },

  async searchPublications(payload = {}) {
    const rankingContext = buildPublicationContext(payload);

    if (!rankingContext.disease && !rankingContext.topic && !rankingContext.message) {
      throw new AppError(
        "Provide at least one of disease, query, message, or topic to search publications.",
        HTTP_STATUS.BAD_REQUEST
      );
    }

    const expandedQuery = queryExpansionService.expand(rankingContext);
    const retrievalResult = await retrievalService.retrieve(expandedQuery, {
      ...rankingContext,
      requestedSource: "publications",
    });
    const rankedEvidence = rankingService.rank(retrievalResult, {
      ...rankingContext,
      outputLimits: {
        publications: rankingContext.page * rankingContext.limit,
      },
    });
    const filteredItems = filterPublications(rankedEvidence.publications, rankingContext);
    const paginated = paginate(filteredItems, rankingContext.page, rankingContext.limit);

    return {
      module: "publications",
      query: {
        disease: rankingContext.disease,
        topic: rankingContext.topic,
        intent: rankingContext.intent,
        location: rankingContext.location,
      },
      appliedFilters: {
        page: rankingContext.page,
        limit: rankingContext.limit,
        sort: rankingContext.sort,
        dateFrom: rankingContext.dateFrom,
        dateTo: rankingContext.dateTo,
        studyType: rankingContext.studyType,
        population: rankingContext.population,
        source: rankingContext.source,
      },
      expandedQuery: {
        publicationSearch: expandedQuery.publicationSearch,
        publicationQueries: expandedQuery.publicationQueries,
        keywordTokens: expandedQuery.keywordTokens,
      },
      retrievalMeta: rankedEvidence.meta,
      items: paginated.items.map(formatPublication),
      total: filteredItems.length,
      page: paginated.page,
      limit: paginated.limit,
      hasMore: paginated.hasMore,
    };
  },
};

function buildPublicationContext(payload) {
  const normalized = queryExpansionService.expand(payload).normalized;

  return {
    ...payload,
    ...normalized,
    requestedSource: "publications",
    message: payload.message || payload.query || normalized.topic,
    topic: normalized.topic,
    disease: normalized.disease,
    location: normalized.location,
    intent: normalized.intent || payload.intent || "publications",
    page: Math.max(1, Number(payload.page) || 1),
    limit: Math.min(50, Math.max(1, Number(payload.limit) || 10)),
    sort: normalizePhrase(payload.sort).toLowerCase() || "relevance",
    dateFrom: Number(payload.dateFrom) || null,
    dateTo: Number(payload.dateTo) || null,
    studyType: normalizePhrase(payload.studyType).toLowerCase(),
    population: normalizePhrase(payload.population).toLowerCase(),
    source: normalizePhrase(payload.source),
  };
}

function formatPublication(item) {
  return {
    id: item.sourceId,
    title: item.title,
    abstract: item.snippet || "",
    authors: Array.isArray(item.authors) ? item.authors : [],
    publicationYear: item.year || null,
    journal: item.journal || "",
    source: item.platform,
    url: item.url || "",
    score: item.score,
    snippet: item.snippet || "",
    tags: Array.isArray(item.tags) ? item.tags : [],
    saveSupported: true,
  };
}

function filterPublications(items, context) {
  let filtered = [...items];

  if (context.dateFrom) {
    filtered = filtered.filter((item) => !item.year || item.year >= context.dateFrom);
  }

  if (context.dateTo) {
    filtered = filtered.filter((item) => !item.year || item.year <= context.dateTo);
  }

  if (context.source) {
    filtered = filtered.filter((item) => String(item.platform || "").toLowerCase() === context.source.toLowerCase());
  }

  if (context.population) {
    filtered = filtered.filter((item) => (item.tags || []).includes(context.population));
  }

  if (context.studyType) {
    filtered = filtered.filter((item) => (item.tags || []).includes(context.studyType));
  }

  return sortPublications(filtered, context.sort);
}

function sortPublications(items, sort) {
  const sorted = [...items];

  if (sort === "newest") {
    return sorted.sort((left, right) => (right.year || 0) - (left.year || 0));
  }

  if (sort === "oldest") {
    return sorted.sort((left, right) => (left.year || 0) - (right.year || 0));
  }

  return sorted.sort((left, right) => (right.score || 0) - (left.score || 0));
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

module.exports = { publicationService };
