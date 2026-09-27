import type {
  Candidate,
  Criterion,
  Evaluation,
  ProviderFailure,
  TaskAnalysis,
} from '../../../../lib/ai/types';

export type { Candidate, Criterion, Evaluation, ProviderFailure, TaskAnalysis };

export type TaskType = 'logo' | 'cover_letter' | 'email' | 'article' | 'code' | 'general';

export interface TaskOption {
  id: TaskType;
  label: string;
  description: string;
  icon: string;
  placeholder: string;
}

export interface ComparisonResult {
  id: string;
  prompt: string;
  taskType: TaskType;
  analysis: TaskAnalysis | null;
  candidates: Candidate[];
  criteria: Criterion[];
  evaluations: Evaluation[];
  providerErrors: ProviderFailure[];
  expectedModelCount: number;
  evaluationError: string | null;
  createdAt: string;
}

export interface HistoryItem {
  id: string;
  prompt: string;
  taskType: TaskType;
  candidateCount: number;
  createdAt: string;
}
