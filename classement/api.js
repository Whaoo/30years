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
//   POST /api/import        { records: { jeu: score } } + jeton → records déjà faits dans ce navigateur
//   POST /api/admin         { action, … } + clé admin
//   POST /api/avis          { question, note, commentaire, jeu } (+ jeton facultatif) → réponse à une question posée avant un jeu

// Les jeux du site (src/games/index.js) et un score maximal plausible pour chacun (garde-fou contre les envois trafiqués)
const JEUX = {
    snowball: 20000, chorale: 500, fishing: 20000, fort: 50000, flappy: 5000, traineau: 50000, curling: 20000,
    guirlande: 50000, runner: 100000, collegue: 20000, memory: 20000, relais: 100000, slide: 50000, tower: 50000,
    sled: 100000, ice: 100000, monts: 100000, reveillon: 100000, chrono: 60000, aventure: 200000,
    quiz: 1500, bougies: 20000, culture: 1500, geo: 10000,
    // jeux du jour (un par jour ouvré du 20 au 30 novembre)
    vol: 20000, fuji: 60000, golf: 3000, montgolfiere: 3000, regate: 90000, tokyo: 6000, train: 8000, lanternes: 3000
};
// Jeux où le plus petit score gagne (un temps, en secondes), avec le temps minimal plausible
// La cave (L'Envers) : record = temps total pour éclairer la cave et retrouver le message.
// Un habitué qui connaît les cachettes la boucle en moins de 30 s (record à 27 s) : le seuil n'écarte que l'absurde.
// Col du Fuji : 3 tours en centièmes de seconde (le pilote d'essai le plus rapide fait 3:01)
// Régate du lac : centièmes de seconde aussi (le barreur d'essai fait un peu plus de 3 min)
const CHRONOS = { envers: { min: 10 }, fuji: { min: 16000 }, regate: { min: 12000 } };
JEUX.envers = 6 * 3600;
// Jeux de la quête : le classement du jour retient le premier essai (comme le « score officiel » du site)
const PREMIER_ESSAI = new Set(['monts', 'reveillon', 'chrono', 'aventure']);
const auMoins = (jeu) => Object.prototype.hasOwnProperty.call(CHRONOS, jeu);
// « meilleur que » selon le jeu : > pour les points, < pour les temps
const mieux = (jeu) => (auMoins(jeu) ? '<' : '>');
const sens = (jeu) => (auMoins(jeu) ? 'ASC' : 'DESC');
const scoreValide = (jeu, score) => Number.isFinite(score) && score > 0 && score <= JEUX[jeu] && (!auMoins(jeu) || score >= CHRONOS[jeu].min);
const estMieux = (jeu, a, b) => (auMoins(jeu) ? a < b : a > b);
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
    const r = await env.DB.prepare(`SELECT (SELECT COUNT(*) FROM records WHERE jeu = ?1 AND score ${mieux(jeu)} ?2) + 1 AS rang, (SELECT COUNT(*) FROM records WHERE jeu = ?1) AS total`)
        .bind(jeu, score).first();
    return { rang: r.rang, total: r.total };
}

// Scores du jour retenus : le meilleur de chaque joueur, ou son premier essai pour les jeux de la quête
function sqlDuJour(jeu) {
    return PREMIER_ESSAI.has(jeu)
        ? 'SELECT s.joueur, s.score FROM scores s WHERE s.id IN (SELECT MIN(id) FROM scores WHERE jeu = ?1 AND jour = ?2 GROUP BY joueur)'
        : `SELECT s.joueur, ${auMoins(jeu) ? 'MIN' : 'MAX'}(s.score) AS score FROM scores s WHERE s.jeu = ?1 AND s.jour = ?2 GROUP BY s.joueur`;
}

