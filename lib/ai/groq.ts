import Groq from "groq-sdk";
import { CandidateSchema, type Candidate } from "./types";

export async function requestGroq(
  prompt: string,
  jsonResponse = false,
  modelId = process.env.GROQ_MODEL ?? "openai/gpt-oss-20b",
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not configured.");
  }

  const timeoutMs = Math.max(1_000, Number(process.env.GROQ_TIMEOUT_MS) || 12_000);
  const client = new Groq({ apiKey, timeout: timeoutMs, maxRetries: 0 });
  const maxCompletionTokens = modelId.startsWith("qwen/")
    ? 900
    : modelId === "allam-2-7b"
      ? 1_024
      : 4_096;
  const reasoningEffort = modelId.startsWith("openai/gpt-oss-") ? "low" : undefined;
  const result = await client.chat.completions.create({
    model: modelId,
    messages: [{ role: "user", content: prompt }],
    temperature: 0,
    max_completion_tokens: maxCompletionTokens,
    ...(reasoningEffort ? { reasoning_effort: reasoningEffort } : {}),
    ...(jsonResponse ? { response_format: { type: "json_object" as const } } : {}),
  });
  const choice = result.choices[0];
  const content = choice?.message.content?.trim();
  if (!content) {
    throw new Error(`Groq returned no text content (finish reason: ${choice?.finish_reason ?? "unknown"}).`);
  }
  return content;
}

export async function generateWithGroq(
  task: string,
  modelId = process.env.GROQ_MODEL ?? "openai/gpt-oss-20b",
  modelName = modelId,
): Promise<Candidate> {
  if (!task.trim()) {
    throw new Error("Task must not be empty.");
  }

  const content = await requestGroq(task, false, modelId);
  return CandidateSchema.parse({
    id: `candidate-groq-${modelId.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`,
    source: "groq",
    modelId,
    modelName,
    content,
  });
}