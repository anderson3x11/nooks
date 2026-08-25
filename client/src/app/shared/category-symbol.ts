import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { categoryStyle } from '../core/categories';
import { PlaceCategory } from '../core/models';

/** Le symbole de légende d'une catégorie, seul, à la taille demandée. */
@Component({
  selector: 'nooks-symbol',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg [attr.width]="size()" [attr.height]="size()" viewBox="0 0 12 12" aria-hidden="true">
      <path [attr.d]="style().path" [attr.fill]="color() ?? style().color" />
    </svg>
  `,
  host: { class: 'inline-flex' },
})
export class CategorySymbol {
  readonly category = input.required<PlaceCategory>();
  readonly size = input(13);
  /** Force une couleur, par exemple pour un symbole posé sur fond sombre. */
  readonly color = input<string | null>(null);

  protected readonly style = computed(() => categoryStyle(this.category()));
}
