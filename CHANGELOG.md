## 13-06-2026

- 10:17 Ajout du fichier `python/.python-version` pour forcer Python 3.12 sur Render et éviter l'échec de build de `Pillow` avec la version par défaut Python 3.14.
- 10:28 Ajout d'un fallback d'API de production côté frontend pour pointer automatiquement vers `https://zen-2mh5.onrender.com/api/v1` sur Vercel tout en conservant `localhost` en développement.
- 10:39 Durcissement des timeouts réseau du backend pour R2 et TMDB afin d'éviter les blocages longs en production et de faire remonter des erreurs applicatives au lieu de laisser Render couper les requêtes en `502`.
