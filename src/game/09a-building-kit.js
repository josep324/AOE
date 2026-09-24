import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/* =====================================================================
   KIT D'EDIFICIS «ESTIL AoE II»
   Textures pintades en temps d'execució (pedra, arrebossat, fusta, palla, taulons),
   peces amb coordenades de textura a escala real i fusió de malles per material
   perquè cada edifici sigui només un grapat de crides de dibuix.
   ===================================================================== */

/* Generador propi: les textures no consumeixen el rand() de la partida */
const kitRng = (() => {
  let s = 0x2f6b1d;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
})();
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
    const r = kr(rMin, rMax), x = kr(0, size), y = kr(0, size);
    // Repetició als marges perquè la textura enllaci sense costures
    for (const ox of [-size, 0, size]) for (const oy of [-size, 0, size]) {
      g.beginPath();
      g.ellipse(x + ox, y + oy, r, r * kr(0.5, 1), kr(0, 3.14), 0, Math.PI * 2);
      g.fill();
    }
  }
  g.globalAlpha = 1;
}

const KIT_TEX = {
  plaster: canvasTexture(256, (g, s) => {
    g.fillStyle = '#cbbd9c'; g.fillRect(0, 0, s, s);
    speckle(g, s, 90, ['#b9a985', '#d8cbad', '#a8987a'], 10, 38, 0.25);
    speckle(g, s, 900, ['#9c8c6e', '#e2d6bb'], 0.6, 2, 0.35);
  }),
  stone: canvasTexture(256, (g, s) => {
    g.fillStyle = '#5a554c'; g.fillRect(0, 0, s, s);   // morter
    let y = 0;
    const rows = [];
    while (y < s - 20) { const h = Math.round(kr(26, 40)); rows.push([y, h]); y += h; }
    rows[rows.length - 1][1] += s - y;                 // l'última fila tanca la textura
    for (const [ry, rh] of rows) {
      let x = -kr(0, 30);
      while (x < s) {
        const w = kr(34, 70);
        const tone = kr(0.78, 1.12);
        const base = kitRng() < 0.25 ? '#a39580' : '#948f84';
        for (const ox of [0, s]) {
          g.fillStyle = shade(base, tone);
          g.beginPath();
          g.roundRect(x + 2 - ox, ry + 2, w - 4, rh - 4, 5);
          g.fill();
          g.fillStyle = shade(base, tone * 1.18);          // aresta superior il·luminada
          g.fillRect(x + 5 - ox, ry + 3, w - 10, 3);
          g.fillStyle = shade(base, tone * 0.72);          // ombra inferior
          g.fillRect(x + 4 - ox, ry + rh - 6, w - 8, 3);
        }
        x += w;
      }
    }
    speckle(g, s, 700, ['#6d675c', '#b3aa98'], 0.6, 1.8, 0.4);
  }),
  timber: canvasTexture(128, (g, s) => {
    g.fillStyle = '#4b3524'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 70; i++) {
      g.strokeStyle = kitRng() < 0.5 ? '#3a281a' : '#5c4330';
      g.globalAlpha = kr(0.3, 0.8);
      g.lineWidth = kr(0.6, 2);
      const y = kr(0, s);
      g.beginPath(); g.moveTo(0, y);
      g.bezierCurveTo(s * 0.3, y + kr(-3, 3), s * 0.7, y + kr(-3, 3), s, y);
      g.stroke();
    }
    g.globalAlpha = 1;
  }),
  planks: canvasTexture(256, (g, s) => {
    const n = 6, pw = s / n;
    for (let i = 0; i < n; i++) {
      g.fillStyle = shade('#6b4b30', kr(0.8, 1.15));
      g.fillRect(i * pw, 0, pw, s);
      for (let k = 0; k < 14; k++) {
        g.strokeStyle = kitRng() < 0.5 ? '#4f3622' : '#7e5c3e';
        g.globalAlpha = kr(0.25, 0.6);
        g.lineWidth = kr(0.5, 1.5);
        const x = i * pw + kr(3, pw - 3);
        g.beginPath(); g.moveTo(x, 0); g.lineTo(x + kr(-2, 2), s); g.stroke();
      }
      g.globalAlpha = 1;
      g.fillStyle = '#2a1c10';
      g.fillRect(i * pw, 0, 2, s);
    }
  }),
  thatch: canvasTexture(256, (g, s) => {
    g.fillStyle = '#8c7442'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 2600; i++) {
      g.strokeStyle = ['#a88d52', '#7a6337', '#b89c5e', '#6a5530', '#c2a869'][Math.floor(kitRng() * 5)];
      g.globalAlpha = kr(0.35, 0.9);
      g.lineWidth = kr(0.7, 1.8);
      const x = kr(0, s), y = kr(0, s), l = kr(10, 26);
      for (const oy of [0, -s]) {
        g.beginPath(); g.moveTo(x, y + oy); g.lineTo(x + kr(-2, 2), y + l + oy); g.stroke();
      }
    }
    g.globalAlpha = 0.35;
    g.fillStyle = '#4d3d20';                            // capes de palla
    for (let k = 0; k < 4; k++) g.fillRect(0, k * s / 4 + s / 4 - 5, s, 5);
    g.globalAlpha = 1;
  }),
  dirt: canvasTexture(256, (g, s) => {
    g.fillStyle = '#7d6547'; g.fillRect(0, 0, s, s);
    speckle(g, s, 120, ['#6e573b', '#8c7454', '#75603f'], 8, 30, 0.35);
    speckle(g, s, 1500, ['#5b4730', '#9a8466', '#6b6b5b'], 0.6, 2.2, 0.5);
  }),
  straw: canvasTexture(128, (g, s) => {
    g.fillStyle = '#b89a55'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 700; i++) {
      g.strokeStyle = kitRng() < 0.5 ? '#9c7f40' : '#d2b674';
      g.globalAlpha = kr(0.4, 0.9); g.lineWidth = kr(0.6, 1.4);
      const x = kr(0, s), y = kr(0, s), a = kr(-0.5, 0.5);
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 12, y + Math.sin(a) * 12); g.stroke();
    }
    g.globalAlpha = 1;
  }),
};

