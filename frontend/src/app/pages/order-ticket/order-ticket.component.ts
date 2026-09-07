import { Component, OnDestroy, OnInit, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription, interval, startWith, switchMap } from 'rxjs';
import { TradeApiService } from '../../core/trade-api.service';
import { Account, Instrument, MarketDataTick, Mover, Order, OrderSide, OrderType } from '../../core/models';
import { InstrumentPickerComponent } from '../../shared/instrument-picker.component';
import { SparklineComponent } from '../../shared/sparkline.component';

const QUOTE_POLL_MS = 5000;

@Component({
  selector: 'app-order-ticket',
  standalone: true,
  imports: [CommonModule, FormsModule, InstrumentPickerComponent, SparklineComponent],
  template: `
    <div class="mx-auto max-w-4xl px-6 pb-16 page-enter">
      <h1 class="font-display text-4xl text-foreground">Order ticket</h1>

      <div class="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <form class="space-y-5 rounded-2xl border border-border glass-panel p-8 shadow-ambient" (ngSubmit)="submit()">
          <div>
            <label class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Symbol</label>
            <app-instrument-picker #picker ariaLabel="Symbol" (symbolSelected)="onSymbolSelected($event)" />
          </div>

          @if (!selectedInstrument()) {
            <div>
              <p class="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Today's most active</p>
              <div class="flex flex-wrap gap-2">
                @for (mover of quickPicks(); track mover.symbol) {
                  <button
                    type="button"
                    (click)="pickSuggestion(mover.symbol)"
                    class="rounded-full border border-border px-3 py-1.5 text-xs font-mono text-muted-foreground hover:border-accent hover:text-foreground"
                  >
                    {{ mover.symbol }}
                    <span [class.text-accent]="mover.changePercent >= 0" [class.text-destructive]="mover.changePercent < 0">
                      {{ mover.changePercent >= 0 ? '+' : '' }}{{ mover.changePercent | number: '1.1-1' }}%
                    </span>
                  </button>
                }
              </div>
            </div>
          }

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Side</label>
              <div class="flex overflow-hidden rounded-lg border border-border">
                <button type="button" (click)="side.set('BUY')"
                  [class.bg-accent]="side() === 'BUY'" [class.text-accent-foreground]="side() === 'BUY'"
                  class="flex-1 py-2.5 text-sm font-semibold text-muted-foreground transition-colors duration-300 ease-fluid">
                  BUY
                </button>
                <button type="button" (click)="side.set('SELL')"
                  [class.bg-destructive]="side() === 'SELL'" [class.text-white]="side() === 'SELL'"
                  class="flex-1 py-2.5 text-sm font-semibold text-muted-foreground transition-colors duration-300 ease-fluid">
                  SELL
                </button>
              </div>
            </div>

            <div>
              <label class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Order type</label>
              <select
                name="orderType"
                [ngModel]="orderType()"
                (ngModelChange)="orderType.set($event)"
                class="w-full rounded-lg border border-border bg-transparent px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent"
              >
                <option value="MARKET">Market</option>
                <option value="LIMIT">Limit</option>
              </select>
            </div>
          </div>

          <div>
            <label class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Quantity</label>
            <input
              type="number" name="qty" min="1" step="1" required
              [(ngModel)]="qty"
              class="w-full rounded-lg border border-border bg-transparent px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent"
            />
          </div>

          @if (orderType() === 'LIMIT') {
            <div>
              <label class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Limit price</label>
              <input
                type="number" name="price" min="0.0001" step="0.01" required
                [(ngModel)]="price"
                class="w-full rounded-lg border border-border bg-transparent px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent"
              />
            </div>
          }

          @if (estimatedCost(); as cost) {
            <p class="text-xs text-muted-foreground">
              Estimated {{ side() === 'BUY' ? 'cost' : 'proceeds' }}:
              <span class="font-mono text-foreground">{{ cost | number: '1.2-2' }}</span>
              @if (account(); as acct) {
                <span> · buying power {{ acct.buyingPower | number: '1.2-2' }}</span>
              }
            </p>
          }

          @if (error()) {
            <p class="text-sm text-destructive">{{ error() }}</p>
          }

          @if (placedOrder(); as order) {
            <p class="rounded-lg border border-border bg-muted px-4 py-3 font-mono text-xs text-accent">
              Order {{ order.id }} submitted — status {{ order.status }}
            </p>
          }

          <button
            type="submit"
            [disabled]="submitting() || !selectedInstrument()"
            class="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground shadow-glow disabled:cursor-not-allowed disabled:opacity-50"
          >
            {{ submitting() ? 'Submitting…' : 'Place order' }}
          </button>
        </form>

        <div class="rounded-2xl border border-border glass-panel p-6 shadow-ambient">
          @if (selectedInstrument(); as instrument) {
            <p class="font-mono text-sm text-muted-foreground">{{ instrument.symbol }}</p>
            <p class="mt-1 text-xs text-muted-foreground">{{ instrument.name }}</p>
            <p class="mt-3 font-mono text-3xl text-accent">{{ quote()?.price ?? '—' }}</p>
            @if (sparkline().length > 1) {
              <div class="mt-3">
                <app-sparkline [values]="sparkline()" />
              </div>
            }
          } @else {
            <p class="text-sm text-muted-foreground">Search or pick a symbol to see its live quote here.</p>
          }
        </div>
      </div>
    </div>
  `,
})
export class OrderTicketComponent implements OnInit, OnDestroy {
  private readonly tradeApi = inject(TradeApiService);
  private quoteSub?: Subscription;

