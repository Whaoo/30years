// Moteur de « L'Envers » : la cave à la lampe torche.
// Tout se dessine dans un seul canvas plein écran : chute d'introduction, exploration, puis fin (message, citrouille qui gèle, remontée).
// Les décors sont des SVG dessinés une seule fois dans des canvas hors écran (voir art/, générés à partir des maquettes).
import level from './art/level-top.json';
import caveUrl from './art/cave-top.svg';
import minimapUrl from './art/minimap-top.svg';
import fallOpenUrl from './art/fall-open.svg';
import fallClosedUrl from './art/fall-closed.svg';
import messageUrl from './art/message.svg';
import warmUrl from './art/pumpkin-warm.svg';
import frozenUrl from './art/pumpkin-frozen.svg';
import micUrl from './art/mic.svg';
import ice0 from './art/ice-0.svg';
import ice1 from './art/ice-1.svg';
import ice2 from './art/ice-2.svg';
import ice3 from './art/ice-3.svg';
import { drawPenguin, DISPLAY, BODY, clamp, rand, TAU } from '../games/draw';

export const LEVEL = level;
export const LETTER_COUNT = level.letters.length;
export const WORDS = ['TRICK', 'OR', 'TREE'];

const CELL = 64;
const GW = Math.ceil(level.w / CELL);
const GH = Math.ceil(level.h / CELL);
const BEAM_L = 520;
const BEAM_HALF = 0.4;
const PENGUIN_H = 56;
const SPEED = 280;
const GOAL = 0.85; // part de la cave à éclairer (réglée pour une partie d'environ 2 minutes)

// Où l'on peut marcher : les 4 salles et les couloirs (grille de 16 px)
const WS = 16;
const WW = Math.ceil(level.w / WS);
const WH = Math.ceil(level.h / WS);
const walk = new Uint8Array(WW * WH);
for (const [x0, y0, x1, y1] of [...level.rooms, ...level.corridors]) {
    for (let gy = Math.floor(y0 / WS); gy < Math.ceil(y1 / WS); gy++) {
        for (let gx = Math.floor(x0 / WS); gx < Math.ceil(x1 / WS); gx++) walk[gy * WW + gx] = 1;
    }
}
function isWalk(x, y) {
    const gx = Math.floor(x / WS);
    const gy = Math.floor(y / WS);
    return gx >= 0 && gy >= 0 && gx < WW && gy < WH && walk[gy * WW + gx] === 1;
}
function setRect([x0, y0, x1, y1], v) {
    for (let gy = Math.floor(y0 / WS); gy < Math.ceil(y1 / WS); gy++) {
        for (let gx = Math.floor(x0 / WS); gx < Math.ceil(x1 / WS); gx++) walk[gy * WW + gx] = v;
    }
}
// La lumière s'arrête aux murs, mais éclaire la face visible du mur du fond
const isLightable = (x, y) => isWalk(x, y) || isWalk(x, y + level.face);
function visible(x0, y0, x1, y1) {
    const d = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.ceil(d / 20);
    for (let i = 1; i < n; i++) {
        if (!isLightable(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n)) return false;
    }
    return true;
}

// ------------------------------------------------------------------ images
function loadImage(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.decoding = 'async';
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
    });
}

// Rasterise une image SVG une fois pour toutes (les filtres SVG coûtent cher : on ne les calcule qu'ici)
function raster(img, w, h, scale = 1) {
    const c = document.createElement('canvas');
    c.width = Math.round(w * scale);
    c.height = Math.round(h * scale);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c;
}

export function loadIntroArt() {
    return Promise.all([loadImage(fallOpenUrl), loadImage(fallClosedUrl)]).then(([open, closed]) => ({
        open: raster(open, 1280, 720),
        closed: raster(closed, 1280, 720)
    }));
}

export function loadCaveArt(scale) {
    return Promise.all([loadImage(caveUrl), loadImage(minimapUrl), ...[ice0, ice1, ice2, ice3].map(loadImage)]).then(([cave, mini, ...ice]) => ({
        cave: raster(cave, level.w, level.h, scale),
        caveScale: scale,
        mini,
        ice
    }));
}

const SHOUT_FONT = DISPLAY; // la police du site et des jeux du pingouin

export function loadEndArt() {
    const font = document.fonts?.load ? document.fonts.load('800 96px "Bricolage Grotesque"').catch(() => null) : Promise.resolve();
    return Promise.all([loadImage(messageUrl), loadImage(warmUrl), loadImage(frozenUrl), loadImage(micUrl), font]).then(([message, warm, frozen, mic]) => ({
        message: raster(message, 1280, 720),
        warm: raster(warm, 1280, 720),
        frozen: raster(frozen, 1280, 720),
        mic: raster(mic, 300, 640, 2)
    }));
}

// ------------------------------------------------------------------ outils
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const easeIn = (t) => t * t;
const angDiff = (a, b) => ((a - b + Math.PI * 3) % TAU) - Math.PI;

