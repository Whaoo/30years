// Bandeau « Nouveau : Le Grand Quiz et Où est-ce ? » : du mercredi 18 novembre 2026 à 9 h au mercredi 25 inclus.
// Il remplace le bandeau de la cave (qui s'arrête au même moment), sauf le jour d'un anniversaire.
export const GAMES_NEWS_FROM = new Date(2026, 10, 18, 9, 0);
export const GAMES_NEWS_UNTIL = new Date(2026, 10, 26);
const KEY = '30years:jeux-news';

export function gamesNewsWindow(now, isBirthday) {
    return !isBirthday && now >= GAMES_NEWS_FROM && now < GAMES_NEWS_UNTIL;
}

// Fermé, ou un des deux jeux déjà ouvert depuis le bandeau : on ne le remontre plus
export function gamesNewsActive(now, isBirthday) {
    if (!gamesNewsWindow(now, isBirthday)) return false;
    try {
        return window.localStorage.getItem(KEY) !== 'vu';
    } catch {
        return true;
    }
}

export function dismissGamesNews() {
    try {
        window.localStorage.setItem(KEY, 'vu');
    } catch {
        /* stockage indisponible : il reviendra au prochain passage */
    }
}
