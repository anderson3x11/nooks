import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Auth } from '../../core/auth';
import { categoryStyle } from '../../core/categories';
import { MemberProfile, PlaceSummary } from '../../core/models';
import { MembersApi } from '../../core/members-api';
import { CategorySymbol } from '../../shared/category-symbol';
import { SiteFooter } from '../../shared/site-footer';
import { SiteHeader } from '../../shared/site-header';
import { RatingStars } from '../places/rating-stars';

type Tab = 'places' | 'reviews' | 'favorites';

/**
 * Page d'un membre. La même sert au profil public et au sien : la seule différence
 * tient aux favoris, visibles par leur propriétaire seul. Tout ce qui se modifie
 * vit dans les paramètres.
 */
@Component({
  selector: 'nooks-profile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet, RouterLink, SiteHeader, SiteFooter, CategorySymbol, RatingStars],
  template: `
    <nooks-header />

    <main class="min-h-[60vh] bg-ink-50 pt-24 pb-20">
      @if (profile(); as member) {
        <section class="border-b border-ink-200 bg-white">
          <div class="mx-auto max-w-6xl px-5 py-12">
            <div class="flex flex-col gap-6 sm:flex-row sm:items-start">
              <div class="relative shrink-0">
                @if (member.avatarUrl) {
                  <img [src]="member.avatarUrl" alt="" class="size-24 rounded-full object-cover" />
                } @else {
                  <span class="flex size-24 items-center justify-center rounded-full bg-ink-950 text-[32px] font-bold text-white">
                    {{ initial(member.displayName) }}
                  </span>
                }

              </div>

              <div class="min-w-0 flex-1">
                <h1 class="text-[32px]">{{ member.displayName }}</h1>
                <p class="mt-1 text-[14px] text-ink-500">Membre depuis {{ formatMonth(member.joinedAt) }}</p>

                @if (member.bio) {
                  <p class="mt-4 max-w-xl text-[15px] leading-relaxed text-ink-700">{{ member.bio }}</p>
                } @else if (isOwner()) {
                  <p class="mt-4 text-[15px] text-ink-400">Aucune présentation pour l'instant.</p>
                }

                @if (isOwner()) {
                  <a routerLink="/parametres" class="btn btn-secondary mt-5">Modifier mon profil</a>
                }
              </div>
            </div>

            <dl class="mt-10 flex gap-10">
              <div>
                <dt class="text-[26px] leading-none font-extrabold tabular-nums">{{ member.placeCount }}</dt>
                <dd class="mt-1 text-[13px] text-ink-500">lieux proposés</dd>
              </div>
              <div>
                <dt class="text-[26px] leading-none font-extrabold tabular-nums">{{ member.reviewCount }}</dt>
                <dd class="mt-1 text-[13px] text-ink-500">avis publiés</dd>
              </div>
              <div>
                <dt class="text-[26px] leading-none font-extrabold tabular-nums">{{ member.favoriteCount }}</dt>
                <dd class="mt-1 text-[13px] text-ink-500">favoris</dd>
              </div>
            </dl>
          </div>
        </section>

        <div class="mx-auto max-w-6xl px-5 py-8">
          <nav class="segment mb-6">
            @for (item of tabs(); track item.id) {
              <button type="button" [attr.aria-pressed]="tab() === item.id" (click)="tab.set(item.id)">
                {{ item.label }}
              </button>
            }
          </nav>

          @switch (tab()) {
            @case ('places') {
              @if (member.places.length === 0) {
                <p class="text-[15px] text-ink-500">Aucun lieu proposé pour l'instant.</p>
              } @else {
                <div class="grid gap-3 sm:grid-cols-2">
                  @for (place of member.places; track place.id) {
                    <a [routerLink]="['/carte']" [queryParams]="{ lieu: place.id }" class="card flex items-center gap-4 p-3">
                      <ng-container *ngTemplateOutlet="thumb; context: { $implicit: place }" />
                    </a>
                  }
                </div>
              }
            }

            @case ('favorites') {
              @if (member.favorites.length === 0) {
                <p class="text-[15px] text-ink-500">Aucun favori pour l'instant.</p>
              } @else {
                <div class="grid gap-3 sm:grid-cols-2">
                  @for (place of member.favorites; track place.id) {
                    <a [routerLink]="['/carte']" [queryParams]="{ lieu: place.id }" class="card flex items-center gap-4 p-3">
                      <ng-container *ngTemplateOutlet="thumb; context: { $implicit: place }" />
                    </a>
                  }
                </div>
              }
            }

            @default {
              @if (member.reviews.length === 0) {
                <p class="text-[15px] text-ink-500">Aucun avis publié pour l'instant.</p>
              } @else {
                <ul class="flex flex-col gap-3">
                  @for (review of member.reviews; track review.id) {
                    <li class="card px-5 py-4">
                      <a [routerLink]="['/carte']" [queryParams]="{ lieu: review.placeId }" class="flex items-center gap-2">
                        <span class="text-[15.5px] font-semibold">{{ review.placeName }}</span>
                        <span class="text-[13px] text-ink-400">{{ review.placeCity }}</span>
                      </a>
                      <div class="mt-1.5 flex items-center gap-2">
                        <nooks-stars [value]="review.stars" [size]="12" />
                        <span class="text-[12.5px] text-ink-400">
                          {{ formatDate(review.updatedAt) }}
                          @if (review.isEdited) {
                            · modifié
                          }
                        </span>
                        @if (review.isRemoved) {
                          <span class="rounded-full bg-negative/10 px-2 py-0.5 text-[11.5px] font-semibold text-negative">
                            retiré par la modération
                          </span>
                        }
                      </div>
                      @if (review.comment) {
                        <p class="mt-2 text-[14.5px] leading-snug text-ink-700">{{ review.comment }}</p>
                      }
                    </li>
                  }
                </ul>
              }
            }

          }
        </div>
      } @else if (missing()) {
        <div class="mx-auto max-w-6xl px-5 py-24 text-center">
          <h1 class="text-[28px]">Ce membre n'existe pas</h1>
          <a routerLink="/" class="btn btn-secondary mt-6">Retour à l'accueil</a>
        </div>
      }
    </main>

    <nooks-footer />

    <ng-template #thumb let-place>
      @if (place.coverThumbnailUrl) {
        <img [src]="place.coverThumbnailUrl" alt="" class="size-14 shrink-0 rounded-xl object-cover" />
      } @else {
        <span class="flex size-14 shrink-0 items-center justify-center rounded-xl bg-ink-100">
          <nooks-symbol [category]="place.category" [size]="18" />
        </span>
      }
      <span class="min-w-0 flex-1">
        <span class="block truncate text-[15px] font-semibold">{{ place.name }}</span>
        <span class="flex items-center gap-1.5">
          <nooks-symbol [category]="place.category" [size]="9" />
          <span class="text-[12.5px]" [style.color]="tint(place.category)">{{ label(place.category) }}</span>
          <span class="text-[12.5px] text-ink-400">· {{ place.city }}</span>
        </span>
      </span>
    </ng-template>
  `,
})
export class ProfilePage {
  private readonly api = inject(MembersApi);
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(Auth);

