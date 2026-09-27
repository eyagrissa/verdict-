import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskType, ComparisonResult, AIModel } from '../../models/ai.model';
import { AiComparisonService } from '../../services/ai-comparison.service';
import { TaskSelectorComponent } from '../../components/task-selector/task-selector.component';
import { PromptInputComponent } from '../../components/prompt-input/prompt-input.component';
import { ComparisonResultsComponent } from '../../components/comparison-results/comparison-results.component';

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
        <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm font-medium mb-4">
          <span>⚖️</span>
          <span>Powered by 5 Open-Source AI Models</span>
        </div>
        <h1 class="text-4xl sm:text-5xl font-bold mb-4">
          <span class="gradient-text">Ask Once. Compare 5 AIs.</span>
          <br>
          <span class="text-white">Get the Verdict.</span>
        </h1>
        <p class="text-lg text-slate-400 max-w-2xl mx-auto">
          Generate logos, cover letters, emails, articles, code and more. We run your request through
          <span class="text-blue-400 font-semibold"> Llama 3</span>,
          <span class="text-orange-400 font-semibold"> Mistral</span>,
          <span class="text-green-400 font-semibold"> Gemma</span>,
          <span class="text-purple-400 font-semibold"> Falcon</span> &
          <span class="text-pink-400 font-semibold"> Zephyr</span> — then deliver the verdict.
        </p>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
        @for (model of models; track model.id) {
          <div class="glass-card rounded-xl p-4 text-center">
            <div
              class="w-12 h-12 mx-auto rounded-xl flex items-center justify-center text-2xl mb-2 bg-gradient-to-br"
              [ngClass]="model.color"
            >
              {{ model.icon }}
            </div>
            <div class="font-semibold text-sm">{{ model.name }}</div>
            <div class="text-xs text-slate-500">{{ model.provider }}</div>
          </div>
        }
      </div>

      <app-task-selector
        [selectedTask]="selectedTask"
        (taskSelected)="onTaskSelected($event)"
      ></app-task-selector>

      <app-prompt-input
        [taskType]="selectedTask"
        [isLoading]="isLoading"
        (submit)="onSubmit($event)"
      ></app-prompt-input>

      @if (isLoading) {
        <div class="glass-card rounded-2xl p-8 mb-8">
          <div class="text-center mb-6">
            <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-medium mb-4">
              <div class="flex items-center gap-1">
                <div class="w-2 h-2 rounded-full bg-amber-400 loading-dot"></div>
                <div class="w-2 h-2 rounded-full bg-amber-400 loading-dot"></div>
                <div class="w-2 h-2 rounded-full bg-amber-400 loading-dot"></div>
              </div>
              <span>Judging responses across 5 models...</span>
            </div>
            <h3 class="text-xl font-semibold mb-2">Analyzing your request with all AI models</h3>
            <p class="text-slate-400">The verdict will be delivered in 2-5 seconds</p>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-5 gap-4">
            @for (model of models; track model.id) {
              <div class="rounded-xl overflow-hidden border border-slate-700">
                <div class="p-3 flex items-center gap-2 border-b border-slate-700/50 bg-slate-800/50">
                  <div
                    class="w-8 h-8 rounded-lg flex items-center justify-center text-lg bg-gradient-to-br"
                    [ngClass]="model.color"
                  >
                    {{ model.icon }}
                  </div>
                  <span class="text-sm font-medium">{{ model.name }}</span>
                </div>
                <div class="p-3 space-y-2">
                  <div class="h-3 rounded shimmer"></div>
                  <div class="h-3 rounded shimmer w-5/6"></div>
                  <div class="h-3 rounded shimmer w-4/6"></div>
                  <div class="h-3 rounded shimmer"></div>
                </div>
              </div>
            }
          </div>
        </div>
      }

      @if (latestResult) {
        <app-comparison-results
          [result]="latestResult"
        ></app-comparison-results>
      }
    </div>
  `
})
export class DashboardComponent {
  selectedTask: TaskType = 'general';
  isLoading = false;
  latestResult: ComparisonResult | null = null;
  models: AIModel[] = [];

  constructor(private aiService: AiComparisonService) {
    this.models = this.aiService.getModels();
  }

  onTaskSelected(task: TaskType): void {
    this.selectedTask = task;
  }

  onSubmit(prompt: string): void {
    this.isLoading = true;
    this.latestResult = null;

    this.aiService.compareModels(prompt, this.selectedTask).subscribe({
      next: (result: ComparisonResult) => {
        this.latestResult = result;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }
}
