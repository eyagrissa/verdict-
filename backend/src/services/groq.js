const { fetchWithRetry } = require("../utils/fetchWithRetry");

// Confirmed current Groq production models — fallbacks if one is deprecated
const GROQ_MODELS = [
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
];

function getApiKey() {
  const key = process.env.GROQ_API_KEY;
  if (!key || !key.trim()) {
    throw new Error("GROQ_API_KEY manquante dans le fichier .env");
  }
  return key.trim();
}

async function callGroqOnce(model, prompt) {
  const apiKey = getApiKey();
  const url = "https://api.groq.com/openai/v1/chat/completions";

  const response = await fetchWithRetry(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 8192,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const msg = data?.error?.message || `Groq HTTP ${response.status}`;
    const err = new Error(msg);
    err.status = response.status;
    err.raw = data;
    throw err;
  }

  const text = data?.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new Error("Réponse Groq vide");
  }
  return text;
}

/**
 * Generate text with Groq, trying alternate model IDs if one fails as unavailable.
 */
async function generateWithGroq(prompt) {
  let lastError;

  for (const model of GROQ_MODELS) {
    try {
      return await callGroqOnce(model, prompt);
    } catch (err) {
      lastError = err;
      const msg = String(err.message || "");
      const modelIssue =
        err.status === 404 ||
        err.status === 400 ||
        /model|deprecat|not found|does not exist/i.test(msg);
      if (modelIssue) {
        continue;
      }
      throw err;
    }
  }

  throw lastError || new Error("Aucun modèle Groq disponible");
}

module.exports = { generateWithGroq, GROQ_MODELS };
