// Les Monts Givrés : niveaux construits à partir de « tronçons » dessinés à la main.
// Le scénario du jour (graine = date de Paris) choisit l'ordre des tronçons du milieu,
// la cachette du cadeau secret et celle du poisson doré : tout le monde a le même parcours
// le même jour, et il change le lendemain. Le début de chaque niveau (tutoriel) reste fixe.
//
// Repère : sol à y = 390, écran de 800 × 450. Chaque tronçon commence et finit sur du sol.
// Éléments (coordonnées relatives au tronçon) :
//   g  sol            { x, w }                       (un trou = absence de sol)
//   p  plateforme     { x, y, w, k: 'ice' | 'crack' | 'snow' }
//   b  bloc de neige  { x, y, w }                    (du haut y jusqu'au sol)
//   c  plafond        { x, w, y }                    (du haut de l'écran jusqu'à y)
//   s  pics           { x, w, y? }
//   sp ressort        { x, y? }
//   f  poissons       { x, y, n, dx, arc? }
//   e  ennemi         { k: 'snowman' | 'bat' | 'gull' | 'stal', x, y?, r? }
//   sign panneau      { x, text, key? }
//   secret / gold     cachettes possibles du cadeau secret / du poisson doré { x, y }

export const GROUND = 390;

const G = (x, w) => ({ t: 'g', x, w });
const P = (x, y, w, k = 'ice') => ({ t: 'p', x, y, w, k });
const B = (x, y, w) => ({ t: 'b', x, y, w });
const C = (x, w, y) => ({ t: 'c', x, w, y });
const S = (x, w, y = GROUND) => ({ t: 's', x, w, y });
const SP = (x, y = GROUND) => ({ t: 'sp', x, y });
const F = (x, y, n, dx = 30, arc = 0) => ({ t: 'f', x, y, n, dx, arc });
const E = (k, x, y = GROUND, r = 0) => ({ t: 'e', k, x, y, r });
const SIGN = (x, text, key = '') => ({ t: 'sign', x, text, key });
const SECRET = (x, y) => ({ t: 'secret', x, y });
const GOLD = (x, y) => ({ t: 'gold', x, y });

// ---------------------------------------------------------------- tronçons du tutoriel (niveau 1, fixes)
const TUTO = [
    { w: 620, items: [G(0, 620), SIGN(110, 'avancer', '← →'), F(260, 360, 6, 34)] },
    { w: 560, items: [G(0, 560), SIGN(60, 'sauter', 'Espace'), B(230, 345, 60), F(200, 300, 4, 40, 40), B(420, 330, 60)] },
    { w: 620, items: [G(0, 620), SIGN(70, 'en l’air : double saut', '2× Espace'), B(300, 225, 70), F(300, 180, 3, 30), F(450, 360, 4)] },
    { w: 620, items: [G(0, 620), SIGN(60, 'glisser sous la glace', '↓ / Maj'), C(270, 120, 352), F(270, 372, 4, 32), GOLD(560, 300)] }
];

// ---------------------------------------------------------------- vallée (niveau 1)
const VALLEY = [
    { w: 560, items: [G(0, 200), G(330, 230), F(190, 300, 5, 30, 50)] },
    { w: 600, items: [G(0, 600), E('snowman', 300, GROUND, 120), F(160, 360, 3), F(420, 360, 3)] },
    { w: 640, items: [G(0, 640), S(250, 80), P(230, 300, 120), F(240, 260, 4), SECRET(290, 150)] },
    { w: 620, items: [G(0, 620), SP(200), P(330, 170, 180, 'snow'), F(350, 130, 5), SECRET(470, 120), E('snowman', 480, GROUND, 80)] },
    { w: 640, items: [G(0, 170), P(230, 340, 80), P(380, 300, 80), G(500, 140), F(240, 300, 2), F(390, 260, 2), GOLD(420, 200)] },
    { w: 600, items: [G(0, 600), C(220, 160, 352), F(220, 372, 5, 32), E('snowman', 470, GROUND, 60)] },
    { w: 600, items: [G(0, 600), B(180, 320, 80), B(340, 260, 80), F(190, 280, 2, 40), F(350, 220, 2, 40), SECRET(380, 120)] }
];

