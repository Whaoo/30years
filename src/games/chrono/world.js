// Chronoflocon : l'archipel du centre de tri du Pôle. Repère du jeu : 800 × 450
// (bandeau du haut y < 34, dépôt du bas y > 404).

export const W = 800;
export const H = 450;
export const TOP = 34;
export const BOTTOM = H - 46;

// Les îles. from : tournée où l'île apparaît (0 matin, 1 midi, 2 soir). weight : part des colis qui en partent.
export const ISLES = {
    tri: { x: 400, y: 228, r: 50, name: 'Centre de tri', sym: 'tri', col: '#7fe8ff', from: 0, weight: 3 },
    poisson: { x: 250, y: 142, r: 36, name: 'Île Poisson', sym: 'fish', col: '#ff9f43', from: 0, weight: 1 },
    sapin: { x: 275, y: 332, r: 36, name: 'Île Sapin', sym: 'tree', col: '#2bb673', from: 0, weight: 1 },
    phoque: { x: 118, y: 345, r: 32, name: 'Île Phoque', sym: 'seal', col: '#9fa8ff', from: 0, weight: 1 },
    morse: { x: 92, y: 196, r: 30, name: 'Île Morse', sym: 'moon', col: '#c9b6ff', from: 0, weight: 1 },
    etoile: { x: 612, y: 145, r: 38, name: 'Île Étoile', sym: 'star', col: '#ffd23f', from: 1, weight: 1.2 },
    cadeau: { x: 680, y: 300, r: 36, name: 'Île Cadeau', sym: 'gift', col: '#ff6fa8', from: 1, weight: 1.2 },
    aurore: { x: 482, y: 138, r: 27, name: 'Île Aurore', sym: 'aurora', col: '#7be0a3', from: 2, weight: 1 }
};
export const ISLE_KEYS = Object.keys(ISLES);

// Les liaisons possibles : la géographie choisit le mode (pont de banquise = train, chenal = bateau, piste = avion)
export const LINKS = [
    ['tri', 'poisson', 'rail'], ['tri', 'sapin', 'rail'], ['etoile', 'cadeau', 'rail'], ['phoque', 'morse', 'rail'],
    ['sapin', 'phoque', 'boat'], ['tri', 'cadeau', 'boat'], ['poisson', 'morse', 'boat'], ['tri', 'etoile', 'boat'],
    ['poisson', 'aurore', 'boat'], ['sapin', 'cadeau', 'boat'],
    ['tri', 'aurore', 'air'], ['tri', 'etoile', 'air'], ['aurore', 'etoile', 'air']
];

// Véhicules : vitesse (px/s) et capacité. Le type de la liaison décide du véhicule.
export const VEHICLES = {
    rail: { name: 'Trains', one: 'train', speed: 96, cap: 4 },
    boat: { name: 'Bateaux', one: 'bateau', speed: 66, cap: 3 },
    air: { name: 'Avions', one: 'avion', speed: 170, cap: 2 }
};

// Les trois tournées. spawn : secondes entre deux colis (au début → à la fin de la tournée).
// gift : véhicules ajoutés au dépôt au début de la tournée.
export const ROUNDS = [
    { name: 'Matin', dur: 50, spawn: [2.6, 1.9], gift: { rail: 3, boat: 1, air: 0 }, express: 0, canLose: false },
    { name: 'Midi', dur: 70, spawn: [1.8, 1.3], gift: { rail: 1, boat: 0, air: 1 }, express: 4, canLose: true },
    { name: 'Soir', dur: 80, spawn: [1.45, 1.0], gift: { rail: 0, boat: 1, air: 0 }, express: 6, canLose: true }
];

// Les événements de Radio Banquise (annoncés 8 s avant, visibles sur la frise de la tournée)
export const EVENTS = {
    fog: { name: 'Brouillard', short: 'Brouillard', line: 'Brouillard sur les chenaux : les bateaux avancent trois fois moins vite', dur: 14 },
    crack: { name: 'Banquise fendue', short: 'Banquise', line: 'La banquise se fend : un pont de rail est coupé', dur: 18 },
    storm: { name: 'Tempête', short: 'Tempête', line: 'Tempête : les avions restent au sol, les bateaux peinent', dur: 12 },
    aurora: { name: 'Aurore', short: 'Aurore', line: 'Aurore boréale : livraisons qui comptent double', dur: 10 },
    burst: { name: 'Rush', short: 'Rush', line: 'Rush ! Une île déborde de colis', dur: 0 },
    breakdown: { name: 'Panne', short: 'Panne', line: 'Panne en vue : un véhicule va caler, clique dessus pour le réparer', dur: 0 },
    iceberg: { name: 'Iceberg', short: 'Iceberg', line: 'Un iceberg dérive vers un chenal', dur: 999 } // reste jusqu'à ce qu'on le brise
};

// Les renforts proposés entre deux tournées (deux cartes tirées par la graine)
export const CARDS = {
    train: { title: '+1 train', l1: 'Un pont de banquise', l2: 'de plus à desservir.', give: { rail: 1 } },
    boat: { title: '+1 bateau', l1: 'Un deuxième bateau pour', l2: 'les chenaux saturés.', give: { boat: 1 } },
    plane: { title: '+1 avion', l1: 'Rapide, mais seulement', l2: '2 colis à la fois.', give: { air: 1 } },
    wagons: { title: 'Wagons en plus', l1: 'Tous les trains portent', l2: '2 colis de plus.', capRail: 2 },
    cocoa: { title: 'Chocolat chaud', l1: 'L’humeur remonte', l2: 'de 25 points.', mood: 0.25 }
};

export function linkKey(a, b, type) {
    return a < b ? `${a}-${b}-${type}` : `${b}-${a}-${type}`;
}

// Géométrie d'une liaison : segment droit (rail, bateau) ou arc (avion)
export function linkPoint(a, b, type, k) {
    const A = ISLES[a];
    const B = ISLES[b];
    if (type === 'air') {
        const mx = (A.x + B.x) / 2;
        const my = Math.min(A.y, B.y) - 50;
        const u = 1 - k;
        return [u * u * A.x + 2 * u * k * mx + k * k * B.x, u * u * A.y + 2 * u * k * my + k * k * B.y];
    }
    return [A.x + (B.x - A.x) * k, A.y + (B.y - A.y) * k];
}
export function linkLength(a, b, type) {
    let len = 0;
    let [px, py] = linkPoint(a, b, type, 0);
    for (let i = 1; i <= 16; i++) {
        const [x, y] = linkPoint(a, b, type, i / 16);
        len += Math.hypot(x - px, y - py);
        px = x;
        py = y;
    }
    // on part et on arrive au bord des îles, pas en leur centre
    return Math.max(30, len - ISLES[a].r * 0.6 - ISLES[b].r * 0.6);
}
// Distance d'un point à une liaison (pour cliquer dessus)
export function distToLink(a, b, type, x, y) {
    let best = Infinity;
    for (let i = 0; i <= 20; i++) {
        const [px, py] = linkPoint(a, b, type, i / 20);
        best = Math.min(best, Math.hypot(px - x, py - y));
    }
    return best;
}
