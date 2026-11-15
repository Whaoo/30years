// Maquettes de Chronoflocon v3 : « le centre de tri du Pôle ». Repère du jeu : 800 × 450.
const GW = 800, GH = 450;
const UI = '"Bricolage Grotesque", Inter, system-ui, sans-serif';
const TXT = 'Inter, system-ui, sans-serif';

function txt(ctx, s, x, y, size = 13, col = '#fff', w = 600, align = 'left', font = TXT) { ctx.font = `${w} ${size}px ${font}`; ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillStyle = col; ctx.fillText(s, x, y); }
function pill(ctx, x, y, w, h, col) { rrect(ctx, x, y, w, h, h / 2); ctx.fillStyle = col; ctx.fill(); }
function coastG(cx, cy, rx, ry, seed, rough = 0.22, n = 5) {
    const r = rng(seed); let pts = [];
    for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU; const k = 0.82 + r() * 0.3; pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); }
    for (let it = 0; it < n; it++) { const np = []; for (let i = 0; i < pts.length; i++) { const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length]; const d = Math.hypot(bx - ax, by - ay); np.push([ax, ay], [(ax + bx) / 2 + (r() - 0.5) * d * rough, (ay + by) / 2 + (r() - 0.5) * d * rough]); } pts = np; }
    return pts;
}
function poly(ctx, pts) { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); }

// ---------------------------------------------------------------- l'archipel (gabarit « Couronne »)
const ISLES = {
    tri: { x: 400, y: 222, r: 50, name: 'Centre de tri', sym: 'tri', col: '#7fe8ff', strip: true },
    poisson: { x: 296, y: 168, r: 36, name: 'Île Poisson', sym: 'fish', col: '#ff9f43' },
    sapin: { x: 312, y: 292, r: 36, name: 'Île Sapin', sym: 'tree', col: '#2bb673' },
    etoile: { x: 566, y: 140, r: 38, name: 'Île Étoile', sym: 'star', col: '#ffd23f', strip: true },
    cadeau: { x: 618, y: 252, r: 36, name: 'Île Cadeau', sym: 'gift', col: '#ff6fa8' },
    phoque: { x: 168, y: 326, r: 33, name: 'Île Phoque', sym: 'seal', col: '#9fa8ff' },
    morse: { x: 120, y: 226, r: 30, name: 'Île Morse', sym: 'moon', col: '#c9b6ff' },
    aurore: { x: 196, y: 92, r: 26, name: 'Île Aurore', sym: 'aurora', col: '#7be0a3', strip: true }
};
const LINKS = [
    ['tri', 'poisson', 'rail'], ['tri', 'sapin', 'rail'], ['etoile', 'cadeau', 'rail'], ['phoque', 'morse', 'rail'],
    ['sapin', 'phoque', 'boat'], ['tri', 'cadeau', 'boat'], ['poisson', 'morse', 'boat'], ['tri', 'etoile', 'boat'],
    ['tri', 'aurore', 'air'], ['tri', 'etoile', 'air'], ['aurore', 'etoile', 'air']
];

