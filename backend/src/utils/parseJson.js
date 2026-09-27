/**
 * Extract and parse JSON from an LLM response that may wrap content
 * in markdown fences (```json ... ```) or include surrounding text.
 */
function parseJsonFromLlm(text) {
  if (text == null || typeof text !== "string") {
    throw new Error("Réponse IA vide ou invalide");
  }

  let cleaned = text.trim();

  // Strip markdown code fences if present
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }

  try {
    return JSON.parse(cleaned);
  } catch {
    // Fallback: find first {...} block
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    throw new Error("Impossible de parser le JSON de la réponse IA");
  }
}

module.exports = { parseJsonFromLlm };
