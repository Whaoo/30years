import GameCanvas from './GameCanvas';
import {
    TAU, circle, drawFlakes, drawOverlay, drawPenguin, ellipse, hills,
    hudPill, makeFlakes, rand, roundRect, skyGradient, updateFlakes
} from './draw';

// Saut sur la banquise : course infinie, sauter les blocs de glace, glisser sous les mouettes.
const GROUND = 372;
const PX = 130;
const PENGUIN_H = 92;

function createRunner(api) {
    const W = api.width;
    const H = api.height;
    const s = {
        phase: 'ready',
        y: 0,
        vy: 0,
        jumpHeld: false,
        downKey: false,
        downPointer: false,
        ptrY: null,
        dist: 0,
        speed: 380,
        elapsed: 0,
        obstacles: [],
        next: 600,
        far: 0,
        near: 0,
        t: 0,
        overT: 0,
        record: false,
        flakes: makeFlakes(30, W, H),
        stars: Array.from({ length: 40 }, () => ({ x: rand(0, W), y: rand(0, 200), r: rand(0.6, 1.6) }))
    };

    const score = () => Math.floor(s.dist / 10);
    const onGround = () => s.y >= 0 && s.vy >= 0;
    const sliding = () => (s.downKey || s.downPointer) && onGround() && s.phase === 'play';

    function start() {
        Object.assign(s, {
            phase: 'play', y: 0, vy: 0, jumpHeld: false, downKey: false, downPointer: false,
            dist: 0, speed: 380, elapsed: 0, obstacles: [], next: 500, record: false
        });
    }

    function jump() {
        if (s.phase !== 'play') {
            if (s.phase === 'ready' || s.overT > 0.6) start();
            return;
        }
        if (onGround()) {
            s.vy = -800;
            s.y = -0.01;
        }
        s.jumpHeld = true;
    }

    function spawn() {
        const sc = score();
        const roll = Math.random();
        let o;
        if (sc > 60 && roll < 0.2) o = { kind: 'birdHigh', w: 46, h: 26, top: GROUND - 98 };
        else if (sc > 30 && roll < 0.36) o = { kind: 'birdLow', w: 46, h: 26, top: GROUND - 60 };
        else if (roll < 0.6) o = { kind: 'snowman', w: 40, h: 66 };
        else {
            const w = rand(30, 56);
            o = { kind: 'block', w, h: rand(38, 64) };
            if (sc > 40 && Math.random() < 0.25) o.w = w * 1.9;
        }
        o.x = W + 30;
        if (o.top == null) o.top = GROUND - o.h;
        o.flap = rand(0, TAU);
        s.obstacles.push(o);
    }

    function hitbox() {
        if (sliding()) return { x: PX - 40, y: GROUND - 44, w: 78, h: 42 };
        return { x: PX - 22, y: GROUND + s.y - 84, w: 44, h: 82 };
    }

    function finish() {
        s.phase = 'over';
        s.overT = 0;
        s.record = api.reportScore(score());
    }

    function drawObstacle(ctx, o) {
        if (o.kind === 'block') {
            roundRect(ctx, o.x, o.top, o.w, o.h, 6);
            const g = ctx.createLinearGradient(o.x, o.top, o.x + o.w, o.top + o.h);
            g.addColorStop(0, '#e6f6ff');
            g.addColorStop(1, '#8fc8ee');
            ctx.fillStyle = g;
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.9)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.fillStyle = 'rgba(255,255,255,0.8)';
            ctx.fillRect(o.x + 6, o.top + 6, Math.min(14, o.w * 0.3), 3);
        } else if (o.kind === 'snowman') {
            const cx = o.x + o.w / 2;
            circle(ctx, cx, o.top + 44, 22, '#f4f7fb');
            circle(ctx, cx, o.top + 16, 15, '#ffffff');
            circle(ctx, cx - 5, o.top + 13, 2, '#14172b');
            circle(ctx, cx + 5, o.top + 13, 2, '#14172b');
            ctx.beginPath();
            ctx.moveTo(cx, o.top + 18);
            ctx.lineTo(cx - 12, o.top + 20);
            ctx.lineTo(cx, o.top + 22);
            ctx.fillStyle = '#ff9f43';
            ctx.fill();
            ctx.fillStyle = '#e94b4b';
            ctx.fillRect(cx - 14, o.top + 28, 28, 5);
        } else {
            const cx = o.x + o.w / 2;
            const cy = o.top + o.h / 2;
            const wing = Math.sin(s.t * 14 + o.flap) * 10;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 4;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(cx - 22, cy - wing);
            ctx.quadraticCurveTo(cx - 10, cy - 6, cx, cy);
            ctx.quadraticCurveTo(cx + 10, cy - 6, cx + 22, cy - wing);
            ctx.stroke();
            ellipse(ctx, cx, cy + 2, 12, 7, '#f4f7fb');
            circle(ctx, cx - 9, cy - 1, 5, '#f4f7fb');
            ctx.beginPath();
            ctx.moveTo(cx - 13, cy - 1);
            ctx.lineTo(cx - 20, cy + 1);
            ctx.lineTo(cx - 13, cy + 2);
            ctx.fillStyle = '#ff9f43';
            ctx.fill();
            circle(ctx, cx - 10, cy - 2, 1.4, '#14172b');
        }
    }

    return {
        update(dt) {
            s.t += dt;
            updateFlakes(s.flakes, dt, W, H, -s.speed * 0.05);
            const pace = s.phase === 'play' ? s.speed : 160;
            s.far += pace * 0.08 * dt;
            s.near += pace * 0.3 * dt;
            if (s.phase === 'over') s.overT += dt;
            if (s.phase !== 'play') return;

            s.elapsed += dt;
            s.speed = Math.min(920, 380 + s.elapsed * 13);
            s.dist += s.speed * dt;

            if (!onGround() || s.y < 0) {
                const g = s.vy < 0 && s.jumpHeld ? 1500 : 2600;
                s.vy += g * dt;
                s.y += s.vy * dt;
                if (s.y >= 0) {
                    s.y = 0;
                    s.vy = 0;
                }
            }

            for (let i = s.obstacles.length - 1; i >= 0; i--) {
                const o = s.obstacles[i];
                o.x -= s.speed * dt;
                if (o.x + o.w < -30) s.obstacles.splice(i, 1);
            }
            s.next -= s.speed * dt;
            if (s.next <= 0) {
                spawn();
                s.next = s.speed * rand(0.8, 1.5);
            }

            const hb = hitbox();
            for (const o of s.obstacles) {
                const pad = 5;
                if (hb.x < o.x + o.w - pad && hb.x + hb.w > o.x + pad && hb.y < o.top + o.h - pad && hb.y + hb.h > o.top + pad) {
                    finish();
                    break;
                }
            }
        },

        render(ctx) {
            const sc = score();
            skyGradient(ctx, W, H, [[0, '#0a1430'], [0.7, '#21447e'], [1, '#3f6fa8']]);
            ctx.fillStyle = 'rgba(255,255,255,0.8)';
            for (const st of s.stars) {
                ctx.beginPath();
                ctx.arc(st.x, st.y, st.r, 0, TAU);
                ctx.fill();
            }
            if (sc >= 300) {
                const a = Math.min(0.5, (sc - 300) / 400);
                for (let band = 0; band < 3; band++) {
                    ctx.beginPath();
                    for (let x = 0; x <= W; x += 20) {
                        const y = 60 + band * 26 + Math.sin(x * 0.012 + s.t * 0.8 + band) * 18;
                        if (x === 0) ctx.moveTo(x, y);
                        else ctx.lineTo(x, y);
                    }
                    ctx.strokeStyle = band === 1 ? `rgba(180,120,255,${a})` : `rgba(110,231,183,${a})`;
                    ctx.lineWidth = 16;
                    ctx.stroke();
                }
            }
            hills(ctx, W, H, 250, 40, 0.009, s.far * 0.009, '#2c5590');
            hills(ctx, W, H, 300, 26, 0.016, s.near * 0.016, '#4c7bb4');
            drawFlakes(ctx, s.flakes, 0.65);

            ctx.fillStyle = '#e8f1fb';
            ctx.fillRect(0, GROUND, W, H - GROUND);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, GROUND, W, 4);
            ctx.fillStyle = 'rgba(120,150,190,0.35)';
            const off = (s.near * 3) % 70;
            for (let x = -off; x < W; x += 70) ctx.fillRect(x, GROUND + 22, 26, 3);
            for (let x = -((s.near * 3 + 35) % 90); x < W; x += 90) ctx.fillRect(x, GROUND + 48, 14, 3);

            for (const o of s.obstacles) drawObstacle(ctx, o);

            const over = s.phase === 'over';
            const outfit = { hat: 'beanie', scarf: '#f472b6', hatColor: '#7c3aed', mood: over ? 'dizzy' : 'normal' };
            if (sliding()) {
                drawPenguin(ctx, PX - 44, GROUND - 23, PENGUIN_H, { ...outfit, rotate: Math.PI / 2, flip: -0.4 });
            } else {
                const running = s.phase === 'play' && onGround();
                const bob = running ? -Math.abs(Math.sin(s.t * 14)) * 4 : 0;
                drawPenguin(ctx, PX, GROUND + s.y + bob, PENGUIN_H, {
                    ...outfit,
                    rotate: running ? Math.sin(s.t * 14) * 0.06 : 0,
                    flip: onGround() ? -0.3 + Math.sin(s.t * 14) * 0.3 : -2.2,
                    look: 2
                });
            }

            hudPill(ctx, W - 16, 14, 'Score', sc, 'right');
            if (sc >= 300 && s.phase === 'play') hudPill(ctx, 16, 14, 'Aurore', 'activée');

            if (s.phase === 'ready') {
                drawOverlay(ctx, W, H, 'Saut sur la banquise', [
                    'Saute les blocs, glisse sous les mouettes (↓).',
                    { text: 'Espace, ↑ ou clic pour commencer', color: '#ffd36e', weight: 700 }
                ]);
            } else if (over) {
                drawOverlay(ctx, W, H, 'Plouf !', [
                    { text: `${sc} points`, size: 24, weight: 800 },
                    s.record ? { text: 'Nouveau record !', color: '#ffd36e', weight: 700 } : 'Encore un essai ?',
                    { text: s.overT > 0.6 ? 'Espace ou clic pour rejouer' : ' ', color: 'rgba(255,255,255,0.75)' }
                ]);
            }
        },

        pointerDown(x, y) {
            s.ptrY = y;
            jump();
        },

        pointerMove(x, y) {
            if (s.ptrY != null && y - s.ptrY > 30) {
                s.downPointer = true;
                s.jumpHeld = false;
            }
        },

        pointerUp() {
            s.ptrY = null;
            s.downPointer = false;
            s.jumpHeld = false;
        },

        keyDown(code, repeat) {
            if (code === 'ArrowDown' || code === 'KeyS') {
                s.downKey = true;
                if (s.vy < 0) s.vy = 0;
                return;
            }
            if (repeat) return;
            if (code === 'Space' || code === 'ArrowUp' || code === 'KeyW' || code === 'Enter') jump();
        },

        keyUp(code) {
            if (code === 'ArrowDown' || code === 'KeyS') s.downKey = false;
            if (code === 'Space' || code === 'ArrowUp' || code === 'KeyW' || code === 'Enter') s.jumpHeld = false;
        }
    };
}

export default function RunnerGame({ onScore }) {
    return (
        <GameCanvas
            create={createRunner}
            onScore={onScore}
            label="Saut sur la banquise"
            controls={[
                { code: 'Space', text: 'Sauter', label: 'Sauter' },
                { code: 'ArrowDown', text: 'Glisser', label: 'Glisser' }
            ]}
        />
    );
}
