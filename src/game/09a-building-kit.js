import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/* =====================================================================
   KIT D'EDIFICIS «ESTIL AoE II»
   Textures pintades en temps d'execució, peces amb coordenades de textura a escala real,
   teulades (dues aigües, quatre aigües, corbes), cúpules, arcs i merlets.
   Cada edifici es fusiona per material (poques crides de dibuix) i es comparteix entre còpies.
   L'arquitectura de cada civilització és a 09b (occidental), 09c (Orient Mitjà) i 09d (Àsia oriental).
   ===================================================================== */

/* Generador propi: els detalls visuals no consumeixen el rand() de la partida */
const kitRng = mulberry32(0x2f6b1d);
const kr = (a, b) => a + (b - a) * kitRng();

function shade(hex, f) {
  const c = new THREE.Color(hex);
  c.r = Math.min(1, c.r * f); c.g = Math.min(1, c.g * f); c.b = Math.min(1, c.b * f);
  return '#' + c.getHexString();
}
function canvasTexture(size, draw) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return t;
}
function speckle(g, size, n, colors, rMin, rMax, alpha) {
  for (let i = 0; i < n; i++) {
    g.globalAlpha = alpha * kr(0.4, 1);
    g.fillStyle = colors[Math.floor(kitRng() * colors.length)];
    const r = kr(rMin, rMax), x = kr(0, size), y = kr(0, size), rot = kr(0, 3.14), sq = kr(0.5, 1);
    // Repetició als marges perquè la textura enllaci sense costures
    for (const ox of [-size, 0, size]) for (const oy of [-size, 0, size]) {
      g.beginPath();
      g.ellipse(x + ox, y + oy, r, r * sq, rot, 0, Math.PI * 2);
      g.fill();
    }
  }
  g.globalAlpha = 1;
}
function strokes(g, s, n, colors, lMin, lMax, wMin, wMax, angle = Math.PI / 2, jitter = 0.1) {
  for (let i = 0; i < n; i++) {
    g.strokeStyle = colors[Math.floor(kitRng() * colors.length)];
    g.globalAlpha = kr(0.35, 0.9);
    g.lineWidth = kr(wMin, wMax);
    const x = kr(0, s), y = kr(0, s), l = kr(lMin, lMax), a = angle + kr(-jitter, jitter);
    for (const ox of [0, -s, s]) for (const oy of [0, -s, s]) {
      g.beginPath(); g.moveTo(x + ox, y + oy); g.lineTo(x + ox + Math.cos(a) * l, y + oy + Math.sin(a) * l); g.stroke();
    }
  }
  g.globalAlpha = 1;
}
/* Paredat de carreus irregulars (morter, pedres, aresta il·luminada i ombra) */
function masonry(g, s, { mortar, bases, hMin, hMax, wMin, wMax, round = 5, grit }) {
  g.fillStyle = mortar; g.fillRect(0, 0, s, s);
  let y = 0;
  const rows = [];
  while (y < s - hMin * 0.7) { const h = Math.round(kr(hMin, hMax)); rows.push([y, h]); y += h; }
  rows[rows.length - 1][1] += s - y;
  for (const [ry, rh] of rows) {
    let x = -kr(0, wMin);
    while (x < s) {
      const w = kr(wMin, wMax), tone = kr(0.8, 1.12), base = bases[Math.floor(kitRng() * bases.length)];
      for (const ox of [0, s]) {
        g.fillStyle = shade(base, tone);
        g.beginPath(); g.roundRect(x + 2 - ox, ry + 2, w - 4, rh - 4, round); g.fill();
        g.fillStyle = shade(base, tone * 1.16);
        g.fillRect(x + 5 - ox, ry + 3, w - 10, 3);
        g.fillStyle = shade(base, tone * 0.74);
        g.fillRect(x + 4 - ox, ry + rh - 6, w - 8, 3);
      }
      x += w;
    }
  }
  if (grit) speckle(g, s, 700, grit, 0.6, 1.8, 0.4);
}
function woodGrain(g, s, base, dark, light, n = 70) {
  g.fillStyle = base; g.fillRect(0, 0, s, s);
  for (let i = 0; i < n; i++) {
    g.strokeStyle = kitRng() < 0.5 ? dark : light;
    g.globalAlpha = kr(0.3, 0.8);
    g.lineWidth = kr(0.6, 2);
    const y = kr(0, s);
    g.beginPath(); g.moveTo(0, y);
    g.bezierCurveTo(s * 0.3, y + kr(-3, 3), s * 0.7, y + kr(-3, 3), s, y);
    g.stroke();
  }
  g.globalAlpha = 1;
}
function plankTex(g, s, base, gap, n = 6) {
  const pw = s / n;
  for (let i = 0; i < n; i++) {
    g.fillStyle = shade(base, kr(0.8, 1.15));
    g.fillRect(i * pw, 0, pw, s);
    for (let k = 0; k < 14; k++) {
      g.strokeStyle = kitRng() < 0.5 ? shade(base, 0.75) : shade(base, 1.2);
      g.globalAlpha = kr(0.25, 0.6);
      g.lineWidth = kr(0.5, 1.5);
      const x = i * pw + kr(3, pw - 3);
      g.beginPath(); g.moveTo(x, 0); g.lineTo(x + kr(-2, 2), s); g.stroke();
    }
    g.globalAlpha = 1;
    g.fillStyle = gap;
    g.fillRect(i * pw, 0, 2, s);
  }
}

