# Zen

Zen est un catalogue personnel de films avec liste « À voir », top 3 et recommandations sémantiques.

## Architecture

- `app/` : frontend Next.js déployé sur Vercel.
- `python/` : API FastAPI déployée sur Render.
- Cloudflare R2 : persistance du catalogue et de la liste « À voir ».
- TMDB : recherche, métadonnées et génération ciblée de candidats.
- Ollama en local / Cloudflare Workers AI en production : profils sémantiques, embeddings et reclassement des recommandations.

## Développement local

Copier `python/.env.example` vers `python/.env`, renseigner les accès TMDB et R2, puis démarrer Ollama avec les modèles `qwen3-embedding:0.6b` et `qwen3:1.7b`.

```powershell
docker compose up --build
```

- Frontend : `http://localhost:3000`
- Santé du backend : `http://localhost:8000/health`

## Production

Les variables et la procédure de publication sont documentées dans [DEPLOYMENT.md](./DEPLOYMENT.md).
