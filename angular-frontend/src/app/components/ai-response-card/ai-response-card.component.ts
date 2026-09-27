import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { marked } from 'marked';
import { Candidate, Criterion, Evaluation, TaskType } from '../../models/ai.model';
import { AiComparisonService } from '../../services/ai-comparison.service';

@Component({
  selector: 'app-ai-response-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <article class="ai-card glass-card rounded-2xl overflow-hidden border border-white/10">
      <div class="p-5 sm:p-6">
        <div class="flex items-center justify-between gap-4 mb-4">
          <div>
            <h3 class="font-bold text-lg">{{ sourceName }}</h3>
            <p class="text-xs text-slate-400">{{ response.modelId }}</p>
          </div>
          <div class="flex flex-wrap justify-end gap-2">
            <button type="button" (click)="copyContent()" class="quiet-button px-3 py-2 text-xs">
              {{ copied ? 'Copied' : 'Copy' }}
            </button>
            <button type="button" (click)="previewOpen = !previewOpen" class="preview-button px-3 py-2 text-xs">
              {{ previewOpen ? (taskType === 'logo' ? 'Model notes' : 'Answer') : previewLabel }}
            </button>
          </div>
        </div>

        @if (previewOpen && taskType === 'logo') {
          @if (logoSvg) {
            <div class="logo-artboard mb-4">
              <iframe class="logo-preview" title="Generated logo artwork" [srcdoc]="logoPreviewDocument" sandbox referrerpolicy="no-referrer"></iframe>
            </div>
            <div class="logo-art-tools mb-5">
              <div class="flex flex-wrap items-center gap-3">
                <span class="artwork-source">{{ logoUsesFallback ? 'Instant vector concept from your brief' : 'Model-generated vector artwork' }}</span>
                <button type="button" (click)="generateLogoConcept()" class="concept-button">
                  {{ logoVariation > 0 ? 'Try a fresh direction' : 'Generate another concept' }}
                </button>
              </div>
              <div class="flex flex-wrap gap-2">
                <button type="button" (click)="downloadLogoPng()" class="download-button">
                  Download PNG
                </button>
                <button type="button" (click)="downloadLogoSvg()" class="quiet-button px-3 py-2 text-xs">
                  Download SVG
                </button>
              </div>
            </div>
            @if (downloadError) {
              <p class="text-sm text-amber-200 mb-4" role="status">{{ downloadError }}</p>
            }
          }
          @if (imageGenerationAvailable) {
            <div class="ai-image-tools mb-4">
              <div>
                <p class="text-sm font-semibold">Create an illustrated version</p>
                <p class="text-xs text-slate-400 mt-1">The finished image appears here automatically. Image generation may use paid quota.</p>
              </div>
              <button type="button" (click)="generateIllustratedLogo()" [disabled]="imageGenerating" class="download-button">
                {{ imageGenerating ? 'Creating your image…' : generatedImageUrl ? 'Generate another image' : 'Generate AI image' }}
              </button>
            </div>
            @if (imageGenerating) {
              <div class="generated-image-state mb-4" role="status" aria-live="polite">
                <div class="generated-image-spinner" aria-hidden="true"></div>
                <p class="font-semibold mt-3">Dreaming up your artwork…</p>
                <p class="text-sm text-slate-400 mt-1">Your image preview will appear here when it’s ready.</p>
              </div>
            } @else if (generatedImageUrl) {
              <div class="logo-artboard mb-3">
                <img class="logo-generated-image" [src]="generatedImageUrl" alt="AI-generated logo image" decoding="async">
              </div>
              <a class="download-button inline-flex mb-5" [href]="generatedImageUrl" [download]="generatedImageName">
                Download image
              </a>
            }
            @if (imageGenerationError) {
              <p class="text-sm text-amber-200 mb-4" role="alert">{{ imageGenerationError }}</p>
            }
          } @else {
            <p class="text-xs text-slate-400 mb-5">Add a Gemini API key to enable generated PNG artwork. Your vector logo remains available.</p>
          }
        } @else if (previewOpen && previewHtml) {
          <iframe class="output-preview mb-5" title="Generated visual preview" [srcdoc]="previewHtml" sandbox="allow-scripts" referrerpolicy="no-referrer"></iframe>
        } @else if (previewOpen) {
          <div class="document-preview markdown-answer mb-5" [innerHTML]="formattedContent"></div>
        } @else {
          <div class="markdown-answer answer-content mb-3" [class.answer-expanded]="answerExpanded" [innerHTML]="formattedContent"></div>
          @if (isLongResponse) {
            <button type="button" class="text-sm text-lime-200 hover:text-white transition-colors mb-5" (click)="answerExpanded = !answerExpanded">
              {{ answerExpanded ? 'Show less' : 'Read full response' }}
            </button>
          }
        }

        @if (evaluations.length > 0) {
          <section class="score-panel border-t border-white/10 pt-4">
            <div class="flex items-center justify-between gap-3 mb-3">
              <div>
                <h4 class="section-kicker">Quick score</h4>
                <p class="text-xs text-slate-400 mt-1">AI feedback is a guide, not a verdict.</p>
              </div>
              <span class="score-average">{{ averageScore }}<span>/10</span></span>
            </div>
            <div class="grid grid-cols-2 gap-2">
              @for (evaluation of evaluations; track evaluation.criterionId) {
                <div class="score-chip">
                  <span>{{ getCriterionName(evaluation.criterionId) }}</span>
                  <strong>{{ evaluation.score }}/10</strong>
                </div>
              }

            </div>
            <button type="button" class="score-details-toggle mt-3" (click)="showScoreDetails = !showScoreDetails" [attr.aria-expanded]="showScoreDetails">
              {{ showScoreDetails ? 'Hide score notes' : 'Why these scores?' }}
            </button>
            @if (showScoreDetails) {
              <div class="space-y-3 mt-3">
                @for (evaluation of evaluations; track evaluation.criterionId) {
                  <div class="evaluation-note pl-3">
                    <p class="text-sm font-medium">{{ getCriterionName(evaluation.criterionId) }} · {{ evaluation.score }}/10</p>
                    <p class="text-sm text-slate-300 mt-1">{{ evaluation.justification }}</p>
                  </div>
                }
              </div>
            }
          </section>
        }

        <section class="human-review">
          <p class="text-sm font-semibold">Your turn: would you keep this direction?</p>
          <p class="text-xs text-slate-400 mt-1">Rate it, then tell the models what to change.</p>
          <div class="rating-stars mt-2" role="group" aria-label="Rate this answer from one to five stars">
            @for (star of ratingOptions; track star) {
              <button type="button" (click)="rating = star" [attr.aria-pressed]="rating === star" [attr.aria-label]="'Rate ' + star + ' out of 5 stars'" class="rating-star" [class.rating-star-active]="star <= rating">★</button>
            }
            @if (rating > 0) {
              <span class="rating-label">{{ ratingLabel }}</span>
            }
          </div>
          <div class="feedback-prompts mt-3">
            @for (suggestion of refinementSuggestions; track suggestion) {
              <button type="button" class="idea-chip" (click)="feedbackText = suggestion">{{ suggestion }}</button>
            }
          </div>
          <label class="sr-only" [attr.for]="'feedback-' + response.id">What should the models change?</label>
          <textarea
            [id]="'feedback-' + response.id"
            class="feedback-input mt-3"
            rows="2"
            maxlength="600"
            [value]="feedbackText"
            (input)="updateFeedback($event)"
            placeholder="What should the models change? e.g. make the layout bolder and add a working search…"
          ></textarea>
          <div class="flex flex-wrap items-center justify-between gap-2 mt-2">
            <span class="text-xs text-slate-400">{{ feedbackText.length }}/600</span>
            <button type="button" class="refine-button" [disabled]="!rating || !feedbackText.trim() || isRefining" (click)="requestRefinement()">
              {{ isRefining ? 'Refining all answers…' : 'Use my feedback →' }}
            </button>
          </div>
        </section>
      </div>
    </article>
  `
})
export class AiResponseCardComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) response!: Candidate;
  @Input() criteria: Criterion[] = [];
  @Input() evaluations: Evaluation[] = [];
  @Input() taskType: TaskType = 'general';
  @Input() originalPrompt = '';
  @Input() imageGenerationAvailable = false;
  @Input() isRefining = false;
  @Output() refine = new EventEmitter<string>();

  copied = false;
  previewOpen = false;
  answerExpanded = false;
  showScoreDetails = false;
  downloadError = '';
  imageGenerating = false;
  generatedImageUrl: string | null = null;
  imageGenerationError = '';
  rating = 0;
  feedbackText = '';
  readonly ratingOptions = [1, 2, 3, 4, 5];
  readonly refinementSuggestions = ['More colorful', 'More original', 'Keep it concise', 'Make it truly interactive'];
  private sanitizedLogoSvg: string | null = null;
  logoVariation = 0;
  private showGeneratedLogoConcept = false;

  constructor(private aiService: AiComparisonService, private sanitizer: DomSanitizer) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['response']) {
      this.sanitizedLogoSvg = this.sanitizeLogoSvg();
      this.logoVariation = 0;
      this.showGeneratedLogoConcept = false;
    }
    if (changes['response'] || changes['taskType']) {
      this.previewOpen = this.taskType === 'logo' || (this.taskType === 'code' && Boolean(this.previewHtml));
    }
  }

  ngOnDestroy(): void {
    this.releaseGeneratedImage();
  }

  get isLongResponse(): boolean {
    return this.response.content.length > 700;
  }

  get averageScore(): string {
    if (!this.evaluations.length) {
      return '—';
    }
    const average = this.evaluations.reduce((sum, evaluation) => sum + evaluation.score, 0) / this.evaluations.length;
    return average.toFixed(1);
  }

  get ratingLabel(): string {
    return ({ 1: 'Not for me', 2: 'Needs work', 3: 'Getting there', 4: 'Love it', 5: 'Exactly right' } as Record<number, string>)[this.rating] ?? '';
  }

  updateFeedback(event: Event): void {
    if (event.target instanceof HTMLTextAreaElement) {
      this.feedbackText = event.target.value;
    }
  }

  requestRefinement(): void {
    const feedback = this.feedbackText.trim();
    if (this.rating && feedback && !this.isRefining) {
      this.refine.emit([
        `Original request: ${this.originalPrompt.slice(0, 5_500)}`,
        `Human review of ${this.sourceName}'s answer: ${this.rating}/5 stars (${this.ratingLabel}).`,
        `Current answer for direction: ${this.response.content.slice(0, 3_500)}`,
        `Change requested: ${feedback.slice(0, 600)}`,
        'Create a fresh, improved answer that honors the original request, keeps the strongest parts of the current direction, and applies the requested change. Be polished and specific.',
      ].join('\n\n'));
    }
  }

  get logoSvg(): string {
    return this.sanitizedLogoSvg && !this.showGeneratedLogoConcept
      ? this.sanitizedLogoSvg
      : this.createLogoArtwork();
  }

  get logoUsesFallback(): boolean {
    return !this.sanitizedLogoSvg || this.showGeneratedLogoConcept;
  }

  generateLogoConcept(): void {
    this.logoVariation += 1;
    this.showGeneratedLogoConcept = true;
  }

  private sanitizeLogoSvg(): string | null {
    const source = this.response.content.match(/```svg\s*([\s\S]*?)```/i)?.[1];
    if (!source) {
      return null;
    }

    const parsed = new DOMParser().parseFromString(source, 'image/svg+xml');
    const svg = parsed.documentElement;
    if (svg.localName !== 'svg' || parsed.querySelector('parsererror')) {
      return null;
    }

    svg.querySelectorAll('script, foreignObject, iframe, object, embed, style').forEach(element => element.remove());
    [svg, ...Array.from(svg.querySelectorAll('*'))].forEach(element => {
      for (const attribute of Array.from(element.attributes)) {
        const name = attribute.name.toLowerCase();
        const value = attribute.value.trim();
        if (name.startsWith('on') || name === 'src' || ((name === 'href' || name.endsWith(':href')) && value && !value.startsWith('#'))) {
          element.removeAttribute(attribute.name);
        }
        if ((name === 'style' || name === 'filter' || name === 'fill' || name === 'stroke') && /url\s*\(\s*['"]?(?!#)/i.test(value)) {
          element.removeAttribute(attribute.name);
        }
      }
    });
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    if (!svg.hasAttribute('viewBox')) {
      svg.setAttribute('viewBox', '0 0 512 512');
    }
    if (!svg.hasAttribute('width')) {
      svg.setAttribute('width', '512');
    }
    if (!svg.hasAttribute('height')) {
      svg.setAttribute('height', '512');
    }
    return new XMLSerializer().serializeToString(svg);
  }

  private createLogoArtwork(): string {
    const palettes = [
      { ink: '#243b35', first: '#f08b73', second: '#f4c96b', third: '#88c79d', background: '#fff8ed' },
      { ink: '#263b4a', first: '#77cbd0', second: '#b79ae8', third: '#ffb77e', background: '#f3faff' },
      { ink: '#413650', first: '#e98bae', second: '#ffcf78', third: '#8ac7a4', background: '#fff6fa' },
      { ink: '#37422d', first: '#9abe63', second: '#e6ad63', third: '#6bb9b0', background: '#fbfaef' },
    ];
    const palette = palettes[(this.artworkSeed + this.logoVariation) % palettes.length];
    const requestedColors = [
      { pattern: /coral|salmon|peach/i, color: '#f08b73' },
      { pattern: /yellow|gold|amber/i, color: '#f4c96b' },
      { pattern: /green|leafy|botanical/i, color: '#88c79d' },
      { pattern: /blue|teal|turquoise/i, color: '#77cbd0' },
      { pattern: /purple|violet|lavender/i, color: '#b79ae8' },
      { pattern: /pink|magenta|rose/i, color: '#e98bae' },
    ].filter(({ pattern }) => pattern.test(this.originalPrompt)).map(({ color }) => color);
    const firstColor = requestedColors[0] ?? palette.first;
    const secondColor = requestedColors[1] ?? palette.second;
    const thirdColor = requestedColors[2] ?? palette.third;
    const flower = /flower|floral|bloom|botanical|garden|petal|rose/i.test(this.originalPrompt);
    const petals = Array.from({ length: 8 }, (_, index) =>
      `<ellipse cx="256" cy="174" rx="40" ry="83" transform="rotate(${index * 45} 256 250)" fill="${index % 2 ? 'url(#petalTwo)' : 'url(#petalOne)'}" opacity=".94"/>`,
    ).join('');
    const symbol = flower
      ? `<path d="M196 305c-38 6-53 34-55 69 34-2 59-17 68-49m111-19c38 6 53 34 55 69-34-2-59-17-68-49" fill="none" stroke="url(#leaf)" stroke-width="16" stroke-linecap="round"/><g>${petals}</g><circle cx="256" cy="250" r="46" fill="url(#center)"/><circle cx="256" cy="250" r="25" fill="#fff4cf"/><circle cx="247" cy="242" r="4" fill="#a56a4f"/><circle cx="265" cy="258" r="4" fill="#a56a4f"/><circle cx="266" cy="239" r="3" fill="#a56a4f"/>`
      : `<circle cx="256" cy="245" r="114" fill="url(#petalOne)" opacity=".18"/><path d="M256 132 286 214l86 7-66 55 20 84-70-46-72 46 22-84-67-55 86-7z" fill="url(#petalOne)" stroke="${palette.ink}" stroke-width="7" stroke-linejoin="round"/><circle cx="256" cy="246" r="29" fill="url(#center)"/>`;
    const brand = this.escapeXml(this.logoTitle);
    const titleSize = brand.length > 17 ? 30 : 37;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 512 512" role="img" aria-label="${brand} logo concept"><defs><linearGradient id="petalOne" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${firstColor}"/><stop offset="1" stop-color="${secondColor}"/></linearGradient><linearGradient id="petalTwo" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${secondColor}"/><stop offset="1" stop-color="${firstColor}"/></linearGradient><linearGradient id="leaf" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${thirdColor}"/><stop offset="1" stop-color="${secondColor}"/></linearGradient><radialGradient id="center"><stop stop-color="#fff3b1"/><stop offset="1" stop-color="${secondColor}"/></radialGradient></defs><rect x="20" y="20" width="472" height="472" rx="64" fill="${palette.background}"/><circle cx="256" cy="238" r="163" fill="none" stroke="${thirdColor}" stroke-opacity=".22" stroke-width="2" stroke-dasharray="3 12"/>${symbol}<path d="M122 363h268" stroke="${thirdColor}" stroke-width="2" stroke-linecap="round" opacity=".68"/><text x="256" y="422" text-anchor="middle" fill="${palette.ink}" font-family="Arial,sans-serif" font-size="${titleSize}" font-weight="700" letter-spacing="1.4">${brand}</text><text x="256" y="454" text-anchor="middle" fill="${palette.ink}" fill-opacity=".62" font-family="Arial,sans-serif" font-size="12" font-weight="600" letter-spacing="3">A FRESH TAKE ON YOUR BRAND</text></svg>`;
  }

  private get artworkSeed(): number {
    return Array.from(this.response.id).reduce((seed, character) => (seed * 31 + character.charCodeAt(0)) >>> 0, 0);
  }

  private get logoTitle(): string {
    const match = this.originalPrompt.match(/(?:logo|brand|identity)\s+(?:for|of)\s+(?:a|an|the)?\s*([^.!?,]+)/i);
    const title = (match?.[1] ?? 'Your Brand')
      .replace(/\s+(?:with|using|that|which)\s+.*$/i, '')
      .trim()
      .slice(0, 22);
    return title ? title.replace(/\b\w/g, letter => letter.toUpperCase()) : 'Your Brand';
  }

  private escapeXml(value: string): string {
    return value.replace(/[&<>"']/g, character => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&apos;',
    })[character] ?? character);
  }

  get logoPreviewDocument(): SafeHtml {
    const preview = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'"><style>html,body{height:100%;margin:0}body{display:grid;place-items:center;background-color:#f3f0e8;background-image:linear-gradient(45deg,#e6e2d9 25%,transparent 25%),linear-gradient(-45deg,#e6e2d9 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e6e2d9 75%),linear-gradient(-45deg,transparent 75%,#e6e2d9 75%);background-size:28px 28px;background-position:0 0,0 14px,14px -14px,-14px 0;padding:clamp(16px,5vw,48px);box-sizing:border-box}svg{width:min(100%,640px);height:min(100%,640px);object-fit:contain;filter:drop-shadow(0 18px 24px rgba(20,30,25,.13))}</style></head><body>${this.logoSvg}</body></html>`;
    return this.sanitizer.bypassSecurityTrustHtml(preview);
  }

  get formattedContent(): string {
    return marked.parse(this.response.content, { gfm: true, breaks: true }) as string;
  }

  get previewLabel(): string {
    if (this.taskType === 'logo') {
      return 'Logo canvas';
    }
    if (this.previewHtml) {
      return 'Web preview';
    }
    return this.taskType === 'cover_letter' || this.taskType === 'email' ? 'Document view' : 'Presentation';
  }

  get previewHtml(): string | null {
    const fencedHtml = this.response.content.match(/```(?:html?|xhtml)\s*([\s\S]*?)```/i)?.[1];
    const html = fencedHtml ?? (/<!doctype html|<html[\s>]/i.test(this.response.content) ? this.response.content : null);
    return html ? this.wrapPreviewDocument(html) : null;
  }

  get sourceName(): string {
    return this.response.modelName ?? ({
      groq: 'Groq model',
      llama: 'Llama model',
      gemini: 'Gemini model',
      deepseek: 'DeepSeek model',
      claude: 'Claude model',
      manual: 'Manual answer',
    }[this.response.source]);
  }

  downloadLogoSvg(): void {
    const svg = this.logoSvg;
    if (!svg) {
      this.downloadError = 'There is no valid SVG logo to download.';
      return;
    }
    this.downloadError = '';
    this.saveBlob(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }), `${this.logoFileName}.svg`);
  }

  generateIllustratedLogo(): void {
    if (this.imageGenerating || !this.imageGenerationAvailable) {
      return;
    }

    this.imageGenerating = true;
    this.imageGenerationError = '';
    this.aiService.generateLogoImage(this.originalPrompt, this.logoConcept).subscribe({
      next: image => {
        this.releaseGeneratedImage();
        this.generatedImageUrl = `data:${image.mimeType};base64,${image.imageBase64}`;
        this.imageGenerating = false;
      },
      error: error => {
        this.imageGenerating = false;
        const message = error && typeof error === 'object' && 'error' in error
          ? (error as { error?: { message?: string } }).error?.message
          : undefined;
        this.imageGenerationError = message ?? 'Could not generate an image. Check Gemini access and try again.';
      },
    });
  }

  async downloadLogoPng(): Promise<void> {
    const svg = this.logoSvg;
    if (!svg) {
      this.downloadError = 'There is no valid SVG logo to export.';
      return;
    }
    this.downloadError = '';
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 1024;
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Your browser could not create the PNG image.');
      }
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const png = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('PNG export failed.')), 'image/png');
      });
      this.saveBlob(png, `${this.logoFileName}.png`);
    } catch (error) {
      this.downloadError = error instanceof Error ? error.message : 'Could not export this logo as a PNG.';
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  private get logoFileName(): string {
    return (this.response.modelName ?? 'verdict-logo').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'verdict-logo';
  }

  get generatedImageName(): string {
    return `${this.logoFileName}-ai.png`;
  }

  private get logoConcept(): string {
    return this.response.content.split(/```svg/i, 1)[0].trim().slice(0, 1_200);
  }

  private releaseGeneratedImage(): void {
    this.generatedImageUrl = null;
  }

  private saveBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  private wrapPreviewDocument(html: string): string {
    const policy = '<meta http-equiv="Content-Security-Policy" content="default-src data: blob:; img-src data: blob:; style-src \'unsafe-inline\'; script-src \'unsafe-inline\'; connect-src \'none\'; form-action \'none\'; base-uri \'none\'">';
    return /<head[^>]*>/i.test(html)
      ? html.replace(/<head[^>]*>/i, (head) => `${head}${policy}`)
      : `<!doctype html><html><head>${policy}<meta name="viewport" content="width=device-width,initial-scale=1"></head><body>${html}</body></html>`;
  }

  getCriterionName(criterionId: string): string {
    return this.criteria.find(criterion => criterion.id === criterionId)?.name ?? criterionId;
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
