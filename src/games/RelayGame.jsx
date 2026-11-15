import GameCanvas from './GameCanvas';
import { DISPLAY, TAU, circle, drawOverlay, drawPenguin, ellipse, roundRect, text } from './draw';
import { dailyRng } from '../december/seed';

/* global __TEST_MODE__ */

// Relais Express : le relais colis de Flocon, un jeu de fusion (deux objets identiques = un objet du niveau suivant).
// Le sac postal donne des objets de niveau 1 (1 ⚡ chacun, l'énergie se recharge). Les clients commandent des objets
// de plus en plus gros ; servi vite = plus de pièces. Un client qui part en râlant fait perdre une étoile d'avis :
// 3 départs = journée ratée. 3 minutes. Score = pièces. Commandes et tirages du sac : les mêmes pour tout le monde le même jour.

const FAMS = ['elec', 'toy', 'sweet', 'deco'];
const NAMES = {
    elec: ['Pile', 'Radio', 'Minitel', 'Téléphone', 'Smartphone'],
    toy: ['Bille', 'Toupie', 'Ourson', 'Robot', 'Train électrique'],
    sweet: ['Sucre', 'Bonbon', 'Sucre d’orge', 'Chocolats', 'Bûche de Noël'],
    deco: ['Pomme de pin', 'Boule', 'Guirlande', 'Étoile', 'Sapin décoré']
};
const REWARD = [0, 15, 40, 90, 200, 420];
const COLS = 7;
const ROWS = 6;
const CELL = 50;
const GX = 412;
const GY = 92;
const DURATION = 180;
const ENERGY_MAX = 30;
const SPOTS = [80, 200, 320];

