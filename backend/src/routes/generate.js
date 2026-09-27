const express = require("express");
const { generateWithGemini } = require("../services/gemini");
const { generateWithGroq } = require("../services/groq");

const router = express.Router();

const UNAVAILABLE_MSG =
  "Génération indisponible, réessayez ou ajoutez une version manuellement.";

router.post("/generate", async (req, res) => {
  try {
    const task = typeof req.body?.task === "string" ? req.body.task.trim() : "";
    if (!task) {
      return res.status(400).json({
        error: "Le champ 'task' est requis et doit être une chaîne non vide.",
      });
    }

    const prompt = `Réalise la tâche suivante de façon claire et complète. Réponds uniquement avec le livrable demandé, sans préambule inutile.\n\nTâche : ${task}`;

    const [geminiResult, groqResult] = await Promise.allSettled([
      generateWithGemini(prompt),
      generateWithGroq(prompt),
    ]);

    const versions = [];
    const errors = [];

    if (geminiResult.status === "fulfilled") {
      versions.push({
        id: "gemini",
        source: "Gemini",
        content: geminiResult.value,
      });
    } else {
      console.error("[generate] Gemini error:", geminiResult.reason?.message);
      errors.push({
        provider: "gemini",
        message: UNAVAILABLE_MSG,
      });
    }

    if (groqResult.status === "fulfilled") {
      versions.push({
        id: "groq",
        source: "Groq",
        content: groqResult.value,
      });
    } else {
      console.error("[generate] Groq error:", groqResult.reason?.message);
      errors.push({
        provider: "groq",
        message: UNAVAILABLE_MSG,
      });
    }

    return res.json({ versions, errors });
  } catch (err) {
    console.error("[generate] unexpected:", err);
    return res.status(500).json({
      error: err.message || "Erreur inattendue lors de la génération.",
      versions: [],
      errors: [],
    });
  }
});

module.exports = router;
