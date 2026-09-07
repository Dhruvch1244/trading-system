import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

/**
 * Hand-rolled conic-gradient donut - a real charting library is warranted for the candlestick
 * chart (zoom, crosshair, time-scale are a whole subsystem), but a single static donut is
 * exactly the "small, well-understood problem" pillar #7 says to just write, not depend on.
 */
@Component({
  selector: 'app-donut-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex items-center gap-6">
      <div
        class="h-36 w-36 shrink-0 rounded-full"
        [style.background]="gradient()"
      >
        <div class="flex h-full w-full items-center justify-center">
          <div class="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-background text-center">
            <span class="font-mono text-xs text-muted-foreground">Total</span>
            <span class="font-mono text-sm text-foreground">{{ total() | number: '1.0-0' }}</span>
          </div>
        </div>
      </div>

      <ul class="space-y-1.5">
        @for (segment of segments; track segment.label) {
          <li class="flex items-center gap-2 text-sm">
            <span class="h-2.5 w-2.5 rounded-full" [style.background]="segment.color"></span>
            <span class="font-mono text-foreground">{{ segment.label }}</span>
            <span class="text-xs text-muted-foreground">{{ percent(segment.value) | number: '1.0-1' }}%</span>
          </li>
        }
      </ul>
    </div>
  `,
})
export class DonutChartComponent {
  @Input() segments: DonutSegment[] = [];

  total(): number {
    return this.segments.reduce((sum, s) => sum + s.value, 0);
  }

  percent(value: number): number {
    const total = this.total();
    return total > 0 ? (value / total) * 100 : 0;
  }

  gradient(): string {
    const total = this.total();
    if (total === 0) return 'conic-gradient(var(--muted) 0deg 360deg)';

    let cumulative = 0;
    const stops: string[] = [];
    for (const segment of this.segments) {
      const start = (cumulative / total) * 360;
      cumulative += segment.value;
      const end = (cumulative / total) * 360;
      stops.push(`${segment.color} ${start}deg ${end}deg`);
    }
    return `conic-gradient(${stops.join(', ')})`;
  }
}
