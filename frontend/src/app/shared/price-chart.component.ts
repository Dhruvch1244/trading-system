import { AfterViewInit, Component, ElementRef, Input, OnChanges, OnDestroy, SimpleChanges, ViewChild } from '@angular/core';
import { ColorType, IChartApi, ISeriesApi, createChart } from 'lightweight-charts';
import { Candle } from '../core/models';

/**
 * Thin wrapper around TradingView's lightweight-charts - candlestick rendering with axes,
 * crosshair, and zoom is a whole subsystem with its own edge cases (scaling, hit-testing,
 * responsive resize); reaching for the well-established library here instead of hand-rolling
 * an SVG chart is the same call as Kafdrop for the Kafka UI.
 */
@Component({
  selector: 'app-price-chart',
  standalone: true,
  template: `<div #container class="h-full w-full"></div>`,
  // Custom elements default to display:inline with zero height - without this, the container
  // div's h-full resolves against a zero-height parent and the chart is created at 0x0 (it
  // still "works": TradingView's absolutely-positioned attribution logo renders, but the
  // canvas itself has no area, which is why the chart looked like an empty black box.
  styles: [':host { display: block; height: 100%; width: 100%; }'],
})
export class PriceChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() candles: Candle[] = [];

  @ViewChild('container') containerRef!: ElementRef<HTMLDivElement>;

  private chart: IChartApi | null = null;
  private series: ISeriesApi<'Candlestick'> | null = null;
  private resizeObserver: ResizeObserver | null = null;

  ngAfterViewInit(): void {
    const container = this.containerRef.nativeElement;

    this.chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#a8afc0',
        fontFamily: 'JetBrains Mono, ui-monospace, monospace',
      },
      grid: {
        vertLines: { color: '#1d2130' },
        horzLines: { color: '#1d2130' },
      },
      rightPriceScale: { borderColor: '#1d2130' },
      timeScale: { borderColor: '#1d2130' },
      crosshair: { mode: 0 },
      width: container.clientWidth,
      height: container.clientHeight,
    });

    this.series = this.chart.addCandlestickSeries({
      upColor: '#9a6bff',
      downColor: '#ff5470',
      borderVisible: false,
      wickUpColor: '#9a6bff',
      wickDownColor: '#ff5470',
    });

    this.applyCandles();

    this.resizeObserver = new ResizeObserver(() => {
      this.chart?.applyOptions({ width: container.clientWidth, height: container.clientHeight });
    });
    this.resizeObserver.observe(container);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['candles'] && this.series) {
      this.applyCandles();
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.chart?.remove();
  }

  private applyCandles(): void {
    if (!this.series) return;
    this.series.setData(
      this.candles.map((c) => ({
        time: c.date,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      })),
    );
    this.chart?.timeScale().fitContent();
  }
}
