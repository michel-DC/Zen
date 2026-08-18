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
## 18-08-2026

- 17:58 Préparation de la production avec un fournisseur IA interchangeable : Ollama pour Docker local et Cloudflare Workers AI pour Render, y compris les clients d’embeddings et de génération JSON, les caches versionnés par modèle et les tests unitaires associés.
- 17:58 Documentation de l’architecture Vercel, Render, R2, TMDB et Workers AI, assainissement du fichier d’exemple d’environnement et exclusion des caches, identifiants locaux et captures de vérification du dépôt Git.

- 17:33 Ajout d’un menu hamburger responsive au header pour rendre les cinq destinations principales accessibles sur mobile, avec panneau noir et blanc, état actif souligné, fermeture au changement de page ou avec la touche Échap et zones tactiles accessibles.

- 18:05 Exclusion des recommandations adultes ou sexuellement explicites à partir du marqueur TMDB, des classifications internationales 18+ et des mots-clés sensibles.
- 18:05 Remplacement du logo Zen utilisé en secours par un état textuel sobre lorsqu’une affiche est absente ou ne peut pas être chargée.
- 18:12 Optimisation du premier contrôle de sécurité par regroupement des écritures du cache TMDB après chaque lot de candidats.

- 17:30 Simplification de l’action de suppression du catalogue en bouton iconique accessible, sans libellé visible.
- 17:30 Refonte de l’onglet actif du header avec un soulignement noir discret et animé, sans fond de sélection.

- 17:10 Retrait du modèle pairwise de l’exécution des recommandations : les associations de calibration ne peuvent plus influencer les résultats réels.
- 17:10 Priorité rétablie à la découverte TMDB, avec un maximum de deux films déjà vus sur l’ensemble du flux paginé et une contrainte stricte d’animation lorsqu’une animation est la référence.
- 17:16 Suppression du module pairwise de calibration devenu inutile, pour séparer physiquement les données de test du moteur exécuté en production.

- 15:55 Mise en place du pipeline sémantique : profils fins alimentés par TMDB, requêtes Discover par signaux précis et reranking local Qwen sur les candidats non couverts par le feedback.
- 15:55 Ajout d’un modèle pairwise BPR local entraîné sur les associations validées, combiné aux signaux de contenu pour les nouveaux films.
- 16:18 Extension du benchmark local aux six nouvelles associations de calibration fournies.

- 15:20 Refonte du premier étage du moteur local : candidats TMDB enrichis par langue, genres, pays et mots-clés, conservation de leur provenance, prise en compte de la watchlist et cache persistant des métadonnées/vecteurs.
- 15:20 Ajout des métriques de diagnostic du benchmark pour distinguer une cible absente du pool d’une cible mal classée.
- 15:24 Ajout des nouvelles associations de calibration fournies pour étendre le jeu supervisé, sans les exposer comme règles de recommandation au runtime.

- 13:32 Refonte de la recherche de références : résultats en cartes film complètes et action de recommandation intégrée à la base choisie avec une icône explicite.
- 13:35 Renforcement de l’action de recommandation : bouton latéral pleine largeur, plus haut et mieux hiérarchisé après les réglages.
- 13:41 Uniformisation des résultats de recherche avec la grille à trois colonnes des derniers films, pour conserver la même taille d’affiche.
- 13:57 Défilement automatique vers les recommandations dès que le calcul est terminé, en respectant la préférence de réduction des animations.
- 13:58 Refonte des actions de recommandation : ajout à la base via un bouton rond et chargement de résultats supplémentaires via un bouton central avec icône et fond.
- 14:03 Header rendu opaque dans les deux thèmes : blanc en mode clair et noir en mode sombre.
- 14:03 Ajout d’un benchmark CLI reproductible pour mesurer le top 3 du moteur sur les associations de référence validées.
- 14:03 Round 1 du moteur : extension du pool aux films du catalogue, prise en compte automatique de l’animation source et enrichissement des profils par réalisateur.
- 14:03 Stabilisation du round 1 : cache mémoire des métadonnées et vecteurs, embeddings découpés en lots courts pour éviter les délais Ollama.
- 14:03 Calibration Ollama locale : profils sémantiques bornés, lots réduits à quatre embeddings et délai de benchmark ajusté à la capacité CPU.
- 14:03 Fiabilisation de l’enrichissement TMDB : limite de concurrence et retries pour éviter les échecs réseau lors des grands pools de candidats.
- 14:00 Recomposition pleine largeur de la page Recommandations : affichage des trois derniers films vus par défaut, recherche ciblée et base de films sélectionnés latérale.
- 13:10 Refonte du choix des films de référence : recherche limitée à deux résultats, liste compacte des films choisis et lancement unique des recommandations ; palette globale ramenée au noir et blanc.
- 12:20 Refonte des pages Recommandations et Films à voir sur la structure sobre du Catalogue, avec suppression des surfaces bleues et ajout de la navigation principale dans le header.
- 11:05 Correction de la connexion Docker vers Ollama et augmentation du délai du moteur local pour les lots de recommandations enrichis par TMDB.

- 12:45 Harmonisation du header des pages catalogue avec celui de l’accueil, sans les filtres cinéma et avec le bouton de thème conservé.
- 12:55 Ajout de l’action « Ajouter à voir » dans les résultats de recherche, avec prévention des doublons de catalogue et de watchlist.
- 13:05 Ajout de l’exclusion « Pas intéressé » aux recommandations et application du socle visuel blanc, gris et bleu léger sans ombres décoratives.
- 12:10 Ajout du moteur de recommandations local basé sur Ollama/Qwen, des pages Recommandations et À voir, du stockage séparé dans `catalog.json` et des actions de transfert vers le catalogue.
