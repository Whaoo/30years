// La carte de « L'aventure de Flocon » : décor, obstacles, collisions.
// La carte est toujours la même (générateur pseudo-aléatoire à graine fixe) : on apprend à s'y repérer.
import { TAU } from '../draw';

export const WORLD = { w: 2400, h: 1600 };
export const BOUNDS = { x0: 96, y0: 120, x1: 2400 - 96, y1: 1600 - 84 };
export const IGLOO = { x: 380, y: 1270 };
export const FIRE = { x: 1150, y: 880, r: 125 };
export const LAKE = { x: 1770, y: 1110, rx: 330, ry: 200 };
const PATH = [[380, 1290], [640, 1200], [900, 1010], [1150, 900], [1420, 720], [1720, 540], [2060, 420]];

function mulberry32(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export function onLake(x, y, margin = 1) {
    const dx = (x - LAKE.x) / (LAKE.rx * margin);
    const dy = (y - LAKE.y) / (LAKE.ry * margin);
    return dx * dx + dy * dy < 1;
}

function distToPath(x, y) {
    let best = Infinity;
    for (let i = 0; i < PATH.length - 1; i++) {
        const [ax, ay] = PATH[i];
        const [bx, by] = PATH[i + 1];
        const vx = bx - ax;
        const vy = by - ay;
        const t = Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy)));
        best = Math.min(best, Math.hypot(x - (ax + vx * t), y - (ay + vy * t)));
    }
    return best;
}

function lakePath(ctx, grow = 0) {
    ctx.beginPath();
    for (let i = 0; i <= 64; i++) {
        const a = (i / 64) * TAU;
        const k = 1 + 0.035 * Math.sin(3 * a + 1) + 0.025 * Math.sin(5 * a + 2);
        const x = LAKE.x + Math.cos(a) * (LAKE.rx * k + grow);
        const y = LAKE.y + Math.sin(a) * (LAKE.ry * k + grow);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.closePath();
}

function smoothPath(ctx, pts) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length - 1; i++) {
        const mx = (pts[i][0] + pts[i + 1][0]) / 2;
        const my = (pts[i][1] + pts[i + 1][1]) / 2;
        ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
    }
    const last = pts[pts.length - 1];
    ctx.lineTo(last[0], last[1]);
}

function makeObstacles(rng) {
    const obs = [];
    const free = (x, y, r, gap) => obs.every((o) => Math.hypot(o.x - x, o.y - y) > o.r + r + gap);
    const add = (kind, x, y, r, scale = 1) => obs.push({ kind, x, y, r, scale });

    add('igloo', IGLOO.x, IGLOO.y - 22, 70);
    add('fire', FIRE.x, FIRE.y, 24);

    // Lisière de forêt tout autour : la carte est fermée
    for (let x = 30; x < WORLD.w; x += 92) {
        add('pine', x + rng() * 30, 40 + rng() * 44, 26, 1 + rng() * 0.3);
        add('pine', x + rng() * 30, WORLD.h - 30 - rng() * 36, 26, 1 + rng() * 0.3);
    }
    for (let y = 150; y < WORLD.h - 80; y += 92) {
        add('pine', 36 + rng() * 40, y + rng() * 30, 26, 1 + rng() * 0.3);
        add('pine', WORLD.w - 36 - rng() * 40, y + rng() * 30, 26, 1 + rng() * 0.3);
    }

    // Bosquets et rochers à l'intérieur, en laissant libres le chemin, le lac, l'igloo et le feu
    let trees = 0;
    let rocks = 0;
    for (let tries = 0; tries < 4000 && (trees < 44 || rocks < 16); tries++) {
        const x = 200 + rng() * (WORLD.w - 400);
        const y = 220 + rng() * (WORLD.h - 400);
        if (onLake(x, y, 1.25)) continue;
        if (Math.hypot(x - IGLOO.x, y - IGLOO.y) < 260) continue;
        if (Math.hypot(x - FIRE.x, y - FIRE.y) < FIRE.r + 110) continue;
        if (distToPath(x, y) < 70) continue;
        const isRock = rocks < 16 && (trees >= 44 || rng() < 0.28);
        const r = isRock ? 17 : 24;
        if (!free(x, y, r, isRock ? 70 : 90)) continue;
        // Les sapins aiment les bosquets : on en ajoute parfois un deuxième tout près
        if (isRock) {
            add('rock', x, y, r, 0.9 + rng() * 0.4);
            rocks++;
        } else {
            const scale = 0.9 + rng() * 0.35;
            add('pine', x, y, r * scale, scale);
            trees++;
            const a = rng() * TAU;
            const x2 = x + Math.cos(a) * 62;
            const y2 = y + Math.sin(a) * 50;
            if (trees < 44 && rng() < 0.45 && free(x2, y2, 22, 8) && !onLake(x2, y2, 1.25) && distToPath(x2, y2) > 70) {
                const s2 = 0.8 + rng() * 0.3;
                add('pine', x2, y2, 24 * s2, s2);
                trees++;
            }
        }
    }
    return obs;
}

