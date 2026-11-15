import { useCallback, useRef, useState } from 'react';
import GameCanvas from '../GameCanvas';
import { DISPLAY, circle, drawPenguin, roundRect, text, TAU } from '../draw';
import { getBest } from '../scores';
import { dailyRng, scoreCode } from '../../december/seed';
import { drawButton, drawResults, gradeFor, hitButton } from '../../december/results';
import { firstTryOfDay, loadQuest, markFail, markSkipped, markWon, passCode, SKIP_AFTER_FAILS } from '../../december/quest';
import { H, MAPS, MONSTERS, TOWERS, TOWER_ORDER, W, WAVES, makeSlots, measure, pointAt } from './maps';
import { GIFT_COLORS, drawGift, drawSprite, makeBackground, makeHalo, makeMonsterSprites, makeTowerSprites, makeTreeSprite } from './art';

/* global __TEST_MODE__ */

// Épisode 2 de la quête : « Opération Réveillon », défense du grand sapin (tower defense), environ 4 à 5 minutes.
// - Une carte par jour (graine), 8 vagues dont le Gros Bonhomme qui se coupe en trois à mi-vie.
// - 10 cadeaux au pied du sapin : chaque monstre qui arrive en vole un (le boss trois). Plus de cadeaux : perdu.
// - 4 tours sur des emplacements fixes, 2 améliorations chacune, revente à 60 %.
// - Les vagues s'enchaînent : 14 s après la fin d'une vague, la suivante part. « Vague suivante » la lance tout de suite
//   (bonus de 20 points et 1 poisson par seconde d'avance).
// - Événements du jour : une vague de nuit (seul le phare révèle les cadeaux mimiques), blizzard (portée −20 %) ou monstres pressés.
// Score : 500 par cadeau sauvé + points des monstres + 20 par seconde d'avance + poissons restants.

const ID = 'reveillon';
const GIFTS = 10;
const GAP = 14; // secondes entre deux vagues
const START_FISH = 200;
const HUD_H = 44;
const HP_SCALE = 1.45; // réglage global de la difficulté (points de vie des monstres)

const MAIRE_LINES = {
    intro: 'Flocon, te voilà enfin ! Les monstres de Noël veulent renverser notre grand sapin. Prends le commandement de la défense.',
    tuto: 'Clique sur un emplacement (+) pour construire une tour. Les poissons servent à payer.',
    night: 'La nuit tombe : les cadeaux mimiques sont invisibles. Seul le phare peut les révéler !',
    blizzard: 'Blizzard ! Les tours voient moins loin pendant cette vague.',
    rush: 'Ils sont pressés ! Les monstres de cette vague courent plus vite.',
    bats: 'Des chauves-souris ! Le canon à neige ne peut pas les toucher.',
    givre: 'Les boules de givre sont costaudes et se laissent à peine ralentir.',
    boss: 'Le Gros Bonhomme ! Quand il faiblit, il se coupe en trois. Tenez bon !'
};

