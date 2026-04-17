const { Router } = require("express");

const { getInsightsOverview, getInsightSignals } = require("./insight.controller");

const insightRouter = Router();

insightRouter.get("/overview", getInsightsOverview);
insightRouter.get("/signals", getInsightSignals);

module.exports = { insightRouter };