/* Materials texturats (un per tipus); tile = metres que ocupa una repetició de la textura */
const KIT_TILE = { plaster: 2.2, stone: 1.6, timber: 1.2, planks: 1.4, thatch: 1.6, dirt: 3, straw: 1 };
function kitMat(name, extra = {}) {
  const key = 'kit:' + name + JSON.stringify(extra);
  if (!matCache.has(key)) {
    const tex = KIT_TEX[name];
    const bump = (name === 'stone' || name === 'thatch' || name === 'planks') ? { bumpMap: tex, bumpScale: name === 'stone' ? 2.5 : 1.2 } : {};
    matCache.set(key, fogify(new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92, metalness: 0, ...bump, ...extra })));
  }
  const m = matCache.get(key);
  m.userData.tile = KIT_TILE[name];
  return m;
}
const KM = {
  get plaster() { return kitMat('plaster'); },
  get stone() { return kitMat('stone'); },
  get timber() { return kitMat('timber'); },
  get planks() { return kitMat('planks'); },
  get thatch() { return kitMat('thatch'); },
  get dirt() { return kitMat('dirt'); },
  get straw() { return kitMat('straw'); },
  get dark() { return mat(0x1c140d, { roughness: 1 }); },
  get iron() { return mat(0x55575c, { metalness: 0.6, roughness: 0.5 }); },
  team(team) { return mat(teamOf(team).color, { roughness: 0.85 }); },
  teamDark(team) { return mat(teamOf(team).colorDark, { roughness: 0.85 }); },
};

