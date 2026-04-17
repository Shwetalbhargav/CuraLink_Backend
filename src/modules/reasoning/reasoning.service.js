const { env } = require("../../config/env");
const { ollamaClient } = require("../../services/external/ollama.client");

const reasoningService = {
  describeModule() {
    return {
      module: "reasoning",
      provider: env.ollamaBaseUrl && env.ollamaModel ? "ollama" : "fallback-template",
      configured: Boolean(env.ollamaBaseUrl && env.ollamaModel),
      model: env.ollamaModel || null,
      responseShape: [
        "summary",
        "conditionOverview",
        "researchInsights",
        "clinicalTrials",
        "recommendedNextSteps",
      ],
      nextStep: env.ollamaBaseUrl && env.ollamaModel
        ? "Validate local Ollama availability and tune prompt grounding."
        : "Set OLLAMA_MODEL and start Ollama to enable grounded answer generation.",
    };
  },

  async composeAnswer({ context, evidence }) {
    const greeting = buildGreeting(context);
    const overview = buildConditionOverview(context, evidence);
    const sources = [...evidence.publications, ...evidence.clinicalTrials].map(formatSourceAttribution);
    const llmAnswer = await generateWithOllama({
      context,
      evidence,
      greeting,
      overview,
      sources,
    });
    const normalizedLlmAnswer = normalizeLlmAnswer(llmAnswer, sources);
    const fallbackAnswer = buildFallbackAnswer({ context, evidence, greeting, overview });
    const answerPayload = mergeAnswerPayload(fallbackAnswer, normalizedLlmAnswer);
    const careAccess = buildCareAccess(evidence.clinicalTrials);

    return {
      answer: {
        greeting: answerPayload.greeting,
        summary: answerPayload.summary,
        conditionOverview: answerPayload.conditionOverview,
        researchInsights: answerPayload.researchInsights,
        clinicalTrials: answerPayload.clinicalTrials,
        recommendedNextSteps: answerPayload.recommendedNextSteps,
        careAccess,
      },
      sources,
      safety: {
        medicalAdviceBoundary:
          "This response summarizes research and care-access options in real time. It is not a diagnosis or a personal treatment prescription.",
        escalation:
          "Any decision about starting, stopping, or changing treatment should be reviewed with a licensed clinician who knows the patient history.",
      },
    };
  },
};

async function generateWithOllama({ context, evidence, greeting, overview, sources }) {
  try {
    return await ollamaClient.generateStructuredAnswer({
      prompt: buildReasoningPrompt({ context, evidence, greeting, overview, sources }),
    });
  } catch (error) {
    return null;
  }
}

function buildFallbackAnswer({ context, evidence, greeting, overview }) {
  const researchInsights = buildResearchInsights(evidence.publications, context);
  const clinicalTrials = buildClinicalTrialSummary(evidence.clinicalTrials, context);
  const recommendedNextSteps = buildRecommendedNextSteps(context, evidence);

  return {
    greeting,
    summary: buildFallbackSummary(context, evidence, greeting),
    conditionOverview: overview,
    researchInsights,
    clinicalTrials,
    recommendedNextSteps,
  };
}

function buildGreeting(context) {
  if (context.disease) {
    return `Hello, my name is CuraLink. I am sorry to hear that you are dealing with ${context.disease}.`;
  }

  return "Hello, my name is CuraLink. I can help you explore research-backed medical information.";
}

function buildConditionOverview(context, evidence) {
  if (!context.disease) {
    return "I can summarize current research, clinical trials, and evidence-backed treatment discussions once you share the condition you want to explore.";
  }

  const publicationCount = evidence.publications.length;
  const trialCount = evidence.clinicalTrials.length;

  return `I reviewed current evidence related to ${context.disease}${context.isFollowUp ? " using the previous conversation context" : ""}. I found ${publicationCount} publication candidates and ${trialCount} clinical trial candidates most relevant to your question.`;
}

