const { Router } = require("express");

const { getHealth } = require("./health.controller");

const healthRouter = Router();

healthRouter.get("/", getHealth);

module.exports = { healthRouter };
