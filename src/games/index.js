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

export const ALL_GAMES = [...GAMES, QUIZ, CANDLES, ADVENTURE];

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
    return `${score} ${game.unit}`;
}
