import { lazy } from 'react';

// Les 14 mini-jeux du calendrier de l'Avent, presque un par jour ouvré,
// tous avant le 19 décembre (début des vacances : les jeux suivants passeraient inaperçus).
// door : jour de décembre où le jeu se débloque (il reste jouable ensuite).
// Chaque jeu est chargé à la demande pour garder la page d'accueil légère.
export const GAMES = [
    {
        id: 'snowball',
        title: 'Bataille de boules de neige',
        short: 'Boules',
        door: 1,
        icon: 'snowball',
        unit: 'pts',
        help: 'Vise avec la souris, clique pour lancer. Les cadeaux rapportent gros, et trois touches d’affilée font monter le combo. 45 secondes. P pour la pause.',
        component: lazy(() => import('./SnowballGame'))
    },
    {
        id: 'chorale',
        title: 'La chorale des pingouins',
        short: 'Chorale',
        door: 2,
        icon: 'music',
        unit: 'notes',
        help: 'Écoute la mélodie, puis répète-la dans l’ordre : clic sur les pingouins ou touches 1 à 4. Une note de plus à chaque tour, 2 fausses notes permises. S pour le son.',
        component: lazy(() => import('./ChoirGame'))
    },
    {
        id: 'fishing',
        title: 'Pêche sur la banquise',
        short: 'Pêche',
        door: 3,
        icon: 'fish',
        unit: 'pts',
        help: 'Déplace le pingouin à la souris ou avec ← →, clique ou Espace pour lancer la ligne (et la remonter). Évite les méduses ! 60 secondes. P pour la pause.',
        component: lazy(() => import('./FishingGame'))
    },
    {
        id: 'fort',
        title: 'Fort de neige',
        short: 'Fort',
        door: 4,
        icon: 'castle',
        unit: 'pts',
        help: 'Clique, tire vers l’arrière et relâche pour lancer (ou ← → pour viser, ↑ ↓ pour la force, Espace pour tirer). Fais tomber les bonshommes : 5 forts, les boules restantes rapportent un bonus. P pour la pause.',
        component: lazy(() => import('./FortGame'))
    },
    {
        id: 'flappy',
        title: 'Pingouin volant',
        short: 'Volant',
        door: 7,
        icon: 'umbrella',
        unit: 'pts',
        help: 'Espace, ↑ ou clic : un coup de parapluie vers le haut. Passe entre les stalactites sans les toucher (les premières sont plus espacées). P pour la pause.',
        component: lazy(() => import('./FlappyGame'))
    },
    {
        id: 'traineau',
        title: 'Livraison en traîneau',
        short: 'Traîneau',
        door: 8,
        icon: 'house',
        unit: 'pts',
        help: 'La souris (ou ↑ ↓) règle l’altitude, clic ou Espace pour lâcher un cadeau dans la cheminée. Le vent change à chaque maison. P pour la pause.',
        component: lazy(() => import('./SleighGame'))
    },
    {
        id: 'curling',
        title: 'Curling des pingouins',
        short: 'Curling',
        door: 9,
        icon: 'curling',
        unit: 'pts',
        help: 'Vise à la souris (ou ↑ ↓), maintiens le clic ou Espace pour doser la force, relâche pour lancer. Maintiens à nouveau pendant la glisse pour balayer. Une pierre d’essai guidée, puis 5 pierres. P pour la pause.',
        component: lazy(() => import('./CurlingGame'))
    },
    {
        id: 'runner',
        title: 'Saut sur la banquise',
        short: 'Saut',
        door: 11,
        icon: 'jump',
        unit: 'pts',
        help: 'Espace, ↑ ou clic pour sauter (maintenir pour sauter plus haut), ↓ pour glisser sous les mouettes. P pour la pause.',
        component: lazy(() => import('./RunnerGame'))
    },
    {
        id: 'collegue',
        title: 'Où est mon collègue ?',
        short: 'Foule',
        door: 12,
        icon: 'search',
        unit: 'pts',
        help: 'Retrouve le pingouin habillé comme la personne demandée avant la fin du chrono. Mauvais pingouin : 2 secondes de pénalité. 5 manches. P pour la pause.',
        component: lazy(() => import('./CrowdGame'))
    },
    {
        id: 'slide',
        title: 'Banquise glissante',
        short: 'Glisse',
        door: 14,
        icon: 'slide',
        unit: 'pts',
        help: 'Flèches ou clic : le pingouin glisse jusqu’au prochain obstacle. La neige l’arrête, l’eau le renvoie au départ. 8 niveaux retournés au hasard à chaque partie : moins de coups et plus vite = plus de points. R pour recommencer un niveau.',
        component: lazy(() => import('./SlidePuzzleGame'))
    },
    {
        id: 'memory',
        title: 'Memory des pingouins',
        short: 'Memory',
        door: 15,
        icon: 'cards',
        unit: 'pts',
        help: 'Retourne les cartes et retrouve les paires de pingouins de l’équipe. Moins de coups et plus vite = plus de points, et deux paires d’affilée rapportent un bonus de série.',
        component: lazy(() => import('./MemoryGame'))
    },
    {
        id: 'tower',
        title: 'Tour de bonhommes de neige',
        short: 'Tour',
        door: 16,
        icon: 'tower',
        unit: 'pts',
        help: 'Clic ou Espace pour lâcher la boule pile au-dessus de la tour. Un « parfait » rapporte un bonus. 3 essais. P pour la pause.',
        component: lazy(() => import('./TowerGame'))
    },
    {
        id: 'sled',
        title: 'Descente en luge',
        short: 'Luge',
        door: 17,
        icon: 'sled',
        unit: 'pts',
        help: 'Guide la luge à la souris ou avec ← →. Poissons +10, portes +5, et attention aux sapins et aux rochers : 3 vies. P pour la pause.',
        component: lazy(() => import('./SledGame'))
    },
    {
        id: 'ice',
        title: 'Empilage de glaçons',
        short: 'Glaçons',
        door: 18,
        icon: 'cube',
        unit: 'pts',
        help: '← → pour déplacer, ↑ pour tourner, ↓ pour accélérer, Espace pour lâcher, P pour la pause. Complète des lignes avant que ça déborde !',
        component: lazy(() => import('./IceStackGame'))
    }
];

