import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { Subscription, interval, startWith } from 'rxjs';
import { AuthStore } from './core/auth.store';
import { AuthService } from './core/auth.service';
import { TradeApiService } from './core/trade-api.service';

const NAV_LINKS = [
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/order-ticket', label: 'Order Ticket' },
  { path: '/blotter', label: 'Blotter' },
  { path: '/watchlist', label: 'Watchlist' },
  { path: '/alerts', label: 'Alerts' },
  { path: '/balance-history', label: 'Balance' },
  { path: '/settings', label: 'Settings' },
];

const ALERT_POLL_MS = 15000;

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  template: `
    <div class="relative min-h-screen overflow-x-hidden">
      <!-- Ambient background chrome per the glass-dark-cyan voice: mesh wash + sparse starfield
           + low-opacity grain, layered behind content, pointer-events-none throughout. -->
      <div class="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-background">
        <div
          class="absolute left-1/2 top-[-10%] h-[700px] w-[1000px] -translate-x-1/2 rounded-full opacity-25 blur-3xl"
          style="background: radial-gradient(circle, var(--accent), transparent 70%)"
        ></div>
        <div
          class="absolute bottom-[-20%] right-[-10%] h-[500px] w-[500px] rounded-full opacity-10 blur-3xl"
          style="background: radial-gradient(circle, var(--violet), transparent 70%)"
        ></div>
        <div class="starfield absolute inset-0 opacity-40"></div>
        <div class="grain absolute inset-0 opacity-[0.03]"></div>
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
              class="relative whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors duration-300 ease-fluid hover:text-foreground"
            >
              {{ link.label }}
              @if (link.path === '/alerts' && unseenAlertCount() > 0) {
                <span class="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
                  {{ unseenAlertCount() }}
                </span>
              }
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
              class="relative rounded-lg border border-border p-2 text-foreground"
            >
              @if (mobileMenuOpen()) {
                <span aria-hidden="true">✕</span>
              } @else {
                <span aria-hidden="true">☰</span>
              }
              @if (!mobileMenuOpen() && unseenAlertCount() > 0) {
                <span class="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
                  {{ unseenAlertCount() }}
                </span>
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
                  class="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors duration-300 ease-fluid hover:bg-muted hover:text-foreground"
                >
                  {{ link.label }}
                  @if (link.path === '/alerts' && unseenAlertCount() > 0) {
                    <span class="flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
                      {{ unseenAlertCount() }}
                    </span>
                  }
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
export class AppComponent implements OnInit, OnDestroy {
  protected readonly authStore = inject(AuthStore);
  private readonly authService = inject(AuthService);
  private readonly tradeApi = inject(TradeApiService);
  private readonly router = inject(Router);
  private alertPollSub?: Subscription;

  protected readonly navLinks = NAV_LINKS;
  protected readonly mobileMenuOpen = signal(false);
  protected readonly unseenAlertCount = signal(0);

  ngOnInit(): void {
    this.alertPollSub = interval(ALERT_POLL_MS)
      .pipe(startWith(0))
      .subscribe(() => {
        if (!this.authStore.isAuthenticated()) return;
        this.tradeApi.getUnseenAlertCount().subscribe((res) => this.unseenAlertCount.set(res.count));
      });
  }

  ngOnDestroy(): void {
    this.alertPollSub?.unsubscribe();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
