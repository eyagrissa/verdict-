import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AIModel, AIResponse } from '../../models/ai.model';
import { AiComparisonService } from '../../services/ai-comparison.service';

@Component({
  selector: 'app-ai-response-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="ai-card glass-card rounded-2xl overflow-hidden border-2"
      [ngClass]="{
        'border-transparent': !isBest,
        'best border-green-500/50': isBest
      }"
    >
      <div class="p-5">
        <div class="flex items-start justify-between mb-4">
          <div class="flex items-center gap-3">
            <div
              class="w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-gradient-to-br"
              [ngClass]="model?.color"
            >
              {{ model?.icon }}
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h3 class="font-bold text-lg">{{ model?.name }}</h3>
                @if (isBest) {
                  <span class="px-2 py-0.5 text-xs font-bold rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                    ⚖️ VERDICT
                  </span>
                }
              </div>
              <div class="text-xs text-slate-400">
                {{ model?.provider }} · v{{ model?.version }}
              </div>
            </div>
          </div>

          <div class="text-right">
            <div class="text-2xl font-bold"
              [ngClass]="{
                'text-green-400': response.score >= 85,
                'text-yellow-400': response.score >= 70 && response.score < 85,
                'text-orange-400': response.score < 70
              }"
            >
              {{ response.score }}
              <span class="text-sm font-normal text-slate-500">/100</span>
            </div>
            <div class="text-xs text-slate-500">{{ response.latency }}ms</div>
          </div>
        </div>

        <div class="mb-4">
          <div class="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-1000 bg-gradient-to-r"
              [ngClass]="model?.color"
              [style.width.%]="response.score"
            ></div>
          </div>
        </div>

        @if (response.content) {
          <div class="bg-slate-900/50 rounded-xl p-4 mb-4 max-h-80 overflow-y-auto">
            <pre class="whitespace-pre-wrap text-sm text-slate-300 font-sans leading-relaxed">{{ response.content }}</pre>
          </div>
        }

        <div class="flex items-center justify-between pt-3 border-t border-slate-700/50">
          <p class="text-xs text-slate-400 italic">{{ response.reasoning }}</p>
          <div class="flex gap-2">
            <button
              (click)="copyContent()"
              class="px-3 py-1.5 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              {{ copied ? '✓ Copied' : '📋 Copy' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class AiResponseCardComponent {
  @Input({ required: true }) response!: AIResponse;
  @Input() isBest = false;

  copied = false;

  constructor(private aiService: AiComparisonService) {}

  get model(): AIModel | undefined {
    return this.aiService.getModelById(this.response.modelId);
  }

  copyContent(): void {
    navigator.clipboard.writeText(this.response.content).then(() => {
      this.copied = true;
      setTimeout(() => {
        this.copied = false;
      }, 2000);
    });
  }
}
