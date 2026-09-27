const express = require("express");
const { generateWithGemini } = require("../services/gemini");
const { generateWithGroq } = require("../services/groq");
const { parseJsonFromLlm } = require("../utils/parseJson");
const { addWeightedTotals } = require("../services/scoring");

const router = express.Router();

function buildComparePrompt(task, weightedCriteria, versions) {
  return `Tu es un reviewer senior qui évalue plusieurs versions d'un même livrable, produites
en parallèle (par différents modèles IA ou humains), pour une même tâche.

ENTRÉE :
- Contexte de la tâche : ${task}
- Critères pondérés (nom + poids 0-10) : ${JSON.stringify(weightedCriteria)}
- Versions à comparer (2 à 6), chacune avec un id et un label de source
  (ex : Gemini / Groq / Manuel) : ${JSON.stringify(versions)}

INSTRUCTIONS :
Note chaque version selon chaque critère. Puis produis un JSON STRICT uniquement,
sans balises markdown, sans texte avant ou après :

{
  "evaluations": [
    {
      "version_id": "...",
      "scores": {"nom_critere": note_0_a_10, ...},
      "strengths": "...",
      "weaknesses": "..."
    }
  ],
  "ranking": ["version_id_1er", "version_id_2eme", ...],
  "final_verdict": {
    "winner": "version_id",
    "justification": "explication en 2-3 phrases, claire et humaine",
    "confidence_level": "high | medium | low",
    "note_if_low_confidence": "explique pourquoi c'est serré, si applicable"
  }
}`;
}

function isValidCompareResponse(data) {
  return (
    data &&
    Array.isArray(data.evaluations) &&
    Array.isArray(data.ranking) &&
    data.final_verdict &&
    typeof data.final_verdict.winner === "string" &&
    typeof data.final_verdict.justification === "string" &&
    typeof data.final_verdict.confidence_level === "string"
  );
}

router.post("/compare", async (req, res) => {
  try {
    const task = typeof req.body?.task === "string" ? req.body.task.trim() : "";
    const weightedCriteria = req.body?.weightedCriteria;
    const versions = req.body?.versions;

    if (!task) {
      return res.status(400).json({
        error: "Le champ 'task' est requis.",
      });
    }
    if (!Array.isArray(weightedCriteria) || weightedCriteria.length === 0) {
      return res.status(400).json({
        error: "Le champ 'weightedCriteria' doit être un tableau non vide.",
      });
    }
    if (!Array.isArray(versions) || versions.length < 2) {
      return res.status(400).json({
        error: "Au moins 2 versions non vides sont requises pour comparer.",
      });
    }

    const sanitizedVersions = versions.map((v) => ({
      id: v.id,
      source: v.source,
      content: v.content,
    }));

    const prompt = buildComparePrompt(task, weightedCriteria, sanitizedVersions);

    let raw;
    let usedProvider = "gemini";

    try {
      raw = await generateWithGemini(prompt);
    } catch (geminiErr) {
      console.warn(
        "[compare] Gemini failed, falling back to Groq:",
        geminiErr.message
      );
      try {
        raw = await generateWithGroq(prompt);
        usedProvider = "groq";
      } catch (groqErr) {
        console.error("[compare] both providers failed:", {
          gemini: geminiErr.message,
          groq: groqErr.message,
        });
        return res.status(502).json({
          error:
            "La comparaison a échoué auprès de Gemini et Groq. Réessayez dans quelques instants.",
          details: {
            gemini: geminiErr.message,
            groq: groqErr.message,
          },
        });
      }
    }

    let parsed;
    try {
      parsed = parseJsonFromLlm(raw);
    } catch (parseErr) {
      console.error("[compare] JSON parse failed:", parseErr.message);
      return res.status(502).json({
        error:
          "La réponse du modèle n'était pas un JSON valide. Réessayez la comparaison.",
      });
    }

    if (!isValidCompareResponse(parsed)) {
      return res.status(502).json({
        error:
          "La structure de la réponse de comparaison est invalide. Réessayez.",
      });
    }

    // Normalize confidence
    const level = String(parsed.final_verdict.confidence_level || "")
      .toLowerCase()
      .trim();
    if (!["high", "medium", "low"].includes(level)) {
      parsed.final_verdict.confidence_level = "medium";
    } else {
      parsed.final_verdict.confidence_level = level;
    }

    parsed.evaluations = addWeightedTotals(
      parsed.evaluations,
      weightedCriteria
    );

    // Sort evaluations by weighted_total desc for convenience
    parsed.evaluations.sort(
      (a, b) => (b.weighted_total || 0) - (a.weighted_total || 0)
    );

    parsed.meta = { provider_used: usedProvider };

    return res.json(parsed);
  } catch (err) {
    console.error("[compare] unexpected:", err);
    return res.status(500).json({
      error: err.message || "Erreur inattendue lors de la comparaison.",
    });
  }
});

module.exports = router;