function seeded(seed) {
    let s = seed % 2147483647;
    if (s <= 0) s += 2147483646;
    return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

// Morceau de parchemin déchiré avec une lettre (et un point rouge pour une première lettre)
export function scrapPath(w, h, seed) {
    const r = seeded(seed * 97 + 13);
    const pts = [];
    const n = 5;
    const j = () => (r() - 0.5) * 5;
    for (let i = 0; i < n; i++) pts.push([-w / 2 + (w * i) / n, -h / 2 + j()]);
    for (let i = 0; i < n; i++) pts.push([w / 2 + j(), -h / 2 + (h * i) / n]);
    for (let i = 0; i < n; i++) pts.push([w / 2 - (w * i) / n, h / 2 + j()]);
    for (let i = 0; i < n; i++) pts.push([-w / 2 + j(), h / 2 - (h * i) / n]);
    return pts;
}

function drawScrap(ctx, x, y, w, h, ch, dot, rot, seed) {
    const pts = scrapPath(w, h, seed);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    const path = new Path2D();
    pts.forEach(([a, b], i) => (i ? path.lineTo(a, b) : path.moveTo(a, b)));
    path.closePath();
    ctx.save();
    ctx.translate(1.5, 3);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fill(path);
    ctx.restore();
    ctx.fillStyle = '#f1e3c2';
    ctx.fill(path);
    ctx.strokeStyle = '#b99a66';
    ctx.lineWidth = 1;
    ctx.stroke(path);
    ctx.fillStyle = '#5a3d22';
    ctx.font = `800 ${Math.round(h * 0.62)}px ${DISPLAY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ch, 0, h * 0.06);
    if (dot) {
        ctx.beginPath();
        ctx.arc(-w / 2 + 6, -h / 2 + 6, Math.max(3, w * 0.12), 0, TAU);
        ctx.fillStyle = '#d7263d';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.2;
        ctx.stroke();
    }
    ctx.restore();
}

function bubble(ctx, x, y, str, size = 22) {
    ctx.save();
    ctx.font = `800 ${size}px ${DISPLAY}`;
    const w = ctx.measureText(str).width + size * 1.4;
    const h = size * 1.7;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.roundRect(x - w / 2, y - h / 2, w, h, h / 2);
    ctx.fill();
    ctx.fillStyle = '#14172b';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(str, x, y + 1);
    ctx.restore();
}

// Dessine une image 1280x720 en « cover » sur tout l'écran ; renvoie la transformation pour y placer des éléments
function bubbleW(ctx, x, y, str) {
    ctx.save();
    ctx.font = `700 14px ${BODY}`;
    const w = ctx.measureText(str).width + 22;
    ctx.fillStyle = 'rgba(255,211,110,0.95)';
    ctx.beginPath();
    ctx.roundRect(x - w / 2, y - 14, w, 28, 14);
    ctx.fill();
    ctx.fillStyle = '#14172b';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(str, x, y + 1);
    ctx.restore();
}

function cover(ctx, img, vw, vh, zoom = 1, alpha = 1, dx = 0, dy = 0) {
    const s = Math.max(vw / 1280, vh / 720) * zoom;
    const ox = (vw - 1280 * s) / 2 + dx;
    const oy = (vh - 720 * s) / 2 + dy;
    if (img) {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.drawImage(img, ox, oy, 1280 * s, 720 * s);
        ctx.restore();
    }
    return { s, ox, oy, map: (x, y) => [ox + x * s, oy + y * s] };
}

// ------------------------------------------------------------------ moteur
export function createEngine({ canvas, miniCanvas, progress, touch, cb }) {
    level.doors.forEach((d) => setRect(d.rect, 1)); // grille propre avant de compter les zones à éclairer
    const ctx = canvas.getContext('2d');
    const light = document.createElement('canvas');
    const lctx = light.getContext('2d');
    const mem = document.createElement('canvas'); // cases déjà éclairées (1 pixel = 1 case)
    mem.width = GW;
    mem.height = GH;
    const mctx = mem.getContext('2d');
    const fog = document.createElement('canvas'); // brouillard de la mini-carte
    fog.width = GW;
    fog.height = GH;
    const fctx = fog.getContext('2d');

    let vw = 1280;
    let vh = 720;
    let dpr = 1;
    let scale = 1;
    let viewW = 1280;
    let viewH = 720;

    const art = { intro: null, cave: null, end: null };
    const explorable = new Uint8Array(GW * GH);
    const explored = new Uint8Array(GW * GH);
    let explorableCount = 0;
    for (let gy = 0; gy < GH; gy++) {
        for (let gx = 0; gx < GW; gx++) {
            if (isWalk(gx * CELL + CELL / 2, gy * CELL + CELL / 2)) {
                explorable[gy * GW + gx] = 1;
                explorableCount += 1;
            }
        }
    }
    let exploredCount = 0;

    const letters = level.letters.map((l, i) => ({ ...l, i, found: false, rot: ((i * 37) % 13 - 6) * 0.03 }));
    const foundOrder = [];
    let elapsed = 0;
    if (progress) {
        progress.found.forEach((i) => {
            if (letters[i] && !letters[i].found) {
                letters[i].found = true;
                foundOrder.push(i);
            }
        });
        for (let k = 0; k < Math.min(progress.explored.length, explored.length); k++) {
            if (progress.explored[k] === '1' && explorable[k]) {
                explored[k] = 1;
                exploredCount += 1;
            }
        }
        elapsed = progress.elapsed || 0;
    }

    // portes (glace / toile), objets (bougie, ciseaux), piles, cachettes, fantômes
    const doors = level.doors.map((d) => ({ ...d, open: false, anim: 0 }));
    const items = level.items.map((it) => ({ ...it, taken: false }));
    const batteries = level.batteries.map(([x, y]) => ({ x, y, taken: false }));
    const spots = level.search.map((sp, i) => ({ ...sp, i, searched: false, anim: 0 }));
    const ghosts = level.ghosts.map(([x, y], i) => ({ x, y, hx: x, hy: y, vx: 0, vy: 0, cd: 2 + i, ph: i * 2.1, lit: 0, turn: 0 }));
    let battery = 100;
    let msgCd = 0;
    let searching = null;
    letters.forEach((l) => (l.hidden = !!level.letters[l.i].hidden));
    if (progress) {
        (progress.doors || []).forEach((id) => {
            const d = doors.find((x) => x.id === id);
            if (d) d.open = true;
        });
        (progress.items || []).forEach((k) => {
            const it = items.find((x) => x.kind === k);
            if (it) it.taken = true;
        });
        (progress.batteries || []).forEach((i) => batteries[i] && (batteries[i].taken = true));
        (progress.searched || []).forEach((i) => {
            if (!spots[i]) return;
            spots[i].searched = true;
            if (spots[i].letter !== null) letters[spots[i].letter].hidden = false;
        });
        Object.entries(progress.moved || {}).forEach(([i, [x, y]]) => {
            if (letters[i]) Object.assign(letters[i], { x, y, hidden: false });
        });
        if (typeof progress.battery === 'number') battery = progress.battery;
    }
    doors.forEach((d) => setRect(d.rect, d.open ? 1 : 0));
    const hasItem = (k) => items.some((it) => it.kind === k && it.taken);
    const lampK = () => (battery > 30 ? 1 : battery > 0 ? 0.35 + 0.65 * (battery / 30) : 0.22 + 0.12 * Math.sin(performance.now() / 90));
    const BL = () => BEAM_L * (0.55 + 0.45 * lampK());
    function say(text) {
        cb.onHint?.(text);
    }

    const p = {
        x: level.spawn.x,
        y: level.spawn.y,
        vx: 0,
        vy: 0,
        facing: 1,
        aim: 0.25,
        walkT: 0,
        lampOn: false,
        mood: 'normal'
    };
    const joy = { active: false, dx: 0, dy: 0, x0: 0, y0: 0 };
    const cam = { x: 0, y: 0 };
    const keys = { left: false, right: false, up: false, down: false };
    const mouse = { x: 0, y: 0, active: 0 };
    const bats = [0, 1, 2, 3].map((i) => ({ x: 300 + i * 550, y: 0, by: [300, 1100, 520, 1250][i], ph: i * 1.7, vx: (i % 2 ? -1 : 1) * 70, flee: 0 }));
    const sporesList = Array.from({ length: 90 }, () => ({ x: rand(0, level.w), y: rand(0, level.h), r: rand(0.8, 2.2), v: rand(6, 16), a: rand(0.15, 0.5) }));
    const dust = Array.from({ length: 46 }, () => ({ x: rand(-300, 300), y: rand(-200, 200), v: rand(-6, 6), a: rand(0.3, 0.9) }));
    const snow = Array.from({ length: 220 }, () => ({ x: rand(0, 1), y: rand(0, 1), r: rand(0.8, 3.2), v: rand(0.04, 0.12), d: rand(0, TAU) }));
    const confetti = Array.from({ length: 90 }, () => ({ x: rand(0, 1), y: rand(-1, 0), w: rand(6, 12), h: rand(10, 18), v: rand(0.12, 0.3), r: rand(0, TAU), vr: rand(-4, 4), c: ['#ffd36e', '#ff8a2a', '#d7263d', '#2f9e6b', '#ffffff', '#9fd8ff'][Math.floor(rand(0, 6))] }));

    let phase = 'intro';
    let t = 0; // temps dans la phase
    let paused = false;
    let raf = 0;
    let last = 0;
    let saveT = 0;
    let hudT = 0;
    let miniT = 0;
    let lastPct = -1;
    let goalShown = false;
    let hintSent = false;
    let shake = 0;
    let darkA = 0.94;
    let quitting = false;
    let finalTime = 0;

    // ---------------------------------------------------------- tailles
    function resize() {
        const r = canvas.getBoundingClientRect();
        vw = Math.max(320, r.width);
        vh = Math.max(240, r.height);
        dpr = Math.min(2, window.devicePixelRatio || 1);
        canvas.width = Math.round(vw * dpr);
        canvas.height = Math.round(vh * dpr);
        // On garde la même échelle de jeu partout : au moins 1280 x 720 unités visibles
        scale = Math.min(vw / 1280, vh / 720);
        // petit écran (téléphone) : on zoome pour que le pingouin reste lisible
        if (Math.min(vw, vh) < 600) scale = Math.max(scale, Math.min(vw, vh) / 560);
        viewW = vw / scale;
        viewH = vh / scale;
        light.width = Math.ceil(viewW / 2);
        light.height = Math.ceil(viewH / 2);
    }

    // ---------------------------------------------------------- lampe
    function pivot() {
        const s = PENGUIN_H / 124;
        return { x: p.x + 27 * s * p.facing, y: p.y - 55 * s };
    }
    function aimAngle() {
        return p.aim;
    }
    function lens() {
        const pv = pivot();
        const a = aimAngle();
        return { x: pv.x + 22 * Math.cos(a), y: pv.y + 22 * Math.sin(a), a };
    }

    // ---------------------------------------------------------- exploration
    function markExplored() {
        const L = lens();
        let added = 0;
        const minX = Math.floor((Math.min(L.x, p.x) - BL()) / CELL);
        const maxX = Math.ceil((Math.max(L.x, p.x) + BL()) / CELL);
        const minY = Math.floor((Math.min(L.y, p.y) - BL()) / CELL);
        const maxY = Math.ceil((Math.max(L.y, p.y) + BL()) / CELL);
        for (let gy = Math.max(0, minY); gy < Math.min(GH, maxY); gy++) {
            for (let gx = Math.max(0, minX); gx < Math.min(GW, maxX); gx++) {
                const k = gy * GW + gx;
                if (!explorable[k] || explored[k]) continue;
                const cx = gx * CELL + CELL / 2;
                const cy = gy * CELL + CELL / 2;
                const dx = cx - L.x;
                const dy = cy - L.y;
                const d = Math.hypot(dx, dy);
                const near = Math.hypot(cx - p.x, cy - (p.y - 30)) < 110;
                const inBeam = p.lampOn && d < BL() * 0.9 && Math.abs(angDiff(Math.atan2(dy, dx), L.a)) < BEAM_HALF + 24 / Math.max(d, 1);
                if ((near || inBeam) && visible(near ? p.x : L.x, near ? p.y - 20 : L.y, cx, cy)) {
                    explored[k] = 1;
                    added += 1;
                    mctx.fillStyle = '#000';
                    mctx.fillRect(gx, gy, 1, 1);
                }
            }
        }
        if (added) {
            exploredCount += added;
            drawFog();
        }
    }

    function redrawMemory() {
        mctx.clearRect(0, 0, GW, GH);
        mctx.fillStyle = '#000';
        for (let k = 0; k < explored.length; k++) if (explored[k]) mctx.fillRect(k % GW, Math.floor(k / GW), 1, 1);
        drawFog();
    }

    function drawFog() {
        fctx.clearRect(0, 0, GW, GH);
        fctx.fillStyle = 'rgba(38,28,18,0.93)';
        for (let k = 0; k < explored.length; k++) if (!explored[k]) fctx.fillRect(k % GW, Math.floor(k / GW), 1, 1);
    }

    const pct = () => exploredCount / explorableCount;

    // ---------------------------------------------------------- déplacement libre (vue de dessus)
    function canStand(x, y) {
        if (!(isWalk(x - 14, y) && isWalk(x + 14, y) && isWalk(x, y - 8) && isWalk(x, y + 2))) return false;
        for (const o of level.solids) if (Math.hypot(x - o.x, (y - o.y) * 1.6) < o.r + 12) return false;
        return true;
    }

    function updatePlay(dt) {
        elapsed += dt;
        let dx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
        let dy = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
        if (joy.active) {
            dx = joy.dx;
            dy = joy.dy;
        }
        const len = Math.hypot(dx, dy);
        const k = len > 1 ? 1 / len : 1;
        p.vx = dx * k * SPEED;
        p.vy = dy * k * SPEED;
        const nx = p.x + p.vx * dt;
        const ny = p.y + p.vy * dt;
        if (canStand(nx, p.y)) p.x = nx;
        if (canStand(p.x, ny)) p.y = ny;
        const moving = len > 0.15;
        if (moving) {
            p.walkT += dt;
            if (Math.abs(p.vx) > 4) p.facing = p.vx > 0 ? 1 : -1;
        }
        // la lampe tourne avec un peu d'inertie, vers la souris ou vers où l'on marche
        let target = null;
        if (mouse.active > 0) {
            const pv = pivot();
            target = Math.atan2(mouse.y - pv.y, mouse.x - pv.x);
        } else if (moving) target = Math.atan2(p.vy, p.vx);
        if (target !== null) {
            const turn = angDiff(target, p.aim);
            const step = Math.min(Math.abs(turn) * Math.min(1, dt * 4), 3.2 * dt); // au plus ~180° par seconde
            p.aim += Math.sign(turn) * step;
        }
        if (mouse.active > 0) {
            mouse.active -= dt;
            p.facing = mouse.x >= p.x ? 1 : -1;
        } else if (!moving) {
            p.facing = Math.cos(p.aim) >= 0 ? 1 : -1;
        }

        updateMechanics(dt);

        // lettres : on les ramasse en passant tout près
        for (const l of letters) {
            if (!l.found && !l.hidden && Math.abs(p.x - l.x) < 38 && Math.abs(p.y - l.y) < 44) {
                l.found = true;
                foundOrder.push(l.i);
                cb.onLetter?.(l);
                hudT = 0;
            }
        }
        markExplored();
        const allLetters = foundOrder.length === LETTER_COUNT;
        if (allLetters && pct() >= GOAL && !goalShown) {
            goalShown = true;
            cb.onGoal?.();
        } else if (allLetters && pct() < GOAL && !hintSent) {
            hintSent = true;
            cb.onHint?.('Toutes les lettres ! Il reste des coins sombres : éclaire 85 % de la cave.');
        } else if (!allLetters && pct() >= GOAL && !hintSent) {
            hintSent = true;
            cb.onHint?.(`Cave éclairée ! Il manque encore ${LETTER_COUNT - foundOrder.length} lettre${LETTER_COUNT - foundOrder.length > 1 ? 's' : ''} : suis les éclats dorés et fouille les ✦.`);
        }

        // caméra
        const tx = clamp(p.x - viewW / 2, 0, Math.max(0, level.w - viewW));
        const ty = clamp(p.y - 30 - viewH / 2, 0, Math.max(0, level.h - viewH));
        cam.x += (tx - cam.x) * Math.min(1, dt * 5);
        cam.y += (ty - cam.y) * Math.min(1, dt * 5);

        saveT += dt;
        if (saveT > 4) {
            saveT = 0;
            cb.onSave?.(snapshot());
        }
    }

    // ---------------------------------------------------------- portes, objets, pile, cachettes, fantômes
    function rectDist([x0, y0, x1, y1], x, y) {
        return Math.hypot(Math.max(x0 - x, 0, x - x1), Math.max(y0 - y, 0, y - y1));
    }
    function lightOn(x, y) {
        const L = lens();
        const d = Math.hypot(x - L.x, y - L.y);
        return p.lampOn && d < BL() && Math.abs(angDiff(Math.atan2(y - L.y, x - L.x), L.a)) < BEAM_HALF && visible(L.x, L.y, x, y);
    }
    function nearSpot() {
        return spots.find((sp) => !sp.searched && Math.hypot(p.x - sp.x, p.y - sp.y) < 80) || null;
    }
    function search() {
        const sp = nearSpot();
        if (!sp || searching) return;
        searching = { sp, t: 0 };
    }
    function updateMechanics(dt) {
        msgCd = Math.max(0, msgCd - dt);
        // la pile s'use : environ 1 min 40 de lumière pleine
        battery = Math.max(0, battery - dt * 1.0);
        for (const b of batteries) {
            if (!b.taken && Math.hypot(p.x - b.x, p.y - b.y) < 40) {
                b.taken = true;
                battery = Math.min(100, battery + 55);
                say('Une pile neuve : la lampe repart de plus belle !');
            }
        }
        for (const it of items) {
            if (!it.taken && Math.hypot(p.x - it.x, p.y - it.y) < 40) {
                it.taken = true;
                say(it.kind === 'candle' ? 'Une bougie allumée : de quoi faire fondre de la glace…' : 'Des ciseaux : parfait pour une grosse toile d’araignée !');
            }
        }
        for (const d of doors) {
            if (d.open) continue;
            if (d.anim > 0) {
                d.anim += dt / 0.9;
                if (d.anim >= 1) {
                    d.open = true;
                    setRect(d.rect, 1);
                }
                continue;
            }
            if (rectDist(d.rect, p.x, p.y) < 46) {
                const need = d.kind === 'ice' ? 'candle' : 'scissors';
                if (hasItem(need)) {
                    d.anim = 0.001;
                    say(d.kind === 'ice' ? 'La bougie fait fondre la glace !' : 'Clac ! La toile est coupée.');
                } else if (msgCd <= 0) {
                    msgCd = 5;
                    say(d.kind === 'ice' ? 'Un mur de glace bloque le passage… il faudrait une flamme.' : 'Une énorme toile d’araignée… impossible de passer sans de quoi couper.');
                }
            }
        }
        if (searching) {
            searching.t += dt;
            if (searching.t > 0.6) {
                const sp = searching.sp;
                sp.searched = true;
                searching = null;
                if (sp.letter !== null) {
                    const l = letters[sp.letter];
                    l.hidden = false;
                    if (!l.found) {
                        l.found = true;
                        foundOrder.push(l.i);
                        cb.onLetter?.(l);
                    }
                    say(`Le ${l.ch} était caché dans ${sp.what} !`);
                } else {
                    say(['Rien ici… à part une vieille chaussette.', 'Rien. Juste de la poussière et une toile.', 'Vide ! Il faudra chercher ailleurs.'][sp.i % 3]);
                }
            }
        }
        updateGhosts(dt);
    }
    function ghostCan(x, y) {
        return isWalk(x, y);
    }
    function updateGhosts(dt) {
        for (const g of ghosts) {
            g.ph += dt;
            g.cd = Math.max(0, g.cd - dt);
            const lit = lightOn(g.x, g.y - 20);
            g.lit = lit ? Math.min(1, g.lit + dt * 4) : Math.max(0, g.lit - dt * 2);
            const dx = p.x - g.x;
            const dy = p.y - 20 - g.y;
            const d = Math.hypot(dx, dy) || 1;
            let sp = 55;
            let ax = Math.cos(g.ph * 0.6 + g.hx);
            let ay = Math.sin(g.ph * 0.5 + g.hy);
            if (lit) {
                sp = 230; // la lumière les fait fuir
                ax = -dx / d;
                ay = -dy / d;
            } else if (g.cd <= 0 && d < 290 && visible(g.x, g.y, p.x, p.y - 20)) {
                sp = 112;
                ax = dx / d;
                ay = dy / d;
            }
            g.vx += (ax * sp - g.vx) * Math.min(1, dt * 3);
            g.vy += (ay * sp - g.vy) * Math.min(1, dt * 3);
            const nx = g.x + g.vx * dt;
            const ny = g.y + g.vy * dt;
            if (ghostCan(nx, g.y)) g.x = nx;
            else g.vx *= -0.5;
            if (ghostCan(g.x, ny)) g.y = ny;
            else g.vy *= -0.5;
            // il te touche dans le noir : il vole la dernière lettre et la cache ailleurs
            if (!lit && g.cd <= 0 && d < 36) {
                g.cd = 10;
                const last = foundOrder.pop();
                if (last !== undefined) {
                    const l = letters[last];
                    const taken = (hx, hy) => letters.some((o) => !o.found && Math.hypot(o.x - hx, o.y - hy) < 60);
                    const far = level.hide.filter(([hx, hy]) => Math.hypot(hx - p.x, hy - p.y) > 500 && isWalk(hx, hy) && !taken(hx, hy));
                    const [hx, hy] = far.length ? far[Math.floor(Math.random() * far.length)] : level.hide[0];
                    Object.assign(l, { found: false, hidden: false, x: hx, y: hy, moved: true });
                    cb.onLetter?.(l);
                    say(`Bouh ! Un fantôme t’a pris le ${l.ch} et l’a caché ailleurs. Garde-les dans la lumière !`);
                } else {
                    say('Bouh ! Un fantôme… Éclaire-le pour le faire fuir.');
                }
                shake = 6;
                const far = level.hide.filter(([hx, hy]) => Math.hypot(hx - p.x, hy - p.y) > 700);
                const [tx, ty] = far.length ? far[Math.floor(Math.random() * far.length)] : [g.hx, g.hy];
                g.x = tx;
                g.y = ty;
            }
        }
    }

    function drawDoor(d) {
        const [x0, y0, x1, y1] = d.rect;
        const k = 1 - Math.min(1, d.anim);
        if (d.open) return;
        ctx.save();
        if (d.kind === 'ice') {
            const h = (y1 - y0) * k;
            const g = ctx.createLinearGradient(x0, y0, x1, y1);
            g.addColorStop(0, 'rgba(230,246,255,0.92)');
            g.addColorStop(0.5, 'rgba(160,210,245,0.85)');
            g.addColorStop(1, 'rgba(110,170,230,0.9)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.roundRect(x0 - 4, y1 - h - 30 * k, x1 - x0 + 8, h + 30 * k, 8);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.8)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x0 + 8, y1 - h - 22 * k);
            ctx.lineTo(x0 + 20, y1 - 8);
            ctx.moveTo(x1 - 14, y1 - h - 18 * k);
            ctx.lineTo(x1 - 26, y1 - h * 0.4);
            ctx.stroke();
            if (d.anim > 0) {
                ctx.fillStyle = 'rgba(160,210,245,0.5)';
                ctx.beginPath();
                ctx.ellipse((x0 + x1) / 2, y1, (x1 - x0) * 0.7, 10, 0, 0, TAU);
                ctx.fill();
            }
        } else {
            ctx.globalAlpha = k;
            ctx.strokeStyle = 'rgba(235,240,248,0.85)';
            ctx.lineWidth = 1.4;
            const cx = (x0 + x1) / 2;
            const cy = (y0 + y1) / 2 - 20;
            const R = Math.max(x1 - x0, y1 - y0) * 0.75;
            ctx.beginPath();
            for (let i = 0; i < 12; i++) {
                const a = (i / 12) * TAU;
                ctx.moveTo(cx, cy);
                ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R * 0.8);
            }
            for (let r = 12; r < R; r += 12) {
                for (let i = 0; i < 12; i++) {
                    const a0 = (i / 12) * TAU;
                    const a1 = ((i + 1) / 12) * TAU;
                    ctx.moveTo(cx + Math.cos(a0) * r, cy + Math.sin(a0) * r * 0.8);
                    ctx.quadraticCurveTo(cx + Math.cos((a0 + a1) / 2) * r * 0.85, cy + Math.sin((a0 + a1) / 2) * r * 0.68, cx + Math.cos(a1) * r, cy + Math.sin(a1) * r * 0.8);
                }
            }
            ctx.stroke();
            ctx.fillStyle = '#15161c';
            ctx.beginPath();
            ctx.ellipse(cx + 10, cy + 6, 7, 8, 0, 0, TAU);
            ctx.fill();
        }
        ctx.restore();
    }

    function drawProps() {
        // cachettes : léger frémissement quand on fouille
        // objets et piles au sol
        for (const it of items) {
            if (it.taken) continue;
            ctx.save();
            ctx.translate(it.x, it.y);
            if (it.kind === 'candle') {
                ctx.fillStyle = '#efe4c8';
                ctx.fillRect(-5, -26, 10, 26);
                ctx.fillStyle = '#ffb34d';
                ctx.beginPath();
                ctx.ellipse(0, -34, 4, 8, 0, 0, TAU);
                ctx.fill();
            } else {
                ctx.strokeStyle = '#c9ced8';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(-10, -4);
                ctx.lineTo(12, -22);
                ctx.moveTo(10, -4);
                ctx.lineTo(-12, -22);
                ctx.stroke();
                ctx.strokeStyle = '#d7263d';
                ctx.lineWidth = 3.5;
                ctx.beginPath();
                ctx.arc(-12, -2, 5, 0, TAU);
                ctx.moveTo(17, -2);
                ctx.arc(12, -2, 5, 0, TAU);
                ctx.stroke();
            }
            ctx.restore();
        }
        for (const b of batteries) {
            if (b.taken) continue;
            ctx.fillStyle = '#2b2f3a';
            ctx.fillRect(b.x - 8, b.y - 26, 16, 26);
            ctx.fillStyle = '#7be0a3';
            ctx.fillRect(b.x - 8, b.y - 26, 16, 9);
            ctx.fillStyle = '#c9ced8';
            ctx.fillRect(b.x - 3, b.y - 30, 6, 4);
        }
        for (const d of doors) drawDoor(d);
    }

    function drawGhost(g) {
        const a = 0.3 + 0.6 * g.lit;
        const bob = Math.sin(g.ph * 3) * 5;
        ctx.save();
        ctx.translate(g.x, g.y + bob);
        ctx.scale(g.vx < 0 ? -1 : 1, 1);
        ctx.globalAlpha = a;
        ctx.fillStyle = '#eef3ff';
        ctx.beginPath();
        ctx.moveTo(-20, 0);
        ctx.quadraticCurveTo(-22, -46, 0, -48);
        ctx.quadraticCurveTo(22, -46, 20, 0);
        for (let i = 0; i < 4; i++) ctx.quadraticCurveTo(15 - i * 10, 10 + Math.sin(g.ph * 6 + i) * 3, 10 - i * 10, 0);
        ctx.fill();
        // tête-citrouille
        ctx.globalAlpha = Math.min(1, a + 0.2);
        ctx.fillStyle = '#ff8a2a';
        ctx.beginPath();
        ctx.ellipse(0, -46, 15, 12, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#3f7d3a';
        ctx.fillRect(-2, -61, 4, 6);
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#ffe28a';
        ctx.beginPath();
        ctx.moveTo(-9, -48);
        ctx.lineTo(-4, -53);
        ctx.lineTo(-2, -46);
        ctx.moveTo(9, -48);
        ctx.lineTo(4, -53);
        ctx.lineTo(2, -46);
        ctx.fill();
        ctx.fillRect(-6, -42, 12, 3);
        ctx.restore();
    }

    function updateAmbient(dt) {
        for (const b of bats) {
            b.ph += dt * 3;
            const L = lens();
            const d = Math.hypot(b.x - L.x, b.y - L.y);
            const lit = p.lampOn && d < BL() && Math.abs(angDiff(Math.atan2(b.y - L.y, b.x - L.x), L.a)) < BEAM_HALF;
            b.flee = lit ? 1 : Math.max(0, b.flee - dt);
            b.x += b.vx * (1 + b.flee * 3) * dt;
            if (b.x < 100 || b.x > level.w - 100) b.vx *= -1;
            b.y = b.by + Math.sin(b.ph * 0.5) * 120;
        }
        for (const s of sporesList) {
            s.y -= s.v * dt;
            s.x += Math.sin(s.y / 60) * 4 * dt;
            if (s.y < 0) s.y = level.h;
        }
        for (const d of dust) {
            d.y += d.v * dt;
            d.x += Math.sin(t + d.y) * 3 * dt;
        }
    }

    // ---------------------------------------------------------- dessin de la cave
    function drawCave(lit = 0) {
        const c = art.cave;
        ctx.save();
        ctx.scale(scale, scale);
        ctx.translate(-cam.x + (shake ? rand(-shake, shake) : 0), -cam.y + (shake ? rand(-shake, shake) : 0));
        if (c) ctx.drawImage(c.cave, cam.x * c.caveScale, cam.y * c.caveScale, viewW * c.caveScale, viewH * c.caveScale, cam.x, cam.y, viewW, viewH);
        else {
            ctx.fillStyle = '#0b1220';
            ctx.fillRect(cam.x, cam.y, viewW, viewH);
        }
        // micro pris dans la glace : il fond au fil des lettres
        if (c) {
            const n = foundOrder.length;
            const k = Math.min(3, Math.floor((n / LETTER_COUNT) * 3.999));
            ctx.drawImage(c.ice[k], level.ice.x - 52, level.ice.y - 134, 105, 135);
        }
        drawProps();
        // lettres pas encore ramassées (sauf celles cachées dans un objet)
        for (const l of letters) if (!l.found && !l.hidden) drawScrap(ctx, l.x, l.y - 17, 26, 30, l.ch, l.dot, l.rot, l.i + 1);
        // chauves-souris
        for (const b of bats) {
            const flap = Math.sin(b.ph * 4) * 0.5 + 0.5;
            ctx.save();
            ctx.translate(b.x, b.y);
            ctx.scale(b.vx < 0 ? -1 : 1, 0.6 + flap * 0.5);
            ctx.fillStyle = '#1b1b24';
            ctx.beginPath();
            ctx.moveTo(0, -4);
            ctx.bezierCurveTo(-10, -16, -24, -18, -34, -10);
            ctx.bezierCurveTo(-26, -6, -24, 2, -26, 6);
            ctx.bezierCurveTo(-16, 0, -6, 2, 0, 4);
            ctx.bezierCurveTo(6, 2, 16, 0, 26, 6);
            ctx.bezierCurveTo(24, 2, 26, -6, 34, -10);
            ctx.bezierCurveTo(24, -18, 10, -16, 0, -4);
            ctx.fill();
            ctx.restore();
        }
        drawHero();
        ctx.restore();

        if (lit < 1) drawDarkness(1 - lit);

        // au-dessus du noir : spores froides, éclats des lettres cachées, yeux des chauves-souris
        ctx.save();
        ctx.scale(scale, scale);
        ctx.translate(-cam.x, -cam.y);
        for (const s of sporesList) {
            if (s.x < cam.x - 10 || s.x > cam.x + viewW + 10 || s.y < cam.y - 10 || s.y > cam.y + viewH + 10) continue;
            ctx.globalAlpha = s.a;
            ctx.fillStyle = '#cfdce4';
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, TAU);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        if (p.lampOn && lit < 1) {
            const L = lens();
            for (const d of dust) {
                const x = p.x + d.x + Math.cos(L.a) * 260;
                const y = p.y - 40 + d.y + Math.sin(L.a) * 260;
                const dd = Math.hypot(x - L.x, y - L.y);
                if (dd > BL() * 0.8 || Math.abs(angDiff(Math.atan2(y - L.y, x - L.x), L.a)) > BEAM_HALF * 0.9) continue;
                ctx.globalAlpha = d.a * (1 - dd / BL());
                ctx.fillStyle = '#fff3d0';
                ctx.fillRect(x, y, 1.6, 1.6);
            }
            ctx.globalAlpha = 1;
        }
        const now = performance.now() / 1000;
        for (const sp of spots) {
            if (sp.searched) continue;
            const tw = 0.35 + 0.35 * Math.sin(now * 2 + sp.i * 1.3);
            ctx.fillStyle = `rgba(255,255,255,${tw})`;
            ctx.font = `700 14px ${BODY}`;
            ctx.textAlign = 'center';
            ctx.fillText('✦', sp.x + 18, sp.y - 46);
        }
        for (const b of batteries) {
            if (b.taken) continue;
            const pulse = 0.5 + 0.5 * Math.sin(now * 4 + b.x);
            ctx.strokeStyle = `rgba(123,224,163,${0.4 + 0.5 * pulse})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(b.x, b.y - 14, 10 + pulse * 8, 0, TAU);
            ctx.stroke();
        }
        for (const g of ghosts) drawGhost(g);
        if (phase === 'play') {
            const sp = nearSpot();
            if (sp) {
                const label = searching ? 'Je fouille…' : touch ? 'Touche « Fouiller »' : 'Espace : fouiller';
                bubbleW(ctx, sp.x, sp.y - 74, label);
            }
        }
        for (const l of letters) {
            if (l.found || l.hidden) continue;
            const pulse = 0.5 + 0.5 * Math.sin(now * 3.4 + l.i);
            const g = ctx.createRadialGradient(l.x, l.y - 20, 0, l.x, l.y - 20, 22);
            g.addColorStop(0, `rgba(255,246,207,${0.55 + 0.4 * pulse})`);
            g.addColorStop(0.3, `rgba(255,210,87,${0.35 + 0.3 * pulse})`);
            g.addColorStop(1, 'rgba(255,178,31,0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(l.x, l.y - 20, 22, 0, TAU);
            ctx.fill();
            ctx.strokeStyle = `rgba(255,210,87,${0.8 * (1 - pulse)})`;
            ctx.lineWidth = 1.3;
            ctx.beginPath();
            ctx.arc(l.x, l.y - 20, 6 + pulse * 14, 0, TAU);
            ctx.stroke();
        }
        for (const b of bats) {
            ctx.fillStyle = '#ffd36e';
            ctx.fillRect(b.x - 4, b.y - 5, 2, 2);
            ctx.fillRect(b.x + 2, b.y - 5, 2, 2);
        }
        ctx.restore();
    }

    function drawHero() {
        const bob = Math.hypot(p.vx, p.vy) > 4 ? Math.abs(Math.sin(p.walkT * 12)) * 2.5 : 0;
        const a = aimAngle();
        const pv = pivot();
        // la nageoire suit la lampe
        const local = p.facing > 0 ? a : Math.PI - a;
        const flip = p.lampOn || phase === 'play' ? clamp(local - 0.9, -2.4, 0.8) : 0;
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath();
        ctx.ellipse(p.x, p.y + 2, 20, 6, 0, 0, TAU);
        ctx.fill();
        drawPenguin(ctx, p.x, p.y - bob, PENGUIN_H, { facing: p.facing, flip, mood: p.mood, rotate: Math.hypot(p.vx, p.vy) > 4 ? Math.sin(p.walkT * 12) * 0.05 : 0 });
        if (p.lampOn) {
            ctx.save();
            ctx.translate(pv.x, pv.y - bob);
            ctx.rotate(a);
            ctx.fillStyle = '#59606e';
            ctx.beginPath();
            ctx.roundRect(4, -3.5, 16, 7, 2);
            ctx.fill();
            ctx.fillStyle = '#7b8494';
            ctx.fillRect(18, -5, 5, 10);
            ctx.fillStyle = '#fff3c4';
            ctx.fillRect(22, -4, 2, 8);
            ctx.restore();
        }
    }

    function lightBlob(x, y, r, a = 1) {
        const g = lctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(0,0,0,${a})`);
        g.addColorStop(0.5, `rgba(0,0,0,${a * 0.55})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        lctx.fillStyle = g;
        lctx.beginPath();
        lctx.arc(x, y, r, 0, TAU);
        lctx.fill();
    }

    // Forme du faisceau : des rayons qui s'arrêtent au premier mur
    function beamPath(c, L, half, len) {
        const n = 44;
        c.beginPath();
        c.moveTo(L.x, L.y);
        for (let i = 0; i <= n; i++) {
            const a = L.a - half + (2 * half * i) / n;
            const ca = Math.cos(a);
            const sa = Math.sin(a);
            let d = 0;
            while (d < len) {
                d += 14;
                if (!isLightable(L.x + ca * d, L.y + sa * d)) {
                    d += 10;
                    break;
                }
            }
            c.lineTo(L.x + ca * Math.min(d, len), L.y + sa * Math.min(d, len));
        }
        c.closePath();
    }

    function beam(L, half, len, a) {
        const g = lctx.createRadialGradient(L.x, L.y, 0, L.x, L.y, len);
        g.addColorStop(0, `rgba(0,0,0,${a})`);
        g.addColorStop(0.55, `rgba(0,0,0,${a * 0.92})`);
        g.addColorStop(0.82, `rgba(0,0,0,${a * 0.5})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        lctx.fillStyle = g;
        beamPath(lctx, L, half, len);
        lctx.fill();
    }

    function drawDarkness(amount) {
        const k = 0.5;
        lctx.setTransform(1, 0, 0, 1, 0, 0);
        lctx.globalCompositeOperation = 'source-over';
        lctx.clearRect(0, 0, light.width, light.height);
        lctx.fillStyle = `rgba(3,6,14,${darkA * amount})`;
        lctx.fillRect(0, 0, light.width, light.height);
        lctx.setTransform(k, 0, 0, k, -cam.x * k, -cam.y * k);
        lctx.globalCompositeOperation = 'destination-out';
        // souvenir des zones déjà éclairées : un peu moins noires
        lctx.globalAlpha = 0.2;
        lctx.imageSmoothingEnabled = true;
        lctx.drawImage(mem, 0, 0, GW * CELL, GH * CELL);
        lctx.globalAlpha = 1;
        // petites sources : bougies, chaudron, cheminée, sapin, guirlandes, trou du plafond
        const tw = performance.now() / 1000;
        level.lights.forEach(([x, y, r, a], i) => {
            if (x + r < cam.x || x - r > cam.x + viewW || y + r < cam.y || y - r > cam.y + viewH) return;
            lightBlob(x, y, r * (1 + 0.05 * Math.sin(tw * 5 + i * 1.7)), a);
        });
        lightBlob(level.ice.x, level.ice.y - 50, 70, 0.35 + (foundOrder.length / LETTER_COUNT) * 0.3);
        // le pingouin et sa lampe
        lightBlob(p.x, p.y - 30, 125, 0.85);
        if (p.lampOn) {
            const L = lens();
            const flick = 1 - 0.015 * Math.sin(tw * 13) * Math.sin(tw * 5);
            const lk = 0.4 + 0.6 * lampK();
            beam(L, BEAM_HALF * 1.45, BL() * 0.8, 0.28 * flick * lk);
            beam(L, BEAM_HALF, BL(), 0.78 * flick * lk);
            beam(L, BEAM_HALF * 0.45, BL() * 0.45, 0.5 * lk);
        }
        lctx.globalCompositeOperation = 'source-over';
        ctx.save();
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(light, 0, 0, light.width, light.height, 0, 0, viewW * scale, viewH * scale);
        ctx.restore();
        // lumière chaude du faisceau, ajoutée par-dessus
        if (p.lampOn) {
            const L = lens();
            ctx.save();
            ctx.scale(scale, scale);
            ctx.translate(-cam.x, -cam.y);
            ctx.globalCompositeOperation = 'lighter';
            const g = ctx.createRadialGradient(L.x, L.y, 0, L.x, L.y, BL());
            g.addColorStop(0, 'rgba(255,226,160,0.11)');
            g.addColorStop(0.3, 'rgba(255,214,140,0.04)');
            g.addColorStop(1, 'rgba(255,214,140,0)');
            ctx.fillStyle = g;
            beamPath(ctx, L, BEAM_HALF, BL());
            ctx.fill();
            ctx.restore();
        }
    }

    // ---------------------------------------------------------- mini-carte
    function drawMini() {
        if (!miniCanvas || !art.cave) return;
        const mw = level.minimap.w;
        const mh = level.minimap.h;
        const md = Math.min(2, window.devicePixelRatio || 1);
        const cw = miniCanvas.clientWidth || mw;
        const ch = miniCanvas.clientHeight || mh;
        if (miniCanvas.width !== Math.round(cw * md)) {
            miniCanvas.width = Math.round(cw * md);
            miniCanvas.height = Math.round(ch * md);
        }
        const m = miniCanvas.getContext('2d');
        const k = (cw / mw) * md;
        m.setTransform(k, 0, 0, k, 0, 0);
        m.clearRect(0, 0, mw, mh);
        m.drawImage(art.cave.mini, 0, 0, mw, mh);
        m.imageSmoothingEnabled = true;
        m.drawImage(fog, 0, 0, GW, GH, 0, 0, (GW * CELL * mw) / level.w, (GH * CELL * mh) / level.h);
        const sx = mw / level.w;
        const sy = mh / level.h;
        // point de départ : la corde sous le trou
        m.strokeStyle = '#8a6234';
        m.lineWidth = 1.4;
        m.beginPath();
        m.arc(level.hole.x * sx, level.hole.y * sy, 3, 0, TAU);
        m.stroke();
        // lettres trouvées
        m.fillStyle = '#d7263d';
        for (const l of letters) {
            if (!l.found) continue;
            m.beginPath();
            m.arc(l.x * sx, (l.y - 16) * sy, 2.4, 0, TAU);
            m.fill();
        }
        // cadre de l'écran
        m.setLineDash([3, 2]);
        m.strokeStyle = 'rgba(255,255,255,0.85)';
        m.lineWidth = 1;
        m.strokeRect(cam.x * sx, cam.y * sy, viewW * sx, viewH * sy);
        m.setLineDash([]);
        // pingouin
        m.fillStyle = '#3b82f6';
        m.strokeStyle = '#fff';
        m.lineWidth = 1.4;
        m.beginPath();
        m.arc(p.x * sx, (p.y - 20) * sy, 3.6, 0, TAU);
        m.fill();
        m.stroke();
    }

    // ---------------------------------------------------------- introduction : la chute
    const ITEMS = [
        { kind: 'cane', x: 0.18, ph: 0 },
        { kind: 'ball', x: 0.8, ph: 0.3 },
        { kind: 'leaf', x: 0.72, ph: 0.65 },
        { kind: 'flake', x: 0.24, ph: 0.85 }
    ];
    function drawItem(kind, x, y, s, rot) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        ctx.scale(s, s);
        if (kind === 'cane') {
            ctx.lineCap = 'round';
            ctx.lineWidth = 9;
            ctx.strokeStyle = '#fff';
            ctx.beginPath();
            ctx.moveTo(-6, 30);
            ctx.lineTo(-6, -10);
            ctx.arc(4, -10, 10, Math.PI, 0);
            ctx.stroke();
            ctx.strokeStyle = '#d7263d';
            ctx.setLineDash([6, 7]);
            ctx.stroke();
        } else if (kind === 'ball') {
            ctx.fillStyle = '#d7263d';
            ctx.beginPath();
            ctx.arc(0, 0, 16, 0, TAU);
            ctx.fill();
            ctx.fillStyle = '#ffd36e';
            ctx.fillRect(-5, -22, 10, 7);
            ctx.fillStyle = 'rgba(255,255,255,0.6)';
            ctx.beginPath();
            ctx.arc(-6, -6, 4, 0, TAU);
            ctx.fill();
        } else if (kind === 'leaf') {
            ctx.fillStyle = '#ff8a2a';
            ctx.beginPath();
            ctx.moveTo(0, -20);
            ctx.quadraticCurveTo(18, -6, 0, 20);
            ctx.quadraticCurveTo(-18, -6, 0, -20);
            ctx.fill();
        } else {
            ctx.strokeStyle = '#cfe8ff';
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            for (let i = 0; i < 3; i++) {
                ctx.rotate(Math.PI / 3);
                ctx.beginPath();
                ctx.moveTo(0, -16);
                ctx.lineTo(0, 16);
                ctx.stroke();
            }
        }
        ctx.restore();
    }

    const INTRO_LAND = 3.85;
    const INTRO_END = 4.9;

    function drawIntro() {
        ctx.save();
        ctx.scale(dpr, dpr);
        if (t < 1.0) {
            // la crevasse s'ouvre dans la page, le pingouin tombe dedans
            ctx.clearRect(0, 0, vw, vh);
            const k = ease(Math.min(1, t / 0.6));
            const cx = vw / 2;
            const cy = vh * 0.84;
            const rw = vw * 0.34 * k;
            const rh = Math.max(40, vh * 0.07) * k;
            ctx.save();
            ctx.shadowColor = '#ff3b3b';
            ctx.shadowBlur = 60;
            const gl = ctx.createRadialGradient(cx, cy, 0, cx, cy, rw * 1.4);
            gl.addColorStop(0, 'rgba(255,59,59,0.55)');
            gl.addColorStop(1, 'rgba(255,59,59,0)');
            ctx.fillStyle = gl;
            ctx.fillRect(0, 0, vw, vh);
            ctx.fillStyle = '#050608';
            ctx.beginPath();
            for (let i = 0; i <= 24; i++) {
                const a = (i / 24) * TAU;
                const j = 1 + 0.18 * Math.sin(i * 7.3);
                const x = cx + Math.cos(a) * rw * j;
                const y = cy + Math.sin(a) * rh * j;
                if (i) ctx.lineTo(x, y);
                else ctx.moveTo(x, y);
            }
            ctx.closePath();
            ctx.fill();
            ctx.restore();
            const fy = -80 + (cy + 10) * easeIn(Math.min(1, t / 0.85));
            const sz = 90 * (1 - Math.max(0, t - 0.6) * 1.2);
            if (t < 0.9) drawPenguin(ctx, cx, fy, Math.max(10, sz), { mood: 'surprised', rotate: Math.PI + t * 3 });
            ctx.fillStyle = `rgba(0,0,0,${clamp((t - 0.6) / 0.35, 0, 1)})`;
            ctx.fillRect(0, 0, vw, vh);
        } else if (t < 2.15) {
            const closed = t >= 1.85;
            const img = art.intro ? (closed ? art.intro.closed : art.intro.open) : null;
            const z = 1.12 - 0.12 * ease(Math.min(1, (t - 1.0) / 0.4));
            const sh = closed ? (1 - (t - 1.85) / 0.3) * 10 : 0;
            ctx.fillStyle = '#040203';
            ctx.fillRect(0, 0, vw, vh);
            const cv = cover(ctx, img, vw, vh, z, Math.min(1, (t - 1.0) / 0.25), rand(-sh, sh), rand(-sh, sh));
            if (!closed) {
                const k = easeIn(Math.min(1, (t - 1.0) / 0.82));
                const [mx, my] = cv.map(620, 612);
                const x = mx - 260 * cv.s * (1 - k);
                const y = -60 + (my + 60) * k;
                drawPenguin(ctx, x, y, 64 * cv.s * (1 - k * 0.45), { mood: 'surprised', rotate: Math.PI * 0.8 + t * 4 });
            } else {
                const [bx, by] = cv.map(900, 420);
                bubble(ctx, bx, by, 'Glouf !', 34 * cv.s);
            }
        } else if (t < INTRO_LAND || !art.cave) {
            // le tunnel
            ctx.fillStyle = '#0b0705';
            ctx.fillRect(0, 0, vw, vh);
            const cx = vw / 2;
            const cy = vh / 2;
            for (let i = 6; i >= 0; i--) {
                const z = ((i + t * 1.6) % 7) / 7;
                const r = 30 + z * z * Math.max(vw, vh) * 0.9;
                ctx.fillStyle = i % 2 ? '#1f0f06' : '#140a04';
                ctx.beginPath();
                ctx.ellipse(cx, cy, r, r * 0.72, 0, 0, TAU);
                ctx.fill();
            }
            ctx.strokeStyle = 'rgba(255,177,94,0.35)';
            ctx.lineWidth = 2;
            for (let i = 0; i < 14; i++) {
                const x = ((i * 137) % 100) / 100 * vw;
                const y = ((i * 71 + t * 900) % (vh + 200)) - 100;
                ctx.beginPath();
                ctx.moveTo(x, vh - y);
                ctx.lineTo(x, vh - y - 60);
                ctx.stroke();
            }
            const u = Math.max(vw, vh) / 1280;
            ITEMS.forEach((it, i) => {
                const y = vh + 80 - ((t * 0.55 + it.ph) % 1) * (vh + 160);
                drawItem(it.kind, it.x * vw, y, 1.4 * u, t * (i % 2 ? 2 : -2));
            });
            drawPenguin(ctx, cx + Math.sin(t * 3) * 30, cy + 60 * u, 120 * u, { mood: 'surprised', rotate: t * 5 });
            bubble(ctx, cx + 200 * u, cy - 170 * u, 'Aaaah…', 26 * u);
        } else {
            // atterrissage dans la cave
            ctx.restore();
            const lt = t - INTRO_LAND;
            const startY = level.spawn.y - viewH * 0.7;
            p.y = lt < 0.3 ? startY + (level.spawn.y - startY) * easeIn(lt / 0.3) : level.spawn.y;
            p.mood = lt < 0.3 ? 'surprised' : lt < 0.95 ? 'dizzy' : 'normal';
            cam.x = clamp(p.x - viewW / 2, 0, level.w - viewW);
            cam.y = clamp(level.spawn.y - 30 - viewH / 2, 0, level.h - viewH);
            shake = lt > 0.3 && lt < 0.5 ? 6 : 0;
            if (lt > 0.9) p.lampOn = true;
            ctx.save();
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            drawCave(0);
            // la lampe par terre, puis ramassée
            ctx.save();
            ctx.scale(scale, scale);
            ctx.translate(-cam.x, -cam.y);
            if (lt > 0.3 && lt < 0.7) {
                ctx.fillStyle = 'rgba(160,165,180,0.5)';
                for (let i = 0; i < 4; i++) {
                    ctx.beginPath();
                    ctx.arc(p.x - 40 + i * 26, level.spawn.y - 6 - (lt - 0.3) * 30, 9 + (lt - 0.3) * 30, 0, TAU);
                    ctx.fill();
                }
            }
            if (lt > 0.35 && lt < 0.95) {
                ctx.fillStyle = '#ffd36e';
                ctx.font = `700 16px ${BODY}`;
                for (let i = 0; i < 3; i++) {
                    const a = lt * 6 + (i * TAU) / 3;
                    ctx.fillText('✦', p.x + Math.cos(a) * 24 - 6, p.y - 70 + Math.sin(a) * 8);
                }
            }
            if (!p.lampOn) {
                const fx = p.x + 52;
                const fy = level.spawn.y - 5;
                ctx.save();
                ctx.translate(fx, fy);
                ctx.rotate(-0.15);
                ctx.fillStyle = '#59606e';
                ctx.fillRect(-14, -5, 26, 10);
                ctx.fillStyle = '#fff3c4';
                ctx.fillRect(12, -6, 3, 12);
                ctx.restore();
                const g = ctx.createRadialGradient(fx + 14, fy, 0, fx + 14, fy, 26);
                g.addColorStop(0, 'rgba(255,240,190,0.9)');
                g.addColorStop(1, 'rgba(255,240,190,0)');
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.arc(fx + 14, fy, 26, 0, TAU);
                ctx.fill();
            }
            ctx.restore();
            ctx.restore();
            return;
        }
        ctx.restore();
    }

    // ---------------------------------------------------------- fin : message, gel, « It's time », remontée
    const END = { lights: 1.4, message: 3.4, freeze: 3.8, time: 4.8, rope: 2.2 };
    const notes = [];
    let noteT = 0;
    const NOTE_COLORS = ['#ffd36e', '#ff5a5a', '#7be0a3', '#ffffff', '#9fd8ff'];

    function drawNote(x, y, s, kind, color, rot, alpha) {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(x, y);
        ctx.rotate(rot);
        ctx.scale(s, s);
        ctx.fillStyle = color;
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.shadowColor = 'rgba(0,0,0,0.35)';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.ellipse(-6, 10, 8, 6, -0.4, 0, TAU);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(1, 9);
        ctx.lineTo(1, -18);
        if (kind) {
            ctx.ellipse(18, 6, 8, 6, -0.4, 0, TAU);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(25, 5);
            ctx.lineTo(25, -22);
            ctx.lineTo(1, -18);
            ctx.lineWidth = 5;
        } else {
            ctx.quadraticCurveTo(14, -12, 12, 2);
        }
        ctx.stroke();
        ctx.restore();
    }

    function drawShout(dt) {
        const e = art.end;
        ctx.fillStyle = 'rgba(5,10,20,0.14)';
        ctx.fillRect(0, 0, vw, vh);
        // le micro doré monte sur scène, sous un halo de projecteur, et bat la mesure
        const tall = vh > vw;
        const mh = tall ? Math.min(vh * 0.46, vw * 1.05) : Math.min(vh * 0.8, vw * 0.62);
        const mw = mh * (300 / 640);
        const enter = Math.min(1, t / 0.6);
        const rise = enter < 1 ? 1 - (1 - enter) ** 3 + Math.sin(enter * Math.PI) * 0.06 : 1;
        const mx0 = tall ? vw * 0.5 : vw * 0.79;
        const ground = vh + mh * (1 - rise) - vh * 0.02;
        const beat = Math.max(0, Math.sin(t * 8)) ** 6;
        const sway = Math.sin(t * 2.6) * 0.03;
        const halo = ctx.createRadialGradient(mx0, ground - mh * 0.72, 0, mx0, ground - mh * 0.72, mh * 0.62);
        halo.addColorStop(0, `rgba(255,214,120,${0.32 + beat * 0.12})`);
        halo.addColorStop(1, 'rgba(255,214,120,0)');
        ctx.fillStyle = halo;
        ctx.fillRect(mx0 - mh, ground - mh * 1.4, mh * 2, mh * 1.4);
        if (e?.mic) {
            ctx.save();
            ctx.translate(mx0, ground);
            ctx.rotate(sway);
            ctx.scale(1 + beat * 0.025, 1 + beat * 0.025);
            ctx.drawImage(e.mic, -mw / 2, -mh, mw, mh);
            ctx.restore();
        }
        // notes de musique qui s'envolent de la capsule
        const ang = sway;
        const capY = -mh * (565 / 640); // haut de la capsule
        const mxn = mx0 + Math.sin(ang) * -capY;
        const myn = ground + Math.cos(ang) * capY;
        noteT += dt;
        while (noteT > 0.1 && t > 0.45) {
            noteT -= 0.1;
            notes.push({ x: mxn + rand(-mw * 0.2, mw * 0.2), y: myn, vx: rand(-110, 110), vy: rand(-240, -150), s: rand(0.9, 1.6) * (vh / 720), k: Math.random() < 0.4 ? 1 : 0, c: NOTE_COLORS[Math.floor(rand(0, NOTE_COLORS.length))], r: rand(-0.4, 0.4), ph: rand(0, TAU), life: 0 });
        }
        for (let i = notes.length - 1; i >= 0; i--) {
            const n = notes[i];
            n.life += dt;
            n.x += (n.vx + Math.sin(n.life * 4 + n.ph) * 40) * dt;
            n.y += n.vy * dt;
            if (n.life > 2.2) notes.splice(i, 1);
            else drawNote(n.x, n.y, n.s, n.k, n.c, n.r + Math.sin(n.life * 3 + n.ph) * 0.3, Math.min(1, (2.2 - n.life) * 1.5));
        }
        // le texte, lettre par lettre, en vague
        const lines = [
            { str: 'IT’S…', start: 0.25, y: 0.2, size: 0.85 },
            { str: 'TIIIIIMEEEE !', start: 0.75, y: 0.37, size: 1 }
        ];
        const tallT = vh > vw;
        const base = tallT ? Math.min(vw * 0.16, 90) : Math.min(vw * 0.085, vh * 0.16, 120);
        const cx = tallT ? vw * 0.5 : vw * 0.38;
        const shine = ((t * 0.55) % 1.6) - 0.3; // le reflet traverse le mot
        for (const ln of lines) {
            const size = base * ln.size;
            ctx.font = `800 ${Math.round(size)}px ${SHOUT_FONT}`;
            const letters = [...ln.str];
            const widths = letters.map((ch) => ctx.measureText(ch).width * 0.92);
            const total = widths.reduce((a, b) => a + b, 0);
            const fit = Math.min(1, (vw * (tallT ? 0.9 : 0.66)) / total);
            let x = cx - (total * fit) / 2;
            letters.forEach((ch, i) => {
                const lt = t - ln.start - i * 0.055;
                const w = widths[i] * fit;
                if (lt > 0) {
                    const pop = lt < 0.25 ? 1.7 - 0.7 * ease(lt / 0.25) : 1;
                    const wave = Math.sin(t * 7 - i * 0.55) * size * 0.07;
                    const yy = vh * (tallT ? ln.y * 0.62 + 0.04 : ln.y) + wave;
                    ctx.save();
                    ctx.translate(x + w / 2, yy);
                    ctx.rotate(Math.sin(t * 5 + i) * 0.05);
                    ctx.scale(pop * fit, pop * fit);
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.lineJoin = 'round';
                    ctx.font = `800 ${Math.round(size)}px ${SHOUT_FONT}`;
                    // lettrage doré cartoon : relief orange, contour brun, reflet blanc
                    const ox = size * 0.035;
                    const oy = size * 0.075;
                    ctx.lineWidth = size * 0.16;
                    ctx.strokeStyle = '#5b2a0c';
                    ctx.strokeText(ch, ox, oy);
                    ctx.fillStyle = '#5b2a0c';
                    ctx.fillText(ch, ox, oy);
                    ctx.strokeText(ch, 0, 0);
                    ctx.fillStyle = '#c86a12';
                    ctx.fillText(ch, ox * 0.5, oy * 0.5);
                    const g = ctx.createLinearGradient(0, -size * 0.38, 0, size * 0.34);
                    g.addColorStop(0, '#fff3a8');
                    g.addColorStop(0.45, '#ffd23f');
                    g.addColorStop(1, '#f59a1c');
                    ctx.fillStyle = g;
                    ctx.fillText(ch, 0, 0);
                    // reflet : la moitié haute un peu plus claire
                    ctx.save();
                    ctx.beginPath();
                    ctx.rect(-size, -size, size * 2, size * 0.92);
                    ctx.clip();
                    ctx.fillStyle = 'rgba(255,255,235,0.35)';
                    ctx.fillText(ch, 0, 0);
                    ctx.restore();
                    // le reflet qui balaie les lettres
                    const sx = (x + w / 2 - (cx - (total * fit) / 2)) / (total * fit);
                    const d = sx - shine;
                    if (Math.abs(d) < 0.1) {
                        ctx.globalAlpha = (1 - Math.abs(d) / 0.1) * 0.7;
                        ctx.fillStyle = '#fffbe6';
                        ctx.fillText(ch, 0, 0);
                        ctx.globalAlpha = 1;
                    }
                    ctx.restore();
                    // paillettes
                    const tw = Math.sin(t * 6 + i * 2.3 + ln.size * 9);
                    if (tw > 0.75) {
                        const k = (tw - 0.75) / 0.25;
                        const px = x + w * (0.25 + ((i * 37) % 50) / 100);
                        const py = yy - size * (0.15 + ((i * 53) % 30) / 100);
                        sparkle(px, py, size * 0.12 * k);
                    }
                }
                x += w;
            });
        }
    }
    function sparkle(x, y, r) {
        ctx.save();
        ctx.translate(x, y);
        ctx.fillStyle = '#fffbe6';
        ctx.shadowColor = 'rgba(255,220,120,0.9)';
        ctx.shadowBlur = r * 1.5;
        ctx.beginPath();
        ctx.moveTo(0, -r);
        ctx.quadraticCurveTo(0, 0, r, 0);
        ctx.quadraticCurveTo(0, 0, 0, r);
        ctx.quadraticCurveTo(0, 0, -r, 0);
        ctx.quadraticCurveTo(0, 0, 0, -r);
        ctx.fill();
        ctx.restore();
    }
    const ORDER = ['lights', 'message', 'freeze', 'time', 'rope'];

    function drawSnow(dt, alpha = 1) {
        ctx.save();
        ctx.fillStyle = '#fff';
        for (const s of snow) {
            s.y += s.v * dt;
            s.d += dt;
            if (s.y > 1.02) s.y = -0.02;
            ctx.globalAlpha = alpha * (0.4 + s.r / 5);
            ctx.beginPath();
            ctx.arc(s.x * vw + Math.sin(s.d) * 8, s.y * vh, s.r, 0, TAU);
            ctx.fill();
        }
        ctx.restore();
    }

    function drawEnd(dt) {
        ctx.save();
        ctx.scale(dpr, dpr);
        const e = art.end;
        if (phase === 'lights') {
            ctx.restore();
            ctx.save();
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            drawCave(clamp(t / 1.0, 0, 1));
            ctx.restore();
            return;
        }
        ctx.fillStyle = '#05070c';
        ctx.fillRect(0, 0, vw, vh);
        if (phase === 'message') {
            const cv = cover(ctx, e?.message, vw, vh, 1.04 - 0.04 * ease(Math.min(1, t / 1.2)), Math.min(1, t / 0.5));
            // tampon avec le vrai temps
            const [sx, sy] = cv.map(1000, 612);
            ctx.save();
            ctx.globalAlpha = clamp((t - 0.9) / 0.3, 0, 1);
            ctx.translate(sx, sy);
            ctx.rotate(-0.14);
            const z = 1 + Math.max(0, 1 - (t - 0.9) / 0.25) * 0.6;
            ctx.scale(z * cv.s, z * cv.s);
            ctx.strokeStyle = '#c0392b';
            ctx.lineWidth = 3;
            ctx.strokeRect(-96, -24, 192, 48);
            ctx.fillStyle = '#c0392b';
            ctx.font = `800 21px ${DISPLAY}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(formatStamp(finalTime), 0, 2);
            ctx.restore();
        } else if (phase === 'freeze' || phase === 'time') {
            const f = phase === 'time' ? 1 : clamp((t - 0.9) / 2.4, 0, 1);
            cover(ctx, e?.warm, vw, vh, 1, phase === 'freeze' ? Math.min(1, t / 0.5) : 1);
            if (f > 0) cover(ctx, e?.frozen, vw, vh, 1, ease(f));
            drawSnow(dt, phase === 'freeze' ? Math.min(1, t / 0.6) : 1);
            if (phase === 'time') {
                drawShout(dt);
                for (const c of confetti) {
                    c.y += c.v * dt;
                    c.r += c.vr * dt;
                    ctx.save();
                    ctx.translate(c.x * vw, c.y * vh);
                    ctx.rotate(c.r);
                    ctx.fillStyle = c.c;
                    ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
                    ctx.restore();
                }
            }
        } else if (phase === 'rope') {
            drawRopeUp();
        }
        ctx.restore();
    }

    function formatStamp(sec) {
        const m = Math.floor(sec / 60);
        const s = Math.round(sec % 60);
        return m ? `${m} MIN ${String(s).padStart(2, '0')} S` : `${s} S`;
    }

    function drawRopeUp() {
        const d = END.rope;
        const k = clamp(t / d, 0, 1);
        const u = vh / 720;
        ctx.fillStyle = '#07090b';
        ctx.fillRect(0, 0, vw, vh);
        const g = ctx.createLinearGradient(0, 0, 0, vh);
        g.addColorStop(0, 'rgba(255,233,168,0.6)');
        g.addColorStop(1, 'rgba(255,233,168,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(vw / 2 - 90 * u, 0);
        ctx.lineTo(vw / 2 + 90 * u, 0);
        ctx.lineTo(vw / 2 + 190 * u, vh);
        ctx.lineTo(vw / 2 - 190 * u, vh);
        ctx.fill();
        ctx.strokeStyle = '#a8844f';
        ctx.lineWidth = 8 * u;
        ctx.beginPath();
        ctx.moveTo(vw / 2, 0);
        ctx.bezierCurveTo(vw / 2 - 8 * u, vh * 0.3, vw / 2 + 8 * u, vh * 0.6, vw / 2, vh);
        ctx.stroke();
        const y = vh * 0.92 - vh * 1.1 * ease(k);
        drawPenguin(ctx, vw / 2 + 4 * u, y, 120 * u, { mood: quitting ? 'normal' : 'happy', flip: -2.6 });
        ctx.strokeStyle = 'rgba(255,255,255,0.45)';
        ctx.lineWidth = 4 * u;
        ctx.lineCap = 'round';
        for (let i = -1; i <= 1; i++) {
            const x = vw / 2 + i * 50 * u;
            const yy = y + 40 * u + ((t * 600) % 120) * u;
            ctx.beginPath();
            ctx.moveTo(x, yy);
            ctx.lineTo(x, yy + 60 * u);
            ctx.stroke();
        }
        ctx.fillStyle = '#fff';
        ctx.font = `800 ${Math.round(40 * u)}px ${DISPLAY}`;
        ctx.textAlign = 'center';
        ctx.fillText(quitting ? 'Retour à la surface…' : 'Et hop, on remonte !', vw / 2 + 300 * u, vh * 0.5);
        // fondu vers la page d'accueil
        if (k > 0.8) {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.fillStyle = `rgba(0,0,0,${(k - 0.8) / 0.2})`;
            ctx.fillRect(0, 0, vw, vh);
            ctx.globalCompositeOperation = 'source-over';
        }
    }

    function nextEnd() {
        const i = ORDER.indexOf(phase);
        if (i < 0) return;
        if (i === ORDER.length - 1) {
            finish();
            return;
        }
        phase = ORDER[i + 1];
        t = 0;
        cb.onPhase?.(phase);
    }

    function finish() {
        if (phase === 'done') return;
        phase = 'done';
        cb.onPhase?.('done');
        cb.onDone?.(quitting ? 'quit' : 'win', quitting ? snapshot() : { time: finalTime });
    }

    // ---------------------------------------------------------- boucle
    function frame(now) {
        raf = requestAnimationFrame(frame);
        const dt = Math.min(0.05, (now - (last || now)) / 1000);
        last = now;
        if (paused) return;
        t += dt;
        updateAmbient(dt);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        if (phase === 'intro') {
            if (t >= INTRO_END && art.cave) {
                phase = 'play';
                t = 0;
                p.lampOn = true;
                p.mood = 'normal';
                cb.onPhase?.('play');
            }
            if (phase === 'intro') {
                if (t > INTRO_LAND && !art.cave) t = INTRO_LAND - 0.3; // le décor charge encore : on tombe un peu plus longtemps
                if (t < INTRO_LAND) ctx.clearRect(0, 0, canvas.width, canvas.height);
                drawIntro();
                return;
            }
        }
        if (phase === 'play') {
            updatePlay(dt);
            shake = Math.max(0, shake - dt * 30);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            drawCave(0);
            hudT += dt;
            if (hudT > 0.25) {
                hudT = 0;
                cb.onStatus?.({ battery: Math.round(battery), candle: hasItem('candle'), scissors: hasItem('scissors'), near: !!nearSpot() });
                const pc = Math.floor(pct() * 100);
                if (pc !== lastPct) {
                    lastPct = pc;
                    cb.onProgress?.(pc);
                }
            }
            miniT += dt;
            if (miniT > 0.1) {
                miniT = 0;
                drawMini();
            }
            return;
        }
        if (phase === 'puzzle') {
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            drawCave(0);
            return;
        }
        if (ORDER.includes(phase)) {
            if (phase === 'lights' && !art.end) t = Math.min(t, END.lights - 0.01);
            if (t >= END[phase]) nextEnd();
            if (ORDER.includes(phase)) drawEnd(dt);
        }
    }

    function snapshot() {
        let s = '';
        for (let k = 0; k < explored.length; k++) s += explored[k] ? '1' : '0';
        const moved = {};
        letters.forEach((l) => {
            if (l.moved) moved[l.i] = [l.x, l.y];
        });
        return {
            found: foundOrder.slice(),
            explored: s,
            elapsed,
            doors: doors.filter((d) => d.open).map((d) => d.id),
            items: items.filter((it) => it.taken).map((it) => it.kind),
            batteries: batteries.map((b, i) => (b.taken ? i : -1)).filter((i) => i >= 0),
            searched: spots.filter((sp) => sp.searched).map((sp) => sp.i),
            moved,
            battery
        };
    }

    // ---------------------------------------------------------- API
    const api = {
        start() {
            resize();
            redrawMemory();
            raf = requestAnimationFrame(frame);
        },
        destroy() {
            cancelAnimationFrame(raf);
        },
        resize,
        setArt(kind, value) {
            art[kind] = value;
            if (kind === 'cave') drawMini();
        },
        key(code, down) {
            const map = { ArrowLeft: 'left', KeyA: 'left', KeyQ: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'up', KeyW: 'up', KeyZ: 'up', ArrowDown: 'down', KeyS: 'down' };
            if (map[code]) {
                keys[map[code]] = down;
                if (down && phase === 'play') mouse.active = 0;
                return true;
            }
            if (code === 'Space' && down) {
                if (phase === 'intro') api.skip();
                else if (ORDER.includes(phase)) nextEnd();
                else if (phase === 'play') search();
                return true;
            }
            return false;
        },
        releaseKeys() {
            Object.keys(keys).forEach((k) => (keys[k] = false));
        },
        pointerMove(clientX, clientY) {
            if (phase !== 'play') return;
            const r = canvas.getBoundingClientRect();
            mouse.x = (clientX - r.left) / scale + cam.x;
            mouse.y = (clientY - r.top) / scale + cam.y;
            mouse.active = 3;
        },
        click() {
            if (phase === 'intro') api.skip();
            else if (ORDER.includes(phase) && phase !== 'rope') nextEnd();
        },
        skip() {
            if (phase === 'intro' && t < INTRO_LAND) t = INTRO_LAND;
            else if (phase === 'intro') t = INTRO_END;
        },
        setPaused(v) {
            paused = v;
            if (v) api.releaseKeys();
            last = 0;
        },
        // joystick tactile : on pose le doigt n'importe où, on glisse dans la direction voulue
        joyStart(x, y) {
            if (phase !== 'play') return;
            joy.active = true;
            joy.x0 = x;
            joy.y0 = y;
            joy.dx = 0;
            joy.dy = 0;
        },
        joyMove(x, y) {
            if (!joy.active) return;
            const dx = x - joy.x0;
            const dy = y - joy.y0;
            const d = Math.hypot(dx, dy);
            const k = d < 8 ? 0 : Math.min(1, d / 50) / d;
            joy.dx = dx * k;
            joy.dy = dy * k;
        },
        joyEnd() {
            joy.active = false;
            joy.dx = 0;
            joy.dy = 0;
        },
        joyState: () => ({ ...joy }),
        search,
        openPuzzle() {
            phase = 'puzzle';
            t = 0;
            cb.onPhase?.('puzzle');
        },
        startVictory() {
            finalTime = elapsed;
            quitting = false;
            phase = 'lights';
            t = 0;
            cb.onPhase?.('lights');
        },
        ropeUp() {
            quitting = true;
            phase = 'rope';
            t = 0;
            cb.onPhase?.('rope');
        },
        reset() {
            letters.forEach((l) => (l.found = false));
            foundOrder.length = 0;
            explored.fill(0);
            exploredCount = 0;
            elapsed = 0;
            goalShown = false;
            hintSent = false;
            redrawMemory();
            p.x = level.spawn.x;
            p.y = level.spawn.y;
            lastPct = -1;
            battery = 100;
            doors.forEach((d) => {
                d.open = false;
                d.anim = 0;
                setRect(d.rect, 0);
            });
            items.forEach((it) => (it.taken = false));
            batteries.forEach((b) => (b.taken = false));
            spots.forEach((sp) => (sp.searched = false));
            letters.forEach((l) => {
                Object.assign(l, { x: level.letters[l.i].x, y: level.letters[l.i].y, hidden: !!level.letters[l.i].hidden, moved: false });
            });
        },
        state: () => ({ found: foundOrder.map((i) => letters[i]), pct: pct(), elapsed, phase }),
        snapshot,
        touch
    };
    if (__TEST_MODE__) window.envers = { p, letters, api, explored, doors, items, ghosts, setBattery: (v) => (battery = v), openDoors: () => doors.forEach((d) => { d.open = true; setRect(d.rect, 1); }), revealAll: () => { explored.fill(0); for (let k = 0; k < explored.length; k++) if (explorable[k]) explored[k] = 1; exploredCount = explorableCount; redrawMemory(); }, grabAll: () => letters.forEach((l) => { if (!l.found) { l.found = true; foundOrder.push(l.i); cb.onLetter?.(l); } }) };
    return api;
}

/* global __TEST_MODE__ */
