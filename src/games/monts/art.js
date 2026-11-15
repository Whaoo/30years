import { TAU, circle, ellipse, roundRect } from '../draw';

// Décors et personnages des Monts Givrés. Les fonds sont dessinés UNE fois dans des canvas
// hors écran (2× la résolution logique, pour rester nets) puis simplement recopiés à chaque image.

export const W = 800;
export const H = 450;
const RES = 2;

function off(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.round(w * RES);
    c.height = Math.round(h * RES);
    const ctx = c.getContext('2d');
    ctx.scale(RES, RES);
    return [c, ctx];
}

// Petit générateur déterministe pour le décor (le décor ne dépend pas de la graine du jour)
function prng(seed) {
    let s = seed >>> 0 || 1;
    return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function ridge(ctx, w, base, amp, step, seed, color, cap) {
    const r = prng(seed);
    const pts = [];
    for (let x = -step; x <= w + step; x += step) pts.push([x + r() * step * 0.4, base - amp * (0.35 + r() * 0.65)]);
    ctx.beginPath();
    ctx.moveTo(-10, H);
    pts.forEach(([x, y], i) => {
        if (i) ctx.lineTo(x - step * 0.5, base - amp * 0.15 * (1 + Math.sin(i * 2.3)));
        ctx.lineTo(x, y);
    });
    ctx.lineTo(w + 10, H);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    if (cap) {
        ctx.fillStyle = cap;
        pts.forEach(([x, y]) => {
            const hh = (base - y) * 0.3;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + hh * 0.8, y + hh);
            ctx.lineTo(x + hh * 0.3, y + hh * 0.8);
            ctx.lineTo(x, y + hh * 1.05);
            ctx.lineTo(x - hh * 0.35, y + hh * 0.8);
            ctx.lineTo(x - hh * 0.8, y + hh);
            ctx.closePath();
            ctx.fill();
        });
    }
}

const THEMES = {
    valley: { sky: ['#7fc0f2', '#cde7fb'], far: '#9fb9dc', near: '#7f9fcf', cap: '#f4f9ff' },
    cave: { sky: ['#0b1730', '#13284a'], far: '#1a3358', near: '#21406b', cap: '#6fb3e6' },
    blizzard: { sky: ['#a9bdd6', '#e3ebf5'], far: '#b9c7dc', near: '#9fb2cf', cap: '#ffffff' },
    boss: { sky: ['#1b2550', '#5b4f8f'], far: '#3b4a82', near: '#4a5c99', cap: '#e8f2ff' }
};

// Fond : ciel fixe + deux chaînes de montagnes en boucle (parallaxe)
export function makeBackdrop(theme) {
    const t = THEMES[theme];
    const [sky, sctx] = off(W, H);
    const g = sctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, t.sky[0]);
    g.addColorStop(1, t.sky[1]);
    sctx.fillStyle = g;
    sctx.fillRect(0, 0, W, H);
    if (theme === 'boss') {
        const r = prng(9);
        for (let i = 0; i < 70; i++) circle(sctx, r() * W, r() * 230, 0.6 + r() * 1.4, `rgba(255,251,230,${0.4 + r() * 0.6})`);
        circle(sctx, 650, 90, 34, '#fff3c8');
    }
    if (theme === 'valley') {
        circle(sctx, 660, 80, 40, 'rgba(255,248,210,0.9)');
    }
    const LW = 1600;
    const [far, fctx] = off(LW, H);
    const [near, nctx] = off(LW, H);
    if (theme === 'cave') {
        // stalactites et cristaux au lieu des montagnes
        const r = prng(4);
        fctx.fillStyle = t.far;
        for (let x = 0; x < LW; x += 40 + r() * 50) {
            const h = 40 + r() * 110;
            fctx.beginPath();
            fctx.moveTo(x - 18, 0);
            fctx.lineTo(x, h);
            fctx.lineTo(x + 18, 0);
            fctx.fill();
        }
        nctx.fillStyle = t.near;
        for (let x = 0; x < LW; x += 70 + r() * 80) {
            const h = 30 + r() * 70;
            nctx.beginPath();
            nctx.moveTo(x - 30, H);
            nctx.lineTo(x, H - 60 - h);
            nctx.lineTo(x + 30, H);
            nctx.fill();
            nctx.fillStyle = 'rgba(111,179,230,0.35)';
            nctx.beginPath();
            nctx.moveTo(x, H - 60 - h);
            nctx.lineTo(x + 30, H);
            nctx.lineTo(x + 8, H);
            nctx.fill();
            nctx.fillStyle = t.near;
        }
    } else {
        ridge(fctx, LW, 300, 170, 170, 3, t.far, t.cap);
        ridge(nctx, LW, 350, 110, 130, 7, t.near, t.cap);
    }
    return { sky, far, near, LW };
}

