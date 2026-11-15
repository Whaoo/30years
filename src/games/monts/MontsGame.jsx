import { useCallback, useRef, useState } from 'react';
import GameCanvas from '../GameCanvas';
import { DISPLAY, drawPenguin, roundRect, text, circle } from '../draw';
import { getBest } from '../scores';
import { birthdays } from '../../utils/birthdayLogic';
import { dailyRng, scoreCode } from '../../december/seed';
import { drawResults, drawButton, gradeFor, hitButton } from '../../december/results';
import { firstTryOfDay, loadQuest, markFail, markSkipped, markWon, passCode, SKIP_AFTER_FAILS } from '../../december/quest';
import { ARENA, GROUND, LEVELS, buildLevel } from './levels';
import {
    H, W, drawBackdrop, drawBat, drawBlock, drawCeiling, drawFish, drawFlag, drawGift, drawGround, drawGull,
    drawHeart, drawPlatform, drawScrolling, drawShardShape, drawSign, drawSnowman, drawSpikes, drawSpring,
    drawStalactite, drawYeti, makeBackdrop, makeHalo, makeSnowLayer
} from './art';

/* global __TEST_MODE__ */

// Épisode 1 de la quête : « Les Monts Givrés ». Plateforme en 3 niveaux et un boss, environ 4 minutes.
// Trois actions : courir, sauter (hauteur variable, double saut), glisser. Au niveau 3, l'écharpe tricotée
// par Mamie sert de planeur (maintenir le saut en l'air). Le parcours du jour vient de la graine (levels.js).
// Score : poissons × 10 + poisson doré × 100 + cadeau secret × 500 + bonus de temps − 300 par vie perdue.

const ID = 'monts';
const TIME_BUDGET = 330; // secondes : au-delà, plus de bonus de temps
const GRAV = 2300;
const RUN = 270;
const JUMP_V = 780;
const JUMP2_V = 700;
const SPRING_V = 1150;
const PW = 26;
const PH = 40;
const SLIDE_H = 22;

const KEYS = {
    left: ['ArrowLeft', 'KeyA', 'KeyQ'],
    right: ['ArrowRight', 'KeyD'],
    jump: ['Space', 'ArrowUp', 'KeyW', 'KeyZ'],
    slide: ['ArrowDown', 'KeyS', 'ShiftLeft', 'ShiftRight']
};
const keyAction = (code) => Object.keys(KEYS).find((k) => KEYS[k].includes(code)) || null;

const LINES = [
    'Courage Flocon ! Le village compte sur toi.',
    'Je t’ai gardé un poisson. Enfin… j’en ai mangé la moitié.',
    'Le yéti ronfle là-haut. Enfin, je crois que c’est lui.',
    'Tu glisses comme un champion !',
    'Pense à fouiller les recoins : il paraît qu’il y a des cadeaux.',
    'Joli bonnet ! C’est Mamie qui l’a tricoté ?'
];
const NAMES = birthdays.map((b) => b.name);

const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

