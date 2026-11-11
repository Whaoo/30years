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
- Aucun serveur : tout tourne dans le navigateur. Les records sont dans le `localStorage` (`30years:best:<id>`).

## Organisation du code

- `src/utils/birthdayLogic.js` : la liste des anniversaires (`{ name, date: 'JJ-MM' }`, pas d'année, pas d'âge affiché).
- `src/utils/advent.js` : les 25 portes du calendrier de l'Avent (affiché par défaut en décembre, verrouillé sinon).
- `src/utils/theme.js` : saisons × moment de la journée × météo (Open-Meteo).
- `src/games/index.js` : le registre des jeux.
  - `GAMES` : les 14 mini-jeux de l'Avent, débloqués porte par porte en décembre (portes 1-4, 7-9, 11-12, 14-18).
  - `ADVENTURE` (« L'aventure de Flocon », `src/games/adventure/`) apparaît le 10/12/2026 (porte 10 + bouton de l'en-tête).
  - `QUIZ` (« Qui fête quand ? », `always`) : ouvert toute l'année depuis la liste des anniversaires.
  - `CANDLES` (« Souffle les bougies », `birthdayOnly`) : bouton du compte à rebours, uniquement le jour J.
  - Les adresses `/aventure`, `/quiz` et `/bougies` ouvrent ces jeux à tout moment pour tester.
- `src/games/GameCanvas.jsx` : moteur commun des jeux canvas (boucle, mise à l'échelle, clavier, souris, tactile).
- Vue Speed Dial de Vivaldi : `?dial`, `/dial`, ou fenêtre de 480 px de côté ou moins (`src/components/Dial.jsx`).
- `src/envers/` : « L'Envers », la cave sous la page (à partir du 12/11/2026, jamais le jour d'un anniversaire).
  - Passage : trois coups de molette vers le bas (ou trois glissés vers le haut sur téléphone) en moins de 4 s, géré dans `App.jsx`.
  - Annonce du 12 au 18/11 : bandeau `NewsBanner.jsx` et pastille « Nouveau ! » dans la vue Vivaldi (`config.js`).
  - `engine.js` : chute d'introduction, exploration à la lampe (cave 2560 x 1440, carte en brouillard), fin (message, citrouille qui gèle, remontée).
  - `Puzzle.jsx` : remettre TRICK OR TREE dans l'ordre. Progression gardée dans `localStorage` (`30years:envers`), record de temps `30years:best:envers`.
  - `art/` : décors SVG générés depuis les maquettes du canevas de design (Page 2) ; `level.json` = plateformes, échelles, lettres.
  - En mode test : `/envers` ouvre la cave, le panneau « Test » a un bouton dédié, la console expose `window.envers` (`revealAll()`, `grabAll()`).

## Règles à respecter

- Performance : pas de `backdrop-filter`, animations en `transform`/`opacity`, décor masqué pendant un jeu (`.app.is-gaming`),
  sprites des jeux dessinés une fois dans un canvas hors écran. Viser 60 images/s.
- Le bouton « Souhaiter un joyeux anniversaire » n'est actif que le jour J.
- Tester les jeux : en mode test, la console expose `window.flocon` (aventure, ex. `flocon.startWave(10)` pour le boss),
  `window.fort`, `window.traineau`, `window.foule`, `window.chorale` et `window.bougies`.
- Calendrier : les portes sans jeu ont un texte vide (`null` dans `src/utils/advent.js`) en attendant les vrais textes.
- Ne pas committer `preview-local/` ni `design demos/`.
