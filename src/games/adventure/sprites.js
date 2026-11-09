// Sprites de « L'aventure de Flocon », repris des planches de design (mêmes formes SVG).
// Chaque sprite est dessiné une seule fois dans un canvas hors écran, puis simplement copié
// à chaque image : c'est ce qui garde le jeu fluide même avec beaucoup de monstres.
import { TAU } from '../draw';

const RES = 2; // résolution interne des sprites (nets sur les écrans haute densité)

// Mini-format de formes : { c:[cx,cy,r] } | { e:[cx,cy,rx,ry] } | { r:[x,y,w,h,rayon] } | { d:'chemin SVG' }
// + f (remplissage), s (contour), w (épaisseur), dash, cap, a (opacité), rot:[degrés,cx,cy], m:[matrice]
function toPath(sh) {
    if (sh.d) return new Path2D(sh.d);
    const p = new Path2D();
    if (sh.c) {
        const [cx, cy, r] = sh.c;
        p.arc(cx, cy, r, 0, TAU);
    } else if (sh.e) {
        const [cx, cy, rx, ry] = sh.e;
        p.ellipse(cx, cy, rx, ry, 0, 0, TAU);
    } else if (sh.r) {
        const [x, y, w, h, rr = 0] = sh.r;
        const r = Math.min(rr, w / 2, h / 2);
        p.moveTo(x + r, y);
        p.arcTo(x + w, y, x + w, y + h, r);
        p.arcTo(x + w, y + h, x, y + h, r);
        p.arcTo(x, y + h, x, y, r);
        p.arcTo(x, y, x + w, y, r);
        p.closePath();
    }
    return p;
}

function drawShape(ctx, sh) {
    ctx.save();
    if (sh.m) ctx.transform(...sh.m);
    if (sh.rot) {
        const [deg, cx, cy] = sh.rot;
        ctx.translate(cx, cy);
        ctx.rotate((deg * Math.PI) / 180);
        ctx.translate(-cx, -cy);
    }
    if (sh.a != null) ctx.globalAlpha *= sh.a;
    const path = toPath(sh);
    if (sh.f) {
        ctx.fillStyle = sh.f;
        ctx.fill(path);
    }
    if (sh.s) {
        ctx.strokeStyle = sh.s;
        ctx.lineWidth = sh.w || 1;
        ctx.lineCap = sh.cap || 'round';
        ctx.lineJoin = 'round';
        if (sh.dash) ctx.setLineDash(sh.dash);
        ctx.stroke(path);
    }
    ctx.restore();
}

// box : zone dessinée (unités du design), anchor : point posé au sol, k : pixels de jeu par unité
function makeSprite({ box, anchor, k, shapes }) {
    const [x0, y0, w, h] = box;
    const c = document.createElement('canvas');
    c.width = Math.ceil(w * k * RES);
    c.height = Math.ceil(h * k * RES);
    const ctx = c.getContext('2d');
    ctx.scale(k * RES, k * RES);
    ctx.translate(-x0, -y0);
    shapes.forEach((sh) => drawShape(ctx, sh));
    return { img: c, w: w * k, h: h * k, ax: (anchor[0] - x0) * k, ay: (anchor[1] - y0) * k, k, white: null };
}

// Silhouette blanche, pour le flash quand un monstre est touché
function whiteOf(spr) {
    if (!spr.white) {
        const c = document.createElement('canvas');
        c.width = spr.img.width;
        c.height = spr.img.height;
        const ctx = c.getContext('2d');
        ctx.drawImage(spr.img, 0, 0);
        ctx.globalCompositeOperation = 'source-in';
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, c.width, c.height);
        spr.white = c;
    }
    return spr.white;
}

