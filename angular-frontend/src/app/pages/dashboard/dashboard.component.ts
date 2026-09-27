import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskType, ComparisonResult } from '../../models/ai.model';
import { AiComparisonService } from '../../services/ai-comparison.service';
import { TaskSelectorComponent } from '../../components/task-selector/task-selector.component';
import { PromptInputComponent } from '../../components/prompt-input/prompt-input.component';
import { ComparisonResultsComponent } from '../../components/comparison-results/comparison-results.component';
import { ModelLineup } from '../../services/ai-comparison.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    TaskSelectorComponent,
    PromptInputComponent,
    ComparisonResultsComponent
  ],
  template: `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="text-center mb-10">
        <div class="hero-badge inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium mb-4">
          <span class="hero-badge-dot"></span>
          <span>YOUR AI CREATIVE STUDIO</span>
        </div>
        <h1 class="text-4xl sm:text-5xl font-bold mb-4">
          <span class="gradient-text">One brief. More ways to see it.</span>
          <br>
          <span class="text-white">You make the call.</span>
        </h1>
        <p class="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto">
          Send one brief to every connected model. Compare the ideas, refine the direction, and make the final call.
        </p>
        <p class="mt-3 text-xs text-slate-300">
          @if (modelLineup) {
            {{ modelLineup.count }} working target{{ modelLineup.count === 1 ? '' : 's' }} configured
            @if (modelLineup.count > 0) {
              <span> · {{ modelProviderNames }}</span>
            }
          } @else {
            Checking your model lineup…
          }
        </p>
        @if (modelLineup; as lineup) {
          @if (lineup.models.length > 0) {
            <div class="model-lineup mt-3" aria-label="Connected models">
              @for (model of lineup.models; track model.provider + model.modelId) {
                <span class="model-chip">{{ model.modelName }}</span>
              }
            </div>
          }
          @if (lineup.count === 0 && !modelLineupError) {
            <p class="mt-2 text-xs text-amber-200">Add a supported provider API key to connect models.</p>
          }
        }
        <p class="mt-2 text-xs text-slate-400">Want Claude, Gemini, or DeepSeek too? Add their API keys in the server’s <code>.env.local</code> file. Only connected models are listed.</p>
        @if (modelLineupError) {
          <p class="mt-2 text-sm text-amber-200" role="status">{{ modelLineupError }}</p>
        }
      </div>

      <app-task-selector
        [selectedTask]="selectedTask"
        (taskSelected)="onTaskSelected($event)"
      ></app-task-selector>

      <app-prompt-input
        [taskType]="selectedTask"
        [isLoading]="isLoading"
        [modelCount]="modelLineup?.count ?? 0"
        (submit)="onSubmit($event)"
      ></app-prompt-input>

      @if (isLoading) {
        <div class="glass-card rounded-2xl p-8 mb-8">
          <p class="text-center text-slate-200 font-medium">Generating responses...</p>
        </div>
      }

      @if (errorMessage) {
        <div class="glass-card rounded-xl border border-amber-500/30 bg-amber-900/10 p-4 text-amber-200" role="alert">
          {{ errorMessage }}
        </div>
      }

      @if (latestResult) {
        <app-comparison-results
          [result]="latestResult"
          [imageGenerationAvailable]="modelLineup?.imageGenerationAvailable ?? false"
          [isRefining]="isLoading"
          (refine)="onSubmit($event, false)"
        ></app-comparison-results>
      }
    </div>
  `
})
export class DashboardComponent implements OnInit {
  selectedTask: TaskType = 'general';
  isLoading = false;
  errorMessage: string | null = null;
  latestResult: ComparisonResult | null = null;
  modelLineup: ModelLineup | null = null;
  modelLineupError: string | null = null;

  constructor(private aiService: AiComparisonService) {}

  ngOnInit(): void {
    this.aiService.getModelLineup().subscribe({
      next: lineup => this.modelLineup = lineup,
      error: () => {
        this.modelLineupError = 'Could not check configured models. You can still try a comparison.';
        this.modelLineup = { count: 0, models: [], imageGenerationAvailable: false };
      },
    });
  }

  get modelProviderNames(): string {
    return [...new Set(this.modelLineup?.models.map(model => model.provider) ?? [])]
      .map(provider => ({ groq: 'Groq', gemini: 'Gemini', deepseek: 'DeepSeek', claude: 'Claude' }[provider] ?? provider))
      .join(' · ');
  }

  onTaskSelected(task: TaskType): void {
    this.selectedTask = task;
  }

  onSubmit(prompt: string, replaceResults = true): void {
    this.isLoading = true;
    if (replaceResults) {
      this.latestResult = null;
    }
    this.errorMessage = null;

    this.aiService.compareModels(prompt, this.selectedTask).subscribe({
      next: (result: ComparisonResult) => {
        this.latestResult = result;
        this.isLoading = false;
      },
      error: (error: unknown) => {
        this.isLoading = false;
        const details = error && typeof error === 'object' && 'error' in error
          ? (error as { error?: { message?: string } }).error
          : undefined;
        this.errorMessage = error && typeof error === 'object' && 'name' in error && error.name === 'TimeoutError'
          ? 'Request timed out. Please try again.'
          : details?.message ?? 'No model response. Check provider access or try again.';
      }
    });
  }
}
