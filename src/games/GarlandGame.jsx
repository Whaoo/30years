import GameCanvas from './GameCanvas';
import { DISPLAY, TAU, circle, drawOverlay, hudPill, roundRect, text } from './draw';
import { dailyRng } from '../december/seed';

/* global __TEST_MODE__ */

// Guirlande express : relier les ampoules de même couleur (sans croiser les fils) avant que le sapin s'éteigne.
// Une suite de grilles de plus en plus grandes, les mêmes pour tout le monde le même jour (graine du jour).
// Chaque guirlande réussie rallume le sapin (+10 s, +2 s si toute la grille est remplie).
// Score : 40 par couleur reliée + 50 si la grille est pleine + 10 × numéro de la guirlande.

const COLORS = ['#ff5d5d', '#ffd23f', '#3b82f6', '#2bb673', '#ff8fd0', '#a78bfa', '#ff9f43'];
const LEVELS = [[5, 3], [5, 4], [6, 4], [6, 5], [7, 5], [7, 6], [8, 6], [8, 7]];
const START_T = 60;
const MAX_T = 90;

// Une grille : on trace des chemins au hasard dans les cases libres ; leurs deux bouts deviennent les ampoules.
// La solution existe donc toujours (celle qui a servi à la fabriquer).
function makePuzzle(rng, n, k) {
    for (let attempt = 0; attempt < 200; attempt++) {
        const grid = Array(n * n).fill(-1);
        const ends = [];
        const sol = [];
        let ok = true;
        for (let c = 0; c < k && ok; c++) {
            let done = false;
            for (let tries = 0; tries < 30 && !done; tries++) {
                const free = grid.map((v, i) => (v < 0 ? i : -1)).filter((i) => i >= 0);
                if (!free.length) break;
                let cur = rng.pick(free);
                const path = [cur];
                const target = rng.int(Math.max(3, Math.floor((n * n) / k) - 3), Math.floor((n * n) / k) + 2);
                let dir = null;
                const used = new Set(path);
                while (path.length < target) {
                    const x = cur % n;
                    const y = Math.floor(cur / n);
                    const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]]
                        .map(([dx, dy]) => [x + dx, y + dy, dx, dy])
                        .filter(([nx, ny]) => nx >= 0 && ny >= 0 && nx < n && ny < n && grid[ny * n + nx] < 0 && !used.has(ny * n + nx));
                    if (!nb.length) break;
                    const straight = nb.find(([, , dx, dy]) => dir && dx === dir[0] && dy === dir[1]);
                    const pick = straight && rng.chance(0.45) ? straight : rng.pick(nb);
                    dir = [pick[2], pick[3]];
                    cur = pick[1] * n + pick[0];
                    path.push(cur);
                    used.add(cur);
                }
                const a = path[0];
                const b = path[path.length - 1];
                const dist = Math.abs((a % n) - (b % n)) + Math.abs(Math.floor(a / n) - Math.floor(b / n));
                if (path.length >= 3 && dist >= 2) {
                    path.forEach((i) => (grid[i] = c));
                    ends.push([a, b]);
                    sol.push(path);
                    done = true;
                }
            }
            if (!done) ok = false;
        }
        if (ok) return { n, k, ends, sol };
    }
    return makePuzzle(rng, n, k - 1);
}