/* ---------- Peces amb coordenades de textura a escala del món ---------- */
function scaleUV(geo, fn) {
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) { const [u, v] = fn(i, uv.getX(i), uv.getY(i)); uv.setXY(i, u, v); }
  return geo;
}
function kbox(g, w, h, d, material, x, y, z, rot = null) {
  const tile = material.userData.tile || 1;
  const geo = scaleUV(new THREE.BoxGeometry(w, h, d), (i, u, v) => {
    const f = Math.floor(i / 4);                       // +x, -x, +y, -y, +z, -z
    if (f < 2) return [u * d / tile, v * h / tile];
    if (f < 4) return [u * w / tile, v * d / tile];
    return [u * w / tile, v * h / tile];
  });
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  if (rot) m.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0);
  g.add(m);
  return m;
}
function kcyl(g, rt, rb, h, seg, material, x, y, z, rot = null) {
  const tile = material.userData.tile || 1;
  const circ = Math.PI * (rt + rb);
  const geo = scaleUV(new THREE.CylinderGeometry(rt, rb, h, seg), (i, u, v) => [u * circ / tile, v * h / tile]);
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  if (rot) m.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0);
  g.add(m);
  return m;
}
/* Triangle vertical (frontó) al pla XY, cara cap a +Z */
function kgable(g, w, h, material, x, y, z, rotY) {
  const tile = material.userData.tile || 1;
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, h); s.closePath();
  const geo = scaleUV(new THREE.ShapeGeometry(s), (i, u, v) => [u / tile, v / tile]);
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.rotation.y = rotY;
  g.add(m);
  return m;
}

/* Teulada a dues aigües amb el carener en l'eix X, sobre un cos de w×d que acaba a l'alçada y0 */
function gableRoof(g, { w, d, h, over = 0.35, t = 0.22, y0, x = 0, z = 0, roofMat = KM.thatch, gableMat = KM.plaster, frame = true }) {
  const half = d / 2 + over;
  const a = Math.atan2(h, d / 2);
  const len = half / Math.cos(a);
  for (const sz of [-1, 1]) {
    const cz = z + sz * half / 2;
    const cy = y0 + h - (half / 2) * Math.tan(a) + t / 2 / Math.cos(a);
    kbox(g, w + over * 2, t, len, roofMat, x, cy, cz, [sz * a, 0, 0]);
  }
  // Carener
  kbox(g, w + over * 2 + 0.05, t * 1.1, 0.34, roofMat, x, y0 + h + t * 0.75, z, [Math.PI / 4, 0, 0]);
  // Frontons (amb pal central i biga si l'edifici és d'entramat)
  for (const sx of [-1, 1]) {
    kgable(g, d, h, gableMat, x + sx * w / 2, y0, z, sx * Math.PI / 2);
    if (frame) {
      kbox(g, 0.12, h * 0.92, 0.14, KM.timber, x + sx * (w / 2 + 0.03), y0 + h * 0.46, z);
      kbox(g, 0.12, 0.12, d * 0.62, KM.timber, x + sx * (w / 2 + 0.03), y0 + h * 0.36, z);
    }
  }
}

