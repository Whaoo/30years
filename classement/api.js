// API des classements, servie par Cloudflare Pages Functions sur la même adresse que le site (/api/…) :
// functions/api/[[route]].js ne fait qu'appeler onRequest d'ici (le code reste testable hors Cloudflare).
// Base : D1, reliée au projet Pages sous le nom DB (schéma : classement/schema.sql).
// Variables du projet (facultatives) : TURNSTILE_SITEKEY + TURNSTILE_SECRET (captcha à la création d'un pseudo),
// ADMIN_KEY (effacer un score ou un pseudo).
//
//   GET  /api/config                                → { captcha: clé publique Turnstile ou null }
//   POST /api/pseudo        { pseudo, captcha }      → { pseudo, jeton, code }  (le jeton reste dans le navigateur)
//   POST /api/retrouver     { pseudo, code }         → { pseudo, jeton }        (même pseudo sur un autre appareil)
//   POST /api/score         { jeu, score } + jeton   → { rang, total, record, meilleur, jour: { rang, total } }
//   GET  /api/classement?jeu=…&portee=tout|jour[&score=…] (+ jeton facultatif) → { top, total, moi, potentiel }
//   POST /api/admin         { action, … } + clé admin

// Les jeux du site (src/games/index.js) et un score maximal plausible pour chacun (garde-fou contre les envois trafiqués)
const JEUX = {
    snowball: 20000, chorale: 500, fishing: 20000, fort: 50000, flappy: 5000, traineau: 50000, curling: 20000,
    guirlande: 50000, runner: 100000, collegue: 20000, memory: 20000, relais: 100000, slide: 50000, tower: 50000,
    sled: 100000, ice: 100000, monts: 100000, reveillon: 100000, chrono: 60000, aventure: 200000,
    quiz: 1500, bougies: 20000, culture: 1500, geo: 10000
};
// Jeux de la quête : le classement du jour retient le premier essai (comme le « score officiel » du site)
const PREMIER_ESSAI = new Set(['monts', 'reveillon', 'chrono', 'aventure']);
const TOP = 10;
const ENVOIS_MAX = 20; // parties enregistrées au plus par joueur et par tranche de 10 minutes

const MOTS_INTERDITS = ['admin', 'moderateur', 'connard', 'connasse', 'salope', 'pute', 'encule', 'enculé', 'merde', 'nazi', 'hitler', 'bite', 'couille', 'pd', 'negro', 'nègre', 'fdp', 'ntm'];

const json = (data, status = 200, extra = {}) =>
    new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra } });
const erreur = (message, status = 400) => json({ erreur: message }, status);

