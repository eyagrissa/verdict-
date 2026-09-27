import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ComparisonResult, AIModel, AIResponse } from '../../models/ai.model';
import { AiComparisonService } from '../../services/ai-comparison.service';
import { AiResponseCardComponent } from '../ai-response-card/ai-response-card.component';

@Component({
  selector: 'app-comparison-results',
  standalone: true,
  imports: [CommonModule, AiResponseCardComponent],
  template: `
    <div class="space-y-6">
      <div class="glass-card rounded-2xl p-6 border-2 border-amber-500/30 bg-amber-900/10">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div class="flex items-center gap-4">
            <div
              class="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl bg-gradient-to-br shadow-2xl"
              [ngClass]="bestModel?.color"
            >
              {{ bestModel?.icon }}
            </div>
            <div>
              <div class="flex items-center gap-2 mb-1">
                <h2 class="text-2xl font-bold">{{ bestModel?.name }} Wins!</h2>
                <span class="text-3xl">⚖️</span>
              </div>
              <p class="text-slate-400">
                {{ bestModel?.provider }} · v{{ bestModel?.version }} scored highest at
                <span class="text-green-400 font-bold text-lg">{{ bestScore }}/100</span>
              </p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <button
              (click)="copyBestContent()"
              class="px-5 py-2.5 rounded-xl font-medium bg-green-600 hover:bg-green-500 text-white transition-colors flex items-center gap-2"
            >
              {{ copied ? '✓ Copied!' : '📋 Copy Verdict' }}
            </button>
          </div>
        </div>

        <div>
          <h3 class="text-sm font-semibold text-slate-300 mb-3">Leaderboard Rankings</h3>
          <div class="space-y-2">
            @for (resp of sortedResponses; track resp.modelId; let i = $index) {
              <div class="flex items-center gap-3">
                <div
                  class="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm"
                  [ngClass]="{
                    'bg-yellow-500/20 text-yellow-400': i === 0,
                    'bg-slate-500/20 text-slate-300': i === 1,
                    'bg-orange-900/30 text-orange-400': i === 2,
                    'bg-slate-800 text-slate-500': i > 2
                  }"
                >
                  {{ i + 1 }}
                </div>
                <div
                  class="w-9 h-9 rounded-lg flex items-center justify-center text-lg bg-gradient-to-br"
                  [ngClass]="getModel(resp.modelId)?.color"
                >
                  {{ getModel(resp.modelId)?.icon }}
                </div>
                <div class="flex-1">
                  <div class="flex items-center justify-between mb-1">
                    <span class="font-medium text-sm">{{ getModel(resp.modelId)?.name }}</span>
                    <span class="text-sm font-bold">{{ resp.score }}/100</span>
                  </div>
                  <div class="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      class="h-full rounded-full bg-gradient-to-r transition-all duration-1000"
                      [ngClass]="getModel(resp.modelId)?.color"
                      [style.width.%]="resp.score"
                    ></div>
                  </div>
                </div>
                <div class="text-xs text-slate-500 w-16 text-right">
                  {{ resp.latency }}ms
                </div>
              </div>
            }
          </div>
        </div>
      </div>

      <div>
        <h3 class="text-xl font-bold mb-4 flex items-center gap-2">
          <span>📊</span>
          <span>All AI Responses</span>
          <span class="text-sm font-normal text-slate-400">({{ result.responses.length }} models compared)</span>
        </h3>
        <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
          @for (resp of sortedResponses; track resp.modelId) {
            <app-ai-response-card
              [response]="resp"
              [isBest]="resp.modelId === result.bestModelId"
            ></app-ai-response-card>
          }
        </div>
      </div>
    </div>
  `
})
export class ComparisonResultsComponent implements OnInit {
  @Input({ required: true }) result!: ComparisonResult;
  sortedResponses: AIResponse[] = [];
  copied = false;

  constructor(private aiService: AiComparisonService) {}

  ngOnInit(): void {
    this.sortedResponses = [...this.result.responses].sort((a, b) => b.score - a.score);
  }

  get bestModel(): AIModel | undefined {
    return this.aiService.getModelById(this.result.bestModelId);
  }

  get bestScore(): number {
    const best = this.result.responses.find(r => r.modelId === this.result.bestModelId);
    return best?.score || 0;
  }

  get bestContent(): string {
    const best = this.result.responses.find(r => r.modelId === this.result.bestModelId);
    return best?.content || '';
  }

  getModel(id: string): AIModel | undefined {
    return this.aiService.getModelById(id);
  }

  copyBestContent(): void {
    navigator.clipboard.writeText(this.bestContent).then(() => {
      this.copied = true;
      setTimeout(() => {
        this.copied = false;
      }, 2000);
    });
  }
}
