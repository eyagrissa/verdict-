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
            <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 via-red-500 to-pink-500 flex items-center justify-center text-xl">
              ⚖️
            </div>
            <div>
              <h1 class="text-xl font-bold gradient-text">Verdict</h1>
              <p class="text-xs text-slate-400 hidden sm:block">AI Model Comparator</p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <a
              routerLink="/"
              routerLinkActive="true"
              [routerLinkActiveOptions]="{ exact: true }"
              class="px-4 py-2 rounded-lg text-sm font-medium transition-all bg-slate-800 text-white"
            >
              <span class="hidden sm:inline">⚡ </span>Compare
            </a>
            <a
              routerLink="/history"
              routerLinkActive="true"
              class="px-4 py-2 rounded-lg text-sm font-medium transition-all bg-slate-800 text-white"
            >
              <span class="hidden sm:inline">📜 </span>History
            </a>
            <div class="ml-2 hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-full bg-green-900/30 border border-green-700/50">
              <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              <span class="text-xs text-green-400">5 Models Online</span>
            </div>
          </div>
        </div>
      </div>
    </nav>
  `
})
export class NavbarComponent {
}
