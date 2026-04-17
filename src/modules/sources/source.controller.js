const { sourceRegistryService } = require("./sourceRegistry.service");

async function listSources(req, res) {
  const sources = await sourceRegistryService.listSources();
  res.json(sources);
}

module.exports = { listSources };
