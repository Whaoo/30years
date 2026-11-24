// QR code minimal, sans dépendance (le site n'a pas de bibliothèque QR) : texte en octets UTF-8,
// correction d'erreur M (15 %), versions 1 à 10 (jusqu'à 213 octets, largement assez pour une adresse).
// Suit la norme ISO/IEC 18004 : motifs de repérage, Reed-Solomon dans GF(256), entrelacement des blocs,
// les 8 masques essayés et le moins pénalisé gardé. qrMatrix(texte) -> tableau de lignes de booléens (true = noir).

// par version (index 1 à 10), niveau M : octets de correction par bloc et nombre de blocs
const ECC_PER_BLOCK = [0, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26];
const BLOCKS = [0, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5];
const FORMAT_M = 0; // bits de niveau dans les infos de format (L=1, M=0, Q=3, H=2)

function rawModules(ver) {
    let r = (16 * ver + 128) * ver + 64;
    if (ver >= 2) {
        const n = Math.floor(ver / 7) + 2;
        r -= (25 * n - 10) * n - 55;
        if (ver >= 7) r -= 36;
    }
    return r;
}
const dataCodewords = (ver) => Math.floor(rawModules(ver) / 8) - ECC_PER_BLOCK[ver] * BLOCKS[ver];

// ---- Reed-Solomon dans GF(2^8), polynôme 0x11D
function gfMul(x, y) {
    let z = 0;
    for (let i = 7; i >= 0; i--) {
        z = (z << 1) ^ ((z >>> 7) * 0x11d);
        z ^= ((y >>> i) & 1) * x;
    }
    return z & 0xff;
}
function rsDivisor(degree) {
    const r = new Array(degree).fill(0);
    r[degree - 1] = 1;
    let root = 1;
    for (let i = 0; i < degree; i++) {
        for (let j = 0; j < degree; j++) {
            r[j] = gfMul(r[j], root);
            if (j + 1 < degree) r[j] ^= r[j + 1];
        }
        root = gfMul(root, 2);
    }
    return r;
}
function rsRemainder(data, div) {
    const r = div.map(() => 0);
    for (const b of data) {
        const f = b ^ r.shift();
        r.push(0);
        div.forEach((c, i) => { r[i] ^= gfMul(c, f); });
    }
    return r;
}

function utf8(text) {
    const out = [];
    for (const ch of text) {
        let c = ch.codePointAt(0);
        if (c < 0x80) out.push(c);
        else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
        else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
        else out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    }
    return out;
}

