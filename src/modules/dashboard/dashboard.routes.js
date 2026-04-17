const { Router } = require("express");

const { getDashboardOverview } = require("./dashboard.controller");

const dashboardRouter = Router();

dashboardRouter.get("/overview", getDashboardOverview);

module.exports = { dashboardRouter };
