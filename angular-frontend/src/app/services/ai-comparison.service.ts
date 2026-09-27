import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, timeout } from 'rxjs';
import { ComparisonResult, TaskOption, TaskType, HistoryItem } from '../models/ai.model';

export interface ModelLineup {
  count: number;
  models: Array<{ provider: string; modelId: string; modelName: string }>;
  imageGenerationAvailable: boolean;
}

export interface GeneratedImage {
  imageBase64: string;
  mimeType: string;
}

@Injectable({
  providedIn: 'root'
})
export class AiComparisonService {
  private readonly TASK_OPTIONS: TaskOption[] = [
    {
      id: 'logo',
      label: 'Logo Design',
      description: 'Generate creative logo concepts and descriptions',
      icon: '🎨',
      placeholder: 'Describe your brand, colors, and style for the logo...'
    },
    {
      id: 'cover_letter',
      label: 'Cover Letter',
      description: 'Write a professional cover letter',
      icon: '📄',
      placeholder: 'Enter the job title, company name, and your key skills...'
    },
    {
      id: 'email',
      label: 'Email Writing',
      description: 'Draft professional emails for any occasion',
      icon: '📧',
      placeholder: 'Describe the purpose of the email and key points to include...'
    },
    {
      id: 'article',
      label: 'Article / Blog',
      description: 'Generate articles or blog posts on any topic',
      icon: '📝',
      placeholder: 'Enter the topic, target audience, and key points to cover...'
    },
    {
      id: 'code',
      label: 'Websites & code',
      description: 'Build polished, interactive web experiences',
      icon: '💻',
      placeholder: 'Describe the product, visual style, audience, and interactions you want...'
    },
    {
      id: 'general',
      label: 'General',
      description: 'Ask any question or request any text',
      icon: '✨',
      placeholder: 'Enter your prompt here...'
    }
  ];

  private history: HistoryItem[] = [];

  constructor(private http: HttpClient) {}

  getTaskOptions(): TaskOption[] {
    return this.TASK_OPTIONS;
  }

  compareModels(prompt: string, taskType: TaskType): Observable<ComparisonResult> {
    return this.http.post<ComparisonResult>('/api/verdict', { task: prompt, taskType }).pipe(
      timeout({ first: 65_000 }),
      tap((result) => {
        this.history.unshift({
          id: result.id,
          prompt: result.prompt,
          taskType: result.taskType,
          candidateCount: result.candidates.length,
          createdAt: result.createdAt,
        });
        this.history = this.history.slice(0, 50);
      }),
    );
  }

  getModelLineup(): Observable<ModelLineup> {
    return this.http.get<ModelLineup>('/api/verdict');
  }

  generateLogoImage(prompt: string, concept: string): Observable<GeneratedImage> {
    return this.http.post<GeneratedImage>('/api/verdict/image', { prompt, concept });
  }

  getHistory(): HistoryItem[] {
    return this.history;
  }

  deleteHistoryItem(id: string): void {
    this.history = this.history.filter(item => item.id !== id);
  }
}
