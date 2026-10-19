import GameCanvas from './GameCanvas';
import {
    DISPLAY, TAU, addPopup, circle, clamp, drawFlakes, drawOverlay, drawPenguin, drawPopups, ellipse,
    hills, hudPill, makeFlakes, rand, roundRect, skyGradient, text, updateFlakes, updatePopups
} from './draw';

// Bataille de boules de neige : viser des cibles qui défilent sur trois rangées.
const DURATION = 45;
const LANES = [178, 252, 326];
const HAND = { x: 148, y: 352 };
const MIN_X = 200;

function createSnowball(api) {
    const W = api.width;
    const H = api.height;
    const s = {
        phase: 'ready',
        time: DURATION,
        score: 0,
        combo: 0,
        elapsed: 0,
        balls: [],
        targets: [],
        splashes: [],
        popups: [],
        aim: { x: 520, y: 250 },
        cooldown: 0,
        spawn: 0,
        throwAnim: 0,
        overT: 0,
        record: false,
        flakes: makeFlakes(45, W, H)
    };

    function start() {
        Object.assign(s, {
            phase: 'play', time: DURATION, score: 0, combo: 0, elapsed: 0,
            balls: [], targets: [], splashes: [], popups: [],
            cooldown: 0, spawn: 0.2, throwAnim: 0, record: false
        });
    }

    function spawnTarget() {
        const lane = Math.floor(Math.random() * LANES.length);
        if (s.targets.some((t) => t.alive && t.lane === lane && t.x > W - 70)) return;
        const roll = Math.random();
        let t;
        if (roll < 0.12) t = { kind: 'gift', r: 19, pts: 40, speed: 240, turnX: -200 };
        else if (roll < 0.42) t = { kind: 'snowman', r: 30, pts: 15, speed: 75, turnX: rand(270, 430) };
        else t = { kind: 'target', r: 26, pts: 10, speed: 115, turnX: rand(270, 430) };
        t.speed *= (1 + s.elapsed / 55) * rand(0.85, 1.15);
        Object.assign(t, { lane, x: W + 40, y: LANES[lane], dir: -1, alive: true, hitT: 0 });
        s.targets.push(t);
    }

    function throwAt(x, y) {
        if (s.cooldown > 0) return;
        const tx = Math.max(MIN_X, x);
        const dist = Math.hypot(tx - HAND.x, y - HAND.y);
        s.balls.push({ x0: HAND.x, y0: HAND.y, x1: tx, y1: y, t: 0, T: 0.22 + dist / 2200, arc: 40 + dist * 0.2 });
        s.cooldown = 0.3;
        s.throwAnim = 0.28;
    }

    function land(b) {
        let hit = null;
        let hitD = Infinity;
        for (const t of s.targets) {
            if (!t.alive) continue;
            const d = Math.hypot(b.x1 - t.x, b.y1 - t.y);
            if (d <= t.r + 10 && d < hitD) {
                hit = t;
                hitD = d;
            }
        }
        if (hit) {
            const bull = hit.kind === 'target' && hitD < hit.r * 0.38;
            s.combo += 1;
            const mult = Math.min(3, 1 + Math.floor(s.combo / 3));
            const pts = hit.pts * (bull ? 2 : 1) * mult;
            s.score += pts;
            hit.alive = false;
            addPopup(s.popups, hit.x, hit.y - hit.r - 10, bull ? `En plein ! +${pts}` : `+${pts}`, bull ? '#ffd36e' : '#ffffff');
            if (mult > 1 && s.combo % 3 === 0) addPopup(s.popups, hit.x, hit.y - hit.r - 36, `Combo x${mult}`, '#9fd8ff');
            s.splashes.push({ x: b.x1, y: b.y1, t: 0, big: true });
        } else {
            s.combo = 0;
            s.splashes.push({ x: b.x1, y: b.y1, t: 0, big: false });
        }
    }

    function finish() {
        s.phase = 'over';
        s.overT = 0;
        s.record = api.reportScore(s.score);
    }

    function ballPos(b) {
        const t = clamp(b.t, 0, 1);
        return {
            x: b.x0 + (b.x1 - b.x0) * t,
            y: b.y0 + (b.y1 - b.y0) * t - b.arc * 4 * t * (1 - t)
        };
    }

    function drawTarget(ctx, t) {
        ctx.save();
        if (!t.alive) {
            const k = t.hitT / 0.6;
            ctx.globalAlpha = Math.max(0, 1 - k);
            ctx.translate(t.x, t.y + t.r);
            ctx.rotate(k * 1.2);
            ctx.translate(-t.x, -(t.y + t.r));
        }
        if (t.kind === 'target') {
            ctx.fillStyle = '#7a4a2a';
            ctx.fillRect(t.x - 4, t.y, 8, 46);
            circle(ctx, t.x, t.y, t.r, '#ffffff');
            circle(ctx, t.x, t.y, t.r * 0.78, '#e94b4b');
            circle(ctx, t.x, t.y, t.r * 0.55, '#ffffff');
            circle(ctx, t.x, t.y, t.r * 0.3, '#e94b4b');
        } else if (t.kind === 'snowman') {
            circle(ctx, t.x, t.y + 12, t.r * 0.78, '#f4f7fb');
            circle(ctx, t.x, t.y - t.r * 0.5, t.r * 0.52, '#ffffff');
            circle(ctx, t.x - 5, t.y - t.r * 0.56, 2.2, '#14172b');
            circle(ctx, t.x + 5, t.y - t.r * 0.56, 2.2, '#14172b');
            ctx.beginPath();
            ctx.moveTo(t.x, t.y - t.r * 0.46);
            ctx.lineTo(t.x - 13, t.y - t.r * 0.4);
            ctx.lineTo(t.x, t.y - t.r * 0.36);
            ctx.fillStyle = '#ff9f43';
            ctx.fill();
            ctx.fillStyle = '#14172b';
            ctx.fillRect(t.x - 11, t.y - t.r * 1.02, 22, 4);
            ctx.fillRect(t.x - 7, t.y - t.r * 1.36, 14, 12);
            circle(ctx, t.x, t.y + 4, 2.2, '#14172b');
            circle(ctx, t.x, t.y + 14, 2.2, '#14172b');
        } else {
            roundRect(ctx, t.x - t.r, t.y - t.r, t.r * 2, t.r * 2, 5);
            ctx.fillStyle = '#ff5fa2';
            ctx.fill();
            ctx.fillStyle = '#ffd36e';
            ctx.fillRect(t.x - 3, t.y - t.r, 6, t.r * 2);
            ctx.fillRect(t.x - t.r, t.y - 3, t.r * 2, 6);
            ellipse(ctx, t.x - 7, t.y - t.r - 4, 8, 5, '#ffd36e', -0.4);
            ellipse(ctx, t.x + 7, t.y - t.r - 4, 8, 5, '#ffd36e', 0.4);
        }
        ctx.restore();
    }

    function drawBank(ctx, y, shade) {
        ctx.beginPath();
        ctx.moveTo(0, H);
        ctx.lineTo(0, y + 6);
        for (let x = 0; x <= W; x += 40) {
            ctx.quadraticCurveTo(x + 20, y - 6 + Math.sin(x * 0.05 + y) * 3, x + 40, y + 4);
        }
        ctx.lineTo(W, H);
        ctx.closePath();
        ctx.fillStyle = shade;
        ctx.fill();
    }

    return {
        update(dt) {
            updateFlakes(s.flakes, dt, W, H, 8);
            updatePopups(s.popups, dt);
            for (let i = s.splashes.length - 1; i >= 0; i--) {
                s.splashes[i].t += dt;
                if (s.splashes[i].t > 0.5) s.splashes.splice(i, 1);
            }
            if (s.phase === 'over') s.overT += dt;
            if (s.phase !== 'play') return;

            s.elapsed += dt;
            s.time -= dt;
            s.cooldown -= dt;
            s.throwAnim -= dt;
            s.spawn -= dt;
            if (s.spawn <= 0) {
                spawnTarget();
                s.spawn = Math.max(0.45, 1.2 - s.elapsed * 0.012) * rand(0.7, 1.3);
            }
            for (let i = s.balls.length - 1; i >= 0; i--) {
                const b = s.balls[i];
                b.t += dt / b.T;
                if (b.t >= 1) {
                    land(b);
                    s.balls.splice(i, 1);
                }
            }
            for (let i = s.targets.length - 1; i >= 0; i--) {
                const t = s.targets[i];
                if (!t.alive) {
                    t.hitT += dt;
                    if (t.hitT > 0.6) s.targets.splice(i, 1);
                    continue;
                }
                t.x += t.dir * t.speed * dt;
                if (t.dir < 0 && t.x < t.turnX) t.dir = 1;
                if ((t.dir > 0 && t.x > W + 60) || t.x < -60) s.targets.splice(i, 1);
            }
            if (s.time <= 0) {
                s.time = 0;
                finish();
            }
        },

        render(ctx) {
            skyGradient(ctx, W, H, [[0, '#0b1838'], [0.55, '#2c5590'], [1, '#7aa6d6']]);
            ctx.save();
            ctx.shadowColor = 'rgba(220,235,255,0.8)';
            ctx.shadowBlur = 30;
            circle(ctx, 690, 70, 28, '#eef3ff');
            ctx.restore();
            hills(ctx, W, H, 200, 28, 0.011, 1.3, '#3d6aa3');
            hills(ctx, W, H, 228, 20, 0.017, 4.1, '#5a86bd');
            drawFlakes(ctx, s.flakes, 0.7);

            const banks = ['#cfe0f2', '#dde9f6', '#eaf2fb'];
            for (let lane = 0; lane < LANES.length; lane++) {
                for (const t of s.targets) if (t.lane === lane) drawTarget(ctx, t);
                drawBank(ctx, LANES[lane] + 30, banks[lane]);
            }

            ellipse(ctx, 92, 452, 160, 52, '#f6faff');
            const ready = s.phase === 'play' && s.cooldown <= 0;
            let flip = -0.2;
            if (s.throwAnim > 0) flip = -2.6;
            else if (ready) flip = -1.9;
            drawPenguin(ctx, 92, 432, 128, {
                hat: 'beanie', scarf: '#ff6b6b', hatColor: '#3b82f6', flip, look: 2,
                mood: s.phase === 'over' ? 'happy' : 'normal'
            });
            if (ready) circle(ctx, HAND.x, HAND.y, 8, '#ffffff');

            if (s.phase === 'play') {
                const ax = Math.max(MIN_X, s.aim.x);
                const dist = Math.hypot(ax - HAND.x, s.aim.y - HAND.y);
                const preview = { x0: HAND.x, y0: HAND.y, x1: ax, y1: s.aim.y, arc: 40 + dist * 0.2, t: 0 };
                ctx.fillStyle = 'rgba(255,255,255,0.45)';
                for (let k = 1; k < 10; k++) {
                    preview.t = k / 10;
                    const p = ballPos(preview);
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, 2.4, 0, TAU);
                    ctx.fill();
                }
                ctx.strokeStyle = 'rgba(255,255,255,0.8)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(ax, s.aim.y, 12, 0, TAU);
                ctx.moveTo(ax - 18, s.aim.y);
                ctx.lineTo(ax - 6, s.aim.y);
                ctx.moveTo(ax + 6, s.aim.y);
                ctx.lineTo(ax + 18, s.aim.y);
                ctx.stroke();
            }

            for (const b of s.balls) {
                const p = ballPos(b);
                circle(ctx, p.x, p.y, 8 - 3 * b.t, '#ffffff');
                ctx.strokeStyle = 'rgba(120,150,200,0.6)';
                ctx.lineWidth = 1;
                ctx.stroke();
            }
            for (const sp of s.splashes) {
                const k = sp.t / 0.5;
                ctx.globalAlpha = 1 - k;
                const rr = (sp.big ? 28 : 16) * k;
                for (let i = 0; i < 8; i++) {
                    const a = (i / 8) * TAU;
                    circle(ctx, sp.x + Math.cos(a) * rr, sp.y + Math.sin(a) * rr, sp.big ? 4 : 3, '#ffffff');
                }
                ctx.globalAlpha = 1;
            }
            drawPopups(ctx, s.popups);

            hudPill(ctx, 16, 14, 'Score', s.score);
            hudPill(ctx, W - 16, 14, 'Temps', `${Math.ceil(s.time)} s`, 'right');
            if (s.combo >= 3 && s.phase === 'play') {
                text(ctx, `Combo x${Math.min(3, 1 + Math.floor(s.combo / 3))}`, W / 2, 40, {
                    size: 20, weight: 800, font: DISPLAY, color: '#9fd8ff', align: 'center', shadow: true
                });
            }

            if (s.phase === 'ready') {
                drawOverlay(ctx, W, H, 'Bataille de boules de neige', [
                    'Vise les cibles, clique pour lancer.',
                    { text: 'Clique ou appuie sur Espace pour commencer', color: '#ffd36e', weight: 700 }
                ]);
            } else if (s.phase === 'over') {
                drawOverlay(ctx, W, H, 'Temps écoulé !', [
                    { text: `${s.score} points`, size: 24, weight: 800 },
                    s.record ? { text: 'Nouveau record !', color: '#ffd36e', weight: 700 } : 'Bien visé.',
                    { text: s.overT > 0.8 ? 'Clique ou Espace pour rejouer' : ' ', color: 'rgba(255,255,255,0.75)' }
                ]);
            }
        },

        pointerDown(x, y) {
            s.aim = { x, y };
            if (s.phase === 'play') throwAt(x, y);
            else if (s.phase === 'ready' || s.overT > 0.8) start();
        },

        pointerMove(x, y) {
            s.aim = { x, y };
        },

        keyDown(code, repeat) {
            if (repeat) return;
            if ((code === 'Space' || code === 'Enter') && (s.phase === 'ready' || (s.phase === 'over' && s.overT > 0.8))) start();
        }
    };
}

export default function SnowballGame({ onScore }) {
    return <GameCanvas create={createSnowball} onScore={onScore} label="Bataille de boules de neige" />;
}
