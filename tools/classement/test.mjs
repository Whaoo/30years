// Tests de l'API des classements avec une base en mémoire : node tools/classement/test.mjs
import assert from 'node:assert/strict';
import { d1Local } from './d1-local.mjs';
import { onRequest, pseudoValide, cleDuPseudo } from '../../classement/api.js';

const env = { DB: d1Local() };
const appel = async (methode, chemin, corps, jeton, extra = {}) => {
    const headers = { 'Content-Type': 'application/json', ...extra };
    if (jeton) headers.Authorization = 'Bearer ' + jeton;
    const r = await onRequest({ request: new Request('https://30years.pages.dev/api/' + chemin, { method: methode, headers, body: corps ? JSON.stringify(corps) : undefined }), env });
    return { status: r.status, data: await r.json() };
};

// pseudos
assert.equal(cleDuPseudo('Zoé  B.'), 'zoeb');
assert.ok(pseudoValide('a').erreur);
assert.ok(pseudoValide('<script>').erreur);
assert.ok(pseudoValide('connard42').erreur);
assert.equal(pseudoValide('  Zoé   la Reine ').pseudo, 'Zoé la Reine');

const zoe = await appel('POST', 'pseudo', { pseudo: 'Zoé' });
assert.equal(zoe.status, 200); assert.match(zoe.data.code, /^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
assert.equal((await appel('POST', 'pseudo', { pseudo: 'zoe' })).status, 409, 'pseudo déjà pris, accents et majuscules compris');
const max = (await appel('POST', 'pseudo', { pseudo: 'Max' })).data;
const lou = (await appel('POST', 'pseudo', { pseudo: 'Lou' })).data;

// scores
assert.equal((await appel('POST', 'score', { jeu: 'culture', score: 900 })).status, 401, 'sans pseudo');
assert.equal((await appel('POST', 'score', { jeu: 'inconnu', score: 9 }, zoe.data.jeton)).status, 400);
assert.equal((await appel('POST', 'score', { jeu: 'culture', score: 999999 }, zoe.data.jeton)).status, 400, 'score impossible');
let r = await appel('POST', 'score', { jeu: 'culture', score: 900 }, zoe.data.jeton);
assert.equal(r.status, 200); assert.equal(r.data.rang, 1); assert.equal(r.data.record, true);
r = await appel('POST', 'score', { jeu: 'culture', score: 1100 }, max.jeton);
assert.equal(r.data.rang, 1); assert.equal(r.data.total, 2);
r = await appel('POST', 'score', { jeu: 'culture', score: 700 }, zoe.data.jeton);
assert.equal(r.data.record, false); assert.equal(r.data.meilleur, 900); assert.equal(r.data.rang, 2);
await appel('POST', 'score', { jeu: 'culture', score: 1000 }, lou.jeton);

r = await appel('GET', 'classement?jeu=culture&score=1050', null, zoe.data.jeton);
assert.deepEqual(r.data.top.map((t) => [t.pseudo, t.score, t.moi]), [['Max', 1100, false], ['Lou', 1000, false], ['Zoé', 900, true]]);
assert.equal(r.data.moi.rang, 3); assert.equal(r.data.potentiel, 2);

// jeux de la quête : le classement du jour retient le premier essai
await appel('POST', 'score', { jeu: 'chrono', score: 3000 }, zoe.data.jeton);
await appel('POST', 'score', { jeu: 'chrono', score: 9000 }, zoe.data.jeton);
await appel('POST', 'score', { jeu: 'chrono', score: 5000 }, max.jeton);
r = await appel('GET', 'classement?jeu=chrono&portee=jour', null, zoe.data.jeton);
assert.deepEqual(r.data.top.map((t) => [t.pseudo, t.score]), [['Max', 5000], ['Zoé', 3000]]);
r = await appel('GET', 'classement?jeu=chrono', null, zoe.data.jeton);
assert.deepEqual(r.data.top.map((t) => [t.pseudo, t.score]), [['Zoé', 9000], ['Max', 5000]]);

// même pseudo sur un autre appareil
assert.equal((await appel('POST', 'retrouver', { pseudo: 'ZOE', code: 'AAAA-AAAA' })).status, 403);
const autre = await appel('POST', 'retrouver', { pseudo: 'ZOE', code: zoe.data.code.toLowerCase() });
assert.equal(autre.status, 200); assert.equal(autre.data.pseudo, 'Zoé');
assert.equal((await appel('POST', 'score', { jeu: 'geo', score: 5000 }, autre.data.jeton)).status, 200);
assert.equal((await appel('POST', 'score', { jeu: 'geo', score: 4000 }, zoe.data.jeton)).status, 200, 'le premier appareil garde son pseudo');

// rythme d'envoi
for (let i = 0; i < 20; i++) await appel('POST', 'score', { jeu: 'memory', score: 100 + i }, lou.jeton);
assert.equal((await appel('POST', 'score', { jeu: 'memory', score: 500 }, lou.jeton)).status, 429);

// la cave : le meilleur temps gagne
assert.equal((await appel('POST', 'score', { jeu: 'envers', score: 5 }, zoe.data.jeton)).status, 400, 'temps impossible');
r = await appel('POST', 'score', { jeu: 'envers', score: 300 }, zoe.data.jeton);
assert.equal(r.data.rang, 1); assert.equal(r.data.record, true);
r = await appel('POST', 'score', { jeu: 'envers', score: 420 }, zoe.data.jeton);
assert.equal(r.data.record, false); assert.equal(r.data.meilleur, 300);
await appel('POST', 'score', { jeu: 'envers', score: 250 }, max.jeton);
r = await appel('GET', 'classement?jeu=envers&score=280', null, zoe.data.jeton);
assert.deepEqual(r.data.top.map((t) => [t.pseudo, t.score]), [['Max', 250], ['Zoé', 300]]);
assert.equal(r.data.moi.rang, 2); assert.equal(r.data.potentiel, 2);
r = await appel('GET', 'classement?jeu=envers&portee=jour', null);
assert.deepEqual(r.data.top.map((t) => [t.pseudo, t.score]), [['Max', 250], ['Zoé', 300]]);

// records d'avant le classement, gardés dans le navigateur
const ana = (await appel('POST', 'pseudo', { pseudo: 'Ana' })).data;
r = await appel('POST', 'import', { records: { envers: 200, culture: 1300, memory: 999999, inconnu: 5, quiz: 'x' } }, ana.jeton);
assert.deepEqual(r.data.importes.sort(), ['culture', 'envers']);
r = await appel('GET', 'classement?jeu=envers');
assert.deepEqual(r.data.top.map((t) => t.pseudo), ['Ana', 'Max', 'Zoé']);
await appel('POST', 'import', { records: { envers: 260 } }, ana.jeton);
assert.equal((await appel('GET', 'classement?jeu=envers')).data.top[0].score, 200, 'un import moins bon ne remplace pas le record');
assert.equal((await appel('GET', 'classement?jeu=envers&portee=jour')).data.top.length, 2, 'les imports ne vont pas dans le classement du jour');
assert.equal((await appel('POST', 'import', { records: { envers: 200 } })).status, 401);

// administration
assert.equal((await appel('POST', 'admin', { action: 'effacer-pseudo', pseudo: 'Max' })).status, 403);
env.ADMIN_KEY = 'secret';
assert.equal((await appel('POST', 'admin', { action: 'effacer-pseudo', pseudo: 'max' }, null, { 'X-Admin-Key': 'secret' })).status, 200);
r = await appel('GET', 'classement?jeu=culture');
assert.deepEqual(r.data.top.map((t) => t.pseudo), ['Ana', 'Lou', 'Zoé']);

// sans base : message clair
const sansBase = await onRequest({ request: new Request('https://x/api/config'), env: {} });
assert.equal(sansBase.status, 503);
console.log('API des classements : tous les tests passent.');
