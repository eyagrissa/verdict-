# AI orchestration

Server-side model adapters support Groq, Llama, Gemini, DeepSeek, and Claude. Add one or more corresponding API keys in the root `.env.local`; only keyed providers are enabled. Groq currently defaults to GPT-OSS 20B, GPT-OSS 120B, Qwen 3.8 27B, and ALLAM 2 7B; the Llama target defaults to Llama 3.2 11B. Each provider's comma-separated `*_MODELS` override can select alternative model IDs. A maximum of six unique targets are used for a comparison. Access, quotas, and prices depend on the provider account; failures are returned individually while successful responses remain available.

## Exports

- `generateWithGroq(task)`, `generateWithLlama(task)`, `generateWithClaude(task)`, and `generateWithAdditionalProvider(provider, task)` return validated `Candidate` values.
- `analyzeTask(task)` returns a task analysis.
- `generateRubric(task)` proposes task-specific evaluation criteria.
- `evaluateCandidates(task, candidates, criteria)` returns one score per candidate/criterion pair.
- `runVerdictWorkflow({ task, candidates?, providers? })` runs analysis, candidate generation, and rubric creation.

Shared types and Zod schemas are in `lib/ai/types.ts`. Provider and stage failures are returned in `providerErrors`; analysis may be null and criteria may be empty when generation fails.
