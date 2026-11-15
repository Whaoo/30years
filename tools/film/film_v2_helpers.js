const DISP = '"Bricolage Grotesque", "Inter Display", Inter, system-ui, sans-serif';
const BODY = '"DM Sans", Inter, system-ui, sans-serif';

// ---------------------------------------------------------------- décors réutilisés
function igloo(ctx, x, y, r, light = 1) {
    ctx.save(); ctx.translate(x, y);
    ell(ctx, 0, 6, r * 1.15, r * 0.16, 'rgba(10,22,48,0.25)');
    const g = ctx.createLinearGradient(0, -r, 0, 0); g.addColorStop(0, '#f6faff'); g.addColorStop(1, '#c9dcf0');
    ctx.beginPath(); ctx.arc(0, 0, r, Math.PI, 0); ctx.closePath(); ctx.fillStyle = g; ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r, Math.PI, 0); ctx.closePath(); ctx.clip();
    ctx.strokeStyle = 'rgba(120,150,190,0.45)'; ctx.lineWidth = Math.max(1.5, r * 0.012);
    for (let i = 1; i < 5; i++) { const yy = -r * i / 5; ctx.beginPath(); ctx.moveTo(-r, yy); ctx.lineTo(r, yy); ctx.stroke();
        const n = 7 - i; for (let j = 0; j < n; j++) { const xx = -r + (j + (i % 2) * 0.5) * (2 * r / n); ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx, yy + r / 5); ctx.stroke(); } }
    ctx.restore();
    // tunnel d'entrée
    const tr = r * 0.34;
    ctx.beginPath(); ctx.arc(r * 0.55, 0, tr, Math.PI, 0); ctx.lineTo(r * 0.55 + tr, 0); ctx.closePath(); ctx.fillStyle = '#e4eef9'; ctx.fill();
    ctx.beginPath(); ctx.arc(r * 0.55, 0, tr * 0.62, Math.PI, 0); ctx.closePath();
    const dg = ctx.createRadialGradient(r * 0.55, -tr * 0.2, 0, r * 0.55, -tr * 0.2, tr * 0.8);
    dg.addColorStop(0, `rgba(255,190,110,${0.95 * light})`); dg.addColorStop(1, `rgba(200,110,50,${0.9 * light})`);
    ctx.fillStyle = light > 0 ? dg : '#2a3f63'; ctx.fill();
    // petite fenêtre
    ctx.beginPath(); ctx.arc(-r * 0.35, -r * 0.45, r * 0.1, 0, TAU); ctx.fillStyle = `rgba(255,200,120,${0.9 * light})`; ctx.fill();
    ctx.restore();
    if (light > 0) { glow(ctx, x + r * 0.55, y - tr * 0.2, r * 0.9, 'rgba(255,170,90,A)', 0.35 * light); glow(ctx, x - r * 0.35, y - r * 0.45, r * 0.4, 'rgba(255,190,110,A)', 0.3 * light); }
}


function shard(ctx, x, y, s, rot, a = 1) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s); ctx.globalAlpha = a;
    glow(ctx, 0, 0, 40, 'rgba(127,232,255,A)', 0.6);
    ctx.fillStyle = '#bff4ff'; ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(7, 0); ctx.lineTo(0, 16); ctx.lineTo(-7, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(7, 0); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
    ctx.restore();
}

function bigTreeIcon(ctx, x, y, h) { pine(ctx, x, y, h, '#1a5c3d', '#2b7f54', '#f2f8ff'); starShape(ctx, x, y - h - 4, h * 0.1, '#ffd36e'); }
function starShape(ctx, x, y, r, col) {
    ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    ctx.closePath(); ctx.fillStyle = col; ctx.fill();
}

// ---------------------------------------------------------------- plans

