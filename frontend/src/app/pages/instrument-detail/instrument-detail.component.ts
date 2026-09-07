import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription, interval, startWith, switchMap } from 'rxjs';
import { TradeApiService } from '../../core/trade-api.service';
import { Candle, Instrument, MarketDataTick, OrderSide, WatchlistEntry } from '../../core/models';
import { PriceChartComponent } from '../../shared/price-chart.component';

const QUOTE_POLL_MS = 5000;

@Component({
  selector: 'app-instrument-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PriceChartComponent],
  template: `
    <div class="mx-auto max-w-5xl px-6 pb-16 page-enter">
      @if (instrument(); as instrument) {
        <div class="flex items-start justify-between">
          <div>
            <h1 class="font-display text-4xl text-foreground">{{ instrument.symbol }}</h1>
            <p class="mt-1 text-sm text-muted-foreground">{{ instrument.name }} · {{ instrument.assetClass }}</p>
          </div>
          <div class="text-right">
            <p class="font-mono text-3xl text-accent">{{ quote()?.price ?? '—' }}</p>
            <button
              (click)="toggleWatchlist()"
              class="mt-2 text-xs font-medium text-muted-foreground hover:text-accent hover:underline"
            >
              {{ onWatchlist() ? '− Remove from watchlist' : '+ Add to watchlist' }}
            </button>
          </div>
        </div>

        <div class="mt-6 h-96 rounded-2xl border border-border glass-panel p-4 shadow-ambient">
          @if (candles().length > 0) {
            <app-price-chart [candles]="candles()" />
          } @else {
            <p class="flex h-full items-center justify-center text-sm text-muted-foreground">No chart data yet.</p>
          }
        </div>

        <div class="mt-6 rounded-2xl border border-border glass-panel p-6 shadow-ambient">
          <h2 class="font-display text-2xl text-foreground">Quick order</h2>
          <div class="mt-4 flex flex-wrap items-end gap-3">
            <div>
              <label class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Quantity</label>
              <input
                type="number" min="1" step="1" [(ngModel)]="qty"
                class="w-28 rounded-lg border border-border bg-transparent px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent"
              />
            </div>
            <button
              (click)="placeQuickOrder('BUY')"
              [disabled]="submitting()"
              class="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground shadow-glow transition-transform duration-300 ease-fluid hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Buy market
            </button>
            <button
              (click)="placeQuickOrder('SELL')"
              [disabled]="submitting()"
              class="rounded-lg bg-destructive px-5 py-2.5 text-sm font-semibold text-white transition-transform duration-300 ease-fluid hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Sell market
            </button>
            <a routerLink="/order-ticket" class="text-sm font-medium text-accent hover:underline">Full order ticket →</a>
          </div>
          @if (orderMessage()) {
            <p class="mt-3 text-sm" [class.text-accent]="!orderError()" [class.text-destructive]="orderError()">
              {{ orderMessage() }}
            </p>
          }
        </div>
      } @else if (notFound()) {
        <p class="text-sm text-muted-foreground">Unknown instrument.</p>
      }
    </div>
  `,
})
export class InstrumentDetailComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly tradeApi = inject(TradeApiService);
  private pollSub?: Subscription;

  readonly instrument = signal<Instrument | null>(null);
  readonly quote = signal<MarketDataTick | null>(null);
  readonly candles = signal<Candle[]>([]);
  readonly watchlist = signal<WatchlistEntry[]>([]);
  readonly notFound = signal(false);
  readonly submitting = signal(false);
  readonly orderMessage = signal<string | null>(null);
  readonly orderError = signal(false);

  readonly onWatchlist = () => this.watchlist().some((w) => w.symbol === this.instrument()?.symbol);

  qty = 1;
  private symbol = '';

  ngOnInit(): void {
    this.symbol = (this.route.snapshot.paramMap.get('symbol') ?? '').toUpperCase();

    this.tradeApi.searchInstruments(this.symbol, 1).subscribe((results) => {
      const match = results.find((i) => i.symbol === this.symbol);
      if (!match) {
        this.notFound.set(true);
        return;
      }
      this.instrument.set(match);
    });

    this.tradeApi.getCandles(this.symbol).subscribe((candles) => this.candles.set(candles));
    this.tradeApi.getWatchlist().subscribe((entries) => this.watchlist.set(entries));

    this.pollSub = interval(QUOTE_POLL_MS)
      .pipe(
        startWith(0),
        switchMap(() => this.tradeApi.getQuote(this.symbol)),
      )
      .subscribe((tick) => this.quote.set(tick));
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
  }

  toggleWatchlist(): void {
    if (this.onWatchlist()) {
      this.tradeApi.removeFromWatchlist(this.symbol).subscribe(() => {
        this.watchlist.update((entries) => entries.filter((e) => e.symbol !== this.symbol));
      });
    } else {
      this.tradeApi.addToWatchlist(this.symbol).subscribe(() => {
        this.tradeApi.getWatchlist().subscribe((entries) => this.watchlist.set(entries));
      });
    }
  }

  placeQuickOrder(side: OrderSide): void {
    this.orderMessage.set(null);
    this.submitting.set(true);
    this.tradeApi
      .placeOrder({
        symbol: this.symbol,
        side,
        orderType: 'MARKET',
        qty: this.qty,
        idempotencyKey: crypto.randomUUID(),
      })
      .subscribe({
        next: (order) => {
          this.orderError.set(false);
          this.orderMessage.set(`Order ${order.id.slice(0, 8)}… submitted — status ${order.status}`);
          this.submitting.set(false);
        },
        error: () => {
          this.orderError.set(true);
          this.orderMessage.set('Order rejected. Check account status.');
          this.submitting.set(false);
        },
      });
  }
}