export function drawSprite(ctx, spr, x, y, o = {}) {
    const { sx = 1, sy = 1, rot = 0, alpha = 1, flash = 0 } = o;
    ctx.save();
    ctx.translate(x, y);
    if (rot) ctx.rotate(rot);
    if (sx !== 1 || sy !== 1) ctx.scale(sx, sy);
    if (alpha !== 1) ctx.globalAlpha = alpha;
    ctx.drawImage(spr.img, -spr.ax, -spr.ay, spr.w, spr.h);
    if (flash > 0) {
        ctx.globalAlpha = alpha * Math.min(1, flash);
        ctx.drawImage(whiteOf(spr), -spr.ax, -spr.ay, spr.w, spr.h);
    }
    ctx.restore();
}

// ---------- Formes (identiques aux planches « Monstres » et « Objets ») ----------

const SNOWMAN = [
    { d: 'M160 108L126 88M134 93L124 100M134 93L132 82', s: '#8a5a3c', w: 4.5 },
    { d: 'M240 108L274 88M266 93L276 100M266 93L268 82', s: '#8a5a3c', w: 4.5 },
    { c: [200, 112, 40], f: '#f8fbff', s: '#b9cde3', w: 3 },
    { c: [200, 58, 27], f: '#f8fbff', s: '#b9cde3', w: 3 },
    { r: [178, 16, 44, 18, 3], f: '#8a94a8', rot: [-10, 200, 30] },
    { r: [174, 30, 52, 6, 3], f: '#6b7489', rot: [-10, 200, 30] },
    { r: [220, 20, 28, 6, 3], f: '#6b7489', rot: [-10, 200, 30] },
    { d: 'M182 44L196 51M218 44L204 51', s: '#1d2542', w: 4 },
    { c: [191, 56, 4.2], f: '#1d2542' },
    { c: [209, 56, 4.2], f: '#1d2542' },
    { d: 'M200 62L226 69L200 71Z', f: '#ff9f43' },
    { d: 'M188 77Q200 69 212 77', s: '#1d2542', w: 3 },
    { d: 'M174 82Q200 94 226 82L227 91Q200 103 173 91Z', f: '#3b82f6' },
    { d: 'M214 92L224 90L228 114L218 113Z', f: '#3b82f6' },
    { c: [200, 108, 3.8], f: '#1d2542' },
    { c: [200, 124, 3.8], f: '#1d2542' }
];

function bauble(main, band) {
    return [
        { c: [200, 38, 6], s: '#ffd36e', w: 3 },
        { r: [188, 42, 24, 14, 3], f: '#ffd36e' },
        { d: 'M188 47H212M188 52H212', s: '#c99a2e', w: 1.5, cap: 'butt' },
        { c: [200, 96, 42], f: main },
        { d: 'M160 84Q200 70 240 84', s: band, w: 5 },
        { d: 'M161 112Q200 126 239 112', s: band, w: 5 },
        { e: [180, 72, 9, 5], f: 'rgba(255,255,255,0.45)', rot: [-30, 180, 72] },
        { e: [186, 94, 9, 10], f: '#ffffff' },
        { e: [214, 94, 9, 10], f: '#ffffff' },
        { c: [190, 96, 4.5], f: '#111111' },
        { c: [218, 96, 4.5], f: '#111111' },
        { d: 'M180 108Q200 124 220 108Z', f: '#1d2542' },
        { d: 'M184 109L188 115L192 110L196 116L200 110L204 116L208 110L212 115L216 109', f: '#ffffff' }
    ];
}

