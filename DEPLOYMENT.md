# Déploiement

## Frontend — Vercel

Le projet Vercel utilise `app/` comme répertoire racine. La variable suivante doit être définie pour les environnements Production et Preview :

```text
NEXT_PUBLIC_API_URL=https://zen-api.djoumessi-michel08.workers.dev/api/v1
```

Chaque push sur la branche de production déclenche un nouveau déploiement.

## Backend — Cloudflare Workers

Le backend de production se trouve dans `worker/`. Il utilise une liaison native vers le bucket R2 `catalogue-zen`, une liaison Workers AI et un secret TMDB.

```powershell
cd worker
wrangler secret put TMDB_API_KEY
wrangler deploy
```

L'URL publique actuelle est :

```text
https://zen-api.djoumessi-michel08.workers.dev
```

La configuration versionnée est dans `worker/wrangler.jsonc`. `TMDB_API_KEY` reste un secret Cloudflare et ne doit jamais être ajouté au fichier.

## Stratégie IA

- En local, l'ancien backend FastAPI peut toujours utiliser Ollama.
- En production, le Worker utilise directement Workers AI pour les embeddings ; les palettes sont extraites dans le navigateur à partir des pixels des affiches optimisées.
- Les appels TMDB sont mis en cache dans R2 afin de rester sous la limite de sous-requêtes du plan Workers gratuit.
- Les recommandations utilisent un vivier borné à vingt candidats, compatible avec le quota gratuit.

## Contrôles après publication

1. Vérifier `https://zen-api.djoumessi-michel08.workers.dev/health`.
2. Ouvrir `https://zen-movies.vercel.app` et contrôler la navigation mobile et desktop.
3. Tester l’ajout au catalogue et à la liste « À voir ».
4. Lancer une recommandation et vérifier dans le panneau de diagnostic que le fournisseur est `cloudflare`.
