import GameCanvas from './GameCanvas';
import {
    TAU, addPopup, circle, clamp, drawOverlay, drawPenguin, drawPopups, ellipse,
    hudPill, rand, roundRect, skyGradient, updatePopups
} from './draw';

// Pêche sur la banquise : lancer la ligne, attraper des poissons, éviter les méduses.
const DURATION = 60;
const SURFACE = 150;
const BOTTOM = 432;

const TYPES = {
    sardine: { w: 34, h: 14, pts: 10, speed: [100, 150], depth: [190, 300], color: '#9fd8ff' },
    salmon: { w: 52, h: 20, pts: 25, speed: [70, 100], depth: [260, 400], color: '#ff9a7a' },
    gold: { w: 30, h: 13, pts: 60, speed: [190, 240], depth: [330, 410], color: '#ffd36e' },
    boot: { w: 30, h: 26, pts: 0, speed: [30, 50], depth: [230, 400], color: '#6b4f3a' },
    jelly: { w: 30, h: 30, pts: -20, speed: [30, 50], depth: [200, 380], color: '#d9a6ff' }
};
const POOL = ['sardine', 'sardine', 'sardine', 'sardine', 'sardine', 'salmon', 'salmon', 'salmon', 'gold', 'boot', 'jelly', 'jelly'];

const CATCH_TEXT = {
    sardine: ['+10', '#ffffff'],
    salmon: ['Saumon ! +25', '#ff9a7a'],
    gold: ['Poisson doré ! +60', '#ffd36e'],
    boot: ['Une vieille botte…', '#c9d6e8']
};

