import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <div class="relative hidden overflow-hidden border-r border-border p-12 lg:flex lg:flex-col lg:justify-between">
        <div
          class="pointer-events-none absolute inset-0 opacity-30"
          style="background: radial-gradient(circle at 30% 20%, var(--accent), transparent 60%)"
        ></div>
        <span class="relative font-display text-2xl tracking-wider text-foreground">FAUXNANCE</span>

        <div class="relative">
          <h1 class="font-display text-5xl leading-tight text-foreground">
            Trade with<br />precision.
          </h1>
          <p class="mt-4 max-w-sm text-sm text-muted-foreground">
            Live quotes, real order execution, portfolio analytics, and price alerts —
            a full trading terminal for a ~250-instrument universe.
          </p>

          <ul class="mt-8 space-y-3 text-sm text-muted-foreground">
            <li class="flex items-center gap-2"><span class="text-accent" aria-hidden="true">◆</span> Real-time fill-or-reject execution</li>
            <li class="flex items-center gap-2"><span class="text-accent" aria-hidden="true">◆</span> Portfolio allocation & unrealized P&amp;L</li>
            <li class="flex items-center gap-2"><span class="text-accent" aria-hidden="true">◆</span> Price alerts on any symbol</li>
          </ul>
        </div>

        <p class="relative font-mono text-xs text-muted-foreground">© 2026 Fauxnance — paper trading, real mechanics.</p>
      </div>

      <div class="flex items-center justify-center px-4 py-16">
        <div class="w-full max-w-sm">
          <h2 class="font-display text-3xl text-foreground lg:hidden">FAUXNANCE</h2>
          <h2 class="mt-6 font-display text-2xl text-foreground lg:mt-0">Sign in</h2>
          <p class="mt-1 text-sm text-muted-foreground">Access your trading account</p>

          <form class="mt-8 space-y-4" (ngSubmit)="submit()">
            <div>
              <label class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Email</label>
              <input
                type="email"
                name="email"
                [(ngModel)]="email"
                required
                autocomplete="email"
                placeholder="demo@trading.local"
                class="w-full rounded-lg border border-border bg-transparent px-3 py-2.5 text-sm text-foreground outline-none transition-colors duration-300 ease-fluid placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-[var(--ring)]"
              />
            </div>

            <div>
              <label class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Password</label>
              <input
                type="password"
                name="password"
                [(ngModel)]="password"
                required
                autocomplete="current-password"
                placeholder="••••••••"
                class="w-full rounded-lg border border-border bg-transparent px-3 py-2.5 text-sm text-foreground outline-none transition-colors duration-300 ease-fluid placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-[var(--ring)]"
              />
            </div>

            @if (error()) {
              <p class="text-sm text-destructive">{{ error() }}</p>
            }

            <button
              type="submit"
              [disabled]="loading()"
              class="mt-2 w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground shadow-glow disabled:cursor-not-allowed disabled:opacity-50"
            >
              {{ loading() ? 'Signing in…' : 'Sign in' }}
            </button>
          </form>

          <p class="mt-6 text-sm text-muted-foreground">
            New here?
            <a routerLink="/register" class="text-accent hover:underline">Create an account</a>
          </p>
          <p class="mt-2 font-mono text-xs text-muted-foreground">
            demo&#64;trading.local / password123
          </p>
        </div>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  email = '';
  password = '';
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  async submit(): Promise<void> {
    this.error.set(null);
    this.loading.set(true);
    try {
      await this.authService.login(this.email, this.password);
      await this.router.navigate(['/dashboard']);
    } catch {
      this.error.set('Invalid email or password.');
    } finally {
      this.loading.set(false);
    }
  }
}
