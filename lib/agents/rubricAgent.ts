import { generateStructured } from "../ai/structuredOutput";
import { CriteriaSchema, type Criterion } from "../ai/types";
import { z } from "zod";

const RubricResponseSchema = z.object({ criteria: CriteriaSchema }).strict();

export async function generateRubric(task: string): Promise<Criterion[]> {
  if (!task.trim()) {
    throw new Error("Task must not be empty.");
  }

  const response = await generateStructured(
    [
      "Propose an evaluation rubric adapted specifically to the user's original task.",
      "Return only a JSON object with a criteria array of 3 or 4 distinct criteria.",
      "Give each criterion a short name (2-5 words) and a concise, task-specific description (one sentence). Each criterion must have id (stable lowercase identifier), weight (number from 0 to 10), and maxScore (exactly 10).",
      "Weights are suggestions only: the user will review and may change every weight. Do not evaluate answers or choose a winner.",
      "Task:",
      task,
    ].join("\n\n"),
    RubricResponseSchema,
  );

  return CriteriaSchema.parse(response.criteria);
}