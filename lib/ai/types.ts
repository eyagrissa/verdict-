import { z } from "zod";

export const ProviderSchema = z.enum(["groq", "llama", "gemini", "deepseek", "claude"]);
export const CandidateSourceSchema = z.enum(["groq", "llama", "gemini", "deepseek", "claude", "manual"]);

export const CandidateSchema = z.object({
  id: z.string().min(1),
  source: CandidateSourceSchema,
  modelId: z.string().min(1).optional(),
  modelName: z.string().min(1).optional(),
  content: z.string().min(1),
}).strict();

export const CriterionSchema = z.object({
  id: z.preprocess((value) => typeof value === "number" ? String(value) : value, z.string().min(1)),
  name: z.string().min(1),
  description: z.string().min(1),
  weight: z.number().min(0).max(10),
  maxScore: z.literal(10),
}).strict();

export const CriteriaSchema = z.array(CriterionSchema).min(3).max(4).superRefine((criteria, context) => {
  const ids = criteria.map((criterion) => criterion.id);
  if (new Set(ids).size !== ids.length) {
    context.addIssue({ code: "custom", message: "Criterion IDs must be unique." });
  }
});

export const TaskDomainSchema = z.enum([
  "software development",
  "writing",
  "business",
  "marketing",
  "education",
  "analysis",
  "general",
]);

const taskDomainAliases: Record<string, z.infer<typeof TaskDomainSchema>> = {
  code: "software development",
  coding: "software development",
  "code generation": "software development",
  programming: "software development",
  "software engineering": "software development",
  technology: "software development",
  tech: "software development",
  copywriting: "writing",
  "creative writing": "writing",
  "content writing": "writing",
  strategy: "business",
  "business strategy": "business",
  entrepreneurship: "business",
  advertising: "marketing",
  branding: "marketing",
  promotion: "marketing",
  learning: "education",
  teaching: "education",
  tutoring: "education",
  research: "analysis",
  "data analysis": "analysis",
  other: "general",
};

export const TaskAnalysisSchema = z.object({
  domain: z.preprocess((value) => {
    if (typeof value !== "string") {
      return value;
    }

    const normalized = value.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
    if (TaskDomainSchema.options.includes(normalized as z.infer<typeof TaskDomainSchema>)) {
      return normalized;
    }

    return taskDomainAliases[normalized] ?? "general";
  }, TaskDomainSchema),
  taskType: z.string().min(1),
  summary: z.string().min(1),
}).strict();

export const EvaluationSchema = z.object({
  candidateId: z.string().min(1),
  criterionId: z.string().min(1),
  score: z.number().min(0).max(10),
  justification: z.string().min(1),
}).strict();

export const EvaluationsSchema = z.array(EvaluationSchema);

export type Provider = z.infer<typeof ProviderSchema>;
export type Candidate = z.infer<typeof CandidateSchema>;
export type Criterion = z.infer<typeof CriterionSchema>;
export type TaskAnalysis = z.infer<typeof TaskAnalysisSchema>;
export type Evaluation = z.infer<typeof EvaluationSchema>;

export type ProviderFailure = {
  provider: Provider;
  modelId?: string;
  modelName?: string;
  message: string;
};

export class AIServiceError extends Error {
  constructor(message: string, public readonly failures: ProviderFailure[]) {
    super(message);
    this.name = "AIServiceError";
  }
}