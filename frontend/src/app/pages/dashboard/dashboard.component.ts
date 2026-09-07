import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription, forkJoin, interval, startWith, switchMap } from 'rxjs';
import { TradeApiService } from '../../core/trade-api.service';
import { Account, MarketDataTick, Mover, Position } from '../../core/models';
import { TickerTapeComponent } from '../../shared/ticker-tape.component';
import { DonutChartComponent, DonutSegment } from '../../shared/donut-chart.component';

const DEFAULT_MARKET_TILES = ['AAPL', 'MSFT', 'GOOGL', 'TSLA'];
const REFRESH_MS = 5000;
const DONUT_PALETTE = ['#28e0ec', '#9a6bff', '#f2b45e', '#ff2e7e', '#7aecf4', '#a8afc0'];

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, TickerTapeComponent, DonutChartComponent],
  template: `
    @if (tickerItems().length > 0) {
      <app-ticker-tape [items]="tickerItems()" />
    }

    <div class="mx-auto max-w-6xl px-6 pb-16 page-enter">
      <h1 class="mt-6 font-display text-4xl text-foreground">Dashboard</h1>

      @if (loading()) {
        <p class="mt-6 text-sm text-muted-foreground">Loading account…</p>
      } @else {
        <div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div class="rounded-2xl border border-border glass-panel p-6 shadow-glow">
            <div class="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <span aria-hidden="true">◆</span> Portfolio value
            </div>
            <p class="mt-2 font-mono text-2xl text-foreground">{{ portfolioValue() | number: '1.2-2' }}</p>
          </div>
          <div class="rounded-2xl border border-border glass-panel p-6 shadow-ambient">
            <div class="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <span aria-hidden="true">$</span> Cash balance
            </div>
            <p class="mt-2 font-mono text-2xl text-foreground">{{ account()?.cashBalance | number: '1.2-2' }}</p>
          </div>
          <div class="rounded-2xl border border-border glass-panel p-6 shadow-ambient">
            <div class="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <span aria-hidden="true">↑</span> Buying power
            </div>
            <p class="mt-2 font-mono text-2xl text-accent">{{ account()?.buyingPower | number: '1.2-2' }}</p>
          </div>
          <div class="rounded-2xl border border-border glass-panel p-6 shadow-ambient">
            <div class="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <span aria-hidden="true">●</span> Status
            </div>
            <p class="mt-2 font-mono text-2xl text-foreground">{{ account()?.status }}</p>
            <p class="mt-1 text-xs text-muted-foreground">{{ account()?.accountReference }}</p>
          </div>
        </div>

        <div class="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div class="rounded-2xl border border-border glass-panel p-6 shadow-ambient">
            <h2 class="font-display text-2xl text-foreground">Allocation</h2>
            @if (donutSegments().length > 0) {
              <div class="mt-4">
                <app-donut-chart [segments]="donutSegments()" />
              </div>
            } @else {
              <p class="mt-4 text-sm text-muted-foreground">Open a position to see your allocation breakdown.</p>
            }
          </div>

          <div class="rounded-2xl border border-border glass-panel p-6 shadow-ambient">
            <h2 class="font-display text-2xl text-foreground">Trade suggestions</h2>
            <p class="mt-1 text-xs text-muted-foreground">
              Heuristic highlights from today's biggest movers — not financial advice.
            </p>
            <div class="mt-4 space-y-2">
              @for (suggestion of suggestions(); track suggestion.symbol) {
                <a
                  [routerLink]="['/instruments', suggestion.symbol]"
                  class="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 transition-colors duration-300 ease-fluid hover:border-accent"
                >
                  <div>
                    <span class="font-mono text-sm text-foreground">{{ suggestion.symbol }}</span>
                    <span
                      class="ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                      [class.bg-accent]="suggestion.changePercent >= 0"
                      [class.text-accent-foreground]="suggestion.changePercent >= 0"
                      [class.bg-destructive]="suggestion.changePercent < 0"
                      [class.text-white]="suggestion.changePercent < 0"
                    >
                      {{ suggestion.changePercent >= 0 ? 'Momentum' : 'Pullback' }}
                    </span>
                  </div>
                  <span class="font-mono text-sm" [class.text-accent]="suggestion.changePercent >= 0" [class.text-destructive]="suggestion.changePercent < 0">
                    {{ suggestion.changePercent >= 0 ? '+' : '' }}{{ suggestion.changePercent | number: '1.2-2' }}%
                  </span>
                </a>
              } @empty {
                <p class="text-sm text-muted-foreground">Not enough price history yet today.</p>
              }
            </div>
          </div>
        </div>

        <div class="mt-10 flex items-center justify-between">
          <h2 class="font-display text-2xl text-foreground">Positions</h2>
          <a routerLink="/order-ticket" class="rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-accent-foreground shadow-glow transition-transform duration-300 ease-fluid hover:scale-[1.02]">
            + New order
          </a>
        </div>

        <div class="mt-4 overflow-x-auto rounded-2xl border border-border">
          <table class="w-full min-w-[640px] text-left text-sm">
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
                  <td class="px-4 py-3 font-mono text-foreground">
                    <a [routerLink]="['/instruments', position.symbol]" class="hover:text-accent hover:underline">{{ position.symbol }}</a>
                  </td>
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
            <a
              [routerLink]="['/instruments', symbol]"
              class="rounded-xl border border-border glass-panel p-4 shadow-ambient transition-transform duration-300 ease-fluid hover:scale-[1.02]"
            >
              <p class="font-mono text-sm text-muted-foreground">{{ symbol }}</p>
              <p class="mt-1 font-mono text-lg text-foreground">
                {{ quotes()[symbol]?.price ?? '—' }}
              </p>
            </a>
          }
        </div>
      }
    </div>
  `,
})
export class DashboardComponent implements OnInit, OnDestroy {
  private readonly tradeApi = inject(TradeApiService);
  private pollSub?: Subscription;
  private moversSub?: Subscription;

