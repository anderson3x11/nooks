import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, catchError, debounceTime, of, switchMap } from 'rxjs';
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
import { MembersApi } from '../../core/members-api';
import { AccountMenu } from '../../shared/account-menu';
import { PlacesApi } from '../../core/places-api';
import { PlaceDetailPanel } from '../places/place-detail';
import { PlaceForm } from '../places/place-form';
import { CitySearch } from './city-search';
import { FiltersPanel } from './filters-panel';
import { LeafletMap } from './leaflet-map';

type Mode = 'browse' | 'adding';

const BASEMAP_KEY = 'nooks.basemap';

/**
 * Surface maximale interrogeable, en degrés carrés. Même valeur que côté serveur :
 * au-delà, on n'envoie même pas la requête et on invite à zoomer.
 */
const MAX_AREA_IN_SQUARE_DEGREES = 100;

@Component({
  selector: 'nooks-map-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LeafletMap, FiltersPanel, CitySearch, PlaceDetailPanel, PlaceForm, RouterLink, AccountMenu],
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
      <div class="pointer-events-none absolute inset-0 z-[1000] flex flex-col gap-3 p-3 md:gap-4 md:p-4">
        <header class="flex items-start gap-2 md:gap-3">
          <a
            routerLink="/"
            class="card pointer-events-auto flex h-12 shrink-0 items-center gap-2.5 rounded-full px-2 md:pr-5"
            aria-label="Accueil Nooks"
          >
            <span class="flex size-8 items-center justify-center rounded-full bg-ink-950">
              <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
                <path
                  d="M8 1.6c-2.7 0-4.9 2.2-4.9 4.9 0 3.6 4.9 8.1 4.9 8.1s4.9-4.5 4.9-8.1c0-2.7-2.2-4.9-4.9-4.9Z"
                  fill="#fff"
                />
                <circle cx="8" cy="6.3" r="1.9" fill="#0a0a0a" />
              </svg>
            </span>
            <span class="hidden text-[17px] leading-none font-extrabold tracking-tight md:inline">Nooks</span>
          </a>

          <div class="pointer-events-auto min-w-0 flex-1 md:flex-none">
            <nooks-city-search class="block w-full md:w-80" (citySelected)="onCitySelected($event)" />
          </div>

          <div class="hidden flex-1 md:block"></div>

          <div class="card pointer-events-auto flex h-12 shrink-0 items-center gap-2 rounded-full px-1.5 md:pl-4">
            @if (auth.isSignedIn()) {
              @if (auth.isAdmin()) {
                <a routerLink="/admin" class="btn btn-quiet hidden py-1.5 text-[13px] md:inline-flex">Admin</a>
              }
              <nooks-account-menu />
            } @else {
              <a routerLink="/connexion" class="hidden px-2 text-[14px] font-medium text-ink-700 hover:text-ink-950 md:inline">
                Connexion
              </a>
              <a routerLink="/inscription" class="btn btn-primary py-1.5 text-[13px]">Créer un compte</a>
            }
          </div>
        </header>

        <div class="flex min-h-0 flex-1 items-start gap-4">
          <!-- Filtres : colonne fixe sur grand écran, feuille coulissante sur téléphone. -->
          <div
            class="pointer-events-auto fixed inset-x-0 bottom-0 z-[1001] max-h-[80dvh] overflow-y-auto md:static md:z-auto md:flex md:max-h-full md:w-auto md:flex-col md:gap-3 md:overflow-visible"
            [class.hidden]="!filtersOpen()"
          >
            <nooks-filters
              class="block"
              [filters]="filters()"
              [counts]="counts()"
              [dismissable]="true"
              (filtersChanged)="onFiltersChanged($event)"
              (dismissed)="filtersOpen.set(false)"
            />

            @if (mode() === 'browse') {
              <button type="button" class="btn btn-primary card-float hidden w-80 md:inline-flex" (click)="startAdding()">
                <svg width="14" height="14" viewBox="0 0 12 12" aria-hidden="true">
                  <path d="M6 1v10M1 6h10" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" />
                </svg>
                Proposer un lieu
              </button>
            }
          </div>

          <div class="hidden flex-1 md:block"></div>

          <!-- Fiche et formulaire : panneau latéral sur grand écran, feuille en bas sur téléphone. -->
          <div
            class="pointer-events-auto fixed inset-x-0 bottom-0 z-[1001] flex md:static md:z-auto md:max-h-full"
            [class.hidden]="!detail() && mode() !== 'adding'"
          >
            @if (mode() === 'adding') {
              <nooks-place-form
                [position]="draft()"
                [busy]="saving()"
                [error]="error()"
                [rejectedAs]="duplicates()"
                (submitted)="createPlace($event)"
                (cancelled)="cancelAdding()"
                (openExisting)="showExisting($event)"
              />
            } @else if (detail()) {
              <nooks-place-detail
                [place]="detail()"
                [loading]="loadingDetail()"
                [busy]="saving()"
                (closed)="closeDetail()"
                (rated)="rate($event)"
                (photoPicked)="uploadPhoto($event)"
                (favoriteToggled)="toggleFavorite()"
              />
            }
          </div>
        </div>

        <footer class="flex items-end gap-3" [class.hidden]="sheetOpen()">
          <!-- Sélecteur de fond de carte : replié en pastille, déplié en petite carte. -->
          <div class="pointer-events-auto relative shrink-0">
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

          <!-- Actions du bas, seulement sur téléphone : filtres et ajout y sont hors flux. -->
          <div class="pointer-events-auto flex flex-1 gap-2 md:hidden">
            <button type="button" class="btn btn-secondary card-float flex-1" (click)="filtersOpen.set(true)">
              Filtres
              @if (activeFilterCount() > 0) {
                <span class="rounded-full bg-ink-950 px-1.5 text-[11px] text-white">{{ activeFilterCount() }}</span>
              }
            </button>
            <button type="button" class="btn btn-primary card-float flex-1" (click)="startAdding()">Proposer</button>
          </div>

          <div class="hidden flex-1 justify-center md:flex">
            @if (banner(); as text) {
              <p class="card card-float animate-rise pointer-events-auto rounded-full bg-ink-950 px-4 py-2 text-[13.5px] font-semibold text-white">
                {{ text }}
              </p>
            } @else if (tooWide()) {
              <p class="card pointer-events-auto rounded-full px-3.5 py-1.5 text-[13px] text-ink-500">
                Zoomez pour découvrir les lieux
              </p>
            } @else if (mode() === 'browse' && !detail()) {
              <p class="card pointer-events-auto rounded-full px-3.5 py-1.5 text-[13px] text-ink-500">
                {{ places().length }} lieu{{ places().length > 1 ? 'x' : '' }} dans cette zone
              </p>
            }
          </div>

          <div class="hidden w-10 md:block"></div>
        </footer>

        <!-- Sur téléphone le bandeau passe au-dessus des actions, faute de place à côté. -->
        @if (banner(); as text) {
          <p
            class="card card-float animate-rise pointer-events-auto absolute inset-x-3 bottom-20 mx-auto w-fit rounded-full bg-ink-950 px-4 py-2 text-center text-[13.5px] font-semibold text-white md:hidden"
          >
            {{ text }}
          </p>
        }
      </div>
    </div>
  `,
})
export class MapPage {
  protected readonly auth = inject(Auth);
  private readonly api = inject(PlacesApi);
  private readonly members = inject(MembersApi);
  private readonly router = inject(Router);
  private readonly map = viewChild(LeafletMap);
  private readonly route = inject(ActivatedRoute);

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
  /** Lieux semblables renvoyés par le serveur quand il refuse la publication. */
  protected readonly duplicates = signal<PlaceSummary[]>([]);
  /** La zone visible est trop large pour être interrogée utilement. */
  protected readonly tooWide = signal(false);
  /** La fiche est ouverte mais son détail complet n'est pas encore arrivé. */
  protected readonly loadingDetail = signal(false);
  /** Sur téléphone, les filtres sont une feuille qu'on ouvre. Toujours visibles au-dessus de md. */
  protected readonly filtersOpen = signal(false);

  protected readonly basemaps = BASEMAPS;
  protected readonly basemapOpen = signal(false);
  protected readonly basemap = signal<Basemap>(basemapById(localStorage.getItem(BASEMAP_KEY)));

  private bounds: MapBounds | null = null;

  /** Une feuille occupe le bas de l'écran : les actions du bas s'effacent derrière. */
  protected readonly sheetOpen = computed(
    () => this.filtersOpen() || this.mode() === 'adding' || this.detail() !== null,
  );

  /** Nombre de filtres actifs, pour la pastille du bouton sur téléphone. */
  protected readonly activeFilterCount = computed(() => {
    const filters = this.filters();
    return filters.categories.length + (filters.minRating === null ? 0 : 1) + (filters.text ? 1 : 0);
  });

  /** Répartition par catégorie des lieux visibles, affichée dans la légende. */
  protected readonly counts = computed(() => {
    const counts: Record<string, number> = {};
    for (const place of this.places()) {
      counts[place.category] = (counts[place.category] ?? 0) + 1;
    }
    return counts;
  });

  constructor() {
    // La page d'accueil renvoie ici avec une catégorie déjà choisie.
    const params = this.route.snapshot.queryParamMap;

    const category = params.get('categorie');
    if (category) {
      this.filters.set({ ...emptyFilters, categories: [category as PlaceSummary['category']] });
    }

    // ?lieu=<id> ouvre directement une fiche, depuis la page d'accueil par exemple.
    const placeId = params.get('lieu');
    if (placeId) {
      this.openPlace(placeId);
    }

    this.reload
      .pipe(
        // Un déplacement de carte enchaîne plusieurs « moveend » ; on ne garde que le dernier.
        debounceTime(200),
        switchMap(() =>
          this.bounds && !this.tooWide()
            ? this.api.search(this.bounds, this.filters()).pipe(catchError(() => of([] as PlaceSummary[])))
            : of([] as PlaceSummary[]),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((places) => this.places.set(places));
  }

  protected onBoundsChanged(bounds: MapBounds): void {
    this.bounds = bounds;
    this.tooWide.set((bounds.maxLon - bounds.minLon) * (bounds.maxLat - bounds.minLat) > MAX_AREA_IN_SQUARE_DEGREES);
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
    this.filtersOpen.set(false);

    // La carte connaît déjà le nom, la catégorie, la note et la vignette : on ouvre
    // la fiche avec ça sans rien attendre, et le reste se remplit à l'arrivée.
    const known = this.places().find((place) => place.id === id);
    if (known) {
      this.detail.set(previewOf(known));
      this.loadingDetail.set(true);
    }

    this.api.detail(id).subscribe({
      next: (place) => {
        this.detail.set(place);
        this.loadingDetail.set(false);
      },
      error: () => {
        this.loadingDetail.set(false);
        this.flash("Ce lieu n'est plus disponible.");
      },
    });
  }

  protected closeDetail(): void {
    this.detail.set(null);
    this.selectedId.set(null);
    this.loadingDetail.set(false);
  }

  protected startAdding(): void {
    if (!this.auth.isSignedIn()) {
      this.router.navigate(['/connexion']);
      return;
    }

    this.closeDetail();
    this.filtersOpen.set(false);
    this.error.set(null);
    this.duplicates.set([]);
    this.draft.set(null);
    this.mode.set('adding');
    this.flash('Cliquez sur la carte pour poser le point du lieu.');
  }

  protected cancelAdding(): void {
    this.mode.set('browse');
    this.draft.set(null);
    this.map()?.showDraftPin(null);
    this.error.set(null);
    this.duplicates.set([]);
  }

  /** Depuis l'avertissement anti-doublon : on quitte le formulaire pour le lieu existant. */
  protected showExisting(id: string): void {
    this.cancelAdding();
    this.openPlace(id);
  }

  protected onMapClicked(point: { latitude: number; longitude: number }): void {
    if (this.mode() !== 'adding') {
      return;
    }

    this.draft.set(point);
    this.map()?.showDraftPin(point);
    this.banner.set(null);
  }

  protected createPlace(payload: { input: CreatePlaceInput; photos: File[]; force: boolean }): void {
    this.saving.set(true);
    this.error.set(null);

    this.api.create(payload.input, payload.photos, payload.force).subscribe({
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

        // 409 : le serveur a trouvé des lieux semblables. Le formulaire les affiche
        // et le prochain envoi passera outre, avec vérification par un modérateur.
        if (response?.status === 409) {
          this.duplicates.set(response.error?.candidates ?? []);
          this.error.set(null);
          return;
        }

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

  protected toggleFavorite(): void {
    const place = this.detail();
    if (!place) {
      return;
    }

    this.members.toggleFavorite(place.id).subscribe({
      next: ({ isFavorite }) => {
        this.detail.update((current) => (current ? { ...current, isFavorite } : current));
        this.flash(isFavorite ? 'Ajouté à vos favoris.' : 'Retiré de vos favoris.');
      },
      error: () => this.flash("Le favori n'a pas pu être enregistré."),
    });
  }

  private flash(message: string): void {
    this.banner.set(message);
    setTimeout(() => this.banner.update((current) => (current === message ? null : current)), 4000);
  }
}

/** Fiche provisoire construite à partir du résumé déjà affiché sur la carte. */
function previewOf(place: PlaceSummary): PlaceDetail {
  return {
    id: place.id,
    name: place.name,
    description: '',
    category: place.category,
    latitude: place.latitude,
    longitude: place.longitude,
    address: null,
    city: place.city,
    country: '',
    status: place.status,
    averageRating: place.averageRating,
    ratingCount: place.ratingCount,
    createdAt: place.createdAt,
    createdByDisplayName: '',
    suspectedDuplicate: place.suspectedDuplicate,
    isFavorite: false,
    photos: place.coverThumbnailUrl
      ? [
          {
            id: 'preview',
            url: place.coverThumbnailUrl,
            thumbnailUrl: place.coverThumbnailUrl,
            isCover: true,
            attribution: null,
            sourceUrl: null,
          },
        ]
      : [],
    ratings: [],
  };
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

