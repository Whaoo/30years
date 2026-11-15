// Opération Réveillon : dessins (sprites préparés une fois hors écran, décor de carte pré-rendu).
import { circle, ellipse, roundRect, drawPenguin, TAU } from '../draw';
import { W, H, PATH_W } from './maps';

const RES = 2;
function offscreen(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.ceil(w * RES);
    c.height = Math.ceil(h * RES);
    const x = c.getContext('2d');
    x.scale(RES, RES);
    return [c, x];
}
// Un sprite : canvas + point d'ancrage (les pieds), dessiné à l'échelle 1 dans le repère du jeu
function sprite(w, h, ax, ay, draw) {
    const [c, x] = offscreen(w, h);
    x.translate(ax, ay);
    draw(x);
    return { img: c, w, h, ax, ay };
}
export function drawSprite(ctx, spr, x, y, flip = 1, scale = 1) {
    ctx.save();
    ctx.translate(x, y);
    if (flip < 0 || scale !== 1) ctx.scale(flip * scale, scale);
    ctx.drawImage(spr.img, -spr.ax, -spr.ay, spr.w, spr.h);
    ctx.restore();
}

// ---------------------------------------------------------------- monstres (pieds en 0,0)
function snowBody(x, r, cy) {
    circle(x, 0, cy, r, '#ffffff');
    x.strokeStyle = 'rgba(90,120,170,0.45)';
    x.lineWidth = 1.5;
    x.beginPath();
    x.arc(0, cy, r, 0, TAU);
    x.stroke();
}
function angryEyes(x, dx, y, s = 1) {
    circle(x, -dx, y, 2.2 * s, '#1d2542');
    circle(x, dx, y, 2.2 * s, '#1d2542');
    x.strokeStyle = '#1d2542';
    x.lineWidth = 1.8 * s;
    x.lineCap = 'round';
    x.beginPath();
    x.moveTo(-dx - 3.5 * s, y - 4.5 * s);
    x.lineTo(-dx + 2.5 * s, y - 2.5 * s);
    x.moveTo(dx + 3.5 * s, y - 4.5 * s);
    x.lineTo(dx - 2.5 * s, y - 2.5 * s);
    x.stroke();
}
function drawGrognon(x, s = 1, crown = false) {
    x.save();
    x.scale(s, s);
    ellipse(x, 0, 0, 13, 3.5, 'rgba(20,40,80,0.18)');
    snowBody(x, 12, -12);
    snowBody(x, 8.5, -29);
    x.strokeStyle = '#5b3a22';
    x.lineWidth = 2;
    x.beginPath();
    x.moveTo(-10, -16);
    x.lineTo(-19, -23);
    x.moveTo(10, -16);
    x.lineTo(19, -23);
    x.stroke();
    angryEyes(x, 3.2, -31);
    x.fillStyle = '#ff9f43';
    x.beginPath();
    x.moveTo(0, -28.5);
    x.lineTo(7, -27.5);
    x.lineTo(0, -26.5);
    x.fill();
    x.fillStyle = '#e94b4b';
    x.fillRect(-8, -22.5, 16, 3.5);
    if (crown) {
        x.fillStyle = '#9fe6ff';
        x.beginPath();
        x.moveTo(-8, -37);
        for (let i = 0; i < 4; i++) {
            x.lineTo(-6 + i * 4.5, -45 - (i % 2) * 3);
            x.lineTo(-4 + i * 4.5, -37);
        }
        x.lineTo(8, -37);
        x.fill();
    } else {
        x.fillStyle = '#1d2542';
        x.fillRect(-6, -42, 12, 6);
        x.fillRect(-8.5, -37, 17, 2.5);
    }
    x.restore();
}
function drawBiscuit(x) {
    ellipse(x, 0, 0, 10, 3, 'rgba(20,40,80,0.18)');
    x.fillStyle = '#c9773a';
    x.strokeStyle = '#8a4a1c';
    x.lineWidth = 1.5;
    // jambes, bras, corps, tête
    roundRect(x, -8, -12, 6, 12, 3);
    x.fill();
    roundRect(x, 2, -12, 6, 12, 3);
    x.fill();
    roundRect(x, -15, -22, 30, 6, 3);
    x.fill();
    roundRect(x, -8, -24, 16, 15, 5);
    x.fill();
    circle(x, 0, -30, 8, '#c9773a');
    x.beginPath();
    x.arc(0, -30, 8, 0, TAU);
    x.stroke();
    x.strokeStyle = '#ffffff';
    x.lineWidth = 1.4;
    x.beginPath();
    x.moveTo(-12, -20);
    x.lineTo(-10, -18);
    x.moveTo(12, -20);
    x.lineTo(10, -18);
    x.stroke();
    circle(x, 0, -19, 1.4, '#e94b4b');
    circle(x, 0, -14, 1.4, '#2bb673');
    angryEyes(x, 3, -31, 0.85);
    x.strokeStyle = '#5b2a10';
    x.beginPath();
    x.arc(0, -25, 3, Math.PI * 1.15, Math.PI * 1.85);
    x.stroke();
}
function drawMimique(x) {
    ellipse(x, 0, 0, 12, 3.5, 'rgba(20,40,80,0.18)');
    x.fillStyle = '#2b9f62';
    roundRect(x, -11, -18, 22, 18, 3);
    x.fill();
    x.fillStyle = '#1d2542';
    x.beginPath();
    x.moveTo(-11, -18);
    x.quadraticCurveTo(0, -11, 11, -18);
    x.lineTo(11, -15);
    x.quadraticCurveTo(0, -8, -11, -15);
    x.fill();
    x.fillStyle = '#ffffff';
    for (let i = 0; i < 5; i++) {
        x.beginPath();
        x.moveTo(-9 + i * 4.5, -16.5);
        x.lineTo(-7 + i * 4.5, -12.5);
        x.lineTo(-5 + i * 4.5, -16);
        x.fill();
    }
    x.fillStyle = '#3fc47e';
    x.save();
    x.translate(-11, -19);
    x.rotate(-0.25);
    roundRect(x, 0, -6, 24, 6, 2);
    x.fill();
    x.restore();
    x.fillStyle = '#ffd36e';
    x.fillRect(-2, -18, 4, 18);
    circle(x, -4, -24, 2.2, '#ffd36e');
    circle(x, 3, -25, 2.2, '#ffd36e');
}
function drawGivre(x) {
    ellipse(x, 0, 0, 15, 4, 'rgba(20,40,80,0.2)');
    circle(x, 0, -15, 15, '#dff3ff');
    x.strokeStyle = '#8fc9ef';
    x.lineWidth = 2;
    x.beginPath();
    x.arc(0, -15, 15, 0, TAU);
    x.stroke();
    x.strokeStyle = '#ffffff';
    x.lineWidth = 2.2;
    for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i - 2) * 0.45;
        x.beginPath();
        x.moveTo(Math.cos(a) * 9, -15 + Math.sin(a) * 9);
        x.lineTo(Math.cos(a) * 18, -15 + Math.sin(a) * 18);
        x.stroke();
    }
    angryEyes(x, 4.5, -15, 1.1);
    x.strokeStyle = '#1d2542';
    x.lineWidth = 1.6;
    x.beginPath();
    x.moveTo(-4, -8);
    x.lineTo(4, -8);
    x.stroke();
}
function drawChauve(x, wing) {
    ellipse(x, 0, 6, 9, 2.5, 'rgba(20,40,80,0.14)');
    x.fillStyle = '#4a2b6b';
    [-1, 1].forEach((d) => {
        x.beginPath();
        x.moveTo(d * 4, -22);
        x.quadraticCurveTo(d * 14, -34 + wing * 8, d * 22, -26 + wing * 6);
        x.quadraticCurveTo(d * 16, -22, d * 18, -16);
        x.quadraticCurveTo(d * 11, -20, d * 4, -16);
        x.fill();
    });
    circle(x, 0, -20, 7, '#5c3685');
    circle(x, -2.5, -21, 1.8, '#ffd36e');
    circle(x, 2.5, -21, 1.8, '#ffd36e');
    x.fillStyle = '#5c3685';
    x.beginPath();
    x.moveTo(-6, -25);
    x.lineTo(-4, -30);
    x.lineTo(-2, -26);
    x.moveTo(6, -25);
    x.lineTo(4, -30);
    x.lineTo(2, -26);
    x.fill();
}
function drawBoss(x) {
    ellipse(x, 0, 0, 30, 7, 'rgba(20,40,80,0.22)');
    snowBody(x, 26, -26);
    snowBody(x, 19, -62);
    snowBody(x, 14, -90);
    x.strokeStyle = '#5b3a22';
    x.lineWidth = 3.5;
    x.lineCap = 'round';
    [-1, 1].forEach((d) => {
        x.beginPath();
        x.moveTo(d * 17, -66);
        x.lineTo(d * 40, -84);
        x.moveTo(d * 32, -78);
        x.lineTo(d * 36, -92);
        x.stroke();
    });
    x.fillStyle = '#7c5cff';
    x.fillRect(-15, -78, 30, 6);
    x.fillRect(6, -78, 6, 18);
    angryEyes(x, 5.5, -93, 1.5);
    x.fillStyle = '#ff9f43';
    x.beginPath();
    x.moveTo(0, -89);
    x.lineTo(13, -87);
    x.lineTo(0, -85);
    x.fill();
    [-56, -46, -36].forEach((yy) => circle(x, 0, yy, 2.4, '#1d2542'));
    x.fillStyle = '#9fe6ff';
    x.strokeStyle = '#5fb8e8';
    x.lineWidth = 1.2;
    x.beginPath();
    x.moveTo(-13, -102);
    for (let i = 0; i < 5; i++) {
        x.lineTo(-10.5 + i * 5.6, -116 - (i % 2) * 5);
        x.lineTo(-8 + i * 5.6, -102);
    }
    x.lineTo(13, -102);
    x.closePath();
    x.fill();
    x.stroke();
}
export function makeMonsterSprites() {
    return {
        grognon: [sprite(44, 50, 22, 46, (x) => drawGrognon(x)), sprite(44, 50, 22, 46, (x) => { x.translate(0, -1.5); drawGrognon(x); })],
        petit: [sprite(44, 54, 22, 50, (x) => drawGrognon(x, 1, true)), sprite(44, 54, 22, 50, (x) => { x.translate(0, -1.5); drawGrognon(x, 1, true); })],
        biscuit: [sprite(36, 44, 18, 41, (x) => drawBiscuit(x)), sprite(36, 44, 18, 41, (x) => { x.rotate(0.12); drawBiscuit(x); })],
        mimique: [sprite(30, 34, 15, 31, (x) => drawMimique(x)), sprite(30, 34, 15, 31, (x) => { x.translate(0, -2); drawMimique(x); })],
        givre: [sprite(40, 40, 20, 36, (x) => drawGivre(x)), sprite(40, 40, 20, 36, (x) => { x.translate(0, -15); x.rotate(0.3); x.translate(0, 15); drawGivre(x); })],
        chauve: [sprite(50, 44, 25, 38, (x) => drawChauve(x, 0)), sprite(50, 44, 25, 38, (x) => drawChauve(x, 1))],
        boss: [sprite(96, 130, 48, 124, (x) => drawBoss(x)), sprite(96, 130, 48, 124, (x) => { x.translate(0, -2); drawBoss(x); })]
    };
}

