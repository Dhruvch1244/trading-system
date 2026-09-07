import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { AuthStore } from './auth.store';

/** Attaches the Bearer JWT to trade-api calls only - auth-service issues the token, it doesn't need one back. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authStore = inject(AuthStore);

  if (!req.url.startsWith(environment.tradeApiUrl)) {
    return next(req);
  }

  const token = authStore.accessToken;
  if (!token) {
    return next(req);
  }

  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
