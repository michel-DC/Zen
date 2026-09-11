# Mise en production privée de Zen

Zen reste une application personnelle : il n’y a pas de compte, ni de session à
renouveler manuellement. Le premier appareil est activé une fois avec un code ;
un cookie signé, `HttpOnly` et `SameSite=Strict`, le reconnaît ensuite pendant un
an et est renouvelé silencieusement à l’usage.

## 1. Worker Cloudflare

Depuis `worker/`, créer ou remplacer les deux secrets suivants :

```powershell
wrangler secret put TMDB_API_KEY
wrangler secret put INTERNAL_API_SECRET
wrangler deploy
```

`INTERNAL_API_SECRET` est une chaîne aléatoire longue. Elle ne doit pas être
réutilisée pour un autre service. Le bucket R2 reste privé : aucune clé R2 n’est
exposée au navigateur.

## 2. Projet Vercel

Dans **Settings → Environment Variables** du projet Vercel, pour *Production*
et *Preview*, définir :

| Variable | Valeur |
| --- | --- |
| `ZEN_WORKER_URL` | URL publique du Worker, par exemple `https://zen-api.…workers.dev` |
| `ZEN_WORKER_INTERNAL_SECRET` | La même valeur que `INTERNAL_API_SECRET` |
| `ZEN_DEVICE_SIGNING_SECRET` | Une seconde chaîne aléatoire longue, réservée aux cookies Zen |
| `ZEN_ENROLLMENT_CODE` | Le code personnel utilisé une fois pour activer un nouvel appareil |

Le frontend appelle toujours `/api/zen/*` sur son propre domaine. Vercel relaie
la requête côté serveur vers le Worker et ajoute le secret interne : le navigateur
ne voit jamais ce secret, ni les accès directs au catalogue R2.

Après l’ajout des variables, redéployer Vercel. Sans `ZEN_DEVICE_SIGNING_SECRET`
et `ZEN_ENROLLMENT_CODE`, la protection par appareil est volontairement désactivée
en local uniquement ; ne pas laisser cet état en production.

## 3. Domaine `zen.hey-michel.me`

Dans **Vercel → Settings → Domains**, ajouter `zen.hey-michel.me`. Vercel
indiquera l’enregistrement DNS à créer. Dans Cloudflare DNS, créer exactement cet
enregistrement — Vercel peut fournir un CNAME propre au projet — et le laisser en
**DNS only** jusqu’à validation par Vercel. Une fois le certificat émis, le proxy
Cloudflare peut rester désactivé : le HTTPS de Vercel suffit et évite une couche
supplémentaire inutile.

## Données et IA

Les notes libres, impressions et conversations sont stockées dans `catalog.json`
sur le bucket R2 privé. Elles ne sont jamais injectées automatiquement dans un
prompt IA, ni utilisées pour entraîner un modèle. L’IA ne reçoit qu’au moment où
tu l’appelles :

- pour le journal, le message que tu viens volontairement d’écrire, le contexte
  public TMDB et les huit derniers messages de cette même conversation ;
- pour « Ce soir » et les parcours, les métadonnées TMDB publiques ainsi que les
  signaux structurés explicitement enregistrés (note, émotions, aspects).

Les protections HTTP empêchent l’indexation, l’encapsulation de l’application et
certains usages de navigateur inutiles. Elles complètent l’isolation Vercel ↔
Worker ; elles ne remplacent pas la confidentialité des secrets ci-dessus.