function interiorBg(ctx, t, fire = 1) {
    ctx.fillStyle = vgrad(ctx, 0, H, [[0, '#3b2a4a'], [0.6, '#6b4a52'], [1, '#8a5a3c']]); ctx.fillRect(-500, -300, W + 1000, H + 600);
    // dôme en blocs de glace réchauffés par le feu
    ctx.save(); ctx.strokeStyle = 'rgba(255,220,190,0.12)'; ctx.lineWidth = 3;
    for (let r = 300; r < 1300; r += 110) { ctx.beginPath(); ctx.arc(W / 2, 760, r, Math.PI, 0); ctx.stroke(); }
    for (let i = 0; i < 18; i++) { const a = Math.PI + i * Math.PI / 18; ctx.beginPath(); ctx.moveTo(W / 2 + Math.cos(a) * 300, 760 + Math.sin(a) * 300); ctx.lineTo(W / 2 + Math.cos(a) * 1300, 760 + Math.sin(a) * 1300); ctx.stroke(); }
    ctx.restore();
    // sol et tapis
    ctx.fillStyle = '#5a3b2a'; ctx.fillRect(-500, 560, W + 1000, 400);
    ell(ctx, 640, 610, 420, 60, '#a5121f'); ell(ctx, 640, 610, 380, 50, '#c2182a'); ctx.strokeStyle = '#ffd36e'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(640, 610, 350, 42, 0, 0, TAU); ctx.stroke();
    // porte (tunnel) à droite
    ctx.fillStyle = '#2a1d2e'; ctx.beginPath(); ctx.moveTo(1060, 560); ctx.lineTo(1060, 400); ctx.arc(1140, 400, 80, Math.PI, 0); ctx.lineTo(1220, 560); ctx.closePath(); ctx.fill();
    // poêle
    ctx.save(); ctx.translate(230, 560);
    ctx.fillStyle = '#2b2f3a'; rrect(ctx, -70, -150, 140, 150, 14); ctx.fill(); ctx.fillRect(-14, -360, 28, 220);
    ctx.fillStyle = '#1a1d26'; rrect(ctx, -46, -110, 92, 70, 10); ctx.fill();
    const fl = fire * (0.8 + 0.2 * noise(t * 3));
    for (let i = 0; i < 5; i++) { const fx = -30 + i * 15, fh = 30 + 18 * Math.sin(t * 9 + i * 1.7) + 10 * noise(t * 4, i);
        ctx.fillStyle = i % 2 ? '#ffb02e' : '#ff7a1a'; ctx.beginPath(); ctx.moveTo(fx - 9, -44); ctx.quadraticCurveTo(fx - 8, -44 - fh * 0.6, fx, -44 - fh); ctx.quadraticCurveTo(fx + 8, -44 - fh * 0.6, fx + 9, -44); ctx.fill(); }
    ctx.fillStyle = '#ffe28a'; ctx.beginPath(); ctx.ellipse(0, -52, 22, 10 + 3 * Math.sin(t * 7), 0, 0, TAU); ctx.fill();
    ctx.restore();
    glow(ctx, 230, 480, 520, 'rgba(255,150,70,A)', 0.32 * fire * (0.85 + 0.15 * noise(t * 5, 3)));
    // laine et étagère
    circle(ctx, 560, 596, 15, '#e94b4b'); ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(560, 596, 9, 0.4, 2.6); ctx.stroke(); ctx.strokeStyle = '#e94b4b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(552, 586); ctx.bezierCurveTo(530, 600, 515, 560, 500, 520); ctx.stroke();
    ctx.fillStyle = '#6b4226'; ctx.fillRect(700, 300, 200, 12); [[720, '#d7263d'], [756, '#ffd36e'], [790, '#3b82f6']].forEach(([x, c]) => { ctx.fillStyle = c; rrect(ctx, x, 262, 26, 38, 4); ctx.fill(); });
    ctx.fillStyle = '#fffaf0'; ctx.fillRect(840, 250, 44, 50); ctx.fillStyle = '#2b7f54'; ctx.beginPath(); ctx.moveTo(862, 258); ctx.lineTo(874, 290); ctx.lineTo(850, 290); ctx.fill();
}

function rocking(ctx, x, y, a) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    ctx.strokeStyle = '#6b4226'; ctx.lineWidth = 8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, -340, 360, Math.PI / 2 - 0.25, Math.PI / 2 + 0.25); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-60, -10); ctx.lineTo(-50, -70); ctx.moveTo(50, -10); ctx.lineTo(40, -70); ctx.moveTo(-60, -70); ctx.lineTo(50, -70); ctx.moveTo(-58, -70); ctx.lineTo(-74, -190); ctx.stroke();
    ctx.fillStyle = '#8e3a63'; ctx.save(); ctx.rotate(-0.1); rrect(ctx, -70, -215, 112, 150, 34); ctx.fill(); ctx.fillStyle = '#a2466f'; rrect(ctx, -60, -205, 92, 130, 28); ctx.fill();
    ctx.strokeStyle = 'rgba(255,211,110,0.5)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-14, -200); ctx.lineTo(-14, -80); ctx.stroke(); ctx.restore();
    ctx.fillStyle = '#b14a7a'; rrect(ctx, -66, -84, 120, 18, 8); ctx.fill();
    ctx.restore();
}

