import { PlaceCategory } from './models';

/**
 * Chaque catégorie a une couleur et un symbole abstrait, comme sur la légende
 * d'une carte papier. Le symbole reste lisible à 12 pixels, là où une icône
 * figurative deviendrait une tache.
 *
 * Tous les symboles sont des tracés dans un repère de 12 x 12 centré sur (6, 6),
 * pour qu'un seul élément <path> suffise à les dessiner tous.
 */
export interface CategoryStyle {
  readonly id: PlaceCategory;
  readonly label: string;
  readonly color: string;
  readonly path: string;
}

const TRIANGLE = 'M6 1.6 10.6 9.8 1.4 9.8Z';
const SQUARE = 'M2.4 2.4h7.2v7.2H2.4Z';
const CIRCLE = 'M6 1.9a4.1 4.1 0 1 0 0 8.2 4.1 4.1 0 1 0 0-8.2Z';
const DIAMOND = 'M6 1.4 10.6 6 6 10.6 1.4 6Z';
const HEXAGON = 'M6 1.4 10.2 3.8v4.4L6 10.6 1.8 8.2V3.8Z';
const PLUS = 'M4.5 1.6h3v2.9h2.9v3H7.5v2.9h-3V7.5H1.6v-3h2.9Z';
const STAR = 'M6 1 7.5 4.4 11.2 4.8 8.4 7.3 9.2 11 6 9.1 2.8 11 3.6 7.3 0.8 4.8 4.5 4.4Z';
const ASTERISK =
  'M5.2 1.3h1.6v3.1l2.2-2.2 1.1 1.1-2.2 2.2h3.1v1.6H7.9l2.2 2.2-1.1 1.1-2.2-2.2v3.1H5.2V8.2L3 10.4 1.9 9.3l2.2-2.2H1V5.5h3.1L1.9 3.3 3 2.2l2.2 2.2Z';
const DOT = 'M6 3.3a2.7 2.7 0 1 0 0 5.4 2.7 2.7 0 1 0 0-5.4Z';

export const CATEGORIES: readonly CategoryStyle[] = [
  { id: 'Viewpoint', label: 'Point de vue', color: '#dd8438', path: TRIANGLE },
  { id: 'Curiosity', label: 'Curiosité', color: '#7b5bc4', path: ASTERISK },
  { id: 'Museum', label: 'Musée', color: '#3b6fb6', path: CIRCLE },
  { id: 'StreetArt', label: 'Street art', color: '#c8483c', path: DIAMOND },
  { id: 'Nature', label: 'Nature', color: '#4e8b5a', path: HEXAGON },
  { id: 'Shop', label: 'Boutique', color: '#b4478a', path: SQUARE },
  { id: 'FoodDrink', label: 'Boire et manger', color: '#b8931f', path: STAR },
  { id: 'Abandoned', label: 'Abandonné', color: '#6f6d7a', path: PLUS },
  { id: 'Other', label: 'Autre', color: '#6b6259', path: DOT },
];

const byId = new Map<PlaceCategory, CategoryStyle>(CATEGORIES.map((category) => [category.id, category]));

export function categoryStyle(id: PlaceCategory): CategoryStyle {
  return byId.get(id) ?? CATEGORIES[CATEGORIES.length - 1];
}

/**
 * Goutte ancrée par sa pointe sur la position exacte du lieu.
 * Rendue en chaîne parce que Leaflet injecte lui-même le contenu de ses icônes.
 */
export function pinSvg(id: PlaceCategory): string {
  const style = categoryStyle(id);
  return `<svg width="28" height="36" viewBox="0 0 28 36" fill="none" aria-hidden="true">
    <path d="M14 1.2C7.4 1.2 2 6.6 2 13.2c0 8.4 10.2 19.5 11.1 20.4a1.3 1.3 0 0 0 1.8 0C15.8 32.7 26 21.6 26 13.2 26 6.6 20.6 1.2 14 1.2Z" fill="${style.color}" stroke="#191512" stroke-width="1.4"/>
    <path d="${style.path}" transform="translate(8 7)" fill="#f5f0e6"/>
  </svg>`;
}

/** Épingle provisoire du lieu en cours de création : ambre, réticule, pas une catégorie. */
export function draftPinSvg(): string {
  return `<svg width="28" height="36" viewBox="0 0 28 36" fill="none" aria-hidden="true">
    <path d="M14 1.2C7.4 1.2 2 6.6 2 13.2c0 8.4 10.2 19.5 11.1 20.4a1.3 1.3 0 0 0 1.8 0C15.8 32.7 26 21.6 26 13.2 26 6.6 20.6 1.2 14 1.2Z" fill="#dd8438" stroke="#191512" stroke-width="1.4"/>
    <g stroke="#191512" stroke-width="1.5" stroke-linecap="round">
      <path d="M14 8.6v9.2M9.4 13.2h9.2"/>
    </g>
  </svg>`;
}
