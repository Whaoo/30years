// « Scénario du jour » : tout l'aléatoire qui change une partie vient d'une graine calculée
// à partir de la date de Paris et de l'identifiant du jeu. Le même jour, tout le monde joue
// exactement la même partie (les scores se comparent à la machine à café) ; le lendemain, elle change.
// Math.random reste réservé au cosmétique (particules, flocons, tremblements).

// Date du jour à Paris, au format AAAA-MM-JJ (toISOString donnerait la veille entre minuit et 1 h)
export function parisDay(now = new Date()) {
    try {
        return new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
    } catch {
        const p = (n) => String(n).padStart(2, '0');
        return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
    }
}

// Hachage 32 bits d'une chaîne (FNV-1a)
export function hash32(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
}

// Générateur pseudo-aléatoire à graine (mulberry32), avec quelques raccourcis
export function makeRng(seed) {
    let a = seed >>> 0;
    const next = () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    return {
        next,
        range: (min, max) => min + next() * (max - min),
        int: (min, max) => min + Math.floor(next() * (max - min + 1)),
        chance: (p) => next() < p,
        pick: (arr) => arr[Math.floor(next() * arr.length)],
        // mélange de Fisher-Yates (le sort(() => Math.random() - 0.5) est biaisé)
        shuffle: (arr) => {
            const out = arr.slice();
            for (let i = out.length - 1; i > 0; i--) {
                const j = Math.floor(next() * (i + 1));
                [out[i], out[j]] = [out[j], out[i]];
            }
            return out;
        }
    };
}

// Graine figée au lancement de la partie (une partie qui passe minuit garde son scénario)
export function dailyRng(gameId, now = new Date(), version = 1) {
    const day = parisDay(now);
    return { day, rng: makeRng(hash32(`${day}|${gameId}|v${version}`)) };
}

// Petit code de 4 lettres affiché sous le score : évite le bluff et les fautes de frappe à l'oral.
// (Calculé dans le navigateur, donc pas infalsifiable : c'est un jeu entre collègues, pas un examen.)
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
export function scoreCode(gameId, day, score) {
    let h = hash32(`${gameId}|${day}|${score}|flocon`);
    let out = '';
    for (let i = 0; i < 4; i++) {
        out += LETTERS[h % LETTERS.length];
        h = Math.floor(h / LETTERS.length) ^ hash32(out);
        h >>>= 0;
    }
    return out;
}
