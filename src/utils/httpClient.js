const { env } = require("../config/env");

async function getJson(baseUrl, path = "", query = {}) {
  const url = new URL(path, normalizeBaseUrl(baseUrl));

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url, {
    signal: AbortSignal.timeout(env.requestTimeoutMs),
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status} for ${url.toString()}`);
  }

  return response.json();
}

async function getText(baseUrl, path = "", query = {}) {
  const url = new URL(path, normalizeBaseUrl(baseUrl));

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url, {
    signal: AbortSignal.timeout(env.requestTimeoutMs),
    headers: {
      Accept: "text/plain, application/xml, text/xml",
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status} for ${url.toString()}`);
  }

  return response.text();
}

function normalizeBaseUrl(baseUrl) {
  return String(baseUrl).endsWith("/") ? String(baseUrl) : `${baseUrl}/`;
}

module.exports = { getJson, getText };