// ---------------------------------------------------------------- grotte de glace (niveau 2, sombre)
const CAVE = [
    { w: 620, items: [G(0, 140), P(190, 360, 70, 'crack'), P(320, 330, 70, 'crack'), P(450, 350, 70, 'crack'), G(560, 60), F(200, 320, 2), F(330, 290, 2), F(460, 310, 2)] },
    { w: 620, items: [G(0, 620), E('stal', 200, 40), E('stal', 330, 40), E('stal', 460, 40), F(180, 360, 9, 34)] },
    { w: 600, items: [G(0, 600), E('bat', 300, 190), F(220, 330, 5, 34, 30), GOLD(320, 120)] },
    { w: 640, items: [G(0, 640), C(170, 260, 352), F(180, 372, 7, 34), E('stal', 520, 40)] },
    { w: 600, items: [G(0, 180), S(180, 240, 420), P(250, 320, 90), G(420, 180), F(260, 280, 3), SECRET(295, 170)] },
    { w: 640, items: [G(0, 140), P(170, 330, 70), P(300, 270, 70), P(430, 330, 70, 'crack'), G(540, 100), F(180, 290, 2), F(310, 230, 2), SECRET(330, 140)] },
    { w: 620, items: [G(0, 620), E('bat', 220, 170), E('bat', 450, 210), F(150, 360, 4), F(400, 360, 4)] },
    { w: 600, items: [G(0, 600), E('snowman', 280, GROUND, 120), S(470, 60), F(200, 300, 4, 34, 40)] },
    { w: 620, items: [G(0, 620), B(200, 300, 90), E('stal', 330, 40), B(400, 250, 90), F(210, 260, 3), F(410, 210, 3), GOLD(445, 150)] }
];

// ---------------------------------------------------------------- blizzard (niveau 3, vent et planeur)
const BLIZZ_TUTO = [
    { w: 640, items: [G(0, 640), SIGN(80, 'maintenir en l’air : l’écharpe plane', 'Espace'), F(250, 330, 6, 34, 30)] },
    { w: 640, items: [G(0, 220), G(540, 100), F(240, 280, 8, 36, 20), GOLD(380, 220)] }
];
const BLIZZ = [
    { w: 680, items: [G(0, 180), P(330, 330, 60), G(560, 120), F(200, 290, 4, 34), F(420, 290, 4, 34), SECRET(360, 210)] },
    { w: 620, items: [G(0, 620), E('gull', 600, 250), S(300, 70), F(250, 300, 4, 34, 40)] },
    { w: 680, items: [G(0, 680), SP(160), P(260, 160, 160, 'snow'), F(280, 120, 5), SECRET(420, 100), E('snowman', 540, GROUND, 80)] },
    { w: 700, items: [G(0, 160), P(320, 300, 70, 'crack'), G(600, 100), F(200, 270, 4, 36), F(420, 270, 5, 36), GOLD(360, 230)] },
    { w: 640, items: [G(0, 640), E('gull', 640, 230), E('gull', 900, 300), F(150, 360, 6, 34)] },
    { w: 660, items: [G(0, 200), S(200, 260, 430), P(300, 280, 80), G(460, 200), F(220, 260, 6, 34), SECRET(330, 160)] },
    { w: 620, items: [G(0, 620), C(240, 150, 352), F(240, 372, 5, 32), E('gull', 620, 260)] },
    { w: 660, items: [G(0, 660), B(170, 300, 90), B(330, 220, 90), F(180, 260, 2, 40), F(340, 180, 2, 40), E('snowman', 520, GROUND, 70)] }
];

// Arène du boss : un seul écran
export const ARENA = { w: 800, items: [G(0, 800)] };

export const LEVELS = [
    { id: 1, name: 'La vallée', theme: 'valley', fixed: TUTO, pool: VALLEY, pick: 5, wind: false },
    { id: 2, name: 'La grotte de glace', theme: 'cave', fixed: [], pool: CAVE, pick: 8, wind: false, dark: true },
    { id: 3, name: 'Le blizzard', theme: 'blizzard', fixed: BLIZZ_TUTO, pool: BLIZZ, pick: 7, wind: true, glide: true }
];

const START = { w: 260, items: [G(0, 260)] };
const END = { w: 420, items: [G(0, 420), { t: 'flag', x: 260 }] };

// Assemble un niveau : liste plate d'éléments en coordonnées absolues + emplacements des drapeaux de contrôle
export function buildLevel(level, rng) {
    const middle = rng.shuffle(level.pool).slice(0, level.pick);
    const chunks = [START, ...level.fixed, ...middle, END];
    const items = [];
    const checkpoints = [];
    const secrets = [];
    const golds = [];
    let x = 0;
    chunks.forEach((ch, i) => {
        if (i > 0 && i < chunks.length - 1 && i % 3 === 0) checkpoints.push(x + 40);
        ch.items.forEach((it) => {
            const a = { ...it, x: it.x + x };
            if (it.t === 'secret') secrets.push(a);
            else if (it.t === 'gold') golds.push(a);
            else items.push(a);
        });
        x += ch.w;
    });
    // Une seule cachette retenue pour le cadeau secret et une pour le poisson doré
    if (secrets.length) items.push({ ...rng.pick(secrets), t: 'gift' });
    if (golds.length) items.push({ ...rng.pick(golds), t: 'goldfish' });
    return { width: x, items, checkpoints };
}
