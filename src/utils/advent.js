import { daysBetween } from './birthdayLogic';

// Teasers du calendrier de l'Avent : un par jour, du 1er au 25 décembre.
// game : identifiant du mini-jeu débloqué ce jour-là (voir src/games/index.js)
// null : porte sans texte pour l'instant. Pour en écrire un, remplacer null par
//   { kind: 'Défi', title: 'Titre court', text: 'Une ou deux phrases, 140 caractères maximum.' }
//   (utiliser l'apostrophe typographique ’ dans les textes)
export const ADVENT_TEASERS = [
    { kind: 'Jeu', title: 'Bataille de boules de neige', text: 'Premier mini-jeu : le pingouin vise les cibles, 45 secondes pour faire le meilleur score.', game: 'snowball' },
    { kind: 'Jeu', title: 'La chorale des pingouins', text: 'Nouveau mini-jeu : les pingouins chantent, répète la mélodie dans l’ordre. Une note de plus à chaque tour.', game: 'chorale' },
    { kind: 'Jeu', title: 'Pêche sur la banquise', text: 'Nouveau mini-jeu : lance ta ligne, attrape les poissons dorés et évite les méduses.', game: 'fishing' },
    { kind: 'Jeu', title: 'Fort de neige', text: 'Nouveau mini-jeu : une catapulte, des boules de neige et cinq forteresses gardées par des bonhommes grognons.', game: 'fort' },
    null, // porte 5 : texte à écrire
    null, // porte 6 : texte à écrire
    { kind: 'Jeu', title: 'Pingouin volant', text: 'Nouveau mini-jeu : un parapluie, des stalactites, une seule touche. Combien en passeras-tu ?', game: 'flappy' },
    { kind: 'Jeu', title: 'Livraison en traîneau', text: 'Nouveau mini-jeu : Flocon lâche les cadeaux dans les cheminées. Attention au vent, il change à chaque toit.', game: 'traineau' },
    { kind: 'Jeu', title: 'Curling des pingouins', text: 'Nouveau mini-jeu : vise, dose, balaie. Une pierre d’essai guidée, puis cinq pierres pour viser le cœur de la cible.', game: 'curling' },
    { kind: 'Jeu', title: 'L’aventure de Flocon', text: 'Le grand jeu de Noël : explore la banquise, récupère les cadeaux et affronte le Golem de givre. Il reste ensuite dans l’en-tête.', game: 'aventure' },
    { kind: 'Jeu', title: 'Saut sur la banquise', text: 'Nouveau mini-jeu : saute les blocs de glace, glisse sous les mouettes. Jusqu’où iras-tu ?', game: 'runner' },
    { kind: 'Jeu', title: 'Où est mon collègue ?', text: 'Nouveau mini-jeu : une foule de pingouins habillés comme l’équipe. Retrouve la bonne personne avant la fin du chrono.', game: 'collegue' },
    null, // porte 13 : texte à écrire
    { kind: 'Jeu', title: 'Banquise glissante', text: 'Nouveau mini-jeu : un casse-tête de glisse en 8 niveaux, retournés à chaque partie. Le moins de coups, le plus vite possible.', game: 'slide' },
    { kind: 'Jeu', title: 'Memory des pingouins', text: 'Nouveau mini-jeu : retrouve les paires de pingouins de l’équipe. Enchaîne les paires pour le bonus de série.', game: 'memory' },
    { kind: 'Jeu', title: 'Tour de bonhommes de neige', text: 'Nouveau mini-jeu : lâche la boule au bon moment et empile le plus haut possible.', game: 'tower' },
    { kind: 'Jeu', title: 'Descente en luge', text: 'Nouveau mini-jeu : slalom entre les sapins, poissons à ramasser, portes à passer.', game: 'sled' },
    { kind: 'Jeu', title: 'Empilage de glaçons', text: 'Le grand final avant les vacances : empile les glaçons et complète des lignes avant que ça déborde.', game: 'ice' },
    null, // porte 19 : texte à écrire
    null, // porte 20 : texte à écrire
    null, // porte 21 : texte à écrire
    null, // porte 22 : texte à écrire
    null, // porte 23 : texte à écrire
    null, // porte 24 : texte à écrire
    null // porte 25 : texte à écrire
];

// Contenu affiché derrière une porte ouverte qui n'a pas encore de texte
export const EMPTY_TEASER = {
    kind: '',
    title: 'Surprise en préparation',
    text: 'Cette porte se remplira bientôt. En attendant, les mini-jeux t’attendent.',
    empty: true
};

export function teaserFor(n) {
    return ADVENT_TEASERS[n - 1] || EMPTY_TEASER;
}

// Ordre d'affichage des portes dans la grille 5 × 5
export const DOOR_ORDER = [7, 19, 3, 14, 22, 11, 1, 25, 9, 17, 24, 5, 16, 2, 12, 20, 8, 13, 23, 4, 15, 21, 6, 18, 10];

export function adventState(now) {
    const isDecember = now.getMonth() === 11;
    const day = now.getDate();
    return {
        isDecember,
        day,
        openCount: isDecember ? Math.min(25, day) : 0,
        todayDoor: isDecember && day <= 25 ? day : 0,
        daysToStart: isDecember ? 0 : daysBetween(now, new Date(now.getFullYear(), 11, 1))
    };
}
