import GameCanvas from './GameCanvas';
import {
    DISPLAY, TAU, addPopup, circle, clamp, drawOverlay, drawPenguin, drawPopups,
    hudPill, roundRect, skyGradient, text, updatePopups
} from './draw';

// Curling des pingouins : viser, doser la force, balayer. 5 pierres, points selon la distance au centre.
const STONES = 5;
const R = 13;
const START = { x: 92, y: 225 };
const HOUSE = { x: 650, y: 225 };
const SHEET = { left: 20, right: 790, top: 70, bottom: 380 };
const HOG = 470;
const RINGS = [
    { r: 72, color: '#5aa9e6' },
    { r: 52, color: '#f4f9ff' },
    { r: 32, color: '#e94b4b' },
    { r: 12, color: '#f4f9ff' }
];

function pointsFor(stone) {
    const d = Math.hypot(stone.x - HOUSE.x, stone.y - HOUSE.y);
    if (d <= 12 + R * 0.5) return 10;
    if (d <= 32 + R * 0.5) return 5;
    if (d <= 52 + R * 0.5) return 3;
    if (d <= 72 + R * 0.5) return 1;
    return 0;
}

function createCurling(api) {
    const W = api.width;
    const H = api.height;
    const s = {
        phase: 'ready',
        stones: [],
        left: STONES,
        current: null,
        holding: false,
        holdT: 0,
        power: 0,
        aimY: START.y,
        aimKeys: 0,
        sweeping: false,
        popups: [],
        t: 0,
        overT: 0,
        record: false,
        message: ''
    };

    const score = () => s.stones.reduce((sum, st) => sum + (st.out ? 0 : pointsFor(st)), 0);
    const angle = () => clamp(Math.atan2(s.aimY - START.y, HOUSE.x - START.x), -0.2, 0.2);

    function start() {
        Object.assign(s, { phase: 'aim', stones: [], left: STONES, current: null, holding: false, power: 0, popups: [], record: false, message: '' });
    }

    function beginHold() {
        if (s.phase === 'aim') {
            s.holding = true;
            s.holdT = 0;
        } else if (s.phase === 'moving') {
            s.sweeping = true;
        }
    }

    function endHold() {
        if (s.phase === 'aim' && s.holding) {
            s.holding = false;
            const a = angle();
            const v = 220 + s.power * 300;
            const stone = { x: START.x, y: START.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, out: false, fade: 1 };
            s.stones.push(stone);
            s.current = stone;
            s.left -= 1;
            s.phase = 'moving';
            s.message = '';
        }
        s.sweeping = false;
    }

    function finishThrow() {
        const st = s.current;
        if (st && !st.out && st.x < HOG) {
            st.out = true;
            addPopup(s.popups, st.x, st.y - 24, 'Trop court !', '#ff9ad5');
        } else if (st && !st.out) {
            const pts = pointsFor(st);
            if (pts === 10) addPopup(s.popups, st.x, st.y - 24, 'En plein cœur ! +10', '#ffd36e');
            else if (pts > 0) addPopup(s.popups, st.x, st.y - 24, `+${pts}`, '#ffffff');
        }
        s.current = null;
        s.sweeping = false;
        if (s.left === 0) {
            s.phase = 'over';
            s.overT = 0;
            s.record = api.reportScore(score());
        } else {
            s.phase = 'aim';
        }
    }

    function collide(a, b) {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy);
        if (dist === 0 || dist >= R * 2) return;
        const nx = dx / dist;
        const ny = dy / dist;
        const overlap = R * 2 - dist;
        a.x -= nx * overlap / 2;
        a.y -= ny * overlap / 2;
        b.x += nx * overlap / 2;
        b.y += ny * overlap / 2;
        const rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
        if (rel <= 0) return;
        a.vx -= rel * nx;
        a.vy -= rel * ny;
        b.vx += rel * nx;
        b.vy += rel * ny;
    }

    return {
        update(dt) {
            s.t += dt;
            updatePopups(s.popups, dt);
            if (s.phase === 'over') s.overT += dt;
            if (s.phase === 'aim') {
                if (s.aimKeys) s.aimY = clamp(s.aimY + s.aimKeys * 160 * dt, SHEET.top, SHEET.bottom);
                if (s.holding) {
                    s.holdT += dt;
                    s.power = 1 - Math.abs(((s.holdT / 0.8) % 2) - 1);
                }
            }
            if (s.phase !== 'moving') return;

            const steps = 4;
            for (let k = 0; k < steps; k++) {
                const h = dt / steps;
                for (const st of s.stones) {
                    if (st.out) continue;
                    const sp = Math.hypot(st.vx, st.vy);
                    if (sp > 0) {
                        const decel = (st === s.current && s.sweeping ? 70 : 125) * h;
                        const ns = Math.max(0, sp - decel);
                        st.vx *= ns / sp;
                        st.vy *= ns / sp;
                        st.x += st.vx * h;
                        st.y += st.vy * h;
                    }
                    if (st.x > SHEET.right - R || st.y < SHEET.top + R || st.y > SHEET.bottom - R) {
                        st.out = true;
                        st.vx = 0;
                        st.vy = 0;
                    }
                }
                const live = s.stones.filter((st) => !st.out);
                for (let i = 0; i < live.length; i++) {
                    for (let j = i + 1; j < live.length; j++) collide(live[i], live[j]);
                }
            }
            const moving = s.stones.some((st) => !st.out && Math.hypot(st.vx, st.vy) > 1.5);
            if (!moving) finishThrow();
        },

        render(ctx) {
            skyGradient(ctx, W, H, [[0, '#13294f'], [1, '#2c5590']]);
            roundRect(ctx, SHEET.left, SHEET.top, SHEET.right - SHEET.left, SHEET.bottom - SHEET.top, 18);
            const g = ctx.createLinearGradient(0, SHEET.top, 0, SHEET.bottom);
            g.addColorStop(0, '#eef7ff');
            g.addColorStop(1, '#d6eafa');
            ctx.fillStyle = g;
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.9)';
            ctx.lineWidth = 2;
            ctx.stroke();

            for (const ring of RINGS) circle(ctx, HOUSE.x, HOUSE.y, ring.r, ring.color);
            ctx.strokeStyle = 'rgba(30, 60, 110, 0.25)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(SHEET.left + 10, HOUSE.y);
            ctx.lineTo(SHEET.right - 10, HOUSE.y);
            ctx.moveTo(HOUSE.x, SHEET.top + 6);
            ctx.lineTo(HOUSE.x, SHEET.bottom - 6);
            ctx.stroke();
            ctx.strokeStyle = 'rgba(233, 75, 75, 0.55)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(HOG, SHEET.top + 4);
            ctx.lineTo(HOG, SHEET.bottom - 4);
            ctx.stroke();

            if (s.phase === 'aim') {
                const a = angle();
                const len = 70 + s.power * 140;
                ctx.strokeStyle = 'rgba(20, 23, 43, 0.5)';
                ctx.setLineDash([8, 8]);
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(START.x, START.y);
                ctx.lineTo(START.x + Math.cos(a) * len, START.y + Math.sin(a) * len);
                ctx.stroke();
                ctx.setLineDash([]);
            }

            for (const st of s.stones) {
                if (st.out) continue;
                drawStone(ctx, st.x, st.y);
            }
            if (s.phase === 'aim') drawStone(ctx, START.x, START.y);

            if (s.current && s.sweeping) {
                ctx.strokeStyle = 'rgba(255, 159, 67, 0.9)';
                ctx.lineWidth = 3;
                const bx = s.current.x + 26;
                for (let i = -1; i <= 1; i++) {
                    ctx.beginPath();
                    ctx.moveTo(bx + Math.sin(s.t * 30 + i) * 6, s.current.y + i * 8 - 6);
                    ctx.lineTo(bx + 10 + Math.sin(s.t * 30 + i) * 6, s.current.y + i * 8 + 6);
                    ctx.stroke();
                }
                text(ctx, 'Balaie !', s.current.x, s.current.y - 26, { size: 15, weight: 800, align: 'center', color: '#ff9f43', font: DISPLAY });
            }

            drawPenguin(ctx, 46, 268, 84, {
                hat: 'beanie', scarf: '#e94b4b', hatColor: '#1d4ed8', flip: s.phase === 'aim' ? -1 : -0.3, look: 2,
                mood: s.phase === 'over' ? 'happy' : 'normal'
            });

            if (s.phase === 'aim' || s.holding) {
                roundRect(ctx, 34, 296, 24, 74, 8);
                ctx.fillStyle = 'rgba(10, 14, 34, 0.6)';
                ctx.fill();
                const ph = 66 * s.power;
                roundRect(ctx, 38, 366 - ph, 16, ph, 5);
                ctx.fillStyle = s.power > 0.75 ? '#e94b4b' : '#ffd36e';
                ctx.fill();
            }

            drawPopups(ctx, s.popups);
            hudPill(ctx, 16, 14, 'Score', score());
            hudPill(ctx, W - 16, 14, 'Pierres', `${s.left} / ${STONES}`, 'right');

            if (s.phase === 'ready') {
                drawOverlay(ctx, W, H, 'Curling des pingouins', [
                    'Vise à la souris, maintiens le clic pour doser la force,',
                    'relâche pour lancer. Reclique en route pour balayer.',
                    { text: 'Clique ou Entrée pour commencer', color: '#ffd36e', weight: 700 }
                ]);
            } else if (s.phase === 'over') {
                drawOverlay(ctx, W, H, 'Fin de la manche !', [
                    { text: `${score()} points`, size: 24, weight: 800 },
                    s.record ? { text: 'Nouveau record !', color: '#ffd36e', weight: 700 } : 'Belle glisse.',
                    { text: s.overT > 0.8 ? 'Clique ou Entrée pour rejouer' : ' ', color: 'rgba(255,255,255,0.75)' }
                ]);
            }
        },

        pointerDown(x, y) {
            if (s.phase === 'ready' || (s.phase === 'over' && s.overT > 0.8)) {
                start();
                return;
            }
            if (s.phase === 'aim') s.aimY = clamp(y, SHEET.top, SHEET.bottom);
            beginHold();
        },

        pointerMove(x, y) {
            if (s.phase === 'aim') s.aimY = clamp(y, SHEET.top, SHEET.bottom);
        },

        pointerUp() {
            endHold();
        },

        keyDown(code, repeat) {
            if (code === 'ArrowUp') s.aimKeys = -1;
            if (code === 'ArrowDown') s.aimKeys = 1;
            if (repeat) return;
            if (code === 'Enter' && (s.phase === 'ready' || (s.phase === 'over' && s.overT > 0.8))) {
                start();
                return;
            }
            if (code === 'Space') {
                if (s.phase === 'ready' || (s.phase === 'over' && s.overT > 0.8)) start();
                else beginHold();
            }
        },

        keyUp(code) {
            if (code === 'ArrowUp' || code === 'ArrowDown') s.aimKeys = 0;
            if (code === 'Space') endHold();
        }
    };
}

function drawStone(ctx, x, y, scale = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    circle(ctx, 0, 2, R, 'rgba(20, 30, 60, 0.25)');
    circle(ctx, 0, 0, R, '#8d99ad');
    circle(ctx, 0, 0, R - 3, '#b3bdcc');
    circle(ctx, -3, -4, 3, 'rgba(255,255,255,0.6)');
    roundRect(ctx, -7, -3, 14, 6, 3);
    ctx.fillStyle = '#e94b4b';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, TAU);
    ctx.strokeStyle = 'rgba(40, 50, 70, 0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
}

export default function CurlingGame({ onScore }) {
    return (
        <GameCanvas
            create={createCurling}
            onScore={onScore}
            label="Curling des pingouins"
            controls={[
                { code: 'ArrowUp', text: '▲', label: 'Viser plus haut' },
                { code: 'Space', text: 'Lancer / balayer', label: 'Maintenir pour doser, relâcher pour lancer' },
                { code: 'ArrowDown', text: '▼', label: 'Viser plus bas' }
            ]}
        />
    );
}
