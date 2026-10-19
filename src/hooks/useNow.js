import { useEffect, useState } from 'react';

// Date courante, rafraîchie régulièrement.
// Pour tester une autre date : ?date=2026-12-09 (ou ?date=2026-12-09T20:30)
// Uniquement en local (npm run dev) : sur le site en ligne, ?date= est ignoré,
// pour qu'on ne puisse pas débloquer les portes et les jeux en avance.
function parseOverride() {
    if (!import.meta.env.DEV || typeof window === 'undefined') return null;
    const raw = new URLSearchParams(window.location.search).get('date');
    if (!raw) return null;
    const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?$/);
    if (!m) return null;
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), m[4] ? Number(m[4]) : 12, m[5] ? Number(m[5]) : 0);
}

const override = parseOverride();
const offset = override ? override.getTime() - Date.now() : 0;

export function useNow(intervalMs = 30000) {
    const [now, setNow] = useState(() => new Date(Date.now() + offset));

    useEffect(() => {
        const id = setInterval(() => setNow(new Date(Date.now() + offset)), intervalMs);
        return () => clearInterval(id);
    }, [intervalMs]);

    return now;
}
