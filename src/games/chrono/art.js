// Chronoflocon : dessins. Le décor (mer + îles) est pré-rendu à chaque tournée ; colis et véhicules en petits sprites.
import { circle, ellipse, roundRect, TAU } from '../draw';
import { ISLES, W, H } from './world';

const RES = 2;
function offscreen(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.ceil(w * RES);
    c.height = Math.ceil(h * RES);
    const x = c.getContext('2d');
    x.scale(RES, RES);
    return [c, x];
}
function rngOf(seed) {
    let s = seed >>> 0 || 1;
    return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
export function star(ctx, x, y, r, col) {
    ctx.fillStyle = col;
    ctx.beginPath();
    for (let k = 0; k < 10; k++) {
        const a = -Math.PI / 2 + (k * Math.PI) / 5;
        const rr = k % 2 ? r * 0.45 : r;
        ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.fill();
}

// ---------------------------------------------------------------- symboles des îles
export function symbol(ctx, sym, x, y, s, col = '#1d2542') {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.fillStyle = col;
    ctx.strokeStyle = col;
    ctx.lineWidth = 1.6;
    if (sym === 'fish') {
        ctx.beginPath();
        ctx.ellipse(1, 0, 5, 3.2, 0, 0, TAU);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-3, 0);
        ctx.lineTo(-7, -3);
        ctx.lineTo(-7, 3);
        ctx.fill();
    } else if (sym === 'tree') {
        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.lineTo(5, 4);
        ctx.lineTo(-5, 4);
        ctx.fill();
    } else if (sym === 'star') star(ctx, 0, 0, 6, col);
    else if (sym === 'gift') {
        ctx.fillRect(-5, -3, 10, 8);
        ctx.fillRect(-6, -5, 12, 3);
    } else if (sym === 'seal') {
        ctx.beginPath();
        ctx.ellipse(0, 1, 6, 3.5, 0, 0, TAU);
        ctx.fill();
        circle(ctx, 5, -2, 2.6, col);
    } else if (sym === 'moon') {
        ctx.beginPath();
        ctx.arc(0, 0, 5.5, 0.6, TAU - 0.6);
        ctx.arc(2.5, 0, 3.6, TAU - 0.9, 0.9, true);
        ctx.fill();
    } else if (sym === 'aurora') {
        ctx.beginPath();
        ctx.moveTo(-6, 3);
        ctx.quadraticCurveTo(-2, -6, 0, 0);
        ctx.quadraticCurveTo(2, 6, 6, -3);
        ctx.stroke();
    } else if (sym === 'tri') ctx.fillRect(-4, -4, 8, 8);
    ctx.restore();
}
export function badge(ctx, x, y, k, r = 10) {
    const I = ISLES[k];
    circle(ctx, x, y, r + 2, '#ffffff');
    circle(ctx, x, y, r, I.col);
    symbol(ctx, I.sym, x, y, r / 9);
}

// ---------------------------------------------------------------- colis (sprites par île de destination)
export function makeParcelSprites() {
    const out = {};
    Object.keys(ISLES).forEach((k) => {
        [false, true].forEach((ex) => {
            const [c, x] = offscreen(14, 14);
            x.translate(7, 7);
            x.fillStyle = ex ? '#ffd23f' : ISLES[k].col;
            roundRect(x, -5, -5, 10, 10, 2);
            x.fill();
            x.strokeStyle = ex ? '#a86f00' : 'rgba(20,30,60,0.45)';
            x.lineWidth = 1;
            x.stroke();
            symbol(x, ISLES[k].sym, 0, 0, 0.55, '#1d2542');
            out[k + (ex ? '!' : '')] = c;
        });
    });
    return out;
}
export function drawParcel(ctx, spr, x, y, k, ex, size = 14) {
    ctx.drawImage(spr[k + (ex ? '!' : '')], x - size / 2, y - size / 2, size, size);
}

// ---------------------------------------------------------------- le décor de la tournée
function coast(cx, cy, rx, ry, seed, rough = 0.22, n = 5) {
    const r = rngOf(seed);
    let pts = [];
    for (let i = 0; i < 10; i++) {
        const a = (i / 10) * TAU;
        const k = 0.82 + r() * 0.3;
        pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
    }
    for (let it = 0; it < n; it++) {
        const np = [];
        for (let i = 0; i < pts.length; i++) {
            const [ax, ay] = pts[i];
            const [bx, by] = pts[(i + 1) % pts.length];
            const d = Math.hypot(bx - ax, by - ay);
            np.push([ax, ay], [(ax + bx) / 2 + (r() - 0.5) * d * rough, (ay + by) / 2 + (r() - 0.5) * d * rough]);
        }
        pts = np;
    }
    return pts;
}
function poly(ctx, pts) {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
}
function warehouse(x, cx, cy) {
    ellipse(x, cx, cy + 14, 30, 6, 'rgba(20,40,80,0.2)');
    x.fillStyle = '#d7263d';
    x.fillRect(cx - 26, cy - 10, 52, 24);
    x.fillStyle = '#a5121f';
    x.beginPath();
    x.moveTo(cx - 30, cy - 9);
    x.lineTo(cx - 14, cy - 24);
    x.lineTo(cx + 14, cy - 24);
    x.lineTo(cx + 30, cy - 9);
    x.fill();
    x.fillStyle = '#f4f9ff';
    x.fillRect(cx - 18, cy - 2, 14, 16);
    x.fillStyle = '#ffd36e';
    x.fillRect(cx + 4, cy - 4, 16, 8);
    x.fillStyle = '#8a9bb5';
    x.fillRect(cx - 34, cy + 10, 20, 5);
    x.fillRect(cx + 14, cy + 10, 20, 5);
}
// Pont de banquise : une bande de glace entre deux îles, sur laquelle on pose des rails (d'où le train sur la mer)
function iceBridge(x, A, B, seed) {
    const r = rngOf(seed);
    const dx = B.x - A.x;
    const dy = B.y - A.y;
    const len = Math.hypot(dx, dy);
    const nx = -dy / len;
    const ny = dx / len;
    const n = Math.max(6, Math.round(len / 14));
    const left = [];
    const right = [];
    for (let i = 0; i <= n; i++) {
        const k = i / n;
        const px = A.x + dx * k;
        const py = A.y + dy * k;
        const w = 15 + Math.sin(k * Math.PI) * -3 + (r() - 0.5) * 6;
        left.push([px + nx * w, py + ny * w]);
        right.push([px - nx * (w + (r() - 0.5) * 4), py - ny * (w + (r() - 0.5) * 4)]);
    }
    const pts = [...left, ...right.reverse()];
    x.save();
    x.translate(2, 4);
    poly(x, pts);
    x.fillStyle = 'rgba(5,25,45,0.25)';
    x.fill();
    x.restore();
    poly(x, pts);
    x.fillStyle = '#e4f1fa';
    x.fill();
    x.strokeStyle = 'rgba(150,195,230,0.9)';
    x.lineWidth = 1.5;
    x.stroke();
    // fissures et reflets sur la glace
    x.strokeStyle = 'rgba(150,195,230,0.7)';
    x.lineWidth = 1;
    for (let i = 0; i < n / 2; i++) {
        const k = r();
        const px = A.x + dx * k + nx * (r() - 0.5) * 18;
        const py = A.y + dy * k + ny * (r() - 0.5) * 18;
        x.beginPath();
        x.moveTo(px, py);
        x.lineTo(px + (r() - 0.5) * 10, py + (r() - 0.5) * 10);
        x.stroke();
    }
}
function airstrip(x, I) {
    x.save();
    x.translate(I.x - I.r * 0.5, I.y + I.r * 0.42);
    x.rotate(-0.22);
    x.fillStyle = '#8a9bb5';
    roundRect(x, -16, -4.5, 32, 9, 3);
    x.fill();
    x.fillStyle = '#ffffff';
    for (let i = -12; i < 14; i += 6) x.fillRect(i, -0.8, 3, 1.6);
    x.restore();
}
export function makeBackground(visible, storm = false, bridges = [], strips = []) {
    const [c, x] = offscreen(W, H);
    const g = x.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, storm ? '#2b4a66' : '#2a6d97');
    g.addColorStop(1, storm ? '#1a2f45' : '#164a72');
    x.fillStyle = g;
    x.fillRect(0, 0, W, H);
    const r = rngOf(17);
    for (let i = 0; i < 260; i++) {
        x.strokeStyle = `rgba(255,255,255,${0.04 + r() * 0.07})`;
        x.lineWidth = 1 + r() * 1.5;
        const px = r() * W;
        const py = r() * H;
        x.beginPath();
        x.moveTo(px, py);
        x.quadraticCurveTo(px + 5, py - 2, px + 12 + r() * 12, py);
        x.stroke();
    }
    bridges.forEach(([a, b], i) => iceBridge(x, ISLES[a], ISLES[b], 40 + i * 7));
    Object.keys(ISLES).forEach((k) => {
        if (!visible.includes(k)) return;
        const I = ISLES[k];
        const seed = k.length * 31 + I.x;
        const p = coast(I.x, I.y, I.r, I.r * 0.74, seed);
        x.save();
        x.translate(4, 7);
        poly(x, p);
        x.fillStyle = 'rgba(5,25,45,0.3)';
        x.fill();
        x.restore();
        poly(x, coast(I.x, I.y, I.r * 1.12, I.r * 0.84, seed));
        x.fillStyle = 'rgba(170,225,245,0.45)';
        x.fill();
        poly(x, p);
        const gg = x.createLinearGradient(I.x - I.r, I.y - I.r, I.x + I.r, I.y + I.r);
        gg.addColorStop(0, '#ffffff');
        gg.addColorStop(1, '#cfe0f2');
        x.fillStyle = gg;
        x.fill();
        x.strokeStyle = 'rgba(120,160,200,0.7)';
        x.lineWidth = 1.5;
        x.stroke();
        if (strips.includes(k)) airstrip(x, I);
        if (k === 'tri') warehouse(x, I.x, I.y + 2);
        else {
            x.fillStyle = '#d7263d';
            roundRect(x, I.x - 12, I.y - 6, 24, 16, 3);
            x.fill();
            x.fillStyle = '#a5121f';
            x.beginPath();
            x.moveTo(I.x - 15, I.y - 5);
            x.lineTo(I.x, I.y - 16);
            x.lineTo(I.x + 15, I.y - 5);
            x.fill();
            x.fillStyle = '#ffd36e';
            x.fillRect(I.x - 3, I.y + 1, 6, 9);
            badge(x, I.x, I.y - 27, k, 10);
        }
    });
    return c;
}
// Halo doré (colis express, île survolée), préparé une fois
export function makeGlow(col) {
    const [c, x] = offscreen(64, 64);
    const g = x.createRadialGradient(32, 32, 2, 32, 32, 32);
    g.addColorStop(0, col.replace('A', '0.9'));
    g.addColorStop(1, col.replace('A', '0'));
    x.fillStyle = g;
    x.fillRect(0, 0, 64, 64);
    return c;
}

