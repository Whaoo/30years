import GameCanvas from './GameCanvas';
import {
    DISPLAY, drawFlakes, drawOverlay, drawPenguin, makeFlakes, roundRect,
    skyGradient, text, updateFlakes
} from './draw';

// Empilage de glaçons : des pièces de 4 glaçons tombent, on complète des lignes.
const COLS = 10;
const ROWS = 20;
const CELL = 20;
const BX = 300;
const BY = 25;

const SHAPES = {
    I: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
    O: [[1, 1], [1, 1]],
    T: [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
    S: [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
    Z: [[1, 1, 0], [0, 1, 1], [0, 0, 0]],
    J: [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
    L: [[0, 0, 1], [1, 1, 1], [0, 0, 0]]
};
const COLORS = { I: '#8fe3ff', O: '#cfeaff', T: '#b4c4ff', S: '#9ff0dc', Z: '#ffc4dc', J: '#86b2ff', L: '#ffdca0' };
const LINE_POINTS = [0, 100, 300, 500, 800];

const rotateCW = (m) => m[0].map((_, i) => m.map((row) => row[i]).reverse());
const rotateCCW = (m) => m[0].map((_, i) => m.map((row) => row[row.length - 1 - i]));

// Chaque glaçon est dessiné une seule fois par couleur dans une petite image en cache,
// puis simplement recopié : bien plus léger que de recalculer dégradés et contours à chaque image.
const cubeCache = new Map();

function drawCube(ctx, x, y, size, color, alpha = 1) {
    const scale = Math.max(1, Math.round(ctx.getTransform().a * 4) / 4);
    const key = `${color}|${size}|${scale}`;
    let sprite = cubeCache.get(key);
    if (!sprite) {
        sprite = document.createElement('canvas');
        sprite.width = Math.ceil(size * scale);
        sprite.height = Math.ceil(size * scale);
        const sctx = sprite.getContext('2d');
        sctx.scale(scale, scale);
        paintCube(sctx, 0, 0, size, color);
        cubeCache.set(key, sprite);
    }
    ctx.globalAlpha = alpha;
    ctx.drawImage(sprite, x, y, size, size);
    ctx.globalAlpha = 1;
}

function paintCube(ctx, x, y, size, color) {
    roundRect(ctx, x + 1, y + 1, size - 2, size - 2, 4);
    ctx.fillStyle = color;
    ctx.fill();
    const g = ctx.createLinearGradient(x, y, x + size, y + size);
    g.addColorStop(0, 'rgba(255,255,255,0.65)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.08)');
    g.addColorStop(1, 'rgba(20,40,90,0.2)');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    roundRect(ctx, x + 4, y + 4, size * 0.32, 3, 1.5);
    ctx.fill();
    ctx.globalAlpha = 1;
}

function createIceStack(api) {
    const W = api.width;
    const H = api.height;
    const s = {
        phase: 'ready',
        grid: [],
        piece: null,
        next: null,
        bag: [],
        dropT: 0,
        lockT: 0,
        lockMoves: 0,
        score: 0,
        lines: 0,
        level: 1,
        clearing: null,
        cheerT: 0,
        overT: 0,
        record: false,
        flakes: makeFlakes(30, W, H)
    };

    const emptyGrid = () => Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    s.grid = emptyGrid();

    function draw7() {
        if (s.bag.length === 0) {
            s.bag = Object.keys(SHAPES);
            for (let i = s.bag.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [s.bag[i], s.bag[j]] = [s.bag[j], s.bag[i]];
            }
        }
        return s.bag.pop();
    }

    function collides(m, x, y) {
        for (let r = 0; r < m.length; r++) {
            for (let c = 0; c < m[r].length; c++) {
                if (!m[r][c]) continue;
                const gx = x + c;
                const gy = y + r;
                if (gx < 0 || gx >= COLS || gy >= ROWS) return true;
                if (gy >= 0 && s.grid[gy][gx]) return true;
            }
        }
        return false;
    }

    function spawn() {
        const type = s.next || draw7();
        s.next = draw7();
        const m = SHAPES[type];
        const piece = { type, m, x: Math.floor((COLS - m[0].length) / 2), y: type === 'I' ? -1 : 0 };
        s.piece = piece;
        s.dropT = 0;
        s.lockT = 0;
        s.lockMoves = 0;
        if (collides(piece.m, piece.x, piece.y)) finish();
    }

    function start() {
        Object.assign(s, {
            phase: 'play', grid: emptyGrid(), piece: null, next: null, bag: [], dropT: 0, lockT: 0,
            score: 0, lines: 0, level: 1, clearing: null, cheerT: 0, record: false
        });
        spawn();
    }

    function finish() {
        s.phase = 'over';
        s.overT = 0;
        s.record = api.reportScore(s.score);
    }

    function touchedGround() {
        return collides(s.piece.m, s.piece.x, s.piece.y + 1);
    }

    function afterMove() {
        if (touchedGround() && s.lockMoves < 15) {
            s.lockT = 0;
            s.lockMoves += 1;
        }
    }

    function move(dx) {
        const p = s.piece;
        if (!collides(p.m, p.x + dx, p.y)) {
            p.x += dx;
            afterMove();
        }
    }

    function rotate(dir) {
        const p = s.piece;
        if (p.type === 'O') return;
        const m = dir > 0 ? rotateCW(p.m) : rotateCCW(p.m);
        for (const k of [0, -1, 1, -2, 2]) {
            if (!collides(m, p.x + k, p.y)) {
                p.m = m;
                p.x += k;
                afterMove();
                return;
            }
        }
        if (!collides(m, p.x, p.y - 1)) {
            p.m = m;
            p.y -= 1;
        }
    }

    function lock() {
        const p = s.piece;
        let overflow = false;
        p.m.forEach((row, r) => row.forEach((v, c) => {
            if (!v) return;
            const gy = p.y + r;
            if (gy < 0) overflow = true;
            else s.grid[gy][p.x + c] = COLORS[p.type];
        }));
        s.piece = null;
        if (overflow) {
            finish();
            return;
        }
        const full = [];
        s.grid.forEach((row, i) => {
            if (row.every(Boolean)) full.push(i);
        });
        if (full.length) s.clearing = { rows: full, t: 0.25 };
        else spawn();
    }

    function softDrop() {
        const p = s.piece;
        if (!collides(p.m, p.x, p.y + 1)) {
            p.y += 1;
            s.score += 1;
            s.dropT = 0;
        }
    }

    function hardDrop() {
        const p = s.piece;
        while (!collides(p.m, p.x, p.y + 1)) {
            p.y += 1;
            s.score += 2;
        }
        lock();
    }

    function ghostY() {
        const p = s.piece;
        let y = p.y;
        while (!collides(p.m, p.x, y + 1)) y += 1;
        return y;
    }

    return {
        update(dt) {
            updateFlakes(s.flakes, dt, W, H, 4);
            s.cheerT -= dt;
            if (s.phase === 'over') s.overT += dt;
            if (s.phase !== 'play') return;

            if (s.clearing) {
                s.clearing.t -= dt;
                if (s.clearing.t <= 0) {
                    const n = s.clearing.rows.length;
                    s.grid = s.grid.filter((_, i) => !s.clearing.rows.includes(i));
                    while (s.grid.length < ROWS) s.grid.unshift(Array(COLS).fill(null));
                    s.score += LINE_POINTS[n] * s.level;
                    s.lines += n;
                    s.level = 1 + Math.floor(s.lines / 10);
                    s.cheerT = 1.4;
                    s.clearing = null;
                    spawn();
                }
                return;
            }
            if (!s.piece) return;

            const interval = Math.max(0.07, 0.8 - (s.level - 1) * 0.065);
            if (touchedGround()) {
                s.lockT += dt;
                if (s.lockT >= 0.45) lock();
            } else {
                s.lockT = 0;
                s.dropT += dt;
                if (s.dropT >= interval) {
                    s.dropT = 0;
                    s.piece.y += 1;
                }
            }
        },

        render(ctx) {
            skyGradient(ctx, W, H, [[0, '#0b1838'], [1, '#1d3f78']]);
            drawFlakes(ctx, s.flakes, 0.5);

            roundRect(ctx, BX - 10, BY - 10, COLS * CELL + 20, ROWS * CELL + 20, 18);
            ctx.fillStyle = 'rgba(10, 14, 34, 0.6)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.22)';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.strokeStyle = 'rgba(255,255,255,0.05)';
            for (let c = 1; c < COLS; c++) {
                ctx.beginPath();
                ctx.moveTo(BX + c * CELL, BY);
                ctx.lineTo(BX + c * CELL, BY + ROWS * CELL);
                ctx.stroke();
            }
            for (let r = 1; r < ROWS; r++) {
                ctx.beginPath();
                ctx.moveTo(BX, BY + r * CELL);
                ctx.lineTo(BX + COLS * CELL, BY + r * CELL);
                ctx.stroke();
            }

            const flash = s.clearing ? s.clearing.rows : [];
            s.grid.forEach((row, r) => row.forEach((color, c) => {
                if (!color) return;
                const white = flash.includes(r) && Math.floor(s.clearing.t * 20) % 2 === 0;
                drawCube(ctx, BX + c * CELL, BY + r * CELL, CELL, white ? '#ffffff' : color);
            }));

            if (s.piece && s.phase === 'play') {
                const p = s.piece;
                const gy = ghostY();
                p.m.forEach((row, r) => row.forEach((v, c) => {
                    if (!v || gy + r < 0) return;
                    roundRect(ctx, BX + (p.x + c) * CELL + 2, BY + (gy + r) * CELL + 2, CELL - 4, CELL - 4, 4);
                    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
                    ctx.lineWidth = 1.5;
                    ctx.stroke();
                }));
                p.m.forEach((row, r) => row.forEach((v, c) => {
                    if (!v || p.y + r < 0) return;
                    drawCube(ctx, BX + (p.x + c) * CELL, BY + (p.y + r) * CELL, CELL, COLORS[p.type]);
                }));
            }

            const stats = [['Score', s.score], ['Lignes', s.lines], ['Niveau', s.level]];
            stats.forEach(([label, value], i) => {
                const y = 70 + i * 90;
                roundRect(ctx, 110, y, 160, 74, 18);
                ctx.fillStyle = 'rgba(10, 14, 34, 0.6)';
                ctx.fill();
                text(ctx, label, 128, y + 26, { size: 14, weight: 600, color: 'rgba(255,255,255,0.8)' });
                text(ctx, String(value), 128, y + 60, { size: 28, weight: 800, font: DISPLAY, color: '#ffd36e' });
            });

            roundRect(ctx, 530, 40, 160, 120, 18);
            ctx.fillStyle = 'rgba(10, 14, 34, 0.6)';
            ctx.fill();
            text(ctx, 'Suivant', 548, 66, { size: 14, weight: 600, color: 'rgba(255,255,255,0.8)' });
            if (s.next) {
                const m = SHAPES[s.next];
                const size = 18;
                const w = m[0].length * size;
                const ox = 610 - w / 2;
                const oy = 80 + (m.length === 4 ? -6 : 4);
                m.forEach((row, r) => row.forEach((v, c) => {
                    if (v) drawCube(ctx, ox + c * size, oy + r * size, size, COLORS[s.next]);
                }));
            }

            const cheering = s.cheerT > 0;
            drawPenguin(ctx, 610, 420, 150, {
                hat: 'beanie', scarf: '#9fd8ff', hatColor: '#d63a3a',
                mood: s.phase === 'over' ? 'dizzy' : cheering ? 'happy' : 'normal',
                flip: cheering ? -2.4 + Math.sin(s.cheerT * 18) * 0.3 : -0.2,
                look: -2
            });

            if (s.phase === 'ready') {
                drawOverlay(ctx, W, H, 'Empilage de glaçons', [
                    '← → déplacer · ↑ tourner · ↓ accélérer · Espace lâcher',
                    { text: 'Clique ou appuie sur Entrée pour commencer', color: '#ffd36e', weight: 700 }
                ]);
            } else if (s.phase === 'paused') {
                drawOverlay(ctx, W, H, 'Pause', ['Appuie sur P pour reprendre']);
            } else if (s.phase === 'over') {
                drawOverlay(ctx, W, H, 'Ça déborde !', [
                    { text: `${s.score} points · ${s.lines} ligne${s.lines > 1 ? 's' : ''}`, size: 24, weight: 800 },
                    s.record ? { text: 'Nouveau record !', color: '#ffd36e', weight: 700 } : 'Joli tas de glaçons.',
                    { text: s.overT > 0.8 ? 'Clique ou Entrée pour rejouer' : ' ', color: 'rgba(255,255,255,0.75)' }
                ]);
            }
        },

        pointerDown() {
            if (s.phase === 'ready' || (s.phase === 'over' && s.overT > 0.8)) start();
            else if (s.phase === 'paused') s.phase = 'play';
        },

        keyDown(code, repeat) {
            if (s.phase !== 'play') {
                if (repeat) return;
                if (code === 'KeyP' && s.phase === 'paused') s.phase = 'play';
                else if ((code === 'Enter' || code === 'Space') && (s.phase === 'ready' || (s.phase === 'over' && s.overT > 0.8))) start();
                return;
            }
            if (code === 'KeyP' && !repeat) {
                s.phase = 'paused';
                return;
            }
            if (!s.piece || s.clearing) return;
            if (code === 'ArrowLeft') move(-1);
            else if (code === 'ArrowRight') move(1);
            else if (code === 'ArrowDown') softDrop();
            else if (repeat) return;
            else if (code === 'ArrowUp' || code === 'KeyX') rotate(1);
            else if (code === 'KeyZ') rotate(-1);
            else if (code === 'Space') hardDrop();
        }
    };
}

export default function IceStackGame({ onScore }) {
    return (
        <GameCanvas
            create={createIceStack}
            onScore={onScore}
            label="Empilage de glaçons"
            controls={[
                { code: 'ArrowLeft', text: '◀', label: 'Gauche' },
                { code: 'ArrowUp', text: '⟳', label: 'Tourner' },
                { code: 'ArrowRight', text: '▶', label: 'Droite' },
                { code: 'ArrowDown', text: '▼', label: 'Descendre' },
                { code: 'Space', text: 'Lâcher', label: 'Lâcher la pièce' }
            ]}
        />
    );
}