// ---------------------------------------------------------------- tours (base en 0,0), 3 niveaux
function stars(x, n, y = -2) {
    for (let i = 0; i < n; i++) {
        const cx = (i - (n - 1) / 2) * 7;
        x.fillStyle = '#ffd36e';
        x.beginPath();
        for (let k = 0; k < 10; k++) {
            const a = -Math.PI / 2 + (k * Math.PI) / 5;
            const r = k % 2 ? 1.4 : 3.2;
            x.lineTo(cx + Math.cos(a) * r, y + Math.sin(a) * r);
        }
        x.fill();
    }
}
function base(x, col, n) {
    ellipse(x, 0, 2, 20, 5, 'rgba(20,40,80,0.2)');
    x.fillStyle = col;
    roundRect(x, -18, -8, 36, 11, 5);
    x.fill();
    stars(x, n);
}
function drawLanceur(x, lv) {
    base(x, '#8a5a34', lv + 1);
    if (lv >= 1) {
        circle(x, -12, -14, 5, '#ffffff');
        circle(x, -12, -14, 5, 'rgba(160,190,220,0.25)');
    }
    if (lv >= 2) circle(x, -12, -22, 4.2, '#ffffff');
    drawPenguin(x, 3, -6, 30 + lv * 2, { scarf: ['#e94b4b', '#3b82f6', '#ffd36e'][lv], mood: 'normal', flip: -1.2, hatColor: ['#3b82f6', '#e94b4b', '#2b7f54'][lv] });
}
function drawCanon(x, lv) {
    base(x, '#5b6f96', lv + 1);
    x.fillStyle = '#c8d8ee';
    x.save();
    x.translate(-2, -14);
    x.rotate(-0.5);
    roundRect(x, -4, -6, 24 + lv * 4, 12, 6);
    x.fill();
    x.restore();
    circle(x, -4, -14, 10 + lv, '#a9c6f0');
    circle(x, -7, -17, 4, 'rgba(255,255,255,0.7)');
}
function drawPhare(x, lv) {
    base(x, '#d7263d', lv + 1);
    const h = 30 + lv * 6;
    x.fillStyle = '#ffffff';
    x.beginPath();
    x.moveTo(-7, -6);
    x.lineTo(-4.5, -6 - h);
    x.lineTo(4.5, -6 - h);
    x.lineTo(7, -6);
    x.fill();
    x.fillStyle = '#d7263d';
    x.fillRect(-6, -6 - h * 0.45, 12, 5);
    if (lv >= 1) x.fillRect(-5.4, -6 - h * 0.75, 10.8, 4);
    x.fillStyle = '#2b3750';
    x.fillRect(-6, -10 - h, 12, 4);
    circle(x, 0, -14 - h, 6, '#ffd36e');
}
function drawGuirlande(x, lv) {
    base(x, '#2b7f54', lv + 1);
    x.strokeStyle = '#6b4226';
    x.lineWidth = 3;
    x.beginPath();
    x.moveTo(-14, -6);
    x.lineTo(-14, -34 - lv * 3);
    x.moveTo(14, -6);
    x.lineTo(14, -34 - lv * 3);
    x.stroke();
    x.strokeStyle = '#1d2542';
    x.lineWidth = 1.2;
    x.beginPath();
    x.moveTo(-14, -32 - lv * 3);
    x.quadraticCurveTo(0, -20 - lv * 3, 14, -32 - lv * 3);
    x.stroke();
    ['#ff5d5d', '#ffd36e', '#7fe8ff', '#7be0a3', '#ff8fa8'].slice(0, 3 + lv).forEach((c, i, a) => {
        const u = (i + 1) / (a.length + 1);
        const bx = -14 + 28 * u;
        const by = -32 - lv * 3 + Math.sin(u * Math.PI) * 10;
        circle(x, bx, by + 3, 2.8, c);
    });
}
const TOWER_DRAW = { lanceur: drawLanceur, canon: drawCanon, phare: drawPhare, guirlande: drawGuirlande };
export function makeTowerSprites() {
    const out = {};
    Object.keys(TOWER_DRAW).forEach((k) => {
        out[k] = [0, 1, 2].map((lv) => sprite(48, 70, 24, 62, (x) => TOWER_DRAW[k](x, lv)));
    });
    return out;
}

