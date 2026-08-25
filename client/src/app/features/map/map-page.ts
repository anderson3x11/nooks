import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { Subject, catchError, of, switchMap } from 'rxjs';
import { Auth } from '../../core/auth';
import { BASEMAPS, Basemap, basemapById } from '../../core/basemaps';
import {
  CreatePlaceInput,
  GeocodeResult,
  MapBounds,
  PlaceDetail,
  PlaceFilters,
  PlaceSummary,
  emptyFilters,
} from '../../core/models';
import { PlacesApi } from '../../core/places-api';
import { PlaceDetailPanel } from '../places/place-detail';
import { PlaceForm } from '../places/place-form';
import { CitySearch } from './city-search';
import { FiltersPanel } from './filters-panel';
import { LeafletMap } from './leaflet-map';

type Mode = 'browse' | 'adding';

const BASEMAP_KEY = 'nooks.basemap';

@Component({
  selector: 'nooks-map-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LeafletMap, FiltersPanel, CitySearch, PlaceDetailPanel, PlaceForm, RouterLink],
  template: `
    <div class="relative h-dvh w-full overflow-hidden">
      <nooks-map
        class="absolute inset-0"
        [places]="places()"
        [selectedId]="selectedId()"
        [picking]="mode() === 'adding'"
        [basemap]="basemap()"
        (boundsChanged)="onBoundsChanged($event)"
        (placeSelected)="openPlace($event)"
        (mapClicked)="onMapClicked($event)"
      />

      <!-- Chrome flottant : transparent aux clics sauf sur les panneaux, et au-dessus
           des couches Leaflet, qui montent jusqu'à z-index 800. -->
      <div class="pointer-events-none absolute inset-0 z-[1000] flex flex-col gap-4 p-4">
        <header class="flex items-start gap-3">
          <a routerLink="/" class="card pointer-events-auto flex items-center gap-2.5 rounded-full py-2 pr-5 pl-2">
            <span class="flex size-8 items-center justify-center rounded-full bg-ink-950">
              <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
                <path
                  d="M8 1.6c-2.7 0-4.9 2.2-4.9 4.9 0 3.6 4.9 8.1 4.9 8.1s4.9-4.5 4.9-8.1c0-2.7-2.2-4.9-4.9-4.9Z"
                  fill="#fff"
                />
                <circle cx="8" cy="6.3" r="1.9" fill="#0a0a0a" />
              </svg>
            </span>
            <span class="text-[17px] leading-none font-extrabold tracking-tight">Nooks</span>
          </a>

          <div class="pointer-events-auto">
            <nooks-city-search (citySelected)="onCitySelected($event)" />
          </div>

          <div class="flex-1"></div>

          <div class="card pointer-events-auto flex items-center gap-2 rounded-full p-1.5 pl-4">
            @if (auth.user(); as user) {
              <span class="text-[14px] text-ink-700">{{ user.displayName }}</span>
              @if (auth.isAdmin()) {
                <a routerLink="/moderation" class="btn btn-quiet py-1.5 text-[13px]">Modération</a>
              }
              <button type="button" class="btn btn-quiet py-1.5 text-[13px]" (click)="auth.logout()">Quitter</button>
            } @else {
              <a routerLink="/connexion" class="text-[14px] font-medium text-ink-700 hover:text-ink-950">Connexion</a>
              <a routerLink="/inscription" class="btn btn-primary py-1.5 text-[13px]">Créer un compte</a>
            }
          </div>
        </header>

        <div class="flex min-h-0 flex-1 items-start gap-4">
          <div class="scroll-quiet pointer-events-auto flex max-h-full flex-col gap-3 overflow-y-auto pb-1">
            <nooks-filters [filters]="filters()" [counts]="counts()" (filtersChanged)="onFiltersChanged($event)" />

            @if (mode() === 'browse') {
              <button type="button" class="btn btn-primary card-float w-80" (click)="startAdding()">
                <svg width="14" height="14" viewBox="0 0 12 12" aria-hidden="true">
                  <path d="M6 1v10M1 6h10" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" />
                </svg>
                Proposer un lieu
              </button>
            }
          </div>

          <div class="flex-1"></div>

          <div class="pointer-events-auto flex max-h-full">
            @if (mode() === 'adding') {
              <nooks-place-form
                [position]="draft()"
                [busy]="saving()"
                [error]="error()"
                (submitted)="createPlace($event)"
                (cancelled)="cancelAdding()"
              />
            } @else if (detail()) {
              <nooks-place-detail
                [place]="detail()"
                [busy]="saving()"
                (closed)="closeDetail()"
                (rated)="rate($event)"
                (photoPicked)="uploadPhoto($event)"
              />
            }
          </div>
        </div>

        <footer class="flex items-end gap-3">
          <!-- Sélecteur de fond de carte : replié en pastille, déplié en petite carte. -->
          <div class="pointer-events-auto relative">
            @if (basemapOpen()) {
              <div class="card card-float animate-rise absolute bottom-12 left-0 w-44 p-1.5">
                @for (option of basemaps; track option.id) {
                  <button
                    type="button"
                    class="flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-2 py-1.5 text-left text-[13.5px] transition-colors hover:bg-ink-100"
                    [class.font-semibold]="option.id === basemap().id"
                    (click)="chooseBasemap(option)"
                  >
                    <span
                      class="size-6 shrink-0 rounded-lg border border-ink-200"
                      [style.background]="'linear-gradient(135deg, ' + option.swatch[0] + ', ' + option.swatch[1] + ')'"
                    ></span>
                    {{ option.label }}
                    @if (option.id === basemap().id) {
                      <svg width="12" height="12" viewBox="0 0 12 12" class="ml-auto" aria-hidden="true">
                        <path d="m1.8 6.2 2.7 2.7 5.7-5.7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                      </svg>
                    }
                  </button>
                }
              </div>
            }

            <button
              type="button"
              class="btn-round"
              aria-label="Changer le fond de carte"
              (click)="basemapOpen.set(!basemapOpen())"
            >
              <svg width="17" height="17" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M8 1.8 14.2 5 8 8.2 1.8 5Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" />
                <path d="m2.4 8 5.6 2.9L13.6 8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
          </div>

          <div class="flex flex-1 justify-center">
            @if (banner(); as text) {
              <p class="card card-float animate-rise pointer-events-auto rounded-full bg-ink-950 px-4 py-2 text-[13.5px] font-semibold text-white">
                {{ text }}
              </p>
            } @else if (mode() === 'browse' && !detail()) {
              <p class="card pointer-events-auto rounded-full px-3.5 py-1.5 text-[13px] text-ink-500">
                {{ places().length }} lieu{{ places().length > 1 ? 'x' : '' }} dans cette zone
              </p>
            }
          </div>

          <div class="w-10"></div>
        </footer>
      </div>
    </div>
  `,
})
export class MapPage {
  protected readonly auth = inject(Auth);
  private readonly api = inject(PlacesApi);
  private readonly router = inject(Router);
  private readonly map = viewChild(LeafletMap);

