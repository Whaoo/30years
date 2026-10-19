import GameCanvas from './GameCanvas';
import {
    TAU, circle, drawFlakes, drawOverlay, drawPenguin, hudPill, makeFlakes,
    rand, skyGradient, updateFlakes
} from './draw';

// Pingouin volant : accroché à son parapluie, passer entre les stalactites. Une seule touche.
const PX = 200;
const GROUND = 420;
const COL_W = 64;
const SPACING = 270;

function createFlappy(api) {
    const W = api.width;
    const H = api.height;
    const s = {
        phase: 'ready',
        y: 210,
        vy: 0,
        cols: [],
        score: 0,
        speed: 190,
        t: 0,
        overT: 0,
        record: false,
        flap: 0,
        flakes: makeFlakes(35, W, H),
        stars: Array.from({ length: 45 }, () => ({ x: rand(0, W), y: rand(0, 260), r: rand(0.6, 1.6) }))
    };

    const gapSize = () => Math.max(128, 170 - s.score * 2);

    function addColumn(x) {
        const gap = gapSize();
        const center = rand(70 + gap / 2, GROUND - 40 - gap / 2);
        s.cols.push({ x, top: center - gap / 2, bottom: center + gap / 2, passed: false, seed: rand(0, 100) });
    }

    function start() {
        Object.assign(s, { phase: 'play', y: 210, vy: -200, cols: [], score: 0, speed: 190, record: false });
        addColumn(W + 80);
        addColumn(W + 80 + SPACING);
    }

    function flap() {
        if (s.phase === 'ready' || (s.phase === 'over' && s.overT > 0.7)) {
            start();
            return;
        }
        if (s.phase !== 'play') return;
        s.vy = -390;
        s.flap = 0.25;
    }

    function finish() {
        s.phase = 'over';
        s.overT = 0;
        s.record = api.reportScore(s.score);
    }

    // Deux cercles de collision : le corps et le parapluie
    function hitCircles() {
        return [
            { x: PX, y: s.y, r: 17 },
            { x: PX + 4, y: s.y - 44, r: 18 }
        ];
    }

    function drawIcicles(ctx, c) {
        const g = ctx.createLinearGradient(c.x, 0, c.x + COL_W, 0);
        g.addColorStop(0, '#d8f1ff');
        g.addColorStop(0.5, '#ffffff');
        g.addColorStop(1, '#9fd2f2');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(c.x, 0);
        ctx.lineTo(c.x + COL_W, 0);
        ctx.lineTo(c.x + COL_W, c.top - 24);
        const n = 4;
        for (let i = n; i >= 0; i--) {
            const px = c.x + (COL_W / n) * i;
            const tip = i % 2 === 0 ? c.top : c.top - 22 + ((c.seed + i) % 3) * 4;
            ctx.lineTo(px, i === n ? c.top - 24 : tip);
        }
        ctx.lineTo(c.x, c.top - 24);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(c.x, GROUND);
        ctx.lineTo(c.x, c.bottom + 26);
        for (let i = 0; i <= 4; i++) {
            const px = c.x + (COL_W / 4) * i;
            ctx.lineTo(px, i % 2 === 1 ? c.bottom : c.bottom + 20);
        }
        ctx.lineTo(c.x + COL_W, GROUND);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    function drawUmbrella(ctx, x, y, open) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(clampAngle(s.vy));
        ctx.strokeStyle = '#4a3527';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, -8);
        ctx.lineTo(0, 30);
        ctx.stroke();
        const wdt = open ? 34 : 28;
        ctx.beginPath();
        ctx.moveTo(-wdt, -6);
        ctx.quadraticCurveTo(0, -42 - (open ? 4 : 0), wdt, -6);
        for (let i = 3; i >= 0; i--) {
            const x0 = -wdt + (wdt / 2) * i;
            ctx.quadraticCurveTo(x0 + wdt / 4, -14, x0, -6);
        }
        ctx.closePath();
        ctx.fillStyle = '#e94b4b';
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(0, -38);
        ctx.quadraticCurveTo(-8, -20, -wdt / 2, -8);
        ctx.moveTo(0, -38);
        ctx.quadraticCurveTo(8, -20, wdt / 2, -8);
        ctx.strokeStyle = 'rgba(255,255,255,0.45)';
        ctx.lineWidth = 2;
        ctx.stroke();
        circle(ctx, 0, -40, 3, '#ffd36e');
        ctx.restore();
    }

    function clampAngle(vy) {
        return Math.max(-0.25, Math.min(0.35, vy / 1400));
    }

    return {
        update(dt) {
            s.t += dt;
            s.flap = Math.max(0, s.flap - dt);
            updateFlakes(s.flakes, dt, W, H, -40);
            if (s.phase === 'over') {
                s.overT += dt;
                if (s.y < GROUND - 20) {
                    s.vy = Math.min(560, s.vy + 1300 * dt);
                    s.y = Math.min(GROUND - 20, s.y + s.vy * dt);
                }
                return;
            }
            if (s.phase === 'ready') {
                s.y = 210 + Math.sin(s.t * 2.4) * 10;
                return;
            }

            s.speed = Math.min(300, 190 + s.score * 3);
            s.vy = Math.min(520, s.vy + 1300 * dt);
            s.y += s.vy * dt;

            for (const c of s.cols) c.x -= s.speed * dt;
            if (s.cols.length && s.cols[0].x + COL_W < -10) s.cols.shift();
            const last = s.cols[s.cols.length - 1];
            if (last && last.x < W + 80 - SPACING) addColumn(last.x + SPACING);

            for (const c of s.cols) {
                if (!c.passed && c.x + COL_W < PX - 17) {
                    c.passed = true;
                    s.score += 1;
                }
            }

            if (s.y > GROUND - 20 || s.y < 50) {
                finish();
                return;
            }
            for (const hc of hitCircles()) {
                for (const c of s.cols) {
                    const inX = hc.x + hc.r * 0.8 > c.x && hc.x - hc.r * 0.8 < c.x + COL_W;
                    if (inX && (hc.y - hc.r * 0.8 < c.top || hc.y + hc.r * 0.8 > c.bottom)) {
                        finish();
                        return;
                    }
                }
            }
        },

        render(ctx) {
            skyGradient(ctx, W, H, [[0, '#060c24'], [0.6, '#15306a'], [1, '#3f6fa8']]);
            ctx.fillStyle = 'rgba(255,255,255,0.85)';
            for (const st of s.stars) {
                ctx.beginPath();
                ctx.arc(st.x, st.y, st.r, 0, TAU);
                ctx.fill();
            }
            for (let band = 0; band < 3; band++) {
                ctx.beginPath();
                for (let x = 0; x <= W; x += 20) {
                    const y = 70 + band * 24 + Math.sin(x * 0.01 + s.t * 0.5 + band) * 16;
                    if (x === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.strokeStyle = band === 1 ? 'rgba(180,120,255,0.18)' : 'rgba(110,231,183,0.2)';
                ctx.lineWidth = 18;
                ctx.stroke();
            }
            drawFlakes(ctx, s.flakes, 0.6);

            for (const c of s.cols) drawIcicles(ctx, c);

            ctx.fillStyle = '#e8f1fb';
            ctx.fillRect(0, GROUND, W, H - GROUND);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, GROUND, W, 3);

            const over = s.phase === 'over';
            drawUmbrella(ctx, PX + 4, s.y - 30, s.flap > 0);
            drawPenguin(ctx, PX, s.y + 26, 62, {
                hat: 'none', scarf: '#ffd36e',
                mood: over ? 'dizzy' : s.flap > 0 ? 'happy' : 'normal',
                flip: -2.7,
                rotate: clampAngle(s.vy) * 0.6,
                look: 2
            });

            hudPill(ctx, W - 16, 14, 'Score', s.score, 'right');

            if (s.phase === 'ready') {
                drawOverlay(ctx, W, H, 'Pingouin volant', [
                    'Chaque appui donne un coup de parapluie vers le haut.',
                    { text: 'Espace, ↑ ou clic pour commencer', color: '#ffd36e', weight: 700 }
                ]);
            } else if (over && s.overT > 0.4) {
                drawOverlay(ctx, W, H, 'Atterrissage forcé !', [
                    { text: `${s.score} stalactite${s.score > 1 ? 's' : ''} passée${s.score > 1 ? 's' : ''}`, size: 24, weight: 800 },
                    s.record ? { text: 'Nouveau record !', color: '#ffd36e', weight: 700 } : 'On remonte ?',
                    { text: s.overT > 0.7 ? 'Espace ou clic pour rejouer' : ' ', color: 'rgba(255,255,255,0.75)' }
                ]);
            }
        },

        pointerDown() {
            flap();
        },

        keyDown(code, repeat) {
            if (repeat) return;
            if (code === 'Space' || code === 'ArrowUp' || code === 'KeyW' || code === 'Enter') flap();
        }
    };
}

export default function FlappyGame({ onScore }) {
    return <GameCanvas create={createFlappy} onScore={onScore} label="Pingouin volant" />;
}
