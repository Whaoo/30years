// Maquettes « conte réaliste » du prologue v3 : images fixes, pour valider la direction artistique.
// Réutilise les personnages du film (film_lib.js / film_v2_*.js) et ajoute lumière, matière, profondeur.
const SERIF = '"Gloock", "Crimson Pro", Georgia, serif';
const BOOK = '"Crimson Pro", Georgia, serif';

function off(w = W, h = H) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function grain(ctx, a = 0.06, seed = 1) {
    const [c, x] = off(640, 360); const img = x.createImageData(640, 360); const r = rng(seed);
    for (let i = 0; i < img.data.length; i += 4) { const v = r() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
    x.putImageData(img, 0, 0); ctx.save(); ctx.globalAlpha = a; ctx.globalCompositeOperation = 'overlay'; ctx.drawImage(c, 0, 0, W, H); ctx.restore();
}
function bloom(ctx, src, px = 24, a = 0.55) { ctx.save(); ctx.filter = `blur(${px}px)`; ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a; ctx.drawImage(src, 0, 0); ctx.restore(); }
function blurred(ctx, px, fn) { const [c, x] = off(); fn(x); ctx.save(); ctx.filter = `blur(${px}px)`; ctx.drawImage(c, 0, 0); ctx.restore(); }
function vig(ctx, a = 0.6, col = '0,0,0') { const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.95); g.addColorStop(0, `rgba(${col},0)`); g.addColorStop(1, `rgba(${col},${a})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
function narr(ctx, text, y = 640, size = 34) { // narration de conte : serif italique, ombre douce, sans bandeau
    ctx.save(); ctx.font = `italic 400 ${size}px ${BOOK}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.75)'; ctx.shadowBlur = 18; ctx.fillStyle = '#fbf3df'; ctx.fillText(text, W / 2, y);
    ctx.shadowBlur = 0; ctx.restore();
}
function label(ctx, text, x, y, size = 18, col = '#3b2a17', font = BOOK, style = 'italic 600') {
    ctx.save(); ctx.font = `${style} ${size}px ${font}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = col; ctx.fillText(text, x, y); ctx.restore();
}
// côte naturelle : polygone déformé par déplacement du point milieu
function coast(cx, cy, rx, ry, seed, rough = 0.28, n = 7) {
    const r = rng(seed); let pts = [];
    for (let i = 0; i < 9; i++) { const a = (i / 9) * TAU; const k = 0.75 + r() * 0.4; pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); }
    for (let it = 0; it < n; it++) {
        const np = []; for (let i = 0; i < pts.length; i++) { const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length]; const d = Math.hypot(bx - ax, by - ay);
            np.push([ax, ay], [(ax + bx) / 2 + (r() - 0.5) * d * rough, (ay + by) / 2 + (r() - 0.5) * d * rough]); }
        pts = np;
    }
    return pts;
}
function polyPath(ctx, pts) { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); }
function mountGlyph(ctx, x, y, s, snow = true) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = '#9b8a6c'; ctx.beginPath(); ctx.moveTo(-22, 0); ctx.lineTo(0, -34); ctx.lineTo(24, 0); ctx.fill();
    ctx.fillStyle = '#6f5f45'; ctx.beginPath(); ctx.moveTo(0, -34); ctx.lineTo(24, 0); ctx.lineTo(6, 0); ctx.fill();
    if (snow) { ctx.fillStyle = '#fbf6ea'; ctx.beginPath(); ctx.moveTo(0, -34); ctx.lineTo(-8, -21); ctx.lineTo(-2, -24); ctx.lineTo(3, -19); ctx.lineTo(9, -22); ctx.closePath(); ctx.fill(); }
    ctx.strokeStyle = 'rgba(60,45,25,0.6)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-22, 0); ctx.lineTo(0, -34); ctx.lineTo(24, 0); ctx.stroke();
    ctx.restore();
}
function treeGlyph(ctx, x, y, s) { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = '#4f6b4a'; ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(7, 0); ctx.lineTo(-7, 0); ctx.fill(); ctx.fillStyle = '#3d5539'; ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(7, 0); ctx.lineTo(1, 0); ctx.fill(); ctx.restore(); }
function compass(ctx, x, y, r) {
    ctx.save(); ctx.translate(x, y); ctx.strokeStyle = '#6b5130'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, r * 0.82, 0, TAU); ctx.stroke();
    for (let i = 0; i < 8; i++) { const a = (i * TAU) / 8 - Math.PI / 2, l = i % 2 ? r * 0.55 : r * 1.05; ctx.fillStyle = i % 2 ? '#c9a46a' : (i === 0 ? '#a5121f' : '#6b5130');
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * l, Math.sin(a) * l); ctx.lineTo(Math.cos(a + 0.35) * r * 0.18, Math.sin(a + 0.35) * r * 0.18); ctx.lineTo(Math.cos(a - 0.35) * r * 0.18, Math.sin(a - 0.35) * r * 0.18); ctx.fill(); }
    label(ctx, 'N', 0, -r - 16, 18, '#6b5130', SERIF, '400');
    ctx.restore();
}


// aurores en rideaux (traits verticaux lumineux le long d'une courbe)
function curtains(ctx, t, y0, amp, alpha = 1, seed = 1) {
    const [c, x] = off(); x.globalCompositeOperation = 'lighter'; const r = rng(seed);
    for (let band = 0; band < 2; band++) for (let px = -20; px < W + 20; px += 3) {
        const base = y0 + band * 60 + Math.sin(px * 0.004 + band * 2 + t * 0.3) * amp + Math.sin(px * 0.011 + band) * amp * 0.35;
        const h = 90 + 90 * (0.5 + 0.5 * Math.sin(px * 0.02 + band * 4 + r() * 0.4)) * (band ? 0.7 : 1);
        const g = x.createLinearGradient(0, base - h, 0, base + 30);
        const hue = band ? '180,140,255' : '120,235,180';
        g.addColorStop(0, `rgba(${hue},0)`); g.addColorStop(0.7, `rgba(${hue},${0.10 * alpha})`); g.addColorStop(0.92, `rgba(200,255,230,${0.22 * alpha})`); g.addColorStop(1, 'rgba(120,235,180,0)');
        x.fillStyle = g; x.fillRect(px, base - h, 3, h + 30);
    }
    ctx.drawImage(c, 0, 0); bloom(ctx, c, 14, 0.8);
}
// pics peints : face éclairée, face à l'ombre, ligne de neige irrégulière
function peaks(ctx, list, seed, lit = '#f4f1ea', shade = '#7f93b8', rock = '#5d6f92') {
    const r = rng(seed);
    list.forEach(([x, base, w, h]) => {
        const top = [x + (r() - 0.5) * w * 0.15, base - h];
        const L = [x - w / 2, base], R = [x + w / 2, base];
        const ridge = (a, b, n, j) => { const pts = []; for (let i = 0; i <= n; i++) { const k = i / n; pts.push([a[0] + (b[0] - a[0]) * k + (r() - 0.5) * j, a[1] + (b[1] - a[1]) * k + (r() - 0.5) * j * 0.6]); } return pts; };
        const left = ridge(L, top, 8, w * 0.06), right = ridge(top, R, 8, w * 0.06);
        const mid = [top[0] + w * 0.05, base];
        // face à l'ombre (droite)
        ctx.beginPath(); ctx.moveTo(...top); right.forEach((p) => ctx.lineTo(...p)); ctx.lineTo(...mid); ctx.closePath();
        let g = ctx.createLinearGradient(top[0], top[1], R[0], base); g.addColorStop(0, shade); g.addColorStop(1, rock); ctx.fillStyle = g; ctx.fill();
        // face éclairée (gauche)
        ctx.beginPath(); left.forEach((p, i) => (i ? ctx.lineTo(...p) : ctx.moveTo(...p))); ctx.lineTo(...mid); ctx.closePath();
        g = ctx.createLinearGradient(L[0], top[1], mid[0], base); g.addColorStop(0, mixc(rock, 'ffffff', 0.35)); g.addColorStop(1, mixc(rock, 'ffffff', 0.15)); ctx.fillStyle = g; ctx.fill();
        // neige : haut des deux faces
        const sl = 0.42 + r() * 0.12;
        ctx.save(); ctx.beginPath(); ctx.moveTo(...top); right.forEach((p) => ctx.lineTo(...p)); ctx.lineTo(...mid); left.slice().reverse().forEach((p) => ctx.lineTo(...p)); ctx.closePath(); ctx.clip();
        ctx.beginPath(); ctx.moveTo(L[0] - 20, base - h * sl); for (let i = 0; i <= 14; i++) { const xx = L[0] + (w * i) / 14; ctx.lineTo(xx, base - h * sl + (r() - 0.3) * h * 0.18 - (Math.abs(xx - top[0]) < w * 0.2 ? h * 0.1 : 0)); }
        ctx.lineTo(R[0] + 20, top[1] - 20); ctx.lineTo(L[0] - 20, top[1] - 20); ctx.closePath();
        ctx.fillStyle = lit; ctx.fill();
        ctx.fillStyle = 'rgba(110,130,175,0.45)'; ctx.beginPath(); ctx.moveTo(...top); right.forEach((p) => ctx.lineTo(...p)); ctx.lineTo(...mid); ctx.closePath(); ctx.fill();
        // ravines
        ctx.strokeStyle = 'rgba(40,55,90,0.25)'; ctx.lineWidth = 1.5; for (let i = 0; i < 6; i++) { const k = r(); const sx = top[0] + (r() - 0.3) * w * 0.3; ctx.beginPath(); ctx.moveTo(sx, top[1] + h * 0.2 * k + 10); ctx.quadraticCurveTo(sx + (r() - 0.5) * 30, top[1] + h * 0.5, sx + (r() - 0.5) * w * 0.4, base - 10); ctx.stroke(); }
        ctx.restore();
    });
}
function haze(ctx, y, h, col, a) { const g = ctx.createLinearGradient(0, y - h, 0, y); g.addColorStop(0, `rgba(${col},0)`); g.addColorStop(1, `rgba(${col},${a})`); ctx.fillStyle = g; ctx.fillRect(0, y - h, W, h); }
function bottomShade(ctx, a = 0.55) { const g = ctx.createLinearGradient(0, H - 200, 0, H); g.addColorStop(0, 'rgba(5,10,25,0)'); g.addColorStop(1, `rgba(5,10,25,${a})`); ctx.fillStyle = g; ctx.fillRect(0, H - 200, W, 200); }

// ---------------------------------------------------------------- le parchemin de la carte (partagé par 2 et 3)
function drawMap(ctx, route = true) {
    // papier
    ctx.fillStyle = '#e8d6ac'; ctx.fillRect(0, 0, W, H);
    const r = rng(3);
    for (let i = 0; i < 260; i++) { ctx.fillStyle = `rgba(${120 + r() * 60},${90 + r() * 40},${40 + r() * 30},${0.03 + r() * 0.05})`; ctx.beginPath(); ctx.ellipse(r() * W, r() * H, 20 + r() * 120, 10 + r() * 60, r() * 3, 0, TAU); ctx.fill(); }
    // mer gravée autour des terres
    const lands = [
        { pts: coast(560, 470, 360, 170, 11), name: 'La Grande Banquise' },
        { pts: coast(1010, 210, 170, 110, 21), name: 'Terres du Nord' },
        { pts: coast(250, 220, 150, 90, 31), name: '' }
    ];
    const isles = [[930, 470, 34, 41], [985, 505, 30, 42], [1030, 470, 32, 43], [1078, 515, 28, 44], [1000, 560, 26, 45], [1120, 470, 24, 46]];
    ctx.save(); ctx.strokeStyle = 'rgba(80,95,110,0.18)'; ctx.lineWidth = 1.2;
    for (let k = 1; k <= 6; k++) {
        lands.forEach((l) => { ctx.save(); const cx = l.pts.reduce((a, p) => a + p[0], 0) / l.pts.length, cy = l.pts.reduce((a, p) => a + p[1], 0) / l.pts.length; ctx.translate(cx, cy); ctx.scale(1 + k * 0.035, 1 + k * 0.05); ctx.translate(-cx, -cy); polyPath(ctx, l.pts); ctx.stroke(); ctx.restore(); });
    }
    ctx.restore();
    // terres
    lands.forEach((l, i) => { polyPath(ctx, l.pts); ctx.fillStyle = '#f1e6c9'; ctx.fill(); ctx.strokeStyle = '#6b5130'; ctx.lineWidth = 2; ctx.stroke();
        ctx.save(); polyPath(ctx, l.pts); ctx.clip(); ctx.strokeStyle = 'rgba(107,81,48,0.25)'; ctx.lineWidth = 6; polyPath(ctx, l.pts); ctx.stroke(); ctx.restore(); });
    isles.forEach(([x, y, s, seed]) => { const p = coast(x, y, s, s * 0.75, seed, 0.3, 6); polyPath(ctx, p); ctx.fillStyle = '#f1e6c9'; ctx.fill(); ctx.strokeStyle = '#6b5130'; ctx.lineWidth = 1.6; ctx.stroke(); });
    // reliefs : les Monts Givrés
    const mr = rng(8); for (let i = 0; i < 26; i++) { const x = 300 + mr() * 220, y = 380 + mr() * 120; mountGlyph(ctx, x, y + (x - 300) * 0.1, 0.7 + mr() * 0.6); }
    for (let i = 0; i < 8; i++) mountGlyph(ctx, 900 + mr() * 70, 220 + mr() * 60, 0.6 + mr() * 0.4);
    // le lac gelé, la banquise des phoques, une baleine et un navire
    ctx.save(); ctx.beginPath(); ctx.ellipse(800, 520, 52, 26, -0.2, 0, TAU); ctx.fillStyle = 'rgba(150,185,205,0.55)'; ctx.fill(); ctx.strokeStyle = '#6b5130'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore();
    label(ctx, 'Lac Gelé', 800, 560, 15);
    ctx.save(); ctx.strokeStyle = 'rgba(70,85,100,0.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(130, 420); ctx.quadraticCurveTo(150, 400, 170, 420); ctx.moveTo(150, 410); ctx.lineTo(150, 432); ctx.moveTo(138, 436); ctx.quadraticCurveTo(150, 446, 162, 436); ctx.stroke(); ctx.restore();
    label(ctx, 'ici, des baleines', 150, 462, 14, 'rgba(70,85,100,0.75)');
    ctx.save(); ctx.translate(820, 300); ctx.strokeStyle = '#6b5130'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-18, 0); ctx.quadraticCurveTo(0, 10, 18, 0); ctx.closePath(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -24); ctx.lineTo(12, -8); ctx.closePath(); ctx.stroke(); ctx.restore();
    // forêts
    const fr = rng(9); for (let i = 0; i < 55; i++) { const tx = 560 + fr() * 190, ty = 450 + fr() * 100; if (Math.hypot(tx - 650, ty - 420) > 45) treeGlyph(ctx, tx, ty, 0.7 + fr() * 0.5); }
    label(ctx, 'Forêt des Sapins Bleus', 660, 572, 15);
    for (let i = 0; i < 22; i++) treeGlyph(ctx, 190 + fr() * 120, 200 + fr() * 60, 0.6 + fr() * 0.4);
    // lieux
    ctx.save(); ctx.translate(250, 600); ctx.scale(0.35, 0.35); igloo(ctx, 0, 0, 70, 0.6); ctx.restore();
    label(ctx, 'L’igloo de Mamie', 250, 624, 16);
    ctx.save(); ctx.translate(650, 405); bigTreeIcon(ctx, 0, 0, 46); ctx.restore();
    label(ctx, 'Le village de Noël', 650, 436, 17, '#3b2a17', BOOK, 'italic 700');
    ctx.save(); ctx.translate(1010, 512); ctx.scale(0.22, 0.22); sortingCenter(ctx, 0, 0, 1, 0, 0); ctx.restore();
    label(ctx, 'Archipel du Tri', 1020, 600, 17);
    ctx.save(); ctx.translate(1060, 205); ctx.scale(0.26, 0.26); fortress2(ctx, 0, 0, 1, { shards: 0 }); ctx.restore();
    label(ctx, 'Le fort du Golem', 1060, 228, 17, '#3b2a17', BOOK, 'italic 700');
    label(ctx, 'LES MONTS GIVRÉS', 400, 352, 19, '#4b3a22', SERIF, '400');
    label(ctx, 'TERRES DU NORD', 1010, 140, 15, '#4b3a22', SERIF, '400');
    label(ctx, 'Mer des Aurores', 720, 140, 22, 'rgba(70,85,100,0.7)');
    label(ctx, 'Détroit des Phoques', 860, 640, 16, 'rgba(70,85,100,0.7)');
    // chemin de la quête
    if (route) {
    ctx.strokeStyle = '#a5121f'; ctx.lineWidth = 3; ctx.setLineDash([3, 9]); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(262, 590); ctx.bezierCurveTo(320, 520, 380, 470, 430, 450); ctx.bezierCurveTo(520, 420, 580, 400, 640, 410); ctx.bezierCurveTo(780, 430, 880, 480, 980, 505);
    ctx.bezierCurveTo(1100, 480, 1130, 330, 1065, 240); ctx.stroke(); ctx.setLineDash([]);
    [[262, 590], [650, 410], [1000, 505], [1062, 236]].forEach(([x, y], i) => { circle(ctx, x, y, 11, '#a5121f'); label(ctx, String(i + 1), x, y + 1, 13, '#fff', SERIF, '400'); });
    }
    // cartouche et rose des vents
    ctx.save(); ctx.translate(250, 92);
    ctx.fillStyle = 'rgba(241,230,201,0.95)'; ctx.strokeStyle = '#6b5130'; ctx.lineWidth = 2; rrect(ctx, -200, -50, 400, 100, 10); ctx.fill(); ctx.stroke(); rrect(ctx, -192, -42, 384, 84, 6); ctx.stroke();
    label(ctx, 'Le Royaume du Pôle', 0, -8, 38, '#3b2a17', SERIF, '400'); label(ctx, 'carte dressée par la mouette factrice', 0, 26, 16, '#6b5130');
    ctx.restore();
    compass(ctx, 1170, 620, 46);
    // usure des bords
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H); g.addColorStop(0, 'rgba(90,60,25,0)'); g.addColorStop(1, 'rgba(90,60,25,0.55)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

// ---------------------------------------------------------------- 1. Il était une fois : le livre
function frame1(ctx) {
    // table et bougie
    ctx.fillStyle = '#2a1a10'; ctx.fillRect(0, 0, W, H);
    const r = rng(5); for (let i = 0; i < 120; i++) { ctx.strokeStyle = `rgba(${90 + r() * 40},${55 + r() * 25},${25 + r() * 15},${0.25 + r() * 0.3})`; ctx.lineWidth = 1 + r() * 3; ctx.beginPath(); const y = r() * H; ctx.moveTo(0, y); ctx.bezierCurveTo(W * 0.3, y + (r() - 0.5) * 30, W * 0.7, y + (r() - 0.5) * 30, W, y + (r() - 0.5) * 20); ctx.stroke(); }
    glow(ctx, 1100, 120, 700, 'rgba(255,170,80,A)', 0.55);
    // le livre ouvert, en légère perspective
    ctx.save(); ctx.translate(W / 2, 380);
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.filter = 'blur(18px)'; ctx.beginPath(); ctx.ellipse(10, 250, 560, 60, 0, 0, TAU); ctx.fill(); ctx.filter = 'none';
    ctx.fillStyle = '#5a1c22'; rrect(ctx, -560, -300, 1120, 570, 18); ctx.fill();
    const page = (dir) => { ctx.save(); ctx.scale(dir, 1); const g = ctx.createLinearGradient(0, 0, 540, 0); g.addColorStop(0, '#d9c7a0'); g.addColorStop(0.08, '#f3e6c8'); g.addColorStop(1, '#efe0bd');
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, -282); ctx.quadraticCurveTo(270, -300, 540, -284); ctx.lineTo(540, 250); ctx.quadraticCurveTo(270, 236, 0, 254); ctx.closePath(); ctx.fill();
        for (let i = 0; i < 5; i++) { ctx.strokeStyle = `rgba(150,120,80,${0.25 - i * 0.04})`; ctx.beginPath(); ctx.moveTo(540 - i * 3, -284 + i * 2); ctx.lineTo(540 - i * 3, 250 - i * 2); ctx.stroke(); } ctx.restore(); };
    page(-1); page(1);
    const sh = ctx.createLinearGradient(-60, 0, 60, 0); sh.addColorStop(0, 'rgba(80,50,20,0)'); sh.addColorStop(0.5, 'rgba(80,50,20,0.35)'); sh.addColorStop(1, 'rgba(80,50,20,0)'); ctx.fillStyle = sh; ctx.fillRect(-60, -290, 120, 545);
    // page gauche : lettrine et texte
    ctx.fillStyle = '#a5121f'; ctx.font = `400 120px ${SERIF}`; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillText('S', -480, -110);
    ctx.strokeStyle = '#c9a046'; ctx.lineWidth = 2; ctx.strokeRect(-492, -222, 96, 128);
    ctx.fillStyle = '#3b2a17'; ctx.font = `400 26px ${BOOK}`;
    const lines = ['ur la banquise, tout au bout du', 'monde, les pingouins préparaient', 'Noël depuis des semaines.', '', 'Les guirlandes séchaient au vent,', 'les cadeaux s’empilaient au village,', 'et le grand sapin brillait plus fort', 'que toutes les aurores.', '', 'Enfin… presque tout le monde', 'préparait Noël.'];
    lines.forEach((l, i) => ctx.fillText(l, i < 3 ? -388 : -480, -186 + i * 36 + (i < 3 ? 0 : 0)));
    // page droite : gravure de l'igloo
    ctx.save(); ctx.beginPath(); ctx.ellipse(270, -20, 210, 190, 0, 0, TAU); ctx.clip();
    ctx.fillStyle = '#e7d6b0'; ctx.fillRect(60, -210, 420, 380);
    ctx.strokeStyle = 'rgba(70,50,30,0.35)'; ctx.lineWidth = 1; for (let y = -210; y < -40; y += 6) { ctx.beginPath(); ctx.moveTo(60, y); ctx.lineTo(480, y); ctx.stroke(); }
    ctx.globalAlpha = 0.85; ctx.save(); ctx.translate(270, 90); igloo(ctx, 0, 0, 120, 0.7); ctx.restore(); ctx.globalAlpha = 1;
    [[120, 100, 70], [420, 110, 80]].forEach(([x, y, h]) => pine(ctx, x, y, h, '#3d4a3a', '#4d5c48', '#efe4c8'));
    ctx.restore();
    ctx.strokeStyle = '#c9a046'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(270, -20, 214, 194, 0, 0, TAU); ctx.stroke();
    label(ctx, '~ Chapitre premier ~', 270, 210, 22, '#6b5130');
    ctx.restore();
    // flamme de bougie floue au premier plan (profondeur de champ)
    blurred(ctx, 10, (x) => { x.fillStyle = '#e8dcc8'; x.fillRect(1140, 420, 70, 300); x.fillStyle = '#ffd27a'; x.beginPath(); x.ellipse(1175, 395, 16, 34, 0, 0, TAU); x.fill(); });
    glow(ctx, 1175, 400, 260, 'rgba(255,190,100,A)', 0.5);
    vig(ctx, 0.75); grain(ctx, 0.08);
}

// ---------------------------------------------------------------- 2. la carte complète du royaume
function frame2(ctx) {
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(-0.012); ctx.scale(0.94, 0.94); ctx.translate(-W / 2, -H / 2);
    drawMap(ctx); ctx.restore();
    ctx.fillStyle = '#1c120a'; ctx.fillRect(0, 0, W, 22); ctx.fillRect(0, H - 22, W, 22);
    glow(ctx, 200, 80, 600, 'rgba(255,200,120,A)', 0.25);
    vig(ctx, 0.7); grain(ctx, 0.07, 2);
}

// ---------------------------------------------------------------- 3. zoom : la carte devient paysage
function frame3(ctx) {
    // paysage peint (plein écran), la carte s'efface en diagonale par-dessus
    const [scn, s] = off();
    s.fillStyle = vgrad(s, 0, H, [[0, '#6f8fbf'], [0.55, '#c7d7ec'], [1, '#eef4fb']]); s.fillRect(0, 0, W, H);
    glow(s, 980, 160, 420, 'rgba(255,235,200,A)', 0.6);
    // montagnes peintes en perspective atmosphérique
    peaks(s, [[180, 470, 420, 230], [520, 470, 520, 300], [900, 470, 460, 250], [1210, 470, 380, 210]], 61, '#f7f4ee', '#93a6c8', '#7d8fb3');
    haze(s, 480, 140, '214,226,242', 0.75);
    peaks(s, [[60, 540, 360, 230], [420, 540, 460, 300], [800, 540, 560, 360], [1180, 540, 420, 260]], 62, '#ffffff', '#7f93b8', '#5d6f92');
    haze(s, 560, 120, '226,236,248', 0.6);
    s.fillStyle = '#f4f8fd'; s.beginPath(); s.moveTo(0, 600); s.quadraticCurveTo(640, 540, W, 590); s.lineTo(W, H); s.lineTo(0, H); s.fill();
    for (let i = 0; i < 9; i++) pine(s, 60 + i * 150 + (i % 2) * 30, 620 + (i % 3) * 14, 90 + (i % 3) * 30, '#2b4f4a', '#3a6a60', '#f2f8ff');
    penguin(s, 640, 640, 1.1, { mood: 'determined', look: 1, scarf: '#e94b4b' });
    ctx.drawImage(scn, 0, 0);
    // la carte, agrandie sur les Monts Givrés, en train de se dissoudre
    const [mp, m] = off(); m.save(); m.translate(W / 2, H / 2); m.scale(2.2, 2.2); m.translate(-430, -470); drawMap(m); m.restore();
    const [mk, k] = off(); const g = k.createLinearGradient(0, 0, W, H * 0.4); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.38, 'rgba(0,0,0,1)'); g.addColorStop(0.55, 'rgba(0,0,0,0)'); k.fillStyle = g; k.fillRect(0, 0, W, H);
    // bord de papier déchiré/brûlé
    m.globalCompositeOperation = 'destination-in'; m.drawImage(mk, 0, 0); m.globalCompositeOperation = 'source-over';
    ctx.drawImage(mp, 0, 0);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; const eg = ctx.createLinearGradient(0, 0, W, H * 0.4); eg.addColorStop(0.42, 'rgba(255,220,150,0)'); eg.addColorStop(0.47, 'rgba(255,220,150,0.35)'); eg.addColorStop(0.52, 'rgba(255,220,150,0)'); ctx.fillStyle = eg; ctx.fillRect(0, 0, W, H); ctx.restore();
    snowLayer(ctx, 3, 22, 50, 40, 2.2, 0.7, 20, -10);
    bottomShade(ctx, 0.7);
    narr(ctx, 'Pour rejoindre le village, il fallait d’abord franchir les Monts Givrés.', 660, 32);
    vig(ctx, 0.5); grain(ctx, 0.06, 3);
}

// ---------------------------------------------------------------- 4. le fort du Golem, la nuit
function frame4(ctx) {
    ctx.fillStyle = vgrad(ctx, 0, H, [[0, '#020611'], [0.6, '#0b1b36'], [1, '#14325c']]); ctx.fillRect(0, 0, W, H);
    stars(ctx, 4, 33, 220, 400);
    curtains(ctx, 2, 230, 50, 1.1, 4);
    peaks(ctx, [[130, 540, 380, 240], [420, 540, 360, 200], [880, 540, 400, 230], [1180, 540, 380, 260]], 71, '#a9c4e6', '#1c3358', '#132746');
    haze(ctx, 560, 120, '30,60,100', 0.6);
    // brume au sol
    for (let i = 0; i < 3; i++) { ctx.fillStyle = `rgba(150,190,230,${0.07 + i * 0.03})`; ctx.beginPath(); ctx.ellipse(640, 600 - i * 18, 900, 60 + i * 10, 0, 0, TAU); ctx.fill(); }
    const [ft, f] = off(); fortress2(f, W / 2, 610, 1.15, { eyes: 1, glow: 0.8, shards: 3 }); ctx.drawImage(ft, 0, 0);
    bloom(ctx, ft, 16, 0.35);
    glow(ctx, W / 2, 400, 360, 'rgba(127,232,255,A)', 0.18);
    ctx.fillStyle = '#081426'; ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(0, 470); ctx.lineTo(110, 520); ctx.lineTo(180, 480); ctx.lineTo(300, 640); ctx.lineTo(340, H); ctx.fill();
    ctx.beginPath(); ctx.moveTo(W, H); ctx.lineTo(W, 440); ctx.lineTo(1160, 500); ctx.lineTo(1100, 470); ctx.lineTo(960, 650); ctx.lineTo(930, H); ctx.fill();
    // flocons en bokeh au premier plan
    blurred(ctx, 6, (x) => { const r = rng(14); for (let i = 0; i < 26; i++) { x.fillStyle = `rgba(230,245,255,${0.35 + r() * 0.4})`; x.beginPath(); x.arc(r() * W, r() * H, 6 + r() * 14, 0, TAU); x.fill(); } });
    snowLayer(ctx, 5, 23, 80, 60, 1.6, 0.6, 30, -40);
    narr(ctx, 'Tout au nord, dans un fort de glace, le Golem de givre ouvrit les yeux.', 655, 32);
    vig(ctx, 0.8); grain(ctx, 0.07, 4);
}

// ---------------------------------------------------------------- 5. l'igloo de Mamie, à la lumière du feu
function frame5(ctx) {
    const [sc, s] = off();
    s.save(); s.translate(W / 2, H / 2 + 60); s.scale(1.55, 1.55); s.translate(-600, -470);
    interiorBg(s, 2.3, 1.2);
    rocking(s, 470, 585, 0.02);
    penguin(s, 470, 512, 1.15, { scarf: '#1d2542', shawl: '#b14a7a', glasses: true, bun: true, mood: 'happy', flipR: -0.5, flipL: -0.4 });
    s.fillStyle = '#e94b4b'; rrect(s, 474, 452, 16, 46, 5); s.fill();
    s.fillStyle = '#6b4226'; s.fillRect(790, 560, 60, 10); s.fillRect(796, 568, 8, 30); s.fillRect(836, 568, 8, 30);
    penguin(s, 820, 560, 1.05, { scarfOff: true, facing: -1, mug: true, mood: 'normal', look: -1 });
    s.restore();
    ctx.drawImage(sc, 0, 0);
    // éclairage : chaleur du feu, ombre froide de l'autre côté, liseré lumineux
    ctx.save(); ctx.globalCompositeOperation = 'multiply'; const g = ctx.createLinearGradient(0, 0, W, 0); g.addColorStop(0, 'rgba(255,220,180,1)'); g.addColorStop(0.55, 'rgba(230,190,170,1)'); g.addColorStop(1, 'rgba(120,110,160,1)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
    ctx.save(); ctx.globalCompositeOperation = 'screen'; glow(ctx, 120, 420, 700, 'rgba(255,140,50,A)', 0.35); ctx.restore();
    bloom(ctx, sc, 22, 0.18);
    // premier plan flou : pelote et aiguilles
    blurred(ctx, 9, (x) => { circle(x, 1110, 640, 90, '#c2343a'); x.strokeStyle = '#8a1f25'; x.lineWidth = 6; for (let i = 0; i < 6; i++) { x.beginPath(); x.arc(1110, 640, 30 + i * 10, 0.3 + i, 2.4 + i); x.stroke(); } x.strokeStyle = '#d9d2c4'; x.lineWidth = 8; x.beginPath(); x.moveTo(980, 720); x.lineTo(1180, 520); x.stroke(); });
    narr(ctx, '« Encore un peu de chocolat chaud, Flocon ? »', 668, 32);
    vig(ctx, 0.6, '20,8,4'); grain(ctx, 0.07, 5);
}

// ---------------------------------------------------------------- 6. l'archipel du Tri, vu du ciel
function frame6(ctx) {
    const [sea, s] = off();
    s.fillStyle = vgrad(s, 0, H, [[0, '#2f6f9a'], [1, '#174a73']]); s.fillRect(0, 0, W, H);
    const r = rng(17); for (let i = 0; i < 700; i++) { s.strokeStyle = `rgba(255,255,255,${0.04 + r() * 0.08})`; s.lineWidth = 1 + r() * 2; const x = r() * W, y = r() * H; s.beginPath(); s.moveTo(x, y); s.quadraticCurveTo(x + 8, y - 3, x + 18 + r() * 20, y); s.stroke(); }
    ctx.drawImage(sea, 0, 0);
    glow(ctx, 1000, 120, 520, 'rgba(255,214,150,A)', 0.45);
    const isles = [[640, 360, 130, 51], [470, 300, 95, 52], [520, 470, 90, 53], [790, 260, 100, 54], [840, 470, 95, 55], [330, 430, 70, 56], [980, 360, 80, 57], [210, 250, 60, 58]];
    isles.forEach(([x, y, rr, seed]) => {
        const p = coast(x, y, rr, rr * 0.7, seed, 0.25, 6);
        ctx.save(); ctx.translate(8, 14); polyPath(ctx, p); ctx.fillStyle = 'rgba(5,25,45,0.35)'; ctx.filter = 'blur(6px)'; ctx.fill(); ctx.restore(); ctx.filter = 'none';
        ctx.save(); ctx.translate(0, 0); const pp = coast(x, y, rr * 1.08, rr * 0.76, seed, 0.25, 6); polyPath(ctx, pp); ctx.fillStyle = 'rgba(160,220,240,0.45)'; ctx.fill(); ctx.restore();
        polyPath(ctx, p); const g = ctx.createLinearGradient(x - rr, y - rr, x + rr, y + rr); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#c9dcef'); ctx.fillStyle = g; ctx.fill();
        ctx.strokeStyle = 'rgba(120,160,200,0.6)'; ctx.lineWidth = 2; ctx.stroke();
    });
    // ponts de glace (trains) entre îles collées, chenaux (bateaux), couloir aérien
    const rail = (a, b) => { ctx.strokeStyle = '#7a5a3a'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke(); ctx.strokeStyle = '#d9c3a0'; ctx.lineWidth = 2; ctx.setLineDash([2, 6]); ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke(); ctx.setLineDash([]); };
    rail([640, 360], [470, 300]); rail([640, 360], [520, 470]); rail([640, 360], [790, 260]); rail([520, 470], [330, 430]);
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2; ctx.setLineDash([8, 8]); ctx.beginPath(); ctx.moveTo(640, 360); ctx.quadraticCurveTo(760, 430, 840, 470); ctx.moveTo(790, 260); ctx.quadraticCurveTo(900, 300, 980, 360); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,120,120,0.55)'; ctx.setLineDash([2, 10]); ctx.beginPath(); ctx.moveTo(640, 360); ctx.quadraticCurveTo(420, 180, 210, 250); ctx.stroke(); ctx.setLineDash([]);
    // centre de tri qui clignote, relais, véhicules
    ctx.save(); ctx.translate(640, 380); ctx.scale(0.38, 0.38); sortingCenter(ctx, 0, 0, 1, 0.8, 1.3); ctx.restore(); glow(ctx, 640, 330, 90, 'rgba(127,232,255,A)', 0.45);
    [[470, 300, '#ffd36e'], [520, 470, '#7be0a3'], [790, 260, '#ff8fa8'], [840, 470, '#9fd0ff'], [330, 430, '#c9b6ff'], [980, 360, '#ffb15e'], [210, 250, '#ffffff']].forEach(([x, y, c]) => {
        ctx.fillStyle = '#d7263d'; rrect(ctx, x - 16, y - 14, 32, 22, 4); ctx.fill(); ctx.fillStyle = c; rrect(ctx, x - 9, y - 26, 18, 12, 3); ctx.fill();
        for (let i = 0; i < 3; i++) { ctx.fillStyle = '#c99a5b'; ctx.fillRect(x + 20 + i * 9, y - 2, 7, 7); }
        penguin(ctx, x - 26, y + 12, 0.18, { mood: 'normal' });
    });
    // un bateau, un train, un avion
    ctx.save(); ctx.translate(760, 430); ctx.rotate(0.5); ctx.fillStyle = '#d7263d'; ctx.beginPath(); ctx.moveTo(-18, -7); ctx.lineTo(16, -7); ctx.lineTo(24, 0); ctx.lineTo(16, 7); ctx.lineTo(-18, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillRect(-8, -4, 12, 8); ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(740, 415); ctx.lineTo(712, 395); ctx.moveTo(744, 424); ctx.lineTo(712, 410); ctx.stroke();
    ctx.save(); ctx.translate(560, 330); ctx.rotate(0.35); for (let i = 0; i < 3; i++) { ctx.fillStyle = i ? '#3b82f6' : '#1d2542'; rrect(ctx, -30 + i * 20, -6, 17, 12, 3); ctx.fill(); } ctx.restore();
    ctx.save(); ctx.translate(430, 205); ctx.rotate(-0.2); ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(0, 0, 18, 5, 0, 0, TAU); ctx.fill(); ctx.fillRect(-4, -16, 8, 32); ctx.fillStyle = '#d7263d'; ctx.fillRect(-16, -3, 6, 6); ctx.restore();
    // nuages en avant-plan, flous
    blurred(ctx, 14, (x) => { x.fillStyle = 'rgba(255,255,255,0.75)'; [[80, 90, 200], [1180, 640, 260], [1240, 120, 180]].forEach(([cx, cy, rr]) => { x.beginPath(); x.ellipse(cx, cy, rr, rr * 0.4, 0, 0, TAU); x.fill(); }); });
    narr(ctx, 'Au cœur de l’archipel, le centre de tri tournait à plein régime…', 660, 32);
    vig(ctx, 0.5); grain(ctx, 0.06, 6);
}

// ---------------------------------------------------------------- 7. le titre
function frame7(ctx) {
    ctx.fillStyle = vgrad(ctx, 0, H, [[0, '#050b1f'], [0.7, '#14244a'], [1, '#2b4a86']]); ctx.fillRect(0, 0, W, H);
    stars(ctx, 2, 91, 200, 520);
    curtains(ctx, 5, 170, 40, 0.8, 9);
    peaks(ctx, [[120, 630, 360, 200], [430, 630, 300, 150], [850, 630, 340, 170], [1170, 630, 380, 220]], 81, '#cfdcf0', '#2a4372', '#1d3561');
    ctx.fillStyle = '#e6f1fb'; ctx.beginPath(); ctx.moveTo(0, 620); ctx.quadraticCurveTo(640, 580, W, 620); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();
    // titre dorure
    const gold = (y0, y1) => { const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, '#fff6d6'); g.addColorStop(0.35, '#f2cf7a'); g.addColorStop(0.6, '#c99636'); g.addColorStop(1, '#f6dc95'); return g; };
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.font = `italic 400 34px ${BOOK}`; ctx.fillStyle = '#e9dcc0'; ctx.fillText('~ La Grande Quête de ~', W / 2, 200);
    ctx.font = `400 150px ${SERIF}`; ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 24; ctx.fillStyle = gold(220, 360); ctx.fillText('Flocon', W / 2, 345); ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,240,200,0.6)'; ctx.lineWidth = 1.5; ctx.strokeText('Flocon', W / 2, 345);
    // fioritures
    ctx.strokeStyle = '#d9b46a'; ctx.lineWidth = 2; [-1, 1].forEach((d) => { ctx.beginPath(); ctx.moveTo(W / 2 + d * 60, 385); ctx.bezierCurveTo(W / 2 + d * 160, 370, W / 2 + d * 220, 405, W / 2 + d * 300, 385); ctx.stroke(); circle(ctx, W / 2 + d * 306, 384, 4, '#d9b46a'); });
    starShape(ctx, W / 2, 388, 10, '#f2cf7a');
    ctx.font = `400 30px ${BOOK}`; ctx.fillStyle = '#ffffff'; ctx.fillText('Épisode 1 · Les Monts Givrés', W / 2, 440);
    penguin(ctx, W / 2 + 360, 640, 1.25, { mood: 'happy', flipR: -2.3, scarf: '#e94b4b' });
    ctx.save(); ctx.translate(W / 2, 520); ctx.fillStyle = 'rgba(255,211,110,0.16)'; rrect(ctx, -150, -30, 300, 58, 29); ctx.fill(); ctx.strokeStyle = '#f2cf7a'; ctx.lineWidth = 2; rrect(ctx, -150, -30, 300, 58, 29); ctx.stroke();
    ctx.font = `italic 600 28px ${BOOK}`; ctx.fillStyle = '#ffe9b0'; ctx.textBaseline = 'middle'; ctx.fillText('À toi de jouer !', 0, 0); ctx.restore();
    snowLayer(ctx, 8, 26, 90, 40, 2, 0.8, 22, -10);
    vig(ctx, 0.6); grain(ctx, 0.06, 7);
}

const FRAMES = [frame1, frame2, frame3, frame4, frame5, frame6, frame7];
window.drawFrame = (i) => { const c = document.getElementById('c'); const ctx = c.getContext('2d'); ctx.setTransform(c.width / W, 0, 0, c.height / H, 0, 0); FRAMES[i](ctx); };
