import { CandidateSchema, type Candidate } from "./types";
import { z } from "zod";

const API_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const DEFAULT_MODEL = "meta/llama-3.2-11b-vision-instruct";
const LlamaResponseSchema = z.object({
  choices: z.array(z.object({
    message: z.object({ content: z.string().nullable() }),
  })).min(1),
});

function getApiKey(): string {
  const apiKey = process.env.LLAMA_API_KEY || process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    throw new Error("LLAMA_API_KEY is not configured.");
  }
  return apiKey;
}

export async function requestLlama(
  prompt: string,
  jsonResponse = false,
  modelId = DEFAULT_MODEL,
): Promise<string> {
  const timeoutMs = Math.max(1_000, Number(process.env.LLAMA_TIMEOUT_MS) || 60_000);
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: modelId,
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
      max_tokens: jsonResponse || /logo|viewBox/i.test(prompt) ? 1_024 : 2_048,
      ...(jsonResponse ? { response_format: { type: "json_object" } } : {}),
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500);
    throw new Error(`Llama request failed (${response.status}): ${detail}`);
  }

  const result = LlamaResponseSchema.safeParse(await response.json());
  if (!result.success) {
    throw new Error("Llama returned an invalid response.");
  }
  const content = result.data.choices[0].message.content;
  if (!content?.trim()) {
    throw new Error("Llama returned no text content.");
  }
  return content.trim();
}

export async function generateWithLlama(
  task: string,
  modelId = DEFAULT_MODEL,
  modelName = "Llama 3.2 11B",
): Promise<Candidate> {
  if (!task.trim()) {
    throw new Error("Task must not be empty.");
  }

  const content = await requestLlama(task, false, modelId);
  return CandidateSchema.parse({
    id: `candidate-llama-${modelId.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`,
    source: "llama",
    modelId,
    modelName,
    content,
  });
}