async function rangJour(env, jeu, jour, score) {
    const r = await env.DB.prepare(`SELECT (SELECT COUNT(*) FROM (${sqlDuJour(jeu)}) WHERE score ${mieux(jeu)} ?3) + 1 AS rang, (SELECT COUNT(*) FROM (${sqlDuJour(jeu)})) AS total`)
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
    if (!scoreValide(jeu, score)) return erreur('Score refusé.');
    // une seule requête pour le rythme d'envoi et l'ancien record
    const etat = await env.DB.prepare("SELECT (SELECT COUNT(*) FROM scores WHERE joueur = ?1 AND cree > datetime('now', '-10 minutes')) AS n, (SELECT score FROM records WHERE jeu = ?2 AND joueur = ?1) AS avant")
        .bind(joueur.id, jeu).first();
    if (etat.n >= ENVOIS_MAX) return erreur('Doucement ! Trop de parties envoyées d\'un coup, réessaie dans quelques minutes.', 429);
    const jour = parisJour();
    const avant = etat.avant == null ? null : { score: etat.avant };
    const record = !avant || estMieux(jeu, score, avant.score);
    const ecritures = [env.DB.prepare('INSERT INTO scores (joueur, jeu, score, jour) VALUES (?, ?, ?, ?)').bind(joueur.id, jeu, score, jour)];
    if (record) {
        ecritures.push(env.DB.prepare(`INSERT INTO records (jeu, joueur, score, quand) VALUES (?1, ?2, ?3, datetime('now')) ON CONFLICT (jeu, joueur) DO UPDATE SET score = excluded.score, quand = excluded.quand WHERE excluded.score ${mieux(jeu)} records.score`)
            .bind(jeu, joueur.id, score));
    }
    await env.DB.batch(ecritures);
    const meilleur = record ? score : avant.score;
    // une seule requête pour les deux rangs (toujours / aujourd'hui)
    const m = mieux(jeu);
    const r = await env.DB.prepare(`WITH d AS (${sqlDuJour(jeu)})
        SELECT (SELECT COUNT(*) FROM records WHERE jeu = ?1 AND score ${m} ?4) + 1 AS rang,
               (SELECT COUNT(*) FROM records WHERE jeu = ?1) AS total,
               (SELECT score FROM d WHERE joueur = ?3) AS jscore,
               (SELECT COUNT(*) FROM d) AS jtotal,
               (SELECT COUNT(*) FROM d WHERE score ${m} (SELECT score FROM d WHERE joueur = ?3)) + 1 AS jrang`)
        .bind(jeu, jour, joueur.id, meilleur).first();
    // et le classement à afficher tout de suite, pour éviter un deuxième appel
    const portee = corps.portee === 'jour' ? 'jour' : 'tout';
    const top = await topListe(env, jeu, portee, jour, joueur.id);
    const moi = portee === 'tout' ? { pseudo: joueur.pseudo, score: meilleur, rang: r.rang } : { pseudo: joueur.pseudo, score: r.jscore ?? score, rang: r.jrang };
    return json({
        pseudo: joueur.pseudo, score, record, meilleur, rang: r.rang, total: r.total,
        jour: { rang: r.jrang, total: r.jtotal, score: r.jscore ?? score },
        classement: { jeu, portee, jour, top, total: portee === 'tout' ? r.total : r.jtotal, moi, potentiel: null }
    });
}

async function topListe(env, jeu, portee, jour, joueurId) {
    const r = portee === 'tout'
        ? await env.DB.prepare(`SELECT j.pseudo, r.score, r.joueur FROM records r JOIN joueurs j ON j.id = r.joueur WHERE r.jeu = ? ORDER BY r.score ${sens(jeu)}, r.quand ASC LIMIT ?`).bind(jeu, TOP).all()
        : await env.DB.prepare(`SELECT j.pseudo, d.score, d.joueur FROM (${sqlDuJour(jeu)}) d JOIN joueurs j ON j.id = d.joueur ORDER BY d.score ${sens(jeu)} LIMIT ?3`).bind(jeu, jour, TOP).all();
    return r.results.map((t, i) => ({ rang: i + 1, pseudo: t.pseudo, score: t.score, moi: joueurId != null && t.joueur === joueurId }));
}

// Les records déjà faits avant le classement (gardés dans le navigateur) : ajoutés au classement « Toujours » seulement.
// Repasser un import ne fait que garder le meilleur ; chaque valeur est bornée comme un score normal.
async function importer(env, request) {
    const joueur = await joueurDuJeton(env, request);
    if (!joueur) return erreur('Pseudo inconnu.', 401);
    const corps = await lireCorps(request);
    const recs = corps && corps.records;
    if (!recs || typeof recs !== 'object' || Array.isArray(recs)) return erreur('Requête illisible.');
    const ecritures = [];
    const gardes = [];
    for (const [jeu, brut] of Object.entries(recs).slice(0, 40)) {
        if (!Object.prototype.hasOwnProperty.call(JEUX, jeu)) continue;
        const score = Math.round(Number(brut));
        if (!scoreValide(jeu, score)) continue;
        gardes.push(jeu);
        ecritures.push(env.DB.prepare(`INSERT INTO records (jeu, joueur, score, quand) VALUES (?1, ?2, ?3, datetime('now')) ON CONFLICT (jeu, joueur) DO UPDATE SET score = excluded.score, quand = excluded.quand WHERE excluded.score ${mieux(jeu)} records.score`)
            .bind(jeu, joueur.id, score));
    }
    if (ecritures.length) await env.DB.batch(ecritures);
    return json({ importes: gardes });
}