export function drawBackdrop(ctx, bd, camX) {
    ctx.drawImage(bd.sky, 0, 0, W, H);
    const layer = (img, k) => {
        const x = -((camX * k) % bd.LW);
        ctx.drawImage(img, x, 0, bd.LW, H);
        if (x + bd.LW < W) ctx.drawImage(img, x + bd.LW, 0, bd.LW, H);
    };
    layer(bd.far, 0.15);
    layer(bd.near, 0.35);
}

// Halo de lumière (pour la grotte) : un dégradé dessiné une fois, recopié et agrandi ensuite
export function makeHalo() {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(0.55, 'rgba(0,0,0,0.85)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 128, 128);
    return c;
}

// Couche de neige du blizzard : traits pré-dessinés, qu'on fait défiler
export function makeSnowLayer(seed, n, len, alpha) {
    const [c, x] = off(W, H);
    const r = prng(seed);
    x.strokeStyle = `rgba(255,255,255,${alpha})`;
    x.lineCap = 'round';
    for (let i = 0; i < n; i++) {
        const px = r() * W;
        const py = r() * H;
        x.lineWidth = 1 + r() * 2;
        x.beginPath();
        x.moveTo(px, py);
        x.lineTo(px - len * (0.6 + r() * 0.8), py + len * 0.25);
        x.stroke();
    }
    return c;
}

export function drawScrolling(ctx, img, ox, oy) {
    const x = ((ox % W) + W) % W;
    const y = ((oy % H) + H) % H;
    for (const dx of [x - W, x]) for (const dy of [y - H, y]) ctx.drawImage(img, dx, dy, W, H);
}

// ---------------------------------------------------------------- éléments du niveau
export function drawGround(ctx, x, w, theme) {
    const top = theme === 'cave' ? '#3e6a9a' : '#f4f9ff';
    const body = theme === 'cave' ? '#1c3557' : '#b9cde8';
    ctx.fillStyle = body;
    ctx.fillRect(x, 396, w, 60);
    ctx.fillStyle = top;
    roundRect(ctx, x, 388, w, 14, 6);
    ctx.fill();
    ctx.fillStyle = theme === 'cave' ? 'rgba(127,200,255,0.25)' : 'rgba(120,150,190,0.25)';
    ctx.fillRect(x, 402, w, 4);
}

export function drawPlatform(ctx, p, theme, t) {
    let y = p.y;
    if (p.k === 'crack' && p.shake > 0) y += Math.sin(t * 60) * 1.5;
    if (p.k === 'snow') {
        ctx.fillStyle = theme === 'cave' ? '#2a4a75' : '#dfeaf8';
        roundRect(ctx, p.x, y, p.w, 18, 8);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        roundRect(ctx, p.x, y - 3, p.w, 9, 5);
        ctx.fill();
        return;
    }
    ctx.fillStyle = '#5aa7e0';
    roundRect(ctx, p.x, y, p.w, 16, 8);
    ctx.fill();
    ctx.fillStyle = '#a9dcff';
    roundRect(ctx, p.x + 4, y + 2, p.w - 8, 6, 3);
    ctx.fill();
    if (p.k === 'crack') {
        ctx.strokeStyle = '#1d4f86';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const m = p.x + p.w / 2;
        ctx.moveTo(m - 10, y + 1);
        ctx.lineTo(m, y + 9);
        ctx.lineTo(m - 4, y + 15);
        ctx.moveTo(m + 12, y + 2);
        ctx.lineTo(m + 4, y + 9);
        ctx.stroke();
    }
}

export function drawBlock(ctx, b, theme) {
    const h = 396 - b.y;
    ctx.fillStyle = theme === 'cave' ? '#22426c' : '#cfe0f4';
    roundRect(ctx, b.x, b.y, b.w, h + 6, 10);
    ctx.fill();
    ctx.fillStyle = theme === 'cave' ? '#3e6a9a' : '#ffffff';
    roundRect(ctx, b.x - 2, b.y - 4, b.w + 4, 14, 7);
    ctx.fill();
    ctx.fillStyle = 'rgba(80,110,160,0.18)';
    ctx.fillRect(b.x + b.w * 0.65, b.y + 12, b.w * 0.35 - 4, h - 12);
}

export function drawCeiling(ctx, c, theme) {
    ctx.fillStyle = theme === 'cave' ? '#2a4f7e' : '#8fc6ef';
    ctx.fillRect(c.x, -10, c.w, c.y + 10);
    ctx.fillStyle = theme === 'cave' ? '#5d9bd6' : '#c9ecff';
    for (let x = c.x + 8; x < c.x + c.w - 6; x += 18) {
        ctx.beginPath();
        ctx.moveTo(x - 7, c.y);
        ctx.lineTo(x, c.y + 10);
        ctx.lineTo(x + 7, c.y);
        ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(c.x + 6, c.y - 18, c.w - 12, 5);
}

export function drawSpikes(ctx, s) {
    ctx.fillStyle = '#bfe6ff';
    for (let x = s.x; x < s.x + s.w - 4; x += 14) {
        ctx.beginPath();
        ctx.moveTo(x, s.y);
        ctx.lineTo(x + 7, s.y - 20);
        ctx.lineTo(x + 14, s.y);
        ctx.fill();
    }
    ctx.fillStyle = '#7fc4f0';
    for (let x = s.x; x < s.x + s.w - 4; x += 14) {
        ctx.beginPath();
        ctx.moveTo(x + 7, s.y - 20);
        ctx.lineTo(x + 14, s.y);
        ctx.lineTo(x + 7, s.y);
        ctx.fill();
    }
}

export function drawSpring(ctx, sp) {
    const k = sp.squash || 0;
    ctx.fillStyle = '#e94b4b';
    roundRect(ctx, sp.x - 18, sp.y - 8, 36, 8, 3);
    ctx.fill();
    ctx.strokeStyle = '#c9d4e6';
    ctx.lineWidth = 3;
    ctx.beginPath();
    const top = sp.y - 22 + k * 10;
    for (let i = 0; i <= 4; i++) ctx.lineTo(sp.x + (i % 2 ? 10 : -10), sp.y - 8 - (i / 4) * (sp.y - 8 - top));
    ctx.stroke();
    ctx.fillStyle = '#ffd36e';
    roundRect(ctx, sp.x - 18, top - 7, 36, 8, 3);
    ctx.fill();
}

export function drawFish(ctx, x, y, gold, t) {
    const bob = Math.sin(t * 3 + x * 0.05) * 2;
    ctx.save();
    ctx.translate(x, y + bob);
    if (gold) {
        ctx.globalAlpha = 0.35 + 0.15 * Math.sin(t * 5);
        circle(ctx, 0, 0, 18, '#ffe9a0');
        ctx.globalAlpha = 1;
    }
    const s = gold ? 1.4 : 1;
    ctx.scale(s, s);
    ellipse(ctx, 0, 0, 10, 6, gold ? '#ffb020' : '#ffd36e');
    ctx.fillStyle = gold ? '#ffb020' : '#ffd36e';
    ctx.beginPath();
    ctx.moveTo(-8, 0);
    ctx.lineTo(-15, -6);
    ctx.lineTo(-15, 6);
    ctx.closePath();
    ctx.fill();
    circle(ctx, 5, -1.5, 1.6, '#1d2542');
    ctx.restore();
}

export function drawGift(ctx, x, y, t) {
    const bob = Math.sin(t * 2.5) * 3;
    ctx.save();
    ctx.translate(x, y + bob);
    ctx.globalAlpha = 0.3 + 0.15 * Math.sin(t * 4);
    circle(ctx, 0, 0, 24, '#c9b6ff');
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#7b61ff';
    roundRect(ctx, -12, -10, 24, 22, 4);
    ctx.fill();
    ctx.fillStyle = '#ffd36e';
    ctx.fillRect(-2.5, -10, 5, 22);
    ctx.fillRect(-12, -2, 24, 5);
    ctx.fillStyle = '#9d8bff';
    roundRect(ctx, -14, -15, 28, 7, 3);
    ctx.fill();
    ctx.restore();
}

export function drawFlag(ctx, x, name, reached, t, colors) {
    ctx.fillStyle = '#6b4226';
    ctx.fillRect(x - 2, 300, 4, 90);
    const wave = Math.sin(t * 5) * 3;
    ctx.fillStyle = reached ? '#2bb673' : '#8aa0c0';
    ctx.beginPath();
    ctx.moveTo(x + 2, 302);
    ctx.quadraticCurveTo(x + 24, 306 + wave, x + 40, 312);
    ctx.quadraticCurveTo(x + 22, 318 - wave, x + 2, 324);
    ctx.fill();
    if (name) {
        ctx.font = '700 11px "DM Sans", system-ui, sans-serif';
        const w = ctx.measureText(name).width + 14;
        roundRect(ctx, x + 10 - w / 2 + 22, 398, w, 18, 9);
        ctx.fillStyle = 'rgba(255,255,255,0.92)';
        ctx.fill();
        ctx.fillStyle = '#1d2542';
        ctx.textAlign = 'center';
        ctx.fillText(name, x + 32, 411);
        ctx.textAlign = 'left';
    }
    return colors;
}

export function drawSign(ctx, x, label, key, theme) {
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.font = '800 13px "Bricolage Grotesque", "DM Sans", system-ui, sans-serif';
    const kw = key ? ctx.measureText(key).width + 16 : 0;
    ctx.font = '600 13px "DM Sans", system-ui, sans-serif';
    const lw = ctx.measureText(label).width;
    const w = kw + lw + (key ? 28 : 20);
    ctx.fillStyle = '#6b4226';
    ctx.fillRect(x + w / 2 - 3, 340, 6, 50);
    roundRect(ctx, x, 304, w, 36, 10);
    ctx.fillStyle = theme === 'cave' ? 'rgba(12,22,46,0.88)' : 'rgba(20,30,60,0.82)';
    ctx.fill();
    let cx = x + 10;
    if (key) {
        roundRect(ctx, cx, 312, kw, 20, 6);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.font = '800 13px "Bricolage Grotesque", "DM Sans", system-ui, sans-serif';
        ctx.fillStyle = '#1d2542';
        ctx.fillText(key, cx + 8, 327);
        cx += kw + 8;
    }
    ctx.font = '600 13px "DM Sans", system-ui, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(label, cx, 327);
}

// ---------------------------------------------------------------- ennemis
export function drawSnowman(ctx, e, t) {
    ctx.save();
    ctx.translate(e.x, e.y);
    if (e.dead) ctx.scale(1.3, Math.max(0.15, 1 - e.dead * 3));
    const bob = e.dead ? 0 : Math.abs(Math.sin(t * 6 + e.x)) * 2;
    ellipse(ctx, 0, 2, 18, 4, 'rgba(20,40,80,0.18)');
    circle(ctx, 0, -14 - bob, 16, '#ffffff');
    circle(ctx, 0, -38 - bob, 11, '#ffffff');
    ctx.fillStyle = '#1d2542';
    ctx.fillRect(-9, -56 - bob, 18, 6);
    ctx.fillRect(-6, -68 - bob, 12, 13);
    ctx.strokeStyle = '#1d2542';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-7 * e.dir - 2, -45 - bob);
    ctx.lineTo(-1 * e.dir, -42 - bob);
    ctx.moveTo(7 * e.dir - 2, -42 - bob);
    ctx.stroke();
    circle(ctx, -4 + 3 * e.dir, -39 - bob, 1.8, '#1d2542');
    circle(ctx, 4 + 3 * e.dir, -39 - bob, 1.8, '#1d2542');
    ctx.fillStyle = '#ff9f43';
    ctx.beginPath();
    ctx.moveTo(2 * e.dir, -36 - bob);
    ctx.lineTo(12 * e.dir, -34 - bob);
    ctx.lineTo(2 * e.dir, -32 - bob);
    ctx.fill();
    ctx.strokeStyle = '#6b4226';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-14, -18 - bob);
    ctx.lineTo(-26, -28 - bob + Math.sin(t * 8) * 3);
    ctx.moveTo(14, -18 - bob);
    ctx.lineTo(26, -26 - bob - Math.sin(t * 8) * 3);
    ctx.stroke();
    ctx.restore();
}

