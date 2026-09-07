import { Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TradeApiService } from '../../core/trade-api.service';
import { AlertDirection, Instrument, PriceAlert } from '../../core/models';
import { InstrumentPickerComponent } from '../../shared/instrument-picker.component';

@Component({
  selector: 'app-alerts',
  standalone: true,
  imports: [CommonModule, FormsModule, InstrumentPickerComponent],
  template: `
    <div class="mx-auto max-w-2xl px-6 pb-16 page-enter">
      <h1 class="font-display text-4xl text-foreground">Price alerts</h1>
      <p class="mt-1 text-sm text-muted-foreground">Get notified when a symbol crosses a target price.</p>

      <form
        class="mt-6 space-y-4 rounded-2xl border border-border glass-panel p-6 shadow-ambient"
        (ngSubmit)="createAlert()"
      >
        <div>
          <label class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Symbol</label>
          <app-instrument-picker #picker ariaLabel="Alert symbol" (symbolSelected)="onSymbolSelected($event)" />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Direction</label>
            <div class="flex overflow-hidden rounded-lg border border-border">
              <button type="button" (click)="direction.set('ABOVE')"
                [class.bg-accent]="direction() === 'ABOVE'" [class.text-accent-foreground]="direction() === 'ABOVE'"
                class="flex-1 py-2.5 text-sm font-semibold text-muted-foreground transition-colors duration-300 ease-fluid">
                Above
              </button>
              <button type="button" (click)="direction.set('BELOW')"
                [class.bg-accent]="direction() === 'BELOW'" [class.text-accent-foreground]="direction() === 'BELOW'"
                class="flex-1 py-2.5 text-sm font-semibold text-muted-foreground transition-colors duration-300 ease-fluid">
                Below
              </button>
            </div>
          </div>
          <div>
            <label class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Target price</label>
            <input
              type="number" min="0.0001" step="0.01" [(ngModel)]="targetPrice" name="targetPrice"
              class="w-full rounded-lg border border-border bg-transparent px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent"
            />
          </div>
        </div>

        <button
          type="submit"
          [disabled]="!selectedInstrument() || !targetPrice"
          class="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground shadow-glow transition-transform duration-300 ease-fluid hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Create alert
        </button>
      </form>

      <div class="mt-6 space-y-2">
        @for (alert of alerts(); track alert.id) {
          <div
            class="flex items-center justify-between rounded-lg border border-border px-4 py-3"
            [class.border-accent]="!!alert.triggeredAt"
          >
            <div>
              <p class="font-mono text-sm text-foreground">
                {{ alert.symbol }}
                <span class="text-muted-foreground">{{ alert.direction === 'ABOVE' ? '≥' : '≤' }}</span>
                {{ alert.targetPrice | number: '1.2-2' }}
              </p>
              <p class="mt-0.5 text-xs" [class.text-accent]="!!alert.triggeredAt" [class.text-muted-foreground]="!alert.triggeredAt">
                {{ alert.triggeredAt ? 'Triggered ' + (alert.triggeredAt | date: 'medium') : 'Watching…' }}
              </p>
            </div>
            <button (click)="remove(alert.id)" class="text-xs font-medium text-destructive hover:underline">
              Delete
            </button>
          </div>
        } @empty {
          <p class="text-sm text-muted-foreground">No alerts yet.</p>
        }
      </div>
    </div>
  `,
})
export class AlertsComponent implements OnInit {
  private readonly tradeApi = inject(TradeApiService);

  @ViewChild('picker') picker!: InstrumentPickerComponent;

  readonly alerts = signal<PriceAlert[]>([]);
  readonly selectedInstrument = signal<Instrument | null>(null);
  readonly direction = signal<AlertDirection>('ABOVE');

  targetPrice: number | null = null;

  ngOnInit(): void {
    this.refresh();
    this.tradeApi.markAlertsSeen().subscribe();
  }

  refresh(): void {
    this.tradeApi.getAlerts().subscribe((alerts) => this.alerts.set(alerts));
  }

  onSymbolSelected(instrument: Instrument): void {
    this.selectedInstrument.set(instrument);
  }

  createAlert(): void {
    const instrument = this.selectedInstrument();
    if (!instrument || !this.targetPrice) return;

    this.tradeApi.createAlert(instrument.symbol, this.targetPrice, this.direction()).subscribe(() => {
      this.selectedInstrument.set(null);
      this.targetPrice = null;
      this.picker.reset();
      this.refresh();
    });
  }

  remove(id: number): void {
    this.tradeApi.deleteAlert(id).subscribe(() => this.refresh());
  }
}
