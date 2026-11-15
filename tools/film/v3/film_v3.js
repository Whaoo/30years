// ================================================================ v3 « conte » (≈ 2 min 11)
// Nouveau début (le livre, la carte du royaume), puis le montage v2 décalé de 23 s, restylé :
// narration en serif de livre, montagnes peintes, aurores en rideaux, grain de film, étalonnage chaud/froid.
// Le triptyque des trois éclats est conservé.
const SHIFT = 23; // la v2 (à partir de 7 s) commence à 30 s
const INTRO = 30;

// ---------------------------------------------------------------- styles « livre » (remplacent ceux de film_lib)
caption = function (ctx, t, a, b, text, y = 120, size = 30) {
    const k = Math.min(ease.out(seg(t, a, a + 0.7)), 1 - seg(t, b - 0.6, b));
    if (k <= 0) return;
    const yy = y > H / 2 ? H - 64 : y;
    ctx.save(); ctx.globalAlpha = k;
    if (yy > H / 2) { const g = ctx.createLinearGradient(0, H - 190, 0, H); g.addColorStop(0, 'rgba(5,8,20,0)'); g.addColorStop(1, 'rgba(5,8,20,0.55)'); ctx.fillStyle = g; ctx.fillRect(0, H - 190, W, 190); }
    ctx.font = `italic 400 ${Math.round(size * 1.18)}px ${BOOK}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 16; ctx.fillStyle = '#fbf3df'; ctx.fillText(text, W / 2, yy + (1 - k) * 8);
    ctx.restore();
};
subtitle = function (ctx, t, a, b, text, who) {
    const k = Math.min(seg(t, a, a + 0.3), 1 - seg(t, b - 0.35, b));
    if (k <= 0) return;
    ctx.save(); ctx.globalAlpha = k;
    const g = ctx.createLinearGradient(0, H - 170, 0, H); g.addColorStop(0, 'rgba(10,6,4,0)'); g.addColorStop(1, 'rgba(10,6,4,0.62)'); ctx.fillStyle = g; ctx.fillRect(0, H - 170, W, 170);
    const n = Math.floor(clamp((t - a) / 0.028, 0, text.length));
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 12;
    if (who) { ctx.font = `600 19px ${BOOK}`; ctx.fillStyle = '#f2cf7a'; ctx.fillText(who.toUpperCase().split('').join(' '), W / 2, H - 98); }
    ctx.font = `400 34px ${BOOK}`; ctx.fillStyle = '#fffaf0';
    // le texte complet sert à centrer, on n'affiche que les lettres déjà « dites »
    const full = ctx.measureText(text).width; ctx.textAlign = 'left'; ctx.fillText(text.slice(0, n), W / 2 - full / 2, H - 62);
    ctx.restore();
};
// montagnes peintes : même signature que la version plate (défilement et parallaxe identiques)
mountains = function (ctx, seed, base, amp, col, cap, offset = 0, step = 160) {
    const list = [];
    const c0 = Math.floor((offset - step) / step), c1 = Math.ceil((offset + W + step) / step);
    for (let i = c0; i <= c1; i++) { const r = rng(seed * 7919 + i * 104729); r(); const px = (i + 0.2 + r() * 0.6) * step - offset; list.push([px, base + 30, step * (1.1 + r() * 0.5), amp * (0.45 + r() * 0.55) + 30, seed * 13 + i]); }
    list.forEach(([x, b, w, h, s]) => peaks(ctx, [[x, b, w, h]], s, cap || '#f4f1ea', mixc(col, 'ffffff', 0.12), col));
    ctx.fillStyle = col; ctx.fillRect(0, base + 28, W, H);
};

// grain de film (3 trames qui alternent à 24 images/s) et étalonnage
const GRAINS = [1, 2, 3].map((s) => { const [c, x] = off(640, 360); const img = x.createImageData(640, 360); const r = rng(s * 99); for (let i = 0; i < img.data.length; i += 4) { const v = r() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; } x.putImageData(img, 0, 0); return c; });
function filmGrain(ctx, t, a = 0.055) { ctx.save(); ctx.globalAlpha = a; ctx.globalCompositeOperation = 'overlay'; ctx.drawImage(GRAINS[Math.floor(t * 24) % 3], 0, 0, W, H); ctx.restore(); }
function grade(ctx, warm) { // warm 1 = coin du feu, -1 = nuit froide
    ctx.save(); ctx.globalCompositeOperation = 'multiply';
    const g = ctx.createLinearGradient(0, 0, W, 0);
    if (warm > 0) { g.addColorStop(0, 'rgba(255,224,190,1)'); g.addColorStop(0.6, 'rgba(240,205,185,1)'); g.addColorStop(1, 'rgba(150,140,185,1)'); }
    else { g.addColorStop(0, 'rgba(205,220,255,1)'); g.addColorStop(1, 'rgba(190,205,245,1)'); }
    ctx.globalAlpha = Math.abs(warm); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
    if (warm > 0) { ctx.save(); ctx.globalCompositeOperation = 'screen'; glow(ctx, 120, 420, 700, 'rgba(255,140,50,A)', 0.28 * warm); ctx.restore(); }
}

// ---------------------------------------------------------------- 0. le livre (0 → 14.6)
let BOOK_IMG = null;
function v3book(ctx, t) {
    if (!BOOK_IMG) { const [c, x] = off(W * 2, H * 2); x.scale(2, 2); frame1(x); BOOK_IMG = c; }
    const push = 1 + 0.08 * ease.sine(seg(t, 0, 10.5));
    const dive = ease.in(seg(t, 10.5, 14.6));
    const z = push * (1 + dive * 5.5);
    const cx = lerp(W / 2, W / 2 + 270, ease.io(seg(t, 9.5, 13))), cy = lerp(H / 2, 360, ease.io(seg(t, 9.5, 13)));
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-cx, -cy); ctx.drawImage(BOOK_IMG, 0, 0, W, H); ctx.restore();
    // la flamme vacille
    const fl = 0.42 + 0.12 * noise(t * 6) + 0.05 * Math.sin(t * 23);
    ctx.save(); ctx.globalCompositeOperation = 'screen'; glow(ctx, W - 105, 400, 300, 'rgba(255,180,90,A)', fl * (1 - dive)); ctx.restore();
    if (t < 1.5) { ctx.fillStyle = `rgba(0,0,0,${1 - seg(t, 0, 1.5)})`; ctx.fillRect(0, 0, W, H); }
}

// ---------------------------------------------------------------- 1. la carte du royaume (14 → 30.6)
let MAP_IMG = null, MAP_NOROUTE = null;
function mapImg(route) {
    if (route && MAP_IMG) return MAP_IMG; if (!route && MAP_NOROUTE) return MAP_NOROUTE;
    const [c, x] = off(W * 2, H * 2); x.scale(2, 2); drawMap(x, route);
    if (route) MAP_IMG = c; else MAP_NOROUTE = c; return c;
}
function mapCam(ctx, img, cx, cy, z, rot = 0) {
    ctx.fillStyle = '#1c120a'; ctx.fillRect(0, 0, W, H);
    const hx = W / (2 * z) + 6, hy = H / (2 * z) + 6; // la caméra ne sort jamais du parchemin
    cx = clamp(cx, Math.min(hx, W / 2), Math.max(W - hx, W / 2)); cy = clamp(cy, Math.min(hy, H / 2), Math.max(H - hy, H / 2));
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(rot); ctx.scale(z, z); ctx.translate(-cx, -cy); ctx.drawImage(img, 0, 0, W, H); ctx.restore();
    return [cx, cy];
}
function ring(ctx, x, y, r, k) { if (k <= 0) return; ctx.save(); ctx.globalAlpha = k; ctx.strokeStyle = '#a5121f'; ctx.lineWidth = 3; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.ellipse(x, y, r * (1.15 - 0.15 * k), r * 0.8 * (1.15 - 0.15 * k), 0, 0, TAU); ctx.stroke(); ctx.restore(); }
function v3map(ctx, t) {
    const lt = t - 14;
    // caméra : de l'igloo (on sort de la gravure) au plan large, puis l'Archipel, puis le nord
    const keys = [[0, 250, 590, 3.2], [3.4, 640, 380, 1.0], [9.2, 640, 380, 1.04], [11.0, 960, 470, 1.7], [12.6, 960, 470, 1.75], [14.4, 1058, 214, 2.3], [16.6, 1058, 214, 5.5]];
    let i = 0; while (i < keys.length - 2 && lt > keys[i + 1][0]) i++;
    const [t0, x0, y0, z0] = keys[i], [t1, x1, y1, z1] = keys[i + 1];
    const k = ease.io(seg(lt, t0, t1));
    const cx = lerp(x0, x1, k), cy = lerp(y0, y1, k), z = Math.exp(lerp(Math.log(z0), Math.log(z1), k));
    ctx.save(); const [mx, my] = mapCam(ctx, mapImg(false), cx, cy, z, -0.012);
    // les lieux s'allument quand on les nomme (dans le repère de la carte)
    ctx.translate(W / 2, H / 2); ctx.rotate(-0.012); ctx.scale(z, z); ctx.translate(-mx, -my);
    ring(ctx, 250, 600, 46, Math.min(seg(lt, 4.6, 5.2), 1 - seg(lt, 7.2, 7.8)));
    ring(ctx, 650, 405, 52, Math.min(seg(lt, 6.4, 7.0), 1 - seg(lt, 8.8, 9.4)));
    ring(ctx, 1010, 515, 90, Math.min(seg(lt, 9.6, 10.2), 1 - seg(lt, 12.4, 13)));
    ring(ctx, 1060, 205, 40, Math.min(seg(lt, 13, 13.6), 1 - seg(lt, 15.6, 16.2)));
    ctx.restore();
    vignette(ctx, 0.55);
    caption(ctx, t, 14.8, 18.4, 'Voici le Royaume du Pôle.', 650, 30);
    caption(ctx, t, 18.6, 23.2, 'Au sud vivait Mamie Banquise ; au centre, le village de Noël et son grand sapin.', 650, 28);
    caption(ctx, t, 23.4, 26.6, 'À l’est, l’Archipel du Tri expédiait les cadeaux de tout le royaume.', 650, 28);
    caption(ctx, t, 26.8, 30.4, 'Et tout au nord se dressait le fort du Golem…', 650, 30);
}

// ---------------------------------------------------------------- 2. le fort du Golem, la nuit (v2 7 → 17.4)
let BOKEH = null;
function v3fort(ctx, tv) {
    const lt = tv - 7, t = tv;
    const push = lerp(1, 1.24, ease.sine(seg(lt, 0, 10.4)));
    const shk = lt > 4 && lt < 6.4 ? 7 * (1 - seg(lt, 4, 6.4) * 0.5) : 0;
    const sx = Math.sin(lt * 61) * shk, sy = Math.cos(lt * 53) * shk;
    ctx.fillStyle = vgrad(ctx, 0, H, [[0, '#020611'], [0.6, '#0b1b36'], [1, '#14325c']]); ctx.fillRect(0, 0, W, H);
    stars(ctx, t, 33, 200, 400);
    curtains(ctx, t, 230, 50, 1.0, 4);
    const k0 = seg(lt, 6.2, 9.8);
    ctx.save(); ctx.translate(W / 2 + sx, 600 + sy); ctx.scale(push, push); ctx.translate(-W / 2, -600);
    peaks(ctx, [[130, 560, 380, 250], [420, 560, 360, 210], [880, 560, 400, 240], [1180, 560, 380, 270]], 71, '#a9c4e6', '#1c3358', '#132746');
    haze(ctx, 570, 120, '30,60,100', 0.6);
    for (let i = 0; i < 3; i++) { ctx.fillStyle = `rgba(150,190,230,${0.07 + i * 0.03})`; ctx.beginPath(); ctx.ellipse(640 + Math.sin(t * 0.3 + i) * 30, 604 - i * 16, 900, 60 + i * 10, 0, 0, TAU); ctx.fill(); }
    const eyes = ease.out(seg(lt, 2.2, 3.0));
    const bk = lt > 3.3 && lt < 3.55 ? Math.sin(seg(lt, 3.3, 3.55) * Math.PI) : 0;
    const glowK = seg(lt, 3.6, 6.2);
    fortress2(ctx, W / 2, 610, 1.1, { eyes, blink: bk, shards: lt < 6.2 ? 3 : 0, glow: glowK * (0.6 + 0.4 * Math.sin(lt * 18)) });
    glow(ctx, W / 2, 420, 380, 'rgba(127,232,255,A)', 0.12 + 0.12 * eyes);
    ctx.fillStyle = '#081426';
    ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(0, 470); ctx.lineTo(110, 520); ctx.lineTo(180, 480); ctx.lineTo(300, 640); ctx.lineTo(340, H); ctx.fill();
    ctx.beginPath(); ctx.moveTo(W, H); ctx.lineTo(W, 440); ctx.lineTo(1160, 500); ctx.lineTo(1100, 470); ctx.lineTo(960, 650); ctx.lineTo(930, H); ctx.fill();
    ctx.restore();
    if (k0 > 0 && k0 < 1) {
        const ends = [[-120, 140], [W / 2 - 40, -160], [W + 140, 160]];
        SOCKETS.forEach(([lx, ly], i) => {
            const wx = W / 2 + lx * 1.1, wy = 610 + ly * 1.1;
            const s0x = W / 2 + (wx - W / 2) * push + sx, s0y = 600 + (wy - 600) * push + sy;
            const [ex, ey] = ends[i]; const k = ease.in(clamp(k0 * 1.15 - i * 0.07));
            const cx = lerp(s0x, ex, 0.5) + (i - 1) * 80, cy = Math.min(s0y, ey) - 240;
            const pos = (kk) => { const u = 1 - kk; return [u * u * s0x + 2 * u * kk * cx + kk * kk * ex, u * u * s0y + 2 * u * kk * cy + kk * kk * ey]; };
            ctx.strokeStyle = 'rgba(160,240,255,0.55)'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath();
            for (let j = 0; j <= 14; j++) { const [px, py] = pos(clamp(k - j * 0.025)); j ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.stroke();
            const [px, py] = pos(k); glowAt(ctx, px, py, 50, 0.7); shard(ctx, px, py, 1.3, k * 9 + i, 1);
        });
    }
    if (lt > 6.1 && lt < 6.8) { ctx.fillStyle = `rgba(200,250,255,${0.55 * (1 - seg(lt, 6.1, 6.8))})`; ctx.fillRect(0, 0, W, H); }
    if (!BOKEH) { const [c, x] = off(); x.filter = 'blur(6px)'; const r = rng(14); for (let i = 0; i < 26; i++) { x.fillStyle = `rgba(230,245,255,${0.3 + r() * 0.4})`; x.beginPath(); x.arc(r() * W, r() * H, 6 + r() * 14, 0, TAU); x.fill(); } BOKEH = c; }
    const by = (t * 22) % H; ctx.drawImage(BOKEH, Math.sin(t * 0.4) * 20, by); ctx.drawImage(BOKEH, Math.sin(t * 0.4) * 20, by - H);
    snowLayer(ctx, t, 23, 70, 60, 1.6, 0.6, 30, -40);
    caption(ctx, tv, 7.6, 12.4, 'Cette nuit-là, le Golem de givre ouvrit les yeux.', 650, 30);
    vignette(ctx, 0.75);
}

// ---------------------------------------------------------------- 7. la carte : le chemin de la quête (v2 76 → 86.4)
const ROUTE = [[[262, 590], [320, 520], [380, 470], [430, 450]], [[430, 450], [520, 420], [580, 400], [640, 410]], [[640, 410], [780, 430], [880, 480], [980, 505]], [[980, 505], [1100, 480], [1130, 330], [1065, 240]]];
const ROUTE_PTS = (() => { const pts = []; ROUTE.forEach(([a, b, c, d]) => { for (let i = 0; i <= 40; i++) { const k = i / 40, u = 1 - k; pts.push([u * u * u * a[0] + 3 * u * u * k * b[0] + 3 * u * k * k * c[0] + k * k * k * d[0], u * u * u * a[1] + 3 * u * u * k * b[1] + 3 * u * k * k * c[1] + k * k * k * d[1]]); } }); return pts; })();
const STOPS = [[430, 450, 'Les Monts Givrés', '1er déc.', 0.25], [650, 410, 'Le village', '8 déc.', 0.5], [1000, 505, 'L’Archipel du Tri', '15 déc.', 0.75], [1062, 236, 'Le fort du Golem', '18 déc.', 1]];
function v3route(ctx, tv) {
    const lt = tv - 76, t = tv;
    const kd = ease.io(seg(lt, 0.8, 7.2));
    const z = lerp(1.25, 1.0, ease.io(seg(lt, 0, 3))), cx = lerp(560, 660, ease.io(seg(lt, 0, 8))), cy = lerp(470, 400, ease.io(seg(lt, 0, 8)));
    const zEnd = ease.io(seg(lt, 8.2, 10.6));
    const Z = z * (1 + zEnd * 2.4), CX = lerp(cx, 410, zEnd), CY = lerp(cy, 440, zEnd);
    const [qx, qy] = mapCam(ctx, mapImg(false), CX, CY, Z, -0.012);
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(-0.012); ctx.scale(Z, Z); ctx.translate(-qx, -qy);
    const n = Math.floor(kd * (ROUTE_PTS.length - 1));
    ctx.strokeStyle = '#a5121f'; ctx.lineWidth = 3.4; ctx.setLineDash([3, 9]); ctx.lineCap = 'round'; ctx.beginPath();
    for (let i = 0; i <= n; i++) i ? ctx.lineTo(...ROUTE_PTS[i]) : ctx.moveTo(...ROUTE_PTS[i]); ctx.stroke(); ctx.setLineDash([]);
    STOPS.forEach(([x, y, name, date, at], i) => {
        const k = ease.back(seg(kd, at - 0.04, at + 0.02) * 1);
        if (k <= 0) return;
        ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
        circle(ctx, 0, 0, 13, '#a5121f'); ctx.font = `400 15px ${SERIF}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.fillText(String(i + 1), 0, 1);
        ctx.fillStyle = 'rgba(241,230,201,0.95)'; ctx.strokeStyle = '#6b5130'; ctx.lineWidth = 1.5; rrect(ctx, -48, 18, 96, 26, 13); ctx.fill(); ctx.stroke();
        ctx.font = `italic 600 16px ${BOOK}`; ctx.fillStyle = '#a5121f'; ctx.fillText(date, 0, 31);
        ctx.restore();
    });
    // Flocon, petit pion sur la carte, part de l'igloo
    const hk = ease.io(seg(lt, 7.4, 8.8));
    const p = ROUTE_PTS[Math.floor(hk * 40)];
    penguin(ctx, p[0], p[1] + 6 - Math.abs(Math.sin(hk * Math.PI * 3)) * 16, 0.32, { mood: 'happy', flipR: -1.4, wave: t * 6 });
    ctx.restore();
    vignette(ctx, 0.55);
    caption(ctx, tv, 77.2, 85.6, 'Quatre étapes, quatre dates… une seule quête.', 650, 30);
}

