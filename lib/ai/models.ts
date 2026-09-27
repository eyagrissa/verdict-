import type { Provider } from "./types";

export type ModelTarget = {
  provider: Provider;
  modelId: string;
  modelName: string;
};

const defaultModels: Record<Provider, Omit<ModelTarget, "provider">[]> = {
  groq: [
    { modelId: "openai/gpt-oss-20b", modelName: "GPT-OSS 20B" },
    { modelId: "openai/gpt-oss-120b", modelName: "GPT-OSS 120B" },
    { modelId: "qwen/qwen3.8-27b", modelName: "Qwen 3.8 27B" },
    { modelId: "allam-2-7b", modelName: "ALLAM 2 7B" },
  ],
  llama: [
    { modelId: "meta/llama-3.2-11b-vision-instruct", modelName: "Llama 3.2 11B" },
  ],
  gemini: [
    { modelId: "gemini-2.5-flash", modelName: "Gemini 2.5 Flash" },
  ],
  deepseek: [
    { modelId: "deepseek-chat", modelName: "DeepSeek Chat" },
  ],
  claude: [
    { modelId: "claude-haiku-4-5", modelName: "Claude Haiku 4.5" },
  ],
};

const MAX_MODEL_TARGETS = 6;

const providerSettings: Record<Provider, { key: string; plural: string; singular: string }> = {
  groq: { key: "GROQ_API_KEY", plural: "GROQ_MODELS", singular: "GROQ_MODEL" },
  llama: { key: "LLAMA_API_KEY", plural: "LLAMA_MODELS", singular: "LLAMA_MODEL" },
  gemini: { key: "GEMINI_API_KEY", plural: "GEMINI_MODELS", singular: "GEMINI_MODEL" },
  deepseek: { key: "DEEPSEEK_API_KEY", plural: "DEEPSEEK_MODELS", singular: "DEEPSEEK_MODEL" },
  claude: { key: "ANTHROPIC_API_KEY", plural: "CLAUDE_MODELS", singular: "CLAUDE_MODEL" },
};

function modelTargetsFor(provider: Provider): ModelTarget[] {
  const settings = providerSettings[provider];
  const apiKey = process.env[settings.key] || (provider === "llama" ? process.env.NVIDIA_API_KEY : undefined);
  if (!apiKey) {
    return [];
  }

  const override = process.env[settings.plural] ?? process.env[settings.singular];
  const models = [...new Set(override
    ? override.split(",").map((modelId) => modelId.trim()).filter(Boolean)
    : defaultModels[provider].map(({ modelId }) => modelId))];

  return models.map((modelId) => ({
    provider,
    modelId,
    modelName: defaultModels[provider].find((model) => model.modelId === modelId)?.modelName
      ?? modelId.split("/").at(-1)?.replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
      ?? modelId,
  }));
}

export function getModelTargets(providers: Provider[]): ModelTarget[] {
  return [...new Set(providers)].flatMap(modelTargetsFor).slice(0, MAX_MODEL_TARGETS);
}

export function getConfiguredModelCount(): number {
  return getModelTargets(["groq", "llama", "gemini", "deepseek", "claude"]).length;
}