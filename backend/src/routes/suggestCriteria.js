const express = require("express");
const { generateWithGemini } = require("../services/gemini");
const { parseJsonFromLlm } = require("../utils/parseJson");

const router = express.Router();

const FALLBACK = {
  domain_detected: "générique",
  criteria_suggested: [
    {
      name: "Qualité",
      default_weight: 7,
      short_description: "Qualité générale du résultat",
    },
    {
      name: "Clarté",
      default_weight: 6,
      short_description: "Facilité de compréhension",
    },
    {
      name: "Pertinence",
      default_weight: 8,
      short_description: "Adéquation avec la tâche demandée",
    },
  ],
};

function buildSuggestPrompt(task, versionsPreview) {
  const previewText = Array.isArray(versionsPreview)
    ? versionsPreview.join("\n---\n")
    : String(versionsPreview || "");

  return `Tu prépares une grille d'évaluation pour une tâche spécifique.

ENTRÉE :
- Tâche : ${task}
- Aperçu des versions à comparer : ${previewText}

INSTRUCTIONS :
1. Identifie le domaine (code / rédaction de texte / stratégie business / design / autre)
2. Propose 3 à 4 critères d'évaluation vraiment pertinents pour CE domaine et cette tâche précise
3. Suggère un poids par défaut (0-10) pour chaque critère

Réponds en JSON STRICT uniquement, sans aucun autre texte, sans balises markdown :
{
  "domain_detected": "...",
  "criteria_suggested": [
    {"name": "...", "default_weight": 0-10, "short_description": "..."}
  ]
}`;
}

function isValidCriteriaResponse(data) {
  return (
    data &&
    typeof data.domain_detected === "string" &&
    Array.isArray(data.criteria_suggested) &&
    data.criteria_suggested.length > 0 &&
    data.criteria_suggested.every(
      (c) =>
        c &&
        typeof c.name === "string" &&
        typeof c.short_description === "string" &&
        typeof c.default_weight === "number"
    )
  );
}

router.post("/suggest-criteria", async (req, res) => {
  try {
    const task = typeof req.body?.task === "string" ? req.body.task.trim() : "";
    const versionsPreview = req.body?.versionsPreview;

    if (!task) {
      return res.status(400).json({
        error: "Le champ 'task' est requis et doit être une chaîne non vide.",
      });
    }

    const prompt = buildSuggestPrompt(task, versionsPreview);

    try {
      const raw = await generateWithGemini(prompt);
      const parsed = parseJsonFromLlm(raw);

      if (!isValidCriteriaResponse(parsed)) {
        console.warn("[suggest-criteria] structure invalide, fallback");
        return res.json(FALLBACK);
      }

      // Clamp weights 0–10
      parsed.criteria_suggested = parsed.criteria_suggested.map((c) => ({
        name: c.name,
        short_description: c.short_description,
        default_weight: Math.min(10, Math.max(0, Number(c.default_weight) || 0)),
      }));

      return res.json(parsed);
    } catch (err) {
      console.error("[suggest-criteria] fallback:", err.message);
      return res.json(FALLBACK);
    }
  } catch (err) {
    console.error("[suggest-criteria] unexpected:", err);
    return res.json(FALLBACK);
  }
});

module.exports = router;