// ---------------------------------------------------------------- 8. la carte devient paysage, puis le yéti (v2 86 → 98.4)
let LAND = null;
function v3monts(ctx, tv) {
    const lt = tv - 86;
    if (lt >= 4.7) { v2shot8(ctx, tv); return; }
    if (!LAND) { const [c, s] = off(); s.fillStyle = vgrad(s, 0, H, [[0, '#6f8fbf'], [0.55, '#c7d7ec'], [1, '#eef4fb']]); s.fillRect(0, 0, W, H); glow(s, 980, 160, 420, 'rgba(255,235,200,A)', 0.6);
        peaks(s, [[180, 470, 420, 230], [520, 470, 520, 300], [900, 470, 460, 250], [1210, 470, 380, 210]], 61, '#f7f4ee', '#93a6c8', '#7d8fb3'); haze(s, 480, 140, '214,226,242', 0.75);
        peaks(s, [[60, 540, 360, 230], [420, 540, 460, 300], [800, 540, 560, 360], [1180, 540, 420, 260]], 62, '#ffffff', '#7f93b8', '#5d6f92'); haze(s, 560, 120, '226,236,248', 0.6);
        s.fillStyle = '#f4f8fd'; s.beginPath(); s.moveTo(0, 600); s.quadraticCurveTo(640, 540, W, 590); s.lineTo(W, H); s.lineTo(0, H); s.fill();
        for (let i = 0; i < 9; i++) pine(s, 60 + i * 150 + (i % 2) * 30, 620 + (i % 3) * 14, 90 + (i % 3) * 30, '#2b4f4a', '#3a6a60', '#f2f8ff'); LAND = c; }
    const zL = 1.12 - 0.12 * ease.out(seg(lt, 0, 4.7));
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(zL, zL); ctx.translate(-W / 2, -H / 2); ctx.drawImage(LAND, 0, 0); ctx.restore();
    penguin(ctx, lerp(560, 660, ease.io(seg(lt, 1, 4.7))), 640, 1.1, { mood: 'determined', look: 1, wave: tv * 6, tilt: Math.sin(tv * 10) * 0.05 });
    // la carte zoomée sur les Monts Givrés se dissout en diagonale
    const d = ease.io(seg(lt, 0.2, 3.6));
    if (d < 1) {
        const [mp, m] = off(); const Z = 2.2 + d * 1.2; m.save(); m.translate(W / 2, H / 2); m.scale(Z, Z); m.translate(-430, -470); m.drawImage(mapImg(true), 0, 0, W, H); m.restore();
        const [mk, k] = off(); const g = k.createLinearGradient(0, 0, W, H * 0.4); const e = lerp(1.15, -0.25, d);
        g.addColorStop(clamp(e - 0.12), 'rgba(0,0,0,1)'); g.addColorStop(clamp(e + 0.04), 'rgba(0,0,0,0)'); k.fillStyle = g; k.fillRect(0, 0, W, H);
        m.globalCompositeOperation = 'destination-in'; m.drawImage(mk, 0, 0); ctx.drawImage(mp, 0, 0);
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; const eg = ctx.createLinearGradient(0, 0, W, H * 0.4); eg.addColorStop(clamp(e - 0.02), 'rgba(255,220,150,0)'); eg.addColorStop(clamp(e + 0.02), 'rgba(255,220,150,0.35)'); eg.addColorStop(clamp(e + 0.07), 'rgba(255,220,150,0)'); ctx.fillStyle = eg; ctx.fillRect(0, 0, W, H); ctx.restore();
    }
    snowLayer(ctx, tv, 22, 50, 40, 2.2, 0.7, 20, -10);
    caption(ctx, tv, 86.3, 89.6, 'Pour rejoindre le village, il fallait d’abord franchir…', 650, 28);
    caption(ctx, tv, 89.6, 91.2, '… les Monts Givrés.', 650, 32);
    vignette(ctx, 0.4);
}