export function drawBat(ctx, e, t) {
    const f = Math.sin(t * 18 + e.x) * 0.8;
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.fillStyle = '#4b3a7a';
    for (const d of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(d * 14, -10 - f * 10, d * 26, -2 - f * 12);
        ctx.quadraticCurveTo(d * 18, 2, d * 14, 6);
        ctx.quadraticCurveTo(d * 8, 2, 0, 4);
        ctx.fill();
    }
    ellipse(ctx, 0, 0, 9, 8, '#5d4a92');
    circle(ctx, -3, -1, 2, '#ffd36e');
    circle(ctx, 3, -1, 2, '#ffd36e');
    ctx.restore();
}

export function drawGull(ctx, e, t) {
    const a = Math.sin(t * 14 + e.x * 0.1) * 0.9;
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.scale(-1, 1);
    ctx.fillStyle = '#d3dce8';
    ctx.beginPath();
    ctx.moveTo(-4, -2);
    ctx.quadraticCurveTo(-20, -18 - a * 14, -36, -6 - a * 18);
    ctx.quadraticCurveTo(-20, -2, -4, 4);
    ctx.fill();
    ellipse(ctx, 0, 0, 16, 9, '#ffffff');
    circle(ctx, 13, -7, 7, '#ffffff');
    circle(ctx, 15, -8, 1.6, '#14172b');
    ctx.fillStyle = '#ff9f43';
    ctx.beginPath();
    ctx.moveTo(19, -7);
    ctx.lineTo(28, -5);
    ctx.lineTo(19, -3);
    ctx.fill();
    ctx.fillStyle = '#e3eaf3';
    ctx.beginPath();
    ctx.moveTo(-4, 0);
    ctx.quadraticCurveTo(-18, 12 + a * 12, -32, 4 + a * 18);
    ctx.quadraticCurveTo(-18, 3, -4, 5);
    ctx.fill();
    ctx.restore();
}

