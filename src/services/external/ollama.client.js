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

    try {
      return JSON.parse(payload.response || "{}");
    } catch (error) {
      throw new Error("Ollama returned invalid JSON");
    }
  },
};

module.exports = { ollamaClient };