function createFishing(api) {
    const W = api.width;
    const H = api.height;
    const s = {
        phase: 'ready',
        time: DURATION,
        score: 0,
        catches: 0,
        px: 300,
        tx: 300,
        keys: { left: false, right: false },
        hook: { state: 'idle', y: SURFACE + 10, fish: null },
        fish: [],
        spawn: 0,
        popups: [],
        bubbles: Array.from({ length: 18 }, () => ({ x: rand(0, W), y: rand(SURFACE, H), r: rand(1.5, 4), v: rand(20, 45) })),
        t: 0,
        overT: 0,
        record: false,
        mood: 'normal',
        moodT: 0
    };

    function spawnFish(anywhere) {
        const kind = POOL[Math.floor(Math.random() * POOL.length)];
        const T = TYPES[kind];
        const dir = Math.random() < 0.5 ? 1 : -1;
        const y = rand(T.depth[0], T.depth[1]);
        let x = dir > 0 ? -40 : W + 40;
        if (anywhere) x = rand(80, W - 80);
        s.fish.push({ kind, ...T, x, y, baseY: y, dir, speed: rand(T.speed[0], T.speed[1]), ph: rand(0, TAU), caught: false });
    }

    function start() {
        Object.assign(s, {
            phase: 'play', time: DURATION, score: 0, catches: 0,
            hook: { state: 'idle', y: SURFACE + 10, fish: null },
            fish: [], spawn: 0.5, popups: [], record: false, mood: 'normal', moodT: 0
        });
        for (let i = 0; i < 5; i++) spawnFish(true);
    }

    const tipX = () => s.px + 44;
    const tipY = () => SURFACE - 88;

    function cast() {
        if (s.hook.state === 'idle') s.hook.state = 'down';
        else if (s.hook.state === 'down') s.hook.state = 'up';
    }

    function setMood(mood, time = 1.2) {
        s.mood = mood;
        s.moodT = time;
    }

    function finish() {
        s.phase = 'over';
        s.overT = 0;
        s.record = api.reportScore(s.score);
    }

    function drawFish(ctx, f) {
        ctx.save();
        ctx.translate(f.x, f.y);
        if (f.caught) ctx.rotate(-Math.PI / 2);
        else ctx.scale(f.dir, 1);
        if (f.kind === 'boot') {
            ctx.fillStyle = f.color;
            roundRect(ctx, -10, -13, 14, 22, 3);
            ctx.fill();
            roundRect(ctx, -10, 3, 26, 10, 4);
            ctx.fill();
            ctx.fillStyle = '#4a3527';
            ctx.fillRect(-11, -14, 16, 4);
        } else if (f.kind === 'jelly') {
            ctx.globalAlpha = 0.85;
            ctx.beginPath();
            ctx.arc(0, 0, 15, Math.PI, 0);
            ctx.closePath();
            ctx.fillStyle = f.color;
            ctx.fill();
            ctx.strokeStyle = f.color;
            ctx.lineWidth = 2;
            for (let i = -2; i <= 2; i++) {
                ctx.beginPath();
                ctx.moveTo(i * 6, 0);
                for (let k = 1; k <= 4; k++) ctx.lineTo(i * 6 + Math.sin(s.t * 4 + k + i) * 3, k * 5);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
        } else {
            const hw = f.w / 2;
            const hh = f.h / 2;
            ctx.beginPath();
            ctx.moveTo(-hw + 4, 0);
            ctx.lineTo(-hw - 10, -hh - 2 + Math.sin(s.t * 10 + f.ph) * 2);
            ctx.lineTo(-hw - 10, hh + 2 + Math.sin(s.t * 10 + f.ph) * 2);
            ctx.closePath();
            ctx.fillStyle = f.color;
            ctx.fill();
            ellipse(ctx, 0, 0, hw, hh, f.color);
            ellipse(ctx, 2, hh * 0.35, hw * 0.75, hh * 0.45, 'rgba(255,255,255,0.35)');
            circle(ctx, hw * 0.55, -hh * 0.2, Math.max(2, hh * 0.28), '#ffffff');
            circle(ctx, hw * 0.6, -hh * 0.2, Math.max(1.2, hh * 0.15), '#14172b');
            if (f.kind === 'gold') {
                ctx.globalAlpha = 0.5 + 0.5 * Math.sin(s.t * 8 + f.ph);
                circle(ctx, -hw * 0.3, -hh - 4, 2, '#ffffff');
                circle(ctx, hw * 0.2, hh + 4, 1.6, '#ffffff');
                ctx.globalAlpha = 1;
            }
        }
        ctx.restore();
    }

    return {
        update(dt) {
            s.t += dt;
            updatePopups(s.popups, dt);
            for (const b of s.bubbles) {
                b.y -= b.v * dt;
                b.x += Math.sin(s.t * 2 + b.r) * 6 * dt;
                if (b.y < SURFACE + 5) {
                    b.y = H + 5;
                    b.x = rand(0, W);
                }
            }
            s.moodT -= dt;
            if (s.moodT <= 0) s.mood = 'normal';

            for (let i = s.fish.length - 1; i >= 0; i--) {
                const f = s.fish[i];
                if (f.caught) continue;
                f.x += f.dir * f.speed * dt;
                f.ph += dt;
                if (f.kind === 'jelly') f.y = f.baseY + Math.sin(f.ph * 2) * 14;
                if (f.x < -60 || f.x > W + 60) s.fish.splice(i, 1);
            }
            if (s.phase === 'ready' && s.fish.length < 5) spawnFish(false);
            if (s.phase === 'over') s.overT += dt;
            if (s.phase !== 'play') return;

            s.time -= dt;
            s.spawn -= dt;
            if (s.spawn <= 0 && s.fish.length < 10) {
                spawnFish(false);
                s.spawn = rand(0.5, 1.1);
            }

            const hook = s.hook;
            if (hook.state === 'idle') {
                const move = (s.keys.right ? 1 : 0) - (s.keys.left ? 1 : 0);
                if (move) {
                    s.px += move * 320 * dt;
                    s.tx = s.px;
                } else {
                    s.px += clamp(s.tx - s.px, -320 * dt, 320 * dt);
                }
                s.px = clamp(s.px, 50, W - 110);
                hook.y = SURFACE + 10;
            } else if (hook.state === 'down') {
                hook.y += 250 * dt;
                const hx = tipX();
                for (const f of s.fish) {
                    if (f.caught) continue;
                    if (Math.abs(hx - f.x) < f.w / 2 + 2 && Math.abs(hook.y - f.y) < f.h / 2 + 4) {
                        if (f.kind === 'jelly') {
                            s.score = Math.max(0, s.score - 20);
                            addPopup(s.popups, hx, hook.y - 10, 'Aïe ! −20', '#ff9ad5');
                            setMood('surprised');
                        } else {
                            f.caught = true;
                            hook.fish = f;
                        }
                        hook.state = 'up';
                        break;
                    }
                }
                if (hook.y >= BOTTOM) hook.state = 'up';
            } else if (hook.state === 'up') {
                hook.y -= (hook.fish && hook.fish.kind === 'salmon' ? 230 : 300) * dt;
                if (hook.fish) {
                    hook.fish.x = tipX();
                    hook.fish.y = hook.y + hook.fish.w / 2 + 2;
                }
                if (hook.y <= SURFACE + 10) {
                    hook.y = SURFACE + 10;
                    hook.state = 'idle';
                    const f = hook.fish;
                    if (f) {
                        s.score += f.pts;
                        if (f.pts > 0) s.catches += 1;
                        const [label, color] = CATCH_TEXT[f.kind];
                        addPopup(s.popups, tipX(), SURFACE - 110, label, color);
                        setMood(f.kind === 'boot' ? 'surprised' : 'happy');
                        s.fish.splice(s.fish.indexOf(f), 1);
                        hook.fish = null;
                    }
                }
            }

            if (s.time <= 0) {
                s.time = 0;
                finish();
            }
        },

        render(ctx) {
            skyGradient(ctx, W, H, [[0, '#13294f'], [1, '#4f7fb5']], 0, SURFACE);
            ctx.fillStyle = '#eef6ff';
            ctx.beginPath();
            ctx.moveTo(470, SURFACE);
            ctx.lineTo(520, SURFACE - 46);
            ctx.lineTo(560, SURFACE - 30);
            ctx.lineTo(600, SURFACE - 62);
            ctx.lineTo(660, SURFACE);
            ctx.fill();
            ctx.fillStyle = '#d4e6f7';
            ctx.beginPath();
            ctx.moveTo(680, SURFACE);
            ctx.lineTo(720, SURFACE - 28);
            ctx.lineTo(770, SURFACE);
            ctx.fill();

            skyGradient(ctx, W, H, [[0, '#1f84b5'], [1, '#0a2350']], SURFACE, H);
            ctx.fillStyle = 'rgba(255,255,255,0.05)';
            for (let i = 0; i < 4; i++) {
                const x = 120 + i * 190 + Math.sin(s.t * 0.4 + i) * 20;
                ctx.beginPath();
                ctx.moveTo(x, SURFACE);
                ctx.lineTo(x + 50, SURFACE);
                ctx.lineTo(x + 130, H);
                ctx.lineTo(x + 40, H);
                ctx.fill();
            }
            ctx.strokeStyle = '#2f7a58';
            ctx.lineWidth = 5;
            ctx.lineCap = 'round';
            for (let i = 0; i < 9; i++) {
                const x = 40 + i * 92;
                ctx.beginPath();
                ctx.moveTo(x, H);
                ctx.quadraticCurveTo(x + Math.sin(s.t + i) * 12, H - 30, x + Math.sin(s.t * 1.3 + i) * 8, H - 55 - (i % 3) * 10);
                ctx.stroke();
            }
            ctx.fillStyle = 'rgba(255,255,255,0.35)';
            for (const b of s.bubbles) {
                ctx.beginPath();
                ctx.arc(b.x, b.y, b.r, 0, TAU);
                ctx.fill();
            }

            for (const f of s.fish) drawFish(ctx, f);

            const tx = tipX();
            const ty = tipY();
            ctx.strokeStyle = 'rgba(255,255,255,0.85)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(tx, ty);
            ctx.lineTo(tx, s.hook.y);
            ctx.stroke();
            ctx.strokeStyle = '#c9d6e8';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(tx - 5, s.hook.y, 5, 0, Math.PI);
            ctx.stroke();

            roundRect(ctx, s.px - 70, SURFACE - 8, 170, 20, 10);
            ctx.fillStyle = '#f4f9ff';
            ctx.fill();
            ellipse(ctx, s.px + 15, SURFACE + 16, 80, 9, 'rgba(200,230,255,0.35)');

            drawPenguin(ctx, s.px, SURFACE + 2, 104, {
                hat: 'beanie', scarf: '#34d399', hatColor: '#f59e0b', flip: -0.9, look: 2,
                mood: s.phase === 'over' ? 'happy' : s.mood
            });
            ctx.strokeStyle = '#8b5a2b';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(s.px + 20, SURFACE - 46);
            ctx.lineTo(tx, ty);
            ctx.stroke();

            ctx.strokeStyle = 'rgba(255,255,255,0.5)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (let x = 0; x <= W; x += 20) {
                const y = SURFACE + 12 + Math.sin(x * 0.05 + s.t * 2) * 2;
                if (x === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();

            drawPopups(ctx, s.popups);
            hudPill(ctx, 16, 14, 'Score', s.score);
            hudPill(ctx, 16, 58, 'Prises', s.catches);
            hudPill(ctx, W - 16, 14, 'Temps', `${Math.ceil(s.time)} s`, 'right');

            if (s.phase === 'ready') {
                drawOverlay(ctx, W, H, 'Pêche sur la banquise', [
                    'Poissons dorés : 60 points. Méduses : −20.',
                    { text: 'Clique ou appuie sur Espace pour commencer', color: '#ffd36e', weight: 700 }
                ]);
            } else if (s.phase === 'over') {
                drawOverlay(ctx, W, H, 'Fin de la pêche !', [
                    { text: `${s.score} points · ${s.catches} prise${s.catches > 1 ? 's' : ''}`, size: 24, weight: 800 },
                    s.record ? { text: 'Nouveau record !', color: '#ffd36e', weight: 700 } : 'Belle pêche.',
                    { text: s.overT > 0.8 ? 'Clique ou Espace pour rejouer' : ' ', color: 'rgba(255,255,255,0.75)' }
                ]);
            }
        },

        pointerDown(x) {
            if (s.phase === 'play') {
                if (s.hook.state === 'idle') s.tx = clamp(x - 44, 50, W - 110);
                cast();
            } else if (s.phase === 'ready' || s.overT > 0.8) {
                start();
            }
        },

        pointerMove(x) {
            s.tx = clamp(x - 44, 50, W - 110);
        },

        keyDown(code, repeat) {
            if (code === 'ArrowLeft' || code === 'KeyA') s.keys.left = true;
            if (code === 'ArrowRight' || code === 'KeyD') s.keys.right = true;
            if (repeat) return;
            if (code === 'Space' || code === 'ArrowDown' || code === 'Enter') {
                if (s.phase === 'play') cast();
                else if (s.phase === 'ready' || s.overT > 0.8) start();
            }
        },

        keyUp(code) {
            if (code === 'ArrowLeft' || code === 'KeyA') s.keys.left = false;
            if (code === 'ArrowRight' || code === 'KeyD') s.keys.right = false;
        }
    };
}

export default function FishingGame({ onScore }) {
    return (
        <GameCanvas
            create={createFishing}
            onScore={onScore}
            label="Pêche sur la banquise"
            controls={[
                { code: 'ArrowLeft', text: '◀', label: 'Aller à gauche' },
                { code: 'Space', text: 'Lancer', label: 'Lancer ou remonter la ligne' },
                { code: 'ArrowRight', text: '▶', label: 'Aller à droite' }
            ]}
        />
    );
}