  private readonly reload = new Subject<void>();

  protected readonly places = signal<PlaceSummary[]>([]);
  protected readonly filters = signal<PlaceFilters>(emptyFilters);
  protected readonly selectedId = signal<string | null>(null);
  protected readonly detail = signal<PlaceDetail | null>(null);
  protected readonly mode = signal<Mode>('browse');
  protected readonly draft = signal<{ latitude: number; longitude: number } | null>(null);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly banner = signal<string | null>(null);

  protected readonly basemaps = BASEMAPS;
  protected readonly basemapOpen = signal(false);
  protected readonly basemap = signal<Basemap>(basemapById(localStorage.getItem(BASEMAP_KEY)));

  private bounds: MapBounds | null = null;

  /** Répartition par catégorie des lieux visibles, affichée dans la légende. */
  protected readonly counts = computed(() => {
    const counts: Record<string, number> = {};
    for (const place of this.places()) {
      counts[place.category] = (counts[place.category] ?? 0) + 1;
    }
    return counts;
  });

  constructor() {
    this.reload
      .pipe(
        switchMap(() =>
          this.bounds
            ? this.api.search(this.bounds, this.filters()).pipe(catchError(() => of([] as PlaceSummary[])))
            : of([] as PlaceSummary[]),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((places) => this.places.set(places));
  }

  protected onBoundsChanged(bounds: MapBounds): void {
    this.bounds = bounds;
    this.reload.next();
  }

  protected onFiltersChanged(filters: PlaceFilters): void {
    this.filters.set(filters);
    this.reload.next();
  }

  protected onCitySelected(city: GeocodeResult): void {
    // Le recadrage déclenche un « moveend », qui recharge les lieux tout seul.
    this.map()?.fitTo(city);
  }

  protected chooseBasemap(basemap: Basemap): void {
    this.basemap.set(basemap);
    this.basemapOpen.set(false);
    localStorage.setItem(BASEMAP_KEY, basemap.id);
  }

  protected openPlace(id: string): void {
    this.selectedId.set(id);
    this.api.detail(id).subscribe({
      next: (place) => this.detail.set(place),
      error: () => this.flash("Ce lieu n'est plus disponible."),
    });
  }

  protected closeDetail(): void {
    this.detail.set(null);
    this.selectedId.set(null);
  }

  protected startAdding(): void {
    if (!this.auth.isSignedIn()) {
      this.router.navigate(['/connexion']);
      return;
    }

    this.closeDetail();
    this.error.set(null);
    this.draft.set(null);
    this.mode.set('adding');
    this.flash('Cliquez sur la carte pour poser le point du lieu.');
  }

  protected cancelAdding(): void {
    this.mode.set('browse');
    this.draft.set(null);
    this.map()?.showDraftPin(null);
    this.error.set(null);
  }

  protected onMapClicked(point: { latitude: number; longitude: number }): void {
    if (this.mode() !== 'adding') {
      return;
    }

    this.draft.set(point);
    this.map()?.showDraftPin(point);
    this.banner.set(null);
  }

  protected createPlace(payload: { input: CreatePlaceInput; photos: File[] }): void {
    this.saving.set(true);
    this.error.set(null);

    this.api.create(payload.input, payload.photos).subscribe({
      next: (created) => {
        this.saving.set(false);
        this.cancelAdding();
        this.reload.next();

        if (created.status === 'Approved') {
          this.detail.set(created);
          this.selectedId.set(created.id);
          this.flash('Lieu publié, merci !');
        } else {
          this.flash("Lieu envoyé. Il apparaîtra sur la carte après validation d'un modérateur.");
        }
      },
      error: (response) => {
        this.saving.set(false);
        this.error.set(readError(response, 'La publication du lieu a échoué.'));
      },
    });
  }

  protected rate(vote: { stars: number; comment: string | null }): void {
    const place = this.detail();
    if (!place) {
      return;
    }

    this.saving.set(true);
    this.api.rate(place.id, vote.stars, vote.comment).subscribe({
      next: (updated) => {
        this.saving.set(false);
        this.detail.set(updated);
        this.reload.next();
        this.flash('Merci pour votre note.');
      },
      error: (response) => {
        this.saving.set(false);
        this.flash(readError(response, "La note n'a pas pu être enregistrée."));
      },
    });
  }

  protected uploadPhoto(file: File): void {
    const place = this.detail();
    if (!place) {
      return;
    }

    this.saving.set(true);
    this.api.uploadPhoto(place.id, file).subscribe({
      next: (updated) => {
        this.saving.set(false);
        this.detail.set(updated);
        this.reload.next();
      },
      error: (response) => {
        this.saving.set(false);
        this.flash(readError(response, "L'envoi de la photo a échoué."));
      },
    });
  }

  private flash(message: string): void {
    this.banner.set(message);
    setTimeout(() => this.banner.update((current) => (current === message ? null : current)), 4000);
  }
}

/** L'API renvoie du ProblemDetails : on en extrait le message plutôt que d'afficher un code. */
function readError(response: unknown, fallback: string): string {
  const problem = (response as { error?: { detail?: string; errors?: Record<string, string[]> } })?.error;
  if (problem?.detail) {
    return problem.detail;
  }

  const firstField = problem?.errors ? Object.values(problem.errors)[0] : undefined;
  return firstField?.[0] ?? fallback;
}
