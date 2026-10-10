import { daysBetween } from './birthdayLogic';

// Teasers du calendrier de l'Avent : un par jour, du 1er au 25 décembre.
// Textes d'exemple, à remplacer par les vrais.
export const ADVENT_TEASERS = [
    { kind: 'Lancement', title: 'Le grand départ', text: 'Les guirlandes sont sorties. La playlist de décembre est ouverte à tout le monde.' },
    { kind: 'Défi', title: 'Pull moche', text: 'Qui portera le pire pull de Noël vendredi ? Les paris sont ouverts.' },
    { kind: 'Quiz', title: 'Qui a dit ça ?', text: 'Retrouve l’auteur de la phrase la plus drôle de la machine à café.' },
    { kind: 'Playlist', title: 'Ajoute ton titre', text: 'Un morceau d’hiver, un seul. Les doublons seront moqués avec élégance.' },
    { kind: 'Mot doux', title: 'Merci collègue', text: 'Deux lignes pour quelqu’un de l’équipe. On les affiche en salle de pause.' },
    { kind: 'Photo', title: 'Archives du bureau', text: 'Sors la photo d’équipe la plus embarrassante. Vote bientôt.' },
    { kind: 'Recette', title: 'Chocolat chaud ultime', text: 'Un secret de recette circule dans l’équipe. Indice : cannelle.' },
    { kind: 'Blague', title: 'Blague du jour', text: 'Une blague de pingouin, certifiée de très bas niveau.' },
    { kind: 'Défi', title: 'Cinq minutes de calme', text: 'Coupe les notifications cinq minutes. Respire. Raconte-nous.' },
    { kind: 'Quiz', title: 'Devine l’enfant', text: 'Sept photos d’enfance, sept collègues. Bon courage.' },
    { kind: 'Surprise', title: 'Chasse au trésor', text: 'Un indice caché près de la machine à café. Ouvre l’œil.' },
    { kind: 'Playlist', title: 'Slow du mercredi', text: 'Le morceau qui fait ralentir tout le plateau.' },
    { kind: 'Défi', title: 'Échange de talents', text: 'Apprends un truc de dix minutes à quelqu’un d’autre.' },
    { kind: 'Mot doux', title: 'La carte géante', text: 'Une carte circule. Signe-la avant ce soir.' },
    { kind: 'Photo', title: 'Concours de bonhommes', text: 'Neige ou pas neige, dessine-en un et envoie la photo.' },
    { kind: 'Recette', title: 'Le gâteau mystère', text: 'Quelqu’un apporte un gâteau. Personne ne sait qui.' },
    { kind: 'Quiz', title: 'Film de Noël', text: 'Retrouve le film grâce à trois indices absurdes.' },
    { kind: 'Blague', title: 'Spécial pingouin', text: 'Une deuxième blague, encore pire. Aucune excuse.' },
    { kind: 'Défi', title: 'Zéro réunion', text: 'Une heure sans réunion dans l’agenda. Pari tenu ?' },
    { kind: 'Surprise', title: 'Cadeau d’équipe', text: 'Quelque chose se prépare. On ne dit rien.' },
    { kind: 'Playlist', title: 'Solstice', text: 'Le titre le plus long de l’hiver. Ajoute le tien.' },
    { kind: 'Mot doux', title: 'Vœux sincères', text: 'Un souhait pour l’année qui vient, à glisser dans l’urne.' },
    { kind: 'Photo', title: 'Le décor du bureau', text: 'Décore ton coin de bureau. Photo à 17 h.' },
    { kind: 'Réveillon', title: 'La veillée', text: 'Dernier teaser avant le grand jour : le programme du 25.' },
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
