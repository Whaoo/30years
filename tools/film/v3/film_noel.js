// ================================================================ épilogue « Joyeux Noël » (vidéo du vendredi 18 décembre)
// Le Golem vaincu se calme, les éclats rejoignent les aurores, le givre fond, tout le royaume fête Noël au village,
// grand titre « Joyeux Noël ! », puis un générique avec les personnages et les prénoms de l'équipe.
// À charger après film_eps.js (chapterCard, scarfShards, mapLeg, mayor, villageBg…).

// ---------------------------------------------------------------- le Golem de givre (mêmes formes que le jeu d'aventure)
// repère : x, y = pieds ; mood 'angry' | 'calm' | 'shy' ; scarf : couleur d'écharpe (ou null)
function golem(ctx, x, y, s, o = {}) {
    const { mood = 'calm', scarf = null, t = 0, blush = 0, arm = 0 } = o;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.translate(-200, -152);
    ctx.scale(1, 1); ctx.translate(0, Math.sin(t * 1.6) * 1.2);
    const R = (x0, y0, w, h, r, f) => { ctx.fillStyle = f; rrect(ctx, x0, y0, w, h, r); ctx.fill(); };
    ell(ctx, 200, 152, 96, 9, 'rgba(10,20,50,0.22)');
    R(160, 126, 32, 26, 6, '#7fc3f0'); R(208, 126, 32, 26, 6, '#7fc3f0');
    // bras (le droit peut se lever pour saluer)
    R(108, 92, 38, 50, 12, '#9fd8ff');
    ctx.save(); ctx.translate(273, 96); ctx.rotate(-arm * 2.2); ctx.translate(-273, -96); R(254, 92, 38, 50, 12, '#9fd8ff'); ctx.restore();
    R(148, 56, 104, 80, 14, '#9fd8ff');
    R(116, 58, 44, 40, 10, '#cfeaff'); R(240, 58, 44, 40, 10, '#cfeaff');
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(166, 70); ctx.lineTo(176, 84); ctx.lineTo(170, 98); ctx.moveTo(236, 112); ctx.lineTo(226, 122); ctx.stroke();
    R(170, 20, 60, 42, 10, '#cfeaff');
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#b9dcf5'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(174, 22); ctx.lineTo(180, 4); ctx.lineTo(186, 22); ctx.closePath(); ctx.moveTo(194, 22); ctx.lineTo(200, -4); ctx.lineTo(206, 22); ctx.closePath(); ctx.moveTo(214, 22); ctx.lineTo(220, 4); ctx.lineTo(226, 22); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#1d2542'; ctx.lineCap = 'round';
    if (mood === 'angry') {
        R(180, 36, 14, 6, 3, '#3b82f6'); R(206, 36, 14, 6, 3, '#3b82f6');
        ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(178, 32); ctx.lineTo(196, 36); ctx.moveTo(222, 32); ctx.lineTo(204, 36); ctx.moveTo(186, 52); ctx.lineTo(214, 52); ctx.stroke();
        ctx.lineWidth = 2.5; ctx.beginPath(); [190, 200, 210].forEach((mx) => { ctx.moveTo(mx, 52); ctx.lineTo(mx, 56); }); ctx.stroke();
    } else {
        // regard apaisé : yeux en arc, sourire (timide = yeux baissés)
        ctx.lineWidth = 3.2; ctx.beginPath();
        if (mood === 'shy') { ctx.moveTo(181, 38); ctx.quadraticCurveTo(187, 42, 193, 38); ctx.moveTo(207, 38); ctx.quadraticCurveTo(213, 42, 219, 38); }
        else { ctx.moveTo(181, 40); ctx.quadraticCurveTo(187, 33, 193, 40); ctx.moveTo(207, 40); ctx.quadraticCurveTo(213, 33, 219, 40); }
        ctx.moveTo(188, 50); ctx.quadraticCurveTo(200, 57, 212, 50); ctx.stroke();
        ctx.strokeStyle = '#7d9cc4'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(180, 30); ctx.lineTo(192, 28); ctx.moveTo(208, 28); ctx.lineTo(220, 30); ctx.stroke();
    }
    if (blush > 0) { ctx.globalAlpha = blush * 0.7; circle(ctx, 180, 47, 5, '#ff8fa8'); circle(ctx, 220, 47, 5, '#ff8fa8'); ctx.globalAlpha = 1; }
    if (scarf) {
        ctx.fillStyle = scarf; rrect(ctx, 160, 58, 80, 14, 7); ctx.fill();
        ctx.save(); ctx.translate(222, 66); ctx.rotate(0.12 + Math.sin(t * 3) * 0.06); rrect(ctx, -6, 0, 14, 40, 5); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.65)'; ctx.fillRect(-6, 30, 14, 3); ctx.fillRect(-6, 35, 14, 3); ctx.restore();
        ctx.fillStyle = 'rgba(255,255,255,0.35)'; for (let i = 0; i < 5; i++) ctx.fillRect(168 + i * 15, 60, 3, 10);
    }
    ctx.restore();
}
const MAMIE = { scarf: '#1d2542', shawl: '#b14a7a', glasses: true, bun: true };

