import GameCanvas from '../GameCanvas';
import { BODY, DISPLAY, TAU, clamp, rand, circle, ellipse, roundRect, text, drawPenguin, drawOverlay } from '../draw';
import { getSprites, drawSprite, ICONS } from './sprites';
import { WORLD, BOUNDS, FIRE, LAKE, IGLOO, buildWorld, onLake, pushOut, hitsObstacle, clampToBounds } from './world';

// L'aventure de Flocon : on explore une carte enneigée pour récupérer les cadeaux de chaque vague,
// en repoussant les monstres de Noël à coups de boules de neige et de canne à sucre. 10 vagues, boss à la fin.
// Tout tourne dans le navigateur (aucun serveur) : compatible Cloudflare Pages en gratuit.

const VW = 960;
const VH = 540;
const MINI_W = 168;
const MINI_H = 112;
const PLAYER_R = 15;
const PLAYER_H = 62;
const AIM_DY = 30; // on vise le corps des monstres, la boule suit le sol : décalage de hauteur
const LAST_WAVE = 10;
const CANE_CD = 6;
const CANE_R = 135;
const CHARGE_TIME = 1;
const SNOW_RANGE = 520;

const waveTarget = (n) => 5 + 2 * n;

const DEFS = {
    bauble: { hp: 10, r: 19, speed: 205, dmg: 5, pts: 5 },
    snowman: { hp: 60, r: 26, speed: 62, dmg: 15, pts: 15, caneMult: 2 },
    elf: { hp: 20, r: 17, speed: 160, dmg: 0, pts: 10 },
    fir: { hp: 40, r: 26, speed: 0, dmg: 0, pts: 20, solid: true },
    icicle: { hp: 12, r: 17, speed: 190, dmg: 8, pts: 10, flying: true },
    boss: { hp: 400, r: 56, speed: 55, dmg: 20, pts: 300, solid: true },
    mini: { hp: 24, r: 18, speed: 105, dmg: 10, pts: 15 }
};

const GIFTS = {
    red: { value: 1, pts: 10, sprite: 'giftRed', mini: '#e94b4b', label: 'rouge' },
    blue: { value: 3, pts: 30, sprite: 'giftBlue', mini: '#3b82f6', label: 'bleu' },
    gold: { value: 5, pts: 60, sprite: 'giftGold', mini: '#ffd36e', label: 'doré' },
    trap: { value: 0, pts: 0, sprite: 'giftTrap', mini: '#7c5cff', label: 'piégé' }
};

const BONUS = {
    cocoa: { label: 'Chocolat chaud : +30 PV', color: '#e94b4b' },
    hat: { label: 'Bonnet magique : bouclier 5 s', color: '#7c5cff' },
    skates: { label: 'Patins : vitesse x1,5 pendant 8 s', color: '#3b82f6' },
    magnet: { label: 'Aimant : les cadeaux viennent à toi 10 s', color: '#e94b4b' }
};

function waveCfg(n) {
    return {
        max: 3 + Math.floor(n * 1.6),
        every: Math.max(0.9, 3 - n * 0.22),
        gifts: Math.min(5, 3 + Math.floor(n / 3)),
        speed: 1 + (n - 1) * 0.035,
        weights: [
            ['bauble', 4],
            ['snowman', n >= 2 ? 3 : 0.6],
            ['elf', n >= 3 ? 2 : 0],
            ['fir', n >= 4 ? 1.4 : 0],
            ['icicle', n >= 5 ? 2.4 : 0]
        ]
    };
}

const easeOutBack = (k) => {
    const c = 1.7;
    return 1 + (c + 1) * (k - 1) ** 3 + c * (k - 1) ** 2;
};

const plural = (n, word) => `${n} ${word}${n > 1 ? 'x' : ''}`;

