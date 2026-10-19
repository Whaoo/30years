import GameCanvas from './GameCanvas';
import {
    TAU, addPopup, circle, clamp, drawOverlay, drawPenguin, drawPopups, ellipse,
    hudPill, rand, roundRect, updatePopups
} from './draw';

// Descente en luge : slalom entre les sapins et les rochers, ramasser les poissons, passer les portes.
const PY = 140;
const LIVES = 3;

function createSled(api) {
    const W = api.width;
    const H = api.height;
    const s = {
        phase: 'ready',
        px: W / 2,
        vx: 0,
        tx: W / 2,
        keys: { left: false, right: false },
        objects: [],
        trail: [],
        dist: 0,
        bonus: 0,
        lives: LIVES,
        invuln: 0,
        speed: 240,
        spawn: 0,
        gateSpawn: 3,
        elapsed: 0,
        popups: [],
        t: 0,
        overT: 0,
        record: false,
        crashT: 0
    };

    const score = () => Math.floor(s.dist / 25) + s.bonus;

    function start() {
        Object.assign(s, {
            phase: 'play', px: W / 2, vx: 0, tx: W / 2, objects: [], trail: [], dist: 0, bonus: 0,
            lives: LIVES, invuln: 1, speed: 240, spawn: 0.4, gateSpawn: 3, elapsed: 0, popups: [], record: false
        });
    }

    function spawnObject() {
        const roll = Math.random();
        const x = rand(40, W - 40);
        if (roll < 0.18) s.objects.push({ kind: 'fish', x, y: H + 30, r: 14, taken: false });
        else if (roll < 0.45) s.objects.push({ kind: 'rock', x, y: H + 30, r: 16, w: rand(0.8, 1.3) });
        else s.objects.push({ kind: 'tree', x, y: H + 40, r: 17, size: rand(0.85, 1.2) });
    }

    function spawnGate() {
        const gap = 130;
        const x = rand(80 + gap / 2, W - 80 - gap / 2);
        s.objects.push({ kind: 'gate', x, y: H + 40, gap, passed: false, color: Math.random() < 0.5 ? '#e94b4b' : '#1d4ed8' });
    }

    function finish() {
        s.phase = 'over';
        s.overT = 0;
        s.record = api.reportScore(score());
    }

    function drawTree(ctx, o) {
        const k = o.size;
        ellipse(ctx, o.x + 6, o.y + 26 * k, 20 * k, 6 * k, 'rgba(60, 90, 130, 0.18)');
        ctx.fillStyle = '#6b4f3a';
        ctx.fillRect(o.x - 4 * k, o.y + 12 * k, 8 * k, 14 * k);
        const layers = [[30, 4], [24, -12], [17, -27]];
        for (const [half, top] of layers) {
            ctx.beginPath();
            ctx.moveTo(o.x - half * k, o.y + (top + 18) * k);
            ctx.lineTo(o.x, o.y + (top - 10) * k);
            ctx.lineTo(o.x + half * k, o.y + (top + 18) * k);
            ctx.closePath();
            ctx.fillStyle = '#1f6b4f';
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(o.x - half * 0.45 * k, o.y + (top + 2) * k);
            ctx.lineTo(o.x, o.y + (top - 10) * k);
            ctx.lineTo(o.x + half * 0.45 * k, o.y + (top + 2) * k);
            ctx.closePath();
            ctx.fillStyle = '#ffffff';
            ctx.fill();
        }
    }

    function drawRock(ctx, o) {
        ellipse(ctx, o.x + 4, o.y + 10, 20 * o.w, 6, 'rgba(60, 90, 130, 0.18)');
        ellipse(ctx, o.x, o.y, 18 * o.w, 13, '#7d8ea6');
        ellipse(ctx, o.x - 3, o.y - 3, 14 * o.w, 9, '#9aabc2');
        ellipse(ctx, o.x - 6, o.y - 8, 7 * o.w, 4, '#ffffff');
    }

    function drawFishItem(ctx, o) {
        ctx.save();
        ctx.translate(o.x, o.y + Math.sin(s.t * 6 + o.x) * 2);
        ctx.beginPath();
        ctx.moveTo(-9, 0);
        ctx.lineTo(-18, -7);
        ctx.lineTo(-18, 7);
        ctx.closePath();
        ctx.fillStyle = '#ff9a3c';
        ctx.fill();
        ellipse(ctx, 0, 0, 13, 7, '#ffb347');
        circle(ctx, 5, -2, 2.2, '#ffffff');
        circle(ctx, 5.5, -2, 1.2, '#14172b');
        ctx.restore();
    }

    function drawGate(ctx, o) {
        for (const side of [-1, 1]) {
            const x = o.x + (side * o.gap) / 2;
            ctx.fillStyle = '#3a3f55';
            ctx.fillRect(x - 2, o.y - 30, 4, 34);
            ctx.beginPath();
            ctx.moveTo(x, o.y - 30);
            ctx.lineTo(x - side * 18, o.y - 24);
            ctx.lineTo(x, o.y - 17);
            ctx.closePath();
            ctx.fillStyle = o.passed ? '#34d399' : o.color;
            ctx.fill();
        }
    }

    return {
        update(dt) {
            s.t += dt;
            updatePopups(s.popups, dt);
            s.crashT = Math.max(0, s.crashT - dt);
            if (s.phase === 'over') {
                s.overT += dt;
                return;
            }
            if (s.phase !== 'play') return;

            s.elapsed += dt;
            s.speed = Math.min(580, s.speed + 9 * dt);
            s.dist += s.speed * dt;
            s.invuln = Math.max(0, s.invuln - dt);

            const keyDir = (s.keys.right ? 1 : 0) - (s.keys.left ? 1 : 0);
            if (keyDir) s.tx = clamp(s.px + keyDir * 120, 30, W - 30);
            const desired = clamp((s.tx - s.px) * 6, -420, 420);
            s.vx += (desired - s.vx) * Math.min(1, dt * 8);
            s.px = clamp(s.px + s.vx * dt, 30, W - 30);

            s.trail.unshift({ x: s.px, y: PY + 12 });
            for (const p of s.trail) p.y -= s.speed * dt;
            while (s.trail.length && s.trail[s.trail.length - 1].y < -20) s.trail.pop();

            s.spawn -= dt;
            if (s.spawn <= 0) {
                spawnObject();
                s.spawn = Math.max(0.18, 0.55 - s.elapsed * 0.006) * rand(0.6, 1.3);
            }
            s.gateSpawn -= dt;
            if (s.gateSpawn <= 0) {
                spawnGate();
                s.gateSpawn = rand(3.5, 6);
            }

            for (let i = s.objects.length - 1; i >= 0; i--) {
                const o = s.objects[i];
                const prevY = o.y;
                o.y -= s.speed * dt;
                if (o.y < -60) {
                    s.objects.splice(i, 1);
                    continue;
                }
                if (o.kind === 'gate') {
                    if (!o.passed && prevY >= PY && o.y < PY) {
                        if (Math.abs(s.px - o.x) < o.gap / 2 - 6) {
                            o.passed = true;
                            s.bonus += 5;
                            addPopup(s.popups, s.px, PY - 40, 'Porte ! +5', '#34d399');
                        }
                    }
                    continue;
                }
                const hy = o.kind === 'tree' ? o.y + 14 * o.size : o.y;
                const d = Math.hypot(s.px - o.x, PY - hy);
                if (o.kind === 'fish') {
                    if (!o.taken && d < o.r + 18) {
                        o.taken = true;
                        s.bonus += 10;
                        addPopup(s.popups, o.x, o.y - 20, '+10', '#ffb347');
                        s.objects.splice(i, 1);
                    }
                } else if (s.invuln <= 0 && d < o.r + 14) {
                    s.lives -= 1;
                    s.invuln = 1.6;
                    s.crashT = 0.6;
                    s.speed = Math.max(220, s.speed * 0.7);
                    addPopup(s.popups, s.px, PY - 44, 'Aïe !', '#ff9ad5');
                    if (s.lives <= 0) {
                        finish();
                        return;
                    }
                }
            }
        },

        render(ctx) {
            ctx.fillStyle = '#f4f8fc';
            ctx.fillRect(0, 0, W, H);
            ctx.strokeStyle = 'rgba(150, 180, 215, 0.25)';
            ctx.lineWidth = 2;
            const off = (s.dist * 0.6) % 120;
            for (let i = 0; i < 8; i++) {
                const x = 60 + i * 100 + Math.sin(i * 1.7) * 20;
                ctx.beginPath();
                for (let y = -off; y < H + 120; y += 30) {
                    const xx = x + Math.sin((y + s.dist * 0.6) * 0.01 + i) * 14;
                    if (y === -off) ctx.moveTo(xx, y);
                    else ctx.lineTo(xx, y);
                }
                ctx.stroke();
            }

            if (s.trail.length > 1) {
                ctx.strokeStyle = 'rgba(120, 150, 190, 0.45)';
                ctx.lineWidth = 3;
                for (const side of [-9, 9]) {
                    ctx.beginPath();
                    s.trail.forEach((p, i) => {
                        if (i === 0) ctx.moveTo(p.x + side, p.y);
                        else ctx.lineTo(p.x + side, p.y);
                    });
                    ctx.stroke();
                }
            }

            const sorted = [...s.objects].sort((a, b) => a.y - b.y);
            const behind = sorted.filter((o) => o.y < PY);
            const front = sorted.filter((o) => o.y >= PY);
            const drawObj = (o) => {
                if (o.kind === 'tree') drawTree(ctx, o);
                else if (o.kind === 'rock') drawRock(ctx, o);
                else if (o.kind === 'fish') drawFishItem(ctx, o);
                else drawGate(ctx, o);
            };
            behind.forEach(drawObj);

            const blink = s.invuln > 0 && Math.floor(s.t * 12) % 2 === 0;
            if (!blink) {
                roundRect(ctx, s.px - 24, PY + 4, 48, 14, 6);
                ctx.fillStyle = '#b5651d';
                ctx.fill();
                ctx.strokeStyle = '#6b4f3a';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(s.px - 26, PY + 22);
                ctx.lineTo(s.px + 22, PY + 22);
                ctx.quadraticCurveTo(s.px + 30, PY + 22, s.px + 28, PY + 12);
                ctx.stroke();
                drawPenguin(ctx, s.px, PY + 12, 64, {
                    hat: 'beanie', scarf: '#34d399', hatColor: '#e94b4b',
                    mood: s.phase === 'over' ? 'dizzy' : s.crashT > 0 ? 'surprised' : 'normal',
                    rotate: clamp(s.vx * 0.0012, -0.35, 0.35),
                    flip: -1.2
                });
            }
            front.forEach(drawObj);

            drawPopups(ctx, s.popups);
            hudPill(ctx, 16, 14, 'Score', score());
            hudPill(ctx, W - 16, 14, 'Vies', '●'.repeat(Math.max(0, s.lives)) + '○'.repeat(Math.max(0, LIVES - s.lives)), 'right');

            if (s.phase === 'ready') {
                drawOverlay(ctx, W, H, 'Descente en luge', [
                    'Guide la luge à la souris ou avec ← →.',
                    'Poissons +10, portes +5. Évite sapins et rochers.',
                    { text: 'Clic ou Espace pour partir', color: '#ffd36e', weight: 700 }
                ]);
            } else if (s.phase === 'over') {
                drawOverlay(ctx, W, H, 'Fin de la descente !', [
                    { text: `${score()} points`, size: 24, weight: 800 },
                    s.record ? { text: 'Nouveau record !', color: '#ffd36e', weight: 700 } : 'Belle glisse.',
                    { text: s.overT > 0.8 ? 'Clic ou Espace pour repartir' : ' ', color: 'rgba(255,255,255,0.75)' }
                ]);
            }
        },

        pointerDown(x) {
            if (s.phase === 'ready' || (s.phase === 'over' && s.overT > 0.8)) start();
            s.tx = clamp(x, 30, W - 30);
        },

        pointerMove(x) {
            s.tx = clamp(x, 30, W - 30);
        },

        keyDown(code, repeat) {
            if (code === 'ArrowLeft' || code === 'KeyA') s.keys.left = true;
            if (code === 'ArrowRight' || code === 'KeyD') s.keys.right = true;
            if (repeat) return;
            if ((code === 'Space' || code === 'Enter') && (s.phase === 'ready' || (s.phase === 'over' && s.overT > 0.8))) start();
        },

        keyUp(code) {
            if (code === 'ArrowLeft' || code === 'KeyA') s.keys.left = false;
            if (code === 'ArrowRight' || code === 'KeyD') {
                s.keys.right = false;
            }
            if (!s.keys.left && !s.keys.right && (code.startsWith('Arrow') || code === 'KeyA' || code === 'KeyD')) s.tx = s.px;
        }
    };
}

export default function SledGame({ onScore }) {
    return (
        <GameCanvas
            create={createSled}
            onScore={onScore}
            label="Descente en luge"
            controls={[
                { code: 'ArrowLeft', text: '◀', label: 'Aller à gauche' },
                { code: 'ArrowRight', text: '▶', label: 'Aller à droite' }
            ]}
        />
    );
}
