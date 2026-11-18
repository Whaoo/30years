# 30years : le site des anniversaires de l'équipe

Ce fichier donne le contexte du projet à Claude Code. Le reste de la doc est dans le code (commentaires en français).

## L'essentiel

- C'est **d'abord un site d'anniversaires** pour les collègues : prochain anniversaire, compte à rebours, liste des suivants. Les jeux sont un bonus, jamais au premier plan.
- Une seule page plein écran, **jamais de scroll** (la molette sert uniquement aux gags des pingouins).
- Textes de l'interface en **français**, ton doux et complice, jamais robotique.
- Les pingouins sont des **personnages originaux** du projet. Ne pas dessiner ni imiter de personnages connus (Pingu, etc.).

## Stack et commandes

- Vite 5 + React 18 + Tailwind 3 (gardé pour le reset) ; le style est dans `src/styles/app.css` (variables CSS du thème).
- `npm run dev` : serveur local (http://localhost:5173). `npm run build` : version de production dans `dist/`.
- **Mode test** (`__TEST_MODE__`, défini dans `vite.config.js`) : actif avec `npm run dev` et sur les préversions Cloudflare
  (toute branche sauf `main`, détectée par `CF_PAGES_BRANCH`). Il ajoute un bouton « Test » en bas à gauche
  (`src/components/TestPanel.jsx` : tous les jeux sans attendre leur porte, dates prêtes, effacer les records),
  `?date=2026-12-10T15:00` pour simuler une date et `?jeu=<id>` qui ouvre n'importe quel jeu.
  Sur `main`, rien de tout ça n'est compilé : la production reste verrouillée.

## Branches et mise en ligne (Cloudflare Pages, offre gratuite, site statique)

- `main` = production, publiée sur https://30years.pages.dev
- `dev` = travail en cours, publiée en prévisualisation sur https://dev.30years.pages.dev
- Travailler sur `dev`. Pour publier : `git checkout main && git merge dev && git push && git checkout dev`.
- Presque aucun serveur : tout tourne dans le navigateur, records personnels dans le `localStorage` (`30years:best:<id>`).
  Seule exception : les classements en ligne (voir « Classements en ligne » plus bas), servis sous `/api/` par Pages Functions + D1, offre gratuite.

## Organisation du code

- `src/utils/birthdayLogic.js` : la liste des anniversaires (`{ name, date: 'JJ-MM' }`, pas d'année, pas d'âge affiché).
- `src/utils/advent.js` : les 25 portes du calendrier de l'Avent (affiché par défaut en décembre, verrouillé sinon).
- `src/utils/theme.js` : saisons × moment de la journée × météo (Open-Meteo).
- `src/games/index.js` : le registre des jeux.
  - `GAMES` : les 14 mini-jeux de l'Avent, débloqués porte par porte en décembre (portes 1-4, 7-9, 11-12, 14-18).
  - `ADVENTURE` (« L'aventure de Flocon », `src/games/adventure/`) apparaît le 10/12/2026 (porte 10 + bouton de l'en-tête).
  - `QUIZ` (« Qui fête quand ? », `always`) : ouvert toute l'année depuis la liste des anniversaires.
  - `CANDLES` (« Souffle les bougies », `birthdayOnly`) : bouton du compte à rebours, uniquement le jour J.
  - `FREE_GAMES` : jeux libres sans lien avec les pingouins ni le calendrier, ouverts toute l'année (deux tuiles cliquables sous la liste « Ensuite », `GameTiles.jsx`,
    menu « Jeux » de l'en-tête sur téléphone où la colonne de droite est masquée, tuile des mini-jeux en décembre ;
    annonce du 18/11 à 9 h au 25/11 : `GamesNews.jsx` + `src/utils/gamesNews.js`, qui remplace le bandeau de la cave) : `CULTURE` (« Le Grand Quiz », 9 thèmes + « Le Juste Titre ») et `GEO` (« Où est-ce ? », placer
    villes et villages sur la carte de France). Ce sont des pages autonomes dans `public/jeux/` affichées dans un cadre (`FrameGame.jsx`) ;
    elles renvoient leur score par `postMessage` (`{ type: '30years:score', game, score }`). Le record du site ne compte que les parties
    solo de 10 questions de culture G / de 10 lieux. Contours de la carte : IGN Admin Express via france-geojson (Licence ouverte).
  - Les adresses `/aventure`, `/quiz` et `/bougies` ouvrent ces jeux à tout moment pour tester ;
    `/culture` et `/ou-est-ce` ouvrent les jeux libres (adresses à partager).
