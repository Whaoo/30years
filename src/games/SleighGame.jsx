import GameCanvas from './GameCanvas';
import {
    DISPLAY, TAU, addPopup, circle, clamp, drawOverlay, drawPenguin, drawPopups, ellipse, hudPill, rand,
    roundRect, skyGradient, text, updatePopups
} from './draw';

// Livraison en traîneau : accroché à son parapluie, Flocon survole les toits et lâche les cadeaux
// dans les cheminées. Le vent change à chaque maison ; la trajectoire d'aide s'efface après 3 toits.
const HOUSES = 10;
const GIFTS = 13;
const PX = 190; // position du pingouin à l'écran
const SPEED = 135;
const GRAVITY = 420;
const ALT_MIN = 130;
const ALT_MAX = 200;
const HELP_HOUSES = 3;

function makeHouses() {
    const list = [];
    let x = 620;
    for (let i = 0; i < HOUSES; i++) {
        const w = rand(150, 210);
        const wall = rand(300, 340);
        const peak = wall - rand(46, 70);
        const cw = 28;
        const cx = x + rand(0.25, 0.65) * w;
        // Toit en pente : hauteur du toit à l'abscisse de la cheminée
        const mid = x + w / 2;
        const roofAt = (px) => peak + (Math.abs(px - mid) / (w / 2)) * (wall - peak);
        const ctop = Math.min(roofAt(cx), roofAt(cx + cw)) - rand(26, 40);
        list.push({
            x, w, wall, peak, cx, cw, ctop, roofAt, delivered: false,
            wind: i === 0 ? 0 : Math.round(rand(-2.4, 2.4)),
            color: ['#4c5a8f', '#5a4c8f', '#3f6a8f', '#6a4c7a'][i % 4],
            windows: Math.random() < 0.5 ? 1 : 2
        });
        x += w + rand(170, 260);
    }
    return list;
}

