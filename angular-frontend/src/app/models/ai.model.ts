export interface AIModel {
  id: string;
  name: string;
  description: string;
  version: string;
  provider: string;
  color: string;
  icon: string;
}

export type TaskType = 'logo' | 'cover_letter' | 'email' | 'article' | 'code' | 'general';

export interface TaskOption {
  id: TaskType;
  label: string;
  description: string;
  icon: string;
  placeholder: string;
}

export interface AIResponse {
  modelId: string;
  content: string;
  score: number;
  reasoning: string;
  latency: number;
  timestamp: Date;
}

export interface ComparisonResult {
  id: string;
  prompt: string;
  taskType: TaskType;
  responses: AIResponse[];
  bestModelId: string;
  createdAt: Date;
}

export interface HistoryItem {
  id: string;
  prompt: string;
  taskType: TaskType;
  bestModel: string;
  bestScore: number;
  createdAt: Date;
}
