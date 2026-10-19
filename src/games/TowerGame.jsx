import GameCanvas from './GameCanvas';
import {
    DISPLAY, TAU, addPopup, circle, drawFlakes, drawOverlay, drawPenguin, drawPopups,
    hudPill, makeFlakes, rand, roundRect, text, updateFlakes, updatePopups
} from './draw';

// Tour de bonhommes de neige : lâcher la boule au bon moment pour empiler le plus haut possible.
const BW = 96;
const BH = 44;
const GROUND = 420;
const BASE_W = 240;
const SCARVES = ['#ff6b6b', '#34d399', '#a78bfa', '#60a5fa', '#fbbf24', '#f472b6', '#2dd4bf', '#fb923c'];

function createTower(api) {
    const W = api.width;
    const H = api.height;
    const s = {
        phase: 'ready',
        tower: [],
        hang: { x: W / 2, phase: 0 },
        drop: null,
        fallers: [],
        lives: 3,
        score: 0,
        streak: 0,
        cam: 0,
        popups: [],
        cheer: 0,
        t: 0,
        overT: 0,
        record: false,
        flakes: makeFlakes(40, W, H)
    };

    const topY = () => GROUND - s.tower.length * BH;
    const topX = () => (s.tower.length ? s.tower[s.tower.length - 1].x : W / 2);
    const swingSpeed = () => Math.min(3.6, 1.5 + s.tower.length * 0.08);

    function start() {
        Object.assign(s, {
            phase: 'play', tower: [], drop: null, fallers: [], lives: 3, score: 0, streak: 0,
            cam: 0, popups: [], record: false
        });
        s.hang = { x: W / 2, phase: rand(0, TAU) };
    }

    function release() {
        if (s.phase === 'ready' || (s.phase === 'over' && s.overT > 0.8)) {
            start();
            return;
        }
        if (s.phase !== 'play' || s.drop) return;
        s.drop = { x: s.hang.x, y: topY() - 170, vy: 0, color: SCARVES[s.tower.length % SCARVES.length] };
    }

    function land(d) {
        const empty = s.tower.length === 0;
        const dx = d.x - topX();
        const limit = empty ? BASE_W / 2 : BW * 0.55;
        if (Math.abs(dx) >= limit) {
            s.fallers.push({ x: d.x, y: d.y, vy: 0, vx: Math.sign(dx || 1) * 120, rot: 0, color: d.color });
            s.lives -= 1;
            s.streak = 0;
            addPopup(s.popups, d.x, d.y + s.cam - 20, 'Raté !', '#ff9ad5');
            if (s.lives <= 0) {
                s.phase = 'over';
                s.overT = 0;
                s.record = api.reportScore(s.score);
            }
            return;
        }
        let x = d.x;
        let pts = 1;
        if (!empty && Math.abs(dx) < 6) {
            x = topX();
            s.streak += 1;
            pts += 2;
            s.cheer = 1;
            addPopup(s.popups, x, topY() - BH + s.cam - 14, s.streak > 1 ? `Parfait x${s.streak} ! +${pts}` : `Parfait ! +${pts}`, '#ffd36e');
        } else {
            s.streak = 0;
            addPopup(s.popups, x, topY() - BH + s.cam - 14, '+1', '#ffffff');
        }
        s.tower.push({ x, color: d.color });
        s.score += pts;
    }

    function drawBall(ctx, x, y, color, rot = 0, alpha = 1) {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(x, y + BH / 2);
        ctx.rotate(rot);
        roundRect(ctx, -BW / 2, -BH / 2, BW, BH, 20);
        const g = ctx.createLinearGradient(0, -BH / 2, 0, BH / 2);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(1, '#cfe2f5');
        ctx.fillStyle = g;
        ctx.fill();
        ctx.strokeStyle = 'rgba(120, 150, 190, 0.5)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = color;
        ctx.fillRect(-BW / 2 + 6, -4, BW - 12, 7);
        circle(ctx, -12, -12, 3, '#14172b');
        circle(ctx, 12, -12, 3, '#14172b');
        circle(ctx, 0, 13, 3, '#14172b');
        ctx.restore();
    }

    return {
        update(dt) {
            s.t += dt;
            s.cheer = Math.max(0, s.cheer - dt);
            updateFlakes(s.flakes, dt, W, H, 6);
            updatePopups(s.popups, dt);
            const camTarget = Math.max(0, s.tower.length * BH - 210);
            s.cam += (camTarget - s.cam) * Math.min(1, dt * 4);

            for (let i = s.fallers.length - 1; i >= 0; i--) {
                const f = s.fallers[i];
                f.vy += 1600 * dt;
                f.y += f.vy * dt;
                f.x += f.vx * dt;
                f.rot += f.vx * 0.01 * dt;
                if (f.y + s.cam > H + 80) s.fallers.splice(i, 1);
            }
            if (s.phase === 'over') {
                s.overT += dt;
                return;
            }
            if (s.phase !== 'play') {
                s.hang.phase += dt * 1.5;
                s.hang.x = W / 2 + Math.sin(s.hang.phase) * 240;
                return;
            }
            s.hang.phase += dt * swingSpeed();
            s.hang.x = W / 2 + Math.sin(s.hang.phase) * Math.min(250, 170 + s.tower.length * 6);

            if (s.drop) {
                const d = s.drop;
                d.vy += 1800 * dt;
                d.y += d.vy * dt;
                if (d.y + BH >= topY()) {
                    d.y = topY() - BH;
                    s.drop = null;
                    land(d);
                }
            }
        },

        render(ctx) {
            const h = Math.min(1, s.cam / 1200);
            const g = ctx.createLinearGradient(0, 0, 0, H);
            g.addColorStop(0, `rgb(${Math.round(20 - 14 * h)}, ${Math.round(48 - 36 * h)}, ${Math.round(110 - 70 * h)})`);
            g.addColorStop(1, `rgb(${Math.round(90 - 50 * h)}, ${Math.round(140 - 80 * h)}, ${Math.round(200 - 90 * h)})`);
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, W, H);
            drawFlakes(ctx, s.flakes, 0.6);

            ctx.save();
            ctx.translate(0, s.cam);
            ctx.fillStyle = '#e8f1fb';
            ctx.fillRect(0, GROUND, W, 400);
            roundRect(ctx, W / 2 - BASE_W / 2, GROUND - 8, BASE_W, 16, 8);
            ctx.fillStyle = '#9fd2f2';
            ctx.fill();

            s.tower.forEach((b, i) => drawBall(ctx, b.x, GROUND - (i + 1) * BH, b.color));
            if (s.phase === 'over' && s.tower.length) {
                const top = s.tower[s.tower.length - 1];
                const y = GROUND - s.tower.length * BH;
                circle(ctx, top.x, y - 22, 24, '#ffffff');
                circle(ctx, top.x - 8, y - 26, 3, '#14172b');
                circle(ctx, top.x + 8, y - 26, 3, '#14172b');
                ctx.beginPath();
                ctx.moveTo(top.x, y - 21);
                ctx.lineTo(top.x + 18, y - 18);
                ctx.lineTo(top.x, y - 15);
                ctx.fillStyle = '#ff9f43';
                ctx.fill();
                ctx.fillStyle = '#14172b';
                ctx.fillRect(top.x - 16, y - 46, 32, 5);
                ctx.fillRect(top.x - 10, y - 64, 20, 18);
            }
            for (const f of s.fallers) drawBall(ctx, f.x, f.y, f.color, f.rot, 0.9);

            if (s.phase === 'play' || s.phase === 'ready') {
                const hy = topY() - 170;
                ctx.strokeStyle = 'rgba(255,255,255,0.7)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(W / 2, hy - 400);
                ctx.lineTo(s.drop ? W / 2 : s.hang.x, s.drop ? hy - 380 : hy);
                ctx.stroke();
                if (!s.drop) drawBall(ctx, s.hang.x, hy, SCARVES[s.tower.length % SCARVES.length]);
            }
            if (s.drop) drawBall(ctx, s.drop.x, s.drop.y, s.drop.color);
            ctx.restore();

            drawPenguin(ctx, 90, GROUND + s.cam - 4, 110, {
                hat: 'party', scarf: '#60a5fa',
                mood: s.phase === 'over' ? 'normal' : s.cheer > 0 ? 'happy' : 'normal',
                flip: s.cheer > 0 ? -2.4 + Math.sin(s.t * 18) * 0.3 : -0.3,
                look: 2
            });

            drawPopups(ctx, s.popups);
            hudPill(ctx, 16, 14, 'Score', s.score);
            hudPill(ctx, 16, 58, 'Étages', s.tower.length);
            hudPill(ctx, W - 16, 14, 'Essais', '●'.repeat(Math.max(0, s.lives)) + '○'.repeat(Math.max(0, 3 - s.lives)), 'right');

            if (s.phase === 'ready') {
                drawOverlay(ctx, W, H, 'Tour de bonhommes de neige', [
                    'Lâche la boule pile au-dessus de la tour.',
                    'Tombé à côté : un essai en moins (3 essais).',
                    { text: 'Clic ou Espace pour commencer', color: '#ffd36e', weight: 700 }
                ]);
            } else if (s.phase === 'over') {
                drawOverlay(ctx, W, H, 'La tour est finie !', [
                    { text: `${s.score} points · ${s.tower.length} étage${s.tower.length > 1 ? 's' : ''}`, size: 24, weight: 800 },
                    s.record ? { text: 'Nouveau record !', color: '#ffd36e', weight: 700 } : 'Joli bonhomme.',
                    { text: s.overT > 0.8 ? 'Clic ou Espace pour rejouer' : ' ', color: 'rgba(255,255,255,0.75)' }
                ]);
            }
            if (s.phase === 'play' && s.streak >= 3) {
                text(ctx, `Série parfaite x${s.streak}`, W / 2, 40, { size: 20, weight: 800, font: DISPLAY, color: '#ffd36e', align: 'center', shadow: true });
            }
        },

        pointerDown() {
            release();
        },

        keyDown(code, repeat) {
            if (repeat) return;
            if (code === 'Space' || code === 'Enter' || code === 'ArrowDown') release();
        }
    };
}

export default function TowerGame({ onScore }) {
    return <GameCanvas create={createTower} onScore={onScore} label="Tour de bonhommes de neige" />;
}
