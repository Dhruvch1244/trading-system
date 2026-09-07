import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { AuthStore } from './core/auth.store';
import { AuthService } from './core/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  template: `
    <div class="relative min-h-screen overflow-x-hidden">
      <div class="pointer-events-none fixed inset-0 -z-10">
        <div
          class="absolute left-1/2 top-[-10%] h-[600px] w-[900px] -translate-x-1/2 rounded-full opacity-20 blur-3xl"
          style="background: radial-gradient(circle, var(--accent), transparent 70%)"
        ></div>
      </div>

      @if (authStore.isAuthenticated()) {
        <nav
          class="fixed left-1/2 top-4 z-50 flex -translate-x-1/2 items-center gap-0.5 overflow-x-auto rounded-full border border-border glass-panel px-2 py-2 shadow-ambient"
        >
          <span class="px-3 font-display text-lg tracking-wider text-foreground">FAUXNANCE</span>
          <a routerLink="/dashboard" routerLinkActive="bg-accent text-accent-foreground"
             class="whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors duration-300 ease-fluid hover:text-foreground">
            Dashboard
          </a>
          <a routerLink="/order-ticket" routerLinkActive="bg-accent text-accent-foreground"
             class="whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors duration-300 ease-fluid hover:text-foreground">
            Order Ticket
          </a>
          <a routerLink="/blotter" routerLinkActive="bg-accent text-accent-foreground"
             class="whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors duration-300 ease-fluid hover:text-foreground">
            Blotter
          </a>
          <a routerLink="/watchlist" routerLinkActive="bg-accent text-accent-foreground"
             class="whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors duration-300 ease-fluid hover:text-foreground">
            Watchlist
          </a>
          <a routerLink="/balance-history" routerLinkActive="bg-accent text-accent-foreground"
             class="whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors duration-300 ease-fluid hover:text-foreground">
            Balance
          </a>
          <button
            (click)="logout()"
            class="ml-2 whitespace-nowrap rounded-full border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors duration-300 ease-fluid hover:border-destructive hover:text-destructive"
          >
            Sign out
          </button>
        </nav>
      }

      <main [class.pt-28]="authStore.isAuthenticated()">
        <router-outlet />
      </main>
    </div>
  `,
})
export class AppComponent {
  protected readonly authStore = inject(AuthStore);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
