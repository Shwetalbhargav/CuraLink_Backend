const FOLLOW_UP_HINTS = [
  "it",
  "that",
  "this",
  "those",
  "these",
  "vitamin",
  "supplement",
  "trial",
  "treatment",
  "therapy",
];

function resolveContext(session, input) {
  const message = String(input.message || "").trim();
  const prior = session?.context || {};
  const explicitDisease = String(input.context?.disease || input.disease || "").trim();
  const explicitLocation = String(input.context?.location || input.location || "").trim();
  const disease = explicitDisease || detectDisease(message) || prior.disease || "";
  const location = explicitLocation || prior.location || detectLocation(message) || "";
  const requestedSource = detectRequestedSource(message);
  const lastQuery = prior.lastQuery || "";
  const followUp = !explicitDisease && Boolean(prior.disease) && isFollowUpMessage(message, lastQuery);
  const normalizedIntent = detectIntent(message);
  const topic = extractTopic(message, normalizedIntent);

  return {
    patientName: String(input.context?.patientName || input.patientName || prior.patientName || "").trim(),
    disease,
    location,
    message,
    isFollowUp: followUp,
    requestedSource,
    intent: normalizedIntent,
    topic,
    priorDisease: prior.disease || "",
  };
}

function detectIntent(message) {
  const lower = message.toLowerCase();

  if (lower.includes("trial")) {
    return "clinical-trials";
  }

  if (lower.includes("vitamin") || lower.includes("supplement")) {
    return "supplement-evidence";
  }

  if (lower.includes("treatment") || lower.includes("therapy")) {
    return "treatment-evidence";
  }

  if (lower.includes("research") || lower.includes("study")) {
    return "research-summary";
  }

  return "general-medical-research";
}

function detectRequestedSource(message) {
  const lower = message.toLowerCase();

  if (lower.includes("trial")) {
    return "clinical-trials";
  }

  if (lower.includes("study") || lower.includes("publication") || lower.includes("paper")) {
    return "publications";
  }

  return "all";
}

function isFollowUpMessage(message, lastQuery) {
  const lower = message.toLowerCase();
  return FOLLOW_UP_HINTS.some((hint) => lower.includes(hint)) || message.split(/\s+/).length < 8 || Boolean(lastQuery);
}

function detectDisease(message) {
  const patterns = [
    "lung cancer",
    "breast cancer",
    "alzheimer",
    "parkinson",
    "diabetes",
    "heart disease",
  ];

  const lower = message.toLowerCase();
  return patterns.find((item) => lower.includes(item)) || "";
}

function detectLocation(message) {
  const match = message.match(/\b(?:in|near|around)\s+([A-Z][a-zA-Z]+(?:,\s*[A-Z][a-zA-Z]+)*)/);
  return match ? match[1] : "";
}

function extractTopic(message, intent) {
  const lower = message.toLowerCase();

  if (intent === "supplement-evidence") {
    const supplementMatch = lower.match(/(vitamin\s+[a-z0-9]+|supplement[s]?|omega[-\s]?3|curcumin|magnesium)/);
    return supplementMatch ? supplementMatch[1] : "supplement";
  }

  if (intent === "treatment-evidence") {
    return cleanTopic(message, [
      "latest",
      "treatment",
      "treatments",
      "therapy",
      "therapies",
      "for",
      "what",
      "is",
      "are",
      "the",
    ]);
  }

  return cleanTopic(message, ["can", "i", "take", "for", "what", "is", "are", "the"]);
}

function cleanTopic(message, stopWords) {
  return String(message || "")
    .replace(/[?.,!]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => !stopWords.includes(token.toLowerCase()))
    .join(" ")
    .trim();
}

module.exports = { resolveContext };
