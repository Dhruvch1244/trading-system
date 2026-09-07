import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TradeApiService } from '../../core/trade-api.service';
import { BalanceHistoryEntry } from '../../core/models';

@Component({
  selector: 'app-balance-history',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="mx-auto max-w-3xl px-6 pb-16">
      <h1 class="font-display text-4xl text-foreground">Balance history</h1>
      <p class="mt-1 text-sm text-muted-foreground">Every cash movement against your account.</p>

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

  ngOnInit(): void {
    this.tradeApi.getBalanceHistory().subscribe((entries) => this.entries.set(entries));
  }
}
