const { renderingService } = require("./rendering.service");

async function getRenderingModule(req, res) {
  res.json(renderingService.describeModule());
}

async function renderResearchAnswer(req, res) {
  const rendered = await renderingService.renderResearchAnswer(req.body || {});
  res.json(rendered);
}

module.exports = { getRenderingModule, renderResearchAnswer };
