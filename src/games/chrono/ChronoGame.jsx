import { useCallback, useRef, useState } from 'react';
import GameCanvas from '../GameCanvas';
import { DISPLAY, circle, roundRect, text, TAU } from '../draw';
import { getBest } from '../scores';
import { dailyRng, scoreCode } from '../../december/seed';
import { drawButton, drawResults, gradeFor, hitButton } from '../../december/results';
import { firstTryOfDay, loadQuest, markFail, markSkipped, markWon, passCode, SKIP_AFTER_FAILS } from '../../december/quest';
import { BOTTOM, CARDS, EVENTS, H, ISLES, ISLE_KEYS, LINKS, ROUNDS, TOP, VEHICLES, W, distToLink, linkKey, linkLength, linkPoint } from './world';
import { boatIcon, client, drawParcel, evIcon, gull, makeBackground, makeGlow, makeParcelSprites, planeIcon, sleighIcon, trainIcon } from './art';

/* global __TEST_MODE__ */

// Épisode 3 de la quête : « Chronoflocon », le centre de tri du Pôle (gestion), environ 4 min 30.
// Un seul geste : glisser d'une île à l'autre ouvre une liaison (la géographie choisit train, bateau ou avion) ;
// cliquer sur une liaison la ferme (le véhicule revient au dépôt). Les colis trouvent leur chemin tout seuls.
// Trois tournées (Matin 50 s, Midi 70 s, Soir 80 s), réseau conservé, un renfort à choisir entre deux tournées.
// Jauge d'humeur : les colis qui attendent trop la font baisser. À zéro : Mamie envoie une fois un traîneau de secours,
// ensuite 8 s de sursis, puis on rejoue la tournée. Le Matin ne se perd pas.
// Événements annoncés 8 s avant par Radio Banquise (brouillard, banquise fendue, tempête, aurore, rush).
// Score = (colis × 15 + rapidité + express × 50) × (1 + 0,4 × humeur finale) + 150 si le traîneau joker est gardé.

const ID = 'chrono';
const WARN = 8;
const MAX_WAIT = 40;
const OLD = 13; // secondes : au-delà, un colis qui attend fait baisser l'humeur
const EXPRESS_T = 20;
const DWELL = 0.45;
const MAX_PER_LINK = 3; // jusqu'à 3 véhicules sur la même liaison

