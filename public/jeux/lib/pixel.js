/* Moteur commun des jeux du jour en 3D « pixel » (Vol du soir, Col du Fuji ont le leur, plus ancien) :
   rendu three.js en basse résolution, palette + tramage de Bayer, ATH en police 3×5, messages, pas fixe,
   son minimal, record local et envoi du score au site (postMessage). Chargé après lib/three.min.js.
   Les pages gardent la même structure HTML (#app > #stage > canvas#gl + canvas#hud, .over > .card, .bar). */
(function () {
  'use strict';
  const TAU = Math.PI * 2;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const mod = (a, n) => ((a % n) + n) % n;
  const angDiff = (a, b) => mod(a - b + Math.PI, TAU) - Math.PI;
  function hash2(x, y, s) {
    let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  function vnoise(u, v, L, s) {
    const x = u * L, y = v * L, i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j;
    const a = hash2(mod(i, L), mod(j, L), s), b = hash2(mod(i + 1, L), mod(j, L), s), c = hash2(mod(i, L), mod(j + 1, L), s), d = hash2(mod(i + 1, L), mod(j + 1, L), s);
    const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    return lerp(lerp(a, b, ux), lerp(c, d, ux), uy);
  }
  function fbm(u, v, L, oct, s) { let sum = 0, amp = 0.5, norm = 0; for (let k = 0; k < oct; k++) { sum += amp * vnoise(u, v, L << k, s + k * 13); norm += amp; amp *= 0.5; } return sum / norm; }
  // générateur reproductible (mulberry32)
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  // la date de Paris (AAAA-MM-JJ) et une graine du jour : même partie pour tout le monde le même jour
  function parisDay(d) { return new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d || new Date()); }
  function daySeed(salt) { const s = parisDay() + ':' + (salt || ''); let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; }
  const hex = (h) => [(h >> 16) & 255, (h >> 8) & 255, h & 255];
  const css = (c) => '#' + c.toString(16).padStart(6, '0');

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* navigation privée */ } }
  };
  // dans le site (cadre de la fenêtre de jeu) : le score part au classement
  const EMBED = window.parent !== window;
  function report(game, score) {
    if (!EMBED || !(score > 0)) return;
    try { window.parent.postMessage({ type: '30years:score', game, score: Math.round(score) }, window.location.origin); } catch (e) { /* autre origine */ }
  }

  // ---------------------------------------------------------------- rendu : scène en basse résolution, palette, tramage
  function view(opts) {
    const stage = opts.stage, glCanvas = opts.gl, hudCanvas = opts.hud;
    const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(1);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(opts.fov || 60, 16 / 9, opts.near || 0.3, opts.far || 6000);
    camera.rotation.order = 'YXZ';
    const PAL = opts.palette;
    const palArr = new Float32Array(PAL.length * 3);
    PAL.forEach((c, i) => { palArr[i * 3] = ((c >> 16) & 255) / 255; palArr[i * 3 + 1] = ((c >> 8) & 255) / 255; palArr[i * 3 + 2] = (c & 255) / 255; });
    const v = { RW: 640, RH: 360, px: 1 };
    const rt = new THREE.WebGLRenderTarget(v.RW, v.RH, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: true });
    const postScene = new THREE.Scene(), postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const postMat = new THREE.ShaderMaterial({
      uniforms: { src: { value: rt.texture }, pal: { value: palArr }, dither: { value: opts.dither == null ? 0.075 : opts.dither } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: `uniform sampler2D src; uniform vec3 pal[${PAL.length}]; uniform float dither; varying vec2 vUv;
        float b2(vec2 a){ a = floor(a); return fract(dot(a, vec2(0.5, a.y * 0.75))); }
        float bayer(vec2 a){ return b2(0.5 * a) * 0.25 + b2(a); }
        void main(){
          vec3 c = texture2D(src, vUv).rgb + (bayer(gl_FragCoord.xy) - 0.5) * dither;
          float best = 1e9; vec3 bc = c;
          for (int i = 0; i < ${PAL.length}; i++) { vec3 d = c - pal[i]; float dd = dot(d * d, vec3(0.30, 0.52, 0.18)); if (dd < best) { best = dd; bc = pal[i]; } }
          gl_FragColor = vec4(bc, 1.0);
        }`
    });
    postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMat));
    const hud = hudCanvas.getContext('2d');
    function resize() {
      const sw = stage.clientWidth || 1, sh = stage.clientHeight || 1;
      v.px = clamp(Math.round(sw / (opts.target || 600)), 1, 4);
      v.RW = Math.ceil(sw / v.px); v.RH = Math.ceil(sh / v.px);
      renderer.setSize(v.RW, v.RH, false); rt.setSize(v.RW, v.RH);
      hudCanvas.width = v.RW; hudCanvas.height = v.RH;
      camera.aspect = v.RW / v.RH; camera.updateProjectionMatrix();
      if (opts.onResize) opts.onResize(v);
    }
    new ResizeObserver(resize).observe(stage);
    resize();
    function render() {
      renderer.setRenderTarget(rt); renderer.render(scene, camera);
      renderer.setRenderTarget(null); renderer.render(postScene, postCam);
      hud.clearRect(0, 0, v.RW, v.RH);
    }
    // écran → coordonnées de la scène basse résolution
    function toLow(clientX, clientY) { const r = stage.getBoundingClientRect(); return [(clientX - r.left) / v.px, (clientY - r.top) / v.px]; }
    Object.assign(v, { renderer, scene, camera, rt, hud, render, resize, toLow, postMat });
    return v;
  }

  // ---------------------------------------------------------------- brouillard commun aux matériaux faits main
  function fog(o) {
    const u = { fogNear: { value: o.near }, fogFar: { value: o.far }, haze: { value: v3(o.haze) }, camPos: { value: new THREE.Vector3() }, sunDir: { value: o.sun } };
    return u;
  }
  const GLSL = {
    hash: 'float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }',
    fog: 'float fogK(vec3 w){ return pow(smoothstep(fogNear, fogFar, length(w - camPos)), 0.8); }',
    noise: `float vn2(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f);
      return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x), mix(hash12(i + vec2(0.0, 1.0)), hash12(i + 1.0), u.x), u.y); }`
  };
  function v3(h) { return new THREE.Vector3(((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255); }

  // ---------------------------------------------------------------- décor fusionné (une seule géométrie colorée par sommet)
  function mergeParts(parts) {
    let n = 0;
    const gs = parts.map((p) => { const g = p.geo.index ? p.geo.toNonIndexed() : p.geo.clone(); g.applyMatrix4(p.m); n += g.attributes.position.count; return g; });
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3);
    let o = 0;
    gs.forEach((g, i) => {
      const c = new THREE.Color(parts[i].c), cnt = g.attributes.position.count;
      pos.set(g.attributes.position.array, o * 3);
      if (g.attributes.normal) nor.set(g.attributes.normal.array, o * 3);
      for (let k = 0; k < cnt; k++) { col[(o + k) * 3] = c.r; col[(o + k) * 3 + 1] = c.g; col[(o + k) * 3 + 2] = c.b; }
      o += cnt; g.dispose();
    });
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); out.setAttribute('color', new THREE.BufferAttribute(col, 3));
    out.computeBoundingSphere();
    return out;
  }
  const GEO = {
    BOX: new THREE.BoxGeometry(1, 1, 1), ICO: new THREE.IcosahedronGeometry(1, 0), CONE4: new THREE.ConeGeometry(1, 1, 4),
    CONE7: new THREE.ConeGeometry(1, 1, 7), CYL: new THREE.CylinderGeometry(1, 1, 1, 8), SPH: new THREE.SphereGeometry(1, 8, 6)
  };
  // matrice : position, rotation Y, puis décalage local et échelle
  function mtx(x, y, z, ry, sx, sy, sz, lx, ly, lz) {
    const m = new THREE.Matrix4().makeTranslation(x, y, z).multiply(new THREE.Matrix4().makeRotationY(ry || 0));
    if (lx || ly || lz) m.multiply(new THREE.Matrix4().makeTranslation(lx || 0, ly || 0, lz || 0));
    return m.multiply(new THREE.Matrix4().makeScale(sx, sy == null ? sx : sy, sz == null ? sx : sz));
  }
  function litMesh(parts, flat) {
    return new THREE.Mesh(mergeParts(parts), new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: flat !== false }));
  }
  function glowMesh(parts) { return new THREE.Mesh(mergeParts(parts), new THREE.MeshBasicMaterial({ vertexColors: true })); }

  // ---------------------------------------------------------------- petites fumées, éclats, confettis
  function puffs(scene, n) {
    const dot = (() => { const c = document.createElement('canvas'); c.width = c.height = 16; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.beginPath(); g.arc(8, 8, 7.5, 0, TAU); g.fill(); const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; return t; })();
    const list = [];
    for (let i = 0; i < n; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: dot, transparent: true, depthWrite: false })); s.visible = false; s.userData = { life: 0, max: 1, s0: 1, s1: 1, c0: new THREE.Color(), c1: new THREE.Color(), vel: new THREE.Vector3(), grav: 0 }; scene.add(s); list.push(s); }
    let k = 0;
    return {
      emit(p, s0, s1, life, c0, c1, vel, grav) {
        const s = list[k = (k + 1) % list.length]; s.visible = true; s.position.copy(p);
        const u = s.userData; u.life = 0; u.max = life; u.s0 = s0; u.s1 = s1; u.c0.set(c0); u.c1.set(c1); u.grav = grav || 0;
        if (vel) u.vel.copy(vel); else u.vel.set(0, 0, 0);
        s.scale.setScalar(s0);
      },
      confetti(p, cols, n2) { for (let i = 0; i < n2; i++) { const c = cols[i % cols.length]; this.emit(p, 0.35, 0.25, 1 + Math.random(), c, c, new THREE.Vector3((Math.random() - 0.5) * 6, 3 + Math.random() * 5, (Math.random() - 0.5) * 6), 7); } },
      step(dt) {
        for (const s of list) {
          if (!s.visible) continue;
          const u = s.userData; u.life += dt; const t = u.life / u.max;
          if (t >= 1) { s.visible = false; continue; }
          u.vel.y -= u.grav * dt; s.position.addScaledVector(u.vel, dt);
          s.scale.setScalar(u.s0 + (u.s1 - u.s0) * Math.sqrt(t));
          s.material.color.copy(u.c0).lerp(u.c1, t);
          s.material.opacity = t < 0.6 ? 0.95 : 0.95 * (1 - (t - 0.6) / 0.4);
        }
      }
    };
  }

  // ---------------------------------------------------------------- ATH : police 3×5, traits
  const FONT = {
    '0': '111101101101111', '1': '010110010010111', '2': '111001111100111', '3': '111001111001111', '4': '101101111001001',
    '5': '111100111001111', '6': '111100111101111', '7': '111001001010010', '8': '111101111101111', '9': '111101111001111',
    'A': '010101111101101', 'B': '110101110101110', 'C': '011100100100011', 'D': '110101101101110', 'E': '111100110100111',
    'F': '111100110100100', 'G': '011100101101011', 'H': '101101111101101', 'I': '111010010010111', 'J': '001001001101010', 'K': '101101110101101',
    'L': '100100100100111', 'M': '101111111101101', 'N': '110101101101101', 'O': '010101101101010', 'P': '110101110100100', 'Q': '010101101110011',
    'R': '110101110101101', 'S': '011100010001110', 'T': '111010010010010', 'U': '101101101101111', 'V': '101101101101010',
    'W': '101101111111101', 'X': '101101010101101', 'Y': '101101010010010', 'Z': '111001010100111',
    '-': '000000111000000', '+': '000010111010000', '.': '000000000000010', ',': '000000000010100', '/': '001001010100100', ':': '000010000010000',
    '!': '010010010000010', '?': '111001010000010', '×': '000101010101000', '%': '101001010100101', "'": '010010000000000', ' ': '000000000000000'
  };
  function hudText(hud) {
    return function text(s, x, y, col, align, sc) {
      sc = sc || 1;
      s = String(s).toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      const w = (s.length * 4 - 1) * sc;
      let cx = Math.round(align === 'c' ? x - w / 2 : align === 'r' ? x - w : x); y = Math.round(y);
      hud.fillStyle = col;
      for (const ch of s) { const g = FONT[ch] || FONT[' ']; for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) if (g[r * 3 + c] === '1') hud.fillRect(cx + c * sc, y + r * sc, sc, sc); cx += 4 * sc; }
      return w;
    };
  }
  function hudLine(hud) {
    return function line(x0, y0, x1, y1, col) {
      x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1); hud.fillStyle = col;
      const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy, n = 0;
      for (;;) { hud.fillRect(x0, y0, 1, 1); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } if (++n > 4000) break; }
    };
  }

  // ---------------------------------------------------------------- messages
  function feeder(el) {
    let last = '', lastT = 0;
    return function feed(s, kind) {
      const now = performance.now(); if (s === last && now - lastT < 1500) return; last = s; lastT = now;
      const e = document.createElement('span'); e.textContent = s; if (kind) e.className = kind;
      el.prepend(e); while (el.children.length > 3) el.lastChild.remove(); setTimeout(() => e.remove(), 2300);
    };
  }

  // ---------------------------------------------------------------- boucle à pas fixe (1/120 s), en pause quand l'onglet est caché
  function loop(step, render, dtStep) {
    const STEP = dtStep || 1 / 120;
    const L = { paused: false, STEP };
    let last = performance.now(), acc = 0;
    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (!L.paused) { acc += dt; while (acc >= STEP) { step(STEP); acc -= STEP; } }
      render(dt);
      requestAnimationFrame(frame);
    }
    document.addEventListener('visibilitychange', () => { L.paused = document.hidden; last = performance.now(); });
    requestAnimationFrame((t) => { last = t; requestAnimationFrame(frame); });
    L.sim = (n) => { for (let i = 0; i < n; i++) step(STEP); };
    return L;
  }

  // ---------------------------------------------------------------- son (coupé par défaut) : bips, bruit
  function sound() {
    let actx = null, on = false, buf = null;
    function init() {
      if (actx) return; const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      actx = new AC();
      const len = actx.sampleRate; buf = actx.createBuffer(1, len, actx.sampleRate); const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    const S = {
      get on() { return on; },
      toggle() { on = !on; if (on) { init(); if (actx && actx.state === 'suspended') actx.resume(); } return on; },
      tone(f, at, dur, vol, type) {
        if (!on || !actx) return; const t = actx.currentTime;
        const o = actx.createOscillator(), g = actx.createGain(); o.type = type || 'square'; o.frequency.value = f; o.connect(g); g.connect(actx.destination);
        g.gain.setValueAtTime(0.0001, t + at); g.gain.linearRampToValueAtTime(0.06 * (vol || 1), t + at + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + at + dur);
        o.start(t + at); o.stop(t + at + dur + 0.02);
      },
      noise(dur, freq, vol) {
        if (!on || !actx) return; const t = actx.currentTime;
        const s = actx.createBufferSource(); s.buffer = buf; const f = actx.createBiquadFilter(), g = actx.createGain();
        f.type = 'lowpass'; f.frequency.value = freq || 400; s.connect(f); f.connect(g); g.connect(actx.destination);
        g.gain.setValueAtTime(0.4 * (vol || 1), t); g.gain.exponentialRampToValueAtTime(0.001, t + dur); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
      },
      win() { [784, 988, 1175, 1568].forEach((f, i) => S.tone(f, i * 0.12, 0.25)); },
      ctx: () => actx
    };
    return S;
  }

  // ---------------------------------------------------------------- styles communs (cadre, cartes, barre, boutons tactiles)
  const STYLE = `
:root { --ink: #12141c; --line: #2c3040; --paper: #e9e4ee; --soft: #c9c4d6; --muted: #8d8aa0; --amber: #f2b24c;
  --pixel: 'Silkscreen', 'IBM Plex Mono', ui-monospace, monospace; --mono: 'IBM Plex Mono', ui-monospace, 'SFMono-Regular', Menlo, monospace; color-scheme: dark; }
*, *::before, *::after { box-sizing: border-box; }
html, body { height: 100%; margin: 0; }
[hidden] { display: none !important; }
body { background: var(--ink); color: var(--paper); overflow: hidden; font-family: var(--mono); }
#app { position: fixed; inset: 0; display: flex; flex-direction: column; background: var(--ink); }
#stage { position: relative; flex: 1 1 auto; min-height: 0; overflow: hidden; touch-action: none; user-select: none; -webkit-user-select: none; }
#stage canvas { position: absolute; inset: 0; width: 100%; height: 100%; image-rendering: pixelated; image-rendering: crisp-edges; }
#hud { pointer-events: none; }
.tag { position: absolute; top: max(6px, env(safe-area-inset-top, 0px)); display: flex; align-items: center; gap: 6px; padding: 3px 6px 2px; background: rgba(18, 20, 28, 0.62); color: var(--paper); font: 400 8px/1 var(--pixel); letter-spacing: 0; text-transform: uppercase; pointer-events: none; border: 0; }
.tag.tl { left: max(6px, env(safe-area-inset-left, 0px)); }
button.tag { pointer-events: auto; cursor: pointer; }
.tag.tr { right: max(6px, env(safe-area-inset-right, 0px)); font-variant-numeric: tabular-nums; }
.tag.tc { left: 50%; transform: translateX(-50%); gap: 10px; padding: 4px 9px 3px; font-variant-numeric: tabular-nums; }
.tag .a { color: var(--accent); } .tag .g { color: #9fe0a8; } .tag .w { color: var(--amber); }
.tag .sq { width: 5px; height: 5px; background: var(--accent); }
#feed { position: absolute; left: 50%; top: calc(max(6px, env(safe-area-inset-top, 0px)) + 28px); transform: translateX(-50%); display: grid; justify-items: center; gap: 3px; pointer-events: none; }
#feed span { padding: 4px 8px 3px; background: rgba(18, 20, 28, 0.74); color: var(--paper); font: 400 8px/1.1 var(--pixel); letter-spacing: 0; text-transform: uppercase; white-space: nowrap; animation: feed 2.2s steps(8) forwards; }
#feed span.good { color: #9fe0a8; } #feed span.gold { color: var(--amber); } #feed span.bad { color: #ff8a7a; }
@keyframes feed { 0%, 80% { opacity: 1; } 100% { opacity: 0; } }
.over { position: absolute; inset: 0; display: grid; place-items: center; padding: 12px max(16px, env(safe-area-inset-right, 0px)) 12px max(16px, env(safe-area-inset-left, 0px)); background: linear-gradient(180deg, rgba(18, 20, 28, 0) 25%, rgba(18, 20, 28, 0.6)); }
.card { width: min(480px, 100%); max-height: 100%; overflow: auto; padding: 16px 20px; background: rgba(18, 20, 28, 0.9); border: 1px solid var(--line); box-shadow: 0 0 0 1px #000, 6px 6px 0 rgba(0, 0, 0, 0.35); display: grid; gap: 11px; cursor: default; }
.card--wide { width: min(800px, 100%); grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr); column-gap: 24px; align-items: start; }
.card--wide .col { display: grid; gap: 11px; align-content: start; min-width: 0; }
.card--wide .col + .col { padding-left: 24px; border-left: 1px solid var(--line); }
.card--wide > .keys { grid-column: 1 / -1; grid-template-columns: auto 1fr auto 1fr; }
.eyebrow { margin: 0; font: 400 8px/1 var(--pixel); letter-spacing: 0; text-transform: uppercase; color: var(--accent); }
.card h1, .card h2 { margin: 0; font: 700 32px/1 var(--pixel); letter-spacing: 0; color: var(--paper); text-wrap: balance; }
.card h2 { font-size: 24px; }
.card h1 span { color: var(--accent); }
.card p { margin: 0; font: 500 12px/1.5 var(--mono); color: var(--soft); }
.card .note { font-size: 11px; color: var(--muted); }
.goals { margin: 0; padding: 0; list-style: none; display: grid; gap: 5px; font: 500 12px/1.4 var(--mono); color: var(--soft); }
.goals li { display: grid; grid-template-columns: 14px 1fr auto; gap: 8px; align-items: baseline; }
.goals li + li { padding-top: 6px; border-top: 1px dashed var(--line); }
.goals li i { width: 8px; height: 8px; background: var(--accent); transform: translateY(1px); }
.goals li span { color: var(--paper); font-weight: 700; }
.goals li b { font: 400 8px/1 var(--pixel); color: var(--paper); letter-spacing: 0; font-variant-numeric: tabular-nums; }
.goals li small { grid-column: 2 / -1; margin-top: -2px; font: 500 11px/1.45 var(--mono); color: var(--muted); }
.tip { padding: 8px 10px; border-left: 3px solid var(--accent); background: rgba(255, 255, 255, 0.05); color: var(--paper) !important; }
.keys { display: grid; grid-template-columns: auto 1fr; gap: 3px 12px; font: 500 11px/1.4 var(--mono); color: var(--soft); padding-top: 9px; border-top: 1px solid var(--line); }
.keys b { font: 400 8px/1.4 var(--pixel); color: var(--amber); letter-spacing: 0; text-transform: uppercase; }
.actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.go { padding: 9px 16px 8px; border: 0; background: var(--accent); color: var(--accent-ink, #fff); font: 700 16px/1 var(--pixel); letter-spacing: 0; text-transform: uppercase; cursor: pointer; box-shadow: 3px 3px 0 #000; }
.go:hover { filter: brightness(1.1); }
.go.ghost { background: transparent; color: var(--paper); box-shadow: inset 0 0 0 1px var(--line); }
.go.ghost:hover { color: var(--amber); }
.rec { font: 400 8px/1.2 var(--pixel) !important; letter-spacing: 0; text-transform: uppercase; color: var(--muted) !important; }
.go:focus-visible, .bar button:focus-visible, button.tag:focus-visible, .tb:focus-visible, .pick:focus-visible { outline: 2px solid var(--paper); outline-offset: 2px; }
.score { margin: 0; display: grid; grid-template-columns: 1fr auto auto; gap: 4px 14px; font: 500 12px/1.4 var(--mono); color: var(--soft); font-variant-numeric: tabular-nums; }
.score dd { margin: 0; text-align: right; } .score dd.n { color: var(--muted); } .score .neg { color: #ff8a7a; } .score .pos { color: #9fe0a8; }
.total { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-top: 9px; border-top: 1px solid var(--line); }
.total strong { font: 700 32px/1 var(--pixel); color: var(--paper); font-variant-numeric: tabular-nums; }
.mention { display: grid; place-items: center; width: 44px; height: 44px; background: var(--accent); color: var(--accent-ink, #fff); font: 700 32px/1 var(--pixel); box-shadow: 3px 3px 0 #000; }
.bar { flex: none; display: flex; align-items: center; gap: 10px; min-height: 22px; padding: 3px max(8px, env(safe-area-inset-right, 0px)) calc(3px + env(safe-area-inset-bottom, 0px)) max(8px, env(safe-area-inset-left, 0px)); background: var(--ink); border-top: 1px solid var(--line); font: 500 9px/1 var(--mono); color: var(--muted); white-space: nowrap; overflow: hidden; }
.bar .logo { display: flex; align-items: center; gap: 6px; font: 700 8px/1 var(--pixel); color: var(--paper); letter-spacing: 0; text-transform: uppercase; }
.hints { display: flex; min-width: 0; overflow: hidden; }
.hints span { padding: 0 7px; border-left: 1px solid var(--line); }
.hints b { color: var(--paper); font-weight: 700; margin-right: 4px; }
.bar .grow { flex: 1 1 auto; }
.bar button { display: flex; align-items: center; gap: 5px; padding: 2px 4px; border: 0; background: none; color: var(--paper); font: 400 8px/1 var(--pixel); letter-spacing: 0; text-transform: uppercase; cursor: pointer; }
.bar button:hover { color: var(--amber); }
.touch { position: absolute; inset: auto 0 0 0; display: none; justify-content: space-between; align-items: flex-end; gap: 10px; padding: 0 max(12px, env(safe-area-inset-right, 0px)) 12px max(12px, env(safe-area-inset-left, 0px)); pointer-events: none; }
.touch div { display: flex; gap: 10px; }
.is-touch .touch { display: flex; }
.menu .touch { display: none !important; }
.tb { pointer-events: auto; width: 60px; height: 60px; border-radius: 50%; border: 2px solid rgba(233, 228, 238, 0.7); background: rgba(18, 20, 28, 0.55); color: var(--paper); font: 400 8px/1 var(--pixel); letter-spacing: 0; text-transform: uppercase; touch-action: none; }
.tb.big { font-size: 24px; }
.tb.on { background: var(--amber); color: var(--ink); }
.is-touch .hints, .is-touch #fsBtn { display: none; }
@media (max-width: 760px) { .hints { display: none; } .card h1 { font-size: 24px; } }
@media (max-width: 700px) {
  .card--wide { grid-template-columns: minmax(0, 1fr); }
  .card--wide .col + .col { padding-left: 0; border-left: 0; padding-top: 11px; border-top: 1px solid var(--line); }
  .card--wide > .keys { grid-template-columns: auto 1fr; }
}
@media (max-width: 520px) { .touch .tb { width: 52px; height: 52px; } .touch .tb.big { font-size: 18px; } .touch div { gap: 6px; } }
@media (max-height: 480px) { .card { gap: 8px; padding: 12px 16px; } .keys { display: none; } }
@media (prefers-reduced-motion: reduce) { #feed span { animation-timing-function: step-end; } }
`;
  function injectStyle() { const s = document.createElement('style'); s.textContent = STYLE; document.head.prepend(s); }
  injectStyle();
  const isTouch = matchMedia('(pointer: coarse)').matches;
  if (isTouch) document.documentElement.classList.add('is-touch');

  // barre du bas : son, plein écran, caméra
  function bar(o) {
    const $ = (id) => document.getElementById(id);
    if ($('sndBtn')) $('sndBtn').addEventListener('click', () => { const on = o.sound.toggle(); $('sndLabel').textContent = on ? 'Son actif' : 'Son coupé'; });
    if ($('fsBtn')) {
      $('fsBtn').addEventListener('click', () => { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); else if ($('app').requestFullscreen) $('app').requestFullscreen().catch(() => o.feed && o.feed('Plein écran indisponible ici')); });
      document.addEventListener('fullscreenchange', () => { $('fsLabel').textContent = document.fullscreenElement ? 'Quitter le plein écran' : 'Plein écran'; });
    }
  }
  const fmtInt = (n) => Math.round(n).toLocaleString('fr-FR');

  window.Pixel = { TAU, clamp, lerp, smooth, mod, angDiff, hash2, vnoise, fbm, rng, parisDay, daySeed, hex, css, v3, store, EMBED, report,
    view, fog, GLSL, mergeParts, GEO, mtx, litMesh, glowMesh, puffs, hudText, hudLine, feeder, loop, sound, isTouch, bar, fmtInt };
})();
