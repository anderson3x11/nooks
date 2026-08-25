import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { categoryStyle } from '../../core/categories';
import { AdminMember, AdminRating, PlaceDetail, PlaceStatus, PlaceSummary } from '../../core/models';
import { MembersApi } from '../../core/members-api';
import { PlacesApi } from '../../core/places-api';
import { CategorySymbol } from '../../shared/category-symbol';
import { SiteHeader } from '../../shared/site-header';
import { RatingStars } from '../places/rating-stars';

type Section = 'queue' | 'places' | 'reviews' | 'members';

/**
 * Espace d'administration : la file d'attente des lieux proposés, le catalogue
 * complet, la modération des avis et la liste des comptes.
 */
@Component({
  selector: 'nooks-admin',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, SiteHeader, CategorySymbol, RatingStars],
  template: `
    <nooks-header />

    <main class="min-h-[70vh] bg-ink-50 pt-24 pb-20">
      <div class="mx-auto max-w-5xl px-5 py-10">
        <header class="mb-7">
          <h1 class="text-[32px]">Administration</h1>
          <p class="mt-1.5 text-[15px] text-ink-500">
            Ce qui attend une décision, et tout ce qui peut être retiré de la carte.
          </p>
        </header>

        <nav class="segment mb-6 flex-wrap">
          @for (item of sections; track item.id) {
            <button type="button" [attr.aria-pressed]="section() === item.id" (click)="switchTo(item.id)">
              {{ item.label }}
              @if (item.id === 'queue' && pendingCount() > 0) {
                <span class="ml-1.5 rounded-full bg-negative px-1.5 text-[11px] text-white">{{ pendingCount() }}</span>
              }
            </button>
          }
        </nav>

        @if (loading()) {
          <p class="text-[14.5px] text-ink-500">Chargement…</p>
        } @else {
          @switch (section()) {
            @case ('members') {
              <ul class="flex flex-col gap-2.5">
                @for (member of members(); track member.id) {
                  <li class="card flex items-center gap-4 px-4 py-3.5">
                    @if (member.avatarUrl) {
                      <img [src]="member.avatarUrl" alt="" class="size-11 shrink-0 rounded-full object-cover" />
                    } @else {
                      <span class="flex size-11 shrink-0 items-center justify-center rounded-full bg-ink-950 text-[15px] font-bold text-white">
                        {{ initial(member.displayName) }}
                      </span>
                    }

                    <div class="min-w-0 flex-1">
                      <p class="flex items-center gap-2 text-[15.5px] font-semibold">
                        <a [routerLink]="['/membres', member.id]" class="hover:underline">{{ member.displayName }}</a>
                        @if (member.isAdmin) {
                          <span class="rounded-full bg-ink-950 px-2 py-0.5 text-[11px] font-semibold text-white">Admin</span>
                        }
                      </p>
                      <p class="text-[13px] text-ink-500">
                        {{ member.email }} · inscrit le {{ formatDate(member.joinedAt) }}
                      </p>
                    </div>

                    <p class="shrink-0 text-right text-[13px] text-ink-500">
                      {{ member.placeCount }} lieux<br />
                      {{ member.reviewCount }} avis
                    </p>
                  </li>
                }
              </ul>
            }

            @case ('reviews') {
              <div class="mb-4 flex items-center gap-3">
                <label class="flex cursor-pointer items-center gap-2 text-[14px] text-ink-700">
                  <input type="checkbox" [checked]="removedOnly()" (change)="toggleRemovedOnly()" />
                  Afficher seulement les avis retirés
                </label>
              </div>

              @if (ratings().length === 0) {
                <p class="text-[15px] text-ink-500">Aucun avis à afficher.</p>
              } @else {
                <ul class="flex flex-col gap-2.5">
                  @for (rating of ratings(); track rating.id) {
                    <li class="card px-4 py-3.5" [class.opacity-60]="rating.isRemoved">
                      <div class="flex items-start gap-4">
                        <div class="min-w-0 flex-1">
                          <p class="flex flex-wrap items-center gap-2">
                            <span class="text-[15px] font-semibold">{{ rating.userDisplayName }}</span>
                            <nooks-stars [value]="rating.stars" [size]="11" />
                            <span class="text-[12.5px] text-ink-400">
                              sur
                              <a [routerLink]="['/carte']" [queryParams]="{ lieu: rating.placeId }" class="hover:underline">
                                {{ rating.placeName }}
                              </a>
                              · {{ formatDate(rating.updatedAt) }}
                              @if (rating.isEdited) {
                                · modifié
                              }
                            </span>
                            @if (rating.isRemoved) {
                              <span class="rounded-full bg-negative/10 px-2 py-0.5 text-[11.5px] font-semibold text-negative">
                                retiré
                              </span>
                            }
                          </p>
                          @if (rating.comment) {
                            <p class="mt-1.5 text-[14.5px] leading-snug text-ink-700">{{ rating.comment }}</p>
                          } @else {
                            <p class="mt-1.5 text-[14px] text-ink-400">Note sans commentaire.</p>
                          }
                        </div>

                        <div class="flex shrink-0 gap-2">
                          @if (rating.isRemoved) {
                            <button type="button" class="btn btn-secondary" [disabled]="busyId() === rating.id" (click)="restoreRating(rating)">
                              Restaurer
                            </button>
                          } @else {
                            <button type="button" class="btn btn-secondary" [disabled]="busyId() === rating.id" (click)="removeRating(rating)">
                              Retirer
                            </button>
                          }
                          <button
                            type="button"
                            class="btn btn-quiet text-negative"
                            [disabled]="busyId() === rating.id"
                            (click)="deleteRating(rating)"
                          >
                            Supprimer
                          </button>
                        </div>
                      </div>
                    </li>
                  }
                </ul>
              }
            }

            @default {
              @if (places().length === 0) {
                <div class="card px-6 py-10 text-center">
                  <p class="text-[15px] font-medium">
                    {{ section() === 'queue' ? 'Rien à valider pour le moment.' : 'Aucun lieu à afficher.' }}
                  </p>
                  @if (section() === 'queue') {
                    <p class="mt-2 text-[13.5px] text-ink-500">
                      En mode POC les lieux sont publiés directement, sauf ceux soupçonnés d'être des doublons.
                    </p>
                  }
                </div>
              } @else {
                <ul class="flex flex-col gap-2.5">
                  @for (place of places(); track place.id) {
                    <li class="card flex items-center gap-4 px-4 py-3.5">
                      @if (place.coverThumbnailUrl) {
                        <img [src]="place.coverThumbnailUrl" alt="" class="size-12 shrink-0 rounded-xl object-cover" />
                      } @else {
                        <span class="flex size-12 shrink-0 items-center justify-center rounded-xl bg-ink-100">
                          <nooks-symbol [category]="place.category" [size]="18" />
                        </span>
                      }

                      <div class="min-w-0 flex-1">
                        <p class="flex items-center gap-2 truncate text-[15.5px] font-semibold">
                          <a [routerLink]="['/carte']" [queryParams]="{ lieu: place.id }" class="truncate hover:underline">
                            {{ place.name }}
                          </a>
                          @if (place.suspectedDuplicate) {
                            <span class="shrink-0 rounded-full bg-ink-950 px-2 py-0.5 text-[11px] font-semibold text-white">
                              Doublon possible
                            </span>
                          }
                        </p>
                        <p class="text-[13px] text-ink-500">
                          {{ place.city }} · {{ label(place.category) }} · proposé le {{ formatDate(place.createdAt) }}
                        </p>
                      </div>

                      <div class="flex shrink-0 items-center gap-2">
                        @if (place.status === 'Pending') {
                          <button type="button" class="btn btn-secondary" [disabled]="busyId() === place.id" (click)="reject(place)">
                            Rejeter
                          </button>
                          <button type="button" class="btn btn-primary" [disabled]="busyId() === place.id" (click)="approve(place)">
                            Approuver
                          </button>
                        } @else {
                          <span
                            class="rounded-full px-3 py-1 text-[12.5px] font-semibold"
                            [class]="place.status === 'Approved' ? 'bg-positive/10 text-positive' : 'bg-negative/10 text-negative'"
                          >
                            {{ place.status === 'Approved' ? 'Approuvé' : 'Rejeté' }}
                          </span>
                        }
                        <button
                          type="button"
                          class="btn btn-quiet text-negative"
                          [disabled]="busyId() === place.id"
                          (click)="deletePlace(place)"
                        >
                          Supprimer
                        </button>
                      </div>
                    </li>
                  }
                </ul>
              }
            }
          }
        }
      </div>
    </main>
  `,
})
export class AdminPage {
  private readonly places_ = inject(PlacesApi);
  private readonly api = inject(MembersApi);

