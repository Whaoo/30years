// Bandeau des jeux libres, du mercredi 18 novembre 2026 à 9 h au 30 novembre inclus.
// D'abord « Le Grand Quiz et Où est-ce ? », puis chaque jour ouvré le jeu du jour (`dailyGame` dans src/games/index.js).
// Il remplace le bandeau de la cave (qui s'arrête au même moment), sauf le jour d'un anniversaire.
// Fermé, ou le jeu ouvert depuis le bandeau : on ne le remontre plus pour ce jeu-là (une clé par annonce).
export const GAMES_NEWS_FROM = new Date(2026, 10, 18, 9, 0);
export const GAMES_NEWS_UNTIL = new Date(2026, 11, 1);
const KEY = '30years:jeux-news';

export function gamesNewsWindow(now, isBirthday) {
    return !isBirthday && now >= GAMES_NEWS_FROM && now < GAMES_NEWS_UNTIL;
}

export function gamesNewsActive(now, isBirthday, id = 'quiz-geo') {
    if (!gamesNewsWindow(now, isBirthday)) return false;
    try {
        const v = window.localStorage.getItem(KEY);
        // l'ancienne clé (« vu ») correspond à la première annonce
        return v !== 'vu:' + id && !(id === 'quiz-geo' && v === 'vu');
    } catch {
        return true;
    }
}

export function dismissGamesNews(id = 'quiz-geo') {
    try {
        window.localStorage.setItem(KEY, 'vu:' + id);
    } catch {
        /* stockage indisponible : il reviendra au prochain passage */
    }
}
