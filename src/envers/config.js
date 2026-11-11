// « L'Envers » : la cave sous la page (passage secret par la molette, du 12 au 30 novembre 2026 inclus)

export const ENVERS_FROM = new Date(2026, 10, 12);
export const ENVERS_UNTIL = new Date(2026, 11, 1); // fermé à partir du 1er décembre (place au calendrier de l'Avent)
// Petit message « il y a du nouveau » du jeudi 12 au mercredi 18 novembre inclus
export const ANNOUNCE_UNTIL = new Date(2026, 10, 19);

const KEY = '30years:envers';
const KEY_NEWS = '30years:envers-news';

// Ouvert tous les jours du 12 au 30 novembre, jour d'anniversaire compris (le bandeau d'annonce, lui, s'efface ce jour-là)
export function isEnversOpen(now) {
    return now >= ENVERS_FROM && now < ENVERS_UNTIL;
}

function read(key) {
    try {
        return window.localStorage.getItem(key);
    } catch {
        return null;
    }
}

function write(key, value) {
    try {
        if (value === null) window.localStorage.removeItem(key);
        else window.localStorage.setItem(key, value);
    } catch {
        /* stockage indisponible : tant pis */
    }
}

// Le message est caché si on l'a fermé ou si on a déjà trouvé la cave
export function announceActive(now, isBirthday) {
    if (isBirthday || now < ENVERS_FROM || now >= ANNOUNCE_UNTIL) return false;
    return read(KEY_NEWS) !== 'vu';
}

export function dismissAnnounce() {
    write(KEY_NEWS, 'vu');
}

// Progression gardée entre deux descentes : lettres trouvées, cases explorées, temps passé
export function loadProgress() {
    try {
        const p = JSON.parse(read(KEY) || 'null');
        if (p && Array.isArray(p.found) && typeof p.explored === 'string') return p;
    } catch {
        /* progression illisible : on repart de zéro */
    }
    return null;
}

export function saveProgress(p) {
    write(KEY, p ? JSON.stringify(p) : null);
}

export function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.round(sec % 60);
    return m ? `${m} min ${String(s).padStart(2, '0')} s` : `${s} s`;
}