const KIT_TEX = {
  plaster: canvasTexture(256, (g, s) => {
    g.fillStyle = '#cbbd9c'; g.fillRect(0, 0, s, s);
    speckle(g, s, 90, ['#b9a985', '#d8cbad', '#a8987a'], 10, 38, 0.25);
    speckle(g, s, 900, ['#9c8c6e', '#e2d6bb'], 0.6, 2, 0.35);
  }),
  whiteplaster: canvasTexture(256, (g, s) => {
    g.fillStyle = '#e4e0d4'; g.fillRect(0, 0, s, s);
    speckle(g, s, 70, ['#d6d1c2', '#efece2', '#cfc8b6'], 12, 40, 0.3);
    speckle(g, s, 600, ['#bdb6a3', '#f4f2ea'], 0.6, 1.6, 0.3);
  }),
  adobe: canvasTexture(256, (g, s) => {
    g.fillStyle = '#c9a77a'; g.fillRect(0, 0, s, s);
    speckle(g, s, 110, ['#b8946a', '#d6b88e', '#a9865c', '#cfae83'], 10, 42, 0.3);
    speckle(g, s, 1100, ['#8f704c', '#e2c79f', '#b39068'], 0.6, 2.2, 0.4);
    g.strokeStyle = '#8a6a48'; g.globalAlpha = 0.35; g.lineWidth = 1;
    for (let i = 0; i < 9; i++) {           // esquerdes
      let x = kr(0, s), y = kr(0, s);
      g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 5; k++) { x += kr(-9, 9); y += kr(4, 12); g.lineTo(x, y); }
      g.stroke();
    }
    g.globalAlpha = 1;
  }),
  stone: canvasTexture(256, (g, s) => masonry(g, s, {
    mortar: '#5a554c', bases: ['#948f84', '#948f84', '#a39580', '#878378'], hMin: 26, hMax: 40, wMin: 34, wMax: 70, grit: ['#6d675c', '#b3aa98'],
  })),
  sandstone: canvasTexture(256, (g, s) => masonry(g, s, {
    mortar: '#8c7556', bases: ['#c9ab7e', '#bf9f72', '#d4b88c', '#b8966a'], hMin: 30, hMax: 36, wMin: 46, wMax: 80, round: 2, grit: ['#9c8260', '#e0c89e'],
  })),
  granite: canvasTexture(256, (g, s) => masonry(g, s, {
    mortar: '#4a4a48', bases: ['#8a8a86', '#7c7d7a', '#9a9993', '#6f706d'], hMin: 40, hMax: 64, wMin: 50, wMax: 96, round: 9, grit: ['#5d5e5b', '#b1b0aa'],
  })),
  timber: canvasTexture(128, (g, s) => woodGrain(g, s, '#4b3524', '#3a281a', '#5c4330')),
  darkwood: canvasTexture(128, (g, s) => woodGrain(g, s, '#2c211b', '#1d1612', '#3d2e24', 60)),
  palewood: canvasTexture(128, (g, s) => woodGrain(g, s, '#8a6a48', '#6e5236', '#a3825d')),
  planks: canvasTexture(256, (g, s) => plankTex(g, s, '#6b4b30', '#2a1c10')),
  darkplanks: canvasTexture(256, (g, s) => plankTex(g, s, '#3a2c22', '#15100c', 7)),
  thatch: canvasTexture(256, (g, s) => {
    g.fillStyle = '#8c7442'; g.fillRect(0, 0, s, s);
    strokes(g, s, 2600, ['#a88d52', '#7a6337', '#b89c5e', '#6a5530', '#c2a869'], 10, 26, 0.7, 1.8, Math.PI / 2, 0.08);
    g.globalAlpha = 0.35;
    g.fillStyle = '#4d3d20';
    for (let k = 0; k < 4; k++) g.fillRect(0, k * s / 4 + s / 4 - 5, s, 5);
    g.globalAlpha = 1;
  }),
  kawara: canvasTexture(256, (g, s) => {
    // Teules corbes japoneses: canals verticals i filades horitzontals
    const n = 8, cw = s / n;
    for (let i = 0; i < n; i++) {
      const grd = g.createLinearGradient(i * cw, 0, (i + 1) * cw, 0);
      grd.addColorStop(0, '#2a2e33'); grd.addColorStop(0.35, '#5a6068'); grd.addColorStop(0.6, '#4a5058'); grd.addColorStop(1, '#23272b');
      g.fillStyle = grd; g.fillRect(i * cw, 0, cw, s);
    }
    for (let k = 0; k < 8; k++) {
      g.fillStyle = 'rgba(15,17,20,0.55)'; g.fillRect(0, k * s / 8, s, 3);
      g.fillStyle = 'rgba(120,128,136,0.25)'; g.fillRect(0, k * s / 8 + 3, s, 2);
    }
    speckle(g, s, 500, ['#3b4046', '#6d737a'], 0.6, 1.6, 0.35);
  }),
  clay: canvasTexture(256, (g, s) => {
    // Teules àrabs de terrissa
    const n = 8, cw = s / n;
    for (let i = 0; i < n; i++) {
      const grd = g.createLinearGradient(i * cw, 0, (i + 1) * cw, 0);
      const b = kr(0.9, 1.08);
      grd.addColorStop(0, shade('#7a3a22', b)); grd.addColorStop(0.45, shade('#b8653e', b)); grd.addColorStop(1, shade('#6a321d', b));
      g.fillStyle = grd; g.fillRect(i * cw, 0, cw, s);
    }
    for (let k = 0; k < 6; k++) { g.fillStyle = 'rgba(40,15,8,0.5)'; g.fillRect(0, k * s / 6, s, 3); }
    speckle(g, s, 400, ['#5c2a17', '#d08a5c'], 0.6, 1.8, 0.35);
  }),
  tile: canvasTexture(256, (g, s) => {
    // Rajoles vidrades (cúpules i frisos de l'Orient Mitjà)
    const n = 8, cw = s / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      g.fillStyle = shade((i + j) % 2 ? '#2f7f86' : '#3a95a0', kr(0.88, 1.08));
      g.fillRect(i * cw, j * cw, cw, cw);
      g.fillStyle = 'rgba(240,230,200,0.75)';
      g.beginPath(); g.arc(i * cw + cw / 2, j * cw + cw / 2, cw * 0.18, 0, Math.PI * 2); g.fill();
    }
    g.strokeStyle = 'rgba(20,40,45,0.6)'; g.lineWidth = 2;
    for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * cw, 0); g.lineTo(i * cw, s); g.moveTo(0, i * cw); g.lineTo(s, i * cw); g.stroke(); }
  }),
  dirt: canvasTexture(256, (g, s) => {
    g.fillStyle = '#7d6547'; g.fillRect(0, 0, s, s);
    speckle(g, s, 120, ['#6e573b', '#8c7454', '#75603f'], 8, 30, 0.35);
    speckle(g, s, 1500, ['#5b4730', '#9a8466', '#6b6b5b'], 0.6, 2.2, 0.5);
  }),
  soil: canvasTexture(256, (g, s) => {
    // Terra llaurada amb solcs (en l'eix U)
    g.fillStyle = '#5e4630'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 8; i++) {
      const grd = g.createLinearGradient(i * s / 8, 0, (i + 1) * s / 8, 0);
      grd.addColorStop(0, '#4a3624'); grd.addColorStop(0.5, '#735a3e'); grd.addColorStop(1, '#4a3624');
      g.fillStyle = grd; g.fillRect(i * s / 8, 0, s / 8, s);
    }
    speckle(g, s, 1200, ['#3d2c1c', '#8a6f4f', '#5b4630'], 0.6, 2.2, 0.5);
  }),
  wheat: canvasTexture(128, (g, s) => {
    g.fillStyle = '#b39445'; g.fillRect(0, 0, s, s);
    strokes(g, s, 900, ['#d6b85e', '#9c7c34', '#e6cc7a', '#8a6c2a'], 6, 16, 0.6, 1.4, Math.PI / 2, 0.25);
  }),
  sprouts: canvasTexture(128, (g, s) => {
    g.fillStyle = '#5e7a2e'; g.fillRect(0, 0, s, s);
    strokes(g, s, 900, ['#7fa03c', '#4a6424', '#96b650', '#3e5620'], 5, 13, 0.6, 1.4, Math.PI / 2, 0.35);
  }),
  straw: canvasTexture(128, (g, s) => {
    g.fillStyle = '#b89a55'; g.fillRect(0, 0, s, s);
    strokes(g, s, 700, ['#9c7f40', '#d2b674'], 8, 14, 0.6, 1.4, 0, 0.5);
  }),
  bark: canvasTexture(128, (g, s) => {
    g.fillStyle = '#4a3a2c'; g.fillRect(0, 0, s, s);
    strokes(g, s, 260, ['#2e241b', '#5d4a38', '#3a2e23', '#6b5a48'], 14, 40, 1, 3, Math.PI / 2, 0.06);
  }),
  cloth: canvasTexture(64, (g, s) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < s; i += 2) { g.fillStyle = `rgba(0,0,0,${kr(0.02, 0.07)})`; g.fillRect(i, 0, 1, s); g.fillRect(0, i, s, 1); }
  }),
};