function createGarland(api) {
    const W = api.width;
    const H = api.height;
    const { rng } = dailyRng('guirlande', new Date());
    const puzzles = LEVELS.map(([n, k]) => makePuzzle(rng, n, k));
    // au-delà de la dernière taille, on continue avec des 8 × 8 tirées au hasard du jour
    const puzzleAt = (i) => puzzles[i] || (puzzles[i] = makePuzzle(rng, 8, 7));

    // le sapin, dessiné une fois
    const tree = document.createElement('canvas');
    tree.width = 440;
    tree.height = 760;
    {
        const x = tree.getContext('2d');
        x.scale(2, 2);
        x.fillStyle = '#5b3a22';
        x.fillRect(100, 330, 20, 30);
        [[30, 150, 70], [110, 250, 95], [190, 340, 110]].forEach(([top, bot, wdt]) => {
            x.fillStyle = '#1a5c3d';
            x.beginPath();
            x.moveTo(110, top);
            x.lineTo(110 + wdt, bot);
            x.lineTo(110 - wdt, bot);
            x.fill();
            x.fillStyle = '#2b7f54';
            x.beginPath();
            x.moveTo(110, top);
            x.lineTo(110 + wdt, bot);
            x.lineTo(110, bot);
            x.fill();
        });
    }
    const BULBS = [[96, 120], [128, 140], [82, 190], [140, 205], [110, 230], [70, 262], [150, 275], [104, 296], [56, 318], [168, 326], [126, 318], [86, 336]];

    const s = { phase: 'ready', t: 0, overT: 0, score: 0, time: START_T, idx: 0, paths: [], active: null, solvedT: 0, flash: 0, popups: [] };
    let P = null;
    let geo = null;

    function load(i) {
        s.idx = i;
        P = puzzleAt(i);
        s.paths = P.ends.map(() => []);
        s.active = null;
        s.solvedT = 0;
        const size = Math.min(340 / P.n, 54);
        geo = { size, x0: 520 - (size * P.n) / 2, y0: 248 - (size * P.n) / 2 };
    }
    function start() {
        Object.assign(s, { phase: 'play', score: 0, time: START_T, overT: 0, popups: [] });
        load(0);
    }
    const endColor = (cell) => P.ends.findIndex(([a, b]) => a === cell || b === cell);
    const owner = (cell) => s.paths.findIndex((p) => p.includes(cell));
    const complete = (c) => {
        const p = s.paths[c];
        if (p.length < 2) return false;
        const [a, b] = P.ends[c];
        return (p[0] === a && p[p.length - 1] === b) || (p[0] === b && p[p.length - 1] === a);
    };
    const cellAt = (x, y) => {
        const cx = Math.floor((x - geo.x0) / geo.size);
        const cy = Math.floor((y - geo.y0) / geo.size);
        if (cx < 0 || cy < 0 || cx >= P.n || cy >= P.n) return -1;
        return cy * P.n + cx;
    };

    function stepTo(cell) {
        const c = s.active;
        const p = s.paths[c];
        const last = p[p.length - 1];
        const n = P.n;
        if (Math.abs((last % n) - (cell % n)) + Math.abs(Math.floor(last / n) - Math.floor(cell / n)) !== 1) return false;
        const at = p.indexOf(cell);
        if (at >= 0) {
            p.length = at + 1; // on revient en arrière : le fil se raccourcit
            return true;
        }
        if (complete(c)) return false;
        const ec = endColor(cell);
        if (ec >= 0 && ec !== c) return false; // l'ampoule d'une autre couleur bloque
        const o = owner(cell);
        if (o >= 0 && o !== c) {
            const op = s.paths[o];
            op.length = op.indexOf(cell); // on coupe l'autre guirlande
        }
        p.push(cell);
        return true;
    }
    function dragTo(cell) {
        if (s.active == null || cell < 0) return;
        // si la souris saute plusieurs cases, on avance case par case
        for (let guard = 0; guard < 20; guard++) {
            const p = s.paths[s.active];
            const last = p[p.length - 1];
            if (last === cell) return;
            const n = P.n;
            const dx = (cell % n) - (last % n);
            const dy = Math.floor(cell / n) - Math.floor(last / n);
            const next = Math.abs(dx) >= Math.abs(dy) ? last + Math.sign(dx) : last + Math.sign(dy) * n;
            if (!stepTo(next)) return;
        }
    }
    function checkSolved() {
        if (!P.ends.every((_, c) => complete(c))) return;
        const filled = s.paths.reduce((a, p) => a + p.length, 0) === P.n * P.n;
        const pts = P.k * 40 + (filled ? 50 : 0) + (s.idx + 1) * 10;
        s.score += pts;
        s.time = Math.min(MAX_T, s.time + 10 + (filled ? 2 : 0));
        s.popups.push({ str: filled ? `+${pts} · grille pleine !` : `+${pts}`, t: 0 });
        s.solvedT = 0.9;
        s.flash = 1;
        s.active = null;
    }

    const game = {
        canPause: () => s.phase === 'play',
        update(dt) {
            s.t += dt;
            s.flash = Math.max(0, s.flash - dt * 1.5);
            s.popups.forEach((p) => (p.t += dt));
            s.popups = s.popups.filter((p) => p.t < 1.4);
            if (s.phase === 'over') {
                s.overT += dt;
                return;
            }
            if (s.phase !== 'play') return;
            if (s.solvedT > 0) {
                s.solvedT -= dt;
                if (s.solvedT <= 0) load(s.idx + 1);
                return;
            }
            s.time -= dt;
            if (s.time <= 0) {
                s.time = 0;
                s.phase = 'over';
                s.overT = 0;
                s.active = null;
                s.record = api.reportScore(s.score);
            }
        },
        render(ctx) {
            const g = ctx.createLinearGradient(0, 0, 0, H);
            g.addColorStop(0, '#0b1733');
            g.addColorStop(1, '#1d3561');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, W, H);
            for (let i = 0; i < 50; i++) circle(ctx, (i * 137) % W, (i * 89) % H, 1, 'rgba(255,255,255,0.35)');
            // le sapin : ses ampoules s'éteignent avec le temps
            const light = s.phase === 'ready' ? 1 : Math.min(1, s.time / START_T);
            ctx.drawImage(tree, 30, 50, 220, 380);
            BULBS.forEach(([bx, by], i) => {
                const on = i < Math.ceil(light * BULBS.length);
                const col = COLORS[i % COLORS.length];
                if (on) {
                    ctx.globalAlpha = 0.35;
                    circle(ctx, 30 + bx, 50 + by, 10, col);
                    ctx.globalAlpha = 1;
                }
                circle(ctx, 30 + bx, 50 + by, 5, on ? col : '#3d4b63');
            });
            const starOn = light > 0.15;
            ctx.fillStyle = starOn ? '#ffd36e' : '#6b7690';
            ctx.beginPath();
            for (let k = 0; k < 10; k++) {
                const a = -Math.PI / 2 + (k * Math.PI) / 5;
                const r = k % 2 ? 7 : 16;
                ctx.lineTo(140 + Math.cos(a) * r, 74 + Math.sin(a) * r);
            }
            ctx.fill();
            // le temps qui reste
            const tw = 200;
            roundRect(ctx, 40, 420, tw, 12, 6);
            ctx.fillStyle = 'rgba(255,255,255,0.15)';
            ctx.fill();
            roundRect(ctx, 40, 420, Math.max(6, (tw * s.time) / MAX_T), 12, 6);
            ctx.fillStyle = s.time < 12 ? '#ff5d5d' : '#ffd36e';
            ctx.fill();
            text(ctx, `${Math.ceil(s.time)} s`, 250, 431, { size: 14, weight: 800, font: DISPLAY });

            hudPill(ctx, 16, 12, 'Score', s.score);
            if (P) hudPill(ctx, W - 16, 12, 'Guirlande', s.idx + 1, 'right');

            if (P && s.phase !== 'ready') {
                const { size, x0, y0 } = geo;
                const n = P.n;
                roundRect(ctx, x0 - 10, y0 - 10, size * n + 20, size * n + 20, 18);
                ctx.fillStyle = s.flash > 0 ? `rgba(255,236,170,${0.25 + 0.4 * s.flash})` : 'rgba(10,20,44,0.85)';
                ctx.fill();
                ctx.strokeStyle = 'rgba(255,255,255,0.08)';
                ctx.lineWidth = 1;
                for (let i = 0; i <= n; i++) {
                    ctx.beginPath();
                    ctx.moveTo(x0 + i * size, y0);
                    ctx.lineTo(x0 + i * size, y0 + n * size);
                    ctx.moveTo(x0, y0 + i * size);
                    ctx.lineTo(x0 + n * size, y0 + i * size);
                    ctx.stroke();
                }
                const cxy = (cell) => [x0 + ((cell % n) + 0.5) * size, y0 + (Math.floor(cell / n) + 0.5) * size];
                // remplissage léger des cases couvertes, puis les fils
                s.paths.forEach((p, c) => {
                    ctx.globalAlpha = 0.16;
                    ctx.fillStyle = COLORS[c];
                    p.forEach((cell) => ctx.fillRect(x0 + (cell % n) * size + 1, y0 + Math.floor(cell / n) * size + 1, size - 2, size - 2));
                    ctx.globalAlpha = 1;
                    if (p.length < 2) return;
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';
                    ctx.beginPath();
                    p.forEach((cell, i) => {
                        const [x, y] = cxy(cell);
                        if (i) ctx.lineTo(x, y);
                        else ctx.moveTo(x, y);
                    });
                    ctx.strokeStyle = '#0d1a33';
                    ctx.lineWidth = size * 0.34;
                    ctx.stroke();
                    ctx.strokeStyle = COLORS[c];
                    ctx.lineWidth = size * 0.24;
                    ctx.stroke();
                    // petites ampoules le long du fil
                    p.forEach((cell, i) => {
                        if (i % 2 || i === 0 || i === p.length - 1) return;
                        const [x, y] = cxy(cell);
                        circle(ctx, x, y, size * 0.08, 'rgba(255,255,255,0.75)');
                    });
                });
                P.ends.forEach(([a, b], c) => {
                    const done = complete(c);
                    [a, b].forEach((cell) => {
                        const [x, y] = cxy(cell);
                        if (done) {
                            ctx.globalAlpha = 0.35 + 0.15 * Math.sin(s.t * 6 + c);
                            circle(ctx, x, y, size * 0.48, COLORS[c]);
                            ctx.globalAlpha = 1;
                        }
                        circle(ctx, x, y + 1, size * 0.33, '#0d1a33');
                        circle(ctx, x, y, size * 0.3, COLORS[c]);
                        circle(ctx, x - size * 0.09, y - size * 0.09, size * 0.08, 'rgba(255,255,255,0.8)');
                        ctx.fillStyle = '#c9d4e6';
                        ctx.fillRect(x - size * 0.1, y - size * 0.42, size * 0.2, size * 0.12);
                    });
                });
                const linked = P.ends.filter((_, c) => complete(c)).length;
                text(ctx, `${linked} / ${P.k} couleurs reliées`, x0 + (size * n) / 2, y0 + size * n + 30, { size: 13, weight: 700, align: 'center', color: 'rgba(255,255,255,0.75)' });
                s.popups.forEach((pp) => {
                    ctx.globalAlpha = 1 - pp.t / 1.4;
                    text(ctx, pp.str, x0 + (size * n) / 2, y0 + (size * n) / 2 - pp.t * 30, { size: 24, weight: 800, align: 'center', font: DISPLAY, color: '#ffd36e', shadow: true });
                    ctx.globalAlpha = 1;
                });
            }
            if (s.phase === 'ready') {
                drawOverlay(ctx, W, H, 'Guirlande express', [
                    'Relie chaque paire d’ampoules de la même couleur.',
                    'Les fils ne se croisent pas : glisse case par case.',
                    'Chaque guirlande rallume le sapin. Grille pleine : bonus !',
                    { text: 'Clic ou Espace pour commencer', weight: 700, color: '#ffd36e' }
                ], 540);
            } else if (s.phase === 'over') {
                drawOverlay(ctx, W, H, 'Le sapin s’est éteint !', [
                    `${s.idx} guirlande${s.idx > 1 ? 's' : ''} terminée${s.idx > 1 ? 's' : ''} · ${s.score} points`,
                    s.record ? { text: 'Nouveau record !', weight: 800, color: '#7be0a3' } : 'Les grilles sont les mêmes pour tout le monde aujourd’hui.',
                    { text: 'Clic ou Espace pour rejouer', weight: 700, color: '#ffd36e' }
                ], 540);
            }
        },
        keyDown(code) {
            if ((code === 'Space' || code === 'Enter') && (s.phase === 'ready' || (s.phase === 'over' && s.overT > 0.8))) start();
        },
        pointerDown(x, y) {
            if (s.phase === 'ready' || (s.phase === 'over' && s.overT > 0.8)) {
                start();
                return;
            }
            if (s.phase !== 'play' || s.solvedT > 0) return;
            const cell = cellAt(x, y);
            if (cell < 0) return;
            const ec = endColor(cell);
            if (ec >= 0) {
                s.active = ec;
                s.paths[ec] = [cell];
                return;
            }
            const o = owner(cell);
            if (o >= 0) {
                s.active = o;
                const p = s.paths[o];
                p.length = p.indexOf(cell) + 1;
            }
        },
        pointerMove(x, y) {
            if (s.active == null || s.phase !== 'play') return;
            dragTo(cellAt(x, y));
        },
        pointerUp() {
            if (s.active == null) return;
            s.active = null;
            checkSolved();
        }
    };
    if (__TEST_MODE__) {
        window.guirlande = {
            s,
            get P() {
                return P;
            },
            solve: () => {
                s.paths = P.sol.map((p) => p.slice());
                s.active = 0;
                game.pointerUp();
            }
        };
    }
    return game;
}

export default function GarlandGame({ onScore }) {
    return <GameCanvas pausable fixedStep create={createGarland} onScore={onScore} label="Guirlande express" />;
}
