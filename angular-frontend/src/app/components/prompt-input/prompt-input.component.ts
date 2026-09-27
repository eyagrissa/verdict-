import { Component, EventEmitter, Input, Output, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskType } from '../../models/ai.model';
import { AiComparisonService } from '../../services/ai-comparison.service';

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionEventLike extends Event {
  results: ArrayLike<ArrayLike<SpeechRecognitionAlternativeLike>>;
}

interface SpeechRecognitionErrorEventLike extends Event {
  error: string;
}

interface BrowserSpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

@Component({
  selector: 'app-prompt-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="prompt-panel glass-card rounded-2xl p-5 sm:p-7 mb-6">
      <label for="verdict-prompt" class="block text-sm font-medium text-slate-200 mb-3">
        Your brief
      </label>
      <textarea
        id="verdict-prompt"
        [(ngModel)]="prompt"
        (input)="onPromptChange()"
        [placeholder]="placeholder"
        rows="6"
        class="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-4 text-white placeholder-slate-400 resize-y transition-all"
      ></textarea>

      <div class="prompt-ideas mt-3">
        <span class="text-xs text-slate-400 mr-1">Need a spark?</span>
        @for (idea of promptIdeas; track idea) {
          <button type="button" (click)="useIdea(idea)" class="idea-chip">
            {{ idea }}
          </button>
        }
      </div>

      @if (voiceSupported) {
        <div class="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            (click)="toggleVoiceInput()"
            [disabled]="isLoading"
            [attr.aria-pressed]="isListening"
            class="voice-button"
            [ngClass]="{ 'voice-button-active': isListening }"
          >
            @if (isListening) {
              <span class="voice-pulse" aria-hidden="true"></span>
              <span>Listening… tap to stop</span>
            } @else {
              <span aria-hidden="true">🎙️</span>
              <span>Speak your prompt</span>
            }
          </button>
          <span class="text-xs text-slate-400">Your browser handles speech recognition; only the transcript is sent with your prompt.</span>
        </div>
      } @else {
        <p class="mt-3 text-xs text-slate-400">Voice input isn’t supported in this browser. You can still type your prompt.</p>
      }
      @if (voiceMessage) {
        <p class="mt-2 text-sm text-amber-200" role="status" aria-live="polite">{{ voiceMessage }}</p>
      }

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
          <div class="model-count" [attr.aria-label]="modelCount + ' model targets configured'">
            <span class="model-count-number">{{ modelCount.toString().padStart(2, '0') }}</span>
            <span class="model-count-label">models<br>configured</span>
          </div>

          <button
            (click)="submitPrompt()"
            [disabled]="!canSubmit || isLoading"
            type="button"
            class="submit-button px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            @if (isLoading) {
              <div class="flex items-center gap-1">
                <div class="w-2 h-2 rounded-full bg-white loading-dot"></div>
                <div class="w-2 h-2 rounded-full bg-white loading-dot"></div>
                <div class="w-2 h-2 rounded-full bg-white loading-dot"></div>
              </div>
              <span>Deliberating...</span>
            } @else {
              <span>Run comparison</span>
            }
          </button>
        </div>
      </div>
    </section>
  `
})
export class PromptInputComponent implements OnChanges, OnInit {
  @Input() taskType: TaskType = 'general';
  @Input() isLoading = false;
  @Input() modelCount = 0;
  @Output() submit = new EventEmitter<string>();
  @Output() promptChange = new EventEmitter<string>();

  prompt = '';
  placeholder = 'Enter your prompt here...';
  voiceSupported = false;
  isListening = false;
  voiceMessage = '';
  private recognition: BrowserSpeechRecognition | null = null;

  constructor(private aiService: AiComparisonService) {}

  ngOnInit(): void {
    this.voiceSupported = this.getSpeechRecognitionConstructor() !== undefined;
  }

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

  get promptIdeas(): string[] {
    const ideas: Record<TaskType, string[]> = {
      logo: ['Design a bold student-club logo', 'Give my café a warm, memorable identity'],
      cover_letter: ['Write an internship cover letter', 'Make my experience sound confident'],
      email: ['Ask my professor for an extension', 'Write a friendly follow-up email'],
      article: ['Explain this topic to a curious beginner', 'Turn these ideas into a punchy blog post'],
      code: ['Review my code for edge cases', 'Build a clean, responsive landing page'],
      general: ['Help me plan a focused study week', 'Explain a tricky idea with an example'],
    };
    return ideas[this.taskType];
  }

  useIdea(idea: string): void {
    this.prompt = idea;
    this.onPromptChange();
  }

  toggleVoiceInput(): void {
    if (this.isListening) {
      this.recognition?.stop();
      return;
    }

    const SpeechRecognition = this.getSpeechRecognitionConstructor();
    if (!SpeechRecognition) {
      this.voiceSupported = false;
      this.voiceMessage = 'Voice input is unavailable in this browser.';
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = typeof navigator === 'undefined' ? 'en-US' : navigator.language;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript.trim();
      if (transcript) {
        this.prompt = [this.prompt.trim(), transcript].filter(Boolean).join(' ');
        this.onPromptChange();
      }
    };
    recognition.onerror = (event) => {
      this.voiceMessage = event.error === 'not-allowed'
        ? 'Microphone permission was denied. Allow access in your browser settings to try again.'
        : 'Voice input stopped before we could transcribe that. Please try again.';
      this.isListening = false;
      this.recognition = null;
    };
    recognition.onend = () => {
      this.isListening = false;
      this.recognition = null;
    };

    this.voiceMessage = '';
    this.recognition = recognition;
    this.isListening = true;
    try {
      recognition.start();
    } catch {
      this.isListening = false;
      this.recognition = null;
      this.voiceMessage = 'Could not start voice input. Check your microphone permissions and try again.';
    }
  }

  submitPrompt(): void {
    if (this.canSubmit && !this.isLoading) {
      this.submit.emit(this.prompt.trim());
    }
  }

  private getSpeechRecognitionConstructor(): BrowserSpeechRecognitionConstructor | undefined {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const browserWindow = window as Window & {
      SpeechRecognition?: BrowserSpeechRecognitionConstructor;
      webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
    };
    return browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition;
  }
}