const ELF = [
    { e: [236, 98, 27, 30], f: '#a0714f' },
    { d: 'M222 70Q236 62 250 70L246 78Q236 74 226 78Z', f: '#7a5238' },
    { d: 'M188 136L180 148H170Q166 144 172 142L180 132Z', f: '#2f9e6e' },
    { d: 'M208 136L216 148H226Q230 144 224 142L216 132Z', f: '#2f9e6e' },
    { e: [198, 116, 22, 24], f: '#e94b4b' },
    { r: [176, 116, 44, 7, 0], f: '#1d2542' },
    { r: [194, 115, 9, 9, 1.5], f: '#ffd36e' },
    { d: 'M216 102Q228 92 232 82', s: '#b9a6ff', w: 8 },
    { d: 'M168 66L150 54L172 76Z', f: '#b9a6ff' },
    { d: 'M228 66L246 54L224 76Z', f: '#b9a6ff' },
    { c: [198, 76, 24], f: '#b9a6ff' },
    { d: 'M174 68Q176 40 200 34Q226 30 250 14Q256 12 254 18Q240 40 222 62Z', f: '#2f9e6e' },
    { d: 'M174 66Q198 58 222 62L222 70Q198 66 174 74Z', f: 'rgba(255,255,255,0.9)' },
    { c: [255, 15, 6], f: '#ffd36e' },
    { d: 'M184 80Q190 75 196 80', s: '#1d2542', w: 3 },
    { d: 'M202 80Q208 75 214 80', s: '#1d2542', w: 3 },
    { d: 'M186 88Q200 98 212 86', s: '#1d2542', w: 3 },
    { c: [183, 88, 4], f: 'rgba(255,143,168,0.6)' },
    { c: [215, 88, 4], f: 'rgba(255,143,168,0.6)' }
];

const STAR = 'M200 6l4.4 9 9.9 1.4-7.2 7 1.7 9.8-8.8-4.6-8.8 4.6 1.7-9.8-7.2-7 9.9-1.4Z';
const FIR = [
    { r: [190, 128, 20, 24, 3], f: '#8a5a3c' },
    { d: 'M140 134L260 134L200 76Z', f: '#2f9e6e' },
    { d: 'M140 134L260 134L252 126Q200 136 148 126Z', f: 'rgba(255,255,255,0.85)' },
    { d: 'M152 102L248 102L200 48Z', f: '#38b27c' },
    { d: 'M152 102L248 102L241 95Q200 104 159 95Z', f: 'rgba(255,255,255,0.85)' },
    { d: 'M166 70L234 70L200 22Z', f: '#2f9e6e' },
    { d: 'M166 70L234 70L228 64Q200 72 172 64Z', f: 'rgba(255,255,255,0.85)' },
    { d: STAR, f: '#ffd36e', rot: [14, 200, 18] },
    { d: 'M180 74L194 80M220 74L206 80', s: '#1d2542', w: 4 },
    { c: [189, 84, 4.5], f: '#ffffff' },
    { c: [211, 84, 4.5], f: '#ffffff' },
    { c: [190, 85, 2.2], f: '#111111' },
    { c: [210, 85, 2.2], f: '#111111' },
    { e: [200, 96, 7, 5], f: '#1d2542' },
    { c: [166, 124, 5], f: '#e94b4b' },
    { c: [232, 120, 5], f: '#ffd36e' },
    { c: [178, 90, 4], f: '#3b82f6' },
    { c: [226, 58, 4], f: '#e94b4b' }
];

function icicle(down) {
    const wing = down ? { m: [1, 0, 0, -0.55, 0, 66 * 1.55] } : {};
    return [
        { d: 'M184 62L130 40L146 60L124 70L148 76L130 90L184 82Z', f: '#7fc3f0', ...wing },
        { d: 'M216 62L270 40L254 60L276 70L252 76L270 90L216 82Z', f: '#7fc3f0', ...wing },
        { d: 'M180 58Q200 36 220 58L206 128Q200 140 194 128Z', f: '#e3f4ff', s: '#7fc3f0', w: 3.5 },
        { d: 'M190 62Q194 54 200 52', s: '#ffffff', w: 3 },
        { d: 'M196 92L200 112', s: '#ffffff', w: 2.5 },
        { d: 'M188 58L212 66', s: '#1d2542', w: 3.5 },
        { c: [200, 74, 10], f: '#ffffff', s: '#7fc3f0', w: 1.5 },
        { c: [202, 75, 5], f: '#1d2542' },
        { c: [204, 73, 1.6], f: '#ffffff' }
    ];
}

