import { Injectable, computed, signal } from '@angular/core';
import { AuthTokens, CurrentUser } from './models';

const STORAGE_KEY = 'fauxnance.auth';

interface PersistedAuth {
  tokens: AuthTokens;
  user: CurrentUser;
}

/**
 * Holds the JWT + current user as signals. localStorage is the only persistence
 * layer here - there is no server session, so a page reload must be able to
 * rehydrate from it alone.
 */
@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly tokensSignal = signal<AuthTokens | null>(null);
  private readonly userSignal = signal<CurrentUser | null>(null);

  readonly tokens = this.tokensSignal.asReadonly();
  readonly user = this.userSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.tokensSignal() !== null);

  constructor() {
    this.rehydrate();
  }

  private rehydrate(): void {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const persisted: PersistedAuth = JSON.parse(raw);
      this.tokensSignal.set(persisted.tokens);
      this.userSignal.set(persisted.user);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  setSession(tokens: AuthTokens, user: CurrentUser): void {
    this.tokensSignal.set(tokens);
    this.userSignal.set(user);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ tokens, user }));
  }

  updateTokens(tokens: AuthTokens): void {
    this.tokensSignal.set(tokens);
    const user = this.userSignal();
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ tokens, user }));
    }
  }

  clear(): void {
    this.tokensSignal.set(null);
    this.userSignal.set(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  get accessToken(): string | null {
    return this.tokensSignal()?.accessToken ?? null;
  }
}
