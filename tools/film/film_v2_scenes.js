// ================================================================ v2 : montage resserré (≈ 1 min 48)
// Corrections après relecture : ouverture plus courte, les 3 éclats tombent sur les lieux des épisodes,
// l'écharpe tricotée par Mamie devient le cœur du film, envie de Flocon, plan de réaction au yéti,
// glissade de profil, légendes sur bandeau, fin sur « À toi de jouer ! » sans fondu au noir.

// Le fort du Golem : un bloc de glace brut et asymétrique, trois encoches pour les éclats
const FORT_PTS = [[-250, 0], [-228, -90], [-190, -150], [-140, -138], [-104, -232], [-52, -206], [-6, -318], [42, -252], [78, -284], [128, -176], [176, -200], [222, -86], [256, 0]];
const SOCKETS = [[-58, -176], [0, -204], [58, -176]];
function fortress2(ctx, x, y, s, o = {}) {
    const { eyes = 0, blink = 0, shards = 3, glow = 0 } = o;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.beginPath(); FORT_PTS.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.closePath();
    const g = ctx.createLinearGradient(0, -320, 0, 0); g.addColorStop(0, '#b9e0fb'); g.addColorStop(1, '#5f95c9');
    ctx.fillStyle = g; ctx.fill();
    // facettes : faces à l'ombre à droite de chaque pointe
    ctx.fillStyle = 'rgba(20,50,100,0.22)';
    for (let i = 1; i < FORT_PTS.length - 1; i++) {
        const [ax, ay] = FORT_PTS[i], [bx, by] = FORT_PTS[i + 1];
        if (by > ay) { ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.lineTo(bx - 14, 0); ctx.lineTo(ax + 8, 0); ctx.closePath(); ctx.fill(); }
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-190, -150); ctx.lineTo(-170, -60); ctx.moveTo(-6, -318); ctx.lineTo(-20, -240); ctx.moveTo(78, -284); ctx.lineTo(70, -220); ctx.stroke();
    // l'entrée : une gueule de glace irrégulière
    ctx.beginPath(); ctx.moveTo(-64, 0); ctx.lineTo(-60, -60); ctx.lineTo(-40, -100); ctx.lineTo(-8, -118); ctx.lineTo(30, -108); ctx.lineTo(56, -76); ctx.lineTo(66, 0); ctx.closePath();
    ctx.fillStyle = '#0b1a33'; ctx.fill();
    ctx.fillStyle = '#d6efff'; for (let i = 0; i < 6; i++) { const ix = -44 + i * 18; ctx.beginPath(); ctx.moveTo(ix - 6, -96 + Math.abs(i - 2.5) * 6); ctx.lineTo(ix, -78 + Math.abs(i - 2.5) * 6); ctx.lineTo(ix + 6, -96 + Math.abs(i - 2.5) * 6); ctx.fill(); }
    // les trois encoches (pleines tant que les éclats y sont)
    SOCKETS.forEach(([sx, sy], i) => {
        ctx.beginPath(); ctx.moveTo(sx, sy - 18); ctx.lineTo(sx + 11, sy); ctx.lineTo(sx, sy + 18); ctx.lineTo(sx - 11, sy); ctx.closePath();
        ctx.fillStyle = '#0d2340'; ctx.fill();
        if (i < shards) { glow > 0 && glowAt(ctx, sx, sy, 40, glow); shard(ctx, sx, sy, 1, 0, 1); }
    });
    if (eyes > 0) {
        const sy = 1 - blink * 0.95;
        glow > -1 && glowAt(ctx, -2, -62, 90, 0.35 * eyes);
        ctx.save(); ctx.translate(0, -62); ctx.scale(1, sy); ctx.globalAlpha = eyes;
        circle(ctx, -20, 0, 9, '#7fe8ff'); circle(ctx, 18, 0, 9, '#7fe8ff'); circle(ctx, -20, 0, 4, '#e8fdff'); circle(ctx, 18, 0, 4, '#e8fdff');
        ctx.restore(); ctx.globalAlpha = 1;
    }
    ctx.restore();
}
function glowAt(ctx, x, y, r, a) { glow(ctx, x, y, r, 'rgba(127,232,255,A)', a); }

function snowman(ctx, x, y, s, angry = 0, t = 0) {
    ctx.save(); ctx.translate(x + (angry > 0 ? Math.sin(t * 40) * 2 * angry : 0), y); ctx.scale(s, s);
    ell(ctx, 0, 4, 44, 9, 'rgba(20,40,80,0.2)');
    circle(ctx, 0, -36, 40, '#ffffff'); circle(ctx, 0, -96, 28, '#ffffff');
    ctx.fillStyle = '#1d2542'; ctx.fillRect(-22, -134, 44, 10); ctx.fillRect(-15, -166, 30, 34);
    const eyeCol = angry > 0 ? '#7fe8ff' : '#1d2542';
    if (angry > 0) { glowAt(ctx, -10, -102, 16, angry * 0.7); glowAt(ctx, 10, -102, 16, angry * 0.7); }
    circle(ctx, -10, -102, 4, eyeCol); circle(ctx, 10, -102, 4, eyeCol);
    if (angry > 0) { ctx.strokeStyle = '#1d2542'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-18, -114); ctx.lineTo(-5, -108); ctx.moveTo(18, -114); ctx.lineTo(5, -108); ctx.stroke(); }
    ctx.fillStyle = '#ff9f43'; ctx.beginPath(); ctx.moveTo(0, -94); ctx.lineTo(24, -90); ctx.lineTo(0, -86); ctx.fill();
    ctx.strokeStyle = '#6b4226'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-36, -50); ctx.lineTo(-70, -78 - angry * 18); ctx.moveTo(36, -50); ctx.lineTo(70, -74 - angry * 18); ctx.stroke();
    ctx.restore();
}

function sortingCenter(ctx, x, y, s, lit = 0, t = 0) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = '#d7263d'; ctx.fillRect(-120, -110, 240, 110);
    ctx.fillStyle = '#a5121f'; ctx.beginPath(); ctx.moveTo(-136, -106); ctx.lineTo(0, -170); ctx.lineTo(136, -106); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f4f9ff'; ctx.beginPath(); ctx.moveTo(-136, -106); ctx.lineTo(0, -170); ctx.lineTo(136, -106); ctx.lineTo(120, -100); ctx.lineTo(0, -156); ctx.lineTo(-120, -100); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f4e6c8'; ctx.fillRect(-90, -76, 50, 76); ctx.fillRect(10, -84, 76, 34);
    ctx.fillStyle = '#5c6f8f'; ctx.fillRect(86, -26, 90, 10);
    for (let i = 0; i < 4; i++) { const bx = 96 + ((t * 40 + i * 22) % 80); ctx.fillStyle = '#c99a5b'; ctx.fillRect(bx, -40, 14, 14); }
    if (lit > 0) { const f = 0.5 + 0.5 * Math.sin(t * 30); ctx.fillStyle = `rgba(127,232,255,${0.35 * lit * f})`; ctx.fillRect(10, -84, 76, 34); }
    ctx.restore();
}

