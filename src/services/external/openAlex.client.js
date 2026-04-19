const { env } = require("../../config/env");
const { getJson } = require("../../utils/httpClient");

const openAlexClient = {
  describe() {
    return {
      name: "openalex",
      baseUrl: env.openAlexBaseUrl,
      configured: Boolean(env.openAlexBaseUrl),
      apiKeyConfigured: Boolean(env.openAlexApiKey),
    };
  },

  async searchPublications({ query, perPage = 6, page = 1 }) {
    const payload = await getJson(env.openAlexBaseUrl, "works", {
      search: query,
      "per-page": perPage,
      page,
      sort: "relevance_score:desc",
      mailto: env.openAlexMailto || undefined,
      api_key: env.openAlexApiKey || undefined,
    });

    return (payload.results || []).map((item, index) => ({
      id: item.id || `openalex-${index}`,
      sourceId: item.id || `openalex-${index}`,
      type: "publication",
      platform: "OpenAlex",
      title: item.title || "Untitled publication",
      year: item.publication_year || null,
      journal: item.primary_location?.source?.display_name || "",
      url: buildOpenAlexUrl(item),
      authors: (item.authorships || []).map((author) => author.author?.display_name).filter(Boolean),
      snippet: buildOpenAlexSnippet(item),
      tags: derivePublicationTags(`${item.title || ""} ${buildOpenAlexSnippet(item)}`),
      rawScore: Number(item.relevance_score || 0),
    }));
  },
};

function buildOpenAlexUrl(item) {
  const landingPage = item.primary_location?.landing_page_url;
  const doi = normalizeDoiUrl(item.doi);
  const openAlexId = typeof item.id === "string" && item.id.startsWith("http") ? item.id : "";

  return landingPage || doi || openAlexId || "";
}

function normalizeDoiUrl(value) {
  const doi = String(value || "").trim();

  if (!doi) {
    return "";
  }

  if (/^https?:\/\//i.test(doi)) {
    return doi;
  }

  return `https://doi.org/${doi.replace(/^doi:\s*/i, "")}`;
}

function buildOpenAlexSnippet(item) {
  const abstract = item.abstract_inverted_index
    ? reconstructAbstract(item.abstract_inverted_index)
    : item.primary_location?.source?.display_name || "";

  return String(abstract).slice(0, 320);
}

function reconstructAbstract(invertedIndex) {
  const ordered = [];

  for (const [word, positions] of Object.entries(invertedIndex)) {
    for (const position of positions) {
      ordered[position] = word;
    }
  }

  return ordered.filter(Boolean).join(" ");
}

function derivePublicationTags(text) {
  const lower = String(text || "").toLowerCase();
  const tags = [];

  if (/(meta-analysis|systematic review)/.test(lower)) {
    tags.push("meta-analysis");
  }
  if (/(adult|adults)/.test(lower)) {
    tags.push("adult");
  }
  if (/(pediatric|paediatric|children|adolescent)/.test(lower)) {
    tags.push("pediatric");
  }
  if (/(geriatric|elderly|aged 65|\bolder adults\b)/.test(lower)) {
    tags.push("geriatric");
  }
  if (/(trial|phase i|phase ii|phase iii|phase iv)/.test(lower)) {
    tags.push("clinical-trial");
  }

  return [...new Set(tags)];
}

module.exports = { openAlexClient };
