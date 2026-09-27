import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HistoryItem, TaskOption } from '../../models/ai.model';
import { AiComparisonService } from '../../services/ai-comparison.service';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="mb-8">
        <h1 class="text-3xl font-bold mb-2">
          <span class="gradient-text">📜 Verdict History</span>
        </h1>
        <p class="text-slate-400">Review your past AI comparisons and winning verdicts</p>
      </div>

      @if (history.length === 0) {
        <div class="glass-card rounded-2xl p-12 text-center">
          <div class="text-6xl mb-4">🕵️</div>
          <h2 class="text-xl font-semibold mb-2">No verdicts yet</h2>
          <p class="text-slate-400 mb-6">Start comparing AI models to see your verdict history here</p>
          <a
            routerLink="/"
            class="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-amber-600 via-red-600 to-pink-600 hover:from-amber-500 hover:via-red-500 hover:to-pink-500 transition-all shadow-lg shadow-red-500/25"
          >
            <span>⚖️</span>
            <span>Get Your First Verdict</span>
          </a>
        </div>
      } @else {
        <div class="space-y-4">
          <div class="flex items-center justify-between mb-4">
            <span class="text-sm text-slate-400">{{ history.length }} verdict{{ history.length > 1 ? 's' : '' }}</span>
          </div>

          @for (item of history; track item.id) {
            <div class="glass-card rounded-xl p-5 hover:border-slate-600 transition-all border border-transparent">
              <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-2">
                    <span class="text-2xl">{{ getTaskIcon(item.taskType) }}</span>
                    <span class="px-2.5 py-0.5 text-xs font-medium rounded-full bg-slate-800 text-slate-300">
                      {{ getTaskLabel(item.taskType) }}
                    </span>
                    <span class="px-2.5 py-0.5 text-xs font-medium rounded-full bg-green-500/10 text-green-400 border border-green-500/30">
                      ⚖️ {{ item.bestModel }}
                    </span>
                    <span class="text-sm font-bold text-green-400">{{ item.bestScore }}/100</span>
                  </div>
                  <p class="text-slate-300 line-clamp-2 mb-2">{{ item.prompt }}</p>
                  <p class="text-xs text-slate-500">{{ formatDate(item.createdAt) }}</p>
                </div>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `
})
export class HistoryComponent {
  history: HistoryItem[] = [];
  taskOptions: TaskOption[] = [];

  constructor(private aiService: AiComparisonService) {
    this.history = this.aiService.getHistory();
    this.taskOptions = this.aiService.getTaskOptions();
  }

  getTaskIcon(taskType: string): string {
    const task = this.taskOptions.find(t => t.id === taskType);
    return task?.icon || '✨';
  }

  getTaskLabel(taskType: string): string {
    const task = this.taskOptions.find(t => t.id === taskType);
    return task?.label || taskType.replace('_', ' ');
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