/* Paret d'entramat de fusta: bigues sobre la cara d'un cos (local: cara cap a +Z, amplada w, alçada h) */
function timberFace(g, { w, h, y0, px, pz, rotY, door = null, windows = [] }) {
  const f = new THREE.Group();
  f.position.set(px, 0, pz);
  f.rotation.y = rotY;
  const T = KM.timber, e = 0.035;
  const posts = Math.max(2, Math.round(w / 1.1) + 1);
  for (let i = 0; i < posts; i++) {
    const x = -w / 2 + 0.06 + (w - 0.12) * i / (posts - 1);
    if (door && Math.abs(x - door.x) < door.w / 2 + 0.05) continue;
    kbox(f, 0.13, h, 0.1, T, x, y0 + h / 2, e);
  }
  kbox(f, w + 0.04, 0.14, 0.11, T, 0, y0 + 0.07, e);         // solera
  kbox(f, w + 0.04, 0.14, 0.11, T, 0, y0 + h - 0.07, e);     // biga superior
  kbox(f, w, 0.1, 0.1, T, 0, y0 + h * 0.52, e);             // travesser
  // Riostres en diagonal als extrems
  const bw = (w - 0.12) / (posts - 1), bh = h * 0.5;
  const diag = Math.hypot(bw, bh), ang = Math.atan2(bh, bw);
  for (const sx of [-1, 1]) {
    const cx = sx * (w / 2 - 0.06 - bw / 2);
    if (door && Math.abs(cx - door.x) < door.w / 2 + bw / 2) continue;
    kbox(f, diag, 0.1, 0.09, T, cx, y0 + h * 0.52 + bh / 2, e, [0, 0, sx * ang]);
  }
  if (door) {
    kbox(f, door.w + 0.24, door.h + 0.12, 0.12, T, door.x, y0 + door.h / 2 + 0.03, e + 0.01);
    kbox(f, door.w, door.h, 0.08, KM.planks, door.x, y0 + door.h / 2, e + 0.04);
    kbox(f, door.w * 0.8, 0.06, 0.04, KM.iron, door.x, y0 + door.h * 0.72, e + 0.1);
    kbox(f, door.w * 0.8, 0.06, 0.04, KM.iron, door.x, y0 + door.h * 0.28, e + 0.1);
  }
  for (const wn of windows) {
    const wy = y0 + (wn.y ?? h * 0.62);
    kbox(f, wn.w + 0.16, wn.h + 0.16, 0.1, T, wn.x, wy, e + 0.01);
    kbox(f, wn.w, wn.h, 0.06, KM.dark, wn.x, wy, e + 0.03);
    for (const sx of [-1, 1]) kbox(f, wn.w * 0.5, wn.h, 0.05, KM.planks, wn.x + sx * wn.w * 0.78, wy, e + 0.05, [0, sx * 0.35, 0]);
  }
  g.add(f);
  return f;
}
/* Entramat a les quatre cares d'un cos centrat a (cx, cz) */
function timberBody(g, { w, d, h, y0, cx = 0, cz = 0, front = {}, back = {}, left = {}, right = {} }) {
  kbox(g, w, h, d, KM.plaster, cx, y0 + h / 2, cz);
  timberFace(g, { w, h, y0, px: cx, pz: cz + d / 2, rotY: 0, ...front });
  timberFace(g, { w, h, y0, px: cx, pz: cz - d / 2, rotY: Math.PI, ...back });
  timberFace(g, { w: d, h, y0, px: cx + w / 2, pz: cz, rotY: Math.PI / 2, ...right });
  timberFace(g, { w: d, h, y0, px: cx - w / 2, pz: cz, rotY: -Math.PI / 2, ...left });
}

/* ---------- Detalls ---------- */
function kBarrel(g, x, z, s = 1) {
  kcyl(g, 0.3 * s, 0.26 * s, 0.75 * s, 12, KM.planks, x, 0.375 * s, z);
  for (const y of [0.15, 0.6]) kcyl(g, 0.305 * s, 0.305 * s, 0.05 * s, 12, KM.iron, x, y * s, z);
}
function kCrate(g, x, z, s = 1, r = 0) {
  kbox(g, 0.6 * s, 0.6 * s, 0.6 * s, KM.planks, x, 0.3 * s, z, [0, r, 0]);
}
function kLogPile(g, x, z, rotY = 0) {
  const p = new THREE.Group();
  p.position.set(x, 0, z); p.rotation.y = rotY;
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3 - r; c++) {
    kcyl(p, 0.14, 0.14, 1.3, 8, KM.timber, 0, 0.15 + r * 0.25, (c - (2 - r) / 2) * 0.3, [0, 0, Math.PI / 2]);
  }
  g.add(p);
}
function kStakeFence(g, x0, z0, x1, z1, h = 1.1, gap = 0.26) {
  const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(2, Math.round(len / gap));
  for (let i = 0; i <= n; i++) {
    const t = i / n, hh = h * kr(0.85, 1.05);
    const x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t;
    kcyl(g, 0.09, 0.1, hh, 6, KM.timber, x, hh / 2, z);
    kcyl(g, 0, 0.09, 0.22, 6, KM.timber, x, hh + 0.11, z);
  }
  const rail = kbox(g, len, 0.08, 0.06, KM.timber, (x0 + x1) / 2, h * 0.55, (z0 + z1) / 2);
  rail.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
}
function kBanner(g, team, x, z, h = 3.6) {
  kcyl(g, 0.05, 0.06, h, 6, KM.timber, x, h / 2, z);
  kbox(g, 0.7, 0.05, 0.05, KM.timber, x + 0.3, h - 0.1, z);
  kbox(g, 0.62, 1.1, 0.03, KM.team(team), x + 0.3, h - 0.72, z);
  kbox(g, 0.62, 0.12, 0.035, KM.teamDark(team), x + 0.3, h - 1.2, z);
}

