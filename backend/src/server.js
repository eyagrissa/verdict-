const path = require("path");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

// Load .env from backend/ then project root (so either location works)
dotenv.config({ path: path.join(__dirname, "../.env") });
dotenv.config({ path: path.join(__dirname, "../../.env") });

const generateRouter = require("./routes/generate");
const suggestCriteriaRouter = require("./routes/suggestCriteria");
const compareRouter = require("./routes/compare");

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "verdict",
    geminiKeyConfigured: Boolean(process.env.GEMINI_API_KEY?.trim()),
    groqKeyConfigured: Boolean(process.env.GROQ_API_KEY?.trim()),
  });
});

app.use("/api", generateRouter);
app.use("/api", suggestCriteriaRouter);
app.use("/api", compareRouter);

// Serve frontend static files in production / single-process mode
const frontendPath = path.join(__dirname, "../../frontend");
app.use(express.static(frontendPath));

app.use((err, _req, res, _next) => {
  console.error("[server] unhandled:", err);
  res.status(500).json({
    error: err.message || "Erreur serveur inattendue.",
  });
});

app.listen(PORT, () => {
  console.log(`Verdict backend listening on http://localhost:${PORT}`);
  console.log(
    `GEMINI_API_KEY: ${process.env.GEMINI_API_KEY?.trim() ? "ok" : "MISSING"}`
  );
  console.log(
    `GROQ_API_KEY: ${process.env.GROQ_API_KEY?.trim() ? "ok" : "MISSING"}`
  );
});
