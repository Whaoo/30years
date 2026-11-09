import GameCanvas from './GameCanvas';
import {
    DISPLAY, TAU, addPopup, circle, drawOverlay, drawPenguin, drawPopups, ellipse, hudPill, rand,
    roundRect, skyGradient, text, updatePopups
} from './draw';

// La chorale des pingouins : écouter la mélodie, la répéter dans l'ordre. Une note de plus à chaque tour.
// Le son est optionnel (touche S) : les couleurs et les pingouins qui chantent suffisent.
const SINGERS = [
    { x: 160, color: '#e94b4b', light: '#ff9a9a', freq: 261.63, key: '1' },
    { x: 320, color: '#3b82f6', light: '#9fc4ff', freq: 329.63, key: '2' },
    { x: 480, color: '#2f9e6e', light: '#8fe0b8', freq: 392.0, key: '3' },
    { x: 640, color: '#f2b84b', light: '#ffe08a', freq: 523.25, key: '4' }
];
const FEET = 352;
const KEYS = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Numpad1: 0, Numpad2: 1, Numpad3: 2, Numpad4: 3 };
const LIVES = 2;

function createChoir(api) {
    const W = api.width;
    const H = api.height;
    const s = {
        phase: 'ready',
        seq: [],
        step: 0,
        playT: 0,
        active: -1,
        activeT: 0,
        input: 0,
        best: 0,
        lives: LIVES,
        message: '',
        messageT: 0,
        waitT: 0,
        sound: false,
        audio: null,
        popups: [],
        notes: [],
        overT: 0,
        record: false,
        t: 0
    };

    const noteLen = () => Math.max(0.26, 0.55 - s.seq.length * 0.02);
    const gapLen = () => Math.max(0.1, 0.16 - s.seq.length * 0.004);

    function tone(i) {
        if (!s.sound) return;
        try {
            if (!s.audio) s.audio = new (window.AudioContext || window.webkitAudioContext)();
            const ctx = s.audio;
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.type = 'triangle';
            o.frequency.value = SINGERS[i].freq;
            g.gain.setValueAtTime(0.0001, ctx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.02);
            g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
            o.connect(g).connect(ctx.destination);
            o.start();
            o.stop(ctx.currentTime + 0.4);
        } catch {
            /* son indisponible : on continue sans */
        }
    }

    function sing(i, dur) {
        s.active = i;
        s.activeT = dur;
        tone(i);
        s.notes.push({ x: SINGERS[i].x + rand(-20, 20), y: FEET - 120, t: 0, c: SINGERS[i].light });
    }

    function say(msg, t = 1.2) {
        s.message = msg;
        s.messageT = t;
    }

    function listen(delay = 0.8) {
        s.phase = 'listen';
        s.step = 0;
        s.playT = -delay;
        s.input = 0;
        say('Écoute…', 99);
    }

    function start() {
        Object.assign(s, { seq: [Math.floor(Math.random() * 4)], best: 0, lives: LIVES, popups: [], record: false });
        listen(0.6);
    }

    function finish() {
        s.phase = 'over';
        s.overT = 0;
        s.record = api.reportScore(s.best);
    }

    function press(i) {
        if (s.phase !== 'repeat') return;
        sing(i, 0.3);
        if (i === s.seq[s.input]) {
            s.input += 1;
            if (s.input === s.seq.length) {
                s.best = Math.max(s.best, s.seq.length);
                addPopup(s.popups, W / 2, 96, `${s.seq.length} note${s.seq.length > 1 ? 's' : ''} !`, '#ffd36e');
                say('Bravo ! Une note de plus', 1);
                s.seq.push(Math.floor(Math.random() * 4));
                s.phase = 'wait';
                s.waitT = 1;
            }
        } else {
            s.lives -= 1;
            s.phase = 'wait';
            s.waitT = 1.3;
            s.wrong = 0.6;
            if (s.lives <= 0) {
                say('Fausse note !', 1.3);
                s.endAfter = true;
            } else {
                say('Oups ! On réécoute la même mélodie', 1.3);
            }
        }
    }

    function drawStage(ctx) {
        skyGradient(ctx, W, H, [[0, '#1b2350'], [1, '#2a1f4d']]);
        // Rideaux
        ctx.fillStyle = '#7a2340';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(90, 0);
        ctx.quadraticCurveTo(60, 200, 30, H);
        ctx.lineTo(0, H);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(W, 0);
        ctx.lineTo(W - 90, 0);
        ctx.quadraticCurveTo(W - 60, 200, W - 30, H);
        ctx.lineTo(W, H);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#9b2c50';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(W, 0);
        ctx.lineTo(W, 30);
        for (let x = W; x >= 0; x -= 50) ctx.quadraticCurveTo(x - 25, 56, x - 50, 30);
        ctx.closePath();
        ctx.fill();
        // Scène
        roundRect(ctx, 40, FEET + 6, W - 80, 70, 14);
        ctx.fillStyle = '#e8f1fb';
        ctx.fill();
        ctx.fillStyle = '#cfdcec';
        ctx.fillRect(40, FEET + 50, W - 80, 4);
    }

    // En local uniquement : accès à l'état depuis la console (tests)
    if (import.meta.env.DEV) window.chorale = { s, press };

    return {
        update(dt) {
            s.t += dt;
            updatePopups(s.popups, dt);
            if (s.messageT < 50) s.messageT -= dt;
            if (s.activeT > 0) {
                s.activeT -= dt;
                if (s.activeT <= 0) s.active = -1;
            }
            if (s.wrong > 0) s.wrong -= dt;
            for (let i = s.notes.length - 1; i >= 0; i--) {
                const n = s.notes[i];
                n.t += dt;
                n.y -= 50 * dt;
                if (n.t > 1) s.notes.splice(i, 1);
            }
            if (s.phase === 'over') s.overT += dt;
            if (s.phase === 'listen') {
                s.playT += dt;
                const per = noteLen() + gapLen();
                const idx = Math.floor(s.playT / per);
                if (s.playT >= 0 && idx >= s.step && idx < s.seq.length) {
                    sing(s.seq[idx], noteLen());
                    s.step = idx + 1;
                }
                if (s.playT >= s.seq.length * per) {
                    s.phase = 'repeat';
                    s.input = 0;
                    say('À toi !', 99);
                }
            } else if (s.phase === 'wait') {
                s.waitT -= dt;
                if (s.waitT <= 0) {
                    if (s.endAfter) {
                        s.endAfter = false;
                        finish();
                    } else {
                        listen(0.3);
                    }
                }
            }
        },

        render(ctx) {
            drawStage(ctx);
            SINGERS.forEach((g, i) => {
                const on = s.active === i;
                if (on) {
                    ctx.fillStyle = 'rgba(255, 245, 200, 0.08)';
                    ctx.beginPath();
                    ctx.moveTo(g.x - 30, 40);
                    ctx.lineTo(g.x + 30, 40);
                    ctx.lineTo(g.x + 90, FEET + 20);
                    ctx.lineTo(g.x - 90, FEET + 20);
                    ctx.closePath();
                    ctx.fill();
                    ellipse(ctx, g.x, FEET + 12, 66, 18, g.color + '88');
                }
                ellipse(ctx, g.x, FEET + 10, 54, 14, on ? g.light : g.color);
                text(ctx, g.key, g.x, FEET + 46, { size: 15, weight: 800, font: DISPLAY, color: '#3a4a7a', align: 'center' });
                const h = on ? 138 : 124;
                drawPenguin(ctx, g.x, FEET + 8 - (on ? 6 : 0), h, {
                    hat: 'beanie', hatColor: g.color, scarf: '#f4f7fb', mood: on ? 'happy' : (s.wrong > 0 ? 'surprised' : 'normal'),
                    flip: on ? -2.3 : -0.3, rotate: on ? Math.sin(s.t * 20) * 0.05 : 0
                });
            });
            for (const n of s.notes) {
                ctx.globalAlpha = Math.max(0, 1 - n.t);
                ctx.fillStyle = n.c;
                ctx.beginPath();
                ctx.ellipse(n.x, n.y, 7, 5, -0.4, 0, TAU);
                ctx.fill();
                ctx.fillRect(n.x + 5, n.y - 22, 2.5, 22);
                ctx.fillRect(n.x + 5, n.y - 22, 9, 3);
            }
            ctx.globalAlpha = 1;

            // Mélodie : une pastille par note, remplies au fil de la répétition
            const total = s.seq.length;
            if (total && s.phase !== 'ready') {
                const w = total * 18;
                for (let i = 0; i < total; i++) {
                    let c = 'rgba(255,255,255,0.25)';
                    if (s.phase === 'listen' && i < s.step) c = '#ffffff';
                    if ((s.phase === 'repeat' || s.phase === 'wait') && i < s.input) c = SINGERS[s.seq[i]].color;
                    circle(ctx, W / 2 - w / 2 + 9 + i * 18, 76, 6, c);
                }
            }
            if (s.message && (s.messageT > 0 || s.messageT > 50)) {
                text(ctx, s.message, W / 2, 130, { size: 26, weight: 800, font: DISPLAY, align: 'center', color: s.wrong > 0 ? '#ff8f8f' : '#ffffff', shadow: true });
            }
            drawPopups(ctx, s.popups);

            hudPill(ctx, 110, 14, 'Mélodie', `${s.seq.length} note${s.seq.length > 1 ? 's' : ''}`);
            hudPill(ctx, W - 110, 14, 'Vies', '●'.repeat(Math.max(0, s.lives)) + '○'.repeat(Math.max(0, LIVES - s.lives)), 'right');
            text(ctx, s.sound ? 'Son : activé (S)' : 'Son : coupé (S)', W / 2, 30, { size: 13, weight: 700, color: 'rgba(255,255,255,0.75)', align: 'center' });

            if (s.phase === 'ready') {
                drawOverlay(ctx, W, H, 'La chorale des pingouins', [
                    'Les pingouins chantent une mélodie : répète-la dans l’ordre.',
                    'Clique sur les pingouins ou utilise les touches 1 à 4.',
                    'Une note de plus à chaque tour, 2 fausses notes permises. S : son.',
                    { text: 'Clique ou appuie sur Espace pour commencer', color: '#ffd36e', weight: 700 }
                ], 600);
            } else if (s.phase === 'over' && s.overT > 0.4) {
                drawOverlay(ctx, W, H, 'Rideau !', [
                    { text: `${s.best} note${s.best > 1 ? 's' : ''} retenue${s.best > 1 ? 's' : ''}`, size: 24, weight: 800 },
                    s.record ? { text: 'Nouveau record !', color: '#ffd36e', weight: 700 } : 'Belle voix, la chorale te garde une place.',
                    { text: s.overT > 1.2 ? 'Clique ou Espace pour rejouer' : ' ', color: 'rgba(255,255,255,0.75)' }
                ], 560);
            }
        },

        pointerDown(x, y) {
            if (s.phase === 'ready' || (s.phase === 'over' && s.overT > 1.2)) {
                start();
                return;
            }
            if (y < FEET - 150 || y > FEET + 60) return;
            const i = SINGERS.findIndex((g) => Math.abs(x - g.x) < 70);
            if (i >= 0) press(i);
        },

        keyDown(code, repeat) {
            if (repeat) return;
            if (code === 'KeyS') {
                s.sound = !s.sound;
                if (s.sound) tone(0);
                return;
            }
            if ((code === 'Space' || code === 'Enter') && (s.phase === 'ready' || (s.phase === 'over' && s.overT > 1.2))) {
                start();
                return;
            }
            if (KEYS[code] != null) press(KEYS[code]);
        },

        destroy() {
            if (s.audio) s.audio.close().catch(() => {});
        }
    };
}

export default function ChoirGame({ onScore }) {
    return (
        <GameCanvas
            create={createChoir}
            onScore={onScore}
            label="La chorale des pingouins"
            controls={[
                { code: 'Digit1', text: '1', label: 'Pingouin rouge' },
                { code: 'Digit2', text: '2', label: 'Pingouin bleu' },
                { code: 'Digit3', text: '3', label: 'Pingouin vert' },
                { code: 'Digit4', text: '4', label: 'Pingouin jaune' },
                { code: 'KeyS', text: 'Son', label: 'Activer ou couper le son' }
            ]}
        />
    );
}