function createReveillon(api, props) {
    const now = props.now || new Date();
    const { day, rng } = dailyRng(ID, now);
    const map = MAPS[rng.int(0, MAPS.length - 1)];
    const PM = measure(map.path);
    const slots = makeSlots(map);
    const bg = makeBackground(map);
    const halo = makeHalo();
    const MS = makeMonsterSprites();
    const TS = makeTowerSprites();
    const treeSpr = makeTreeSprite();
    const dark = document.createElement('canvas');
    dark.width = W / 2;
    dark.height = H / 2;
    const dctx = dark.getContext('2d');

    // Les événements du jour : une vague de nuit (5 ou 6), et blizzard / monstres pressés sur deux autres vagues
    const nightWave = rng.pick([4, 5]);
    const events = {};
    events[nightWave] = 'night';
    events[rng.pick([2, 3])] = rng.pick(['blizzard', 'rush']);
    events[6] = Object.values(events).includes('blizzard') ? 'rush' : 'blizzard';
    // ordre d'arrivée de chaque vague : les groupes sont un peu mélangés par la graine
    const plans = WAVES.map((wv, wi) => {
        const list = [];
        const groups = wi === nightWave ? [...wv.groups, ['mimique', 8, 1.2, 1.5]] : wv.groups;
        groups.forEach(([type, n, every, at]) => {
            const jit = rng.range(-0.6, 0.6);
            for (let i = 0; i < n; i++) list.push({ type, t: Math.max(0, at + jit + i * every * rng.range(0.85, 1.15)) });
        });
        return list.sort((a, b) => a.t - b.t);
    });
    const bossSplitSide = rng.pick([-1, 1]);
    const coarse = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(pointer: coarse)').matches;

    const s = {
        phase: 'title',
        phaseT: 0,
        t: 0,
        hover: null,
        buttons: [],
        speed: 1
    };

    function newGame(tranquil) {
        Object.assign(s, {
            tranquil,
            fish: START_FISH,
            gifts: GIFTS,
            wave: -1, // indice de la vague en cours (−1 : préparation)
            spawning: false,
            spawnT: 0,
            spawnIdx: 0,
            countdown: 0, // avant la vague suivante (0 : en attente du joueur pour la première)
            towers: [],
            mobs: [],
            shots: [],
            fx: [],
            popups: [],
            sel: null, // { kind: 'slot' | 'tower', i }
            kills: 0,
            killPts: 0,
            earlySec: 0,
            earlyCalls: 0,
            built: 0,
            toast: null,
            banner: null,
            seenBats: false,
            seenGivre: false,
            snapshot: null,
            retries: 0,
            results: null
        });
    }
    newGame(false);

    // ---------------------------------------------------------------- outils
    const say = (key, dur = 4.2) => {
        s.toast = { text: MAIRE_LINES[key] || key, t: 0, dur };
    };
    const popup = (x, y, str, color = '#ffd36e') => s.popups.push({ x, y, str, color, t: 0 });
    const towerAt = (i) => s.towers.find((tw) => tw.slot === i) || null;
    const rangeOf = (tw) => TOWERS[tw.type].range[tw.lv] * (events[s.wave] === 'blizzard' && s.spawningOrAlive ? 0.8 : 1);
    // la nuit dure de la vague de nuit jusqu'au départ de ses derniers monstres
    const isNight = () => s.wave === nightWave ? true : s.wave > nightWave && s.mobs.some((m) => m.night);
    const visible = (m) => {
        if (m.type !== 'mimique' || !m.night) return true;
        return s.towers.some((tw) => tw.type === 'phare' && Math.hypot(tw.x - m.x, tw.y - m.y) < TOWERS.phare.range[tw.lv]);
    };

    function spawn(type, d = 0, extra = {}) {
        const def = MONSTERS[type];
        const hpMul = (1 + 0.12 * Math.max(0, s.wave)) * HP_SCALE;
        const hp = Math.round(def.hp * (type === 'boss' || type === 'petit' ? HP_SCALE : hpMul));
        const p = pointAt(PM, d);
        s.mobs.push({ type, def, d, x: p.x, y: p.y, dir: p.dx || 1, hp, max: hp, slowT: 0, slowK: 1, stunT: 0, flash: 0, anim: Math.random() * 6, split: false, night: s.wave === nightWave, ...extra });
    }

    function startWave(early) {
        if (s.wave >= WAVES.length - 1) return;
        if (early && s.countdown > 0) {
            const sec = Math.ceil(s.countdown);
            s.earlySec += sec;
            s.earlyCalls++;
            s.fish += sec;
            popup(W - 120, 60, `+${sec} s d’avance`, '#7be0a3');
        }
        s.wave++;
        s.spawning = true;
        s.spawnT = 0;
        s.spawnIdx = 0;
        s.countdown = 0;
        s.snapshot = {
            fish: s.fish,
            gifts: s.gifts,
            towers: s.towers.map((tw) => ({ ...tw, cd: 0 })),
            kills: s.kills,
            killPts: s.killPts,
            earlySec: s.earlySec,
            earlyCalls: s.earlyCalls,
            wave: s.wave
        };
        const ev = events[s.wave];
        const label = s.wave === WAVES.length - 1 ? 'Le Gros Bonhomme arrive !' : ev === 'night' ? 'La nuit tombe : gare aux mimiques' : ev === 'blizzard' ? 'Blizzard : portée réduite' : ev === 'rush' ? 'Monstres pressés' : null;
        s.banner = { title: `Vague ${s.wave + 1}`, sub: label, t: 0 };
        if (s.wave === WAVES.length - 1) say('boss');
        else if (ev === 'night') say('night');
        else if (ev === 'blizzard') say('blizzard');
        else if (ev === 'rush') say('rush');
        else if (!s.seenBats && plans[s.wave].some((p) => p.type === 'chauve')) {
            s.seenBats = true;
            say('bats');
        } else if (!s.seenGivre && plans[s.wave].some((p) => p.type === 'givre')) {
            s.seenGivre = true;
            say('givre');
        }
    }

    function retryWave() {
        const sn = s.snapshot;
        Object.assign(s, {
            fish: sn.fish,
            gifts: sn.gifts,
            towers: sn.towers.map((tw) => ({ ...tw })),
            kills: sn.kills,
            killPts: sn.killPts,
            earlySec: sn.earlySec,
            earlyCalls: sn.earlyCalls,
            wave: sn.wave - 1,
            mobs: [],
            shots: [],
            fx: [],
            sel: null,
            spawning: false,
            retries: s.retries + 1
        });
        s.phase = 'play';
        startWave(false);
    }

    function kill(m) {
        m.dead = true;
        s.kills++;
        s.killPts += m.def.pts;
        if (m.def.fish) {
            s.fish += m.def.fish;
            popup(m.x, m.y - 30, `+${m.def.fish}`);
        }
        s.fx.push({ kind: 'poof', x: m.x, y: m.y - 12, t: 0, r: m.def.r });
    }

    function damage(m, dmg) {
        if (m.dead) return;
        m.hp -= dmg;
        m.flash = 0.12;
        if (m.type === 'boss' && !m.split && m.hp <= m.max / 2) {
            // à mi-vie, le Gros Bonhomme se coupe en trois petits bonshommes qui foncent
            m.split = true;
            m.dead = true;
            s.killPts += m.def.pts;
            s.kills++;
            s.fx.push({ kind: 'burst', x: m.x, y: m.y - 50, t: 0 });
            [-34, 0, 34].forEach((off, i) => spawn('petit', Math.max(0, m.d + off * bossSplitSide), { stunT: 0.5 + i * 0.15 }));
            say('Il s’est coupé en trois ! Visez les petits bonshommes !', 3);
            return;
        }
        if (m.hp <= 0) kill(m);
    }

    function steal(m) {
        m.dead = true;
        const n = m.def.steal || 1;
        if (s.tranquil) s.gifts = Math.max(1, s.gifts - n);
        else s.gifts = Math.max(0, s.gifts - n);
        s.fx.push({ kind: 'steal', x: map.tree[0], y: map.tree[1] - 30, t: 0 });
        popup(map.tree[0], map.tree[1] - 60, `−${n} cadeau${n > 1 ? 'x' : ''}`, '#ff6b6b');
        if (s.gifts <= 0) gameOver();
    }

    function gameOver() {
        s.phase = 'gameover';
        s.phaseT = 0;
        s.sel = null;
        const fails = markFail(ID);
        const btns = [{ id: 'retrywave', label: `Reprendre la vague ${s.wave + 1}`, primary: true }, { id: 'restart', label: 'Recommencer' }, { id: 'tranquil', label: 'Mode tranquille' }];
        if (fails >= SKIP_AFTER_FAILS) btns.push({ id: 'skip', label: 'Passer l’épisode' });
        s.overBtns = btns;
    }

    function finish() {
        const giftPts = s.tranquil ? 0 : s.gifts * 500;
        const earlyPts = s.earlySec * 20;
        const fishPts = s.fish;
        const score = s.tranquil ? 0 : giftPts + s.killPts + earlyPts + fishPts;
        const best = getBest(ID);
        let isRecord = false;
        let official = null;
        if (!s.tranquil) {
            isRecord = api.reportScore(score) || false;
            official = firstTryOfDay(ID, day, score);
        }
        markWon(ID, score);
        const stars = 1 + (s.gifts >= 7 ? 1 : 0) + (s.gifts === GIFTS ? 1 : 0);
        s.results = {
            title: 'Le sapin tient bon !',
            subtitle: s.tranquil ? 'Mode tranquille : épisode validé, sans record' : `${map.name} · défense du ${day.split('-').reverse().slice(0, 2).join('/')}${s.retries ? ` · ${s.retries} reprise${s.retries > 1 ? 's' : ''}` : ''}`,
            score,
            stars: s.tranquil ? null : stars,
            grade: s.tranquil ? null : gradeFor(score, { S: 7000, A: 5600, B: 4000 }),
            rows: [
                ['Cadeaux sauvés', `${s.gifts} / ${GIFTS}  ·  ${giftPts}`],
                ['Monstres', `${s.kills}  ·  ${s.killPts}`],
                ['Vagues en avance', `${s.earlyCalls} (${s.earlySec} s)  ·  +${earlyPts}`],
                ['Poissons restants', `${s.fish}  ·  +${fishPts}`]
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

    // ---------------------------------------------------------------- tours
    function build(slotIdx, type) {
        const def = TOWERS[type];
        if (s.fish < def.cost || towerAt(slotIdx)) return;
        s.fish -= def.cost;
        const sl = slots[slotIdx];
        s.towers.push({ slot: slotIdx, type, lv: 0, x: sl.x, y: sl.y, cd: 0.2, spent: def.cost, aim: 0, fire: 0 });
        s.built++;
        s.sel = { kind: 'tower', i: slotIdx };
        s.fx.push({ kind: 'build', x: sl.x, y: sl.y, t: 0 });
        if (s.toast && s.toast.text === MAIRE_LINES.tuto) s.toast.t = Math.max(s.toast.t, s.toast.dur - 0.4);
    }
    function upgrade(tw) {
        if (tw.lv >= 2) return;
        const c = TOWERS[tw.type].up[tw.lv];
        if (s.fish < c) return;
        s.fish -= c;
        tw.spent += c;
        tw.lv++;
        s.fx.push({ kind: 'build', x: tw.x, y: tw.y, t: 0 });
    }
    function sell(tw) {
        const back = Math.floor(tw.spent * 0.6);
        s.fish += back;
        popup(tw.x, tw.y - 40, `+${back}`);
        s.towers = s.towers.filter((x) => x !== tw);
        s.sel = null;
    }

    function inRange(tw, m) {
        return Math.hypot(tw.x - m.x, tw.y - 8 - (m.y - 10)) <= rangeOf(tw);
    }
    function pickTarget(tw, canAir) {
        let best = null;
        for (const m of s.mobs) {
            if (m.dead || (m.def.flying && !canAir) || !visible(m) || !inRange(tw, m)) continue;
            if (!best || m.d > best.d) best = m; // le plus avancé sur le chemin
        }
        return best;
    }

    function updateTower(tw, dt) {
        const def = TOWERS[tw.type];
        tw.cd -= dt;
        tw.fire = Math.max(0, tw.fire - dt);
        if (tw.cd > 0) return;
        if (tw.type === 'lanceur') {
            const m = pickTarget(tw, true);
            if (!m) return;
            tw.cd = 1 / def.rate[tw.lv];
            tw.aim = m.x < tw.x ? -1 : 1;
            tw.fire = 0.15;
            const n = tw.lv === 2 ? 2 : 1;
            for (let i = 0; i < n; i++) s.shots.push({ x: tw.x + (i ? 6 : -4), y: tw.y - 30, tgt: m, dmg: def.dmg[tw.lv], spd: 430 - i * 40 });
        } else if (tw.type === 'canon') {
            const hits = s.mobs.filter((m) => !m.dead && !m.def.flying && visible(m) && inRange(tw, m));
            if (!hits.length) return;
            tw.cd = 1 / def.rate[tw.lv];
            tw.fire = 0.25;
            s.fx.push({ kind: 'puff', x: tw.x, y: tw.y - 10, t: 0, r: rangeOf(tw) });
            hits.forEach((m) => {
                const k = 1 - (1 - def.slow[tw.lv]) * (1 - (m.def.slowResist || 0));
                m.slowK = Math.min(m.slowT > 0 ? m.slowK : 1, k);
                m.slowT = 1.6;
                damage(m, def.dmg[tw.lv]);
            });
        } else if (tw.type === 'phare') {
            const hits = s.mobs.filter((m) => !m.dead && inRange(tw, m) && visible(m));
            if (!hits.length) return;
            tw.cd = 1 / def.rate[tw.lv];
            tw.fire = 0.5;
            s.fx.push({ kind: 'flash', x: tw.x, y: tw.y - 44, t: 0, r: rangeOf(tw) });
            hits.forEach((m) => {
                if (m.type !== 'boss') m.stunT = Math.max(m.stunT, def.stun[tw.lv]);
                else m.slowT = Math.max(m.slowT, 0.6);
                damage(m, def.dmg[tw.lv]);
            });
        } else if (tw.type === 'guirlande') {
            const first = pickTarget(tw, true);
            if (!first) return;
            tw.cd = 1 / def.rate[tw.lv];
            tw.fire = 0.2;
            const chain = [first];
            let cur = first;
            for (let i = 0; i < def.chain[tw.lv]; i++) {
                let nxt = null;
                let bd = 74;
                for (const m of s.mobs) {
                    if (m.dead || chain.includes(m) || !visible(m)) continue;
                    const dd = Math.hypot(m.x - cur.x, m.y - cur.y);
                    if (dd < bd) {
                        bd = dd;
                        nxt = m;
                    }
                }
                if (!nxt) break;
                chain.push(nxt);
                cur = nxt;
            }
            const pts = [[tw.x, tw.y - 38]];
            chain.forEach((m, i) => {
                pts.push([m.x, m.y - 14]);
                damage(m, def.dmg[tw.lv] * Math.pow(0.78, i));
            });
            s.fx.push({ kind: 'bolt', pts, t: 0, seed: Math.random() * 1000 });
        }
    }

    // ---------------------------------------------------------------- simulation
    function step(dt) {
        if (s.wave >= 0 && s.spawning) {
            s.spawnT += dt;
            const plan = plans[s.wave];
            while (s.spawnIdx < plan.length && plan[s.spawnIdx].t <= s.spawnT) {
                spawn(plan[s.spawnIdx].type, 0);
                s.spawnIdx++;
            }
            if (s.spawnIdx >= plan.length) {
                s.spawning = false;
                if (s.wave < WAVES.length - 1) {
                    s.countdown = GAP;
                    s.fish += 25 + 5 * s.wave;
                    popup(140, 60, `+${25 + 5 * s.wave} poissons`, '#ffd36e');
                }
            }
        } else if (s.countdown > 0) {
            s.countdown -= dt;
            if (s.countdown <= 0) startWave(false);
        }
        s.spawningOrAlive = s.spawning || s.mobs.length > 0;

        const rush = events[s.wave] === 'rush' ? 1.25 : 1;
        for (const m of s.mobs) {
            if (m.dead) continue;
            m.anim += dt * (m.def.flying ? 12 : 7);
            m.flash = Math.max(0, m.flash - dt);
            if (m.stunT > 0) {
                m.stunT -= dt;
                continue;
            }
            if (m.slowT > 0) m.slowT -= dt;
            else m.slowK = 1;
            m.d += m.def.speed * rush * (m.slowT > 0 ? m.slowK : 1) * dt;
            const p = pointAt(PM, m.d);
            if (p.dx) m.dir = p.dx;
            m.x = p.x;
            m.y = p.y + (m.def.flying ? -10 + Math.sin(m.anim * 0.5) * 3 : 0);
            if (m.d >= PM.total) steal(m);
        }
        if (s.phase !== 'play') return;
        s.towers.forEach((tw) => updateTower(tw, dt));
        for (const sh of s.shots) {
            const tg = sh.tgt;
            const tx = tg.x;
            const ty = tg.y - 14;
            const dx = tx - sh.x;
            const dy = ty - sh.y;
            const dd = Math.hypot(dx, dy);
            if (tg.dead && dd < 8) sh.done = true;
            if (dd < 8) {
                if (!tg.dead) damage(tg, sh.dmg);
                sh.done = true;
                s.fx.push({ kind: 'hit', x: tx, y: ty, t: 0 });
            } else {
                sh.x += (dx / dd) * sh.spd * dt;
                sh.y += (dy / dd) * sh.spd * dt;
            }
        }
        s.shots = s.shots.filter((sh) => !sh.done);
        s.mobs = s.mobs.filter((m) => !m.dead);
        s.fx.forEach((f) => (f.t += dt));
        s.fx = s.fx.filter((f) => f.t < 0.9);
        s.popups.forEach((p) => (p.t += dt));
        s.popups = s.popups.filter((p) => p.t < 1.2);
        // victoire : la dernière vague est sortie et il n'y a plus personne sur le chemin
        if (s.wave === WAVES.length - 1 && !s.spawning && s.mobs.length === 0) {
            s.phase = 'won';
            s.phaseT = 0;
        }
    }

    function update(dt) {
        s.t += dt;
        s.phaseT += dt;
        if (s.toast) {
            s.toast.t += dt;
            if (s.toast.t > s.toast.dur) s.toast = null;
        }
        if (s.banner) {
            s.banner.t += dt;
            if (s.banner.t > 2.4) s.banner = null;
        }
        if (s.phase === 'play') {
            const n = s.speed;
            for (let i = 0; i < n; i++) step(dt);
        } else if (s.phase === 'won') {
            s.fx.forEach((f) => (f.t += dt));
            s.popups.forEach((p) => (p.t += dt));
            if (s.phaseT > 2.2) finish();
        }
    }

    // ---------------------------------------------------------------- dessin
    function drawTree(ctx) {
        const [tx, ty] = map.tree;
        // les cadeaux au pied du sapin
        const order = [[-30, 6], [30, 6], [-18, 12], [18, 12], [0, 14], [-40, -2], [40, -2], [-8, 4], [10, 2], [-26, -6]];
        drawSprite(ctx, treeSpr, tx, ty);
        for (let i = 0; i < s.gifts && i < order.length; i++) {
            const [gx, gy] = order[i];
            const [c, r] = GIFT_COLORS[i % GIFT_COLORS.length];
            drawGift(ctx, tx + gx, ty + gy, 1.2, c, r);
        }
    }

    function drawMob(ctx, m) {
        if (!visible(m)) {
            // une mimique dans le noir : juste un petit scintillement
            if (Math.sin(s.t * 9 + m.anim) > 0.92) circle(ctx, m.x, m.y - 12, 1.6, 'rgba(255,255,255,0.7)');
            return;
        }
        const frames = MS[m.type];
        const spr = frames[Math.floor(m.anim) % 2];
        drawSprite(ctx, spr, m.x, m.y, m.dir < 0 ? -1 : 1);
        if (m.flash > 0) {
            ctx.globalAlpha = 0.5;
            circle(ctx, m.x, m.y - m.def.r - 4, m.def.r + 4, '#ffffff');
            ctx.globalAlpha = 1;
        }
        if (m.slowT > 0) circle(ctx, m.x, m.y - 2, m.def.r * 0.9, 'rgba(160,210,255,0.35)');
        if (m.stunT > 0) {
            for (let i = 0; i < 3; i++) {
                const a = s.t * 6 + (i * TAU) / 3;
                circle(ctx, m.x + Math.cos(a) * 10, m.y - m.def.r * 2.6 - 4 + Math.sin(a) * 3, 2.2, '#ffd36e');
            }
        }
        if (m.hp < m.max) {
            const wdt = m.type === 'boss' ? 0 : 22;
            if (wdt) {
                ctx.fillStyle = 'rgba(20,30,60,0.6)';
                ctx.fillRect(m.x - wdt / 2, m.y - m.def.r * 2.6 - 12, wdt, 4);
                ctx.fillStyle = m.hp / m.max > 0.4 ? '#7be0a3' : '#ff6b6b';
                ctx.fillRect(m.x - wdt / 2, m.y - m.def.r * 2.6 - 12, wdt * Math.max(0, m.hp / m.max), 4);
            }
        }
    }

    function drawFx(ctx) {
        for (const f of s.fx) {
            const k = f.t / 0.9;
            if (f.kind === 'puff') {
                ctx.globalAlpha = 0.35 * (1 - k);
                circle(ctx, f.x, f.y, f.r * Math.min(1, f.t * 4), '#cfe8ff');
                ctx.globalAlpha = 1;
            } else if (f.kind === 'flash') {
                ctx.globalAlpha = 0.3 * (1 - k);
                circle(ctx, f.x, f.y + 34, f.r * Math.min(1, f.t * 5), '#fff3c4');
                ctx.globalAlpha = 1;
            } else if (f.kind === 'bolt') {
                if (f.t > 0.25) continue;
                ctx.strokeStyle = '#fff6a8';
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                let sd = f.seed;
                const rr = () => ((sd = (sd * 9301 + 49297) % 233280) / 233280 - 0.5);
                f.pts.forEach(([x, y], i) => {
                    if (!i) ctx.moveTo(x, y);
                    else {
                        const [px, py] = f.pts[i - 1];
                        ctx.lineTo((px + x) / 2 + rr() * 16, (py + y) / 2 + rr() * 16);
                        ctx.lineTo(x, y);
                    }
                });
                ctx.stroke();
            } else if (f.kind === 'hit') {
                ctx.globalAlpha = 1 - k;
                for (let i = 0; i < 5; i++) circle(ctx, f.x + Math.cos(i * 1.3) * f.t * 30, f.y + Math.sin(i * 1.3) * f.t * 30, 2, '#ffffff');
                ctx.globalAlpha = 1;
            } else if (f.kind === 'poof' || f.kind === 'burst') {
                ctx.globalAlpha = 1 - k;
                const n = f.kind === 'burst' ? 14 : 7;
                for (let i = 0; i < n; i++) {
                    const a = (i / n) * TAU;
                    circle(ctx, f.x + Math.cos(a) * f.t * (f.kind === 'burst' ? 120 : 50), f.y + Math.sin(a) * f.t * 40, f.kind === 'burst' ? 6 : 3.5, '#f4f9ff');
                }
                ctx.globalAlpha = 1;
            } else if (f.kind === 'build') {
                ctx.globalAlpha = 1 - k;
                ctx.strokeStyle = '#ffd36e';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(f.x, f.y - 10, 14 + f.t * 40, 0, TAU);
                ctx.stroke();
                ctx.globalAlpha = 1;
            } else if (f.kind === 'steal') {
                ctx.globalAlpha = 1 - k;
                ctx.fillStyle = 'rgba(255,90,90,0.4)';
                ctx.fillRect(0, 0, W, H);
                ctx.globalAlpha = 1;
            }
        }
    }

    function drawNight(ctx) {
        dctx.globalCompositeOperation = 'source-over';
        dctx.clearRect(0, 0, W / 2, H / 2);
        dctx.fillStyle = 'rgba(8,14,40,0.78)';
        dctx.fillRect(0, 0, W / 2, H / 2);
        dctx.globalCompositeOperation = 'destination-out';
        s.towers.forEach((tw) => {
            const r = tw.type === 'phare' ? TOWERS.phare.range[tw.lv] : 30;
            dctx.drawImage(halo, (tw.x - r) / 2, (tw.y - 10 - r) / 2, r, r);
        });
        dctx.drawImage(halo, (map.tree[0] - 80) / 2, (map.tree[1] - 70 - 80) / 2, 80, 80);
        ctx.drawImage(dark, 0, 0, W, H);
    }

    function drawSlots(ctx) {
        slots.forEach((sl, i) => {
            if (towerAt(i)) return;
            const sel = s.sel && s.sel.kind === 'slot' && s.sel.i === i;
            const hov = s.hover === `slot${i}`;
            ctx.strokeStyle = sel ? '#ffd36e' : hov ? 'rgba(60,90,150,0.9)' : 'rgba(80,110,170,0.55)';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.arc(sl.x, sl.y - 6, 15, 0, TAU);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = sel ? 'rgba(255,211,110,0.35)' : 'rgba(255,255,255,0.4)';
            ctx.fill();
            text(ctx, '+', sl.x, sl.y, { size: 18, weight: 800, align: 'center', color: sel ? '#c98a12' : 'rgba(80,110,170,0.8)' });
        });
    }

    function drawTowers(ctx) {
        const items = [...s.towers.map((tw) => ({ y: tw.y, tw })), ...s.mobs.map((m) => ({ y: m.y, m }))].sort((a, b) => a.y - b.y);
        items.forEach((it) => {
            if (it.tw) {
                const tw = it.tw;
                const bob = tw.fire > 0 ? -2 : 0;
                drawSprite(ctx, TS[tw.type][tw.lv], tw.x, tw.y + bob, tw.type === 'lanceur' && tw.aim < 0 ? -1 : 1);
            } else drawMob(ctx, it.m);
        });
        for (const sh of s.shots) circle(ctx, sh.x, sh.y, 4, '#ffffff');
    }

    function drawHud(ctx) {
        roundRect(ctx, 8, 7, 470, 30, 15);
        ctx.fillStyle = 'rgba(14,22,48,0.86)';
        ctx.fill();
        const wv = s.wave < 0 ? 'Préparation' : `Vague ${s.wave + 1}/${WAVES.length}`;
        text(ctx, wv, 24, 27, { size: 15, weight: 800, font: DISPLAY });
        drawGift(ctx, 150, 30, 1.1, '#e94b4b', '#ffd36e');
        text(ctx, `${s.gifts}`, 162, 28, { size: 15, weight: 800, color: s.gifts <= 3 ? '#ff8f8f' : '#ffffff' });
        // poisson
        ctx.fillStyle = '#ffd36e';
        ctx.beginPath();
        ctx.ellipse(208, 22, 9, 5, 0, 0, TAU);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(216, 22);
        ctx.lineTo(223, 16);
        ctx.lineTo(223, 28);
        ctx.fill();
        text(ctx, `${s.fish}`, 230, 28, { size: 15, weight: 800, color: '#ffd36e' });
        text(ctx, map.name, 292, 27, { size: 13, weight: 600, color: 'rgba(255,255,255,0.7)' });
        // boutons : vitesse et vague suivante
        const btns = [];
        const sp = { id: 'speed', x: 488, y: 7, w: 64, h: 30, label: s.speed === 2 ? '×2 ▸▸' : '×1 ▸' };
        btns.push(sp);
        roundRect(ctx, sp.x, sp.y, sp.w, sp.h, 15);
        ctx.fillStyle = s.speed === 2 ? '#ffd36e' : 'rgba(14,22,48,0.86)';
        ctx.fill();
        text(ctx, sp.label, sp.x + sp.w / 2, sp.y + 20, { size: 14, weight: 800, align: 'center', color: s.speed === 2 ? '#2a1d05' : '#ffffff' });
        const canCall = s.wave < WAVES.length - 1 && !s.spawning;
        if (canCall) {
            const first = s.wave < 0;
            const nx = { id: 'next', x: 560, y: 7, w: 232, h: 30, label: first ? 'Lancer la vague 1 ▸' : `Vague suivante ▸  (${Math.ceil(s.countdown)} s · +${Math.ceil(s.countdown) * 20})` };
            btns.push(nx);
            const pulse = first ? 0.5 + 0.5 * Math.sin(s.t * 5) : 0;
            roundRect(ctx, nx.x, nx.y + 2, nx.w, nx.h, 15);
            ctx.fillStyle = '#c98a12';
            ctx.fill();
            roundRect(ctx, nx.x, nx.y - (s.hover === 'next' ? 1 : 0), nx.w, nx.h, 15);
            ctx.fillStyle = pulse ? `rgb(255,${211 + pulse * 20},${110 + pulse * 60})` : '#ffd36e';
            ctx.fill();
            text(ctx, nx.label, nx.x + nx.w / 2, nx.y + 20, { size: 13, weight: 800, align: 'center', color: '#2a1d05', font: DISPLAY });
        } else if (s.wave >= 0) {
            const left = plans[s.wave].length - s.spawnIdx + s.mobs.length;
            roundRect(ctx, 560, 7, 232, 30, 15);
            ctx.fillStyle = 'rgba(14,22,48,0.86)';
            ctx.fill();
            text(ctx, `${left} monstre${left > 1 ? 's' : ''} en approche`, 676, 27, { size: 13, weight: 700, align: 'center', color: 'rgba(255,255,255,0.85)' });
        }
        // barre de vie du boss
        const boss = s.mobs.find((m) => m.type === 'boss');
        if (boss) {
            roundRect(ctx, W / 2 - 150, 46, 300, 20, 10);
            ctx.fillStyle = 'rgba(14,22,48,0.86)';
            ctx.fill();
            ctx.fillStyle = '#ff6b6b';
            roundRect(ctx, W / 2 - 146, 50, 292 * Math.max(0, boss.hp / boss.max), 12, 6);
            ctx.fill();
            text(ctx, 'Le Gros Bonhomme', W / 2, 61, { size: 11, weight: 800, align: 'center' });
        }
        return btns;
    }

    // la boutique (emplacement libre) ou le panneau d'amélioration (tour)
    function drawPanel(ctx) {
        if (!s.sel) return [];
        const btns = [];
        if (s.sel.kind === 'slot') {
            const sl = slots[s.sel.i];
            const pw = 4 * 86 + 5 * 6;
            const px = Math.max(8, Math.min(W - pw - 8, sl.x - pw / 2));
            const py = sl.y > 250 ? sl.y - 118 : sl.y + 20;
            roundRect(ctx, px, py, pw, 84, 14);
            ctx.fillStyle = 'rgba(14,22,48,0.94)';
            ctx.fill();
            TOWER_ORDER.forEach((k, i) => {
                const def = TOWERS[k];
                const bx = px + 6 + i * 92;
                const ok = s.fish >= def.cost;
                const b = { id: `build:${k}`, x: bx, y: py + 6, w: 86, h: 72 };
                btns.push(b);
                roundRect(ctx, bx, py + 6, 86, 72, 10);
                ctx.fillStyle = s.hover === b.id && ok ? 'rgba(255,211,110,0.25)' : 'rgba(255,255,255,0.08)';
                ctx.fill();
                ctx.globalAlpha = ok ? 1 : 0.45;
                drawSprite(ctx, TS[k][0], bx + 43, py + 50, 1, 0.62);
                text(ctx, def.short, bx + 43, py + 62, { size: 11, weight: 800, align: 'center' });
                text(ctx, `${def.cost} poissons`, bx + 43, py + 74, { size: 11, weight: 700, align: 'center', color: '#ffd36e' });
                text(ctx, `${i + 1}`, bx + 8, py + 18, { size: 10, weight: 800, color: 'rgba(255,255,255,0.5)' });
                ctx.globalAlpha = 1;
            });
        } else {
            const tw = towerAt(s.sel.i);
            if (!tw) return [];
            const def = TOWERS[tw.type];
            ctx.strokeStyle = 'rgba(255,211,110,0.7)';
            ctx.fillStyle = 'rgba(255,211,110,0.1)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(tw.x, tw.y - 8, rangeOf(tw), 0, TAU);
            ctx.fill();
            ctx.stroke();
            const pw = 262;
            const px = Math.max(8, Math.min(W - pw - 8, tw.x + 30 > W - pw ? tw.x - pw - 30 : tw.x + 30));
            const py = Math.max(HUD_H + 4, Math.min(H - 104, tw.y - 70));
            roundRect(ctx, px, py, pw, 98, 14);
            ctx.fillStyle = 'rgba(14,22,48,0.94)';
            ctx.fill();
            text(ctx, `${def.name} · niv. ${tw.lv + 1}`, px + 12, py + 22, { size: 13, weight: 800 });
            const nxt = tw.lv < 2 ? `Niv. ${tw.lv + 2} : ${def.next[tw.lv]}` : 'Niveau maximum';
            text(ctx, nxt, px + 12, py + 42, { size: 11, weight: 600, color: tw.lv < 2 ? '#7be0a3' : 'rgba(255,255,255,0.7)' });
            if (tw.lv < 2) {
                const c = def.up[tw.lv];
                const b = { id: 'upgrade', x: px + 10, y: py + 56, w: 154, h: 32 };
                ctx.globalAlpha = s.fish >= c ? 1 : 0.5;
                roundRect(ctx, b.x, b.y + 3, b.w, b.h, 16);
                ctx.fillStyle = '#c98a12';
                ctx.fill();
                roundRect(ctx, b.x, b.y - (s.hover === 'upgrade' ? 1 : 0), b.w, b.h, 16);
                ctx.fillStyle = '#ffd36e';
                ctx.fill();
                text(ctx, `Améliorer · ${c} poissons`, b.x + b.w / 2, b.y + 21, { size: 11.5, weight: 800, align: 'center', color: '#2a1d05' });
                ctx.globalAlpha = 1;
                btns.push(b);
            }
            const sv = { id: 'sell', x: px + 170, y: py + 56, w: 82, h: 32 };
            roundRect(ctx, sv.x, sv.y, sv.w, sv.h, 16);
            ctx.fillStyle = s.hover === 'sell' ? '#ff5d6d' : '#d7263d';
            ctx.fill();
            text(ctx, `Vendre ${Math.floor(tw.spent * 0.6)}`, sv.x + sv.w / 2, sv.y + 21, { size: 12, weight: 800, align: 'center' });
            btns.push(sv);
        }
        return btns;
    }

    function drawToast(ctx) {
        if (!s.toast) return;
        const k = Math.min(1, s.toast.t / 0.25, (s.toast.dur - s.toast.t) / 0.3);
        if (k <= 0) return;
        ctx.globalAlpha = k;
        const pw = 470;
        const px = map.tree[0] < W / 2 ? W - 484 : 14;
        const py = H - 86;
        roundRect(ctx, px, py, pw, 72, 14);
        ctx.fillStyle = 'rgba(255,248,230,0.97)';
        ctx.fill();
        drawPenguin(ctx, px + 36, py + 66, 54, { hat: 'none', scarf: '#26345e', mood: 'normal' });
        ctx.fillStyle = '#26345e';
        ctx.fillRect(px + 26, py + 12, 20, 14);
        ctx.fillRect(px + 21, py + 24, 30, 4);
        roundRect(ctx, px + 70, py - 9, 112, 20, 10);
        ctx.fillStyle = '#ffd36e';
        ctx.fill();
        text(ctx, 'Monsieur le Maire', px + 126, py + 5, { size: 11, weight: 800, align: 'center', color: '#2a1d05' });
        // texte sur deux lignes au plus
        const words = s.toast.text.split(' ');
        const lines = [''];
        ctx.font = `600 13px "DM Sans", system-ui, sans-serif`;
        words.forEach((wd) => {
            const tryL = lines[lines.length - 1] ? `${lines[lines.length - 1]} ${wd}` : wd;
            if (ctx.measureText(tryL).width > pw - 92 && lines[lines.length - 1]) lines.push(wd);
            else lines[lines.length - 1] = tryL;
        });
        lines.slice(0, 3).forEach((l, i) => text(ctx, l, px + 74, py + 28 + i * 17, { size: 13, weight: 600, color: '#2a2f45' }));
        ctx.globalAlpha = 1;
    }

    function drawBanner(ctx) {
        if (!s.banner) return;
        const k = Math.min(1, s.banner.t / 0.25, (2.4 - s.banner.t) / 0.3);
        if (k <= 0) return;
        ctx.globalAlpha = k;
        const pw = 360;
        roundRect(ctx, W / 2 - pw / 2, 150, pw, s.banner.sub ? 70 : 52, 16);
        ctx.fillStyle = '#d7263d';
        ctx.fill();
        text(ctx, s.banner.title, W / 2, 186, { size: 30, weight: 800, font: DISPLAY, align: 'center' });
        if (s.banner.sub) text(ctx, s.banner.sub, W / 2, 208, { size: 13, weight: 700, align: 'center', color: 'rgba(255,255,255,0.92)' });
        ctx.globalAlpha = 1;
    }

    function drawPlay(ctx) {
        ctx.drawImage(bg, 0, 0, W, H);
        drawSlots(ctx);
        drawTree(ctx);
        drawTowers(ctx);
        drawFx(ctx);
        if (isNight()) drawNight(ctx);
        if (events[s.wave] === 'blizzard' && s.spawningOrAlive) {
            ctx.strokeStyle = 'rgba(255,255,255,0.6)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (let i = 0; i < 60; i++) {
                const y = (i * 53) % H;
                const x = ((i * 97 - s.t * 520 * (0.7 + (i % 5) * 0.12)) % (W + 80) + W + 80) % (W + 80) - 40;
                ctx.moveTo(x, y);
                ctx.lineTo(x + 26, y + 5);
            }
            ctx.stroke();
            ctx.fillStyle = 'rgba(255,255,255,0.12)';
            ctx.fillRect(0, 0, W, H);
        }
        for (const p of s.popups) {
            ctx.globalAlpha = 1 - p.t / 1.2;
            text(ctx, p.str, p.x, p.y - p.t * 26, { size: 13, weight: 800, align: 'center', color: p.color, shadow: true });
            ctx.globalAlpha = 1;
        }
        const hudBtns = drawHud(ctx);
        const panelBtns = s.phase === 'play' ? drawPanel(ctx) : [];
        drawBanner(ctx);
        drawToast(ctx);
        s.buttons = [...panelBtns, ...hudBtns];
    }

    function drawTitle(ctx) {
        ctx.fillStyle = '#0d1a3a';
        ctx.fillRect(0, 0, W, H);
        for (let i = 0; i < 70; i++) circle(ctx, (i * 137) % W, (i * 71) % 300, i % 7 === 0 ? 1.6 : 1, `rgba(255,255,255,${0.4 + (i % 3) * 0.2})`);
        ctx.fillStyle = '#eaf3fc';
        ctx.beginPath();
        ctx.moveTo(0, 360);
        ctx.quadraticCurveTo(400, 320, W, 360);
        ctx.lineTo(W, H);
        ctx.lineTo(0, H);
        ctx.fill();
        drawSprite(ctx, treeSpr, W / 2, 392, 1, 0.85);
        for (let i = 0; i < 6; i++) drawGift(ctx, W / 2 - 50 + i * 20, 396 + (i % 2) * 4, 1.3, GIFT_COLORS[i % 5][0], GIFT_COLORS[i % 5][1]);
        drawSprite(ctx, MS.grognon[Math.floor(s.t * 3) % 2], 200, 392);
        drawSprite(ctx, MS.biscuit[Math.floor(s.t * 4) % 2], 600, 396, -1);
        drawSprite(ctx, MS.mimique[Math.floor(s.t * 3) % 2], 660, 404, -1);
        drawPenguin(ctx, 290, 400, 54, { scarf: '#e94b4b', mood: 'happy', flip: -2 + Math.sin(s.t * 6) * 0.4 });
        text(ctx, 'OPÉRATION', W / 2, 70, { size: 22, weight: 800, font: DISPLAY, align: 'center', color: '#ffd36e' });
        text(ctx, 'RÉVEILLON', W / 2, 126, { size: 64, weight: 800, font: DISPLAY, align: 'center', shadow: true });
        text(ctx, 'La Grande Quête de Flocon · épisode 2', W / 2, 152, { size: 14, weight: 600, align: 'center', color: 'rgba(255,255,255,0.8)' });
        const q = loadQuest();
        const btns = [
            { id: 'play', label: 'Défendre !', primary: true, x: W / 2 - 160, y: 172, w: 150, h: 42 },
            { id: 'tranquil', label: 'Mode tranquille', x: W / 2 + 10, y: 172, w: 150, h: 42 }
        ];
        btns.forEach((b) => drawButton(ctx, b, s.hover === b.id));
        s.buttons = btns;
        const dd = day.split('-').reverse().slice(0, 2).join('/');
        text(ctx, `Carte du ${dd} : ${map.name}, la même pour tout le monde aujourd’hui.`, W / 2, 238, { size: 13, weight: 600, align: 'center', color: 'rgba(255,255,255,0.8)' });
        if (q.done[ID]?.score) text(ctx, `Ton meilleur score de quête : ${q.done[ID].score.toLocaleString('fr-FR')}`, W / 2, 258, { size: 13, weight: 700, align: 'center', color: '#7be0a3' });
    }

    function render(ctx) {
        if (s.phase === 'title') {
            drawTitle(ctx);
            return;
        }
        drawPlay(ctx);
        if (s.phase === 'gameover') {
            ctx.fillStyle = 'rgba(6,10,26,0.7)';
            ctx.fillRect(0, 0, W, H);
            text(ctx, 'Les cadeaux sont partis !', W / 2, 150, { size: 38, weight: 800, font: DISPLAY, align: 'center' });
            text(ctx, 'On reprend la vague avec les tours qu’on avait, ou on recommence ?', W / 2, 184, { size: 15, weight: 600, align: 'center', color: 'rgba(255,255,255,0.85)' });
            const bs = s.overBtns || [];
            const bw = bs.length > 3 ? 172 : 200;
            const total = bs.length * bw + (bs.length - 1) * 12;
            s.buttons = bs.map((b, i) => ({ ...b, x: W / 2 - total / 2 + i * (bw + 12), y: 220, w: bw, h: 42 }));
            s.buttons.forEach((b) => drawButton(ctx, b, s.hover === b.id));
        }
        if (s.phase === 'won') {
            const k = Math.min(1, s.phaseT / 0.5);
            ctx.globalAlpha = k;
            text(ctx, 'Le sapin est sauvé !', W / 2, 200, { size: 44, weight: 800, font: DISPLAY, align: 'center', shadow: true });
            ctx.globalAlpha = 1;
        }
        if (s.phase === 'results' && s.results) s.buttons = drawResults(ctx, W, H, s.results, s.phaseT, s.hover);
    }

    // ---------------------------------------------------------------- commandes
    function start(tranquil) {
        newGame(tranquil);
        s.phase = 'play';
        s.phaseT = 0;
        s.toast = { text: MAIRE_LINES.intro, t: 0, dur: 5 };
        setTimeoutTuto();
    }
    function setTimeoutTuto() {
        s.tutoAt = 5;
    }

    function press(id) {
        if (id === 'play') start(false);
        else if (id === 'tranquil' && s.phase === 'title') start(true);
        else if (id === 'tranquil' && s.phase === 'gameover') {
            s.tranquil = true;
            retryWave();
        } else if (id === 'retrywave') retryWave();
        else if (id === 'restart') start(s.tranquil);
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
        } else if (id === 'speed') s.speed = s.speed === 1 ? 2 : 1;
        else if (id === 'next') startWave(s.wave >= 0);
        else if (id.startsWith('build:') && s.sel && s.sel.kind === 'slot') build(s.sel.i, id.slice(6));
        else if (id === 'upgrade' && s.sel) upgrade(towerAt(s.sel.i));
        else if (id === 'sell' && s.sel) sell(towerAt(s.sel.i));
    }

    function clickMap(x, y) {
        const ti = s.towers.find((tw) => Math.abs(tw.x - x) < 22 && y > tw.y - 56 && y < tw.y + 8);
        if (ti) {
            s.sel = s.sel && s.sel.kind === 'tower' && s.sel.i === ti.slot ? null : { kind: 'tower', i: ti.slot };
            return;
        }
        const si = slots.findIndex((sl, i) => !towerAt(i) && Math.hypot(sl.x - x, sl.y - 6 - y) < 22);
        if (si >= 0) {
            s.sel = s.sel && s.sel.kind === 'slot' && s.sel.i === si ? null : { kind: 'slot', i: si };
            return;
        }
        s.sel = null;
    }

    const game = {
        update(dt) {
            update(dt);
            if (s.phase === 'play' && s.tutoAt != null && s.phaseT > s.tutoAt) {
                s.tutoAt = null;
                if (!s.built) say('tuto', 6);
            }
        },
        render,
        canPause: () => s.phase === 'play',
        blur() {},
        keyDown(code, repeat) {
            if (repeat) return;
            if ((code === 'Enter' || code === 'Space') && ['title', 'results', 'gameover'].includes(s.phase)) {
                const primary = (s.buttons || []).find((b) => b.primary);
                if (primary && (s.phase !== 'results' || s.phaseT > 1)) press(primary.id);
                return;
            }
            if (s.phase !== 'play') return;
            if (code === 'Space' || code === 'KeyN') {
                if (s.wave < WAVES.length - 1 && !s.spawning) startWave(s.wave >= 0);
            } else if (code === 'KeyF') s.speed = s.speed === 1 ? 2 : 1;
            else if (code === 'Escape') s.sel = null;
            else if (/^Digit[1-4]$/.test(code) && s.sel && s.sel.kind === 'slot') build(s.sel.i, TOWER_ORDER[Number(code.slice(5)) - 1]);
            else if (code === 'KeyU' && s.sel && s.sel.kind === 'tower') upgrade(towerAt(s.sel.i));
        },
        keyUp() {},
        pointerDown(x, y) {
            const b = hitButton(s.buttons, x, y);
            if (b) {
                if (s.phase !== 'results' || s.phaseT > 0.8) press(b.id);
                return;
            }
            if (s.phase === 'play') clickMap(x, y);
        },
        pointerMove(x, y) {
            const b = hitButton(s.buttons, x, y);
            if (b) {
                s.hover = b.id;
                return;
            }
            if (s.phase === 'play' && !coarse) {
                const si = slots.findIndex((sl, i) => !towerAt(i) && Math.hypot(sl.x - x, sl.y - 6 - y) < 22);
                s.hover = si >= 0 ? `slot${si}` : null;
            } else s.hover = null;
        },
        pointerUp() {}
    };

    if (__TEST_MODE__) {
        window.reveillon = {
            s,
            map,
            slots,
            events,
            plans,
            start: (tranquil = false) => start(tranquil),
            build: (i, type) => build(i, type),
            upgrade: (i) => upgrade(towerAt(i)),
            next: () => startWave(s.wave >= 0),
            fish: (n = 1000) => {
                s.fish += n;
            },
            wave: (n) => {
                s.wave = n - 2;
                s.spawning = false;
                s.mobs = [];
                startWave(false);
            },
            finish,
            game
        };
    }
    return game;
}

export default function ReveillonGame({ onScore, now, onExit }) {
    // Date figée à l'ouverture : l'horloge du site avance chaque minute, la partie ne doit pas redémarrer
    const [start] = useState(() => now || new Date());
    const exitRef = useRef(onExit);
    exitRef.current = onExit;
    const create = useCallback((api) => createReveillon(api, { now: start, onExit: () => exitRef.current && exitRef.current() }), [start]);
    return <GameCanvas pausable fixedStep create={create} onScore={onScore} label="Opération Réveillon" />;
}
