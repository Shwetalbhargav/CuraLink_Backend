const { Router } = require("express");

const { asyncHandler } = require("../../utils/asyncHandler");
const { createResearchPlan, synthesizeResearch, compareResearch } = require("./research.controller");

const researchRouter = Router();

researchRouter.post("/plan", asyncHandler(createResearchPlan));
researchRouter.post("/synthesize", asyncHandler(synthesizeResearch));
researchRouter.post("/compare", asyncHandler(compareResearch));

module.exports = { researchRouter };
