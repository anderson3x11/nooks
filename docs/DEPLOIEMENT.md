# Mise en ligne

Trois hébergeurs, chacun sur ce qu'il fait le mieux :

| Morceau | Où | Pourquoi |
|---|---|---|
| Front Angular | Vercel | Un site statique une fois construit, distribué en périphérie |
| API ASP.NET Core | Fly.io | Lance le Dockerfile tel quel, avec un volume pour les photos |
| PostgreSQL + PostGIS | Neon | Offre gratuite qui n'expire pas, extension PostGIS disponible |

Vercel ne peut pas héberger l'API : ses fonctions ne connaissent que Node, Python, Go et Ruby, et il n'y a ni conteneur ni disque persistant. Les réécritures de `vercel.json` renvoient donc `/api` et `/uploads` vers Fly, ce qui garde une seule origine côté navigateur et évite toute question de CORS.

## 1. La base sur Neon

1. Créer un projet sur <https://neon.tech>, région Europe.
2. Créer une base nommée `nooks`.
3. Récupérer la chaîne de connexion.

**Le piège** : Neon donne une URI de la forme `postgresql://user:pass@host/db?sslmode=require`. Npgsql n'accepte pas ce format, il faut la réécrire en clé-valeur :

```
Host=ep-xxxx-yyyy.eu-central-1.aws.neon.tech;Database=nooks;Username=VOTRE_USER;Password=VOTRE_MOT_DE_PASSE;SSL Mode=Require;Trust Server Certificate=true
```

L'extension PostGIS n'est pas à créer à la main : la première migration s'en charge.

## 2. L'API sur Fly.io

Installer le client, puis depuis la racine du dépôt :

```bash
fly auth login
fly apps create nooks-api          # si le nom est pris, en choisir un autre
                                   # et le reporter dans client/vercel.json

fly volumes create nooks_uploads --region cdg --size 1

fly secrets set \
  "ConnectionStrings__Default=Host=...;Database=nooks;Username=...;Password=...;SSL Mode=Require;Trust Server Certificate=true" \
  "Jwt__SigningKey=$(openssl rand -base64 48)"

fly deploy
```

Le premier démarrage applique les migrations puis va chercher les photos sur Wikipédia : comptez plusieurs minutes avant que l'API réponde. C'est pour cela que la sonde de `fly.toml` a une période de grâce de dix minutes. Les démarrages suivants sont immédiats, la base étant déjà remplie.

Vérifier :

```bash
curl https://nooks-api.fly.dev/health
curl https://nooks-api.fly.dev/api/home
```

## 3. Le front sur Vercel

Si le nom d'application Fly n'est pas `nooks-api`, corriger les deux destinations dans `client/vercel.json` avant de déployer.

Sur <https://vercel.com>, importer le dépôt GitHub avec ces réglages :

- **Root Directory** : `client`
- **Framework Preset** : Other
- **Build Command** : `npm run build`
- **Output Directory** : `dist/client/browser`

Le reste vient de `vercel.json`. Chaque poussée sur `main` redéploie.

## 4. Après la mise en ligne

- **Changer les mots de passe de démonstration** ou passer `Seed__Demo` à `false` et repartir d'une base vide, si le site doit devenir autre chose qu'une démonstration.
- **Le compte admin** est `admin@nooks.local`. Sur un site public, créer un vrai compte et retirer celui-là.
- **`Moderation__AutoApprove`** est déjà à `false` : chaque lieu proposé passe par la file de modération.
- **Les fonds de carte** CARTO et OpenStreetMap sont gratuits pour un usage modéré. Au-delà, il faut un fournisseur sous contrat.

## Ce qu'il reste à durcir

Cette configuration convient à une démonstration, pas à un service ouvert au public :

- Le jeton d'authentification est stocké dans le navigateur, donc exposé au XSS. Un cookie `HttpOnly` avec jeton de rafraîchissement serait nécessaire.
- Aucune limitation de débit sur l'API.
- Les photos sont sur un volume Fly, sans sauvegarde. Un stockage objet serait plus sûr.
