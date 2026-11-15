import { DISPLAY, BODY, roundRect, text, TAU } from '../games/draw';

// Écran de fin commun aux jeux de décembre : score en grand, détail ligne par ligne, mention,
// record, « score officiel » (premier essai du jour) et petit code de vérification.
// Le compteur monte en 1,2 s ; t = temps écoulé depuis l'apparition de l'écran.
// Renvoie les boutons dessinés ({ id, x, y, w, h }) pour que le jeu teste les clics.

export function gradeFor(score, thresholds) {
    // thresholds : { S, A, B } (en dessous de B : C)
    if (score >= thresholds.S) return 'S';
    if (score >= thresholds.A) return 'A';
    if (score >= thresholds.B) return 'B';
    return 'C';
}

const GRADE_COLORS = { S: '#ffd23f', A: '#7be0a3', B: '#7fc8ff', C: '#c9d4e6' };

function star(ctx, x, y, r, fill) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const rr = i % 2 ? r * 0.45 : r;
        ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
}

export function drawButton(ctx, b, hover = false) {
    const primary = b.primary;
    roundRect(ctx, b.x, b.y + 3, b.w, b.h, b.h / 2);
    ctx.fillStyle = primary ? '#c98a12' : '#9aa6c4';
    ctx.fill();
    roundRect(ctx, b.x, b.y + (hover ? 1 : 0), b.w, b.h, b.h / 2);
    ctx.fillStyle = primary ? '#ffd36e' : '#ffffff';
    ctx.fill();
    text(ctx, b.label, b.x + b.w / 2, b.y + b.h / 2 + 6 + (hover ? 1 : 0), { size: 17, weight: 800, font: DISPLAY, color: '#2a1d05', align: 'center' });
}

export function hitButton(buttons, x, y) {
    return (buttons || []).find((b) => x >= b.x && x <= b.x + b.w && y >= b.y - 2 && y <= b.y + b.h + 4) || null;
}

// opts : { title, subtitle, score, rows: [[label, value]], grade, stars (0-3), best, isRecord,
//          official: { score, isFirst }, code, buttons: [{ id, label, primary }], shard }
export function drawResults(ctx, W, H, opts, t, hoverId = null) {
    const k = Math.min(1, t / 0.35);
    ctx.fillStyle = `rgba(6, 10, 26, ${0.62 * k})`;
    ctx.fillRect(0, 0, W, H);

    const pw = 460;
    const ph = 300 + opts.rows.length * 24;
    const px = (W - pw) / 2;
    const py = (H - ph) / 2 + (1 - k) * 30;
    ctx.globalAlpha = k;
    roundRect(ctx, px, py, pw, ph, 24);
    ctx.fillStyle = '#121a36';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.lineWidth = 1;
    ctx.stroke();

    text(ctx, opts.title, W / 2, py + 44, { size: 28, weight: 800, font: DISPLAY, align: 'center' });
    if (opts.subtitle) text(ctx, opts.subtitle, W / 2, py + 68, { size: 14, weight: 600, color: 'rgba(255,255,255,0.7)', align: 'center' });

    let y = py + 84;
    if (opts.stars != null) {
        for (let i = 0; i < 3; i++) {
            const pop = Math.min(1, Math.max(0, (t - 0.4 - i * 0.18) / 0.25));
            const r = 15 * (pop < 1 ? 0.6 + pop * 0.5 : 1);
            star(ctx, W / 2 - 40 + i * 40, y + 12, r, i < opts.stars && pop > 0 ? '#ffd23f' : 'rgba(255,255,255,0.18)');
        }
        y += 36;
    }

    // Détail
    ctx.font = `600 15px ${BODY}`;
    opts.rows.forEach(([label, value], i) => {
        const ry = y + 18 + i * 24;
        const show = t > 0.3 + i * 0.08;
        if (!show) return;
        text(ctx, label, px + 36, ry, { size: 15, weight: 500, color: 'rgba(255,255,255,0.78)' });
        text(ctx, String(value), px + pw - 36, ry, { size: 15, weight: 700, color: '#ffd36e', align: 'right' });
    });
    y += 18 + opts.rows.length * 24 + 10;

    // Score qui monte
    const c = Math.min(1, Math.max(0, (t - 0.5) / 1.2));
    const shown = Math.round(opts.score * (1 - Math.pow(1 - c, 3)));
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath();
    ctx.moveTo(px + 30, y - 8);
    ctx.lineTo(px + pw - 30, y - 8);
    ctx.stroke();
    text(ctx, 'Score', px + 36, y + 30, { size: 16, weight: 700, color: 'rgba(255,255,255,0.85)' });
    text(ctx, shown.toLocaleString('fr-FR'), px + pw - 96, y + 36, { size: 40, weight: 800, font: DISPLAY, align: 'right' });
    if (opts.grade && c >= 1) {
        const gx = px + pw - 58;
        const gy = y + 22;
        ctx.beginPath();
        ctx.arc(gx, gy, 22, 0, TAU);
        ctx.fillStyle = GRADE_COLORS[opts.grade];
        ctx.fill();
        text(ctx, opts.grade, gx, gy + 9, { size: 26, weight: 800, font: DISPLAY, color: '#15122a', align: 'center' });
    }
    y += 56;

    // Record, score officiel, code
    let info = '';
    if (opts.isRecord) info = 'Nouveau record !';
    else if (opts.best != null) info = `Record : ${opts.best.toLocaleString('fr-FR')}`;
    if (opts.official && !opts.official.isFirst) info += `${info ? '  ·  ' : ''}Score officiel du jour : ${opts.official.score.toLocaleString('fr-FR')}`;
    if (info) text(ctx, info, W / 2, y + 4, { size: 14, weight: 700, color: opts.isRecord ? '#7be0a3' : 'rgba(255,255,255,0.75)', align: 'center' });
    if (opts.code) text(ctx, `Code de vérification : ${opts.code}`, W / 2, y + 24, { size: 12, weight: 600, color: 'rgba(255,255,255,0.5)', align: 'center' });
    y += 40;

    const buttons = [];
    const bs = opts.buttons || [];
    const bw = 150;
    const gap = 16;
    const total = bs.length * bw + (bs.length - 1) * gap;
    bs.forEach((b, i) => {
        const btn = { ...b, x: W / 2 - total / 2 + i * (bw + gap), y: py + ph - 58, w: bw, h: 40 };
        drawButton(ctx, btn, hoverId === b.id);
        buttons.push(btn);
    });
    ctx.globalAlpha = 1;
    return buttons;
}
