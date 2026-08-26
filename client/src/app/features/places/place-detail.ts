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
      <article class="card card-float animate-panel flex max-h-[82dvh] w-full flex-col overflow-hidden rounded-b-none md:max-h-full md:w-[26rem] md:rounded-[20px]">
        <!-- Carrousel : la première photo est celle du marqueur, les autres suivent. -->
        <header class="relative shrink-0 bg-ink-100">
          @if (photos().length > 0) {
            <img [src]="photos()[index()].url" alt="" class="h-56 w-full object-cover" />

            @if (photos().length > 1) {
              <button
                type="button"
                class="btn-round absolute top-1/2 left-3 size-8 -translate-y-1/2"
                aria-label="Photo précédente"
                (click)="step(-1)"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                  <path d="M7.5 1.5 3 6l4.5 4.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </button>
              <button
                type="button"
                class="btn-round absolute top-1/2 right-3 size-8 -translate-y-1/2"
                aria-label="Photo suivante"
                (click)="step(1)"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                  <path d="M4.5 1.5 9 6l-4.5 4.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </button>

              <div class="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                @for (photo of photos(); track photo.id; let i = $index) {
                  <span
                    class="size-1.5 rounded-full transition-colors"
                    [class]="i === index() ? 'bg-white' : 'bg-white/45'"
                  ></span>
                }
              </div>
            }
          } @else {
            <div class="flex h-32 w-full items-center justify-center">
              <nooks-symbol [category]="item.category" [size]="30" />
            </div>
          }

          <div class="absolute top-3 right-3 flex gap-2">
            @if (auth.isSignedIn()) {
              <button
                type="button"
                class="btn-round size-8"
                [attr.aria-label]="item.isFavorite ? 'Retirer des favoris' : 'Mettre en favori'"
                [attr.aria-pressed]="item.isFavorite"
                (click)="favoriteToggled.emit()"
              >
                <svg width="13" height="13" viewBox="0 0 14 14" aria-hidden="true">
                  <path
                    d="M3.4 1.6h7.2v10.8L7 9.9l-3.6 2.5Z"
                    [attr.fill]="item.isFavorite ? '#0a0a0a' : 'none'"
                    stroke="currentColor"
                    stroke-width="1.4"
                    stroke-linejoin="round"
                  />
                </svg>
              </button>
            }

            <button type="button" class="btn-round size-8" aria-label="Fermer la fiche" (click)="closed.emit()">
              <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true">
                <path d="M1 1 11 11M11 1 1 11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
              </svg>
            </button>
          </div>

          @if (photos().length > 0 && photos()[index()].attribution; as credit) {
            <a
              [href]="photos()[index()].sourceUrl"
              target="_blank"
              rel="noopener"
              class="absolute bottom-0 left-0 max-w-full truncate bg-ink-950/60 px-2.5 py-1 text-[10.5px] text-white/90 hover:text-white"
            >
              {{ credit }}
            </a>
          }
        </header>

        <div class="scroll-quiet min-h-0 flex-1 overflow-y-auto">
          <div class="px-5 pt-5">
            <div class="mb-2.5 flex items-center gap-2">
              <span
                class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold"
                [style.background]="tint() + '18'"
                [style.color]="tint()"
              >
                <nooks-symbol [category]="item.category" [size]="10" />
                {{ categoryLabel() }}
              </span>
              <span class="text-[13px] text-ink-500">{{ item.city }}</span>
            </div>

            <h2 class="text-[24px]">{{ item.name }}</h2>

            <div class="mt-2.5">
              <nooks-stars [value]="item.averageRating" [count]="item.ratingCount" />
            </div>

            @if (loading() && !item.description) {
              <div class="mt-4 flex flex-col gap-2" aria-hidden="true">
                <span class="h-3.5 w-full rounded-full bg-ink-100"></span>
                <span class="h-3.5 w-11/12 rounded-full bg-ink-100"></span>
                <span class="h-3.5 w-8/12 rounded-full bg-ink-100"></span>
              </div>
            } @else {
              <p class="mt-4 text-[14.5px] leading-relaxed text-ink-700">{{ item.description }}</p>
            }

            @if (item.address) {
              <p class="mt-4 flex items-start gap-2 text-[13px] text-ink-500">
                <svg width="13" height="13" viewBox="0 0 12 12" class="mt-0.5 shrink-0" aria-hidden="true">
                  <path
                    d="M6 1a3.6 3.6 0 0 0-3.6 3.6C2.4 7.2 6 11 6 11s3.6-3.8 3.6-6.4A3.6 3.6 0 0 0 6 1Z"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.2"
                  />
                  <circle cx="6" cy="4.6" r="1.2" fill="currentColor" />
                </svg>
                {{ item.address }}
              </p>
            }

            @if (item.createdByDisplayName) {
              <p class="mt-4 flex items-center gap-2 text-[13px] text-ink-500">
                <span class="flex size-6 items-center justify-center rounded-full bg-ink-900 text-[11px] font-bold text-white">
                  {{ initial(item.createdByDisplayName) }}
                </span>
                Proposé par <span class="font-semibold text-ink-900">{{ item.createdByDisplayName }}</span>
                le {{ formatDate(item.createdAt) }}
              </p>
            }
          </div>

          @if (!loading()) {
            <div class="divider mt-5"></div>
          }

          <div class="px-5 py-5" [class.hidden]="loading()">
            @if (auth.isSignedIn()) {
              <div class="label-caps mb-2">{{ myRating() ? 'Votre note' : 'Noter ce lieu' }}</div>
              <nooks-stars [value]="myRating()?.stars ?? 0" [size]="22" [interactive]="true" (rated)="submit($event)" />

              <textarea
                rows="2"
                class="field mt-3 resize-none"
                placeholder="Un mot sur ce lieu (facultatif)"
                [value]="comment()"
                (input)="comment.set($any($event.target).value)"
              ></textarea>

              <div class="mt-3 flex items-center gap-3">
                <label class="btn btn-secondary cursor-pointer">
                  Ajouter une photo
                  <input type="file" accept="image/*" class="hidden" (change)="pickPhoto($event)" />
                </label>
                @if (busy()) {
                  <span class="text-[13px] text-ink-500">Envoi…</span>
                }
              </div>
            } @else {
              <p class="text-[14px] text-ink-700">
                <a routerLink="/connexion" class="font-semibold text-ink-900 underline underline-offset-2">Connectez-vous</a>
                pour noter ce lieu ou y ajouter une photo.
              </p>
            }

            @if (item.ratings.length > 0) {
              <div class="divider my-5"></div>
              <div class="label-caps mb-3">{{ item.ratings.length }} avis</div>
              <ul class="flex flex-col gap-4">
                @for (rating of item.ratings; track rating.id) {
                  <li class="flex gap-3">
                    <span
                      class="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-ink-100 text-[12px] font-bold text-ink-700"
                    >
                      {{ initial(rating.userDisplayName) }}
                    </span>
                    <div class="min-w-0">
                      <div class="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span class="text-[14px] font-semibold">{{ rating.userDisplayName }}</span>
                        <nooks-stars [value]="rating.stars" [size]="11" />
                        <span class="text-[12px] text-ink-400">
                          {{ formatDate(rating.updatedAt) }}
                          @if (rating.isEdited) {
                            · modifié
                          }
                        </span>
                      </div>
                      @if (rating.comment) {
                        <p class="mt-0.5 text-[14px] leading-snug text-ink-700">{{ rating.comment }}</p>
                      }
                    </div>
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
  /** Fiche ouverte avec les données de la carte, en attendant le détail complet. */
  readonly loading = input(false);

  readonly closed = output<void>();
  readonly rated = output<{ stars: number; comment: string | null }>();
  readonly photoPicked = output<File>();
  readonly favoriteToggled = output<void>();

  protected readonly comment = signal('');
  protected readonly index = signal(0);

  /** Photo de couverture en tête, le reste ensuite : c'est l'ordre du carrousel. */
  protected readonly photos = computed(() =>
    [...(this.place()?.photos ?? [])].sort((a, b) => Number(b.isCover) - Number(a.isCover)),
  );

  protected readonly tint = computed(() => {
    const item = this.place();
    return item ? categoryStyle(item.category).color : '#737373';
  });

  protected readonly categoryLabel = computed(() => {
    const item = this.place();
    return item ? categoryStyle(item.category).label : '';
  });

  /** L'avis déjà laissé par le membre connecté, s'il y en a un. */
  protected readonly myRating = computed(() => {
    const userId = this.auth.user()?.id;
    return userId ? (this.place()?.ratings.find((rating) => rating.userId === userId) ?? null) : null;
  });

  constructor() {
    // Changer de lieu remet le carrousel au début et recharge le commentaire déjà écrit.
    effect(() => {
      this.place();
      this.index.set(0);
      this.comment.set(this.myRating()?.comment ?? '');
    });
  }

  protected step(direction: number): void {
    const total = this.photos().length;
    if (total > 0) {
      this.index.update((current) => (current + direction + total) % total);
    }
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

  protected initial(name: string): string {
    return name.trim().charAt(0).toUpperCase();
  }

  protected formatDate(value: string): string {
    return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(value));
  }
}
