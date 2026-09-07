import { Component, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TradeApiService } from '../../core/trade-api.service';
import { Instrument, Order, OrderSide, OrderType } from '../../core/models';
import { InstrumentPickerComponent } from '../../shared/instrument-picker.component';

@Component({
  selector: 'app-order-ticket',
  standalone: true,
  imports: [CommonModule, FormsModule, InstrumentPickerComponent],
  template: `
    <div class="mx-auto max-w-lg px-6 pb-16">
      <h1 class="font-display text-4xl text-foreground">Order ticket</h1>

      <form class="mt-8 space-y-5 rounded-2xl border border-border glass-panel p-8 shadow-ambient" (ngSubmit)="submit()">
        <div>
          <label class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Symbol</label>
          <app-instrument-picker #picker (symbolSelected)="onSymbolSelected($event)" />
        </div>

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
          class="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground shadow-glow transition-transform duration-300 ease-fluid hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {{ submitting() ? 'Submitting…' : 'Place order' }}
        </button>
      </form>
    </div>
  `,
})
export class OrderTicketComponent {
  private readonly tradeApi = inject(TradeApiService);

  @ViewChild('picker') picker!: InstrumentPickerComponent;

  readonly selectedInstrument = signal<Instrument | null>(null);
  readonly side = signal<OrderSide>('BUY');
  readonly orderType = signal<OrderType>('MARKET');
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);
  readonly placedOrder = signal<Order | null>(null);

  qty = 1;
  price: number | null = null;

  onSymbolSelected(instrument: Instrument): void {
    this.selectedInstrument.set(instrument);
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
          this.picker.reset();
        },
        error: () => {
          this.error.set('Order rejected by the API. Check account status and instrument.');
          this.submitting.set(false);
        },
      });
  }
}
