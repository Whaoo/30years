// « La Grande Quête de Flocon » : court métrage d'introduction (1er décembre).
// Tout est dessiné en code dans un canvas 1280 x 720, et chaque image ne dépend que du temps t :
// on peut lire, mettre en pause, avancer ou exporter image par image sans jamais rien désynchroniser.
const W = 1280, H = 720, TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const ease = {
    io: (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
    out: (k) => 1 - Math.pow(1 - k, 3),
    in: (k) => k * k * k,
    sine: (k) => -(Math.cos(Math.PI * k) - 1) / 2,
    back: (k) => { const c = 1.70158, c3 = c + 1; return 1 + c3 * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); },
    elastic: (k) => (k === 0 || k === 1 ? k : Math.pow(2, -10 * k) * Math.sin((k * 10 - 0.75) * (TAU / 3)) + 1)
};
function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
const noise = (t, s = 0) => Math.sin(t * 1.7 + s) * 0.5 + Math.sin(t * 3.1 + s * 2.3) * 0.3 + Math.sin(t * 7.3 + s * 5.1) * 0.2;

const P = {};
const path = (k, d) => (P[k] ||= new Path2D(d));
function fillP(ctx, k, d, col) { ctx.fillStyle = col; ctx.fill(path(k, d)); }

function circle(ctx, x, y, r, col) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = col; ctx.fill(); }
function ell(ctx, x, y, rx, ry, col, rot = 0) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, TAU); ctx.fillStyle = col; ctx.fill(); }
function rrect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
function glow(ctx, x, y, r, col, a = 1) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, col.replace('A', a)); g.addColorStop(1, col.replace('A', 0));
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
}
function vgrad(ctx, y0, y1, stops) {
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    stops.forEach(([o, c]) => g.addColorStop(o, c));
    return g;
}
function mixc(a, b, k) {
    const pa = a.match(/\w\w/g).map((h) => parseInt(h, 16)), pb = b.match(/\w\w/g).map((h) => parseInt(h, 16));
    return '#' + pa.map((v, i) => Math.round(lerp(v, pb[i], k)).toString(16).padStart(2, '0')).join('');
}