function sea(ctx, t = 0, storm = 0) {
    const g = ctx.createLinearGradient(0, 0, 0, GH); g.addColorStop(0, storm ? '#2b4a66' : '#2a6d97'); g.addColorStop(1, storm ? '#1a2f45' : '#164a72'); ctx.fillStyle = g; ctx.fillRect(0, 0, GW, GH);
    const r = rng(17); for (let i = 0; i < 260; i++) { ctx.strokeStyle = `rgba(255,255,255,${0.04 + r() * 0.07})`; ctx.lineWidth = 1 + r() * 1.5; const x = (r() * GW + t * 8) % GW, y = r() * GH; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 5, y - 2, x + 12 + r() * 12, y); ctx.stroke(); }
}
function island(ctx, k, o = {}) {
    const I = ISLES[k]; const seed = k.length * 31 + I.x;
    const p = coastG(I.x, I.y, I.r, I.r * 0.74, seed);
    ctx.save(); ctx.translate(4, 7); poly(ctx, p); ctx.fillStyle = 'rgba(5,25,45,0.3)'; ctx.fill(); ctx.restore();
    const halo = coastG(I.x, I.y, I.r * 1.12, I.r * 0.84, seed); poly(ctx, halo); ctx.fillStyle = 'rgba(170,225,245,0.45)'; ctx.fill();
    poly(ctx, p); const g = ctx.createLinearGradient(I.x - I.r, I.y - I.r, I.x + I.r, I.y + I.r); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#cfe0f2'); ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = 'rgba(120,160,200,0.7)'; ctx.lineWidth = 1.5; ctx.stroke();
    if (o.hatch) { ctx.save(); poly(ctx, p); ctx.clip(); ctx.strokeStyle = 'rgba(255,90,90,0.55)'; ctx.lineWidth = 3; for (let x = I.x - 60; x < I.x + 60; x += 9) { ctx.beginPath(); ctx.moveTo(x, I.y - 50); ctx.lineTo(x + 40, I.y + 50); ctx.stroke(); } ctx.restore(); }
    if (I.strip) { ctx.save(); ctx.translate(I.x - I.r * 0.55, I.y + I.r * 0.38); ctx.rotate(-0.25); ctx.fillStyle = '#8a9bb5'; rrect(ctx, -14, -4, 28, 8, 3); ctx.fill(); ctx.fillStyle = '#fff'; for (let i = -10; i < 12; i += 6) ctx.fillRect(i, -0.8, 3, 1.6); ctx.restore(); }
    if (k === 'tri') {
        ctx.save(); ctx.translate(I.x, I.y + 8); ctx.scale(0.24, 0.24); sortingCenter(ctx, 0, 0, 1, o.flicker || 0.7, o.t || 1); ctx.restore();
        glow(ctx, I.x, I.y - 20, 60, 'rgba(127,232,255,A)', 0.4 + (o.flicker || 0) * 0.3);
    } else {
        ctx.fillStyle = '#d7263d'; rrect(ctx, I.x - 13, I.y - 10, 26, 18, 3); ctx.fill();
        ctx.fillStyle = '#a5121f'; ctx.beginPath(); ctx.moveTo(I.x - 16, I.y - 9); ctx.lineTo(I.x, I.y - 20); ctx.lineTo(I.x + 16, I.y - 9); ctx.fill();
        badge(ctx, I.x, I.y - 30, k, 11);
    }
}
function symbol(ctx, sym, x, y, s, col = '#1d2542') {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineWidth = 1.6;
    if (sym === 'fish') { ctx.beginPath(); ctx.ellipse(1, 0, 5, 3.2, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.moveTo(-3, 0); ctx.lineTo(-7, -3); ctx.lineTo(-7, 3); ctx.fill(); }
    if (sym === 'tree') { ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(5, 4); ctx.lineTo(-5, 4); ctx.fill(); }
    if (sym === 'star') starShape(ctx, 0, 0, 6, col);
    if (sym === 'gift') { ctx.fillRect(-5, -3, 10, 8); ctx.fillRect(-6, -5, 12, 3); }
    if (sym === 'seal') { ctx.beginPath(); ctx.ellipse(0, 1, 6, 3.5, 0, 0, TAU); ctx.fill(); circle(ctx, 5, -2, 2.6, col); }
    if (sym === 'moon') { ctx.beginPath(); ctx.arc(0, 0, 5.5, 0.6, TAU - 0.6); ctx.arc(2.5, 0, 3.6, TAU - 0.9, 0.9, true); ctx.fill(); }
    if (sym === 'aurora') { ctx.beginPath(); ctx.moveTo(-6, 3); ctx.quadraticCurveTo(-2, -6, 0, 0); ctx.quadraticCurveTo(2, 6, 6, -3); ctx.stroke(); }
    if (sym === 'tri') { ctx.fillRect(-4, -4, 8, 8); }
    ctx.restore();
}
function badge(ctx, x, y, k, r = 10) { const I = ISLES[k]; circle(ctx, x, y, r + 2, '#ffffff'); circle(ctx, x, y, r, I.col); symbol(ctx, I.sym, x, y, r / 9); }
function parcel(ctx, x, y, k, express = false, t = 0) {
    const I = ISLES[k];
    if (express) { glow(ctx, x, y, 14, 'rgba(255,210,63,A)', 0.6); }
    ctx.fillStyle = express ? '#ffd23f' : I.col; rrect(ctx, x - 5, y - 5, 10, 10, 2); ctx.fill();
    ctx.strokeStyle = express ? '#a86f00' : 'rgba(20,30,60,0.45)'; ctx.lineWidth = 1; ctx.stroke();
    symbol(ctx, I.sym, x, y, 0.55, '#1d2542');
}
function queue(ctx, k, list, side = 1) {
    const I = ISLES[k]; const x0 = I.x + side * (I.r * 0.35 + 8), y0 = I.y + I.r * 0.42;
    list.slice(0, 8).forEach((d, i) => parcel(ctx, x0 + side * (i % 4) * 11, y0 + Math.floor(i / 4) * 11, d.k, d.ex));
    if (list.length > 8) txt(ctx, `+${list.length - 8}`, x0 + side * 48, y0 + 5, 11, '#1d2542', 800, side > 0 ? 'left' : 'right');
}
function client(ctx, x, y, mood, kind = 'penguin', t = 0) {
    const tap = mood === 2 ? Math.abs(Math.sin(t * 18)) * 2 : 0;
    if (kind === 'seal') {
        ctx.save(); ctx.translate(x, y - tap); ell(ctx, 0, -6, 9, 6, '#7d8aa8'); circle(ctx, 6, -11, 5, '#7d8aa8'); circle(ctx, 7.5, -12, 1.2, '#111');
        if (mood === 2) { ctx.fillStyle = '#ff5d5d'; ctx.globalAlpha = 0.5; circle(ctx, 6, -11, 5, '#ff5d5d'); ctx.globalAlpha = 1; } ctx.restore();
    } else penguin(ctx, x, y - tap, 0.2, { mood: mood === 2 ? 'determined' : mood === 1 ? 'normal' : 'happy', scarf: mood === 2 ? '#ff4d4d' : '#3b82f6', cheeks: mood === 2 ? 1 : 0.5 });
    if (mood > 0) {
        const w = mood === 2 ? 64 : 58; const bx = x - w / 2, by = y - 46;
        rrect(ctx, bx, by, w, 18, 9); ctx.fillStyle = mood === 2 ? '#ff5d5d' : '#ffffff'; ctx.fill();
        ctx.beginPath(); ctx.moveTo(x - 3, by + 18); ctx.lineTo(x, by + 23); ctx.lineTo(x + 3, by + 18); ctx.fill();
        txt(ctx, mood === 2 ? 'Mon colis !!' : 'C’est long…', x, by + 9, 10, mood === 2 ? '#fff' : '#1d2542', 700, 'center');
        if (mood === 2) { for (let i = 0; i < 2; i++) { ctx.fillStyle = 'rgba(255,255,255,0.7)'; circle(ctx, x - 6 + i * 12, y - 24 - ((t * 20 + i * 7) % 8), 2, 'rgba(255,255,255,0.7)'); } }
    }
}
function linkPath(ctx, a, b, type) {
    const A = ISLES[a], B = ISLES[b];
    if (type === 'air') { const mx = (A.x + B.x) / 2, my = Math.min(A.y, B.y) - 50; ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.quadraticCurveTo(mx, my, B.x, B.y); return [A, B, { x: mx, y: my }]; }
    ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); return [A, B];
}
function drawLink(ctx, a, b, type, state = 'possible') {
    ctx.save(); ctx.lineCap = 'round';
    if (type === 'rail') {
        if (state === 'open') { linkPath(ctx, a, b, type); ctx.strokeStyle = '#6b4a2e'; ctx.lineWidth = 8; ctx.stroke(); linkPath(ctx, a, b, type); ctx.strokeStyle = '#e6d2b0'; ctx.lineWidth = 2; ctx.setLineDash([2, 5]); ctx.stroke(); }
        else if (state === 'cut') { linkPath(ctx, a, b, type); ctx.strokeStyle = 'rgba(107,74,46,0.5)'; ctx.lineWidth = 8; ctx.setLineDash([10, 14]); ctx.stroke(); }
        else { linkPath(ctx, a, b, type); ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 2; ctx.setLineDash([3, 6]); ctx.stroke(); }
    } else if (type === 'boat') {
        linkPath(ctx, a, b, type); ctx.strokeStyle = state === 'open' ? 'rgba(200,240,255,0.95)' : 'rgba(160,215,245,0.55)'; ctx.lineWidth = state === 'open' ? 3 : 2; ctx.setLineDash(state === 'open' ? [10, 6] : [4, 8]); ctx.stroke();
    } else {
        linkPath(ctx, a, b, type); ctx.strokeStyle = state === 'open' ? 'rgba(255,140,140,0.95)' : 'rgba(255,140,140,0.45)'; ctx.lineWidth = state === 'open' ? 2.5 : 1.5; ctx.setLineDash([2, 7]); ctx.stroke();
    }
    ctx.restore();
}
function lerpLink(a, b, type, k) {
    const A = ISLES[a], B = ISLES[b];
    if (type === 'air') { const mx = (A.x + B.x) / 2, my = Math.min(A.y, B.y) - 50; const u = 1 - k; return [u * u * A.x + 2 * u * k * mx + k * k * B.x, u * u * A.y + 2 * u * k * my + k * k * B.y, Math.atan2(B.y - A.y, B.x - A.x)]; }
    return [A.x + (B.x - A.x) * k, A.y + (B.y - A.y) * k, Math.atan2(B.y - A.y, B.x - A.x)];
}
// Véhicules vus de profil, toujours droits (retournés selon le sens) : lisibles au premier coup d'œil
function trainIcon(ctx, x, y, s = 1, dir = 1, load = []) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s * dir, s);
    ell(ctx, -6, 9, 30, 3, 'rgba(10,25,45,0.3)');
    // wagons
    [-30, -14].forEach((wx, i) => { ctx.fillStyle = '#3b82f6'; rrect(ctx, wx - 7, -6, 14, 11, 2); ctx.fill(); ctx.fillStyle = '#2563c9'; ctx.fillRect(wx - 7, 3, 14, 2); circle(ctx, wx - 4, 7, 2.6, '#1d2542'); circle(ctx, wx + 4, 7, 2.6, '#1d2542'); if (load[i]) parcel(ctx, wx, -1, load[i]); });
    ctx.strokeStyle = '#1d2542'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-23, 2); ctx.lineTo(-21, 2); ctx.moveTo(-7, 2); ctx.lineTo(-4, 2); ctx.stroke();
    // locomotive : chaudière, cheminée, cabine, chasse-neige
    ctx.fillStyle = '#d7263d'; rrect(ctx, -4, -3, 18, 9, 3); ctx.fill();
    ctx.fillStyle = '#1d2542'; rrect(ctx, -6, -12, 9, 18, 2); ctx.fill(); ctx.fillStyle = '#ffd36e'; ctx.fillRect(-4, -10, 5, 4);
    ctx.fillStyle = '#1d2542'; ctx.fillRect(8, -9, 4, 7); ctx.fillStyle = 'rgba(255,255,255,0.8)'; circle(ctx, 12, -13, 2.5, 'rgba(255,255,255,0.8)'); circle(ctx, 16, -16, 1.8, 'rgba(255,255,255,0.6)');
    ctx.fillStyle = '#c9d4e6'; ctx.beginPath(); ctx.moveTo(14, 1); ctx.lineTo(19, 7); ctx.lineTo(14, 7); ctx.fill();
    circle(ctx, 0, 7, 3.2, '#1d2542'); circle(ctx, 9, 7, 3.2, '#1d2542'); circle(ctx, 0, 7, 1.2, '#c9d4e6'); circle(ctx, 9, 7, 1.2, '#c9d4e6');
    ctx.fillStyle = '#ffd36e'; circle(ctx, 14.5, -1, 1.6, '#ffd36e');
    ctx.restore();
}
function boatIcon(ctx, x, y, s = 1, dir = 1, load = [], wake = true) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s * dir, s);
    if (wake) { ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-20, 8); ctx.quadraticCurveTo(-28, 6, -36, 9); ctx.moveTo(-18, 10); ctx.quadraticCurveTo(-26, 12, -34, 12); ctx.stroke(); }
    // coque
    ctx.fillStyle = '#d7263d'; ctx.beginPath(); ctx.moveTo(-20, 0); ctx.lineTo(18, 0); ctx.lineTo(24, -4); ctx.lineTo(19, 9); ctx.lineTo(-17, 9); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.fillRect(-19, 4, 38, 2);
    // cabine, hublots, cheminée
    ctx.fillStyle = '#f4f7fb'; rrect(ctx, -16, -11, 13, 11, 2); ctx.fill(); ctx.fillStyle = '#7fb6e6'; ctx.fillRect(-14, -8, 3, 3); ctx.fillRect(-9, -8, 3, 3);
    ctx.fillStyle = '#1d2542'; ctx.fillRect(-12, -17, 5, 6); ctx.fillStyle = '#ffd36e'; ctx.fillRect(-12, -15, 5, 1.5);
    // caisses sur le pont
    const cr = load.length ? load : [null, null];
    cr.slice(0, 2).forEach((d, i) => { if (d) parcel(ctx, 2 + i * 10, -5, d); else { ctx.fillStyle = '#c99a5b'; ctx.fillRect(-3 + i * 10, -9, 9, 9); ctx.strokeStyle = '#8a6434'; ctx.lineWidth = 1; ctx.strokeRect(-3 + i * 10, -9, 9, 9); } });
    ctx.restore();
}
function planeIcon(ctx, x, y, s = 1, dir = 1) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s * dir, s);
    ell(ctx, 2, 16, 14, 2.5, 'rgba(10,25,45,0.25)');
    // dérive et aile arrière
    ctx.fillStyle = '#d7263d'; ctx.beginPath(); ctx.moveTo(-14, -1); ctx.lineTo(-19, -11); ctx.lineTo(-14, -11); ctx.lineTo(-8, -1); ctx.fill();
    // fuselage
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(-18, -1); ctx.quadraticCurveTo(-4, -6, 12, -4); ctx.quadraticCurveTo(19, -2, 18, 1); ctx.quadraticCurveTo(10, 4, -16, 3); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(29,37,66,0.5)'; ctx.lineWidth = 0.8; ctx.stroke();
    ctx.fillStyle = '#7fb6e6'; for (let i = 0; i < 4; i++) circle(ctx, -6 + i * 4, -1.5, 1.1, '#7fb6e6'); ctx.fillStyle = '#1d2542'; ctx.beginPath(); ctx.moveTo(12, -3.5); ctx.lineTo(16, -2); ctx.lineTo(12, -1); ctx.fill();
    // aile
    ctx.fillStyle = '#c9d4e6'; ctx.beginPath(); ctx.moveTo(-2, 1); ctx.lineTo(6, 1); ctx.lineTo(-4, 9); ctx.lineTo(-9, 9); ctx.closePath(); ctx.fill();
    // hélice
    ctx.fillStyle = '#1d2542'; ctx.fillRect(18, -5, 1.6, 9); circle(ctx, 18.6, -0.5, 1.6, '#ffd36e');
    ctx.restore();
}
function train(ctx, a, b, k, load = []) { const [x, y] = lerpLink(a, b, 'rail', k); trainIcon(ctx, x + 4, y - 4, 1, ISLES[b].x >= ISLES[a].x ? 1 : -1, load); }
function boat(ctx, a, b, k, load = [], wake = true) { const [x, y] = lerpLink(a, b, 'boat', k); boatIcon(ctx, x, y - 2, 1, ISLES[b].x >= ISLES[a].x ? 1 : -1, load, wake); }
function plane(ctx, a, b, k) { const [x, y] = lerpLink(a, b, 'air', k); planeIcon(ctx, x, y, 1.1, ISLES[b].x >= ISLES[a].x ? 1 : -1); }
function sleigh(ctx, x, y, s = 1) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.strokeStyle = '#ffd36e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-14, 8); ctx.quadraticCurveTo(10, 10, 16, 2); ctx.stroke();
    ctx.fillStyle = '#d7263d'; rrect(ctx, -12, -6, 22, 12, 4); ctx.fill(); ctx.fillStyle = '#a5121f'; rrect(ctx, -14, -10, 8, 10, 3); ctx.fill();
    parcel(ctx, 2, -4, 'cadeau'); parcel(ctx, -4, -6, 'etoile');
    // deux phoques attelés (pas de renne)
    [22, 36].forEach((dx) => { ell(ctx, dx, 4, 7, 4, '#7d8aa8'); circle(ctx, dx + 5, 0, 3.2, '#7d8aa8'); circle(ctx, dx + 6, -0.5, 0.8, '#111'); });
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(14, 2); ctx.lineTo(34, 2); ctx.stroke();
    ctx.restore();
}


