import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/** A minimal inline SVG polyline sparkline - not worth a charting library for a single trend line. */
@Component({
  selector: 'app-sparkline',
  standalone: true,
  imports: [CommonModule],
  template: `
    <svg [attr.viewBox]="'0 0 100 30'" preserveAspectRatio="none" class="h-8 w-20">
      @if (points().length > 1) {
        <polyline [attr.points]="pathPoints()" fill="none" [attr.stroke]="strokeColor()" stroke-width="2" />
      }
    </svg>
  `,
})
export class SparklineComponent {
  @Input() values: number[] = [];

  points(): number[] {
    return this.values;
  }

  strokeColor(): string {
    if (this.values.length < 2) return 'var(--muted-foreground)';
    return this.values.at(-1)! >= this.values[0] ? 'var(--accent)' : 'var(--destructive)';
  }

  pathPoints(): string {
    const values = this.values;
    if (values.length < 2) return '';

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    return values
      .map((v, i) => {
        const x = (i / (values.length - 1)) * 100;
        const y = 30 - ((v - min) / range) * 28 - 1;
        return `${x},${y}`;
      })
      .join(' ');
  }
}
