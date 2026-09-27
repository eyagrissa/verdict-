import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ComparisonResult, Evaluation } from '../../models/ai.model';
import { AiResponseCardComponent } from '../ai-response-card/ai-response-card.component';

@Component({
  selector: 'app-comparison-results',
  standalone: true,
  imports: [CommonModule, AiResponseCardComponent],
  template: `
    <div class="results-panel space-y-6">
      @if (result.analysis) {
        <section class="result-summary">
          <p class="section-kicker">{{ result.analysis.domain }} <span aria-hidden="true">·</span> {{ result.analysis.taskType }}</p>
          <h2 class="text-xl sm:text-2xl font-semibold mt-2">{{ result.analysis.summary }}</h2>
        </section>
      }

      <div class="flex flex-wrap items-center justify-between gap-3">
        <h3 class="text-xl sm:text-2xl font-bold">The answers are in <span aria-hidden="true">✨</span></h3>
        <p class="result-count">
          <span class="text-emerald-200 font-semibold">{{ result.candidates.length }} / {{ result.expectedModelCount }}</span>
          responses received
        </p>
      </div>

      @if (result.providerErrors.length > 0 || result.evaluationError) {
        <div class="result-alert rounded-xl p-4 text-sm" role="status">
          @if (result.providerErrors.length > 0) {
            <p class="font-semibold">A model didn’t respond this time. Your available answers are still here.</p>
            <ul class="mt-2 space-y-1">
              @for (failure of result.providerErrors; track $index) {
                <li>
                  <span class="font-medium">{{ failure.modelName ?? failure.provider }}</span>
                  <span class="text-amber-100/75"> — {{ failure.message }}</span>
                </li>
              }
            </ul>
          }
          @if (result.evaluationError) {
            <p class="mt-2">Scores are unavailable: {{ result.evaluationError }}</p>
          }
        </div>
      }

      <div>
        <div class="grid grid-cols-1 xl:grid-cols-2 gap-7">
          @for (candidate of result.candidates; track candidate.id) {
            <app-ai-response-card
              [response]="candidate"
              [taskType]="result.taskType"
              [originalPrompt]="result.prompt"
              [imageGenerationAvailable]="imageGenerationAvailable"
              [isRefining]="isRefining"
              (refine)="refine.emit($event)"
              [criteria]="result.criteria"
              [evaluations]="getEvaluations(candidate.id)"
            ></app-ai-response-card>
          }
        </div>
      </div>
    </div>
  `
})
export class ComparisonResultsComponent {
  @Input({ required: true }) result!: ComparisonResult;
  @Input() imageGenerationAvailable = false;
  @Input() isRefining = false;
  @Output() refine = new EventEmitter<string>();

  getEvaluations(candidateId: string): Evaluation[] {
    return this.result.evaluations.filter(evaluation => evaluation.candidateId === candidateId);
  }
}