const GOLEM = [
    { r: [160, 126, 32, 26, 6], f: '#7fc3f0' },
    { r: [208, 126, 32, 26, 6], f: '#7fc3f0' },
    { r: [108, 92, 38, 50, 12], f: '#9fd8ff' },
    { r: [254, 92, 38, 50, 12], f: '#9fd8ff' },
    { r: [148, 56, 104, 80, 14], f: '#9fd8ff' },
    { r: [116, 58, 44, 40, 10], f: '#cfeaff' },
    { r: [240, 58, 44, 40, 10], f: '#cfeaff' },
    { d: 'M166 70L176 84L170 98M236 112L226 122', s: '#ffffff', w: 2.5 },
    { r: [170, 20, 60, 42, 10], f: '#cfeaff' },
    { d: 'M174 22L180 4L186 22Z M194 22L200 -4L206 22Z M214 22L220 4L226 22Z', f: '#ffffff', s: '#b9dcf5', w: 1.5 },
    { r: [180, 36, 14, 6, 3], f: '#3b82f6' },
    { r: [206, 36, 14, 6, 3], f: '#3b82f6' },
    { d: 'M178 32L196 36M222 32L204 36', s: '#1d2542', w: 3.5 },
    { d: 'M186 52H214', s: '#1d2542', w: 3.5 },
    { d: 'M190 52V56M200 52V57M210 52V56', s: '#1d2542', w: 2.5 }
];

function gift(box, lid, ribbon, knot, extra = []) {
    return [
        { r: [22, 42, 52, 40, 5], f: box },
        ...extra,
        { r: [18, 32, 60, 14, 4], f: lid },
        { r: [44, 32, 8, 50, 0], f: ribbon },
        { e: [40, 27, 10, 6], f: ribbon, rot: [-22, 40, 27] },
        { e: [56, 27, 10, 6], f: ribbon, rot: [22, 56, 27] },
        { c: [48, 30, 4], f: knot }
    ];
}

const TRAP_OPEN = [
    { r: [22, 48, 52, 34, 5], f: '#7c5cff' },
    { d: 'M24 48Q48 60 72 48L72 54Q48 64 24 54Z', f: '#1d2542' },
    { d: 'M28 50L32 56L36 51L40 57L44 52L48 58L52 52L56 57L60 51L64 56L68 50', f: '#ffffff' },
    { r: [44, 58, 8, 24, 0], f: '#6ee7b7' },
    { r: [16, 28, 60, 14, 4], f: '#9b82ff', rot: [-14, 20, 40] },
    { r: [42, 28, 8, 14, 0], f: '#6ee7b7', rot: [-14, 20, 40] },
    { e: [36, 46, 4, 3], f: '#ffd36e' },
    { e: [58, 44, 4, 3], f: '#ffd36e' }
];

const COCOA = [
    { d: 'M36 28Q30 20 36 14M48 28Q42 20 48 12M60 28Q54 20 60 14', s: '#9fb3cc', w: 3 },
    { d: 'M66 48Q82 48 82 60Q82 72 66 72', s: '#e94b4b', w: 7 },
    { r: [22, 36, 48, 48, 10], f: '#e94b4b' },
    { e: [46, 38, 22, 6], f: '#7a4a2e' },
    { r: [34, 32, 10, 8, 3], f: '#ffffff' },
    { r: [48, 34, 9, 7, 3], f: '#ffe6f0' },
    { d: 'M30 60H62', s: '#ffffff', w: 4, dash: [1, 8] }
];

const STAR_S = 'M38 48l2 4 4.5 0.6-3.3 3.1 0.8 4.4-4-2.1-4 2.1 0.8-4.4-3.3-3.1 4.5-0.6Z';
const HAT = [
    { d: 'M22 64C22 30 74 30 74 64Z', f: '#7c5cff' },
    { r: [18, 60, 60, 14, 7], f: '#ffffff', s: '#c7d8ec', w: 2 },
    { c: [48, 28, 8], f: '#ffffff', s: '#c7d8ec', w: 2 },
    { d: STAR_S, f: '#ffd36e' },
    { d: 'M60 40l1.5 3 3.3 0.5-2.4 2.3 0.6 3.3-3-1.6-3 1.6 0.6-3.3-2.4-2.3 3.3-0.5Z', f: '#ffd36e' }
];