function evIcon(ctx, id, x, y, s = 1) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = 2;
    if (id === 'fog') { ctx.strokeStyle = '#6b7a99'; [-4, 0, 4].forEach((yy, i) => { ctx.beginPath(); ctx.moveTo(-6 + i, yy); ctx.lineTo(6 - i, yy); ctx.stroke(); }); }
    if (id === 'crack') { ctx.strokeStyle = '#d7263d'; ctx.beginPath(); ctx.moveTo(-2, -7); ctx.lineTo(2, -2); ctx.lineTo(-2, 1); ctx.lineTo(3, 7); ctx.stroke(); }
    if (id === 'storm') { ctx.strokeStyle = '#3b82f6'; ctx.beginPath(); ctx.arc(0, 0, 5.5, 0.3, 4.6); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, 2.4, 3.4, 7.4); ctx.stroke(); }
    if (id === 'aurora') { ctx.strokeStyle = '#2bb673'; ctx.beginPath(); ctx.moveTo(-7, 3); ctx.quadraticCurveTo(-3, -7, 0, 0); ctx.quadraticCurveTo(3, 7, 7, -3); ctx.stroke(); }
    if (id === 'burst') { ctx.fillStyle = '#c99a5b'; ctx.fillRect(-4, -2, 8, 7); ctx.strokeStyle = '#ff9f43'; ctx.beginPath(); ctx.moveTo(-7, -4); ctx.lineTo(-5, -6); ctx.moveTo(7, -4); ctx.lineTo(5, -6); ctx.moveTo(0, -5); ctx.lineTo(0, -8); ctx.stroke(); }
    ctx.restore();
}

