import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { Auth } from '../../core/auth';
import { CATEGORIES } from '../../core/categories';
import { HomeSummary, MapBounds, PlaceCategory, PlaceSummary, emptyFilters } from '../../core/models';
import { MembersApi } from '../../core/members-api';
import { PlacesApi } from '../../core/places-api';
import { CategorySymbol } from '../../shared/category-symbol';
import { PlaceCard } from '../../shared/place-card';
import { SiteFooter } from '../../shared/site-footer';
import { SiteHeader } from '../../shared/site-header';
import { LeafletMap } from '../map/leaflet-map';

/** Le quartier du Marais : assez dense en lieux pour que la vignette de carte parle. */
const SHOWCASE_CENTER: [number, number] = [48.8605, 2.3585];
const SHOWCASE_BOUNDS: MapBounds = { minLon: 2.29, minLat: 48.83, maxLon: 2.42, maxLat: 48.9 };

@Component({
  selector: 'nooks-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, SiteHeader, SiteFooter, CategorySymbol, PlaceCard, LeafletMap],
  template: `
    <nooks-header />

    <main>
      <!-- Hero : le discours à gauche, une vignette de carte et deux lieux à droite. -->
      <section class="mx-auto max-w-6xl px-5 pt-32 pb-20 sm:pt-40">
        <div class="grid items-center gap-14 lg:grid-cols-[1.05fr_1fr]">
          <div>
            <p class="label-caps mb-4">Carte collaborative</p>
            <h1 class="text-[40px] sm:text-[48px] xl:text-[54px]">
              Les endroits qu'on ne trouve dans aucun guide.
            </h1>
            <p class="mt-6 max-w-lg text-[17px] leading-relaxed text-ink-700">
              Un point de vue oublié, une boutique impossible, un passage couvert derrière une porte
              cochère. Nooks rassemble ce que les habitants connaissent et que les guides ignorent.
            </p>

            <div class="mt-9 flex flex-wrap items-center gap-3">
              <a routerLink="/carte" class="btn btn-primary card-float px-6 py-3.5 text-[15px]">
                Ouvrir la carte
                <svg width="15" height="15" viewBox="0 0 12 12" aria-hidden="true">
                  <path d="M2 6h8M6.5 2.5 10 6l-3.5 3.5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </a>
              @if (!auth.isSignedIn()) {
                <a routerLink="/inscription" class="btn btn-secondary px-6 py-3.5 text-[15px]">Créer un compte</a>
              }
              <span class="text-[14px] text-ink-500">Pas besoin de compte pour regarder.</span>
            </div>

            @if (summary(); as data) {
              <dl class="mt-12 grid max-w-lg grid-cols-2 gap-6 sm:grid-cols-4">
                @for (stat of stats(data); track stat.label) {
                  <div>
                    <dt class="text-[28px] leading-none font-extrabold tabular-nums">{{ stat.value }}</dt>
                    <dd class="mt-1.5 text-[13px] text-ink-500">{{ stat.label }}</dd>
                  </div>
                }
              </dl>
            }
          </div>

          <!-- Composition : un disque de carte, deux fiches posées dessus.
               Purement illustratif : rien n'y est cliquable. -->
          <div class="relative mx-auto w-full max-w-[30rem] py-10 lg:py-0">
            <!-- Contexte d'empilement isolé : les couches Leaflet passeraient sinon devant les fiches. -->
            <div
              class="card card-float isolate mx-auto aspect-square w-full max-w-[27rem] overflow-hidden rounded-full"
              aria-hidden="true"
            >
              <nooks-map
                class="h-full w-full"
                [places]="showcase()"
                [initialCenter]="center"
                [initialZoom]="14"
                [inert]="true"
              />
            </div>

            @if (highlights(); as pair) {
              @if (pair[0]; as first) {
                <div
                  class="animate-rise card-float pointer-events-auto absolute top-2 -left-2 z-10 w-52 -rotate-3 rounded-[20px] transition-transform duration-300 hover:-translate-y-1 hover:rotate-0 sm:-left-8 sm:w-56"
                >
                  <nooks-place-card [place]="first" imageHeight="h-28" />
                </div>
              }
              @if (pair[1]; as second) {
                <div
                  class="animate-rise card-float absolute -right-2 bottom-6 z-10 w-52 rotate-2 rounded-[20px] transition-transform duration-300 hover:-translate-y-1 hover:rotate-0 sm:-right-8 sm:w-56"
                >
                  <nooks-place-card [place]="second" imageHeight="h-28" />
                </div>
              }
            }
          </div>
        </div>

        <p class="mt-8 text-right text-[11.5px] text-ink-400 lg:mt-4">
          Fond de carte
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener" class="hover:text-ink-700">
            OpenStreetMap
          </a>
          et
          <a href="https://carto.com/attributions" target="_blank" rel="noopener" class="hover:text-ink-700">CARTO</a>
        </p>
      </section>

      <!-- Le concept -->
      <section id="concept" class="scroll-mt-28 border-y border-ink-200 bg-ink-50">
        <div class="mx-auto grid max-w-6xl gap-12 px-5 py-20 lg:grid-cols-2 lg:items-center">
          <div>
            <p class="label-caps mb-4">Le concept</p>
            <h2 class="text-[32px]">Une carte tenue par ceux qui marchent.</h2>
            <p class="mt-5 max-w-lg text-[16px] leading-relaxed text-ink-700">
              Les guides recopient les mêmes vingt adresses. Les habitants, eux, connaissent la cour
              qu'on traverse pour gagner cinq minutes, le banc d'où le coucher de soleil est parfait,
              la boutique qui n'a pas changé depuis 1950.
            </p>
            <p class="mt-4 max-w-lg text-[16px] leading-relaxed text-ink-700">
              Chaque lieu de Nooks a été posé par quelqu'un qui y est allé, avec sa photo et son nom
              attaché. C'est tout ce qui fait la différence.
            </p>
          </div>

          <ul class="grid gap-4 sm:grid-cols-2">
            @for (point of concept; track point.title) {
              <li class="card px-5 py-5">
                <h3 class="text-[16.5px]">{{ point.title }}</h3>
                <p class="mt-2 text-[14px] leading-relaxed text-ink-600">{{ point.body }}</p>
              </li>
            }
          </ul>
        </div>
      </section>

      <!-- Catégories -->
      <section id="categories" class="mx-auto max-w-6xl scroll-mt-28 px-5 py-20">
        <h2 class="text-[32px]">Qu'est-ce qu'on y trouve ?</h2>
        <p class="mt-2 max-w-xl text-[15.5px] text-ink-500">
          Chaque catégorie a sa couleur et son symbole, sur la carte comme dans les filtres.
        </p>

        <div class="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          @for (category of categories; track category.id) {
            <a
              [routerLink]="['/carte']"
              [queryParams]="{ categorie: category.id }"
              class="card group flex items-center gap-4 px-5 py-4 transition-transform duration-200 hover:-translate-y-0.5"
            >
              <span class="flex size-11 shrink-0 items-center justify-center rounded-full" [style.background]="category.color + '18'">
                <nooks-symbol [category]="category.id" [size]="17" />
              </span>
              <span class="min-w-0 flex-1">
                <span class="block text-[15.5px] font-semibold">{{ category.label }}</span>
                <span class="block text-[13.5px] text-ink-500">{{ countOf(category.id) }} lieux</span>
              </span>
              <svg width="13" height="13" viewBox="0 0 12 12" class="shrink-0 text-ink-300 transition-colors group-hover:text-ink-900" aria-hidden="true">
                <path d="M4.5 1.5 9 6l-4.5 4.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </a>
          }
        </div>
      </section>

      <!-- Comment ça marche -->
      <section id="fonctionnement" class="scroll-mt-28 border-y border-ink-200 bg-ink-50">
        <div class="mx-auto max-w-6xl px-5 py-20">
          <h2 class="text-[32px]">Comment ça marche</h2>

          <ol class="mt-10 grid gap-10 sm:grid-cols-3">
            @for (step of steps; track step.title; let i = $index) {
              <li>
                <span class="flex size-9 items-center justify-center rounded-full bg-ink-950 text-[14px] font-bold text-white">
                  {{ i + 1 }}
                </span>
                <h3 class="mt-4 text-[18px]">{{ step.title }}</h3>
                <p class="mt-2 text-[14.5px] leading-relaxed text-ink-600">{{ step.body }}</p>
              </li>
            }
          </ol>
        </div>
      </section>

      <!-- Derniers lieux -->
      @if (summary(); as data) {
        @if (data.latest.length > 0) {
          <section id="derniers" class="mx-auto max-w-6xl scroll-mt-28 px-5 py-20">
            <div class="flex items-end justify-between gap-4">
              <div>
                <h2 class="text-[32px]">Derniers lieux ajoutés</h2>
                <p class="mt-2 text-[15.5px] text-ink-500">Ce que la communauté a posé récemment.</p>
              </div>
              <a routerLink="/carte" class="btn btn-secondary shrink-0">Tout voir</a>
            </div>

            <div class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              @for (place of data.latest; track place.id) {
                <a
                  [routerLink]="['/carte']"
                  [queryParams]="{ lieu: place.id }"
                  class="transition-transform duration-200 hover:-translate-y-0.5"
                >
                  <nooks-place-card [place]="place" />
                </a>
              }
            </div>
          </section>
        }
      }

      <!-- Appel final -->
      <section class="mx-auto max-w-6xl px-5 pb-24">
        <div class="card overflow-hidden bg-ink-950 px-8 py-14 text-center text-white sm:px-16">
          <h2 class="text-[32px] text-white sm:text-[38px]">Vous connaissez un endroit ?</h2>
          <p class="mx-auto mt-4 max-w-lg text-[15.5px] leading-relaxed text-ink-300">
            Posez-le sur la carte en une minute : un point, une photo, deux phrases. C'est ce qui fera
            la différence pour quelqu'un qui passera par là dans six mois.
          </p>
          <div class="mt-8 flex flex-wrap justify-center gap-3">
            @if (auth.isSignedIn()) {
              <a routerLink="/carte" class="btn bg-white px-6 py-3.5 text-[15px] text-ink-950 hover:bg-ink-200">
                Proposer un lieu
              </a>
            } @else {
              <a routerLink="/inscription" class="btn bg-white px-6 py-3.5 text-[15px] text-ink-950 hover:bg-ink-200">
                Créer un compte
              </a>
              <a routerLink="/carte" class="btn border-ink-700 px-6 py-3.5 text-[15px] text-white hover:bg-ink-800">
                Voir la carte d'abord
              </a>
            }
          </div>
        </div>
      </section>
    </main>

    <nooks-footer />
  `,
})
export class HomePage {
  protected readonly auth = inject(Auth);
  private readonly api = inject(MembersApi);
  private readonly placesApi = inject(PlacesApi);

