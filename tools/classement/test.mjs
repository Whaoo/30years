// Tests de l'API des classements avec une base en mémoire : node tools/classement/test.mjs
import assert from 'node:assert/strict';
import { d1Local } from './d1-local.mjs';
import { onRequest, pseudoValide, cleDuPseudo, circuitOuvert, ouvertureCircuit } from '../../classement/api.js';

// MAINTENANT : une date où tous les circuits du Col du Fuji sont ouverts (leur calendrier est testé plus bas)
const env = { DB: d1Local(), MAINTENANT: '2026-12-10T12:00:00Z' };
const appel = async (methode, chemin, corps, jeton, extra = {}, hote = 'https://30years.pages.dev') => {
    const headers = { 'Content-Type': 'application/json', ...extra };
    if (jeton) headers.Authorization = 'Bearer ' + jeton;
    const r = await onRequest({ request: new Request(hote + '/api/' + chemin, { method: methode, headers, body: corps ? JSON.stringify(corps) : undefined }), env });
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

// fantômes du Col du Fuji : un par record, servi pour le meilleur record qui en a un
const kai = (await appel('POST', 'pseudo', { pseudo: 'Kai' })).data;
const noa = (await appel('POST', 'pseudo', { pseudo: 'Noa' })).data;
const trace = (cs) => { const n = Math.floor(cs / 10) + 1; return { car: 'hugo', pr: Array.from({ length: n }, (_, i) => i * 4.2), d: Array(n).fill(0.5), psi: Array(n).fill(0.01) }; };
assert.equal((await appel('GET', 'fantome?jeu=fuji-3')).data.data, null, 'pas encore de fantôme');
assert.equal((await appel('GET', 'fantome?jeu=golf')).status, 400, 'seulement le Col du Fuji');
assert.equal((await appel('GET', 'fantome?jeu=fuji-12')).status, 400, 'circuit inconnu');
assert.equal((await appel('POST', 'score', { jeu: 'fuji-3', score: 18000 }, kai.jeton)).data.record, true, 'un circuit = un classement');
assert.equal((await appel('POST', 'score', { jeu: 'fuji-3', score: 9000 }, kai.jeton)).status, 400, 'en dessous du temps minimal du circuit');
assert.equal((await appel('POST', 'fantome', { jeu: 'fuji-3', score: 18000, data: trace(18000) })).status, 401);
assert.equal((await appel('POST', 'fantome', { jeu: 'fuji-3', score: 18000, data: trace(15000) }, kai.jeton)).status, 400, 'la durée doit coller au chrono');
assert.equal((await appel('POST', 'fantome', { jeu: 'fuji-3', score: 18500, data: trace(18500) }, kai.jeton)).status, 409, 'pas son record');
assert.equal((await appel('POST', 'fantome', { jeu: 'fuji-3', score: 18000, data: { ...trace(18000), d: [1, 2] } }, kai.jeton)).status, 400);
assert.equal((await appel('POST', 'fantome', { jeu: 'fuji-3', score: 18000, data: trace(18000) }, kai.jeton)).status, 200);
r = await appel('GET', 'fantome?jeu=fuji-3');
assert.equal(r.data.pseudo, 'Kai'); assert.equal(r.data.temps, 18000); assert.equal(r.data.premier, true); assert.equal(r.data.data.pr.length, 1801);
assert.equal((await appel('GET', 'fantome?jeu=fuji')).data.data, null, 'chaque circuit a les siens');
await appel('POST', 'score', { jeu: 'fuji-3', score: 19000 }, noa.jeton);
await appel('POST', 'fantome', { jeu: 'fuji-3', score: 19000, data: trace(19000) }, noa.jeton);
assert.equal((await appel('GET', 'fantome?jeu=fuji-3')).data.pseudo, 'Kai', 'le meilleur gagne');
await appel('POST', 'score', { jeu: 'fuji-3', score: 17500 }, noa.jeton); // n° 1, mais sans fantôme envoyé
r = await appel('GET', 'fantome?jeu=fuji-3');
assert.equal(r.data.pseudo, 'Kai'); assert.equal(r.data.premier, false, 'Kai n\'est plus n° 1 : on le dit');
await appel('POST', 'score', { jeu: 'fuji-3', score: 17000 }, kai.jeton); // nouveau record sans fantôme : l'ancien n'est plus servi
assert.equal((await appel('GET', 'fantome?jeu=fuji-3')).data.data, null, 'un fantôme ne sert que tant que son record tient');
assert.equal((await appel('POST', 'fantome', { jeu: 'fuji-3', score: 17000, data: trace(17000) }, kai.jeton)).status, 200);
r = await appel('GET', 'fantome?jeu=fuji-3');
assert.equal(r.data.pseudo, 'Kai'); assert.equal(r.data.temps, 17000); assert.equal(r.data.premier, true);
assert.equal((await onRequest({ request: new Request('https://30years.pages.dev/api/fantome', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + kai.jeton }, body: 'x'.repeat(160000) }), env })).status, 413);
r = await appel('GET', 'classement?jeu=fuji-3');
assert.deepEqual(r.data.top.map((t) => [t.pseudo, t.score]), [['Kai', 17000], ['Noa', 17500]]);

