const { researchService } = require("./research.service");

async function createResearchPlan(req, res) {
  const plan = await researchService.buildResearchPlan(req.body);
  res.json(plan);
}

async function synthesizeResearch(req, res) {
  const response = await researchService.synthesizeResearch(req.body || {});
  res.json(response);
}

async function compareResearch(req, res) {
  const response = await researchService.compareResearch(req.body || {});
  res.json(response);
}

module.exports = { createResearchPlan, synthesizeResearch, compareResearch };
