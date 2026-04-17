const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config();

function readEnv(keys, fallback = "") {
  for (const key of keys) {
    const value = process.env[key];

    if (typeof value === "string" && value.trim() !== "") {
      return value.trim();
    }
  }

  const normalizedLookup = Object.entries(process.env).reduce((accumulator, [key, value]) => {
    accumulator[normalizeEnvKey(key)] = value;
    return accumulator;
  }, {});

  for (const key of keys) {
    const value = normalizedLookup[normalizeEnvKey(key)];

    if (typeof value === "string" && value.trim() !== "") {
      return value.trim();
    }
  }

  return fallback;
}

function normalizeEnvKey(key) {
  return String(key)
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();
}

const env = {
  nodeEnv: readEnv(["NODE_ENV"], "development"),
  port: Number(readEnv(["PORT"], "10000")),
  apiPrefix: readEnv(["API_PREFIX"], "/api/v1"),
  clientOrigin: readEnv(["CLIENT_ORIGIN"], "*"),
  clientOrigins: readEnv(["CLIENT_ORIGINS"], ""),
  mongoUri: readEnv(["MONGODB_URI"]),
  requestTimeoutMs: Number(readEnv(["REQUEST_TIMEOUT_MS"], "15000")),
  openAlexBaseUrl: readEnv(["OPENALEX_BASE_URL"], "https://api.openalex.org"),
  openAlexApiKey: readEnv(["OPENALEX_API_KEY", "OpenAlex API"]),
  openAlexMailto: readEnv(["OPENALEX_MAILTO"]),
  pubMedBaseUrl: readEnv(
    ["PUBMED_BASE_URL"],
    "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
  ),
  pubMedApiKey: readEnv(["PUBMED_API_KEY", "PubMed API"]),
  pubMedTool: readEnv(["PUBMED_TOOL"], "curalink-backend"),
  pubMedEmail: readEnv(["PUBMED_EMAIL"]),
  clinicalTrialsBaseUrl: readEnv(
    ["CLINICAL_TRIALS_BASE_URL"],
    "https://clinicaltrials.gov/api/v2"
  ),
  ollamaBaseUrl: readEnv(["OLLAMA_BASE_URL"], "http://localhost:11434"),
  ollamaModel: readEnv(["OLLAMA_MODEL"]),
  pythonExecutable: readEnv(["PYTHON_EXECUTABLE"], "python"),
  pythonRenderTimeoutMs: Number(readEnv(["PYTHON_RENDER_TIMEOUT_MS"], "20000")),
  pythonRendererScript: readEnv(
    ["PYTHON_RENDERER_SCRIPT"],
    path.join("src", "python", "render_data.py")
  ),
};

function validateEnv() {
  const errors = [];
  const warnings = [];

  if (!["development", "test", "production"].includes(env.nodeEnv)) {
    errors.push("NODE_ENV must be one of: development, test, production.");
  }

  if (!Number.isInteger(env.port) || env.port <= 0 || env.port > 65535) {
    errors.push("PORT must be a valid TCP port between 1 and 65535.");
  }

  if (!env.apiPrefix.startsWith("/")) {
    errors.push("API_PREFIX must start with '/'.");
  }

  validateUrl(env.openAlexBaseUrl, "OPENALEX_BASE_URL", errors);
  validateUrl(env.pubMedBaseUrl, "PUBMED_BASE_URL", errors);
  validateUrl(env.clinicalTrialsBaseUrl, "CLINICAL_TRIALS_BASE_URL", errors);

  if (env.ollamaBaseUrl) {
    validateUrl(env.ollamaBaseUrl, "OLLAMA_BASE_URL", errors);
  }

  if (!Number.isFinite(env.requestTimeoutMs) || env.requestTimeoutMs < 1000) {
    errors.push("REQUEST_TIMEOUT_MS must be a number greater than or equal to 1000.");
  }

  if (!Number.isFinite(env.pythonRenderTimeoutMs) || env.pythonRenderTimeoutMs < 1000) {
    errors.push("PYTHON_RENDER_TIMEOUT_MS must be a number greater than or equal to 1000.");
  }

  const pythonScriptPath = path.resolve(process.cwd(), env.pythonRendererScript);
  if (!fs.existsSync(pythonScriptPath)) {
    errors.push(`PYTHON_RENDERER_SCRIPT does not exist: ${env.pythonRendererScript}`);
  }

  if (!env.clientOrigin) {
    warnings.push("CLIENT_ORIGIN is empty. CORS behavior may be broader or undefined than expected.");
  }

  if (!env.mongoUri) {
    warnings.push("MONGODB_URI is not set. Chat and conversation persistence will fall back to in-memory storage.");
  }

  if (!env.openAlexMailto) {
    warnings.push("OPENALEX_MAILTO is not set. OpenAlex requests are better-behaved when a contact email is provided.");
  }

  if (!env.pubMedEmail) {
    warnings.push("PUBMED_EMAIL is not set. NCBI recommends providing an email for API usage.");
  }

  if (env.ollamaBaseUrl && !env.ollamaModel) {
    warnings.push("OLLAMA_MODEL is not set. Reasoning will fall back to deterministic templating.");
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    summary: buildEnvSummary(),
  };
}

function buildEnvSummary() {
  const normalizedClientOrigins = env.clientOrigins
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return {
    nodeEnv: env.nodeEnv,
    port: env.port,
    apiPrefix: env.apiPrefix,
    clientOriginConfigured: Boolean(env.clientOrigin),
    clientOriginsConfigured: normalizedClientOrigins.length,
    requestTimeoutMs: env.requestTimeoutMs,
    integrations: {
      mongodbConfigured: Boolean(env.mongoUri),
      openAlex: {
        baseUrlConfigured: Boolean(env.openAlexBaseUrl),
        apiKeyConfigured: Boolean(env.openAlexApiKey),
        mailtoConfigured: Boolean(env.openAlexMailto),
      },
      pubMed: {
        baseUrlConfigured: Boolean(env.pubMedBaseUrl),
        apiKeyConfigured: Boolean(env.pubMedApiKey),
        toolConfigured: Boolean(env.pubMedTool),
        emailConfigured: Boolean(env.pubMedEmail),
      },
      clinicalTrials: {
        baseUrlConfigured: Boolean(env.clinicalTrialsBaseUrl),
      },
      ollama: {
        baseUrlConfigured: Boolean(env.ollamaBaseUrl),
        modelConfigured: Boolean(env.ollamaModel),
      },
      python: {
        executableConfigured: Boolean(env.pythonExecutable),
        renderTimeoutMs: env.pythonRenderTimeoutMs,
        rendererScript: env.pythonRendererScript,
      },
    },
  };
}

function validateUrl(value, label, errors) {
  try {
    new URL(String(value));
  } catch (error) {
    errors.push(`${label} must be a valid absolute URL.`);
  }
}

module.exports = { env, validateEnv, buildEnvSummary };
