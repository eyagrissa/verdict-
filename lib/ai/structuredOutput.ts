import { generateWithGroq, requestGroq } from "./groq";
import { getModelTargets } from "./models";
import { generateWithAdditionalProvider, requestAdditionalProvider } from "./additionalProviders";
import { generateWithClaude, requestClaude } from "./claude";
import { generateWithLlama, requestLlama } from "./llama";
import {
  AIServiceError,
  ProviderSchema,
  type Provider,
  type ProviderFailure,
} from "./types";
import { z } from "zod";

function parseJsonResponse(content: string): unknown {
  const unfenced = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(unfenced);
}

export async function generateStructured<T>(prompt: string, schema: z.ZodType<T>): Promise<T> {
  const configuredProviders = (["groq", "llama", "gemini", "deepseek", "claude"] as const).filter((provider) =>
    Boolean(provider === "claude"
      ? process.env.ANTHROPIC_API_KEY
      : provider === "llama"
        ? process.env.LLAMA_API_KEY || process.env.NVIDIA_API_KEY
        : process.env[`${provider.toUpperCase()}_API_KEY`]),
  );
  const failures: ProviderFailure[] = [];

  if (configuredProviders.length === 0) {
    failures.push(
      { provider: "groq", message: "GROQ_API_KEY is not configured." },
      { provider: "llama", message: "LLAMA_API_KEY is not configured." },
      { provider: "gemini", message: "GEMINI_API_KEY is not configured." },
      { provider: "deepseek", message: "DEEPSEEK_API_KEY is not configured." },
      { provider: "claude", message: "ANTHROPIC_API_KEY is not configured." },
    );
    throw new AIServiceError(
      "No AI provider is configured. Set GROQ_API_KEY, LLAMA_API_KEY, GEMINI_API_KEY, DEEPSEEK_API_KEY, or ANTHROPIC_API_KEY.",
      failures,
    );
  }

  for (const provider of configuredProviders) {
    try {
      const content = provider === "groq"
        ? await requestGroq(prompt, true)
        : provider === "llama"
          ? await requestLlama(prompt, true)
        : provider === "claude"
          ? await requestClaude(prompt, true)
          : await requestAdditionalProvider(provider, prompt, true, provider === "gemini" ? "gemini-2.5-flash" : "deepseek-chat");
      return schema.parse(parseJsonResponse(content));
    } catch (error) {
      failures.push({
        provider,
        message: error instanceof Error ? error.message : "Unknown provider error.",
      });
    }
  }

  throw new AIServiceError(
    `All configured AI providers failed: ${failures.map(({ provider, message }) => `${provider}: ${message}`).join("; ")}`,
    failures,
  );
}

export async function generateCandidates(
  task: string,
  providers: Provider[] = ["groq", "llama", "gemini", "deepseek", "claude"],
) {
  const selectedProviders = z.array(ProviderSchema).parse(providers);
  const targets = getModelTargets(selectedProviders);
  const results = await Promise.allSettled(targets.map((target) => {
    switch (target.provider) {
      case "groq":
        return generateWithGroq(task, target.modelId, target.modelName);
      case "llama":
        return generateWithLlama(task, target.modelId, target.modelName);
      case "gemini":
      case "deepseek":
        return generateWithAdditionalProvider(target.provider, task, target.modelId, target.modelName);
      case "claude":
        return generateWithClaude(task, target.modelId, target.modelName);
    }
  }));
  const candidates = results.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
  const failures = results.flatMap((result, index) => result.status === "rejected"
    ? [{
        provider: targets[index].provider,
        modelId: targets[index].modelId,
        modelName: targets[index].modelName,
        message: result.reason instanceof Error ? result.reason.message : "Unknown provider error.",
      }]
    : []);

  return { candidates, failures };
}