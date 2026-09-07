import { Component, OnDestroy, OnInit, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription, interval, startWith } from 'rxjs';
import { TradeApiService } from '../../core/trade-api.service';
import { Instrument, MarketDataTick, WatchlistEntry } from '../../core/models';
import { InstrumentPickerComponent } from '../../shared/instrument-picker.component';
import { SparklineComponent } from '../../shared/sparkline.component';

const REFRESH_MS = 5000;

@Component({
  selector: 'app-watchlist',
  standalone: true,
  imports: [CommonModule, RouterLink, InstrumentPickerComponent, SparklineComponent],
  template: `
    <div class="mx-auto max-w-4xl px-6 pb-16 page-enter">
      <h1 class="font-display text-4xl text-foreground">Watchlist</h1>
      <p class="mt-1 text-sm text-muted-foreground">Track symbols across the {{ universeHint }} instrument universe.</p>

      <div class="mt-6 max-w-md">
        <app-instrument-picker #picker ariaLabel="Add symbol to watchlist" (symbolSelected)="add($event)" />
      </div>

      <div class="mt-6 overflow-x-auto rounded-2xl border border-border">
        <table class="w-full min-w-[600px] text-left text-sm">
          <thead class="bg-muted text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th class="px-4 py-3 font-medium">Symbol</th>
              <th class="px-4 py-3 text-right font-medium">Last price</th>
              <th class="px-4 py-3 font-medium">30-day trend</th>
              <th class="px-4 py-3 font-medium">Added</th>
              <th class="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            @for (entry of entries(); track entry.symbol) {
              <tr class="border-t border-border">
                <td class="px-4 py-3 font-mono text-foreground">
                  <a [routerLink]="['/instruments', entry.symbol]" class="hover:text-accent hover:underline">{{ entry.symbol }}</a>
                </td>
                <td class="px-4 py-3 text-right font-mono text-accent">{{ quotes()[entry.symbol]?.price ?? '—' }}</td>
                <td class="px-4 py-3">
                  @if (sparklines()[entry.symbol]; as values) {
                    <app-sparkline [values]="values" />
                  }
                </td>
                <td class="px-4 py-3 font-mono text-xs text-muted-foreground">{{ entry.addedOn | date: 'short' }}</td>
                <td class="px-4 py-3 text-right">
                  <button (click)="remove(entry.symbol)" class="text-xs font-medium text-destructive hover:underline">
                    Remove
                  </button>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="5" class="px-4 py-10 text-center text-muted-foreground">
                  <span class="text-2xl" aria-hidden="true">☆</span>
                  <p class="mt-2 text-sm">Search above to add your first symbol.</p>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class WatchlistComponent implements OnInit, OnDestroy {
  private readonly tradeApi = inject(TradeApiService);
  private pollSub?: Subscription;
  private sparklineLoaded = new Set<string>();

  @ViewChild('picker') picker!: InstrumentPickerComponent;

  readonly entries = signal<WatchlistEntry[]>([]);
  readonly quotes = signal<Record<string, MarketDataTick>>({});
  readonly sparklines = signal<Record<string, number[]>>({});
  readonly universeHint = '250+';

  ngOnInit(): void {
    this.pollSub = interval(REFRESH_MS)
      .pipe(startWith(0))
      .subscribe(() => this.refresh());
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
  }

  refresh(): void {
    this.tradeApi.getWatchlist().subscribe((entries) => {
      this.entries.set(entries);
      for (const entry of entries) {
        this.tradeApi.getQuote(entry.symbol).subscribe((tick) => {
          if (!tick) return;
          this.quotes.update((current) => ({ ...current, [entry.symbol]: tick }));
        });

        // Candles are daily data - fetch once per symbol, not on every 5s poll tick.
        if (!this.sparklineLoaded.has(entry.symbol)) {
          this.sparklineLoaded.add(entry.symbol);
          this.tradeApi.getCandles(entry.symbol).subscribe((candles) => {
            this.sparklines.update((current) => ({ ...current, [entry.symbol]: candles.map((c) => c.close) }));
          });
        }
      }
    });
  }

  add(instrument: Instrument): void {
    this.tradeApi.addToWatchlist(instrument.symbol).subscribe(() => {
      this.picker.reset();
      this.refresh();
    });
  }

  remove(symbol: string): void {
    this.tradeApi.removeFromWatchlist(symbol).subscribe(() => this.refresh());
  }
}
