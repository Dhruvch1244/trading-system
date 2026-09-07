import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TradeApiService } from '../../core/trade-api.service';
import { Execution, Order } from '../../core/models';

@Component({
  selector: 'app-blotter',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="mx-auto max-w-5xl px-6 pb-16">
      <div class="flex items-center justify-between">
        <h1 class="font-display text-4xl text-foreground">Blotter</h1>
        <button
          (click)="refresh()"
          class="rounded-full border border-border px-4 py-1.5 text-sm font-medium text-muted-foreground transition-colors duration-300 ease-fluid hover:border-accent hover:text-accent"
        >
          Refresh
        </button>
      </div>

      <div class="mt-6 overflow-hidden rounded-2xl border border-border">
        <table class="w-full text-left text-sm">
          <thead class="bg-muted text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th class="px-4 py-3 font-medium">Time</th>
              <th class="px-4 py-3 font-medium">Symbol</th>
              <th class="px-4 py-3 font-medium">Side</th>
              <th class="px-4 py-3 font-medium">Type</th>
              <th class="px-4 py-3 font-medium">Qty</th>
              <th class="px-4 py-3 font-medium">Price</th>
              <th class="px-4 py-3 font-medium">Status</th>
              <th class="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            @for (order of orders(); track order.id) {
              <tr class="border-t border-border">
                <td class="px-4 py-3 font-mono text-xs text-muted-foreground">{{ order.createdOn | date: 'short' }}</td>
                <td class="px-4 py-3 font-mono text-foreground">{{ order.symbol }}</td>
                <td class="px-4 py-3">
                  <span [class.text-accent]="order.side === 'BUY'" [class.text-destructive]="order.side === 'SELL'" class="font-mono">
                    {{ order.side }}
                  </span>
                </td>
                <td class="px-4 py-3 font-mono text-muted-foreground">{{ order.orderType }}</td>
                <td class="px-4 py-3 font-mono text-foreground">{{ order.qty }}</td>
                <td class="px-4 py-3 font-mono text-muted-foreground">{{ order.price ?? '—' }}</td>
                <td class="px-4 py-3">
                  <span class="rounded-full px-2.5 py-1 text-xs font-semibold" [ngClass]="statusClass(order.status)">
                    {{ order.status }}
                  </span>
                </td>
                <td class="px-4 py-3">
                  <div class="flex items-center justify-end gap-3">
                    @if (order.status === 'PENDING') {
                      <button (click)="cancel(order)" class="text-xs font-medium text-destructive hover:underline">
                        Cancel
                      </button>
                    }
                    <button (click)="toggleDetail(order)" class="text-xs font-medium text-accent hover:underline">
                      {{ expandedOrderId() === order.id ? 'Hide' : 'Details' }}
                    </button>
                  </div>
                </td>
              </tr>
              @if (cancelError() && cancelErrorOrderId() === order.id) {
                <tr class="border-t border-border">
                  <td colspan="8" class="px-4 py-2 text-xs text-destructive">{{ cancelError() }}</td>
                </tr>
              }
              @if (expandedOrderId() === order.id) {
                <tr class="border-t border-border bg-muted/40">
                  <td colspan="8" class="px-4 py-3">
                    @if (executions().length) {
                      <div class="space-y-1 font-mono text-xs text-muted-foreground">
                        @for (execution of executions(); track execution.id) {
                          <div>
                            fill {{ execution.quantity }} &#64; {{ execution.price }} — {{ execution.executedAt | date: 'medium' }}
                          </div>
                        }
                      </div>
                    } @else {
                      <p class="text-xs text-muted-foreground">No executions for this order.</p>
                    }
                  </td>
                </tr>
              }
            } @empty {
              <tr>
                <td colspan="8" class="px-4 py-8 text-center text-muted-foreground">No orders yet.</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class BlotterComponent implements OnInit {
  private readonly tradeApi = inject(TradeApiService);

  readonly orders = signal<Order[]>([]);
  readonly expandedOrderId = signal<string | null>(null);
  readonly executions = signal<Execution[]>([]);
  readonly cancelError = signal<string | null>(null);
  readonly cancelErrorOrderId = signal<string | null>(null);

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.tradeApi.getOrderHistory().subscribe((orders) => this.orders.set(orders));
  }

  cancel(order: Order): void {
    this.cancelError.set(null);
    this.tradeApi.cancelOrder(order.id).subscribe({
      next: () => this.refresh(),
      error: (err) => {
        this.cancelErrorOrderId.set(order.id);
        this.cancelError.set(
          err?.status === 409 ? 'Already resolved before the cancel reached it.' : 'Could not cancel this order.',
        );
        // The order's true state changed underneath us either way - re-sync with the server.
        this.refresh();
      },
    });
  }

  toggleDetail(order: Order): void {
    if (this.expandedOrderId() === order.id) {
      this.expandedOrderId.set(null);
      return;
    }
    this.expandedOrderId.set(order.id);
    this.tradeApi.getOrderDetail(order.id).subscribe((detail) => this.executions.set(detail.executions));
  }

  statusClass(status: string): string {
    switch (status) {
      case 'FILLED':
        return 'bg-accent/15 text-accent';
      case 'REJECTED':
        return 'bg-destructive/15 text-destructive';
      case 'PENDING':
        return 'bg-muted text-muted-foreground';
      case 'CANCELLED':
        return 'bg-muted text-muted-foreground line-through';
      default:
        return 'bg-muted text-muted-foreground';
    }
  }
}
