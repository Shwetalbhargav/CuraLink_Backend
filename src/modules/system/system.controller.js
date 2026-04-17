const { env, validateEnv, buildEnvSummary } = require("../../config/env");
const { isDatabaseConnected } = require("../../config/database");
const { clinicalTrialService } = require("../clinicalTrials/clinicalTrial.service");
const { publicationService } = require("../publications/publication.service");
const { reasoningService } = require("../reasoning/reasoning.service");
const { renderingService } = require("../rendering/rendering.service");
const { libraryService } = require("../library/library.service");
const { datasetService } = require("../datasets/dataset.service");
const { exportService } = require("../exports/export.service");
const { dashboardService } = require("../dashboard/dashboard.service");
const { supportService } = require("../support/support.service");
const { insightService } = require("../insights/insight.service");
const { workspaceService } = require("../workspace/workspace.service");
const { pythonRenderer } = require("../../services/python/pythonRenderer");

async function getSystemSummary(req, res) {
  const pythonStatus = await pythonRenderer.healthcheck();
  const envValidation = validateEnv();

  res.json({
    app: "curalink-backend",
    environment: env.nodeEnv,
    config: {
      valid: envValidation.ok,
      errors: envValidation.errors,
      warnings: envValidation.warnings,
      summary: buildEnvSummary(),
    },
    architecture: {
      modules: [
        "conversations",
        "research",
        "publications",
        "clinical-trials",
        "ranking",
        "reasoning",
        "python-rendering",
      ],
    },
    featureModules: {
      publications: publicationService.describeModule(),
      clinicalTrials: clinicalTrialService.describeModule(),
      reasoning: reasoningService.describeModule(),
      rendering: renderingService.describeModule(),
      library: libraryService.describeModule(),
      datasets: datasetService.describeModule(),
      exports: exportService.describeModule(),
      dashboard: dashboardService.describeModule(),
      support: supportService.describeModule(),
      insights: insightService.describeModule(),
      workspace: workspaceService.describeModule(),
    },
    integrations: {
      mongodb: {
        configured: Boolean(env.mongoUri),
        connected: isDatabaseConnected(),
      },
      openAlex: Boolean(env.openAlexBaseUrl),
      pubMed: Boolean(env.pubMedBaseUrl),
      clinicalTrials: Boolean(env.clinicalTrialsBaseUrl),
      ollama: {
        baseUrlConfigured: Boolean(env.ollamaBaseUrl),
        modelConfigured: Boolean(env.ollamaModel),
      },
      python: pythonStatus,
    },
  });
}

async function getSystemCapabilities(req, res) {
  res.json({
    modules: {
      publications: publicationService.describeModule(),
      clinicalTrials: clinicalTrialService.describeModule(),
      reasoning: reasoningService.describeModule(),
      rendering: renderingService.describeModule(),
      library: libraryService.describeModule(),
      datasets: datasetService.describeModule(),
      exports: exportService.describeModule(),
      dashboard: dashboardService.describeModule(),
      support: supportService.describeModule(),
      insights: insightService.describeModule(),
      workspace: workspaceService.describeModule(),
    },
    endpoints: {
      chat: [
        "/api/v1/chat/session",
        "/api/v1/chat/session/:sessionId/context",
        "/api/v1/chat/session/:sessionId/history",
        "/api/v1/chat/message",
        "/api/v1/chat/actions/summarize",
        "/api/v1/chat/actions/export-protocol",
        "/api/v1/chat/actions/citation-preview",
      ],
      conversations: [
        "/api/v1/conversations",
        "/api/v1/conversations/meta",
        "/api/v1/conversations/:conversationId",
        "/api/v1/conversations/:conversationId/archive",
        "/api/v1/conversations/:conversationId/unarchive",
      ],
      research: [
        "/api/v1/research/plan",
        "/api/v1/research/synthesize",
        "/api/v1/research/compare",
      ],
      mvp: [
        "/api/v1/library",
        "/api/v1/library/items",
        "/api/v1/library/folders",
        "/api/v1/datasets/upload",
        "/api/v1/datasets",
        "/api/v1/exports/report",
        "/api/v1/exports/protocol",
        "/api/v1/exports/library-csv",
        "/api/v1/dashboard/overview",
        "/api/v1/support/faqs",
        "/api/v1/support/requests",
        "/api/v1/support/status",
        "/api/v1/insights/overview",
        "/api/v1/insights/signals",
        "/api/v1/workspace",
        "/api/v1/workspace/activity",
        "/api/v1/workspace/projects",
      ],
    },
  });
}

module.exports = { getSystemSummary, getSystemCapabilities };
