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
  Vue Avent allégée : à droite, seulement la tuile des mini-jeux (et un rappel cliquable le jour d'un anniversaire) ;
  la liste des prochains anniversaires reste dans l'onglet « Anniversaires ».
- `src/utils/theme.js` : saisons × moment de la journée × météo (Open-Meteo).
- `src/december/` : décembre 2026, la source de vérité du calendrier et de la grande quête.
  - `calendar.js` : un mini-jeu par jour ouvré (jamais le week-end), les 4 épisodes de la quête (`QUEST` : 1er, 4, 9 et 15 décembre),
    les films (`FILMS`) et `NOEL_DAY` (18/12) : vidéo « Joyeux Noël en avance » à la place d'un jeu le 24.
  - `seed.js` : « scénario du jour » : graine = date de Paris + identifiant du jeu (même partie pour tout le monde le même jour).
    Tout l'aléatoire qui change une partie passe par `dailyRng` ; `Math.random` est réservé au cosmétique.
  - `quest.js` : progression (`30years:quest`), épisode ouvert à sa date ET après le précédent, ou de toute façon à J+2 ;
    final jamais verrouillé ; « Passer » après 3 échecs ; code de passage de 4 lettres pour un autre navigateur ; score officiel = premier essai du jour.
  - `results.js` : écran de fin commun (détail du score, mention S/A/B/C, record, code de vérification).
- `src/components/QuestModal.jsx` : la carte de la quête (bouton « La quête » de l'en-tête en décembre), le film, les éclats de givre.
- `public/film/` : les films de la quête (liste et dates : `FILMS` dans `calendar.js`). Le prologue (v3 « conte », 2 min 20, le 1er décembre)
  puis une cinématique d'environ 1 min avant chaque épisode (`chapitre2` le 4, `chapitre3` le 9, `chapitre4` le 15) : le méchant précédent vaincu,
  le dérèglement causé par le suivant, Flocon qui part l'affronter ; enfin `noel` le 18 (épilogue « Joyeux Noël » et générique avec les prénoms de l'équipe :
  à mettre à jour dans `TEAM` de `tools/film/v3/film_noel.js` si l'équipe change). Sources (dessinées en code) dans `tools/film/` (v3 et épisodes dans `tools/film/v3/`).
  Un film ne s'ouvre qu'à sa date ET une fois le palier d'avant réussi ou passé (`after`, `filmState` dans `quest.js`, sans ouverture à J+2).
  `FilmPromo.jsx` annonce le film débloqué le plus récent tant qu'il n'est pas vu ; `FilmPlayer.jsx` le joue en pleine page dans la fenêtre
  (pas de plein écran), vidéo aux bords arrondis ; la carte de la quête les liste tous.
- `src/games/index.js` : le registre des jeux.
  - `GAMES` : les mini-jeux de l'Avent, débloqués porte par porte en décembre (jours ouvrés : 1-4, 7-11, 14-18, 21, 22).
    Dont `guirlande` (porte 10, `GarlandGame.jsx` : relier les ampoules, grilles du jour) et `relais` (porte 16, `RelayGame.jsx` : jeu de fusion au relais colis, 3 min).
  - `MONTS` (« Les Monts Givrés », `src/games/monts/`) : épisode 1 de la quête, le 1er décembre. Plateforme en 3 niveaux + yéti (~4 min),
    tronçons de niveaux tirés par la graine du jour, mode tranquille, contrôles tactiles. `/monts` l'ouvre pour tester ; console : `window.monts`.
  - `REVEILLON` (« Opération Réveillon », `src/games/reveillon/`) : épisode 2, le 4 décembre. Défense du sapin (~4 min) : une carte par jour (graine),
    8 vagues (nuit : mimiques révélées par le phare, blizzard, monstres pressés), boss qui se coupe en trois, 10 cadeaux, 4 tours × 3 niveaux,
    9 emplacements dont 2 près du sapin ; les chauves-souris volent en ligne droite vers le sapin, les biscuits sprintent quand on les touche.
    Score = 500/cadeau + monstres + 20/s d'avance (« Vague suivante ») + poissons restants. Réglage global : `HP_SCALE`. `/reveillon` ; console : `window.reveillon`.
  - `CHRONO` (« Chronoflocon », `src/games/chrono/`) : épisode 3, le 9 décembre. Gestion du centre de tri (~4 min) : glisser d'une île à l'autre
    (ou deux clics) ouvre une liaison (train sur les ponts de banquise dessinés entre les îles, bateau sur les chenaux, avion entre les pistes : `LINKS`) ;
    cliquer Trains/Bateaux/Avions dans le dépôt (touches 1-3) choisit le véhicule et allume ses trajets possibles ; cliquer une liaison
    en retire un véhicule (jusqu'à 3 par liaison) ; les colis suivent le plus court chemin tout seuls. Tutoriel guidé en 4 étapes au premier Matin,
    îles « À relier » signalées en rouge. Événements qui demandent d'agir : panne (cliquer le véhicule), iceberg (3 clics), pont fendu (ses trains
    reviennent au dépôt, 18 s sans pont), plus brouillard, tempête, rush de 10 colis et aurore.
    3 tournées (50/70/80 s, réseau conservé, un renfort à choisir entre deux). Le Soir est surchargé : heure de pointe (`peak` dans `ROUNDS`,
    bande rouge sur la frise) où les colis arrivent presque trois fois plus vite ; il donne un bateau et un avion pour relier Aurore.
    Humeur : baisse pour chaque colis qui attend plus de 11 s (plus encore après 22 s) et dès que plus de 8 colis attendent, au plus 3,5 points/s ;
    un colis livré en retard la remonte peu. À zéro : Mamie envoie un traîneau une fois, puis sursis de 8 s, puis on rejoue la tournée ;
    le Matin ne se perd pas. Express dorés, Radio Banquise (événements annoncés 8 s avant), traîneau joker. Mentions : S 8500, A 6500, B 4500.
    Score = (colis × 15 + rapidité + express × 50) × (1 + 0,4 × humeur) + 150 si le joker est gardé. `/chrono` ; console : `window.chrono`.
  - `ADVENTURE` (« L'aventure de Flocon », `src/games/adventure/`) : le grand final, épisode 4 de la quête (15 décembre). 6 vagues au nombre de monstres fini,
    puis le Golem (au plus 12 mini-golems), graine du jour, bonus de temps, écran de fin commun, « Reprendre la vague » après un K.O.
  - `QUIZ` (« Qui fête quand ? », `always`) : ouvert toute l'année depuis la liste des anniversaires.
  - `CANDLES` (« Souffle les bougies », `birthdayOnly`) : bouton du compte à rebours, uniquement le jour J.
  - `FREE_GAMES` : jeux libres sans lien avec les pingouins ni le calendrier, ouverts toute l'année (liens sous la liste « Ensuite »
    et dans la tuile des mini-jeux) : `CULTURE` (« Le Grand Quiz », 9 thèmes + « Le Juste Titre ») et `GEO` (« Où est-ce ? », placer
    villes et villages sur la carte de France). Ce sont des pages autonomes dans `public/jeux/` affichées dans un cadre (`FrameGame.jsx`) ;
    elles renvoient leur score par `postMessage` (`{ type: '30years:score', game, score }`). Le record du site ne compte que les parties
    solo de 10 questions de culture G / de 10 lieux. Contours de la carte : IGN Admin Express via france-geojson (Licence ouverte).
  - Les adresses `/aventure`, `/monts`, `/reveillon`, `/chrono`, `/quiz` et `/bougies` ouvrent ces jeux à tout moment pour tester ;
    `/culture` et `/ou-est-ce` ouvrent les jeux libres (adresses à partager).
- `src/games/GameCanvas.jsx` : moteur commun des jeux canvas (boucle, mise à l'échelle, clavier, souris, tactile).
  `fixedStep` : mise à jour à pas fixe de 1/120 s (obligatoire pour les jeux de décembre, sinon la partie dépend de la fréquence de l'écran).
  Les gestionnaires `pointer*` reçoivent l'identifiant du doigt (multi-touch).
- Vue Speed Dial de Vivaldi : `?dial`, `/dial`, ou fenêtre de 480 px de côté ou moins (`src/components/Dial.jsx`).
- `src/envers/` : « L'Envers », la cave sous la page (du 12 au 30/11/2026 inclus, tous les jours).
  - Passage : trois coups de molette vers le bas (ou trois glissés vers le haut sur téléphone) en moins de 4 s, géré dans `App.jsx`.
  - Annonce du 12 au 18/11 : bandeau `NewsBanner.jsx` et pastille « Nouveau ! » dans la vue Vivaldi (`config.js`).
  - `engine.js` : chute d'introduction, exploration à la lampe en vue de dessus (4 salles : crypte et potions côté Halloween, atelier et sapin côté Noël ;
    déplacement libre aux flèches ou au doigt, lumière arrêtée par les murs, carte en brouillard, objectif 85 % éclairé + 11 lettres), fin (message, citrouille qui gèle, micro doré et « IT’S… TIIIIIMEEEE ! », remontée).
  - Mécaniques (partie de moins de 5 min) : portes de glace (il faut la bougie de l'atelier) et toiles (les ciseaux du sapin),
    4 lettres cachées dans des objets (Espace ou bouton « Fouiller » près d'un ✦), pile de lampe qui s'use (piles à ramasser),
    3 fantômes-citrouilles qui volent la dernière lettre dans le noir et la recachent ailleurs (la lampe les fait fuir).
  - `Puzzle.jsx` : remettre TRICK OR TREE dans l'ordre. Progression gardée dans `localStorage` (`30years:envers`), record de temps `30years:best:envers`.
  - `art/` : décors SVG générés depuis les maquettes du canevas de design (Page 2) ; `level-top.json` = salles, couloirs, obstacles, lumières, lettres.
  - En mode test : `/envers` ouvre la cave, le panneau « Test » a un bouton dédié, la console expose `window.envers` (`revealAll()`, `grabAll()`, `openDoors()`, `setBattery(n)`).

## Règles à respecter

- Performance : pas de `backdrop-filter`, animations en `transform`/`opacity`, décor masqué pendant un jeu (`.app.is-gaming`),
  sprites des jeux dessinés une fois dans un canvas hors écran. Viser 60 images/s.
  Dans les boucles de jeu : pas de `shadowBlur`, pas de dégradé recréé à chaque image (décors préparés hors écran), halos en image.
- Jeux de décembre : une partie dure 2 à 6 minutes maximum, et chaque jeu affiche un score détaillé pour se comparer entre collègues.
- Git depuis le PC du commanditaire (Windows, fins de ligne CRLF) : committer avec `git -c core.autocrlf=true`.
- Le bouton « Souhaiter un joyeux anniversaire » n'est actif que le jour J.
- Tester les jeux : en mode test, la console expose `window.flocon` (aventure, ex. `flocon.startWave(10)` pour le boss),
  `window.fort`, `window.traineau`, `window.foule`, `window.chorale`, `window.bougies`, `window.guirlande` (`solve()`) et `window.relais`.
- Calendrier : les portes sans jeu ont un texte vide (`null` dans `src/utils/advent.js`) en attendant les vrais textes.
- Ne pas committer `preview-local/` ni `design demos/`.
