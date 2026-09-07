import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TradeApiService } from '../../core/trade-api.service';
import { BalanceHistoryEntry } from '../../core/models';

@Component({
  selector: 'app-balance-history',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="mx-auto max-w-3xl px-6 pb-16">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="font-display text-4xl text-foreground">Balance history</h1>
          <p class="mt-1 text-sm text-muted-foreground">Every cash movement against your account.</p>
        </div>
      </div>

      <form
        class="mt-6 flex items-end gap-3 rounded-2xl border border-border glass-panel p-6 shadow-ambient"
        (ngSubmit)="deposit()"
      >
        <div class="flex-1">
          <label class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Add funds</label>
          <input
            type="number" name="amount" min="0.01" step="0.01" required
            [(ngModel)]="amount"
            placeholder="1000.00"
            class="w-full rounded-lg border border-border bg-transparent px-3 py-2.5 text-sm text-foreground outline-none transition-colors duration-300 ease-fluid placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-[var(--ring)]"
          />
        </div>
        <button
          type="submit"
          [disabled]="depositing() || !amount"
          class="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground shadow-glow transition-transform duration-300 ease-fluid hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {{ depositing() ? 'Adding…' : 'Deposit' }}
        </button>
      </form>
      @if (depositError()) {
        <p class="mt-2 text-sm text-destructive">{{ depositError() }}</p>
      }

      <div class="mt-6 overflow-hidden rounded-2xl border border-border">
        <table class="w-full text-left text-sm">
          <thead class="bg-muted text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th class="px-4 py-3 font-medium">Date</th>
              <th class="px-4 py-3 font-medium">Type</th>
              <th class="px-4 py-3 font-medium">Amount</th>
              <th class="px-4 py-3 font-medium">Related order</th>
            </tr>
          </thead>
          <tbody>
            @for (entry of entries(); track entry.id) {
              <tr class="border-t border-border">
                <td class="px-4 py-3 font-mono text-xs text-muted-foreground">{{ entry.createdOn | date: 'short' }}</td>
                <td class="px-4 py-3 text-foreground">{{ entry.type }}</td>
                <td class="px-4 py-3 font-mono" [class.text-accent]="entry.amount >= 0" [class.text-destructive]="entry.amount < 0">
                  {{ entry.amount >= 0 ? '+' : '' }}{{ entry.amount | number: '1.2-2' }}
                </td>
                <td class="px-4 py-3 font-mono text-xs text-muted-foreground">
                  {{ entry.relatedOrderId ? (entry.relatedOrderId | slice: 0 : 8) + '…' : '—' }}
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="4" class="px-4 py-8 text-center text-muted-foreground">No balance activity yet.</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class BalanceHistoryComponent implements OnInit {
  private readonly tradeApi = inject(TradeApiService);

  readonly entries = signal<BalanceHistoryEntry[]>([]);
  readonly depositing = signal(false);
  readonly depositError = signal<string | null>(null);

  amount: number | null = null;

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.tradeApi.getBalanceHistory().subscribe((entries) => this.entries.set(entries));
  }

  deposit(): void {
    if (!this.amount) return;
    this.depositError.set(null);
    this.depositing.set(true);

    this.tradeApi.deposit(this.amount).subscribe({
      next: () => {
        this.amount = null;
        this.depositing.set(false);
        this.refresh();
      },
      error: () => {
        this.depositError.set('Could not add funds. Check your account status.');
        this.depositing.set(false);
      },
    });
  }
}
