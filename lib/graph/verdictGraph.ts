import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { analyzeTask } from "../agents/taskAnalyzer";
import { generateRubric } from "../agents/rubricAgent";
import { generateCandidates } from "../ai/structuredOutput";
import {
  AIServiceError,
  CandidateSchema,
  ProviderSchema,
  type Candidate,
  type Criterion,
  type Provider,
  type ProviderFailure,
  type TaskAnalysis,
} from "../ai/types";

const VerdictState = Annotation.Root({
  task: Annotation<string>(),
  generationTask: Annotation<string>(),
  providers: Annotation<Provider[]>(),
  candidates: Annotation<Candidate[]>(),
  analysis: Annotation<TaskAnalysis | null>(),
  criteria: Annotation<Criterion[]>(),
  providerErrors: Annotation<ProviderFailure[]>(),
});

const workflow = new StateGraph(VerdictState)
  .addNode("prepare", async ({ task, generationTask, providers, candidates }) => {
    const [analysisResult, candidateResult, rubricResult] = await Promise.allSettled([
      analyzeTask(task),
      generateCandidates(generationTask, providers),
      generateRubric(task),
    ]);

    const providerErrors: ProviderFailure[] = [];
    const analysis = analysisResult.status === "fulfilled" ? analysisResult.value : null;
    if (analysisResult.status === "rejected") {
      providerErrors.push(...getStageFailures(analysisResult.reason, "Task analysis"));
    }

    const generated = candidateResult.status === "fulfilled"
      ? candidateResult.value
      : { candidates: [], failures: getStageFailures(candidateResult.reason, "Candidate generation") };
    if (candidateResult.status === "fulfilled") {
      providerErrors.push(...generated.failures);
    } else {
      providerErrors.push(...generated.failures);
    }

    const existingIds = new Set(candidates.map(({ id }) => id));
    const acceptedCandidates = generated.candidates.filter(({ id }) => !existingIds.has(id));
    const collisions = generated.candidates
      .filter(({ id }) => existingIds.has(id))
      .map(({ source }) => ({
        provider: source as Provider,
        message: `Generated candidate ID conflicts with an existing candidate: candidate-${source}.`,
      }));
    providerErrors.push(...collisions);

    const criteria = rubricResult.status === "fulfilled" ? rubricResult.value : [];
    if (rubricResult.status === "rejected") {
      providerErrors.push(...getStageFailures(rubricResult.reason, "Rubric generation"));
    }

    return { analysis, candidates: [...candidates, ...acceptedCandidates], criteria, providerErrors };
  })
  .addEdge(START, "prepare")
  .addEdge("prepare", END)
  .compile();

export type VerdictWorkflowInput = {
  task: string;
  generationTask?: string;
  candidates?: Candidate[];
  providers?: Provider[];
};

export type VerdictWorkflowResult = {
  analysis: TaskAnalysis | null;
  candidates: Candidate[];
  criteria: Criterion[];
  providerErrors: ProviderFailure[];
};

export async function runVerdictWorkflow(input: VerdictWorkflowInput): Promise<VerdictWorkflowResult> {
  if (!input.task.trim()) {
    throw new Error("Task must not be empty.");
  }

  const candidates = CandidateSchema.array().parse(input.candidates ?? []);
  if (new Set(candidates.map(({ id }) => id)).size !== candidates.length) {
    throw new Error("Candidate IDs must be unique.");
  }
  const providers = (input.providers ?? ["groq", "llama", "gemini", "deepseek", "claude"]).map((provider) => ProviderSchema.parse(provider));
  if (new Set(providers).size !== providers.length) {
    throw new Error("Provider selections must be unique.");
  }
  const result = await workflow.invoke({
    task: input.task,
    generationTask: input.generationTask ?? input.task,
    candidates,
    providers,
    analysis: null,
    criteria: [],
    providerErrors: [],
  });

  return {
    analysis: result.analysis,
    candidates: result.candidates,
    criteria: result.criteria,
    providerErrors: result.providerErrors,
  };
}

function getStageFailures(error: unknown, stage: string): ProviderFailure[] {
  if (error instanceof AIServiceError && error.failures.length > 0) {
    return error.failures.map((failure) => ({
      ...failure,
      message: `${stage}: ${failure.message}`,
    }));
  }

  return [{
    provider: "groq",
    message: `${stage}: ${error instanceof Error ? error.message : "Unknown error."}`,
  }];
}