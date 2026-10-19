// Meilleurs scores, gardés dans le navigateur (localStorage).
// Rien côté serveur : compatible avec un hébergement statique (Cloudflare Pages).
const key = (id) => `30years:best:${id}`;

export function getBest(id) {
    try {
        const raw = window.localStorage.getItem(key(id));
        if (raw == null) return null;
        const n = Number(raw);
        return Number.isFinite(n) ? n : null;
    } catch {
        return null;
    }
}

// Enregistre le score s'il bat le record. Renvoie true si c'est un nouveau record.
export function saveScore(id, score, lowerIsBetter = false) {
    const best = getBest(id);
    const isRecord = best == null || (lowerIsBetter ? score < best : score > best);
    if (isRecord) {
        try {
            window.localStorage.setItem(key(id), String(score));
        } catch {
            /* stockage indisponible (navigation privée…) : on ignore */
        }
    }
    return isRecord;
}

export function loadBests(ids) {
    const out = {};
    ids.forEach((id) => {
        out[id] = getBest(id);
    });
    return out;
}
