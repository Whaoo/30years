// Outils de dessin canvas communs aux mini-jeux.
// Le pingouin reprend les mêmes formes que components/Penguin.jsx.

export const TAU = Math.PI * 2;
export const DISPLAY = '"Bricolage Grotesque", "DM Sans", system-ui, sans-serif';
export const BODY = '"DM Sans", system-ui, sans-serif';

const SHAPES = {
    flipL: 'M20 52C8 60 8 78 17 86C23 80 25 66 25 55Z',
    flipR: 'M80 52C92 60 92 78 83 86C77 80 75 66 75 55Z',
    body: 'M50 8C28 8 18 28 18 54C18 82 28 100 50 100C72 100 82 82 82 54C82 28 72 8 50 8Z',
    beak: 'M42 36Q50 31 58 36Q56 46 50 47Q44 46 42 36Z',
    scarf: 'M26 50Q50 62 74 50L75 59Q50 71 25 59Z',
    tail: 'M61 60L70 58L73 78L63 76Z',
    beanie: 'M29 18C29 -2 71 -2 71 18Z',
    party: 'M36 17L50 -12L64 17Z',
    partyBand: 'M41 9L59 9L62 14L38 14Z',
    happyL: 'M34 30Q40 22 46 30',
    happyR: 'M54 30Q60 22 66 30',
    browL: 'M33 16Q40 11 47 15',
    browR: 'M53 15Q60 11 67 16',
    dizzyL: 'M35 23L45 33M45 23L35 33',
    dizzyR: 'M55 23L65 33M65 23L55 33'
};

const cache = {};
function shape(name) {
    if (!cache[name]) cache[name] = new Path2D(SHAPES[name]);
    return cache[name];
}

export function rand(min, max) {
    return min + Math.random() * (max - min);
}

export function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
}

export function circle(ctx, x, y, r, color) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fillStyle = color;
    ctx.fill();
}

export function ellipse(ctx, x, y, rx, ry, color, rotation = 0) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, rotation, 0, TAU);
    ctx.fillStyle = color;
    ctx.fill();
}

export function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
}

function strokeShape(ctx, name, color, width) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.stroke(shape(name));
}

// Pingouin ancré au milieu de ses pieds (x, y), hauteur h.
// o: hat ('none'|'beanie'|'shades'|'party'), scarf, hatColor,
//    mood ('normal'|'happy'|'surprised'|'dizzy'), flip (rotation de la nageoire droite, négatif = levée),
//    rotate (rotation du corps autour des pieds), facing (1 droite, -1 gauche), look (décalage des pupilles)
export function drawPenguin(ctx, x, y, h, o = {}) {
    const {
        hat = 'beanie',
        scarf = '#ff6b6b',
        hatColor = '#3b82f6',
        mood = 'normal',
        flip = 0,
        rotate = 0,
        facing = 1,
        look = 0,
        alpha = 1
    } = o;
    const s = h / 124;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    if (rotate) ctx.rotate(rotate);
    ctx.scale(s * facing, s);
    ctx.translate(-50, -110);

    ctx.fillStyle = '#161c36';
    ctx.fill(shape('flipL'));
    ctx.save();
    ctx.translate(77, 55);
    ctx.rotate(flip);
    ctx.translate(-77, -55);
    ctx.fill(shape('flipR'));
    ctx.restore();

    ctx.fillStyle = '#1d2542';
    ctx.fill(shape('body'));
    ellipse(ctx, 50, 72, 23, 27, '#f4f7fb');
    ctx.globalAlpha = alpha * 0.55;
    circle(ctx, 28, 38, 4.5, '#ff8fa8');
    circle(ctx, 72, 38, 4.5, '#ff8fa8');
    ctx.globalAlpha = alpha;
    ellipse(ctx, 37, 101, 10, 4.5, '#ff9f43');
    ellipse(ctx, 63, 101, 10, 4.5, '#ff9f43');

    if (hat === 'shades') {
        ctx.fillStyle = '#101322';
        roundRect(ctx, 30, 22, 19, 12, 5);
        ctx.fill();
        roundRect(ctx, 51, 22, 19, 12, 5);
        ctx.fill();
        ctx.fillRect(47, 26, 6, 2.5);
    } else if (mood === 'happy') {
        strokeShape(ctx, 'happyL', '#fff', 3.2);
        strokeShape(ctx, 'happyR', '#fff', 3.2);
    } else if (mood === 'dizzy') {
        strokeShape(ctx, 'dizzyL', '#fff', 3);
        strokeShape(ctx, 'dizzyR', '#fff', 3);
    } else if (mood === 'surprised') {
        strokeShape(ctx, 'browL', '#fff', 2.2);
        strokeShape(ctx, 'browR', '#fff', 2.2);
        circle(ctx, 40, 28, 7.5, '#fff');
        circle(ctx, 60, 28, 7.5, '#fff');
        circle(ctx, 40, 28, 2.4, '#111');
        circle(ctx, 60, 28, 2.4, '#111');
    } else {
        circle(ctx, 40, 28, 6.5, '#fff');
        circle(ctx, 60, 28, 6.5, '#fff');
        circle(ctx, 41.5 + look, 29, 3, '#111');
        circle(ctx, 58.5 + look, 29, 3, '#111');
    }

    ctx.fillStyle = '#ff9f43';
    ctx.fill(shape('beak'));
    ctx.fillStyle = scarf;
    ctx.fill(shape('scarf'));
    ctx.fill(shape('tail'));

    if (hat === 'beanie') {
        ctx.fillStyle = hatColor;
        ctx.fill(shape('beanie'));
        ctx.fillStyle = 'rgba(255,255,255,0.88)';
        roundRect(ctx, 27, 15, 46, 8, 4);
        ctx.fill();
        circle(ctx, 50, -1, 5.5, '#fff');
    } else if (hat === 'party') {
        ctx.fillStyle = '#ff5fa2';
        ctx.fill(shape('party'));
        ctx.fillStyle = '#ffd84a';
        ctx.fill(shape('partyBand'));
        circle(ctx, 50, -13, 3.5, '#ffd84a');
    }
    ctx.restore();
}

