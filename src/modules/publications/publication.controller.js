const { publicationService } = require("./publication.service");

async function listPublicationModule(req, res) {
  const summary = publicationService.describeModule();
  res.json(summary);
}

async function searchPublications(req, res) {
  const result = await publicationService.searchPublications(req.body || {});
  res.json(result);
}

module.exports = { listPublicationModule, searchPublications };