// ---------------------------------------------------------------- interface
function hud(ctx, o) {
    // bandeau du haut
    ctx.fillStyle = 'rgba(8,14,34,0.78)'; ctx.fillRect(0, 0, GW, 34);
    const k = o.tk || 0.4; circle(ctx, 20, 17, 11, 'rgba(255,255,255,0.15)'); ctx.beginPath(); ctx.moveTo(20, 17); ctx.arc(20, 17, 11, -Math.PI / 2, -Math.PI / 2 + TAU * k); ctx.closePath(); ctx.fillStyle = '#ffd36e'; ctx.fill();
    txt(ctx, o.round || 'Tournée 2/3 · Midi', 38, 17, 13, '#fff', 800, 'left', UI);
    // frise de la tournée
    const fx = 230, fw = 340; pill(ctx, fx, 12, fw, 10, 'rgba(255,255,255,0.14)'); pill(ctx, fx, 12, fw * k, 10, 'rgba(255,211,110,0.55)');
    (o.events || []).forEach(([at, ic]) => { const x = fx + fw * at; circle(ctx, x, 17, 10, '#ffffff'); evIcon(ctx, ic, x, 17, 1); });
    ctx.fillStyle = '#ffd36e'; ctx.fillRect(fx + fw * k - 1, 6, 2, 22);
    txt(ctx, (o.score || 1840).toLocaleString('fr-FR'), GW - 14, 17, 17, '#ffd36e', 800, 'right', UI); txt(ctx, 'Score', GW - 70, 17, 11, 'rgba(255,255,255,0.7)', 600, 'right');
    // dépôt du bas
    ctx.fillStyle = 'rgba(8,14,34,0.82)'; ctx.fillRect(0, GH - 46, GW, 46);
    const dep = o.depot || { train: 2, boat: 1, plane: 1 };
    [['train', 'Trains'], ['boat', 'Bateaux'], ['plane', 'Avions']].forEach(([id, lb], i) => {
        const x = 12 + i * 118; rrect(ctx, x, GH - 38, 110, 30, 10); ctx.fillStyle = o.drag === id ? 'rgba(255,211,110,0.35)' : 'rgba(255,255,255,0.1)'; ctx.fill();
        ctx.save(); ctx.translate(x + 26, GH - 23);
        if (id === 'train') trainIcon(ctx, 6, 0, 0.5, 1);
        if (id === 'boat') boatIcon(ctx, 0, 1, 0.55, 1, [], false);
        if (id === 'plane') planeIcon(ctx, 0, -1, 0.62, 1);
        ctx.restore();
        txt(ctx, `${lb} ×${dep[id]}`, x + 46, GH - 23, 12, dep[id] ? '#fff' : 'rgba(255,255,255,0.4)', 700);
    });
    const sx = 368; rrect(ctx, sx, GH - 39, 118, 32, 16); ctx.fillStyle = o.sleighHot ? '#ffd36e' : 'rgba(255,211,110,0.22)'; ctx.fill(); ctx.strokeStyle = '#ffd36e'; ctx.lineWidth = 1.5; ctx.stroke();
    sleigh(ctx, sx + 22, GH - 22, 0.62); txt(ctx, `Traîneau ×${o.sleighs ?? 1}`, sx + 52, GH - 23, 12, o.sleighHot ? '#2a1d05' : '#ffe3a1', 800);
    // humeur + attente
    const hx = 506, hw = 170, hum = o.humeur ?? 0.68;
    txt(ctx, 'Humeur', hx, GH - 32, 11, 'rgba(255,255,255,0.75)', 600);
    pill(ctx, hx, GH - 24, hw, 12, 'rgba(255,255,255,0.14)'); pill(ctx, hx, GH - 24, hw * hum, 12, hum < 0.3 ? '#ff5d5d' : hum < 0.5 ? '#ffb15e' : '#7be0a3');
    ctx.fillStyle = '#ff5d5d'; ctx.fillRect(hx + hw * 0.25 - 1, GH - 28, 2, 20);
    txt(ctx, `${Math.round(hum * 100)} %`, hx + hw + 10, GH - 18, 13, '#fff', 800, 'left', UI);
    txt(ctx, 'En attente', GW - 14, GH - 32, 11, 'rgba(255,255,255,0.75)', 600, 'right'); txt(ctx, `${o.waiting ?? 18} / 40`, GW - 14, GH - 16, 14, (o.waiting ?? 18) > 32 ? '#ff5d5d' : '#fff', 800, 'right', UI);
}
function chief(ctx, text, x = 14, y = 44, w = 300) { // la Cheffe Mouette et sa bulle
    rrect(ctx, x + 40, y, w, 38, 12); ctx.fillStyle = 'rgba(255,250,240,0.96)'; ctx.fill();
    txt(ctx, 'Cheffe Mouette', x + 52, y + 11, 10, '#a5121f', 800, 'left', UI); txt(ctx, text, x + 52, y + 26, 11, '#1d2542', 600);
    seagull(ctx, x + 20, y + 22, 0.62, 0.5, { facing: 1 });
}

function world(ctx, open = [], o = {}) {
    sea(ctx, o.t || 0, o.storm);
    const vis = o.isles || Object.keys(ISLES);
    LINKS.forEach(([a, b, type]) => { if (!vis.includes(a) || !vis.includes(b)) return; const st = open.find((l) => l[0] === a && l[1] === b && l[2] === type); drawLink(ctx, a, b, type, st ? st[3] || 'open' : 'possible'); });
    (o.isles || Object.keys(ISLES)).forEach((k) => island(ctx, k, { hatch: (o.hatch || []).includes(k), flicker: o.flicker, t: o.t }));
}

