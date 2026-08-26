# Nooks, carnet de bord

Dernière session : 26 août 2026. 68 tests verts, builds .NET et Angular propres.

## Conventions de travail

- Commits automatiques à chaque grosse étape validée. Messages courts en Conventional Commits (`feat:`, `fix:`), sujet seul, pas de corps, pas de co-auteur.
- Aucun tiret cadratin nulle part. Virgules ou parenthèses dans la prose, tiret simple dans les titres d'onglet.
- Référence visuelle globale : BenchMap, https://benchmap.fr/

## Fait

**Base**
- Renommage complet Curio vers Nooks (solution, namespaces, base, conteneur, classes CSS, comptes).
- .NET 10, EF Core 10, PostgreSQL + PostGIS, Angular 21, Tailwind 4, Leaflet.
- 66 lieux, 13 villes, 8 comptes, 161 avis. 46 lieux ont une vraie photo depuis Wikipédia, avec auteur et licence affichés. Les 20 autres ont une illustration abstraite générée.

**Carte**
- Marqueurs photo : rond avec l'image du lieu, cerclé de la couleur de la catégorie, sur une tige.
- Pictogrammes conservés pour la légende, les filtres et le repli quand un lieu n'a pas de photo.
- Quatre fonds de carte au choix (Épuré, Détaillé, Sombre, Classique), mémorisés dans le navigateur.
- Regroupement des marqueurs au dézoom, rechargements amortis, garde-fou au-delà de 100 degrés carrés.

**Contribution**
- Photo obligatoire à la création, jusqu'à six, la première devient le marqueur. Création en un seul appel multipart.
- Carrousel de photos sur la fiche.
- Un avis par membre et par lieu, modifiable, avec mention « modifié » seulement si le contenu a changé.
- Détection de doublons : même nom à moins de 500 m, ou même catégorie à moins de 75 m. Avertissement avec le lieu existant proposé, possibilité d'insister, et dans ce cas passage obligatoire par la modération avec badge « Doublon possible ».

**Comptes**
- Profil public et personnel : avatar, présentation, compteurs (lieux proposés, avis, favoris), onglets.
- Favoris (bouton signet sur la fiche), visibles seulement par leur propriétaire.

**Administration** (`/admin`)
- File d'attente, lieux publiés, modération des avis, liste des membres.
- Retrait d'avis réversible (sort de la moyenne, reste en base, restaurable) plus suppression définitive.
- Suppression définitive de lieux.

**Site**
- Page d'accueil : navbar flottante en pilule (à la largeur exacte de la boîte de contenu) avec ancres, hero avec disque de carte et deux fiches posées dessus, concept, catégories, comment ça marche, derniers lieux, appel final, pied de page.
- Interface blanc et noir, arrondie, police Figtree. Logo en favicon.
- Étoiles remplies au prorata de la note.

**Performances**
- Ouverture de fiche instantanée (22 ms) : la carte affiche ce qu'elle connaît déjà, le détail complète ensuite.
- Compression des réponses, cache d'un an sur les images envoyées, requêtes de lecture sans suivi EF, `OnPush` partout, routes en chargement différé.

## Reste à faire

1. **Responsive de la page carte.** C'est le trou principal. Accueil, profil et admin s'adaptent, mais les panneaux flottants de la carte sont dimensionnés pour le bureau et seront inutilisables sur téléphone. À faire avant toute app mobile.
2. **Optimisation globale.** Le gros est en place. Aller plus loin demande de mesurer un ralentissement réel plutôt que d'optimiser à l'aveugle.
3. **Encore plus de données** si besoin pour les tests de charge.
4. Idées gardées de côté : « surprends-moi » (lieu au hasard à moins de X km, une requête PostGIS), itinéraires, signalement d'un lieu disparu, badges de contribution, mise en avant de lieux partenaires, PWA.

## Points d'attention connus

- Jeton JWT stocké côté navigateur, donc exposé au XSS. À remplacer par un cookie HttpOnly et un jeton de rafraîchissement avant mise en ligne.
- Fonds de carte CARTO et OpenStreetMap : politiques d'usage non couvertes pour un vrai trafic, il faudra un fournisseur sous contrat.
- Coordonnées du jeu de départ approximatives à quelques dizaines de mètres.
- Regroupement de marqueurs calculé dans le navigateur : au-delà de quelques milliers de lieux par zone, il faudra agréger côté serveur.
- La détection de doublons compare des noms : deux noms très différents pour le même endroit passeront à travers.
- Piège rencontré deux fois : un accent grave dans un commentaire d'un template Angular ferme le littéral de gabarit. Le serveur de dev sert alors silencieusement l'ancien bundle, l'écran ne bouge pas et rien n'a l'air cassé.

## App mobile

- Utiliser la localisation de l'utilisateur pour le situer sur la carte.
- UI de référence : `Notes/Capture d'écran 2026-08-25 173139.png`

## Pour relancer l'environnement

```bash
docker compose up -d
dotnet run --project src/Nooks.Api    # http://localhost:5001
cd client && npm start                # http://localhost:4200
```

Comptes de démonstration : `admin@nooks.local` (admin), `camille@nooks.local` et six autres, mot de passe `Nooks!2026`.

## Mes notes

<!-- Traité le 26/08 : disque de carte agrandi (432 puis 512 px) et navbar alignée
     sur la boîte de contenu (1112 px, même bord gauche que le titre). -->
