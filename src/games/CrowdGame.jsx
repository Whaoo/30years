import GameCanvas from './GameCanvas';
import {
    DISPLAY, TAU, addPopup, circle, drawOverlay, drawPenguin, drawPopups, ellipse, hudPill, rand,
    roundRect, text, updatePopups
} from './draw';
import { HAT_COLORS, SCARVES, getSortedBirthdays } from '../utils/birthdayLogic';

// Où est mon collègue ? Une foule de pingouins habillés comme l'équipe : retrouver la bonne personne.
// 5 manches, de plus en plus de monde ; les dernières, la foule se met à bouger.
const ROUNDS = [
    { n: 14, time: 14, move: 0 },
    { n: 20, time: 14, move: 0 },
    { n: 28, time: 13, move: 0 },
    { n: 34, time: 13, move: 14 },
    { n: 42, time: 12, move: 22 }
];
const AREA = { x0: 250, x1: 776, y0: 118, y1: 432 };
const PH = 46; // hauteur d'un pingouin de la foule

// Couleurs regroupées par famille : deux tenues de la même famille se ressemblent trop pour départager
const SCARF_FAMILY = {
    '#ff6b6b': 'rouge', '#f87171': 'rouge', '#34d399': 'vert', '#4ade80': 'vert', '#2dd4bf': 'vert',
    '#a78bfa': 'violet', '#60a5fa': 'bleu', '#fbbf24': 'jaune', '#f472b6': 'rose', '#fb923c': 'orange'
};
const HAT_FAMILY = {
    '#3b82f6': 'bleu', '#0ea5e9': 'bleu', '#f59e0b': 'orange', '#dc2626': 'rouge', '#7c3aed': 'violet', '#10b981': 'vert'
};
const LOOKS = ['beanie', 'none', 'shades'];

const signature = (o) => (o.hat === 'beanie' ? `b|${HAT_FAMILY[o.hatColor]}|${SCARF_FAMILY[o.scarf]}` : `${o.hat}|${SCARF_FAMILY[o.scarf]}`);
const pick = (list) => list[Math.floor(Math.random() * list.length)];

