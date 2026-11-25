// Tracé « à la tortue » : lignes droites et arcs de rayon donné (+ à droite), fermé exactement en ajustant deux lignes droites.
// Renvoie des points de contrôle tous les ~24 m avec l'altitude d'un profil (clés [fraction, y] lissées).
const rad = (d) => d * Math.PI / 180;
function walk(cmds, h0, lens) {
  let x = 0, z = 0, h = h0; const pts = [[0, 0]]; let total = 0;
  cmds.forEach((c, i) => {
    if (c[0] === 'S') { const L = lens[i] ?? c[1]; const n = Math.max(1, Math.round(L / 6)); for (let k = 1; k <= n; k++) { x += Math.sin(h) * L / n; z -= Math.cos(h) * L / n; pts.push([x, z]); } total += L; }
    else { const a = rad(c[1]), R = c[2], L = Math.abs(a) * R, n = Math.max(2, Math.round(L / 4)); for (let k = 1; k <= n; k++) { h += a / n; x += Math.sin(h - a / n / 2) * L / n; z -= Math.cos(h - a / n / 2) * L / n; pts.push([x, z]); } total += L; }
  });
  return { pts, x, z, h, total };
}
export function turtle({ cmds, h0 = Math.PI / 2, adj, profile, step = 24 }) {
  adj = adj || cmds.map((c, i) => (c[0] === 'S' && c[2] === 'adj' ? i : -1)).filter((i) => i >= 0);
  if (adj.length !== 2) throw new Error('il faut deux droites ajustables, pas ' + adj.length);
  const turn = cmds.filter((c) => c[0] === 'T').reduce((s, c) => s + c[1], 0);
  if (Math.abs(Math.abs(turn) - 360) > 0.01) throw new Error('virages : ' + turn + '° au lieu de ±360°');
  // fermeture : la fin dépend linéairement de la longueur des deux lignes droites ajustables
  const base = {}; adj.forEach((i) => { base[i] = cmds[i][1]; });
  const end = (l1, l2) => { const r = walk(cmds, h0, { [adj[0]]: l1, [adj[1]]: l2 }); return [r.x, r.z]; };
  const e0 = end(base[adj[0]], base[adj[1]]), e1 = end(base[adj[0]] + 1, base[adj[1]]), e2 = end(base[adj[0]], base[adj[1]] + 1);
  const a = e1[0] - e0[0], b = e2[0] - e0[0], c = e1[1] - e0[1], d = e2[1] - e0[1], det = a * d - b * c;
  if (Math.abs(det) < 0.05) throw new Error('les deux droites ajustables sont parallèles');
  const dl1 = (-e0[0] * d + e0[1] * b) / det, dl2 = (-e0[1] * a + e0[0] * c) / det;
  const l1 = base[adj[0]] + dl1, l2 = base[adj[1]] + dl2;
  if (!(l1 >= 15 && l2 >= 15 && l1 < 3000 && l2 < 3000)) throw new Error(`fermeture impossible : droites ${l1.toFixed(0)} et ${l2.toFixed(0)} m`);
  const r = walk(cmds, h0, { [adj[0]]: l1, [adj[1]]: l2 });
  // échantillonnage régulier le long du chemin
  const P = r.pts; const cum = [0]; for (let i = 1; i < P.length; i++) cum.push(cum[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
  const L = cum[cum.length - 1], n = Math.round(L / step), out = [];
  const keys = profile;
  const yAt = (f) => { for (let i = 0; i < keys.length - 1; i++) { const [f0, y0] = keys[i], [f1, y1] = keys[i + 1]; if (f >= f0 && f <= f1) { const t = (f - f0) / (f1 - f0 || 1), s = t * t * (3 - 2 * t); return y0 + (y1 - y0) * s; } } return keys[keys.length - 1][1]; };
  let j = 0;
  for (let k = 0; k < n; k++) { const s = k * L / n; while (cum[j + 1] < s) j++; const t = (s - cum[j]) / (cum[j + 1] - cum[j]); out.push([Math.round((P[j][0] + (P[j + 1][0] - P[j][0]) * t) * 10) / 10, Math.round((P[j][1] + (P[j + 1][1] - P[j][1]) * t) * 10) / 10, Math.round(yAt(k / n) * 10) / 10]); }
  return { CP: out, closeGap: Math.hypot(r.x, r.z), adjLens: [Math.round(l1), Math.round(l2)], L: Math.round(L) };
}
