import { CandidateSchema, type Candidate } from "./types";

const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";
const CLAUDE_API_VERSION = "2023-06-01";
const DEFAULT_MODEL = "claude-haiku-4-5";

export async function requestClaude(
  prompt: string,
  jsonResponse = false,
  modelId = process.env.CLAUDE_MODEL ?? DEFAULT_MODEL,
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured.");
  }
  const timeoutMs = Math.max(1_000, Number(process.env.AI_PROVIDER_TIMEOUT_MS) || 20_000);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(CLAUDE_API_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": CLAUDE_API_VERSION,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: modelId,
        max_tokens: 8_192,
        messages: [{
          role: "user",
          content: jsonResponse ? `${prompt}\n\nReturn only valid JSON, with no markdown fences or surrounding commentary.` : prompt,
        }],
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Claude API returned HTTP ${response.status}: ${(await response.text()).slice(0, 500)}`);
    }
    const body: unknown = await response.json();
    if (!body || typeof body !== "object" || !("content" in body) || !Array.isArray(body.content)) {
      throw new Error("Claude returned an invalid response.");
    }
    const text = body.content
      .flatMap((block) => block && typeof block === "object" && "type" in block && block.type === "text" && "text" in block && typeof block.text === "string" ? [block.text] : [])
      .join("")
      .trim();
    if (!text) {
      throw new Error("Claude returned no text content.");
    }
    return text;
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(`Claude request timed out after ${timeoutMs / 1_000} seconds.`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateWithClaude(
  task: string,
  modelId = process.env.CLAUDE_MODEL ?? DEFAULT_MODEL,
  modelName = "Claude Haiku 4.5",
): Promise<Candidate> {
  if (!task.trim()) {
    throw new Error("Task must not be empty.");
  }
  const content = await requestClaude(task, false, modelId);
  return CandidateSchema.parse({
    id: `candidate-claude-${modelId.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`,
    source: "claude",
    modelId,
    modelName,
    content,
  });
}
