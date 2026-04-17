const { Router } = require("express");

const { asyncHandler } = require("../../utils/asyncHandler");
const { getRenderingModule, renderResearchAnswer } = require("./rendering.controller");

const renderingRouter = Router();

renderingRouter.get("/", asyncHandler(getRenderingModule));
renderingRouter.post("/research-answer", asyncHandler(renderResearchAnswer));

module.exports = { renderingRouter };