/* Materials texturats: tile = metres que ocupa una repetició de la textura */
const KIT_TILE = {
  plaster: 2.2, whiteplaster: 2.2, adobe: 2.6, stone: 1.6, sandstone: 1.8, granite: 2.2, timber: 1.2, darkwood: 1.2, palewood: 1.2,
  planks: 1.4, darkplanks: 1.4, thatch: 1.6, kawara: 1.4, clay: 1.4, tile: 1.2, dirt: 3, soil: 2.2, wheat: 1, sprouts: 1, straw: 1, bark: 1.4, cloth: 1,
};
const BUMPY = { stone: 2.5, sandstone: 2, granite: 2.5, thatch: 1.2, planks: 1.2, darkplanks: 1.2, kawara: 2, clay: 1.6, bark: 2, adobe: 0.8 };
function kitMat(name, extra = {}) {
  const key = 'kit:' + name + JSON.stringify(extra);
  if (!matCache.has(key)) {
    const tex = KIT_TEX[name];
    const bump = BUMPY[name] ? { bumpMap: tex, bumpScale: BUMPY[name] } : {};
    const m = fogify(new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92, metalness: 0, ...bump, ...extra }));
    m.userData.tile = KIT_TILE[name];
    matCache.set(key, m);
  }
  return matCache.get(key);
}
const KM = {
  get plaster() { return kitMat('plaster'); },
  get whiteplaster() { return kitMat('whiteplaster'); },
  get adobe() { return kitMat('adobe'); },
  get stone() { return kitMat('stone'); },
  get sandstone() { return kitMat('sandstone'); },
  get granite() { return kitMat('granite'); },
  get timber() { return kitMat('timber'); },
  get darkwood() { return kitMat('darkwood'); },
  get palewood() { return kitMat('palewood'); },
  get planks() { return kitMat('planks'); },
  get darkplanks() { return kitMat('darkplanks'); },
  get thatch() { return kitMat('thatch', { side: THREE.DoubleSide }); },
  get kawara() { return kitMat('kawara', { side: THREE.DoubleSide, roughness: 0.7 }); },
  get clay() { return kitMat('clay', { side: THREE.DoubleSide }); },
  get tile() { return kitMat('tile', { roughness: 0.45 }); },
  get dirt() { return kitMat('dirt'); },
  get soil() { return kitMat('soil'); },
  get wheat() { return kitMat('wheat'); },
  get sprouts() { return kitMat('sprouts'); },
  get straw() { return kitMat('straw'); },
  get bark() { return kitMat('bark'); },
  get dark() { return mat(0x1c140d, { roughness: 1 }); },
  get iron() { return mat(0x55575c, { metalness: 0.6, roughness: 0.5 }); },
  get gold() { return mat(0xc9a13a, { metalness: 0.8, roughness: 0.35 }); },
  get glow() { return mat(0x3a1a00, { emissive: 0xff6a1a, emissiveIntensity: 1.3 }); },
  get paper() { return mat(0xefe6cf, { roughness: 0.9, emissive: 0x2a2010, emissiveIntensity: 0.25 }); },
  cloth(color) { return kitMat('cloth', { color, roughness: 0.85, side: THREE.DoubleSide }); },
  team(team) { return KM.cloth(teamOf(team).color); },
  teamDark(team) { return KM.cloth(teamOf(team).colorDark); },
  teamPaint(team) { return mat(teamOf(team).color, { roughness: 0.6 }); },
};

