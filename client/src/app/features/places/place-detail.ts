import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Auth } from '../../core/auth';
import { categoryStyle } from '../../core/categories';
import { PlaceDetail } from '../../core/models';
import { CategorySymbol } from '../../shared/category-symbol';
import { RatingStars } from './rating-stars';

/** Fiche d'un lieu, ouverte en panneau latéral pour garder la carte visible. */
@Component({
  selector: 'nooks-place-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RatingStars, CategorySymbol, RouterLink],
  template: `
    @let item = place();
    @if (item) {
      <article class="plate grain animate-slide-in flex max-h-full w-96 flex-col overflow-hidden">
        <header class="relative shrink-0">
          @if (cover(); as photo) {
            <img [src]="photo" alt="" class="h-44 w-full object-cover" />
          } @else {
            <div
              class="flex h-24 w-full items-center justify-center"
              [style.background]="'linear-gradient(135deg, ' + tint() + '22, ' + tint() + '08)'"
            >
              <nooks-symbol [category]="item.category" [size]="34" />
            </div>
          }

          <button
            type="button"
            class="absolute top-2 right-2 flex size-7 cursor-pointer items-center justify-center rounded-full bg-paper-100/90 text-ink-700 shadow-sm transition-colors hover:bg-paper-200"
            aria-label="Fermer la fiche"
            (click)="closed.emit()"
          >
            <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true">
              <path d="M1 1 11 11M11 1 1 11" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
            </svg>
          </button>
        </header>

        <div class="min-h-0 flex-1 overflow-y-auto">
          <div class="px-5 pt-4">
            <div class="mb-2 flex items-center gap-1.5">
              <nooks-symbol [category]="item.category" [size]="11" />
              <span class="label-caps" [style.color]="tint()">{{ categoryLabel() }}</span>
              <span class="text-ink-400">·</span>
              <span class="text-[11px] text-ink-400">{{ item.city }}</span>
            </div>

            <h2 class="text-[22px] leading-tight text-ink-900">{{ item.name }}</h2>

            <div class="mt-2">
              <nooks-stars [value]="item.averageRating" [count]="item.ratingCount" />
            </div>

            <p class="mt-3 text-[14px] leading-relaxed text-ink-700">{{ item.description }}</p>

            @if (item.address) {
              <p class="mt-3 flex items-start gap-1.5 text-[12px] text-ink-400">
                <svg width="12" height="12" viewBox="0 0 12 12" class="mt-0.5 shrink-0" aria-hidden="true">
                  <path
                    d="M6 1a3.6 3.6 0 0 0-3.6 3.6C2.4 7.2 6 11 6 11s3.6-3.8 3.6-6.4A3.6 3.6 0 0 0 6 1Z"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.1"
                  />
                  <circle cx="6" cy="4.6" r="1.2" fill="currentColor" />
                </svg>
                {{ item.address }}
              </p>
            }

            <p class="mt-1 text-[12px] text-ink-400">
              Proposé par <span class="font-semibold text-ink-600">{{ item.createdByDisplayName }}</span> le
              {{ formatDate(item.createdAt) }}
            </p>
          </div>

          @if (item.photos.length > 0) {
            <div class="mt-4 flex gap-1.5 overflow-x-auto px-5 pb-1">
              @for (photo of item.photos; track photo.id) {
                <img [src]="photo.thumbnailUrl" alt="" class="size-16 shrink-0 rounded-sm object-cover" />
              }
            </div>
          }

          <div class="rule mx-5 my-4"></div>

          <div class="px-5 pb-5">
            @if (auth.isSignedIn()) {
              <div class="label-caps mb-2 text-ink-400">{{ myRating() ? 'Votre note' : 'Noter ce lieu' }}</div>
              <nooks-stars [value]="myRating()?.stars ?? 0" [size]="20" [interactive]="true" (rated)="submit($event)" />

              <textarea
                rows="2"
                class="field mt-2 resize-none"
                placeholder="Un mot sur ce lieu (facultatif)"
                [value]="comment()"
                (input)="comment.set($any($event.target).value)"
              ></textarea>

              <div class="mt-2 flex items-center gap-2">
                <label class="btn btn-ghost">
                  Ajouter une photo
                  <input type="file" accept="image/*" class="hidden" (change)="pickPhoto($event)" />
                </label>
                @if (busy()) {
                  <span class="text-[12px] text-ink-400">Envoi…</span>
                }
              </div>
            } @else {
              <p class="text-[13px] text-ink-600">
                <a routerLink="/connexion" class="font-semibold text-signal-700 underline">Connectez-vous</a>
                pour noter ce lieu ou y ajouter une photo.
              </p>
            }

            @if (item.ratings.length > 0) {
              <div class="rule my-4"></div>
              <div class="label-caps mb-2 text-ink-400">Avis</div>
              <ul class="flex flex-col gap-3">
                @for (rating of item.ratings; track rating.id) {
                  <li>
                    <div class="flex items-center gap-2">
                      <span class="text-[13px] font-semibold text-ink-900">{{ rating.userDisplayName }}</span>
                      <nooks-stars [value]="rating.stars" [size]="11" />
                    </div>
                    @if (rating.comment) {
                      <p class="mt-0.5 text-[13px] leading-snug text-ink-600">{{ rating.comment }}</p>
                    }
                  </li>
                }
              </ul>
            }
          </div>
        </div>
      </article>
    }
  `,
})
export class PlaceDetailPanel {
  protected readonly auth = inject(Auth);

  readonly place = input<PlaceDetail | null>(null);
  readonly busy = input(false);

  readonly closed = output<void>();
  readonly rated = output<{ stars: number; comment: string | null }>();
  readonly photoPicked = output<File>();

  protected readonly comment = signal('');

  protected readonly tint = computed(() => {
    const item = this.place();
    return item ? categoryStyle(item.category).color : '#6b6259';
  });

  protected readonly categoryLabel = computed(() => {
    const item = this.place();
    return item ? categoryStyle(item.category).label : '';
  });

  protected readonly cover = computed(() => this.place()?.photos.find((photo) => photo.isCover)?.url ?? null);

  /** L'avis déjà laissé par le membre connecté, s'il y en a un. */
  protected readonly myRating = computed(() => {
    const userId = this.auth.user()?.id;
    return userId ? (this.place()?.ratings.find((rating) => rating.userId === userId) ?? null) : null;
  });

  constructor() {
    // Changer de lieu remet le brouillon de commentaire à celui déjà écrit ici, ou à vide.
    effect(() => {
      this.place();
      this.comment.set(this.myRating()?.comment ?? '');
    });
  }

  protected submit(stars: number): void {
    const comment = this.comment().trim();
    this.rated.emit({ stars, comment: comment.length > 0 ? comment : null });
  }

  protected pickPhoto(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.photoPicked.emit(file);
    }
    input.value = '';
  }

  protected formatDate(value: string): string {
    return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(value));
  }
}
