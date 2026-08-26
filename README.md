# Nooks

Une carte de lieux insolites remplie par ceux qui les connaissent : points de vue oubliés, boutiques bizarres, cabinets de curiosités, passages couverts. On cherche une ville, on filtre, on tombe sur des endroits qui ne sont dans aucun guide.

Projet perso, .NET et Angular.

**En ligne : <https://u8h6bwbgqa9o3useshw759vc.92.222.72.240.sslip.io>** (adresse fournie automatiquement par Coolify en attendant un vrai nom de domaine)

![Homepage](docs/accueil.png)

<p align="center">
  <img src="docs/carte.png" alt="La carte et la fiche d'un lieu" width="76%" />
  <img src="docs/mobile.png" alt="La carte sur telephone" width="22%" />
</p>

## Stack

- **API** ASP.NET Core 10, Minimal API
- **Base** PostgreSQL 17 + PostGIS, EF Core 10 avec NetTopologySuite
- **Front** Angular 21 (standalone, signals, zoneless) + Tailwind 4
- **Carte** Leaflet + markercluster, fonds CARTO et OpenStreetMap
- **Auth** ASP.NET Core Identity, jetons JWT
- **Images** SkiaSharp, réencodage en WebP
- **Tests** xUnit, Testcontainers

Une seule image Docker : l'API sert aussi le front Angular.

## Que faire sur Nooks ?

- Chercher une ville, filtrer par catégorie et par note.
- Proposer un lieu en cliquant sur la carte. Une photo est obligatoire, c'est elle qui devient le marqueur.
- Noter de 1 à 5 avec un avis. Un seul par personne et par lieu, modifiable.
- Mettre des lieux en favori, remplir une page de profil.
- Côté admin : file de modération, suppression de lieux et d'avis.

Deux trucs que j'ai eu envie de soigner.

**Les doublons.** Sur une carte ouverte à tous, le même endroit finit posté cinq fois. Le formulaire prévient dès qu'il repère un lieu du même nom à moins de 500 m, ou de la même catégorie à moins de 75 m, et propose de noter l'existant plutôt que d'en créer un second. Si on insiste quand même, le lieu part en modération.

**La recherche spatiale.** La carte envoie le rectangle qu'elle affiche, l'API en fait un polygone PostGIS :

```csharp
var polygon = query.Bounds.ToPolygon();
var places = context.Places
    .Where(p => p.Status == PlaceStatus.Approved)
    .Where(p => p.Location.Intersects(polygon));   // ST_Intersects, sur l'index GiST
```

Le rectangle est borné côté serveur, pour qu'une requête trop large ne ramène pas toute la base.


## Structure

```
src/
  Nooks.Core/             entités et règles métier, sans dépendance technique
  Nooks.Infrastructure/   EF Core, Identity, Nominatim, stockage des photos
  Nooks.Api/              endpoints, auth, seed
tests/                    unitaires, plus intégration sur un PostGIS jetable
client/                   Angular
```

Les règles métier (une note par personne, moyenne recalculée, bornes des coordonnées) vivent dans l'agrégat `Place`, pas dans les endpoints.

## Limites

C'est un POC, pas un service en production :

- Le jeton JWT est stocké dans le navigateur, donc exposé au XSS. Un cookie `HttpOnly` serait mieux.
- Pas de limitation de débit sur l'API.
- Les photos sont en base. Pratique à héberger, mais ça ne passera pas l'échelle.
- Les fonds de carte sont sur des offres gratuites qui ne couvrent pas un vrai trafic.
- Les coordonnées du jeu de démo sont approximatives à quelques dizaines de mètres.
- La détection de doublons compare des noms : deux noms très différents pour le même endroit passeront à travers.
