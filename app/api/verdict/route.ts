import { z } from "zod";
import { evaluateCandidates } from "@/lib/agents/evaluatorAgent";
import { runVerdictWorkflow } from "@/lib/graph/verdictGraph";
import { AIServiceError } from "@/lib/ai/types";
import type { Evaluation } from "@/lib/ai/types";
import { getConfiguredModelCount, getModelTargets } from "@/lib/ai/models";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  const models = getModelTargets(["groq", "llama", "gemini", "deepseek", "claude"]);
  return Response.json({
    count: models.length,
    models: models.map(({ provider, modelId, modelName }) => ({ provider, modelId, modelName })),
    imageGenerationAvailable: Boolean(process.env.GEMINI_API_KEY),
  });
}

const VerdictRequestSchema = z.object({
  task: z.string().min(1).max(12_000).refine((task) => task.trim().length > 0),
  taskType: z.enum(["logo", "cover_letter", "email", "article", "code", "general"]).optional(),
}).strict();

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: "Request body must be valid JSON." }, { status: 400 });
  }

  const input = VerdictRequestSchema.safeParse(body);
  if (!input.success) {
    return Response.json({ message: "Provide a non-empty task of at most 12,000 characters." }, { status: 400 });
  }

  const { task, taskType = "general" } = input.data;
  const workflow = await runVerdictWorkflow({ task, generationTask: buildGenerationTask(task, taskType) });
  const providerErrors = [...workflow.providerErrors];
  let evaluations: Evaluation[] = [];
  let evaluationError: string | null = null;

  if (workflow.candidates.length > 0 && workflow.criteria.length > 0) {
    try {
      evaluations = await evaluateCandidates(task, workflow.candidates, workflow.criteria);
    } catch (error) {
      if (error instanceof AIServiceError) {
        providerErrors.push(...error.failures.map((failure) => ({
          ...failure,
          message: `Evaluation: ${failure.message}`,
        })));
      }
      evaluationError = error instanceof Error ? error.message : "Candidate evaluation failed.";
    }
  }

  const result = {
    id: crypto.randomUUID(),
    prompt: task,
    taskType,
    analysis: workflow.analysis,
    candidates: workflow.candidates,
    expectedModelCount: getConfiguredModelCount(),
    criteria: workflow.criteria,
    evaluations,
    providerErrors,
    evaluationError,
    createdAt: new Date().toISOString(),
  };

  if (workflow.candidates.length === 0) {
    return Response.json({
      ...result,
      message: "No AI provider returned a candidate. Check that a supported provider API key is configured and its model is currently available to your account.",
    }, { status: 503 });
  }

  return Response.json(result);
}

function buildGenerationTask(task: string, taskType: z.infer<typeof VerdictRequestSchema>["taskType"]): string {
  const formatInstructions: Record<NonNullable<typeof taskType>, string> = {
    logo: "Create a distinctive logo as artwork, not an essay. Return a tagline of at most 6 words, then one valid, self-contained SVG in a fenced svg block. Draw a memorable emblem and readable brand name using a deliberate palette that follows the request. Use a 512 by 512 viewBox, transparent canvas, simple inline vector shapes, and no external assets, links, scripts, CSS, or explanation. Keep the SVG compact (12 shapes maximum) so it renders reliably.",
    cover_letter: "Format the answer as a concise, polished cover letter with readable paragraphs, a greeting, and sign-off. Do not include a design explanation.",
    email: "Format the answer as a real email with a clear Subject line, greeting, concise body, and sign-off.",
    article: "Format the answer as a publication-ready article with a title, clear section headings, readable paragraphs, and a concise conclusion.",
    code: "When the user asks for a website, web app, landing page, dashboard, or UI, create a complete, polished, interactive web experience—not a wireframe, plain text, or static beginner demo. Return exactly one complete, runnable, standalone HTML document in one fenced html code block. Include semantic HTML, a substantial original CSS system (rich coordinated colors, typography, responsive layout, details, and motion), and meaningful vanilla JavaScript in the same file. Implement every visible control with real behavior: navigation, forms, filters, dialogs, toggles, menus, and state changes should actually work. Add realistic sample content and sensible empty/loading/success states where useful. Make it responsive, keyboard accessible, and visually complete on first render; use inline SVG for icons and imagery rather than external assets. Keep interactions client-side and avoid external dependencies or network calls. Do not output a setup explanation or placeholder comments instead of implementation. For other coding tasks, provide complete runnable code in the appropriate language and concise usage notes.",
    general: "Answer directly and format the result for easy reading. If the requested result is a visual design or interface, include a standalone SVG or HTML code block that can be previewed.",
  };

  const outputRequirements = taskType === "code"
    ? "\n\nQuality requirements: Prioritize a complete, polished, working implementation over a tiny example. Prefer readable, production-minded structure; include all logic needed for the requested behavior."
    : "";
  return `${task}\n\nPresentation requirements: ${formatInstructions[taskType ?? "general"]}${outputRequirements}`;
}