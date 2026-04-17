const { Router } = require("express");

const { asyncHandler } = require("../../utils/asyncHandler");
const { getSystemSummary, getSystemCapabilities } = require("./system.controller");

const systemRouter = Router();

systemRouter.get("/", asyncHandler(getSystemSummary));
systemRouter.get("/capabilities", asyncHandler(getSystemCapabilities));

module.exports = { systemRouter };
