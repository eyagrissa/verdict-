import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="sticky top-0 z-50 glass-card border-b border-slate-800">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-300 to-lime-200 text-slate-900 flex items-center justify-center text-xl">
              ⚖️
            </div>
            <div>
              <h1 class="text-xl font-bold gradient-text">Verdict</h1>
              <p class="text-xs text-slate-400 hidden sm:block">AI Studio</p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <a
              routerLink="/"
              routerLinkActive="nav-link-active"
              [routerLinkActiveOptions]="{ exact: true }"
              class="nav-link px-4 py-2 rounded-lg text-sm font-medium transition-all"
            >
              <span class="hidden sm:inline">⚡ </span>Compare
            </a>
            <a
              routerLink="/history"
              routerLinkActive="nav-link-active"
              class="nav-link px-4 py-2 rounded-lg text-sm font-medium transition-all"
            >
              <span class="hidden sm:inline">📜 </span>History
            </a>
            <div class="ml-2 hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full provider-badge">
              <span class="provider-badge-dot"></span>
              <span class="text-xs">Compare AI models</span>
            </div>
          </div>
        </div>
      </div>
    </nav>
  `
})
export class NavbarComponent {
}