/* ---------- Peces amb coordenades de textura a escala del món ---------- */
function scaleUV(geo, fn) {
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) { const [u, v] = fn(i, uv.getX(i), uv.getY(i)); uv.setXY(i, u, v); }
  return geo;
}
function place(g, m, x, y, z, rot) {
  m.position.set(x, y, z);
  if (rot) m.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0);
  g.add(m);
  return m;
}
function kbox(g, w, h, d, material, x, y, z, rot = null) {
  const tile = material.userData.tile || 1;
  const geo = scaleUV(new THREE.BoxGeometry(w, h, d), (i, u, v) => {
    const f = Math.floor(i / 4);                       // +x, -x, +y, -y, +z, -z
    if (f < 2) return [u * d / tile, v * h / tile];
    if (f < 4) return [u * w / tile, v * d / tile];
    return [u * w / tile, v * h / tile];
  });
  return place(g, new THREE.Mesh(geo, material), x, y, z, rot);
}
function kcyl(g, rt, rb, h, seg, material, x, y, z, rot = null, open = false) {
  const tile = material.userData.tile || 1;
  const circ = Math.PI * (rt + rb);
  const geo = scaleUV(new THREE.CylinderGeometry(rt, rb, h, seg, 1, open), (i, u, v) => [u * circ / tile, v * h / tile]);
  return place(g, new THREE.Mesh(geo, material), x, y, z, rot);
}
function ksphere(g, r, material, x, y, z, sx = 1, sy = 1, sz = 1, detail = 1) {
  const tile = material.userData.tile || 1;
  const geo = scaleUV(new THREE.IcosahedronGeometry(r, detail), (i, u, v) => [u * 2 * Math.PI * r / tile, v * Math.PI * r / tile]);
  const m = place(g, new THREE.Mesh(geo, material), x, y, z);
  m.scale.set(sx, sy, sz);
  return m;
}
/* Forma plana (frontó, arc…) al pla XY, cara cap a +Z */
function kshape(g, shape, material, x, y, z, rotY = 0) {
  const tile = material.userData.tile || 1;
  const geo = scaleUV(new THREE.ShapeGeometry(shape, 8), (i, u, v) => [u / tile, v / tile]);
  const m = place(g, new THREE.Mesh(geo, material), x, y, z);
  m.rotation.y = rotY;
  return m;
}
function kgable(g, w, h, material, x, y, z, rotY) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, h); s.closePath();
  return kshape(g, s, material, x, y, z, rotY);
}
/* Silueta d'una obertura: arc de mig punt (round), apuntat (pointed) o llinda plana (flat) */
function archShape(w, h, kind = 'round') {
  const s = new THREE.Shape(), hw = w / 2;
  s.moveTo(-hw, 0);
  if (kind === 'flat') { s.lineTo(-hw, h); s.lineTo(hw, h); }
  else if (kind === 'pointed') {
    const hs = h - w * 0.7;
    s.lineTo(-hw, hs);
    s.quadraticCurveTo(-hw, h - w * 0.15, 0, h);
    s.quadraticCurveTo(hw, h - w * 0.15, hw, hs);
  } else {
    const hs = h - hw;
    s.lineTo(-hw, hs);
    s.absarc(0, hs, hw, Math.PI, 0, true);
  }
  s.lineTo(hw, 0);
  s.closePath();
  return s;
}
/* Obertura fosca (porta, finestra, arcada) sobre la cara d'un mur (rotY = orientació de la cara) */
function kopening(g, w, h, x, y, z, rotY = 0, kind = 'round', frameMat = null) {
  const sx = Math.sin(rotY), sz = Math.cos(rotY);
  if (frameMat) kshape(g, archShape(w + 0.24, h + 0.14, kind), frameMat, x + sx * 0.015, y - 0.02, z + sz * 0.015, rotY);
  return kshape(g, archShape(w, h, kind), KM.dark, x + sx * 0.03, y, z + sz * 0.03, rotY);
}

