import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Mover } from '../core/models';

/**
 * A scrolling marquee of active symbols - pure CSS animation (transform only, no layout
 * properties), duplicated content so the loop is seamless, paused entirely under
 * prefers-reduced-motion via the global rule in styles.css.
 */
@Component({
  selector: 'app-ticker-tape',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative overflow-hidden border-y border-border bg-muted/40 py-2.5">
      <div class="ticker-track flex w-max gap-8">
        @for (item of doubledItems(); track $index) {
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
  styles: [
    `
      .ticker-track {
        animation: ticker-scroll 40s linear infinite;
      }
      @keyframes ticker-scroll {
        from {
          transform: translateX(0);
        }
        to {
          transform: translateX(-50%);
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .ticker-track {
          animation: none;
        }
      }
    `,
  ],
})
export class TickerTapeComponent {
  @Input() items: Mover[] = [];

  // Duplicate the list so translateX(-50%) loops seamlessly with no visible seam/reset.
  doubledItems(): Mover[] {
    return [...this.items, ...this.items];
  }
}
