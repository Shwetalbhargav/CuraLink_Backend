const { queryExpansionService } = require("../researchPipeline/queryExpansion.service");
const { retrievalService } = require("../researchPipeline/retrieval.service");
const { rankingService } = require("../researchPipeline/ranking.service");
const { reasoningService } = require("../reasoning/reasoning.service");
const { renderingService } = require("../rendering/rendering.service");

const researchService = {
  async buildResearchPlan(payload) {
    const expandedQuery = queryExpansionService.expand(payload);
    const rankingContext = buildRankingContext(payload, expandedQuery);
    const retrievalPlan = retrievalService.describePlan(expandedQuery);
    const rankingPlan = rankingService.describePlan();
    const retrievalResult = await retrievalService.retrieve(expandedQuery, rankingContext);
    const rankedEvidence = rankingService.rank(retrievalResult, rankingContext);

    return {
      stage: "research-pipeline",
      input: payload,
      expandedQuery,
      retrievalPlan,
      rankingPlan,
      retrievalMeta: rankedEvidence.meta,
      evidence: {
        publications: rankedEvidence.publications,
        clinicalTrials: rankedEvidence.clinicalTrials,
      },
    };
  },

  async synthesizeResearch(payload = {}) {
    const expandedQuery = queryExpansionService.expand(payload);
    const rankingContext = buildRankingContext(payload, expandedQuery, {
      outputLimits: {
        publications: Math.max(6, Number(payload.limitPublications) || 6),
        clinicalTrials: Math.max(4, Number(payload.limitClinicalTrials) || 4),
      },
    });
    const retrievalResult = await retrievalService.retrieve(expandedQuery, rankingContext);
    const rankedEvidence = rankingService.rank(retrievalResult, rankingContext);
    const reasoning = await reasoningService.composeAnswer({
      context: rankingContext,
      evidence: rankedEvidence,
    });
    const rendered = await renderingService.renderResearchAnswer({
      context: rankingContext,
      answer: reasoning.answer,
      sources: reasoning.sources,
      safety: reasoning.safety,
      format: payload.format,
      template: payload.template || "deep-synthesis",
    });

    return {
      stage: "research-synthesis",
      query: rankingContext,
      retrievalMeta: rankedEvidence.meta,
      evidence: rankedEvidence,
      answer: reasoning.answer,
      sources: reasoning.sources,
      rendered,
    };
  },

  async compareResearch(payload = {}) {
    const synthesis = await this.synthesizeResearch({
      ...payload,
      limitPublications: payload.limitPublications || 8,
      limitClinicalTrials: payload.limitClinicalTrials || 6,
      template: payload.template || "deep-synthesis",
    });
    const selectedIds = Array.isArray(payload.selectedSourceIds) ? payload.selectedSourceIds : [];
    const allEvidence = [...synthesis.evidence.publications, ...synthesis.evidence.clinicalTrials];
    const selectedEvidence = selectedIds.length
      ? allEvidence.filter((item) => selectedIds.includes(item.sourceId))
      : allEvidence.slice(0, 4);

    return {
      stage: "research-compare",
      comparison: {
        selectedSourceIds: selectedEvidence.map((item) => item.sourceId),
        selectedItems: selectedEvidence.map((item) => ({
          id: item.sourceId,
          title: item.title,
          type: item.type,
          platform: item.platform,
          year: item.year,
          score: item.score,
          summary: item.snippet || "",
        })),
        matrix: selectedEvidence.map((item) => ({
          id: item.sourceId,
          title: item.title,
          type: item.type,
          publicationYear: item.year || null,
          source: item.platform,
          score: item.score || 0,
          status: item.status || null,
          location: item.location || null,
        })),
      },
      synthesis,
    };
  },
};

function buildRankingContext(payload, expandedQuery, extra = {}) {
  return {
    ...(payload || {}),
    ...expandedQuery.normalized,
    message: payload?.message || payload?.query || expandedQuery.normalized.topic,
    topic: expandedQuery.normalized.topic,
    disease: expandedQuery.normalized.disease,
    location: expandedQuery.normalized.location,
    intent: expandedQuery.normalized.intent,
    ...extra,
  };
}

module.exports = { researchService };