function createSleigh(api) {
    const W = api.width;
    const H = api.height;
    const s = {
        phase: 'ready',
        houses: makeHouses(),
        scroll: 0,
        y: 150,
        targetY: 150,
        upKey: false,
        downKey: false,
        usePointer: false,
        gifts: GIFTS,
        drops: [],
        delivered: 0,
        score: 0,
        streak: 0,
        dropCd: 0,
        popups: [],
        puffs: [],
        overT: 0,
        record: false,
        t: 0,
        stars: Array.from({ length: 50 }, () => ({ x: rand(0, W), y: rand(0, 220), r: rand(0.6, 1.7) }))
    };

    const worldX = () => s.scroll + PX;

    function start() {
        Object.assign(s, {
            phase: 'play', houses: makeHouses(), scroll: 0, y: 150, targetY: 150, gifts: GIFTS, drops: [],
            delivered: 0, score: 0, streak: 0, dropCd: 0, popups: [], puffs: [], record: false
        });
    }

    // Maison « en cours » : la prochaine dont la cheminée n'est pas encore derrière le pingouin
    function currentHouse() {
        return s.houses.find((h) => h.cx + h.cw > worldX() - 60) || null;
    }

    function drop() {
        if (s.phase !== 'play' || s.gifts <= 0 || s.dropCd > 0) return;
        s.gifts -= 1;
        s.dropCd = 0.35;
        const h = currentHouse();
        s.drops.push({ x: worldX() + 6, y: s.y + 26, py: s.y + 26, vx: SPEED, vy: 40, wind: h ? h.wind : 0, rot: 0, done: false });
    }

    function finish() {
        s.phase = 'over';
        s.overT = 0;
        s.score += s.gifts * 10;
        s.record = api.reportScore(s.score);
    }

    // Trajectoire prévue d'un cadeau lâché maintenant (aide des premiers toits)
    function predict() {
        const h = currentHouse();
        const wind = h ? h.wind : 0;
        const pts = [];
        let x = worldX() + 6;
        let y = s.y + 26;
        let vx = SPEED;
        let vy = 40;
        for (let i = 0; i < 40; i++) {
            const dt = 0.05;
            vx += wind * 40 * dt;
            vy += GRAVITY * dt;
            x += vx * dt;
            y += vy * dt;
            if (i % 2 === 0) pts.push({ x, y });
            if (y > 360) break;
        }
        return pts;
    }

    function landDrop(d) {
        for (const h of s.houses) {
            // Dans la cheminée ?
            if (d.x > h.cx - 2 && d.x < h.cx + h.cw + 2 && d.py <= h.ctop + 4 && d.y >= h.ctop && d.vy > 0) {
                const center = Math.abs(d.x - (h.cx + h.cw / 2)) < 6;
                let pts = 100 + (center ? 50 : 0);
                if (h.delivered) pts = 20;
                else {
                    h.delivered = true;
                    s.delivered += 1;
                    s.streak += 1;
                    if (s.streak >= 3) pts += 25 * (s.streak - 2);
                }
                s.score += pts;
                addPopup(s.popups, h.cx + h.cw / 2 - s.scroll, h.ctop - 24, center ? `En plein dans le mille ! +${pts}` : `+${pts}`, '#ffd36e');
                return 'in';
            }
            // Sur le toit ?
            if (d.x > h.x && d.x < h.x + h.w && d.y >= h.roofAt(d.x)) return 'roof';
        }
        if (d.y >= 380) return 'ground';
        return null;
    }

    function drawHouse(ctx, h, ox) {
        const x = h.x - ox;
        if (x > W + 40 || x + h.w < -40) return;
        const mid = x + h.w / 2;
        // Murs
        ctx.fillStyle = h.color;
        ctx.fillRect(x + 10, h.wall, h.w - 20, 400 - h.wall);
        // Fenêtres
        for (let k = 0; k < h.windows; k++) {
            const wx = x + 30 + k * (h.w - 80);
            roundRect(ctx, wx, h.wall + 18, 22, 24, 3);
            ctx.fillStyle = h.delivered ? '#ffd36e' : '#ffe9a8';
            ctx.fill();
        }
        // Cheminée
        const cx = h.cx - ox;
        ctx.fillStyle = '#8a4a3c';
        ctx.fillRect(cx, h.ctop, h.cw, h.roofAt(h.cx + h.cw / 2) - h.ctop + 10);
        ctx.fillStyle = '#6d3a2f';
        ctx.fillRect(cx - 3, h.ctop, h.cw + 6, 8);
        ctx.fillStyle = '#f4f7fb';
        ctx.fillRect(cx - 3, h.ctop - 4, h.cw + 6, 5);
        if (h.delivered) {
            circle(ctx, cx + h.cw / 2, h.ctop - 6, 18, 'rgba(255, 211, 110, 0.35)');
        } else {
            ctx.strokeStyle = 'rgba(255, 211, 110, 0.75)';
            ctx.setLineDash([5, 4]);
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(cx + h.cw / 2, h.ctop - 2, h.cw / 2 + 6, 6, 0, 0, TAU);
            ctx.stroke();
            ctx.setLineDash([]);
        }
        // Toit enneigé
        ctx.beginPath();
        ctx.moveTo(x, h.wall + 4);
        ctx.lineTo(mid, h.peak);
        ctx.lineTo(x + h.w, h.wall + 4);
        ctx.closePath();
        ctx.fillStyle = '#2d3c70';
        ctx.fill();
        ctx.strokeStyle = '#f4f7fb';
        ctx.lineWidth = 7;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(x, h.wall + 4);
        ctx.lineTo(mid, h.peak);
        ctx.lineTo(x + h.w, h.wall + 4);
        ctx.stroke();
    }

    function drawGift(ctx, x, y, rot = 0) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        roundRect(ctx, -8, -7, 16, 14, 2);
        ctx.fillStyle = '#e94b4b';
        ctx.fill();
        ctx.fillStyle = '#ffd36e';
        ctx.fillRect(-1.5, -7, 3, 14);
        ctx.fillRect(-8, -1.5, 16, 3);
        ctx.restore();
    }

    // En mode test uniquement (npm run dev, préversion dev) : accès à l'état depuis la console
    if (__TEST_MODE__) window.traineau = { s, drop };

    return {
        canPause() {
            return s.phase === 'play';
        },

        update(dt) {
            s.t += dt;
            updatePopups(s.popups, dt);
            for (let i = s.puffs.length - 1; i >= 0; i--) {
                s.puffs[i].t += dt;
                if (s.puffs[i].t > 0.6) s.puffs.splice(i, 1);
            }
            if (s.phase === 'over') s.overT += dt;
            if (s.phase !== 'play') return;

            s.scroll += SPEED * dt;
            s.dropCd = Math.max(0, s.dropCd - dt);
            if (s.upKey) s.targetY -= 190 * dt;
            if (s.downKey) s.targetY += 190 * dt;
            s.targetY = clamp(s.targetY, ALT_MIN, ALT_MAX);
            s.y += (s.targetY - s.y) * (1 - Math.exp(-5 * dt));

            for (const d of s.drops) {
                if (d.done) continue;
                d.py = d.y;
                d.vx += d.wind * 40 * dt;
                d.vy += GRAVITY * dt;
                d.x += d.vx * dt;
                d.y += d.vy * dt;
                d.rot += dt * 3;
                const r = landDrop(d);
                if (r) {
                    d.done = true;
                    if (r !== 'in') {
                        s.streak = 0;
                        s.puffs.push({ x: d.x, y: d.y, t: 0 });
                        addPopup(s.popups, d.x - s.scroll, d.y - 18, r === 'roof' ? 'Sur le toit !' : 'Raté', '#9fb3cc');
                    }
                }
            }
            s.drops = s.drops.filter((d) => !d.done);

            const last = s.houses[s.houses.length - 1];
            const passed = last.x + last.w < s.scroll - 20;
            if (passed || (s.gifts <= 0 && s.drops.length === 0)) finish();
        },

        render(ctx) {
            skyGradient(ctx, W, H, [[0, '#0b1433'], [1, '#22346e']]);
            for (const st of s.stars) circle(ctx, st.x, st.y, st.r, 'rgba(255,255,255,0.8)');
            circle(ctx, 700, 64, 26, '#eef3ff');
            circle(ctx, 710, 58, 23, '#0f1a40');
            // Collines lointaines (défilement lent)
            ctx.fillStyle = '#1b2a5c';
            ctx.beginPath();
            ctx.moveTo(0, H);
            for (let x = 0; x <= W; x += 20) ctx.lineTo(x, 300 + Math.sin((x + s.scroll * 0.3) * 0.012) * 18);
            ctx.lineTo(W, H);
            ctx.closePath();
            ctx.fill();

            for (const h of s.houses) drawHouse(ctx, h, s.scroll);
            ctx.fillStyle = '#e8f1fb';
            ctx.fillRect(0, 398, W, H - 398);

            // Aide : trajectoire prévue pendant les premiers toits
            const h = currentHouse();
            const helpOn = s.phase === 'play' && h && s.houses.indexOf(h) < HELP_HOUSES && s.gifts > 0;
            if (helpOn) {
                ctx.fillStyle = 'rgba(255, 211, 110, 0.55)';
                for (const p of predict()) {
                    ctx.beginPath();
                    ctx.arc(p.x - s.scroll, p.y, 2.4, 0, TAU);
                    ctx.fill();
                }
            }

            for (const d of s.drops) drawGift(ctx, d.x - s.scroll, d.y, d.rot);
            for (const p of s.puffs) {
                ctx.globalAlpha = 1 - p.t / 0.6;
                for (let i = 0; i < 5; i++) circle(ctx, p.x - s.scroll + Math.cos(i * 1.3) * p.t * 30, p.y - p.t * 20 + Math.sin(i * 1.3) * p.t * 14, 4, '#f4f7fb');
            }
            ctx.globalAlpha = 1;

            // Flocon et son parapluie
            const sway = Math.sin(s.t * 3) * 0.06;
            ctx.save();
            ctx.translate(PX, s.y);
            ctx.rotate(sway);
            ctx.strokeStyle = '#4a3527';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(14, -6);
            ctx.lineTo(14, -48);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(-22, -46);
            ctx.quadraticCurveTo(14, -86, 50, -46);
            for (let i = 3; i >= 0; i--) {
                const x0 = -22 + 18 * i;
                ctx.quadraticCurveTo(x0 + 9, -54, x0, -46);
            }
            ctx.closePath();
            ctx.fillStyle = '#e94b4b';
            ctx.fill();
            circle(ctx, 14, -80, 3, '#ffd36e');
            ctx.restore();
            drawPenguin(ctx, PX, s.y + 46, 60, { hat: 'beanie', hatColor: '#3b82f6', scarf: '#e94b4b', flip: -2.6, rotate: sway, look: 2 });
            if (s.gifts > 0 && s.phase !== 'over') drawGift(ctx, PX + 8, s.y + 30);

            drawPopups(ctx, s.popups);

            hudPill(ctx, 16, 14, 'Cadeaux', s.gifts);
            hudPill(ctx, 160, 14, 'Livrés', `${s.delivered} / ${HOUSES}`);
            hudPill(ctx, W - 16, 14, 'Score', s.score, 'right');
            if (s.phase === 'play' && h) {
                const arrow = h.wind > 0 ? '→'.repeat(h.wind) : h.wind < 0 ? '←'.repeat(-h.wind) : 'aucun';
                const label = `Vent : ${arrow}`;
                ctx.font = `800 15px ${DISPLAY}`;
                const w = ctx.measureText(label).width + 28;
                roundRect(ctx, (W - w) / 2, 14, w, 34, 17);
                ctx.fillStyle = h.wind ? 'rgba(159, 216, 255, 0.22)' : 'rgba(255,255,255,0.1)';
                ctx.fill();
                text(ctx, label, W / 2, 37, { size: 15, weight: 800, font: DISPLAY, align: 'center', color: '#cfeaff' });
                if (helpOn) text(ctx, 'Les pointillés montrent où tombera le cadeau (3 premiers toits)', W / 2, 66, { size: 13, weight: 600, color: 'rgba(255,255,255,0.7)', align: 'center' });
            }

            if (s.phase === 'ready') {
                drawOverlay(ctx, W, H, 'Livraison en traîneau', [
                    'Lâche un cadeau dans chaque cheminée.',
                    'Souris (ou ↑ ↓) pour l’altitude, clic ou Espace pour lâcher.',
                    'Attention au vent : il change à chaque maison.',
                    { text: 'Clique ou appuie sur Espace pour commencer', color: '#ffd36e', weight: 700 }
                ], 560);
            } else if (s.phase === 'over' && s.overT > 0.4) {
                drawOverlay(ctx, W, H, 'Tournée terminée !', [
                    { text: `${s.score} points`, size: 24, weight: 800 },
                    `${s.delivered} cheminée${s.delivered > 1 ? 's' : ''} sur ${HOUSES}${s.gifts ? ` · ${s.gifts} cadeau${s.gifts > 1 ? 'x' : ''} en réserve (+${s.gifts * 10})` : ''}`,
                    s.record ? { text: 'Nouveau record !', color: '#ffd36e', weight: 700 } : 'Le quartier est ravi.',
                    { text: s.overT > 1.2 ? 'Clique ou Espace pour rejouer' : ' ', color: 'rgba(255,255,255,0.75)' }
                ], 600);
            }
        },

        pointerDown(x, y) {
            if (s.phase === 'ready' || (s.phase === 'over' && s.overT > 1.2)) {
                start();
                return;
            }
            s.usePointer = true;
            s.targetY = clamp(y - 30, ALT_MIN, ALT_MAX);
            drop();
        },

        pointerMove(x, y) {
            if (s.phase !== 'play') return;
            s.usePointer = true;
            s.targetY = clamp(y - 30, ALT_MIN, ALT_MAX);
        },

        keyDown(code, repeat) {
            if (code === 'ArrowUp' || code === 'KeyW') s.upKey = true;
            if (code === 'ArrowDown' || code === 'KeyS') s.downKey = true;
            if (repeat) return;
            if (code === 'Space' || code === 'Enter') {
                if (s.phase === 'ready' || (s.phase === 'over' && s.overT > 1.2)) start();
                else drop();
            }
        },

        keyUp(code) {
            if (code === 'ArrowUp' || code === 'KeyW') s.upKey = false;
            if (code === 'ArrowDown' || code === 'KeyS') s.downKey = false;
        },

        blur() {
            s.upKey = false;
            s.downKey = false;
        }
    };
}

export default function SleighGame({ onScore }) {
    return (
        <GameCanvas
            pausable
            create={createSleigh}
            onScore={onScore}
            label="Livraison en traîneau"
            controls={[
                { code: 'ArrowUp', text: '▲', label: 'Monter' },
                { code: 'Space', text: 'Lâcher', label: 'Lâcher un cadeau' },
                { code: 'ArrowDown', text: '▼', label: 'Descendre' }
            ]}
        />
    );
}
