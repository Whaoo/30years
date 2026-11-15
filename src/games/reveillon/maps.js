// Opération Réveillon : les 3 cartes (une seule par jour, tirée par la graine) et les vagues.
// Repère du jeu : 800 × 450 ; la barre du haut occupe y < 44.

export const W = 800;
export const H = 450;
export const PATH_W = 34;

// path : le chemin des monstres (le dernier point est au pied du sapin)
// decor : sapins [x, y, taille], lac [x, y, rx, ry], maisons [x, y, couleur]
export const MAPS = [
    {
        id: 'clairiere',
        name: 'La clairière',
        path: [[-30, 118], [190, 118], [190, 330], [410, 330], [410, 150], [600, 150], [600, 310], [712, 310]],
        tree: [742, 318],
        lake: null,
        pines: [[60, 230, 30], [100, 380, 34], [300, 210, 26], [300, 420, 28], [500, 240, 30], [520, 420, 26], [700, 120, 32], [760, 200, 26], [40, 410, 24], [690, 420, 28]],
        houses: []
    },
    {
        id: 'lac',
        name: 'Le lac gelé',
        path: [[-30, 382], [140, 382], [140, 170], [330, 170], [330, 392], [520, 392], [520, 118], [690, 118], [690, 268]],
        tree: [700, 330],
        lake: [235, 290, 58, 36],
        pines: [[40, 250, 30], [60, 110, 28], [240, 400, 26], [430, 250, 30], [430, 90, 26], [620, 300, 26], [770, 190, 28], [620, 420, 30], [770, 410, 26]],
        houses: []
    },
    {
        id: 'place',
        name: 'La place du village',
        path: [[420, -30], [420, 100], [130, 100], [130, 252], [660, 252], [660, 392], [268, 392]],
        tree: [232, 382],
        lake: null,
        pines: [[40, 400, 28], [770, 120, 30], [760, 330, 26], [560, 160, 24], [300, 180, 24]],
        houses: [[620, 92, '#c2182a'], [720, 92, '#3b82f6'], [40, 176, '#2b7f54'], [470, 330, '#b14a7a'], [360, 330, '#d97a1a']]
    }
];

// Longueurs cumulées du chemin, pour placer un monstre à une distance donnée
export function measure(path) {
    const segs = [];
    let total = 0;
    for (let i = 0; i < path.length - 1; i++) {
        const [ax, ay] = path[i];
        const [bx, by] = path[i + 1];
        const len = Math.hypot(bx - ax, by - ay);
        segs.push({ ax, ay, bx, by, len, from: total });
        total += len;
    }
    return { segs, total };
}

export function pointAt(m, d) {
    const seg = m.segs.find((s) => d <= s.from + s.len) || m.segs[m.segs.length - 1];
    const k = Math.max(0, Math.min(1, (d - seg.from) / seg.len));
    return { x: seg.ax + (seg.bx - seg.ax) * k, y: seg.ay + (seg.by - seg.ay) * k, dx: Math.sign(seg.bx - seg.ax) };
}

function distToPath(path, x, y) {
    let best = Infinity;
    for (let i = 0; i < path.length - 1; i++) {
        const [ax, ay] = path[i];
        const [bx, by] = path[i + 1];
        const vx = bx - ax;
        const vy = by - ay;
        const k = Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy)));
        best = Math.min(best, Math.hypot(x - ax - vx * k, y - ay - vy * k));
    }
    return best;
}

// Emplacements de tours : le long du chemin, à bonne distance, assez espacés (calculé une fois par carte)
export function makeSlots(map) {
    const cands = [];
    for (let y = 70; y <= 420; y += 14) {
        for (let x = 30; x <= 770; x += 14) {
            const d = distToPath(map.path, x, y);
            if (d < 44 || d > 58) continue;
            if (Math.hypot(x - map.tree[0], y - map.tree[1]) < 70) continue;
            if (map.lake && ((x - map.lake[0]) / (map.lake[2] + 18)) ** 2 + ((y - map.lake[1]) / (map.lake[3] + 18)) ** 2 < 1) continue;
            if (map.pines.some(([px, py]) => Math.hypot(px - x, py - y) < 30)) continue;
            if (map.houses.some(([hx, hy]) => Math.abs(hx - x) < 44 && y > hy - 60 && y < hy + 20)) continue;
            // préférer les coins intérieurs : on compte combien de chemin passe à portée
            let cover = 0;
            const m = measure(map.path);
            for (let dd = 0; dd < m.total; dd += 12) {
                const p = pointAt(m, dd);
                if (Math.hypot(p.x - x, p.y - y) < 100) cover++;
            }
            cands.push({ x, y, cover });
        }
    }
    cands.sort((a, b) => b.cover - a.cover);
    const slots = [];
    for (const c of cands) {
        if (slots.length >= 7) break;
        if (slots.every((s) => Math.hypot(s.x - c.x, s.y - c.y) >= 76)) slots.push({ x: c.x, y: c.y });
    }
    // deux emplacements de dernière ligne près du sapin, sur la trajectoire des chauves-souris
    // (elles volent en ligne droite de l'entrée du chemin jusqu'au sapin)
    const [x0, y0] = map.path[0];
    const [tx, ty] = map.tree;
    const lineDist = (x, y) => {
        const vx = tx - x0;
        const vy = ty - 40 - y0;
        const k = Math.max(0, Math.min(1, ((x - x0) * vx + (y - y0) * vy) / (vx * vx + vy * vy)));
        return Math.hypot(x - x0 - vx * k, y - y0 - vy * k);
    };
    const near = [];
    for (let y = 70; y <= 420; y += 7) {
        for (let x = 30; x <= 770; x += 7) {
            const dt = Math.hypot(x - tx, y - ty + 20);
            if (dt < 66 || dt > 120) continue;
            if (distToPath(map.path, x, y) < 40) continue;
            if (map.pines.some(([px, py]) => Math.hypot(px - x, py - y) < 26)) continue;
            if (map.houses.some(([hx, hy]) => Math.abs(hx - x) < 44 && y > hy - 60 && y < hy + 20)) continue;
            near.push({ x, y, score: lineDist(x, y) });
        }
    }
    near.sort((a, b) => a.score - b.score);
    for (const c of near) {
        if (slots.length >= 9) break;
        if (slots.every((sl) => Math.hypot(sl.x - c.x, sl.y - c.y) >= 70)) slots.push({ x: c.x, y: c.y });
    }
    return slots;
}