/* Teulada a dues aigües amb el carener en l'eix X, sobre un cos de w×d que acaba a l'alçada y0 */
function gableRoof(g, { w, d, h, over = 0.35, t = 0.22, y0, x = 0, z = 0, roofMat = KM.thatch, gableMat = KM.plaster, frame = true, ridgeMat = null }) {
  const half = d / 2 + over;
  const a = Math.atan2(h, d / 2);
  const len = half / Math.cos(a);
  for (const sz of [-1, 1]) {
    const cz = z + sz * half / 2;
    const cy = y0 + h - (half / 2) * Math.tan(a) + t / 2 / Math.cos(a);
    kbox(g, w + over * 2, t, len, roofMat, x, cy, cz, [sz * a, 0, 0]);
  }
  kbox(g, w + over * 2 + 0.05, t * 1.1, 0.34, ridgeMat || roofMat, x, y0 + h + t * 0.75, z, [Math.PI / 4, 0, 0]);
  for (const sx of [-1, 1]) {
    kgable(g, d, h, gableMat, x + sx * w / 2, y0, z, sx * Math.PI / 2);
    if (frame) {
      kbox(g, 0.12, h * 0.92, 0.14, KM.timber, x + sx * (w / 2 + 0.03), y0 + h * 0.46, z);
      kbox(g, 0.12, 0.12, d * 0.62, KM.timber, x + sx * (w / 2 + 0.03), y0 + h * 0.36, z);
    }
  }
}

/* Teulada a quatre aigües (carener en X si w ≥ d). curve > 1: vessants còncaus; lift: puntes aixecades */
function hipRoofGeo(w, d, h, over, curve, lift, tile) {
  const W = w + 2 * over, D = d + 2 * over, rr = Math.max(0, W - D) / 2;
  const pos = [], uvs = [], idx = [];
  const S = curve !== 1 || lift ? 6 : 1, T = lift ? 10 : 1;
  const slope = Math.hypot(D / 2, h);
  const face = (e0, e1, r0, r1) => {
    const base = pos.length / 3;
    const eLen = Math.hypot(e1[0] - e0[0], e1[1] - e0[1]);
    for (let j = 0; j <= S; j++) {
      const s = j / S;
      for (let i = 0; i <= T; i++) {
        const t = i / T;
        const ex = e0[0] + (e1[0] - e0[0]) * t, ez = e0[1] + (e1[1] - e0[1]) * t;
        const rx = r0[0] + (r1[0] - r0[0]) * t, rz = r0[1] + (r1[1] - r0[1]) * t;
        const c = Math.abs(2 * t - 1);
        pos.push(ex + (rx - ex) * s, h * Math.pow(s, curve) + lift * (1 - s) * (1 - s) * c * c * c * c, ez + (rz - ez) * s);
        uvs.push((t - 0.5) * eLen / tile, s * slope / tile);
      }
    }
    for (let j = 0; j < S; j++) for (let i = 0; i < T; i++) {
      const a = base + j * (T + 1) + i, b = a + 1, c2 = a + T + 1, d2 = c2 + 1;
      idx.push(a, b, d2, a, d2, c2);
    }
  };
  const hx = W / 2, hz = D / 2;
  face([-hx, hz], [hx, hz], [-rr, 0], [rr, 0]);
  face([hx, -hz], [-hx, -hz], [rr, 0], [-rr, 0]);
  face([hx, hz], [hx, -hz], [rr, 0], [rr, 0]);
  face([-hx, -hz], [-hx, hz], [-rr, 0], [-rr, 0]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}
function hipRoof(g, { w, d, h, over = 0.4, y0, x = 0, z = 0, roofMat = KM.thatch, curve = 1, lift = 0, ridgeMat = null, ridge = 0.16 }) {
  const swap = d > w;
  const geo = hipRoofGeo(swap ? d : w, swap ? w : d, h, over, curve, lift, roofMat.userData.tile || 1);
  const m = place(g, new THREE.Mesh(geo, roofMat), x, y0, z);
  if (swap) m.rotation.y = Math.PI / 2;
  const rl = Math.abs(w - d);
  if (ridge && rl > 0.05) kbox(g, swap ? ridge : rl + ridge, ridge * 1.3, swap ? rl + ridge : ridge, ridgeMat || roofMat, x, y0 + h + ridge * 0.3, z);
  return m;
}
/* Cúpula (rodona o apuntada) de revolució */
function kdome(g, r, h, material, x, y, z, pointed = 0, seg = 18) {
  const pts = [];
  const n = 10;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI / 2;
    const rad = r * Math.cos(a) * (1 - pointed * Math.pow(i / n, 3) * 0.35);
    pts.push(new THREE.Vector2(Math.max(0.001, rad), h * Math.sin(a) + pointed * r * 0.6 * Math.pow(i / n, 4)));
  }
  const tile = material.userData.tile || 1;
  const geo = scaleUV(new THREE.LatheGeometry(pts, seg), (i, u, v) => [u * 2 * Math.PI * r / tile, v * h * 1.3 / tile]);
  return place(g, new THREE.Mesh(geo, material), x, y, z);
}
/* Merlets al llarg d'un rectangle (w×d) a l'alçada y0 */
function battlements(g, w, d, y0, material, { size = 0.34, gap = 0.34, h = 0.42, x = 0, z = 0, round = false, thick = 0.3 } = {}) {
  const edge = (len, fn) => {
    const n = Math.max(1, Math.floor((len + gap) / (size + gap)));
    const step = len / n;
    for (let i = 0; i < n; i++) fn(-len / 2 + step * (i + 0.5));
  };
  const merlon = (px, pz, rotY) => {
    if (round) {
      kbox(g, size, h * 0.6, thick, material, px, y0 + h * 0.3, pz, [0, rotY, 0]);
      kcyl(g, size / 2, size / 2, thick, 8, material, px, y0 + h * 0.6, pz, [Math.PI / 2, rotY, 0]);
    } else kbox(g, size, h, thick, material, px, y0 + h / 2, pz, [0, rotY, 0]);
  };
  edge(w, t => { merlon(x + t, z + d / 2 - thick / 2, 0); merlon(x + t, z - d / 2 + thick / 2, 0); });
  edge(d - thick * 2, t => { merlon(x + w / 2 - thick / 2, z + t, Math.PI / 2); merlon(x - w / 2 + thick / 2, z + t, Math.PI / 2); });
}