// ---------------------------------------------------------------- les écrans
function scrBrief(ctx) {
    world(ctx, [['tri', 'poisson', 'rail'], ['tri', 'sapin', 'rail']], { isles: ['tri', 'poisson', 'sapin', 'phoque', 'morse'], t: 1 });
    ctx.fillStyle = 'rgba(6,12,30,0.62)'; ctx.fillRect(0, 0, GW, GH);
    rrect(ctx, 150, 60, 500, 330, 22); ctx.fillStyle = '#121a36'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.stroke();
    seagull(ctx, 210, 128, 1.3, 0.4, { facing: 1 });
    txt(ctx, 'Chronoflocon', 260, 100, 28, '#fff', 800, 'left', UI); txt(ctx, 'Épisode 3 · le centre de tri du Pôle', 262, 128, 13, '#ffd36e', 700);
    txt(ctx, '« L’éclat de givre a détraqué la grande trieuse.', 182, 170, 13, 'rgba(255,255,255,0.9)', 500);
    txt(ctx, 'Trois tournées avant le Réveillon : relie les îles,', 182, 190, 13, 'rgba(255,255,255,0.9)', 500);
    txt(ctx, 'les colis trouvent leur chemin tout seuls ! »', 182, 210, 13, 'rgba(255,255,255,0.9)', 500);
    txt(ctx, 'La météo du jour (même pour tout le monde)', 182, 246, 12, 'rgba(255,255,255,0.7)', 700);
    [['Matin', '50 s', []], ['Midi', '70 s', [['fog', 'Brouillard à 0:40']]], ['Soir', '80 s', [['crack', 'Banquise fendue 0:25'], ['aurora', 'Aurore ×2 à 1:00']]]].forEach(([n, d, ev], i) => {
        const y = 272 + i * 26; txt(ctx, `${n}`, 182, y, 13, '#fff', 800, 'left', UI); txt(ctx, d, 240, y, 12, 'rgba(255,255,255,0.6)', 600);
        ev.forEach(([ic, lb], j) => { pill(ctx, 290 + j * 170, y - 10, 160, 20, 'rgba(255,255,255,0.1)'); circle(ctx, 302 + j * 170, y, 8, '#fff'); evIcon(ctx, ic, 302 + j * 170, y, 0.8); txt(ctx, lb, 316 + j * 170, y, 11, '#fff', 600); });
        if (!ev.length) txt(ctx, 'calme : on apprend', 290, y, 11, 'rgba(255,255,255,0.6)', 600);
    });
    pill(ctx, 470, 345, 150, 34, '#ffd36e'); txt(ctx, 'C’est parti !', 545, 362, 15, '#2a1d05', 800, 'center', UI);
}
function scrMatin(ctx) {
    world(ctx, [['tri', 'poisson', 'rail'], ['tri', 'sapin', 'rail']], { isles: ['tri', 'poisson', 'sapin', 'phoque', 'morse'], t: 2 });
    train(ctx, 'tri', 'poisson', 0.55, ['poisson', 'poisson']); train(ctx, 'sapin', 'tri', 0.3, ['tri']);
    queue(ctx, 'tri', [{ k: 'poisson' }, { k: 'sapin' }, { k: 'phoque' }, { k: 'morse' }, { k: 'phoque' }]);
    queue(ctx, 'sapin', [{ k: 'phoque' }, { k: 'phoque' }], -1);
    client(ctx, ISLES.phoque.x + 14, ISLES.phoque.y + 6, 1, 'seal', 1);
    // le geste : glisser d'une île à l'autre
    ctx.save(); ctx.strokeStyle = '#ffd36e'; ctx.lineWidth = 4; ctx.setLineDash([8, 6]); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(ISLES.sapin.x, ISLES.sapin.y); ctx.lineTo(205, 318); ctx.stroke(); ctx.restore();
    circle(ctx, 205, 318, 14, 'rgba(255,211,110,0.4)');
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(205, 318); ctx.lineTo(205, 336); ctx.lineTo(210, 331); ctx.lineTo(215, 341); ctx.lineTo(218, 339); ctx.lineTo(213, 330); ctx.lineTo(220, 329); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#1d2542'; ctx.lineWidth = 1.2; ctx.stroke();
    pill(ctx, 120, 360, 170, 24, 'rgba(8,14,34,0.85)'); txt(ctx, '⛴  Chenal : un bateau part', 132, 372, 11, '#bfe9ff', 700);
    chief(ctx, 'Glisse d’une île à l’autre pour ouvrir une liaison !');
    hud(ctx, { round: 'Tournée 1/3 · Matin', tk: 0.35, events: [], score: 260, depot: { train: 0, boat: 1, plane: 0 }, humeur: 0.82, waiting: 7 });
}
function scrMidi(ctx) {
    const open = [['tri', 'poisson', 'rail'], ['tri', 'sapin', 'rail'], ['sapin', 'phoque', 'boat'], ['phoque', 'morse', 'rail'], ['etoile', 'cadeau', 'rail'], ['tri', 'cadeau', 'boat'], ['tri', 'etoile', 'air']];
    world(ctx, open, { isles: ['tri', 'poisson', 'sapin', 'phoque', 'morse', 'etoile', 'cadeau'], hatch: ['etoile', 'cadeau'], t: 3, flicker: 1 });
    train(ctx, 'tri', 'poisson', 0.8, ['poisson', 'morse']); train(ctx, 'tri', 'sapin', 0.4, ['sapin', 'phoque']); train(ctx, 'phoque', 'morse', 0.6, ['morse']); train(ctx, 'etoile', 'cadeau', 0.35, ['cadeau', 'cadeau']);
    boat(ctx, 'sapin', 'phoque', 0.5, ['phoque']); plane(ctx, 'tri', 'etoile', 0.55);
    // un bateau qu'on déplace d'un chenal calme vers le chenal saturé
    ctx.save(); ctx.globalAlpha = 0.45; boat(ctx, 'tri', 'cadeau', 0.5, [], false); ctx.restore();
    ctx.save(); ctx.strokeStyle = '#ffd36e'; ctx.lineWidth = 3; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.moveTo(509, 237); ctx.quadraticCurveTo(470, 140, 475, 186); ctx.stroke(); ctx.restore();
    boat(ctx, 'tri', 'etoile', 0.45, [], false);
    pill(ctx, 455, 196, 112, 22, 'rgba(8,14,34,0.85)'); txt(ctx, 'Bateau déplacé', 467, 207, 11, '#ffd36e', 700);
    queue(ctx, 'tri', [{ k: 'etoile', ex: true }, { k: 'cadeau' }, { k: 'morse' }, { k: 'etoile' }, { k: 'phoque' }, { k: 'cadeau' }, { k: 'poisson' }, { k: 'sapin' }, { k: 'etoile' }, { k: 'cadeau' }]);
    queue(ctx, 'etoile', [{ k: 'tri' }, { k: 'sapin' }, { k: 'tri' }, { k: 'poisson' }], 1);
    client(ctx, ISLES.cadeau.x - 6, ISLES.cadeau.y + 8, 2, 'penguin', 3); client(ctx, ISLES.morse.x + 10, ISLES.morse.y + 8, 1, 'seal', 3);
    // l'express doré et son minuteur
    glow(ctx, ISLES.tri.x + 30, ISLES.tri.y + 30, 24, 'rgba(255,210,63,A)', 0.5);
    pill(ctx, 448, 286, 120, 22, 'rgba(8,14,34,0.85)'); txt(ctx, '★ Express : 9 s', 460, 297, 11, '#ffd23f', 800);
    // Radio Banquise : l'événement annoncé
    rrect(ctx, 520, 44, 268, 40, 12); ctx.fillStyle = 'rgba(160,30,40,0.92)'; ctx.fill();
    txt(ctx, 'RADIO BANQUISE', 532, 56, 10, '#ffd36e', 800, 'left', UI); txt(ctx, 'La banquise se fend dans 6 s : Étoile ↔ Cadeau', 532, 72, 11, '#fff', 600);
    chief(ctx, 'Le colis doré part en avion, vite !', 14, 44, 230);
    hud(ctx, { round: 'Tournée 2/3 · Midi', tk: 0.55, events: [[0.55, 'fog'], [0.62, 'crack']], score: 1840, depot: { train: 0, boat: 0, plane: 0 }, humeur: 0.64, waiting: 22, drag: 'boat' });
}
function scrBilan(ctx) {
    world(ctx, [['tri', 'poisson', 'rail'], ['tri', 'sapin', 'rail'], ['sapin', 'phoque', 'boat'], ['etoile', 'cadeau', 'rail'], ['tri', 'cadeau', 'boat']], { isles: ['tri', 'poisson', 'sapin', 'phoque', 'morse', 'etoile', 'cadeau'], t: 4 });
    ctx.fillStyle = 'rgba(6,12,30,0.66)'; ctx.fillRect(0, 0, GW, GH);
    txt(ctx, 'Fin de la tournée du Midi', GW / 2, 64, 24, '#fff', 800, 'center', UI);
    txt(ctx, '58 colis livrés · humeur 71 % · 3 express sur 5 · +1 240 points', GW / 2, 92, 13, 'rgba(255,255,255,0.8)', 600, 'center');
    txt(ctx, 'Choisis un renfort pour le Soir', GW / 2, 132, 15, '#ffd36e', 800, 'center', UI);
    const card = (x, title, line1, line2, drawIcon, hot) => {
        rrect(ctx, x, 152, 220, 200, 18); ctx.fillStyle = hot ? '#1d2a55' : '#151f40'; ctx.fill(); ctx.strokeStyle = hot ? '#ffd36e' : 'rgba(255,255,255,0.2)'; ctx.lineWidth = hot ? 2.5 : 1; ctx.stroke();
        ctx.save(); ctx.translate(x + 110, 214); drawIcon(); ctx.restore();
        txt(ctx, title, x + 110, 270, 17, '#fff', 800, 'center', UI); txt(ctx, line1, x + 110, 296, 12, 'rgba(255,255,255,0.8)', 500, 'center'); txt(ctx, line2, x + 110, 314, 12, 'rgba(255,255,255,0.8)', 500, 'center');
    };
    card(150, '+1 bateau', 'Un deuxième bateau pour', 'les chenaux saturés.', () => { boatIcon(ctx, 0, 0, 2.2, 1, [], false); }, true);
    card(430, 'Piste sur l’île Cadeau', 'L’avion peut desservir', 'Cadeau : idéal pour l’express.', () => { ctx.scale(2, 2); ctx.fillStyle = '#8a9bb5'; rrect(ctx, -20, -5, 40, 10, 3); ctx.fill(); ctx.fillStyle = '#fff'; for (let i = -16; i < 16; i += 7) ctx.fillRect(i, -1, 4, 2); }, false);
    txt(ctx, 'Le soir : 3 îles de plus, un rush et deux événements. Ton réseau est conservé.', GW / 2, 384, 12, 'rgba(255,255,255,0.65)', 600, 'center');
}
function scrSoir(ctx) {
    const open = [['tri', 'poisson', 'rail'], ['tri', 'sapin', 'rail'], ['sapin', 'phoque', 'boat'], ['phoque', 'morse', 'rail'], ['etoile', 'cadeau', 'rail', 'cut'], ['tri', 'cadeau', 'boat'], ['tri', 'etoile', 'boat'], ['tri', 'aurore', 'air'], ['poisson', 'morse', 'boat']];
    world(ctx, open, { t: 5, storm: 1, flicker: 1 });
    train(ctx, 'tri', 'poisson', 0.3, ['poisson', 'aurore']); train(ctx, 'sapin', 'tri', 0.6, ['tri', 'etoile']); boat(ctx, 'tri', 'cadeau', 0.3, ['cadeau']); boat(ctx, 'etoile', 'tri', 0.6, ['tri']); boat(ctx, 'poisson', 'morse', 0.5, ['morse']); plane(ctx, 'tri', 'aurore', 0.4);
    queue(ctx, 'tri', Array.from({ length: 13 }, (_, i) => ({ k: ['cadeau', 'etoile', 'aurore', 'morse', 'phoque'][i % 5], ex: i === 3 })));
    queue(ctx, 'cadeau', Array.from({ length: 9 }, (_, i) => ({ k: ['tri', 'etoile', 'sapin'][i % 3] })), 1);
    client(ctx, ISLES.cadeau.x - 8, ISLES.cadeau.y + 8, 2, 'penguin', 5); client(ctx, ISLES.etoile.x + 18, ISLES.etoile.y + 10, 2, 'seal', 6); client(ctx, ISLES.aurore.x + 4, ISLES.aurore.y + 10, 1, 'penguin', 5);
    // le traîneau de secours de Mamie
    sleigh(ctx, 660, 200, 1.4);
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2; ctx.setLineDash([3, 6]); ctx.beginPath(); ctx.moveTo(760, 120); ctx.quadraticCurveTo(720, 170, 680, 196); ctx.stroke(); ctx.setLineDash([]);
    // sursis : liseré rouge
    ctx.strokeStyle = 'rgba(255,60,60,0.85)'; ctx.lineWidth = 8; ctx.strokeRect(4, 38, GW - 8, GH - 88);
    rrect(ctx, 250, 44, 300, 40, 12); ctx.fillStyle = 'rgba(160,30,40,0.95)'; ctx.fill();
    txt(ctx, 'SURSIS : 6 s', 262, 56, 10, '#ffd36e', 800, 'left', UI); txt(ctx, 'Mamie envoie un traîneau de secours !', 262, 72, 11, '#fff', 600);
    chief(ctx, 'Rush du Réveillon : tiens bon !', 14, 44, 200);
    hud(ctx, { round: 'Tournée 3/3 · Soir', tk: 0.7, events: [[0.31, 'crack'], [0.75, 'aurora']], score: 3520, depot: { train: 0, boat: 0, plane: 0 }, humeur: 0.27, waiting: 35, sleighHot: true, sleighs: 2 });
}
function scrFin(ctx) {
    world(ctx, [['tri', 'poisson', 'rail'], ['tri', 'sapin', 'rail'], ['sapin', 'phoque', 'boat'], ['etoile', 'cadeau', 'rail'], ['tri', 'cadeau', 'boat'], ['tri', 'aurore', 'air']], { t: 6 });
    ctx.fillStyle = 'rgba(6,12,30,0.66)'; ctx.fillRect(0, 0, GW, GH);
    rrect(ctx, 200, 34, 400, 382, 24); ctx.fillStyle = '#121a36'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.stroke();
    txt(ctx, 'Le Réveillon est livré !', GW / 2, 70, 24, '#fff', 800, 'center', UI); txt(ctx, 'Archipel du 15/12', GW / 2, 94, 12, 'rgba(255,255,255,0.7)', 600, 'center');
    [['Colis livrés', '168 / 182  ·  2 460'], ['Rapidité (bonus)', '+ 610'], ['Express', '9 / 15  ·  + 450'], ['Humeur finale', '88 %  ·  × 1,35'], ['Traîneau gardé', '1  ·  + 150']].forEach(([a, b], i) => { txt(ctx, a, 232, 126 + i * 24, 13, 'rgba(255,255,255,0.8)', 500); txt(ctx, b, 568, 126 + i * 24, 13, '#ffd36e', 700, 'right'); });
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.beginPath(); ctx.moveTo(230, 248); ctx.lineTo(570, 248); ctx.stroke();
    txt(ctx, 'Score', 232, 278, 15, '#fff', 700); txt(ctx, '4 940', 520, 280, 36, '#fff', 800, 'right', UI); circle(ctx, 552, 278, 20, '#ffd23f'); txt(ctx, 'S', 552, 279, 22, '#15122a', 800, 'center', UI);
    // l'éclat sort du dernier colis
    ctx.fillStyle = '#c99a5b'; rrect(ctx, 290, 322, 34, 24, 4); ctx.fill(); ctx.fillStyle = '#a77a43'; ctx.beginPath(); ctx.moveTo(290, 322); ctx.lineTo(307, 310); ctx.lineTo(324, 322); ctx.fill();
    glow(ctx, 307, 304, 26, 'rgba(127,232,255,A)', 0.7); shard(ctx, 307, 302, 0.9, 0, 1);
    txt(ctx, 'Éclat de givre 3 / 3 !', 340, 320, 14, '#7fe8ff', 800, 'left', UI); txt(ctx, 'Le fort du Golem peut s’ouvrir.', 340, 338, 12, 'rgba(255,255,255,0.75)', 600);
    pill(ctx, 248, 370, 140, 34, '#ffffff'); txt(ctx, 'Rejouer', 318, 387, 15, '#2a1d05', 800, 'center', UI);
    pill(ctx, 412, 370, 140, 34, '#ffd36e'); txt(ctx, 'Quête ▸', 482, 387, 15, '#2a1d05', 800, 'center', UI);
}

