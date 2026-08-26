import * as L from 'leaflet';

/**
 * Le greffon de regroupement de marqueurs référence une variable `L` globale qu'il
 * ne déclare nulle part : il attend Leaflet chargé par balise script, à l'ancienne.
 * En développement cela passait par hasard, mais le build de production optimisé
 * ne laisse plus rien dans la portée globale et `L.markerClusterGroup` disparaît.
 *
 * Ce module expose donc Leaflet avant que le greffon soit évalué. L'ordre compte :
 * les modules ES sont évalués dans l'ordre de leurs déclarations d'import, donc
 * tout fichier qui charge le greffon doit importer celui-ci en premier.
 */
(globalThis as typeof globalThis & { L?: typeof L }).L = L;

export { L };