export function drawStalactite(ctx, e) {
    ctx.save();
    ctx.translate(e.x + (e.shake > 0 ? Math.sin(e.shake * 80) * 2 : 0), e.y);
    ctx.fillStyle = '#9fdcff';
    ctx.beginPath();
    ctx.moveTo(-12, 0);
    ctx.lineTo(0, 46);
    ctx.lineTo(12, 0);
    ctx.fill();
    ctx.fillStyle = '#e6f7ff';
    ctx.beginPath();
    ctx.moveTo(-4, 0);
    ctx.lineTo(0, 30);
    ctx.lineTo(4, 0);
    ctx.fill();
    ctx.restore();
}

// ---------------------------------------------------------------- le yéti (boss)
// Silhouette trapue, fourrure crème, visage gris-violet : un personnage du projet, pas une imitation
export function drawYeti(ctx, y, t) {
    ctx.save();
    ctx.translate(y.x, y.y);
    ctx.scale(y.dir, 1);
    const breathe = y.state === 'tired' ? Math.sin(t * 9) * 0.04 : Math.sin(t * 2.4) * 0.015;
    const crouch = y.crouch || 0;
    ctx.scale(1 + crouch * 0.12, 1 + breathe - crouch * 0.15);
    ellipse(ctx, 0, 2, 70, 10, 'rgba(10,20,50,0.25)');
    const fur = y.flash > 0 ? '#ffd0d0' : '#f3efe6';
    const shade = y.flash > 0 ? '#f0b0b0' : '#ddd6c6';
    // pieds
    ellipse(ctx, -26, -4, 22, 10, '#8c86a8');
    ellipse(ctx, 26, -4, 22, 10, '#8c86a8');
    // corps
    ctx.fillStyle = fur;
    ctx.beginPath();
    ctx.moveTo(-66, -14);
    ctx.quadraticCurveTo(-84, -96, -50, -132);
    ctx.quadraticCurveTo(0, -158, 50, -132);
    ctx.quadraticCurveTo(84, -96, 66, -14);
    ctx.quadraticCurveTo(0, 4, -66, -14);
    ctx.fill();
    ctx.fillStyle = shade;
    for (let i = 0; i < 8; i++) {
        const fx = -56 + i * 16;
        ctx.beginPath();
        ctx.moveTo(fx - 8, -12);
        ctx.lineTo(fx, -2 + (i % 2) * 4);
        ctx.lineTo(fx + 8, -12);
        ctx.fill();
    }
    ellipse(ctx, 0, -62, 36, 40, 'rgba(200,190,170,0.35)');
    // bras
    const arm = y.arm || 0;
    for (const d of [-1, 1]) {
        ctx.save();
        ctx.translate(d * 56, -96);
        ctx.rotate(d * (0.3 + arm * (d === 1 ? 1.8 : 0.6)));
        ctx.fillStyle = shade;
        ctx.beginPath();
        ctx.moveTo(-14, 0);
        ctx.quadraticCurveTo(d * 26, 30, d * 12, 72);
        ctx.quadraticCurveTo(0, 84, -d * 10, 70);
        ctx.quadraticCurveTo(-8, 30, 14, 0);
        ctx.fill();
        ellipse(ctx, d * 2, 74, 13, 10, '#8c86a8');
        ctx.restore();
    }
    // visage
    ctx.fillStyle = '#8c86a8';
    ctx.beginPath();
    ctx.moveTo(-34, -126);
    ctx.quadraticCurveTo(0, -146, 34, -126);
    ctx.quadraticCurveTo(40, -92, 0, -86);
    ctx.quadraticCurveTo(-40, -92, -34, -126);
    ctx.fill();
    const sad = y.state === 'sulk';
    const tired = y.state === 'tired';
    if (tired) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-18, -114);
        ctx.lineTo(-6, -112);
        ctx.moveTo(6, -112);
        ctx.lineTo(18, -114);
        ctx.stroke();
    } else {
        circle(ctx, -12, -114, 6, '#ffffff');
        circle(ctx, 12, -114, 6, '#ffffff');
        circle(ctx, -10, -113, 3, '#1d2542');
        circle(ctx, 14, -113, 3, '#1d2542');
    }
    ctx.strokeStyle = '#2a2440';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (sad) {
        ctx.moveTo(-22, -124);
        ctx.lineTo(-8, -128);
        ctx.moveTo(22, -124);
        ctx.lineTo(8, -128);
    } else {
        ctx.moveTo(-22, -128);
        ctx.lineTo(-6, -121);
        ctx.moveTo(22, -128);
        ctx.lineTo(6, -121);
    }
    ctx.stroke();
    const roar = y.roar || 0;
    if (roar > 0.05 || tired) {
        const oh = tired ? 6 + Math.sin(t * 9) * 2 : 4 + roar * 12;
        ellipse(ctx, 0, -99, 12, oh, '#2a2440');
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(-8, -99 - oh + 1);
        ctx.lineTo(-5, -99 - oh + 7);
        ctx.lineTo(-2, -99 - oh + 1);
        ctx.moveTo(2, -99 - oh + 1);
        ctx.lineTo(5, -99 - oh + 7);
        ctx.lineTo(8, -99 - oh + 1);
        ctx.fill();
    } else {
        ctx.strokeStyle = '#2a2440';
        ctx.lineWidth = 3;
        ctx.beginPath();
        if (sad) {
            ctx.moveTo(-9, -96);
            ctx.quadraticCurveTo(0, -102, 9, -96);
        } else {
            ctx.moveTo(-9, -100);
            ctx.quadraticCurveTo(0, -96, 9, -100);
        }
        ctx.stroke();
    }
    // l'éclat de givre, planté sur le front (il lui donne mal au crâne)
    if (y.shard) {
        ctx.save();
        ctx.translate(0, -146);
        ctx.globalAlpha = 0.4 + 0.2 * Math.sin(t * 6);
        circle(ctx, 0, 0, 16, '#7fe8ff');
        ctx.globalAlpha = 1;
        drawShardShape(ctx, 0, 0, 1);
        ctx.restore();
    }
    ctx.restore();
}

export function drawShardShape(ctx, x, y, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.fillStyle = '#bff4ff';
    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.lineTo(7, 0);
    ctx.lineTo(0, 14);
    ctx.lineTo(-7, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.lineTo(7, 0);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

export function drawHeart(ctx, x, y, s, full) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.beginPath();
    ctx.moveTo(0, 4);
    ctx.bezierCurveTo(-10, -4, -6, -12, 0, -6);
    ctx.bezierCurveTo(6, -12, 10, -4, 0, 4);
    ctx.fillStyle = full ? '#ff5d73' : 'rgba(255,255,255,0.25)';
    ctx.fill();
    ctx.restore();
}

export { TAU };
