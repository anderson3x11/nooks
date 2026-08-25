import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { Subject, debounceTime, distinctUntilChanged, filter, switchMap, catchError, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GeocodeResult } from '../../core/models';
import { PlacesApi } from '../../core/places-api';

/** Recherche de ville. Le géocodage passe par notre API, jamais par Nominatim en direct. */
@Component({
  selector: 'nooks-city-search',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative w-80">
      <div class="plate grain flex items-center gap-2 px-3 py-2">
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true" class="shrink-0">
          <circle cx="7" cy="7" r="4.6" stroke="#4a413a" stroke-width="1.5" />
          <path d="m10.6 10.6 3.2 3.2" stroke="#4a413a" stroke-width="1.5" stroke-linecap="round" />
        </svg>
        <input
          type="search"
          class="w-full bg-transparent text-[14px] text-ink-900 placeholder:text-paper-400 focus:outline-none"
          placeholder="Chercher une ville…"
          autocomplete="off"
          [value]="query()"
          (input)="onInput($event)"
          (keydown.escape)="close()"
        />
        @if (loading()) {
          <span class="size-3 shrink-0 animate-spin rounded-full border-2 border-paper-300 border-t-signal-500"></span>
        }
      </div>

      @if (results().length > 0) {
        <ul class="plate grain animate-rise absolute z-20 mt-1 w-full overflow-hidden py-1">
          @for (result of results(); track result.displayName) {
            <li>
              <button
                type="button"
                class="w-full cursor-pointer px-3 py-2 text-left text-[13px] leading-snug text-ink-700 transition-colors hover:bg-paper-200"
                (click)="choose(result)"
              >
                <span class="font-semibold text-ink-900">{{ shortName(result.displayName) }}</span>
                <span class="block truncate text-[11px] text-ink-400">{{ result.displayName }}</span>
              </button>
            </li>
          }
        </ul>
      }
    </div>
  `,
})
export class CitySearch {
  private readonly api = inject(PlacesApi);
  private readonly typed = new Subject<string>();

  readonly citySelected = output<GeocodeResult>();

  protected readonly query = signal('');
  protected readonly results = signal<GeocodeResult[]>([]);
  protected readonly loading = signal(false);

  constructor() {
    this.typed
      .pipe(
        debounceTime(350),
        distinctUntilChanged(),
        filter((value) => value.trim().length >= 2),
        switchMap((value) => {
          this.loading.set(true);
          return this.api.geocode(value).pipe(catchError(() => of([] as GeocodeResult[])));
        }),
        takeUntilDestroyed(),
      )
      .subscribe((results) => {
        this.loading.set(false);
        this.results.set(results);
      });
  }

  protected onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.query.set(value);

    if (value.trim().length < 2) {
      this.results.set([]);
    }
    this.typed.next(value);
  }

  protected choose(result: GeocodeResult): void {
    this.query.set(this.shortName(result.displayName));
    this.results.set([]);
    this.citySelected.emit(result);
  }

  protected close(): void {
    this.results.set([]);
  }

  /** Nominatim renvoie une adresse complète : on n'en garde que la tête pour le champ. */
  protected shortName(displayName: string): string {
    return displayName.split(',')[0].trim();
  }
}
