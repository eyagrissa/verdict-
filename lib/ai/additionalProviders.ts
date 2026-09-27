import { CandidateSchema, type Candidate } from "./types";

const OPENAI_COMPATIBLE_ENDPOINTS = {
  deepseek: "https://api.deepseek.com/chat/completions",
} as const;

function getTimeoutMs(): number {
  return Math.max(1_000, Number(process.env.AI_PROVIDER_TIMEOUT_MS) || 20_000);
}

export async function requestAdditionalProvider(
  provider: "gemini" | "deepseek",
  prompt: string,
  jsonResponse = false,
  modelId: string,
): Promise<string> {
  const keyName = provider === "gemini" ? "GEMINI_API_KEY" : "DEEPSEEK_API_KEY";
  const apiKey = process.env[keyName];
  if (!apiKey) {
    throw new Error(`${keyName} is not configured.`);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), getTimeoutMs());
  try {
    if (provider === "gemini") {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelId)}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0,
              maxOutputTokens: 8_192,
              ...(jsonResponse ? { responseMimeType: "application/json" } : {}),
            },
          }),
          signal: controller.signal,
        },
      );
      if (!response.ok) {
        throw new Error(`Gemini API returned HTTP ${response.status}: ${(await response.text()).slice(0, 500)}`);
      }

      const body: unknown = await response.json();
      if (!body || typeof body !== "object" || !("candidates" in body) || !Array.isArray(body.candidates)) {
        throw new Error("Gemini returned an invalid response.");
      }
      const firstCandidate: unknown = body.candidates[0];
      if (!firstCandidate || typeof firstCandidate !== "object" || !("content" in firstCandidate)) {
        throw new Error("Gemini returned no candidate.");
      }
      const content = firstCandidate.content;
      if (!content || typeof content !== "object" || !("parts" in content) || !Array.isArray(content.parts)) {
        throw new Error("Gemini returned no text content.");
      }
      const text = content.parts
        .flatMap((part) => part && typeof part === "object" && "text" in part && typeof part.text === "string" ? [part.text] : [])
        .join("")
        .trim();
      if (!text) {
        throw new Error("Gemini returned no text content.");
      }
      return text;
    }

    const response = await fetch(OPENAI_COMPATIBLE_ENDPOINTS.deepseek, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelId,
        messages: [{ role: "user", content: prompt }],
        temperature: 0,
        max_tokens: 8_192,
        ...(jsonResponse ? { response_format: { type: "json_object" } } : {}),
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`DeepSeek API returned HTTP ${response.status}: ${(await response.text()).slice(0, 500)}`);
    }
    const body: unknown = await response.json();
    if (!body || typeof body !== "object" || !("choices" in body) || !Array.isArray(body.choices)) {
      throw new Error("DeepSeek returned an invalid response.");
    }
    const choice: unknown = body.choices[0];
    if (!choice || typeof choice !== "object" || !("message" in choice)) {
      throw new Error("DeepSeek returned no candidate.");
    }
    const message = choice.message;
    if (!message || typeof message !== "object" || !("content" in message) || typeof message.content !== "string" || !message.content.trim()) {
      throw new Error("DeepSeek returned no text content.");
    }
    return message.content.trim();
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(`${provider === "gemini" ? "Gemini" : "DeepSeek"} request timed out.`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateWithAdditionalProvider(
  provider: "gemini" | "deepseek",
  task: string,
  modelId: string,
  modelName: string,
): Promise<Candidate> {
  if (!task.trim()) {
    throw new Error("Task must not be empty.");
  }
  const content = await requestAdditionalProvider(provider, task, false, modelId);
  return CandidateSchema.parse({
    id: `candidate-${provider}-${modelId.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`,
    source: provider,
    modelId,
    modelName,
    content,
  });
}
