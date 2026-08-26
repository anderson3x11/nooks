import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, debounceTime, distinctUntilChanged, filter, of, switchMap } from 'rxjs';
import { GeocodeResult } from '../../core/models';
import { PlacesApi } from '../../core/places-api';

/** Recherche de ville. Le géocodage passe par notre API, jamais par Nominatim en direct. */
@Component({
  selector: 'nooks-city-search',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative w-full">
      <div class="card flex h-12 items-center gap-2.5 rounded-full px-4">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" class="shrink-0">
          <circle cx="7" cy="7" r="4.6" stroke="#737373" stroke-width="1.6" />
          <path d="m10.6 10.6 3.2 3.2" stroke="#737373" stroke-width="1.6" stroke-linecap="round" />
        </svg>
        <input
          type="search"
          class="w-full bg-transparent text-[14.5px] text-ink-900 placeholder:text-ink-400 focus:outline-none"
          placeholder="Chercher une ville…"
          autocomplete="off"
          [value]="query()"
          (input)="onInput($event)"
          (keydown.escape)="close()"
        />
        @if (loading()) {
          <span class="size-3.5 shrink-0 animate-spin rounded-full border-2 border-ink-200 border-t-ink-900"></span>
        }
      </div>

      @if (results().length > 0) {
        <ul class="card card-float animate-rise absolute z-20 mt-2 w-full overflow-hidden p-1.5">
          @for (result of results(); track result.displayName) {
            <li>
              <button
                type="button"
                class="w-full cursor-pointer rounded-xl px-3 py-2 text-left transition-colors hover:bg-ink-100"
                (click)="choose(result)"
              >
                <span class="block text-[14px] font-semibold text-ink-900">{{ shortName(result.displayName) }}</span>
                <span class="block truncate text-[12px] text-ink-500">{{ result.displayName }}</span>
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
