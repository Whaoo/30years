import GameCanvas from './GameCanvas';
import {
    DISPLAY, circle, drawFlakes, drawOverlay, drawPenguin, ellipse, makeFlakes,
    roundRect, skyGradient, text, updateFlakes
} from './draw';

// Banquise glissante : le pingouin glisse jusqu'au prochain obstacle. Atteindre le poisson.
// '#' rocher, '.' glace, 'S' neige (on s'y arrête), 'O' trou d'eau (retour au départ), 'P' départ, 'F' poisson
// Niveaux vérifiés : tous résolubles, de 3 à 10 coups minimum.
const LEVELS = [
    ['........#', '.#P...#..', '......##.', '.........', 'F........', '##...#...', '...#.....'],
    ['#...P..#F', '.........', '......###', '.#.......', '.........', '.....#..#', '..#..#...'],
    ['.#.......', '..#.....#', '.P.......', '.#.......', '....#...S', '#.....#..', '..#.F#.#.'],
    ['......#.F', '.....#...', '..S......', '##....#.#', '..O...#..', '..P.#....', '##.......'],
    ['.....#..P', '#..#.O...', '#F.....O.', '..#..#.#.', '..#......', '.#.#.....', '....S...#'],
    ['....S....', '.#.....S#', '#O#..##O.', '.#...P.#.', '....#...F', '........#', '#........'],
    ['....#...F', '......S..', '...#...O#', '##.S....#', '.#.#..O..', '.#..#.#..', '..#...P..'],
    ['..O.#....', '......##.', '#....#...', '...O..S..', '#.O....##', '#.F.....#', '..#.P#.S.']
];
const COLS = 9;
const ROWS = 7;
const CELL = 52;
const BX = 300;
const BY = 44;
const DIRS = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1], KeyD: [1, 0], KeyA: [-1, 0], KeyS: [0, 1], KeyW: [0, -1] };

function find(level, ch) {
    for (let y = 0; y < ROWS; y++) {
        const x = level[y].indexOf(ch);
        if (x >= 0) return { x, y };
    }
    return null;
}

// Glissade : renvoie la case d'arrivée et la case du trou si on tombe à l'eau
function slide(level, pos, d) {
    let { x, y } = pos;
    while (true) {
        const nx = x + d[0];
        const ny = y + d[1];
        if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS || level[ny][nx] === '#') return { end: { x, y } };
        x = nx;
        y = ny;
        const c = level[y][x];
        if (c === 'O') return { end: { x, y }, hole: true };
        if (c === 'S' || c === 'F') return { end: { x, y } };
    }
}

function minMoves(level) {
    const start = find(level, 'P');
    const goal = find(level, 'F');
    const key = (p) => `${p.x},${p.y}`;
    const dist = new Map([[key(start), 0]]);
    const queue = [start];
    while (queue.length) {
        const p = queue.shift();
        if (p.x === goal.x && p.y === goal.y) return dist.get(key(p));
        for (const d of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const r = slide(level, p, d);
            const n = r.hole ? start : r.end;
            if (!dist.has(key(n))) {
                dist.set(key(n), dist.get(key(p)) + 1);
                queue.push(n);
            }
        }
    }
    return null;
}

const MINIMUMS = LEVELS.map(minMoves);
const MIN_TOTAL = MINIMUMS.reduce((a, b) => a + b, 0);

