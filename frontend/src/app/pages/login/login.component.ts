import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="flex min-h-screen items-center justify-center px-4">
      <div class="w-full max-w-sm rounded-2xl border border-border glass-panel p-8 shadow-ambient page-enter">
        <h1 class="font-display text-4xl text-foreground">Fauxnance</h1>
        <p class="mt-1 text-sm text-muted-foreground">Sign in to your trading account</p>

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
            class="mt-2 w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground shadow-glow transition-transform duration-300 ease-fluid hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
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