// Le grand jeu : il apparaît le 10 décembre 2026 (porte 10 du calendrier et bouton « Aventure »
// dans l'en-tête), puis reste disponible. L'adresse /aventure l'ouvre à tout moment, pour tester.
export const ADVENTURE = {
    id: 'aventure',
    title: 'L’aventure de Flocon',
    short: 'Aventure',
    eyebrow: 'Nouveau · jeu d’aventure',
    door: 10,
    from: new Date(2026, 11, 10),
    icon: 'gift',
    unit: 'pts',
    help: 'ZQSD ou flèches pour bouger, clic pour lancer une boule de neige (maintenir 1 s : boule glacée), Espace pour la canne à sucre, P pour la pause. Le feu de camp soigne.',
    component: lazy(() => import('./adventure/AdventureGame'))
};

// Quiz sur les anniversaires : disponible toute l'année (liste « Ensuite » et tuile des mini-jeux)
export const QUIZ = {
    id: 'quiz',
    title: 'Qui fête quand ?',
    short: 'Quiz',
    eyebrow: 'Quiz · toute l’année',
    always: true,
    icon: 'question',
    unit: 'pts',
    help: '10 questions sur les anniversaires de l’équipe. Clic ou touches 1 à 4. Plus tu réponds vite, plus tu marques, et une erreur ne coûte rien.',
    component: lazy(() => import('./QuizGame'))
};

// Le jeu du jour J : il n'apparaît que le jour d'un anniversaire, au nom de la personne fêtée
// (l'adresse /bougies l'ouvre à tout moment pour tester, avec le prochain anniversaire)
export const CANDLES = {
    id: 'bougies',
    title: 'Souffle les bougies',
    short: 'Bougies',
    eyebrow: 'Le jour J',
    birthdayOnly: true,
    icon: 'cake',
    unit: 'pts',
    help: 'Clique sur les flammes avant que la cire coule. Maintiens le clic puis relâche pour un grand souffle sur toute une zone (ou Espace). 30 secondes. P pour la pause.',
    component: lazy(() => import('./CandlesGame'))
};

// Jeux libres, sans lien avec les pingouins ni le calendrier : ouverts toute l'année.
// Ce sont des pages autonomes de public/jeux/, affichées dans un cadre (FrameGame) ; `frame` donne leur adresse.
export const CULTURE = {
    id: 'culture',
    title: 'Le Grand Quiz',
    short: 'Culture G',
    eyebrow: 'Culture générale · toute l’année',
    always: true,
    icon: 'question',
    unit: 'pts',
    frame: '/jeux/grand-quiz.html',
    pitch: 'Culture générale, 9 thèmes',
    help: '9 thèmes au choix, ou « Le Juste Titre » pour compléter des titres de chansons. 20 secondes par question, clic ou touches A à D. Le record compte les parties solo de 10 questions de culture G.',
    component: lazy(() => import('./FrameGame'))
};

export const GEO = {
    id: 'geo',
    title: 'Où est-ce ?',
    short: 'Où est-ce',
    eyebrow: 'Géographie · toute l’année',
    always: true,
    icon: 'map',
    unit: 'pts',
    frame: '/jeux/ou-est-ce.html',
    pitch: 'Villes et villages de France',
    help: 'Place la ville ou le village sur la carte : jusqu’à 1 000 points par lieu selon la distance. Molette ou pincement pour zoomer. Le record compte les parties solo de 10 lieux.',
    component: lazy(() => import('./FrameGame'))
};