const SKATES = [
    { d: 'M34 18H54V50Q76 52 80 64V70H30Z', f: '#ffffff', s: '#9fb3cc', w: 2 },
    { d: 'M34 18H54V30H34Z', f: '#3b82f6' },
    { d: 'M54 36L44 40M54 44L44 48', s: '#9fb3cc', w: 2.5 },
    { r: [30, 70, 50, 6, 0], f: '#1d2542' },
    { d: 'M28 82H80Q88 82 86 76', s: '#5aaee6', w: 4 },
    { d: 'M38 76V82M70 76V82', s: '#5aaee6', w: 3 }
];

const MAGNET = [
    { d: 'M28 20V48Q28 68 48 68Q68 68 68 48V20', s: '#e94b4b', w: 14, cap: 'butt' },
    { r: [21, 12, 14, 12, 0], f: '#f4f7fb', s: '#9fb3cc', w: 1.5 },
    { r: [61, 12, 14, 12, 0], f: '#f4f7fb', s: '#9fb3cc', w: 1.5 },
    { d: 'M40 80Q48 86 56 80M36 88Q48 96 60 88', s: '#f2b84b', w: 3 }
];

const CANE = [
    { d: 'M40 84V34Q40 16 56 16Q72 16 72 32V36', s: '#b9cde3', w: 15 },
    { d: 'M40 84V34Q40 16 56 16Q72 16 72 32V36', s: '#ffffff', w: 12 },
    { d: 'M40 84V34Q40 16 56 16Q72 16 72 32V36', s: '#e94b4b', w: 12, dash: [7, 8], cap: 'butt' },
    { e: [32, 54, 9, 5], f: '#2f9e6e', rot: [-25, 32, 54] },
    { e: [48, 54, 9, 5], f: '#2f9e6e', rot: [25, 48, 54] },
    { c: [40, 55, 4], f: '#38b27c' }
];

// Décor (planche « Écran de jeu »)
const PINE = [
    { c: [0, 0, 30], f: '#2f9e6e' },
    { c: [-4, -6, 19], f: '#38b27c' },
    { c: [-12, -14, 5], f: '#ffffff' },
    { c: [8, 2, 4], f: '#ffffff' },
    { c: [10, -12, 3], f: 'rgba(255,255,255,0.8)' }
];
const ROCK = [
    { e: [0, 0, 22, 15], f: '#a9b6c8' },
    { e: [4, 4, 16, 9], f: '#97a5b9' },
    { e: [-6, -8, 12, 5], f: 'rgba(255,255,255,0.9)' }
];
const IGLOO = [
    { d: 'M118 572A62 54 0 0 1 242 572Z', f: '#f8fbff', s: '#b9cde3', w: 3 },
    { d: 'M128 548H232M144 528H216M180 518V528M160 528V548M200 528V548M150 548V572M180 548V572M210 548V572', s: '#c7d8ec', w: 2.5 },
    { d: 'M160 572A20 22 0 0 1 200 572Z', f: '#1d2542', a: 0.85 }
];
const FIRE_BASE = [
    { d: 'M-16 10L16 -8M-16 -8L16 10', s: '#8a5a3c', w: 6 },
    { c: [-22, 0, 6], f: '#9aa6b8' },
    { c: [22, 0, 6], f: '#9aa6b8' },
    { c: [0, 18, 6], f: '#9aa6b8' },
    { c: [-14, 14, 5.5], f: '#9aa6b8' },
    { c: [14, 14, 5.5], f: '#9aa6b8' },
    { c: [-14, -14, 5.5], f: '#9aa6b8' },
    { c: [14, -14, 5.5], f: '#9aa6b8' },
    { c: [0, -18, 5.5], f: '#9aa6b8' }
];

let cache = null;

