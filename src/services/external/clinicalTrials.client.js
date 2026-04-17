const { env } = require("../../config/env");
const { getJson } = require("../../utils/httpClient");

const clinicalTrialsClient = {
  describe() {
    return {
      name: "clinical-trials",
      baseUrl: env.clinicalTrialsBaseUrl,
      configured: Boolean(env.clinicalTrialsBaseUrl),
    };
  },

  async searchTrials({ disease, query, pageSize = 5, status }) {
    const payload = await getJson(env.clinicalTrialsBaseUrl, "studies", {
      "query.cond": disease,
      "query.term": query,
      "filter.overallStatus": normalizeStatus(status),
      pageSize,
      format: "json",
    });

    return (payload.studies || []).map((study, index) => {
      const protocol = study.protocolSection || {};
      const identification = protocol.identificationModule || {};
      const status = protocol.statusModule || {};
      const design = protocol.designModule || {};
      const contacts = protocol.contactsLocationsModule || {};
      const eligibility = protocol.eligibilityModule || {};
      const firstLocation = contacts.locations?.[0] || {};

      return {
        id: study.protocolSection?.identificationModule?.nctId || `trial-${index}`,
        sourceId: study.protocolSection?.identificationModule?.nctId || `trial-${index}`,
        type: "clinical-trial",
        platform: "ClinicalTrials.gov",
        title: identification.briefTitle || "Untitled clinical trial",
        year: extractYear(status.studyFirstPostDateStruct?.date),
        url: identification.nctId
          ? `https://clinicaltrials.gov/study/${identification.nctId}`
          : "",
        status: status.overallStatus || "UNKNOWN",
        phase: Array.isArray(design.phases) ? design.phases.join(", ") : "",
        studyType: design.studyType || "",
        location: [firstLocation.city, firstLocation.state, firstLocation.country].filter(Boolean).join(", "),
        contact: firstLocation.contacts?.[0]?.email || firstLocation.contacts?.[0]?.phone || "",
        eligibility: eligibility.eligibilityCriteria || "",
        tags: deriveTrialTags({
          status: status.overallStatus || "",
          phase: Array.isArray(design.phases) ? design.phases.join(" ") : "",
          studyType: design.studyType || "",
          text: `${identification.briefTitle || ""} ${eligibility.eligibilityCriteria || ""}`,
        }),
        snippet: `${status.overallStatus || "Status unavailable"}${firstLocation.facility ? ` at ${firstLocation.facility}` : ""}`,
        rawScore: status.overallStatus === "RECRUITING" ? 1 : 0.6,
      };
    });
  },
};

function normalizeStatus(status) {
  const value = String(status || "").trim().toUpperCase().replace(/\s+/g, "_");
  return value || undefined;
}

function extractYear(dateString) {
  if (!dateString) {
    return null;
  }

  const value = String(dateString).slice(0, 4);
  return Number.isNaN(Number(value)) ? null : Number(value);
}

function deriveTrialTags({ status, phase, studyType, text }) {
  const lower = `${status} ${phase} ${studyType} ${text}`.toLowerCase();
  const tags = [];

  if (lower.includes("recruiting")) {
    tags.push("recruiting");
  }
  if (lower.includes("interventional")) {
    tags.push("interventional");
  }
  if (lower.includes("observational")) {
    tags.push("observational");
  }
  if (/(adult|adults)/.test(lower)) {
    tags.push("adult");
  }
  if (/(child|children|pediatric|adolescent)/.test(lower)) {
    tags.push("pediatric");
  }

  return [...new Set(tags)];
}

module.exports = { clinicalTrialsClient };
