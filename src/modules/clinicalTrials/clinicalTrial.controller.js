const { clinicalTrialService } = require("./clinicalTrial.service");

async function listClinicalTrialModule(req, res) {
  const summary = clinicalTrialService.describeModule();
  res.json(summary);
}

async function searchClinicalTrials(req, res) {
  const result = await clinicalTrialService.searchClinicalTrials(req.body || {});
  res.json(result);
}

module.exports = { listClinicalTrialModule, searchClinicalTrials };