export function getSprites() {
    if (cache) return cache;
    const giftBox = [14, 16, 68, 68];
    const giftAnchor = [48, 82];
    const bonusBox = [14, 8, 76, 90];
    const bonusAnchor = [48, 88];
    cache = {
        snowman: makeSprite({ box: [116, 4, 168, 152], anchor: [200, 152], k: 0.52, shapes: SNOWMAN }),
        bauble: makeSprite({ box: [154, 30, 92, 112], anchor: [200, 140], k: 0.5, shapes: bauble('#3b82f6', '#9fd8ff') }),
        baubleRed: makeSprite({ box: [154, 30, 92, 112], anchor: [200, 140], k: 0.5, shapes: bauble('#e94b4b', '#ff8fa8') }),
        elf: makeSprite({ box: [144, 6, 124, 146], anchor: [198, 150], k: 0.5, shapes: ELF }),
        fir: makeSprite({ box: [136, 2, 128, 152], anchor: [200, 152], k: 0.55, shapes: FIR }),
        icicleUp: makeSprite({ box: [120, 34, 160, 110], anchor: [200, 136], k: 0.5, shapes: icicle(false) }),
        icicleDown: makeSprite({ box: [120, 34, 160, 110], anchor: [200, 136], k: 0.5, shapes: icicle(true) }),
        golem: makeSprite({ box: [104, -8, 192, 162], anchor: [200, 152], k: 0.72, shapes: GOLEM }),
        golemMini: makeSprite({
            box: [104, -8, 192, 162],
            anchor: [200, 152],
            k: 0.32,
            shapes: [...GOLEM, { d: 'M200 86L212 100L200 114L188 100Z', f: '#ff5fa2' }]
        }),
        giftRed: makeSprite({ box: giftBox, anchor: giftAnchor, k: 0.46, shapes: gift('#e94b4b', '#ff6b6b', '#ffd36e', '#f2b84b') }),
        giftBlue: makeSprite({
            box: giftBox,
            anchor: giftAnchor,
            k: 0.46,
            shapes: gift('#3b82f6', '#5b9bff', '#ffffff', '#dcecfa', [
                { c: [32, 56, 3], f: '#9fd8ff' }, { c: [64, 70, 3], f: '#9fd8ff' },
                { c: [62, 52, 2.5], f: '#9fd8ff' }, { c: [32, 74, 2.5], f: '#9fd8ff' }
            ])
        }),
        giftGold: makeSprite({ box: giftBox, anchor: giftAnchor, k: 0.52, shapes: gift('#f2b84b', '#ffd36e', '#e94b4b', '#c73a3a') }),
        giftTrap: makeSprite({ box: giftBox, anchor: giftAnchor, k: 0.46, shapes: gift('#7c5cff', '#9b82ff', '#6ee7b7', '#4fc79a') }),
        trapOpen: makeSprite({ box: [12, 12, 72, 72], anchor: giftAnchor, k: 0.5, shapes: TRAP_OPEN }),
        cocoa: makeSprite({ box: bonusBox, anchor: bonusAnchor, k: 0.4, shapes: COCOA }),
        hat: makeSprite({ box: bonusBox, anchor: bonusAnchor, k: 0.4, shapes: HAT }),
        skates: makeSprite({ box: bonusBox, anchor: bonusAnchor, k: 0.4, shapes: SKATES }),
        magnet: makeSprite({ box: bonusBox, anchor: bonusAnchor, k: 0.4, shapes: MAGNET }),
        cane: makeSprite({ box: [28, 6, 56, 88], anchor: [40, 84], k: 0.5, shapes: CANE }),
        pine: makeSprite({ box: [-34, -36, 70, 70], anchor: [0, 0], k: 1, shapes: PINE }),
        rock: makeSprite({ box: [-24, -18, 48, 34], anchor: [0, 0], k: 1, shapes: ROCK }),
        igloo: makeSprite({ box: [114, 514, 132, 62], anchor: [180, 572], k: 1.3, shapes: IGLOO }),
        fireBase: makeSprite({ box: [-30, -26, 60, 52], anchor: [0, 0], k: 1, shapes: FIRE_BASE })
    };
    return cache;
}

// Petites icônes de l'interface (cadeau, cœur…) dessinées à la volée
export const ICONS = {
    heart: new Path2D('M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z')
};