- `src/games/GameCanvas.jsx` : moteur commun des jeux canvas (boucle, mise à l'échelle, clavier, souris, tactile).
- Vue Speed Dial de Vivaldi : `?dial`, `/dial`, ou fenêtre de 480 px de côté ou moins (`src/components/Dial.jsx`).
- `src/envers/` : « L'Envers », la cave sous la page (du 12 au 30/11/2026 inclus, tous les jours).
  - Passage : trois coups de molette vers le bas (ou trois glissés vers le haut sur téléphone) en moins de 4 s, géré dans `App.jsx`.
  - Annonce du 12 au 18/11 à 9 h : bandeau `NewsBanner.jsx` et pastille « Nouveau ! » dans la vue Vivaldi (`config.js`).
  - `engine.js` : chute d'introduction, exploration à la lampe en vue de dessus (4 salles : crypte et potions côté Halloween, atelier et sapin côté Noël ;
    déplacement libre aux flèches ou au doigt, lumière arrêtée par les murs, carte en brouillard, objectif 85 % éclairé + 11 lettres), fin (message, citrouille qui gèle, micro doré et « IT’S… TIIIIIMEEEE ! », remontée).
  - Mécaniques (partie de moins de 5 min) : portes de glace (il faut la bougie de l'atelier) et toiles (les ciseaux du sapin),
    4 lettres cachées dans des objets (Espace ou bouton « Fouiller » près d'un ✦), pile de lampe qui s'use (piles à ramasser),
    3 fantômes-citrouilles qui volent la dernière lettre dans le noir et la recachent ailleurs (la lampe les fait fuir).
  - `Puzzle.jsx` : remettre TRICK OR TREE dans l'ordre. Progression gardée dans `localStorage` (`30years:envers`), record de temps `30years:best:envers`.
  - `art/` : décors SVG générés depuis les maquettes du canevas de design (Page 2) ; `level-top.json` = salles, couloirs, obstacles, lumières, lettres.
  - En mode test : `/envers` ouvre la cave, le panneau « Test » a un bouton dédié, la console expose `window.envers` (`revealAll()`, `grabAll()`, `openDoors()`, `setBattery(n)`).

## Classements en ligne (Cloudflare Pages Functions + D1, gratuits)

- `functions/api/[[route]].js` : toutes les adresses `/api/…` ; le code est dans `classement/api.js` (testable hors Cloudflare).
  Seules ces adresses font tourner du code (Cloudflare génère `_routes.json`) ; le reste du site reste statique et gratuit.
- `classement/schema.sql` : tables `joueurs` (pseudo + empreinte du code de récupération), `cles` (une clé par navigateur, en empreinte),
  `scores` (chaque partie, date de Paris) et `records` (meilleur score par joueur et par jeu). Ni e-mail ni adresse IP.
- Côté site : `src/utils/leaderboard.js` (client, pseudo + clé dans `30years:joueur`) et `src/components/Leaderboard.jsx`
  (panneau « Classement » de la fenêtre de jeu). En fin de partie (score > 0), le panneau s'ouvre : sans pseudo, il le demande une fois
  en montrant la place qu'aurait ce score ; ensuite chaque score part tout seul. Onglets « Toujours » et « Aujourd'hui »
  (jeux de la quête : premier essai du jour, comme le score officiel). Si l'API ne répond pas (`npm run dev`, base absente), rien ne s'affiche.
- La cave a son classement (`ENVERS_BOARD` dans `src/envers/config.js`, le meilleur temps gagne, `CHRONOS` dans `classement/api.js`) :
  fenêtre `BoardModal.jsx` ouverte à la remontée, et lien « Cave : classement » (menu « Jeux » sur téléphone) pour ceux qui l'ont déjà finie.
- Anciens records : `importerRecords()` envoie les `30years:best:<jeu>` du navigateur (`POST /api/import`, classement « Toujours » seulement,
  le meilleur est gardé) juste après le premier pseudo, ou au chargement du site pour ceux qui en avaient déjà un (une fois par pseudo, `30years:import:2` : le « :2 » a relancé l'import pour tous après la baisse du temps minimal de la cave à 10 s).
- Garde-fous : score maximal par jeu (`JEUX` dans `classement/api.js`, à compléter pour un nouveau jeu), 20 parties par joueur et par 10 min,
  mots interdits dans les pseudos, captcha Turnstile à la création d'un pseudo si `TURNSTILE_SITEKEY` + `TURNSTILE_SECRET` sont définis.
- Réglages Cloudflare (une fois) : deux bases D1 (`30years-scores` pour la production, `30years-scores-dev` pour les préversions),
  `classement/schema.sql` collé dans leur console ; projet Pages > Settings > Bindings : D1 sous le nom `DB` ;
  variables `TURNSTILE_SITEKEY`, `TURNSTILE_SECRET` (chiffrée) et `ADMIN_KEY` (chiffrée).
- Administration : `POST /api/admin` avec l'en-tête `X-Admin-Key`, `{ "action": "effacer-pseudo", "pseudo": "…" }`
  ou `{ "action": "effacer-scores", "pseudo": "…", "jeu": "…" }`.
- Tester sans Cloudflare : `node tools/classement/test.mjs` (API sur une base en mémoire) ;
  `npm run build && node tools/classement/serveur.mjs` sert `dist/` + l'API sur http://localhost:8788 (Node 22 ou plus).

## Règles à respecter

- Performance : pas de `backdrop-filter`, animations en `transform`/`opacity`, décor masqué pendant un jeu (`.app.is-gaming`),
  sprites des jeux dessinés une fois dans un canvas hors écran. Viser 60 images/s.
- Le bouton « Souhaiter un joyeux anniversaire » n'est actif que le jour J.
- Tester les jeux : en mode test, la console expose `window.flocon` (aventure, ex. `flocon.startWave(10)` pour le boss),
  `window.fort`, `window.traineau`, `window.foule`, `window.chorale` et `window.bougies`.
- Calendrier : les portes sans jeu ont un texte vide (`null` dans `src/utils/advent.js`) en attendant les vrais textes.
- Ne pas committer `preview-local/` ni `design demos/`.
