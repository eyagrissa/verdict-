const { fetchWithRetry } = require("../utils/fetchWithRetry");

// Confirmed current flash model (GA) — fallbacks tried if unavailable
const GEMINI_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.5-flash",
  "gemini-2.5-flash",
];

function getApiKey() {
  const key = process.env.GEMINI_API_KEY;
  if (!key || !key.trim()) {
    throw new Error("GEMINI_API_KEY manquante dans le fichier .env");
  }
  return key.trim();
}

async function callGeminiOnce(model, prompt) {
  const apiKey = getApiKey();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const response = await fetchWithRetry(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 8192,
      },
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const msg =
      data?.error?.message ||
      `Gemini HTTP ${response.status}`;
    const err = new Error(msg);
    err.status = response.status;
    err.raw = data;
    throw err;
  }

  const text = data?.candidates?.[0]?.content?.parts
    ?.map((p) => p.text || "")
    .join("")
    .trim();

  if (!text) {
    const blockReason =
      data?.promptFeedback?.blockReason ||
      data?.candidates?.[0]?.finishReason;
    throw new Error(
      blockReason
        ? `Réponse Gemini vide (raison: ${blockReason})`
        : "Réponse Gemini vide"
    );
  }

  return text;
}

/**
 * Generate text with Gemini, trying alternate model IDs if one returns 404.
 */
async function generateWithGemini(prompt) {
  let lastError;

  for (const model of GEMINI_MODELS) {
    try {
      return await callGeminiOnce(model, prompt);
    } catch (err) {
      lastError = err;
      const msg = String(err.message || "");
      const notFound =
        err.status === 404 ||
        /not found|not supported|invalid model/i.test(msg);
      if (notFound) {
        continue;
      }
      throw err;
    }
  }

  throw lastError || new Error("Aucun modèle Gemini disponible");
}

module.exports = { generateWithGemini, GEMINI_MODELS };
