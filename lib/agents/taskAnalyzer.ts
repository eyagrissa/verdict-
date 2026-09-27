import { generateStructured } from "../ai/structuredOutput";
import { TaskAnalysisSchema, type TaskAnalysis } from "../ai/types";

export async function analyzeTask(task: string): Promise<TaskAnalysis> {
  if (!task.trim()) {
    throw new Error("Task must not be empty.");
  }

  return generateStructured(
    [
      "Analyze the user's task without evaluating or choosing between candidate answers.",
      "Return only JSON with domain set exactly to one of: software development, writing, business, marketing, education, analysis, general. Use software development for programming or code tasks. Include taskType (short label) and summary (one concise sentence).",
      "Task:",
      task,
    ].join("\n\n"),
    TaskAnalysisSchema,
  );
}