// Décembre 2026 : la source de vérité du calendrier (jours ouvrés seulement, pas de jeu le week-end).
// - MINI_GAMES : le mini-jeu de chaque jour ouvré (identifiants de src/games/index.js)
// - QUEST : la grande quête en 4 épisodes, chacun débloqué par sa date ET par la réussite du précédent
//   (avec des garde-fous : voir quest.js)
export const YEAR = 2026;
export const day = (d) => new Date(YEAR, 11, d);

export const MINI_GAMES = {
    1: 'snowball', 2: 'chorale', 3: 'fishing', 4: 'fort',
    7: 'flappy', 8: 'traineau', 9: 'curling', 10: 'guirlande', 11: 'runner',
    14: 'collegue', 15: 'memory', 16: 'relais', 17: 'slide', 18: 'tower',
    21: 'sled', 22: 'ice'
};

// Jour de rattrapage : tout reste jouable (les jeux restent ouverts après leur jour)
export const CATCH_UP_DAY = 23;

// Le film d'introduction de la quête (le 1er décembre)
export const FILM = {
    from: day(1),
    sources: [
        { src: '/film/prologue.mp4', type: 'video/mp4' }
    ],
    poster: '/film/prologue.jpg'
};

// Les 4 épisodes. place : position sur la carte de la quête (en % de la carte).
// shard : l'épisode rend un éclat de givre (les 3 éclats ouvrent le fort du Golem).
export const QUEST = [
    { id: 'monts', ep: 1, title: 'Les Monts Givrés', kind: 'Plateforme', from: day(1), place: [22, 70], shard: true },
    { id: 'reveillon', ep: 2, title: 'Opération Réveillon', kind: 'Défense du sapin', from: day(8), place: [42, 38], shard: true },
    { id: 'chrono', ep: 3, title: 'Chronoflocon', kind: 'Gestion', from: day(15), place: [66, 44], shard: true },
    { id: 'aventure', ep: 4, title: 'Le fort du Golem', kind: 'Aventure', from: day(24), place: [84, 68], shard: false }
];

export function questEpisode(id) {
    return QUEST.find((q) => q.id === id) || null;
}

export function isWeekend(date) {
    const d = date.getDay();
    return d === 0 || d === 6;
}