// ---------------------------------------------------------------- planches
function screen(fn) { const c = document.createElement('canvas'); c.width = GW * 2; c.height = GH * 2; const x = c.getContext('2d'); x.scale(2, 2); fn(x); return c; }
function board(ctx, title, sub, items, cols = 2) {
    const BW = ctx.canvas.width, pad = 60;
    ctx.fillStyle = '#0b1220'; ctx.fillRect(0, 0, BW, ctx.canvas.height);
    pill(ctx, pad, 46, 520, 34, 'rgba(215,38,61,0.25)'); txt(ctx, 'ÉPISODE 3 · 15 DÉCEMBRE · ' + sub.toUpperCase(), pad + 18, 63, 15, '#ffb3bd', 800, 'left', UI);
    txt(ctx, title, pad, 128, 52, '#fff', 800, 'left', UI);
    const cw = (BW - pad * 2 - (cols - 1) * 40) / cols, ch = cw * GH / GW;
    items.forEach(([fn, n, head, desc], i) => {
        const x = pad + (i % cols) * (cw + 40), y = 190 + Math.floor(i / cols) * (ch + 150);
        ctx.save(); rrect(ctx, x, y, cw, ch, 18); ctx.clip(); ctx.drawImage(screen(fn), x, y, cw, ch); ctx.restore();
        circle(ctx, x + 16, y + ch + 40, 16, '#ffd36e'); txt(ctx, String(n), x + 16, y + ch + 41, 16, '#2a1d05', 800, 'center', UI);
        txt(ctx, head, x + 44, y + ch + 41, 22, '#fff', 800, 'left', UI);
        desc.forEach((l, j) => txt(ctx, l, x + 44, y + ch + 72 + j * 24, 16, 'rgba(255,255,255,0.75)', 500));
    });
}
window.drawPOV = () => {
    const c = document.getElementById('c'); c.width = 2200; c.height = 2380; const ctx = c.getContext('2d');
    board(ctx, 'Chronoflocon, écran par écran', 'vue joueur', [
        [scrBrief, 1, 'Le brief de la Cheffe Mouette', ['La météo du jour est connue d’avance : même partie pour tout le monde.', 'Trois tournées : Matin 50 s, Midi 70 s, Soir 80 s.']],
        [scrMatin, 2, 'Matin : on apprend le geste', ['Glisser d’une île à l’autre : la géographie choisit le mode (train, bateau…).', 'Aucune défaite possible pendant cette tournée.']],
        [scrMidi, 3, 'Midi : ça bouge !', ['Déplacer un bateau vers le chenal saturé, viser l’express en avion,', 'anticiper la banquise qui se fend (zone hachurée, annoncée 8 s avant).']],
        [scrBilan, 4, 'Bilan et renfort', ['Une carte parmi deux, tirée par la graine du jour.', 'Le réseau est conservé pour la tournée suivante.']],
        [scrSoir, 5, 'Soir : le rush du Réveillon', ['Tempête, pont coupé, files qui débordent : liseré rouge et sursis.', 'Mamie envoie un traîneau de secours (une fois). Garder le sien rapporte.']],
        [scrFin, 6, 'Fin : score et éclat n°3', ['Détail du score, mention, code de vérification.', 'L’éclat de givre sort du dernier colis du Soir.']]
    ]);
};
window.drawKit = () => {
    const c = document.getElementById('c'); c.width = 2200; c.height = 1500; const ctx = c.getContext('2d');
    ctx.fillStyle = '#0b1220'; ctx.fillRect(0, 0, 2200, 1500);
    pill(ctx, 60, 46, 520, 34, 'rgba(215,38,61,0.25)'); txt(ctx, 'ÉPISODE 3 · 15 DÉCEMBRE · KIT GRAPHIQUE', 78, 63, 15, '#ffb3bd', 800, 'left', UI);
    txt(ctx, 'Chronoflocon : le kit', 60, 128, 52, '#fff', 800, 'left', UI);
    txt(ctx, 'Le centre de tri du Pôle : un archipel d’îles collées, des flux de colis, quatre modes de transport.', 60, 172, 20, 'rgba(255,255,255,0.75)', 500);
    // l'archipel complet, grand
    ctx.save(); rrect(ctx, 60, 210, 1200, 675, 22); ctx.clip(); ctx.scale(1.5, 1.5); ctx.translate(40, 140); world(ctx, [['tri', 'poisson', 'rail'], ['sapin', 'phoque', 'boat'], ['tri', 'aurore', 'air']], { t: 7 }); ctx.restore();
    Object.entries(ISLES).forEach(([k, I]) => txt(ctx, I.name, 60 + (I.x + 0) * 1.5, 210 + (I.y + I.r + 12) * 1.5 - 0, 15, '#ffffff', 800, 'center', UI));
    txt(ctx, 'Gabarit « Couronne » (1 sur 4) : 3 banquises, des îles collées (trains) séparées par des chenaux (bateaux), 3 pistes (avion).', 60, 910, 16, 'rgba(255,255,255,0.7)', 500);
    // colonne de droite : modes, liaisons, clients, événements
    const X = 1310; let y = 230;
    const sec = (t) => { txt(ctx, t, X, y, 15, '#ffb15e', 800, 'left', UI); y += 34; };
    sec('LES QUATRE MODES');
    const row = (draw, name, line) => { ctx.save(); ctx.translate(X + 40, y); draw(); ctx.restore(); txt(ctx, name, X + 100, y - 8, 19, '#fff', 800, 'left', UI); txt(ctx, line, X + 100, y + 16, 15, 'rgba(255,255,255,0.7)', 500); y += 70; };
    row(() => { trainIcon(ctx, 18, 0, 1.3, 1); }, 'Train', 'entre îles collées · 8 colis · rapide · coupé si la banquise se fend');
    row(() => { boatIcon(ctx, 0, 0, 1.6, 1, [], false); }, 'Bateau', 'par un chenal · 12 colis · lent · on peut le déplacer · ralenti par la tempête');
    row(() => { planeIcon(ctx, 0, 0, 1.7, 1); }, 'Avion', 'entre pistes · 4 colis · très rapide · le roi de l’express · cloué par le brouillard');
    row(() => { sleigh(ctx, -10, 0, 1.6); }, 'Traîneau (joker)', 'vide une île d’un coup · tiré par deux phoques · gardé = +150');
    y += 10; sec('LES CLIENTS QUI RÂLENT');
    [[0, 'Calme', '< 15 s'], [1, 'Agacé', '15 à 30 s'], [2, 'Furieux', '> 30 s : l’humeur baisse']].forEach(([m, n, d], i) => { const cx = X + 60 + i * 260; ctx.save(); ctx.translate(cx, y + 60); ctx.scale(1.8, 1.8); client(ctx, 0, 0, m, i === 1 ? 'seal' : 'penguin', 2); ctx.restore(); txt(ctx, n, cx, y + 80, 16, '#fff', 800, 'center', UI); txt(ctx, d, cx, y + 102, 13, 'rgba(255,255,255,0.65)', 500, 'center'); });
    y += 140; sec('ÉVÉNEMENTS DU JOUR (ANNONCÉS 8 S AVANT)');
    [['fog', 'Brouillard', 'avions au sol 15 s'], ['crack', 'Banquise fendue', 'un pont coupé 20 s'], ['storm', 'Tempête', 'bateaux −50 % 15 s'], ['aurora', 'Aurore', 'colis ×2 15 s'], ['burst', 'Rafale', '10 colis d’un coup']].forEach(([ic, n, d], i) => {
        const cx = X + (i % 3) * 270, cy = y + Math.floor(i / 3) * 56; circle(ctx, cx + 18, cy, 18, '#ffffff'); evIcon(ctx, ic, cx + 18, cy, 1.8); txt(ctx, n, cx + 46, cy - 8, 16, '#fff', 800, 'left', UI); txt(ctx, d, cx + 46, cy + 12, 13, 'rgba(255,255,255,0.65)', 500);
    });
    y += 130; sec('LIAISONS ET COLIS');
    ctx.save(); ctx.translate(X, y); ctx.scale(1.6, 1.6);
    const seg = (x0, type, st, lb) => { ctx.save(); ctx.lineCap = 'round'; if (type === 'rail') { ctx.strokeStyle = st ? '#6b4a2e' : 'rgba(255,255,255,0.75)'; ctx.lineWidth = st ? 8 : 2; ctx.setLineDash(st ? [] : [3, 6]); } else if (type === 'boat') { ctx.strokeStyle = 'rgba(160,215,245,0.9)'; ctx.lineWidth = 2.5; ctx.setLineDash([10, 6]); } else { ctx.strokeStyle = 'rgba(255,140,140,0.95)'; ctx.lineWidth = 2; ctx.setLineDash([2, 7]); } ctx.beginPath(); ctx.moveTo(x0, 0); ctx.lineTo(x0 + 70, 0); ctx.stroke(); ctx.restore(); txt(ctx, lb, x0 + 35, 18, 10, 'rgba(255,255,255,0.7)', 600, 'center'); };
    seg(0, 'rail', 0, 'pont possible'); seg(90, 'rail', 1, 'rails posés'); seg(180, 'boat', 1, 'chenal'); seg(270, 'air', 1, 'couloir aérien');
    ['poisson', 'sapin', 'etoile', 'cadeau', 'phoque', 'morse', 'aurore'].forEach((k, i) => parcel(ctx, 6 + i * 16, 44, k)); parcel(ctx, 128, 44, 'etoile', true); txt(ctx, '← un colis par île, l’express est doré', 140, 44, 10, 'rgba(255,255,255,0.7)', 600);
    ctx.restore();
    // bande d'interface en bas à gauche
    ctx.save(); rrect(ctx, 60, 960, 1200, 120, 16); ctx.clip(); ctx.translate(60, 960 - 610 * 1.5 + 0); ctx.scale(1.5, 1.5); ctx.translate(0, 0);
    ctx.restore();
    ctx.save(); ctx.translate(60, 960); ctx.scale(1.5, 1.5); ctx.beginPath(); ctx.rect(0, 0, GW, 34); ctx.clip(); hud(ctx, { events: [[0.55, 'fog'], [0.62, 'crack']], tk: 0.5 }); ctx.restore();
    ctx.save(); ctx.translate(60, 1030 - (GH - 46) * 1.5); ctx.scale(1.5, 1.5); ctx.beginPath(); ctx.rect(0, GH - 46, GW, 46); ctx.clip(); hud(ctx, {}); ctx.restore();
    txt(ctx, 'Bandeau du haut : tournée, chrono, frise des événements à leur seconde exacte, score. Bas : le dépôt (véhicules comptés), le traîneau, l’humeur (défaite sous 25 %) et la file d’attente.', 60, 1130, 16, 'rgba(255,255,255,0.7)', 500);
    txt(ctx, 'Pas d’argent, pas de fenêtre en cours de partie : la ressource, ce sont les véhicules du dépôt.', 60, 1158, 16, 'rgba(255,255,255,0.7)', 500);
    // ce qui rend le jeu dynamique
    y = 1220; txt(ctx, 'CE QUI REND LE JEU DYNAMIQUE (TOUTES LES 3 À 5 SECONDES, UNE DÉCISION)', 60, y, 15, '#ffb15e', 800, 'left', UI);
    ['Ouvrir une nouvelle liaison ou doubler une liaison existante (deuxième véhicule).', 'Retirer un bateau d’un chenal calme pour renforcer un chenal saturé.', 'Envoyer l’avion sur l’express doré avant la fin de son minuteur.', 'Contourner un pont qui va se fendre (zone hachurée) avant qu’il ne coupe le réseau.', 'Griller son traîneau pour sauver une île… ou le garder pour le bonus.']
        .forEach((l, i) => txt(ctx, `•  ${l}`, 60, y + 36 + i * 28, 17, 'rgba(255,255,255,0.85)', 500));
};
