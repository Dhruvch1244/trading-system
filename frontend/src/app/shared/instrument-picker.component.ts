import { Component, EventEmitter, OnDestroy, OnInit, Output, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { TradeApiService } from '../core/trade-api.service';
import { Instrument } from '../core/models';

/**
 * Searchable typeahead over the ~250-instrument universe - a plain <select> doesn't scale past
 * a couple dozen options, and the backend only ever returns a page at a time (see
 * TradeApiService.searchInstruments), so this always searches rather than trying to load "all".
 */
@Component({
  selector: 'app-instrument-picker',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="relative">
      <input
        type="text"
        [(ngModel)]="query"
        (ngModelChange)="onQueryChange($event)"
        (focus)="open.set(true)"
        (blur)="onBlur()"
        [placeholder]="selected() ? selected()!.symbol + ' — ' + selected()!.name : 'Search symbol or company name…'"
        class="w-full rounded-lg border border-border bg-transparent px-3 py-2.5 text-sm text-foreground outline-none transition-colors duration-300 ease-fluid placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-[var(--ring)]"
      />

      @if (open() && results().length > 0) {
        <ul
          class="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-border glass-panel shadow-ambient"
        >
          @for (instrument of results(); track instrument.symbol) {
            <li>
              <button
                type="button"
                (mousedown)="select(instrument)"
                class="flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors duration-150 hover:bg-muted"
              >
                <span class="font-mono text-foreground">{{ instrument.symbol }}</span>
                <span class="ml-3 truncate text-xs text-muted-foreground">{{ instrument.name }}</span>
              </button>
            </li>
          }
        </ul>
      }
    </div>
  `,
})
export class InstrumentPickerComponent implements OnInit, OnDestroy {
  @Output() symbolSelected = new EventEmitter<Instrument>();

  private readonly tradeApi = inject(TradeApiService);
  private readonly queryChanges = new Subject<string>();

  query = '';
  readonly results = signal<Instrument[]>([]);
  readonly selected = signal<Instrument | null>(null);
  readonly open = signal(false);

  ngOnInit(): void {
    this.queryChanges
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap((search) => this.tradeApi.searchInstruments(search, 20)),
      )
      .subscribe((instruments) => this.results.set(instruments));
  }

  ngOnDestroy(): void {
    this.queryChanges.complete();
  }

  onQueryChange(value: string): void {
    this.selected.set(null);
    this.queryChanges.next(value);
  }

  onBlur(): void {
    // Delay closing so the (mousedown) on a result fires before the list unmounts.
    setTimeout(() => this.open.set(false), 150);
  }

  select(instrument: Instrument): void {
    this.selected.set(instrument);
    this.query = '';
    this.open.set(false);
    this.symbolSelected.emit(instrument);
  }

  reset(): void {
    this.selected.set(null);
    this.query = '';
    this.results.set([]);
  }
}
