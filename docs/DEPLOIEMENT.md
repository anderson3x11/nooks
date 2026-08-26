# Mise en ligne

Tout le site tient dans **une image Docker et une base**. L'API sert aussi le site Angular, construit dans la même image : il n'y a donc qu'une seule chose à héberger.

Rien à installer sur votre poste, aucune ligne de commande.

Deux chemins sont décrits ici : sur un VPS avec Coolify, qui est l'hébergement en service, et sur Render, gardé comme solution de repli. L'application est la même dans les deux cas, seul l'hébergeur change.

## Sur un VPS avec Coolify

Deux ressources dans un même projet Coolify.

**La base.** Créer une ressource PostgreSQL et choisir la variante **PostGIS**. Si elle ne figure pas dans la liste, indiquer l'image `postgis/postgis:17-3.5` à la main. Coolify crée le volume et garde les données entre les redéploiements. Activer les sauvegardes planifiées dès maintenant : sur un VPS, personne d'autre ne les fera.

**L'application.** Créer une ressource depuis le dépôt GitHub, en mode de construction **Dockerfile**. Coolify trouve le `Dockerfile` à la racine. Les variables d'environnement à renseigner :

| Variable | Valeur | Pourquoi |
|---|---|---|
| `ConnectionStrings__Default` | l'URL interne de la base, telle que Coolify l'affiche | sans elle, pas de base |
| `Jwt__SigningKey` | une chaîne aléatoire d'au moins 32 caractères | sans elle, l'application **refuse de démarrer** |
| `Moderation__AutoApprove` | `false` | sinon tout lieu proposé est publié sans passer par la modération |
| `Nominatim__UserAgent` | `Nooks/1.0 (https://github.com/anderson3x11/nooks)` | leur politique d'usage exige un agent identifiable |

Les deux dernières ont des valeurs par défaut de développement dans `appsettings.json` : les oublier ne casse rien de visible, mais laisse la modération ouverte et la recherche de ville exposée à un blocage. La clé de signature, elle, a aussi une valeur par défaut, publiée dans ce dépôt public : hors développement l'application refuse explicitement de s'en servir plutôt que de tourner avec une clé que tout le monde peut lire.

L'URL de la base se colle telle quelle, au format `postgres://...` : l'application la traduit au démarrage, Npgsql ne comprenant pas ce format. Elle respecte aussi le `sslmode` que l'URL contient, et se contente d'une connexion simple quand la base voisine n'a pas de TLS, ce qui est le cas d'un PostgreSQL interne à Coolify.

Il reste à attribuer un domaine à l'application. Coolify s'occupe du reste : le proxy devant, le certificat Let's Encrypt, et le redéploiement automatique à chaque poussée sur `main`.

### Ce qu'il faut avoir en tête

**La mémoire à la construction.** L'image compile Angular puis .NET dans le conteneur. Vérifié : elle se construit dans un environnement limité à **2 Go de RAM et 2 cœurs**, en une minute trente. En dessous, la compilation risque de se faire tuer par le noyau ; il faudra alors construire l'image ailleurs et ne déployer que le résultat.

**PostGIS en x86 uniquement** dans le préréglage Coolify, sans conséquence sur la quasi-totalité des VPS.

**Le premier démarrage** applique les migrations puis remplit le jeu de démonstration en arrière-plan, en allant chercher les photos sur Wikipédia. Comptez quelques minutes avant que la carte se garnisse.

## Sur Render

L'hébergeur des débuts, gardé ici comme solution de repli. Le site vit maintenant sur un VPS avec Coolify, décrit plus haut.

### La marche à suivre

1. Créer un compte sur <https://render.com> et le relier à GitHub.
2. Cliquer sur **New**, puis **Blueprint**.
3. Choisir le dépôt `nooks`.
4. Cliquer sur **Apply**.

C'est fini. Render lit le fichier [`render.yaml`](../render.yaml) à la racine du dépôt, et ce fichier décrit tout : construire l'image, créer la base PostgreSQL, tirer au sort la clé de signature des jetons et brancher l'adresse de la base sur l'application. Vous n'avez ni mot de passe à recopier, ni variable à saisir.

Le premier déploiement prend une dizaine de minutes : Render construit le site Angular puis l'API. L'adresse finale ressemble à `https://nooks.onrender.com`.

Une fois le site en ligne, il se remplit tout seul : le jeu de démonstration s'insère en arrière-plan et va chercher les photos sur Wikipédia. Comptez quelques minutes de plus avant que la carte se garnisse. Si vous ouvrez le site pendant ce temps, la carte est simplement vide, ce n'est pas une panne.

Ensuite, chaque poussée sur `main` redéploie le site automatiquement.

### Ce qu'il faut savoir sur l'offre gratuite

Elle convient pour montrer le projet, avec deux limites à connaître :

- **Le site s'endort au bout de quinze minutes sans visite.** La visite suivante le réveille et attend environ une minute. Rien n'est perdu, c'est juste lent au premier chargement. Pour un lien envoyé à un recruteur, prévenez ou ouvrez le site quelques minutes avant.
- **La base gratuite expire trente jours après sa création.** Passé ce délai, Render laisse deux semaines pour passer à une offre payante, puis supprime la base et ses données. Si le site doit rester en ligne durablement, il faut basculer la base sur l'offre payante avant l'échéance, en changeant `plan: free` en `plan: basic-256mb` dans `render.yaml`.

Passer les deux morceaux en payant coûte une quinzaine de dollars par mois. Tant qu'il s'agit de montrer le projet, l'offre gratuite suffit : il suffit de refaire un déploiement quand la base a expiré.

## Après la mise en ligne

- **Le compte admin** est `admin@nooks.local`, mot de passe `Nooks!2026`. Sur un site public, créez un vrai compte administrateur et supprimez celui-ci.
- **Les autres comptes de démonstration** partagent le même mot de passe. Ils n'existent que pour peupler la carte.
- **Pour repartir d'une base vide**, sans lieux ni comptes fictifs, passer `Seed__Demo` à `false` (dans `render.yaml`, ou dans les variables de l'application chez Coolify).
- **`Moderation__AutoApprove`** est déjà à `false` : chaque lieu proposé passe par la file de modération.
- **Les fonds de carte** CARTO et OpenStreetMap sont gratuits pour un usage modéré. Au-delà, il faut un fournisseur sous contrat.

## Sur un autre hébergeur

`render.yaml` est propre à Render, mais l'image, elle, ne l'est pas. Chez n'importe quel hébergeur qui sait lancer un `Dockerfile` (Railway, Fly.io, Koyeb, Scaleway...), il suffit de :

1. Créer une base PostgreSQL avec l'extension PostGIS disponible.
2. Déployer le dépôt, l'hébergeur trouvera le `Dockerfile` à la racine.
3. Renseigner les variables d'environnement, les mêmes que pour Coolify plus haut :
   - `ConnectionStrings__Default` : l'adresse de la base, au format URL `postgres://...` ou au format Npgsql, les deux sont acceptés. À défaut, `DATABASE_URL` est lue, ce que la plupart des hébergeurs remplissent seuls.
   - `Jwt__SigningKey` : une chaîne aléatoire d'au moins 32 caractères, sans laquelle l'application refuse de démarrer.
   - `Moderation__AutoApprove` à `false` et `Nominatim__UserAgent`, dont les valeurs par défaut ne conviennent qu'au développement.

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
