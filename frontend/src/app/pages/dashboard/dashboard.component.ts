import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { TradeApiService } from '../../core/trade-api.service';
import { Account, MarketDataTick, Position } from '../../core/models';

const DEFAULT_MARKET_TILES = ['AAPL', 'MSFT', 'GOOGL', 'TSLA'];

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="mx-auto max-w-6xl px-6 pb-16">
      <h1 class="font-display text-4xl text-foreground">Dashboard</h1>

      @if (loading()) {
        <p class="mt-6 text-sm text-muted-foreground">Loading account…</p>
      } @else {
        <div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div class="rounded-2xl border border-border glass-panel p-6 shadow-ambient">
            <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Portfolio value</p>
            <p class="mt-2 font-mono text-2xl text-foreground">{{ portfolioValue() | number: '1.2-2' }}</p>
          </div>
          <div class="rounded-2xl border border-border glass-panel p-6 shadow-ambient">
            <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Cash balance</p>
            <p class="mt-2 font-mono text-2xl text-foreground">{{ account()?.cashBalance | number: '1.2-2' }}</p>
          </div>
          <div class="rounded-2xl border border-border glass-panel p-6 shadow-ambient">
            <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Buying power</p>
            <p class="mt-2 font-mono text-2xl text-accent">{{ account()?.buyingPower | number: '1.2-2' }}</p>
          </div>
          <div class="rounded-2xl border border-border glass-panel p-6 shadow-ambient">
            <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</p>
            <p class="mt-2 font-mono text-2xl text-foreground">{{ account()?.status }}</p>
            <p class="mt-1 text-xs text-muted-foreground">{{ account()?.accountReference }}</p>
          </div>
        </div>

        <div class="mt-10 flex items-center justify-between">
          <h2 class="font-display text-2xl text-foreground">Positions</h2>
          <a routerLink="/order-ticket" class="rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-accent-foreground shadow-glow transition-transform duration-300 ease-fluid hover:scale-[1.02]">
            + New order
          </a>
        </div>

        <div class="mt-4 overflow-hidden rounded-2xl border border-border">
          <table class="w-full text-left text-sm">
            <thead class="bg-muted text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th class="px-4 py-3 font-medium">Symbol</th>
                <th class="px-4 py-3 font-medium">Qty</th>
                <th class="px-4 py-3 font-medium">Avg cost</th>
                <th class="px-4 py-3 font-medium">Last price</th>
                <th class="px-4 py-3 font-medium">Market value</th>
                <th class="px-4 py-3 font-medium">Unrealized P&amp;L</th>
              </tr>
            </thead>
            <tbody>
              @for (position of positions(); track position.symbol) {
                <tr class="border-t border-border">
                  <td class="px-4 py-3 font-mono text-foreground">{{ position.symbol }}</td>
                  <td class="px-4 py-3 font-mono text-foreground">{{ position.qty }}</td>
                  <td class="px-4 py-3 font-mono text-muted-foreground">{{ position.avgCost | number: '1.2-2' }}</td>
                  <td class="px-4 py-3 font-mono text-accent">{{ position.lastPrice | number: '1.2-2' }}</td>
                  <td class="px-4 py-3 font-mono text-foreground">{{ position.marketValue | number: '1.2-2' }}</td>
                  <td class="px-4 py-3 font-mono" [class.text-accent]="position.unrealizedPnl >= 0" [class.text-destructive]="position.unrealizedPnl < 0">
                    {{ position.unrealizedPnl >= 0 ? '+' : '' }}{{ position.unrealizedPnl | number: '1.2-2' }}
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="6" class="px-4 py-8 text-center text-muted-foreground">No open positions yet.</td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <div class="mt-10 flex items-center justify-between">
          <h2 class="font-display text-2xl text-foreground">Market</h2>
          <a routerLink="/watchlist" class="text-sm font-medium text-accent hover:underline">Manage watchlist</a>
        </div>
        <div class="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          @for (symbol of marketTileSymbols(); track symbol) {
            <div class="rounded-xl border border-border glass-panel p-4 shadow-ambient">
              <p class="font-mono text-sm text-muted-foreground">{{ symbol }}</p>
              <p class="mt-1 font-mono text-lg text-foreground">
                {{ quotes()[symbol]?.price ?? '—' }}
              </p>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  private readonly tradeApi = inject(TradeApiService);

  readonly loading = signal(true);
  readonly account = signal<Account | null>(null);
  readonly positions = signal<Position[]>([]);
  readonly marketTileSymbols = signal<string[]>([]);
  readonly quotes = signal<Record<string, MarketDataTick>>({});

  readonly portfolioValue = () =>
    (this.account()?.cashBalance ?? 0) + this.positions().reduce((sum, p) => sum + p.marketValue, 0);

  ngOnInit(): void {
    forkJoin({
      account: this.tradeApi.getAccount(),
      positions: this.tradeApi.getPositions(),
      watchlist: this.tradeApi.getWatchlist(),
    }).subscribe(({ account, positions, watchlist }) => {
      this.account.set(account);
      this.positions.set(positions);
      this.loading.set(false);

      const tileSymbols = watchlist.length > 0 ? watchlist.map((w) => w.symbol).slice(0, 4) : DEFAULT_MARKET_TILES;
      this.marketTileSymbols.set(tileSymbols);
      this.loadQuotes(tileSymbols);
    });
  }

  private loadQuotes(symbols: string[]): void {
    for (const symbol of symbols) {
      this.tradeApi.getQuote(symbol).subscribe((tick) => {
        if (!tick) return;
        this.quotes.update((current) => ({ ...current, [symbol]: tick }));
      });
    }
  }
}
