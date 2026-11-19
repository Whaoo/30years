// Questions posées à quelqu'un en particulier avant certains jeux, avec une note en étoiles et un commentaire.
// La réponse part dans la base des classements (table `avis`, voir classement/api.js) ; « Je ne suis pas … » ferme sans rien envoyer.
// Une fois répondu (ou « pas moi »), la question ne revient plus sur ce navigateur (`30years:avis:<id>`).
export const QUESTIONS = [
    {
        id: 'hunger-games',
        pour: 'Laura',
        texte: 'Laura, tu as pensé quoi de Hunger Games du coup ?',
        jeux: ['vol', 'lanternes'],             // les deux jeux du vendredi 20 novembre
        depuis: new Date(2026, 10, 20, 0, 0)
    }
];
const KEY = (id) => `30years:avis:${id}`;

export function questionPour(game, now = new Date()) {
    const q = QUESTIONS.find((x) => x.jeux.includes(game.id) && now >= x.depuis);
    if (!q) return null;
    try {
        if (window.localStorage.getItem(KEY(q.id))) return null;
    } catch {
        return null;
    }
    return q;
}

export function marquerAvis(id, valeur) {
    try {
        window.localStorage.setItem(KEY(id), valeur);
    } catch {
        /* navigation privée : la question reviendra */
    }
}
