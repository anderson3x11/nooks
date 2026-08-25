import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { categoryStyle } from '../core/categories';
import { PlaceSummary } from '../core/models';
import { CategorySymbol } from './category-symbol';
import { RatingStars } from '../features/places/rating-stars';

/** Vignette d'un lieu : la même sur la page d'accueil et dans les compositions. */
@Component({
  selector: 'nooks-place-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CategorySymbol, RatingStars],
  template: `
    @let item = place();
    <div class="card overflow-hidden">
      @if (item.coverThumbnailUrl) {
        <img [src]="item.coverThumbnailUrl" alt="" [class]="'w-full object-cover ' + imageHeight()" />
      } @else {
        <span [class]="'flex w-full items-center justify-center bg-ink-100 ' + imageHeight()">
          <nooks-symbol [category]="item.category" [size]="26" />
        </span>
      }

      <div class="px-4 py-3.5">
        <div class="flex items-center gap-1.5">
          <nooks-symbol [category]="item.category" [size]="10" />
          <span class="text-[12px] font-semibold" [style.color]="tint()">{{ label() }}</span>
          <span class="text-[12px] text-ink-400">· {{ item.city }}</span>
        </div>
        <p class="mt-1 truncate text-[15.5px] font-semibold">{{ item.name }}</p>
        <div class="mt-1.5">
          <nooks-stars [value]="item.averageRating" [count]="item.ratingCount" [size]="11" />
        </div>
      </div>
    </div>
  `,
  host: { class: 'block' },
})
export class PlaceCard {
  readonly place = input.required<PlaceSummary>();
  readonly imageHeight = input('h-36');

  protected readonly label = computed(() => categoryStyle(this.place().category).label);
  protected readonly tint = computed(() => categoryStyle(this.place().category).color);
}
