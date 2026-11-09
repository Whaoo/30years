import { useMemo } from 'react';
import GameCanvas from './GameCanvas';
import {
    DISPLAY, TAU, addPopup, circle, clamp, drawOverlay, drawPenguin, drawPopups, ellipse,
    hudPill, rand, roundRect, skyGradient, text, updatePopups
} from './draw';
import { joinNames } from '../utils/birthdayLogic';

// Souffle les bougies : le jeu du jour J, au nom de la personne fêtée.
// Les bougies se rallument au hasard : il faut les souffler avant que la cire coule sur le gâteau.
const DURATION = 30;
const SLOTS = 9;
const CAKE_TOP = 262;
const CANDLE_H = 44;
const COLORS = ['#3b82f6', '#ffd36e', '#ff5fa2', '#6ee7b7', '#a78bfa'];
const BIG_CHARGE = 0.45;
const BIG_COOLDOWN = 4;
const BIG_RADIUS = 115;

function createCandles(api, people) {
    const W = api.width;
    const H = api.height;
    const names = joinNames(people.map((p) => p.name));
    const wish = names ? `Joyeux anniversaire ${names} !` : 'Joyeux anniversaire !';
    const star = people[0] || { scarf: '#ff6b6b', hatColor: '#ff5fa2' };
    const s = {
        phase: 'ready',
        time: DURATION,
        elapsed: 0,
        score: 0,
        blown: 0,
        drips: 0,
        combo: 0,
        comboT: 0,
        spawnT: 0,
        bigCd: 0,
        breath: null,
        aim: { x: W / 2, y: 200 },
        candles: [],
        smokes: [],
        gusts: [],
        confetti: [],
        popups: [],
        overT: 0,
        record: false,
        t: 0
    };

    function layout() {
        s.candles = Array.from({ length: SLOTS }, (_, i) => ({
            x: 268 + i * 33,
            lit: false,
            t: 0,
            life: 3,
            drip: 0,
            dripCount: 0,
            color: COLORS[i % COLORS.length]
        }));
    }
    layout();

    const flameY = () => CAKE_TOP - CANDLE_H - 8;

    function start() {
        Object.assign(s, {
            phase: 'play', time: DURATION, elapsed: 0, score: 0, blown: 0, drips: 0, combo: 0, comboT: 0,
            spawnT: 0.3, bigCd: 0, breath: null, smokes: [], gusts: [], confetti: [], popups: [], record: false
        });
        layout();
        light();
        light();
    }

    function light() {
        const off = s.candles.filter((c) => !c.lit && c.drip <= 0);
        if (!off.length) return;
        const c = off[Math.floor(Math.random() * off.length)];
        c.lit = true;
        c.t = 0;
        c.life = Math.max(1.5, 3.2 - s.elapsed * 0.055);
    }

    function blow(c, big = false) {
        c.lit = false;
        c.t = 0;
        s.blown += 1;
        s.combo += 1;
        s.comboT = 0.8;
        const mult = Math.min(3, 1 + Math.floor(s.combo / 4));
        const pts = 10 * mult;
        s.score += pts;
        addPopup(s.popups, c.x, flameY() - 18, mult > 1 ? `+${pts} x${mult}` : `+${pts}`, big ? '#9fd8ff' : '#6ee7b7');
        for (let i = 0; i < 3; i++) s.smokes.push({ x: c.x + rand(-3, 3), y: flameY() - 4, t: 0, vx: rand(-12, 12), r: rand(3, 5) });
    }

    function tapAt(x, y) {
        let best = null;
        let bd = 30;
        for (const c of s.candles) {
            if (!c.lit) continue;
            const d = Math.hypot(c.x - x, flameY() - y);
            if (d < bd) {
                bd = d;
                best = c;
            }
        }
        if (best) blow(best);
    }

    function bigBreath(x, y) {
        if (s.bigCd > 0) return;
        s.bigCd = BIG_COOLDOWN;
        s.gusts.push({ x, y, t: 0 });
        let n = 0;
        for (const c of s.candles) {
            if (c.lit && Math.hypot(c.x - x, flameY() - y) < BIG_RADIUS) {
                blow(c, true);
                n += 1;
            }
        }
        if (n >= 3) addPopup(s.popups, x, y - 40, `Grand souffle : ${n} bougies !`, '#ffd36e');
    }

    function finish() {
        s.phase = 'over';
        s.overT = 0;
        s.record = api.reportScore(s.score);
        s.candles.forEach((c) => {
            c.lit = false;
        });
        for (let i = 0; i < 90; i++) {
            s.confetti.push({
                x: rand(0, W), y: rand(-200, -10), vy: rand(60, 160), vx: rand(-30, 30), rot: rand(0, TAU),
                vr: rand(-6, 6), c: COLORS[i % COLORS.length], w: rand(5, 9), h: rand(8, 14)
            });
        }
    }

    function drawCake(ctx) {
        // Table
        roundRect(ctx, 120, 360, 560, 26, 10);
        ctx.fillStyle = '#5b3a6e';
        ctx.fill();
        ellipse(ctx, 400, 360, 230, 12, '#6d4a82');
        ellipse(ctx, 400, 356, 170, 10, 'rgba(255,255,255,0.12)');
        // Étage du bas
        roundRect(ctx, 210, 300, 380, 62, 14);
        ctx.fillStyle = '#ff8fa8';
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(210, 312);
        for (let x = 210; x + 38 <= 590; x += 38) ctx.quadraticCurveTo(x + 19, 330, x + 38, 312);
        ctx.lineTo(590, 306);
        ctx.quadraticCurveTo(590, 300, 580, 300);
        ctx.lineTo(220, 300);
        ctx.quadraticCurveTo(210, 300, 210, 306);
        ctx.closePath();
        ctx.fillStyle = '#fff6f9';
        ctx.fill();
        // Étage du haut
        roundRect(ctx, 250, CAKE_TOP, 300, 44, 12);
        ctx.fillStyle = '#ffd1dc';
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(250, CAKE_TOP + 10);
        for (let x = 250; x + 30 <= 550; x += 30) ctx.quadraticCurveTo(x + 15, CAKE_TOP + 24, x + 30, CAKE_TOP + 10);
        ctx.lineTo(550, CAKE_TOP + 6);
        ctx.quadraticCurveTo(550, CAKE_TOP, 540, CAKE_TOP);
        ctx.lineTo(260, CAKE_TOP);
        ctx.quadraticCurveTo(250, CAKE_TOP, 250, CAKE_TOP + 6);
        ctx.closePath();
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        const sprinkles = [[240, 340, '#3b82f6'], [300, 348, '#ffd36e'], [360, 338, '#6ee7b7'], [430, 346, '#3b82f6'], [500, 340, '#a78bfa'], [560, 348, '#ffd36e'], [330, 290, '#ff5fa2'], [470, 288, '#3b82f6']];
        for (const [x, y, c] of sprinkles) {
            roundRect(ctx, x, y, 9, 3.5, 2);
            ctx.fillStyle = c;
            ctx.fill();
        }
    }

    function drawCandle(ctx, c) {
        const top = CAKE_TOP - CANDLE_H;
        roundRect(ctx, c.x - 5, top, 10, CANDLE_H + 4, 3);
        ctx.fillStyle = c.color;
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        for (let k = 0; k < 4; k++) ctx.fillRect(c.x - 5, top + 6 + k * 11, 10, 3);
        ctx.strokeStyle = '#4a3527';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(c.x, top);
        ctx.lineTo(c.x, top - 5);
        ctx.stroke();
        // Cire qui a coulé (reste visible)
        for (let k = 0; k < c.dripCount; k++) {
            const dx = (k % 2 ? 1 : -1) * (3 + k);
            ellipse(ctx, c.x + dx, top + 10 + k * 6, 3, 6 + k, c.color);
        }
        if (c.drip > 0) {
            const k = 1 - c.drip / 1.2;
            ellipse(ctx, c.x + 4, top + 4 + k * (CANDLE_H + 10), 3.5, 5, c.color);
        }
        if (c.lit) {
            const life = c.t / c.life;
            const fl = 1 + Math.sin(s.t * 22 + c.x) * 0.08;
            const size = (0.75 + life * 0.7) * fl;
            const danger = life > 0.7;
            const fy = flameY();
            ctx.save();
            ctx.translate(c.x + (danger ? Math.sin(s.t * 40) * 1.5 : 0), fy + 4);
            ctx.scale(size, size);
            circle(ctx, 0, -6, 13, danger ? 'rgba(255, 90, 60, 0.25)' : 'rgba(255, 211, 110, 0.25)');
            ctx.beginPath();
            ctx.moveTo(0, -20);
            ctx.quadraticCurveTo(9, -9, 6, -1);
            ctx.quadraticCurveTo(0, 5, -6, -1);
            ctx.quadraticCurveTo(-9, -9, 0, -20);
            ctx.fillStyle = danger ? '#ff6b3c' : '#ff9f43';
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(0, -11);
            ctx.quadraticCurveTo(4.5, -5, 3, -1);
            ctx.quadraticCurveTo(0, 2, -3, -1);
            ctx.quadraticCurveTo(-4.5, -5, 0, -11);
            ctx.fillStyle = '#ffd36e';
            ctx.fill();
            ctx.restore();
        }
    }

    function drawGarland(ctx) {
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 18);
        ctx.quadraticCurveTo(W / 2, 70, W, 18);
        ctx.stroke();
        for (let i = 0; i < 16; i++) {
            const t = (i + 0.5) / 16;
            const x = t * W;
            const y = (1 - t) * (1 - t) * 18 + 2 * t * (1 - t) * 70 + t * t * 18;
            ctx.beginPath();
            ctx.moveTo(x - 11, y);
            ctx.lineTo(x + 11, y);
            ctx.lineTo(x, y + 20);
            ctx.closePath();
            ctx.fillStyle = COLORS[i % COLORS.length];
            ctx.fill();
        }
    }

    // En local uniquement : accès à l'état depuis la console (tests)
    if (import.meta.env.DEV) window.bougies = { s };

    return {
        canPause() {
            return s.phase === 'play';
        },

        update(dt) {
            s.t += dt;
            updatePopups(s.popups, dt);
            for (let i = s.smokes.length - 1; i >= 0; i--) {
                const m = s.smokes[i];
                m.t += dt;
                m.y -= 30 * dt;
                m.x += m.vx * dt;
                if (m.t > 0.9) s.smokes.splice(i, 1);
            }
            for (let i = s.gusts.length - 1; i >= 0; i--) {
                s.gusts[i].t += dt;
                if (s.gusts[i].t > 0.5) s.gusts.splice(i, 1);
            }
            for (const c of s.confetti) {
                c.y += c.vy * dt;
                c.x += c.vx * dt;
                c.rot += c.vr * dt;
            }
            for (const c of s.candles) if (c.drip > 0) c.drip = Math.max(0, c.drip - dt);
            if (s.phase === 'over') s.overT += dt;
            if (s.phase !== 'play') return;

            s.elapsed += dt;
            s.time -= dt;
            s.bigCd = Math.max(0, s.bigCd - dt);
            s.comboT -= dt;
            if (s.comboT <= 0) s.combo = 0;
            if (s.breath) s.breath.t += dt;
            s.spawnT -= dt;
            if (s.spawnT <= 0) {
                light();
                if (s.elapsed > 12 && Math.random() < 0.35) light();
                s.spawnT = Math.max(0.42, 0.95 - s.elapsed * 0.02) * rand(0.75, 1.25);
            }
            for (const c of s.candles) {
                if (!c.lit) continue;
                c.t += dt;
                if (c.t >= c.life) {
                    c.lit = false;
                    c.drip = 1.2;
                    c.dripCount = Math.min(3, c.dripCount + 1);
                    s.drips += 1;
                    s.combo = 0;
                    s.score = Math.max(0, s.score - 15);
                    addPopup(s.popups, c.x, CAKE_TOP - 10, 'Ça coule ! -15', '#ff8fa8');
                }
            }
            if (s.time <= 0) {
                s.time = 0;
                finish();
            }
        },

        render(ctx) {
            skyGradient(ctx, W, H, [[0, '#3b2a66'], [1, '#2a1f4d']]);
            drawGarland(ctx);
            text(ctx, wish, W / 2, 112, {
                size: wish.length > 42 ? 24 : 30, weight: 800, font: DISPLAY, color: '#ffd36e', align: 'center', shadow: true
            });
            drawCake(ctx);
            for (const c of s.candles) drawCandle(ctx, c);
            for (const m of s.smokes) {
                ctx.globalAlpha = Math.max(0, 0.6 * (1 - m.t / 0.9));
                circle(ctx, m.x, m.y, m.r + m.t * 6, '#cfd8e6');
            }
            ctx.globalAlpha = 1;
            for (const g of s.gusts) {
                const k = g.t / 0.5;
                ctx.strokeStyle = `rgba(159, 216, 255, ${0.8 * (1 - k)})`;
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(g.x, g.y, BIG_RADIUS * (0.4 + 0.6 * k), 0, TAU);
                ctx.stroke();
            }

            const blowing = s.phase === 'play' && (s.breath || s.comboT > 0.5);
            drawPenguin(ctx, 110, 372, 120, {
                hat: 'party', scarf: star.scarf, hatColor: star.hatColor, mood: s.phase === 'over' ? 'happy' : (blowing ? 'surprised' : 'happy'),
                flip: s.phase === 'over' ? -2.4 + Math.sin(s.t * 12) * 0.3 : -0.3, look: 2
            });
            if (blowing) {
                ctx.strokeStyle = 'rgba(207, 234, 255, 0.7)';
                ctx.lineWidth = 2.5;
                ctx.setLineDash([5, 6]);
                for (let i = 0; i < 3; i++) {
                    ctx.beginPath();
                    ctx.moveTo(150, 300 + i * 9);
                    ctx.quadraticCurveTo(190, 292 + i * 9, 230, 298 + i * 9);
                    ctx.stroke();
                }
                ctx.setLineDash([]);
            }

            if (s.phase === 'play' && s.breath) {
                const k = Math.min(1, s.breath.t / BIG_CHARGE);
                ctx.strokeStyle = k >= 1 && s.bigCd <= 0 ? '#9fd8ff' : 'rgba(159,216,255,0.5)';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(s.aim.x, s.aim.y, 20, -Math.PI / 2, -Math.PI / 2 + k * TAU);
                ctx.stroke();
            }

            drawPopups(ctx, s.popups);
            for (const c of s.confetti) {
                ctx.save();
                ctx.translate(c.x, c.y);
                ctx.rotate(c.rot);
                ctx.fillStyle = c.c;
                ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
                ctx.restore();
            }

            hudPill(ctx, 16, 146, 'Score', s.score);
            hudPill(ctx, W - 16, 146, 'Temps', `${Math.ceil(s.time)} s`, 'right');
            if (s.phase === 'play') {
                const label = s.bigCd > 0 ? `Grand souffle dans ${Math.ceil(s.bigCd)} s` : 'Grand souffle prêt : maintiens le clic';
                text(ctx, label, W - 16, 204, { size: 13, weight: 700, color: s.bigCd > 0 ? 'rgba(255,255,255,0.6)' : '#9fd8ff', align: 'right' });
            }

            if (s.phase === 'ready') {
                drawOverlay(ctx, W, H, 'Souffle les bougies', [
                    names ? `Les bougies de ${names} se rallument toutes seules !` : 'Les bougies se rallument toutes seules !',
                    'Clique sur les flammes avant que la cire coule.',
                    'Maintiens le clic puis relâche : grand souffle sur toute une zone.',
                    { text: 'Clique ou appuie sur Espace pour commencer', color: '#ffd36e', weight: 700 }
                ], 620);
            } else if (s.phase === 'over' && s.overT > 0.6) {
                drawOverlay(ctx, W, H, wish, [
                    { text: `${s.score} points`, size: 24, weight: 800 },
                    `${s.blown} bougie${s.blown > 1 ? 's' : ''} soufflée${s.blown > 1 ? 's' : ''} · ${s.drips} coulure${s.drips > 1 ? 's' : ''}`,
                    s.record ? { text: 'Nouveau record !', color: '#ffd36e', weight: 700 } : 'Le gâteau est sauvé.',
                    { text: s.overT > 1.4 ? 'Clique ou Espace pour rejouer' : ' ', color: 'rgba(255,255,255,0.75)' }
                ], 640);
            }
        },

        pointerDown(x, y) {
            s.aim = { x, y };
            if (s.phase === 'ready' || (s.phase === 'over' && s.overT > 1.4)) {
                start();
                return;
            }
            if (s.phase !== 'play') return;
            tapAt(x, y);
            s.breath = { t: 0 };
        },

        pointerMove(x, y) {
            s.aim = { x, y };
        },

        pointerUp(x, y) {
            if (s.phase === 'play' && s.breath && s.breath.t >= BIG_CHARGE) bigBreath(x, y);
            s.breath = null;
        },

        keyDown(code, repeat) {
            if (repeat) return;
            if (code === 'Space' || code === 'Enter') {
                if (s.phase === 'ready' || (s.phase === 'over' && s.overT > 1.4)) start();
                else if (s.phase === 'play') bigBreath(clamp(s.aim.x, 260, 540), flameY());
            }
        },

        blur() {
            s.breath = null;
        }
    };
}

export default function CandlesGame({ onScore, people = [] }) {
    const key = people.map((p) => p.id).join('|');
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const create = useMemo(() => (api) => createCandles(api, people), [key]);
    return <GameCanvas pausable create={create} onScore={onScore} label="Souffle les bougies" />;
}
