const { openAlexClient } = require("../../services/external/openAlex.client");
const { pubMedClient } = require("../../services/external/pubMed.client");
const { clinicalTrialsClient } = require("../../services/external/clinicalTrials.client");

const sourceRegistryService = {
  async listSources() {
    return {
      sources: [
        openAlexClient.describe(),
        pubMedClient.describe(),
        clinicalTrialsClient.describe(),
      ],
    };
  },
};

module.exports = { sourceRegistryService };
