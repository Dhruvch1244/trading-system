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
    <div class="flex flex-wrap items-center justify-center gap-8">
      <div
        class="relative h-44 w-44 shrink-0 rounded-full shadow-ambient"
        [style.background]="gradient()"
      >
        <div class="absolute inset-3 flex flex-col items-center justify-center rounded-full bg-background text-center">
          <span class="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Total value</span>
          <span class="mt-0.5 font-mono text-lg text-foreground">{{ total() | number: '1.0-0' }}</span>
        </div>
      </div>

      <ul class="min-w-[160px] space-y-2.5">
        @for (segment of segments; track segment.label) {
          <li class="flex items-center gap-2.5 text-sm">
            <span class="h-3 w-3 shrink-0 rounded-full" [style.background]="segment.color"></span>
            <span class="font-mono text-foreground">{{ segment.label }}</span>
            <span class="ml-auto font-mono text-xs text-muted-foreground">{{ segment.value | number: '1.0-0' }}</span>
            <span class="w-12 text-right font-mono text-xs text-accent">{{ percent(segment.value) | number: '1.0-1' }}%</span>
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
