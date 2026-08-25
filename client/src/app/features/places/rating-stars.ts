import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

const STAR_PATH = 'M6 1 7.5 4.4 11.2 4.8 8.4 7.3 9.2 11 6 9.1 2.8 11 3.6 7.3 0.8 4.8 4.5 4.4Z';

/**
 * Cinq étoiles, remplies au prorata de la note : 4,3 affiche quatre étoiles pleines
 * et 30 % de la cinquième. Chaque étoile est dessinée deux fois, la version pleine
 * étant révélée par un masque de largeur variable.
 */
@Component({
  selector: 'nooks-stars',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet],
  template: `
    <div class="inline-flex items-center gap-2">
      <div class="inline-flex items-center" [class.gap-1]="interactive()">
        @for (star of stars; track star) {
          @if (interactive()) {
            <button
              type="button"
              class="cursor-pointer p-0.5 transition-transform duration-150 hover:scale-115 active:scale-95"
              [attr.aria-label]="star + ' étoile' + (star > 1 ? 's' : '')"
              (mouseenter)="hovered.set(star)"
              (mouseleave)="hovered.set(null)"
              (click)="rated.emit(star)"
            >
              <ng-container *ngTemplateOutlet="glyph; context: { $implicit: star }" />
            </button>
          } @else {
            <ng-container *ngTemplateOutlet="glyph; context: { $implicit: star }" />
          }
        }
      </div>

      @if (count() !== null) {
        <span class="text-[13px] text-ink-500">
          @if (count() === 0) {
            pas encore noté
          } @else {
            <span class="font-semibold text-ink-900">{{ value().toFixed(1) }}</span>
            · {{ count() }} avis
          }
        </span>
      }
    </div>

    <ng-template #glyph let-star>
      <span class="relative block" [style.width.px]="size()" [style.height.px]="size()">
        <svg
          [attr.width]="size()"
          [attr.height]="size()"
          viewBox="0 0 12 12"
          class="block"
          aria-hidden="true"
        >
          <path [attr.d]="path" fill="#d4d4d4" />
        </svg>

        @if (fillOf(star) > 0) {
          <span class="absolute inset-y-0 left-0 overflow-hidden" [style.width.%]="fillOf(star) * 100">
            <svg
              [attr.width]="size()"
              [attr.height]="size()"
              viewBox="0 0 12 12"
              class="block max-w-none"
              aria-hidden="true"
            >
              <path [attr.d]="path" fill="#0a0a0a" />
            </svg>
          </span>
        }
      </span>
    </ng-template>
  `,
})
export class RatingStars {
  readonly value = input(0);
  readonly count = input<number | null>(null);
  readonly interactive = input(false);
  readonly size = input(14);

  readonly rated = output<number>();

  protected readonly path = STAR_PATH;
  protected readonly stars = [1, 2, 3, 4, 5];
  protected readonly hovered = signal<number | null>(null);

  /** Au survol, l'aperçu montre des étoiles entières : c'est ce qu'on s'apprête à donner. */
  protected readonly shown = computed(() => this.hovered() ?? this.value());

  /** Part remplie de l'étoile numéro `star`, entre 0 et 1. */
  protected fillOf(star: number): number {
    return Math.min(1, Math.max(0, this.shown() - (star - 1)));
  }
}
