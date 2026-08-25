import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { Subject, catchError, of, switchMap } from 'rxjs';
import { Auth } from '../../core/auth';
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
        (boundsChanged)="onBoundsChanged($event)"
        (placeSelected)="openPlace($event)"
        (mapClicked)="onMapClicked($event)"
      />

      <!-- Chrome flottant : transparent aux clics sauf sur les panneaux, et au-dessus
           des couches Leaflet, qui montent jusqu'à z-index 800. -->
      <div class="pointer-events-none absolute inset-0 z-[1000] flex flex-col gap-4 p-4">
        <header class="flex items-start gap-3">
          <div class="plate grain pointer-events-auto px-4 py-2.5">
            <h1 class="text-[19px] leading-none text-ink-900">Nooks</h1>
            <p class="mt-1 text-[10.5px] leading-none tracking-wide text-ink-400">
              carnet de lieux insolites
            </p>
          </div>

          <div class="pointer-events-auto">
            <nooks-city-search (citySelected)="onCitySelected($event)" />
          </div>

          <div class="flex-1"></div>

          <div class="plate grain pointer-events-auto flex items-center gap-3 px-3 py-2">
            @if (auth.user(); as user) {
              <span class="text-[13px] text-ink-700">
                Salut, <span class="font-semibold text-ink-900">{{ user.displayName }}</span>
              </span>
              @if (auth.isAdmin()) {
                <a routerLink="/moderation" class="label-caps text-signal-700 hover:underline">Modération</a>
              }
              <button type="button" class="label-caps cursor-pointer text-ink-400 hover:text-ink-700" (click)="auth.logout()">
                Quitter
              </button>
            } @else {
              <a routerLink="/connexion" class="label-caps text-ink-600 hover:text-ink-900">Se connecter</a>
              <a routerLink="/inscription" class="label-caps text-signal-700 hover:underline">Créer un compte</a>
            }
          </div>
        </header>

        <div class="flex min-h-0 flex-1 items-start gap-4">
          <div class="pointer-events-auto flex max-h-full flex-col gap-3 overflow-y-auto pb-1">
            <nooks-filters [filters]="filters()" [counts]="counts()" (filtersChanged)="onFiltersChanged($event)" />

            @if (mode() === 'browse') {
              <button type="button" class="btn btn-signal shadow-plate w-72" (click)="startAdding()">
                <svg width="13" height="13" viewBox="0 0 12 12" aria-hidden="true">
                  <path d="M6 1v10M1 6h10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
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

        <footer class="flex justify-center">
          @if (banner(); as text) {
            <p class="plate animate-rise pointer-events-auto px-4 py-2 text-[13px] font-semibold text-ink-800">
              {{ text }}
            </p>
          } @else if (mode() === 'browse' && !detail()) {
            <p class="plate grain pointer-events-auto px-3 py-1.5 text-[12px] text-ink-600">
              {{ places().length }} lieu{{ places().length > 1 ? 'x' : '' }} dans cette zone
            </p>
          }
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
      this.router.navigate(['/connexion'], { queryParams: { retour: 'carte' } });
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

  protected createPlace(input: CreatePlaceInput): void {
    this.saving.set(true);
    this.error.set(null);

    this.api.create(input).subscribe({
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
        this.error.set(readError(response, "La publication du lieu a échoué."));
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
