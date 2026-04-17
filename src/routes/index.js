const express = require("express");

const { env } = require("../config/env");
const { healthRouter } = require("../modules/health/health.routes");
const { systemRouter } = require("../modules/system/system.routes");
const { chatRouter } = require("../modules/chat/chat.routes");
const { conversationRouter } = require("../modules/conversations/conversation.routes");
const { researchRouter } = require("../modules/research/research.routes");
const { publicationRouter } = require("../modules/publications/publication.routes");
const { clinicalTrialRouter } = require("../modules/clinicalTrials/clinicalTrial.routes");
const { renderingRouter } = require("../modules/rendering/rendering.routes");
const { libraryRouter } = require("../modules/library/library.routes");
const { datasetRouter } = require("../modules/datasets/dataset.routes");
const { exportRouter } = require("../modules/exports/export.routes");
const { dashboardRouter } = require("../modules/dashboard/dashboard.routes");
const { supportRouter } = require("../modules/support/support.routes");
const { insightRouter } = require("../modules/insights/insight.routes");
const { workspaceRouter } = require("../modules/workspace/workspace.routes");
const { sourceRouter } = require("../modules/sources/source.routes");

function registerRoutes(app) {
  const apiRouter = express.Router();

  apiRouter.use("/health", healthRouter);
  apiRouter.use("/system", systemRouter);
  apiRouter.use("/chat", chatRouter);
  apiRouter.use("/conversations", conversationRouter);
  apiRouter.use("/research", researchRouter);
  apiRouter.use("/publications", publicationRouter);
  apiRouter.use("/clinical-trials", clinicalTrialRouter);
  apiRouter.use("/rendering", renderingRouter);
  apiRouter.use("/library", libraryRouter);
  apiRouter.use("/datasets", datasetRouter);
  apiRouter.use("/exports", exportRouter);
  apiRouter.use("/dashboard", dashboardRouter);
  apiRouter.use("/support", supportRouter);
  apiRouter.use("/insights", insightRouter);
  apiRouter.use("/workspace", workspaceRouter);
  apiRouter.use("/sources", sourceRouter);

  app.use(env.apiPrefix, apiRouter);

  app.get("/", (req, res) => {
    res.json({
      message: "CuraLink backend is running",
      apiPrefix: env.apiPrefix,
    });
  });
}

module.exports = { registerRoutes };