function createChrono(api, props) {
    const now = props.now || new Date();
    const { day, rng } = dailyRng(ID, now);
    const PS = makeParcelSprites();
    const goldGlow = makeGlow('rgba(255,210,63,A)');
    const bgs = {};
    // décor de la tournée : îles visibles, ponts de banquise (où l'on peut poser des rails) et pistes d'avion
    const bgFor = (r, storm) => {
        const key = `${r}${storm ? 's' : ''}`;
        if (!bgs[key]) {
            const vis = ISLE_KEYS.filter((k) => ISLES[k].from <= r);
            const ok = ([a, b]) => vis.includes(a) && vis.includes(b);
            const bridges = LINKS.filter((l) => l[2] === 'rail' && ok(l));
            const strips = [...new Set(LINKS.filter((l) => l[2] === 'air').flatMap(([a, b]) => [a, b]))].filter((k) => vis.includes(k));
            bgs[key] = makeBackground(vis, storm, bridges, strips);
        }
        return bgs[key];
    };
    const coarse = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(pointer: coarse)').matches;

    // ---------------------------------------------------------------- le scénario du jour
    const visibleIn = (r) => ISLE_KEYS.filter((k) => ISLES[k].from <= r);
    const spawnPlans = ROUNDS.map((R, r) => {
        const vis = visibleIn(r);
        const list = [];
        for (let t = 1.2; t < R.dur - 3;) {
            const k = t / R.dur;
            const tot = vis.reduce((a, v) => a + ISLES[v].weight, 0);
            let pick = rng.next() * tot;
            let from = vis[0];
            for (const v of vis) {
                pick -= ISLES[v].weight;
                if (pick <= 0) {
                    from = v;
                    break;
                }
            }
            // les nouvelles îles reçoivent un peu plus de colis : il faut les relier
            const dests = vis.filter((v) => v !== from);
            const fresh = dests.filter((v) => ISLES[v].from === r);
            const to = fresh.length && rng.chance(0.3) ? rng.pick(fresh) : rng.pick(dests);
            list.push({ t, from, to, ex: false });
            t += R.spawn[0] + (R.spawn[1] - R.spawn[0]) * k + rng.range(-0.25, 0.25);
        }
        // les colis express (dorés) : tirés parmi ceux de la tournée
        const idx = rng.shuffle(list.map((_, i) => i).filter((i) => list[i].t > 6 && list[i].t < R.dur - 14)).slice(0, R.express);
        idx.forEach((i) => (list[i].ex = true));
        return list;
    });
    const eventPlans = ROUNDS.map((R, r) => {
        if (r === 0) return [];
        // chaque tournée a au moins un événement qui demande d'intervenir (panne à réparer, iceberg à briser, pont fendu)
        const pool = r === 1 ? ['breakdown', ...rng.shuffle(['fog', 'crack', 'iceberg', 'burst']).slice(0, 2)] : ['aurora', ...rng.shuffle(['crack', 'storm', 'breakdown', 'iceberg', 'burst']).slice(0, 3)];
        const slots = r === 1 ? [[16, 22], [34, 42], [52, 60]] : [[12, 18], [28, 36], [44, 52], [60, 68]];
        return rng.shuffle(pool).map((id, i) => ({ id, t: rng.range(slots[i][0], slots[i][1]), seed: rng.next() }));
    });
    const cardPlans = [rng.shuffle(['boat', 'train', 'wagons', 'cocoa']).slice(0, 2), rng.shuffle(['boat', 'plane', 'wagons', 'cocoa']).slice(0, 2)];

    const s = { phase: 'title', phaseT: 0, t: 0, hover: null, buttons: [] };
    let pid = 0;
    let lid = 0;

    function newGame(tranquil) {
        Object.assign(s, {
            tranquil,
            round: 0,
            rt: 0,
            depot: { rail: 0, boat: 0, air: 0 },
            capRail: 0,
            links: [],
            queues: Object.fromEntries(ISLE_KEYS.map((k) => [k, []])),
            humeur: 0.8,
            delivered: 0,
            spawned: 0,
            rapid: 0,
            expressOk: 0,
            expressTotal: 0,
            basePts: 0,
            sleighs: 1,
            sleighArmed: false,
            mamieUsed: false,
            sursis: 0,
            fx: [],
            popups: [],
            toast: null,
            radio: null,
            drag: null,
            events: [],
            snapshot: null,
            retries: 0,
            roundStats: [],
            results: null,
            dirty: true,
            next: {},
            tuto: null,
            tutoDone: 0,
            broken: {},
            iceberg: null,
            mode: null, // véhicule choisi dans le dépôt ('rail' | 'boat' | 'air'), null = automatique
            pick: null // île de départ choisie au clic (relier en deux clics)
        });
    }
    newGame(false);

    // ---------------------------------------------------------------- outils
    const say = (str, dur = 4) => {
        s.toast = { text: str, t: 0, dur };
    };
    const popup = (x, y, str, color = '#ffd36e') => s.popups.push({ x, y, str, color, t: 0 });
    const isleName = (k) => (k === 'tri' ? 'le Centre de tri' : `l’île ${ISLES[k].name.replace('Île ', '')}`);
    const visible = () => visibleIn(s.round);
    const waitingCount = () => ISLE_KEYS.reduce((a, k) => a + s.queues[k].length, 0);
    const activeEvent = (id) => s.events.some((e) => e.id === id && e.on);
    const capOf = (type) => VEHICLES[type].cap + (type === 'rail' ? s.capRail : 0);
    // liaison bloquée : pont de banquise fendu, ou iceberg dans le chenal
    const blocked = (L) => s.broken[L.key] > s.rt || (s.iceberg && s.iceberg.key === L.key);
    const countOn = (key) => s.links.filter((L) => L.key === key).length;

    // Prochaine étape de chaque colis : plus court chemin (en temps de trajet) sur les liaisons ouvertes
    function computeRoutes() {
        const vis = visible();
        const n = vis.length;
        const idx = Object.fromEntries(vis.map((k, i) => [k, i]));
        const D = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 0 : Infinity)));
        const NX = Array.from({ length: n }, () => Array(n).fill(-1));
        s.links.forEach((L) => {
            if (L.closing || blocked(L)) return;
            const i = idx[L.a];
            const j = idx[L.b];
            if (i == null || j == null) return;
            const w = L.len / VEHICLES[L.type].speed / (1 + 0.6 * (countOn(L.key) - 1)) + 2;
            if (w < D[i][j]) {
                D[i][j] = D[j][i] = w;
                NX[i][j] = j;
                NX[j][i] = i;
            }
        });
        for (let k = 0; k < n; k++) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
            if (D[i][k] + D[k][j] < D[i][j]) {
                D[i][j] = D[i][k] + D[k][j];
                NX[i][j] = NX[i][k];
            }
        }
        s.next = {};
        vis.forEach((a, i) => {
            s.next[a] = {};
            vis.forEach((b, j) => {
                if (NX[i][j] >= 0) s.next[a][b] = vis[NX[i][j]];
            });
        });
        s.dirty = false;
    }

    function openLink(a, b, type) {
        if (a === b) return false;
        const def = LINKS.find(([x, y, t]) => t === type && ((x === a && y === b) || (x === b && y === a)));
        if (!def || s.depot[type] <= 0) return false;
        const key = linkKey(a, b, type);
        if (s.broken[key] > s.rt) {
            say(`Le pont est fendu : il sera réparé dans ${Math.ceil(s.broken[key] - s.rt)} s.`, 2.5);
            return false;
        }
        const same = countOn(key);
        if (same >= MAX_PER_LINK) return false;
        const vis = visible();
        if (!vis.includes(a) || !vis.includes(b)) return false;
        s.depot[type]--;
        const [x, y] = def;
        s.links.push({ key, id: lid++, slot: same, a: x, b: y, type, len: linkLength(x, y, type), pos: 0, dir: 1, at: x, moving: false, wait: 0.3 + same * 0.8, load: [], closing: false, broken: 0 });
        if (same) say(`Un ${VEHICLES[type].one} de plus sur cette liaison (${same + 1} au total) : elle débite plus.`, 2.6);
        s.dirty = true;
        const [mx, my] = linkPoint(x, y, type, 0.5);
        s.fx.push({ kind: 'open', x: mx, y: my, t: 0 });
        return true;
    }
    function closeLink(L) {
        L.closing = true;
        s.dirty = true;
        if (!L.moving) dropLink(L);
    }
    function dropLink(L) {
        L.load.forEach((p) => {
            p.at = L.at;
            s.queues[L.at].push(p);
        });
        L.load = [];
        s.links = s.links.filter((x) => x !== L);
        s.depot[L.type]++;
        s.dirty = true;
    }
    const MODE = {
        rail: { one: 'train', where: 'les ponts de banquise (bandes de glace)', on: 'pont de banquise' },
        boat: { one: 'bateau', where: 'les chenaux (pointillés bleus)', on: 'chenal' },
        air: { one: 'avion', where: 'les routes entre deux pistes (pointillés rouges)', on: 'route aérienne' }
    };
    const shortName = (k) => (k === 'tri' ? 'Centre de tri' : ISLES[k].name.replace('Île ', ''));
    // Le véhicule pour relier deux îles : celui choisi dans le dépôt, sinon le premier disponible (le plus rapide d'abord)
    function bestType(a, b) {
        const types = LINKS.filter(([x, y]) => (x === a && y === b) || (x === b && y === a)).map((l) => l[2]);
        if (s.mode) {
            const t = s.mode;
            return types.includes(t) && s.depot[t] > 0 && countOn(linkKey(a, b, t)) < MAX_PER_LINK && !(s.broken[linkKey(a, b, t)] > s.rt) ? t : null;
        }
        // d'abord un mode pas encore ouvert, sinon un véhicule de plus sur une liaison existante
        const order = ['air', 'rail', 'boat'].filter((t) => types.includes(t) && s.depot[t] > 0 && countOn(linkKey(a, b, t)) < MAX_PER_LINK && !(s.broken[linkKey(a, b, t)] > s.rt));
        order.sort((x, y) => countOn(linkKey(a, b, x)) - countOn(linkKey(a, b, y)));
        return order[0] || null;
    }

    // Pourquoi on ne peut pas relier ces deux îles : explication précise
    function refuse(a, b) {
        const types = LINKS.filter(([x, y]) => (x === a && y === b) || (x === b && y === a)).map((l) => l[2]);
        const pair = `${shortName(a)} et ${shortName(b)}`;
        if (!types.length) return say(`Rien ne relie ${pair}. Les liaisons possibles portent un petit dessin de véhicule.`, 3.5);
        if (s.mode && !types.includes(s.mode)) {
            const what = types.map((t) => `un ${MODE[t].on} (${MODE[t].one})`).join(' ou ');
            return say(`Pas de ${MODE[s.mode].on} entre ${pair} : il y a ${what}.`, 4);
        }
        const t = s.mode || types[0];
        if (s.broken[linkKey(a, b, t)] > s.rt) return say(`Ce pont est fendu : il sera réparé dans ${Math.ceil(s.broken[linkKey(a, b, t)] - s.rt)} s.`, 3);
        if (countOn(linkKey(a, b, t)) >= MAX_PER_LINK) return say(`Déjà ${MAX_PER_LINK} véhicules sur cette liaison : c'est le maximum.`, 3);
        return say(`Plus de ${MODE[t].one} libre au dépôt : clique sur une liaison pour en récupérer un.`, 3.5);
    }

    // Le tutoriel du premier Matin : une étape à la fois, les deux îles à relier clignotent
    const TUTO = [
        { isles: ['tri', 'poisson'], line: 'Glisse du Centre de tri jusqu’à l’île Poisson : un train part sur le pont de banquise.', done: () => s.links.some((L) => L.key === linkKey('tri', 'poisson', 'rail')) },
        { isles: ['tri', 'sapin'], line: 'Bien ! Les colis à symbole de poisson partent déjà. Relie maintenant l’île Sapin.', done: () => s.links.some((L) => L.key === linkKey('tri', 'sapin', 'rail')) },
        { isles: ['phoque', 'morse'], line: 'Le dernier train va sur le pont entre l’île Phoque et l’île Morse.', done: () => s.links.some((L) => L.key === linkKey('phoque', 'morse', 'rail')) },
        { isles: ['sapin', 'phoque'], alt: ['poisson', 'morse'], line: 'Il reste un bateau : un chenal relie Phoque à Sapin (ou Morse à Poisson).', done: () => s.next.tri && s.next.tri.morse }
    ];
    const reachable = (from, to) => from === to || !!(s.next[from] && s.next[from][to]);

    function deliver(p, isle) {
        s.delivered++;
        const rapid = Math.max(0, Math.round(25 - p.age));
        const mult = activeEvent('aurora') ? 2 : 1;
        let pts = (15 + rapid) * mult;
        s.rapid += rapid * mult;
        if (p.ex) {
            s.expressOk++;
            pts += 50;
            popup(ISLES[isle].x, ISLES[isle].y - 50, 'Express ! +50', '#ffd23f');
        }
        s.basePts += pts;
        s.humeur = Math.min(1, s.humeur + 0.011 + (p.age < OLD ? 0.006 : 0));
        if (!p.ex) popup(ISLES[isle].x + (Math.random() - 0.5) * 20, ISLES[isle].y - 44, `+${pts}`, mult > 1 ? '#7be0a3' : '#ffd36e');
    }

    function spawnParcel(from, to, ex) {
        const p = { id: pid++, from, to, at: from, age: 0, ex };
        s.queues[from].push(p);
        s.spawned++;
        if (ex) {
            s.expressTotal++;
            say(`Un colis express pour ${isleName(to)} : ${EXPRESS_T} s pour le livrer !`, 3.2);
        }
    }

    // ---------------------------------------------------------------- tournées
    function startRound(r) {
        s.round = r;
        s.rt = 0;
        s.spawnIdx = 0;
        const R = ROUNDS[r];
        Object.entries(R.gift).forEach(([k, v]) => (s.depot[k] += v));
        s.events = eventPlans[r].map((e) => ({ ...e, warned: false, on: false, done: false, target: null }));
        s.broken = {};
        s.iceberg = null;
        s.links.forEach((L) => (L.broken = 0));
        s.dirty = true;
        s.sursis = 0;
        s.snapshot = JSON.parse(JSON.stringify({
            depot: s.depot, capRail: s.capRail, links: s.links.map((L) => ({ ...L, load: [], pos: 0, dir: 1, at: L.a, moving: false, wait: 0.3, broken: 0 })),
            queues: s.queues, humeur: s.humeur, delivered: s.delivered, spawned: s.spawned, rapid: s.rapid, expressOk: s.expressOk,
            expressTotal: s.expressTotal, basePts: s.basePts, sleighs: s.sleighs, mamieUsed: s.mamieUsed, roundStats: s.roundStats
        }));
        s.roundStart = { delivered: s.delivered, basePts: s.basePts, expressOk: s.expressOk, expressTotal: s.expressTotal };
        s.phase = 'play';
        s.phaseT = 0;
        if (r === 0 && !s.retries) s.tuto = 0;
        if (r === 1) say('Deux nouvelles îles : Étoile et Cadeau. Un avion arrive au dépôt !', 5);
        if (r === 2) say('Rush du Réveillon ! L’île Aurore attend ses colis, et un bateau de plus est au dépôt.', 5);
    }
    function retryRound() {
        const sn = JSON.parse(JSON.stringify(s.snapshot));
        const r = s.round;
        Object.assign(s, sn, { retries: s.retries + 1, fx: [], popups: [], drag: null, sleighArmed: false });
        Object.entries(ROUNDS[r].gift).forEach(([k, v]) => (s.depot[k] -= v)); // startRound les redonne
        startRound(r);
    }
    function endRound() {
        const st = {
            name: ROUNDS[s.round].name,
            delivered: s.delivered - s.roundStart.delivered,
            pts: s.basePts - s.roundStart.basePts,
            express: `${s.expressOk - s.roundStart.expressOk} / ${s.expressTotal - s.roundStart.expressTotal}`,
            humeur: s.humeur
        };
        s.roundStats.push(st);
        s.sleighArmed = false;
        s.drag = null;
        if (s.round === ROUNDS.length - 1) finish();
        else {
            s.phase = 'bilan';
            s.phaseT = 0;
            s.lastStat = st;
        }
    }
    function pickCard(i) {
        const c = CARDS[cardPlans[s.round][i]];
        if (c.give) Object.entries(c.give).forEach(([k, v]) => (s.depot[k] += v));
        if (c.capRail) s.capRail += c.capRail;
        if (c.mood) s.humeur = Math.min(1, s.humeur + c.mood);
        startRound(s.round + 1);
    }
    function fail() {
        s.phase = 'fail';
        s.phaseT = 0;
        s.drag = null;
        const fails = markFail(ID);
        const btns = [{ id: 'retry', label: `Rejouer le ${ROUNDS[s.round].name}`, primary: true }, { id: 'tranquil', label: 'Mode tranquille' }];
        if (fails >= SKIP_AFTER_FAILS) btns.push({ id: 'skip', label: 'Passer l’épisode' });
        s.overBtns = btns;
    }

    function finish() {
        const mult = 1 + 0.4 * s.humeur;
        const kept = s.sleighs > 0 ? 150 : 0;
        const score = s.tranquil ? 0 : Math.round(s.basePts * mult) + kept;
        const best = getBest(ID);
        let isRecord = false;
        let official = null;
        if (!s.tranquil) {
            isRecord = api.reportScore(score) || false;
            official = firstTryOfDay(ID, day, score);
        }
        markWon(ID, score);
        const ratio = s.spawned ? s.delivered / s.spawned : 0;
        const stars = 1 + (ratio >= 0.8 ? 1 : 0) + (ratio >= 0.9 && s.humeur >= 0.6 ? 1 : 0);
        s.results = {
            title: 'Le Réveillon est livré !',
            subtitle: s.tranquil ? 'Mode tranquille : épisode validé, sans record' : `Archipel du ${day.split('-').reverse().slice(0, 2).join('/')}${s.retries ? ` · ${s.retries} tournée${s.retries > 1 ? 's' : ''} rejouée${s.retries > 1 ? 's' : ''}` : ''}`,
            score,
            stars: s.tranquil ? null : stars,
            grade: s.tranquil ? null : gradeFor(score, { S: 6000, A: 5000, B: 3800 }),
            rows: [
                ['Colis livrés', `${s.delivered} / ${s.spawned}  ·  ${s.delivered * 15}`],
                ['Rapidité (bonus)', `+ ${s.rapid}`],
                ['Express', `${s.expressOk} / ${s.expressTotal}  ·  + ${s.expressOk * 50}`],
                ['Humeur finale', `${Math.round(s.humeur * 100)} %  ·  × ${mult.toFixed(2).replace('.', ',')}`],
                ['Traîneau gardé', kept ? '1  ·  + 150' : '0']
            ],
            best,
            isRecord,
            official,
            code: s.tranquil ? `passage ${passCode(ID)}` : `${scoreCode(ID, day, score)} · passage ${passCode(ID)}`,
            buttons: [{ id: 'replay', label: 'Rejouer' }, { id: 'exit', label: 'Quête ▸', primary: true }]
        };
        s.phase = 'results';
        s.phaseT = 0;
    }

    // ---------------------------------------------------------------- simulation
    function updateEvents(dt) {
        for (const e of s.events) {
            if (!e.warned && s.rt >= e.t - WARN) {
                e.warned = true;
                // la cible est choisie à l'annonce : un pont ouvert si possible, sinon un pont possible
                if (e.id === 'crack') {
                    const open = s.links.filter((L) => L.type === 'rail');
                    const any = LINKS.filter(([a, b, t]) => t === 'rail' && visible().includes(a) && visible().includes(b)).map(([a, b, t]) => linkKey(a, b, t));
                    const pool = open.length ? open.map((L) => L.key) : any;
                    e.target = pool[Math.floor(e.seed * pool.length)];
                } else if (e.id === 'iceberg') {
                    const open = [...new Set(s.links.filter((L) => L.type === 'boat').map((L) => L.key))];
                    const any = LINKS.filter(([a, b, t]) => t === 'boat' && visible().includes(a) && visible().includes(b)).map(([a, b, t]) => linkKey(a, b, t));
                    const pool = open.length ? open : any;
                    e.target = pool[Math.floor(e.seed * pool.length)];
                } else if (e.id === 'burst') {
                    const pool = visible().filter((k) => k !== 'tri');
                    e.target = pool[Math.floor(e.seed * pool.length)];
                }
                let line = EVENTS[e.id].line;
                if (e.id === 'crack' && e.target) {
                    const [a, b] = e.target.split('-');
                    line = `La banquise se fend : ${ISLES[a].name.replace('Île ', '')} ↔ ${ISLES[b].name.replace('Île ', '')}`;
                }
                if (e.id === 'burst') line = `Rush sur ${isleName(e.target)} : 10 colis d’un coup !`;
                if (e.id === 'iceberg' && e.target) {
                    const [a, b] = e.target.split('-');
                    line = `Un iceberg dérive vers le chenal ${ISLES[a].name.replace('Île ', '')} ↔ ${ISLES[b].name.replace('Île ', '')}`;
                }
                s.radio = { line, t: 0, ev: e };
            }
            if (e.warned && !e.on && !e.done && s.rt >= e.t) {
                e.on = true;
                e.end = e.t + EVENTS[e.id].dur;
                s.dirty = true;
                if (e.id === 'burst') {
                    const dests = visible().filter((k) => k !== e.target);
                    for (let i = 0; i < 10; i++) spawnParcel(e.target, dests[Math.floor(((e.seed * 997 + i * 0.37) % 1) * dests.length)], false);
                    e.on = false;
                    e.done = true;
                } else if (e.id === 'crack' && e.target) {
                    // le pont casse : ses trains reviennent au dépôt, on ne peut pas le reposer avant la réparation
                    s.broken[e.target] = e.end;
                    s.links.filter((L) => L.key === e.target).forEach((L) => closeLink(L));
                    const [a, b, t] = e.target.split('-');
                    const [mx, my] = linkPoint(a, b, t, 0.5);
                    popup(mx, my - 10, 'Pont fendu !', '#ff8f8f');
                    say('Le pont est fendu : ses trains reviennent au dépôt. Trouve un autre chemin !', 4);
                } else if (e.id === 'iceberg' && e.target) {
                    s.iceberg = { key: e.target, hits: 0 };
                    say('Un iceberg bloque le chenal : clique trois fois dessus pour le briser !', 4);
                } else if (e.id === 'breakdown') {
                    const pool = s.links.filter((L) => !L.broken && !L.closing).sort((x, y) => x.id - y.id);
                    if (pool.length) {
                        const L = pool[Math.floor(e.seed * pool.length)];
                        L.broken = 999; // pas de réparation toute seule : il faut cliquer
                        say(`Le ${VEHICLES[L.type].one} ${ISLES[L.a].name.replace('Île ', '')} ↔ ${ISLES[L.b].name.replace('Île ', '')} est en panne : clique dessus pour le réparer !`, 4.5);
                    }
                    e.on = false;
                    e.done = true;
                }
            }
            if (e.on && s.rt >= e.end) {
                e.on = false;
                e.done = true;
                s.dirty = true;
                if (e.id === 'iceberg' && s.iceberg && s.iceberg.key === e.target) s.iceberg = null;
            }
        }
        if (s.radio) {
            s.radio.t += dt;
            if (s.radio.t > WARN + 1.5) s.radio = null;
        }
    }

    function updateLink(L, dt) {
        const def = VEHICLES[L.type];
        // en panne : le véhicule s'arrête jusqu'à ce qu'on clique dessus
        if (L.broken > 0) {
            L.broken -= dt;
            if (L.broken <= 0) L.broken = 0;
            return;
        }
        if (L.moving) {
            const slow = L.type === 'boat' ? (activeEvent('fog') ? 0.35 : activeEvent('storm') ? 0.7 : 1) : 1;
            L.pos += (def.speed * slow * dt) / L.len;
            if (L.pos >= 1) {
                L.pos = 0;
                L.moving = false;
                L.at = L.dir > 0 ? L.b : L.a;
                L.wait = DWELL;
                // déchargement : livré si c'est la bonne île, sinon le colis continue depuis ici
                const keep = [];
                L.load.forEach((p) => {
                    if (p.to === L.at) deliver(p, L.at);
                    else {
                        p.at = L.at;
                        keep.push(p);
                    }
                });
                L.load = [];
                keep.forEach((p) => s.queues[L.at].push(p));
                if (L.closing) dropLink(L);
            }
            return;
        }
        L.wait -= dt;
        if (L.wait > 0) return;
        const other = L.at === L.a ? L.b : L.a;
        if ((L.type === 'air' && activeEvent('storm')) || blocked(L)) {
            L.wait = 0.25;
            return;
        }
        // chargement : les colis dont la prochaine étape est l'autre île, les express d'abord
        const q = s.queues[L.at];
        const cand = q.filter((p) => s.next[L.at] && s.next[L.at][p.to] === other).sort((a, b) => (b.ex ? 1 : 0) - (a.ex ? 1 : 0) || b.age - a.age);
        const take = cand.slice(0, capOf(L.type));
        if (take.length) s.queues[L.at] = q.filter((p) => !take.includes(p));
        L.load = take;
        const fetch = s.queues[other].some((p) => s.next[other] && s.next[other][p.to] === L.at);
        if (take.length || fetch) {
            L.moving = true;
            L.dir = other === L.b ? 1 : -1;
            L.pos = 0;
        } else L.wait = 0.25;
    }

    function step(dt) {
        const R = ROUNDS[s.round];
        s.rt += dt;
        updateEvents(dt);
        if (s.dirty) computeRoutes();
        if (s.tuto != null) {
            if (s.tuto < TUTO.length && TUTO[s.tuto].done()) {
                s.tuto++;
                if (s.tuto >= TUTO.length) s.tutoDone = 5;
            }
            if (s.tuto >= TUTO.length) {
                s.tutoDone -= dt;
                if (s.tutoDone <= 0) s.tuto = null;
            }
        }
        const plan = spawnPlans[s.round];
        while (s.spawnIdx < plan.length && plan[s.spawnIdx].t <= s.rt) {
            const p = plan[s.spawnIdx];
            spawnParcel(p.from, p.to, p.ex);
            s.spawnIdx++;
        }
        s.links.slice().forEach((L) => updateLink(L, dt));
        // vieillissement et humeur
        let drain = 0;
        ISLE_KEYS.forEach((k) => s.queues[k].forEach((p) => {
            p.age += dt;
            if (p.age > OLD) drain += 0.0019;
            if (p.ex && p.age > EXPRESS_T) {
                p.ex = false;
                s.humeur -= 0.05;
                popup(ISLES[k].x, ISLES[k].y - 50, 'Express raté…', '#ff8f8f');
            }
        }));
        s.links.forEach((L) => L.load.forEach((p) => {
            p.age += dt;
            if (p.ex && p.age > EXPRESS_T) p.ex = false;
        }));
        const wait = waitingCount();
        if (wait > MAX_WAIT) drain += 0.012;
        s.humeur -= drain * dt;
        const floor = !R.canLose || s.tranquil ? 0.3 : 0;
        s.humeur = Math.max(floor, Math.min(1, s.humeur));
        // humeur à zéro : le traîneau de secours de Mamie (une fois), puis le sursis
        if (R.canLose && !s.tranquil) {
            if (s.humeur <= 0.001 && s.sursis <= 0) {
                if (!s.mamieUsed) mamieRescue();
                else {
                    s.sursis = 8;
                    say('Sursis ! Livre des colis vite, sinon on rejoue la tournée.', 3);
                }
            } else if (s.sursis > 0) {
                s.sursis -= dt;
                if (s.humeur > 0.08) s.sursis = 0;
                else if (s.sursis <= 0) {
                    fail();
                    return;
                }
            }
        }
        s.fx.forEach((f) => (f.t += dt));
        s.fx = s.fx.filter((f) => f.t < (f.dur || 0.8));
        s.popups.forEach((p) => (p.t += dt));
        s.popups = s.popups.filter((p) => p.t < 1.2);
        if (s.rt >= R.dur) endRound();
    }
    function sleighDeliver(isle, n) {
        const q = s.queues[isle].slice().sort((a, b) => (b.ex ? 1 : 0) - (a.ex ? 1 : 0) || b.age - a.age);
        const take = q.slice(0, n);
        s.queues[isle] = s.queues[isle].filter((p) => !take.includes(p));
        take.forEach((p) => deliver(p, p.to));
        s.fx.push({ kind: 'sleigh', x: ISLES[isle].x, y: ISLES[isle].y, t: 0, dur: 1.6 });
        return take.length;
    }
    function mamieRescue() {
        s.mamieUsed = true;
        const busiest = ISLE_KEYS.slice().sort((a, b) => s.queues[b].length - s.queues[a].length)[0];
        sleighDeliver(busiest, 10);
        s.humeur = 0.3;
        say('Mamie envoie un traîneau de secours ! La prochaine fois, ce sera le sursis.', 4.5);
    }
    function useSleigh(isle) {
        if (s.sleighs <= 0) return;
        s.sleighs--;
        s.sleighArmed = false;
        const n = sleighDeliver(isle, 6);
        say(`Le traîneau emporte ${n} colis depuis ${isleName(isle)} !`, 3);
    }

    function update(dt) {
        s.t += dt;
        s.phaseT += dt;
        if (s.toast) {
            s.toast.t += dt;
            if (s.toast.t > s.toast.dur) s.toast = null;
        }
        if (s.phase === 'play') step(dt);
    }

    // ---------------------------------------------------------------- dessin
    function drawLinkLine(ctx, L) {
        const cut = false;
        ctx.save();
        ctx.lineCap = 'round';
        ctx.beginPath();
        if (L.type === 'air') {
            const A = ISLES[L.a];
            const B = ISLES[L.b];
            ctx.moveTo(A.x, A.y);
            ctx.quadraticCurveTo((A.x + B.x) / 2, Math.min(A.y, B.y) - 50, B.x, B.y);
        } else {
            ctx.moveTo(ISLES[L.a].x, ISLES[L.a].y);
            ctx.lineTo(ISLES[L.b].x, ISLES[L.b].y);
        }
        const hov = s.hover === L.key;
        if (L.type === 'rail') {
            ctx.strokeStyle = cut ? 'rgba(107,74,46,0.45)' : hov ? '#8a6440' : '#6b4a2e';
            ctx.lineWidth = 8;
            if (cut) ctx.setLineDash([10, 14]);
            ctx.stroke();
            if (!cut) {
                ctx.strokeStyle = '#e6d2b0';
                ctx.lineWidth = 2;
                ctx.setLineDash([2, 5]);
                ctx.stroke();
            }
        } else if (L.type === 'boat') {
            ctx.strokeStyle = hov ? '#ffffff' : 'rgba(200,240,255,0.95)';
            ctx.lineWidth = 3;
            ctx.setLineDash([10, 6]);
            ctx.stroke();
        } else {
            ctx.strokeStyle = hov ? '#ffc0c0' : 'rgba(255,140,140,0.95)';
            ctx.lineWidth = 2.5;
            ctx.setLineDash([2, 7]);
            ctx.stroke();
        }
        ctx.restore();
        if (cut) {
            const [mx, my] = linkPoint(L.a, L.b, L.type, 0.5);
            circle(ctx, mx, my, 10, '#ffffff');
            evIcon(ctx, 'crack', mx, my, 1);
        }
    }
    function vehiclePos(L) {
        let k;
        let dir;
        if (L.moving) {
            k = L.dir > 0 ? L.pos : 1 - L.pos;
            dir = (L.dir > 0 ? ISLES[L.b].x >= ISLES[L.a].x : ISLES[L.a].x >= ISLES[L.b].x) ? 1 : -1;
        } else {
            const off = (L.slot || 0) * 0.12;
            k = L.at === L.a ? 0.22 + off : 0.78 - off;
            dir = (L.at === L.a ? ISLES[L.b].x >= ISLES[L.a].x : ISLES[L.a].x >= ISLES[L.b].x) ? 1 : -1;
        }
        // on reste au bord des îles
        const ra = (ISLES[L.a].r * 0.6) / (L.len + ISLES[L.a].r * 1.2);
        const kk = ra + k * (1 - 2 * ra);
        const [x, y] = linkPoint(L.a, L.b, L.type, kk);
        return [x, y, dir];
    }
    function drawVehicle(ctx, L) {
        const [x, y, dir] = vehiclePos(L);
        if (L.broken > 0) {
            for (let i = 0; i < 3; i++) {
                const k = (s.t * 0.8 + i / 3) % 1;
                ctx.globalAlpha = 0.6 * (1 - k);
                circle(ctx, x + Math.sin(k * 6 + i) * 4, y - 14 - k * 26, 4 + k * 6, '#6b7280');
                ctx.globalAlpha = 1;
            }
        }
        if (L.type === 'rail') trainIcon(ctx, x + 5, y - 4, 1.15, dir);
        else if (L.type === 'boat') boatIcon(ctx, x, y - 2, 1.2, dir, L.moving);
        else planeIcon(ctx, x, y, 1.3, dir);
        // les colis transportés : en grand, dans une étiquette au-dessus du véhicule
        if (L.load.length) {
            const n = L.load.length;
            const sz = 17;
            const w = n * (sz + 3) + 6;
            const by = y - (L.type === 'air' ? 30 : 34);
            roundRect(ctx, x - w / 2, by - sz / 2 - 4, w, sz + 8, 8);
            ctx.fillStyle = 'rgba(255,255,255,0.88)';
            ctx.fill();
            L.load.forEach((p, i) => {
                const px = x - w / 2 + 3 + sz / 2 + i * (sz + 3) + 1.5;
                if (p.ex) ctx.drawImage(goldGlow, px - 16, by - 16, 32, 32);
                drawParcel(ctx, PS, px, by, p.to, p.ex, sz);
            });
        }
        if (L.broken > 0) {
            const pulse = 1 + 0.08 * Math.sin(s.t * 10);
            ctx.save();
            ctx.translate(x, y - 34);
            ctx.scale(pulse, pulse);
            roundRect(ctx, -44, -11, 88, 22, 11);
            ctx.fillStyle = '#d7263d';
            ctx.fill();
            ctx.restore();
            text(ctx, 'Panne ! Clique', x, y - 30, { size: 11, weight: 800, align: 'center' });
        }
    }
    function drawIceberg(ctx) {
        if (!s.iceberg) return;
        const [a, b, t] = s.iceberg.key.split('-');
        const [mx, my] = linkPoint(a, b, t, 0.5);
        const h = s.iceberg.hits;
        ctx.save();
        ctx.translate(mx, my + Math.sin(s.t * 2) * 2);
        ctx.fillStyle = 'rgba(10,40,70,0.3)';
        ctx.beginPath();
        ctx.ellipse(2, 12, 26, 6, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#eaf6ff';
        ctx.beginPath();
        ctx.moveTo(-24, 10);
        ctx.lineTo(-16, -8);
        ctx.lineTo(-6, -4);
        ctx.lineTo(2, -22);
        ctx.lineTo(12, -6);
        ctx.lineTo(22, -10);
        ctx.lineTo(26, 10);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#b9dcf5';
        ctx.beginPath();
        ctx.moveTo(2, -22);
        ctx.lineTo(12, -6);
        ctx.lineTo(22, -10);
        ctx.lineTo(26, 10);
        ctx.lineTo(6, 10);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#5b8fbf';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < h; i++) {
            ctx.beginPath();
            ctx.moveTo(-8 + i * 9, -12 + i * 3);
            ctx.lineTo(-4 + i * 9, -2);
            ctx.lineTo(-9 + i * 9, 8);
            ctx.stroke();
        }
        ctx.restore();
        roundRect(ctx, mx - 40, my + 18, 80, 18, 9);
        ctx.fillStyle = 'rgba(8,14,34,0.88)';
        ctx.fill();
        text(ctx, `Clique ! ${h} / 3`, mx, my + 31, { size: 11, weight: 800, align: 'center', color: '#bfe9ff' });
    }
    function drawQueues(ctx) {
        ISLE_KEYS.forEach((k) => {
            const I = ISLES[k];
            const q = s.queues[k];
            if (!q.length) return;
            const side = I.x < 200 || I.x > 400 || k === 'tri' ? 1 : -1;
            const x0 = I.x + side * (I.r * 0.4 + 10);
            const y0 = I.y + I.r * 0.42;
            q.slice(0, 8).forEach((p, i) => {
                const px = x0 + side * (i % 4) * 16;
                const py = y0 + Math.floor(i / 4) * 16;
                if (p.ex) ctx.drawImage(goldGlow, px - 16, py - 16, 32, 32);
                drawParcel(ctx, PS, px, py, p.to, p.ex, 16);
            });
            if (q.length > 8) text(ctx, `+${q.length - 8}`, x0 + side * 66, y0 + 12, { size: 12, weight: 800, align: side > 0 ? 'left' : 'right', color: '#ffffff', shadow: true });
            // le client de l'île râle quand ses colis traînent
            const old = q.filter((p) => p.age > OLD).length;
            if (k !== 'tri' && (old >= 1 || q.length >= 5)) client(ctx, I.x + I.r * 0.3 * -side, I.y + I.r * 0.55, old >= 3 || q.length >= 7 ? 2 : 1, k === 'phoque' || k === 'morse' ? 'seal' : 'penguin', s.t);
        });
    }
    function drawFx(ctx) {
        for (const f of s.fx) {
            const k = f.t / (f.dur || 0.8);
            if (f.kind === 'open') {
                ctx.globalAlpha = 1 - k;
                ctx.strokeStyle = '#ffd36e';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(f.x, f.y, 8 + f.t * 40, 0, TAU);
                ctx.stroke();
                ctx.globalAlpha = 1;
            } else if (f.kind === 'sleigh') {
                const x = f.x + (k - 0.5) * 500;
                const y = f.y - 40 - Math.sin(k * Math.PI) * 40;
                sleighIcon(ctx, x, y, 1.4);
                ctx.globalAlpha = 1 - k;
                for (let i = 0; i < 6; i++) circle(ctx, x - 30 - i * 12, y + 6 + Math.sin(i + s.t * 9) * 3, 2, '#ffd36e');
                ctx.globalAlpha = 1;
            }
        }
    }
    function drawHud(ctx) {
        const R = ROUNDS[s.round];
        const tk = Math.min(1, s.rt / R.dur);
        ctx.fillStyle = 'rgba(8,14,34,0.82)';
        ctx.fillRect(0, 0, W, TOP);
        circle(ctx, 20, 17, 11, 'rgba(255,255,255,0.15)');
        ctx.beginPath();
        ctx.moveTo(20, 17);
        ctx.arc(20, 17, 11, -Math.PI / 2, -Math.PI / 2 + TAU * tk);
        ctx.closePath();
        ctx.fillStyle = '#ffd36e';
        ctx.fill();
        text(ctx, `Tournée ${s.round + 1}/3 · ${R.name}`, 38, 22, { size: 13, weight: 800, font: DISPLAY });
        const fx = 230;
        const fw = 340;
        roundRect(ctx, fx, 12, fw, 10, 5);
        ctx.fillStyle = 'rgba(255,255,255,0.14)';
        ctx.fill();
        roundRect(ctx, fx, 12, Math.max(10, fw * tk), 10, 5);
        ctx.fillStyle = 'rgba(255,211,110,0.55)';
        ctx.fill();
        s.events.forEach((e) => {
            const x = fx + fw * (e.t / R.dur);
            circle(ctx, x, 17, 10, e.on ? '#ffd36e' : '#ffffff');
            evIcon(ctx, e.id, x, 17, 1);
        });
        ctx.fillStyle = '#ffd36e';
        ctx.fillRect(fx + fw * tk - 1, 6, 2, 22);
        text(ctx, Math.round(s.basePts).toLocaleString('fr-FR'), W - 14, 23, { size: 17, weight: 800, align: 'right', color: '#ffd36e', font: DISPLAY });
        text(ctx, 'Score', W - 76, 22, { size: 11, weight: 600, align: 'right', color: 'rgba(255,255,255,0.7)' });
        // le dépôt
        const btns = [];
        ctx.fillStyle = 'rgba(8,14,34,0.86)';
        ctx.fillRect(0, BOTTOM, W, H - BOTTOM);
        const dragType = s.drag && s.drag.target ? s.drag.type : null;
        [['rail', 'Trains'], ['boat', 'Bateaux'], ['air', 'Avions']].forEach(([id, lb], i) => {
            const x = 10 + i * 116;
            const sel = s.mode === id;
            btns.push({ id: `mode:${id}`, x, y: BOTTOM + 8, w: 110, h: 30 });
            roundRect(ctx, x, BOTTOM + 8, 110, 30, 10);
            ctx.fillStyle = sel ? 'rgba(255,211,110,0.4)' : dragType === id || s.hover === `mode:${id}` ? 'rgba(255,211,110,0.22)' : 'rgba(255,255,255,0.1)';
            ctx.fill();
            if (sel) {
                ctx.strokeStyle = '#ffd36e';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
            ctx.save();
            ctx.translate(x + 24, BOTTOM + 23);
            ctx.globalAlpha = s.depot[id] ? 1 : 0.45;
            if (id === 'rail') trainIcon(ctx, 6, 0, 0.5, 1);
            if (id === 'boat') boatIcon(ctx, 0, 1, 0.55, 1, false);
            if (id === 'air') planeIcon(ctx, 0, -1, 0.62, 1);
            ctx.restore();
            text(ctx, `${lb} ×${s.depot[id]}`, x + 46, BOTTOM + 27, { size: 12, weight: 700, color: s.depot[id] ? '#ffffff' : 'rgba(255,255,255,0.45)' });
        });
        const sb = { id: 'sleigh', x: 360, y: BOTTOM + 7, w: 122, h: 32 };
        btns.push(sb);
        roundRect(ctx, sb.x, sb.y, sb.w, sb.h, 16);
        ctx.fillStyle = s.sleighArmed ? '#ffd36e' : s.sleighs ? (s.hover === 'sleigh' ? 'rgba(255,211,110,0.4)' : 'rgba(255,211,110,0.22)') : 'rgba(255,255,255,0.06)';
        ctx.fill();
        ctx.strokeStyle = s.sleighs ? '#ffd36e' : 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        sleighIcon(ctx, sb.x + 22, sb.y + 17, 0.62);
        text(ctx, `Traîneau ×${s.sleighs}`, sb.x + 52, sb.y + 21, { size: 12, weight: 800, color: s.sleighArmed ? '#2a1d05' : s.sleighs ? '#ffe3a1' : 'rgba(255,255,255,0.4)' });
        const hx = 498;
        const hw = 160;
        const hum = s.humeur;
        text(ctx, 'Humeur', hx, BOTTOM + 15, { size: 11, weight: 600, color: 'rgba(255,255,255,0.75)' });
        roundRect(ctx, hx, BOTTOM + 22, hw, 12, 6);
        ctx.fillStyle = 'rgba(255,255,255,0.14)';
        ctx.fill();
        roundRect(ctx, hx, BOTTOM + 22, Math.max(6, hw * hum), 12, 6);
        ctx.fillStyle = hum < 0.25 ? '#ff5d5d' : hum < 0.5 ? '#ffb15e' : '#7be0a3';
        ctx.fill();
        text(ctx, `${Math.round(hum * 100)} %`, hx + hw + 8, BOTTOM + 33, { size: 13, weight: 800, font: DISPLAY });
        const wait = waitingCount();
        text(ctx, 'En attente', W - 12, BOTTOM + 15, { size: 11, weight: 600, align: 'right', color: 'rgba(255,255,255,0.75)' });
        text(ctx, `${wait} / ${MAX_WAIT}`, W - 12, BOTTOM + 34, { size: 14, weight: 800, align: 'right', color: wait > MAX_WAIT * 0.8 ? '#ff5d5d' : '#ffffff', font: DISPLAY });
        return btns;
    }
    function drawToast(ctx) {
        if (s.toast && s.tuto == null) {
            const k = Math.min(1, s.toast.t / 0.25, (s.toast.dur - s.toast.t) / 0.3);
            if (k > 0) {
                ctx.globalAlpha = k;
                ctx.font = '600 12px "DM Sans", system-ui, sans-serif';
                const w = Math.min(420, ctx.measureText(s.toast.text).width + 26);
                roundRect(ctx, 54, TOP + 8, w, 38, 12);
                ctx.fillStyle = 'rgba(255,250,240,0.96)';
                ctx.fill();
                text(ctx, 'Cheffe Mouette', 66, TOP + 21, { size: 10, weight: 800, color: '#a5121f', font: DISPLAY });
                text(ctx, s.toast.text, 66, TOP + 37, { size: 12, weight: 600, color: '#1d2542' });
                gull(ctx, 28, TOP + 30, 0.7, s.t * 6, 1);
                ctx.globalAlpha = 1;
            }
        }
        if (s.radio && s.radio.t < WARN + 1.2) {
            const left = Math.max(0, Math.ceil(WARN - s.radio.t));
            ctx.font = '600 11px "DM Sans", system-ui, sans-serif';
            const w = Math.max(220, ctx.measureText(s.radio.line).width + 26);
            roundRect(ctx, W - w - 10, TOP + 8, w, 40, 12);
            ctx.fillStyle = 'rgba(160,30,40,0.94)';
            ctx.fill();
            text(ctx, left > 0 ? `RADIO BANQUISE · dans ${left} s` : 'RADIO BANQUISE · maintenant !', W - w + 2, TOP + 21, { size: 10, weight: 800, color: '#ffd36e', font: DISPLAY });
            text(ctx, s.radio.line, W - w + 2, TOP + 38, { size: 11, weight: 600 });
        }
    }
    function drawModeHelp(ctx) {
        if (s.pick) {
            const I = ISLES[s.pick];
            ctx.strokeStyle = '#ffd36e';
            ctx.lineWidth = 3.5;
            ctx.beginPath();
            ctx.ellipse(I.x, I.y, I.r * 1.18, I.r * 0.92, 0, 0, TAU);
            ctx.stroke();
            visible().forEach((k) => {
                if (k === s.pick || !bestType(s.pick, k)) return;
                const J = ISLES[k];
                ctx.strokeStyle = `rgba(255,211,110,${0.45 + 0.35 * Math.sin(s.t * 6)})`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.ellipse(J.x, J.y, J.r * 1.15, J.r * 0.9, 0, 0, TAU);
                ctx.stroke();
            });
        }
        if (!s.mode && !s.pick) return;
        const line = s.mode
            ? `${s.mode === 'rail' ? 'Train' : s.mode === 'boat' ? 'Bateau' : 'Avion'} choisi : il va seulement sur ${MODE[s.mode].where}.${s.pick ? ` Clique l'île d'arrivée.` : ' Glisse ou clique deux îles.'}`
            : `Départ : ${shortName(s.pick)}. Clique l'île d'arrivée (les îles possibles brillent).`;
        ctx.font = '700 12px "DM Sans", system-ui, sans-serif';
        const w = Math.min(W - 20, ctx.measureText(line).width + 28);
        roundRect(ctx, (W - w) / 2, BOTTOM - 34, w, 26, 13);
        ctx.fillStyle = 'rgba(8,14,34,0.9)';
        ctx.fill();
        text(ctx, line, W / 2, BOTTOM - 17, { size: 12, weight: 700, align: 'center', color: '#ffe9b0' });
    }
    function drawDrag(ctx) {
        if (!s.drag) return;
        const A = ISLES[s.drag.from];
        ctx.save();
        ctx.strokeStyle = s.drag.target ? '#ffd36e' : 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 4;
        ctx.setLineDash([8, 6]);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(A.x, A.y);
        const tx = s.drag.target ? ISLES[s.drag.target].x : s.drag.x;
        const ty = s.drag.target ? ISLES[s.drag.target].y : s.drag.y;
        ctx.lineTo(tx, ty);
        ctx.stroke();
        ctx.restore();
        // les îles joignables brillent
        visible().forEach((k) => {
            if (k === s.drag.from) return;
            const ok = bestType(s.drag.from, k);
            if (!ok) return;
            const I = ISLES[k];
            ctx.strokeStyle = k === s.drag.target ? '#ffd36e' : 'rgba(255,211,110,0.5)';
            ctx.lineWidth = k === s.drag.target ? 3 : 2;
            ctx.beginPath();
            ctx.ellipse(I.x, I.y, I.r * 1.15, I.r * 0.9, 0, 0, TAU);
            ctx.stroke();
        });
        if (s.drag.target) {
            const lb = { rail: 'Pont de banquise : un train part', boat: 'Chenal : un bateau part', air: 'Piste : un avion décolle' }[s.drag.type];
            const I = ISLES[s.drag.target];
            ctx.font = '700 11px "DM Sans", system-ui, sans-serif';
            const w = ctx.measureText(lb).width + 24;
            roundRect(ctx, I.x - w / 2, I.y + I.r * 0.9 + 4, w, 22, 11);
            ctx.fillStyle = 'rgba(8,14,34,0.88)';
            ctx.fill();
            text(ctx, lb, I.x, I.y + I.r * 0.9 + 19, { size: 11, weight: 700, align: 'center', color: '#bfe9ff' });
        }
    }
    function drawPlay(ctx) {
        const storm = activeEvent('storm');
        ctx.drawImage(bgFor(s.round, storm), 0, 0, W, H);
        // les liaisons possibles : chenaux (bateaux) et routes aériennes (avions) en pointillés, avec un petit
        // pictogramme du véhicule au milieu ; les ponts de banquise (trains) sont dessinés dans le décor
        {
            const vis = visible();
            LINKS.forEach(([a, b, t]) => {
                if (!vis.includes(a) || !vis.includes(b) || s.links.some((L) => L.key === linkKey(a, b, t))) return;
                const avail = s.depot[t] > 0;
                const near = (s.drag && (s.drag.from === a || s.drag.from === b)) || (s.pick && (s.pick === a || s.pick === b));
                // véhicule choisi : ses liaisons ressortent en jaune, les autres s'effacent
                if (s.mode && t === s.mode) {
                    ctx.save();
                    ctx.strokeStyle = `rgba(255,211,110,${0.55 + 0.3 * Math.sin(s.t * 5)})`;
                    ctx.lineWidth = t === 'rail' ? 6 : 3.5;
                    ctx.setLineDash(t === 'rail' ? [] : [8, 6]);
                    ctx.beginPath();
                    if (t === 'air') ctx.moveTo(ISLES[a].x, ISLES[a].y), ctx.quadraticCurveTo((ISLES[a].x + ISLES[b].x) / 2, Math.min(ISLES[a].y, ISLES[b].y) - 50, ISLES[b].x, ISLES[b].y);
                    else ctx.moveTo(ISLES[a].x, ISLES[a].y), ctx.lineTo(ISLES[b].x, ISLES[b].y);
                    ctx.stroke();
                    ctx.restore();
                }
                if (s.mode && t !== s.mode) {
                    ctx.globalAlpha = 0.25;
                    const [mx0, my0] = linkPoint(a, b, t, 0.5);
                    circle(ctx, mx0, my0, 8, '#1d2542');
                    ctx.globalAlpha = 1;
                    return;
                }
                if (t !== 'rail') {
                    ctx.save();
                    ctx.setLineDash(t === 'air' ? [2, 7] : [4, 8]);
                    ctx.strokeStyle = t === 'air' ? `rgba(255,150,150,${near ? 0.8 : 0.4})` : `rgba(190,235,255,${near ? 0.9 : 0.45})`;
                    ctx.lineWidth = near ? 2.2 : 1.5;
                    ctx.beginPath();
                    if (t === 'air') ctx.moveTo(ISLES[a].x, ISLES[a].y), ctx.quadraticCurveTo((ISLES[a].x + ISLES[b].x) / 2, Math.min(ISLES[a].y, ISLES[b].y) - 50, ISLES[b].x, ISLES[b].y);
                    else ctx.moveTo(ISLES[a].x, ISLES[a].y), ctx.lineTo(ISLES[b].x, ISLES[b].y);
                    ctx.stroke();
                    ctx.restore();
                }
                const [mx, my] = linkPoint(a, b, t, 0.5);
                ctx.globalAlpha = avail ? (near ? 1 : 0.8) : 0.35;
                circle(ctx, mx, my, 10, t === 'rail' ? '#6b4a2e' : t === 'boat' ? '#1d4f78' : '#7a2433');
                if (t === 'rail') trainIcon(ctx, mx + 3, my - 1, 0.32, 1);
                else if (t === 'boat') boatIcon(ctx, mx, my, 0.36, 1, false);
                else planeIcon(ctx, mx, my - 1, 0.42, 1);
                ctx.globalAlpha = 1;
            });
        }
        // la cible d'une banquise qui va se fendre : hachures rouges
        s.events.forEach((e) => {
            if (e.id === 'crack' && e.warned && !e.done && e.target && !e.on) {
                const [a, b, t] = e.target.split('-');
                ctx.save();
                ctx.strokeStyle = `rgba(255,80,80,${0.5 + 0.4 * Math.sin(s.t * 8)})`;
                ctx.lineWidth = 12;
                ctx.setLineDash([4, 6]);
                ctx.beginPath();
                const [x1, y1] = linkPoint(a, b, t, 0.3);
                const [x2, y2] = linkPoint(a, b, t, 0.7);
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
                ctx.restore();
            }
        });
        // ponts fendus : hachures rouges et compte à rebours de la réparation
        Object.entries(s.broken).forEach(([key, until]) => {
            if (until <= s.rt) return;
            const [a, b, t] = key.split('-');
            ctx.save();
            ctx.strokeStyle = 'rgba(255,80,80,0.75)';
            ctx.lineWidth = 12;
            ctx.setLineDash([4, 6]);
            ctx.beginPath();
            const [x1, y1] = linkPoint(a, b, t, 0.25);
            const [x2, y2] = linkPoint(a, b, t, 0.75);
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
            ctx.restore();
            const [mx, my] = linkPoint(a, b, t, 0.5);
            circle(ctx, mx, my, 11, '#ffffff');
            evIcon(ctx, 'crack', mx, my, 1);
            text(ctx, `${Math.ceil(until - s.rt)} s`, mx, my + 24, { size: 11, weight: 800, align: 'center', color: '#ffd0d0', shadow: true });
        });
        const seen = new Set();
        s.links.forEach((L) => {
            if (seen.has(L.key)) return;
            seen.add(L.key);
            drawLinkLine(ctx, L);
            const n = countOn(L.key);
            if (n > 1) {
                const [mx, my] = linkPoint(L.a, L.b, L.type, 0.5);
                roundRect(ctx, mx - 13, my - 9, 26, 18, 9);
                ctx.fillStyle = 'rgba(8,14,34,0.9)';
                ctx.fill();
                text(ctx, `×${n}`, mx, my + 4, { size: 11, weight: 800, align: 'center', color: '#ffd36e' });
            }
        });
        drawIceberg(ctx);
        drawModeHelp(ctx);
        drawDrag(ctx);
        drawQueues(ctx);
        s.links.forEach((L) => drawVehicle(ctx, L));
        if (activeEvent('fog')) {
            ctx.fillStyle = 'rgba(220,230,240,0.28)';
            ctx.fillRect(0, TOP, W, BOTTOM - TOP);
        }
        if (activeEvent('aurora')) {
            ctx.globalAlpha = 0.18 + 0.08 * Math.sin(s.t * 3);
            ctx.fillStyle = '#7be0a3';
            ctx.fillRect(0, TOP, W, 40);
            ctx.globalAlpha = 1;
            text(ctx, 'Aurore : livraisons ×2', W / 2, TOP + 26, { size: 13, weight: 800, align: 'center', color: '#d6ffe9', font: DISPLAY });
        }
        if (s.sleighArmed) {
            visible().forEach((k) => {
                const I = ISLES[k];
                if (!s.queues[k].length) return;
                ctx.strokeStyle = `rgba(255,211,110,${0.6 + 0.4 * Math.sin(s.t * 8)})`;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.ellipse(I.x, I.y, I.r * 1.15, I.r * 0.9, 0, 0, TAU);
                ctx.stroke();
            });
            text(ctx, 'Clique sur une île : le traîneau emporte jusqu’à 6 colis', W / 2, BOTTOM - 12, { size: 13, weight: 800, align: 'center', color: '#ffd36e', shadow: true });
        }
        // une île attend des colis qu'aucune liaison ne peut lui apporter : liseré rouge « À relier »
        if (s.phase === 'play' && s.tuto == null) {
            const need = new Set();
            // c'est l'île isolée qu'il faut relier : le départ s'il est coupé du centre de tri, sinon l'arrivée
            ISLE_KEYS.forEach((k) => s.queues[k].forEach((p) => {
                if (reachable(p.at, p.to)) return;
                need.add(p.at !== 'tri' && !reachable(p.at, 'tri') ? p.at : p.to);
            }));
            need.forEach((k) => {
                const I = ISLES[k];
                ctx.strokeStyle = `rgba(255,95,95,${0.55 + 0.35 * Math.sin(s.t * 6)})`;
                ctx.lineWidth = 3;
                ctx.setLineDash([6, 5]);
                ctx.beginPath();
                ctx.ellipse(I.x, I.y, I.r * 1.2, I.r * 0.95, 0, 0, TAU);
                ctx.stroke();
                ctx.setLineDash([]);
                const ly = I.y - I.r - 30 < TOP + 4 ? I.y + I.r * 0.8 + 6 : I.y - I.r - 30; // sous l'île si elle touche le bandeau
                roundRect(ctx, I.x - 30, ly, 60, 16, 8);
                ctx.fillStyle = 'rgba(160,30,40,0.92)';
                ctx.fill();
                text(ctx, 'À relier', I.x, ly + 12, { size: 10, weight: 800, align: 'center' });
            });
        }
        if (s.tuto != null) drawTuto(ctx);
        drawFx(ctx);
        for (const p of s.popups) {
            ctx.globalAlpha = 1 - p.t / 1.2;
            text(ctx, p.str, p.x, p.y - p.t * 24, { size: 12, weight: 800, align: 'center', color: p.color, shadow: true });
            ctx.globalAlpha = 1;
        }
        if (s.sursis > 0) {
            ctx.strokeStyle = `rgba(255,60,60,${0.6 + 0.3 * Math.sin(s.t * 10)})`;
            ctx.lineWidth = 8;
            ctx.strokeRect(4, TOP + 4, W - 8, BOTTOM - TOP - 8);
            roundRect(ctx, W / 2 - 120, TOP + 54, 240, 34, 12);
            ctx.fillStyle = 'rgba(160,30,40,0.95)';
            ctx.fill();
            text(ctx, `SURSIS : ${Math.ceil(s.sursis)} s`, W / 2, TOP + 77, { size: 16, weight: 800, align: 'center', font: DISPLAY });
        }
        const hud = drawHud(ctx);
        drawToast(ctx);
        return hud;
    }

    function drawTuto(ctx) {
        const done = s.tuto >= TUTO.length;
        const st = done ? null : TUTO[s.tuto];
        if (st && !s.drag) {
            // les deux îles à relier et une flèche fantôme animée
            const pairs = [st.isles, ...(st.alt ? [st.alt] : [])];
            pairs.forEach(([a, b]) => {
                [a, b].forEach((k) => {
                    const I = ISLES[k];
                    ctx.strokeStyle = `rgba(255,211,110,${0.6 + 0.4 * Math.sin(s.t * 6)})`;
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.ellipse(I.x, I.y, I.r * 1.2, I.r * 0.95, 0, 0, TAU);
                    ctx.stroke();
                });
                const A = ISLES[a];
                const B = ISLES[b];
                const k = (s.t * 0.7) % 1;
                ctx.save();
                ctx.strokeStyle = 'rgba(255,211,110,0.9)';
                ctx.lineWidth = 3;
                ctx.setLineDash([8, 7]);
                ctx.lineDashOffset = -s.t * 30;
                ctx.beginPath();
                ctx.moveTo(A.x, A.y);
                ctx.lineTo(B.x, B.y);
                ctx.stroke();
                ctx.restore();
                // la petite main qui glisse
                const hx = A.x + (B.x - A.x) * k;
                const hy = A.y + (B.y - A.y) * k;
                circle(ctx, hx, hy, 9, 'rgba(255,211,110,0.45)');
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.moveTo(hx, hy);
                ctx.lineTo(hx, hy + 16);
                ctx.lineTo(hx + 4, hy + 12);
                ctx.lineTo(hx + 8, hy + 20);
                ctx.lineTo(hx + 10.5, hy + 18.5);
                ctx.lineTo(hx + 7, hy + 11);
                ctx.lineTo(hx + 12, hy + 10);
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = '#1d2542';
                ctx.lineWidth = 1.2;
                ctx.stroke();
            });
        }
        const line = done ? 'Tout l’archipel est relié ! Les colis changent de véhicule aux escales, tout seuls.' : st.line;
        ctx.font = '700 13px "DM Sans", system-ui, sans-serif';
        const w = Math.min(W - 40, ctx.measureText(line).width + 120);
        const x = (W - w) / 2;
        const y = TOP + 8; // en haut : le bas de la carte reste visible
        roundRect(ctx, x, y, w, 44, 14);
        ctx.fillStyle = 'rgba(255,250,240,0.97)';
        ctx.fill();
        gull(ctx, x + 30, y + 26, 0.7, s.t * 6, 1);
        text(ctx, done ? 'Bravo !' : `Étape ${s.tuto + 1} / ${TUTO.length}`, x + 62, y + 17, { size: 10, weight: 800, color: '#a5121f', font: DISPLAY });
        text(ctx, line, x + 62, y + 34, { size: 13, weight: 700, color: '#1d2542' });
    }

    function overlayPanel(ctx, x, y, w, h) {
        ctx.fillStyle = 'rgba(6,12,30,0.66)';
        ctx.fillRect(0, 0, W, H);
        roundRect(ctx, x, y, w, h, 22);
        ctx.fillStyle = '#121a36';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.14)';
        ctx.lineWidth = 1;
        ctx.stroke();
    }
    function drawBrief(ctx) {
        ctx.drawImage(bgFor(0, false), 0, 0, W, H);
        overlayPanel(ctx, 150, 50, 500, 350);
        gull(ctx, 205, 112, 1.5, s.t * 5, 1);
        text(ctx, 'Chronoflocon', 262, 100, { size: 28, weight: 800, font: DISPLAY });
        text(ctx, 'Épisode 3 · le centre de tri du Pôle', 264, 124, { size: 13, weight: 700, color: '#ffd36e' });
        // comment ça marche, en 4 lignes illustrées
        const rules = [
            ['parcel', 'Chaque colis porte le symbole de l’île où il doit aller.'],
            ['rail', 'Glisse entre deux îles. Clique « Trains » en bas : leurs trajets s’allument.'],
            ['route', 'Les véhicules font la navette ; les colis changent de véhicule aux escales.'],
            ['mood', 'Des colis qui attendent trop font baisser l’humeur. Relie tout le monde !']
        ];
        rules.forEach(([ic, l], i) => {
            const y = 152 + i * 24;
            circle(ctx, 192, y - 4, 10, 'rgba(255,255,255,0.12)');
            if (ic === 'parcel') drawParcel(ctx, PS, 192, y - 4, 'poisson', false);
            else if (ic === 'rail') trainIcon(ctx, 194, y - 5, 0.38, 1);
            else if (ic === 'route') boatIcon(ctx, 192, y - 4, 0.42, 1, false);
            else text(ctx, '♥', 192, y + 1, { size: 13, weight: 800, align: 'center', color: '#7be0a3' });
            text(ctx, l, 210, y, { size: 12, weight: 600, color: 'rgba(255,255,255,0.92)' });
        });
        text(ctx, 'La météo du jour (la même pour tout le monde)', 182, 262, { size: 12, weight: 700, color: 'rgba(255,255,255,0.7)' });
        ROUNDS.forEach((R, i) => {
            const y = 284 + i * 22;
            text(ctx, R.name, 182, y + 4, { size: 13, weight: 800, font: DISPLAY });
            text(ctx, `${R.dur} s`, 240, y + 4, { size: 12, weight: 600, color: 'rgba(255,255,255,0.6)' });
            const ev = eventPlans[i];
            if (!ev.length) text(ctx, 'calme : on apprend', 290, y + 4, { size: 11, weight: 600, color: 'rgba(255,255,255,0.6)' });
            ev.forEach((e, j) => {
                const ex = 262 + j * 96;
                roundRect(ctx, ex, y - 10, 92, 20, 10);
                ctx.fillStyle = 'rgba(255,255,255,0.1)';
                ctx.fill();
                circle(ctx, ex + 11, y, 8, '#ffffff');
                evIcon(ctx, e.id, ex + 11, y, 0.8);
                const m = Math.floor(e.t / 60);
                const sec = String(Math.floor(e.t % 60)).padStart(2, '0');
                text(ctx, `${EVENTS[e.id].short} ${m}:${sec}`, ex + 22, y + 4, { size: 10, weight: 600 });
            });
        });
        const b = { id: 'go', label: 'C’est parti !', primary: true, x: 476, y: 352, w: 150, h: 38 };
        drawButton(ctx, b, s.hover === 'go');
        return [b];
    }
    function drawBilan(ctx) {
        drawPlay(ctx);
        overlayPanel(ctx, 110, 44, 580, 360);
        const st = s.lastStat;
        text(ctx, `Fin de la tournée du ${st.name}`, W / 2, 86, { size: 24, weight: 800, align: 'center', font: DISPLAY });
        text(ctx, `${st.delivered} colis livrés · humeur ${Math.round(st.humeur * 100)} % · express ${st.express} · +${st.pts.toLocaleString('fr-FR')} points`, W / 2, 112, { size: 13, weight: 600, align: 'center', color: 'rgba(255,255,255,0.8)' });
        text(ctx, `Choisis un renfort pour le ${ROUNDS[s.round + 1].name}`, W / 2, 148, { size: 15, weight: 800, align: 'center', color: '#ffd36e', font: DISPLAY });
        const btns = [];
        cardPlans[s.round].forEach((id, i) => {
            const c = CARDS[id];
            const x = 150 + i * 270;
            const b = { id: `card${i}`, x, y: 164, w: 230, h: 190 };
            btns.push(b);
            const hot = s.hover === b.id;
            roundRect(ctx, x, 164, 230, 190, 18);
            ctx.fillStyle = hot ? '#1d2a55' : '#151f40';
            ctx.fill();
            ctx.strokeStyle = hot ? '#ffd36e' : 'rgba(255,255,255,0.2)';
            ctx.lineWidth = hot ? 2.5 : 1;
            ctx.stroke();
            ctx.save();
            ctx.translate(x + 115, 224);
            if (id === 'boat') boatIcon(ctx, 0, 0, 2.2, 1, false);
            else if (id === 'train' || id === 'wagons') trainIcon(ctx, 14, 0, 2, 1);
            else if (id === 'plane') planeIcon(ctx, 0, 0, 2.2, 1);
            else {
                roundRect(ctx, -20, -22, 34, 40, 8);
                ctx.fillStyle = '#f4f7fb';
                ctx.fill();
                ctx.fillStyle = '#7a4a2a';
                ctx.fillRect(-16, -14, 26, 8);
                ctx.strokeStyle = '#f4f7fb';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(18, -2, 8, -Math.PI / 2, Math.PI / 2);
                ctx.stroke();
            }
            ctx.restore();
            text(ctx, c.title, x + 115, 286, { size: 17, weight: 800, align: 'center', font: DISPLAY });
            text(ctx, c.l1, x + 115, 312, { size: 12, weight: 500, align: 'center', color: 'rgba(255,255,255,0.8)' });
            text(ctx, c.l2, x + 115, 330, { size: 12, weight: 500, align: 'center', color: 'rgba(255,255,255,0.8)' });
        });
        const nxt = s.round === 0 ? 'Le Midi : deux îles de plus, un avion au dépôt et deux événements. Ton réseau est conservé.' : 'Le Soir : l’île Aurore, le rush et trois événements. Ton réseau est conservé.';
        text(ctx, nxt, W / 2, 384, { size: 12, weight: 600, align: 'center', color: 'rgba(255,255,255,0.65)' });
        return btns;
    }
    function drawTitle(ctx) {
        ctx.drawImage(bgFor(2, false), 0, 0, W, H);
        ctx.fillStyle = 'rgba(6,12,30,0.55)';
        ctx.fillRect(0, 0, W, H);
        gull(ctx, 130, 84, 1.6, s.t * 5, 1);
        text(ctx, 'CHRONOFLOCON', W / 2 + 20, 104, { size: 54, weight: 800, align: 'center', font: DISPLAY, shadow: true });
        text(ctx, 'La Grande Quête de Flocon · épisode 3', W / 2, 136, { size: 14, weight: 600, align: 'center', color: '#ffd36e' });
        const a = (s.t * 0.12) % 1;
        trainIcon(ctx, 300 + a * 200, 300, 1.4, 1);
        boatIcon(ctx, 600 - a * 160, 360, 1.4, -1, true);
        planeIcon(ctx, 120 + a * 560, 210 - Math.sin(a * Math.PI) * 30, 1.4, 1);
        const q = loadQuest();
        const btns = [
            { id: 'play', label: 'Jouer', primary: true, x: W / 2 - 160, y: 160, w: 150, h: 42 },
            { id: 'tranquil', label: 'Mode tranquille', x: W / 2 + 10, y: 160, w: 150, h: 42 }
        ];
        btns.forEach((b) => drawButton(ctx, b, s.hover === b.id));
        const dd = day.split('-').reverse().slice(0, 2).join('/');
        text(ctx, `Archipel du ${dd} : les mêmes colis et la même météo pour tout le monde aujourd’hui.`, W / 2, 226, { size: 13, weight: 600, align: 'center', color: 'rgba(255,255,255,0.85)' });
        if (q.done[ID]?.score) text(ctx, `Ton meilleur score de quête : ${q.done[ID].score.toLocaleString('fr-FR')}`, W / 2, 246, { size: 13, weight: 700, align: 'center', color: '#7be0a3' });
        return btns;
    }

    function render(ctx) {
        if (s.phase === 'title') {
            s.buttons = drawTitle(ctx);
            return;
        }
        if (s.phase === 'brief') {
            s.buttons = drawBrief(ctx);
            return;
        }
        if (s.phase === 'bilan') {
            s.buttons = drawBilan(ctx);
            return;
        }
        s.buttons = drawPlay(ctx);
        if (s.phase === 'fail') {
            ctx.fillStyle = 'rgba(6,12,30,0.7)';
            ctx.fillRect(0, 0, W, H);
            text(ctx, 'La tournée a déraillé !', W / 2, 150, { size: 38, weight: 800, font: DISPLAY, align: 'center' });
            text(ctx, 'Trop de colis en retard. On rejoue seulement cette tournée, avec ton réseau du début.', W / 2, 184, { size: 14, weight: 600, align: 'center', color: 'rgba(255,255,255,0.85)' });
            const bs = s.overBtns || [];
            const bw = 190;
            const total = bs.length * bw + (bs.length - 1) * 12;
            s.buttons = bs.map((b, i) => ({ ...b, x: W / 2 - total / 2 + i * (bw + 12), y: 220, w: bw, h: 42 }));
            s.buttons.forEach((b) => drawButton(ctx, b, s.hover === b.id));
        }
        if (s.phase === 'results' && s.results) s.buttons = drawResults(ctx, W, H, s.results, s.phaseT, s.hover);
    }

    // ---------------------------------------------------------------- commandes
    function press(id) {
        if (id === 'tranquil' && s.phase === 'fail') {
            s.snapshot.humeur = Math.max(s.snapshot.humeur, 0.5);
            retryRound();
            s.tranquil = true;
        } else if (id === 'play' || id === 'tranquil') {
            newGame(id === 'tranquil');
            s.phase = 'brief';
            s.phaseT = 0;
        } else if (id === 'go') startRound(0);
        else if (id === 'retry') retryRound();
        else if (id === 'skip') {
            markSkipped(ID);
            if (props.onExit) props.onExit();
            else s.phase = 'title';
        } else if (id === 'replay') {
            s.phase = 'title';
            s.phaseT = 0;
        } else if (id === 'exit') {
            if (props.onExit) props.onExit();
            else s.phase = 'title';
        } else if (id === 'sleigh' && s.phase === 'play' && s.sleighs > 0) s.sleighArmed = !s.sleighArmed;
        else if (id.startsWith('mode:') && s.phase === 'play') {
            const t = id.slice(5);
            s.mode = s.mode === t ? null : t;
            if (s.mode && !s.depot[t]) say(`Aucun ${MODE[t].one} libre : clique sur une liaison pour en récupérer un.`, 3);
        }
        else if (id.startsWith('card')) pickCard(Number(id.slice(4)));
    }
    function isleAt(x, y, pad = 6) {
        return visible().find((k) => {
            const I = ISLES[k];
            return ((x - I.x) / (I.r + pad)) ** 2 + ((y - I.y) / (I.r * 0.8 + pad)) ** 2 < 1;
        }) || null;
    }
    function linkAt(x, y) {
        let best = null;
        let bd = 11;
        s.links.forEach((L) => {
            const d = distToLink(L.a, L.b, L.type, x, y);
            if (d < bd) {
                bd = d;
                best = L;
            }
        });
        return best;
    }

    const game = {
        update,
        render,
        canPause: () => s.phase === 'play',
        blur() {
            s.drag = null;
        },
        keyDown(code, repeat) {
            if (repeat) return;
            if ((code === 'Enter' || code === 'Space') && ['title', 'brief', 'results', 'fail'].includes(s.phase)) {
                const primary = (s.buttons || []).find((b) => b.primary);
                if (primary && (s.phase !== 'results' || s.phaseT > 1)) press(primary.id);
                return;
            }
            if (s.phase === 'play' && code === 'KeyT') press('sleigh');
            if (s.phase === 'play' && code === 'Digit1') press('mode:rail');
            if (s.phase === 'play' && code === 'Digit2') press('mode:boat');
            if (s.phase === 'play' && code === 'Digit3') press('mode:air');
            if (s.phase === 'play' && code === 'Escape') {
                s.sleighArmed = false;
                s.drag = null;
                s.pick = null;
                s.mode = null;
            }
        },
        keyUp() {},
        pointerDown(x, y) {
            const b = hitButton(s.buttons, x, y);
            if (b) {
                if (s.phase !== 'results' || s.phaseT > 0.8) press(b.id);
                return;
            }
            if (s.phase !== 'play') return;
            const broke = s.links.find((L) => {
                if (!(L.broken > 0)) return false;
                const [vx, vy] = vehiclePos(L);
                return Math.hypot(vx - x, vy - 8 - y) < 30;
            });
            if (broke) {
                broke.broken = 0;
                const [vx, vy] = vehiclePos(broke);
                popup(vx, vy - 30, 'Réparé !', '#7be0a3');
                return;
            }
            if (s.iceberg) {
                const [a, b, t] = s.iceberg.key.split('-');
                const [mx, my] = linkPoint(a, b, t, 0.5);
                if (Math.hypot(mx - x, my - y) < 32) {
                    s.iceberg.hits++;
                    s.fx.push({ kind: 'open', x: mx, y: my, t: 0 });
                    if (s.iceberg.hits >= 3) {
                        s.iceberg = null;
                        s.dirty = true;
                        popup(mx, my - 20, 'Chenal dégagé !', '#7be0a3');
                    }
                    return;
                }
            }
            const k = isleAt(x, y);
            if (s.sleighArmed) {
                if (k && s.queues[k].length) useSleigh(k);
                else s.sleighArmed = false;
                return;
            }
            if (k && s.pick && k !== s.pick) {
                const t = bestType(s.pick, k);
                if (t) openLink(s.pick, k, t);
                else refuse(s.pick, k);
                s.pick = null;
                return;
            }
            if (k) {
                s.drag = { from: k, x, y, x0: x, y0: y, target: null, type: null };
                return;
            }
            if (s.pick) {
                s.pick = null;
                return;
            }
            const hit = linkAt(x, y);
            if (hit) {
                const group = s.links.filter((x2) => x2.key === hit.key);
                const L = group.find((x2) => !x2.moving && !x2.load.length) || group.find((x2) => !x2.moving) || group[group.length - 1];
                closeLink(L);
                say(`Liaison fermée : le ${VEHICLES[L.type].one} revient au dépôt.`, 2.4);
            }
        },
        pointerMove(x, y) {
            if (s.drag) {
                s.drag.x = x;
                s.drag.y = y;
                const k = isleAt(x, y, 10);
                const type = k && k !== s.drag.from ? bestType(s.drag.from, k) : null;
                s.drag.target = type ? k : null;
                s.drag.type = type;
                return;
            }
            const b = hitButton(s.buttons, x, y);
            if (b) {
                s.hover = b.id;
                return;
            }
            if (s.phase === 'play' && !coarse) {
                const L = isleAt(x, y) ? null : linkAt(x, y);
                s.hover = L ? L.key : null;
            } else s.hover = null;
        },
        pointerUp() {
            if (!s.drag) return;
            const d = s.drag;
            s.drag = null;
            const end = isleAt(d.x, d.y, 10);
            if (d.target && d.type) {
                openLink(d.from, d.target, d.type);
            } else if (end && end !== d.from) {
                refuse(d.from, end);
            } else if (Math.hypot(d.x - d.x0, d.y - d.y0) < 12) {
                // simple clic sur une île : elle devient le départ, on clique ensuite l'arrivée
                s.pick = s.pick === d.from ? null : d.from;
            }
        }
    };

    if (__TEST_MODE__) {
        window.chrono = {
            s,
            spawnPlans,
            eventPlans,
            cardPlans,
            start: (tranquil = false) => {
                newGame(tranquil);
                startRound(0);
            },
            open: openLink,
            close: (key) => {
                const L = s.links.find((x) => x.key === key);
                if (L) closeLink(L);
            },
            card: pickCard,
            sleigh: useSleigh,
            round: (r) => {
                newGame(false);
                for (let i = 0; i <= r; i++) Object.entries(ROUNDS[i].gift).forEach(([k, v]) => (s.depot[k] += i < r ? v : 0));
                startRound(r);
            },
            finish,
            game
        };
    }
    return game;
}

export default function ChronoGame({ onScore, now, onExit }) {
    // Date figée à l'ouverture : l'horloge du site avance chaque minute, la partie ne doit pas redémarrer
    const [start] = useState(() => now || new Date());
    const exitRef = useRef(onExit);
    exitRef.current = onExit;
    const create = useCallback((api) => createChrono(api, { now: start, onExit: () => exitRef.current && exitRef.current() }), [start]);
    return <GameCanvas pausable fixedStep create={create} onScore={onScore} label="Chronoflocon" />;
}
