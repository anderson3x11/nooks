# Mise en ligne

Tout le site tient dans **une image Docker et une base**. L'API sert aussi le site Angular, construit dans la même image : il n'y a donc qu'une seule chose à héberger.

Rien à installer sur votre poste, aucune ligne de commande.

## La marche à suivre

1. Créer un compte sur <https://render.com> et le relier à GitHub.
2. Cliquer sur **New**, puis **Blueprint**.
3. Choisir le dépôt `nooks`.
4. Cliquer sur **Apply**.

C'est fini. Render lit le fichier [`render.yaml`](../render.yaml) à la racine du dépôt, et ce fichier décrit tout : construire l'image, créer la base PostgreSQL, tirer au sort la clé de signature des jetons et brancher l'adresse de la base sur l'application. Vous n'avez ni mot de passe à recopier, ni variable à saisir.

Le premier déploiement prend une dizaine de minutes : Render construit le site Angular puis l'API. L'adresse finale ressemble à `https://nooks.onrender.com`.

Une fois le site en ligne, il se remplit tout seul : le jeu de démonstration s'insère en arrière-plan et va chercher les photos sur Wikipédia. Comptez quelques minutes de plus avant que la carte se garnisse. Si vous ouvrez le site pendant ce temps, la carte est simplement vide, ce n'est pas une panne.

Ensuite, chaque poussée sur `main` redéploie le site automatiquement.

## Ce qu'il faut savoir sur l'offre gratuite

Elle convient pour montrer le projet, avec deux limites à connaître :

- **Le site s'endort au bout de quinze minutes sans visite.** La visite suivante le réveille et attend environ une minute. Rien n'est perdu, c'est juste lent au premier chargement. Pour un lien envoyé à un recruteur, prévenez ou ouvrez le site quelques minutes avant.
- **La base gratuite expire trente jours après sa création.** Passé ce délai, Render laisse deux semaines pour passer à une offre payante, puis supprime la base et ses données. Si le site doit rester en ligne durablement, il faut basculer la base sur l'offre payante avant l'échéance, en changeant `plan: free` en `plan: basic-256mb` dans `render.yaml`.

Passer les deux morceaux en payant coûte une quinzaine de dollars par mois. Tant qu'il s'agit de montrer le projet, l'offre gratuite suffit : il suffit de refaire un déploiement quand la base a expiré.

## Après la mise en ligne

- **Le compte admin** est `admin@nooks.local`, mot de passe `Nooks!2026`. Sur un site public, créez un vrai compte administrateur et supprimez celui-ci.
- **Les autres comptes de démonstration** partagent le même mot de passe. Ils n'existent que pour peupler la carte.
- **Pour repartir d'une base vide**, sans lieux ni comptes fictifs, passer `Seed__Demo` à `false` dans `render.yaml`.
- **`Moderation__AutoApprove`** est déjà à `false` : chaque lieu proposé passe par la file de modération.
- **Les fonds de carte** CARTO et OpenStreetMap sont gratuits pour un usage modéré. Au-delà, il faut un fournisseur sous contrat.

## Sur un autre hébergeur

`render.yaml` est propre à Render, mais l'image, elle, ne l'est pas. Chez n'importe quel hébergeur qui sait lancer un `Dockerfile` (Railway, Fly.io, Koyeb, Scaleway...), il suffit de :

1. Créer une base PostgreSQL avec l'extension PostGIS disponible.
2. Déployer le dépôt, l'hébergeur trouvera le `Dockerfile` à la racine.
3. Renseigner deux variables d'environnement :
   - `ConnectionStrings__Default` : l'adresse de la base, au format URL `postgres://...` ou au format Npgsql, les deux sont acceptés. À défaut, `DATABASE_URL` est lue, ce que la plupart des hébergeurs remplissent seuls.
   - `Jwt__SigningKey` : une chaîne aléatoire d'au moins 32 caractères.

L'extension PostGIS n'est pas à créer à la main : la première migration s'en charge.

## Répéter le déploiement en local

La même pile tourne sur votre machine, utile pour vérifier avant de mettre en ligne :

```bash
cp .env.example .env      # puis remplir le mot de passe et la clé de signature
docker compose -f docker-compose.prod.yml up -d --build
```

Le site répond alors sur <http://localhost:8080>.

## Ce qu'il reste à durcir

Cette configuration convient à une démonstration, pas à un service ouvert au public :

- Le jeton d'authentification est stocké dans le navigateur, donc exposé au XSS. Un cookie `HttpOnly` avec jeton de rafraîchissement serait nécessaire.
- Aucune limitation de débit sur l'API.
- Les photos sont dans la base, ce qui simplifie l'hébergement mais ne tiendra pas à grande échelle. Au-delà de quelques milliers de lieux, il faudra un stockage objet.