/* ---------- Detalls compartits ---------- */
function kBarrel(g, x, z, s = 1) {
  kcyl(g, 0.3 * s, 0.26 * s, 0.75 * s, 12, KM.planks, x, 0.375 * s, z);
  for (const y of [0.15, 0.6]) kcyl(g, 0.305 * s, 0.305 * s, 0.05 * s, 12, KM.iron, x, y * s, z);
}
function kCrate(g, x, z, s = 1, r = 0, y = 0) {
  kbox(g, 0.6 * s, 0.6 * s, 0.6 * s, KM.planks, x, y + 0.3 * s, z, [0, r, 0]);
}
function kSack(g, x, z, s = 1, color = 0xcdb98e) {
  ksphere(g, 0.3 * s, mat(color, { roughness: 1 }), x, 0.28 * s, z, 1, 1.15, 0.9, 1);
}
function kLogPile(g, x, z, rotY = 0, rows = 3, len = 1.3, material = null) {
  const p = new THREE.Group();
  p.position.set(x, 0, z); p.rotation.y = rotY;
  for (let r = 0; r < rows; r++) for (let c = 0; c < rows - r; c++) {
    kcyl(p, 0.14, 0.14, len, 8, material || KM.bark, 0, 0.15 + r * 0.25, (c - (rows - 1 - r) / 2) * 0.3, [0, 0, Math.PI / 2]);
  }
  g.add(p);
}
function kHay(g, x, z, rotY = 0) {
  kcyl(g, 0.42, 0.42, 0.8, 12, KM.straw, x, 0.42, z, [0, rotY, Math.PI / 2]);
}
function kStakeFence(g, x0, z0, x1, z1, h = 1.1, gap = 0.26, material = null) {
  const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(2, Math.round(len / gap));
  const M = material || KM.bark;
  for (let i = 0; i <= n; i++) {
    const t = i / n, hh = h * kr(0.85, 1.05);
    const x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t;
    kcyl(g, 0.09, 0.1, hh, 6, M, x, hh / 2, z);
    kcyl(g, 0, 0.09, 0.22, 6, M, x, hh + 0.11, z);
  }
  kbox(g, len, 0.08, 0.06, KM.timber, (x0 + x1) / 2, h * 0.55, (z0 + z1) / 2, [0, -Math.atan2(z1 - z0, x1 - x0), 0]);
}
function kRailFence(g, x0, z0, x1, z1, h = 1.0, material = null) {
  const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(len / 1.4));
  const M = material || KM.timber, ry = -Math.atan2(z1 - z0, x1 - x0);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    kbox(g, 0.12, h, 0.12, M, x0 + (x1 - x0) * t, h / 2, z0 + (z1 - z0) * t);
  }
  for (const y of [h * 0.45, h * 0.85]) kbox(g, len, 0.07, 0.05, M, (x0 + x1) / 2, y, (z0 + z1) / 2, [0, ry, 0]);
}
function kBanner(g, team, x, z, h = 3.6, rotY = 0) {
  const b = new THREE.Group();
  b.position.set(x, 0, z); b.rotation.y = rotY;
  kcyl(b, 0.05, 0.06, h, 6, KM.timber, 0, h / 2, 0);
  kbox(b, 0.7, 0.05, 0.05, KM.timber, 0.3, h - 0.1, 0);
  kbox(b, 0.62, 1.1, 0.03, KM.team(team), 0.3, h - 0.72, 0);
  kbox(b, 0.62, 0.12, 0.035, KM.teamDark(team), 0.3, h - 1.2, 0);
  g.add(b);
}
/* Nobori: bandera vertical japonesa */
function kNobori(g, team, x, z, h = 3.8, rotY = 0) {
  const b = new THREE.Group();
  b.position.set(x, 0, z); b.rotation.y = rotY;
  kcyl(b, 0.04, 0.05, h, 6, KM.darkwood, 0, h / 2, 0);
  kbox(b, 0.5, 0.04, 0.04, KM.darkwood, 0.25, h - 0.08, 0);
  kbox(b, 0.46, h * 0.55, 0.02, KM.team(team), 0.25, h - 0.1 - h * 0.275, 0);
  kbox(b, 0.46, 0.2, 0.025, KM.cloth(0xf2eee4), 0.25, h - 0.35, 0);
  g.add(b);
}
/* Gallardet triangular (Orient Mitjà) */
function kPennant(g, team, x, y, z, h = 1.6, rotY = 0) {
  const b = new THREE.Group();
  b.position.set(x, y, z); b.rotation.y = rotY;
  kcyl(b, 0.03, 0.04, h, 6, KM.timber, 0, h / 2, 0);
  const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(0.9, -0.22); s.lineTo(0, -0.45); s.closePath();
  kshape(b, s, KM.team(team), 0.02, h - 0.05, 0);
  kcyl(b, 0.06, 0.06, 0.08, 8, KM.gold, 0, h + 0.03, 0);
  g.add(b);
}
function kWeaponRack(g, team, x, z, rotY = 0, shields = true, shaft = null) {
  const rack = new THREE.Group();
  rack.position.set(x, 0, z); rack.rotation.y = rotY;
  const W = shaft || KM.timber;
  kbox(rack, 1.6, 0.1, 0.12, W, 0, 1.15, 0);
  kbox(rack, 1.6, 0.1, 0.12, W, 0, 0.35, 0.15);
  for (const sx of [-1, 1]) kbox(rack, 0.1, 1.3, 0.1, W, sx * 0.75, 0.65, 0);
  for (let i = 0; i < 5; i++) {
    kcyl(rack, 0.025, 0.025, 2.1, 5, W, -0.6 + i * 0.3, 1.05, 0.05, [-0.12, 0, 0]);
    kcyl(rack, 0, 0.05, 0.22, 5, KM.iron, -0.6 + i * 0.3, 2.2, -0.08, [-0.12, 0, 0]);
  }
  if (shields) for (const sx of [-0.45, 0.45]) kcyl(rack, 0.28, 0.28, 0.06, 12, KM.teamPaint(team), sx, 0.62, 0.26, [Math.PI / 2 - 0.2, 0, 0]);
  g.add(rack);
}
function kDummy(g, x, z) {
  kcyl(g, 0.07, 0.08, 1.8, 6, KM.timber, x, 0.9, z);
  kbox(g, 1.0, 0.1, 0.1, KM.timber, x, 1.4, z);
  kcyl(g, 0.26, 0.24, 0.7, 10, KM.straw, x, 1.25, z);
  kcyl(g, 0.17, 0.17, 0.32, 10, KM.straw, x, 1.78, z);
}
function kTarget(g, team, x, z, rotY = 0) {
  const t = new THREE.Group();
  t.position.set(x, 0, z); t.rotation.y = rotY;
  kcyl(t, 0.55, 0.55, 0.22, 16, KM.straw, 0, 0.85, 0, [Math.PI / 2 - 0.25, 0, 0]);
  kcyl(t, 0.3, 0.3, 0.23, 16, KM.teamPaint(team), 0, 0.85, 0, [Math.PI / 2 - 0.25, 0, 0]);
  for (const sx of [-1, 1]) kbox(t, 0.08, 1.1, 0.08, KM.timber, sx * 0.35, 0.5, -0.15, [0.25, 0, 0]);
  g.add(t);
}
function kAnvil(g, x, z, rotY = 0) {
  const iron = mat(0x2e2f33, { metalness: 0.7, roughness: 0.4 });
  kcyl(g, 0.22, 0.26, 0.55, 8, KM.bark, x, 0.275, z);
  kbox(g, 0.55, 0.16, 0.22, iron, x, 0.63, z, [0, rotY, 0]);
  kbox(g, 0.3, 0.12, 0.16, iron, x, 0.5, z, [0, rotY, 0]);
}
function kCart(g, x, z, rotY = 0, load = null) {
  const c = new THREE.Group();
  c.position.set(x, 0, z); c.rotation.y = rotY;
  kbox(c, 1.0, 0.1, 1.5, KM.planks, 0, 0.62, 0);
  for (const sx of [-1, 1]) kbox(c, 0.06, 0.32, 1.5, KM.planks, sx * 0.5, 0.82, 0);
  kbox(c, 1.0, 0.32, 0.06, KM.planks, 0, 0.82, -0.72);
  for (const sx of [-1, 1]) kcyl(c, 0.42, 0.42, 0.08, 12, KM.timber, sx * 0.6, 0.42, 0.1, [0, 0, Math.PI / 2]);
  for (const sx of [-0.3, 0.3]) kbox(c, 0.06, 0.06, 1.2, KM.timber, sx, 0.55, 1.2, [0.35, 0, 0]);
  if (load === 'gold') for (let i = 0; i < 5; i++) kbox(c, 0.24, 0.2, 0.24, KM.gold, kr(-0.3, 0.3), 0.8, kr(-0.5, 0.5), [kr(0, 3), kr(0, 3), 0]);
  if (load === 'stone') for (let i = 0; i < 5; i++) kbox(c, 0.3, 0.24, 0.3, KM.stone, kr(-0.3, 0.3), 0.8, kr(-0.5, 0.5), [kr(0, 1), kr(0, 3), 0]);
  if (load === 'logs') kLogPile(c, 0, 0.55, Math.PI / 2, 2, 1.4);
  g.add(c);
}
function kOrePile(g, x, z, material, n = 7, s = 1) {
  for (let i = 0; i < n; i++) {
    const a = kr(0, Math.PI * 2), r = kr(0, 0.45) * s;
    ksphere(g, kr(0.14, 0.24) * s, material, x + Math.cos(a) * r, 0.12 * s + (0.45 * s - r) * 0.4, z + Math.sin(a) * r, 1, kr(0.7, 1), 1, 0);
  }
}
function kSawhorse(g, x, z, rotY = 0) {
  const s = new THREE.Group();
  s.position.set(x, 0, z); s.rotation.y = rotY;
  for (const sx of [-0.45, 0.45]) {
    kbox(s, 0.08, 0.8, 0.08, KM.timber, sx, 0.4, 0.15, [0.35, 0, 0]);
    kbox(s, 0.08, 0.8, 0.08, KM.timber, sx, 0.4, -0.15, [-0.35, 0, 0]);
  }
  kcyl(s, 0.16, 0.16, 1.6, 8, KM.bark, 0, 0.82, 0, [0, 0, Math.PI / 2]);
  g.add(s);
}
function kWell(g, x, z, stoneMat, roofMat, gableMat = KM.timber) {
  kcyl(g, 0.65, 0.7, 0.7, 12, stoneMat, x, 0.35, z);
  kcyl(g, 0.5, 0.5, 0.72, 12, KM.dark, x, 0.36, z, null, true);
  for (const sx of [-1, 1]) kbox(g, 0.1, 1.5, 0.1, KM.timber, x + sx * 0.6, 1.1, z);
  kbox(g, 1.3, 0.08, 0.08, KM.timber, x, 1.6, z);
  gableRoof(g, { w: 1.3, d: 1.0, h: 0.45, over: 0.12, t: 0.08, y0: 1.85, x, z, roofMat, gableMat, frame: false });
}

