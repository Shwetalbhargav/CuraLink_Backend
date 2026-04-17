const { Router } = require("express");

const { asyncHandler } = require("../../utils/asyncHandler");
const { listClinicalTrialModule, searchClinicalTrials } = require("./clinicalTrial.controller");

const clinicalTrialRouter = Router();

clinicalTrialRouter.get("/", asyncHandler(listClinicalTrialModule));
clinicalTrialRouter.post("/search", asyncHandler(searchClinicalTrials));

module.exports = { clinicalTrialRouter };
