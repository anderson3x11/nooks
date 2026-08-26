/** Fonds de carte proposés. */
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

// CARTO ne sert plus ses tuiles librement : sans clé, elles reviennent tamponnées
// « API KEY REQUIRED ». Celle-ci voyage dans le navigateur avec chaque tuile, elle n'a
// donc rien d'un secret : c'est le domaine déclaré à la demande qui la protège.
const CARTO_KEY = 'cb1_25mx_1_04909a11edb8f2f4f0537489';

const carto = (style: string) =>
  `https://basemaps.cartocdn.com/${style}/{z}/{x}/{y}{r}.png?key=${CARTO_KEY}`;

export const BASEMAPS: readonly Basemap[] = [
  {
    id: 'positron',
    label: 'Épuré',
    url: carto('light_all'),
    attribution: CARTO,
    swatch: ['#f7f7f5', '#d9d9d6'],
  },
  {
    id: 'voyager',
    label: 'Détaillé',
    url: carto('rastertiles/voyager'),
    attribution: CARTO,
    swatch: ['#f2efe9', '#bcd9c8'],
  },
  {
    id: 'dark',
    label: 'Sombre',
    url: carto('dark_all'),
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
