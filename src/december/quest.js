import { FILMS, QUEST, questEpisode } from './calendar';
import { hash32 } from './seed';

// Progression de la quête, gardée dans ce navigateur (localStorage `30years:quest`).
// Garde-fous pour que personne ne reste bloqué (autre navigateur, téléphone, échecs répétés) :
// - un épisode s'ouvre de toute façon 2 jours après sa date, même sans avoir fini le précédent ;
// - le grand final n'est jamais verrouillé par la progression ;
// - après 3 échecs, le joueur peut passer l'épisode (sans score ni éclat) ;
// - chaque victoire affiche un code de passage à saisir dans un autre navigateur.
const KEY = '30years:quest';
const DAY = 86400000;
export const SKIP_AFTER_FAILS = 3;

export function loadQuest() {
    try {
        const raw = JSON.parse(window.localStorage.getItem(KEY) || '{}');
        // films vus (avant la version à plusieurs films : un seul booléen pour le prologue)
        const films = { ...(raw.films || {}), ...(raw.film ? { prologue: true } : {}) };
        return { done: raw.done || {}, fails: raw.fails || {}, skipped: raw.skipped || {}, films, film: !!films.prologue };
    } catch {
        return { done: {}, fails: {}, skipped: {}, films: {}, film: false };
    }
}

function saveQuest(q) {
    try {
        window.localStorage.setItem(KEY, JSON.stringify(q));
    } catch {
        /* navigation privée : la progression ne sera pas gardée */
    }
    return q;
}

export function isCleared(q, id) {
    return !!(q.done[id] || q.skipped[id]);
}

// État d'un film : 'locked-date', 'locked-prev' (le palier d'avant n'est ni réussi ni passé), 'open'.
// Contrairement aux épisodes, pas d'ouverture automatique à J+2 : le film montre le méchant précédent vaincu.
export function filmState(film, now, q = loadQuest()) {
    if (now < film.from) return 'locked-date';
    if (film.after && !isCleared(q, film.after)) return 'locked-prev';
    return 'open';
}

// Le film à annoncer : le plus récent déjà débloqué
export function latestOpenFilm(now, q = loadQuest()) {
    return [...FILMS].reverse().find((f) => filmState(f, now, q) === 'open') || null;
}

// État d'un épisode : 'locked-date' (pas encore sa date), 'locked-prev' (finir le précédent), 'open', 'done'
export function episodeState(id, now, q = loadQuest()) {
    const ep = questEpisode(id);
    if (!ep) return 'locked-date';
    if (q.done[id]) return 'done';
    if (now < ep.from) return 'locked-date';
    if (ep.ep === 1 || ep.ep === QUEST.length) return 'open';
    const prev = QUEST[ep.ep - 2];
    if (isCleared(q, prev.id)) return 'open';
    if (now - ep.from >= 2 * DAY) return 'open';
    return 'locked-prev';
}

export function markWon(id, score) {
    const q = loadQuest();
    const best = q.done[id]?.score ?? -Infinity;
    q.done[id] = { score: Math.max(best, score), at: Date.now() };
    return saveQuest(q);
}

export function markFail(id) {
    const q = loadQuest();
    q.fails[id] = (q.fails[id] || 0) + 1;
    saveQuest(q);
    return q.fails[id];
}

export function markSkipped(id) {
    const q = loadQuest();
    q.skipped[id] = true;
    return saveQuest(q);
}

export function markFilmSeen(id = 'prologue') {
    const q = loadQuest();
    q.films[id] = true;
    if (id === 'prologue') q.film = true;
    return saveQuest(q);
}

export function shardCount(q = loadQuest()) {
    return QUEST.filter((e) => e.shard && q.done[e.id]).length;
}

// Code de passage d'un épisode : 4 lettres fixes par épisode, données à la victoire
const LETTERS = 'BCDFGHJKLMNPRSTVWXZ';
export function passCode(id) {
    let h = hash32(`quete|${id}|flocon-2026`);
    let s = '';
    for (let i = 0; i < 4; i++) {
        s += LETTERS[h % LETTERS.length];
        h = Math.floor(h / LETTERS.length);
    }
    return s;
}

// Saisie d'un code : valide l'épisode correspondant. Renvoie l'épisode validé, ou null.
export function redeemCode(code) {
    const c = String(code || '').trim().toUpperCase();
    const ep = QUEST.find((e) => passCode(e.id) === c);
    if (!ep) return null;
    const q = loadQuest();
    if (!q.done[ep.id]) q.done[ep.id] = { score: 0, at: Date.now(), code: true };
    saveQuest(q);
    return ep;
}

// « Score officiel » du jour = le premier essai terminé (le record, lui, récompense l'entraînement)
export function firstTryOfDay(gameId, day, score) {
    const k = `30years:first:${gameId}:${day}`;
    try {
        const prev = window.localStorage.getItem(k);
        if (prev != null) return { score: Number(prev), isFirst: false };
        window.localStorage.setItem(k, String(score));
    } catch {
        /* stockage indisponible */
    }
    return { score, isFirst: true };
}