function createMonts(api, props) {
    const now = props.now || new Date();
    const { day, rng } = dailyRng(ID, now);
    const coarse = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    const halo = makeHalo();
    const mask = document.createElement('canvas');
    mask.width = W / 2;
    mask.height = H / 2;
    const mctx = mask.getContext('2d');
    const snowA = makeSnowLayer(11, 90, 26, 0.75);
    const snowB = makeSnowLayer(12, 60, 40, 0.45);
    const backdrops = {};
    const backdrop = (theme) => (backdrops[theme] ||= makeBackdrop(theme));

    // Le scénario du jour est tiré une fois pour toute la journée : les 3 niveaux et le boss
    const levelData = LEVELS.map((lv) => buildLevel(lv, rng));
    const bossOrder = [rng.shuffle(['throw', 'slam', 'charge']), rng.shuffle(['throw', 'slam', 'charge']), rng.shuffle(['throw', 'slam', 'charge']), rng.shuffle(['throw', 'slam', 'charge'])];
    const windPlan = [];
    for (let tt = 4; tt < 400;) {
        const calm = rng.range(3, 5.5);
        const gust = rng.range(2.4, 3.6);
        windPlan.push({ warn: tt + calm - 1, on: tt + calm, off: tt + calm + gust });
        tt += calm + gust;
    }
    const flagNames = rng.shuffle(NAMES);
    const flagLines = rng.shuffle(LINES);

    const s = {
        phase: 'title', // title, intro, card, play, levelEnd, gameover, victory, results
        phaseT: 0,
        t: 0,
        tranquil: false,
        levelIdx: 0, // 0..2, 3 = boss
        time: 0,
        fish: 0,
        fishTotal: 0,
        golds: 0,
        secrets: 0,
        livesLost: 0,
        hearts: 3,
        keys: { left: false, right: false, jump: false, slide: false },
        touch: {},
        buttons: [],
        hover: null,
        toast: null,
        results: null,
        particles: [],
        shardGot: false
    };
    levelData.forEach((ld) => {
        ld.items.forEach((it) => {
            if (it.t === 'f') s.fishTotal += it.n;
        });
    });

    let L = null; // niveau en cours (état mutable)
    let P = null; // le joueur

    function newPlayer(x) {
        return { x, y: GROUND, vx: 0, vy: 0, face: 1, ground: true, coyote: 0, buffer: 0, jumps: 0, slide: 0, sliding: false, glide: false, inv: 0, squash: 1, onCrack: null };
    }

    function loadLevel(idx) {
        s.levelIdx = idx;
        const boss = idx === 3;
        const src = boss ? { width: 800, items: ARENA.items.map((i) => ({ ...i })), checkpoints: [] } : levelData[idx];
        const lv = boss ? { name: 'Le Yéti grognon', theme: 'boss' } : LEVELS[idx];
        L = {
            def: lv,
            boss,
            theme: lv.theme,
            width: src.width,
            ground: [],
            plats: [],
            blocks: [],
            ceils: [],
            spikes: [],
            springs: [],
            fish: [],
            gifts: [],
            signs: [],
            enemies: [],
            flags: src.checkpoints.map((x, i) => ({ x, name: flagNames[(idx * 3 + i) % flagNames.length], line: flagLines[(idx * 3 + i) % flagLines.length], reached: false })),
            endX: src.width - 160,
            checkpoint: 80,
            camX: 0,
            crystals: [],
            balls: [],
            waves: [],
            yeti: null,
            windT: 0
        };
        src.items.forEach((it) => {
            if (it.t === 'g') L.ground.push({ x: it.x, y: GROUND, w: it.w, h: 80 });
            else if (it.t === 'p') L.plats.push({ x: it.x, y: it.y, w: it.w, h: 16, k: it.k, shake: 0, gone: 0, fallY: 0 });
            else if (it.t === 'b') L.blocks.push({ x: it.x, y: it.y, w: it.w, h: GROUND - it.y + 10 });
            else if (it.t === 'c') L.ceils.push({ x: it.x, y: it.y, w: it.w });
            else if (it.t === 's') L.spikes.push({ x: it.x, y: it.y, w: it.w });
            else if (it.t === 'sp') L.springs.push({ x: it.x, y: it.y, squash: 0 });
            else if (it.t === 'f') for (let i = 0; i < it.n; i++) L.fish.push({ x: it.x + i * it.dx, y: it.y - (it.arc && it.n > 1 ? it.arc * Math.sin((Math.PI * i) / (it.n - 1)) : 0), gold: false, got: false });
            else if (it.t === 'goldfish') L.fish.push({ x: it.x, y: it.y, gold: true, got: false });
            else if (it.t === 'gift') L.gifts.push({ x: it.x, y: it.y, got: false });
            else if (it.t === 'sign') L.signs.push(it);
            else if (it.t === 'flag') L.endX = it.x;
            else if (it.t === 'e') L.enemies.push(makeEnemy(it));
        });
        if (L.theme === 'cave') for (let x = 300; x < L.width; x += 260 + ((x * 7) % 90)) L.crystals.push({ x, y: 60 + ((x * 13) % 120) });
        if (boss) L.yeti = { x: 640, y: GROUND, dir: -1, state: 'intro', t: 0, hits: 0, round: 0, attack: 0, vy: 0, crouch: 0, arm: 0, roar: 0, flash: 0, shard: true, thrown: 0, air: false };
        P = newPlayer(boss ? 120 : 80);
        s.hearts = 3;
        s.windT = 0;
    }

    function makeEnemy(it) {
        const e = { k: it.k, x: it.x, y: it.y, hx: it.x, hy: it.y, r: it.r || 80, dir: -1, t: 0, state: 'idle', dead: 0, vy: 0, shake: 0 };
        if (it.k === 'gull') e.state = 'wait';
        return e;
    }

    // ---------------------------------------------------------------- outils
    const solids = () => [...L.ground, ...L.blocks, ...L.ceils.map((c) => ({ x: c.x, y: -200, w: c.w, h: c.y + 200 }))];
    const playerRect = () => {
        const h = P.sliding ? SLIDE_H : PH;
        return { x: P.x - PW / 2, y: P.y - h, w: PW, h };
    };
    const ceilingAbove = () => {
        const r = { x: P.x - PW / 2, y: P.y - PH, w: PW, h: PH - SLIDE_H };
        return solids().some((b) => overlap(r, b));
    };

    function addParticles(x, y, n, color, spread = 120) {
        for (let i = 0; i < n && s.particles.length < 160; i++) {
            const a = Math.random() * Math.PI * 2;
            const v = spread * (0.3 + Math.random() * 0.7);
            s.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, life: 0.5 + Math.random() * 0.4, t: 0, color, r: 2 + Math.random() * 2 });
        }
    }

    function toast(textStr, who = null, dur = 2.6) {
        s.toast = { text: textStr, who, t: 0, dur };
    }

    function hurt(fromX) {
        if (P.inv > 0 || s.phase !== 'play') return;
        if (!s.tranquil) {
            s.hearts -= 1;
            s.livesLost += 1;
        }
        P.inv = 1.4;
        P.vx = (P.x < fromX ? -1 : 1) * 240;
        P.vy = -380;
        P.ground = false;
        addParticles(P.x, P.y - 20, 10, '#ff8fa8');
        if (s.hearts <= 0) gameOver();
    }

    function fallIntoPit() {
        if (!s.tranquil) {
            s.hearts -= 1;
            s.livesLost += 1;
        }
        if (s.hearts <= 0) {
            gameOver();
            return;
        }
        P = newPlayer(L.checkpoint);
        P.inv = 1.4;
        L.camX = Math.max(0, Math.min(L.width - W, P.x - 300));
    }

    function gameOver() {
        s.phase = 'gameover';
        s.phaseT = 0;
        const fails = markFail(ID);
        const btns = [{ id: 'retry', label: 'Réessayer', primary: true }, { id: 'tranquil', label: 'Mode tranquille' }];
        if (fails >= SKIP_AFTER_FAILS) btns.push({ id: 'skip', label: 'Passer l’épisode' });
        s.overBtns = btns;
    }

    function startGame(tranquil) {
        s.tranquil = tranquil;
        s.time = 0;
        s.fish = 0;
        s.golds = 0;
        s.secrets = 0;
        s.livesLost = 0;
        s.shardGot = false;
        s.results = null;
        loadLevel(0);
        s.phase = 'intro';
        s.phaseT = 0;
    }

    function nextLevel() {
        loadLevel(s.levelIdx + 1);
        s.phase = 'card';
        s.phaseT = 0;
    }

    function finish() {
        const fishPts = s.fish * 10;
        const goldPts = s.golds * 100;
        const secretPts = s.secrets * 500;
        const timeBonus = s.tranquil ? 0 : Math.max(0, Math.round(TIME_BUDGET - s.time)) * 10;
        const livesPen = s.tranquil ? 0 : s.livesLost * 300;
        const score = Math.max(0, fishPts + goldPts + secretPts + timeBonus - livesPen);
        const best = getBest(ID);
        let isRecord = false;
        let official = null;
        if (!s.tranquil) {
            isRecord = api.reportScore(score) || false;
            official = firstTryOfDay(ID, day, score);
        }
        markWon(ID, s.tranquil ? 0 : score);
        const stars = 1 + (s.fish >= s.fishTotal * 0.7 ? 1 : 0) + (s.secrets === 3 && s.livesLost <= 2 ? 1 : 0);
        s.results = {
            title: 'Monts Givrés terminés !',
            subtitle: s.tranquil ? 'Mode tranquille : épisode validé, sans record' : `Parcours du ${day.split('-').reverse().slice(0, 2).join('/')}`,
            score,
            stars: s.tranquil ? null : stars,
            grade: s.tranquil ? null : gradeFor(score, { S: 4000, A: 3000, B: 2000 }),
            rows: [
                ['Poissons', `${s.fish} / ${s.fishTotal}  ·  ${fishPts}`],
                ['Poissons dorés', `${s.golds} / 3  ·  ${goldPts}`],
                ['Cadeaux secrets', `${s.secrets} / 3  ·  ${secretPts}`],
                ['Temps', `${fmtTime(s.time)}  ·  +${timeBonus}`],
                ['Vies perdues', livesPen ? `${s.livesLost}  ·  −${livesPen}` : '0']
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

    // ---------------------------------------------------------------- joueur
    function updatePlayer(dt) {
        const k = { ...s.keys };
        Object.values(s.touch).forEach((a) => {
            if (a) k[a] = true;
        });
        const dirIn = (k.right ? 1 : 0) - (k.left ? 1 : 0);
        P.inv = Math.max(0, P.inv - dt);
        P.coyote = P.ground ? 0.1 : Math.max(0, P.coyote - dt);
        P.buffer = Math.max(0, P.buffer - dt);

        // vent du blizzard
        let wind = 0;
        if (L.def.wind) {
            const g = windPlan.find((w) => s.windT >= w.warn && s.windT < w.off);
            if (g && s.windT >= g.on) wind = -150;
        }

        // glissade
        const wantSlide = k.slide && P.ground;
        if (wantSlide && !P.sliding) {
            P.sliding = true;
            P.slide = 0;
            P.vx = P.face * Math.max(Math.abs(P.vx), 340);
        }
        if (P.sliding) {
            P.slide += dt;
            const stuck = ceilingAbove();
            if ((!k.slide && P.slide > 0.3 && !stuck) || (!P.ground && !stuck)) P.sliding = false;
            if (P.sliding) {
                const target = stuck ? P.face * 140 : 0;
                P.vx += (target - P.vx) * Math.min(1, dt * (stuck ? 6 : 1.6));
                if (stuck && Math.abs(P.vx) < 140) P.vx = P.face * 140;
            }
        }
        if (!P.sliding) {
            const ice = P.onIce;
            const accel = P.ground ? (ice ? 900 : 2600) : 1500;
            const target = dirIn * RUN + wind;
            if (dirIn !== 0) P.face = dirIn;
            const diff = target - P.vx;
            const maxStep = (dirIn === 0 && P.ground ? (ice ? 500 : 2800) : accel) * dt;
            P.vx += Math.max(-maxStep, Math.min(maxStep, diff));
        }

        // saut (mémoire de l'appui + délai de grâce au bord)
        if (P.buffer > 0) {
            if (P.ground || P.coyote > 0) {
                P.vy = -JUMP_V;
                P.ground = false;
                P.coyote = 0;
                P.jumps = 1;
                P.buffer = 0;
                P.sliding = false;
                P.squash = 1.2;
            } else if (P.jumps < 2) {
                P.vy = -JUMP2_V;
                P.jumps = 2;
                P.buffer = 0;
                addParticles(P.x, P.y, 6, '#ffffff', 80);
            }
        }
        // planeur : l'écharpe de Mamie (niveau 3)
        P.glide = !!(L.def.glide && !P.ground && k.jump && P.vy > 0);
        P.vy += GRAV * dt;
        if (P.glide) P.vy = Math.min(P.vy, 85);
        P.vy = Math.min(P.vy, 950);

        moveX(P.vx * dt);
        const wasGround = P.ground;
        moveY(P.vy * dt);
        if (P.ground && !wasGround) {
            P.squash = 0.8;
            P.jumps = 0;
            if (P.landV > 500) addParticles(P.x, P.y, 5, '#ffffff', 70);
        }
        P.squash += (1 - P.squash) * Math.min(1, dt * 10);
        if (P.x < 15) {
            P.x = 15;
            P.vx = Math.max(0, P.vx);
        }
        if (P.x > L.width - 15) P.x = L.width - 15;
        if (P.y > H + 40) fallIntoPit();
    }

    function moveX(dx) {
        P.x += dx;
        const r = playerRect();
        for (const b of solids()) {
            if (!overlap(r, b)) continue;
            if (dx > 0) P.x = b.x - PW / 2 - 0.01;
            else if (dx < 0) P.x = b.x + b.w + PW / 2 + 0.01;
            P.vx = 0;
            r.x = P.x - PW / 2;
        }
    }

    function moveY(dy) {
        const prevBottom = P.y;
        P.y += dy;
        P.ground = false;
        P.onIce = false;
        P.onCrack = null;
        let r = playerRect();
        for (const b of solids()) {
            if (!overlap(r, b)) continue;
            if (dy > 0) {
                P.y = b.y;
                P.landV = P.vy;
                P.vy = 0;
                P.ground = true;
            } else if (dy < 0) {
                P.y = b.y + b.h + (P.sliding ? SLIDE_H : PH);
                P.vy = 0;
            }
            r = playerRect();
        }
        if (dy >= 0) {
            for (const p of L.plats) {
                if (p.gone > 0) continue;
                const top = p.y;
                if (P.x + PW / 2 > p.x && P.x - PW / 2 < p.x + p.w && prevBottom <= top + 0.5 && P.y >= top) {
                    P.y = top;
                    P.landV = P.vy;
                    P.vy = 0;
                    P.ground = true;
                    P.onIce = p.k === 'ice';
                    if (p.k === 'crack') P.onCrack = p;
                }
            }
            for (const sp of L.springs) {
                if (Math.abs(P.x - sp.x) < 22 && prevBottom <= sp.y - 14 && P.y >= sp.y - 14) {
                    P.y = sp.y - 14;
                    P.vy = -SPRING_V;
                    P.jumps = 1;
                    P.ground = false;
                    sp.squash = 1;
                    addParticles(sp.x, sp.y - 20, 6, '#ffd36e', 90);
                }
            }
        }
        // Un sol ferme reste un sol : on retrouve le contact s'il est juste sous les pieds (descente d'une marche)
        if (!P.ground && P.vy >= 0) {
            for (const b of L.ground) if (P.x > b.x && P.x < b.x + b.w && Math.abs(P.y - b.y) < 0.5) P.ground = true;
        }
    }

    // ---------------------------------------------------------------- monde
    function updateWorld(dt) {
        const pr = playerRect();
        // plateformes qui s'effondrent
        L.plats.forEach((p) => {
            if (p.k !== 'crack') return;
            if (p.gone > 0) {
                p.gone -= dt;
                p.fallY += 400 * dt;
                if (p.gone <= 0) {
                    p.shake = 0;
                    p.fallY = 0;
                }
                return;
            }
            if (P.onCrack === p) p.shake += dt;
            else if (p.shake > 0) p.shake += dt;
            if (p.shake > 0.45) {
                p.gone = 4;
                p.shake = 0;
                addParticles(p.x + p.w / 2, p.y + 8, 8, '#a9dcff', 90);
            }
        });
        L.springs.forEach((sp) => {
            sp.squash = Math.max(0, sp.squash - dt * 4);
            // on peut aussi marcher dessus
            if (P.ground && Math.abs(P.x - sp.x) < 14 && Math.abs(P.y - sp.y) < 2) {
                P.vy = -SPRING_V;
                P.ground = false;
                P.jumps = 1;
                sp.squash = 1;
            }
        });
        // poissons et cadeaux
        L.fish.forEach((f) => {
            if (f.got) return;
            const dx = f.x - P.x;
            const dy = f.y - (P.y - 20);
            if (dx * dx + dy * dy < (f.gold ? 30 : 24) ** 2) {
                f.got = true;
                if (f.gold) {
                    s.golds += 1;
                    toast('Poisson doré ! +100');
                } else s.fish += 1;
                addParticles(f.x, f.y, f.gold ? 12 : 4, '#ffd36e', 70);
            }
        });
        L.gifts.forEach((g) => {
            if (g.got) return;
            if (Math.abs(g.x - P.x) < 28 && Math.abs(g.y - (P.y - 20)) < 32) {
                g.got = true;
                s.secrets += 1;
                toast('Cadeau secret ! +500');
                addParticles(g.x, g.y, 16, '#c9b6ff', 110);
            }
        });
        // pics
        L.spikes.forEach((sp) => {
            if (overlap(pr, { x: sp.x + 4, y: sp.y - 16, w: sp.w - 8, h: 16 })) hurt(P.x - P.face);
        });
        // drapeaux
        L.flags.forEach((f) => {
            if (!f.reached && P.x > f.x) {
                f.reached = true;
                L.checkpoint = f.x;
                toast(f.line, f.name);
            }
        });
        // ennemis
        L.enemies.forEach((e) => updateEnemy(e, dt, pr));
        L.enemies = L.enemies.filter((e) => !(e.dead > 0.4) && !e.remove);
        // fin du niveau
        if (!L.boss && P.x >= L.endX) {
            s.phase = 'levelEnd';
            s.phaseT = 0;
            addParticles(L.endX + 20, 310, 20, '#2bb673', 140);
        }
        if (L.def.wind) s.windT += dt;
        if (L.theme === 'blizzard') {
            const gust = windPlan.some((w) => s.windT >= w.on && s.windT < w.off);
            s.snowX = (s.snowX || 0) - (gust ? 900 : 260) * dt;
        }
    }

    function stompOrHurt(e, rect, pr) {
        if (!overlap(pr, rect)) return;
        if (P.vy > 60 && P.y - rect.y < 16) {
            e.dead = 0.001;
            P.vy = s.keys.jump || Object.values(s.touch).includes('jump') ? -700 : -520;
            P.jumps = 1;
            addParticles(e.x, rect.y, 10, '#ffffff', 100);
        } else hurt(e.x);
    }

    function updateEnemy(e, dt, pr) {
        e.t += dt;
        if (e.dead > 0) {
            e.dead += dt;
            return;
        }
        if (e.k === 'snowman') {
            e.x += e.dir * 45 * dt;
            if (e.x < e.hx - e.r) e.dir = 1;
            if (e.x > e.hx + e.r) e.dir = -1;
            stompOrHurt(e, { x: e.x - 15, y: e.y - 52, w: 30, h: 52 }, pr);
        } else if (e.k === 'bat') {
            if (e.state === 'idle') {
                e.y = e.hy + Math.sin(e.t * 3) * 6;
                if (Math.abs(P.x - e.hx) < 230 && e.cool <= 0) {
                    e.state = 'swoop';
                    e.st = 0;
                    e.tx = P.x;
                    e.ty = P.y - 22;
                }
                e.cool = (e.cool || 0) - dt;
            } else {
                e.st += dt;
                const k = e.st / 2.6;
                const c = { x: (e.hx + e.tx) / 2, y: e.ty + 60 };
                if (k < 0.5) {
                    const u = k * 2;
                    e.x = (1 - u) * (1 - u) * e.hx + 2 * (1 - u) * u * c.x + u * u * e.tx;
                    e.y = (1 - u) * (1 - u) * e.hy + 2 * (1 - u) * u * c.y + u * u * e.ty;
                } else if (k < 1) {
                    const u = (k - 0.5) * 2;
                    e.x = e.tx + (e.hx - e.tx) * u;
                    e.y = e.ty + (e.hy - e.ty) * u - Math.sin(u * Math.PI) * 30;
                } else {
                    e.state = 'idle';
                    e.cool = 1.5;
                    e.x = e.hx;
                }
            }
            stompOrHurt(e, { x: e.x - 12, y: e.y - 9, w: 24, h: 18 }, pr);
        } else if (e.k === 'gull') {
            if (e.state === 'wait') {
                if (P.x > e.hx - 520) {
                    e.state = 'fly';
                    e.x = L.camX + W + 40;
                    e.y = e.hy;
                }
                return;
            }
            e.x -= 230 * dt;
            const dx = e.x - P.x;
            if (e.state === 'fly' && dx < 230 && dx > 0) {
                e.state = 'dive';
                e.ty = P.y - 26;
            }
            if (e.state === 'dive') {
                e.y += (e.ty - e.y) * Math.min(1, dt * 3);
                if (dx < -40) e.state = 'climb';
            }
            if (e.state === 'climb') e.y -= 160 * dt;
            if (e.x < L.camX - 80) e.remove = true;
            stompOrHurt(e, { x: e.x - 14, y: e.y - 8, w: 28, h: 16 }, pr);
        } else if (e.k === 'stal') {
            if (e.state === 'idle' && P.x > e.hx - 95 && P.x < e.hx + 40) {
                e.state = 'shake';
                e.shake = 0.001;
            }
            if (e.state === 'shake') {
                e.shake += dt;
                if (e.shake > 0.38) {
                    e.state = 'fall';
                    e.shake = 0;
                }
            }
            if (e.state === 'fall') {
                e.vy += 1900 * dt;
                e.y += e.vy * dt;
                if (e.y + 46 >= GROUND) {
                    e.remove = true;
                    addParticles(e.x, GROUND - 6, 12, '#bff4ff', 120);
                }
                if (overlap(pr, { x: e.x - 8, y: e.y + 10, w: 16, h: 36 })) {
                    hurt(e.x);
                    e.remove = true;
                }
            }
        }
    }

    // ---------------------------------------------------------------- boss
    function startAttack(y) {
        const order = bossOrder[Math.min(y.round, bossOrder.length - 1)];
        y.current = order[y.attack % 3];
        y.attack += 1;
        if (y.attack % 3 === 0) y.round += 1;
        y.state = y.current;
        y.t = 0;
        y.thrown = 0;
        y.dir = P.x < y.x ? -1 : 1;
    }

    function updateBoss(dt) {
        const y = L.yeti;
        y.t += dt;
        y.flash = Math.max(0, y.flash - dt);
        const speedUp = 1 + y.hits * 0.18;
        const pr = playerRect();
        const body = { x: y.x - 50, y: y.y - 122, w: 100, h: 122 };
        const head = { x: y.x - 46, y: y.y - 168, w: 92, h: 56 };
        y.roar = Math.max(0, y.roar - dt * 1.5);
        y.arm += ((y.state === 'throw' ? 1 : 0) - y.arm) * Math.min(1, dt * 8);

        if (y.state === 'intro') {
            y.roar = y.t > 0.6 && y.t < 2 ? 1 : 0;
            if (y.t > 2.4) startAttack(y);
        } else if (y.state === 'throw') {
            const n = 2 + y.hits;
            const gap = 0.7 / speedUp;
            if (y.t > 0.5 + y.thrown * gap && y.thrown < n) {
                y.thrown += 1;
                const flight = 1.05;
                const tx = P.x + (Math.random() - 0.5) * 30;
                const sx = y.x + y.dir * 40;
                const sy = y.y - 140;
                L.balls.push({ x: sx, y: sy, vx: (tx - sx) / flight, vy: (GROUND - 10 - sy - 0.5 * 900 * flight * flight) / flight, r: 12 });
            }
            if (y.thrown >= n && y.t > 0.5 + n * gap + 0.6) tired(y, 2.2);
        } else if (y.state === 'slam') {
            if (y.t < 0.45) y.crouch = y.t / 0.45;
            else if (!y.air && !y.landed) {
                y.crouch = 0;
                y.air = true;
                y.vy = -760;
            }
            if (y.air) {
                y.vy += 1800 * dt;
                y.y += y.vy * dt;
                if (y.y >= GROUND) {
                    y.y = GROUND;
                    y.air = false;
                    y.landed = true;
                    s.shake = 0.4;
                    const v = 300 * speedUp;
                    L.waves.push({ x: y.x - 50, dir: -1, v }, { x: y.x + 50, dir: 1, v });
                    addParticles(y.x, GROUND, 18, '#ffffff', 160);
                    y.t = 0.45;
                    y.landT = 0;
                }
            }
            if (y.landed) {
                y.landT += dt;
                if (y.landT > 1.1) {
                    y.landed = false;
                    tired(y, 2.0);
                }
            }
        } else if (y.state === 'charge') {
            if (y.t < 0.7) {
                y.roar = 1;
                y.dir = P.x < y.x ? -1 : 1;
            } else {
                y.x += y.dir * 430 * speedUp * dt;
                if (Math.floor(y.t * 8) !== Math.floor((y.t - dt) * 8)) addParticles(y.x - y.dir * 40, GROUND, 2, '#ffffff', 60);
                if (y.x < 90 || y.x > 710) {
                    y.x = Math.max(90, Math.min(710, y.x));
                    s.shake = 0.35;
                    addParticles(y.x + y.dir * 50, GROUND - 60, 14, '#bfe6ff', 140);
                    tired(y, 2.8);
                }
            }
        } else if (y.state === 'tired') {
            y.crouch = 0.35;
            if (y.t > y.tiredFor) {
                y.crouch = 0;
                startAttack(y);
            }
        } else if (y.state === 'hurt') {
            if (y.t > 0.8) startAttack(y);
        } else if (y.state === 'sulk') {
            y.crouch = 0.25;
        }

        // le joueur saute sur la tête quand le yéti reprend son souffle
        const tiredNow = y.state === 'tired';
        if (y.state !== 'sulk' && y.state !== 'intro') {
            if (tiredNow && P.vy > 0 && overlap(pr, head) && P.y < y.y - 104) {
                y.hits += 1;
                y.flash = 0.4;
                P.vy = -680;
                P.jumps = 1;
                addParticles(y.x, head.y, 16, '#ffd36e', 140);
                if (y.hits >= 3) {
                    y.state = 'sulk';
                    y.t = 0;
                    s.phase = 'victory';
                    s.phaseT = 0;
                    L.balls = [];
                    L.waves = [];
                    toast('Aïe ! Bon, d’accord… Ce caillou gelé me donnait mal au crâne.', 'Le yéti', 3.6);
                } else {
                    y.state = 'hurt';
                    y.t = 0;
                    y.roar = 1;
                }
            } else if (overlap(pr, body) || (!tiredNow && overlap(pr, head))) hurt(y.x);
        }

        // boules de neige
        L.balls.forEach((b) => {
            b.vy += 900 * dt;
            b.x += b.vx * dt;
            b.y += b.vy * dt;
            if (b.y >= GROUND - b.r) {
                b.dead = true;
                addParticles(b.x, GROUND - 4, 6, '#ffffff', 80);
            }
            if (overlap(pr, { x: b.x - b.r, y: b.y - b.r, w: b.r * 2, h: b.r * 2 })) {
                b.dead = true;
                hurt(b.x);
            }
        });
        L.balls = L.balls.filter((b) => !b.dead);
        // ondes de choc au sol
        L.waves.forEach((w) => {
            w.x += w.dir * w.v * dt;
            if (w.x < -20 || w.x > W + 20) w.dead = true;
            if (overlap(pr, { x: w.x - 14, y: GROUND - 26, w: 28, h: 26 })) hurt(w.x);
        });
        L.waves = L.waves.filter((w) => !w.dead);
    }

    function tired(y, d) {
        y.state = 'tired';
        y.t = 0;
        y.tiredFor = d;
    }

    // ---------------------------------------------------------------- boucle
    function update(dt) {
        s.t += dt;
        s.phaseT += dt;
        if (s.toast) {
            s.toast.t += dt;
            if (s.toast.t > s.toast.dur) s.toast = null;
        }
        s.shake = Math.max(0, (s.shake || 0) - dt);
        s.particles.forEach((p) => {
            p.t += dt;
            p.vy += 500 * dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
        });
        s.particles = s.particles.filter((p) => p.t < p.life);

        if (s.phase === 'intro' && s.phaseT > 3.2) {
            s.phase = 'card';
            s.phaseT = 0;
        } else if (s.phase === 'card' && s.phaseT > 1.6) {
            s.phase = 'play';
            s.phaseT = 0;
            if (L.def.glide) toast('Maintiens le saut en l’air : l’écharpe de Mamie plane !', 'Mamie Banquise', 3.4);
        } else if (s.phase === 'play') {
            s.time += dt;
            updatePlayer(dt);
            if (s.phase !== 'play') return;
            if (L.boss) updateBoss(dt);
            else updateWorld(dt);
        } else if (s.phase === 'levelEnd') {
            P.vx = 120;
            P.x += P.vx * dt;
            if (s.phaseT > 1.3) {
                if (s.levelIdx < 2) nextLevel();
                else nextLevel(); // vers le boss
            }
        } else if (s.phase === 'victory') {
            updatePlayer(dt);
            const y = L.yeti;
            y.t += dt;
            y.flash = Math.max(0, y.flash - dt);
            if (y.shard && s.phaseT > 1.6) {
                y.shard = false;
                L.shard = { x: y.x, y: y.y - 146, vy: -300, rest: false };
            }
            if (L.shard) {
                const sh = L.shard;
                if (!sh.rest) {
                    sh.vy += 600 * dt;
                    sh.y += sh.vy * dt;
                    sh.x += (400 - sh.x) * Math.min(1, dt * 1.5);
                    if (sh.y > GROUND - 60 && sh.vy > 0) {
                        sh.y = GROUND - 60;
                        sh.rest = true;
                    }
                }
                if (!s.shardGot && Math.abs(sh.x - P.x) < 34 && Math.abs(sh.y - (P.y - 24)) < 50) {
                    s.shardGot = true;
                    s.shardT = 0;
                    toast('Éclat de givre récupéré : 1 / 3', null, 2.4);
                    addParticles(sh.x, sh.y, 24, '#7fe8ff', 160);
                }
            }
            if (s.shardGot) {
                s.shardT += dt;
                if (s.shardT > 2) finish();
            }
        }
        // caméra
        if (L && (s.phase === 'play' || s.phase === 'levelEnd' || s.phase === 'victory')) {
            const target = Math.max(0, Math.min(L.width - W, P.x - 300 + P.face * 50));
            L.camX += (target - L.camX) * Math.min(1, dt * 5);
        }
    }

    // ---------------------------------------------------------------- dessin
    function drawFlocon(ctx) {
        const blink = P.inv > 0 && Math.floor(s.t * 14) % 2 === 0;
        if (blink) ctx.globalAlpha = 0.45;
        if (P.glide) {
            // l'écharpe déployée en planeur
            ctx.fillStyle = '#e94b4b';
            ctx.beginPath();
            const wv = Math.sin(s.t * 12) * 3;
            ctx.moveTo(P.x - 4, P.y - 40);
            ctx.quadraticCurveTo(P.x - 34, P.y - 62 + wv, P.x - 50, P.y - 42);
            ctx.quadraticCurveTo(P.x - 26, P.y - 48, P.x, P.y - 38);
            ctx.quadraticCurveTo(P.x + 26, P.y - 48, P.x + 50, P.y - 42);
            ctx.quadraticCurveTo(P.x + 34, P.y - 62 - wv, P.x + 4, P.y - 40);
            ctx.fill();
        }
        if (P.sliding) {
            drawPenguin(ctx, P.x - P.face * 4, P.y + 2, 44, { facing: P.face, rotate: P.face * 1.35, mood: 'happy', scarf: '#e94b4b', flip: -1.2 });
        } else {
            const run = P.ground && Math.abs(P.vx) > 30;
            const tilt = run ? Math.sin(s.t * 18) * 0.08 : 0;
            ctx.save();
            ctx.translate(P.x, P.y);
            ctx.scale(1 / Math.sqrt(P.squash), P.squash);
            drawPenguin(ctx, 0, run ? -Math.abs(Math.sin(s.t * 18)) * 3 : 0, 50, {
                facing: P.face,
                rotate: tilt,
                scarf: '#e94b4b',
                mood: P.inv > 0.8 ? 'surprised' : 'normal',
                flip: !P.ground ? -1.6 : run ? Math.sin(s.t * 18) * 0.5 : 0,
                look: P.face
            });
            ctx.restore();
        }
        ctx.globalAlpha = 1;
    }

    function drawWorld(ctx) {
        const cam = L.camX;
        const x0 = cam - 60;
        const x1 = cam + W + 60;
        const vis = (o) => o.x + (o.w || 0) > x0 && o.x < x1;
        ctx.save();
        ctx.translate(-Math.round(cam) + (s.shake > 0 ? Math.sin(s.t * 70) * 5 : 0), s.shake > 0 ? Math.cos(s.t * 60) * 3 : 0);
        if (L.theme === 'cave') {
            ctx.fillStyle = '#132a4b';
            ctx.fillRect(x0, -10, x1 - x0, 50);
            L.crystals.forEach((c) => {
                if (c.x < x0 || c.x > x1) return;
                ctx.fillStyle = '#7fe8ff';
                ctx.beginPath();
                ctx.moveTo(c.x - 8, 40);
                ctx.lineTo(c.x, 40 + 26);
                ctx.lineTo(c.x + 8, 40);
                ctx.fill();
            });
        }
        L.ceils.forEach((c) => vis(c) && drawCeiling(ctx, c, L.theme));
        L.blocks.forEach((b) => vis(b) && drawBlock(ctx, b, L.theme));
        L.ground.forEach((g) => vis(g) && drawGround(ctx, g.x, g.w, L.theme));
        L.plats.forEach((p) => {
            if (!vis(p)) return;
            if (p.gone > 0) {
                if (p.fallY < 300) {
                    ctx.globalAlpha = Math.max(0, 1 - p.fallY / 300);
                    drawPlatform(ctx, { ...p, y: p.y + p.fallY }, L.theme, s.t);
                    ctx.globalAlpha = 1;
                }
            } else drawPlatform(ctx, p, L.theme, s.t);
        });
        L.spikes.forEach((sp) => vis(sp) && drawSpikes(ctx, sp));
        L.springs.forEach((sp) => sp.x > x0 && sp.x < x1 && drawSpring(ctx, sp));
        L.signs.forEach((sg) => sg.x > x0 - 200 && sg.x < x1 && drawSign(ctx, sg.x, sg.text, sg.key, L.theme));
        L.flags.forEach((f) => f.x > x0 && f.x < x1 && drawFlag(ctx, f.x, f.name, f.reached, s.t));
        if (!L.boss && L.endX > x0 && L.endX < x1) {
            drawFlag(ctx, L.endX, 'Arrivée', s.phase === 'levelEnd', s.t);
        }
        L.fish.forEach((f) => !f.got && f.x > x0 && f.x < x1 && drawFish(ctx, f.x, f.y, f.gold, s.t));
        L.gifts.forEach((g) => !g.got && g.x > x0 && g.x < x1 && drawGift(ctx, g.x, g.y, s.t));
        L.enemies.forEach((e) => {
            if (e.x < x0 || e.x > x1) return;
            if (e.k === 'snowman') drawSnowman(ctx, e, s.t);
            else if (e.k === 'bat') drawBat(ctx, e, s.t);
            else if (e.k === 'gull' && e.state !== 'wait') drawGull(ctx, e, s.t);
            else if (e.k === 'stal') drawStalactite(ctx, e);
        });
        if (L.boss) {
            drawYeti(ctx, L.yeti, s.t);
            L.balls.forEach((b) => {
                circle(ctx, b.x, b.y, b.r, '#ffffff');
                circle(ctx, b.x - 3, b.y - 3, b.r * 0.4, '#e6f2ff');
            });
            L.waves.forEach((w) => {
                ctx.fillStyle = 'rgba(230,245,255,0.9)';
                ctx.beginPath();
                ctx.moveTo(w.x - 20, GROUND);
                ctx.quadraticCurveTo(w.x, GROUND - 40, w.x + 20, GROUND);
                ctx.fill();
            });
            if (L.shard && !s.shardGot) {
                ctx.globalAlpha = 0.4 + 0.2 * Math.sin(s.t * 6);
                circle(ctx, L.shard.x, L.shard.y, 24, '#7fe8ff');
                ctx.globalAlpha = 1;
                drawShardShape(ctx, L.shard.x, L.shard.y + Math.sin(s.t * 3) * 4, 1.6);
            }
        }
        drawFlocon(ctx);
        s.particles.forEach((p) => {
            ctx.globalAlpha = Math.max(0, 1 - p.t / p.life);
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x - p.r / 2, p.y - p.r / 2, p.r, p.r);
        });
        ctx.globalAlpha = 1;
        ctx.restore();
    }

    function drawDarkness(ctx) {
        mctx.globalCompositeOperation = 'source-over';
        mctx.clearRect(0, 0, mask.width, mask.height);
        mctx.fillStyle = 'rgba(3,8,22,0.9)';
        mctx.fillRect(0, 0, mask.width, mask.height);
        mctx.globalCompositeOperation = 'destination-out';
        const cam = L.camX;
        const light = (x, y, r) => {
            const sx = (x - cam) / 2;
            const sy = y / 2;
            if (sx < -r || sx > mask.width + r) return;
            mctx.drawImage(halo, sx - r, sy - r, r * 2, r * 2);
        };
        light(P.x, P.y - 24, 95 + Math.sin(s.t * 3) * 3);
        L.crystals.forEach((c) => light(c.x, c.y, 55));
        L.fish.forEach((f) => !f.got && f.gold && light(f.x, f.y, 30));
        L.gifts.forEach((g) => !g.got && light(g.x, g.y, 30));
        mctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(mask, 0, 0, W, H);
    }

    function drawHud(ctx) {
        roundRect(ctx, 12, 12, 300, 34, 17);
        ctx.fillStyle = 'rgba(10,14,34,0.62)';
        ctx.fill();
        if (s.tranquil) text(ctx, '∞', 34, 36, { size: 20, weight: 800, font: DISPLAY, color: '#ff8fa8', align: 'center' });
        else for (let i = 0; i < 3; i++) drawHeart(ctx, 30 + i * 22, 30, 1.2, i < s.hearts);
        drawFish(ctx, 112, 29, false, 0);
        text(ctx, `× ${s.fish + s.golds}`, 126, 35, { size: 15, weight: 800, font: DISPLAY });
        const lvl = s.levelIdx < 3 ? `${s.levelIdx + 1} / 3` : 'Boss';
        text(ctx, `${lvl}  ·  ${fmtTime(s.time)}`, 296, 35, { size: 15, weight: 800, font: DISPLAY, color: '#ffd36e', align: 'right' });
        // vent annoncé
        if (L.def.wind) {
            const g = windPlan.find((w) => s.windT >= w.warn && s.windT < w.off);
            if (g) {
                const blowing = s.windT >= g.on;
                roundRect(ctx, W - 160, 12, 148, 34, 17);
                ctx.fillStyle = blowing ? 'rgba(20,40,90,0.85)' : 'rgba(10,14,34,0.62)';
                ctx.fill();
                text(ctx, blowing ? '← Vent fort !' : '← Le vent se lève…', W - 86, 35, { size: 14, weight: 800, align: 'center' });
            }
        }
        if (L.boss && L.yeti) {
            const hp = 1 - L.yeti.hits / 3;
            roundRect(ctx, W / 2 - 120, 56, 240, 28, 14);
            ctx.fillStyle = 'rgba(10,14,34,0.62)';
            ctx.fill();
            text(ctx, 'Le Yéti grognon', W / 2, 75, { size: 12, weight: 700, align: 'center', color: 'rgba(255,255,255,0.85)' });
            roundRect(ctx, W / 2 - 100, 88, 200, 8, 4);
            ctx.fillStyle = 'rgba(255,255,255,0.18)';
            ctx.fill();
            roundRect(ctx, W / 2 - 100, 88, 200 * hp, 8, 4);
            ctx.fillStyle = '#ff5d73';
            ctx.fill();
            if (L.yeti.state === 'tired' && s.phase === 'play') {
                const a = 0.6 + 0.4 * Math.sin(s.t * 8);
                ctx.globalAlpha = a;
                text(ctx, 'Il reprend son souffle : saute sur sa tête !', W / 2, 120, { size: 15, weight: 800, align: 'center', color: '#ffd36e', shadow: true });
                ctx.globalAlpha = 1;
            }
        }
    }

    function drawToast(ctx) {
        const tst = s.toast;
        if (!tst) return;
        const k = Math.min(1, tst.t / 0.25, (tst.dur - tst.t) / 0.3);
        ctx.globalAlpha = Math.max(0, k);
        ctx.font = `600 15px "DM Sans", system-ui, sans-serif`;
        const w = Math.min(560, ctx.measureText(tst.text).width + 40 + (tst.who ? 10 : 0));
        const x = W / 2 - w / 2;
        const y = (L && L.boss ? 132 : 64) + (1 - k) * -10 + (tst.who ? 10 : 0);
        roundRect(ctx, x, y, w, tst.who ? 54 : 40, 14);
        ctx.fillStyle = 'rgba(255,250,240,0.96)';
        ctx.fill();
        if (tst.who) {
            roundRect(ctx, x + 14, y - 11, ctx.measureText(tst.who).width + 22, 22, 11);
            ctx.fillStyle = '#ffd36e';
            ctx.fill();
            text(ctx, tst.who, x + 25, y + 5, { size: 13, weight: 800, color: '#3a2a05' });
        }
        text(ctx, tst.text, W / 2, y + (tst.who ? 34 : 26), { size: 15, weight: 600, color: '#1d2542', align: 'center' });
        ctx.globalAlpha = 1;
    }

    const TOUCH_BTNS = [
        { a: 'left', x: 64, y: 392, r: 34, label: '◀' },
        { a: 'right', x: 150, y: 392, r: 34, label: '▶' },
        { a: 'slide', x: 652, y: 398, r: 30, label: '▼' },
        { a: 'jump', x: 738, y: 376, r: 40, label: '▲' }
    ];

    function drawTouch(ctx) {
        if (!coarse || s.phase !== 'play') return;
        TOUCH_BTNS.forEach((b) => {
            const on = Object.values(s.touch).includes(b.a);
            circle(ctx, b.x, b.y, b.r, on ? 'rgba(255,211,110,0.55)' : 'rgba(10,14,34,0.35)');
            text(ctx, b.label, b.x, b.y + 7, { size: 20, weight: 800, align: 'center', color: 'rgba(255,255,255,0.9)' });
        });
    }

    function drawTitle(ctx) {
        drawBackdrop(ctx, backdrop('boss'), s.t * 20);
        ctx.fillStyle = 'rgba(244,249,255,1)';
        ctx.beginPath();
        ctx.moveTo(0, 400);
        ctx.quadraticCurveTo(400, 360, W, 400);
        ctx.lineTo(W, H);
        ctx.lineTo(0, H);
        ctx.fill();
        text(ctx, 'LES MONTS', W / 2, 96, { size: 26, weight: 800, font: DISPLAY, align: 'center' });
        text(ctx, 'GIVRÉS', W / 2, 160, { size: 72, weight: 800, font: DISPLAY, align: 'center', shadow: true });
        text(ctx, 'La Grande Quête de Flocon · épisode 1', W / 2, 192, { size: 15, weight: 600, align: 'center', color: '#ffd36e' });
        drawPenguin(ctx, W / 2, 392, 70, { scarf: '#e94b4b', mood: 'happy', flip: -2 + Math.sin(s.t * 6) * 0.4 });
        const q = loadQuest();
        const btns = [
            { id: 'play', label: 'Jouer', primary: true, x: W / 2 - 160, y: 236, w: 150, h: 42 },
            { id: 'tranquil', label: 'Mode tranquille', x: W / 2 + 10, y: 236, w: 150, h: 42 }
        ];
        btns.forEach((b) => drawButton(ctx, b, s.hover === b.id));
        s.buttons = btns;
        const dd = day.split('-').reverse().slice(0, 2).join('/');
        text(ctx, `Parcours du ${dd} : le même pour tout le monde aujourd’hui.`, W / 2, 304, { size: 13, weight: 600, align: 'center', color: 'rgba(255,255,255,0.8)' });
        if (q.done[ID]?.score) text(ctx, `Ton meilleur score de quête : ${q.done[ID].score.toLocaleString('fr-FR')}`, W / 2, 324, { size: 13, weight: 700, align: 'center', color: '#7be0a3' });
    }

    function drawIntro(ctx) {
        drawBackdrop(ctx, backdrop('valley'), 0);
        drawGround(ctx, 0, W, 'valley');
        drawPenguin(ctx, 300, 390, 56, { scarf: '#e94b4b', mood: 'happy', facing: 1, look: 1 });
        drawPenguin(ctx, 220, 390, 62, { hat: 'none', scarf: '#b14a7a', mood: 'happy', facing: 1, flip: -1.8 + Math.sin(s.t * 6) * 0.3 });
        circle(ctx, 220, 322, 9, '#e9eef7');
        s.toast = { text: 'File, mon grand ! Et reviens avant le Réveillon.', who: 'Mamie Banquise', t: Math.min(s.phaseT, 2.8), dur: 3.2 };
        drawToast(ctx);
        text(ctx, 'Espace ou clic pour passer', W - 20, 30, { size: 12, weight: 600, align: 'right', color: 'rgba(20,30,60,0.6)' });
    }

    function drawCard(ctx) {
        const name = s.levelIdx < 3 ? `${s.levelIdx + 1} · ${LEVELS[s.levelIdx].name}` : 'Le Yéti grognon';
        const k = Math.min(1, s.phaseT / 0.3, (1.6 - s.phaseT) / 0.3);
        ctx.fillStyle = `rgba(6,10,26,${0.55 * Math.max(0, k)})`;
        ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = Math.max(0, k);
        text(ctx, s.levelIdx < 3 ? 'Niveau' : 'Boss', W / 2, 190, { size: 18, weight: 700, align: 'center', color: '#ffd36e' });
        text(ctx, name, W / 2, 236, { size: 40, weight: 800, font: DISPLAY, align: 'center', shadow: true });
        ctx.globalAlpha = 1;
    }

    function render(ctx) {
        if (s.phase === 'title') {
            drawTitle(ctx);
            return;
        }
        if (s.phase === 'intro') {
            drawIntro(ctx);
            return;
        }
        drawBackdrop(ctx, backdrop(L.theme), L.camX);
        drawWorld(ctx);
        if (L.def.dark) drawDarkness(ctx);
        if (L.theme === 'blizzard') {
            const gust = L.def.wind && windPlan.some((w) => s.windT >= w.on && s.windT < w.off);
            drawScrolling(ctx, snowB, s.snowX * 0.6 + L.camX * -0.4, s.t * 60);
            drawScrolling(ctx, snowA, s.snowX - L.camX * 0.8, s.t * 110);
            if (gust) {
                ctx.fillStyle = 'rgba(255,255,255,0.18)';
                ctx.fillRect(0, 0, W, H);
            }
        }
        drawHud(ctx);
        drawTouch(ctx);
        drawToast(ctx);
        if (s.phase === 'card') drawCard(ctx);
        if (s.phase === 'gameover') {
            ctx.fillStyle = 'rgba(6,10,26,0.66)';
            ctx.fillRect(0, 0, W, H);
            text(ctx, 'Oups !', W / 2, 160, { size: 44, weight: 800, font: DISPLAY, align: 'center' });
            text(ctx, 'Plus de cœurs. On recommence le niveau, ou on y va tranquille ?', W / 2, 196, { size: 15, weight: 600, align: 'center', color: 'rgba(255,255,255,0.85)' });
            const bs = s.overBtns || [];
            const bw = 170;
            const total = bs.length * bw + (bs.length - 1) * 14;
            s.buttons = bs.map((b, i) => ({ ...b, x: W / 2 - total / 2 + i * (bw + 14), y: 236, w: bw, h: 42 }));
            s.buttons.forEach((b) => drawButton(ctx, b, s.hover === b.id));
        }
        if (s.phase === 'results' && s.results) s.buttons = drawResults(ctx, W, H, s.results, s.phaseT, s.hover);
    }

    // ---------------------------------------------------------------- commandes
    function press(id) {
        if (id === 'play') startGame(false);
        else if (id === 'tranquil' && s.phase === 'title') startGame(true);
        else if (id === 'retry') {
            loadLevel(s.levelIdx);
            s.phase = 'card';
            s.phaseT = 0;
        } else if (id === 'tranquil' && s.phase === 'gameover') {
            s.tranquil = true;
            s.hearts = 3;
            P = newPlayer(L.checkpoint);
            P.inv = 1.5;
            s.phase = 'play';
        } else if (id === 'skip') {
            markSkipped(ID);
            if (props.onExit) props.onExit();
            else s.phase = 'title';
        } else if (id === 'replay') {
            s.phase = 'title';
            s.phaseT = 0;
        } else if (id === 'exit') {
            if (props.onExit) props.onExit();
            else s.phase = 'title';
        }
    }

    function touchAt(x, y) {
        const b = TOUCH_BTNS.find((bt) => (x - bt.x) ** 2 + (y - bt.y) ** 2 < (bt.r + 14) ** 2);
        return b ? b.a : null;
    }

    const game = {
        update,
        render,
        canPause: () => s.phase === 'play',
        blur: () => {
            Object.keys(s.keys).forEach((k) => {
                s.keys[k] = false;
            });
            s.touch = {};
        },
        keyDown(code, repeat) {
            const a = keyAction(code);
            if (s.phase === 'intro' && (a === 'jump' || code === 'Enter')) {
                s.phase = 'card';
                s.phaseT = 0;
                return;
            }
            if ((code === 'Enter' || code === 'Space') && !repeat && ['title', 'results', 'gameover'].includes(s.phase)) {
                const primary = (s.buttons || []).find((b) => b.primary);
                if (primary && (s.phase !== 'results' || s.phaseT > 1)) press(primary.id);
                return;
            }
            if (!a) return;
            if (a === 'jump' && !repeat && !s.keys.jump && P) P.buffer = 0.12;
            s.keys[a] = true;
        },
        keyUp(code) {
            const a = keyAction(code);
            if (!a) return;
            s.keys[a] = false;
            if (a === 'jump' && P && P.vy < -320) P.vy *= 0.5; // saut court si on relâche tôt
        },
        pointerDown(x, y, id) {
            if (s.phase === 'intro') {
                s.phase = 'card';
                s.phaseT = 0;
                return;
            }
            if (s.phase === 'play' && coarse) {
                const a = touchAt(x, y);
                if (a) {
                    s.touch[id] = a;
                    if (a === 'jump') P.buffer = 0.12;
                }
                return;
            }
            const b = hitButton(s.buttons, x, y);
            if (b && (s.phase !== 'results' || s.phaseT > 0.8)) press(b.id);
        },
        pointerMove(x, y, id) {
            if (s.phase === 'play' && coarse && s.touch[id]) {
                const a = touchAt(x, y);
                if (a && a !== 'jump') s.touch[id] = a;
                return;
            }
            const b = hitButton(s.buttons, x, y);
            s.hover = b ? b.id : null;
        },
        pointerUp(x, y, id) {
            if (s.touch[id] === 'jump' && P && P.vy < -320) P.vy *= 0.5;
            delete s.touch[id];
        }
    };

    if (__TEST_MODE__) {
        window.monts = {
            s,
            get L() {
                return L;
            },
            get P() {
                return P;
            },
            start: (tranquil = false) => startGame(tranquil),
            level: (i) => {
                if (!L) startGame(false);
                loadLevel(i);
                s.phase = 'play';
            },
            teleport: (x) => {
                P.x = x;
                P.y = GROUND - 200;
                P.vy = 0;
            },
            winBoss: () => {
                loadLevel(3);
                s.phase = 'play';
                L.yeti.hits = 2;
                tired(L.yeti, 5);
            },
            finish,
            game
        };
    }
    return game;
}

export default function MontsGame({ onScore, now, onExit }) {
    // Date figée à l'ouverture : l'horloge du site avance chaque minute, la partie ne doit pas redémarrer
    const [start] = useState(() => now || new Date());
    const exitRef = useRef(onExit);
    exitRef.current = onExit;
    const create = useCallback((api) => createMonts(api, { now: start, onExit: () => exitRef.current && exitRef.current() }), [start]);
    return <GameCanvas pausable fixedStep create={create} onScore={onScore} label="Les Monts Givrés" />;
}