// Col du Fuji : un circuit de plus chaque jour à 9 h, heure de Paris (le 2 le 25 novembre, le 11 le 4 décembre)
assert.equal(ouvertureCircuit('fuji'), null); assert.equal(ouvertureCircuit('fuji-2'), '2026-11-25');
assert.equal(ouvertureCircuit('fuji-7'), '2026-11-30'); assert.equal(ouvertureCircuit('fuji-11'), '2026-12-04'); assert.equal(ouvertureCircuit('fuji-12'), null);
assert.equal(circuitOuvert('fuji-2', new Date('2026-11-25T07:59:00Z')), false, '8 h 59 à Paris');
assert.equal(circuitOuvert('fuji-2', new Date('2026-11-25T08:00:00Z')), true, '9 h à Paris');
assert.equal(circuitOuvert('fuji-3', new Date('2026-11-25T20:00:00Z')), false);
assert.equal(circuitOuvert('fuji-3', new Date('2026-11-26T23:30:00Z')), true, 'le lendemain, après minuit à Paris');
assert.equal(circuitOuvert('fuji', new Date('2026-11-01T00:00:00Z')), true, 'le n° 1 et les autres jeux ne sont pas concernés');
assert.equal(circuitOuvert('golf', new Date('2026-11-01T00:00:00Z')), true);
env.MAINTENANT = '2026-11-25T10:00:00Z'; // mercredi 25, 11 h à Paris : circuits 1 et 2 ouverts
const ivy = (await appel('POST', 'pseudo', { pseudo: 'Ivy' })).data;
assert.equal((await appel('POST', 'score', { jeu: 'fuji-2', score: 18000 }, ivy.jeton)).status, 200);
r = await appel('POST', 'score', { jeu: 'fuji-3', score: 18000 }, ivy.jeton);
assert.equal(r.status, 403); assert.match(r.data.erreur, /jeudi 26 novembre à 9 h/);
assert.equal((await appel('POST', 'fantome', { jeu: 'fuji-4', score: 18000, data: trace(18000) }, ivy.jeton)).status, 403);
r = await appel('POST', 'import', { records: { 'fuji-2': 17000, 'fuji-5': 17000, golf: 900 } }, ivy.jeton);
assert.deepEqual(r.data.importes, ['fuji-2', 'golf'], 'un record importé n\'entre pas sur un circuit pas encore ouvert');
assert.equal((await appel('POST', 'score', { jeu: 'fuji-3', score: 18000 }, ivy.jeton, {}, 'https://dev.30years.pages.dev')).status, 200, 'préversion : tout est ouvert');
env.CIRCUITS_OUVERTS = '0';
assert.equal((await appel('POST', 'score', { jeu: 'fuji-6', score: 18000 }, ivy.jeton, {}, 'https://dev.30years.pages.dev')).status, 403, 'sauf si on le demande');
env.CIRCUITS_OUVERTS = '1';
assert.equal((await appel('POST', 'score', { jeu: 'fuji-6', score: 18000 }, ivy.jeton)).status, 200, 'ou tout ouvert');
delete env.CIRCUITS_OUVERTS; env.MAINTENANT = '2026-12-10T12:00:00Z';

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
