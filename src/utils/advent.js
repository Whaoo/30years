import { daysBetween } from './birthdayLogic';

// Teasers du calendrier de l'Avent : un par jour, du 1er au 25 décembre.
// Textes d'exemple, à remplacer par les vrais.
// game : identifiant du mini-jeu débloqué ce jour-là (voir src/games/index.js)
export const ADVENT_TEASERS = [
    { kind: 'Jeu', title: 'Bataille de boules de neige', text: 'Premier mini-jeu : le pingouin vise les cibles, 45 secondes pour faire le meilleur score.', game: 'snowball' },
    { kind: 'Défi', title: 'Pull moche', text: 'Qui portera le pire pull de Noël vendredi ? Les paris sont ouverts.' },
    { kind: 'Jeu', title: 'Pêche sur la banquise', text: 'Nouveau mini-jeu : lance ta ligne, attrape les poissons dorés et évite les méduses.', game: 'fishing' },
    { kind: 'Playlist', title: 'Ajoute ton titre', text: 'Un morceau d’hiver, un seul. Les doublons seront moqués avec élégance.' },
    { kind: 'Mot doux', title: 'Merci collègue', text: 'Deux lignes pour quelqu’un de l’équipe. On les affiche en salle de pause.' },
    { kind: 'Photo', title: 'Archives du bureau', text: 'Sors la photo d’équipe la plus embarrassante. Vote bientôt.' },
    { kind: 'Jeu', title: 'Pingouin volant', text: 'Nouveau mini-jeu : un parapluie, des stalactites, une seule touche. Combien en passeras-tu ?', game: 'flappy' },
    { kind: 'Blague', title: 'Blague du jour', text: 'Une blague de pingouin, certifiée de très bas niveau.' },
    { kind: 'Jeu', title: 'Curling des pingouins', text: 'Nouveau mini-jeu : vise, dose, balaie. Cinq pierres pour viser le cœur de la cible.', game: 'curling' },
    { kind: 'Quiz', title: 'Devine l’enfant', text: 'Sept photos d’enfance, sept collègues. Bon courage.' },
    { kind: 'Jeu', title: 'Saut sur la banquise', text: 'Nouveau mini-jeu : saute les blocs de glace, glisse sous les mouettes. Jusqu’où iras-tu ?', game: 'runner' },
    { kind: 'Recette', title: 'Chocolat chaud ultime', text: 'Un secret de recette circule dans l’équipe. Indice : cannelle.' },
    { kind: 'Défi', title: 'Échange de talents', text: 'Apprends un truc de dix minutes à quelqu’un d’autre.' },
    { kind: 'Mot doux', title: 'La carte géante', text: 'Une carte circule. Signe-la avant ce soir.' },
    { kind: 'Jeu', title: 'Memory des pingouins', text: 'Nouveau mini-jeu : retrouve les paires de pingouins de l’équipe en un minimum de coups.', game: 'memory' },
    { kind: 'Recette', title: 'Le gâteau mystère', text: 'Quelqu’un apporte un gâteau. Personne ne sait qui.' },
    { kind: 'Jeu', title: 'Descente en luge', text: 'Nouveau mini-jeu : slalom entre les sapins, poissons à ramasser, portes à passer.', game: 'sled' },
    { kind: 'Quiz', title: 'Film de Noël', text: 'Retrouve le film grâce à trois indices absurdes.' },
    { kind: 'Défi', title: 'Zéro réunion', text: 'Une heure sans réunion dans l’agenda. Pari tenu ?' },
    { kind: 'Surprise', title: 'Cadeau d’équipe', text: 'Quelque chose se prépare. On ne dit rien.' },
    { kind: 'Jeu', title: 'Banquise glissante', text: 'Nouveau mini-jeu : un casse-tête de glisse en 8 niveaux. Atteins le poisson en un minimum de coups.', game: 'slide' },
    { kind: 'Jeu', title: 'Tour de bonhommes de neige', text: 'Nouveau mini-jeu : lâche la boule au bon moment et empile le plus haut possible.', game: 'tower' },
    { kind: 'Photo', title: 'Le décor du bureau', text: 'Décore ton coin de bureau. Photo à 17 h.' },
    { kind: 'Jeu', title: 'Empilage de glaçons', text: 'Le grand final : empile les glaçons et complète des lignes avant que ça déborde.', game: 'ice' },
    { kind: 'Finale', title: 'Joyeux Noël', text: 'La grande surprise de l’équipe, révélée à midi.' }
];

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