// ---------------------------------------------------------------- 9. le titre doré (v2 98 → 108)
function v3title(ctx, tv) {
    const lt = tv - 98, t = tv;
    ctx.fillStyle = vgrad(ctx, 0, H, [[0, '#050b1f'], [0.7, '#14244a'], [1, '#2b4a86']]); ctx.fillRect(0, 0, W, H);
    stars(ctx, t, 91, 200, 520);
    curtains(ctx, t, 170, 40, 0.8, 9);
    peaks(ctx, [[120, 630, 360, 200], [430, 630, 300, 150], [850, 630, 340, 170], [1170, 630, 380, 220]], 81, '#cfdcf0', '#2a4372', '#1d3561');
    ctx.fillStyle = '#e6f1fb'; ctx.beginPath(); ctx.moveTo(0, 620); ctx.quadraticCurveTo(640, 580, W, 620); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();
    const gold = (y0, y1) => { const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, '#fff6d6'); g.addColorStop(0.35, '#f2cf7a'); g.addColorStop(0.6, '#c99636'); g.addColorStop(1, '#f6dc95'); return g; };
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    const k1 = ease.out(seg(lt, 0.6, 1.4)); ctx.globalAlpha = k1; ctx.font = `italic 400 34px ${BOOK}`; ctx.fillStyle = '#e9dcc0'; ctx.fillText('~ La Grande Quête de ~', W / 2, 200 + (1 - k1) * 10); ctx.globalAlpha = 1;
    // « Flocon » se révèle de gauche à droite, avec un reflet doré qui passe
    const rv = ease.io(seg(lt, 1.2, 2.6));
    if (rv > 0) {
        // titre dessiné à part : le reflet ne touche que les lettres
        const [tc, x] = off();
        x.textAlign = 'center'; x.textBaseline = 'alphabetic'; x.font = `400 150px ${SERIF}`;
        const g = x.createLinearGradient(0, 220, 0, 360); g.addColorStop(0, '#fff6d6'); g.addColorStop(0.35, '#f2cf7a'); g.addColorStop(0.6, '#c99636'); g.addColorStop(1, '#f6dc95');
        x.fillStyle = g; x.fillText('Flocon', W / 2, 345); x.strokeStyle = 'rgba(255,240,200,0.6)'; x.lineWidth = 1.5; x.strokeText('Flocon', W / 2, 345);
        const sh = (lt - 2.2) * 700; x.globalCompositeOperation = 'source-atop';
        const sg = x.createLinearGradient(300 + sh, 0, 420 + sh, 0); sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,255,255,0.75)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
        x.fillStyle = sg; x.fillRect(0, 200, W, 200);
        ctx.save(); ctx.beginPath(); ctx.rect(0, 200, W * 0.3 + rv * W * 0.45, 200); ctx.clip();
        ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 24; ctx.drawImage(tc, 0, 0); ctx.restore();
    }
    const k2 = ease.out(seg(lt, 2.4, 3.0));
    if (k2 > 0) { ctx.globalAlpha = k2; ctx.strokeStyle = '#d9b46a'; ctx.lineWidth = 2; [-1, 1].forEach((d) => { ctx.beginPath(); ctx.moveTo(W / 2 + d * 60, 385); ctx.bezierCurveTo(W / 2 + d * 160, 370, W / 2 + d * 220, 405, W / 2 + d * (60 + 240 * k2), 385); ctx.stroke(); }); starShape(ctx, W / 2, 388, 10, '#f2cf7a');
        ctx.font = `400 30px ${BOOK}`; ctx.fillStyle = '#ffffff'; ctx.fillText('Épisode 1 · Les Monts Givrés', W / 2, 440); ctx.globalAlpha = 1; }
    const k3 = ease.back(seg(lt, 3.2, 3.8));
    if (k3 > 0) { ctx.save(); ctx.translate(W / 2, 520); ctx.scale(k3, k3); ctx.fillStyle = 'rgba(255,211,110,0.16)'; rrect(ctx, -150, -30, 300, 58, 29); ctx.fill(); ctx.strokeStyle = '#f2cf7a'; ctx.lineWidth = 2; rrect(ctx, -150, -30, 300, 58, 29); ctx.stroke();
        ctx.font = `italic 600 28px ${BOOK}`; ctx.fillStyle = '#ffe9b0'; ctx.textBaseline = 'middle'; ctx.fillText('À toi de jouer !', 0, 0); ctx.restore(); }
    const kp = ease.back(seg(lt, 1.8, 2.5));
    if (kp > 0) penguin(ctx, W / 2 + 360, 640 + (1 - kp) * 120, 1.25, { mood: 'happy', flipR: -2.3 + Math.sin(t * 8) * 0.4, wave: t * 5 });
    snowLayer(ctx, t, 26, 90, 40, 2, 0.8, 22, -10);
    if (lt < 0.9) { ctx.fillStyle = `rgba(255,255,255,${1 - seg(lt, 0, 0.9)})`; ctx.fillRect(0, 0, W, H); }
    vignette(ctx, 0.55);
}

