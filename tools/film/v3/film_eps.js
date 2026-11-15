// ================================================================ cinématiques d'épisode (avant les épisodes 2, 3 et 4)
// Même style que le prologue v3 : livre, carte, narration en serif, grain. Chaque film :
// chapitre → victoire sur le méchant précédent (l'éclat rejoint l'écharpe) → la carte → le dérèglement
// causé par le méchant suivant → Flocon arrive pour l'affronter → titre de l'épisode.

// ---------------------------------------------------------------- éléments communs
function chapterCard(ctx, lt, num, title, sub) {
    ctx.drawImage(mapImg(false), -W * 0.5, -H * 0.5, W * 2.4, H * 2.4);
    ctx.fillStyle = 'rgba(241,230,201,0.72)'; ctx.fillRect(0, 0, W, H);
    const k = ease.out(seg(lt, 0.4, 1.4)), k2 = ease.out(seg(lt, 1.0, 2.0));
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.globalAlpha = k; ctx.font = `italic 400 30px ${BOOK}`; ctx.fillStyle = '#6b5130'; ctx.fillText(typeof num === 'string' ? '~ Épilogue ~' : `~ Chapitre ${num} ~`, W / 2, 260 + (1 - k) * 10);
    ctx.globalAlpha = k2; ctx.font = `400 74px ${SERIF}`; ctx.fillStyle = '#3b2a17'; ctx.fillText(title, W / 2, 345 + (1 - k2) * 12);
    ctx.strokeStyle = '#a5121f'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(W / 2 - 160 * k2, 405); ctx.lineTo(W / 2 + 160 * k2, 405); ctx.stroke();
    starShape(ctx, W / 2, 405, 9, '#a5121f');
    ctx.globalAlpha = ease.out(seg(lt, 1.8, 2.6)); ctx.font = `italic 400 26px ${BOOK}`; ctx.fillStyle = '#6b5130'; ctx.fillText(sub, W / 2, 452);
    ctx.restore();
    vignette(ctx, 0.6);
    if (lt < 0.8) { ctx.fillStyle = `rgba(0,0,0,${1 - seg(lt, 0, 0.8)})`; ctx.fillRect(0, 0, W, H); }
}
// les éclats récupérés, accrochés à l'écharpe de Flocon (repère du pingouin : x, y = pieds, s = échelle)
function scarfShards(ctx, x, y, s, n, t, facing = 1) {
    for (let i = 0; i < n; i++) {
        const sx = x + facing * (-12 + i * 12) * s, sy = y - 50 * s + Math.sin(t * 3 + i) * 1.5 * s;
        glowAt(ctx, sx, sy, 22 * s, 0.75); shard(ctx, sx, sy, 0.62 * s, 0, 1);
    }
}
function flyShard(ctx, lt, t0, t1, from, to) {
    const k = seg(lt, t0, t1);
    if (k <= 0 || k >= 1) return;
    const e = ease.io(k), cx = (from[0] + to[0]) / 2, cy = Math.min(from[1], to[1]) - 160;
    const u = 1 - e, x = u * u * from[0] + 2 * u * e * cx + e * e * to[0], y = u * u * from[1] + 2 * u * e * cy + e * e * to[1];
    for (let j = 1; j < 8; j++) { const ee = Math.max(0, e - j * 0.03), uu = 1 - ee; circle(ctx, uu * uu * from[0] + 2 * uu * ee * cx + ee * ee * to[0], uu * uu * from[1] + 2 * uu * ee * cy + ee * ee * to[1], 6 - j * 0.6, `rgba(200,250,255,${0.5 - j * 0.06})`); }
    glowAt(ctx, x, y, 50, 0.8); shard(ctx, x, y, 1.4, e * 10, 1);
}
function sparkle(ctx, x, y, lt, t0, n = 8, r = 60, col = '#ffd36e') {
    const k = seg(lt, t0, t0 + 0.9); if (k <= 0 || k >= 1) return;
    for (let i = 0; i < n; i++) { const a = (i / n) * TAU + k; starShape(ctx, x + Math.cos(a) * r * k, y + Math.sin(a) * r * k, 9 * (1 - k), col); }
}
// la carte : on suit le chemin de la quête d'une étape à la suivante
const STOP_IDX = [40, 81, 122, 163];
function mapLeg(ctx, t, lt, from, to, caption1) {
    const fi = from < 0 ? 0 : STOP_IDX[from], ti = STOP_IDX[to];
    const a = from < 0 ? [262, 590] : STOPS[from], b = STOPS[to];
    const k = ease.io(seg(lt, 1.4, 6.0));
    const cx = lerp((a[0] + b[0]) / 2 - 40, b[0], ease.io(seg(lt, 5.5, 8.4))), cy = lerp((a[1] + b[1]) / 2, b[1], ease.io(seg(lt, 5.5, 8.4)));
    const z = lerp(1.7, 2.6, ease.io(seg(lt, 5.5, 8.4)));
    const [qx, qy] = mapCam(ctx, mapImg(false), cx, cy, z, -0.012);
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(-0.012); ctx.scale(z, z); ctx.translate(-qx, -qy);
    const n = Math.floor(lerp(fi, ti, k));
    ctx.strokeStyle = '#a5121f'; ctx.lineWidth = 3.4; ctx.setLineDash([3, 9]); ctx.lineCap = 'round'; ctx.beginPath();
    for (let i = 0; i <= n; i++) i ? ctx.lineTo(...ROUTE_PTS[i]) : ctx.moveTo(...ROUTE_PTS[i]); ctx.stroke(); ctx.setLineDash([]);
    STOPS.forEach(([x, y, , date], i) => {
        if (i > to) return;
        const done = i < to;
        const kk = i === to ? ease.back(seg(lt, 5.6, 6.2)) : 1;
        if (kk <= 0) return;
        ctx.save(); ctx.translate(x, y); ctx.scale(kk, kk);
        circle(ctx, 0, 0, 13, done ? '#2bb673' : '#a5121f'); ctx.font = `400 15px ${SERIF}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.fillText(done ? '✓' : String(i + 1), 0, 1);
        ctx.fillStyle = 'rgba(241,230,201,0.95)'; ctx.strokeStyle = '#6b5130'; ctx.lineWidth = 1.5; rrect(ctx, -48, 18, 96, 26, 13); ctx.fill(); ctx.stroke();
        ctx.font = `italic 600 16px ${BOOK}`; ctx.fillStyle = done ? '#2b7f54' : '#a5121f'; ctx.fillText(date, 0, 31);
        ctx.restore();
    });
    const p = ROUTE_PTS[n];
    penguin(ctx, p[0], p[1] + 6 - Math.abs(Math.sin(k * Math.PI * 4)) * 14, 0.32, { mood: 'happy', flipR: -1.4, wave: t * 6 });
    ctx.restore();
    vignette(ctx, 0.55);
}
function titleCard(ctx, t, lt, ep, name, line = 'À toi de jouer !') {
    ctx.fillStyle = vgrad(ctx, 0, H, [[0, '#050b1f'], [0.7, '#14244a'], [1, '#2b4a86']]); ctx.fillRect(0, 0, W, H);
    stars(ctx, t, 91 + ep, 200, 520); curtains(ctx, t, 170, 40, 0.8, 9 + ep);
    peaks(ctx, [[120, 630, 360, 200], [430, 630, 300, 150], [850, 630, 340, 170], [1170, 630, 380, 220]], 81 + ep, '#cfdcf0', '#2a4372', '#1d3561');
    ctx.fillStyle = '#e6f1fb'; ctx.beginPath(); ctx.moveTo(0, 620); ctx.quadraticCurveTo(640, 580, W, 620); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    const k1 = ease.out(seg(lt, 0.4, 1.2)); ctx.globalAlpha = k1; ctx.font = `italic 400 32px ${BOOK}`; ctx.fillStyle = '#e9dcc0'; ctx.fillText(`~ Épisode ${ep} ~`, W / 2, 220);
    const k2 = ease.out(seg(lt, 0.8, 1.8)); ctx.globalAlpha = k2;
    const g = ctx.createLinearGradient(0, 250, 0, 360); g.addColorStop(0, '#fff6d6'); g.addColorStop(0.35, '#f2cf7a'); g.addColorStop(0.6, '#c99636'); g.addColorStop(1, '#f6dc95');
    ctx.font = `400 96px ${SERIF}`; ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 24; ctx.fillStyle = g; ctx.fillText(name, W / 2, 335 + (1 - k2) * 12); ctx.shadowBlur = 0;
    ctx.globalAlpha = ease.out(seg(lt, 1.8, 2.4)); ctx.strokeStyle = '#d9b46a'; ctx.lineWidth = 2; [-1, 1].forEach((d) => { ctx.beginPath(); ctx.moveTo(W / 2 + d * 60, 380); ctx.bezierCurveTo(W / 2 + d * 160, 365, W / 2 + d * 220, 400, W / 2 + d * 300, 380); ctx.stroke(); }); starShape(ctx, W / 2, 383, 10, '#f2cf7a');
    ctx.restore();
    const k3 = ease.back(seg(lt, 2.4, 3.0));
    if (k3 > 0) { ctx.save(); ctx.translate(W / 2, 470); ctx.scale(k3, k3); ctx.fillStyle = 'rgba(255,211,110,0.16)'; rrect(ctx, -160, -30, 320, 58, 29); ctx.fill(); ctx.strokeStyle = '#f2cf7a'; ctx.lineWidth = 2; rrect(ctx, -160, -30, 320, 58, 29); ctx.stroke();
        ctx.font = `italic 600 28px ${BOOK}`; ctx.fillStyle = '#ffe9b0'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(line, 0, 0); ctx.restore(); }
    const kp = ease.back(seg(lt, 1.6, 2.3));
    if (kp > 0) { penguin(ctx, W / 2 + 360, 640 + (1 - kp) * 120, 1.25, { mood: 'happy', flipR: -2.3 + Math.sin(t * 8) * 0.4, wave: t * 5 }); scarfShards(ctx, W / 2 + 360, 640 + (1 - kp) * 120, 1.25, ep - 1, t); }
    snowLayer(ctx, t, 26 + ep, 90, 40, 2, 0.8, 22, -10);
    vignette(ctx, 0.55);
}
function mayor(ctx, x, y, s, o = {}) {
    penguin(ctx, x, y, s, { noHat: true, glasses: true, scarf: '#26345e', mood: o.mood || 'normal', facing: o.facing || 1, flipR: o.flipR || 0, blink: o.blink || 0, look: o.look || 0 });
    const P = (lx, ly) => [x + (lx - 60) * s * (o.facing || 1), y + (ly - 104) * s];
    ctx.strokeStyle = '#d7263d'; ctx.lineWidth = 7 * s; ctx.beginPath(); ctx.moveTo(...P(38, 52)); ctx.lineTo(...P(82, 92)); ctx.stroke();
    circle(ctx, ...P(62, 72), 6 * s, '#ffd36e');
    // haut-de-forme bleu nuit à ruban doré (pas de chapeau de personnage connu)
    ctx.fillStyle = '#26345e'; const [hx, hy] = P(60, 10); rrect(ctx, hx - 14 * s, hy - 26 * s, 28 * s, 24 * s, 3 * s); ctx.fill(); rrect(ctx, hx - 22 * s, hy - 4 * s, 44 * s, 6 * s, 3 * s); ctx.fill();
    ctx.fillStyle = '#ffd36e'; ctx.fillRect(hx - 14 * s, hy - 9 * s, 28 * s, 4 * s);
}
function house(ctx, x, y, w, h, col, lit = 1, frozen = 0) {
    ctx.fillStyle = col; ctx.fillRect(x - w / 2, y - h, w, h);
    ctx.fillStyle = mixc(col, '000000', 0.25); ctx.beginPath(); ctx.moveTo(x - w / 2 - 8, y - h + 2); ctx.lineTo(x, y - h - w * 0.45); ctx.lineTo(x + w / 2 + 8, y - h + 2); ctx.fill();
    ctx.fillStyle = '#f4f9ff'; ctx.beginPath(); ctx.moveTo(x - w / 2 - 8, y - h + 2); ctx.lineTo(x, y - h - w * 0.45); ctx.lineTo(x + w / 2 + 8, y - h + 2); ctx.lineTo(x + w / 2, y - h + 8); ctx.lineTo(x, y - h - w * 0.45 + 10); ctx.lineTo(x - w / 2, y - h + 8); ctx.fill();
    ctx.fillStyle = lit > 0 ? `rgba(255,207,122,${0.4 + 0.6 * lit})` : '#2a3a5c'; ctx.fillRect(x - w * 0.3, y - h * 0.65, w * 0.24, h * 0.28); ctx.fillRect(x + w * 0.06, y - h * 0.65, w * 0.24, h * 0.28);
    if (lit > 0) glow(ctx, x, y - h * 0.5, w, 'rgba(255,190,100,A)', 0.3 * lit);
    ctx.fillStyle = '#5b3a22'; ctx.fillRect(x - w * 0.1, y - h * 0.35, w * 0.2, h * 0.35);
    if (frozen > 0) { ctx.save(); ctx.globalAlpha = frozen; ctx.fillStyle = 'rgba(190,235,255,0.55)'; ctx.fillRect(x - w / 2 - 4, y - h - w * 0.45, w + 8, h + w * 0.45); ctx.fillStyle = '#d6f3ff'; for (let i = 0; i < 6; i++) { const ix = x - w / 2 + (i + 0.5) * w / 6; ctx.beginPath(); ctx.moveTo(ix - 4, y - h + 6); ctx.lineTo(ix, y - h + 18 + (i % 3) * 8); ctx.lineTo(ix + 4, y - h + 6); ctx.fill(); } ctx.restore(); }
}
function bigTree(ctx, x, y, h, t, lights = 1, frozen = 0) {
    const tiers = [[0, 0.38], [0.22, 0.66], [0.45, 1]];
    tiers.forEach(([a, b], k) => { const yt = y - h + h * a, yb = y - h + h * b, ww = h * 0.5 * (0.45 + 0.28 * k);
        ctx.fillStyle = mixc('1a5c3d', 'b9dff2', frozen * 0.7); ctx.beginPath(); ctx.moveTo(x, yt); ctx.lineTo(x + ww, yb); ctx.lineTo(x - ww, yb); ctx.closePath(); ctx.fill();
        ctx.fillStyle = mixc('2b7f54', 'd6f0fb', frozen * 0.7); ctx.beginPath(); ctx.moveTo(x, yt); ctx.lineTo(x + ww, yb); ctx.lineTo(x, yb); ctx.closePath(); ctx.fill(); });
    ctx.fillStyle = '#5b3a22'; ctx.fillRect(x - h * 0.04, y, h * 0.08, h * 0.08);
    const r = rng(5); const cols = ['#ff5d5d', '#ffd36e', '#7fe8ff', '#7be0a3', '#ff8fa8'];
    for (let i = 0; i < 26; i++) { const k = r(); const yy = y - h * 0.9 + k * h * 0.88; const half = (yy - (y - h)) / h * h * 0.36; const xx = x + (r() - 0.5) * 2 * half * 0.85;
        const on = lights * (0.6 + 0.4 * Math.sin(t * 4 + i * 1.7)); const c = cols[i % 5];
        if (on > 0.05) glow(ctx, xx, yy, 14, `rgba(255,230,150,A)`, 0.35 * on);
        circle(ctx, xx, yy, 4.5, on > 0.05 ? c : '#3d4b63'); }
    const so = lights * (1 - frozen);
    if (so > 0) glow(ctx, x, y - h - 6, 70, 'rgba(255,215,120,A)', 0.6 * so);
    starShape(ctx, x, y - h - 6, h * 0.07, so > 0.2 ? '#ffd36e' : '#8a94a8');
    if (frozen > 0) { ctx.save(); ctx.globalAlpha = 0.5 * frozen; ctx.fillStyle = '#e6f8ff'; ctx.beginPath(); ctx.moveTo(x, y - h - 20); ctx.lineTo(x + h * 0.4, y + 4); ctx.lineTo(x - h * 0.4, y + 4); ctx.closePath(); ctx.fill(); ctx.restore(); }
}
function villageBg(ctx, t, o = {}) {
    const { lights = 1, frozen = 0, cam = 0 } = o;
    ctx.fillStyle = vgrad(ctx, 0, H, [[0, '#091633'], [0.7, mixc('203b6a', '5d7fa8', frozen)], [1, mixc('3b5f9a', 'bcd3ec', frozen)]]); ctx.fillRect(0, 0, W, H);
    stars(ctx, t, 52, 150, 360);
    ctx.save(); ctx.translate(-cam * 0.3, 0); peaks(ctx, [[150, 470, 420, 180], [560, 470, 380, 150], [1000, 470, 460, 190], [1400, 470, 420, 170]], 101, '#e6eef8', '#4b6596', '#3a5283'); ctx.restore();
    ctx.fillStyle = mixc('dfeaf8', 'eef8ff', frozen); ctx.beginPath(); ctx.moveTo(0, 520); ctx.quadraticCurveTo(640, 480, W, 520); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();
    ctx.save(); ctx.translate(-cam, 0);
    [[140, 560, 120, 80, '#c2182a'], [300, 548, 100, 70, '#3b82f6'], [1000, 552, 110, 76, '#2b7f54'], [1160, 562, 120, 82, '#b14a7a'], [1330, 550, 100, 70, '#d97a1a']].forEach(([x, y, w, h, c]) => house(ctx, x, y, w, h, c, lights, frozen));
    bigTree(ctx, 650, 560, 330, t, lights, frozen);
    ctx.restore();
}

// ================================================================ FILM 2 : avant « Opération Réveillon » (le village)
function f2_victory(ctx, t, lt) {
    ctx.fillStyle = vgrad(ctx, 0, H, [[0, '#2b3570'], [0.55, '#8a6f9f'], [1, '#f2b8a8']]); ctx.fillRect(0, 0, W, H);
    glow(ctx, 980, 430, 380, 'rgba(255,200,150,A)', 0.5);
    peaks(ctx, [[180, 540, 520, 240], [1100, 540, 560, 280]], 111, '#fdf3ee', '#9a86b8', '#7a6aa0'); haze(ctx, 550, 140, '240,200,200', 0.5);
    ctx.fillStyle = '#f6f2f6'; ctx.beginPath(); ctx.moveTo(0, 600); ctx.quadraticCurveTo(640, 560, W, 600); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();
    const hasShard = lt < 3.0;
    yeti2(ctx, 820, 640, 1.9, { t, eyes: 0, shard: hasShard, arms: lt > 6.2 && lt < 9 ? 0.6 + 0.3 * Math.sin(t * 9) : 0 });
    // yeux : d'abord tristes et fermés, puis apaisés
    const ex = (dx) => 820 - dx * 1.9, ey = 640 - 114 * 1.9;
    [ex(-12), ex(12)].forEach((x) => { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); if (lt < 3.4) { ctx.moveTo(x - 9, ey + 2); ctx.quadraticCurveTo(x, ey + 7, x + 9, ey + 2); } else { ctx.moveTo(x - 9, ey + 3); ctx.quadraticCurveTo(x, ey - 6, x + 9, ey + 3); } ctx.stroke(); });
    const fx = 420, fy = 640;
    const jump = lt > 4.6 && lt < 5.4 ? Math.sin(seg(lt, 4.6, 5.4) * Math.PI) * 50 : 0;
    penguin(ctx, fx, fy - jump, 1.35, { mood: lt > 4.4 ? 'happy' : 'normal', look: 1, blink: blinkAt(t, 2), flipR: lt > 4.4 && lt < 6 ? -2.0 : -0.3, wave: t * 4 });
    flyShard(ctx, lt, 3.0, 4.4, [820, 640 - 150 * 1.9], [fx - 14, fy - 44 * 1.35]);
    scarfShards(ctx, fx, fy - jump, 1.35, lt >= 4.4 ? 1 : 0, t);
    sparkle(ctx, fx, fy - 60, lt, 4.4);
    snowLayer(ctx, t, 33, 50, 30, 2, 0.7, 20, -10);
    caption(ctx, t, 5.6, 10.6, 'Le Yéti, enfin soulagé, rendit le premier éclat.', 650, 28);
    subtitle(ctx, t, 11.4, 16.6, 'Merci, petit. J’avais un de ces maux de crâne…', 'Le Yéti');
    vignette(ctx, 0.5);
}
function f2_disrupt(ctx, t, lt) {
    const cam = ease.io(seg(lt, 0, 15)) * 120;
    const lights = clamp(1 - seg(lt, 2.0, 7.0) * 0.8 + (Math.sin(t * 13) > 0.6 ? 0.15 : 0));
    villageBg(ctx, t, { lights, cam });
    ctx.save(); ctx.translate(-cam, 0);
    // les bonshommes grognons avancent en file vers le sapin
    for (let i = 0; i < 7; i++) { const x = 1500 + i * 95 - seg(lt, 1.0, 15) * 760, y = 610 + (i % 2) * 18; snowman(ctx, x, y, 0.55, 1, t + i); }
    // villageois qui se cachent
    [[250, 604, -1], [380, 610, 1], [920, 606, 1]].forEach(([x, y, f], i) => penguin(ctx, x + Math.sin(t * 20 + i) * 1.5, y, 0.75, { mood: 'surprised', facing: f, flipR: -1.8, flipL: 1.4, scarf: ['#7be0a3', '#ffd36e', '#ff8fa8'][i] }));
    ctx.restore();
    // le Gros Bonhomme sur la colline, il ricane
    const kb = ease.out(seg(lt, 5.5, 7.0));
    if (kb > 0) { const bx = 1090 - cam * 0.4, by = 655 + (1 - kb) * 60, bs = 0.78; ctx.save(); ctx.globalAlpha = kb; bigSnowman(ctx, bx, by, bs, { crown: 1, evil: 1, arms: 0.6 + 0.3 * Math.sin(t * 6), t }); evilEyes(ctx, [[bx - 20 * bs, by - 280 * bs], [bx + 20 * bs, by - 280 * bs]], 7.4 * bs, lt, t, 0, 1, '#e8f0fa'); ctx.restore(); }
    snowLayer(ctx, t, 34, 70, 40, 2, 0.7, 26, -30);
    caption(ctx, t, 25.6, 31.4, 'Mais au village, les bonshommes grognons encerclaient le grand sapin…', 650, 28);
    subtitle(ctx, t, 33.0, 37.0, 'Ho ho ho… Plus de Noël pour personne !', 'Le Gros Bonhomme');
    vignette(ctx, 0.6);
}
function f2_arrival(ctx, t, lt) {
    villageBg(ctx, t, { lights: 0.35 + 0.1 * Math.sin(t * 9), cam: 60 });
    // arche du village avec guirlande
    ctx.fillStyle = '#6b4226'; ctx.fillRect(250, 360, 22, 260); ctx.fillRect(560, 360, 22, 260); ctx.fillRect(240, 350, 352, 24);
    ctx.strokeStyle = '#2b7f54'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(250, 380); ctx.quadraticCurveTo(415, 440, 582, 380); ctx.stroke();
    ctx.font = `600 22px ${BOOK}`; ctx.textAlign = 'center'; ctx.fillStyle = '#ffe9b0'; ctx.fillText('Village de Noël', 416, 368);
    const z = 1 + 0.1 * ease.io(seg(lt, 6.0, 12.4));
    ctx.save(); ctx.translate(560, 560); ctx.scale(z, z); ctx.translate(-560, -560);
    const walk = ease.out(seg(lt, 0, 2.2)); const fx = lerp(120, 470, walk);
    penguin(ctx, fx, 612 - (walk < 1 ? Math.abs(Math.sin(t * 10)) * 8 : 0), 1.3, { mood: lt > 6.5 ? 'determined' : 'normal', look: 1, wave: t * 5, flipR: lt > 7 && lt < 9.6 ? -1.8 : 0, blink: blinkAt(t, 3) });
    scarfShards(ctx, fx, 612, 1.3, 1, t);
    const km = ease.back(seg(lt, 1.6, 2.3));
    mayor(ctx, 700, 612 + (1 - km) * 30, 1.35, { facing: -1, mood: lt > 7 ? 'happy' : 'surprised', flipR: lt < 6 ? -1.6 + Math.sin(t * 7) * 0.3 : -0.3, look: -1 });
    ctx.restore();
    subtitle(ctx, t, 43.0, 47.2, 'Flocon ! Il faut défendre le sapin jusqu’au Réveillon !', 'Monsieur le Maire');
    subtitle(ctx, t, 47.6, 51.6, 'Comptez sur moi, Monsieur le Maire !', 'Flocon');
    snowLayer(ctx, t, 35, 60, 40, 2, 0.7, 26, -20);
    vignette(ctx, 0.55);
}
const FILM2 = { dur: 62, sh: [
    { a: 0, b: 5.6, f: (c, t) => chapterCard(c, t, 2, 'Le village de Noël', 'où l’on défend le grand sapin') },
    { a: 5, b: 17.4, f: (c, t) => f2_victory(c, t, t - 5) },
    { a: 17, b: 25.4, f: (c, t) => { mapLeg(c, t, t - 17, 0, 1); caption(c, t, 17.6, 24.8, 'Flocon redescendit vers le village de Noël…', 650, 28); } },
    { a: 25, b: 41.4, f: (c, t) => f2_disrupt(c, t, t - 25) },
    { a: 41, b: 53.4, f: (c, t) => f2_arrival(c, t, t - 41) },
    { a: 53, b: 62.1, f: (c, t) => titleCard(c, t, t - 53, 2, 'Opération Réveillon') }
] };

// ================================================================ FILM 3 : avant « Chronoflocon » (l'Archipel du Tri)
function f3_victory(ctx, t, lt) {
    const lights = 0.35 + ease.out(seg(lt, 6.2, 8.0)) * 0.65;
    villageBg(ctx, t, { lights, cam: 60 });
    ctx.save(); ctx.translate(-60, 0);
    const split = seg(lt, 2.4, 3.0);
    if (split < 1) { ctx.save(); ctx.globalAlpha = 1 - split; bigSnowman(ctx, 1040, 700 + Math.sin(t * 30) * 2 * (lt > 1.2 ? 1 : 0), 0.95, { crown: 1, evil: lt < 1.2 ? 1 : 0, t }); ctx.restore(); }
    if (lt > 2.4) for (let i = 0; i < 3; i++) { const k = seg(lt, 2.6, 6.0); const x = 1040 + (i - 1) * 40 + k * (280 + i * 90), y = 640 - Math.abs(Math.sin(k * 14 + i)) * 20; snowman(ctx, x, y, 0.42, 0, t); }
    // la couronne tombe et fond, l'éclat s'envole vers Flocon
    const ck = seg(lt, 3.0, 4.2); if (ck > 0 && ck < 1) { ctx.globalAlpha = 1 - ck; ctx.fillStyle = '#bff4ff'; ctx.fillRect(1010, 450 + ck * 160, 60, 10 * (1 - ck)); ctx.globalAlpha = 1; }
    ctx.restore();
    const fx = 430, fy = 640;
    penguin(ctx, fx, fy, 1.3, { mood: lt > 5.6 ? 'happy' : 'determined', look: 1, wave: t * 5, flipR: lt > 5.6 && lt < 8 ? -2.0 : -0.3, blink: blinkAt(t, 4) });
    flyShard(ctx, lt, 4.2, 5.6, [980, 450], [fx - 14 + 14, fy - 44 * 1.3]);
    scarfShards(ctx, fx, fy, 1.3, lt >= 5.6 ? 2 : 1, t);
    sparkle(ctx, fx, fy - 60, lt, 5.6);
    if (lt > 6.4) [[240, 610], [820, 612], [930, 606]].forEach(([x, y], i) => penguin(ctx, x, y - Math.abs(Math.sin(t * 6 + i)) * 14, 0.72, { mood: 'happy', flipR: -2.1, flipL: 1.6, scarf: ['#7be0a3', '#ffd36e', '#ff8fa8'][i] }));
    if (lt > 7.6) mayor(ctx, 560, 620, 1.0, { facing: -1, mood: lt > 12 ? 'surprised' : 'happy', flipR: -1.4 });
    caption(ctx, t, 5.6, 11.4, 'Le sapin brillait de nouveau, et le deuxième éclat rejoignit l’écharpe.', 650, 28);
    subtitle(ctx, t, 12.2, 16.6, 'Bravo ! Mais… où sont passés tous les cadeaux ?', 'Monsieur le Maire');
    snowLayer(ctx, t, 36, 50, 30, 2, 0.6, 20, -10);
    vignette(ctx, 0.5);
}
function f3_disrupt(ctx, t, lt) {
    if (lt < 8.4) {
        // l'archipel vu du ciel : colis qui s'empilent, clients furieux
        ctx.save(); ctx.scale(W / GW, H / GH);
        world(ctx, [['tri', 'poisson', 'rail'], ['tri', 'sapin', 'rail'], ['sapin', 'phoque', 'boat'], ['etoile', 'cadeau', 'rail'], ['tri', 'cadeau', 'boat']], { t, flicker: 1, storm: 0 });
        const r = rng(9); for (let i = 0; i < 40; i++) { const k = (t * 0.6 + r()) % 1; const x = 400 + Math.cos(r() * TAU) * k * 380, y = 222 + Math.sin(r() * TAU) * k * 200 - Math.sin(k * Math.PI) * 40; parcel(ctx, x, y, Object.keys(ISLES)[i % 8]); }
        ['poisson', 'sapin', 'etoile', 'cadeau', 'phoque', 'morse'].forEach((k, i) => client(ctx, ISLES[k].x + 14, ISLES[k].y + 8, i % 3 === 0 ? 1 : 2, i % 2 ? 'seal' : 'penguin', t + i));
        boat(ctx, 'tri', 'cadeau', (Math.sin(t) + 1) / 2, [], true);
        ctx.restore();
    } else {
        const cap = caption; caption = () => {}; // pas les légendes du prologue
        try { v3villainTrieuse(ctx, 49 + 2.6 + (lt - 8.4) * 0.9); } finally { caption = cap; }
    }
    caption(ctx, t, 25.6, 32.8, 'Les cadeaux partaient tous de l’Archipel du Tri… mais plus rien n’arrivait.', 650, 28);
    if (lt > 8.4) caption(ctx, t, 33.6, 40.8, 'La Grande Trieuse, détraquée, envoyait les colis n’importe où !', 650, 28);
    vignette(ctx, 0.55);
}
function f3_arrival(ctx, t, lt) {
    ctx.fillStyle = vgrad(ctx, 0, H, [[0, '#f2b38f'], [0.5, '#f6d2b3'], [1, '#9fc4e6']]); ctx.fillRect(0, 0, W, H);
    glow(ctx, 300, 300, 400, 'rgba(255,220,170,A)', 0.6);
    // la mer, le quai, le centre de tri au loin qui clignote
    ctx.fillStyle = vgrad(ctx, 420, H, [[0, '#4f8fbf'], [1, '#1f5a86']]); ctx.fillRect(0, 420, W, H - 420);
    const r = rng(19); for (let i = 0; i < 90; i++) { ctx.strokeStyle = `rgba(255,255,255,${0.1 + r() * 0.15})`; ctx.lineWidth = 1.5; const x = (r() * W + t * 20) % W, y = 430 + r() * 290; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 14, y); ctx.stroke(); }
    ctx.save(); ctx.translate(960, 440); ctx.scale(0.8, 0.8); sortingCenter(ctx, 0, 0, 1, 1, t); ctx.restore(); glow(ctx, 960, 380, 120, 'rgba(127,232,255,A)', 0.4 + 0.3 * Math.sin(t * 12));
    ctx.fillStyle = '#e6eef8'; ctx.beginPath(); ctx.moveTo(760, 440); ctx.quadraticCurveTo(960, 410, 1180, 440); ctx.fill();
    ctx.fillStyle = '#7a5a3a'; ctx.fillRect(560, 560, 720, 26); for (let i = 0; i < 8; i++) ctx.fillRect(580 + i * 90, 586, 14, 120);
    const kb = ease.out(seg(lt, 0, 3.0));
    boatIcon(ctx, lerp(-100, 420, kb), 600 + Math.sin(t * 2) * 3, 4.5, 1, [], kb < 1);
    penguin(ctx, lerp(-100, 420, kb) - 10 + (lt > 3.2 ? ease.out(seg(lt, 3.2, 4.2)) * 280 : 0), 560 - (lt > 3.2 && lt < 4.2 ? Math.sin(seg(lt, 3.2, 4.2) * Math.PI) * 60 : 0), 1.2, { mood: lt > 8 ? 'determined' : 'normal', look: 1, wave: t * 5, blink: blinkAt(t, 5), flipR: lt > 8.2 && lt < 10.4 ? -1.8 : 0 });
    scarfShards(ctx, lerp(-100, 420, kb) - 10 + (lt > 3.2 ? ease.out(seg(lt, 3.2, 4.2)) * 280 : 0), 560, 1.2, 2, t);
    const kg = ease.out(seg(lt, 1.2, 2.6));
    seagull(ctx, lerp(1300, 900, kg), lerp(260, 470, kg) + Math.sin(t * 5) * 6, 2.4, kg < 1 ? t * 14 : 0.4, { facing: -1 });
    subtitle(ctx, t, 42.8, 47.4, 'Flocon ! Plus aucun colis ne part. Il faut relancer le centre de tri !', 'Cheffe Mouette');
    subtitle(ctx, t, 47.8, 51.6, 'Je m’occupe des livraisons !', 'Flocon');
    vignette(ctx, 0.45);
}
const FILM3 = { dur: 62, sh: [
    { a: 0, b: 5.6, f: (c, t) => chapterCard(c, t, 3, 'L’Archipel du Tri', 'où les cadeaux ne partent plus') },
    { a: 5, b: 17.4, f: (c, t) => f3_victory(c, t, t - 5) },
    { a: 17, b: 25.4, f: (c, t) => { mapLeg(c, t, t - 17, 1, 2); caption(c, t, 17.6, 24.8, 'Flocon suivit la piste des colis jusqu’à l’Archipel du Tri…', 650, 28); } },
    { a: 25, b: 41.4, f: (c, t) => f3_disrupt(c, t, t - 25) },
    { a: 41, b: 53.4, f: (c, t) => f3_arrival(c, t, t - 41) },
    { a: 53, b: 62.1, f: (c, t) => titleCard(c, t, t - 53, 3, 'Chronoflocon') }
] };

// ================================================================ FILM 4 : avant le grand final (le fort du Golem)
function f4_victory(ctx, t, lt) {
    // l'entrepôt : la machine se calme et recrache l'éclat
    ctx.fillStyle = vgrad(ctx, 0, H, [[0, '#1a1f33'], [1, '#3a3346']]); ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 5; i++) { const sx = 40 + i * 260; ctx.fillStyle = '#2a2f45'; ctx.fillRect(sx, 120, 200, 380); for (let r = 0; r < 4; r++) { ctx.fillStyle = '#3d4460'; ctx.fillRect(sx, 200 + r * 90, 200, 8); for (let b = 0; b < 4; b++) { ctx.fillStyle = ['#c99a5b', '#b88a4f', '#d7a96a'][(i + r + b) % 3]; ctx.fillRect(sx + 12 + b * 46, 160 + r * 90, 36, 40); } } }
    [300, 980].forEach((lx) => glow(ctx, lx, 120, 260, 'rgba(255,210,140,A)', 0.3));
    ctx.fillStyle = '#2b2a38'; ctx.fillRect(0, 560, W, 160);
    const calm = ease.out(seg(lt, 0.4, 2.0));
    const hic = lt > 3.2 && lt < 4.0 ? Math.sin(seg(lt, 3.2, 4.0) * Math.PI * 3) : 0;
    ctx.save(); ctx.translate(820, 640); ctx.scale(1 + hic * 0.03, 1 - hic * 0.03); ctx.translate(-820, -640);
    trieuse(ctx, 820, 640, 1.05, { awake: 1 - calm, jaw: lt > 3.6 && lt < 4.4 ? 1 : 0, t: t * (1 - calm * 0.7) });
    evilEyes(ctx, [[820 - 63, 640 - 184], [820 + 63, 640 - 184]], 23, lt, t, 0, 1 - calm, '#d7263d');
    ctx.restore();
    const fx = 330, fy = 640;
    penguin(ctx, fx, fy, 1.25, { mood: lt > 5.2 ? 'happy' : 'normal', look: 1, wave: t * 5, flipR: lt > 5.2 && lt < 7.4 ? -2.0 : -0.3, blink: blinkAt(t, 6) });
    flyShard(ctx, lt, 3.9, 5.2, [820, 640 - 105], [fx - 14 + 28, fy - 44 * 1.25]);
    scarfShards(ctx, fx, fy, 1.25, lt >= 5.2 ? 3 : 2, t);
    sparkle(ctx, fx, fy - 60, lt, 5.2, 10, 70, '#7fe8ff');
    if (lt > 6) seagull(ctx, 560, 420 + Math.sin(t * 4) * 5, 2.0, 0.4, { facing: -1 });
    caption(ctx, t, 5.6, 11.4, 'La Grande Trieuse retrouva le sourire et rendit le dernier éclat.', 650, 28);
    subtitle(ctx, t, 12.0, 16.6, 'Les colis repartent ! Merci, Flocon !', 'Cheffe Mouette');
    vignette(ctx, 0.55);
}
function f4_northMap(ctx, t, lt) {
    // les trois éclats s'illuminent et pointent vers le nord ; le givre envahit la carte
    const z = lerp(1.3, 1.05, ease.io(seg(lt, 0, 5)));
    const [qx, qy] = mapCam(ctx, mapImg(true), 760, 380, z, -0.012);
    const fr = ease.in(seg(lt, 3.0, 12));
    if (fr > 0) {
        ctx.save(); ctx.globalCompositeOperation = 'source-over';
        const g = ctx.createRadialGradient(1060, 120, 30, 1060, 120, 120 + fr * 1300);
        g.addColorStop(0, 'rgba(225,245,255,0.92)'); g.addColorStop(0.8, 'rgba(200,235,255,0.55)'); g.addColorStop(1, 'rgba(200,235,255,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        const r = rng(31); ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.5;
        for (let i = 0; i < 70; i++) { const a = r() * TAU, d = r() * (120 + fr * 1100); const x = 1060 + Math.cos(a) * d, y = 120 + Math.sin(a) * d * 0.7; if (x < -20 || x > W + 20 || y > H + 20) continue; for (let j = 0; j < 3; j++) { const aa = (j * Math.PI) / 3; ctx.beginPath(); ctx.moveTo(x - Math.cos(aa) * 7, y - Math.sin(aa) * 7); ctx.lineTo(x + Math.cos(aa) * 7, y + Math.sin(aa) * 7); ctx.stroke(); } }
        ctx.restore();
    }
    // les éclats au premier plan, en faisceau vers le nord
    const kb = ease.out(seg(lt, 0.4, 2.0));
    for (let i = 0; i < 3; i++) { const x = 300 + i * 60, y = 560 - Math.sin(t * 2 + i) * 6; glowAt(ctx, x, y, 50, 0.7 * kb); shard(ctx, x, y, 1.6 * kb, 0, 1); }
    if (kb > 0.5) { const g = ctx.createLinearGradient(360, 540, 1060, 140); g.addColorStop(0, 'rgba(160,240,255,0.5)'); g.addColorStop(1, 'rgba(160,240,255,0)'); ctx.strokeStyle = g; ctx.lineWidth = 10 * kb; ctx.beginPath(); ctx.moveTo(360, 540); ctx.lineTo(1060, 140); ctx.stroke(); }
    caption(ctx, t, 17.6, 22.6, 'Réunis, les trois éclats se mirent à briller, tournés vers le nord.', 650, 28);
    caption(ctx, t, 23.2, 28.8, 'Mais là-haut, le Golem de givre sentit qu’on lui reprenait ses éclats…', 650, 28);
    vignette(ctx, 0.6);
}
function golemHands(ctx, k, t) { // de grandes mains de glace agrippent le fort (le Golem reste dans l'ombre)
    if (k <= 0) return;
    [-1, 1].forEach((d) => { ctx.save(); ctx.translate(640 + d * 300, 610 - k * 90); ctx.scale(d, 1);
        ctx.fillStyle = '#9fd3f5'; ctx.beginPath(); ctx.moveTo(-40, 120); ctx.lineTo(-30, 0); for (let i = 0; i < 4; i++) { ctx.lineTo(-24 + i * 18, -34 - (i % 2) * 10); ctx.lineTo(-16 + i * 18, -6); } ctx.lineTo(50, 10); ctx.lineTo(40, 120); ctx.fill();
        ctx.fillStyle = 'rgba(30,70,120,0.3)'; ctx.beginPath(); ctx.moveTo(10, 120); ctx.lineTo(16, 0); ctx.lineTo(50, 10); ctx.lineTo(40, 120); ctx.fill(); ctx.restore(); });
}
function f4_disrupt(ctx, t, lt) {
    if (lt < 6.2) {
        villageBg(ctx, t, { lights: 0.2, frozen: ease.out(seg(lt, 0.4, 4.0)), cam: 40 });
        [[300, 610], [900, 612]].forEach(([x, y], i) => penguin(ctx, x + Math.sin(t * 40 + i) * 2, y, 0.8, { mood: 'surprised', flipR: 0.6, flipL: 0.6, scarf: ['#7be0a3', '#ff8fa8'][i] }));
        ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 2.5; const r = rng(5); for (let i = 0; i < 80; i++) { const y = r() * H, x = ((r() * W * 1.4 - t * 900 * (0.6 + r())) % (W + 200) + W + 200) % (W + 200) - 100; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 70, y + 10); ctx.stroke(); }
        caption(ctx, t, 29.4, 34.6, '…et sa colère gela tout le royaume.', 650, 30);
    } else {
        const l2 = lt - 6.2;
        const push = lerp(1, 1.12, ease.sine(seg(l2, 0, 6.4))), shk = l2 > 3.4 && l2 < 5.0 ? 6 * (1 - seg(l2, 3.4, 5.0)) : 0;
        ctx.fillStyle = vgrad(ctx, 0, H, [[0, '#020611'], [0.6, '#0b1b36'], [1, '#14325c']]); ctx.fillRect(0, 0, W, H);
        stars(ctx, t, 33, 200, 400); curtains(ctx, t, 230, 50, 1.0, 4);
        ctx.save(); ctx.translate(W / 2 + Math.sin(t * 61) * shk, 600 + Math.cos(t * 53) * shk); ctx.scale(push, push); ctx.translate(-W / 2, -600);
        peaks(ctx, [[130, 560, 380, 250], [420, 560, 360, 210], [880, 560, 400, 240], [1180, 560, 380, 270]], 71, '#a9c4e6', '#1c3358', '#132746');
        haze(ctx, 570, 120, '30,60,100', 0.6);
        const eyes = ease.out(seg(l2, 0.6, 1.4));
        fortress2(ctx, W / 2, 610, 1.1, { eyes, shards: 0, glow: 0 });
        glow(ctx, W / 2, 420, 380, 'rgba(127,232,255,A)', 0.12 + 0.14 * eyes);
        ctx.fillStyle = '#c8daf0'; ctx.beginPath(); ctx.moveTo(0, 610); ctx.quadraticCurveTo(640, 585, W, 610); ctx.lineTo(W, H + 60); ctx.lineTo(0, H + 60); ctx.fill();
        ctx.restore();
        snowLayer(ctx, t, 44, 90, 60, 2, 0.8, 30, -60);
        golemHands(ctx, ease.out(seg(l2, 1.2, 3.0)), t);
        if (l2 > 3.4 && l2 < 5.6) { const k = seg(l2, 3.4, 3.7); ctx.save(); ctx.translate(W / 2 + Math.sin(t * 50) * 6, 140); ctx.scale(ease.back(k), ease.back(k)); ctx.font = `400 84px ${SERIF}`; ctx.textAlign = 'center'; ctx.lineJoin = 'round'; ctx.lineWidth = 10; ctx.strokeStyle = '#0b1a33'; ctx.fillStyle = '#d8fbff'; ctx.strokeText('RENDEZ-LES-MOI !', 0, 0); ctx.fillText('RENDEZ-LES-MOI !', 0, 0); ctx.restore(); }
    }
    vignette(ctx, 0.6);
}
function f4_arrival(ctx, t, lt) {
    ctx.fillStyle = vgrad(ctx, 0, H, [[0, '#0b1733'], [1, '#5d7fa8']]); ctx.fillRect(0, 0, W, H);
    curtains(ctx, t, 200, 40, 0.7, 6);
    const z = 1 + 0.18 * ease.io(seg(lt, 0, 14));
    ctx.save(); ctx.translate(W / 2, 600); ctx.scale(z, z); ctx.translate(-W / 2, -600);
    fortress2(ctx, W / 2, 560, 0.9, { eyes: ease.out(seg(lt, 9.4, 10.4)), shards: 0, glow: 0 });
    ctx.fillStyle = '#e6eef8'; ctx.beginPath(); ctx.moveTo(0, 580); ctx.quadraticCurveTo(640, 545, W, 580); ctx.lineTo(W, H + 80); ctx.lineTo(0, H + 80); ctx.fill();
    const walk = ease.out(seg(lt, 0, 7.0)); const fx = lerp(-60, 520, walk);
    const tight = lt > 7.6 && lt < 8.6;
    penguin(ctx, fx, 640 - (walk < 1 ? Math.abs(Math.sin(t * 7)) * 6 : 0), 1.15, { mood: lt > 8.6 ? 'determined' : 'normal', look: 1, wave: t * 12, tilt: walk < 1 ? -0.12 : 0, flipR: tight ? -2.0 : 0 });
    // les trois éclats tournent autour de lui
    for (let i = 0; i < 3; i++) { const a = t * 1.6 + (i * TAU) / 3; const sx = fx + Math.cos(a) * 70, sy = 640 - 60 + Math.sin(a) * 22; glowAt(ctx, sx, sy, 30, 0.7); shard(ctx, sx, sy, 0.8, 0, 1); }
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 2.5; const r = rng(6); for (let i = 0; i < 70; i++) { const y = r() * H, x = ((r() * W * 1.4 - t * 1000 * (0.6 + r())) % (W + 200) + W + 200) % (W + 200) - 100; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 70, y + 10); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(0, 0, W, H);
    caption(ctx, t, 41.4, 45.4, 'Seul dans la tempête, Flocon se souvint des mots de Mamie…', 650, 28);
    subtitle(ctx, t, 46.0, 50.4, 'Pingouin qui glisse n’amasse pas de bleus.', 'Mamie Banquise');
    vignette(ctx, 0.6);
}
const FILM4 = { dur: 64, sh: [
    { a: 0, b: 5.6, f: (c, t) => chapterCard(c, t, 4, 'Le fort du Golem', 'où tout se joue') },
    { a: 5, b: 17.4, f: (c, t) => f4_victory(c, t, t - 5) },
    { a: 17, b: 29.4, f: (c, t) => f4_northMap(c, t, t - 17) },
    { a: 29, b: 41.4, f: (c, t) => f4_disrupt(c, t, t - 29) },
    { a: 41, b: 55.4, f: (c, t) => f4_arrival(c, t, t - 41) },
    { a: 55, b: 64.1, f: (c, t) => titleCard(c, t, t - 55, 4, 'Le fort du Golem', 'Le grand final !') }
] };

const EP_FILMS = { 2: FILM2, 3: FILM3, 4: FILM4 };
function renderEp(ctx, t, buf, film) {
    ctx.save(); ctx.setTransform(ctx.canvas.width / W, 0, 0, ctx.canvas.height / H, 0, 0);
    const active = film.sh.filter((s) => t >= s.a && t < s.b);
    if (!active.length) active.push(film.sh[film.sh.length - 1]);
    active[0].f(ctx, t);
    if (active[1]) {
        const s = active[1], k = seg(t, s.a, active[0].b);
        const b = buf.getContext('2d'); b.setTransform(buf.width / W, 0, 0, buf.height / H, 0, 0); b.clearRect(0, 0, W, H);
        s.f(b, t);
        ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = ease.sine(k); ctx.drawImage(buf, 0, 0, ctx.canvas.width, ctx.canvas.height); ctx.globalAlpha = 1;
    }
    ctx.setTransform(ctx.canvas.width / W, 0, 0, ctx.canvas.height / H, 0, 0);
    filmGrain(ctx, t);
    ctx.restore();
}