// ---------------------------------------------------------------- les objets (dessinés une fois)
function drawItem(x, fam, lv) {
    const C = (cx, cy, r, c) => circle(x, cx, cy, r, c);
    const R = (rx, ry, w, h, r, c) => {
        roundRect(x, rx, ry, w, h, r);
        x.fillStyle = c;
        x.fill();
    };
    if (fam === 'elec') {
        if (lv === 1) {
            R(-6, -9, 12, 20, 3, '#1d2542');
            R(-6, -9, 12, 7, 3, '#ffd23f');
            R(-2, -12, 4, 3, 1, '#c9d4e6');
        } else if (lv === 2) {
            R(-13, -7, 26, 17, 4, '#d7263d');
            C(-5, 2, 5, '#1d2542');
            R(3, -2, 7, 3, 1, '#ffd36e');
            x.strokeStyle = '#1d2542';
            x.lineWidth = 2;
            x.beginPath();
            x.moveTo(6, -7);
            x.lineTo(11, -14);
            x.stroke();
        } else if (lv === 3) {
            R(-12, -12, 24, 18, 3, '#e8d9b5');
            R(-9, -9, 18, 12, 2, '#1d4d4a');
            R(-6, -6, 8, 2, 1, '#7be0a3');
            R(-6, -2, 11, 2, 1, '#7be0a3');
            R(-11, 7, 22, 5, 2, '#c4b38c');
        } else if (lv === 4) {
            R(-12, -2, 24, 13, 4, '#1d2542');
            x.fillStyle = '#1d2542';
            x.beginPath();
            x.arc(0, -2, 13, Math.PI, 0);
            x.fill();
            C(0, 4, 4, '#c9d4e6');
        } else {
            R(-8, -13, 16, 26, 4, '#1d2542');
            R(-6, -10, 12, 18, 2, '#7fc8ff');
            C(0, 10.5, 1.5, '#c9d4e6');
        }
    } else if (fam === 'toy') {
        if (lv === 1) {
            C(0, 0, 8, '#7fc8ff');
            C(-2.5, -2.5, 3, 'rgba(255,255,255,0.8)');
        } else if (lv === 2) {
            x.fillStyle = '#ff9f43';
            x.beginPath();
            x.moveTo(-12, -2);
            x.lineTo(12, -2);
            x.lineTo(0, 12);
            x.fill();
            R(-12, -6, 24, 5, 2, '#ffd36e');
            R(-1.5, -13, 3, 8, 1, '#8a5a34');
        } else if (lv === 3) {
            C(-7, -9, 4, '#a5713f');
            C(7, -9, 4, '#a5713f');
            C(0, -3, 9, '#c4864c');
            C(0, 8, 8, '#c4864c');
            C(0, 0, 4, '#e8c08a');
            C(-3, -5, 1.2, '#1d2542');
            C(3, -5, 1.2, '#1d2542');
        } else if (lv === 4) {
            R(-8, -10, 16, 10, 2, '#c9d4e6');
            R(-9, 1, 18, 12, 3, '#9fb0c9');
            C(-3, -5, 2, '#d7263d');
            C(3, -5, 2, '#d7263d');
            x.strokeStyle = '#9fb0c9';
            x.lineWidth = 1.5;
            x.beginPath();
            x.moveTo(0, -10);
            x.lineTo(0, -14);
            x.stroke();
            C(0, -15, 1.8, '#ffd23f');
        } else {
            R(-13, -4, 10, 11, 2, '#d7263d');
            R(-2, -8, 15, 15, 3, '#2bb673');
            R(1, -13, 4, 6, 1, '#1d2542');
            C(-9, 9, 3, '#1d2542');
            C(4, 9, 3, '#1d2542');
            C(10, 9, 3, '#1d2542');
        }
    } else if (fam === 'sweet') {
        if (lv === 1) {
            R(-8, -8, 16, 16, 2, '#f4f7fb');
            x.strokeStyle = '#c9d4e6';
            x.lineWidth = 1.5;
            x.strokeRect(-8, -8, 16, 16);
            x.beginPath();
            x.moveTo(-5, -5);
            x.lineTo(5, 5);
            x.moveTo(5, -5);
            x.lineTo(-5, 5);
            x.stroke();
        } else if (lv === 2) {
            x.fillStyle = '#ff8fd0';
            x.beginPath();
            x.moveTo(-13, -6);
            x.lineTo(-6, 0);
            x.lineTo(-13, 6);
            x.moveTo(13, -6);
            x.lineTo(6, 0);
            x.lineTo(13, 6);
            x.fill();
            C(0, 0, 7, '#ff5da8');
        } else if (lv === 3) {
            x.strokeStyle = '#d7263d';
            x.lineWidth = 5;
            x.lineCap = 'round';
            x.beginPath();
            x.moveTo(-2, 13);
            x.lineTo(-2, -4);
            x.arc(3, -4, 5, Math.PI, 0);
            x.stroke();
        } else if (lv === 4) {
            R(-13, -8, 26, 17, 3, '#5b3a22');
            R(-13, -8, 26, 5, 2, '#d7263d');
            C(-7, 3, 3, '#3a2010');
            C(0, 3, 3, '#3a2010');
            C(7, 3, 3, '#3a2010');
        } else {
            x.fillStyle = '#6b3d1e';
            x.beginPath();
            x.moveTo(-14, 9);
            x.quadraticCurveTo(-14, -8, 0, -8);
            x.quadraticCurveTo(14, -8, 14, 9);
            x.closePath();
            x.fill();
            x.strokeStyle = '#8a5a34';
            x.lineWidth = 1.5;
            x.beginPath();
            x.moveTo(-10, 0);
            x.quadraticCurveTo(0, -4, 10, 0);
            x.stroke();
            C(4, -10, 2.5, '#d7263d');
            x.fillStyle = '#2bb673';
            x.beginPath();
            x.moveTo(0, -10);
            x.lineTo(-4, -14);
            x.lineTo(1, -13);
            x.fill();
        }
    } else {
        if (lv === 1) {
            ellipse(x, 0, 0, 7, 10, '#8a5a34');
            x.strokeStyle = '#5b3a22';
            x.lineWidth = 1.2;
            [-4, 0, 4].forEach((yy) => {
                x.beginPath();
                x.moveTo(-6, yy);
                x.lineTo(6, yy);
                x.stroke();
            });
        } else if (lv === 2) {
            C(0, 2, 9, '#d7263d');
            R(-3, -10, 6, 4, 1, '#ffd36e');
            C(-3, -1, 2.5, 'rgba(255,255,255,0.7)');
        } else if (lv === 3) {
            x.strokeStyle = '#1d2542';
            x.lineWidth = 1.2;
            x.beginPath();
            x.moveTo(-14, -4);
            x.quadraticCurveTo(0, 8, 14, -4);
            x.stroke();
            ['#ff5d5d', '#ffd23f', '#3b82f6', '#2bb673'].forEach((c, i) => C(-10 + i * 7, -1 + Math.sin((i / 3) * Math.PI) * 5, 3.2, c));
        } else if (lv === 4) {
            x.fillStyle = '#ffd23f';
            x.beginPath();
            for (let k = 0; k < 10; k++) {
                const a = -Math.PI / 2 + (k * Math.PI) / 5;
                const r = k % 2 ? 5.5 : 13;
                x.lineTo(Math.cos(a) * r, Math.sin(a) * r);
            }
            x.fill();
        } else {
            [[-12, 4, 10], [-8, -4, 7], [-4, -10, 4]].forEach(([top, bot, w]) => {
                x.fillStyle = '#2b7f54';
                x.beginPath();
                x.moveTo(0, top);
                x.lineTo(w, bot + 8);
                x.lineTo(-w, bot + 8);
                x.fill();
            });
            R(-2, 12, 4, 3, 1, '#5b3a22');
            C(-4, 6, 1.6, '#ff5d5d');
            C(4, 2, 1.6, '#3b82f6');
            C(0, -3, 1.6, '#ffd23f');
            C(0, -13, 2.2, '#ffd23f');
        }
    }
}
function makeItemSprites() {
    const out = {};
    FAMS.forEach((f) => {
        for (let lv = 1; lv <= 5; lv++) {
            const c = document.createElement('canvas');
            c.width = 88;
            c.height = 88;
            const x = c.getContext('2d');
            x.scale(2, 2);
            roundRect(x, 2, 2, 40, 40, 9);
            x.fillStyle = '#ffffff';
            x.fill();
            x.translate(22, 22);
            drawItem(x, f, lv);
            out[`${f}${lv}`] = c;
        }
    });
    return out;
}