function buildFallbackSummary(context, evidence, greeting) {
  const topPublication = evidence.publications[0];
  const topTrial = evidence.clinicalTrials[0];
  const publicationSentence = topPublication
    ? `The strongest publication signal came from "${topPublication.title}" (${topPublication.platform}${topPublication.year ? `, ${topPublication.year}` : ""}).`
    : "I did not find a strong publication match in the current retrieval run.";
  const trialSentence = topTrial
    ? `The most relevant clinical-trial match was "${topTrial.title}" with status ${String(topTrial.status || "UNKNOWN").toLowerCase()}.`
    : "I did not find a high-confidence clinical-trial match in the current retrieval run.";

  return `${greeting} ${publicationSentence} ${trialSentence}`;
}

function buildResearchInsights(publications, context) {
  if (!publications.length) {
    return [
      {
        heading: "Research availability",
        summary: `I could not confirm strong publication evidence for "${context.message}" in real time. I would broaden the search terms or add more clinical detail next.`,
        sourceIds: [],
      },
    ];
  }

  return publications.slice(0, 3).map((item) => ({
    heading: item.title,
    summary: `${formatPublicationLead(item, context)} ${item.snippet || "Abstract details were limited in the source response."}`,
    sourceIds: [item.sourceId],
  }));
}

function buildClinicalTrialSummary(trials, context) {
  if (!trials.length) {
    return [
      {
        title: "No matching clinical trials surfaced",
        status: "Unavailable",
        summary: `No live clinical trial records were ranked highly for ${context.disease || "this topic"} in the current query run.`,
      },
    ];
  }

  return trials.map((item) => ({
    title: item.title,
    status: item.status,
    summary: `${item.status}${item.location ? ` in ${item.location}` : ""}`,
    location: item.location || null,
    contact: item.contact || null,
    sourceIds: [item.sourceId],
  }));
}

function buildCareAccess(trials) {
  const trialSites = trials
    .filter((item) => item.location)
    .slice(0, 3)
    .map((item) => ({
      label: item.title,
      location: item.location,
      contact: item.contact || null,
      url: item.url || null,
    }));

  return {
    note:
      "For where to explore care options, I prioritize active clinical-trial sites and named study locations rather than claiming a single best provider.",
    options: trialSites,
  };
}

function buildRecommendedNextSteps(context, evidence) {
  const steps = [];

  if (evidence.publications.length) {
    steps.push("Review the top cited publications and compare whether they address the exact disease context and question.");
  } else {
    steps.push("Broaden the publication search with alternative disease terms, treatment names, or synonyms.");
  }

  if (evidence.clinicalTrials.length) {
    steps.push("Check recruiting status, inclusion criteria, and site location before considering a trial as a care-access option.");
  } else {
    steps.push("Try a wider clinical-trial search using related therapies, disease subtypes, or a less restrictive location filter.");
  }

  if (context.location) {
    steps.push(`Prioritize evidence and trial sites that are accessible from ${context.location}.`);
  }

  steps.push("Discuss any treatment or supplement decision with a licensed clinician who knows the patient history.");

  return steps.slice(0, 4);
}

function buildReasoningPrompt({ context, evidence, greeting, overview, sources }) {
  const compactSources = sources.slice(0, 8).map((item) => ({
    id: item.id,
    type: item.type,
    title: item.title,
    platform: item.platform,
    year: item.year,
    snippet: item.snippet,
    authors: item.authors,
    url: item.url,
  }));

  return [
    "You are a medical research assistant, not a clinician.",
    "Return valid JSON only.",
    "Do not prescribe treatment. Summarize evidence and mention uncertainty.",
    "Favor sources that match both the disease context and the specific follow-up topic.",
    "Only use the provided evidence. Do not invent studies, trials, authors, URLs, or claims.",
    "When evidence is weak, explicitly say so.",
    `Greeting: ${greeting}`,
    `Condition overview seed: ${overview}`,
    `Context: ${JSON.stringify(context)}`,
    `Evidence: ${JSON.stringify({ publications: evidence.publications, clinicalTrials: evidence.clinicalTrials, sources: compactSources })}`,
    'Return JSON with keys: summary, conditionOverview, researchInsights, clinicalTrials, recommendedNextSteps.',
    'researchInsights must be an array of up to 3 objects with heading, summary, sourceIds.',
    'clinicalTrials must be an array of up to 4 objects with title, status, summary, location, contact, sourceIds.',
    'recommendedNextSteps must be an array of up to 4 short strings.',
  ].join("\n");
}

