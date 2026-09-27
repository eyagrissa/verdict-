import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './components/navbar/navbar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent],
  template: `
    <div class="min-h-screen flex flex-col">
      <app-navbar></app-navbar>
      <main class="flex-1">
        <router-outlet></router-outlet>
      </main>
      <footer class="py-6 px-4 text-center text-slate-400 text-sm border-t border-white/10">
        <p>VERDICT / AI Studio &copy; 2026 · Different models. Your decision.</p>
      </footer>
    </div>
  `
})
export class AppComponent {
  title = 'verdict-ai';
}