function createCrowd(api) {
    const W = api.width;
    const H = api.height;
    const people = getSortedBirthdays(new Date()).filter((p) => p.name !== 'Noël');
    const s = {
        phase: 'ready',
        round: 0,
        time: 0,
        score: 0,
        found: 0,
        crowd: [],
        target: null,
        targetPeng: null,
        result: null,
        resultT: 0,
        misses: [],
        shake: 0,
        popups: [],
        used: new Set(),
        overT: 0,
        record: false,
        t: 0
    };

    function outfitLike(target) {
        const sig = signature(target);
        for (let k = 0; k < 40; k++) {
            const r = Math.random();
            let o;
            // Près d'une fois sur deux, un « presque pareil » : même chapeau ou même écharpe
            if (r < 0.25) o = { hat: target.hat, hatColor: target.hatColor, scarf: pick(SCARVES) };
            else if (r < 0.45) o = { hat: pick(LOOKS), hatColor: pick(HAT_COLORS), scarf: target.scarf };
            else o = { hat: pick(LOOKS), hatColor: pick(HAT_COLORS), scarf: pick(SCARVES) };
            if (signature(o) !== sig) return o;
        }
        return { hat: target.hat === 'none' ? 'shades' : 'none', hatColor: '#3b82f6', scarf: '#fbbf24' };
    }

    function startRound(i) {
        const cfg = ROUNDS[i];
        let pool = people.filter((p) => !s.used.has(p.id));
        if (!pool.length) pool = people;
        const target = pick(pool);
        s.used.add(target.id);
        // Grille légèrement désordonnée, une case par pingouin
        const cols = 11;
        const rows = 6;
        const cw = (AREA.x1 - AREA.x0) / cols;
        const ch = (AREA.y1 - AREA.y0) / rows;
        const cells = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                cells.push({
                    x: AREA.x0 + cw * (c + 0.5) + (r % 2 ? cw * 0.25 : -cw * 0.25) + rand(-5, 5),
                    y: AREA.y0 + ch * (r + 1) - 2 + rand(-4, 4)
                });
            }
        }
        cells.sort(() => Math.random() - 0.5);
        const spots = cells.slice(0, cfg.n);
        s.crowd = spots.map((p, k) => {
            const o = k === 0 ? { hat: target.hat, hatColor: target.hatColor, scarf: target.scarf } : outfitLike(target);
            return {
                ...o, x: Math.max(AREA.x0 + 10, Math.min(AREA.x1 - 10, p.x)), y: p.y, target: k === 0, facing: Math.random() < 0.5 ? -1 : 1,
                vx: cfg.move ? rand(-1, 1) * cfg.move : 0, ph: rand(0, TAU)
            };
        });
        s.crowd.sort((a, b) => a.y - b.y);
        s.target = target;
        s.targetPeng = s.crowd.find((c) => c.target);
        s.round = i;
        s.time = cfg.time;
        s.result = null;
        s.misses = [];
        s.phase = 'play';
    }

    function start() {
        Object.assign(s, { score: 0, found: 0, used: new Set(), popups: [], record: false });
        startRound(0);
    }

    function endRound(ok) {
        s.phase = 'result';
        s.result = ok ? 'found' : 'missed';
        s.resultT = 0;
        if (ok) {
            const pts = 100 + Math.ceil(s.time) * 10;
            s.score += pts;
            s.found += 1;
            addPopup(s.popups, s.targetPeng.x, s.targetPeng.y - PH - 12, `Trouvé ! +${pts}`, '#2f9e6e');
        }
    }

    function finish() {
        s.phase = 'over';
        s.overT = 0;
        s.record = api.reportScore(s.score);
    }

    function hit(x, y) {
        // Le pingouin le plus en avant sous le clic
        for (let i = s.crowd.length - 1; i >= 0; i--) {
            const c = s.crowd[i];
            if (Math.abs(x - c.x) < 17 && y < c.y + 2 && y > c.y - PH - 4) return c;
        }
        return null;
    }

    // En mode test uniquement (npm run dev, préversion dev) : accès à l'état depuis la console
    if (__TEST_MODE__) window.foule = { s, startRound };

    return {
        canPause() {
            return s.phase === 'play';
        },

        update(dt) {
            s.t += dt;
            updatePopups(s.popups, dt);
            s.shake = Math.max(0, s.shake - dt);
            for (let i = s.misses.length - 1; i >= 0; i--) {
                s.misses[i].t += dt;
                if (s.misses[i].t > 0.8) s.misses.splice(i, 1);
            }
            if (s.phase === 'over') s.overT += dt;
            if (s.phase === 'result') {
                s.resultT += dt;
                if (s.resultT > (s.result === 'found' ? 1.2 : 1.8)) {
                    if (s.round + 1 < ROUNDS.length) startRound(s.round + 1);
                    else finish();
                }
                return;
            }
            if (s.phase !== 'play') return;
            for (const c of s.crowd) {
                if (!c.vx) continue;
                c.x += c.vx * dt;
                if (c.x < AREA.x0 + 10 || c.x > AREA.x1 - 10) c.vx = -c.vx;
                c.facing = c.vx > 0 ? 1 : -1;
            }
            s.time -= dt;
            if (s.time <= 0) {
                s.time = 0;
                endRound(false);
            }
        },

        render(ctx) {
            const sx = s.shake > 0 ? Math.sin(s.t * 70) * s.shake * 14 : 0;
            ctx.fillStyle = '#e8f1fb';
            ctx.fillRect(0, 0, W, H);
            ellipse(ctx, 520, 270, 300, 150, '#dbe8f5');
            ellipse(ctx, 660, 120, 160, 50, '#f4f8fd');

            ctx.save();
            ctx.translate(sx, 0);
            for (const c of s.crowd) {
                const walking = c.vx && s.phase === 'play';
                const bob = walking ? Math.abs(Math.sin(s.t * 9 + c.ph)) * 2 : Math.sin(s.t * 2 + c.ph) * 0.6;
                ellipse(ctx, c.x, c.y + 1, 15, 4, 'rgba(29, 37, 66, 0.14)');
                drawPenguin(ctx, c.x, c.y - bob, PH, {
                    hat: c.hat, scarf: c.scarf, hatColor: c.hatColor, facing: c.facing,
                    rotate: walking ? Math.sin(s.t * 9 + c.ph) * 0.1 : 0,
                    mood: s.result === 'found' && c.target ? 'happy' : 'normal'
                });
            }
            if (s.phase === 'result' && s.targetPeng) {
                const p = s.targetPeng;
                const k = Math.min(1, s.resultT * 4);
                ctx.strokeStyle = s.result === 'found' ? '#2f9e6e' : '#e94b4b';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(p.x, p.y - PH / 2, 30 + (1 - k) * 30, 0, TAU);
                ctx.stroke();
                if (s.result === 'missed') {
                    text(ctx, 'C’était ici !', p.x, p.y - PH - 18, { size: 16, weight: 800, font: DISPLAY, color: '#e94b4b', align: 'center' });
                }
            }
            for (const m of s.misses) {
                ctx.globalAlpha = 1 - m.t / 0.8;
                ctx.strokeStyle = '#e94b4b';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(m.x - 9, m.y - 9);
                ctx.lineTo(m.x + 9, m.y + 9);
                ctx.moveTo(m.x + 9, m.y - 9);
                ctx.lineTo(m.x - 9, m.y + 9);
                ctx.stroke();
                text(ctx, '-2 s', m.x, m.y - 16, { size: 14, weight: 800, color: '#e94b4b', align: 'center' });
            }
            ctx.globalAlpha = 1;
            drawPopups(ctx, s.popups);
            ctx.restore();

            // Fiche de la personne à retrouver
            roundRect(ctx, 16, 16, 216, H - 32, 22);
            ctx.fillStyle = '#1d2542';
            ctx.fill();
            if (s.target) {
                text(ctx, 'Trouve', 124, 54, { size: 16, weight: 700, color: 'rgba(255,255,255,0.75)', align: 'center' });
                const name = s.target.name;
                text(ctx, name, 124, 90, { size: name.length > 9 ? 24 : 32, weight: 800, font: DISPLAY, align: 'center' });
                circle(ctx, 124, 220, 78, 'rgba(255,255,255,0.06)');
                drawPenguin(ctx, 124, 300, 150, {
                    hat: s.target.hat, scarf: s.target.scarf, hatColor: s.target.hatColor, mood: s.result === 'found' ? 'happy' : 'normal'
                });
                const tl = Math.ceil(s.time);
                roundRect(ctx, 54, 336, 140, 40, 20);
                ctx.fillStyle = s.time < 4 && s.phase === 'play' ? '#e94b4b' : 'rgba(255,255,255,0.12)';
                ctx.fill();
                text(ctx, s.phase === 'play' ? `${tl} s` : (s.result === 'found' ? 'Bravo !' : 'Temps écoulé'), 124, 363, {
                    size: 19, weight: 800, font: DISPLAY, align: 'center'
                });
                text(ctx, `Manche ${s.round + 1} / ${ROUNDS.length}`, 124, 404, { size: 14, weight: 700, color: 'rgba(255,255,255,0.75)', align: 'center' });
            }
            hudPill(ctx, W - 16, 16, 'Score', s.score, 'right');

            if (s.phase === 'ready') {
                drawOverlay(ctx, W, H, 'Où est mon collègue ?', [
                    'Une foule de pingouins habillés comme l’équipe.',
                    'Retrouve la bonne personne avant la fin du chrono.',
                    'Mauvais pingouin : 2 secondes de pénalité. 5 manches.',
                    { text: 'Clique ou appuie sur Espace pour commencer', color: '#ffd36e', weight: 700 }
                ], 560);
            } else if (s.phase === 'over' && s.overT > 0.4) {
                drawOverlay(ctx, W, H, 'Fin de la recherche !', [
                    { text: `${s.score} points`, size: 24, weight: 800 },
                    `${s.found} collègue${s.found > 1 ? 's' : ''} retrouvé${s.found > 1 ? 's' : ''} sur ${ROUNDS.length}`,
                    s.record ? { text: 'Nouveau record !', color: '#ffd36e', weight: 700 } : 'L’œil du lynx… presque.',
                    { text: s.overT > 1.2 ? 'Clique ou Espace pour rejouer' : ' ', color: 'rgba(255,255,255,0.75)' }
                ], 560);
            }
        },

        pointerDown(x, y) {
            if (s.phase === 'ready' || (s.phase === 'over' && s.overT > 1.2)) {
                start();
                return;
            }
            if (s.phase !== 'play') return;
            const c = hit(x, y);
            if (!c) return;
            if (c.target) endRound(true);
            else {
                s.time = Math.max(0, s.time - 2);
                s.shake = 0.25;
                s.misses.push({ x, y, t: 0 });
            }
        },

        keyDown(code, repeat) {
            if (repeat) return;
            if ((code === 'Space' || code === 'Enter') && (s.phase === 'ready' || (s.phase === 'over' && s.overT > 1.2))) start();
        }
    };
}

export default function CrowdGame({ onScore }) {
    return <GameCanvas pausable create={createCrowd} onScore={onScore} label="Où est mon collègue ?" />;
}
