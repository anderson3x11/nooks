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
  { id: 'Viewpoint', label: 'Point de vue', color: '#e07a1f', path: TRIANGLE },
  { id: 'Curiosity', label: 'Curiosité', color: '#7b5bc4', path: ASTERISK },
  { id: 'Museum', label: 'Musée', color: '#2f6fd0', path: CIRCLE },
  { id: 'StreetArt', label: 'Street art', color: '#d63b32', path: DIAMOND },
  { id: 'Nature', label: 'Nature', color: '#3f8f52', path: HEXAGON },
  { id: 'Shop', label: 'Boutique', color: '#b8388f', path: SQUARE },
  { id: 'FoodDrink', label: 'Boire et manger', color: '#b08307', path: STAR },
  { id: 'Abandoned', label: 'Abandonné', color: '#6b6a78', path: PLUS },
  { id: 'Other', label: 'Autre', color: '#5f5f5f', path: DOT },
];

const byId = new Map<PlaceCategory, CategoryStyle>(CATEGORIES.map((category) => [category.id, category]));

export function categoryStyle(id: PlaceCategory): CategoryStyle {
  return byId.get(id) ?? CATEGORIES[CATEGORIES.length - 1];
}

/** Dimensions de l'icône Leaflet : la pointe de la tige tombe sur la position exacte. */
export const PIN_SIZE: [number, number] = [46, 60];
export const PIN_ANCHOR: [number, number] = [23, 60];

/**
 * Marqueur : la photo du lieu dans une pastille ronde cerclée de la couleur de
 * sa catégorie, posée sur une tige. Rendu en chaîne parce que Leaflet injecte
 * lui-même le contenu de ses icônes.
 */
export function pinHtml(id: PlaceCategory, photoUrl: string | null): string {
  const style = categoryStyle(id);
  const inside = photoUrl
    ? `<img src="${photoUrl}" alt="" decoding="async" />`
    : `<svg width="18" height="18" viewBox="0 0 12 12" aria-hidden="true"><path d="${style.path}" fill="${style.color}"/></svg>`;

  return `<div class="nooks-pin__inner" style="--pin-color:${style.color}">
    <div class="nooks-pin__bubble">${inside}</div>
    <span class="nooks-pin__stem"></span>
  </div>`;
}

/** Épingle provisoire du lieu en cours de création : noire, avec un réticule. */
export function draftPinHtml(): string {
  return `<div class="nooks-pin__inner" style="--pin-color:#0a0a0a">
    <div class="nooks-pin__bubble">
      <svg width="18" height="18" viewBox="0 0 12 12" aria-hidden="true">
        <path d="M6 1.4v9.2M1.4 6h9.2" stroke="#0a0a0a" stroke-width="1.6" stroke-linecap="round"/>
      </svg>
    </div>
    <span class="nooks-pin__stem"></span>
  </div>`;
}
