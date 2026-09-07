import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { AuthStore } from '../../core/auth.store';
import { Session } from '../../core/models';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="mx-auto max-w-2xl px-6 pb-16 page-enter">
      <h1 class="font-display text-4xl text-foreground">Settings</h1>

      <section class="mt-6 rounded-2xl border border-border glass-panel p-6 shadow-ambient">
        <h2 class="font-display text-2xl text-foreground">Profile</h2>
        @if (user(); as user) {
          <dl class="mt-4 grid grid-cols-2 gap-3 text-sm">
            <dt class="text-muted-foreground">Name</dt>
            <dd class="text-foreground">{{ user.firstName }} {{ user.lastName }}</dd>
            <dt class="text-muted-foreground">Email</dt>
            <dd class="font-mono text-foreground">{{ user.email }}</dd>
            <dt class="text-muted-foreground">Phone</dt>
            <dd class="font-mono text-foreground">{{ user.phoneNo ?? '—' }}</dd>
            <dt class="text-muted-foreground">Account ID</dt>
            <dd class="font-mono text-foreground">{{ user.accountId }}</dd>
          </dl>
        }
      </section>

      <section class="mt-6 rounded-2xl border border-border glass-panel p-6 shadow-ambient">
        <h2 class="font-display text-2xl text-foreground">Change password</h2>
        <form class="mt-4 space-y-4" (ngSubmit)="changePassword()">
          <div>
            <label class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Current password</label>
            <input
              type="password" name="currentPassword" [(ngModel)]="currentPassword" required autocomplete="current-password"
              class="w-full rounded-lg border border-border bg-transparent px-3 py-2.5 text-sm text-foreground outline-none transition-colors duration-300 ease-fluid focus:border-accent focus:ring-2 focus:ring-[var(--ring)]"
            />
          </div>
          <div>
            <label class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">New password</label>
            <input
              type="password" name="newPassword" [(ngModel)]="newPassword" required minlength="8" autocomplete="new-password"
              placeholder="At least 8 characters"
              class="w-full rounded-lg border border-border bg-transparent px-3 py-2.5 text-sm text-foreground outline-none transition-colors duration-300 ease-fluid placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-[var(--ring)]"
            />
          </div>

          @if (passwordError()) {
            <p class="text-sm text-destructive">{{ passwordError() }}</p>
          }
          @if (passwordSuccess()) {
            <p class="text-sm text-accent">Password changed. Every other session was signed out.</p>
          }

          <button
            type="submit"
            [disabled]="changingPassword()"
            class="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground shadow-glow transition-transform duration-300 ease-fluid hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {{ changingPassword() ? 'Updating…' : 'Update password' }}
          </button>
        </form>
      </section>

      <section class="mt-6 rounded-2xl border border-border glass-panel p-6 shadow-ambient">
        <h2 class="font-display text-2xl text-foreground">Active sessions</h2>
        <p class="mt-1 text-sm text-muted-foreground">Every device currently signed in to this account.</p>

        <div class="mt-4 space-y-2">
          @for (session of sessions(); track session.id) {
            <div class="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div>
                <p class="font-mono text-xs text-foreground">Session {{ session.id | slice: 0 : 8 }}…</p>
                <p class="mt-0.5 text-xs text-muted-foreground">
                  Created {{ session.createdAt | date: 'medium' }} · expires {{ session.expiresAt | date: 'medium' }}
                </p>
              </div>
              <button (click)="revoke(session.id)" class="text-xs font-medium text-destructive hover:underline">
                Revoke
              </button>
            </div>
          } @empty {
            <p class="text-sm text-muted-foreground">No active sessions.</p>
          }
        </div>
      </section>
    </div>
  `,
})
export class SettingsComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);

  readonly user = this.authStore.user;
  readonly sessions = signal<Session[]>([]);
  readonly changingPassword = signal(false);
  readonly passwordError = signal<string | null>(null);
  readonly passwordSuccess = signal(false);

  currentPassword = '';
  newPassword = '';

  ngOnInit(): void {
    this.refreshSessions();
  }

  private refreshSessions(): void {
    this.authService.getSessions().then((sessions) => this.sessions.set(sessions));
  }

  async changePassword(): Promise<void> {
    this.passwordError.set(null);
    this.passwordSuccess.set(false);
    this.changingPassword.set(true);

    try {
      await this.authService.changePassword(this.currentPassword, this.newPassword);
      this.currentPassword = '';
      this.newPassword = '';
      this.passwordSuccess.set(true);
      // Changing the password revoked every session server-side, including this one's refresh
      // token - the access token still works until it naturally expires, but send the user
      // back through login so there's no stale, silently-dead session hanging around.
      setTimeout(() => {
        this.authService.logout();
        this.router.navigate(['/login']);
      }, 2000);
    } catch (err: any) {
      this.passwordError.set(err?.status === 403 ? 'Current password is incorrect.' : 'Could not change password.');
    } finally {
      this.changingPassword.set(false);
    }
  }

  async revoke(sessionId: string): Promise<void> {
    await this.authService.revokeSession(sessionId);
    this.refreshSessions();
  }
}
