import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="flex min-h-screen items-center justify-center px-4 py-12">
      <div class="w-full max-w-sm rounded-2xl border border-border glass-panel p-8 shadow-ambient page-enter">
        <h1 class="font-display text-4xl text-foreground">Create account</h1>
        <p class="mt-1 text-sm text-muted-foreground">Opens a new trading account instantly</p>

        <form class="mt-8 space-y-4" (ngSubmit)="submit()">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">First name</label>
              <input
                type="text" name="firstName" [(ngModel)]="firstName" required autocomplete="given-name"
                class="w-full rounded-lg border border-border bg-transparent px-3 py-2.5 text-sm text-foreground outline-none transition-colors duration-300 ease-fluid focus:border-accent focus:ring-2 focus:ring-[var(--ring)]"
              />
            </div>
            <div>
              <label class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Last name</label>
              <input
                type="text" name="lastName" [(ngModel)]="lastName" required autocomplete="family-name"
                class="w-full rounded-lg border border-border bg-transparent px-3 py-2.5 text-sm text-foreground outline-none transition-colors duration-300 ease-fluid focus:border-accent focus:ring-2 focus:ring-[var(--ring)]"
              />
            </div>
          </div>

          <div>
            <label class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Email</label>
            <input
              type="email" name="email" [(ngModel)]="email" required autocomplete="email"
              placeholder="you@example.com"
              class="w-full rounded-lg border border-border bg-transparent px-3 py-2.5 text-sm text-foreground outline-none transition-colors duration-300 ease-fluid placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-[var(--ring)]"
            />
          </div>

          <div>
            <label class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Phone (optional)</label>
            <input
              type="tel" name="phoneNo" [(ngModel)]="phoneNo" autocomplete="tel"
              class="w-full rounded-lg border border-border bg-transparent px-3 py-2.5 text-sm text-foreground outline-none transition-colors duration-300 ease-fluid focus:border-accent focus:ring-2 focus:ring-[var(--ring)]"
            />
          </div>

          <div>
            <label class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Password</label>
            <input
              type="password" name="password" [(ngModel)]="password" required minlength="8" autocomplete="new-password"
              placeholder="At least 8 characters"
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
            {{ loading() ? 'Creating account…' : 'Create account' }}
          </button>
        </form>

        <p class="mt-6 text-sm text-muted-foreground">
          Have an account?
          <a routerLink="/login" class="text-accent hover:underline">Sign in</a>
        </p>
      </div>
    </div>
  `,
})
export class RegisterComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  firstName = '';
  lastName = '';
  email = '';
  phoneNo = '';
  password = '';
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  async submit(): Promise<void> {
    this.error.set(null);
    this.loading.set(true);
    try {
      await this.authService.signup({
        email: this.email,
        password: this.password,
        firstName: this.firstName,
        lastName: this.lastName,
        phoneNo: this.phoneNo || undefined,
      });
      await this.router.navigate(['/dashboard']);
    } catch (err: any) {
      this.error.set(err?.status === 409 ? 'That email is already registered.' : 'Could not create account.');
    } finally {
      this.loading.set(false);
    }
  }
}
