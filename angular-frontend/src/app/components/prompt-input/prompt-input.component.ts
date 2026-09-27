import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskType } from '../../models/ai.model';
import { AiComparisonService } from '../../services/ai-comparison.service';

@Component({
  selector: 'app-prompt-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="glass-card rounded-2xl p-6 mb-6">
      <label class="block text-sm font-medium text-slate-300 mb-3">
        Your Request
      </label>
      <textarea
        [(ngModel)]="prompt"
        (input)="onPromptChange()"
        [placeholder]="placeholder"
        rows="5"
        class="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 resize-none transition-all"
      ></textarea>

      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-4 gap-4">
        <div class="flex items-center gap-4 text-sm">
          <span class="text-slate-400">
            <span [ngClass]="{ 'text-slate-300': prompt.length > 0 }">{{ prompt.length }}</span> characters
          </span>
          @if (prompt.length > 0) {
            <button
              (click)="clearPrompt()"
              class="text-slate-400 hover:text-white transition-colors"
            >
              Clear
            </button>
          }
        </div>

        <div class="flex items-center gap-3">
          <div class="flex -space-x-2">
            <span class="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-sm border-2 border-slate-900">🦙</span>
            <span class="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-sm border-2 border-slate-900">🌪️</span>
            <span class="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-sm border-2 border-slate-900">💎</span>
            <span class="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-violet-500 flex items-center justify-center text-sm border-2 border-slate-900">🦅</span>
            <span class="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center text-sm border-2 border-slate-900">🌬️</span>
          </div>

          <button
            (click)="submitPrompt()"
            [disabled]="!canSubmit || isLoading"
            class="px-6 py-3 rounded-xl font-semibold text-white transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-amber-600 via-red-600 to-pink-600 shadow-lg shadow-red-500/25"
            [ngClass]="{
              'hover:from-amber-500 hover:via-red-500 hover:to-pink-500': !isLoading
            }"
          >
            @if (isLoading) {
              <div class="flex items-center gap-1">
                <div class="w-2 h-2 rounded-full bg-white loading-dot"></div>
                <div class="w-2 h-2 rounded-full bg-white loading-dot"></div>
                <div class="w-2 h-2 rounded-full bg-white loading-dot"></div>
              </div>
              <span>Deliberating...</span>
            } @else {
              <span>⚖️</span>
              <span>Compare All 5 AIs</span>
            }
          </button>
        </div>
      </div>
    </div>
  `
})
export class PromptInputComponent implements OnChanges {
  @Input() taskType: TaskType = 'general';
  @Input() isLoading = false;
  @Output() submit = new EventEmitter<string>();
  @Output() promptChange = new EventEmitter<string>();

  prompt = '';
  placeholder = 'Enter your prompt here...';

  constructor(private aiService: AiComparisonService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['taskType']) {
      const task = this.aiService.getTaskOptions().find(t => t.id === this.taskType);
      if (task) {
        this.placeholder = task.placeholder;
      }
    }
  }

  get canSubmit(): boolean {
    return this.prompt.trim().length >= 5;
  }

  onPromptChange(): void {
    this.promptChange.emit(this.prompt);
  }

  clearPrompt(): void {
    this.prompt = '';
    this.promptChange.emit('');
  }

  submitPrompt(): void {
    if (this.canSubmit && !this.isLoading) {
      this.submit.emit(this.prompt.trim());
    }
  }
}