function paintGround(obstacles, rng) {
    const c = document.createElement('canvas');
    c.width = WORLD.w;
    c.height = WORLD.h;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#eaf3fb';
    ctx.fillRect(0, 0, WORLD.w, WORLD.h);

    // Ondulations de neige
    for (let i = 0; i < 110; i++) {
        ctx.beginPath();
        ctx.ellipse(rng() * WORLD.w, rng() * WORLD.h, 60 + rng() * 170, 18 + rng() * 46, (rng() - 0.5) * 0.4, 0, TAU);
        ctx.fillStyle = rng() < 0.6 ? 'rgba(205, 222, 241, 0.55)' : 'rgba(255, 255, 255, 0.7)';
        ctx.fill();
    }

    // Lueur chaude autour du feu de camp (zone de soin)
    const glow = ctx.createRadialGradient(FIRE.x, FIRE.y, 10, FIRE.x, FIRE.y, FIRE.r + 30);
    glow.addColorStop(0, 'rgba(255, 196, 110, 0.55)');
    glow.addColorStop(1, 'rgba(255, 211, 110, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(FIRE.x, FIRE.y, FIRE.r + 30, 0, TAU);
    ctx.fill();
    ctx.setLineDash([10, 10]);
    ctx.strokeStyle = 'rgba(255, 159, 67, 0.45)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(FIRE.x, FIRE.y, FIRE.r, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);

    // Chemin tassé et traces de pas
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    smoothPath(ctx, PATH);
    ctx.strokeStyle = '#d6e3f1';
    ctx.lineWidth = 58;
    ctx.stroke();
    smoothPath(ctx, PATH);
    ctx.strokeStyle = '#dfe9f5';
    ctx.lineWidth = 30;
    ctx.stroke();
    ctx.fillStyle = '#c2d4e8';
    for (let i = 0; i < PATH.length - 1; i++) {
        const [ax, ay] = PATH[i];
        const [bx, by] = PATH[i + 1];
        const len = Math.hypot(bx - ax, by - ay);
        const nx = -(by - ay) / len;
        const ny = (bx - ax) / len;
        for (let d = 20; d < len; d += 34) {
            const t = d / len;
            const side = (Math.round(d / 34) % 2 ? 1 : -1) * 6;
            ctx.beginPath();
            ctx.ellipse(ax + (bx - ax) * t + nx * side, ay + (by - ay) * t + ny * side, 4, 2.6, Math.atan2(by - ay, bx - ax), 0, TAU);
            ctx.fill();
        }
    }

    // Lac gelé : la glace fait glisser
    lakePath(ctx, 8);
    ctx.fillStyle = '#d4ecfb';
    ctx.fill();
    lakePath(ctx);
    ctx.fillStyle = '#bfe3ff';
    ctx.fill();
    ctx.strokeStyle = '#8fcdf5';
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(LAKE.x - 160, LAKE.y - 80);
    ctx.lineTo(LAKE.x - 120, LAKE.y - 50);
    ctx.lineTo(LAKE.x - 128, LAKE.y - 10);
    ctx.moveTo(LAKE.x + 150, LAKE.y + 40);
    ctx.lineTo(LAKE.x + 110, LAKE.y + 70);
    ctx.lineTo(LAKE.x + 124, LAKE.y + 104);
    ctx.moveTo(LAKE.x + 20, LAKE.y - 120);
    ctx.lineTo(LAKE.x + 44, LAKE.y - 96);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(LAKE.x - 220, LAKE.y + 50);
    ctx.quadraticCurveTo(LAKE.x - 190, LAKE.y + 10, LAKE.x - 140, LAKE.y + 16);
    ctx.moveTo(LAKE.x + 40, LAKE.y - 150);
    ctx.quadraticCurveTo(LAKE.x + 110, LAKE.y - 160, LAKE.x + 170, LAKE.y - 140);
    ctx.stroke();

    // Ombres portées du décor (dessinées au sol, une fois pour toutes)
    ctx.fillStyle = 'rgba(29, 37, 66, 0.13)';
    for (const o of obstacles) {
        ctx.beginPath();
        if (o.kind === 'pine') ctx.ellipse(o.x + 8, o.y + 14, 30 * o.scale, 10 * o.scale, 0, 0, TAU);
        else if (o.kind === 'rock') ctx.ellipse(o.x + 4, o.y + 9, 22 * o.scale, 7 * o.scale, 0, 0, TAU);
        else if (o.kind === 'igloo') ctx.ellipse(IGLOO.x, IGLOO.y + 6, 92, 13, 0, 0, TAU);
        else continue;
        ctx.fill();
    }

    // Petites étincelles dans la neige
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    for (let i = 0; i < 260; i++) {
        ctx.beginPath();
        ctx.arc(rng() * WORLD.w, rng() * WORLD.h, 1 + rng() * 1.4, 0, TAU);
        ctx.fill();
    }
    return c;
}

// Fond de la mini-carte (décor fixe), dessiné une fois
function paintMini(obstacles, w, h) {
    const k = w / WORLD.w;
    const c = document.createElement('canvas');
    c.width = w * 2;
    c.height = h * 2;
    const ctx = c.getContext('2d');
    ctx.scale(2 * k, 2 * k);
    ctx.fillStyle = '#dfeaf6';
    ctx.fillRect(0, 0, WORLD.w, WORLD.h);
    ctx.lineCap = 'round';
    smoothPath(ctx, PATH);
    ctx.strokeStyle = '#cbd9ea';
    ctx.lineWidth = 50;
    ctx.stroke();
    lakePath(ctx);
    ctx.fillStyle = '#9fd8ff';
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 179, 71, 0.45)';
    ctx.beginPath();
    ctx.arc(FIRE.x, FIRE.y, FIRE.r, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ff9f43';
    ctx.beginPath();
    ctx.arc(FIRE.x, FIRE.y, 34, 0, TAU);
    ctx.fill();
    for (const o of obstacles) {
        if (o.kind === 'fire') continue;
        ctx.beginPath();
        if (o.kind === 'igloo') {
            ctx.arc(o.x, o.y, 60, 0, TAU);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.lineWidth = 10;
            ctx.strokeStyle = '#9fb3cc';
            ctx.stroke();
            continue;
        }
        ctx.arc(o.x, o.y, o.kind === 'rock' ? 20 : 32 * o.scale, 0, TAU);
        ctx.fillStyle = o.kind === 'rock' ? '#a9b6c8' : '#3aa877';
        ctx.fill();
    }
    return c;
}

// Zones accessibles à pied depuis l'igloo (grille de 16 px) : aucun cadeau n'apparaît dans un recoin fermé
const CELL = 16;
function buildReach(obstacles, startX, startY, radius) {
    const gw = Math.ceil(WORLD.w / CELL);
    const gh = Math.ceil(WORLD.h / CELL);
    const free = new Uint8Array(gw * gh);
    for (let j = 0; j < gh; j++) {
        for (let i = 0; i < gw; i++) {
            const x = i * CELL + CELL / 2;
            const y = j * CELL + CELL / 2;
            if (x < BOUNDS.x0 || x > BOUNDS.x1 || y < BOUNDS.y0 || y > BOUNDS.y1) continue;
            if (!hitsObstacle(x, y, radius, obstacles)) free[j * gw + i] = 1;
        }
    }
    const reach = new Uint8Array(gw * gh);
    const queue = new Int32Array(gw * gh);
    let head = 0;
    let tail = 0;
    const start = Math.floor(startY / CELL) * gw + Math.floor(startX / CELL);
    if (free[start]) {
        reach[start] = 1;
        queue[tail++] = start;
    }
    while (head < tail) {
        const c = queue[head++];
        const i = c % gw;
        const n = [i > 0 ? c - 1 : -1, i < gw - 1 ? c + 1 : -1, c - gw, c + gw];
        for (const k of n) {
            if (k < 0 || k >= free.length || reach[k] || !free[k]) continue;
            reach[k] = 1;
            queue[tail++] = k;
        }
    }
    return (x, y) => {
        const i = Math.floor(x / CELL);
        const j = Math.floor(y / CELL);
        if (i < 0 || j < 0 || i >= gw || j >= gh) return false;
        return reach[j * gw + i] === 1;
    };
}

export function buildWorld(miniW, miniH, spawn) {
    const rng = mulberry32(2026);
    const obstacles = makeObstacles(rng);
    return {
        obstacles,
        reachable: buildReach(obstacles, spawn.x, spawn.y, 17),
        ground: paintGround(obstacles, rng),
        mini: paintMini(obstacles, miniW, miniH)
    };
}

// Écarte une entité ronde des obstacles ronds. Renvoie la normale du dernier contact (ou null).
export function pushOut(ent, r, list) {
    let normal = null;
    for (let i = 0; i < list.length; i++) {
        const o = list[i];
        if (o === ent || o.dead) continue;
        const dx = ent.x - o.x;
        const dy = ent.y - o.y;
        const min = r + o.r;
        if (dx > min || dx < -min || dy > min || dy < -min) continue;
        const d = Math.hypot(dx, dy);
        if (d >= min) continue;
        const nx = d > 0.001 ? dx / d : 1;
        const ny = d > 0.001 ? dy / d : 0;
        ent.x = o.x + nx * min;
        ent.y = o.y + ny * min;
        normal = { x: nx, y: ny };
    }
    return normal;
}

export function hitsObstacle(x, y, r, list) {
    for (let i = 0; i < list.length; i++) {
        const o = list[i];
        const min = r + o.r;
        const dx = x - o.x;
        const dy = y - o.y;
        if (dx * dx + dy * dy < min * min) return o;
    }
    return null;
}

export function clampToBounds(ent, margin = 0) {
    ent.x = Math.max(BOUNDS.x0 + margin, Math.min(BOUNDS.x1 - margin, ent.x));
    ent.y = Math.max(BOUNDS.y0 + margin, Math.min(BOUNDS.y1 - margin, ent.y));
}
