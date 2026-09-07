import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthStore } from './auth.store';
import { AuthTokens, CurrentUser, SignupRequest } from './models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly authStore = inject(AuthStore);
  private readonly baseUrl = environment.authServiceUrl;

  async login(email: string, password: string): Promise<void> {
    const tokens = await firstValueFrom(
      this.http.post<AuthTokens>(`${this.baseUrl}/auth/login`, { email, password }),
    );
    await this.establishSession(tokens);
  }

  async signup(request: SignupRequest): Promise<void> {
    const tokens = await firstValueFrom(
      this.http.post<AuthTokens>(`${this.baseUrl}/auth/signup`, request),
    );
    await this.establishSession(tokens);
  }

  private async establishSession(tokens: AuthTokens): Promise<void> {
    const user = await firstValueFrom(
      this.http.get<CurrentUser>(`${this.baseUrl}/auth/me`, {
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
      }),
    );
    this.authStore.setSession(tokens, user);
  }

  async refresh(): Promise<void> {
    const current = this.authStore.tokens();
    if (!current) throw new Error('no session to refresh');
    const tokens = await firstValueFrom(
      this.http.post<AuthTokens>(`${this.baseUrl}/auth/refresh`, { refreshToken: current.refreshToken }),
    );
    this.authStore.updateTokens(tokens);
  }

  async logout(): Promise<void> {
    const current = this.authStore.tokens();
    this.authStore.clear();
    if (!current) return;
    try {
      // Best-effort - the local session is already cleared either way, but this revokes the
      // refresh token server-side so it can't be replayed if it ever leaked.
      await firstValueFrom(this.http.post(`${this.baseUrl}/auth/logout`, { refreshToken: current.refreshToken }));
    } catch {
      // Ignore - user is logged out locally regardless.
    }
  }
}