// ---------------------------------------------------------------- pingouin (mêmes formes que le site)
// ancré au milieu des pieds (x, y), s = échelle (1 = 104 px de haut)
// o : hat, scarf, mood ('normal'|'happy'|'surprised'|'closed'|'determined'), blink 0..1, look (-1..1),
//     flipL, flipR (rotation des nageoires), squash (>1 écrasé), tilt, facing (1|-1), scarfOff, shawl, glasses, bun, cap
function penguin(ctx, x, y, s, o = {}) {
    const { hat = '#3b82f6', scarf = '#e94b4b', mood = 'normal', blink = 0, look = 0, lookY = 0, flipL = 0, flipR = 0, squash = 1, tilt = 0,
        facing = 1, scarfOff = false, shawl = null, glasses = false, bun = false, noHat = false, mug = false, letter = false, wave = 0, cheeks = 0.55 } = o;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tilt);
    ctx.scale(s * facing / Math.sqrt(squash), s * squash);
    ctx.translate(-60, -104);
    // nageoire gauche
    ctx.save(); ctx.translate(33, 55); ctx.rotate(-flipL); ctx.translate(-33, -55);
    fillP(ctx, 'flipL', 'M30 52C18 60 18 78 27 86C33 80 35 66 35 55Z', '#161c36'); ctx.restore();
    fillP(ctx, 'body', 'M60 8C38 8 28 28 28 54C28 82 38 100 60 100C82 100 92 82 92 54C92 28 82 8 60 8Z', '#1d2542');
    ell(ctx, 60, 72, 23, 27, '#f4f7fb');
    ctx.globalAlpha = cheeks; circle(ctx, 38, 39, 4.5, '#ff8fa8'); circle(ctx, 82, 39, 4.5, '#ff8fa8'); ctx.globalAlpha = 1;
    // pieds
    ell(ctx, 47, 101, 10, 4.5, '#ff9f43'); ell(ctx, 73, 101, 10, 4.5, '#ff9f43');
    // yeux
    const lx = look * 2.2, ly = lookY * 2;
    if (mood === 'happy' || mood === 'closed') {
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 3.4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(44, 31); ctx.quadraticCurveTo(50, mood === 'happy' ? 23 : 33, 56, 31);
        ctx.moveTo(64, 31); ctx.quadraticCurveTo(70, mood === 'happy' ? 23 : 33, 76, 31); ctx.stroke();
    } else {
        const big = mood === 'surprised' ? 7.5 : 5.5, pr = mood === 'surprised' ? 2.4 : 2.6;
        const sy = 1 - clamp(blink) * 0.92;
        ctx.save(); ctx.translate(0, 30); ctx.scale(1, sy); ctx.translate(0, -30);
        circle(ctx, 50, 30, big, '#fff'); circle(ctx, 70, 30, big, '#fff');
        circle(ctx, 51.5 + lx, 31 + ly, pr, '#111'); circle(ctx, 69.5 + lx, 31 + ly, pr, '#111');
        circle(ctx, 52.6 + lx, 29.8 + ly, 0.9, '#fff'); circle(ctx, 70.6 + lx, 29.8 + ly, 0.9, '#fff');
        ctx.restore();
        if (mood === 'determined') {
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(43, 21); ctx.lineTo(55, 24); ctx.moveTo(77, 21); ctx.lineTo(65, 24); ctx.stroke();
        }
    }
    if (glasses) {
        ctx.strokeStyle = '#ffd36e'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(50, 30, 8.5, 0, TAU); ctx.moveTo(78.5, 30); ctx.arc(70, 30, 8.5, 0, TAU); ctx.moveTo(58.5, 30); ctx.lineTo(61.5, 30); ctx.stroke();
    }
    // bec
    if (mood === 'surprised') {
        fillP(ctx, 'beakTop', 'M51 36Q60 30 69 36L66 40Q60 37 54 40Z', '#ff9f43');
        fillP(ctx, 'beakBot', 'M54 43Q60 46 66 43Q64 51 60 51Q56 51 54 43Z', '#ff9f43');
    } else fillP(ctx, 'beak', 'M52 37Q60 32 68 37Q66 46 60 47Q54 46 52 37Z', '#ff9f43');
    // écharpe
    if (!scarfOff) {
        ctx.fillStyle = scarf; ctx.fill(path('scarf', 'M36 50Q60 62 84 50L85 59Q60 71 35 59Z'));
        ctx.save(); ctx.translate(80, 58); ctx.rotate(Math.sin(wave) * 0.25 + 0.2);
        ctx.beginPath(); ctx.moveTo(-4, 0); ctx.quadraticCurveTo(6 + Math.sin(wave * 1.3) * 3, 10, 2, 22); ctx.lineTo(10, 21); ctx.quadraticCurveTo(12, 8, 4, -2); ctx.fill(); ctx.restore();
    }
    if (shawl) {
        ctx.fillStyle = shawl; ctx.beginPath(); ctx.moveTo(30, 50); ctx.quadraticCurveTo(60, 74, 90, 50); ctx.lineTo(94, 66); ctx.quadraticCurveTo(60, 92, 26, 66); ctx.fill();
        ctx.strokeStyle = '#ffd36e'; ctx.lineWidth = 2.5; ctx.beginPath();
        [[40, 60], [52, 66], [68, 66], [80, 60]].forEach(([a, b]) => { ctx.moveTo(a, b); ctx.lineTo(a + (a < 60 ? 4 : -4), b + 8); }); ctx.stroke();
    }
    // bonnet
    if (bun) { circle(ctx, 60, 6, 10, '#e9eef7'); ctx.strokeStyle = '#c9d4e6'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(60, 6, 10, 0, TAU); ctx.stroke(); }
    else if (!noHat) {
        fillP(ctx, 'hat', 'M39 18C39 -2 81 -2 81 18Z', hat);
        ctx.fillStyle = 'rgba(255,255,255,0.9)'; rrect(ctx, 37, 15, 46, 8, 4); ctx.fill();
        circle(ctx, 60, -1, 5.5, '#fff');
    }
    // nageoire droite (devant)
    ctx.save(); ctx.translate(87, 55); ctx.rotate(flipR); ctx.translate(-87, -55);
    fillP(ctx, 'flipR', 'M90 52C102 60 102 78 93 86C87 80 85 66 85 55Z', '#161c36');
    if (mug) { ctx.fillStyle = '#d7263d'; rrect(ctx, 90, 72, 16, 16, 3); ctx.fill(); ctx.strokeStyle = '#d7263d'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(108, 80, 5, -1.2, 1.2); ctx.stroke(); ctx.fillStyle = '#7a4a2a'; ctx.fillRect(92, 73, 12, 3); }
    if (letter) { ctx.save(); ctx.translate(98, 80); ctx.rotate(-0.2); ctx.fillStyle = '#fffaf0'; ctx.fillRect(-12, -8, 24, 16); ctx.strokeStyle = '#d9c9a8'; ctx.lineWidth = 1; ctx.strokeRect(-12, -8, 24, 16); circle(ctx, 0, 0, 3.5, '#d7263d'); ctx.restore(); }
    ctx.restore();
    ctx.restore();
}

