## 13-06-2026

- 10:17 Ajout du fichier `python/.python-version` pour forcer Python 3.12 sur Render et éviter l'échec de build de `Pillow` avec la version par défaut Python 3.14.
- 10:28 Ajout d'un fallback d'API de production côté frontend pour pointer automatiquement vers `https://zen-2mh5.onrender.com/api/v1` sur Vercel tout en conservant `localhost` en développement.
- 10:39 Durcissement des timeouts réseau du backend pour R2 et TMDB afin d'éviter les blocages longs en production et de faire remonter des erreurs applicatives au lieu de laisser Render couper les requêtes en `502`.
- 10:53 Ajustements ciblés des pages `/app` et `/catalog` avec recherche mobile réduite, toast lorsqu'aucun film n'est trouvé, utilisation locale du backend de production et regroupement du catalogue par date d'ajout avec suppression directe des films.
- 10:56 Ajustement de la page `/catalog` pour réutiliser l'affichage en cards des films avec le bouton de suppression placé sous chaque carte tout en conservant le regroupement par date d'ajout.
- 10:58 Ajout d'une barre de recherche locale dans la page `/catalog` pour filtrer les films du catalogue par titre ou réalisateur sans quitter la page.
- 11:01 Mise en place d'un header minimal spécifique aux pages `/app` et `/catalog`, centré sur le logo et le texte `Zen`, avec un lien direct vers `/app`.
- 11:11 Ajout du socle PWA du frontend avec manifeste, service worker minimal, métadonnées mobiles et icônes dédiées pour permettre l'ajout du site à l'écran d'accueil sur téléphone.

## 16-06-2026

- 22:10 Création de la page frontend `/top` pour gérer un top 3 de films vus avec affichage en grandes cartes, persistance locale, recherche dans le catalogue et sélection/modification des trois positions du classement.
- 22:19 Migration du top 3 vers un stockage persistant dans le document catalogue sur R2 avec ajout d'une route backend dédiée et branchement complet du frontend `/top` sur cette persistance serveur.
- 22:25 Correction du backend catalogue pour faire passer la route `PUT /catalog/top` avant la route dynamique `PUT /catalog/{movie_id}` et éviter que l'ajout au top soit interprété comme une mise à jour du film `top`.
- 22:30 Ajustement visuel de la carte de la page `/top` pour afficher l'affiche du film en pleine largeur dans la zone image tout en conservant son intégralité.
- 22:32 Ajustement final de la carte `/top` pour forcer l'affiche à remplir toute la largeur du visuel sans bandes latérales.
- 22:36 Correction complète de la logique du top 3 avec conservation stricte des positions vides ou occupées, persistance backend sur trois slots fixes et réutilisation exacte des cartes film de la page `/catalog` dans `/top`.