  protected readonly sections: { id: Section; label: string }[] = [
    { id: 'queue', label: 'File d’attente' },
    { id: 'places', label: 'Lieux publiés' },
    { id: 'reviews', label: 'Avis' },
    { id: 'members', label: 'Membres' },
  ];

  protected readonly section = signal<Section>('queue');
  protected readonly places = signal<PlaceSummary[]>([]);
  protected readonly ratings = signal<AdminRating[]>([]);
  protected readonly members = signal<AdminMember[]>([]);
  protected readonly loading = signal(true);
  protected readonly busyId = signal<string | null>(null);
  protected readonly removedOnly = signal(false);
  protected readonly pendingCount = signal(0);

  constructor() {
    this.load();
    this.refreshPendingCount();
  }

  protected switchTo(section: Section): void {
    this.section.set(section);
    this.load();
  }

  protected toggleRemovedOnly(): void {
    this.removedOnly.update((value) => !value);
    this.load();
  }

  protected approve(place: PlaceSummary): void {
    this.run(place.id, this.places_.approve(place.id));
  }

  protected reject(place: PlaceSummary): void {
    this.run(place.id, this.places_.reject(place.id));
  }

  protected deletePlace(place: PlaceSummary): void {
    this.run(place.id, this.api.deletePlace(place.id));
  }

