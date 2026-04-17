const { env } = require("../../config/env");
const { getJson, getText } = require("../../utils/httpClient");

const pubMedClient = {
  describe() {
    return {
      name: "pubmed",
      baseUrl: env.pubMedBaseUrl,
      configured: Boolean(env.pubMedBaseUrl),
      apiKeyConfigured: Boolean(env.pubMedApiKey),
    };
  },

  async searchPublications({ query, retmax = 5, retstart = 0 }) {
    const searchPayload = await getJson(env.pubMedBaseUrl, "esearch.fcgi", {
      db: "pubmed",
      term: query,
      retmax,
      retstart,
      sort: "pub+date",
      retmode: "json",
      api_key: env.pubMedApiKey || undefined,
      tool: env.pubMedTool || undefined,
      email: env.pubMedEmail || undefined,
    });

    const ids = searchPayload?.esearchresult?.idlist || [];

    if (!ids.length) {
      return [];
    }

    const xml = await getText(env.pubMedBaseUrl, "efetch.fcgi", {
      db: "pubmed",
      id: ids.join(","),
      retmode: "xml",
      api_key: env.pubMedApiKey || undefined,
      tool: env.pubMedTool || undefined,
      email: env.pubMedEmail || undefined,
    });

    return parsePubMedXml(xml);
  },
};

function parsePubMedXml(xml) {
  const articles = xml.match(/<PubmedArticle[\s\S]*?<\/PubmedArticle>/g) || [];

  return articles.map((article, index) => {
    const pmid = matchTag(article, "PMID");
    const title = cleanXml(matchTag(article, "ArticleTitle")) || "Untitled publication";
    const abstract = cleanXml(matchTag(article, "AbstractText")) || "";
    const year =
      matchTag(article, "Year") ||
      matchTag(article, "MedlineDate")?.slice(0, 4) ||
      null;
    const authors = [...article.matchAll(/<LastName>(.*?)<\/LastName>[\s\S]*?<ForeName>(.*?)<\/ForeName>/g)].map(
      (match) => `${cleanXml(match[2])} ${cleanXml(match[1])}`.trim()
    );

    return {
      id: pmid || `pubmed-${index}`,
      sourceId: pmid || `pubmed-${index}`,
      type: "publication",
      platform: "PubMed",
      title,
      year: year ? Number(String(year).slice(0, 4)) : null,
      journal: cleanXml(matchTag(article, "Title")) || cleanXml(matchTag(article, "ISOAbbreviation")) || "",
      url: pmid ? `https://pubmed.ncbi.nlm.nih.gov/${pmid}/` : "",
      authors,
      snippet: abstract.slice(0, 320),
      tags: derivePublicationTags(`${title} ${abstract}`),
      rawScore: 0.8,
    };
  });
}

function matchTag(input, tagName) {
  const match = input.match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`));
  return match ? match[1] : "";
}

function cleanXml(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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

module.exports = { pubMedClient };