// ---------------------------------------------------------------- monstres et tours
// hp : points de vie de base (multipliés par la vague), speed en px/s, pts : score, fish : butin
export const MONSTERS = {
    grognon: { name: 'Bonhomme grognon', hp: 46, speed: 46, pts: 10, fish: 5, r: 13 },
    biscuit: { name: 'Biscuit en colère', hp: 20, speed: 88, pts: 8, fish: 3, r: 11 },
    mimique: { name: 'Cadeau mimique', hp: 36, speed: 60, pts: 15, fish: 5, r: 12 },
    givre: { name: 'Boule de givre', hp: 130, speed: 36, pts: 25, fish: 9, r: 15, slowResist: 0.5 },
    chauve: { name: 'Chauve-souris', hp: 24, speed: 58, pts: 12, fish: 5, r: 11, flying: true },
    boss: { name: 'Le Gros Bonhomme', hp: 1600, speed: 24, pts: 300, fish: 0, r: 26, steal: 3, slowResist: 0.6 },
    petit: { name: 'Petit bonhomme', hp: 130, speed: 62, pts: 40, fish: 10, r: 12 }
};

export const TOWERS = {
    lanceur: {
        name: 'Pingouin lanceur', short: 'Lanceur', cost: 50, up: [45, 80],
        range: [100, 110, 122], rate: [1.5, 1.9, 2.4], dmg: [14, 20, 28],
        next: ['plus vite, plus fort', 'double boule de neige'], air: true
    },
    canon: {
        name: 'Canon à neige', short: 'Canon', cost: 80, up: [60, 100],
        range: [78, 88, 98], rate: [0.8, 0.9, 1.0], dmg: [5, 8, 12], slow: [0.55, 0.45, 0.35],
        next: ['zone plus large', 'gèle presque sur place'], air: false
    },
    phare: {
        name: 'Phare de Noël', short: 'Phare', cost: 100, up: [70, 110],
        range: [110, 125, 140], rate: [0.32, 0.38, 0.45], dmg: [8, 12, 16], stun: [0.7, 0.9, 1.1],
        next: ['éblouit plus souvent', 'éblouit plus longtemps'], air: true
    },
    guirlande: {
        name: 'Guirlande électrique', short: 'Guirlande', cost: 130, up: [90, 140],
        range: [92, 102, 112], rate: [0.9, 1.05, 1.25], dmg: [22, 32, 44], chain: [2, 3, 4],
        next: ['un éclair de plus', 'chaîne sur 5 monstres'], air: true
    }
};
export const TOWER_ORDER = ['lanceur', 'canon', 'phare', 'guirlande'];

// Les 8 vagues : groupes [type, nombre, intervalle (s), départ (s)]. Le jour ajoute ses événements (voir le jeu) :
// la vague de nuit (5e ou 6e) reçoit en plus 8 cadeaux mimiques, invisibles sauf à la lumière d'un phare.
export const WAVES = [
    { groups: [['grognon', 8, 1.5, 0]] },
    { groups: [['grognon', 7, 1.6, 0], ['biscuit', 8, 1.0, 4]] },
    { groups: [['biscuit', 12, 0.6, 0], ['grognon', 7, 1.4, 3]] },
    { groups: [['grognon', 8, 1.3, 0], ['chauve', 6, 1.1, 4], ['givre', 4, 2.8, 6]] },
    { groups: [['grognon', 9, 1.2, 0], ['biscuit', 9, 0.8, 4], ['givre', 3, 2.6, 8]] },
    { groups: [['givre', 5, 2.3, 0], ['chauve', 7, 1.0, 3], ['biscuit', 10, 0.6, 7]] },
    { groups: [['grognon', 10, 1.0, 0], ['biscuit', 12, 0.5, 2], ['mimique', 6, 1.3, 6], ['givre', 4, 2.4, 8], ['chauve', 7, 1.0, 10]] },
    { groups: [['boss', 1, 1, 2], ['grognon', 8, 1.4, 0], ['biscuit', 10, 0.8, 6], ['chauve', 5, 1.2, 14]], boss: true }
];
