const { env } = require("../../config/env");

const ollamaClient = {
  describe() {
    return {
      name: "ollama",
      baseUrl: env.ollamaBaseUrl,
      configured: Boolean(env.ollamaBaseUrl && env.ollamaModel),
      model: env.ollamaModel || null,
    };
  },

  async generateStructuredAnswer({ prompt }) {
    if (!env.ollamaBaseUrl || !env.ollamaModel) {
      throw new Error("Ollama is not configured");
    }

    const response = await fetch(new URL("/api/generate", env.ollamaBaseUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(env.requestTimeoutMs),
      body: JSON.stringify({
        model: env.ollamaModel,
        prompt,
        stream: false,
        format: "json",
        options: {
          temperature: 0.2,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama request failed with status ${response.status}`);
    }

    const payload = await response.json();

    return parseStructuredOllamaResponse(payload.response || "");
  },
};

function parseStructuredOllamaResponse(responseText) {
  const normalized = String(responseText || "").trim();

  if (!normalized) {
    throw new Error("Ollama returned an empty response");
  }

  try {
    return JSON.parse(normalized);
  } catch (error) {
    const extracted = extractJsonObject(normalized);

    if (!extracted) {
      throw new Error("Ollama returned invalid JSON");
    }

    try {
      return JSON.parse(extracted);
    } catch (parseError) {
      throw new Error("Ollama returned invalid JSON");
    }
  }
}

function extractJsonObject(value) {
  const start = value.indexOf("{");
  const end = value.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    return "";
  }

  return value.slice(start, end + 1);
}

module.exports = { ollamaClient };