// ---------------------------------------------------------------- véhicules vus de profil (toujours droits)
export function trainIcon(ctx, x, y, s = 1, dir = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s * dir, s);
    ellipse(ctx, -6, 9, 30, 3, 'rgba(10,25,45,0.3)');
    [-30, -14].forEach((wx) => {
        ctx.fillStyle = '#3b82f6';
        roundRect(ctx, wx - 7, -6, 14, 11, 2);
        ctx.fill();
        ctx.fillStyle = '#2563c9';
        ctx.fillRect(wx - 7, 3, 14, 2);
        circle(ctx, wx - 4, 7, 2.6, '#1d2542');
        circle(ctx, wx + 4, 7, 2.6, '#1d2542');
    });
    ctx.fillStyle = '#d7263d';
    roundRect(ctx, -4, -3, 18, 9, 3);
    ctx.fill();
    ctx.fillStyle = '#1d2542';
    roundRect(ctx, -6, -12, 9, 18, 2);
    ctx.fill();
    ctx.fillStyle = '#ffd36e';
    ctx.fillRect(-4, -10, 5, 4);
    ctx.fillStyle = '#1d2542';
    ctx.fillRect(8, -9, 4, 7);
    circle(ctx, 12, -13, 2.5, 'rgba(255,255,255,0.8)');
    ctx.fillStyle = '#c9d4e6';
    ctx.beginPath();
    ctx.moveTo(14, 1);
    ctx.lineTo(19, 7);
    ctx.lineTo(14, 7);
    ctx.fill();
    circle(ctx, 0, 7, 3.2, '#1d2542');
    circle(ctx, 9, 7, 3.2, '#1d2542');
    ctx.restore();
}
export function boatIcon(ctx, x, y, s = 1, dir = 1, wake = true) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s * dir, s);
    if (wake) {
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-20, 8);
        ctx.quadraticCurveTo(-28, 6, -36, 9);
        ctx.moveTo(-18, 10);
        ctx.quadraticCurveTo(-26, 12, -34, 12);
        ctx.stroke();
    }
    ctx.fillStyle = '#d7263d';
    ctx.beginPath();
    ctx.moveTo(-20, 0);
    ctx.lineTo(18, 0);
    ctx.lineTo(24, -4);
    ctx.lineTo(19, 9);
    ctx.lineTo(-17, 9);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-19, 4, 38, 2);
    ctx.fillStyle = '#f4f7fb';
    roundRect(ctx, -16, -11, 13, 11, 2);
    ctx.fill();
    ctx.fillStyle = '#7fb6e6';
    ctx.fillRect(-14, -8, 3, 3);
    ctx.fillRect(-9, -8, 3, 3);
    ctx.fillStyle = '#1d2542';
    ctx.fillRect(-12, -17, 5, 6);
    ctx.fillStyle = '#ffd36e';
    ctx.fillRect(-12, -15, 5, 1.5);
    ctx.restore();
}
export function planeIcon(ctx, x, y, s = 1, dir = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s * dir, s);
    ellipse(ctx, 2, 16, 14, 2.5, 'rgba(10,25,45,0.25)');
    ctx.fillStyle = '#d7263d';
    ctx.beginPath();
    ctx.moveTo(-14, -1);
    ctx.lineTo(-19, -11);
    ctx.lineTo(-14, -11);
    ctx.lineTo(-8, -1);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(-18, -1);
    ctx.quadraticCurveTo(-4, -6, 12, -4);
    ctx.quadraticCurveTo(19, -2, 18, 1);
    ctx.quadraticCurveTo(10, 4, -16, 3);
    ctx.closePath();
    ctx.fill();
    for (let i = 0; i < 4; i++) circle(ctx, -6 + i * 4, -1.5, 1.1, '#7fb6e6');
    ctx.fillStyle = '#c9d4e6';
    ctx.beginPath();
    ctx.moveTo(-2, 1);
    ctx.lineTo(6, 1);
    ctx.lineTo(-4, 9);
    ctx.lineTo(-9, 9);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#1d2542';
    ctx.fillRect(18, -5, 1.6, 9);
    ctx.restore();
}
export function sleighIcon(ctx, x, y, s = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.strokeStyle = '#ffd36e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-14, 8);
    ctx.quadraticCurveTo(10, 10, 16, 2);
    ctx.stroke();
    ctx.fillStyle = '#d7263d';
    roundRect(ctx, -12, -6, 22, 12, 4);
    ctx.fill();
    ctx.fillStyle = '#a5121f';
    roundRect(ctx, -14, -10, 8, 10, 3);
    ctx.fill();
    ctx.fillStyle = '#ffd23f';
    ctx.fillRect(-2, -10, 8, 6);
    ctx.fillStyle = '#ff6fa8';
    ctx.fillRect(2, -8, 7, 5);
    // deux phoques attelés
    [22, 36].forEach((dx) => {
        ellipse(ctx, dx, 4, 7, 4, '#7d8aa8');
        circle(ctx, dx + 5, 0, 3.2, '#7d8aa8');
        circle(ctx, dx + 6, -0.5, 0.8, '#111111');
    });
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(14, 2);
    ctx.lineTo(34, 2);
    ctx.stroke();
    ctx.restore();
}
// La Cheffe Mouette (personnage original : mouette à casquette de postière)
export function gull(ctx, x, y, s = 1, flap = 0.4, facing = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s * facing, s);
    const a = Math.sin(flap) * 0.9;
    ctx.fillStyle = '#e3eaf3';
    ctx.beginPath();
    ctx.moveTo(-4, -2);
    ctx.quadraticCurveTo(-18, -14 - a * 10, -30, -6 - a * 12);
    ctx.quadraticCurveTo(-16, -4, -4, 4);
    ctx.fill();
    ellipse(ctx, 0, 0, 15, 9, '#ffffff');
    circle(ctx, 12, -6, 7, '#ffffff');
    circle(ctx, 14, -8, 1.6, '#1d2542');
    ctx.fillStyle = '#ff9f43';
    ctx.beginPath();
    ctx.moveTo(18, -6);
    ctx.lineTo(27, -4);
    ctx.lineTo(18, -2);
    ctx.fill();
    ctx.fillStyle = '#26345e';
    ctx.beginPath();
    ctx.moveTo(6, -11);
    ctx.quadraticCurveTo(12, -17, 18, -11);
    ctx.lineTo(22, -10);
    ctx.lineTo(6, -10);
    ctx.fill();
    ctx.fillStyle = '#ffd36e';
    ctx.fillRect(11, -14, 3, 2);
    ctx.fillStyle = '#c99a5b';
    ctx.fillRect(-6, 4, 10, 7);
    ctx.restore();
}
// Petit client qui attend sur une île (pingouin ou phoque), sprite par humeur
export function client(ctx, x, y, mood, kind, t) {
    const tap = mood === 2 ? Math.abs(Math.sin(t * 18)) * 2 : 0;
    ctx.save();
    ctx.translate(x, y - tap);
    if (kind === 'seal') {
        ellipse(ctx, 0, -6, 9, 6, '#7d8aa8');
        circle(ctx, 6, -11, 5, '#7d8aa8');
        circle(ctx, 7.5, -12, 1.2, '#111111');
    } else {
        ellipse(ctx, 0, -9, 7, 9, '#1d2542');
        ellipse(ctx, 0, -7, 4.5, 6, '#f4f7fb');
        circle(ctx, -2, -13, 1, '#111111');
        circle(ctx, 2, -13, 1, '#111111');
        ctx.fillStyle = '#ff9f43';
        ctx.fillRect(-1.5, -11.5, 3, 2);
        ctx.fillStyle = mood === 2 ? '#ff4d4d' : '#3b82f6';
        ctx.fillRect(-6, -9, 12, 2.4);
    }
    ctx.restore();
    if (mood > 0) {
        const w = mood === 2 ? 64 : 58;
        const bx = x - w / 2;
        const by = y - 42;
        roundRect(ctx, bx, by, w, 17, 8.5);
        ctx.fillStyle = mood === 2 ? '#ff5d5d' : '#ffffff';
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x - 3, by + 17);
        ctx.lineTo(x, by + 22);
        ctx.lineTo(x + 3, by + 17);
        ctx.fill();
        ctx.font = '700 10px "DM Sans", system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = mood === 2 ? '#ffffff' : '#1d2542';
        ctx.fillText(mood === 2 ? 'Mon colis !!' : 'C’est long…', x, by + 9);
        ctx.textBaseline = 'alphabetic';
    }
}
// Icônes des événements (frise de la tournée, Radio Banquise)
export function evIcon(ctx, id, x, y, s = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2;
    if (id === 'fog') {
        ctx.strokeStyle = '#6b7a99';
        [-4, 0, 4].forEach((yy, i) => {
            ctx.beginPath();
            ctx.moveTo(-6 + i, yy);
            ctx.lineTo(6 - i, yy);
            ctx.stroke();
        });
    } else if (id === 'crack') {
        ctx.strokeStyle = '#d7263d';
        ctx.beginPath();
        ctx.moveTo(-2, -7);
        ctx.lineTo(2, -2);
        ctx.lineTo(-2, 1);
        ctx.lineTo(3, 7);
        ctx.stroke();
    } else if (id === 'storm') {
        ctx.strokeStyle = '#3b82f6';
        ctx.beginPath();
        ctx.arc(0, 0, 5.5, 0.3, 4.6);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, 2.4, 3.4, 7.4);
        ctx.stroke();
    } else if (id === 'aurora') {
        ctx.strokeStyle = '#2bb673';
        ctx.beginPath();
        ctx.moveTo(-7, 3);
        ctx.quadraticCurveTo(-3, -7, 0, 0);
        ctx.quadraticCurveTo(3, 7, 7, -3);
        ctx.stroke();
    } else if (id === 'breakdown') {
        ctx.strokeStyle = '#6b7280';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(-5, 5);
        ctx.lineTo(3, -3);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(4, -4, 3.2, -2.4, 1.6);
        ctx.stroke();
    } else if (id === 'iceberg') {
        ctx.fillStyle = '#8fc9ef';
        ctx.beginPath();
        ctx.moveTo(-7, 5);
        ctx.lineTo(-3, -2);
        ctx.lineTo(0, -7);
        ctx.lineTo(4, -1);
        ctx.lineTo(7, 5);
        ctx.closePath();
        ctx.fill();
    } else if (id === 'burst') {
        ctx.fillStyle = '#c99a5b';
        ctx.fillRect(-4, -2, 8, 7);
        ctx.strokeStyle = '#ff9f43';
        ctx.beginPath();
        ctx.moveTo(-7, -4);
        ctx.lineTo(-5, -6);
        ctx.moveTo(7, -4);
        ctx.lineTo(5, -6);
        ctx.moveTo(0, -5);
        ctx.lineTo(0, -8);
        ctx.stroke();
    }
    ctx.restore();
}
