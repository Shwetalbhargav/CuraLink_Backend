const { HTTP_STATUS } = require("../../constants/httpStatus");
const { insightService } = require("./insight.service");

async function getInsightsOverview(req, res) {
  res.status(HTTP_STATUS.OK).json(await insightService.getOverview());
}

async function getInsightSignals(req, res) {
  res.status(HTTP_STATUS.OK).json(await insightService.getSignals());
}

module.exports = { getInsightsOverview, getInsightSignals };