/* ---------- Peces animades: es fusionen a part i cada còpia en té una instància pròpia ---------- */
function animPart(g, key, x = 0, y = 0, z = 0) {
  const p = new THREE.Group();
  p.position.set(x, y, z);
  p.userData.animKey = key;
  g.add(p);
  return p;
}

/* ---------- Fusió per material: menys crides de dibuix ---------- */
function bakeMeshes(root) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const byMat = new Map();
  const visit = (o) => {
    if (o !== root && o.userData.animKey) return;
    if (o.isMesh) {
      const geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      geo.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
      for (const k of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(k)) geo.deleteAttribute(k);
      if (!geo.attributes.normal) geo.computeVertexNormals();
      if (!byMat.has(o.material)) byMat.set(o.material, []);
      byMat.get(o.material).push(geo);
    }
    for (const c of o.children) visit(c);
  };
  visit(root);
  const out = [];
  for (const [m, geos] of byMat) {
    const merged = mergeGeometries(geos, false);
    for (const gg of geos) gg.dispose();
    merged.computeBoundingSphere();
    out.push([merged, m]);
  }
  return out;
}
function bakeTemplate(g) {
  const tpl = { meshes: bakeMeshes(g), anims: [] };
  g.traverse(o => {
    if (o === g || !o.userData.animKey) return;
    tpl.anims.push({ key: o.userData.animKey, pos: o.position.clone(), quat: o.quaternion.clone(), scale: o.scale.clone(), meshes: bakeMeshes(o) });
  });
  return tpl;
}
function instantiateTemplate(tpl) {
  const model = new THREE.Group();
  for (const [geo, m] of tpl.meshes) model.add(new THREE.Mesh(geo, m));
  for (const a of tpl.anims) {
    const p = new THREE.Group();
    p.position.copy(a.pos); p.quaternion.copy(a.quat); p.scale.copy(a.scale);
    for (const [geo, m] of a.meshes) p.add(new THREE.Mesh(geo, m));
    model.add(p);
    if (a.key === 'doors') (model.userData.doors = model.userData.doors || []).push(p);
    else model.userData[a.key] = p;
  }
  return model;
}