  readonly loading = signal(true);
  readonly account = signal<Account | null>(null);
  readonly positions = signal<Position[]>([]);
  readonly marketTileSymbols = signal<string[]>([]);
  readonly quotes = signal<Record<string, MarketDataTick>>({});
  readonly suggestions = signal<Mover[]>([]);
  readonly tickerItems = signal<Mover[]>([]);

  readonly portfolioValue = () =>
    (this.account()?.cashBalance ?? 0) + this.positions().reduce((sum, p) => sum + p.marketValue, 0);

  readonly donutSegments = (): DonutSegment[] =>
    this.positions().map((p, i) => ({
      label: p.symbol,
      value: p.marketValue,
      color: DONUT_PALETTE[i % DONUT_PALETTE.length],
    }));

  ngOnInit(): void {
    this.tradeApi.getWatchlist().subscribe((watchlist) => {
      const tileSymbols = watchlist.length > 0 ? watchlist.map((w) => w.symbol).slice(0, 4) : DEFAULT_MARKET_TILES;
      this.marketTileSymbols.set(tileSymbols);

      // Account/positions refresh on a timer so fills from trade-executor and price moves show
      // up without a manual reload; polling rather than a WebSocket gateway keeps this a plain
      // HTTP client with no new backend infrastructure.
      this.pollSub = interval(REFRESH_MS)
        .pipe(
          startWith(0),
          switchMap(() => forkJoin({ account: this.tradeApi.getAccount(), positions: this.tradeApi.getPositions() })),
        )
        .subscribe(({ account, positions }) => {
          this.account.set(account);
          this.positions.set(positions);
          this.loading.set(false);
          this.loadQuotes(tileSymbols);
        });
    });

    this.moversSub = interval(REFRESH_MS)
      .pipe(
        startWith(0),
        switchMap(() => this.tradeApi.getMovers(5)),
      )
      .subscribe(({ gainers, losers }) => {
        this.suggestions.set([...gainers.slice(0, 3), ...losers.slice(0, 3)]);
        this.tickerItems.set([...gainers, ...losers]);
      });
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
    this.moversSub?.unsubscribe();
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
