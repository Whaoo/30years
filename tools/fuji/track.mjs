// Reproduit la construction du circuit de col-du-fuji.html (spline de Catmull-Rom fermée, courbure, vitesse idéale)
// et mesure ce qui compte : longueur, rayon minimal, pentes, croisements, distance au lac, temps idéal.
export const W = 12;
const lerp = (a, b, t) => a + (b - a) * t, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
export function build(CP) {
  const cr = (a, b, c, d, t) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
  const fine = []; const n = CP.length;
  for (let i = 0; i < n; i++) { const p0 = CP[(i + n - 1) % n], p1 = CP[i], p2 = CP[(i + 1) % n], p3 = CP[(i + 2) % n]; for (let k = 0; k < 120; k++) { const t = k / 120; fine.push([cr(p0[0], p1[0], p2[0], p3[0], t), cr(p0[1], p1[1], p2[1], p3[1], t), cr(p0[2], p1[2], p2[2], p3[2], t)]); } }
  const cum = [0];
  for (let i = 1; i <= fine.length; i++) { const a = fine[i - 1], b = fine[i % fine.length]; cum.push(cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1])); }
  const L = cum[fine.length], N = Math.round(L / 2), ds = L / N;
  const X = new Float64Array(N), Z = new Float64Array(N), Y = new Float64Array(N), PHI = new Float64Array(N), K = new Float64Array(N);
  let j = 0;
  for (let i = 0; i < N; i++) { const s = i * ds; while (cum[j + 1] < s) j++; const t = (s - cum[j]) / (cum[j + 1] - cum[j]), a = fine[j], b = fine[(j + 1) % fine.length]; X[i] = lerp(a[0], b[0], t); Z[i] = lerp(a[1], b[1], t); Y[i] = lerp(a[2], b[2], t); }
  for (let i = 0; i < N; i++) { const a = (i + N - 1) % N, b = (i + 1) % N; PHI[i] = Math.atan2(X[b] - X[a], -(Z[b] - Z[a])); }
  const k0 = new Float64Array(N);
  for (let i = 0; i < N; i++) k0[i] = angDiff(PHI[(i + 1) % N], PHI[(i + N - 1) % N]) / (2 * ds);
  for (let i = 0; i < N; i++) { let s = 0; for (let q = -3; q <= 3; q++) s += k0[(i + q + N) % N]; K[i] = s / 7; }
  const VP = new Float64Array(N);
  for (let i = 0; i < N; i++) VP[i] = Math.min(62, 1.75 / (Math.abs(K[i]) + 0.0147));
  for (let pass = 0; pass < 2; pass++) for (let i = N - 1; i >= 0; i--) VP[i] = Math.min(VP[i], Math.sqrt(VP[(i + 1) % N] ** 2 + 2 * 16 * ds));
  for (let pass = 0; pass < 2; pass++) for (let i = 0; i < N; i++) VP[(i + 1) % N] = Math.min(VP[(i + 1) % N], Math.sqrt(VP[i] ** 2 + 2 * 5 * ds));
  return { L, N, ds, X, Z, Y, PHI, K, VP };
}
export function metrics(T, lake) {
  const { N, ds, X, Z, Y, K, VP } = T;
  let maxK = 0, maxSlope = 0, minY = 1e9, maxY = -1e9, tIdeal = 0, sharp = 0;
  for (let i = 0; i < N; i++) {
    maxK = Math.max(maxK, Math.abs(K[i]));
    maxSlope = Math.max(maxSlope, Math.abs(Y[(i + 1) % N] - Y[i]) / ds);
    minY = Math.min(minY, Y[i]); maxY = Math.max(maxY, Y[i]);
    tIdeal += ds / VP[i];
    if (Math.abs(K[i]) > 0.03 && Math.abs(K[(i + N - 1) % N]) <= 0.03) sharp++;
  }
  // deux morceaux de route éloignés le long du tracé mais proches à vol d'oiseau = croisement ou chevauchement
  let minGap = 1e9, where = null;
  const skip = Math.round(90 / ds);
  for (let i = 0; i < N; i += 2) for (let k = i + skip; k < N; k += 2) {
    if (N - (k - i) < skip) continue;
    const d = Math.hypot(X[i] - X[k], Z[i] - Z[k]);
    if (d < minGap) { minGap = d; where = [i * ds | 0, k * ds | 0, Math.abs(Y[i] - Y[k]) | 0]; }
  }
  let lakeGap = 1e9;
  if (lake) for (let i = 0; i < N; i++) lakeGap = Math.min(lakeGap, Math.hypot(X[i] - lake.x, Z[i] - lake.z) - lake.r);
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
  for (let i = 0; i < N; i++) { x0 = Math.min(x0, X[i]); x1 = Math.max(x1, X[i]); z0 = Math.min(z0, Z[i]); z1 = Math.max(z1, Z[i]); }
  return { L: Math.round(T.L), rMin: Math.round(1 / maxK), pente: +(maxSlope * 100).toFixed(1), y: [Math.round(minY), Math.round(maxY)], virages: sharp, tour: +tIdeal.toFixed(1), ecartMin: Math.round(minGap), ou: where, lac: Math.round(lakeGap), boite: [Math.round(x0), Math.round(x1), Math.round(z0), Math.round(z1)] };
}
