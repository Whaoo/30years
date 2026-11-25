// Classements en ligne : petit client de l'API /api (functions/api/[[route]].js, base D1 de Cloudflare).
// Le pseudo et sa clé secrète restent dans ce navigateur (`30years:joueur`) : une fois choisi, on ne le redemande plus.
// Si l'API n'est pas là (npm run dev sans wrangler, base pas encore branchée), tout se replie sans bruit.

const KEY = '30years:joueur';

export function moi() {
    try {
        const j = JSON.parse(localStorage.getItem(KEY) || 'null');
        return j && j.pseudo && j.jeton ? j : null;
    } catch {
        return null;
    }
}
function garder(j) {
    try { localStorage.setItem(KEY, JSON.stringify(j)); } catch { /* navigation privée : le pseudo sera redemandé */ }
}
export function oublier() {
    try { localStorage.removeItem(KEY); } catch { /* rien */ }
}

export class ErreurClassement extends Error {
    constructor(message, status) { super(message); this.status = status; }
}

async function api(chemin, { methode = 'GET', corps, jeton } = {}) {
    const headers = {};
    if (corps) headers['Content-Type'] = 'application/json';
    if (jeton) headers.Authorization = 'Bearer ' + jeton;
    let r;
    try {
        r = await fetch('/api/' + chemin, { method: methode, headers, body: corps ? JSON.stringify(corps) : undefined });
    } catch {
        throw new ErreurClassement('Pas de connexion au classement.', 0);
    }
    let data = null;
    try { data = await r.json(); } catch { /* réponse vide ou page HTML : API absente */ }
    if (!r.ok || !data) throw new ErreurClassement(data?.erreur || 'Classement indisponible pour le moment.', data ? r.status : 503);
    return data;
}

let configP = null;
// { captcha: clé publique Turnstile ou null } ; null si le classement n'est pas disponible
export function config() {
    if (!configP) configP = api('config').catch(() => null);
    return configP;
}

export async function choisirPseudo(pseudo, captcha) {
    const d = await api('pseudo', { methode: 'POST', corps: { pseudo, captcha } });
    garder({ pseudo: d.pseudo, jeton: d.jeton });
    return d; // d.code : à noter pour jouer sous le même pseudo sur un autre appareil
}

export async function retrouverPseudo(pseudo, code) {
    const d = await api('retrouver', { methode: 'POST', corps: { pseudo, code } });
    garder({ pseudo: d.pseudo, jeton: d.jeton });
    return d;
}

// Les records faits dans ce navigateur avant le classement (`30years:best:<jeu>`, la cave comprise)
// rejoignent le classement « Toujours » : une fois par pseudo et par navigateur.
// « :2 » : nouvel import pour tous, après la baisse du temps minimal de la cave (des records de moins de 45 s avaient été refusés)
const KEY_IMPORT = '30years:import:2';
function recordsLocaux() {
    const out = {};
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (!k || !k.startsWith('30years:best:')) continue;
            const v = Number(localStorage.getItem(k));
            if (Number.isFinite(v) && v > 0) out[k.slice('30years:best:'.length)] = Math.round(v);
        }
    } catch { /* stockage indisponible */ }
    return out;
}
export async function importerRecords() {
    const j = moi();
    if (!j) return false;
    try {
        if (localStorage.getItem(KEY_IMPORT) === j.pseudo) return false;
    } catch { return false; }
    const records = recordsLocaux();
    try {
        const n = Object.keys(records).length;
        if (n) await api('import', { methode: 'POST', corps: { records }, jeton: j.jeton });
        localStorage.setItem(KEY_IMPORT, j.pseudo);
        return n > 0; // vrai si des records ont été envoyés (le classement affiché peut avoir changé)
    } catch {
        return false; // on réessaiera à la prochaine visite
    }
}
// Au chargement du site : rattrape les joueurs qui avaient déjà un pseudo
export async function importerSiBesoin() {
    if (!moi()) return;
    if (await config()) await importerRecords();
}

// Fantôme d'un record (Col du Fuji) : gardé le temps que le score parte, puis envoyé s'il est bien le record du joueur
// (l'API le refuse sinon). Le jeu le redemande ensuite pour le n° 1 de chaque circuit : GET /api/fantome?jeu=…
const fantomes = new Map();
export function retenirFantome(jeu, score, data) {
    if (jeu && score > 0 && data && Array.isArray(data.pr)) fantomes.set(jeu, { score, data });
}
function envoyerFantome(jeu, score, jeton) {
    const f = fantomes.get(jeu);
    if (!f || f.score !== score) return;
    fantomes.delete(jeu);
    api('fantome', { methode: 'POST', corps: { jeu, score, data: f.data }, jeton }).then(() => fantomeEnvoye(jeu, score), () => { /* le chrono, lui, est bien enregistré */ });
}
// Fantômes déjà proposés depuis cet appareil (jeu → chrono), pour ne pas renvoyer le même à chaque partie
const ENVOYES = '30years:fantomes-envoyes';
function envoyes() {
    try { return JSON.parse(localStorage.getItem(ENVOYES) || '{}') || {}; } catch { return {}; }
}
function fantomeEnvoye(jeu, score) {
    try { localStorage.setItem(ENVOYES, JSON.stringify({ ...envoyes(), [jeu]: score })); } catch { /* navigation privée */ }
}
// Le fantôme d'un record fait avant cette fonction (le jeu le garde sur l'appareil où il a été fait) : envoyé une fois,
// pour que le n° 1 actuel ait le sien. L'API le refuse (409) si ce chrono n'est pas, ou plus, le record du joueur.
export function proposerFantome(jeu, score, data) {
    const j = moi();
    if (!j || !jeu || !(score > 0) || !data || !Array.isArray(data.pr) || envoyes()[jeu] === score) return;
    api('fantome', { methode: 'POST', corps: { jeu, score, data }, jeton: j.jeton })
        .then(() => fantomeEnvoye(jeu, score), (e) => { if (e.status === 400 || e.status === 409) fantomeEnvoye(jeu, score); });
}

export async function envoyerScore(jeu, score, portee = 'tout') {
    const j = moi();
    if (!j) throw new ErreurClassement('Choisis un pseudo pour entrer au classement.', 401);
    try {
        const r = await api('score', { methode: 'POST', corps: { jeu, score, portee }, jeton: j.jeton });
        if (r && r.meilleur === score) envoyerFantome(jeu, score, j.jeton);
        return r;
    } catch (e) {
        if (e.status === 401) oublier(); // pseudo effacé côté serveur : on le redemandera
        throw e;
    }
}

// réponse à une question posée avant un jeu (src/utils/avis.js)
export function envoyerAvis(corps) {
    const j = moi();
    return api('avis', { methode: 'POST', corps, jeton: j?.jeton });
}

export function classement(jeu, portee = 'tout', score = null) {
    const j = moi();
    const q = new URLSearchParams({ jeu, portee });
    if (score != null) q.set('score', String(score));
    return api('classement?' + q, { jeton: j?.jeton });
}

// Turnstile (captcha invisible de Cloudflare), chargé seulement au moment de choisir un pseudo
let turnstileP = null;
export function chargerTurnstile() {
    if (window.turnstile) return Promise.resolve(window.turnstile);
    if (!turnstileP) {
        turnstileP = new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
            s.async = true;
            s.onload = () => resolve(window.turnstile);
            s.onerror = () => { turnstileP = null; reject(new Error('turnstile')); };
            document.head.appendChild(s);
        });
    }
    return turnstileP;
}
