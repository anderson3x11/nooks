import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Auth } from '../../core/auth';
import { CATEGORIES, categoryStyle } from '../../core/categories';
import { HomeSummary, PlaceCategory, PlaceSummary } from '../../core/models';
import { MembersApi } from '../../core/members-api';
import { CategorySymbol } from '../../shared/category-symbol';
import { SiteFooter } from '../../shared/site-footer';
import { SiteHeader } from '../../shared/site-header';
import { LeafletMap } from '../map/leaflet-map';
import { RatingStars } from '../places/rating-stars';

/** Cadrage sur la France entière pour la carte décorative de l'en-tête. */
const FRANCE: [number, number] = [46.7, 2.6];

@Component({
  selector: 'nooks-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, SiteHeader, SiteFooter, CategorySymbol, RatingStars, LeafletMap],
  template: `
    <nooks-header />

    <main>
      <!-- Hero : la carte en fond, estompée, avec le discours par-dessus. -->
      <section class="relative overflow-hidden border-b border-ink-200">
        <!-- Contexte d'empilement isolé : les couches Leaflet montent à z-index 800
             et passeraient sinon par-dessus le texte. -->
        <div class="pointer-events-none absolute inset-0 isolate">
          <nooks-map
            class="absolute inset-0"
            [places]="summary()?.latest ?? []"
            [initialCenter]="france"
            [initialZoom]="6"
            [inert]="true"
          />
        </div>
        <!-- Deux voiles : l'un dégage la colonne de texte à gauche, l'autre raccorde au blanc en bas. -->
        <div
          class="pointer-events-none absolute inset-0 z-10"
          style="background: linear-gradient(100deg, #fff 8%, rgb(255 255 255 / 0.92) 36%, rgb(255 255 255 / 0.45) 66%, rgb(255 255 255 / 0.25) 100%);"
        ></div>
        <div
          class="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-40"
          style="background: linear-gradient(180deg, transparent, #fff);"
        ></div>

        <div class="relative z-20 mx-auto max-w-6xl px-5 py-24 sm:py-32">
          <p class="label-caps mb-4">Carte collaborative</p>
          <h1 class="max-w-3xl text-[42px] sm:text-[58px]">
            Les endroits qu'on ne trouve<br class="hidden sm:block" />
            dans aucun guide.
          </h1>
          <p class="mt-6 max-w-xl text-[17px] leading-relaxed text-ink-700">
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
              <a routerLink="/inscription" class="btn btn-secondary card-float px-6 py-3.5 text-[15px]">
                Créer un compte
              </a>
            }
            <span class="text-[14px] text-ink-500">Pas besoin de compte pour regarder.</span>
          </div>

          @if (summary(); as data) {
            <dl class="mt-14 grid max-w-2xl grid-cols-2 gap-6 sm:grid-cols-4">
              @for (stat of stats(data); track stat.label) {
                <div>
                  <dt class="text-[30px] leading-none font-extrabold tabular-nums">{{ stat.value }}</dt>
                  <dd class="mt-1.5 text-[13.5px] text-ink-500">{{ stat.label }}</dd>
                </div>
              }
            </dl>
          }
        </div>
      </section>

      <!-- Catégories : la légende de la carte, en entrée de site. -->
      <section class="mx-auto max-w-6xl px-5 py-20">
        <h2 class="text-[30px]">Qu'est-ce qu'on y trouve ?</h2>
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
              <span
                class="flex size-11 shrink-0 items-center justify-center rounded-full"
                [style.background]="category.color + '18'"
              >
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
      <section class="border-y border-ink-200 bg-ink-50">
        <div class="mx-auto max-w-6xl px-5 py-20">
          <h2 class="text-[30px]">Comment ça marche</h2>

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
          <section class="mx-auto max-w-6xl px-5 py-20">
            <div class="flex items-end justify-between gap-4">
              <div>
                <h2 class="text-[30px]">Derniers lieux ajoutés</h2>
                <p class="mt-2 text-[15.5px] text-ink-500">Ce que la communauté a posé récemment.</p>
              </div>
              <a routerLink="/carte" class="btn btn-secondary shrink-0">Tout voir</a>
            </div>

            <div class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              @for (place of data.latest; track place.id) {
                <a
                  [routerLink]="['/carte']"
                  [queryParams]="{ lieu: place.id }"
                  class="card overflow-hidden transition-transform duration-200 hover:-translate-y-0.5"
                >
                  @if (place.coverThumbnailUrl) {
                    <img [src]="place.coverThumbnailUrl" alt="" class="h-36 w-full object-cover" />
                  } @else {
                    <span class="flex h-36 w-full items-center justify-center bg-ink-100">
                      <nooks-symbol [category]="place.category" [size]="26" />
                    </span>
                  }
                  <span class="block px-4 py-3.5">
                    <span class="flex items-center gap-1.5">
                      <nooks-symbol [category]="place.category" [size]="10" />
                      <span class="text-[12px] font-semibold" [style.color]="tint(place.category)">
                        {{ label(place.category) }}
                      </span>
                      <span class="text-[12px] text-ink-400">· {{ place.city }}</span>
                    </span>
                    <span class="mt-1 block truncate text-[15.5px] font-semibold">{{ place.name }}</span>
                    <span class="mt-1.5 block">
                      <nooks-stars [value]="place.averageRating" [count]="place.ratingCount" [size]="11" />
                    </span>
                  </span>
                </a>
              }
            </div>
          </section>
        }
      }

      <!-- Appel final -->
      <section class="mx-auto max-w-6xl px-5 pb-24">
        <div class="card overflow-hidden bg-ink-950 px-8 py-14 text-center text-white sm:px-16">
          <h2 class="text-[30px] text-white sm:text-[36px]">Vous connaissez un endroit ?</h2>
          <p class="mx-auto mt-4 max-w-lg text-[15.5px] leading-relaxed text-ink-300">
            Posez-le sur la carte en une minute : un point, une photo, deux phrases. C'est ce qui
            fera la différence pour quelqu'un qui passera par là dans six mois.
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

  protected readonly france = FRANCE;
  protected readonly categories = CATEGORIES;
  protected readonly summary = signal<HomeSummary | null>(null);

  protected readonly steps = [
    {
      title: 'Ouvrez la carte',
      body: "Cherchez une ville, filtrez par catégorie ou par note. Aucun compte n'est nécessaire pour explorer.",
    },
    {
      title: 'Trouvez ce que personne ne montre',
      body: 'Chaque lieu a été posé par quelqu’un qui y est allé, avec sa photo, sa description et les avis des autres membres.',
    },
    {
      title: 'Ajoutez les vôtres',
      body: 'Créez un compte, cliquez sur la carte, ajoutez une photo. Votre nom reste attaché au lieu que vous avez fait connaître.',
    },
  ];

  constructor() {
    this.api.home().subscribe({
      next: (summary) => this.summary.set(summary),
      error: () => this.summary.set(null),
    });
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

  protected label(category: PlaceSummary['category']): string {
    return categoryStyle(category).label;
  }

  protected tint(category: PlaceSummary['category']): string {
    return categoryStyle(category).color;
  }
}