function formatSourceAttribution(item) {
  return {
    id: item.sourceId,
    type: item.type,
    title: item.title,
    authors: item.authors || [],
    year: item.year,
    platform: item.platform,
    url: item.url,
    snippet: item.snippet || "",
  };
}

function normalizeLlmAnswer(llmAnswer, sources) {
  if (!llmAnswer || typeof llmAnswer !== "object") {
    return null;
  }

  return {
    summary: normalizeSentence(llmAnswer.summary),
    conditionOverview: normalizeSentence(llmAnswer.conditionOverview),
    researchInsights: normalizeResearchInsights(llmAnswer.researchInsights, sources),
    clinicalTrials: normalizeClinicalTrials(llmAnswer.clinicalTrials, sources),
    recommendedNextSteps: normalizeNextSteps(llmAnswer.recommendedNextSteps),
  };
}

function mergeAnswerPayload(fallbackAnswer, llmAnswer) {
  if (!llmAnswer) {
    return fallbackAnswer;
  }

  return {
    greeting: fallbackAnswer.greeting,
    summary: llmAnswer.summary || fallbackAnswer.summary,
    conditionOverview: llmAnswer.conditionOverview || fallbackAnswer.conditionOverview,
    researchInsights: llmAnswer.researchInsights?.length
      ? llmAnswer.researchInsights
      : fallbackAnswer.researchInsights,
    clinicalTrials: llmAnswer.clinicalTrials?.length
      ? llmAnswer.clinicalTrials
      : fallbackAnswer.clinicalTrials,
    recommendedNextSteps: llmAnswer.recommendedNextSteps?.length
      ? llmAnswer.recommendedNextSteps
      : fallbackAnswer.recommendedNextSteps,
  };
}

function normalizeResearchInsights(items, sources) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .slice(0, 3)
    .map((item) => ({
      heading: normalizeSentence(item?.heading),
      summary: normalizeSentence(item?.summary),
      sourceIds: normalizeSourceIds(item?.sourceIds, sources),
    }))
    .filter((item) => item.heading && item.summary);
}

function normalizeClinicalTrials(items, sources) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .slice(0, 4)
    .map((item) => ({
      title: normalizeSentence(item?.title),
      status: normalizeSentence(item?.status),
      summary: normalizeSentence(item?.summary),
      location: normalizeSentence(item?.location) || null,
      contact: normalizeSentence(item?.contact) || null,
      sourceIds: normalizeSourceIds(item?.sourceIds, sources),
    }))
    .filter((item) => item.title && item.summary);
}

function normalizeNextSteps(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .slice(0, 4)
    .map((item) => normalizeSentence(item))
    .filter(Boolean);
}

function normalizeSourceIds(items, sources) {
  const validIds = new Set(sources.map((item) => item.id));
  const requestedIds = Array.isArray(items) ? items.map((item) => String(item || "").trim()) : [];
  return requestedIds.filter((id) => validIds.has(id));
}

function normalizeSentence(value) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text || "";
}

function formatPublicationLead(item, context) {
  if (context.intent === "supplement-evidence") {
    return `Based on retrieved studies related to ${context.disease || "the condition"}, this publication may be relevant to the supplement question.`;
  }

  if (context.intent === "treatment-evidence") {
    return `Based on retrieved studies related to ${context.disease || "the condition"}, this publication discusses treatment evidence.`;
  }

  return `Based on retrieved studies related to ${context.disease || "the condition"}, this publication contributes relevant research context.`;
}

module.exports = { reasoningService };
