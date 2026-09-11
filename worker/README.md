# Zen API — Cloudflare Worker

Backend de production de Zen. Il remplace le service FastAPI hébergé sur Render tout en conservant les routes publiques sous `/api/v1`.

## Services liés

- `CATALOG` : bucket R2 `catalogue-zen` pour le catalogue et le cache TMDB.
- `AI` : Workers AI pour les embeddings de recommandation.
- `TMDB_API_KEY` : secret Wrangler requis.

## Déploiement

```powershell
wrangler secret put TMDB_API_KEY
wrangler secret put INTERNAL_API_SECRET
wrangler deploy
```

`INTERNAL_API_SECRET` doit être une valeur aléatoire longue et identique à
`ZEN_WORKER_INTERNAL_SECRET` sur Vercel. Dès qu'il est défini, toutes les routes
`/api/v1/catalog/*` refusent les appels directs : elles ne peuvent plus être
atteintes qu'à travers le proxy serveur de Zen.

Le Worker est configuré dans `wrangler.jsonc`. Les secrets ne doivent pas être ajoutés au dépôt.

Les palettes sont calculées côté navigateur par le frontend afin d'éviter le coût CPU du décodage d'images dans le plan Workers gratuit.