function createRelay(api) {
    const W = api.width;
    const H = api.height;
    const IS = makeItemSprites();
    let rng = dailyRng('relais', new Date()).rng;

    const s = { phase: 'ready', t: 0, overT: 0 };
    function reset() {
        rng = dailyRng('relais', new Date()).rng;
        Object.assign(s, {
            phase: 'play',
            time: DURATION,
            coins: 0,
            served: 0,
            stars: 5,
            energy: ENERGY_MAX,
            regen: 0,
            grid: Array(COLS * ROWS).fill(null),
            clients: [null, null, null],
            nextClient: 1,
            drag: null,
            best: 0,
            popups: [],
            toast: 'Touche le sac, puis glisse deux objets pareils l’un sur l’autre !',
            toastT: 6,
            elapsed: 0
        });
    }

    const cellXY = (i) => [GX + (i % COLS) * CELL + CELL / 2, GY + Math.floor(i / COLS) * CELL + CELL / 2];
    const cellAt = (x, y) => {
        const cx = Math.floor((x - GX) / CELL);
        const cy = Math.floor((y - GY) / CELL);
        return cx >= 0 && cy >= 0 && cx < COLS && cy < ROWS ? cy * COLS + cx : -1;
    };
    const popup = (x, y, str, color = '#ffd36e') => s.popups.push({ x, y, str, color, t: 0 });

    function newClient(spot) {
        const e = s.elapsed;
        const maxLv = Math.min(5, 2 + Math.floor(e / 45));
        const minLv = e < 30 ? 2 : e < 90 ? 2 : 3;
        const two = e > 60 && rng.chance(0.35);
        const order = [];
        const n = two ? 2 : 1;
        for (let i = 0; i < n; i++) order.push({ fam: rng.pick(FAMS), lv: rng.int(minLv, two ? Math.max(minLv, maxLv - 1) : maxLv), done: false });
        const patience = Math.max(34, 52 - e / 10) + order.reduce((a, o) => a + o.lv * 3, 0);
        s.clients[spot] = { order, patience, max: patience, enter: 0, scarf: rng.pick(['#3b82f6', '#2bb673', '#ff9f43', '#b14a7a', '#e94b4b']), leaving: 0, angry: false };
    }

    function spawnFromBag() {
        if (s.energy < 1) {
            s.toast = 'Plus d’énergie : elle se recharge toute seule (+1 ⚡ toutes les 6 s).';
            s.toastT = 2.5;
            return;
        }
        const free = s.grid.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);
        if (!free.length) {
            s.toast = 'Grille pleine ! Fusionne ou jette un objet à la poubelle.';
            s.toastT = 2.5;
            return;
        }
        // le sac favorise un peu les familles commandées
        const wanted = s.clients.filter(Boolean).flatMap((c) => c.order.filter((o) => !o.done).map((o) => o.fam));
        const fam = wanted.length && rng.chance(0.6) ? rng.pick(wanted) : rng.pick(FAMS);
        const cell = free[0];
        s.grid[cell] = { fam, lv: 1, pop: 0.25 };
        s.energy -= 1;
    }

    function serve(spot, item) {
        const c = s.clients[spot];
        if (!c || c.leaving) return false;
        const o = c.order.find((x) => !x.done && x.fam === item.fam && x.lv === item.lv);
        if (!o) return false;
        o.done = true;
        if (c.order.every((x) => x.done)) {
            const base = c.order.reduce((a, x) => a + REWARD[x.lv], 0);
            const quick = c.patience / c.max > 0.6;
            const gain = Math.round(base * (quick ? 1.5 : 1));
            s.coins += gain;
            s.served++;
            s.energy = Math.min(ENERGY_MAX, s.energy + 2);
            popup(SPOTS[spot], 170, quick ? `+${gain} · rapide !` : `+${gain}`);
            c.leaving = 0.01;
        }
        return true;
    }

    function finish(reason) {
        s.phase = 'over';
        s.overT = 0;
        s.reason = reason;
        s.drag = null;
        s.record = api.reportScore(s.coins);
    }

    const game = {
        canPause: () => s.phase === 'play',
        update(dt) {
            s.t += dt;
            if (s.phase === 'over') {
                s.overT += dt;
                return;
            }
            if (s.phase !== 'play') return;
            s.time -= dt;
            s.elapsed += dt;
            s.toastT -= dt;
            s.regen += dt;
            if (s.regen >= 6) {
                s.regen -= 6;
                s.energy = Math.min(ENERGY_MAX, s.energy + 1);
            }
            s.grid.forEach((it) => it && it.pop > 0 && (it.pop -= dt));
            s.popups.forEach((p) => (p.t += dt));
            s.popups = s.popups.filter((p) => p.t < 1.3);
            s.nextClient -= dt;
            s.clients.forEach((c, i) => {
                if (!c) return;
                c.enter = Math.min(1, c.enter + dt * 2.5);
                if (c.leaving) {
                    c.leaving += dt;
                    if (c.leaving > 0.8) s.clients[i] = null;
                    return;
                }
                c.patience -= dt;
                if (c.patience <= 0) {
                    c.angry = true;
                    c.leaving = 0.01;
                    s.stars -= 1;
                    s.toast = 'Je vais voir ailleurs ! Un client est parti : −1 ★ sur l’avis du relais.';
                    s.toastT = 3;
                    if (s.stars <= 2) finish('stars');
                }
            });
            const free = s.clients.findIndex((c) => !c);
            if (free >= 0 && s.nextClient <= 0 && s.phase === 'play') {
                newClient(free);
                s.nextClient = s.elapsed < 20 ? 4 : 7;
            }
            if (s.time <= 0 && s.phase === 'play') {
                s.time = 0;
                finish('time');
            }
        },
        render(ctx) {
            // le relais : mur, guirlande, comptoir
            ctx.fillStyle = '#f3e7cf';
            ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = '#2b7f54';
            ctx.fillRect(0, 0, W, 34);
            for (let i = 0; i < 40; i++) {
                ctx.fillStyle = i % 2 ? '#d7263d' : '#ffffff';
                ctx.fillRect(i * 20, 34, 20, 6);
            }
            ctx.fillStyle = '#8a5a34';
            ctx.fillRect(0, 300, 400, 150);
            ctx.fillStyle = '#6b4226';
            ctx.fillRect(0, 300, 400, 10);
            // grille
            roundRect(ctx, GX - 8, GY - 8, COLS * CELL + 16, ROWS * CELL + 16, 16);
            ctx.fillStyle = '#e8dcc2';
            ctx.fill();
            for (let i = 0; i < COLS * ROWS; i++) {
                const [cx, cy] = cellXY(i);
                roundRect(ctx, cx - CELL / 2 + 3, cy - CELL / 2 + 3, CELL - 6, CELL - 6, 9);
                ctx.fillStyle = 'rgba(255,255,255,0.55)';
                ctx.fill();
            }
            const drag = s.drag;
            const hoverCell = drag ? cellAt(drag.x, drag.y) : -1;
            (s.grid || []).forEach((it, i) => {
                if (!it || (drag && drag.from === i)) return;
                const [cx, cy] = cellXY(i);
                const match = drag && hoverCell === i && it.fam === drag.item.fam && it.lv === drag.item.lv && it.lv < 5;
                if (match) {
                    roundRect(ctx, cx - 24, cy - 24, 48, 48, 11);
                    ctx.fillStyle = '#ffd36e';
                    ctx.fill();
                }
                const k = it.pop > 0 ? 1 + it.pop * 1.2 : 1;
                ctx.drawImage(IS[`${it.fam}${it.lv}`], cx - 22 * k, cy - 22 * k, 44 * k, 44 * k);
            });
            if (s.phase !== 'ready') {
                // les clients au comptoir
                s.clients.forEach((c, i) => {
                    if (!c) return;
                    const x = SPOTS[i] + (c.leaving ? (c.angry ? -1 : 1) * c.leaving * 200 : (1 - c.enter) * 60);
                    const ratio = c.patience / c.max;
                    ctx.globalAlpha = c.leaving ? Math.max(0, 1 - c.leaving * 1.2) : 1;
                    drawPenguin(ctx, x, 300, 70, { scarf: ratio < 0.25 ? '#d7263d' : c.scarf, mood: c.angry ? 'surprised' : ratio > 0.5 ? 'happy' : 'normal', hatColor: c.scarf });
                    // bulle de commande
                    const bw = c.order.length * 46 + 44;
                    roundRect(ctx, x - bw / 2, 150, bw, 54, 14);
                    ctx.fillStyle = '#ffffff';
                    ctx.fill();
                    ctx.beginPath();
                    ctx.moveTo(x - 6, 204);
                    ctx.lineTo(x, 212);
                    ctx.lineTo(x + 6, 204);
                    ctx.fill();
                    c.order.forEach((o, j) => {
                        const ix = x - bw / 2 + 6 + j * 46;
                        ctx.globalAlpha = (o.done ? 0.3 : 1) * (c.leaving ? Math.max(0, 1 - c.leaving * 1.2) : 1);
                        ctx.drawImage(IS[`${o.fam}${o.lv}`], ix, 155, 44, 44);
                        if (o.done) text(ctx, '✓', ix + 22, 186, { size: 22, weight: 800, align: 'center', color: '#2bb673' });
                    });
                    ctx.globalAlpha = c.leaving ? Math.max(0, 1 - c.leaving * 1.2) : 1;
                    const reward = c.order.reduce((a, o) => a + REWARD[o.lv], 0);
                    text(ctx, `+${reward}`, x + bw / 2 - 20, 176, { size: 12, weight: 800, align: 'center', color: '#c98a12' });
                    circle(ctx, x + bw / 2 - 20, 188, 5, '#ffd23f');
                    const hot = drag && Math.abs(drag.x - SPOTS[i]) < 56 && drag.y > 140 && drag.y < 310 && c.order.some((o) => !o.done && o.fam === drag.item.fam && o.lv === drag.item.lv);
                    if (hot) {
                        ctx.strokeStyle = '#ffd36e';
                        ctx.lineWidth = 3;
                        roundRect(ctx, x - bw / 2, 150, bw, 54, 14);
                        ctx.stroke();
                    }
                    // patience
                    roundRect(ctx, x - 30, 312, 60, 7, 3.5);
                    ctx.fillStyle = 'rgba(0,0,0,0.25)';
                    ctx.fill();
                    roundRect(ctx, x - 30, 312, Math.max(4, 60 * ratio), 7, 3.5);
                    ctx.fillStyle = ratio > 0.5 ? '#7be0a3' : ratio > 0.25 ? '#ffb15e' : '#ff5d5d';
                    ctx.fill();
                    ctx.globalAlpha = 1;
                });
                // le sac postal et la poubelle
                const bagHot = s.hoverBag;
                ctx.fillStyle = bagHot ? '#d9b07a' : '#c99a5b';
                ctx.beginPath();
                ctx.moveTo(48, 350);
                ctx.quadraticCurveTo(40, 410, 70, 420);
                ctx.lineTo(126, 420);
                ctx.quadraticCurveTo(152, 410, 144, 350);
                ctx.closePath();
                ctx.fill();
                ellipse(ctx, 96, 350, 49, 10, '#a77a43');
                roundRect(ctx, 66, 372, 60, 18, 4);
                ctx.fillStyle = '#d7263d';
                ctx.fill();
                text(ctx, 'POSTE', 96, 386, { size: 12, weight: 800, align: 'center', font: DISPLAY });
                text(ctx, `⚡ ${Math.floor(s.energy)}`, 96, 440, { size: 13, weight: 800, align: 'center', color: s.energy >= 1 ? '#ffe9b0' : '#ff9f9f' });
                const trashHot = drag && Math.hypot(drag.x - 330, drag.y - 390) < 40;
                ctx.fillStyle = trashHot ? '#ff8f8f' : '#8a9bb5';
                roundRect(ctx, 308, 372, 44, 52, 6);
                ctx.fill();
                ctx.fillStyle = trashHot ? '#ffb0b0' : '#a9b6cc';
                roundRect(ctx, 302, 364, 56, 10, 4);
                ctx.fill();
                ctx.strokeStyle = 'rgba(29,37,66,0.4)';
                ctx.lineWidth = 2;
                [320, 330, 340].forEach((lx) => {
                    ctx.beginPath();
                    ctx.moveTo(lx, 382);
                    ctx.lineTo(lx, 416);
                    ctx.stroke();
                });
                text(ctx, 'Poubelle', 330, 440, { size: 11, weight: 700, align: 'center', color: '#f3e7cf' });
            }
            // barre du haut
            roundRect(ctx, 10, 6, 360, 22, 11);
            ctx.fillStyle = 'rgba(14,22,48,0.85)';
            ctx.fill();
            text(ctx, `Clients servis ${s.served || 0}`, 24, 22, { size: 12, weight: 800 });
            circle(ctx, 150, 17, 6, '#ffd23f');
            text(ctx, `${s.coins || 0}`, 162, 22, { size: 12, weight: 800, color: '#ffd23f' });
            const tm = Math.max(0, Math.ceil(s.time ?? DURATION));
            text(ctx, `⏱ ${Math.floor(tm / 60)}:${String(tm % 60).padStart(2, '0')}`, 230, 22, { size: 12, weight: 800, color: tm < 30 ? '#ff9f9f' : '#ffffff' });
            text(ctx, '★'.repeat(Math.max(0, s.stars ?? 5)) + '☆'.repeat(5 - Math.max(0, s.stars ?? 5)), 300, 22, { size: 12, weight: 800, color: '#ffd23f' });
            text(ctx, 'RELAIS EXPRESS', W - 16, 23, { size: 14, weight: 800, align: 'right', font: DISPLAY });
            if (s.phase === 'play') {
                const full = s.grid.every(Boolean);
                if (full) {
                    roundRect(ctx, GX + 80, GY + ROWS * CELL + 4, 200, 22, 11);
                    ctx.fillStyle = 'rgba(160,30,40,0.92)';
                    ctx.fill();
                    text(ctx, 'Grille pleine !', GX + 180, GY + ROWS * CELL + 19, { size: 12, weight: 800, align: 'center' });
                }
                if (s.toastT > 0) {
                    ctx.globalAlpha = Math.min(1, s.toastT);
                    ctx.font = '600 12px "DM Sans", system-ui, sans-serif';
                    const w = Math.min(390, ctx.measureText(s.toast).width + 24);
                    roundRect(ctx, 10, 50, w, 30, 12);
                    ctx.fillStyle = 'rgba(14,22,48,0.9)';
                    ctx.fill();
                    text(ctx, s.toast, 22, 70, { size: 12, weight: 600 });
                    ctx.globalAlpha = 1;
                }
                s.popups.forEach((p) => {
                    ctx.globalAlpha = 1 - p.t / 1.3;
                    text(ctx, p.str, p.x, p.y - p.t * 30, { size: 16, weight: 800, align: 'center', color: p.color === '#ffd36e' ? '#c98a12' : p.color, font: DISPLAY });
                    ctx.globalAlpha = 1;
                });
                if (drag) ctx.drawImage(IS[`${drag.item.fam}${drag.item.lv}`], drag.x - 26, drag.y - 26, 52, 52);
            }
            if (s.phase === 'ready') {
                drawOverlay(ctx, W, H, 'Relais Express', [
                    'Le sac postal donne des objets de base (1 ⚡ chacun).',
                    'Deux objets identiques fusionnent : 2 piles = 1 radio…',
                    'Glisse l’objet demandé sur le client. 3 départs = journée ratée.',
                    { text: 'Clic ou Espace pour ouvrir le relais', weight: 700, color: '#ffd36e' }
                ], 560);
            } else if (s.phase === 'over') {
                const bestName = s.best ? NAMES[s.bestFam][s.best - 1] : '—';
                drawOverlay(ctx, W, H, s.reason === 'stars' ? 'Journée ratée…' : 'Relais fermé !', [
                    `Clients servis ${s.served} · ${s.coins} pièces`,
                    `Record de fusion : ${bestName} · avis ${s.stars} ★`,
                    s.record ? { text: 'Nouveau record !', weight: 800, color: '#7be0a3' } : 'Les commandes sont les mêmes pour tout le monde aujourd’hui.',
                    { text: 'Clic ou Espace pour rejouer', weight: 700, color: '#ffd36e' }
                ], 560);
            }
        },
        keyDown(code) {
            if ((code === 'Space' || code === 'Enter') && (s.phase === 'ready' || (s.phase === 'over' && s.overT > 0.8))) reset();
        },
        pointerDown(x, y) {
            if (s.phase === 'ready' || (s.phase === 'over' && s.overT > 0.8)) {
                reset();
                return;
            }
            if (s.phase !== 'play') return;
            if (Math.hypot(x - 96, y - 385) < 52) {
                spawnFromBag();
                return;
            }
            const i = cellAt(x, y);
            if (i >= 0 && s.grid[i]) s.drag = { from: i, item: s.grid[i], x, y };
        },
        pointerMove(x, y) {
            s.hoverBag = Math.hypot(x - 96, y - 385) < 52;
            if (s.drag) {
                s.drag.x = x;
                s.drag.y = y;
            }
        },
        pointerUp(x, y) {
            const d = s.drag;
            if (!d || s.phase !== 'play') {
                s.drag = null;
                return;
            }
            s.drag = null;
            const item = d.item;
            // au client ?
            const spot = SPOTS.findIndex((sx) => Math.abs(x - sx) < 56 && y > 140 && y < 310);
            if (spot >= 0) {
                if (serve(spot, item)) s.grid[d.from] = null;
                return;
            }
            // à la poubelle ?
            if (Math.hypot(x - 330, y - 390) < 40) {
                s.grid[d.from] = null;
                return;
            }
            const to = cellAt(x, y);
            if (to < 0 || to === d.from) return;
            const target = s.grid[to];
            if (!target) {
                s.grid[to] = item;
                s.grid[d.from] = null;
            } else if (target.fam === item.fam && target.lv === item.lv && item.lv < 5) {
                const lv = item.lv + 1;
                s.grid[to] = { fam: item.fam, lv, pop: 0.3 };
                s.grid[d.from] = null;
                if (lv > s.best) {
                    s.best = lv;
                    s.bestFam = item.fam;
                }
                const [cx, cy] = cellXY(to);
                popup(cx, cy - 20, NAMES[item.fam][lv - 1], '#1d2542');
            } else {
                s.grid[to] = item;
                s.grid[d.from] = target;
            }
        }
    };
    if (__TEST_MODE__) window.relais = { s, game, cellXY, SPOTS };
    return game;
}

export default function RelayGame({ onScore }) {
    return <GameCanvas pausable fixedStep create={createRelay} onScore={onScore} label="Relais Express" />;
}
