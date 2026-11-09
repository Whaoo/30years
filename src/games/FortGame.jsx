import GameCanvas from './GameCanvas';
import {
    DISPLAY, TAU, addPopup, circle, clamp, drawOverlay, drawPenguin, drawPopups, ellipse, hills, hudPill,
    roundRect, skyGradient, text, updatePopups
} from './draw';

// Fort de neige : une catapulte, des boules de neige, et des forteresses de glace gardées par des bonhommes grognons.
// Petite physique maison : blocs rectangulaires sans rotation (ils glissent, s'empilent et tombent),
// bonhommes ronds qui s'écrasent s'ils tombent de haut ou prennent une boule de plein fouet.
const GROUND = 400;
const SLING = { x: 178, y: 314 };
const MAX_PULL = 100;
const POWER = 6.6;
const G = 640;
const BALL_R = 10;
const BALL_M = 0.6;

const B = (x, bottom, w, h) => ({ x, y: bottom - h, w, h });
const S = (x, feet) => ({ x, y: feet });
const ICE = [44, 28];
const TALL = [26, 56];

const LEVELS = [
    { balls: 3, blocks: [B(560, 400, ...ICE), B(560, 372, ...ICE), B(560, 344, ...ICE)], snowmen: [S(582, 316)] },
    { balls: 3, blocks: [B(520, 400, ...TALL), B(624, 400, ...TALL), B(508, 344, 154, 16)], snowmen: [S(585, 328), S(700, 400)] },
    {
        balls: 4,
        blocks: [B(520, 400, ...ICE), B(566, 400, ...ICE), B(612, 400, ...ICE), B(543, 372, ...ICE), B(589, 372, ...ICE), B(566, 344, ...ICE)],
        snowmen: [S(588, 316), S(700, 400)]
    },
    {
        balls: 4,
        blocks: [B(520, 400, ...TALL), B(520, 344, ...TALL), B(680, 400, ...TALL)],
        snowmen: [S(610, 400), S(693, 344)]
    },
    {
        balls: 5,
        blocks: [B(492, 400, ...ICE), B(492, 372, ...ICE), B(660, 400, ...ICE), B(660, 372, ...ICE), B(486, 344, 224, 16)],
        snowmen: [S(598, 328), S(598, 400), S(745, 400)]
    }
];