export function parisJour(now = new Date()) {
    return new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

// « Zoé  B. » et « zoe b » sont le même pseudo
export function cleDuPseudo(p) {
    return p.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function pseudoValide(brut) {
    if (typeof brut !== 'string') return { erreur: 'Choisis un pseudo.' };
    const pseudo = brut.normalize('NFC').replace(/\s+/g, ' ').trim();
    if (pseudo.length < 2 || pseudo.length > 20) return { erreur: 'Ton pseudo doit faire entre 2 et 20 caractères.' };
    if (!/^[\p{L}\p{N} ._'’-]+$/u.test(pseudo)) return { erreur: 'Lettres, chiffres, espaces et . _ - \' seulement.' };
    const cle = cleDuPseudo(pseudo);
    if (cle.length < 2) return { erreur: 'Il faut au moins deux lettres ou chiffres.' };
    if (MOTS_INTERDITS.some((m) => cle.includes(cleDuPseudo(m)) && (cleDuPseudo(m).length > 3 || cle === cleDuPseudo(m)))) return { erreur: 'Ce pseudo n\'est pas possible, choisis-en un autre.' };
    return { pseudo, cle };
}

async function empreinte(texte) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texte));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
function aleatoire(n, alphabet) {
    const v = crypto.getRandomValues(new Uint8Array(n));
    return [...v].map((x) => alphabet[x % alphabet.length]).join('');
}
const nouveauJeton = () => aleatoire(40, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789');
// code lisible à recopier : 8 lettres sans 0/O ni 1/I
const nouveauCode = () => aleatoire(8, 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789');
const normCode = (c) => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

async function lireCorps(request) {
    try {
        const t = await request.text();
        if (t.length > 2000) return null;
        return JSON.parse(t);
    } catch {
        return null;
    }
}

async function joueurDuJeton(env, request) {
    const h = request.headers.get('Authorization') || '';
    const jeton = h.startsWith('Bearer ') ? h.slice(7).trim() : '';
    if (!jeton || jeton.length > 100) return null;
    return env.DB.prepare('SELECT j.id, j.pseudo FROM cles c JOIN joueurs j ON j.id = c.joueur WHERE c.jeton = ?').bind(await empreinte(jeton)).first();
}

async function verifierCaptcha(env, jeton, request) {
    if (!env.TURNSTILE_SECRET) return true; // captcha pas encore configuré : on laisse passer
    if (!jeton) return false;
    const form = new FormData();
    form.append('secret', env.TURNSTILE_SECRET);
    form.append('response', jeton);
    const ip = request.headers.get('CF-Connecting-IP');
    if (ip) form.append('remoteip', ip);
    try {
        const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form });
        const d = await r.json();
        return !!d.success;
    } catch {
        return false;
    }
}

// ------------------------------------------------------------------ les routes

async function creerPseudo(env, request) {
    const corps = await lireCorps(request);
    if (!corps) return erreur('Requête illisible.');
    const v = pseudoValide(corps.pseudo);
    if (v.erreur) return erreur(v.erreur);
    if (!(await verifierCaptcha(env, corps.captcha, request))) return erreur('La vérification anti-robot a échoué, réessaie.', 403);
    const deja = await env.DB.prepare('SELECT id FROM joueurs WHERE pseudo_cle = ?').bind(v.cle).first();
    if (deja) return erreur('Ce pseudo est déjà pris. Si c\'est le tien, utilise ton code pour le retrouver.', 409);
    const jeton = nouveauJeton(), code = nouveauCode();
    let id;
    try {
        id = (await env.DB.prepare('INSERT INTO joueurs (pseudo, pseudo_cle, code) VALUES (?, ?, ?) RETURNING id')
            .bind(v.pseudo, v.cle, await empreinte(code)).first()).id;
    } catch {
        return erreur('Ce pseudo vient d\'être pris, choisis-en un autre.', 409);
    }
    await env.DB.prepare('INSERT INTO cles (jeton, joueur) VALUES (?, ?)').bind(await empreinte(jeton), id).run();
    return json({ pseudo: v.pseudo, jeton, code: code.slice(0, 4) + '-' + code.slice(4) });
}

async function retrouver(env, request) {
    const corps = await lireCorps(request);
    if (!corps || typeof corps.pseudo !== 'string') return erreur('Requête illisible.');
    const j = await env.DB.prepare('SELECT id, pseudo, code FROM joueurs WHERE pseudo_cle = ?').bind(cleDuPseudo(corps.pseudo)).first();
    if (!j || j.code !== (await empreinte(normCode(corps.code)))) return erreur('Pseudo ou code incorrect.', 403);
    // une clé de plus pour ce nouvel appareil ; les autres appareils gardent la leur
    const jeton = nouveauJeton();
    await env.DB.prepare('INSERT INTO cles (jeton, joueur) VALUES (?, ?)').bind(await empreinte(jeton), j.id).run();
    return json({ pseudo: j.pseudo, jeton });
}

async function rangTout(env, jeu, score) {
    const r = await env.DB.prepare('SELECT (SELECT COUNT(*) FROM records WHERE jeu = ?1 AND score > ?2) + 1 AS rang, (SELECT COUNT(*) FROM records WHERE jeu = ?1) AS total')
        .bind(jeu, score).first();
    return { rang: r.rang, total: r.total };
}

// Scores du jour retenus : le meilleur de chaque joueur, ou son premier essai pour les jeux de la quête
function sqlDuJour(jeu) {
    return PREMIER_ESSAI.has(jeu)
        ? 'SELECT s.joueur, s.score FROM scores s WHERE s.id IN (SELECT MIN(id) FROM scores WHERE jeu = ?1 AND jour = ?2 GROUP BY joueur)'
        : 'SELECT s.joueur, MAX(s.score) AS score FROM scores s WHERE s.jeu = ?1 AND s.jour = ?2 GROUP BY s.joueur';
}

async function rangJour(env, jeu, jour, score) {
    const r = await env.DB.prepare(`SELECT (SELECT COUNT(*) FROM (${sqlDuJour(jeu)}) WHERE score > ?3) + 1 AS rang, (SELECT COUNT(*) FROM (${sqlDuJour(jeu)})) AS total`)
        .bind(jeu, jour, score).first();
    return { rang: r.rang, total: r.total };
}

async function envoyerScore(env, request) {
    const joueur = await joueurDuJeton(env, request);
    if (!joueur) return erreur('Pseudo inconnu : choisis-en un pour entrer au classement.', 401);
    const corps = await lireCorps(request);
    if (!corps) return erreur('Requête illisible.');
    const { jeu } = corps;
    const score = Math.round(Number(corps.score));
    if (!Object.prototype.hasOwnProperty.call(JEUX, jeu)) return erreur('Jeu inconnu.');
    if (!Number.isFinite(score) || score <= 0 || score > JEUX[jeu]) return erreur('Score refusé.');
    const recents = await env.DB.prepare("SELECT COUNT(*) AS n FROM scores WHERE joueur = ? AND cree > datetime('now', '-10 minutes')").bind(joueur.id).first();
    if (recents.n >= ENVOIS_MAX) return erreur('Doucement ! Trop de parties envoyées d\'un coup, réessaie dans quelques minutes.', 429);
    const jour = parisJour();
    const avant = await env.DB.prepare('SELECT score FROM records WHERE jeu = ? AND joueur = ?').bind(jeu, joueur.id).first();
    const record = !avant || score > avant.score;
    const ecritures = [env.DB.prepare('INSERT INTO scores (joueur, jeu, score, jour) VALUES (?, ?, ?, ?)').bind(joueur.id, jeu, score, jour)];
    if (record) {
        ecritures.push(env.DB.prepare("INSERT INTO records (jeu, joueur, score, quand) VALUES (?1, ?2, ?3, datetime('now')) ON CONFLICT (jeu, joueur) DO UPDATE SET score = excluded.score, quand = excluded.quand WHERE excluded.score > records.score")
            .bind(jeu, joueur.id, score));
    }
    await env.DB.batch(ecritures);
    const meilleur = record ? score : avant.score;
    const tout = await rangTout(env, jeu, meilleur);
    const duJour = await env.DB.prepare(`SELECT score FROM (${sqlDuJour(jeu)}) WHERE joueur = ?3`).bind(jeu, jour, joueur.id).first();
    const jourRang = await rangJour(env, jeu, jour, duJour ? duJour.score : score);
    return json({ pseudo: joueur.pseudo, score, record, meilleur, rang: tout.rang, total: tout.total, jour: { ...jourRang, score: duJour ? duJour.score : score } });
}

async function classement(env, request, url) {
    const jeu = url.searchParams.get('jeu');
    if (!Object.prototype.hasOwnProperty.call(JEUX, jeu)) return erreur('Jeu inconnu.');
    const portee = url.searchParams.get('portee') === 'jour' ? 'jour' : 'tout';
    const jour = parisJour();
    const joueur = await joueurDuJeton(env, request);
    let top, total, moi = null;
    if (portee === 'tout') {
        const r = await env.DB.prepare('SELECT j.pseudo, r.score, r.joueur FROM records r JOIN joueurs j ON j.id = r.joueur WHERE r.jeu = ? ORDER BY r.score DESC, r.quand ASC LIMIT ?').bind(jeu, TOP).all();
        top = r.results;
        total = (await env.DB.prepare('SELECT COUNT(*) AS n FROM records WHERE jeu = ?').bind(jeu).first()).n;
        if (joueur) {
            const m = await env.DB.prepare('SELECT score FROM records WHERE jeu = ? AND joueur = ?').bind(jeu, joueur.id).first();
            if (m) moi = { pseudo: joueur.pseudo, score: m.score, rang: (await rangTout(env, jeu, m.score)).rang };
        }
    } else {
        const r = await env.DB.prepare(`SELECT j.pseudo, d.score, d.joueur FROM (${sqlDuJour(jeu)}) d JOIN joueurs j ON j.id = d.joueur ORDER BY d.score DESC LIMIT ?3`).bind(jeu, jour, TOP).all();
        top = r.results;
        total = (await env.DB.prepare(`SELECT COUNT(*) AS n FROM (${sqlDuJour(jeu)})`).bind(jeu, jour).first()).n;
        if (joueur) {
            const m = await env.DB.prepare(`SELECT score FROM (${sqlDuJour(jeu)}) WHERE joueur = ?3`).bind(jeu, jour, joueur.id).first();
            if (m) moi = { pseudo: joueur.pseudo, score: m.score, rang: (await rangJour(env, jeu, jour, m.score)).rang };
        }
    }
    // rang qu'aurait un score pas encore envoyé (« tu serais 3e »)
    let potentiel = null;
    const s = Number(url.searchParams.get('score'));
    if (Number.isFinite(s) && s > 0) potentiel = portee === 'tout' ? (await rangTout(env, jeu, s)).rang : (await rangJour(env, jeu, jour, s)).rang;
    const liste = top.map((t, i) => ({ rang: i + 1, pseudo: t.pseudo, score: t.score, moi: !!joueur && t.joueur === joueur.id }));
    return json({ jeu, portee, jour, top: liste, total, moi, potentiel });
}

async function admin(env, request) {
    if (!env.ADMIN_KEY || request.headers.get('X-Admin-Key') !== env.ADMIN_KEY) return erreur('Accès refusé.', 403);
    const corps = await lireCorps(request);
    if (!corps) return erreur('Requête illisible.');
    if (corps.action === 'effacer-pseudo' && typeof corps.pseudo === 'string') {
        const cle = cleDuPseudo(corps.pseudo);
        const j = await env.DB.prepare('SELECT id FROM joueurs WHERE pseudo_cle = ?').bind(cle).first();
        if (!j) return erreur('Pseudo introuvable.', 404);
        await env.DB.batch([
            env.DB.prepare('DELETE FROM scores WHERE joueur = ?').bind(j.id),
            env.DB.prepare('DELETE FROM records WHERE joueur = ?').bind(j.id),
            env.DB.prepare('DELETE FROM cles WHERE joueur = ?').bind(j.id),
            env.DB.prepare('DELETE FROM joueurs WHERE id = ?').bind(j.id)
        ]);
        return json({ ok: true });
    }
    if (corps.action === 'effacer-scores' && typeof corps.pseudo === 'string' && JEUX[corps.jeu]) {
        const j = await env.DB.prepare('SELECT id FROM joueurs WHERE pseudo_cle = ?').bind(cleDuPseudo(corps.pseudo)).first();
        if (!j) return erreur('Pseudo introuvable.', 404);
        await env.DB.batch([
            env.DB.prepare('DELETE FROM scores WHERE joueur = ? AND jeu = ?').bind(j.id, corps.jeu),
            env.DB.prepare('DELETE FROM records WHERE joueur = ? AND jeu = ?').bind(j.id, corps.jeu)
        ]);
        return json({ ok: true });
    }
    return erreur('Action inconnue.');
}

export async function onRequest(context) {
    const { request, env } = context;
    if (!env.DB) return erreur('Classement pas encore branché (base D1 « DB » manquante).', 503);
    const url = new URL(request.url);
    const route = url.pathname.replace(/^\/api\/?/, '').replace(/\/+$/, '');
    const m = request.method;
    try {
        if (route === 'config' && m === 'GET') return json({ captcha: env.TURNSTILE_SECRET && env.TURNSTILE_SITEKEY ? env.TURNSTILE_SITEKEY : null });
        if (route === 'pseudo' && m === 'POST') return await creerPseudo(env, request);
        if (route === 'retrouver' && m === 'POST') return await retrouver(env, request);
        if (route === 'score' && m === 'POST') return await envoyerScore(env, request);
        if (route === 'classement' && m === 'GET') return await classement(env, request, url);
        if (route === 'admin' && m === 'POST') return await admin(env, request);
        return erreur('Adresse inconnue.', 404);
    } catch (e) {
        // quota gratuit du jour dépassé ou base indisponible : les jeux continuent, seul le classement fait une pause
        return erreur('Classement indisponible pour le moment.', 503);
    }
}