function createSlidePuzzle(api) {
    const W = api.width;
    const H = api.height;
    const s = {
        phase: 'ready',
        level: 0,
        pos: find(LEVELS[0], 'P'),
        anim: null,
        moves: 0,
        total: 0,
        wonT: 0,
        overT: 0,
        record: false,
        splash: 0,
        facing: 1,
        t: 0,
        flakes: makeFlakes(25, W, H)
    };

    const level = () => LEVELS[s.level];

    function loadLevel(i) {
        s.level = i;
        s.pos = find(LEVELS[i], 'P');
        s.anim = null;
        s.moves = 0;
        s.wonT = 0;
    }

    function start() {
        Object.assign(s, { phase: 'play', total: 0, record: false });
        loadLevel(0);
    }

    function move(d) {
        if (s.phase !== 'play' || s.anim) return;
        const r = slide(level(), s.pos, d);
        if (r.end.x === s.pos.x && r.end.y === s.pos.y) return;
        if (d[0]) s.facing = d[0];
        const cells = Math.abs(r.end.x - s.pos.x) + Math.abs(r.end.y - s.pos.y);
        s.anim = { from: { ...s.pos }, to: r.end, t: 0, dur: Math.max(0.12, cells * 0.07), hole: !!r.hole, d };
        s.moves += 1;
        s.total += 1;
    }

    function finishAnim() {
        const a = s.anim;
        s.anim = null;
        if (a.hole) {
            s.pos = find(level(), 'P');
            s.splash = 0.6;
            return;
        }
        s.pos = a.to;
        if (level()[s.pos.y][s.pos.x] === 'F') {
            s.phase = 'won';
            s.wonT = 0;
        }
    }

    function restartLevel() {
        if (s.phase !== 'play' || s.anim) return;
        s.pos = find(level(), 'P');
    }

    function penguinPixel() {
        let px = s.pos.x;
        let py = s.pos.y;
        if (s.anim) {
            const k = Math.min(1, s.anim.t / s.anim.dur);
            const e = 1 - (1 - k) * (1 - k);
            px = s.anim.from.x + (s.anim.to.x - s.anim.from.x) * e;
            py = s.anim.from.y + (s.anim.to.y - s.anim.from.y) * e;
        }
        return { x: BX + px * CELL + CELL / 2, y: BY + py * CELL + CELL / 2 };
    }

    function drawFish(ctx, x, y) {
        const wob = Math.sin(s.t * 4) * 2;
        ctx.save();
        ctx.translate(x, y + wob);
        ctx.beginPath();
        ctx.moveTo(-10, 0);
        ctx.lineTo(-20, -8);
        ctx.lineTo(-20, 8);
        ctx.closePath();
        ctx.fillStyle = '#ff9a3c';
        ctx.fill();
        ellipse(ctx, 0, 0, 14, 8, '#ffb347');
        circle(ctx, 6, -2, 2.4, '#ffffff');
        circle(ctx, 6.6, -2, 1.3, '#14172b');
        ctx.restore();
    }

    return {
        update(dt) {
            s.t += dt;
            updateFlakes(s.flakes, dt, W, H, 4);
            s.splash = Math.max(0, s.splash - dt);
            if (s.phase === 'over') s.overT += dt;
            if (s.anim) {
                s.anim.t += dt;
                if (s.anim.t >= s.anim.dur) finishAnim();
            }
            if (s.phase === 'won') {
                s.wonT += dt;
                if (s.wonT > 1.3) {
                    if (s.level + 1 < LEVELS.length) {
                        s.phase = 'play';
                        loadLevel(s.level + 1);
                    } else {
                        s.phase = 'over';
                        s.overT = 0;
                        s.record = api.reportScore(s.total);
                    }
                }
            }
        },

        render(ctx) {
            skyGradient(ctx, W, H, [[0, '#0b1838'], [1, '#2c5590']]);
            drawFlakes(ctx, s.flakes, 0.45);

            const lv = level();
            roundRect(ctx, BX - 10, BY - 10, COLS * CELL + 20, ROWS * CELL + 20, 18);
            ctx.fillStyle = 'rgba(10, 14, 34, 0.55)';
            ctx.fill();
            for (let y = 0; y < ROWS; y++) {
                for (let x = 0; x < COLS; x++) {
                    const cx = BX + x * CELL;
                    const cy = BY + y * CELL;
                    roundRect(ctx, cx + 1, cy + 1, CELL - 2, CELL - 2, 8);
                    ctx.fillStyle = (x + y) % 2 ? '#cfe8fa' : '#dcefff';
                    ctx.fill();
                    const c = lv[y][x];
                    const mx = cx + CELL / 2;
                    const my = cy + CELL / 2;
                    if (c === '#') {
                        ellipse(ctx, mx, my + 4, 20, 16, '#7d8ea6');
                        ellipse(ctx, mx - 4, my, 16, 13, '#9aabc2');
                        ellipse(ctx, mx - 8, my - 5, 5, 3, 'rgba(255,255,255,0.5)');
                    } else if (c === 'S') {
                        ellipse(ctx, mx, my + 6, 22, 12, '#ffffff');
                        ellipse(ctx, mx - 6, my + 1, 12, 8, '#ffffff');
                        ellipse(ctx, mx + 7, my + 2, 10, 7, '#f4f9ff');
                    } else if (c === 'O') {
                        ellipse(ctx, mx, my, 21, 15, '#1f5f99');
                        ellipse(ctx, mx, my - 2, 15, 9, '#2f7fc0');
                        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
                        ctx.lineWidth = 1.5;
                        ctx.beginPath();
                        ctx.ellipse(mx, my, 21, 15, 0, 0, Math.PI * 2);
                        ctx.stroke();
                    } else if (c === 'F') {
                        drawFish(ctx, mx, my);
                    }
                }
            }

            const p = penguinPixel();
            const sliding = !!s.anim;
            drawPenguin(ctx, p.x, p.y + 22, 52, {
                hat: 'beanie', scarf: '#fbbf24', hatColor: '#dc2626',
                mood: s.phase === 'won' || s.phase === 'over' ? 'happy' : s.splash > 0 ? 'surprised' : 'normal',
                rotate: sliding && s.anim.d[0] ? s.anim.d[0] * 0.25 : 0,
                flip: sliding ? -1.6 : -0.2,
                facing: s.facing
            });
            if (s.splash > 0) {
                ctx.globalAlpha = s.splash / 0.6;
                text(ctx, 'Plouf !', p.x, p.y - 34, { size: 18, weight: 800, font: DISPLAY, align: 'center', color: '#9fd8ff', shadow: true });
                ctx.globalAlpha = 1;
            }

            const panel = [
                ['Niveau', `${s.level + 1} / ${LEVELS.length}`],
                ['Coups', String(s.moves)],
                ['Minimum', String(MINIMUMS[s.level])],
                ['Total', String(s.total)]
            ];
            panel.forEach(([label, value], i) => {
                const y = 44 + i * 92;
                roundRect(ctx, 60, y, 200, 76, 18);
                ctx.fillStyle = 'rgba(10, 14, 34, 0.6)';
                ctx.fill();
                text(ctx, label, 80, y + 27, { size: 14, weight: 600, color: 'rgba(255,255,255,0.8)' });
                text(ctx, value, 80, y + 62, { size: 28, weight: 800, font: DISPLAY, color: '#ffd36e' });
            });

            if (s.phase === 'won') {
                roundRect(ctx, BX + 74, BY + 140, 320, 84, 20);
                ctx.fillStyle = 'rgba(10, 14, 34, 0.9)';
                ctx.fill();
                text(ctx, 'Niveau réussi !', BX + 234, BY + 176, { size: 26, weight: 800, font: DISPLAY, align: 'center' });
                const perfect = s.moves <= MINIMUMS[s.level];
                text(ctx, perfect ? `${s.moves} coups : parfait !` : `${s.moves} coups (minimum ${MINIMUMS[s.level]})`, BX + 234, BY + 206, {
                    size: 16, weight: 600, align: 'center', color: perfect ? '#ffd36e' : 'rgba(255,255,255,0.85)'
                });
            }

            if (s.phase === 'ready') {
                drawOverlay(ctx, W, H, 'Banquise glissante', [
                    'Le pingouin glisse jusqu’au prochain obstacle.',
                    'La neige l’arrête, l’eau le renvoie au départ.',
                    { text: 'Flèches ou clic pour jouer · R pour recommencer', color: '#ffd36e', weight: 700 }
                ]);
            } else if (s.phase === 'over') {
                drawOverlay(ctx, W, H, 'Banquise traversée !', [
                    { text: `${s.total} coups au total (minimum ${MIN_TOTAL})`, size: 22, weight: 800 },
                    s.record ? { text: 'Nouveau record !', color: '#ffd36e', weight: 700 } : 'Bien glissé.',
                    { text: s.overT > 0.8 ? 'Clique ou Entrée pour rejouer' : ' ', color: 'rgba(255,255,255,0.75)' }
                ]);
            }
        },

        pointerDown(x, y) {
            if (s.phase === 'ready' || (s.phase === 'over' && s.overT > 0.8)) {
                start();
                return;
            }
            const p = penguinPixel();
            const dx = x - p.x;
            const dy = y - p.y;
            if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
            if (Math.abs(dx) > Math.abs(dy)) move([Math.sign(dx), 0]);
            else move([0, Math.sign(dy)]);
        },

        keyDown(code, repeat) {
            if (repeat) return;
            if (s.phase === 'ready' || (s.phase === 'over' && s.overT > 0.8)) {
                if (code === 'Enter' || code === 'Space') start();
                return;
            }
            if (code === 'KeyR') restartLevel();
            else if (DIRS[code]) move(DIRS[code]);
        }
    };
}

export default function SlidePuzzleGame({ onScore }) {
    return (
        <GameCanvas
            create={createSlidePuzzle}
            onScore={onScore}
            label="Banquise glissante"
            controls={[
                { code: 'ArrowLeft', text: '◀', label: 'Glisser à gauche' },
                { code: 'ArrowUp', text: '▲', label: 'Glisser en haut' },
                { code: 'ArrowDown', text: '▼', label: 'Glisser en bas' },
                { code: 'ArrowRight', text: '▶', label: 'Glisser à droite' },
                { code: 'KeyR', text: 'R', label: 'Recommencer le niveau' }
            ]}
        />
    );
}
