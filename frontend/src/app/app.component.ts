import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { AuthStore } from './core/auth.store';
import { AuthService } from './core/auth.service';

const NAV_LINKS = [
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/order-ticket', label: 'Order Ticket' },
  { path: '/blotter', label: 'Blotter' },
  { path: '/watchlist', label: 'Watchlist' },
  { path: '/balance-history', label: 'Balance' },
  { path: '/settings', label: 'Settings' },
];

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
        <!-- Desktop: floating glass-pill nav -->
        <nav
          class="fixed left-1/2 top-4 z-50 hidden -translate-x-1/2 items-center gap-0.5 overflow-x-auto rounded-full border border-border glass-panel px-2 py-2 shadow-ambient md:flex"
        >
          <span class="px-3 font-display text-lg tracking-wider text-foreground">FAUXNANCE</span>
          @for (link of navLinks; track link.path) {
            <a
              [routerLink]="link.path"
              routerLinkActive="bg-accent text-accent-foreground"
              class="whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors duration-300 ease-fluid hover:text-foreground"
            >
              {{ link.label }}
            </a>
          }
          <button
            (click)="logout()"
            class="ml-2 whitespace-nowrap rounded-full border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors duration-300 ease-fluid hover:border-destructive hover:text-destructive"
          >
            Sign out
          </button>
        </nav>

        <!-- Mobile: top bar + slide-down menu -->
        <div class="fixed inset-x-0 top-0 z-50 border-b border-border glass-panel md:hidden">
          <div class="flex items-center justify-between px-4 py-3">
            <span class="font-display text-lg tracking-wider text-foreground">FAUXNANCE</span>
            <button
              (click)="mobileMenuOpen.set(!mobileMenuOpen())"
              [attr.aria-expanded]="mobileMenuOpen()"
              aria-label="Toggle menu"
              class="rounded-lg border border-border p-2 text-foreground"
            >
              @if (mobileMenuOpen()) {
                <span aria-hidden="true">✕</span>
              } @else {
                <span aria-hidden="true">☰</span>
              }
            </button>
          </div>

          @if (mobileMenuOpen()) {
            <div class="flex flex-col gap-1 border-t border-border px-4 py-3">
              @for (link of navLinks; track link.path) {
                <a
                  [routerLink]="link.path"
                  routerLinkActive="bg-accent text-accent-foreground"
                  (click)="mobileMenuOpen.set(false)"
                  class="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors duration-300 ease-fluid hover:bg-muted hover:text-foreground"
                >
                  {{ link.label }}
                </a>
              }
              <button
                (click)="logout()"
                class="mt-1 rounded-lg border border-border px-3 py-2.5 text-left text-sm font-medium text-muted-foreground transition-colors duration-300 ease-fluid hover:border-destructive hover:text-destructive"
              >
                Sign out
              </button>
            </div>
          }
        </div>
      }

      <main [class.pt-16]="authStore.isAuthenticated()" [class.md:pt-28]="authStore.isAuthenticated()">
        <router-outlet />
      </main>
    </div>
  `,
})
export class AppComponent {
  protected readonly authStore = inject(AuthStore);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly navLinks = NAV_LINKS;
  protected readonly mobileMenuOpen = signal(false);

  // Both padding classes apply together on mobile (pt-16 alone) vs desktop (pt-28 + pt-16,
  // Tailwind's cascade takes the larger via source order - see note in styles.css if this
  // ever needs to be exact rather than "close enough" across the two nav heights.
  protected isMobileLayout(): boolean {
    return false;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
