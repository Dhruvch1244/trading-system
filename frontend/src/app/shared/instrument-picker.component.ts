import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { TradeApiService } from '../core/trade-api.service';
import { Instrument } from '../core/models';

/**
 * Searchable typeahead over the ~250-instrument universe - a plain <select> doesn't scale past
 * a couple dozen options, and the backend only ever returns a page at a time (see
 * TradeApiService.searchInstruments), so this always searches rather than trying to load "all".
 *
 * Implements the ARIA combobox pattern by hand (arrow keys, Enter, Escape, aria-activedescendant)
 * since this app has no component library supplying it for free - a mouse-only dropdown here
 * would be a real keyboard-trap, not just a style nit.
 */
@Component({
  selector: 'app-instrument-picker',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="relative">
      <input
        type="text"
        role="combobox"
        [attr.aria-label]="ariaLabel"
        aria-autocomplete="list"
        [attr.aria-expanded]="open()"
        aria-controls="instrument-picker-listbox"
        [attr.aria-activedescendant]="activeIndex() >= 0 ? 'instrument-option-' + activeIndex() : null"
        [(ngModel)]="query"
        (ngModelChange)="onQueryChange($event)"
        (focus)="open.set(true)"
        (blur)="onBlur()"
        (keydown)="onKeydown($event)"
        [placeholder]="selected() ? selected()!.symbol + ' — ' + selected()!.name : 'Search symbol or company name…'"
        class="w-full rounded-lg border border-border bg-transparent px-3 py-2.5 text-sm text-foreground outline-none transition-colors duration-300 ease-fluid placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-[var(--ring)]"
      />

      @if (open() && results().length > 0) {
        <ul
          id="instrument-picker-listbox"
          role="listbox"
          class="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-border glass-panel shadow-ambient"
        >
          @for (instrument of results(); track instrument.symbol; let i = $index) {
            <li [id]="'instrument-option-' + i" role="option" [attr.aria-selected]="i === activeIndex()">
              <button
                type="button"
                tabindex="-1"
                (mousedown)="select(instrument)"
                (mouseenter)="activeIndex.set(i)"
                class="flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors duration-150"
                [class.bg-muted]="i === activeIndex()"
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
  @Input() ariaLabel = 'Search symbol or company name';
  @Output() symbolSelected = new EventEmitter<Instrument>();

  private readonly tradeApi = inject(TradeApiService);
  private readonly queryChanges = new Subject<string>();

  query = '';
  readonly results = signal<Instrument[]>([]);
  readonly selected = signal<Instrument | null>(null);
  readonly open = signal(false);
  readonly activeIndex = signal(-1);

  ngOnInit(): void {
    this.queryChanges
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap((search) => this.tradeApi.searchInstruments(search, 20)),
      )
      .subscribe((instruments) => {
        this.results.set(instruments);
        this.activeIndex.set(instruments.length > 0 ? 0 : -1);
      });
  }

  ngOnDestroy(): void {
    this.queryChanges.complete();
  }

  onQueryChange(value: string): void {
    this.selected.set(null);
    this.queryChanges.next(value);
  }

  onKeydown(event: KeyboardEvent): void {
    const results = this.results();
    if (!this.open() || results.length === 0) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.activeIndex.set((this.activeIndex() + 1) % results.length);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.activeIndex.set((this.activeIndex() - 1 + results.length) % results.length);
        break;
      case 'Enter':
        event.preventDefault();
        if (this.activeIndex() >= 0) this.select(results[this.activeIndex()]);
        break;
      case 'Escape':
        this.open.set(false);
        break;
    }
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
