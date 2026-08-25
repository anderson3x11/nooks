# Nooks

Une carte collaborative de lieux insolites : points de vue oubliés, boutiques atypiques, cabinets de curiosités, passages couverts, friches réhabilitées. On cherche une ville, on filtre par catégorie et par note, et on tombe sur ce que les guides ne mentionnent pas.

Preuve de concept : le fond de carte est rempli par un jeu de données de départ, et n'importe quel membre inscrit peut proposer un lieu, le noter et y ajouter des photos.

## Stack

| Couche | Choix | Pourquoi |
|---|---|---|
| API | ASP.NET Core 10, Minimal API | Endpoints groupés par domaine, ProblemDetails, OpenAPI + Scalar |
| Persistance | EF Core 10 + Npgsql + NetTopologySuite | Les entités portent un vrai `Point` géographique |
| Base | PostgreSQL 17 + PostGIS | Index GiST : la recherche « lieux dans le rectangle visible » est une requête spatiale, pas un filtre en mémoire |
| Auth | ASP.NET Core Identity + JWT HS256 | Identity pour le stockage et le hachage, jetons portables vers une future app mobile |
| Front | Angular 21 (standalone, signals, zoneless) + Tailwind 4 | Un seul composant touche à Leaflet, le reste ne connaît que des lieux |
| Carte | Leaflet, fonds CARTO et OpenStreetMap | Marqueur = photo du lieu cerclée de la couleur de sa catégorie ; fond de carte au choix |
| Géocodage | Nominatim, en proxy côté serveur | Cache 24 h et limitation à 1 req/s, comme l'exige leur politique d'usage |
| Images | SkiaSharp | Réencodage en WebP + vignette, licence MIT |
| Tests | xUnit, WebApplicationFactory, Testcontainers | Les tests d'intégration tournent sur un vrai PostGIS jetable |

## Démarrer

Prérequis : .NET SDK 10, Node 20.19+ (ou 22.12+, ou 24+), Docker.

```bash
docker compose up -d                                                   # PostGIS sur le port 5433
dotnet ef database update -p src/Nooks.Infrastructure -s src/Nooks.Api
dotnet run --project src/Nooks.Api                                     # http://localhost:5001
cd client && npm install && npm start                                  # http://localhost:4200
```

Au premier démarrage en `Development`, la base est migrée puis remplie : 31 lieux répartis sur Paris, Lyon, Marseille et Bordeaux, trois comptes de démonstration et une soixantaine de notes.

Chaque lieu du jeu de départ reçoit une illustration abstraite générée à la volée. Ce ne sont volontairement pas des photographies : il n'existe pas de vraie photo libre de droits pour ces lieux, et une fausse photo tromperait le lecteur. Les lieux proposés par un membre portent, eux, ses vraies photos.

| Compte | Mot de passe | Rôle |
|---|---|---|
| `admin@nooks.local` | `Nooks!2026` | Admin + Membre |
| `camille@nooks.local` | `Nooks!2026` | Membre |
| `hugo@nooks.local` | `Nooks!2026` | Membre |

La documentation de l'API est sur <http://localhost:5001/scalar> en développement.

## Architecture

```
src/
  Nooks.Core/             entités, règles métier, DTOs, interfaces  (ne référence aucune techno)
  Nooks.Infrastructure/   EF Core, migrations, Identity, Nominatim, stockage des photos
  Nooks.Api/              endpoints, authentification, seed
tests/
  Nooks.Core.Tests/       unitaires sur le domaine
  Nooks.Api.Tests/        intégration bout en bout sur un PostGIS Testcontainers
client/                   Angular
```

`Nooks.Core` ne connaît ni EF Core ni ASP.NET : les interfaces de dépôt y sont déclarées, leurs implémentations vivent dans `Nooks.Infrastructure`. Les règles métier (une note par membre et par lieu, moyenne recalculée, bornes des coordonnées) sont dans l'agrégat `Place`, pas dans les endpoints.

### Le point intéressant : la recherche spatiale

La carte envoie le rectangle qu'elle affiche, l'API le traduit en polygone PostGIS :

```csharp
var polygon = query.Bounds.ToPolygon();
var places = context.Places
    .Where(p => p.Status == PlaceStatus.Approved)
    .Where(p => p.Location.Intersects(polygon));   // ST_Intersects, servi par l'index GiST
```

Le rectangle est validé côté serveur (bornes, orientation, surface maximale de 100 degrés carrés) pour qu'une requête trop large ne ramène jamais la base entière.

## Photos et marqueurs

Une photo au moins est exigée à la création d'un lieu : c'est elle qui devient le marqueur sur la carte. La création passe donc par un seul appel `multipart/form-data` qui transporte le lieu et ses images, plutôt qu'une création suivie d'un envoi de photos, ce qui laisserait un lieu sans marqueur si la seconde requête échouait.

Les images sont réencodées en WebP (1600 px maximum) avec une vignette de 400 px, et le type réel du fichier est vérifié sur ses premiers octets, pas sur l'en-tête `Content-Type` qui n'est que déclaratif. Les lieux sans photo restent gérés : leur marqueur retombe sur le pictogramme de la catégorie, ce qui évite qu'un lieu devienne invisible si la modération retire une image.

## Modération

En preuve de concept, un lieu proposé est publié immédiatement. Le modèle de données porte déjà le statut `Pending` / `Approved` / `Rejected` : passer en validation manuelle est un réglage, pas une migration.

```json
"Moderation": { "AutoApprove": false }
```

Les lieux partent alors en file d'attente, invisibles sur la carte publique, jusqu'à ce qu'un admin les traite depuis `/moderation`.

## Tests

```bash
dotnet test
```

36 tests : le domaine en unitaire (recalcul de moyenne, bornes des notes et des coordonnées, analyse du rectangle) et les endpoints en intégration sur une base PostGIS démarrée par Testcontainers, ce qui couvre les requêtes spatiales réelles. Docker doit tourner.

## Limites connues

- **Jeton JWT stocké côté navigateur**, donc exposé au XSS. Acceptable pour un POC, à remplacer par un cookie `HttpOnly` et un jeton de rafraîchissement avant toute mise en ligne.
- **Photos écrites sur le disque local**, sans réplication ni CDN.
- **Fonds de carte CARTO et OpenStreetMap**, dont les politiques d'usage ne couvrent pas un vrai trafic. Un fournisseur de tuiles sous contrat serait nécessaire en production.
- **Coordonnées du jeu de départ approximatives** à quelques dizaines de mètres : elles servent la démonstration, pas la navigation.
- Pas encore de pagination ni de regroupement de marqueurs : au-delà de quelques milliers de lieux dans une même zone, il faudra agréger côté serveur.

## Pistes suivantes

- « Surprends-moi » : un lieu au hasard à moins de X km, une requête PostGIS d'une ligne.
- Itinéraires : enchaîner plusieurs lieux d'une ville en une balade.
- Favoris avant un voyage, puis marquage « visité ».
- Mise en avant de lieux partenaires.
- Signalement d'un lieu disparu ou inexact, qui alimente la même file de modération.
- PWA et géolocalisation, avant une vraie application mobile.