/* ---------- Fusió per material: menys crides de dibuix ---------- */
function bakeGroup(src) {
  src.updateMatrixWorld(true);
  const byMat = new Map();
  src.traverse(o => {
    if (!o.isMesh) return;
    let geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    geo.applyMatrix4(o.matrixWorld);
    for (const k of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(k)) geo.deleteAttribute(k);
    if (!byMat.has(o.material)) byMat.set(o.material, []);
    byMat.get(o.material).push(geo);
  });
  const out = new THREE.Group();
  for (const [m, geos] of byMat) {
    const merged = mergeGeometries(geos, false);
    for (const gg of geos) gg.dispose();
    out.add(new THREE.Mesh(merged, m));
  }
  return out;
}

/* ---------- Edificis ---------- */
const KIT_BUILDERS = {
  house(g, team, variant) {
    const flip = variant % 2 ? -1 : 1;
    kbox(g, 3.5, 0.4, 2.9, KM.stone, 0, 0.2, 0);
    timberBody(g, {
      w: 3.1, d: 2.5, h: 1.85, y0: 0.4,
      front: { door: { x: -0.55 * flip, w: 0.75, h: 1.35 }, windows: [{ x: 0.75 * flip, w: 0.5, h: 0.45 }] },
      back: { windows: [{ x: 0, w: 0.5, h: 0.45 }] },
      right: { windows: variant === 2 ? [{ x: 0, w: 0.45, h: 0.4 }] : [] },
    });
    gableRoof(g, { w: 3.1, d: 2.5, h: 1.45, over: 0.38, y0: 2.25 });
    // Xemeneia de pedra
    kbox(g, 0.5, 1.9, 0.5, KM.stone, 1.05 * flip, 3.3, -0.55);
    kbox(g, 0.6, 0.12, 0.6, KM.stone, 1.05 * flip, 4.28, -0.55);
    // Tendal amb el color de l'equip sobre la porta
    kbox(g, 1.05, 0.05, 0.55, KM.team(team), -0.55 * flip, 1.95, 1.5, [0.35, 0, 0]);
    // Llenya i barril
    if (variant !== 1) kLogPile(g, 1.95 * flip, 0.3, Math.PI / 2);
    kBarrel(g, 1.2 * flip, 1.55, 0.9);
    if (variant === 1) kCrate(g, -1.75, -1.1, 0.9, 0.4);
    return 4.4;
  },
  barracks(g, team) {
    // Sala principal (al fons de la parcel·la)
    const hz = -1.45;
    kbox(g, 6.4, 0.45, 3.5, KM.stone, 0, 0.225, hz);
    kbox(g, 6.0, 0.8, 3.1, KM.stone, 0, 0.85, hz);            // sòcol de pedra
    timberBody(g, {
      w: 6.0, d: 3.1, h: 1.6, y0: 1.25, cz: hz,
      front: { windows: [{ x: -1.9, w: 0.5, h: 0.45 }, { x: 1.9, w: 0.5, h: 0.45 }] },
      back: { windows: [{ x: -1.4, w: 0.5, h: 0.45 }, { x: 1.4, w: 0.5, h: 0.45 }] },
    });
    // Portalada de doble fulla
    kbox(g, 1.7, 2.15, 0.2, KM.timber, 0, 1.52, hz + 1.6);
    kbox(g, 1.4, 1.95, 0.1, KM.planks, 0, 1.42, hz + 1.66);
    kbox(g, 0.05, 1.95, 0.12, KM.dark, 0, 1.42, hz + 1.68);
    kbox(g, 1.9, 0.18, 0.22, KM.stone, 0, 0.54, hz + 1.9);   // graó
    gableRoof(g, { w: 6.0, d: 3.1, h: 1.65, over: 0.45, y0: 2.85, z: hz });
    // Pati d'entrenament amb terra batuda i estacada
    kbox(g, 6.3, 0.06, 3.0, KM.dirt, 0, 0.03, 1.75);
    kStakeFence(g, -3.1, 0.4, -3.1, 3.2);
    kStakeFence(g, 3.1, 0.4, 3.1, 3.2);
    kStakeFence(g, -3.1, 3.2, -0.9, 3.2);
    kStakeFence(g, 0.9, 3.2, 3.1, 3.2);
    // Armer amb llances i escuts de l'equip
    // Cobert lateral de palla que protegeix l'armer
    for (const [px, ph] of [[-2.95, 2.25], [-1.7, 1.75]]) for (const pz of [0.55, 2.55]) kcyl(g, 0.07, 0.08, ph, 6, KM.timber, px, ph / 2, pz);
    for (const [px, ph] of [[-2.95, 2.25], [-1.7, 1.75]]) kbox(g, 0.12, 0.12, 2.2, KM.timber, px, ph, 1.55);
    kbox(g, 1.75, 0.16, 2.6, KM.thatch, -2.3, 2.1, 1.55, [0, 0, -0.38]);
    const rack = new THREE.Group();
    rack.position.set(-2.55, 0, 1.55);
    rack.rotation.y = Math.PI / 2;
    kbox(rack, 1.6, 0.1, 0.12, KM.timber, 0, 1.15, 0);
    kbox(rack, 1.6, 0.1, 0.12, KM.timber, 0, 0.35, 0.15);
    for (const sx of [-1, 1]) kbox(rack, 0.1, 1.3, 0.1, KM.timber, sx * 0.75, 0.65, 0);
    for (let i = 0; i < 5; i++) {
      kcyl(rack, 0.025, 0.025, 2.1, 5, KM.timber, -0.6 + i * 0.3, 1.05, 0.05, [-0.12, 0, 0]);
      kcyl(rack, 0, 0.05, 0.22, 5, KM.iron, -0.6 + i * 0.3, 2.2, -0.08, [-0.12, 0, 0]);
    }
    for (const sx of [-0.45, 0.45]) kcyl(rack, 0.28, 0.28, 0.06, 12, KM.team(team), sx, 0.62, 0.26, [Math.PI / 2 - 0.2, 0, 0]);
    g.add(rack);
    // Ninot d'entrenament
    kcyl(g, 0.07, 0.08, 1.8, 6, KM.timber, 1.2, 0.9, 1.6);
    kbox(g, 1.0, 0.1, 0.1, KM.timber, 1.2, 1.4, 1.6);
    kcyl(g, 0.26, 0.24, 0.7, 10, KM.straw, 1.2, 1.25, 1.6);
    kcyl(g, 0.17, 0.17, 0.32, 10, KM.straw, 1.2, 1.78, 1.6);
    // Diana de tir amb arc
    kcyl(g, 0.55, 0.55, 0.22, 16, KM.straw, 2.3, 0.85, 2.3, [Math.PI / 2 - 0.25, 0, 0]);
    kcyl(g, 0.3, 0.3, 0.23, 16, KM.team(team), 2.3, 0.85, 2.3, [Math.PI / 2 - 0.25, 0, 0]);
    for (const sx of [-1, 1]) kbox(g, 0.08, 1.1, 0.08, KM.timber, 2.3 + sx * 0.35, 0.5, 2.15, [0.25, 0, 0]);
    // Estendards i provisions
    kBanner(g, team, -1.3, 3.0, 3.8);
    kBanner(g, team, 2.75, 3.0, 3.8);
    kBarrel(g, 2.65, 0.75);
    kBarrel(g, 2.2, 0.62, 0.85);
    kCrate(g, -0.9, 0.75, 0.85, 0.3);
    kCrate(g, -0.95, 1.35, 0.7, 0.9);
    return 5.4;
  },
};

const kitCache = new Map();
/* Model d'un edifici del kit (null si el tipus encara no hi és) */
function kitBuildingModel(type, team) {
  const build = KIT_BUILDERS[type];
  if (!build) return null;
  const variants = type === 'house' ? 3 : 1;
  const variant = Math.floor(rand() * variants);
  const key = type + ':' + team + ':' + variant;
  if (!kitCache.has(key)) {
    const g = new THREE.Group();
    const height = build(g, team, variant);
    kitCache.set(key, { tpl: bakeGroup(g), height });
  }
  const { tpl, height } = kitCache.get(key);
  const model = new THREE.Group();
  for (const m of tpl.children) model.add(new THREE.Mesh(m.geometry, m.material));
  return { model, height };
}