async function classement(env, request, url) {
    const jeu = url.searchParams.get('jeu');
    if (!Object.prototype.hasOwnProperty.call(JEUX, jeu)) return erreur('Jeu inconnu.');
    const portee = url.searchParams.get('portee') === 'jour' ? 'jour' : 'tout';
    const jour = parisJour();
    const joueur = await joueurDuJeton(env, request);
    const top = await topListe(env, jeu, portee, jour, joueur ? joueur.id : null);
    // une seule requête pour le total, ma place et la place qu'aurait un score pas encore envoyé (« tu serais 3e »)
    const brut = Math.round(Number(url.searchParams.get('score')));
    const essai = scoreValide(jeu, brut) ? brut : null;
    const m = mieux(jeu);
    const source = portee === 'tout' ? 'SELECT joueur, score FROM records WHERE jeu = ?1' : sqlDuJour(jeu);
    const r = await env.DB.prepare(`WITH d AS (${source})
        SELECT (SELECT COUNT(*) FROM d) AS total,
               (SELECT score FROM d WHERE joueur = ?3) AS mon_score,
               (SELECT COUNT(*) FROM d WHERE score ${m} (SELECT score FROM d WHERE joueur = ?3)) + 1 AS mon_rang,
               (SELECT COUNT(*) FROM d WHERE score ${m} ?4) + 1 AS potentiel`)
        .bind(jeu, jour, joueur ? joueur.id : -1, essai ?? 0).first();
    const moi = joueur && r.mon_score != null ? { pseudo: joueur.pseudo, score: r.mon_score, rang: r.mon_rang } : null;
    return json({ jeu, portee, jour, top, total: r.total, moi, potentiel: essai == null ? null : r.potentiel });
}

// Avis demandés à quelqu'un avant un jeu (« Laura, tu as pensé quoi de Hunger Games ? ») : une note de 1 à 5 et un commentaire.
// Même base que les scores ; la table se crée toute seule à la première réponse (rien à coller dans la console).
const QUESTIONS_AVIS = { 'hunger-games': { pour: 'Laura', max: 40 } };
const SQL_AVIS = `CREATE TABLE IF NOT EXISTS avis (
    id INTEGER PRIMARY KEY, question TEXT NOT NULL, pseudo TEXT NOT NULL, joueur TEXT, jeu TEXT,
    note INTEGER NOT NULL, commentaire TEXT NOT NULL DEFAULT '', jour TEXT NOT NULL, cree TEXT NOT NULL DEFAULT (datetime('now')))`;
async function avis(env, request) {
    const corps = await lireCorps(request);
    if (!corps) return erreur('Requête illisible.');
    const q = QUESTIONS_AVIS[corps.question];
    if (!q) return erreur('Question inconnue.');
    const note = Math.round(Number(corps.note));
    if (!(note >= 1 && note <= 5)) return erreur('Choisis une note de 1 à 5 étoiles.');
    const commentaire = typeof corps.commentaire === 'string' ? corps.commentaire.trim().slice(0, 600) : '';
    const jeu = typeof corps.jeu === 'string' && Object.prototype.hasOwnProperty.call(JEUX, corps.jeu) ? corps.jeu : null;
    await env.DB.prepare(SQL_AVIS).run();
    const n = await env.DB.prepare('SELECT COUNT(*) AS n FROM avis WHERE question = ?').bind(corps.question).first();
    if (n.n >= q.max) return erreur('Merci, on a déjà assez de réponses à cette question !', 429);
    // pseudo = la personne à qui la question est posée ; joueur = le pseudo du classement de ce navigateur, s'il y en a un
    const joueur = await joueurDuJeton(env, request);
    await env.DB.prepare('INSERT INTO avis (question, pseudo, joueur, jeu, note, commentaire, jour) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)')
        .bind(corps.question, q.pour, joueur ? joueur.pseudo : null, jeu, note, commentaire, parisJour()).run();
    return json({ ok: true });
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
    if (corps.action === 'avis') {
        await env.DB.prepare(SQL_AVIS).run();
        const r = await env.DB.prepare('SELECT * FROM avis ORDER BY id DESC').all();
        return json({ avis: r.results });
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
        if (route === 'import' && m === 'POST') return await importer(env, request);
        if (route === 'admin' && m === 'POST') return await admin(env, request);
        if (route === 'avis' && m === 'POST') return await avis(env, request);
        return erreur('Adresse inconnue.', 404);
    } catch (e) {
        // quota gratuit du jour dépassé ou base indisponible : les jeux continuent, seul le classement fait une pause
        return erreur('Classement indisponible pour le moment.', 503);
    }
}