function createAdventure(api) {
    const sp = getSprites();
    const SPAWN = { x: IGLOO.x + 20, y: IGLOO.y + 84 };
    const world = buildWorld(MINI_W, MINI_H, SPAWN);
    const obstacles = world.obstacles;
    const drawList = [];
    const s = { keys: new Set(), pointer: { x: VW * 0.7, y: VH * 0.5, held: false, used: false } };

    function freshPlayer() {
        return {
            x: SPAWN.x, y: SPAWN.y, vx: 0, vy: 0, hp: 100, facing: 1, walkT: 0, moving: false,
            inv: 0, hurtT: 0, throwT: 0, fireCd: 0, caneCd: 0, caneT: 0, cheerT: 0,
            charging: false, charge: 0, shieldT: 0, speedT: 0, magnetT: 0, puffT: 0, healT: 0
        };
    }

    function reset() {
        const player = freshPlayer();
        Object.assign(s, {
            phase: 'ready', paused: false, t: 0, wave: 1, gifts: 0, target: waveTarget(1), score: 0, kills: 0,
            player, monsters: [], balls: [], cones: [], drops: [], items: [], bonuses: [], parts: [], popups: [],
            rings: [], effects: [], spawnT: 0, giftT: 0, goldDone: false, cfg: waveCfg(1), shake: 0,
            toast: null, toasts: [], banner: null, overT: 0, record: false, boss: null, clearT: 0,
            clearNext: 'wave', winBonus: 0,
            cam: { x: clamp(player.x - VW / 2, 0, WORLD.w - VW), y: clamp(player.y - 40 - VH / 2, 0, WORLD.h - VH) }
        });
    }
    reset();

    // ---------- Petits outils ----------
    const alive = (type) => s.monsters.reduce((n, m) => n + (!m.dead && m.type === type ? 1 : 0), 0);
    const aimWorld = () => ({ x: s.pointer.x + s.cam.x, y: s.pointer.y + s.cam.y });

    function popup(x, y, str, color = '#1d2542', size = 20) {
        s.popups.push({ x, y, str, color, size, t: 0 });
    }

    function toast(str, color = '#2f9e6e') {
        if (!s.toast) s.toast = { str, color, t: 0 };
        else if (s.toasts.length < 3) s.toasts.push({ str, color, t: 0 });
    }

    function banner(title, sub) {
        s.banner = { title, sub, t: 0 };
    }

    function burst(x, y, n, colors, o = {}) {
        const { speed = 160, life = 0.6, r = [2, 4], g = 0, up = 0 } = o;
        for (let i = 0; i < n && s.parts.length < 420; i++) {
            const a = Math.random() * TAU;
            const v = speed * (0.4 + Math.random() * 0.6);
            s.parts.push({
                x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - up, g, t: 0, life: life * (0.7 + Math.random() * 0.5),
                r: rand(r[0], r[1]), color: colors[i % colors.length]
            });
        }
    }

    function freeSpot(r, minFromPlayer, o = {}) {
        const p = s.player;
        for (let i = 0; i < 70; i++) {
            let x;
            let y;
            if (o.lake) {
                const a = Math.random() * TAU;
                const k = Math.sqrt(Math.random()) * 0.78;
                x = LAKE.x + Math.cos(a) * LAKE.rx * k;
                y = LAKE.y + Math.sin(a) * LAKE.ry * k;
            } else {
                x = rand(BOUNDS.x0 + 40, BOUNDS.x1 - 40);
                y = rand(BOUNDS.y0 + 40, BOUNDS.y1 - 40);
            }
            if (Math.hypot(x - p.x, y - p.y) < minFromPlayer) continue;
            if (o.offscreen && x > s.cam.x - 60 && x < s.cam.x + VW + 60 && y > s.cam.y - 90 && y < s.cam.y + VH + 60) continue;
            if (hitsObstacle(x, y, r + 14, obstacles)) continue;
            if (!o.air && !world.reachable(x, y)) continue;
            if (o.noLake && onLake(x, y, 1.1)) continue;
            if (o.noFire && Math.hypot(x - FIRE.x, y - FIRE.y) < FIRE.r + 20) continue;
            if (s.monsters.some((m) => !m.dead && m.solid && Math.hypot(m.x - x, m.y - y) < m.r + r + 24)) continue;
            return { x, y };
        }
        return null;
    }

    function spriteOf(m) {
        if (m.type === 'bauble') return m.red ? sp.baubleRed : sp.bauble;
        if (m.type === 'icicle') return Math.floor(m.t * 12) % 2 ? sp.icicleDown : sp.icicleUp;
        if (m.type === 'boss') return sp.golem;
        if (m.type === 'mini') return sp.golemMini;
        return sp[m.type];
    }

    // ---------- Apparitions ----------
    function aimDiag(m) {
        const p = s.player;
        const sx = p.x >= m.x ? 1 : -1;
        const sy = p.y >= m.y ? 1 : -1;
        m.vx = sx * m.speed * Math.SQRT1_2;
        m.vy = sy * m.speed * Math.SQRT1_2;
    }

    function spawnMonster(type, at) {
        const def = DEFS[type];
        let pos = at;
        if (!pos) {
            pos = type === 'fir'
                ? freeSpot(def.r, 430, { noLake: true, noFire: true })
                : freeSpot(def.r, 480, { offscreen: true, noLake: type === 'elf' });
        }
        if (!pos) pos = freeSpot(def.r, 400, { noLake: type === 'fir' });
        if (!pos) return null;
        const m = {
            type, x: pos.x, y: pos.y, r: def.r, hp: def.hp, maxHp: def.hp, speed: def.speed * s.cfg.speed,
            dmg: def.dmg, solid: !!def.solid, flying: !!def.flying, spawnT: 0.45, flash: 0, frozen: 0,
            kx: 0, ky: 0, vx: 0, vy: 0, t: Math.random() * 10, dead: false, deadT: 0, face: 1, block: null
        };
        if (type === 'bauble') {
            m.reaim = rand(2.5, 4);
            aimDiag(m);
        } else if (type === 'fir') {
            m.aim = Math.random() * TAU;
            m.cd = 1.8;
        } else if (type === 'elf') {
            m.state = 'seek';
            m.carry = null;
            m.grabCd = 0;
        } else if (type === 'icicle') {
            m.state = 'approach';
            m.stateT = rand(1.2, 2.2);
            m.alt = 46;
        } else if (type === 'mini') {
            m.speed = def.speed;
            m.state = 'chase';
            m.stateT = 0;
            m.dashCd = rand(0.8, 1.6);
        } else if (type === 'boss') {
            m.speed = def.speed;
            m.state = 'walk';
            m.stateT = 0;
            m.slamT = 3.5;
            m.rainT = 3;
            m.summonT = 7;
            m.stage = 1;
            m.exposed = false;
            m.spawnT = 0.9;
        }
        s.monsters.push(m);
        burst(m.x, m.y - 16, 10, ['#ffffff', '#dcecfa'], { speed: 120, life: 0.5, r: [3, 6] });
        return m;
    }

    function pickType() {
        const weights = s.cfg.weights.map(([t, w]) => {
            if (t === 'fir' && alive('fir') >= 3) return [t, 0];
            if (t === 'elf' && alive('elf') >= 3) return [t, 0];
            return [t, w];
        });
        const total = weights.reduce((a, [, w]) => a + w, 0);
        let r = Math.random() * total;
        for (const [t, w] of weights) {
            r -= w;
            if (r <= 0) return t;
        }
        return 'bauble';
    }

    function pickGiftKind() {
        const r = Math.random();
        const traps = s.items.filter((g) => g.kind === 'trap').length;
        if (s.wave >= 2 && traps < 2 && r < 0.14) return 'trap';
        if (r < 0.34) return 'blue';
        return 'red';
    }

    function spawnGift(kind) {
        let pos = null;
        if (kind === 'gold') pos = (Math.random() < 0.6 && freeSpot(16, 520, { lake: true })) || freeSpot(16, 650, { noFire: true });
        else pos = freeSpot(16, 260, { noFire: true });
        if (!pos) return null;
        const g = { kind, x: pos.x, y: pos.y, t: Math.random() * 10, born: 0, carrier: null };
        s.items.push(g);
        return g;
    }

    function randomBonus() {
        const r = Math.random();
        if (r < 0.34) return 'cocoa';
        if (r < 0.56) return 'hat';
        if (r < 0.78) return 'skates';
        return 'magnet';
    }

    function spawnBonus(kind, x, y) {
        s.bonuses.push({ kind, x, y, t: 0, life: 16 });
    }

    // ---------- Vagues ----------
    function startGame() {
        reset();
        startWave(1);
    }

    function startWave(n) {
        Object.assign(s, {
            wave: n, gifts: 0, target: waveTarget(n), goldDone: false, cfg: waveCfg(Math.min(n, 9)),
            spawnT: 1.6, giftT: 0, phase: 'play', clearT: 0
        });
        // Les conseils de la vague précédente ne sont plus d'actualité
        s.toast = null;
        s.toasts = [];
        if (n === LAST_WAVE) {
            startBoss();
            return;
        }
        banner(`Vague ${n}`, `Récupère ${s.target} cadeaux`);
        const first = Math.min(3, 1 + Math.floor(n / 2));
        for (let i = 0; i < first; i++) spawnMonster(pickType());
        for (let i = 0; i < s.cfg.gifts; i++) spawnGift(pickGiftKind());
        const pos = freeSpot(16, 220, { noFire: true });
        if (pos) spawnBonus(randomBonus(), pos.x, pos.y);
        if (n === 1) toast('Marche sur les cadeaux pour les récupérer.');
        if (n === 2) {
            toast('Les paquets violets sont piégés : détruis-les à distance.', '#7c5cff');
            toast('Un paquet doré apparaît à mi-vague : suis l’étoile sur la carte.', '#f2b84b');
        }
        if (n === 3) toast('Attention aux lutins : ils volent les cadeaux !');
        if (n === 4) toast('Les sapins grincheux tirent tout droit : prends-les de côté.', '#e94b4b');
        if (n === 5) toast('Les glaçons volants fondent près du feu de camp.', '#3b82f6');
    }

    function startBoss() {
        s.target = 0;
        s.items = [];
        banner('Vague finale', 'Le Golem de givre arrive !');
        const pos = freeSpot(60, 560, { noLake: true, noFire: true }) || { x: 1500, y: 560 };
        s.boss = spawnMonster('boss', pos);
        summonMinis(s.boss, 2);
        toast('Son cœur rose brille après chaque frappe : c’est là qu’il faut viser.', '#ff5fa2');
        toast('Ses mini-golems foncent sur toi : garde la canne à sucre pour eux.', '#3b82f6');
        const cocoa = freeSpot(16, 200, {});
        if (cocoa) spawnBonus('cocoa', cocoa.x, cocoa.y);
    }

    function waveClear() {
        const p = s.player;
        s.phase = 'clear';
        s.clearT = 0;
        s.clearNext = 'wave';
        p.hp = Math.min(100, p.hp + 20);
        p.cheerT = 1.2;
        const bonus = 25 * s.wave;
        s.score += bonus;
        banner(`Vague ${s.wave} terminée !`, `+20 PV · +${bonus} points`);
        for (const m of s.monsters) {
            if (m.dead) continue;
            m.dead = true;
            m.deadT = 0;
            burst(m.x, m.y - 20, 8, ['#ffffff', '#dcecfa'], { speed: 120, r: [3, 6] });
        }
        for (const g of s.items) burst(g.x, g.y - 14, 6, ['#ffd36e', '#ffffff'], { speed: 90 });
        s.items = [];
        s.cones = [];
        s.drops = [];
    }

    function bossDefeated(m) {
        s.phase = 'clear';
        s.clearT = 0;
        s.clearNext = 'win';
        s.boss = null;
        s.shake = 0.6;
        s.player.cheerT = 3;
        banner('Le Golem est vaincu !', 'Noël est sauvé');
        burst(m.x, m.y - 50, 60, ['#9fd8ff', '#ffffff', '#ff5fa2', '#ffd36e'], { speed: 360, life: 1.1, r: [3, 7], g: 260 });
        for (const o of s.monsters) {
            if (!o.dead) {
                o.dead = true;
                o.deadT = 0;
            }
        }
        s.drops = [];
        s.cones = [];
    }

    function finishWin() {
        const p = s.player;
        s.phase = 'win';
        s.overT = 0;
        s.winBonus = 500 + Math.round(p.hp) * 3;
        s.score += s.winBonus;
        s.record = api.reportScore(s.score);
        burst(p.x, p.y - 60, 70, ['#ff5fa2', '#ffd36e', '#3b82f6', '#6ee7b7', '#ffffff'], { speed: 320, life: 1.4, g: 240, up: 120 });
    }

    function gameOver() {
        s.phase = 'over';
        s.overT = 0;
        s.record = api.reportScore(s.score);
    }

    // ---------- Combat ----------
    function throwBall(kind) {
        const p = s.player;
        const aim = aimWorld();
        let dx = aim.x - p.x;
        let dy = aim.y + AIM_DY - p.y;
        const d = Math.hypot(dx, dy) || 1;
        dx /= d;
        dy /= d;
        const ice = kind === 'ice';
        const speed = ice ? 560 : 640;
        const range = ice ? 560 : SNOW_RANGE;
        s.balls.push({ kind, x: p.x + dx * 16, y: p.y + dy * 8, vx: dx * speed, vy: dy * speed, t: 0, life: range / speed, dmg: ice ? 30 : 10 });
        p.throwT = 0.22;
        p.fireCd = 0.22;
        p.facing = dx >= 0 ? 1 : -1;
    }

    function cane() {
        const p = s.player;
        if (p.caneCd > 0) return;
        p.caneCd = CANE_CD;
        p.caneT = 0.5;
        s.shake = Math.max(s.shake, 0.12);
        s.rings.push({ x: p.x, y: p.y, t: 0, T: 0.45, r: CANE_R, color: '255, 95, 162' });
        for (const m of s.monsters) {
            if (m.dead) continue;
            const dx = m.x - p.x;
            const dy = m.y - p.y;
            const d = Math.hypot(dx, dy) || 1;
            if (d < CANE_R + m.r * 0.6) hitMonster(m, 25, { cane: true, kx: (dx / d) * 300, ky: (dy / d) * 300 });
        }
        for (let i = s.items.length - 1; i >= 0; i--) {
            const g = s.items[i];
            if (g.kind === 'trap' && !g.carrier && Math.hypot(g.x - p.x, g.y - p.y) < CANE_R) destroyTrap(i);
        }
    }

    function hurtPlayer(dmg, fx, fy) {
        const p = s.player;
        if (s.phase !== 'play' || p.inv > 0) return false;
        if (p.shieldT > 0) {
            p.inv = 0.5;
            popup(p.x, p.y - 74, 'Bloqué !', '#7c5cff', 18);
            burst(p.x, p.y - 30, 10, ['#b9a6ff', '#ffffff'], { speed: 140 });
            return false;
        }
        p.hp -= dmg;
        p.inv = 0.9;
        p.hurtT = 0.3;
        s.shake = Math.max(s.shake, 0.25);
        const dx = p.x - fx;
        const dy = p.y - fy;
        const d = Math.hypot(dx, dy) || 1;
        p.vx += (dx / d) * 300;
        p.vy += (dy / d) * 300;
        popup(p.x, p.y - 76, `-${dmg}`, '#e94b4b', 22);
        if (p.hp <= 0) {
            p.hp = 0;
            gameOver();
        }
        return true;
    }

    function dropGift(m) {
        const g = m.carry;
        if (!g) return;
        g.carrier = null;
        g.x = m.x + m.face * 12;
        g.y = m.y + 8;
        g.born = 0;
        m.carry = null;
        m.state = 'seek';
        m.grabCd = 2;
        popup(g.x, g.y - 40, 'Paquet lâché !', '#2f9e6e', 16);
    }

    function hitMonster(m, dmg, o = {}) {
        if (m.dead || m.spawnT > 0) return false;
        let real = dmg;
        let blocked = false;
        if (m.type === 'boss' && !m.exposed) {
            real = Math.max(1, Math.round(dmg * 0.25));
            blocked = true;
        }
        if (o.cane && DEFS[m.type].caneMult) real *= DEFS[m.type].caneMult;
        m.hp -= real;
        m.flash = 0.15;
        if (o.freeze) m.frozen = m.type === 'boss' ? 0.6 : 2;
        if (o.kx != null && !m.solid) {
            m.kx = o.kx;
            m.ky = o.ky;
        }
        if (m.carry) dropGift(m);
        const top = spriteOf(m).ay;
        popup(m.x + rand(-8, 8), m.y - top - 6, `-${real}`, blocked ? '#8a94a8' : '#f2a33a', blocked ? 15 : 21);
        if (m.hp <= 0) killMonster(m);
        return true;
    }

    function killMonster(m) {
        m.dead = true;
        m.deadT = 0;
        m.hp = 0;
        if (m.carry) dropGift(m);
        s.score += DEFS[m.type].pts;
        s.kills++;
        burst(m.x, m.y - spriteOf(m).ay * 0.5, 14, ['#ffffff', '#e3f0fb', '#cfe0f2'], { speed: 190, life: 0.6, r: [3, 6] });
        if (m.type === 'boss') {
            bossDefeated(m);
            return;
        }
        if (Math.random() < 0.1) spawnBonus(randomBonus(), m.x, m.y);
    }

    function destroyTrap(i) {
        const g = s.items[i];
        s.items.splice(i, 1);
        s.score += 5;
        s.effects.push({ x: g.x, y: g.y, t: 0 });
        popup(g.x, g.y - 44, 'Piège déjoué +5', '#7c5cff', 16);
        burst(g.x, g.y - 14, 10, ['#9b82ff', '#6ee7b7', '#ffffff'], { speed: 140 });
    }

    function collect(g) {
        const p = s.player;
        if (g.kind === 'trap') {
            s.effects.push({ x: g.x, y: g.y, t: 0 });
            popup(g.x, g.y - 46, 'Piège !', '#7c5cff', 20);
            hurtPlayer(10, g.x, g.y);
            return;
        }
        const def = GIFTS[g.kind];
        s.gifts += def.value;
        s.score += def.pts;
        p.cheerT = 0.45;
        popup(g.x, g.y - 44, `+${plural(def.value, 'cadeau')}`, g.kind === 'gold' ? '#e0a020' : '#2f9e6e', g.kind === 'gold' ? 24 : 18);
        burst(g.x, g.y - 16, g.kind === 'gold' ? 34 : 14, ['#ff5fa2', '#ffd36e', '#3b82f6', '#6ee7b7'], { speed: 200, life: 0.8, g: 200, up: 80 });
        if (s.wave < LAST_WAVE && s.gifts >= s.target) waveClear();
    }

    // ---------- Mise à jour ----------
    function moveToward(m, tx, ty, speed, dt) {
        let dx = tx - m.x;
        let dy = ty - m.y;
        const d = Math.hypot(dx, dy);
        if (d < 1) return d;
        dx /= d;
        dy /= d;
        if (m.block) {
            // Contourne l'obstacle touché à l'image précédente
            let ux = -m.block.y;
            let uy = m.block.x;
            if (ux * dx + uy * dy < 0) {
                ux = -ux;
                uy = -uy;
            }
            dx = dx * 0.4 + ux * 0.9;
            dy = dy * 0.4 + uy * 0.9;
            const l = Math.hypot(dx, dy) || 1;
            dx /= l;
            dy /= l;
        }
        m.x += dx * speed * dt;
        m.y += dy * speed * dt;
        m.vx = dx * speed;
        m.vy = dy * speed;
        return d;
    }

    function nearestEdge(m) {
        const opts = [
            { x: BOUNDS.x0 + 4, y: m.y, d: m.x - BOUNDS.x0 },
            { x: BOUNDS.x1 - 4, y: m.y, d: BOUNDS.x1 - m.x },
            { x: m.x, y: BOUNDS.y0 + 4, d: m.y - BOUNDS.y0 },
            { x: m.x, y: BOUNDS.y1 - 4, d: BOUNDS.y1 - m.y }
        ];
        return opts.reduce((a, b) => (b.d < a.d ? b : a));
    }

    const AI = {
        bauble(m, dt) {
            m.x += m.vx * dt;
            m.y += m.vy * dt;
            if (m.x < BOUNDS.x0 + m.r) { m.x = BOUNDS.x0 + m.r; m.vx = Math.abs(m.vx); }
            if (m.x > BOUNDS.x1 - m.r) { m.x = BOUNDS.x1 - m.r; m.vx = -Math.abs(m.vx); }
            if (m.y < BOUNDS.y0 + m.r) { m.y = BOUNDS.y0 + m.r; m.vy = Math.abs(m.vy); }
            if (m.y > BOUNDS.y1 - m.r) { m.y = BOUNDS.y1 - m.r; m.vy = -Math.abs(m.vy); }
            const n = pushOut(m, m.r, obstacles);
            if (n) {
                const dot = m.vx * n.x + m.vy * n.y;
                if (dot < 0) {
                    m.vx -= 2 * dot * n.x;
                    m.vy -= 2 * dot * n.y;
                }
            }
            m.reaim -= dt;
            if (m.reaim <= 0) {
                aimDiag(m);
                m.reaim = rand(2.5, 4);
            }
            m.face = m.vx >= 0 ? 1 : -1;
        },
        snowman(m, dt) {
            const p = s.player;
            moveToward(m, p.x, p.y, m.speed, dt);
            m.face = p.x >= m.x ? 1 : -1;
        },
        elf(m, dt) {
            const p = s.player;
            if (m.state === 'seek') {
                m.grabCd -= dt;
                let best = null;
                let bd = Infinity;
                if (m.grabCd <= 0) {
                    for (const g of s.items) {
                        if (g.carrier || g.kind === 'trap') continue;
                        const d = Math.hypot(g.x - m.x, g.y - m.y);
                        if (d < bd) {
                            bd = d;
                            best = g;
                        }
                    }
                }
                if (best) {
                    const d = moveToward(m, best.x, best.y, m.speed, dt);
                    if (d < 18) {
                        best.carrier = m;
                        m.carry = best;
                        m.state = 'flee';
                        const e = nearestEdge(m);
                        m.ex = e.x;
                        m.ey = e.y;
                        toast(`Un lutin a volé un paquet ${GIFTS[best.kind].label} ! Touche-le pour le récupérer.`);
                    }
                } else {
                    const a = m.t * 0.7;
                    moveToward(m, p.x + Math.cos(a) * 260, p.y + Math.sin(a) * 200, m.speed * 0.7, dt);
                }
            } else {
                const d = moveToward(m, m.ex, m.ey, m.speed * 1.12, dt);
                if (d < 26) {
                    const i = s.items.indexOf(m.carry);
                    if (i >= 0) s.items.splice(i, 1);
                    m.carry = null;
                    m.dead = true;
                    m.deadT = 0.15;
                    popup(m.x, m.y - 60, 'Envolé…', '#8a94a8', 16);
                }
            }
            m.face = m.vx >= 0 ? 1 : -1;
        },
        fir(m, dt) {
            const p = s.player;
            const ang = Math.atan2(p.y - m.y, p.x - m.x);
            let diff = ang - m.aim;
            diff = ((((diff + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
            const turn = 1.1 * dt;
            m.aim += clamp(diff, -turn, turn);
            m.diff = Math.abs(diff);
            m.cd -= dt;
            m.dist = Math.hypot(p.x - m.x, p.y - m.y);
            if (m.cd <= 0 && m.diff < 0.12 && m.dist < 500) {
                const cx = Math.cos(m.aim);
                const cy = Math.sin(m.aim);
                s.cones.push({ x: m.x + cx * (m.r + 10), y: m.y + cy * (m.r + 10), vx: cx * 300, vy: cy * 300, t: 0, life: 1.9, rot: 0 });
                m.cd = 2;
            }
        },
        icicle(m, dt) {
            const p = s.player;
            if (m.state === 'approach') {
                const a = Math.atan2(m.y - p.y, m.x - p.x) + 0.7 * dt;
                const tx = p.x + Math.cos(a) * 210;
                const ty = p.y + Math.sin(a) * 170;
                const dx = tx - m.x;
                const dy = ty - m.y;
                const d = Math.hypot(dx, dy);
                if (d > 4) {
                    const v = Math.min(m.speed, d * 3);
                    m.x += (dx / d) * v * dt;
                    m.y += (dy / d) * v * dt;
                    m.vx = (dx / d) * v;
                }
                m.alt += (46 - m.alt) * (1 - Math.exp(-4 * dt));
                m.stateT -= dt;
                if (m.stateT <= 0) {
                    m.state = 'windup';
                    m.stateT = 0.5;
                }
            } else if (m.state === 'windup') {
                m.stateT -= dt;
                if (m.stateT <= 0) {
                    const dx = p.x - m.x;
                    const dy = p.y - m.y;
                    const d = Math.hypot(dx, dy) || 1;
                    m.vx = (dx / d) * 520;
                    m.vy = (dy / d) * 520;
                    m.state = 'dive';
                    m.stateT = 0.7;
                }
            } else if (m.state === 'dive') {
                m.x += m.vx * dt;
                m.y += m.vy * dt;
                m.alt += (10 - m.alt) * (1 - Math.exp(-10 * dt));
                m.stateT -= dt;
                if (m.stateT <= 0) {
                    m.state = 'recover';
                    m.stateT = 0.6;
                }
            } else {
                m.alt += (46 - m.alt) * (1 - Math.exp(-3 * dt));
                m.stateT -= dt;
                if (m.stateT <= 0) {
                    m.state = 'approach';
                    m.stateT = rand(1.4, 2.4);
                }
            }
            clampToBounds(m);
            if (Math.hypot(m.x - FIRE.x, m.y - FIRE.y) < FIRE.r + 40) {
                m.hp -= 18 * dt;
                if (Math.random() < dt * 12) s.parts.push({ x: m.x + rand(-6, 6), y: m.y - m.alt - 4, vx: 0, vy: 60, g: 200, t: 0, life: 0.5, r: 2.5, color: '#7fc3f0' });
                if (m.hp <= 0) {
                    popup(m.x, m.y - m.alt - 50, 'Fondu !', '#3b82f6', 16);
                    killMonster(m);
                }
            }
        },
        boss(m, dt) {
            const p = s.player;
            const ratio = m.hp / m.maxHp;
            const stage = ratio > 0.66 ? 1 : ratio > 0.33 ? 2 : 3;
            if (stage > m.stage) {
                m.stage = stage;
                toast(stage === 2 ? 'Le golem s’énerve : pluie de glaçons !' : 'Le golem appelle encore plus de renforts !', '#ff5fa2');
                const pos = freeSpot(16, 180, {});
                if (pos) spawnBonus('cocoa', pos.x, pos.y);
            }
            const d = Math.hypot(p.x - m.x, p.y - m.y);
            if (m.state === 'walk') {
                moveToward(m, p.x, p.y, stage === 3 ? 72 : m.speed, dt);
                m.face = p.x >= m.x ? 1 : -1;
                m.slamT -= dt;
                if (m.slamT <= 0 || (d < 175 && m.slamT < 2.6)) {
                    m.state = 'windup';
                    m.stateT = 0.95;
                }
            } else if (m.state === 'windup') {
                m.stateT -= dt;
                if (m.stateT <= 0) {
                    if (d < 160) hurtPlayer(30, m.x, m.y);
                    s.shake = Math.max(s.shake, 0.45);
                    s.rings.push({ x: m.x, y: m.y, t: 0, T: 0.5, r: 190, color: '159, 216, 255' });
                    burst(m.x, m.y, 26, ['#9fd8ff', '#ffffff', '#cfeaff'], { speed: 300, life: 0.7, r: [3, 6] });
                    m.state = 'exposed';
                    m.stateT = 2.6;
                    m.exposed = true;
                }
            } else {
                m.stateT -= dt;
                if (m.stateT <= 0) {
                    m.state = 'walk';
                    m.exposed = false;
                    m.slamT = stage === 3 ? 3.4 : 4.4;
                }
            }
            if (stage >= 2) {
                m.rainT -= dt;
                if (m.rainT <= 0) {
                    m.rainT = 4.2;
                    s.drops.push({ x: p.x, y: p.y, t: 0, T: 1 });
                    for (let i = 0; i < 6; i++) {
                        const a = Math.random() * TAU;
                        const r = rand(70, 260);
                        const pt = { x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r * 0.8 };
                        clampToBounds(pt);
                        s.drops.push({ x: pt.x, y: pt.y, t: -i * 0.12, T: 1 });
                    }
                }
            }
            // Renforts : des mini-golems qui foncent au contact, plus nombreux à chaque phase
            m.summonT -= dt;
            if (m.summonT <= 0) {
                m.summonT = [0, 9, 8, 6.5][stage];
                const cap = stage === 3 ? 6 : 4;
                summonMinis(m, Math.min(stage === 3 ? 3 : 2, cap - alive('mini')));
            }
        },
        mini(m, dt) {
            const p = s.player;
            const d = Math.hypot(p.x - m.x, p.y - m.y);
            m.face = p.x >= m.x ? 1 : -1;
            if (m.state === 'chase') {
                moveToward(m, p.x, p.y, m.speed, dt);
                m.dashCd -= dt;
                if (d < 180 && m.dashCd <= 0) {
                    m.state = 'windup';
                    m.stateT = 0.35;
                }
            } else if (m.state === 'windup') {
                m.stateT -= dt;
                if (m.stateT <= 0) {
                    const dd = d || 1;
                    m.dx = (p.x - m.x) / dd;
                    m.dy = (p.y - m.y) / dd;
                    m.state = 'dash';
                    m.stateT = 0.42;
                }
            } else {
                m.x += m.dx * 400 * dt;
                m.y += m.dy * 400 * dt;
                m.vx = m.dx * 400;
                if (Math.random() < dt * 30) s.parts.push({ x: m.x + rand(-8, 8), y: m.y, vx: 0, vy: -20, g: 0, t: 0, life: 0.35, r: 3, color: '#cfeaff' });
                m.stateT -= dt;
                if (m.stateT <= 0) {
                    m.state = 'chase';
                    m.dashCd = rand(1.4, 2.2);
                }
            }
        }
    };

    function summonMinis(boss, n) {
        for (let i = 0; i < n; i++) {
            const a = Math.random() * TAU;
            const pt = { x: boss.x + Math.cos(a) * 110, y: boss.y + Math.sin(a) * 85 };
            clampToBounds(pt, 20);
            if (hitsObstacle(pt.x, pt.y, 30, obstacles)) continue;
            spawnMonster('mini', pt);
        }
    }

    function updatePlayer(dt) {
        const p = s.player;
        const k = s.keys;
        let ix = 0;
        let iy = 0;
        if (k.has('ArrowLeft') || k.has('KeyA')) ix -= 1;
        if (k.has('ArrowRight') || k.has('KeyD')) ix += 1;
        if (k.has('ArrowUp') || k.has('KeyW')) iy -= 1;
        if (k.has('ArrowDown') || k.has('KeyS')) iy += 1;
        if (s.phase === 'over' || s.phase === 'win') {
            ix = 0;
            iy = 0;
        }
        const len = Math.hypot(ix, iy);
        if (len > 0) {
            ix /= len;
            iy /= len;
        }
        const ice = onLake(p.x, p.y);
        let speed = 215;
        if (p.speedT > 0) speed *= 1.45;
        if (p.charging && p.charge > 0.15) speed *= 0.72;
        const f = 1 - Math.exp(-(ice ? 1.8 : 14) * dt);
        p.vx += (ix * speed - p.vx) * f;
        p.vy += (iy * speed - p.vy) * f;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        pushOut(p, PLAYER_R, obstacles);
        for (const m of s.monsters) {
            if (m.solid && !m.dead && m.spawnT <= 0) pushOut(p, PLAYER_R, [m]);
        }
        clampToBounds(p);
        const v = Math.hypot(p.vx, p.vy);
        p.moving = v > 40;
        if (p.moving) p.walkT += dt * (ice ? 5 : 11);
        if (s.pointer.used) p.facing = s.pointer.x + s.cam.x >= p.x ? 1 : -1;
        else if (Math.abs(p.vx) > 20) p.facing = p.vx > 0 ? 1 : -1;

        p.inv = Math.max(0, p.inv - dt);
        p.hurtT = Math.max(0, p.hurtT - dt);
        p.throwT = Math.max(0, p.throwT - dt);
        p.fireCd = Math.max(0, p.fireCd - dt);
        p.caneCd = Math.max(0, p.caneCd - dt);
        p.caneT = Math.max(0, p.caneT - dt);
        p.cheerT = Math.max(0, p.cheerT - dt);
        p.shieldT = Math.max(0, p.shieldT - dt);
        p.speedT = Math.max(0, p.speedT - dt);
        p.magnetT = Math.max(0, p.magnetT - dt);

        if (s.pointer.held) {
            p.charging = true;
            p.charge = Math.min(1.25, p.charge + dt);
        } else {
            p.charging = false;
            p.charge = 0;
        }

        // Traces dans la neige, étincelles sur la glace
        p.puffT -= dt;
        if (p.moving && p.puffT <= 0) {
            p.puffT = ice ? 0.05 : 0.09;
            s.parts.push({
                x: p.x - p.vx * 0.04 + rand(-6, 6), y: p.y + 2, vx: rand(-20, 20), vy: rand(-30, -10), g: 0,
                t: 0, life: ice ? 0.35 : 0.5, r: ice ? 2 : rand(3, 5), color: ice ? '#ffffff' : 'rgba(255,255,255,0.95)'
            });
        }

        // Le feu de camp soigne doucement
        if (Math.hypot(p.x - FIRE.x, p.y - FIRE.y) < FIRE.r && p.hp < 100 && s.phase !== 'over') {
            p.hp = Math.min(100, p.hp + 6 * dt);
            p.healT -= dt;
            if (p.healT <= 0) {
                p.healT = 0.45;
                popup(p.x + rand(-14, 14), p.y - 70, '+', '#2f9e6e', 20);
            }
        }
    }

    function updateMonsters(dt) {
        const p = s.player;
        for (let i = s.monsters.length - 1; i >= 0; i--) {
            const m = s.monsters[i];
            m.t += dt;
            if (m.dead) {
                m.deadT += dt;
                if (m.deadT > 0.5) s.monsters.splice(i, 1);
                continue;
            }
            if (s.phase !== 'play') continue;
            if (m.spawnT > 0) {
                m.spawnT -= dt;
                continue;
            }
            m.flash = Math.max(0, m.flash - dt);
            if (m.kx || m.ky) {
                m.x += m.kx * dt;
                m.y += m.ky * dt;
                const k = Math.exp(-7 * dt);
                m.kx *= k;
                m.ky *= k;
                if (Math.abs(m.kx) + Math.abs(m.ky) < 6) {
                    m.kx = 0;
                    m.ky = 0;
                }
            }
            if (m.frozen > 0) m.frozen -= dt;
            else AI[m.type](m, dt);
            if (m.dead) continue;
            if (!m.flying && m.type !== 'bauble') {
                m.block = pushOut(m, m.r, obstacles);
                clampToBounds(m, 4);
            }
            const d = Math.hypot(m.x - p.x, m.y - p.y);
            if (m.type === 'elf' && m.carry && d < m.r + PLAYER_R) {
                dropGift(m);
                m.kx = ((m.x - p.x) / (d || 1)) * 260;
                m.ky = ((m.y - p.y) / (d || 1)) * 260;
            }
            if (m.dmg > 0 && !(m.flying && m.alt > 26) && d < m.r + PLAYER_R - 3) hurtPlayer(m.dmg, m.x, m.y);
        }
        // Les monstres au sol ne se marchent pas dessus
        const ms = s.monsters;
        for (let i = 0; i < ms.length; i++) {
            const a = ms[i];
            if (a.dead || a.flying) continue;
            for (let j = i + 1; j < ms.length; j++) {
                const b = ms[j];
                if (b.dead || b.flying || (a.solid && b.solid)) continue;
                const dx = b.x - a.x;
                const dy = b.y - a.y;
                const min = a.r + b.r;
                const d2 = dx * dx + dy * dy;
                if (d2 >= min * min || d2 < 0.01) continue;
                const d = Math.sqrt(d2);
                const push = (min - d) / (a.solid || b.solid ? 1 : 2);
                const nx = dx / d;
                const ny = dy / d;
                if (!a.solid) {
                    a.x -= nx * push;
                    a.y -= ny * push;
                }
                if (!b.solid) {
                    b.x += nx * push;
                    b.y += ny * push;
                }
            }
        }
    }

    function spawning(dt) {
        if (s.wave >= LAST_WAVE) return;
        s.spawnT -= dt;
        const count = s.monsters.reduce((n, m) => n + (m.dead ? 0 : 1), 0);
        if (s.spawnT <= 0) {
            if (count < s.cfg.max) spawnMonster(pickType());
            s.spawnT = s.cfg.every * rand(0.7, 1.3);
        }
        s.giftT -= dt;
        const real = s.items.reduce((n, g) => n + (g.kind === 'red' || g.kind === 'blue' ? 1 : 0), 0);
        if (real < s.cfg.gifts && s.giftT <= 0) {
            spawnGift(pickGiftKind());
            s.giftT = 0.9;
        }
        if (!s.goldDone && s.wave >= 2 && s.gifts >= s.target * 0.5) {
            if (spawnGift('gold')) {
                s.goldDone = true;
                toast('Un paquet doré est apparu : suis l’étoile sur la mini-carte !', '#f2b84b');
            }
        }
    }

    function updateBalls(dt) {
        for (let i = s.balls.length - 1; i >= 0; i--) {
            const b = s.balls[i];
            b.t += dt;
            b.x += b.vx * dt;
            b.y += b.vy * dt;
            let done = false;
            let big = false;
            for (const m of s.monsters) {
                if (m.dead || m.spawnT > 0) continue;
                const rr = m.r + (b.kind === 'ice' ? 12 : 9);
                const dx = m.x - b.x;
                const dy = m.y - b.y;
                if (dx * dx + dy * dy < rr * rr) {
                    hitMonster(m, b.dmg, { freeze: b.kind === 'ice', kx: b.vx * 0.35, ky: b.vy * 0.35 });
                    done = true;
                    big = true;
                    break;
                }
            }
            if (!done) {
                for (let j = s.items.length - 1; j >= 0; j--) {
                    const g = s.items[j];
                    if (g.kind === 'trap' && !g.carrier && Math.hypot(g.x - b.x, g.y - b.y) < 22) {
                        destroyTrap(j);
                        done = true;
                        break;
                    }
                }
            }
            if (!done && hitsObstacle(b.x, b.y, 4, obstacles)) done = true;
            if (!done && b.t >= b.life) done = true;
            if (done) {
                const h = 30 + Math.sin(Math.PI * Math.min(1, b.t / b.life)) * 14;
                const colors = b.kind === 'ice' ? ['#9fd8ff', '#ffffff', '#cfeaff'] : ['#ffffff', '#e8f1fb'];
                burst(b.x, b.y - h, big ? 10 : 6, colors, { speed: big ? 150 : 90, life: 0.45, r: [2, 4], g: 300 });
                s.balls.splice(i, 1);
            }
        }
    }

    function updateCones(dt) {
        const p = s.player;
        for (let i = s.cones.length - 1; i >= 0; i--) {
            const c = s.cones[i];
            c.t += dt;
            c.x += c.vx * dt;
            c.y += c.vy * dt;
            c.rot += dt * 8;
            let done = c.t >= c.life || !!hitsObstacle(c.x, c.y, 4, obstacles);
            if (!done && Math.hypot(c.x - p.x, c.y - p.y) < PLAYER_R + 8) {
                hurtPlayer(10, c.x - c.vx, c.y - c.vy);
                done = true;
            }
            if (done) {
                burst(c.x, c.y - 26, 6, ['#a0714f', '#7a5238'], { speed: 90, life: 0.4, g: 300 });
                s.cones.splice(i, 1);
            }
        }
    }

    function updateDrops(dt) {
        const p = s.player;
        for (let i = s.drops.length - 1; i >= 0; i--) {
            const d = s.drops[i];
            d.t += dt;
            if (!d.hit && d.t >= d.T) {
                d.hit = true;
                if (Math.hypot(p.x - d.x, p.y - d.y) < 40) hurtPlayer(15, d.x, d.y);
                burst(d.x, d.y - 6, 10, ['#9fd8ff', '#ffffff'], { speed: 160, life: 0.5, g: 300, up: 60 });
            }
            if (d.t > d.T + 0.3) s.drops.splice(i, 1);
        }
    }

    function updateItems(dt) {
        const p = s.player;
        for (let i = s.items.length - 1; i >= 0; i--) {
            const g = s.items[i];
            g.t += dt;
            g.born += dt;
            if (g.carrier) {
                g.x = g.carrier.x;
                g.y = g.carrier.y;
                continue;
            }
            const d = Math.hypot(p.x - g.x, p.y - g.y);
            if (p.magnetT > 0 && g.kind !== 'trap' && d < 260 && d > 1) {
                const v = Math.min(d, 340 * dt);
                g.x += ((p.x - g.x) / d) * v;
                g.y += ((p.y - g.y) / d) * v;
            }
            if (s.phase === 'play' && d < 30) {
                s.items.splice(i, 1);
                collect(g);
                if (s.phase !== 'play') break;
            }
        }
    }

    function updateBonuses(dt) {
        const p = s.player;
        for (let i = s.bonuses.length - 1; i >= 0; i--) {
            const b = s.bonuses[i];
            b.t += dt;
            if (b.t > b.life) {
                s.bonuses.splice(i, 1);
                continue;
            }
            if ((s.phase === 'play' || s.phase === 'clear') && Math.hypot(p.x - b.x, p.y - b.y) < 30) {
                s.bonuses.splice(i, 1);
                if (b.kind === 'cocoa') p.hp = Math.min(100, p.hp + 30);
                if (b.kind === 'hat') p.shieldT = 5;
                if (b.kind === 'skates') p.speedT = 8;
                if (b.kind === 'magnet') p.magnetT = 10;
                toast(BONUS[b.kind].label, BONUS[b.kind].color);
                burst(b.x, b.y - 18, 14, [BONUS[b.kind].color, '#ffffff', '#ffd36e'], { speed: 160 });
            }
        }
    }

    function updateFx(dt) {
        for (let i = s.parts.length - 1; i >= 0; i--) {
            const q = s.parts[i];
            q.t += dt;
            if (q.t > q.life) {
                s.parts.splice(i, 1);
                continue;
            }
            q.vy += q.g * dt;
            q.x += q.vx * dt;
            q.y += q.vy * dt;
        }
        for (let i = s.popups.length - 1; i >= 0; i--) {
            const q = s.popups[i];
            q.t += dt;
            q.y -= 34 * dt;
            if (q.t > 1) s.popups.splice(i, 1);
        }
        for (let i = s.rings.length - 1; i >= 0; i--) {
            s.rings[i].t += dt;
            if (s.rings[i].t > s.rings[i].T) s.rings.splice(i, 1);
        }
        for (let i = s.effects.length - 1; i >= 0; i--) {
            s.effects[i].t += dt;
            if (s.effects[i].t > 0.7) s.effects.splice(i, 1);
        }
        if (s.toast) {
            s.toast.t += dt;
            if (s.toast.t > 3.4) s.toast = s.toasts.shift() || null;
        }
        if (s.banner) {
            s.banner.t += dt;
            if (s.banner.t > 2.4) s.banner = null;
        }
    }

    function updateCamera(dt) {
        const p = s.player;
        const tx = clamp(p.x - VW / 2, 0, WORLD.w - VW);
        const ty = clamp(p.y - 40 - VH / 2, 0, WORLD.h - VH);
        const f = 1 - Math.exp(-7 * dt);
        s.cam.x += (tx - s.cam.x) * f;
        s.cam.y += (ty - s.cam.y) * f;
    }

    // ---------- Dessin ----------
    function drawFlames(ctx) {
        const fl = 1 + Math.sin(s.t * 18) * 0.08 + Math.sin(s.t * 31) * 0.05;
        ctx.save();
        ctx.translate(FIRE.x, FIRE.y - 2);
        ctx.scale(1, fl);
        ctx.beginPath();
        ctx.moveTo(0, -30);
        ctx.quadraticCurveTo(14, -14, 9, -2);
        ctx.quadraticCurveTo(0, 6, -9, -2);
        ctx.quadraticCurveTo(-14, -14, 0, -30);
        ctx.fillStyle = '#ff9f43';
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(0, -17);
        ctx.quadraticCurveTo(7, -8, 4, -1);
        ctx.quadraticCurveTo(0, 3, -4, -1);
        ctx.quadraticCurveTo(-7, -8, 0, -17);
        ctx.fillStyle = '#ffd36e';
        ctx.fill();
        ctx.restore();
    }

    function drawStar(ctx, x, y, r, rot, color) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
            const rr = i % 2 ? r * 0.35 : r;
            const a = (i / 8) * TAU;
            ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
        }
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        ctx.restore();
    }

    function drawGroundLayer(ctx, inView) {
        const p = s.player;
        // Halo des cadeaux dorés et des bonus
        for (const g of s.items) {
            if (g.kind !== 'gold' || g.carrier || !inView(g.x, g.y, 60)) continue;
            const k = 0.5 + 0.5 * Math.sin(s.t * 4);
            ctx.fillStyle = `rgba(255, 211, 110, ${0.25 + k * 0.2})`;
            ctx.beginPath();
            ctx.ellipse(g.x, g.y, 30 + k * 6, 12 + k * 2, 0, 0, TAU);
            ctx.fill();
        }
        for (const b of s.bonuses) {
            if (!inView(b.x, b.y, 40)) continue;
            const k = 0.5 + 0.5 * Math.sin(s.t * 5 + b.x);
            ctx.strokeStyle = BONUS[b.kind].color;
            ctx.globalAlpha = 0.35 + k * 0.3;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.ellipse(b.x, b.y, 22 + k * 4, 8 + k, 0, 0, TAU);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }
        // Ligne de visée des sapins grincheux, juste avant le tir
        for (const m of s.monsters) {
            if (m.type !== 'fir' || m.dead || m.spawnT > 0 || m.frozen > 0 || m.cd > 0.7 || m.dist > 560) continue;
            ctx.save();
            ctx.setLineDash([8, 8]);
            ctx.strokeStyle = `rgba(233, 75, 75, ${0.25 + (0.7 - Math.max(0, m.cd)) * 0.6})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(m.x + Math.cos(m.aim) * 30, m.y + Math.sin(m.aim) * 30);
            ctx.lineTo(m.x + Math.cos(m.aim) * 220, m.y + Math.sin(m.aim) * 220);
            ctx.stroke();
            ctx.restore();
        }
        // Frappe du golem : zone rouge qui se remplit
        if (s.boss && s.boss.state === 'windup') {
            const b = s.boss;
            const k = 1 - b.stateT / 0.95;
            ctx.fillStyle = `rgba(233, 75, 75, ${0.1 + k * 0.22})`;
            ctx.beginPath();
            ctx.ellipse(b.x, b.y, 160, 112, 0, 0, TAU);
            ctx.fill();
            ctx.strokeStyle = 'rgba(233, 75, 75, 0.7)';
            ctx.lineWidth = 3;
            ctx.setLineDash([12, 8]);
            ctx.stroke();
            ctx.setLineDash([]);
        }
        // Pluie de glaçons : cible au sol
        for (const d of s.drops) {
            if (d.t < 0 || d.hit) continue;
            const k = clamp(d.t / d.T, 0, 1);
            ctx.fillStyle = `rgba(59, 130, 246, ${0.1 + k * 0.25})`;
            ctx.beginPath();
            ctx.ellipse(d.x, d.y, 40, 16, 0, 0, TAU);
            ctx.fill();
            ctx.strokeStyle = 'rgba(59, 130, 246, 0.6)';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        // Ondes (canne à sucre, frappe du golem)
        for (const r of s.rings) {
            const k = r.t / r.T;
            const rad = r.r * (1 - (1 - k) ** 3);
            ctx.fillStyle = `rgba(${r.color}, ${0.18 * (1 - k)})`;
            ctx.strokeStyle = `rgba(${r.color}, ${0.9 * (1 - k)})`;
            ctx.lineWidth = 4;
            ctx.setLineDash([12, 8]);
            ctx.beginPath();
            ctx.ellipse(r.x, r.y, rad, rad * 0.72, 0, 0, TAU);
            ctx.fill();
            ctx.stroke();
            ctx.setLineDash([]);
        }
        if (p.magnetT > 0) {
            ctx.strokeStyle = 'rgba(233, 75, 75, 0.25)';
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 10]);
            ctx.lineDashOffset = -s.t * 30;
            ctx.beginPath();
            ctx.ellipse(p.x, p.y, 260, 190, 0, 0, TAU);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.lineDashOffset = 0;
        }
        // Ombres des personnages
        ctx.fillStyle = 'rgba(29, 37, 66, 0.16)';
        for (const m of s.monsters) {
            if (!inView(m.x, m.y, 80)) continue;
            const k = m.dead ? 1 - Math.min(1, m.deadT / 0.4) : 1;
            const a = m.flying ? clamp(1 - m.alt / 70, 0.35, 1) : 1;
            ctx.beginPath();
            ctx.ellipse(m.x, m.y + 1, m.r * 0.95 * k * a, m.r * 0.32 * k * a, 0, 0, TAU);
            ctx.fill();
        }
        for (const g of s.items) {
            if (g.carrier || !inView(g.x, g.y, 40)) continue;
            ctx.beginPath();
            ctx.ellipse(g.x, g.y + 1, 14, 4.5, 0, 0, TAU);
            ctx.fill();
        }
        ctx.beginPath();
        ctx.ellipse(p.x, p.y + 1, 22, 7, 0, 0, TAU);
        ctx.fill();
        for (const b of s.balls) {
            ctx.beginPath();
            ctx.ellipse(b.x, b.y, 6, 2.5, 0, 0, TAU);
            ctx.fill();
        }
    }

    function drawMonster(ctx, m) {
        const spr = spriteOf(m);
        let x = m.x;
        let y = m.y;
        let sx = 1;
        let sy = 1;
        let rot = 0;
        let alpha = 1;
        if (m.spawnT > 0) {
            const total = m.type === 'boss' ? 0.9 : 0.45;
            const k = Math.max(0.05, easeOutBack(clamp(1 - m.spawnT / total, 0, 1)));
            sx = k;
            sy = k;
        }
        if (m.dead) {
            const k = Math.min(1, m.deadT / 0.4);
            sx *= 1 + 0.3 * k;
            sy *= 1 - 0.7 * k;
            alpha = 1 - k;
        }
        const busy = m.frozen > 0 || m.dead;
        if (m.type === 'bauble') {
            const b = busy ? 0 : Math.abs(Math.sin(m.t * 9));
            y -= b * 8;
            sy *= 0.92 + b * 0.1;
            sx *= 1.06 - b * 0.08;
        } else if (m.type === 'snowman') {
            if (!busy) rot = Math.sin(m.t * 5) * 0.06;
            sx *= m.face;
        } else if (m.type === 'elf') {
            if (!busy) y -= Math.abs(Math.sin(m.t * 14)) * 3;
            sx *= m.face;
        } else if (m.type === 'fir') {
            sx *= 1 + Math.sin(m.t * 2) * 0.02;
            if (!busy && m.cd < 0.35 && m.diff < 0.3) x += Math.sin(m.t * 60) * 1.6;
        } else if (m.type === 'icicle') {
            y -= m.alt + Math.sin(m.t * 3) * 3;
            if (m.state === 'windup') x += Math.sin(m.t * 70) * 2.2;
            if (m.state === 'dive') rot = clamp(m.vx / 520, -1, 1) * -0.5;
        } else if (m.type === 'mini') {
            sx *= m.face;
            if (m.state === 'windup') {
                x += Math.sin(m.t * 60) * 2;
                sy *= 1.08;
            } else if (m.state === 'dash') {
                rot = m.dx * 0.25;
            } else if (!busy) {
                y -= Math.abs(Math.sin(m.t * 10)) * 3;
            }
        } else if (m.type === 'boss') {
            if (m.state === 'windup') {
                sy *= 1.06;
                x += Math.sin(m.t * 50) * 2;
            } else if (m.state === 'exposed') {
                sy *= 0.92;
            } else if (!busy) {
                rot = Math.sin(m.t * 3) * 0.03;
            }
        }
        let flash = 0;
        if (m.flash > 0) flash = m.flash / 0.15;
        else if (m.frozen > 0) flash = 0.45;
        drawSprite(ctx, spr, x, y, { sx, sy, rot, alpha, flash });

        if (m.type === 'boss' && !m.dead) {
            const cy = y - 37 * sy;
            if (m.exposed) {
                const k = 0.5 + 0.5 * Math.sin(s.t * 12);
                ctx.fillStyle = `rgba(255, 95, 162, ${0.25 + k * 0.25})`;
                circle(ctx, x, cy, 20 + k * 6, ctx.fillStyle);
            }
            ctx.beginPath();
            ctx.moveTo(x, cy - 10);
            ctx.lineTo(x + 9, cy);
            ctx.lineTo(x, cy + 10);
            ctx.lineTo(x - 9, cy);
            ctx.closePath();
            ctx.fillStyle = m.exposed ? '#ff5fa2' : '#b77a9b';
            ctx.fill();
            if (!m.exposed) {
                ctx.fillStyle = 'rgba(207, 234, 255, 0.85)';
                roundRect(ctx, x - 14, cy - 12, 28, 24, 6);
                ctx.fill();
            }
        }
        if (m.frozen > 0 && !m.dead) {
            for (let i = 0; i < 3; i++) {
                const a = i * 2.1 + m.t;
                drawStar(ctx, x + Math.cos(a) * m.r, y - spr.ay * 0.5 + Math.sin(a) * 10, 5, a, '#7fc3f0');
            }
        }
        if (m.carry && !m.dead) {
            drawSprite(ctx, sp[GIFTS[m.carry.kind].sprite], x + 13 * m.face, y - 30, { sx: 0.7, sy: 0.7 });
        }
        if (!m.dead && m.type !== 'boss' && m.hp < m.maxHp) {
            const top = y - spr.ay - 10;
            ctx.fillStyle = 'rgba(29, 37, 66, 0.35)';
            roundRect(ctx, x - 18, top, 36, 5, 2.5);
            ctx.fill();
            ctx.fillStyle = '#6ee7b7';
            roundRect(ctx, x - 18, top, 36 * Math.max(0, m.hp / m.maxHp), 5, 2.5);
            ctx.fill();
        }
    }

    function drawPlayer(ctx) {
        const p = s.player;
        const bob = p.moving ? Math.abs(Math.sin(p.walkT)) : 0;
        let rot = p.moving ? Math.sin(p.walkT) * 0.13 : Math.sin(s.t * 2) * 0.02;
        let flip = -0.25;
        if (p.throwT > 0) flip = -2.6;
        else if (p.cheerT > 0 || s.phase === 'win') flip = -2.4 + Math.sin(s.t * 14) * 0.3;
        else if (p.charging && p.charge > 0.15) flip = -2;
        let mood = 'normal';
        if (p.hurtT > 0 || s.phase === 'over') mood = 'dizzy';
        else if (p.caneT > 0 || p.cheerT > 0 || s.phase === 'win') mood = 'happy';
        if (s.phase === 'over') rot = Math.min(1.45, s.overT * 4) * -p.facing;
        const blink = p.inv > 0 && p.hurtT <= 0 && Math.floor(s.t * 14) % 2 === 0;

        if (p.shieldT > 0 && (p.shieldT > 1.5 || Math.floor(s.t * 10) % 2 === 0)) {
            ctx.fillStyle = 'rgba(124, 92, 255, 0.14)';
            circle(ctx, p.x, p.y - 30, 44, ctx.fillStyle);
            ctx.save();
            ctx.setLineDash([10, 7]);
            ctx.lineDashOffset = -s.t * 40;
            ctx.strokeStyle = 'rgba(124, 92, 255, 0.75)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(p.x, p.y - 30, 44, 0, TAU);
            ctx.stroke();
            ctx.restore();
        }

        drawPenguin(ctx, p.x, p.y - bob * 3, PLAYER_H, {
            hat: 'beanie', hatColor: '#3b82f6', scarf: '#e94b4b', flip, rotate: rot, facing: p.facing, mood,
            look: 1.5, alpha: blink ? 0.4 : 1
        });

        if (p.charging && p.charge > 0.15 && s.phase !== 'over') {
            const full = p.charge >= CHARGE_TIME;
            const r = 5 + 3 * Math.min(1, p.charge);
            const hx = p.x + p.facing * 24;
            const hy = p.y - 60;
            if (full) circle(ctx, hx, hy, r + 5, 'rgba(159, 216, 255, 0.45)');
            circle(ctx, hx, hy, r, full ? '#9fd8ff' : '#ffffff');
            ctx.strokeStyle = full ? '#3b82f6' : '#a9c6e4';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }

        if (p.caneT > 0) {
            const k = 1 - p.caneT / 0.5;
            const a = k * TAU * 1.25 - Math.PI / 2;
            ctx.save();
            ctx.translate(p.x, p.y - 26);
            ctx.rotate(a);
            ctx.strokeStyle = 'rgba(255, 95, 162, 0.35)';
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.arc(0, 0, 50, -1.2, 0);
            ctx.stroke();
            drawSprite(ctx, sp.cane, 12, 0, { rot: Math.PI / 2 });
            ctx.restore();
        }
    }

    function drawGift(ctx, g) {
        const spr = sp[GIFTS[g.kind].sprite];
        let x = g.x;
        const y = g.y - Math.abs(Math.sin(g.t * 2.4)) * 3;
        let k = 1;
        if (g.born < 0.35) k = Math.max(0.05, easeOutBack(g.born / 0.35));
        if (g.kind === 'trap' && g.t % 2.2 < 0.45) x += Math.sin(g.t * 50) * 1.3;
        drawSprite(ctx, spr, x, y, { sx: k, sy: k });
        if (g.kind === 'gold') {
            drawStar(ctx, x - 18, y - 30 + Math.sin(s.t * 3) * 3, 5 + Math.sin(s.t * 6) * 1.5, s.t, '#ffffff');
            drawStar(ctx, x + 18, y - 14 + Math.cos(s.t * 3) * 3, 4, -s.t, '#ffd36e');
        }
    }

    function drawBonus(ctx, b) {
        const left = b.life - b.t;
        if (left < 3 && Math.floor(s.t * 8) % 2 === 0) return;
        const k = b.t < 0.3 ? Math.max(0.05, easeOutBack(b.t / 0.3)) : 1;
        drawSprite(ctx, sp[b.kind], b.x, b.y - 4 - Math.abs(Math.sin(s.t * 3 + b.x)) * 4, { sx: k, sy: k });
    }

    function drawObstacle(ctx, o) {
        if (o.kind === 'pine') drawSprite(ctx, sp.pine, o.x, o.y, { sx: o.scale, sy: o.scale });
        else if (o.kind === 'rock') drawSprite(ctx, sp.rock, o.x, o.y, { sx: o.scale, sy: o.scale });
        else if (o.kind === 'igloo') drawSprite(ctx, sp.igloo, IGLOO.x, IGLOO.y);
        else if (o.kind === 'fire') {
            drawSprite(ctx, sp.fireBase, FIRE.x, FIRE.y);
            drawFlames(ctx);
        }
    }

    function drawItem(ctx, it) {
        if (it.k === 0) drawObstacle(ctx, it.o);
        else if (it.k === 1) drawMonster(ctx, it.o);
        else if (it.k === 2) drawPlayer(ctx);
        else if (it.k === 3) drawGift(ctx, it.o);
        else if (it.k === 4) drawBonus(ctx, it.o);
        else if (it.k === 5) {
            const e = it.o;
            const q = e.t / 0.7;
            drawSprite(ctx, sp.trapOpen, e.x, e.y, { sx: 1 + q * 0.25, sy: 1 + q * 0.25, alpha: 1 - q });
        }
    }

    function drawAir(ctx) {
        for (const b of s.balls) {
            const h = 30 + Math.sin(Math.PI * Math.min(1, b.t / b.life)) * 14;
            if (b.kind === 'ice') {
                circle(ctx, b.x, b.y - h, 12, 'rgba(159, 216, 255, 0.45)');
                circle(ctx, b.x, b.y - h, 8, '#9fd8ff');
                ctx.strokeStyle = '#3b82f6';
            } else {
                circle(ctx, b.x, b.y - h, 6.5, '#ffffff');
                ctx.strokeStyle = '#9fb7d3';
            }
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }
        for (const c of s.cones) {
            ellipse(ctx, c.x, c.y - 26, 8, 5.5, '#a0714f', c.rot);
            ctx.strokeStyle = '#7a5238';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }
        for (const d of s.drops) {
            if (d.t < 0 || d.hit) continue;
            const k = clamp(d.t / d.T, 0, 1);
            const h = (1 - k) * (1 - k) * 320;
            ctx.save();
            ctx.translate(d.x, d.y - h - 6);
            ctx.beginPath();
            ctx.moveTo(-7, -26);
            ctx.lineTo(7, -26);
            ctx.lineTo(0, 4);
            ctx.closePath();
            ctx.fillStyle = '#e3f4ff';
            ctx.fill();
            ctx.strokeStyle = '#7fc3f0';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();
        }
        for (const q of s.parts) {
            ctx.globalAlpha = Math.max(0, 1 - q.t / q.life);
            circle(ctx, q.x, q.y, q.r, q.color);
        }
        ctx.globalAlpha = 1;
        for (const q of s.popups) {
            ctx.globalAlpha = Math.max(0, 1 - q.t);
            ctx.font = `800 ${q.size}px ${DISPLAY}`;
            ctx.textAlign = 'center';
            ctx.lineWidth = 4;
            ctx.strokeStyle = 'rgba(255,255,255,0.9)';
            ctx.strokeText(q.str, q.x, q.y);
            ctx.fillStyle = q.color;
            ctx.fillText(q.str, q.x, q.y);
        }
        ctx.globalAlpha = 1;
        ctx.textAlign = 'left';
    }

    function drawAim(ctx) {
        const p = s.player;
        if (!s.pointer.used || (s.phase !== 'play' && s.phase !== 'clear') || s.paused) return;
        const aim = aimWorld();
        const hx = p.x;
        const hy = p.y - 30;
        let dx = aim.x - hx;
        let dy = aim.y - hy;
        const d = Math.hypot(dx, dy) || 1;
        const reach = Math.min(d, SNOW_RANGE);
        dx /= d;
        dy /= d;
        ctx.fillStyle = 'rgba(29, 37, 66, 0.22)';
        for (let t = 40; t < reach; t += 28) {
            ctx.beginPath();
            ctx.arc(hx + dx * t, hy + dy * t, 2.6, 0, TAU);
            ctx.fill();
        }
    }

    function panel(ctx, x, y, w, h, r = 16) {
        roundRect(ctx, x, y, w, h, r);
        ctx.fillStyle = 'rgba(15, 29, 66, 0.86)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    function drawReticle(ctx) {
        if (!s.pointer.used) return;
        const { x, y } = s.pointer;
        const p = s.player;
        ctx.lineWidth = 5;
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.beginPath();
        ctx.arc(x, y, 11, 0, TAU);
        ctx.stroke();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#1d2542';
        ctx.beginPath();
        ctx.arc(x, y, 11, 0, TAU);
        ctx.moveTo(x - 18, y);
        ctx.lineTo(x - 7, y);
        ctx.moveTo(x + 7, y);
        ctx.lineTo(x + 18, y);
        ctx.moveTo(x, y - 18);
        ctx.lineTo(x, y - 7);
        ctx.moveTo(x, y + 7);
        ctx.lineTo(x, y + 18);
        ctx.stroke();
        if (p.charging && p.charge > 0.15 && (s.phase === 'play' || s.phase === 'clear')) {
            const k = Math.min(1, p.charge / CHARGE_TIME);
            ctx.lineWidth = 4;
            ctx.strokeStyle = k >= 1 ? '#3b82f6' : 'rgba(59, 130, 246, 0.75)';
            ctx.beginPath();
            ctx.arc(x, y, 17, -Math.PI / 2, -Math.PI / 2 + k * TAU);
            ctx.stroke();
            if (k >= 1) text(ctx, 'Boule glacée !', x, y - 26, { size: 13, weight: 800, color: '#1d2542', align: 'center' });
        }
    }

    function drawHud(ctx) {
        const p = s.player;

        // Vie
        panel(ctx, 14, 12, 238, 50);
        ctx.save();
        ctx.translate(24, 21);
        ctx.scale(1.3, 1.3);
        ctx.fillStyle = '#ff6b81';
        ctx.fill(ICONS.heart);
        ctx.restore();
        roundRect(ctx, 60, 30, 140, 12, 6);
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fill();
        let hpColor = '#ff6b6b';
        if (p.hp > 50) hpColor = '#6ee7b7';
        else if (p.hp > 25) hpColor = '#ffd36e';
        roundRect(ctx, 60, 30, 140 * (p.hp / 100), 12, 6);
        ctx.fillStyle = hpColor;
        ctx.fill();
        text(ctx, 'Flocon', 60, 25, { size: 12, weight: 700, color: 'rgba(255,255,255,0.8)' });
        text(ctx, String(Math.ceil(p.hp)), 240, 42, { size: 18, weight: 800, font: DISPLAY, align: 'right' });

        // Bonus actifs
        const fx = [];
        if (p.shieldT > 0) fx.push(['Bouclier', p.shieldT, '#b9a6ff']);
        if (p.speedT > 0) fx.push(['Patins', p.speedT, '#9fd8ff']);
        if (p.magnetT > 0) fx.push(['Aimant', p.magnetT, '#ff8fa8']);
        let ex = 14;
        for (const [label, left, color] of fx) {
            const str = `${label} ${Math.ceil(left)} s`;
            ctx.font = `700 12px ${BODY}`;
            const w = ctx.measureText(str).width + 30;
            panel(ctx, ex, 68, w, 26, 13);
            circle(ctx, ex + 13, 81, 5, color);
            text(ctx, str, ex + 22, 85.5, { size: 12, weight: 700 });
            ex += w + 6;
        }

        // Vague
        ctx.font = `800 17px ${DISPLAY}`;
        const wlabel = s.wave >= LAST_WAVE ? 'Vague finale' : `Vague ${s.wave} / ${LAST_WAVE}`;
        const ww = ctx.measureText(wlabel).width + 20 + LAST_WAVE * 13 + 16;
        const wx = (VW - ww) / 2;
        panel(ctx, wx, 12, ww, 38, 19);
        text(ctx, wlabel, wx + 16, 37, { size: 17, weight: 800, font: DISPLAY });
        for (let i = 0; i < LAST_WAVE; i++) {
            let c = 'rgba(255,255,255,0.2)';
            if (i < s.wave - 1 || s.phase === 'win') c = '#ffd36e';
            else if (i === s.wave - 1) c = '#ff9f43';
            roundRect(ctx, wx + ww - 16 - (LAST_WAVE - i) * 13 + 3, 28, 10, 6, 3);
            ctx.fillStyle = c;
            ctx.fill();
        }

        // Boss
        if (s.boss) {
            const b = s.boss;
            const bw = 340;
            const bx = (VW - bw) / 2;
            panel(ctx, bx, 56, bw, 40, 14);
            text(ctx, 'Golem de givre', bx + 14, 72, { size: 12, weight: 700, color: 'rgba(255,255,255,0.85)' });
            if (b.exposed) text(ctx, 'Cœur exposé : vise !', bx + bw - 14, 72, { size: 12, weight: 800, color: '#ff8fc0', align: 'right' });
            roundRect(ctx, bx + 14, 78, bw - 28, 9, 4.5);
            ctx.fillStyle = 'rgba(255,255,255,0.15)';
            ctx.fill();
            roundRect(ctx, bx + 14, 78, (bw - 28) * Math.max(0, b.hp / b.maxHp), 9, 4.5);
            ctx.fillStyle = '#ff5fa2';
            ctx.fill();
        }

        // Cadeaux et score
        const gw = 176;
        const gx = VW - 14 - gw;
        panel(ctx, gx, 12, gw, 58);
        drawSprite(ctx, sp.giftRed, gx + 26, 52, { sx: 0.95, sy: 0.95 });
        if (s.wave >= LAST_WAVE) {
            text(ctx, 'Boss', gx + 50, 40, { size: 22, weight: 800, font: DISPLAY });
        } else {
            text(ctx, `${Math.min(s.gifts, s.target)}`, gx + 50, 40, { size: 24, weight: 800, font: DISPLAY });
            ctx.font = `800 24px ${DISPLAY}`;
            const nw = ctx.measureText(`${Math.min(s.gifts, s.target)}`).width;
            text(ctx, ` / ${s.target}`, gx + 50 + nw, 40, { size: 16, weight: 700, color: 'rgba(255,255,255,0.7)', font: DISPLAY });
        }
        text(ctx, `Score ${s.score}`, gx + 50, 60, { size: 12, weight: 700, color: 'rgba(255,255,255,0.8)' });

        // Barre d'actions
        const slots = 3;
        const sw = 52;
        const bw2 = slots * sw + (slots - 1) * 10 + 20;
        const bx2 = (VW - bw2) / 2;
        const by = VH - 14 - 84;
        panel(ctx, bx2, by, bw2, 84, 20);
        const labels = ['Clic', 'Espace', 'Maintenir'];
        for (let i = 0; i < slots; i++) {
            const x = bx2 + 10 + i * (sw + 10);
            const y = by + 9;
            roundRect(ctx, x, y, sw, sw, 14);
            ctx.fillStyle = 'rgba(255,255,255,0.1)';
            ctx.fill();
            const cx = x + sw / 2;
            const cy = y + sw / 2;
            if (i === 0) {
                circle(ctx, cx, cy, 13, '#ffffff');
                circle(ctx, cx + 3, cy + 4, 7, '#e3eef9');
            } else if (i === 1) {
                drawSprite(ctx, sp.cane, cx - 5, cy + 19, { sx: 0.8, sy: 0.8 });
                if (p.caneCd > 0) {
                    ctx.save();
                    roundRect(ctx, x, y, sw, sw, 14);
                    ctx.clip();
                    ctx.beginPath();
                    ctx.moveTo(cx, cy);
                    ctx.arc(cx, cy, 40, -Math.PI / 2, -Math.PI / 2 + (p.caneCd / CANE_CD) * TAU);
                    ctx.closePath();
                    ctx.fillStyle = 'rgba(15, 29, 66, 0.72)';
                    ctx.fill();
                    ctx.restore();
                    text(ctx, `${Math.ceil(p.caneCd)} s`, cx, cy + 7, { size: 18, weight: 800, font: DISPLAY, align: 'center' });
                } else {
                    ctx.strokeStyle = '#ff8fc0';
                    ctx.lineWidth = 2;
                    roundRect(ctx, x, y, sw, sw, 14);
                    ctx.stroke();
                }
            } else {
                const k = p.charging ? Math.min(1, p.charge / CHARGE_TIME) : 0;
                circle(ctx, cx, cy, 13, '#9fd8ff');
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1.6;
                ctx.beginPath();
                ctx.moveTo(cx - 6, cy - 3);
                ctx.lineTo(cx, cy - 9);
                ctx.lineTo(cx + 6, cy - 3);
                ctx.moveTo(cx, cy - 9);
                ctx.lineTo(cx, cy + 6);
                ctx.stroke();
                if (k > 0) {
                    ctx.strokeStyle = '#3b82f6';
                    ctx.lineWidth = 4;
                    ctx.beginPath();
                    ctx.arc(cx, cy, 20, -Math.PI / 2, -Math.PI / 2 + k * TAU);
                    ctx.stroke();
                }
            }
            text(ctx, labels[i], cx, by + 78, { size: 11, weight: 700, color: 'rgba(255,255,255,0.85)', align: 'center' });
        }

        // Mini-carte
        const mx = VW - 14 - MINI_W - 12;
        const my = VH - 14 - MINI_H - 12;
        panel(ctx, mx, my, MINI_W + 12, MINI_H + 12, 14);
        ctx.save();
        roundRect(ctx, mx + 6, my + 6, MINI_W, MINI_H, 9);
        ctx.clip();
        ctx.drawImage(world.mini, mx + 6, my + 6, MINI_W, MINI_H);
        const k = MINI_W / WORLD.w;
        const ox = mx + 6;
        const oy = my + 6;
        ctx.strokeStyle = 'rgba(29, 37, 66, 0.45)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(ox + s.cam.x * k, oy + s.cam.y * k, VW * k, VH * k);
        for (const g of s.items) {
            if (g.kind === 'gold') continue;
            ctx.fillStyle = GIFTS[g.kind].mini;
            ctx.fillRect(ox + g.x * k - 2.5, oy + g.y * k - 2.5, 5, 5);
        }
        for (const m of s.monsters) {
            if (m.dead) continue;
            circle(ctx, ox + m.x * k, oy + m.y * k, m.type === 'boss' ? 5 : 2.2, '#c62f2f');
        }
        for (const g of s.items) {
            if (g.kind !== 'gold') continue;
            drawStar(ctx, ox + g.x * k, oy + g.y * k, 6 + Math.sin(s.t * 6) * 1.5, s.t, '#f2b84b');
        }
        circle(ctx, ox + p.x * k, oy + p.y * k, 5, '#ffffff');
        circle(ctx, ox + p.x * k, oy + p.y * k, 3.5, '#3b82f6');
        ctx.restore();

        // Message en bas à gauche (sur une ou deux lignes)
        if (s.toast) {
            const tt = s.toast.t;
            const a = Math.min(1, tt * 5, (3.4 - tt) * 4);
            ctx.globalAlpha = Math.max(0, a);
            const maxW = bx2 - 14 - 72;
            ctx.font = `700 13px ${DISPLAY}`;
            const lines = [];
            let line = '';
            for (const word of s.toast.str.split(' ')) {
                const test = line ? `${line} ${word}` : word;
                if (line && ctx.measureText(test).width > maxW) {
                    lines.push(line);
                    line = word;
                } else {
                    line = test;
                }
            }
            if (line) lines.push(line);
            const th = lines.length > 1 ? 60 : 44;
            const tw = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 72;
            const ty = VH - 14 - th;
            panel(ctx, 14, ty, tw, th, 14);
            roundRect(ctx, 24, ty + (th - 28) / 2, 28, 28, 9);
            ctx.fillStyle = s.toast.color;
            ctx.fill();
            text(ctx, '!', 38, ty + th / 2 + 6, { size: 17, weight: 800, font: DISPLAY, align: 'center' });
            lines.slice(0, 2).forEach((l, i) => {
                const y = lines.length > 1 ? ty + 26 + i * 18 : ty + th / 2 + 5;
                text(ctx, l, 64, y, { size: 13, weight: 700, font: DISPLAY });
            });
            ctx.globalAlpha = 1;
        }

        // Grande annonce (vague)
        if (s.banner && s.phase !== 'over') {
            const bt = s.banner.t;
            const a = Math.min(1, bt * 4, (2.4 - bt) * 3);
            ctx.globalAlpha = Math.max(0, a);
            const y = 140 + (1 - Math.min(1, bt * 4)) * -14;
            ctx.save();
            ctx.lineJoin = 'round';
            ctx.font = `800 38px ${DISPLAY}`;
            ctx.textAlign = 'center';
            ctx.lineWidth = 8;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
            ctx.strokeText(s.banner.title, VW / 2, y);
            ctx.fillStyle = '#1d2542';
            ctx.fillText(s.banner.title, VW / 2, y);
            ctx.font = `700 17px ${DISPLAY}`;
            ctx.lineWidth = 6;
            ctx.strokeText(s.banner.sub, VW / 2, y + 28);
            ctx.fillStyle = '#3a4a7a';
            ctx.fillText(s.banner.sub, VW / 2, y + 28);
            ctx.restore();
            ctx.globalAlpha = 1;
        }
    }

    // En mode test uniquement (npm run dev, préversion dev) : accès à l'état depuis la console pour tester une vague précise
    if (__TEST_MODE__) window.flocon = { s, world, startWave, spawnMonster, spawnGift, spawnBonus, hitMonster, waveClear };

    return {
        update(dt) {
            s.dt = dt;
            s.t += dt;
            if (s.phase === 'ready') {
                updateFx(dt);
                return;
            }
            if (s.paused) return;
            updateFx(dt);
            s.shake = Math.max(0, s.shake - dt);
            if (s.phase === 'over' || s.phase === 'win') {
                s.overT += dt;
                updatePlayer(dt);
                updateMonsters(dt);
                updateCamera(dt);
                return;
            }
            updatePlayer(dt);
            if (s.phase === 'play') {
                spawning(dt);
                updateMonsters(dt);
                updateCones(dt);
                updateDrops(dt);
            } else {
                s.clearT += dt;
                updateMonsters(dt);
                if (s.clearT > 2.8) {
                    if (s.clearNext === 'win') finishWin();
                    else startWave(s.wave + 1);
                }
            }
            updateBalls(dt);
            updateItems(dt);
            updateBonuses(dt);
            updateCamera(dt);
        },

        render(ctx) {
            const shx = s.shake > 0 ? (Math.random() - 0.5) * s.shake * 22 : 0;
            const shy = s.shake > 0 ? (Math.random() - 0.5) * s.shake * 22 : 0;
            const cx = s.cam.x - shx;
            const cy = s.cam.y - shy;
            ctx.fillStyle = '#eaf3fb';
            ctx.fillRect(0, 0, VW, VH);
            const gx = Math.max(0, cx);
            const gy = Math.max(0, cy);
            const gw = Math.min(WORLD.w, cx + VW) - gx;
            const gh = Math.min(WORLD.h, cy + VH) - gy;
            if (gw > 0 && gh > 0) ctx.drawImage(world.ground, gx, gy, gw, gh, gx - cx, gy - cy, gw, gh);

            const inView = (x, y, m) => x > cx - m && x < cx + VW + m && y > cy - m && y < cy + VH + m + 40;
            ctx.save();
            ctx.translate(-cx, -cy);
            drawGroundLayer(ctx, inView);

            drawList.length = 0;
            for (const o of obstacles) {
                if (inView(o.x, o.y, 90)) drawList.push({ y: o.kind === 'pine' ? o.y + 12 : o.y, k: 0, o });
            }
            for (const m of s.monsters) if (inView(m.x, m.y, 120)) drawList.push({ y: m.y, k: 1, o: m });
            drawList.push({ y: s.player.y, k: 2, o: s.player });
            for (const g of s.items) if (!g.carrier && inView(g.x, g.y, 40)) drawList.push({ y: g.y, k: 3, o: g });
            for (const b of s.bonuses) if (inView(b.x, b.y, 40)) drawList.push({ y: b.y, k: 4, o: b });
            for (const e of s.effects) drawList.push({ y: e.y, k: 5, o: e });
            drawList.sort((a, b) => a.y - b.y);
            for (const it of drawList) drawItem(ctx, it);

            drawAim(ctx);
            drawAir(ctx);
            ctx.restore();

            if (s.phase !== 'ready') drawHud(ctx);

            if (s.phase === 'ready') {
                drawOverlay(ctx, VW, VH, 'L’aventure de Flocon', [
                    'Récupère les cadeaux de chaque vague et repousse les monstres de Noël.',
                    'ZQSD ou flèches : bouger · Clic : boule de neige',
                    'Clic maintenu 1 s : boule glacée · Espace : canne à sucre',
                    '10 vagues, un boss à la fin. P : pause, Échap : quitter.',
                    { text: 'Clique ou appuie sur Espace pour commencer', color: '#ffd36e', weight: 700 }
                ], 640);
            } else if (s.paused) {
                drawOverlay(ctx, VW, VH, 'Pause', ['Appuie sur P pour reprendre.'], 600);
            } else if (s.phase === 'over' && s.overT > 0.9) {
                drawOverlay(ctx, VW, VH, 'Flocon est K.O.', [
                    { text: `${s.score} points`, size: 24, weight: 800 },
                    `Vague ${s.wave} · ${s.kills} monstre${s.kills > 1 ? 's' : ''} vaincu${s.kills > 1 ? 's' : ''}`,
                    s.record ? { text: 'Nouveau record !', color: '#ffd36e', weight: 700 } : 'Le feu de camp soigne, pense à y repasser.',
                    { text: s.overT > 1.6 ? 'Clique ou Espace pour rejouer' : ' ', color: 'rgba(255,255,255,0.75)' }
                ], 600);
            } else if (s.phase === 'win' && s.overT > 0.6) {
                drawOverlay(ctx, VW, VH, 'Noël est sauvé !', [
                    { text: `${s.score} points`, size: 24, weight: 800 },
                    `Bonus de victoire +${s.winBonus} · ${s.kills} monstres vaincus`,
                    s.record ? { text: 'Nouveau record !', color: '#ffd36e', weight: 700 } : 'Bravo Flocon.',
                    { text: s.overT > 1.6 ? 'Clique ou Espace pour rejouer' : ' ', color: 'rgba(255,255,255,0.75)' }
                ], 600);
            }
            drawReticle(ctx);
        },

        pointerDown(x, y) {
            s.pointer.x = x;
            s.pointer.y = y;
            s.pointer.used = true;
            if (s.phase === 'ready') {
                startGame();
                return;
            }
            if (s.phase === 'over' || s.phase === 'win') {
                if (s.overT > 1.6) startGame();
                return;
            }
            if (s.paused) return;
            s.pointer.held = true;
            if (s.player.fireCd <= 0) throwBall('snow');
        },

        pointerMove(x, y) {
            s.pointer.x = x;
            s.pointer.y = y;
            s.pointer.used = true;
        },

        pointerUp() {
            const p = s.player;
            if (s.pointer.held && p.charge >= CHARGE_TIME && (s.phase === 'play' || s.phase === 'clear') && !s.paused) {
                throwBall('ice');
            }
            s.pointer.held = false;
        },

        keyDown(code, repeat) {
            s.keys.add(code);
            if (repeat) return;
            const start = code === 'Space' || code === 'Enter';
            if (s.phase === 'ready' && start) {
                startGame();
                return;
            }
            if ((s.phase === 'over' || s.phase === 'win') && start) {
                if (s.overT > 1.6) startGame();
                return;
            }
            if (code === 'KeyP' && (s.phase === 'play' || s.phase === 'clear')) {
                s.paused = !s.paused;
                s.keys.clear();
                s.pointer.held = false;
                return;
            }
            if (code === 'Space' && (s.phase === 'play' || s.phase === 'clear') && !s.paused) cane();
        },

        keyUp(code) {
            s.keys.delete(code);
        },

        blur() {
            s.keys.clear();
            s.pointer.held = false;
        }
    };
}

export default function AdventureGame({ onScore }) {
    return (
        <div className="adventure">
            <GameCanvas
                create={createAdventure}
                onScore={onScore}
                width={VW}
                height={VH}
                label="L’aventure de Flocon"
                controls={[
                    { code: 'ArrowLeft', text: '←', label: 'Aller à gauche' },
                    { code: 'ArrowUp', text: '↑', label: 'Monter' },
                    { code: 'ArrowDown', text: '↓', label: 'Descendre' },
                    { code: 'ArrowRight', text: '→', label: 'Aller à droite' },
                    { code: 'Space', text: 'Canne', label: 'Canne à sucre' }
                ]}
            />
        </div>
    );
}
