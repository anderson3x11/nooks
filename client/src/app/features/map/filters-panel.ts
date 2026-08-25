import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CATEGORIES } from '../../core/categories';
import { PlaceCategory, PlaceFilters } from '../../core/models';
import { CategorySymbol } from '../../shared/category-symbol';

/**
 * Panneau de filtres qui sert aussi de légende : chaque puce montre le symbole
 * et la couleur qu'on retrouve sur les marqueurs de la carte.
 */
@Component({
  selector: 'nooks-filters',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CategorySymbol],
  template: `
    <section class="card w-80 overflow-hidden">
      <header class="flex items-center justify-between px-5 pt-4 pb-3">
        <h2 class="text-[16px]">Filtres</h2>
        @if (isFiltered()) {
          <button type="button" class="cursor-pointer text-[13px] font-semibold text-ink-500 hover:text-ink-900" (click)="reset()">
            Réinitialiser
          </button>
        }
      </header>

      <div class="px-5 pb-4">
        <input
          type="search"
          class="field"
          placeholder="Mot-clé (traboule, fresque…)"
          [value]="filters().text"
          (input)="setText($event)"
        />
      </div>

      <div class="divider"></div>

      <div class="px-5 py-4">
        <div class="label-caps mb-3">Catégories</div>
        <div class="flex flex-wrap gap-1.5">
          @for (category of categories; track category.id) {
            <button type="button" class="chip" [attr.aria-pressed]="isActive(category.id)" (click)="toggleCategory(category.id)">
              <nooks-symbol
                [category]="category.id"
                [size]="11"
                [color]="isActive(category.id) ? '#ffffff' : null"
              />
              {{ category.label }}
              @if (countOf(category.id) > 0) {
                <span class="text-[11.5px] tabular-nums" [class]="isActive(category.id) ? 'text-ink-300' : 'text-ink-400'">
                  {{ countOf(category.id) }}
                </span>
              }
            </button>
          }
        </div>
      </div>

      <div class="divider"></div>

      <div class="px-5 py-4">
        <div class="label-caps mb-3">Note minimale</div>
        <div class="segment w-full">
          @for (threshold of thresholds; track $index) {
            <button
              type="button"
              class="flex-1"
              [attr.aria-pressed]="filters().minRating === threshold"
              (click)="setMinRating(threshold)"
            >
              {{ threshold === null ? 'Toutes' : threshold + '★' }}
            </button>
          }
        </div>
      </div>
    </section>
  `,
})
export class FiltersPanel {
  readonly filters = input.required<PlaceFilters>();
  /** Répartition des lieux visibles par catégorie, pour donner du contexte aux puces. */
  readonly counts = input<Record<string, number>>({});

  readonly filtersChanged = output<PlaceFilters>();

  protected readonly categories = CATEGORIES;
  protected readonly thresholds: (number | null)[] = [null, 3, 4, 4.5];

  protected isActive(id: PlaceCategory): boolean {
    return this.filters().categories.includes(id);
  }

  protected isFiltered(): boolean {
    const filters = this.filters();
    return filters.categories.length > 0 || filters.minRating !== null || filters.text.length > 0;
  }

  protected countOf(id: PlaceCategory): number {
    return this.counts()[id] ?? 0;
  }

  protected setText(event: Event): void {
    this.filtersChanged.emit({ ...this.filters(), text: (event.target as HTMLInputElement).value });
  }

  protected toggleCategory(id: PlaceCategory): void {
    const current = this.filters();
    const categories = current.categories.includes(id)
      ? current.categories.filter((category) => category !== id)
      : [...current.categories, id];

    this.filtersChanged.emit({ ...current, categories });
  }

  protected setMinRating(minRating: number | null): void {
    this.filtersChanged.emit({ ...this.filters(), minRating });
  }

  protected reset(): void {
    this.filtersChanged.emit({ categories: [], minRating: null, text: '' });
  }
}