function createFort(api) {
    const W = api.width;
    const H = api.height;
    const s = {
        phase: 'ready',
        level: 0,
        balls: 0,
        ball: null,
        blocks: [],
        snowmen: [],
        drag: null,
        kb: { angle: -0.62, power: 0.72, used: false },
        score: 0,
        settleT: 0,
        clearT: 0,
        popups: [],
        bursts: [],
        overT: 0,
        record: false,
        won: false,
        t: 0
    };

    function loadLevel(i) {
        const L = LEVELS[i];
        s.level = i;
        s.balls = L.balls;
        s.ball = null;
        s.drag = null;
        s.blocks = L.blocks.map((b) => ({ ...b, vx: 0, vy: 0, m: (b.w * b.h) / 1100 }));
        s.snowmen = L.snowmen.map((m) => ({ ...m, vx: 0, vy: 0, alive: true, deadT: 0, airFrom: null, grounded: true }));
        s.settleT = 0;
        s.clearT = 0;
        s.phase = 'aim';
    }

    function start() {
        Object.assign(s, { score: 0, popups: [], bursts: [], record: false, won: false });
        loadLevel(0);
    }

    function pullVector() {
        if (s.drag) return s.drag;
        const p = s.kb.power * MAX_PULL;
        return { x: -Math.cos(s.kb.angle) * p, y: -Math.sin(s.kb.angle) * p };
    }

    function launch() {
        if (s.phase !== 'aim' || s.ball || s.balls <= 0) return;
        const p = pullVector();
        if (Math.hypot(p.x, p.y) < 15) return;
        s.ball = { x: SLING.x + p.x, y: SLING.y + p.y, vx: -p.x * POWER, vy: -p.y * POWER, t: 0, rest: 0 };
        s.balls -= 1;
        s.drag = null;
        s.phase = 'fly';
        s.settleT = 0;
    }

    function kill(m, label) {
        if (!m.alive) return;
        m.alive = false;
        m.deadT = 0;
        s.score += 100;
        addPopup(s.popups, m.x, m.y - 50, `${label} +100`, '#ffd36e');
        s.bursts.push({ x: m.x, y: m.y - 20, t: 0 });
    }

    function supportUnder(x0, x1, bottom, self) {
        let top = GROUND;
        let vx = 0;
        let minX = Infinity;
        let maxX = -Infinity;
        for (const o of s.blocks) {
            if (o === self) continue;
            const ov = Math.min(x1, o.x + o.w) - Math.max(x0, o.x);
            if (ov <= 2 || o.y < bottom - 8) continue;
            if (o.y < top - 0.5) {
                top = o.y;
                vx = o.vx;
                minX = o.x;
                maxX = o.x + o.w;
            } else if (Math.abs(o.y - top) <= 0.5) {
                minX = Math.min(minX, o.x);
                maxX = Math.max(maxX, o.x + o.w);
            }
        }
        return { top, vx, minX, maxX, onGround: top === GROUND };
    }

    function stepBall(b, h) {
        b.vy += G * h;
        b.x += b.vx * h;
        b.y += b.vy * h;
        b.t += h;
        if (b.y + BALL_R > GROUND) {
            b.y = GROUND - BALL_R;
            b.vy = -b.vy * 0.3;
            b.vx *= 0.7;
        }
        for (const o of s.blocks) {
            const cx = clamp(b.x, o.x, o.x + o.w);
            const cy = clamp(b.y, o.y, o.y + o.h);
            let dx = b.x - cx;
            let dy = b.y - cy;
            let d = Math.hypot(dx, dy);
            if (d >= BALL_R) continue;
            if (d < 0.001) {
                dx = b.x < o.x + o.w / 2 ? -1 : 1;
                dy = 0;
                d = 1;
            }
            const nx = dx / d;
            const ny = dy / d;
            b.x += nx * (BALL_R - Math.min(d, BALL_R));
            b.y += ny * (BALL_R - Math.min(d, BALL_R));
            const rel = (b.vx - o.vx) * nx + (b.vy - o.vy) * ny;
            if (rel < 0) {
                const j = (-(1.25) * rel) / (1 / BALL_M + 1 / o.m);
                b.vx += (j / BALL_M) * nx;
                b.vy += (j / BALL_M) * ny;
                o.vx -= (j / o.m) * nx;
                o.vy -= (j / o.m) * ny * 0.4;
            }
        }
        for (const m of s.snowmen) {
            if (!m.alive) continue;
            for (const [oy, r] of [[-14, 14], [-36, 10]]) {
                const d = Math.hypot(b.x - m.x, b.y - (m.y + oy));
                if (d < BALL_R + r) {
                    const speed = Math.hypot(b.vx - m.vx, b.vy - m.vy);
                    if (speed > 140) kill(m, 'Touché !');
                    else m.vx += b.vx * 0.3;
                    b.vx *= 0.6;
                    b.vy *= 0.6;
                    break;
                }
            }
        }
    }

    function stepWorld(h) {
        // Blocs : gravité et déplacement
        for (const o of s.blocks) {
            o.vy += G * h;
            o.x += o.vx * h;
            o.y += o.vy * h;
            o.vx *= 1 - 0.4 * h;
        }
        // Chocs latéraux entre blocs à la même hauteur
        for (let i = 0; i < s.blocks.length; i++) {
            for (let j = i + 1; j < s.blocks.length; j++) {
                const a = s.blocks[i];
                const c = s.blocks[j];
                const oy = Math.min(a.y + a.h, c.y + c.h) - Math.max(a.y, c.y);
                const ox = Math.min(a.x + a.w, c.x + c.w) - Math.max(a.x, c.x);
                if (oy <= 6 || ox <= 0) continue;
                const left = a.x < c.x ? a : c;
                const right = left === a ? c : a;
                const tot = left.m + right.m;
                left.x -= ox * (right.m / tot);
                right.x += ox * (left.m / tot);
                if (left.vx > right.vx) {
                    const v = (left.m * left.vx + right.m * right.vx) / tot;
                    left.vx = v;
                    right.vx = v;
                }
            }
        }
        // Appuis : du bas vers le haut, chaque bloc se pose sur ce qu'il y a dessous
        const order = [...s.blocks].sort((a, b) => b.y + b.h - (a.y + a.h));
        for (const o of order) {
            const sup = supportUnder(o.x, o.x + o.w, o.y + o.h, o);
            if (o.y + o.h >= sup.top) {
                o.y = sup.top - o.h;
                if (o.vy > 0) o.vy = 0;
                const f = Math.min(1, (sup.onGround ? 7 : 5) * h);
                o.vx += (sup.vx - o.vx) * f;
                // Basculement simplifié : centre au-delà de l'appui, le bloc glisse et tombe
                if (!sup.onGround) {
                    const cx = o.x + o.w / 2;
                    if (cx < sup.minX) o.vx -= 260 * h;
                    else if (cx > sup.maxX) o.vx += 260 * h;
                }
            }
        }
        s.blocks = s.blocks.filter((o) => o.x < W + 80 && o.x + o.w > -80);

        // Bonshommes
        for (const m of s.snowmen) {
            if (!m.alive) {
                m.deadT += h;
                continue;
            }
            m.vy += G * h;
            m.x += m.vx * h;
            m.y += m.vy * h;
            const sup = supportUnder(m.x - 8, m.x + 8, m.y, null);
            if (m.y >= sup.top) {
                const fall = m.airFrom != null ? sup.top - m.airFrom : 0;
                m.y = sup.top;
                if (m.vy > 0) m.vy = 0;
                m.vx += (sup.vx - m.vx) * Math.min(1, 6 * h);
                if (!m.grounded && fall > 45) kill(m, 'Patatras !');
                m.grounded = true;
                m.airFrom = null;
            } else {
                if (m.grounded) m.airFrom = m.y;
                m.grounded = false;
            }
            // Un bloc qui arrive vite emporte le bonhomme
            for (const o of s.blocks) {
                if (m.x + 13 < o.x || m.x - 13 > o.x + o.w || m.y - 46 > o.y + o.h || m.y < o.y) continue;
                const v = Math.hypot(o.vx, o.vy);
                if (v > 150) kill(m, 'Renversé !');
                else m.vx += (o.vx - m.vx) * 0.5;
            }
            if (m.x > W + 30 || m.x < -30) kill(m, 'Envolé !');
        }
    }

    function moving() {
        if (s.ball) return true;
        return s.blocks.some((o) => Math.abs(o.vx) > 8 || Math.abs(o.vy) > 30) || s.snowmen.some((m) => m.alive && Math.abs(m.vy) > 30);
    }

    function drawSnowman(ctx, m) {
        let a = 1;
        let sc = 1;
        if (!m.alive) {
            a = Math.max(0, 1 - m.deadT / 0.5);
            sc = 1 + m.deadT;
        }
        if (a <= 0) return;
        ctx.save();
        ctx.globalAlpha = a;
        ctx.translate(m.x, m.y);
        ctx.scale(sc, 1 / sc);
        circle(ctx, 0, -14, 14, '#ffffff');
        ctx.strokeStyle = '#b9cde3';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        circle(ctx, 0, -36, 10, '#ffffff');
        ctx.stroke();
        ctx.strokeStyle = '#1d2542';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-6, -42);
        ctx.lineTo(-2, -40);
        ctx.moveTo(6, -42);
        ctx.lineTo(2, -40);
        ctx.stroke();
        circle(ctx, -3.5, -37, 1.6, '#1d2542');
        circle(ctx, 3.5, -37, 1.6, '#1d2542');
        ctx.beginPath();
        ctx.moveTo(0, -35);
        ctx.lineTo(-9, -33);
        ctx.lineTo(0, -32);
        ctx.fillStyle = '#ff9f43';
        ctx.fill();
        roundRect(ctx, -9, -50, 18, 6, 2);
        ctx.fillStyle = '#8a94a8';
        ctx.fill();
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(-10, -27, 20, 4);
        ctx.restore();
        ctx.globalAlpha = 1;
    }

    function drawBlock(ctx, o) {
        roundRect(ctx, o.x, o.y, o.w, o.h, 4);
        ctx.fillStyle = o.h <= 16 ? '#b9dcf5' : '#cfeaff';
        ctx.fill();
        ctx.strokeStyle = '#7fc3f0';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.beginPath();
        ctx.moveTo(o.x + 5, o.y + 5);
        ctx.lineTo(o.x + Math.min(16, o.w - 6), o.y + 5);
        ctx.stroke();
    }

    function drawSling(ctx, back) {
        if (back) {
            ctx.strokeStyle = '#8a5a3c';
            ctx.lineWidth = 8;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(SLING.x + 2, GROUND);
            ctx.lineTo(SLING.x + 2, SLING.y + 30);
            ctx.lineTo(SLING.x - 12, SLING.y);
            ctx.moveTo(SLING.x + 2, SLING.y + 30);
            ctx.lineTo(SLING.x + 16, SLING.y);
            ctx.stroke();
            return;
        }
        if (s.phase === 'aim' && s.balls > 0) {
            const p = pullVector();
            const bx = SLING.x + p.x;
            const by = SLING.y + p.y;
            ctx.strokeStyle = '#5b3a26';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(SLING.x - 12, SLING.y);
            ctx.lineTo(bx, by);
            ctx.lineTo(SLING.x + 16, SLING.y);
            ctx.stroke();
            circle(ctx, bx, by, BALL_R, '#ffffff');
            ctx.strokeStyle = '#a9c6e4';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            if (s.drag || s.kb.used) {
                let x = bx;
                let y = by;
                let vx = -p.x * POWER;
                let vy = -p.y * POWER;
                ctx.fillStyle = 'rgba(29, 37, 66, 0.35)';
                for (let i = 0; i < 14; i++) {
                    for (let k = 0; k < 3; k++) {
                        vy += G * 0.016;
                        x += vx * 0.016;
                        y += vy * 0.016;
                    }
                    ctx.beginPath();
                    ctx.arc(x, y, 2.6, 0, TAU);
                    ctx.fill();
                }
            }
        }
    }

    // En local uniquement : accès à l'état depuis la console (tests)
    if (import.meta.env.DEV) window.fort = { s, loadLevel, launch };

    return {
        canPause() {
            return s.phase === 'aim' || s.phase === 'fly';
        },

        update(dt) {
            s.t += dt;
            updatePopups(s.popups, dt);
            for (let i = s.bursts.length - 1; i >= 0; i--) {
                s.bursts[i].t += dt;
                if (s.bursts[i].t > 0.6) s.bursts.splice(i, 1);
            }
            if (s.phase === 'over') {
                s.overT += dt;
                return;
            }
            if (s.phase === 'ready') return;
            if (s.kb.used && s.phase === 'aim') {
                if (s.kb.left) s.kb.angle = Math.max(-1.35, s.kb.angle - 1.2 * dt);
                if (s.kb.right) s.kb.angle = Math.min(0.15, s.kb.angle + 1.2 * dt);
                if (s.kb.up) s.kb.power = Math.min(1, s.kb.power + 0.6 * dt);
                if (s.kb.down) s.kb.power = Math.max(0.25, s.kb.power - 0.6 * dt);
            }
            const steps = 5;
            const h = dt / steps;
            for (let k = 0; k < steps; k++) {
                if (s.ball) stepBall(s.ball, h);
                stepWorld(h);
            }
            if (s.ball) {
                const b = s.ball;
                if (Math.hypot(b.vx, b.vy) < 25 && b.y >= GROUND - BALL_R - 1) b.rest += dt;
                if (b.x > W + 40 || b.x < -40 || b.rest > 0.4 || b.t > 6) s.ball = null;
            }

            const alive = s.snowmen.filter((m) => m.alive).length;
            if (s.phase === 'fly' || s.phase === 'aim') {
                if (alive === 0) {
                    s.clearT += dt;
                    if (s.clearT > 0.9) {
                        const bonus = s.balls * 150;
                        s.score += bonus;
                        if (bonus) addPopup(s.popups, W / 2, 120, `Fort tombé ! +${bonus} pour les boules restantes`, '#6ee7b7');
                        else addPopup(s.popups, W / 2, 120, 'Fort tombé !', '#6ee7b7');
                        s.phase = 'cleared';
                        s.settleT = 0;
                    }
                } else if (s.phase === 'fly') {
                    if (!moving()) {
                        s.settleT += dt;
                        if (s.settleT > 0.5) {
                            if (s.balls > 0) s.phase = 'aim';
                            else s.phase = 'lost';
                            s.settleT = 0;
                        }
                    } else if (!s.ball) {
                        s.settleT += dt * 0.25;
                        if (s.settleT > 1) s.phase = s.balls > 0 ? 'aim' : 'lost';
                    }
                }
            } else if (s.phase === 'cleared') {
                s.settleT += dt;
                if (s.settleT > 1.6) {
                    if (s.level + 1 < LEVELS.length) loadLevel(s.level + 1);
                    else {
                        s.won = true;
                        s.phase = 'over';
                        s.overT = 0;
                        s.record = api.reportScore(s.score);
                    }
                }
            } else if (s.phase === 'lost') {
                s.phase = 'over';
                s.overT = 0;
                s.record = api.reportScore(s.score);
            }
        },

        render(ctx) {
            skyGradient(ctx, W, H, [[0, '#9fd2f5'], [1, '#e3f3ff']]);
            hills(ctx, W, H, 330, 26, 0.008, 1.1, '#cfe3f5');
            hills(ctx, W, H, 360, 18, 0.013, 3.3, '#e0edf9');
            ctx.fillStyle = '#f4f8fd';
            ctx.fillRect(0, GROUND, W, H - GROUND);
            ctx.fillStyle = '#dbe8f5';
            ctx.fillRect(0, GROUND, W, 4);

            drawSling(ctx, true);
            drawPenguin(ctx, 46, GROUND, 66, {
                hat: 'beanie', hatColor: '#3b82f6', scarf: '#e94b4b', look: 2,
                flip: s.drag ? -1.8 : -0.4, mood: s.phase === 'cleared' || s.won ? 'happy' : 'normal'
            });
            for (const o of s.blocks) drawBlock(ctx, o);
            for (const m of s.snowmen) drawSnowman(ctx, m);
            drawSling(ctx, false);
            if (s.ball) {
                circle(ctx, s.ball.x, s.ball.y, BALL_R, '#ffffff');
                ctx.strokeStyle = '#a9c6e4';
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }
            for (const b of s.bursts) {
                const k = b.t / 0.6;
                ctx.globalAlpha = 1 - k;
                for (let i = 0; i < 8; i++) {
                    const a = (i / 8) * TAU;
                    circle(ctx, b.x + Math.cos(a) * k * 34, b.y + Math.sin(a) * k * 26, 4, '#ffffff');
                }
                ctx.globalAlpha = 1;
            }
            drawPopups(ctx, s.popups);

            hudPill(ctx, 16, 14, 'Fort', `${s.level + 1} / ${LEVELS.length}`);
            hudPill(ctx, 150, 14, 'Boules', s.balls);
            hudPill(ctx, W - 16, 14, 'Score', s.score, 'right');
            if (s.phase === 'aim' && !s.drag && s.level === 0 && s.balls === LEVELS[0].balls) {
                text(ctx, 'Tire la boule vers l’arrière, puis relâche', SLING.x + 40, SLING.y - 60, { size: 15, weight: 800, font: DISPLAY, color: '#1d2542' });
            }

            if (s.phase === 'ready') {
                drawOverlay(ctx, W, H, 'Fort de neige', [
                    'Fais tomber les bonshommes grognons de leur forteresse.',
                    'Clique, tire vers l’arrière, relâche. Ou ← → pour viser, ↑ ↓ pour la force, Espace pour tirer.',
                    'Les boules qui restent rapportent un bonus. 5 forts.',
                    { text: 'Clique ou appuie sur Entrée pour commencer', color: '#ffd36e', weight: 700 }
                ], 700);
            } else if (s.phase === 'over' && s.overT > 0.4) {
                drawOverlay(ctx, W, H, s.won ? 'Tous les forts sont tombés !' : 'Plus de boules…', [
                    { text: `${s.score} points`, size: 24, weight: 800 },
                    s.won ? 'Les bonshommes grognons rendent les armes.' : `Arrivé au fort ${s.level + 1} sur ${LEVELS.length}.`,
                    s.record ? { text: 'Nouveau record !', color: '#ffd36e', weight: 700 } : ' ',
                    { text: s.overT > 1.2 ? 'Clique ou Entrée pour rejouer' : ' ', color: 'rgba(255,255,255,0.75)' }
                ], 600);
            }
        },

        pointerDown(x, y) {
            if (s.phase === 'ready' || (s.phase === 'over' && s.overT > 1.2)) {
                start();
                return;
            }
            if (s.phase !== 'aim' || s.balls <= 0) return;
            s.kb.used = false;
            s.drag = { x: 0, y: 0, ox: x, oy: y };
        },

        pointerMove(x, y) {
            if (!s.drag) return;
            let px = x - s.drag.ox;
            let py = y - s.drag.oy;
            px = Math.min(px, 0);
            const d = Math.hypot(px, py);
            if (d > MAX_PULL) {
                px = (px / d) * MAX_PULL;
                py = (py / d) * MAX_PULL;
            }
            s.drag.x = px;
            s.drag.y = py;
        },

        pointerUp() {
            if (s.drag) launch();
            s.drag = null;
        },

        keyDown(code, repeat) {
            const map = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
            if (map[code]) {
                s.kb[map[code]] = true;
                s.kb.used = true;
                s.drag = null;
            }
            if (repeat) return;
            if (code === 'Enter' && (s.phase === 'ready' || (s.phase === 'over' && s.overT > 1.2))) {
                start();
                return;
            }
            if (code === 'Space') {
                if (s.phase === 'ready' || (s.phase === 'over' && s.overT > 1.2)) start();
                else {
                    s.kb.used = true;
                    launch();
                }
            }
        },

        keyUp(code) {
            const map = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
            if (map[code]) s.kb[map[code]] = false;
        },

        blur() {
            s.drag = null;
            Object.assign(s.kb, { left: false, right: false, up: false, down: false });
        }
    };
}

export default function FortGame({ onScore }) {
    return (
        <GameCanvas
            pausable
            create={createFort}
            onScore={onScore}
            label="Fort de neige"
            controls={[
                { code: 'ArrowLeft', text: '↺', label: 'Viser plus haut' },
                { code: 'ArrowRight', text: '↻', label: 'Viser plus bas' },
                { code: 'ArrowUp', text: '+', label: 'Plus de force' },
                { code: 'ArrowDown', text: '−', label: 'Moins de force' },
                { code: 'Space', text: 'Tirer', label: 'Tirer' }
            ]}
        />
    );
}