// mouette factrice
function seagull(ctx, x, y, s, flap, o = {}) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s * (o.facing || 1), s);
    const a = Math.sin(flap) * 0.9;
    ctx.fillStyle = '#e3eaf3';
    ctx.save(); ctx.rotate(-a * 0.6); ctx.beginPath(); ctx.moveTo(-6, -4); ctx.quadraticCurveTo(-30, -26 - a * 18, -52, -10 - a * 24); ctx.quadraticCurveTo(-30, -6, -6, 4); ctx.fill(); ctx.restore();
    ell(ctx, 0, 0, 22, 13, '#fff');
    circle(ctx, 18, -10, 10, '#fff');
    circle(ctx, 21, -12, 2, '#14172b');
    ctx.fillStyle = '#ff9f43'; ctx.beginPath(); ctx.moveTo(27, -10); ctx.lineTo(40, -7); ctx.lineTo(27, -5); ctx.fill();
    // casquette de facteur
    ctx.fillStyle = '#1d4f9e'; ctx.beginPath(); ctx.moveTo(10, -18); ctx.quadraticCurveTo(18, -28, 27, -19); ctx.closePath(); ctx.fill(); ctx.fillRect(22, -20, 10, 3);
    circle(ctx, 18, -24, 2, '#ffd36e');
    // sacoche
    ctx.fillStyle = '#8a5a3c'; rrect(ctx, -10, 2, 18, 14, 3); ctx.fill(); ctx.fillStyle = '#ffd36e'; ctx.fillRect(-3, 6, 4, 4);
    ctx.save(); ctx.rotate(a * 0.6); ctx.fillStyle = '#d3dce8'; ctx.beginPath(); ctx.moveTo(-6, -2); ctx.quadraticCurveTo(-26, 18 + a * 18, -48, 6 + a * 26); ctx.quadraticCurveTo(-26, 4, -6, 6); ctx.fill(); ctx.restore();
    ctx.fillStyle = '#ff9f43'; ctx.fillRect(-4, 12, 3, 8); ctx.fillRect(4, 12, 3, 8);
    ctx.restore();
}

function snowLayer(ctx, t, seed, n, speed, size, alpha, drift = 20, wind = 0) {
    const r = rng(seed);
    ctx.fillStyle = '#fff';
    for (let i = 0; i < n; i++) {
        const x0 = r() * W, y0 = r() * H, ph = r() * TAU, sp = speed * (0.7 + r() * 0.6), sz = size * (0.6 + r() * 0.7);
        let x = (x0 + wind * t + Math.sin(t * 0.8 + ph) * drift) % (W + 40); if (x < -20) x += W + 40;
        const y = (y0 + sp * t) % (H + 20) - 10;
        ctx.globalAlpha = alpha * (0.6 + 0.4 * Math.sin(ph + t));
        ctx.beginPath(); ctx.arc(x, y, sz, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
}

function stars(ctx, t, seed, n, hMax) {
    const r = rng(seed);
    for (let i = 0; i < n; i++) {
        const x = r() * W, y = r() * hMax, s = 0.6 + r() * 1.6, ph = r() * TAU;
        ctx.globalAlpha = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * (1 + r() * 2) + ph));
        circle(ctx, x, y, s, '#fffbe6');
    }
    ctx.globalAlpha = 1;
}

