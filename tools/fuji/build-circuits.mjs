// Fabrique les données des 10 nouveaux circuits pour col-du-fuji.html : points de contrôle (départ au début de la plus
// longue ligne droite), centre du terrain, lac, direction du Fuji, pagode, allée de torii. Écrit circuits.json.
import { turtle } from './turtle.mjs';
import { build, metrics } from './track.mjs';
import { DESIGNS } from './designs.mjs';
import fs from 'fs';
const out = [];
for (const d of DESIGNS) {
  const r = turtle({ cmds: d.cmds, profile: d.profile });
  let CP = r.CP;
  // départ : 40 % dans la plus longue portion presque droite (courbure faible), la ligne d'arrivée y est aussi
  let T = build(CP);
  let best = { len: 0, i: 0 }, cur = 0, st = 0;
  for (let k = 0; k < 2 * T.N; k++) { const i = k % T.N; if (Math.abs(T.K[i]) < 0.004) { if (!cur) st = k; cur++; if (cur > best.len && cur <= T.N) best = { len: cur, i: st }; } else cur = 0; }
  const sStart = ((best.i + Math.floor(best.len * 0.4)) % T.N) * T.ds;
  // point de contrôle le plus proche de ce départ : on fait tourner la liste
  let ci = 0, cd = 1e9;
  const sx = T.X[Math.round(sStart / T.ds) % T.N], sz = T.Z[Math.round(sStart / T.ds) % T.N];
  CP.forEach((p, i) => { const dd = Math.hypot(p[0] - sx, p[1] - sz); if (dd < cd) { cd = dd; ci = i; } });
  // translation : le départ en (0, 0) comme le circuit d'origine
  const [ox, oz] = [CP[ci][0], CP[ci][1]];
  CP = [...CP.slice(ci), ...CP.slice(0, ci)].map(([x, z, y]) => [Math.round(x - ox), Math.round(z - oz), Math.round(y * 10) / 10]);
  T = build(CP);
  const m0 = metrics(T, null);
  const h0 = T.PHI[0];
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (let i = 0; i < T.N; i++) { x0 = Math.min(x0, T.X[i]); x1 = Math.max(x1, T.X[i]); z0 = Math.min(z0, T.Z[i]); z1 = Math.max(z1, T.Z[i]); }
  const cx = Math.round((x0 + x1) / 2), cz = Math.round((z0 + z1) / 2);
  const minRoad = (x, z) => { let b = 1e9; for (let i = 0; i < T.N; i += 2) b = Math.min(b, Math.hypot(T.X[i] - x, T.Z[i] - z)); return b; };
  const inside = (x, z) => { let c = false; for (let i = 0, j = T.N - 1; i < T.N; j = i++) { if (((T.Z[i] > z) !== (T.Z[j] > z)) && x < (T.X[j] - T.X[i]) * (z - T.Z[i]) / (T.Z[j] - T.Z[i]) + T.X[i]) c = !c; } return c; };
  const fujiAz = +(h0 + d.fuji).toFixed(3);
  // le lac
  let lake;
  if (d.lake === 'inside') {
    // centre : le point intérieur le plus loin de la route
    let bp = null; for (let x = x0; x <= x1; x += 10) for (let z = z0; z <= z1; z += 10) if (inside(x, z)) { const dd = minRoad(x, z); if (!bp || dd > bp.d) bp = { x, z, d: dd }; }
    lake = { x: bp.x, z: bp.z, r: Math.round(bp.d - 80) };
  } else {
    const az = d.lake === 'left' ? h0 - Math.PI / 2 : fujiAz;
    const r0 = 380, dir = [Math.sin(az), -Math.cos(az)];
    const ref = d.lake === 'left' ? [T.X[Math.round(150 / T.ds)], T.Z[Math.round(150 / T.ds)]] : [cx, cz];
    let dist = 100; while (minRoad(ref[0] + dir[0] * dist, ref[1] + dir[1] * dist) < r0 + 90) dist += 10;
    lake = { x: Math.round(ref[0] + dir[0] * dist), z: Math.round(ref[1] + dir[1] * dist), r: r0 };
  }
  // la pagode : le point intérieur le plus éloigné de la route (s'il y a la place)
  let pagoda = null; { let bp = null; for (let x = x0; x <= x1; x += 10) for (let z = z0; z <= z1; z += 10) if (inside(x, z) && Math.hypot(x - lake.x, z - lake.z) > lake.r + 60) { const dd = minRoad(x, z); if (!bp || dd > bp.d) bp = { x, z, d: dd }; } if (bp && bp.d > 45) pagoda = [bp.x, bp.z]; }
  if (d.lake === 'inside') pagoda = null; // le lac est déjà au milieu : la pagode irait dans l'eau
  const m = metrics(T, lake);
  out.push({ id: d.id, name: d.name, blurb: d.blurb, cp: CP, fujiAz, center: [cx, cz], lake: { ...lake, level: 30 }, pagoda, torii: d.torii ? [30, Math.round(30 + 0.6 * best.len * T.ds - 50)] : null, L: m.L, metrics: m });
  console.log(d.id, d.name.padEnd(26), 'L', m.L, 'rMin', m.rMin, 'pente', m.pente, 'écart', m.ecartMin, 'lac', m.lac, 'm', 'départ: droite de', Math.round(best.len * T.ds), 'm', 'pagode', pagoda, 'CP', CP.length);
}
fs.writeFileSync('circuits.json', JSON.stringify(out));
fs.writeFileSync('tracks2.json', JSON.stringify(out.map((c) => { const T = build(c.cp); return { id: c.id, name: c.name, L: c.L, rMin: c.metrics.rMin, ecartMin: c.metrics.ecartMin, y: c.metrics.y, lake: c.lake, pagoda: c.pagoda, X: [...T.X], Z: [...T.Z], Y: [...T.Y], K: [...T.K] }; })));