/* ---------- Registre d'arquitectures ---------- */
const ARCH = {};              // ARCH.western = { house(g, ctx) {...}, ... } → retorna l'alçada
const COMMON_BUILDERS = {};   // edificis iguals per a totes les civilitzacions (granja, palissada)
const KIT_VARIANTS = { house: 3 };
const kitCache = new Map();
/* Model d'un edifici del kit segons la civilització de l'equip (null si el tipus no hi és) */
function kitBuildingModel(type, team) {
  const arch = archOf(team);
  const build = COMMON_BUILDERS[type] || (ARCH[arch] && ARCH[arch][type]);
  if (!build) return null;
  const variant = Math.floor(kitRng() * (KIT_VARIANTS[type] || 1));
  const key = `${arch}:${type}:${team}:${variant}`;
  if (!kitCache.has(key)) {
    const g = new THREE.Group();
    const height = build(g, { team, variant, arch });
    kitCache.set(key, { tpl: bakeTemplate(g), height });
  }
  const { tpl, height } = kitCache.get(key);
  return { model: instantiateTemplate(tpl), height };
}

/* ---------- Edificis comuns ---------- */
COMMON_BUILDERS.farm = (g) => {
  kbox(g, 5.8, 0.12, 5.8, KM.soil, 0, 0.06, 0, [0, Math.PI / 2, 0]);
  const crops = animPart(g, 'crops', 0, 0.12, 0);
  for (let r = 0; r < 7; r++) {
    const z = -2.4 + r * 0.8;
    kbox(crops, 5.2, 0.5, 0.36, r % 3 === 1 ? KM.sprouts : KM.wheat, 0, 0.25, z);
    kbox(crops, 5.2, 0.12, 0.44, KM.wheat, 0, 0.5, z);
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) kcyl(g, 0.06, 0.08, 0.8, 6, KM.bark, sx * 2.85, 0.4, sz * 2.85);
  for (const s of [-1, 1]) {
    kbox(g, 5.7, 0.05, 0.05, KM.timber, 0, 0.55, s * 2.85);
    kbox(g, 0.05, 0.05, 5.7, KM.timber, s * 2.85, 0.55, 0);
  }
  return 0.9;
};
COMMON_BUILDERS.palisade = (g) => {
  for (const [sx, sz] of [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]]) {
    const h = 2.1 + ((sx + sz + 1) * 7919 % 3) * 0.12;
    kcyl(g, 0.24, 0.26, h, 7, KM.bark, sx, h / 2, sz);
    kcyl(g, 0, 0.24, 0.42, 7, KM.palewood, sx, h + 0.21, sz);
  }
  return 2.7;
};
