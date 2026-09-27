import { generateStructured } from "../ai/structuredOutput";
import {
  CandidateSchema,
  CriteriaSchema,
  EvaluationsSchema,
  type Candidate,
  type Criterion,
  type Evaluation,
} from "../ai/types";
import { z } from "zod";

const EvaluationsResponseSchema = z.object({ evaluations: EvaluationsSchema }).strict();

export async function evaluateCandidates(
  task: string,
  candidates: Candidate[],
  criteria: Criterion[],
): Promise<Evaluation[]> {
  if (!task.trim()) {
    throw new Error("Task must not be empty.");
  }

  const validatedCandidates = CandidateSchema.array().parse(candidates);
  const validatedCriteria = CriteriaSchema.parse(criteria);
  if (validatedCandidates.length === 0) {
    return [];
  }

  const candidateIds = new Set(validatedCandidates.map(({ id }) => id));
  if (candidateIds.size !== validatedCandidates.length) {
    throw new Error("Candidate IDs must be unique.");
  }

  const evaluationCandidateIds = new Map(validatedCandidates.map(({ id }, index) => [`c${index + 1}`, id]));
  const expectedPairs = new Set(
    validatedCandidates.flatMap(({ id }) => validatedCriteria.map(({ id: criterionId }) => `${id}\u0000${criterionId}`)),
  );
  const response = await generateStructured(
    [
      "Evaluate every candidate against every criterion independently, using the original task as the source of truth.",
      "Ignore criterion weights when assigning scores; weights are for a separate decision engine.",
      "Return only a JSON object with an evaluations array. Use the exact short candidateId labels (c1, c2, etc.) supplied below and include each candidateId/criterionId pair exactly once.",
      "Every score must be a number from 0 to 10. Every justification must explain the score using concrete evidence in at most 18 words; be specific and avoid repeating the criterion description.",
      `Original task:\n${task}`,
      `Candidates:\n${JSON.stringify(validatedCandidates.map(({ modelName, source, content }, index) => ({
        candidateId: `c${index + 1}`,
        model: modelName ?? source,
        response: content.replace(/```svg[\s\S]*?```/gi, "[SVG vector artwork included]").slice(0, 1_600),
      })))}`,
      `Criteria (weights intentionally omitted):\n${JSON.stringify(validatedCriteria.map(({ id, name, description, maxScore }) => ({ id, name, description, maxScore })))}`,
    ].join("\n\n"),
    EvaluationsResponseSchema,
  );
  const evaluations = EvaluationsSchema.parse(response.evaluations).map((evaluation) => ({
    ...evaluation,
    candidateId: evaluationCandidateIds.get(evaluation.candidateId) ?? evaluation.candidateId,
  }));

  const seenPairs = new Set<string>();
  for (const evaluation of evaluations) {
    if (!candidateIds.has(evaluation.candidateId)) {
      throw new Error(`Evaluation references unknown candidate: ${evaluation.candidateId}.`);
    }
    if (!validatedCriteria.some(({ id }) => id === evaluation.criterionId)) {
      throw new Error(`Evaluation references unknown criterion: ${evaluation.criterionId}.`);
    }

    const pair = `${evaluation.candidateId}\u0000${evaluation.criterionId}`;
    if (seenPairs.has(pair)) {
      throw new Error(`Duplicate evaluation for candidate/criterion pair: ${evaluation.candidateId}/${evaluation.criterionId}.`);
    }
    seenPairs.add(pair);
  }

  if (seenPairs.size !== expectedPairs.size) {
    throw new Error("The AI response did not evaluate every candidate against every criterion.");
  }

  return evaluations;
}