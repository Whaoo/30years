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

// Les films de la quête : le prologue (1er décembre), puis une cinématique avant chaque épisode
// (on voit le méchant précédent vaincu, le dérèglement causé par le suivant, et Flocon qui part l'affronter).
// Chaque film s'ouvre le jour de son épisode ET une fois le palier d'avant réussi (after : épisode à finir, ou « Passer ») :
// on ne voit jamais un méchant vaincu avant de l'avoir battu. Sa grande annonce s'affiche tant qu'il n'est pas vu (voir quest.js).
const film = (id, from, o) => ({ id, from, sources: [{ src: `/film/${id}.mp4`, type: 'video/mp4' }], poster: `/film/${id}.jpg`, ...o });
export const FILMS = [
    film('prologue', day(1), {
        title: 'Le prologue', length: '2 min 20', blurb: 'Deux minutes pour savoir pourquoi Flocon quitte l’igloo de Mamie.',
        promo: { eyebrow: 'Décembre · nouveau', title: 'La Grande Quête de Flocon commence !', text: 'Un éclat de givre, une lettre du Maire, une écharpe tricotée par Mamie… Deux minutes pour découvrir l’histoire, puis à toi de jouer.' }
    }),
    film('chapitre2', day(4), {
        title: 'Chapitre 2 · Le village de Noël', length: '1 min', ep: 2, after: 'monts',
        promo: { eyebrow: 'Chapitre 2 · nouveau', title: 'Le village de Noël est en danger !', text: 'Le Yéti a rendu le premier éclat… mais au village, les bonshommes grognons encerclent le grand sapin. Une minute avant l’épisode 2.' }
    }),
    film('chapitre3', day(9), {
        title: 'Chapitre 3 · L’Archipel du Tri', length: '1 min', ep: 3, after: 'reveillon',
        promo: { eyebrow: 'Chapitre 3 · nouveau', title: 'Plus aucun cadeau ne part !', text: 'Le sapin brille de nouveau, mais la Grande Trieuse s’est détraquée. Une minute avant l’épisode 3.' }
    }),
    film('chapitre4', day(15), {
        title: 'Chapitre 4 · Le fort du Golem', length: '1 min', ep: 4, after: 'chrono',
        promo: { eyebrow: 'Le grand final', title: 'Le Golem de givre se réveille…', text: 'Les trois éclats sont réunis, et toute la colère du Golem s’abat sur le royaume. Une minute avant le grand final.' }
    }),
    // vendredi 18, dernier jour avant les vacances : l'épilogue et son générique (avec les prénoms de l'équipe)
    film('noel', day(18), {
        title: 'Épilogue · Joyeux Noël !', length: '1 min 40', final: true, after: 'aventure',
        promo: { eyebrow: 'Joyeux Noël en avance', title: 'Tout le royaume fait la fête !', text: 'Le Golem est vaincu, le givre fond, et tout le monde se retrouve au village… Une petite vidéo pour fêter Noël avant les vacances, avec un générique un peu spécial.' }
    })
];
export const FILM = FILMS[0];
export const filmById = (id) => FILMS.find((f) => f.id === id) || FILM;

// Les 4 épisodes. place : position sur la carte de la quête (en % de la carte).
// shard : l'épisode rend un éclat de givre (les 3 éclats ouvrent le fort du Golem).
export const QUEST = [
    { id: 'monts', ep: 1, title: 'Les Monts Givrés', kind: 'Plateforme', from: day(1), place: [22, 70], shard: true },
    { id: 'reveillon', ep: 2, title: 'Opération Réveillon', kind: 'Défense du sapin', from: day(4), place: [42, 38], shard: true },
    { id: 'chrono', ep: 3, title: 'Chronoflocon', kind: 'Gestion', from: day(9), place: [66, 44], shard: true },
    { id: 'aventure', ep: 4, title: 'Le fort du Golem', kind: 'Aventure', from: day(15), place: [84, 68], shard: false }
];

// Les épisodes : 1er, 4, 9 et 15 décembre. Le vendredi 18, dernier jour avant les vacances, une vidéo
// « Joyeux Noël en avance » clôt l'histoire (pas de jeu le 24 : beaucoup de collègues sont en congés).
// La quête reste jouable pendant les vacances, jusqu'au 8 janvier inclus.
export const NOEL_DAY = day(18);
export const QUEST_UNTIL = new Date(YEAR + 1, 0, 9);

export function isQuestSeason(now) {
    return now >= day(1) && now < QUEST_UNTIL;
}

export function questEpisode(id) {
    return QUEST.find((q) => q.id === id) || null;
}

export function isWeekend(date) {
    const d = date.getDay();
    return d === 0 || d === 6;
}