// ---------------------------------------------------------------- feux d'artifice (chaque gerbe dépend seulement de t)
function fireworks(ctx, t, t0, t1, seed = 1, area = [160, 1120, 80, 300]) {
    const r = rng(seed); const cols = ['#ffd36e', '#ff5d5d', '#7fe8ff', '#7be0a3', '#ff8fa8', '#c9b6ff'];
    for (let tb = t0; tb < t1; tb += 0.55 + r() * 0.5) {
        const x = area[0] + r() * (area[1] - area[0]), y = area[2] + r() * (area[3] - area[2]), col = cols[Math.floor(r() * cols.length)], n = 22 + Math.floor(r() * 12);
        const dt = t - tb;
        if (dt < -0.7 || dt > 1.8) continue;
        if (dt < 0) { const k = 1 + dt / 0.7; circle(ctx, x, H - 40 - (H - 40 - y) * ease.out(k), 2.5, '#fff3cf'); continue; }
        const k = dt / 1.8, rad = 130 * ease.out(Math.min(1, dt / 1.0));
        glow(ctx, x, y, 90 * (1 - k), 'rgba(255,230,170,A)', 0.4 * (1 - k));
        ctx.globalAlpha = 1 - k;
        for (let i = 0; i < n; i++) { const a = (i / n) * TAU; const px = x + Math.cos(a) * rad, py = y + Math.sin(a) * rad + dt * dt * 40; circle(ctx, px, py, 3 * (1 - k * 0.6), col); circle(ctx, x + Math.cos(a) * rad * 0.8, y + Math.sin(a) * rad * 0.8 + dt * dt * 34, 1.6, '#ffffff'); }
        ctx.globalAlpha = 1;
    }
}
function garlands(ctx, t, y = 330) {
    ['#ff5d5d', '#ffd36e', '#7fe8ff', '#7be0a3'].forEach((c, k) => {
        const x0 = -40 + k * 340, x1 = x0 + 420;
        ctx.strokeStyle = 'rgba(30,40,70,0.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, y - 20); ctx.quadraticCurveTo((x0 + x1) / 2, y + 50, x1, y - 20); ctx.stroke();
        for (let i = 1; i < 10; i++) { const u = i / 10, bx = (1 - u) * (1 - u) * x0 + 2 * u * (1 - u) * ((x0 + x1) / 2) + u * u * x1, by = (1 - u) * (1 - u) * (y - 20) + 2 * u * (1 - u) * (y + 50) + u * u * (y - 20);
            const on = 0.55 + 0.45 * Math.sin(t * 5 + i + k); glow(ctx, bx, by + 6, 14, 'rgba(255,230,150,A)', 0.4 * on); circle(ctx, bx, by + 6, 5, ['#ff5d5d', '#ffd36e', '#7fe8ff', '#7be0a3'][(i + k) % 4]); }
    });
}