function aurora(ctx, t, y0, alpha) {
    const cols = [['rgba(123,224,163,A)', 0], ['rgba(127,232,255,A)', 1.7], ['rgba(180,140,255,A)', 3.1]];
    ctx.globalCompositeOperation = 'lighter';
    cols.forEach(([c, ph], i) => {
        ctx.beginPath();
        for (let x = -20; x <= W + 20; x += 20) {
            const y = y0 + i * 26 + Math.sin(x * 0.004 + t * 0.35 + ph) * 46 + Math.sin(x * 0.011 + t * 0.6 + ph) * 18;
            x === -20 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        for (let x = W + 20; x >= -20; x -= 20) {
            const y = y0 + i * 26 + 120 + Math.sin(x * 0.005 + t * 0.3 + ph) * 30;
            ctx.lineTo(x, y);
        }
        const g = ctx.createLinearGradient(0, y0, 0, y0 + 160);
        g.addColorStop(0, c.replace('A', 0)); g.addColorStop(0.35, c.replace('A', 0.35 * alpha)); g.addColorStop(1, c.replace('A', 0));
        ctx.fillStyle = g; ctx.fill();
    });
    ctx.globalCompositeOperation = 'source-over';
}

function mountains(ctx, seed, base, amp, col, cap, offset = 0, step = 160) {
    // chaîne de sommets en « monde » : le décalage fait défiler la chaîne sans qu'elle se recompose
    const hash = (i) => { const r = rng(seed * 7919 + i * 104729); r(); return [r(), r(), r()]; };
    const ridge = (xw) => {
        const c = Math.floor(xw / step); let y = base + 40;
        for (let i = c - 2; i <= c + 2; i++) {
            const [a, b, d] = hash(i); const px = (i + 0.2 + a * 0.6) * step, ph = amp * (0.35 + b * 0.65), sl = 0.55 + d * 0.5;
            y = Math.min(y, base - ph + Math.abs(xw - px) * sl * (amp / step) * 1.3);
        }
        return y + Math.sin(xw * 0.045 + seed) * amp * 0.025 + Math.sin(xw * 0.13 + seed * 2) * amp * 0.012;
    };
    const pts = []; for (let x = -10; x <= W + 10; x += 6) pts.push([x, ridge(x + offset)]);
    const g = ctx.createLinearGradient(0, base - amp, 0, base + 60);
    g.addColorStop(0, mixc(col, 'ffffff', 0.14)); g.addColorStop(1, col);
    ctx.beginPath(); ctx.moveTo(-10, H + 10); pts.forEach(([x, y]) => ctx.lineTo(x, y)); ctx.lineTo(W + 10, H + 10); ctx.closePath(); ctx.fillStyle = g; ctx.fill();
    // ombre douce sur les versants descendants (lumière venant de la gauche)
    ctx.fillStyle = 'rgba(0,10,40,0.12)';
    for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; if (y1 > y0) { ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.lineTo(x1, Math.min(H + 10, y1 + amp * 0.9)); ctx.lineTo(x0, Math.min(H + 10, y0 + amp * 0.9)); ctx.fill(); } }
    if (cap) {
        const snowline = base - amp * 0.52;
        ctx.fillStyle = cap; ctx.beginPath();
        let open = false;
        const bottom = [];
        pts.forEach(([x, y]) => {
            const dep = snowline - y;
            if (dep > 0) { const jag = (Math.sin((x + offset) * 0.21) * 0.5 + Math.sin((x + offset) * 0.53) * 0.5) * 6; bottom.push([x, y + dep * 0.55 + jag]); if (!open) { ctx.moveTo(x, y); open = true; } else ctx.lineTo(x, y); }
            else if (open) { for (let k = bottom.length - 1; k >= 0; k--) ctx.lineTo(...bottom[k]); ctx.closePath(); bottom.length = 0; open = false; }
        });
        if (open) { for (let k = bottom.length - 1; k >= 0; k--) ctx.lineTo(...bottom[k]); ctx.closePath(); }
        ctx.fill();
    }
}