export function text(ctx, str, x, y, opts = {}) {
    const {
        size = 18,
        weight = 700,
        color = '#fff',
        align = 'left',
        baseline = 'alphabetic',
        font = BODY,
        shadow = false
    } = opts;
    ctx.font = `${weight} ${size}px ${font}`;
    ctx.textAlign = align;
    ctx.textBaseline = baseline;
    if (shadow) {
        ctx.shadowColor = 'rgba(0,0,0,0.45)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetY = 2;
    }
    ctx.fillStyle = color;
    ctx.fillText(str, x, y);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
}

// Étiquette « Score 120 » en haut de l'écran. align: 'left' (x = bord gauche) ou 'right' (x = bord droit)
export function hudPill(ctx, x, y, label, value, align = 'left') {
    ctx.font = `600 13px ${BODY}`;
    const lw = ctx.measureText(label).width;
    ctx.font = `800 20px ${DISPLAY}`;
    const vw = ctx.measureText(String(value)).width;
    const w = lw + vw + 36;
    const left = align === 'right' ? x - w : x;
    roundRect(ctx, left, y, w, 36, 18);
    ctx.fillStyle = 'rgba(10, 14, 34, 0.62)';
    ctx.fill();
    text(ctx, label, left + 14, y + 23, { size: 13, weight: 600, color: 'rgba(255,255,255,0.8)' });
    text(ctx, String(value), left + 22 + lw, y + 25, { size: 20, weight: 800, font: DISPLAY });
}

// Panneau central (écran d'accueil, fin de partie, pause)
export function drawOverlay(ctx, W, H, title, lines = []) {
    ctx.fillStyle = 'rgba(7, 13, 36, 0.5)';
    ctx.fillRect(0, 0, W, H);
    const pw = 500;
    const ph = 96 + lines.length * 30;
    const px = (W - pw) / 2;
    const py = (H - ph) / 2;
    roundRect(ctx, px, py, pw, ph, 26);
    ctx.fillStyle = 'rgba(10, 14, 34, 0.88)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();
    text(ctx, title, W / 2, py + 54, { size: 34, weight: 800, font: DISPLAY, align: 'center' });
    lines.forEach((line, i) => {
        const l = typeof line === 'string' ? { text: line } : line;
        text(ctx, l.text, W / 2, py + 92 + i * 30, {
            size: l.size || 17,
            weight: l.weight || 500,
            color: l.color || 'rgba(255,255,255,0.88)',
            align: 'center'
        });
    });
}

export function skyGradient(ctx, W, H, stops, top = 0, bottom = H) {
    const g = ctx.createLinearGradient(0, top, 0, bottom);
    stops.forEach(([o, c]) => g.addColorStop(o, c));
    ctx.fillStyle = g;
    ctx.fillRect(0, top, W, bottom - top);
}

export function hills(ctx, W, H, baseY, amp, freq, phase, color) {
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W + 10; x += 10) {
        const y = baseY - amp * (0.6 * Math.sin(x * freq + phase) + 0.4 * Math.sin(x * freq * 2.3 + phase * 1.7));
        ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
}

export function makeFlakes(n, W, H) {
    return Array.from({ length: n }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        r: 1 + Math.random() * 2.2,
        v: 15 + Math.random() * 30,
        ph: Math.random() * TAU
    }));
}

export function updateFlakes(flakes, dt, W, H, wind = 0) {
    for (const f of flakes) {
        f.y += f.v * dt;
        f.ph += dt;
        f.x += (Math.sin(f.ph) * 10 + wind) * dt;
        if (f.y > H + 5) {
            f.y = -5;
            f.x = Math.random() * W;
        }
        if (f.x < -5) f.x = W + 5;
        if (f.x > W + 5) f.x = -5;
    }
}

export function drawFlakes(ctx, flakes, alpha = 0.85) {
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    for (const f of flakes) {
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, TAU);
        ctx.fill();
    }
}

export function addPopup(list, x, y, str, color = '#fff') {
    list.push({ x, y, str, color, t: 0 });
}

export function updatePopups(list, dt) {
    for (let i = list.length - 1; i >= 0; i--) {
        list[i].t += dt;
        list[i].y -= 40 * dt;
        if (list[i].t > 1) list.splice(i, 1);
    }
}

export function drawPopups(ctx, list) {
    for (const p of list) {
        ctx.globalAlpha = Math.max(0, 1 - p.t);
        text(ctx, p.str, p.x, p.y, { size: 22, weight: 800, font: DISPLAY, color: p.color, align: 'center', shadow: true });
    }
    ctx.globalAlpha = 1;
}
