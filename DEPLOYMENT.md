# Déploiement

## Frontend — Vercel

Le projet Vercel utilise `app/` comme répertoire racine. La variable suivante doit être définie pour les environnements Production et Preview :

```text
NEXT_PUBLIC_API_URL=https://zen-2mh5.onrender.com/api/v1
```

Chaque push sur la branche de production déclenche un nouveau déploiement.

## Backend — Render

Le service Render utilise `python/` comme répertoire racine avec les commandes suivantes :

```text
Build: pip install -r requirements.txt
Start: uvicorn main:app --host 0.0.0.0 --port $PORT
Health check: /health
```

Variables applicatives à définir dans Render :

```text
ALLOWED_ORIGINS=["https://zen-movies.vercel.app"]
CATALOG_ADMIN_TOKEN=<secret>
TMDB_API_KEY=<secret>

RECOMMENDATION_AI_PROVIDER=cloudflare
CLOUDFLARE_AI_ACCOUNT_ID=<account-id>
CLOUDFLARE_AI_API_TOKEN=<secret-workers-ai>
CLOUDFLARE_AI_BASE_URL=https://api.cloudflare.com/client/v4
CLOUDFLARE_AI_EMBEDDING_MODEL=@cf/qwen/qwen3-embedding-0.6b
CLOUDFLARE_AI_GENERATION_MODEL=@cf/meta/llama-3.1-8b-instruct-fast
CLOUDFLARE_AI_TIMEOUT=120

CLOUDFLARE_R2_ACCOUNT_ID=<account-id>
CLOUDFLARE_R2_ACCESS_KEY_ID=<secret>
CLOUDFLARE_R2_SECRET_ACCESS_KEY=<secret>
CLOUDFLARE_R2_BUCKET_NAME=catalogue-zen
CLOUDFLARE_R2_CATALOG_KEY=catalog.json
CLOUDFLARE_R2_ENDPOINT_URL=<endpoint-r2>
```

Les autres réglages facultatifs sont listés dans `python/.env.example`.

## Stratégie IA

- En local, `RECOMMENDATION_AI_PROVIDER=ollama` utilise les modèles installés sur la machine hôte.
- En production, `RECOMMENDATION_AI_PROVIDER=cloudflare` évite d’héberger un modèle lourd sur Render.
- Les associations de calibration dans `python/data/` sont réservées aux benchmarks hors ligne. Le runtime ne charge pas ces réponses attendues.

## Contrôles après publication

1. Vérifier `https://zen-2mh5.onrender.com/health`.
2. Ouvrir `https://zen-movies.vercel.app` et contrôler la navigation mobile et desktop.
3. Tester l’ajout au catalogue et à la liste « À voir ».
4. Lancer une recommandation et vérifier dans le panneau de diagnostic que le fournisseur est `cloudflare`.