// Le yéti : même dessin que dans le jeu (fourrure crème, visage gris-violet, silhouette trapue)
function yeti2(ctx, x, y, s, o = {}) {
    const { roar = 0, t = 0, shard: hasShard = true, eyes = 1, arms = 0 } = o;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.scale(-1, 1);
    ctx.scale(1, 1 + Math.sin(t * 2.4) * 0.015);
    ell(ctx, 0, 2, 70, 10, 'rgba(10,20,50,0.25)');
    ell(ctx, -26, -4, 22, 10, '#8c86a8'); ell(ctx, 26, -4, 22, 10, '#8c86a8');
    ctx.fillStyle = '#f3efe6'; ctx.beginPath(); ctx.moveTo(-66, -14); ctx.quadraticCurveTo(-84, -96, -50, -132); ctx.quadraticCurveTo(0, -158, 50, -132); ctx.quadraticCurveTo(84, -96, 66, -14); ctx.quadraticCurveTo(0, 4, -66, -14); ctx.fill();
    ctx.fillStyle = '#ddd6c6'; for (let i = 0; i < 8; i++) { const fx = -56 + i * 16; ctx.beginPath(); ctx.moveTo(fx - 8, -12); ctx.lineTo(fx, -2 + (i % 2) * 4); ctx.lineTo(fx + 8, -12); ctx.fill(); }
    ell(ctx, 0, -62, 36, 40, 'rgba(200,190,170,0.35)');
    [-1, 1].forEach((d) => { ctx.save(); ctx.translate(d * 56, -96); ctx.rotate(d * (0.3 + arms * 1.9));
        ctx.fillStyle = '#ddd6c6'; ctx.beginPath(); ctx.moveTo(-14, 0); ctx.quadraticCurveTo(d * 26, 30, d * 12, 72); ctx.quadraticCurveTo(0, 84, -d * 10, 70); ctx.quadraticCurveTo(-8, 30, 14, 0); ctx.fill();
        ell(ctx, d * 2, 74, 13, 10, '#8c86a8'); ctx.restore(); });
    ctx.fillStyle = '#8c86a8'; ctx.beginPath(); ctx.moveTo(-34, -126); ctx.quadraticCurveTo(0, -146, 34, -126); ctx.quadraticCurveTo(40, -92, 0, -86); ctx.quadraticCurveTo(-40, -92, -34, -126); ctx.fill();
    ctx.globalAlpha = eyes; circle(ctx, -12, -114, 6, '#ffffff'); circle(ctx, 12, -114, 6, '#ffffff'); circle(ctx, -10, -113, 3, '#1d2542'); circle(ctx, 14, -113, 3, '#1d2542'); ctx.globalAlpha = 1;
    ctx.strokeStyle = '#2a2440'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-22, -128 - roar * 3); ctx.lineTo(-6, -121); ctx.moveTo(22, -128 - roar * 3); ctx.lineTo(6, -121); ctx.stroke();
    if (roar > 0.05) { const oh = 4 + roar * 13; ell(ctx, 0, -99, 13, oh, '#2a2440');
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-8, -99 - oh + 1); ctx.lineTo(-5, -99 - oh + 8); ctx.lineTo(-2, -99 - oh + 1); ctx.moveTo(2, -99 - oh + 1); ctx.lineTo(5, -99 - oh + 8); ctx.lineTo(8, -99 - oh + 1); ctx.fill(); }
    else { ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-9, -100); ctx.quadraticCurveTo(0, -96, 9, -100); ctx.stroke(); }
    if (hasShard) { glowAt(ctx, 0, -150, 30, 0.5 + 0.2 * Math.sin(t * 6)); shard(ctx, 0, -150, 1.5, 0, 1); }
    ctx.restore();
}

// Flocon couché sur le ventre, de profil (nageoires en arrière, écharpe au vent)
function penguinSlide(ctx, x, y, s, t, scarf = true) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ell(ctx, 0, 6, 58, 7, 'rgba(60,70,120,0.18)');
    // pieds
    ell(ctx, -58, -6, 12, 5, '#ff9f43', -0.2);
    // corps (dos sombre, ventre blanc dessous)
    ctx.fillStyle = '#1d2542'; ctx.beginPath(); ctx.ellipse(0, -16, 54, 20, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#f4f7fb'; ctx.beginPath(); ctx.ellipse(6, -8, 44, 11, 0, 0, Math.PI); ctx.fill();
    // nageoires en arrière
    ctx.fillStyle = '#161c36'; ctx.beginPath(); ctx.moveTo(-6, -22); ctx.quadraticCurveTo(-34, -40, -52, -30 + Math.sin(t * 20) * 2); ctx.quadraticCurveTo(-30, -22, -6, -14); ctx.fill();
    // tête
    circle(ctx, 50, -26, 19, '#1d2542');
    circle(ctx, 56, -30, 5.5, '#fff'); circle(ctx, 58, -30, 2.6, '#111');
    ctx.fillStyle = '#ff9f43'; ctx.beginPath(); ctx.moveTo(66, -27); ctx.lineTo(80, -23); ctx.lineTo(66, -19); ctx.fill();
    ctx.globalAlpha = 0.55; circle(ctx, 52, -18, 4, '#ff8fa8'); ctx.globalAlpha = 1;
    // bonnet
    ctx.fillStyle = '#3b82f6'; ctx.beginPath(); ctx.arc(44, -36, 16, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; rrect(ctx, 28, -38, 30, 6, 3); ctx.fill(); circle(ctx, 40, -54, 5, '#fff');
    if (scarf) {
        ctx.fillStyle = '#e94b4b'; rrect(ctx, 26, -22, 18, 12, 5); ctx.fill();
        const w1 = Math.sin(t * 24), w2 = Math.sin(t * 24 + 1.3);
        ctx.beginPath(); ctx.moveTo(30, -18); ctx.quadraticCurveTo(0, -30 + w1 * 6, -28, -24 + w1 * 10); ctx.lineTo(-24, -16 + w1 * 10); ctx.quadraticCurveTo(0, -20 + w1 * 6, 30, -12); ctx.fill();
        ctx.beginPath(); ctx.moveTo(30, -16); ctx.quadraticCurveTo(4, -40 + w2 * 6, -14, -40 + w2 * 10); ctx.lineTo(-12, -33 + w2 * 10); ctx.quadraticCurveTo(4, -30 + w2 * 6, 30, -11); ctx.fill();
    }
    ctx.restore();
}

// Un bout d'écharpe rouge qui flotte (aiguilles à tricoter ou vol vers Flocon)
function scarfRibbon(ctx, x, y, len, t, amp = 1) {
    const wv = Math.sin(t * 14) * amp;
    ctx.strokeStyle = '#e94b4b'; ctx.lineWidth = 12; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - len / 2, y); ctx.bezierCurveTo(x - len / 6, y - 16 * wv, x + len / 6, y + 16 * wv, x + len / 2, y); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2;
    ctx.beginPath(); for (let i = -2; i <= 2; i++) { const xx = x + (i * len) / 6; ctx.moveTo(xx, y - 5); ctx.lineTo(xx, y + 5); } ctx.stroke();
}

// ---------------------------------------------------------------- plans
function v2shot1(ctx, t) { // 0 → 7.5 : la banquise la nuit
    const cam = lerp(-300, 0, ease.io(seg(t, 0.2, 5)));
    const drift = ease.in(seg(t, 5.6, 7.6)) * 160;
    ctx.fillStyle = vgrad(ctx, -400 - cam, H - cam * 0.2, [[0, '#03081a'], [0.55, '#0e1f45'], [1, '#2b4a86']]); ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.translate(-drift * 0.2, -cam * 0.35); stars(ctx, t, 11, 170, 900); ctx.restore();
    aurora(ctx, t, 40 - cam * 0.5, 1);
    ctx.save(); ctx.translate(0, -cam);
    mountains(ctx, 5, 470, 170, '#22396b', '#dfeaf8', drift * 0.4, 190);
    mountains(ctx, 9, 520, 110, '#2e4b82', '#eaf2fc', drift * 0.6, 150);
    ctx.fillStyle = vgrad(ctx, 500, H, [[0, '#cfe0f4'], [1, '#9fbbe0']]); ctx.beginPath(); ctx.moveTo(0, 540); ctx.quadraticCurveTo(640, 490, W, 545); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();
    ctx.save(); ctx.translate(-drift, 0);
    igloo(ctx, 880, 600, 70, 1);
    [[160, 600, 70], [260, 615, 52], [1120, 610, 64], [1210, 590, 80]].forEach(([x, y, h]) => pine(ctx, x, y, h));
    ctx.restore(); ctx.restore();
    snowLayer(ctx, t, 21, 70, 26, 1.4, 0.5, 18, -6 - drift * 0.1);
    snowLayer(ctx, t, 22, 45, 45, 2.4, 0.8, 26, -10 - drift * 0.2);
    caption(ctx, t, 1.0, 7.2, 'Sur la banquise, tout le monde se prépare pour Noël… enfin, presque tout le monde.', 110, 28);
    vignette(ctx, 0.5);
}

