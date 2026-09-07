import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./pages/login/login.component').then((m) => m.LoginComponent) },
  { path: 'register', loadComponent: () => import('./pages/register/register.component').then((m) => m.RegisterComponent) },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/dashboard/dashboard.component').then((m) => m.DashboardComponent),
  },
  {
    path: 'order-ticket',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/order-ticket/order-ticket.component').then((m) => m.OrderTicketComponent),
  },
  {
    path: 'blotter',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/blotter/blotter.component').then((m) => m.BlotterComponent),
  },
  {
    path: 'watchlist',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/watchlist/watchlist.component').then((m) => m.WatchlistComponent),
  },
  {
    path: 'balance-history',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/balance-history/balance-history.component').then((m) => m.BalanceHistoryComponent),
  },
  {
    path: 'instruments/:symbol',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/instrument-detail/instrument-detail.component').then((m) => m.InstrumentDetailComponent),
  },
  {
    path: 'settings',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/settings/settings.component').then((m) => m.SettingsComponent),
  },
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: '**', redirectTo: 'dashboard' },
];