  @ViewChild('picker') picker!: InstrumentPickerComponent;

  readonly selectedInstrument = signal<Instrument | null>(null);
  readonly side = signal<OrderSide>('BUY');
  readonly orderType = signal<OrderType>('MARKET');
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);
  readonly placedOrder = signal<Order | null>(null);
  readonly quote = signal<MarketDataTick | null>(null);
  readonly sparkline = signal<number[]>([]);
  readonly quickPicks = signal<Mover[]>([]);
  readonly account = signal<Account | null>(null);

  readonly estimatedCost = (): number | null => {
    const price = this.orderType() === 'LIMIT' ? this.price : this.quote()?.price;
    return price ? price * this.qty : null;
  };

  qty = 1;
  price: number | null = null;

  ngOnInit(): void {
    this.tradeApi.getAccount().subscribe((account) => this.account.set(account));
    this.tradeApi.getMovers(4).subscribe(({ gainers, losers }) => this.quickPicks.set([...gainers.slice(0, 4), ...losers.slice(0, 4)]));
  }

  ngOnDestroy(): void {
    this.quoteSub?.unsubscribe();
  }

  onSymbolSelected(instrument: Instrument): void {
    this.selectedInstrument.set(instrument);
    this.startQuotePolling(instrument.symbol);
    this.tradeApi.getCandles(instrument.symbol).subscribe((candles) => this.sparkline.set(candles.map((c) => c.close)));
  }

  pickSuggestion(symbol: string): void {
    this.tradeApi.searchInstruments(symbol, 1).subscribe((results) => {
      const match = results.find((i) => i.symbol === symbol);
      if (match) this.onSymbolSelected(match);
    });
  }

  private startQuotePolling(symbol: string): void {
    this.quoteSub?.unsubscribe();
    this.quoteSub = interval(QUOTE_POLL_MS)
      .pipe(
        startWith(0),
        switchMap(() => this.tradeApi.getQuote(symbol)),
      )
      .subscribe((tick) => this.quote.set(tick));
  }

  submit(): void {
    const instrument = this.selectedInstrument();
    if (!instrument) return;

    this.error.set(null);
    this.placedOrder.set(null);
    this.submitting.set(true);

    this.tradeApi
      .placeOrder({
        symbol: instrument.symbol,
        side: this.side(),
        orderType: this.orderType(),
        qty: this.qty,
        price: this.orderType() === 'LIMIT' ? (this.price ?? undefined) : undefined,
        idempotencyKey: crypto.randomUUID(),
      })
      .subscribe({
        next: (order) => {
          this.placedOrder.set(order);
          this.submitting.set(false);
          this.selectedInstrument.set(null);
          this.quoteSub?.unsubscribe();
          this.quote.set(null);
          this.sparkline.set([]);
          this.picker.reset();
        },
        error: () => {
          this.error.set('Order rejected by the API. Check account status and instrument.');
          this.submitting.set(false);
        },
      });
  }
}