// ---------------------------------------------------------------- le grand sapin et les cadeaux
export function makeTreeSprite() {
    return sprite(110, 150, 55, 140, (x) => {
        ellipse(x, 0, 0, 44, 9, 'rgba(20,40,80,0.2)');
        x.fillStyle = '#5b3a22';
        x.fillRect(-6, -14, 12, 14);
        [[0, 0.4, 26], [0.25, 0.7, 36], [0.5, 1, 46]].forEach(([a, b, wdt]) => {
            const yt = -122 + 108 * a;
            const yb = -122 + 108 * b;
            x.fillStyle = '#1a5c3d';
            x.beginPath();
            x.moveTo(0, yt);
            x.lineTo(wdt, yb);
            x.lineTo(-wdt, yb);
            x.fill();
            x.fillStyle = '#2b7f54';
            x.beginPath();
            x.moveTo(0, yt);
            x.lineTo(wdt, yb);
            x.lineTo(0, yb);
            x.fill();
        });
        const cols = ['#ff5d5d', '#ffd36e', '#7fe8ff', '#7be0a3'];
        [[-14, -40], [12, -52], [-6, -70], [18, -30], [-24, -24], [4, -88], [-10, -100], [24, -18]].forEach(([bx, by], i) => circle(x, bx, by, 3.2, cols[i % 4]));
        x.fillStyle = '#ffd36e';
        x.beginPath();
        for (let k = 0; k < 10; k++) {
            const a = -Math.PI / 2 + (k * Math.PI) / 5;
            const r = k % 2 ? 4.5 : 10;
            x.lineTo(Math.cos(a) * r, -126 + Math.sin(a) * r);
        }
        x.fill();
    });
}
export function drawGift(ctx, x, y, s, col, ribbon) {
    ctx.fillStyle = col;
    ctx.fillRect(x - 6 * s, y - 10 * s, 12 * s, 10 * s);
    ctx.fillStyle = ribbon;
    ctx.fillRect(x - 1.2 * s, y - 10 * s, 2.4 * s, 10 * s);
    ctx.fillRect(x - 7 * s, y - 12 * s, 14 * s, 3 * s);
}
export const GIFT_COLORS = [['#e94b4b', '#ffd36e'], ['#3b82f6', '#ffffff'], ['#2bb673', '#e94b4b'], ['#b14a7a', '#ffd36e'], ['#ffd36e', '#e94b4b']];