// ---------------------------------------------------------------- montage
const V3 = [
    { a: 7, b: 17.4, f: v3fort }, { a: 17, b: 21.4, f: v2shot2b }, { a: 21, b: 25.6, f: v2shot3 }, { a: 25, b: 48.4, f: v2shot4, warm: 1 },
    { a: 48, b: 64.4, f: v2shot5, warm: 1 }, { a: 64, b: 76.4, f: v2shot6 }, { a: 76, b: 86.4, f: v3route }, { a: 86, b: 98.4, f: v3monts }, { a: 98, b: 108.1, f: v3title }
];
const DURATION3 = 108 + SHIFT;
function drawShot(ctx, s, tv) { s.f(ctx, tv); if (s.warm) grade(ctx, 0.85); }
function renderFilm3(ctx, t, buf) {
    ctx.save(); ctx.setTransform(ctx.canvas.width / W, 0, 0, ctx.canvas.height / H, 0, 0);
    if (t < INTRO + 0.6) {
        if (t < 14.6) {
            v3book(ctx, t);
            if (t > 14) { const b = buf.getContext('2d'); b.setTransform(buf.width / W, 0, 0, buf.height / H, 0, 0); v3map(b, t); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = ease.sine(seg(t, 14, 14.6)); ctx.drawImage(buf, 0, 0, ctx.canvas.width, ctx.canvas.height); ctx.globalAlpha = 1; }
        } else {
            v3map(ctx, t);
            if (t > INTRO) { const b = buf.getContext('2d'); b.setTransform(buf.width / W, 0, 0, buf.height / H, 0, 0); v3fort(b, t - SHIFT); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = ease.sine(seg(t, INTRO, INTRO + 0.6)); ctx.drawImage(buf, 0, 0, ctx.canvas.width, ctx.canvas.height); ctx.globalAlpha = 1; }
        }
    } else {
        const tv = t - SHIFT;
        const active = V3.filter((s) => tv >= s.a && tv < s.b);
        if (!active.length) active.push(V3[V3.length - 1]);
        drawShot(ctx, active[0], tv);
        if (active[1]) {
            const s = active[1], k = seg(tv, s.a, active[0].b);
            const b = buf.getContext('2d'); b.setTransform(buf.width / W, 0, 0, buf.height / H, 0, 0); b.clearRect(0, 0, W, H);
            drawShot(b, s, tv);
            ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = ease.sine(k); ctx.drawImage(buf, 0, 0, ctx.canvas.width, ctx.canvas.height); ctx.globalAlpha = 1;
        }
    }
    ctx.setTransform(ctx.canvas.width / W, 0, 0, ctx.canvas.height / H, 0, 0);
    filmGrain(ctx, t);
    ctx.restore();
}
