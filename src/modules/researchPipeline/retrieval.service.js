const { openAlexClient } = require("../../services/external/openAlex.client");
const { pubMedClient } = require("../../services/external/pubMed.client");
const { clinicalTrialsClient } = require("../../services/external/clinicalTrials.client");

const DEFAULT_CANDIDATE_DEPTH = {
  openAlexPerQuery: 25,
  openAlexQueryLimit: 4,
  pubMedRetmax: 25,
  pubMedQueryLimit: 3,
  clinicalTrialsPageSize: 20,
  clinicalTrialQueryLimit: 3,
};

const retrievalService = {
  describePlan(expandedQuery) {
    return {
      candidateDepth: {
        publications:
          DEFAULT_CANDIDATE_DEPTH.openAlexPerQuery * DEFAULT_CANDIDATE_DEPTH.openAlexQueryLimit +
          DEFAULT_CANDIDATE_DEPTH.pubMedRetmax * DEFAULT_CANDIDATE_DEPTH.pubMedQueryLimit,
        clinicalTrials:
          DEFAULT_CANDIDATE_DEPTH.clinicalTrialsPageSize * DEFAULT_CANDIDATE_DEPTH.clinicalTrialQueryLimit,
      },
      sources: ["openalex", "pubmed", "clinical-trials"],
      expandedQuery,
    };
  },

  async retrieve(expandedQuery, context = {}) {
    const publicationQueries = takeQueries(
      expandedQuery.publicationQueries,
      expandedQuery.publicationSearch || expandedQuery.combined,
      DEFAULT_CANDIDATE_DEPTH.openAlexQueryLimit
    );
    const pubMedQueries = takeQueries(
      expandedQuery.publicationQueries,
      expandedQuery.publicationSearch || expandedQuery.combined,
      DEFAULT_CANDIDATE_DEPTH.pubMedQueryLimit
    );
    const clinicalQueries = takeQueries(
      expandedQuery.clinicalTrialQueries,
      expandedQuery.clinicalTrialSearch || expandedQuery.combined,
      DEFAULT_CANDIDATE_DEPTH.clinicalTrialQueryLimit
    );

    const [openAlexResult, pubMedResult, clinicalTrialsResult] = await Promise.allSettled([
      context.requestedSource === "clinical-trials" ? Promise.resolve([]) : retrieveOpenAlex(publicationQueries),
      context.requestedSource === "clinical-trials" ? Promise.resolve([]) : retrievePubMed(pubMedQueries),
      context.requestedSource === "publications"
        ? Promise.resolve([])
        : retrieveClinicalTrials(clinicalQueries, context, expandedQuery),
    ]);

    return {
      publications: dedupeByIdentity([...extractSettled(openAlexResult), ...extractSettled(pubMedResult)]),
      clinicalTrials: dedupeByIdentity(extractSettled(clinicalTrialsResult)),
      diagnostics: {
        openAlex: settleMeta(openAlexResult, publicationQueries),
        pubMed: settleMeta(pubMedResult, pubMedQueries),
        clinicalTrials: settleMeta(clinicalTrialsResult, clinicalQueries),
      },
    };
  },
};

async function retrieveOpenAlex(queries) {
  const settled = await Promise.allSettled(
    queries.map((query) =>
      openAlexClient.searchPublications({
        query,
        perPage: DEFAULT_CANDIDATE_DEPTH.openAlexPerQuery,
        page: 1,
      })
    )
  );

  return flattenSettled(settled);
}

async function retrievePubMed(queries) {
  const settled = await Promise.allSettled(
    queries.map((query) =>
      pubMedClient.searchPublications({
        query,
        retmax: DEFAULT_CANDIDATE_DEPTH.pubMedRetmax,
        retstart: 0,
      })
    )
  );

  return flattenSettled(settled);
}

async function retrieveClinicalTrials(queries, context, expandedQuery) {
  const settled = await Promise.allSettled(
    queries.map((query) =>
      clinicalTrialsClient.searchTrials({
        disease: context.disease || expandedQuery.filters?.disease || context.message || query,
        query,
        pageSize: DEFAULT_CANDIDATE_DEPTH.clinicalTrialsPageSize,
        status: context.status,
      })
    )
  );

  return flattenSettled(settled);
}

function flattenSettled(settledResults) {
  return settledResults.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
}

function extractSettled(result) {
  return result.status === "fulfilled" ? result.value : [];
}

function dedupeByIdentity(items) {
  const seen = new Set();

  return items.filter((item) => {
    const key = [
      item.type,
      item.platform,
      String(item.sourceId || "").toLowerCase(),
      String(item.title || "").toLowerCase(),
    ].join("::");

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function settleMeta(result, queries = []) {
  return {
    ok: result.status === "fulfilled",
    count: result.status === "fulfilled" ? result.value.length : 0,
    queries,
    error: result.status === "rejected" ? result.reason.message : null,
  };
}

function takeQueries(queryList, fallbackQuery, limit) {
  const queries = Array.isArray(queryList) ? queryList.filter(Boolean) : [];
  const unique = [...new Set([...queries, fallbackQuery].filter(Boolean))];
  return unique.slice(0, limit);
}

module.exports = { retrievalService };