// ---------------------------------------------------------------- décor de la carte (pré-rendu)
function pine(x, px, py, s) {
    ellipse(x, px, py, s * 0.5, s * 0.14, 'rgba(20,40,80,0.16)');
    x.fillStyle = '#5b3a22';
    x.fillRect(px - s * 0.06, py - s * 0.2, s * 0.12, s * 0.2);
    [[0, 0.55, 0.42], [0.3, 0.85, 0.52], [0.55, 1.1, 0.62]].forEach(([a, b, wdt]) => {
        x.fillStyle = '#2b7f54';
        x.beginPath();
        x.moveTo(px, py - s * 1.25 + s * a);
        x.lineTo(px + s * wdt, py - s * 1.25 + s * b);
        x.lineTo(px - s * wdt, py - s * 1.25 + s * b);
        x.fill();
        x.fillStyle = '#f4f9ff';
        x.beginPath();
        x.moveTo(px, py - s * 1.25 + s * a);
        x.lineTo(px + s * wdt * 0.45, py - s * 1.25 + s * (a + (b - a) * 0.45));
        x.lineTo(px - s * wdt * 0.45, py - s * 1.25 + s * (a + (b - a) * 0.45));
        x.fill();
    });
}
function house(x, hx, hy, col) {
    ellipse(x, hx, hy + 2, 36, 6, 'rgba(20,40,80,0.15)');
    x.fillStyle = col;
    x.fillRect(hx - 30, hy - 40, 60, 40);
    x.fillStyle = '#f4f9ff';
    x.beginPath();
    x.moveTo(hx - 38, hy - 38);
    x.lineTo(hx, hy - 66);
    x.lineTo(hx + 38, hy - 38);
    x.fill();
    x.fillStyle = 'rgba(255,207,122,0.95)';
    x.fillRect(hx - 22, hy - 30, 12, 10);
    x.fillRect(hx + 10, hy - 30, 12, 10);
    x.fillStyle = '#5b3a22';
    x.fillRect(hx - 6, hy - 18, 12, 18);
}
export function makeBackground(map) {
    const [c, x] = offscreen(W, H);
    x.fillStyle = '#eaf3fc';
    x.fillRect(0, 0, W, H);
    // petites ombres de neige
    let seed = 7;
    const r = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    for (let i = 0; i < 160; i++) ellipse(x, r() * W, 44 + r() * (H - 44), 10 + r() * 24, 3 + r() * 4, 'rgba(160,190,225,0.12)');
    if (map.lake) {
        const [lx, ly, rx, ry] = map.lake;
        ellipse(x, lx, ly, rx + 6, ry + 5, '#d6e6f5');
        ellipse(x, lx, ly, rx, ry, '#b9dcf5');
        x.strokeStyle = 'rgba(255,255,255,0.8)';
        x.lineWidth = 2;
        x.beginPath();
        x.moveTo(lx - rx * 0.5, ly - ry * 0.2);
        x.lineTo(lx - rx * 0.1, ly - ry * 0.45);
        x.moveTo(lx + rx * 0.1, ly + ry * 0.3);
        x.lineTo(lx + rx * 0.5, ly + ry * 0.05);
        x.stroke();
    }
    // le chemin des monstres
    const trace = () => {
        x.beginPath();
        map.path.forEach(([px, py], i) => (i ? x.lineTo(px, py) : x.moveTo(px, py)));
    };
    x.lineJoin = 'round';
    x.lineCap = 'round';
    x.strokeStyle = '#b7cde6';
    x.lineWidth = PATH_W + 8;
    trace();
    x.stroke();
    x.strokeStyle = '#d3e3f4';
    x.lineWidth = PATH_W;
    trace();
    x.stroke();
    x.strokeStyle = 'rgba(255,255,255,0.75)';
    x.lineWidth = 2;
    x.setLineDash([8, 10]);
    trace();
    x.stroke();
    x.setLineDash([]);
    map.houses.forEach(([hx, hy, col]) => house(x, hx, hy, col));
    map.pines.forEach(([px, py, s]) => pine(x, px, py, s));
    return c;
}

// Halo (lumière du phare la nuit), préparé une fois
export function makeHalo() {
    const [c, x] = offscreen(200, 200);
    const g = x.createRadialGradient(100, 100, 10, 100, 100, 100);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(0.7, 'rgba(0,0,0,0.85)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 200, 200);
    return c;
}
