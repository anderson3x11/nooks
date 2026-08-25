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
    <section class="plate grain w-72 overflow-hidden">
      <header class="flex items-baseline justify-between px-4 pt-3">
        <h2 class="text-[15px] text-ink-900">Légende & filtres</h2>
        @if (isFiltered()) {
          <button type="button" class="label-caps cursor-pointer text-signal-700 hover:underline" (click)="reset()">
            Tout afficher
          </button>
        }
      </header>

      <div class="rule mx-4 mt-2"></div>

      <div class="px-4 pt-3">
        <input
          type="search"
          class="field"
          placeholder="Mot-clé (traboule, fresque…)"
          [value]="filters().text"
          (input)="setText($event)"
        />
      </div>

      <div class="flex flex-col gap-px px-2 py-2">
        @for (category of categories; track category.id) {
          <button
            type="button"
            class="flex cursor-pointer items-center gap-2.5 rounded-sm px-2 py-1.5 text-left text-[13px] transition-colors duration-150"
            [class]="isActive(category.id) ? 'bg-ink-900 text-paper-100' : 'text-ink-700 hover:bg-paper-200'"
            [attr.aria-pressed]="isActive(category.id)"
            (click)="toggleCategory(category.id)"
          >
            <nooks-symbol [category]="category.id" [size]="13" />
            <span class="flex-1">{{ category.label }}</span>
            @if (countOf(category.id) > 0) {
              <span
                class="text-[11px] tabular-nums"
                [class]="isActive(category.id) ? 'text-paper-300' : 'text-ink-400'"
                >{{ countOf(category.id) }}</span
              >
            }
          </button>
        }
      </div>

      <div class="rule mx-4"></div>

      <div class="px-4 py-3">
        <div class="label-caps mb-2 text-ink-400">Note minimale</div>
        <div class="flex gap-1">
          @for (threshold of thresholds; track $index) {
            <button
              type="button"
              class="flex-1 cursor-pointer rounded-sm border py-1 text-[12px] font-semibold transition-colors duration-150"
              [class]="
                filters().minRating === threshold
                  ? 'border-signal-600 bg-signal-500 text-ink-950'
                  : 'border-paper-300 text-ink-600 hover:bg-paper-200'
              "
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

  protected setText(event: Event): void {
    this.filtersChanged.emit({ ...this.filters(), text: (event.target as HTMLInputElement).value });
  }

  protected countOf(id: PlaceCategory): number {
    return this.counts()[id] ?? 0;
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
    this.filtersChanged.emit({ ...this.filters(), categories: [], minRating: null, text: '' });
  }
}