  protected readonly profile = signal<MemberProfile | null>(null);
  protected readonly missing = signal(false);
  protected readonly tab = signal<Tab>('places');

  private readonly memberId = signal<string | null>(this.route.snapshot.paramMap.get('id'));

  protected readonly isOwner = computed(() => {
    const id = this.memberId();
    return id === null || id === this.auth.user()?.id;
  });

  constructor() {
    const id = this.memberId();
    const request = id === null ? this.api.me() : this.api.profile(id);

    request.subscribe({
      next: (profile) => this.profile.set(profile),
      error: () => this.missing.set(true),
    });
  }

  protected tabs(): { id: Tab; label: string }[] {
    const tabs: { id: Tab; label: string }[] = [
      { id: 'places', label: 'Lieux proposés' },
      { id: 'reviews', label: 'Avis' },
    ];

    if (this.isOwner()) {
      tabs.push({ id: 'favorites', label: 'Favoris' });
    }

    return tabs;
  }

  protected tint(category: PlaceSummary['category']): string {
    return categoryStyle(category).color;
  }

  protected label(category: PlaceSummary['category']): string {
    return categoryStyle(category).label;
  }

  protected initial(name: string): string {
    return name.trim().charAt(0).toUpperCase();
  }

  protected formatDate(value: string): string {
    return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
  }

  protected formatMonth(value: string): string {
    return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(new Date(value));
  }
}