export function qrMatrix(text) {
    const bytes = utf8(text);
    let ver = 1;
    const countBits = (v) => (v < 10 ? 8 : 16);
    while (ver <= 10 && 4 + countBits(ver) + bytes.length * 8 > dataCodewords(ver) * 8) ver++;
    if (ver > 10) throw new Error('Texte trop long pour le QR code');

    // ---- flux de bits : mode octet (0100), longueur, données, terminateur, bourrage
    const bits = [];
    const put = (val, len) => { for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
    put(4, 4);
    put(bytes.length, countBits(ver));
    bytes.forEach((b) => put(b, 8));
    const cap = dataCodewords(ver) * 8;
    put(0, Math.min(4, cap - bits.length));
    put(0, (8 - (bits.length % 8)) % 8);
    for (let pad = 0xec; bits.length < cap; pad ^= 0xec ^ 0x11) put(pad, 8);
    const data = [];
    for (let i = 0; i < bits.length; i += 8) data.push(bits.slice(i, i + 8).reduce((a, b) => (a << 1) | b, 0));

    // ---- blocs + correction, puis entrelacement
    const nb = BLOCKS[ver];
    const eccLen = ECC_PER_BLOCK[ver];
    const raw = Math.floor(rawModules(ver) / 8);
    const nShort = nb - (raw % nb);
    const shortLen = Math.floor(raw / nb);
    const div = rsDivisor(eccLen);
    const blocks = [];
    for (let i = 0, k = 0; i < nb; i++) {
        const dat = data.slice(k, k + shortLen - eccLen + (i < nShort ? 0 : 1));
        k += dat.length;
        const ecc = rsRemainder(dat, div);
        if (i < nShort) dat.push(0);
        blocks.push(dat.concat(ecc));
    }
    const codewords = [];
    for (let i = 0; i < blocks[0].length; i++) {
        blocks.forEach((b, j) => { if (i !== shortLen - eccLen || j >= nShort) codewords.push(b[i]); });
    }

    // ---- matrice : motifs fixes
    const size = ver * 4 + 17;
    const mod = Array.from({ length: size }, () => new Array(size).fill(false));
    const fn = Array.from({ length: size }, () => new Array(size).fill(false));
    const set = (x, y, dark) => { mod[y][x] = dark; fn[y][x] = true; };
    for (let i = 0; i < size; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
    const finder = (cx, cy) => {
        for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
            const x = cx + dx, y = cy + dy;
            if (x < 0 || y < 0 || x >= size || y >= size) continue;
            const d = Math.max(Math.abs(dx), Math.abs(dy));
            set(x, y, d !== 2 && d !== 4);
        }
    };
    finder(3, 3); finder(size - 4, 3); finder(3, size - 4);
    if (ver >= 2) {
        const n = Math.floor(ver / 7) + 2;
        const step = Math.ceil((ver * 4 + 4) / (n * 2 - 2)) * 2;
        const pos = [6];
        for (let p = size - 7; pos.length < n; p -= step) pos.splice(1, 0, p);
        pos.forEach((y, i) => pos.forEach((x, j) => {
            if ((i === 0 && j === 0) || (i === 0 && j === n - 1) || (i === n - 1 && j === 0)) return;
            for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(x + dx, y + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
        }));
    }
    const drawFormat = (mask) => {
        const d = (FORMAT_M << 3) | mask;
        let rem = d;
        for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
        const b = ((d << 10) | rem) ^ 0x5412;
        const bit = (i) => ((b >>> i) & 1) === 1;
        for (let i = 0; i <= 5; i++) set(8, i, bit(i));
        set(8, 7, bit(6)); set(8, 8, bit(7)); set(7, 8, bit(8));
        for (let i = 9; i < 15; i++) set(14 - i, 8, bit(i));
        for (let i = 0; i < 8; i++) set(size - 1 - i, 8, bit(i));
        for (let i = 8; i < 15; i++) set(8, size - 15 + i, bit(i));
        set(8, size - 8, true);
    };
    drawFormat(0); // réserve les cases ; réécrit avec le bon masque à la fin
    if (ver >= 7) {
        let rem = ver;
        for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
        const b = (ver << 12) | rem;
        for (let i = 0; i < 18; i++) {
            const dark = ((b >>> i) & 1) === 1;
            const a = size - 11 + (i % 3), c = Math.floor(i / 3);
            set(a, c, dark); set(c, a, dark);
        }
    }

    // ---- données en zigzag, deux colonnes à la fois, de droite à gauche
    let i = 0;
    for (let right = size - 1; right >= 1; right -= 2) {
        if (right === 6) right = 5;
        for (let v = 0; v < size; v++) for (let j = 0; j < 2; j++) {
            const x = right - j;
            const y = ((right + 1) & 2) === 0 ? size - 1 - v : v;
            if (!fn[y][x] && i < codewords.length * 8) {
                mod[y][x] = ((codewords[i >>> 3] >>> (7 - (i & 7))) & 1) === 1;
                i++;
            }
        }
    }

    // ---- masques
    const MASKS = [
        (x, y) => (x + y) % 2 === 0,
        (x, y) => y % 2 === 0,
        (x) => x % 3 === 0,
        (x, y) => (x + y) % 3 === 0,
        (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
        (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
        (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
        (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
    ];
    const applyMask = (m) => {
        for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!fn[y][x] && MASKS[m](x, y)) mod[y][x] = !mod[y][x];
    };
    const penalty = () => {
        let p = 0;
        const line = (get) => {
            for (let a = 0; a < size; a++) {
                let run = 1;
                for (let b = 1; b <= size; b++) {
                    if (b < size && get(a, b) === get(a, b - 1)) run++;
                    else { if (run >= 5) p += run - 2; run = 1; }
                }
                // motif proche des repères : 1011101 avec 4 cases claires d'un côté
                for (let b = 0; b + 11 <= size; b++) {
                    const s = Array.from({ length: 11 }, (_, k) => (get(a, b + k) ? 1 : 0)).join('');
                    if (s === '10111010000' || s === '00001011101') p += 40;
                }
            }
        };
        line((a, b) => mod[a][b]);
        line((a, b) => mod[b][a]);
        let dark = 0;
        for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
            if (mod[y][x]) dark++;
            if (x < size - 1 && y < size - 1) {
                const c = mod[y][x];
                if (c === mod[y][x + 1] && c === mod[y + 1][x] && c === mod[y + 1][x + 1]) p += 3;
            }
        }
        const total = size * size;
        p += (Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1) * 10;
        return p;
    };
    let best = 0, bestP = Infinity;
    for (let m = 0; m < 8; m++) {
        applyMask(m);
        drawFormat(m);
        const p = penalty();
        if (p < bestP) { bestP = p; best = m; }
        applyMask(m);
    }
    applyMask(best);
    drawFormat(best);
    return mod;
}

// Chemin SVG (une case = 1 unité) avec la marge blanche de 4 cases demandée par la norme
export function qrSvgPath(matrix, margin = 4) {
    let d = '';
    matrix.forEach((row, y) => row.forEach((dark, x) => { if (dark) d += `M${x + margin} ${y + margin}h1v1h-1z`; }));
    return { d, size: matrix.length + margin * 2 };
}