// Les jeux du jour de fin novembre : un par jour ouvré, chacun s'ouvre à 9 h le jour dit (`from`).
// Pages autonomes de public/jeux/ (rendu « pixel » en 3D, three.js dans public/jeux/lib/), score renvoyé par postMessage.
export const VOL = {
    id: 'vol',
    title: 'Vol du soir',
    short: 'Vol du soir',
    eyebrow: 'Jeu du jour · ven. 20 nov.',
    from: new Date(2026, 10, 20, 9, 0),
    icon: 'plane',
    unit: 'pts',
    frame: '/jeux/vol-du-soir.html',
    pitch: 'Jet de Noël : couronnes et cadeaux',
    help: 'Clic maintenu ou Maj : turbo. F ou clic droit : larguer un cadeau. 3 minutes : enchaîne les couronnes, ne livre que les chalets dorés sur ta route.',
    component: lazy(() => import('./FrameGame'))
};
// chrono en centièmes de seconde (le classement ne garde que des entiers) → « 3:12,45 »
const chrono = (cs) => {
    const t = Math.round(cs);
    return `${Math.floor(t / 6000)}:${String(Math.floor(t / 100) % 60).padStart(2, '0')},${String(t % 100).padStart(2, '0')}`;
};
export const FUJI = {
    id: 'fuji', title: 'Col du Fuji', short: 'Col du Fuji',
    eyebrow: 'Jeu du jour · lun. 23 nov.',
    from: new Date(2026, 10, 23, 9, 0),
    icon: 'car', unit: '', lowerIsBetter: true, format: chrono, frame: '/jeux/col-du-fuji.html',
    pitch: 'Contre-la-montre au pied du Fuji',
    help: 'Flèches ou souris pour diriger (l’accélérateur est automatique), Espace pour déraper, Maj ou F pour le turbo, ↓ pour freiner. 3 tours : le meilleur temps gagne.',
    component: lazy(() => import('./FrameGame'))
};
export const GOLF = {
    id: 'golf', title: 'Golf au couchant', short: 'Golf',
    eyebrow: 'Jeu du jour · mar. 24 nov.',
    from: new Date(2026, 10, 24, 9, 0),
    icon: 'flag', unit: 'pts', frame: '/jeux/golf-au-couchant.html',
    pitch: 'Mini-golf de 6 trous face à la mer',
    help: 'Tire la balle vers toi comme une fronde (ou ← → pour viser, ↑ ↓ pour doser, Espace pour jouer). C : vue du dessus pour lire les pentes.',
    component: lazy(() => import('./FrameGame'))
};
export const BALLON = {
    id: 'montgolfiere', title: 'La Montgolfière', short: 'Montgolfière',
    eyebrow: 'Jeu du jour · mer. 25 nov.',
    from: new Date(2026, 10, 25, 9, 0),
    icon: 'balloon', unit: 'pts', frame: '/jeux/montgolfiere.html',
    pitch: 'Logique : jouer avec les vents pour livrer le courrier',
    help: '↑ monter, ↓ descendre, Espace attendre : chaque étage a son vent (échelle à droite). Se poser sur les villages dorés pour livrer. R pour refaire un ciel.',
    component: lazy(() => import('./FrameGame'))
};
export const REGATE = {
    id: 'regate', title: 'Régate du lac', short: 'Régate',
    eyebrow: 'Jeu du jour · jeu. 26 nov.',
    from: new Date(2026, 10, 26, 9, 0),
    icon: 'sail', unit: '', lowerIsBetter: true, format: chrono, frame: '/jeux/regate.html',
    pitch: 'Tirer des bords autour de trois bouées',
    help: '← → pour barrer (ou maintenir le clic à gauche, à droite). Face au vent, le bateau s’arrête : tire des bords à 45°. C : vue du dessus.',
    component: lazy(() => import('./FrameGame'))
};
export const DAILY_GAMES = [VOL, FUJI, GOLF, BALLON, REGATE];
// le dernier jeu du jour sorti (null avant le premier)
export function dailyGame(now = new Date()) {
    return DAILY_GAMES.filter((g) => now >= g.from).sort((a, b) => b.from - a.from)[0] || null;
}

export const FREE_GAMES = [CULTURE, GEO, ...DAILY_GAMES];

export const ALL_GAMES = [...GAMES, QUIZ, ...FREE_GAMES, CANDLES, ADVENTURE];

export function getGame(id) {
    return ALL_GAMES.find((g) => g.id === id) || null;
}

export function isUnlocked(game, advent, now = new Date(), ctx = {}) {
    if (!game) return false;
    if (game.always) return true;
    if (game.birthdayOnly) return !!ctx.isBirthday;
    if (game.from) return now >= game.from;
    return advent.isDecember && advent.openCount >= game.door;
}

export function formatScore(game, score) {
    if (score == null) return '—';
    if (game.format) return game.format(score);
    return `${score} ${game.unit}`;
}