function v2shot2(ctx, t) { // 7 → 17.4 : le Golem de givre se réveille
    const lt = t - 7;
    const push = lerp(1, 1.28, ease.sine(seg(lt, 0, 10.4)));
    const shk = lt > 4 && lt < 6.4 ? 7 * (1 - seg(lt, 4, 6.4) * 0.5) : 0;
    const sx = Math.sin(lt * 61) * shk, sy = Math.cos(lt * 53) * shk;
    ctx.fillStyle = vgrad(ctx, 0, H, [[0, '#01040c'], [0.6, '#0a1a33'], [1, '#14315a']]); ctx.fillRect(0, 0, W, H);
    stars(ctx, t, 31, 90, 380);
    const k0 = seg(lt, 6.2, 9.8);
    ctx.save(); ctx.translate(W / 2 + sx, 600 + sy); ctx.scale(push, push); ctx.translate(-W / 2, -600);
    mountains(ctx, 13, 520, 190, '#0e2445', '#3d6a9c', 0, 210);
    ctx.fillStyle = '#16345e'; ctx.beginPath(); ctx.moveTo(0, 600); ctx.quadraticCurveTo(640, 560, W, 600); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();
    const eyes = ease.out(seg(lt, 2.2, 3.0));
    const bk = lt > 3.3 && lt < 3.55 ? Math.sin(seg(lt, 3.3, 3.55) * Math.PI) : 0;
    const glowK = seg(lt, 3.6, 6.2);
    fortress2(ctx, W / 2, 600, 1.02, { eyes, blink: bk, shards: lt < 6.2 ? 3 : 0, glow: glowK * (0.6 + 0.4 * Math.sin(lt * 18)) });
    ctx.fillStyle = '#0b1c36';
    ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(0, 420); ctx.lineTo(90, 470); ctx.lineTo(150, 440); ctx.lineTo(260, 600); ctx.lineTo(300, H); ctx.fill();
    ctx.beginPath(); ctx.moveTo(W, H); ctx.lineTo(W, 400); ctx.lineTo(1170, 460); ctx.lineTo(1110, 430); ctx.lineTo(990, 610); ctx.lineTo(960, H); ctx.fill();
    if (lt > 4 && lt < 7.5) { const r = rng(7); for (let i = 0; i < 40; i++) { const x0 = W / 2 - 220 + r() * 440, y0 = 300 + r() * 120, k = seg(lt, 4 + r() * 0.8, 7); if (k > 0 && k < 1) circle(ctx, x0, y0 + k * k * 300, 2 + r() * 2, `rgba(230,245,255,${1 - k})`); } }
    ctx.restore();
    // les éclats quittent leurs encoches
    if (k0 > 0 && k0 < 1) {
        const ends = [[-120, 140], [W / 2 - 40, -160], [W + 140, 160]];
        SOCKETS.forEach(([lx, ly], i) => {
            const wx = W / 2 + lx * 1.02, wy = 600 + ly * 1.02;
            const s0x = W / 2 + (wx - W / 2) * push + sx, s0y = 600 + (wy - 600) * push + sy;
            const [ex, ey] = ends[i];
            const k = ease.in(clamp(k0 * 1.15 - i * 0.07));
            const cx = lerp(s0x, ex, 0.5) + (i - 1) * 80, cy = Math.min(s0y, ey) - 240;
            const pos = (kk) => { const u = 1 - kk; return [u * u * s0x + 2 * u * kk * cx + kk * kk * ex, u * u * s0y + 2 * u * kk * cy + kk * kk * ey]; };
            ctx.strokeStyle = 'rgba(160,240,255,0.5)'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath();
            for (let j = 0; j <= 14; j++) { const [px, py] = pos(clamp(k - j * 0.025)); j ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.stroke();
            const [px, py] = pos(k); glowAt(ctx, px, py, 40, 0.6); shard(ctx, px, py, 1.2, k * 9 + i, 1);
        });
    }
    if (lt > 6.1 && lt < 6.7) { ctx.fillStyle = `rgba(200,250,255,${0.5 * (1 - seg(lt, 6.1, 6.7))})`; ctx.fillRect(0, 0, W, H); }
    snowLayer(ctx, t, 23, 60, 60, 1.8, 0.55, 30, -70);
    caption(ctx, t, 7.8, 12.2, 'Au nord, le Golem de givre se réveille.', 660, 28);
    vignette(ctx, 0.7);
}

function v2shot2b(ctx, t) { // 17 → 21.4 : trois éclats, trois lieux
    const lt = t - 17;
    ctx.fillStyle = '#050a18'; ctx.fillRect(0, 0, W, H);
    const pw = (W - 16) / 3;
    for (let i = 0; i < 3; i++) {
        const k = ease.out(seg(lt, i * 0.12, 0.5 + i * 0.12));
        const x0 = i * (pw + 8), yOff = (1 - k) * 80;
        ctx.save(); ctx.globalAlpha = k; ctx.beginPath(); ctx.rect(x0, yOff, pw, H); ctx.clip(); ctx.translate(x0, yOff);
        const land = 0.7 + i * 0.8;
        const hitK = seg(lt, land, land + 1.2);
        ctx.fillStyle = vgrad(ctx, 0, H, [[0, '#0b1733'], [0.7, '#24427a'], [1, '#3b5f9a']]); ctx.fillRect(0, 0, pw, H);
        stars(ctx, t + i * 5, 50 + i, 30, 300);
        ctx.fillStyle = '#e6f1fb'; ctx.beginPath(); ctx.moveTo(0, 560); ctx.quadraticCurveTo(pw / 2, 530, pw, 560); ctx.lineTo(pw, H); ctx.lineTo(0, H); ctx.fill();
        let tx = pw / 2, ty = 300;
        if (i === 0) { // le sommet des Monts Givrés
            ctx.fillStyle = '#7f9fcf'; ctx.beginPath(); ctx.moveTo(-40, 600); ctx.lineTo(pw / 2, 220); ctx.lineTo(pw + 40, 600); ctx.fill();
            ctx.fillStyle = '#94b6dd'; ctx.beginPath(); ctx.moveTo(pw / 2, 220); ctx.lineTo(pw + 40, 600); ctx.lineTo(pw / 2 + 40, 600); ctx.fill();
            ctx.fillStyle = '#f4f9ff'; ctx.beginPath(); ctx.moveTo(pw / 2, 220); ctx.lineTo(pw / 2 + 50, 300); ctx.lineTo(pw / 2 + 20, 290); ctx.lineTo(pw / 2, 312); ctx.lineTo(pw / 2 - 24, 290); ctx.lineTo(pw / 2 - 52, 300); ctx.closePath(); ctx.fill();
            ty = 222;
        } else if (i === 1) { snowman(ctx, pw / 2, 580, 1.25, hitK > 0 ? ease.out(hitK) : 0, t); ty = 580 - 1.25 * 170; }
        else { sortingCenter(ctx, pw / 2, 590, 1.25, hitK, t); ty = 590 - 1.25 * 170; }
        const fall = seg(lt, land - 0.55, land);
        if (fall > 0 && fall < 1) { const fy = lerp(-40, ty, ease.in(fall)); ctx.strokeStyle = 'rgba(160,240,255,0.5)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(tx - 60 * (1 - fall) - 40, fy - 120); ctx.lineTo(tx, fy); ctx.stroke(); glowAt(ctx, tx, fy, 40, 0.6); shard(ctx, tx, fy, 1.1, fall * 6, 1); }
        if (lt >= land) { const p = 0.5 + 0.3 * Math.sin(t * 6); glowAt(ctx, tx, ty, 60 + (1 - ease.out(Math.min(1, hitK * 3))) * 80, p); shard(ctx, tx, ty, 1.1, 0, 1);
            if (hitK < 0.25) { ctx.fillStyle = `rgba(200,250,255,${0.5 * (1 - hitK * 4)})`; ctx.fillRect(0, 0, pw, H); } }
        const labels = ['Les Monts Givrés', 'Le village', 'Le centre de tri'];
        const lk = seg(lt, land + 0.2, land + 0.6);
        if (lk > 0) { ctx.globalAlpha = k * lk; ctx.font = `800 24px ${DISP}`; ctx.textAlign = 'center'; ctx.fillStyle = '#ffffff'; ctx.fillText(labels[i], pw / 2, 120); }
        ctx.restore();
    }
    caption(ctx, t, 17.3, 21.2, 'Trois éclats de givre tombent sur le pays…', 650, 28);
}

function v2shot3(ctx, t) { // 21 → 25.6 : l'igloo de Mamie, une étoile filante
    const lt = t - 21;
    const z = lerp(1, 2.9, ease.in(seg(lt, 1.6, 4.6)));
    const dx = 640 + 115, dy = 560;
    ctx.fillStyle = vgrad(ctx, 0, H, [[0, '#060d24'], [0.7, '#1a3060'], [1, '#2b4a86']]); ctx.fillRect(0, 0, W, H);
    stars(ctx, t, 41, 120, 420);
    aurora(ctx, t + 30, 30, 0.6);
    const sk = seg(lt, 0, 1.6);
    if (sk > 0 && sk < 1) { const x = lerp(1300, 200, ease.io(sk)), y = lerp(60, 230, ease.io(sk)); const g = ctx.createLinearGradient(x, y, x + 260, y - 50); g.addColorStop(0, 'rgba(200,250,255,0.9)'); g.addColorStop(1, 'rgba(200,250,255,0)'); ctx.strokeStyle = g; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 260, y - 50); ctx.stroke(); glowAt(ctx, x, y, 26, 0.8); }
    ctx.save(); ctx.translate(dx, dy); ctx.scale(z, z); ctx.translate(-dx, -dy);
    mountains(ctx, 17, 470, 120, '#22396b', '#dfeaf8', 0, 200);
    ctx.fillStyle = vgrad(ctx, 480, H, [[0, '#d7e6f6'], [1, '#a9c3e4']]); ctx.beginPath(); ctx.moveTo(0, 520); ctx.quadraticCurveTo(640, 480, W, 520); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();
    pine(ctx, 210, 580, 110); pine(ctx, 300, 600, 80); pine(ctx, 1080, 590, 120); pine(ctx, 1170, 605, 86);
    igloo(ctx, 640, 600, 210, 1 + 0.05 * Math.sin(t * 8));
    for (let i = 0; i < 8; i++) ell(ctx, 820 + i * 34, 640 + i * 6 + (i % 2) * 8, 8, 4, 'rgba(120,150,190,0.35)');
    ctx.restore();
    snowLayer(ctx, t, 24, 70, 34, 1.8, 0.7, 20, -8);
    vignette(ctx, 0.5);
}

function v2shot4(ctx, t) { // 25 → 48.4 : l'intérieur, la mouette, la lettre
    const lt = t - 25;
    const pan = ease.io(seg(lt, 4.3, 5.7)) - ease.io(seg(lt, 9.9, 11.6));
    const zc = lerp(1.55, 1.42, pan) * (1 + 0.04 * ease.sine(seg(lt, 0, 4.3)));
    ctx.save(); ctx.translate(W / 2, H / 2 + 40); ctx.scale(zc, zc); ctx.translate(-lerp(600, 880, pan), -470);
    interiorBg(ctx, t);
    const rock = Math.sin(t * 1.4) * 0.06 * (lt < 4.6 ? 1 : 0.3);
    rocking(ctx, 470, 585, rock);
    const lookDoor = seg(lt, 4.6, 5.0);
    const knit = Math.sin(t * 6);
    ctx.save(); ctx.translate(470, 585); ctx.rotate(rock); ctx.translate(-470, -585);
    penguin(ctx, 470, 512, 1.15, { scarf: '#1d2542', shawl: '#b14a7a', glasses: true, bun: true, blink: blinkAt(t, 1), look: lerp(-0.4, 1, lookDoor), flipR: -0.5 + knit * 0.12 * (1 - lookDoor), flipL: -0.4 - knit * 0.1 * (1 - lookDoor) });
    // le tricot : une écharpe rouge qui grandit sur les aiguilles
    const grow = 24 + 30 * seg(lt, 0, 12);
    ctx.fillStyle = '#e94b4b'; rrect(ctx, 474, 452, 16, grow, 5); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1.5; ctx.beginPath(); for (let yy = 458; yy < 452 + grow; yy += 7) { ctx.moveTo(476, yy); ctx.lineTo(488, yy); } ctx.stroke();
    ctx.strokeStyle = '#c9d4e6'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(462, 458 - knit * 3); ctx.lineTo(500, 440); ctx.moveTo(480, 456 + knit * 3); ctx.lineTo(520, 444); ctx.stroke();
    ctx.restore();
    // Flocon (sans écharpe : il ne l'a pas encore)
    const sip = seg(lt, 1.5, 2.4) - seg(lt, 3.2, 4.0);
    const crouch = seg(lt, 8.3, 8.6) * (1 - seg(lt, 8.6, 8.7));
    const catchK = seg(lt, 8.7, 9.6);
    const jump = Math.sin(Math.PI * catchK) * 90;
    const hopK = seg(lt, 10.5, 12);
    const fx = lerp(820, 600, ease.io(hopK)), hop = Math.abs(Math.sin(hopK * Math.PI * 3)) * 24;
    ctx.fillStyle = '#6b4226'; ctx.fillRect(790, 560, 60, 10); ctx.fillRect(796, 568, 8, 30); ctx.fillRect(836, 568, 8, 30);
    const hasLetter = lt > 9.3 && lt < 12.4;
    let squash = 1;
    if (crouch > 0) squash = 1 - 0.15 * crouch;
    if (catchK > 0 && catchK < 0.25) squash = 1.12;
    if (catchK > 0.92 && catchK < 1) squash = 0.88;
    penguin(ctx, fx, 560 - jump - hop, 1.05, {
        scarfOff: true, facing: lt > 10.4 ? -1 : (lookDoor > 0.5 ? 1 : -1), mug: lt < 8.3, letter: hasLetter, mood: lt > 4.6 && lt < 8.7 ? 'surprised' : 'normal',
        blink: blinkAt(t, 2), flipR: lt < 8.3 ? -1.1 * sip - 0.3 : (catchK > 0 && catchK < 1 ? -2.2 : -0.6), flipL: catchK > 0 && catchK < 1 ? 0.9 : 0, squash, wave: t * 3 });
    if (lt < 8.3) for (let i = 0; i < 3; i++) { const ph = (t * 0.6 + i / 3) % 1; ctx.strokeStyle = `rgba(255,255,255,${0.35 * (1 - ph)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(918, 470 - ph * 60); ctx.quadraticCurveTo(910 + Math.sin(t * 2 + i) * 10, 450 - ph * 60, 920, 430 - ph * 70); ctx.stroke(); }
    if (lt > 4.4 && lt < 6.4) { const k = seg(lt, 4.4, 4.6); ctx.save(); ctx.translate(1140 + Math.sin(t * 60) * 3, 360); ctx.scale(ease.back(k), ease.back(k)); ctx.font = `800 40px ${DISP}`; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.strokeStyle = '#2a1d2e'; ctx.lineWidth = 8; ctx.strokeText('TOC TOC !', 0, 0); ctx.fillText('TOC TOC !', 0, 0); ctx.restore(); }
    if (lt > 5.6 && lt < 11.4) glow(ctx, 1140, 470, 220, 'rgba(200,225,255,A)', 0.4 * Math.min(seg(lt, 5.6, 6.2), 1 - seg(lt, 10.6, 11.4)));
    // la mouette factrice : elle entre, lâche la lettre… et se cogne en repartant
    if (lt > 5.8 && lt < 11.6) {
        const kin = ease.out(seg(lt, 5.8, 8.2)), kout = ease.in(seg(lt, 8.6, 9.8));
        let gx = lerp(1240, 930, kin) + kout * 210, gy = lerp(440, 330, kin) - kout * 40 + Math.sin(t * 5) * 6;
        const bonk = seg(lt, 9.8, 10.3);
        if (lt > 9.8) { gx = 1140 - bonk * 20; gy = 290 + Math.sin(bonk * Math.PI) * 10; }
        const leave = ease.in(seg(lt, 10.6, 11.6));
        if (lt > 10.6) { gx = 1120 + leave * 220; gy = 300 + leave * 120; }
        seagull(ctx, gx, gy, 1.5, lt > 9.8 && lt < 10.6 ? 0 : t * 14, { facing: kout > 0 ? 1 : -1 });
        if (lt < 8.4) { ctx.save(); ctx.translate(gx - 30, gy + 26); ctx.fillStyle = '#fffaf0'; ctx.fillRect(-14, -9, 28, 18); circle(ctx, 0, 0, 4, '#d7263d'); ctx.restore(); }
        if (lt > 9.8 && lt < 10.7) { // étoiles de la bosse
            for (let i = 0; i < 4; i++) { const a = t * 6 + (i * TAU) / 4; starShape(ctx, gx + 20 + Math.cos(a) * 26, gy - 34 + Math.sin(a) * 8, 7, '#ffd36e'); }
            ctx.save(); ctx.translate(1180, 250 + seg(lt, 9.8, 10.3) * 40); ctx.rotate(lt * 8); ctx.fillStyle = '#1d4f9e'; ctx.beginPath(); ctx.arc(0, 0, 10, Math.PI, 0); ctx.fill(); ctx.restore();
        }
    }
    if (lt > 8.4 && lt < 9.4) { const k = seg(lt, 8.4, 9.4); const lx = lerp(900, 880, k), ly = lerp(356, 450, ease.in(k)); ctx.save(); ctx.translate(lx, ly); ctx.rotate(Math.sin(k * 9) * 0.6); ctx.fillStyle = '#fffaf0'; ctx.fillRect(-14, -9, 28, 18); circle(ctx, 0, 0, 4, '#d7263d'); ctx.restore(); }
    ctx.restore();
    subtitle(ctx, t, 25.7, 29.2, 'Encore un peu de chocolat chaud, Flocon ?', 'Mamie Banquise');
    subtitle(ctx, t, 35.1, 37.3, 'Une lettre ! Elle est pour toi, Mamie.', 'Flocon');
    const kL = seg(lt, 12.6, 13.8), kLo = seg(lt, 22.4, 23.4);
    if (kL > 0 && kLo < 1) {
        ctx.fillStyle = `rgba(20,12,24,${0.6 * Math.min(kL, 1 - kLo)})`; ctx.fillRect(0, 0, W, H);
        const sc = ease.back(kL) * (1 - ease.in(kLo));
        ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(-0.02); ctx.scale(sc, sc);
        ctx.fillStyle = '#fbf3e0'; ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 30; rrect(ctx, -400, -270, 800, 520, 10); ctx.fill(); ctx.shadowBlur = 0;
        ctx.strokeStyle = '#e8d8b4'; ctx.lineWidth = 1.5; for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.moveTo(-350, -170 + i * 46); ctx.lineTo(350, -170 + i * 46); ctx.stroke(); }
        const lines = ['Chère Mamie Banquise,', '', 'Le grand sapin du village de Noël est en danger.', 'Depuis que des éclats de givre sont tombés du ciel,', 'les monstres de Noël rôdent tout autour.', 'Il nous faut quelqu’un de courageux.', '', 'Le Maire du village de Noël'];
        let total = 0; const start = 38.4, cps = 36;
        ctx.textBaseline = 'alphabetic'; ctx.fillStyle = '#3a2a1a';
        lines.forEach((ln, i) => {
            const n = Math.floor(clamp((t - start) * cps - total, 0, ln.length)); total += ln.length + 4;
            if (n > 0) { ctx.textAlign = i === 7 ? 'right' : 'left'; ctx.font = i === 7 ? `italic 700 29px ${BODY}` : `italic 500 29px ${BODY}`; ctx.fillText(ln.slice(0, n), i === 7 ? 350 : -350, -180 + i * 46); }
        });
        const sealK = ease.back(seg(t, 45.0, 45.6)); if (sealK > 0) { ctx.save(); ctx.translate(-270, 190); ctx.scale(sealK, sealK); circle(ctx, 0, 0, 34, '#b3122b'); circle(ctx, 0, 0, 26, '#d7263d'); starShape(ctx, 0, 0, 14, '#8a0e20'); ctx.restore(); }
        ctx.restore();
    }
    vignette(ctx, 0.45);
}

function v2shot5(ctx, t) { // 48 → 64.4 : la mission et l'écharpe
    const lt = t - 48;
    // caméra : plan large, gros plan sur Flocon pour « Moi ?! », puis sur l'écharpe
    const close = ease.io(seg(lt, 3.5, 4.1)) * (1 - ease.io(seg(lt, 6.9, 7.5)));
    const tieC = ease.io(seg(lt, 10.2, 10.8)) * (1 - ease.io(seg(lt, 13.2, 13.8)));
    const z = 1.7 + close * 1.0 + tieC * 0.45 + 0.08 * ease.sine(seg(lt, 0, 16.4));
    const cx = 575 + close * 105 + tieC * 40, cy = 500 - close * 20 - tieC * 10;
    ctx.save(); ctx.translate(W / 2, H / 2 + 90); ctx.scale(z, z); ctx.translate(-cx, -cy);
    interiorBg(ctx, t);
    rocking(ctx, 430, 585, 0);
    const pre = seg(lt, 9.3, 9.6) * (1 - seg(lt, 9.6, 9.75));
    const stand = ease.back(seg(lt, 9.6, 10.3));
    const tie = seg(lt, 10.6, 12.0);
    const bite = lt > 10.1 && lt < 10.6;
    penguin(ctx, lerp(430, 525, stand), lerp(512, 560, stand), 1.15, { scarf: '#1d2542', shawl: '#b14a7a', glasses: true, bun: true, mood: lt > 12.1 ? 'happy' : 'normal', blink: blinkAt(t, 1), look: 1,
        squash: 1 - pre * 0.1, tilt: bite ? 0.12 : 0, flipR: tie > 0 && tie < 1 ? -1.6 + Math.sin(tie * 12) * 0.2 : -0.3, flipL: -0.2 });
    // le tricot sur les genoux, puis coupé d'un coup de bec
    if (lt < 10.6) { ctx.fillStyle = '#e94b4b'; rrect(ctx, lerp(434, 529, stand), lerp(452, 500, stand), 16, 54, 5); ctx.fill(); }
    if (lt > 10.4 && lt < 10.9) { const k = seg(lt, 10.4, 10.9); for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU; starShape(ctx, 520 + Math.cos(a) * 26 * k, 470 + Math.sin(a) * 26 * k, 5 * (1 - k), '#ffffff'); } }
    const surprised = lt > 3.7 && lt < 7.0;
    const det = lt > 13.4;
    penguin(ctx, 680, 560, 1.05, { facing: -1, mood: det ? 'determined' : (surprised ? 'surprised' : (lt > 7.2 && lt < 10 ? 'normal' : 'normal')), blink: blinkAt(t, 2), look: 1, scarfOff: lt < 12.0,
        tilt: lt > 14.2 && lt < 15.2 ? Math.sin(seg(lt, 14.2, 15.2) * Math.PI * 2) * 0.06 : 0, flipR: det ? -0.5 : (surprised ? -1.4 : 0), flipL: surprised ? 0.6 : 0, wave: t * 3,
        squash: surprised ? 1 + Math.sin(seg(lt, 3.7, 4.2) * Math.PI) * -0.12 : 1 });
    if (tie > 0 && tie < 1) { const k = ease.io(tie); scarfRibbon(ctx, lerp(540, 680, k), 500 - Math.sin(k * Math.PI) * 50, 84, t); }
    if (lt > 12.0 && lt < 13.2) { const k = seg(lt, 12.0, 13.2); for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + k; starShape(ctx, 680 + Math.cos(a) * (30 + 50 * k), 506 + Math.sin(a) * (30 + 50 * k), 9 * (1 - k), '#ffd36e'); } }
    ctx.restore();
    subtitle(ctx, t, 48.4, 51.6, 'Quelqu’un de courageux… Toi, Flocon.', 'Mamie Banquise');
    subtitle(ctx, t, 51.7, 55.0, 'Moi ?! Je ne suis jamais allé plus loin que le lac !', 'Flocon');
    subtitle(ctx, t, 55.2, 58.0, 'Tu es le meilleur glisseur de la banquise.', 'Mamie Banquise');
    subtitle(ctx, t, 58.4, 61.4, 'Je l’ai tricotée pour ton premier grand voyage.', 'Mamie Banquise');
    subtitle(ctx, t, 61.5, 64.2, 'Pingouin qui glisse n’amasse pas de bleus. File !', 'Mamie Banquise');
    vignette(ctx, 0.45);
}

function v2shot6(ctx, t) { // 64 → 76.4 : le départ à l'aube
    const lt = t - 64;
    const day = ease.sine(seg(lt, 0, 5));
    const camX = ease.io(seg(lt, 2.8, 12.4)) * 1700 + ease.in(seg(lt, 8.25, 12.4)) * 900;
    ctx.fillStyle = vgrad(ctx, 0, H, [[0, mixc('0f1a3a', '3b6bb0', day)], [0.55, mixc('2b3f78', 'f2a7b8', day)], [1, mixc('4a5f96', 'ffd3a1', day)]]); ctx.fillRect(0, 0, W, H);
    const sunY = lerp(560, 300, ease.out(seg(lt, 0.3, 7)));
    glow(ctx, 980, sunY, 380, 'rgba(255,200,140,A)', 0.55 * day); circle(ctx, 980, sunY, 54, mixc('ffd9a8', 'fff2c8', day));
    ctx.globalAlpha = 1 - day; stars(ctx, t, 61, 80, 300); ctx.globalAlpha = 1;
    ctx.globalAlpha = 0.7 * day; [[200, 150, 1], [620, 110, 1.3], [1100, 170, 0.9]].forEach(([x, y, s]) => { const cx = ((x - camX * 0.04) % 1500 + 1500) % 1500 - 100; ell(ctx, cx, y, 120 * s, 24 * s, '#ffd1dc'); ell(ctx, cx + 50 * s, y - 14 * s, 70 * s, 22 * s, '#ffe3ea'); }); ctx.globalAlpha = 1;
    mountains(ctx, 71, 470, 200, mixc('22396b', '8f7fb8', day), mixc('dfeaf8', 'fff4f0', day), camX * 0.12, 220);
    mountains(ctx, 73, 540, 120, mixc('2e4b82', 'b49ac8', day), mixc('eaf2fc', 'ffffff', day), camX * 0.3, 170);
    ctx.fillStyle = vgrad(ctx, 540, H, [[0, mixc('cfe0f4', 'fff1ea', day)], [1, mixc('9fbbe0', 'd9c7e6', day)]]); ctx.fillRect(0, 560, W, H - 560);
    ctx.save(); ctx.translate(-camX, 0);
    igloo(ctx, 330, 610, 150, 1 - day * 0.7);
    for (let i = 0; i < 12; i++) pine(ctx, 900 + i * 380 + (i % 3) * 60, 600 + (i % 2) * 14, 70 + (i % 3) * 22, mixc('1f3d63', '2b6b5a', day), mixc('2a4f7a', '3a8a70', day));
    penguin(ctx, 445, 614, 1.1, { scarf: '#1d2542', shawl: '#b14a7a', glasses: true, bun: true, mood: 'happy', flipR: -2.1 + Math.sin(t * 7) * 0.5, blink: 0 });
    const walkStart = 2.8;
    const fxWorld = lt < walkStart ? lerp(500, 600, ease.out(seg(lt, 0.4, 1.6))) : 600 + camX;
    const crouch = seg(lt, 8.0, 8.25);
    const slide = seg(lt, 8.25, 8.5);
    for (let x = 640; x < Math.min(fxWorld - 30, 600 + 1700 * 0.55 + 300); x += 34) ell(ctx, x, 628 + ((x / 34) % 2 ? 6 : -2), 7, 3.5, 'rgba(120,130,170,0.25)');
    if (lt < 8.25) {
        const saluting = lt > 1.6 && lt < 2.8;
        const walking = lt > walkStart && lt < 8.0;
        const bob = walking ? Math.abs(Math.sin(t * 3.2 * Math.PI)) * 8 : 0;
        penguin(ctx, fxWorld, 628 - bob, 1.15, { mood: saluting ? 'happy' : 'determined', facing: saluting ? -1 : 1, flipR: saluting ? -2.2 + Math.sin(t * 9) * 0.4 : (crouch > 0 ? 0.8 : Math.sin(t * 3.2 * Math.PI) * 0.5),
            flipL: crouch > 0 ? 0.8 : Math.sin(t * 3.2 * Math.PI) * 0.4, tilt: walking ? Math.sin(t * 3.2 * Math.PI) * 0.07 : crouch * 0.25, squash: 1 - crouch * 0.15, wave: t * 6, blink: blinkAt(t, 3) });
    } else {
        const stretch = 1 + 0.15 * (1 - slide);
        ctx.save(); ctx.translate(fxWorld, 624); ctx.scale(stretch, 1 / stretch); penguinSlide(ctx, 0, 0, 1.25, t); ctx.restore();
        ctx.fillStyle = 'rgba(120,130,170,0.18)'; ctx.fillRect(600 + 1700 * 0.55 + 300, 622, Math.max(0, fxWorld - (600 + 1700 * 0.55 + 300) - 60), 8);
        const r = rng(3); for (let i = 0; i < 26; i++) { const ph = (t * 2 + r()) % 1; circle(ctx, fxWorld - 80 - ph * 140, 622 - Math.sin(ph * Math.PI) * 30 * r(), 3 * (1 - ph) + 1, `rgba(255,255,255,${0.8 * (1 - ph)})`); }
    }
    ctx.restore();
    if (lt > 8.25) { ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 3; const r = rng(9); for (let i = 0; i < 12; i++) { const y = 380 + r() * 300, x = ((r() * W - t * 2400) % W + W) % W; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 120, y); ctx.stroke(); } }
    snowLayer(ctx, t, 25, 30, 20, 1.6, 0.5 * (1 - day * 0.6), 16, -40);
    caption(ctx, t, 67.2, 71.4, 'Le 1er décembre, à l’aube, Flocon se met en route.', 100, 28);
    vignette(ctx, 0.35);
}

function v2shot7(ctx, t) { // 76 → 86.4 : la carte de la quête
    const lt = t - 76;
    ctx.fillStyle = vgrad(ctx, 0, H, [[0, '#4a2e1c'], [1, '#2e1b10']]); ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 9; i++) { ctx.fillStyle = i % 2 ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.03)'; ctx.fillRect(0, i * 80, W, 80); }
    glow(ctx, 1150, 120, 420, 'rgba(255,190,110,A)', 0.35 * (0.9 + 0.1 * noise(t * 4)));
    const un = ease.io(seg(lt, 0.2, 1.4));
    const mw = 1040 * un, mx = W / 2 - mw / 2, my = 90, mh = 520;
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 30; ctx.fillStyle = '#f2e3c2'; ctx.fillRect(mx, my, mw, mh); ctx.restore();
    if (un > 0) {
        ctx.save(); ctx.beginPath(); ctx.rect(mx, my, mw, mh); ctx.clip();
        ctx.fillStyle = '#e6d3ab'; ctx.beginPath(); ctx.moveTo(170, 560); ctx.quadraticCurveTo(140, 300, 330, 230); ctx.quadraticCurveTo(560, 120, 820, 190); ctx.quadraticCurveTo(1110, 230, 1090, 420); ctx.quadraticCurveTo(1080, 580, 760, 590); ctx.closePath(); ctx.fill();
        const stops = [[310, 470, 'Les Monts Givrés', '1er déc.'], [520, 290, 'Le village de Noël', '8 déc.'], [790, 300, 'Le centre de tri', '15 déc.'], [960, 470, 'Le fort du Golem', '24 déc.']];
        const startP = [200, 540];
        const pts = [startP, ...stops.map((s) => [s[0], s[1]])];
        const kd = ease.io(seg(lt, 1.6, 7.0));
        const lens = []; let tot = 0; for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); lens.push(d); tot += d; }
        ctx.strokeStyle = '#a5121f'; ctx.lineWidth = 5; ctx.setLineDash([2, 14]); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(...startP);
        let rem = kd * tot; for (let i = 1; i < pts.length && rem > 0; i++) { const f = Math.min(1, rem / lens[i - 1]); ctx.lineTo(lerp(pts[i - 1][0], pts[i][0], f), lerp(pts[i - 1][1], pts[i][1], f)); rem -= lens[i - 1]; }
        ctx.stroke(); ctx.setLineDash([]);
        ctx.save(); ctx.translate(200, 548); ctx.scale(0.45, 0.45); igloo(ctx, 0, 0, 70, 0); ctx.restore();
        let acc = 0;
        stops.forEach(([x, y, name, date], i) => {
            acc += lens[i]; const at = acc / tot;
            const k = ease.back(seg(lt, 1.6 + 5.4 * at - 0.1, 1.6 + 5.4 * at + 0.3));
            if (k <= 0) return;
            ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
            if (i === 0) { ctx.fillStyle = '#7fa3cf'; ctx.beginPath(); ctx.moveTo(-60, 10); ctx.lineTo(-20, -60); ctx.lineTo(10, -20); ctx.lineTo(34, -52); ctx.lineTo(70, 10); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-20, -60); ctx.lineTo(-32, -38); ctx.lineTo(-8, -38); ctx.fill(); }
            if (i === 1) bigTreeIcon(ctx, 0, 10, 80);
            if (i === 2) { ctx.save(); ctx.scale(0.42, 0.42); sortingCenter(ctx, 0, 24, 1, 0, 0); ctx.restore(); }
            if (i === 3) { ctx.save(); ctx.scale(0.26, 0.26); fortress2(ctx, 0, 40, 1, { shards: 0 }); ctx.restore(); }
            ctx.font = `800 22px ${DISP}`; ctx.textAlign = 'center'; ctx.fillStyle = '#3a2a1a'; ctx.fillText(name, 0, 46);
            ctx.fillStyle = '#a5121f'; rrect(ctx, -46, 56, 92, 28, 14); ctx.fill(); ctx.font = `800 16px ${DISP}`; ctx.fillStyle = '#fff'; ctx.fillText(date, 0, 76);
            ctx.restore();
        });
        const hk = ease.io(seg(lt, 7.2, 8.8));
        const px = lerp(200, 310, hk), py = lerp(540, 470, hk) - Math.abs(Math.sin(hk * Math.PI * 3)) * 30;
        penguin(ctx, px, py + 4, 0.48, { mood: 'happy', flipR: -1.4, wave: t * 6 });
        ctx.restore();
        ctx.fillStyle = '#d9c39a'; rrect(ctx, mx - 16, my - 10, 22, mh + 20, 10); ctx.fill(); rrect(ctx, mx + mw - 6, my - 10, 22, mh + 20, 10); ctx.fill();
    }
    caption(ctx, t, 78.0, 85.8, 'Quatre étapes. Quatre dates. Une seule quête.', 52, 26);
    vignette(ctx, 0.5);
}

function mountainWall(ctx) {
    ctx.fillStyle = '#7fa3cf'; ctx.beginPath(); ctx.moveTo(-100, H); ctx.lineTo(300, 200); ctx.lineTo(460, -300); ctx.lineTo(640, -760); ctx.lineTo(860, -280); ctx.lineTo(1020, 120); ctx.lineTo(1400, H); ctx.fill();
    ctx.fillStyle = '#94b6dd'; ctx.beginPath(); ctx.moveTo(640, -760); ctx.lineTo(860, -280); ctx.lineTo(1020, 120); ctx.lineTo(1400, H); ctx.lineTo(700, H); ctx.fill();
    const r = rng(44); ctx.fillStyle = 'rgba(244,249,255,0.6)';
    for (let i = 0; i < 18; i++) { const k = r(), side = r() < 0.5 ? -1 : 1; const yy = -700 + k * 1250; const half = (yy + 760) * (side < 0 ? 0.36 : 0.42); const xx = 640 + side * half * (0.2 + r() * 0.7); const w = 40 + r() * 70;
        ctx.beginPath(); ctx.moveTo(xx - w / 2, yy); ctx.quadraticCurveTo(xx, yy - 6, xx + w / 2, yy); ctx.quadraticCurveTo(xx, yy + 10, xx - w / 2, yy); ctx.fill(); }
    ctx.fillStyle = '#f4f9ff'; ctx.beginPath(); ctx.moveTo(640, -760); ctx.lineTo(720, -560); ctx.lineTo(680, -580); ctx.lineTo(640, -520); ctx.lineTo(600, -590); ctx.lineTo(560, -560); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f4f9ff'; ctx.beginPath(); ctx.moveTo(0, 600); ctx.quadraticCurveTo(640, 560, W, 600); ctx.lineTo(W, H + 40); ctx.lineTo(0, H + 40); ctx.fill();
}

function blizzard(ctx, t, k) {
    ctx.strokeStyle = `rgba(255,255,255,${0.6 * k})`; ctx.lineWidth = 2.5; const r = rng(5);
    for (let i = 0; i < 70 * k; i++) { const y = r() * H, x = ((r() * W * 1.4 - t * 900 * (0.6 + r())) % (W + 200) + W + 200) % (W + 200) - 100; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 60 + r() * 60, y + 8); ctx.stroke(); }
    ctx.fillStyle = `rgba(255,255,255,${0.2 * k})`; ctx.fillRect(-20, -20, W + 40, H + 40);
}

function v2shot8(ctx, t) { // 86 → 98.4 : les Monts Givrés, le yéti, la réaction de Flocon
    const lt = t - 86;
    if (lt < 4.7) { // A : la montagne, caméra qui monte
        const cam = ease.io(seg(lt, 0.6, 4.4)) * 1300;
        ctx.fillStyle = vgrad(ctx, 0, H, [[0, mixc('9cc4ec', '5d7fa8', seg(lt, 1, 4))], [1, '#e6f1fb']]); ctx.fillRect(0, 0, W, H);
        ctx.save(); ctx.translate(0, cam); mountainWall(ctx);
        for (let i = 0; i < 6; i++) pine(ctx, 80 + i * 230, 620 + (i % 2) * 20, 90, '#2b6b5a', '#3a8a70');
        penguin(ctx, 330, 644, 0.95, { mood: 'normal', lookY: -1, look: 0.6, blink: blinkAt(t, 4), wave: t * 3 });
        ctx.restore();
        blizzard(ctx, t, seg(lt, 1.5, 4));
    } else { // B, C, D : le col
        const bl = 1;
        const closeK = lt > 7.6 && lt < 9.8;
        ctx.fillStyle = vgrad(ctx, 0, H, [[0, '#5d7fa8'], [1, '#dfeaf6']]); ctx.fillRect(0, 0, W, H);
        if (!closeK) {
            const shk = lt > 5.3 && lt < 6.0 ? (1 - seg(lt, 5.3, 6.0)) * 10 : (lt > 5.7 && lt < 7.5 ? 3 : 0);
            ctx.save(); ctx.translate(Math.sin(lt * 70) * shk, Math.cos(lt * 57) * shk);
            mountains(ctx, 81, 420, 200, '#8fa9cd', '#ffffff', 0, 240);
            ctx.fillStyle = '#c9daee'; ctx.beginPath(); ctx.moveTo(560, 520); ctx.lineTo(760, 300); ctx.lineTo(1300, 280); ctx.lineTo(1300, H); ctx.lineTo(560, H); ctx.fill();
            ctx.fillStyle = '#f4f9ff'; ctx.beginPath(); ctx.moveTo(0, 600); ctx.quadraticCurveTo(500, 560, 760, 590); ctx.quadraticCurveTo(1000, 610, W, 590); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();
            // le yéti saute du rocher et atterrit
            const jump = seg(lt, 4.8, 5.3);
            const yx = lerp(1060, 880, jump), yy = lt < 4.8 ? 300 : lt < 5.3 ? lerp(300, 600, ease.in(jump)) - Math.sin(jump * Math.PI) * 120 : 600;
            const roar = lt > 5.7 && lt < 7.4 ? ease.out(seg(lt, 5.7, 5.95)) * (1 - seg(lt, 7.1, 7.4)) : 0;
            yeti2(ctx, yx, yy, 1.55, { roar, t, arms: roar });
            if (lt > 5.3 && lt < 5.9) { const r = rng(12); const k = seg(lt, 5.3, 5.9); for (let i = 0; i < 20; i++) circle(ctx, 880 + (r() - 0.5) * 300 * k, 600 - r() * 80 * k, 4 * (1 - k) + 1, `rgba(255,255,255,${1 - k})`); }
            const step = lt > 9.8 ? ease.out(seg(lt, 9.8, 10.6)) * 50 : 0;
            penguin(ctx, 360 + step, 606, 1.3, { mood: lt > 9.8 ? 'determined' : (lt > 5.3 ? 'surprised' : 'normal'), look: 1, blink: blinkAt(t, 5), wave: t * 8, flipR: lt > 5.3 && lt < 7.6 ? -1.2 : 0, squash: lt > 5.3 && lt < 5.5 ? 0.9 : 1 });
            ctx.restore();
            if (lt > 5.8 && lt < 7.6) { const k = seg(lt, 5.8, 6.1); ctx.save(); ctx.translate(W / 2 + Math.sin(t * 50) * 6, 130); ctx.scale(ease.back(k) * 1.1, ease.back(k) * 1.1); ctx.font = `900 88px ${DISP}`; ctx.textAlign = 'center'; ctx.lineJoin = 'round'; ctx.lineWidth = 14; ctx.strokeStyle = '#1d2b55'; ctx.fillStyle = '#ffffff'; ctx.strokeText('GRRRAOOO !', 0, 0); ctx.fillText('GRRRAOOO !', 0, 0); ctx.restore(); }
        } else { // C : gros plan de réaction
            const k = seg(lt, 7.6, 9.8);
            ctx.fillStyle = vgrad(ctx, 0, H, [[0, '#7f9cc4'], [1, '#e6f0fa']]); ctx.fillRect(0, 0, W, H);
            const gulp = lt > 7.9 && lt < 8.3 ? Math.sin(seg(lt, 7.9, 8.3) * Math.PI) : 0;
            const tighten = seg(lt, 8.5, 9.1);
            const smile = lt > 9.15;
            penguin(ctx, 560, 940, 5.2, { mood: smile ? 'happy' : 'surprised', look: 0.8, wave: t * 16, squash: 1 - gulp * 0.05, flipR: tighten > 0 && !smile ? -2.0 : (smile ? -0.4 : -0.2), cheeks: 0.55 + (smile ? 0.3 : 0) });
            if (gulp > 0) { ctx.globalAlpha = gulp; ctx.font = `800 40px ${DISP}`; ctx.textAlign = 'center'; ctx.fillStyle = '#1d2542'; ctx.fillText('glups', 820, 300); ctx.globalAlpha = 1; }
            // l'écharpe qui claque dans le vent
            const wv = Math.sin(t * 22);
            const wv2 = Math.sin(t * 22 + 1.4);
            ctx.fillStyle = '#e94b4b';
            ctx.beginPath(); ctx.moveTo(670, 680); ctx.bezierCurveTo(780, 650 + wv * 26, 900, 600 + wv2 * 40, 1040 + k * 30, 600 + wv * 46); ctx.lineTo(1030 + k * 30, 640 + wv * 40); ctx.bezierCurveTo(900, 650 + wv2 * 30, 790, 700 + wv * 16, 676, 718); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#c93a3a';
            ctx.beginPath(); ctx.moveTo(672, 700); ctx.bezierCurveTo(770, 700 + wv2 * 20, 880, 680 + wv * 34, 980 + k * 20, 690 + wv2 * 40); ctx.lineTo(972 + k * 20, 724 + wv2 * 36); ctx.bezierCurveTo(870, 716 + wv * 26, 770, 730, 676, 730); ctx.closePath(); ctx.fill();
            blizzard(ctx, t, 0.7);
        }
        if (lt > 9.8) blizzard(ctx, t, 0.6);
        else if (!closeK) blizzard(ctx, t, bl * 0.5);
        if (lt > 7.5 && lt < 7.7) { ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(0, 0, W, H); }
    }
    caption(ctx, t, 86.3, 89.6, 'Pour rejoindre le village, il faut d’abord franchir…', 100, 28);
    caption(ctx, t, 89.6, 91.2, '… les Monts Givrés.', 100, 30);
    if (lt > 11.4) { ctx.fillStyle = `rgba(255,255,255,${seg(lt, 11.4, 12.4)})`; ctx.fillRect(0, 0, W, H); }
    vignette(ctx, 0.35);
}

function v2shot9(ctx, t) { // 98 → 108 : le titre, et à toi de jouer
    const lt = t - 98;
    ctx.fillStyle = vgrad(ctx, 0, H, [[0, '#0b1533'], [1, '#2b4a86']]); ctx.fillRect(0, 0, W, H);
    stars(ctx, t, 91, 120, 500); aurora(ctx, t, 30, 0.7);
    mountains(ctx, 93, 600, 130, '#2e4b82', '#eaf2fc', 0, 200);
    ctx.fillStyle = '#e6f1fb'; ctx.beginPath(); ctx.moveTo(0, 600); ctx.quadraticCurveTo(640, 560, W, 600); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();
    if (lt < 0.9) { ctx.fillStyle = `rgba(255,255,255,${1 - seg(lt, 0, 0.9)})`; ctx.fillRect(0, 0, W, H); }
    const pop = (str, y, size, t0) => {
        ctx.font = `900 ${size}px ${DISP}`; const total = ctx.measureText(str).width; let x = W / 2 - total / 2;
        [...str].forEach((ch, i) => {
            const w = ctx.measureText(ch).width; const k = ease.back(seg(lt, t0 + i * 0.045, t0 + i * 0.045 + 0.4));
            if (k > 0 && ch !== ' ') {
                ctx.save(); ctx.translate(x + w / 2, y + Math.sin(t * 2 + i * 0.5) * 3); ctx.scale(k, k); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.lineJoin = 'round'; ctx.lineWidth = size * 0.14; ctx.strokeStyle = '#14234a'; ctx.strokeText(ch, 0, size * 0.05); ctx.strokeText(ch, 0, 0);
                ctx.fillStyle = '#ffffff'; ctx.fillText(ch, 0, 0); ctx.restore();
            }
            x += w;
        });
    };
    pop('LA GRANDE QUÊTE', 160, 80, 0.6); pop('DE FLOCON', 256, 96, 1.2);
    const k3 = ease.out(seg(lt, 2.1, 2.8));
    ctx.globalAlpha = k3; ctx.font = `800 32px ${DISP}`; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = '#ffd36e'; ctx.fillText('Épisode 1 · Les Monts Givrés', W / 2, 352 + (1 - k3) * 14); ctx.globalAlpha = 1;
    const k4 = ease.back(seg(lt, 3.0, 3.6));
    if (k4 > 0) {
        ctx.save(); ctx.translate(W / 2, 422); ctx.scale(k4 * (1 + 0.03 * Math.sin(t * 4)), k4 * (1 + 0.03 * Math.sin(t * 4)));
        ctx.fillStyle = '#c98a12'; rrect(ctx, -150, -30, 300, 64, 32); ctx.fill(); ctx.fillStyle = '#ffd36e'; rrect(ctx, -150, -34, 300, 64, 32); ctx.fill();
        ctx.font = `800 30px ${DISP}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#2a1d05'; ctx.fillText('À toi de jouer !', 0, -2);
        ctx.restore();
    }
    const kp = ease.back(seg(lt, 1.8, 2.5));
    if (kp > 0) penguin(ctx, W / 2 + 330, 616 + (1 - kp) * 120, 1.2, { mood: 'happy', flipR: -2.3 + Math.sin(t * 8) * 0.4, wave: t * 5 });
    snowLayer(ctx, t, 26, 80, 40, 2, 0.8, 22, -10);
}

const SHOTS = [
    { a: 0, b: 7.5, f: v2shot1 }, { a: 7, b: 17.4, f: v2shot2 }, { a: 17, b: 21.4, f: v2shot2b }, { a: 21, b: 25.6, f: v2shot3 }, { a: 25, b: 48.4, f: v2shot4 },
    { a: 48, b: 64.4, f: v2shot5 }, { a: 64, b: 76.4, f: v2shot6 }, { a: 76, b: 86.4, f: v2shot7 }, { a: 86, b: 98.4, f: v2shot8 }, { a: 98, b: 108, f: v2shot9 }
];
const DURATION = 108;

function renderFilm(ctx, t, buf) {
    ctx.save(); ctx.setTransform(ctx.canvas.width / W, 0, 0, ctx.canvas.height / H, 0, 0);
    const active = SHOTS.filter((s) => t >= s.a && t < s.b);
    if (!active.length) { active.push(SHOTS[SHOTS.length - 1]); }
    active[0].f(ctx, t);
    if (active[1]) {
        const s = active[1], k = seg(t, s.a, active[0].b);
        const b = buf.getContext('2d'); b.setTransform(buf.width / W, 0, 0, buf.height / H, 0, 0); b.clearRect(0, 0, W, H);
        s.f(b, t);
        ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = ease.sine(k); ctx.drawImage(buf, 0, 0, ctx.canvas.width, ctx.canvas.height); ctx.globalAlpha = 1;
    }
    if (t < 1.2) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = `rgba(0,0,0,${1 - seg(t, 0, 1.2)})`; ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height); }
    ctx.restore();
}