  protected removeRating(rating: AdminRating): void {
    this.run(rating.id, this.api.removeRating(rating.placeId, rating.id));
  }

  protected restoreRating(rating: AdminRating): void {
    this.run(rating.id, this.api.restoreRating(rating.placeId, rating.id));
  }

  protected deleteRating(rating: AdminRating): void {
    this.run(rating.id, this.api.deleteRating(rating.placeId, rating.id));
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

  private run(id: string, request: Observable<PlaceDetail | void>): void {
    this.busyId.set(id);
    request.subscribe({
      next: () => {
        this.busyId.set(null);
        this.load();
        this.refreshPendingCount();
      },
      error: () => this.busyId.set(null),
    });
  }

  private load(): void {
    this.loading.set(true);

    switch (this.section()) {
      case 'members':
        this.api.members().subscribe({
          next: (members) => this.settle(() => this.members.set(members)),
          error: () => this.loading.set(false),
        });
        break;

      case 'reviews':
        this.api.ratings(this.removedOnly()).subscribe({
          next: (ratings) => this.settle(() => this.ratings.set(ratings)),
          error: () => this.loading.set(false),
        });
        break;

      default: {
        const status: PlaceStatus = this.section() === 'queue' ? 'Pending' : 'Approved';
        this.places_.moderationQueue(status).subscribe({
          next: (places) => this.settle(() => this.places.set(places)),
          error: () => this.loading.set(false),
        });
      }
    }
  }

  private refreshPendingCount(): void {
    this.places_.moderationQueue('Pending').subscribe({
      next: (places) => this.pendingCount.set(places.length),
      error: () => this.pendingCount.set(0),
    });
  }

  private settle(apply: () => void): void {
    apply();
    this.loading.set(false);
  }
}
