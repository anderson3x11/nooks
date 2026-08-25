/** Fonds de carte proposés, tous utilisables sans clé d'API. */
export interface Basemap {
  readonly id: string;
  readonly label: string;
  readonly url: string;
  readonly attribution: string;
  /** Aperçu de la pastille dans le sélecteur : deux tons dominants du fond. */
  readonly swatch: [string, string];
  readonly dark?: boolean;
}

const CARTO = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attributions">CARTO</a>';
const OSM = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

export const BASEMAPS: readonly Basemap[] = [
  {
    id: 'positron',
    label: 'Épuré',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: CARTO,
    swatch: ['#f7f7f5', '#d9d9d6'],
  },
  {
    id: 'voyager',
    label: 'Détaillé',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: CARTO,
    swatch: ['#f2efe9', '#bcd9c8'],
  },
  {
    id: 'dark',
    label: 'Sombre',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: CARTO,
    swatch: ['#26282b', '#4a4d52'],
  },
  {
    id: 'osm',
    label: 'Classique',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: OSM,
    swatch: ['#e9e3d8', '#aad3a0'],
  },
];

export const DEFAULT_BASEMAP = BASEMAPS[0];

export function basemapById(id: string | null): Basemap {
  return BASEMAPS.find((basemap) => basemap.id === id) ?? DEFAULT_BASEMAP;
}