// ---------------------------------------------------------------- 1. le Golem apaisé, les éclats rejoignent les aurores
function n_golem(ctx, t, lt) {
    const dawn = ease.io(seg(lt, 0, 12));
    ctx.fillStyle = vgrad(ctx, 0, H, [[0, mixc('0b1733', '2b3570', dawn)], [0.6, mixc('2a4372', 'c48aa0', dawn)], [1, mixc('5d7fa8', 'f6c7a8', dawn)]]); ctx.fillRect(0, 0, W, H);
    stars(ctx, t, 61, 160, 380);
    curtains(ctx, t, 170, 40, 0.5 + ease.out(seg(lt, 9.0, 11.0)) * 0.9, 12);
    if (lt > 9) { const k = seg(lt, 9.0, 10.2); if (k < 1) { ctx.fillStyle = `rgba(220,255,250,${0.5 * (1 - k)})`; ctx.fillRect(0, 0, W, H); } }
    peaks(ctx, [[130, 560, 380, 250], [1180, 560, 380, 270]], 71, '#e6eef8', '#4b6596', '#3a5283');
    // le fort, derrière, fissuré et qui fond
    ctx.save(); ctx.globalAlpha = 0.9; fortress2(ctx, 900, 560, 0.7, { eyes: 0, shards: 0, glow: 0 }); ctx.restore();
    ctx.fillStyle = mixc('cfdcf0', 'fbe9e2', dawn); ctx.beginPath(); ctx.moveTo(0, 590); ctx.quadraticCurveTo(640, 555, W, 590); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();
    const mood = lt < 2.6 ? 'angry' : (lt > 12.4 ? 'shy' : 'calm');
    const wob = lt < 2.6 ? Math.sin(t * 30) * 3 * seg(lt, 0.6, 2.6) : 0;
    golem(ctx, 780 + wob, 640, 2.0, { mood, t, blush: ease.out(seg(lt, 12.4, 13.2)) });
    if (lt > 2.4 && lt < 3.4) { const k = seg(lt, 2.4, 3.4); ctx.save(); ctx.globalAlpha = 1 - k; for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU; circle(ctx, 780 + Math.cos(a) * 140 * k, 470 + Math.sin(a) * 80 * k, 6, '#e8fdff'); } ctx.restore(); }
    const fx = 360, fy = 640;
    penguin(ctx, fx, fy, 1.3, { mood: lt > 2.8 ? 'happy' : 'determined', look: 1, wave: t * 5, blink: blinkAt(t, 7), flipR: lt > 4 && lt < 6.4 ? -0.8 : 0 });
    // les trois éclats quittent l'écharpe, tournent ensemble et montent vers les aurores
    const rise = seg(lt, 4.4, 9.2);
    if (rise <= 0) scarfShards(ctx, fx, fy, 1.3, 3, t);
    else if (rise < 1) {
        const e = ease.io(rise), cx = lerp(fx, 640, e), cy = lerp(fy - 60, 150, e), rr = lerp(30, 6, e);
        glowAt(ctx, cx, cy, 90, 0.5 + 0.4 * e);
        for (let i = 0; i < 3; i++) { const a = t * (3 + e * 6) + (i * TAU) / 3; shard(ctx, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 1.0 + e * 0.5, a, 1); }
    } else sparkle(ctx, 640, 150, lt, 9.2, 14, 160, '#c8faff');
    caption(ctx, t, 5.6, 10.0, 'Le Golem de givre était vaincu… et les trois éclats rejoignirent les aurores.', 650, 28);
    subtitle(ctx, t, 13.0, 18.6, 'Pardon… J’avais si froid, tout seul là-haut.', 'Le Golem de givre');
    snowLayer(ctx, t, 62, 50, 25, 2, 0.6, 20, -10);
    vignette(ctx, 0.5);
}
// ---------------------------------------------------------------- 2. la carte : le givre fond, le chemin s'illumine
function n_map(ctx, t, lt) {
    const z = lerp(1.05, 1.18, ease.io(seg(lt, 0, 12)));
    const [qx, qy] = mapCam(ctx, mapImg(true), 660, 400, z, -0.012);
    const fr = 1 - ease.io(seg(lt, 0.6, 7.0));
    if (fr > 0) {
        const g = ctx.createRadialGradient(1060, 120, 30, 1060, 120, 120 + fr * 1300);
        g.addColorStop(0, 'rgba(225,245,255,0.92)'); g.addColorStop(0.8, 'rgba(200,235,255,0.55)'); g.addColorStop(1, 'rgba(200,235,255,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(-0.012); ctx.scale(z, z); ctx.translate(-qx, -qy);
    const k = ease.io(seg(lt, 3.0, 9.0)); const n = Math.floor(k * (ROUTE_PTS.length - 1));
    ctx.strokeStyle = '#e0a526'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath();
    for (let i = 0; i <= n; i++) i ? ctx.lineTo(...ROUTE_PTS[i]) : ctx.moveTo(...ROUTE_PTS[i]); ctx.stroke();
    STOPS.forEach(([x, y], i) => {
        const kk = ease.back(seg(lt, 3.6 + i * 1.4, 4.2 + i * 1.4)); if (kk <= 0) return;
        ctx.save(); ctx.translate(x, y); ctx.scale(kk, kk); glow(ctx, 0, 0, 34, 'rgba(255,211,110,A)', 0.6); circle(ctx, 0, 0, 13, '#2bb673');
        ctx.font = `400 15px ${SERIF}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.fillText('✓', 0, 1); ctx.restore();
    });
    ctx.restore();
    caption(ctx, t, 19.6, 25.0, 'Le givre fondit, et tout le royaume retrouva ses couleurs.', 650, 28);
    caption(ctx, t, 25.6, 30.8, 'Ce soir-là, chacun prit le chemin du village de Noël…', 650, 28);
    vignette(ctx, 0.55);
}
// ---------------------------------------------------------------- 3. la fête au village
function partyScene(ctx, t, lt, cam) {
    villageBg(ctx, t, { lights: 1, cam });
    fireworks(ctx, t, 31, 58, 7);
    ctx.save(); ctx.translate(-cam, 0);
    garlands(ctx, t, 330);
    // tout le monde danse autour du sapin
    yeti2(ctx, 180, 650, 1.05, { t, eyes: 0, shard: false, arms: 0.5 + 0.4 * Math.sin(t * 6) });
    [-1, 1].forEach((d) => { const ex = 180 + d * 12 * 1.05, ey = 650 - 114 * 1.05; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(ex - 6, ey + 2); ctx.quadraticCurveTo(ex, ey - 4, ex + 6, ey + 2); ctx.stroke(); });
    bigSnowman(ctx, 1010, 668, 0.62, { crown: 1, evil: 0, arms: 0.4 + 0.4 * Math.sin(t * 5 + 1), t });
    for (let i = 0; i < 3; i++) snowman(ctx, 800 + i * 46, 650 - Math.abs(Math.sin(t * 7 + i)) * 16, 0.36, 0, t);
    golem(ctx, 1300, 650, 0.95, { mood: lt > 12 ? 'shy' : 'calm', scarf: lt > 11.6 ? '#d7263d' : null, t, blush: ease.out(seg(lt, 11.8, 12.6)), arm: lt > 20 ? 0.6 + 0.3 * Math.sin(t * 6) : 0 });
    [[360, 640, '#7be0a3'], [480, 652, '#ffd36e'], [740, 652, '#ff8fa8']].forEach(([x, y, sc], i) => penguin(ctx, x, y - Math.abs(Math.sin(t * 6 + i * 1.3)) * 18, 0.78, { mood: 'happy', scarf: sc, flipR: -2.0 + Math.sin(t * 8 + i) * 0.4, flipL: 1.6 - Math.sin(t * 8 + i) * 0.4, facing: i % 2 ? -1 : 1 }));
    mayor(ctx, 610, 660, 0.9, { mood: 'happy', flipR: -1.6 + Math.sin(t * 6) * 0.4 });
    const gx = 700 + Math.sin(t * 0.8) * 260, gy = 200 + Math.sin(t * 1.6) * 30;
    seagull(ctx, gx, gy, 1.6, t * 12, { facing: Math.cos(t * 0.8) > 0 ? 1 : -1 });
    ctx.restore();
}
function n_party(ctx, t, lt) {
    // plan large qui glisse, puis Mamie offre une écharpe au Golem
    const cam = lerp(0, 160, ease.io(seg(lt, 0, 9))) + lerp(0, -40, ease.io(seg(lt, 18, 26)));
    // gros plan sur Mamie et le Golem pour l'écharpe
    const zk = ease.io(seg(lt, 7.6, 9.4)) - ease.io(seg(lt, 16.2, 18.2)), z = 1 + 0.5 * zk;
    const fx = 1175 * zk + (W / 2) * (1 - zk), fy = 600 * zk + (H / 2) * (1 - zk);
    ctx.save(); ctx.translate(fx, fy); ctx.scale(z, z); ctx.translate(-fx, -fy);
    partyScene(ctx, t, lt, cam);
    ctx.save(); ctx.translate(-cam, 0);
    const w = ease.out(seg(lt, 4.0, 8.4)), mx = lerp(900, 1200, w);
    penguin(ctx, mx - 70, 660 - (w > 0 && w < 1 ? Math.abs(Math.sin(t * 9)) * 6 : 0), 1.0, { mood: 'happy', look: 1, wave: t * 5, blink: blinkAt(t, 8), flipR: lt > 18 ? -2.0 + Math.sin(t * 8) * 0.4 : 0 });
    scarfShards(ctx, mx - 70, 660, 1.0, 0, t);
    penguin(ctx, mx, 660, 1.0, { ...MAMIE, mood: 'happy', look: 1, blink: blinkAt(t, 9), flipR: lt > 10.6 && lt < 11.8 ? -1.6 : -0.4 });
    if (lt > 10.4 && lt < 11.8) { const k = ease.io(seg(lt, 10.4, 11.6)); const ex = lerp(mx + 30, 1290, k), ey = lerp(610, 568, k); ctx.strokeStyle = '#d7263d'; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(ex - 30, ey + 4); ctx.quadraticCurveTo(ex, ey - 30, ex + 30, ey + 4); ctx.stroke(); }
    sparkle(ctx, 1300, 560, lt, 11.6, 10, 80, '#ff8fa8');
    ctx.restore(); ctx.restore();
    caption(ctx, t, 31.6, 36.6, 'Au village, tout le royaume fêtait Noël… même le Golem.', 650, 28);
    subtitle(ctx, t, 39.0, 43.0, 'Tiens, je t’en ai tricoté une, à toi aussi.', 'Mamie Banquise');
    subtitle(ctx, t, 43.6, 46.6, '…Merci.', 'Le Golem de givre');
    caption(ctx, t, 48.6, 54.6, 'Et cette année, Noël arriva un peu en avance.', 650, 30);
    snowLayer(ctx, t, 63, 60, 30, 2, 0.6, 20, -10);
    vignette(ctx, 0.5);
}
// ---------------------------------------------------------------- 4. le grand titre
function n_title(ctx, t, lt) {
    ctx.fillStyle = vgrad(ctx, 0, H, [[0, '#050b1f'], [0.7, '#14244a'], [1, '#2b4a86']]); ctx.fillRect(0, 0, W, H);
    stars(ctx, t, 95, 220, 520); curtains(ctx, t, 160, 40, 1.0, 14);
    fireworks(ctx, t, 58, 72, 9, [120, 1160, 70, 240]);
    peaks(ctx, [[120, 630, 360, 200], [430, 630, 300, 150], [850, 630, 340, 170], [1170, 630, 380, 220]], 85, '#cfdcf0', '#2a4372', '#1d3561');
    ctx.fillStyle = '#e6f1fb'; ctx.beginPath(); ctx.moveTo(0, 620); ctx.quadraticCurveTo(640, 580, W, 620); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    const k2 = ease.back(seg(lt, 0.5, 1.5)); ctx.globalAlpha = Math.min(1, seg(lt, 0.5, 1.0) * 2);
    const g = ctx.createLinearGradient(0, 230, 0, 360); g.addColorStop(0, '#fff6d6'); g.addColorStop(0.35, '#f2cf7a'); g.addColorStop(0.6, '#c99636'); g.addColorStop(1, '#f6dc95');
    ctx.translate(W / 2, 320); ctx.scale(0.8 + 0.2 * k2, 0.8 + 0.2 * k2);
    ctx.font = `400 128px ${SERIF}`; ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 24; ctx.fillStyle = g; ctx.fillText('Joyeux Noël !', 0, 0); ctx.shadowBlur = 0;
    ctx.restore();
    ctx.save(); ctx.textAlign = 'center';
    ctx.globalAlpha = ease.out(seg(lt, 1.6, 2.4)); ctx.font = `italic 400 34px ${BOOK}`; ctx.fillStyle = '#e9dcc0'; ctx.fillText('~ un peu en avance ~', W / 2, 382);
    ctx.globalAlpha = ease.out(seg(lt, 2.8, 3.6)); ctx.font = `italic 600 30px ${BOOK}`; ctx.fillStyle = '#ffe9b0'; ctx.fillText('Bonnes fêtes, bonnes vacances, et à l’année prochaine !', W / 2, 456);
    ctx.restore();
    const kp = ease.back(seg(lt, 1.2, 1.9));
    if (kp > 0) {
        penguin(ctx, 250, 650 + (1 - kp) * 120, 1.2, { mood: 'happy', flipR: -2.3 + Math.sin(t * 8) * 0.4, wave: t * 5 });
        penguin(ctx, 1040, 650 + (1 - kp) * 120, 1.15, { ...MAMIE, mood: 'happy', facing: -1, flipR: -2.0 + Math.sin(t * 7 + 1) * 0.4 });
    }
    snowLayer(ctx, t, 64, 90, 40, 2, 0.8, 22, -10);
    vignette(ctx, 0.5);
}
// ---------------------------------------------------------------- 5. le générique
const CAST = [['Flocon', 'le meilleur glisseur de la banquise'], ['Mamie Banquise', 'tricoteuse d’écharpes'], ['Le Yéti', 'des Monts Givrés'], ['Le Gros Bonhomme', 'et ses bonshommes grognons'],
    ['La Grande Trieuse', 'de l’Archipel du Tri'], ['Cheffe Mouette', 'du centre de tri'], ['Monsieur le Maire', 'du village de Noël'], ['Le Golem de givre', 'qui avait froid au cœur']];
const TEAM = ['Adele', 'Aicha', 'Alice', 'Auderic', 'Benjamin', 'Brieuc', 'Claire', 'Clément', 'Dorian', 'Eddy', 'Emilie', 'Guillaume', 'Hugo', 'Jeremy', 'Julian', 'Laetitia',
    'Laura', 'Louis', 'Maelys', 'Mélissa', 'Nathalie', 'Noël', 'Noémie', 'Paul Henri', 'Pierre', 'Sarah', 'Soizic', 'Sophie', 'Théophane', 'Thibault', 'Thomas'];
let CREDITS_IMG = null;
function creditsImg() {
    if (CREDITS_IMG) return CREDITS_IMG;
    const hh = 2300; const [c, x] = off(W * 2, hh * 2); x.scale(2, 2);
    x.textAlign = 'center'; x.textBaseline = 'alphabetic';
    let y = 80;
    const line = (txt, font, col, dy) => { x.font = font; x.fillStyle = col; x.fillText(txt, W / 2, y); y += dy; };
    line('La Grande Quête de Flocon', `400 54px ${SERIF}`, '#f2cf7a', 50);
    line('une histoire en quatre épisodes et cinq films', `italic 400 26px ${BOOK}`, '#e9dcc0', 110);
    line('~ Avec ~', `italic 400 28px ${BOOK}`, '#e9dcc0', 70);
    CAST.forEach(([who, what]) => { x.font = `600 30px ${BOOK}`; x.fillStyle = '#fff'; x.textAlign = 'right'; x.fillText(who, W / 2 - 20, y); x.font = `italic 400 26px ${BOOK}`; x.fillStyle = '#c9d6ec'; x.textAlign = 'left'; x.fillText(what, W / 2 + 20, y); x.textAlign = 'center'; y += 50; });
    y += 70;
    line('~ Et dans le rôle des héros de la quête ~', `italic 400 28px ${BOOK}`, '#e9dcc0', 76);
    for (let i = 0; i < TEAM.length; i += 3) {
        TEAM.slice(i, i + 3).forEach((n, j) => { x.font = `600 32px ${BOOK}`; x.fillStyle = '#fff'; x.fillText(n, W / 2 + (j - 1) * 300, y); });
        y += 54;
    }
    y += 90;
    line('Merci d’avoir joué !', `400 48px ${SERIF}`, '#f2cf7a', 60);
    line('Joyeux Noël à toute l’équipe', `italic 400 30px ${BOOK}`, '#e9dcc0', 0);
    CREDITS_IMG = { c, h: y + 60 }; return CREDITS_IMG;
}
const CREDITS_DUR = 26;
function n_credits(ctx, t, lt) {
    ctx.fillStyle = vgrad(ctx, 0, H, [[0, '#050b1f'], [1, '#1a2c56']]); ctx.fillRect(0, 0, W, H);
    stars(ctx, t, 97, 220, H); curtains(ctx, t, 120, 30, 0.6, 15);
    const { c, h } = creditsImg();
    const end = h - H / 2 - 40; const y = lerp(H - 20, -end, Math.min(1, lt / (CREDITS_DUR - 3.2)));
    ctx.drawImage(c, 0, y, W, c.height / 2);
    // fondu en haut et en bas du générique
    const gt = ctx.createLinearGradient(0, 0, 0, 120); gt.addColorStop(0, 'rgba(5,11,31,1)'); gt.addColorStop(1, 'rgba(5,11,31,0)'); ctx.fillStyle = gt; ctx.fillRect(0, 0, W, 120);
    const gb = ctx.createLinearGradient(0, H - 120, 0, H); gb.addColorStop(0, 'rgba(26,44,86,0)'); gb.addColorStop(1, 'rgba(26,44,86,1)'); ctx.fillStyle = gb; ctx.fillRect(0, H - 120, W, 120);
    // Flocon glisse en bas de l'écran pendant le générique
    const px = lerp(-80, W + 80, (lt % 9) / 9);
    penguin(ctx, px, 690, 0.5, { mood: 'happy', tilt: -0.25, flipR: -1.2, flipL: 1.2 });
    snowLayer(ctx, t, 65, 70, 30, 2, 0.6, 20, -10);
    if (lt > CREDITS_DUR - 1.8) { ctx.fillStyle = `rgba(0,0,0,${seg(lt, CREDITS_DUR - 1.8, CREDITS_DUR - 0.2)})`; ctx.fillRect(0, 0, W, H); }
}
const FILM5 = { dur: 72 + CREDITS_DUR, sh: [
    { a: 0, b: 5.6, f: (c, t) => chapterCard(c, t, 'épilogue', 'Joyeux Noël', 'où tout le royaume fait la fête') },
    { a: 5, b: 19.4, f: (c, t) => n_golem(c, t, t - 5) },
    { a: 19, b: 31.4, f: (c, t) => n_map(c, t, t - 19) },
    { a: 31, b: 58.4, f: (c, t) => n_party(c, t, t - 31) },
    { a: 58, b: 72.4, f: (c, t) => n_title(c, t, t - 58) },
    { a: 72, b: 72 + CREDITS_DUR + 0.1, f: (c, t) => n_credits(c, t, t - 72) }
] };
EP_FILMS[5] = FILM5;
