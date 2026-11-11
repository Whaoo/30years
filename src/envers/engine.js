// Moteur de « L'Envers » : la cave à la lampe torche.
// Tout se dessine dans un seul canvas plein écran : chute d'introduction, exploration, puis fin (message, citrouille qui gèle, remontée).
// Les décors sont des SVG dessinés une seule fois dans des canvas hors écran (voir art/, générés à partir des maquettes).
import level from './art/level.json';
import caveUrl from './art/cave.svg';
import minimapUrl from './art/minimap.svg';
import fallOpenUrl from './art/fall-open.svg';
import fallClosedUrl from './art/fall-closed.svg';
import messageUrl from './art/message.svg';
import warmUrl from './art/pumpkin-warm.svg';
import frozenUrl from './art/pumpkin-frozen.svg';
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
const BEAM_L = 640;
const BEAM_HALF = 0.36;
const PENGUIN_H = 60;
const GOAL = 0.9; // part de la cave à éclairer

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

export function loadEndArt() {
    return Promise.all([loadImage(messageUrl), loadImage(warmUrl), loadImage(frozenUrl)]).then(([message, warm, frozen]) => ({
        message: raster(message, 1280, 720),
        warm: raster(warm, 1280, 720),
        frozen: raster(frozen, 1280, 720)
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
            const cy = gy * CELL + CELL / 2;
            if (cy > level.ceil && cy < level.ground) {
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

    const p = {
        x: level.spawn.x,
        y: level.spawn.y,
        vx: 0,
        vy: 0,
        onGround: true,
        climb: null,
        facing: 1,
        aimRel: 0.18,
        walkT: 0,
        lampOn: false,
        mood: 'normal'
    };
    const cam = { x: 0, y: 0 };
    const keys = { left: false, right: false, up: false, down: false };
    const mouse = { x: 0, y: 0, active: 0 };
    const bats = [0, 1, 2, 3].map((i) => ({ x: 400 + i * 600, y: 220 + (i % 2) * 520, ph: i * 1.7, vx: (i % 2 ? -1 : 1) * 60, flee: 0 }));
    const sporesList = Array.from({ length: 70 }, () => ({ x: rand(0, level.w), y: rand(level.ceil, level.ground), r: rand(0.8, 2.2), v: rand(6, 16), a: rand(0.15, 0.5) }));
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
        const pv = pivot();
        if (mouse.active > 0 && phase === 'play') return Math.atan2(mouse.y - pv.y, mouse.x - pv.x);
        return p.facing > 0 ? p.aimRel : Math.PI - p.aimRel;
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
        const minX = Math.floor((Math.min(L.x, p.x) - BEAM_L) / CELL);
        const maxX = Math.ceil((Math.max(L.x, p.x) + BEAM_L) / CELL);
        const minY = Math.floor((Math.min(L.y, p.y) - BEAM_L) / CELL);
        const maxY = Math.ceil((Math.max(L.y, p.y) + BEAM_L) / CELL);
        for (let gy = Math.max(0, minY); gy < Math.min(GH, maxY); gy++) {
            for (let gx = Math.max(0, minX); gx < Math.min(GW, maxX); gx++) {
                const k = gy * GW + gx;
                if (!explorable[k] || explored[k]) continue;
                const cx = gx * CELL + CELL / 2;
                const cy = gy * CELL + CELL / 2;
                const dx = cx - L.x;
                const dy = cy - L.y;
                const d = Math.hypot(dx, dy);
                const near = Math.hypot(cx - p.x, cy - (p.y - 30)) < 120;
                const inBeam = p.lampOn && d < BEAM_L * 0.92 && Math.abs(angDiff(Math.atan2(dy, dx), L.a)) < BEAM_HALF + 24 / Math.max(d, 1);
                if (near || inBeam) {
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

    // ---------------------------------------------------------- physique
    function nearLadder() {
        return level.ladders.find(([x, top, bottom]) => Math.abs(p.x - x) < 24 && p.y >= top - 6 && p.y <= bottom + 6);
    }
    function nearRope() {
        const r = level.rope;
        return Math.abs(p.x - r.x) < 26 && p.y <= r.bottom + 8 && p.y > r.top + 40;
    }

    function jump() {
        if (phase !== 'play' || paused) return;
        if (p.climb) {
            p.climb = null;
            p.vy = -320;
            return;
        }
        if (p.onGround) {
            p.vy = -560;
            p.onGround = false;
        }
    }

    function updatePlay(dt) {
        elapsed += dt;
        const dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
        const vert = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
        if (p.climb) {
            const c = p.climb;
            p.x += (c.x - p.x) * Math.min(1, dt * 14);
            p.y += vert * 210 * dt;
            p.walkT += Math.abs(vert) * dt;
            if (p.y <= c.top) {
                if (c.rope) {
                    p.y = c.top;
                    cb.onRopeTop?.();
                } else {
                    p.y = c.top;
                    p.climb = null;
                    p.onGround = true;
                }
            }
            if (p.y >= c.bottom) {
                p.y = c.bottom;
                p.climb = null;
                p.onGround = true;
            }
            if (dir && p.climb && !c.rope && (p.y <= c.top + 2 || p.y >= c.bottom - 2)) p.climb = null;
        } else {
            p.vx = dir * 240;
            if (dir) p.facing = dir;
            const lad = nearLadder();
            if (lad && ((keys.up && p.y > lad[1] + 4) || (keys.down && p.y < lad[2] - 4))) {
                p.climb = { x: lad[0], top: lad[1], bottom: lad[2] };
                p.vx = 0;
                p.vy = 0;
            } else if (keys.up && nearRope()) {
                p.climb = { x: level.rope.x, top: level.rope.top + 40, bottom: level.rope.bottom, rope: true };
                p.vx = 0;
                p.vy = 0;
            } else if (vert && mouse.active <= 0) {
                p.aimRel = clamp(p.aimRel + vert * 1.7 * dt, -1.15, 1.1);
            }
            if (!p.climb) {
                p.x = clamp(p.x + p.vx * dt, 26, level.w - 26);
                p.vy = Math.min(p.vy + 1500 * dt, 1200);
                const ny = p.y + p.vy * dt;
                p.onGround = false;
                if (p.vy >= 0) {
                    for (const [x0, x1, y] of level.platforms) {
                        if (p.x >= x0 - 8 && p.x <= x1 + 8 && p.y <= y + 0.5 && ny >= y) {
                            p.y = y;
                            p.vy = 0;
                            p.onGround = true;
                            break;
                        }
                    }
                }
                if (!p.onGround) p.y = ny;
                if (dir && p.onGround) p.walkT += dt;
            }
        }
        if (mouse.active > 0) {
            mouse.active -= dt;
            if (!p.climb) p.facing = mouse.x >= p.x ? 1 : -1;
        }

        // lettres : on les ramasse en passant tout près
        for (const l of letters) {
            if (!l.found && Math.abs(p.x - l.x) < 38 && Math.abs(p.y - l.y) < 44) {
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
            cb.onHint?.('Toutes les lettres ! Il reste des coins sombres : éclaire 90 % de la cave.');
        } else if (!allLetters && pct() >= GOAL && !hintSent) {
            hintSent = true;
            cb.onHint?.(`Cave éclairée ! Il manque encore ${LETTER_COUNT - foundOrder.length} lettre${LETTER_COUNT - foundOrder.length > 1 ? 's' : ''} : suis les éclats dorés.`);
        }

        // caméra
        const tx = clamp(p.x - viewW / 2, 0, Math.max(0, level.w - viewW));
        const ty = clamp(p.y - 40 - viewH / 2, 0, Math.max(0, level.h - viewH));
        cam.x += (tx - cam.x) * Math.min(1, dt * 5);
        cam.y += (ty - cam.y) * Math.min(1, dt * 5);

        saveT += dt;
        if (saveT > 4) {
            saveT = 0;
            cb.onSave?.(snapshot());
        }
    }

    function updateAmbient(dt) {
        for (const b of bats) {
            b.ph += dt * 3;
            const L = lens();
            const d = Math.hypot(b.x - L.x, b.y - L.y);
            const lit = p.lampOn && d < BEAM_L && Math.abs(angDiff(Math.atan2(b.y - L.y, b.x - L.x), L.a)) < BEAM_HALF;
            b.flee = lit ? 1 : Math.max(0, b.flee - dt);
            b.x += b.vx * (1 + b.flee * 3) * dt;
            if (b.x < 60 || b.x > level.w - 60) b.vx *= -1;
            b.y += Math.sin(b.ph * 0.7) * 30 * dt;
        }
        for (const s of sporesList) {
            s.y -= s.v * dt;
            s.x += Math.sin(s.y / 60) * 4 * dt;
            if (s.y < level.ceil) s.y = level.ground;
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
        // lettres pas encore ramassées
        for (const l of letters) if (!l.found) drawScrap(ctx, l.x, l.y - 17, 26, 30, l.ch, l.dot, l.rot, l.i + 1);
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
                if (dd > BEAM_L * 0.8 || Math.abs(angDiff(Math.atan2(y - L.y, x - L.x), L.a)) > BEAM_HALF * 0.9) continue;
                ctx.globalAlpha = d.a * (1 - dd / BEAM_L);
                ctx.fillStyle = '#fff3d0';
                ctx.fillRect(x, y, 1.6, 1.6);
            }
            ctx.globalAlpha = 1;
        }
        const now = performance.now() / 1000;
        for (const l of letters) {
            if (l.found) continue;
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
        const bob = p.onGround && Math.abs(p.vx) > 0 ? Math.abs(Math.sin(p.walkT * 12)) * 2.5 : 0;
        const a = aimAngle();
        const pv = pivot();
        // la nageoire suit la lampe
        const local = p.facing > 0 ? a : Math.PI - a;
        const flip = p.lampOn || phase === 'play' ? clamp(local - 0.9, -2.4, 0.8) : 0;
        if (p.climb) {
            drawPenguin(ctx, p.x, p.y - bob, PENGUIN_H, { facing: Math.sin(p.walkT * 10) > 0 ? 1 : -1, flip: -1.6, mood: p.mood });
        } else {
            drawPenguin(ctx, p.x, p.y - bob, PENGUIN_H, { facing: p.facing, flip, mood: p.mood, rotate: p.onGround ? 0 : p.vy * 0.0002 * p.facing });
        }
        if (p.lampOn && !p.climb) {
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

    function beam(L, half, len, a) {
        const g = lctx.createRadialGradient(L.x, L.y, 0, L.x, L.y, len);
        g.addColorStop(0, `rgba(0,0,0,${a})`);
        g.addColorStop(0.55, `rgba(0,0,0,${a * 0.92})`);
        g.addColorStop(0.82, `rgba(0,0,0,${a * 0.5})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        lctx.fillStyle = g;
        lctx.beginPath();
        lctx.moveTo(L.x, L.y);
        lctx.arc(L.x, L.y, len, L.a - half, L.a + half);
        lctx.closePath();
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
        // petites sources : le trou du plafond, la guirlande, la radio, la glace
        const h = level.hole;
        lctx.fillStyle = 'rgba(0,0,0,0.35)';
        lctx.beginPath();
        lctx.moveTo(h.x - 40, 0);
        lctx.lineTo(h.x + 40, 0);
        lctx.lineTo(h.x + 120, level.spawn.y);
        lctx.lineTo(h.x - 70, level.spawn.y);
        lctx.closePath();
        lctx.fill();
        lightBlob(h.x, 30, 90, 0.8);
        const tw = performance.now() / 1000;
        level.bulbs.forEach(([x, y], i) => lightBlob(x, y, 34 + 6 * Math.sin(tw * 2 + i), 0.75));
        lightBlob(level.radio.x + 20, level.radio.y - 30, 46, 0.55);
        lightBlob(level.ice.x, level.ice.y - 60, 70, 0.4 + (foundOrder.length / LETTER_COUNT) * 0.3);
        // le pingouin et sa lampe
        lightBlob(p.x, p.y - 30, 125, 0.85);
        if (p.lampOn) {
            const L = lens();
            const flick = 1 - 0.03 * Math.sin(tw * 31) * Math.sin(tw * 7);
            beam(L, BEAM_HALF * 1.45, BEAM_L * 0.85, 0.45 * flick);
            beam(L, BEAM_HALF, BEAM_L, 1 * flick);
            beam(L, BEAM_HALF * 0.45, BEAM_L * 0.5, 1);
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
            const g = ctx.createRadialGradient(L.x, L.y, 0, L.x, L.y, BEAM_L);
            g.addColorStop(0, 'rgba(255,226,160,0.22)');
            g.addColorStop(0.3, 'rgba(255,214,140,0.08)');
            g.addColorStop(1, 'rgba(255,214,140,0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.moveTo(L.x, L.y);
            ctx.arc(L.x, L.y, BEAM_L, L.a - BEAM_HALF, L.a + BEAM_HALF);
            ctx.closePath();
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
        // point de départ : la corde
        m.strokeStyle = '#8a6234';
        m.lineWidth = 1.6;
        m.beginPath();
        m.moveTo(level.rope.x * sx, level.rope.top * sy);
        m.lineTo(level.rope.x * sx, level.rope.bottom * sy);
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
            cam.y = clamp(level.spawn.y - 40 - viewH / 2, 0, level.h - viewH);
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
    const END = { lights: 1.4, message: 3.4, freeze: 3.8, time: 2.8, rope: 2.2 };
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
                const str = 'IT’S TIIIIIIIMEEEEEEEEE !';
                const k = ease(Math.min(1, t / 0.9));
                const size = Math.min(vw / 15, 96);
                ctx.save();
                ctx.translate(vw / 2, vh * 0.16);
                ctx.scale(0.55 + 0.45 * k, 1);
                ctx.font = `800 ${size}px ${DISPLAY}`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.lineJoin = 'round';
                ctx.lineWidth = size * 0.18;
                ctx.strokeStyle = '#07101d';
                ctx.strokeText(str, 0, 0);
                ctx.fillStyle = '#fff';
                ctx.fillText(str, 0, 0);
                ctx.restore();
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
        return { found: foundOrder.slice(), explored: s, elapsed };
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
                else jump();
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
        touchJump: jump,
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
            p.climb = null;
            lastPct = -1;
        },
        state: () => ({ found: foundOrder.map((i) => letters[i]), pct: pct(), elapsed, phase }),
        snapshot,
        touch
    };
    if (__TEST_MODE__) window.envers = { p, letters, api, explored, revealAll: () => { explored.fill(0); for (let k = 0; k < explored.length; k++) if (explorable[k]) explored[k] = 1; exploredCount = explorableCount; redrawMemory(); }, grabAll: () => letters.forEach((l) => { if (!l.found) { l.found = true; foundOrder.push(l.i); cb.onLetter?.(l); } }) };
    return api;
}

/* global __TEST_MODE__ */
