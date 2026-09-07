import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Mover } from '../core/models';

/** A static strip of active symbols - no motion, horizontally scrollable if it overflows. */
@Component({
  selector: 'app-ticker-tape',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="overflow-x-auto border-y border-border bg-muted/40 py-2.5">
      <div class="flex w-max gap-8 px-4">
        @for (item of items; track item.symbol) {
          <span class="flex items-center gap-1.5 whitespace-nowrap font-mono text-sm">
            <span class="text-foreground">{{ item.symbol }}</span>
            <span class="text-muted-foreground">{{ item.price | number: '1.2-2' }}</span>
            <span [class.text-accent]="item.changePercent >= 0" [class.text-destructive]="item.changePercent < 0">
              {{ item.changePercent >= 0 ? '▲' : '▼' }} {{ item.changePercent | number: '1.2-2' }}%
            </span>
          </span>
        }
      </div>
    </div>
  `,
})
export class TickerTapeComponent {
  @Input() items: Mover[] = [];
}
