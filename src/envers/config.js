// « L'Envers » : la cave sous la page (passage secret par la molette, à partir du 12 novembre 2026)

export const ENVERS_FROM = new Date(2026, 10, 12);
// Petit message « il y a du nouveau » du jeudi 12 au mercredi 18 novembre inclus
export const ANNOUNCE_UNTIL = new Date(2026, 10, 19);

const KEY = '30years:envers';
const KEY_NEWS = '30years:envers-news';

export function isEnversOpen(now, isBirthday) {
    return !isBirthday && now >= ENVERS_FROM;
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
