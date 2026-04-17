const { Router } = require("express");

const { asyncHandler } = require("../../utils/asyncHandler");
const { listSources } = require("./source.controller");

const sourceRouter = Router();

sourceRouter.get("/", asyncHandler(listSources));

module.exports = { sourceRouter };
