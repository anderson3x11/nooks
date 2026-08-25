import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

/** Cinq étoiles, en lecture seule par défaut, cliquables quand on veut noter. */
@Component({
  selector: 'nooks-stars',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="inline-flex items-center gap-2">
      <div class="inline-flex" [class.gap-0.5]="interactive()">
        @for (star of stars; track star) {
          @if (interactive()) {
            <button
              type="button"
              class="cursor-pointer p-0.5 transition-transform duration-150 hover:scale-115"
              [attr.aria-label]="star + ' étoile' + (star > 1 ? 's' : '')"
              (mouseenter)="hovered.set(star)"
              (mouseleave)="hovered.set(null)"
              (click)="rated.emit(star)"
            >
              <svg [attr.width]="size()" [attr.height]="size()" viewBox="0 0 12 12" aria-hidden="true">
                <path
                  d="M6 1 7.5 4.4 11.2 4.8 8.4 7.3 9.2 11 6 9.1 2.8 11 3.6 7.3 0.8 4.8 4.5 4.4Z"
                  [attr.fill]="star <= shown() ? '#dd8438' : 'transparent'"
                  stroke="#dd8438"
                  stroke-width="0.9"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
          } @else {
            <svg [attr.width]="size()" [attr.height]="size()" viewBox="0 0 12 12" aria-hidden="true">
              <path
                d="M6 1 7.5 4.4 11.2 4.8 8.4 7.3 9.2 11 6 9.1 2.8 11 3.6 7.3 0.8 4.8 4.5 4.4Z"
                [attr.fill]="star <= shown() ? '#dd8438' : 'transparent'"
                stroke="#dd8438"
                stroke-width="0.9"
                stroke-linejoin="round"
              />
            </svg>
          }
        }
      </div>

      @if (count() !== null) {
        <span class="text-xs text-ink-400">
          {{ count() === 0 ? 'pas encore noté' : value().toFixed(1) + ' · ' + count() + ' avis' }}
        </span>
      }
    </div>
  `,
})
export class RatingStars {
  readonly value = input(0);
  readonly count = input<number | null>(null);
  readonly interactive = input(false);
  readonly size = input(14);

  readonly rated = output<number>();

  protected readonly stars = [1, 2, 3, 4, 5];
  protected readonly hovered = signal<number | null>(null);

  /** Au survol, l'aperçu prend le pas sur la note réelle. */
  protected readonly shown = computed(() => this.hovered() ?? Math.round(this.value()));
}