function pine(ctx, x, y, h, c1 = '#1f3d63', c2 = '#2a4f7a', snow = '#eaf4ff') {
    const w = h * 0.5;
    [[0, 0.45], [0.25, 0.72], [0.5, 1]].forEach(([a, b], k) => {
        const yt = y - h + h * a, yb = y - h + h * b, ww = w * (0.45 + 0.28 * k);
        ctx.fillStyle = c1; ctx.beginPath(); ctx.moveTo(x, yt); ctx.lineTo(x + ww, yb); ctx.lineTo(x - ww, yb); ctx.closePath(); ctx.fill();
        ctx.fillStyle = c2; ctx.beginPath(); ctx.moveTo(x, yt); ctx.lineTo(x + ww, yb); ctx.lineTo(x, yb); ctx.closePath(); ctx.fill();
        ctx.fillStyle = snow; ctx.beginPath(); ctx.moveTo(x, yt - 1); ctx.lineTo(x + ww * 0.35, yt + (yb - yt) * 0.4); ctx.quadraticCurveTo(x, yt + (yb - yt) * 0.3, x - ww * 0.35, yt + (yb - yt) * 0.4); ctx.closePath(); ctx.fill();
    });
}

function subtitle(ctx, t, a, b, text, who) {
    const k = Math.min(seg(t, a, a + 0.35), 1 - seg(t, b - 0.35, b));
    if (k <= 0) return;
    ctx.save(); ctx.globalAlpha = k;
    ctx.font = '600 26px "DM Sans", Inter, system-ui, sans-serif';
    const n = Math.floor(clamp((t - a) / 0.028, 0, text.length));
    const shown = text.slice(0, n);
    const w = ctx.measureText(text).width + (who ? ctx.measureText(who + '  ').width + 10 : 0) + 56;
    const x = W / 2 - w / 2, y = H - 92;
    ctx.fillStyle = 'rgba(8,12,28,0.72)'; rrect(ctx, x, y, w, 52, 26); ctx.fill();
    let tx = x + 28;
    ctx.textBaseline = 'middle';
    if (who) { ctx.font = '800 24px "Bricolage Grotesque", "Inter Display", Inter, system-ui, sans-serif'; ctx.fillStyle = '#ffd36e'; ctx.fillText(who, tx, y + 27); tx += ctx.measureText(who).width + 16; }
    ctx.font = '600 26px "DM Sans", Inter, system-ui, sans-serif'; ctx.fillStyle = '#fff'; ctx.fillText(shown, tx, y + 27);
    ctx.restore();
}

function caption(ctx, t, a, b, text, y = 120, size = 30) {
    // légende de narration : police droite sur un bandeau sombre, lisible sur ciel clair comme sur la nuit
    const k = Math.min(ease.out(seg(t, a, a + 0.6)), 1 - seg(t, b - 0.5, b));
    if (k <= 0) return;
    ctx.save(); ctx.globalAlpha = k;
    ctx.font = `600 ${size}px "DM Sans", Inter, system-ui, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const w = ctx.measureText(text).width + 56, hh = size + 26, yy = y + (1 - k) * 10;
    ctx.fillStyle = 'rgba(8,12,28,0.62)'; rrect(ctx, W / 2 - w / 2, yy - hh / 2, w, hh, hh / 2); ctx.fill();
    ctx.fillStyle = '#fffaf0'; ctx.fillText(text, W / 2, yy + 1);
    ctx.restore();
}

function vignette(ctx, a = 0.55) {
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${a})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

// clignement naturel : deux paupières qui se ferment brièvement toutes les ~3 s
function blinkAt(t, seed = 0) {
    const p = (t + seed * 1.37) % 3.4;
    return p < 0.14 ? Math.sin((p / 0.14) * Math.PI) : 0;
}