  protected readonly center = SHOWCASE_CENTER;
  protected readonly categories = CATEGORIES;
  protected readonly summary = signal<HomeSummary | null>(null);
  protected readonly showcase = signal<PlaceSummary[]>([]);

  /** Les deux lieux photographiés les mieux notés du quartier montré sur la vignette. */
  protected readonly highlights = computed(() =>
    this.showcase()
      .filter((place) => place.coverThumbnailUrl !== null)
      .slice(0, 2),
  );

  protected readonly concept = [
    {
      title: 'Posé par des gens, pas par un algorithme',
      body: 'Aucun classement sponsorisé, aucune fiche générée. Chaque lieu vient de quelqu’un qui y est passé.',
    },
    {
      title: 'Une photo obligatoire',
      body: "Elle devient le marqueur du lieu sur la carte. On voit où on va avant d'y aller.",
    },
    {
      title: 'Des avis, pas des étoiles seules',
      body: 'Un membre laisse un avis par lieu, modifiable, et on sait quand il a été retouché.',
    },
    {
      title: 'Pas de doublons',
      body: 'Proposer un lieu déjà présent déclenche un avertissement, avec le lieu existant à compléter.',
    },
  ];

  protected readonly steps = [
    {
      title: 'Ouvrez la carte',
      body: "Cherchez une ville, filtrez par catégorie ou par note. Aucun compte n'est nécessaire pour explorer.",
    },
    {
      title: 'Trouvez ce que personne ne montre',
      body: 'Chaque lieu a sa photo, sa description et les avis des membres qui y sont allés.',
    },
    {
      title: 'Ajoutez les vôtres',
      body: 'Créez un compte, cliquez sur la carte, ajoutez une photo. Votre nom reste attaché au lieu.',
    },
  ];

  constructor() {
    this.api.home().subscribe({
      next: (summary) => this.summary.set(summary),
      error: () => this.summary.set(null),
    });

    this.placesApi
      .search(SHOWCASE_BOUNDS, emptyFilters)
      .pipe(catchError(() => of([] as PlaceSummary[])))
      .subscribe((places) => this.showcase.set(places));
  }

  protected stats(data: HomeSummary) {
    return [
      { value: data.placeCount, label: 'lieux répertoriés' },
      { value: data.cityCount, label: 'villes couvertes' },
      { value: data.memberCount, label: 'membres' },
      { value: data.reviewCount, label: 'avis publiés' },
    ];
  }

  protected countOf(category: PlaceCategory): number {
    return this.summary()?.categories.find((entry) => entry.category === category)?.count ?? 0;
  }
}
