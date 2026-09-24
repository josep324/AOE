import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/* =====================================================================
   MODELS DE LA NATURA: roures i pins, vetes d'or, pedreres, arbustos de baies i ovelles
   Geometries compartides (unes quantes variants de cada) amb textures pintades i
   color per vèrtex (ombra a la part baixa de les copes).
   ===================================================================== */
const natureRng = mulberry32(0x7ee5);
const nr = (a, b) => a + (b - a) * natureRng();
const NATURE = { cache: new Map(), mats: new Map() };
function natureCached(key, make) {
  if (!NATURE.cache.has(key)) NATURE.cache.set(key, make());
  return NATURE.cache.get(key);
}

/* ---------- Textures i materials (es creen el primer cop que calen) ---------- */
function leafTexture(base, colors, n = 2200, size = 2.4) {
  return canvasTexture(256, (g, s) => {
    g.fillStyle = base; g.fillRect(0, 0, s, s);
    for (let i = 0; i < n; i++) {
      g.fillStyle = colors[Math.floor(natureRng() * colors.length)];
      g.globalAlpha = nr(0.55, 1);
      const x = nr(0, s), y = nr(0, s), r = nr(size * 0.6, size * 1.6), a = nr(0, Math.PI);
      for (const ox of [0, -s, s]) for (const oy of [0, -s, s]) {
        g.beginPath(); g.ellipse(x + ox, y + oy, r, r * 0.55, a, 0, Math.PI * 2); g.fill();
      }
    }
    g.globalAlpha = 1;
  });
}
function natureMat(key, make) {
  if (!NATURE.mats.has(key)) NATURE.mats.set(key, fogify(make()));
  return NATURE.mats.get(key);
}
const NM = {
  get leaves() {
    return natureMat('leaves', () => new THREE.MeshStandardMaterial({
      map: leafTexture('#2c4418', ['#3f6122', '#4f7a2a', '#35531d', '#5f8a33', '#27401a', '#6e9a3c']), vertexColors: true, roughness: 0.9 }));
  },
  get needles() {
    return natureMat('needles', () => new THREE.MeshStandardMaterial({
      map: leafTexture('#2f4f30', ['#3f663e', '#4a7447', '#35583a', '#588550'], 2600, 1.6), vertexColors: true, roughness: 0.92 }));
  },
  get bush() {
    return natureMat('bush', () => new THREE.MeshStandardMaterial({
      map: leafTexture('#2f4a1c', ['#40652a', '#385a22', '#4d7632', '#2a4318'], 2400, 2), vertexColors: true, roughness: 0.9 }));
  },
  get bark() { return kitMat('bark'); },
  get rock() { return kitMat('granite', { flatShading: true, color: 0xd8cfc0 }); },
  get paleRock() { return kitMat('granite', { flatShading: true, color: 0xf2eee6 }); },
  get gold() { return natureMat('gold', () => new THREE.MeshStandardMaterial({ color: 0xf5c83a, metalness: 0.75, roughness: 0.25, emissive: 0x6a4600, emissiveIntensity: 0.55, flatShading: true })); },
  get berry() { return natureMat('berry', () => new THREE.MeshStandardMaterial({ color: 0xc0183e, roughness: 0.35, emissive: 0x30000c, emissiveIntensity: 0.5 })); },
  get wool() {
    return natureMat('wool', () => new THREE.MeshStandardMaterial({
      map: leafTexture('#e6e0d2', ['#f4f0e6', '#d6cfbf', '#fbf8f0', '#cbc3b1'], 1600, 3), roughness: 1 }));
  },
  get sheepSkin() { return mat(0x2e2824, { roughness: 0.8 }); },
};

/* ---------- Geometria ---------- */
/* Bola irregular (còpia de soroll a partir de la posició): serveix per a copes, arbustos i roques */
function lumpGeo(r, detail, seed, amp = 0.22, smooth = true) {
  let geo = new THREE.IcosahedronGeometry(r, detail);
  geo.deleteAttribute('uv');
  geo.deleteAttribute('normal');
  if (smooth) geo = mergeVertices(geo);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const n = fbm(x / r * 1.3 + seed * 3.1 + y / r * 0.7, z / r * 1.3 - seed * 1.7 + y / r * 0.9);
    const k = 1 + (n - 0.5) * 2 * amp;
    p.setXYZ(i, x * k, y * k, z * k);
  }
  // UV esfèriques a escala real (textura de fulles/pedra)
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    uv[i * 2] = (Math.atan2(z, x) / (2 * Math.PI) + 0.5) * r * 2.4;
    uv[i * 2 + 1] = (y / r * 0.5 + 0.5) * r * 1.2;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  if (!smooth && geo.index) geo = geo.toNonIndexed();
  geo.computeVertexNormals();
  return geo;
}
/* Color per vèrtex: fosc a sota (oclusió), una mica més clar a dalt i un to propi per peça */
function shadeByHeight(geo, yMin, yMax, tint) {
  const p = geo.attributes.position;
  const col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const t = THREE.MathUtils.clamp((p.getY(i) - yMin) / (yMax - yMin), 0, 1);
    const k = 0.42 + 0.68 * Math.pow(t, 0.8);
    col[i * 3] = tint.r * k; col[i * 3 + 1] = tint.g * k; col[i * 3 + 2] = tint.b * k;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}
function cleanForMerge(geo, withColor) {
  const g2 = geo.index ? geo.toNonIndexed() : geo;
  for (const k of Object.keys(g2.attributes)) if (!['position', 'normal', 'uv', ...(withColor ? ['color'] : [])].includes(k)) g2.deleteAttribute(k);
  return g2;
}
function mergeParts(parts, withColor = false) {
  return mergeGeometries(parts.map(p => cleanForMerge(p, withColor)), false);
}
function trunkGeo(h, r0, r1, bend = 0.15) {
  const geo = new THREE.CylinderGeometry(r1, r0, h, 9, 4);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i) / h + 0.5;
    p.setX(i, p.getX(i) + Math.sin(y * 2.2) * bend * y);
    if (y < 0.12) { const f = 1 + (0.12 - y) * 3.2; p.setX(i, p.getX(i) * f); p.setZ(i, p.getZ(i) * f); }
  }
  geo.translate(0, h / 2, 0);
  const circ = Math.PI * (r0 + r1);
  scaleUV(geo, (i, u, v) => [u * circ / 1.4, v * h / 1.4]);
  geo.computeVertexNormals();
  return geo;
}

/* ---------- Arbres ---------- */
function oakTemplate(v) {
  return natureCached('oak' + v, () => {
    const h = nr(2.3, 2.9);
    const trunks = [trunkGeo(h + 0.6, 0.42, 0.24, nr(0.05, 0.25))];
    for (let b = 0; b < 3; b++) {
      const a = b * 2.1 + nr(0, 1), br = trunkGeo(1.5, 0.14, 0.06, 0);
      br.rotateZ(nr(0.6, 0.95)); br.rotateY(a); br.translate(0, h * nr(0.6, 0.85), 0);
      trunks.push(br);
    }
    const crowns = [];
    const cy = h + 1.3, n = 6 + Math.floor(nr(0, 3));
    const tone = new THREE.Color().setHSL(nr(0.2, 0.28), nr(0.3, 0.5), 0.5);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + nr(-0.3, 0.3), d = i === 0 ? 0 : nr(0.8, 1.45);
      const r = i === 0 ? nr(1.5, 1.8) : nr(0.95, 1.35);
      const geo = lumpGeo(r, 2, v * 10 + i, 0.2);
      geo.scale(1, nr(0.75, 0.95), 1);
      geo.translate(Math.cos(a) * d, cy + (i === 0 ? 0.5 : nr(-0.4, 0.7)), Math.sin(a) * d);
      const t = tone.clone().offsetHSL(nr(-0.02, 0.02), 0, nr(-0.06, 0.08));
      crowns.push(shadeByHeight(geo, cy - 1.6, cy + 1.9, new THREE.Color(1, 1, 1).lerp(t.multiplyScalar(2), 0.45)));
    }
    return { parts: [[mergeParts(trunks), 'bark'], [mergeParts(crowns, true), 'leaves']] };
  });
}
function pineTemplate(v) {
  return natureCached('pine' + v, () => {
    const h = nr(4.6, 5.6);
    const trunk = trunkGeo(h, 0.3, 0.12, 0.04);
    const cones = [];
    const tiers = 5;
    for (let i = 0; i < tiers; i++) {
      const t = i / (tiers - 1);
      const r = THREE.MathUtils.lerp(1.9, 0.55, t) * nr(0.9, 1.08), ch = THREE.MathUtils.lerp(2.0, 1.4, t);
      const geo = new THREE.ConeGeometry(r, ch, 10, 3);
      const p = geo.attributes.position;
      for (let k = 0; k < p.count; k++) {
        const y = p.getY(k);
        const jag = y < -ch / 2 + 0.01 ? 1 + (hash2(p.getX(k) * 13 + i, p.getZ(k) * 11 + v) - 0.5) * 0.5 : 1 + (hash2(p.getX(k) * 7, p.getZ(k) * 5 + y) - 0.5) * 0.15;
        p.setX(k, p.getX(k) * jag); p.setZ(k, p.getZ(k) * jag);
        if (y < -ch / 2 + 0.01) p.setY(k, y - 0.25 * (jag - 0.8));
      }
      scaleUV(geo, (k, u, vv) => [u * r * 4, vv * ch]);
      geo.computeVertexNormals();
      geo.rotateY(nr(0, 3));
      const y0 = 1.3 + i * (h - 1.0) / tiers;
      geo.translate(0, y0 + ch / 2, 0);
      cones.push(shadeByHeight(geo, y0 - 0.2, y0 + ch, new THREE.Color(1, 1, 1)));
    }
    return { parts: [[trunk, 'bark'], [mergeParts(cones, true), 'needles']] };
  });
}
function makeTreeModel(x, z) {
  const pine = hash2(x * 0.071 + 3, z * 0.053 - 1) < 0.33;
  const v = Math.floor(hash2(x * 1.3, z * 1.7) * 6);
  const tpl = pine ? pineTemplate(v) : oakTemplate(v);
  const g = new THREE.Group();
  for (const [geo, m] of tpl.parts) g.add(new THREE.Mesh(geo, NM[m]));
  return g;
}

/* ---------- Or i pedra ---------- */
function mineBaseTemplate(kind, v) {
  return natureCached(kind + 'base' + v, () => {
    const rocks = [];
    const n = 5;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + nr(-0.4, 0.4), d = i === 0 ? 0 : nr(1.0, 1.6);
      const r = i === 0 ? nr(1.2, 1.5) : nr(0.7, 1.0);
      const geo = lumpGeo(r, 1, v * 7 + i + (kind === 'gold' ? 0 : 50), 0.3, false);
      geo.scale(1, nr(0.45, 0.7), 1);
      geo.rotateY(nr(0, 3));
      geo.translate(Math.cos(a) * d, r * 0.25, Math.sin(a) * d);
      rocks.push(geo);
    }
    return mergeParts(rocks);
  });
}
function mineChunksTemplate(kind, v) {
  return natureCached(kind + 'chunks' + v, () => {
    const parts = [];
    const n = kind === 'gold' ? 12 : 9;
    for (let i = 0; i < n; i++) {
      const a = nr(0, Math.PI * 2), d = nr(0.1, 1.5);
      const s = kind === 'gold' ? nr(0.22, 0.42) : nr(0.35, 0.6);
      let geo;
      if (kind === 'gold') geo = lumpGeo(s, 0, v * 13 + i, 0.35, false);
      else {
        geo = new THREE.BoxGeometry(s * 1.4, s, s);
        scaleUV(geo, (k, u, vv) => [u * s, vv * s]);
      }
      geo.rotateX(nr(0, 3)); geo.rotateY(nr(0, 3));
      geo.translate(Math.cos(a) * d, 0.55 + (1.5 - d) * 0.45 + s * 0.3, Math.sin(a) * d);
      parts.push(geo);
    }
    return mergeParts(parts);
  });
}
function makeMineModel(kind, x, z) {
  const v = Math.floor(hash2(x * 0.9, z * 1.1) * 3);
  const base = new THREE.Mesh(mineBaseTemplate(kind, v), kind === 'gold' ? NM.rock : NM.paleRock);
  const chunks = new THREE.Mesh(mineChunksTemplate(kind, v), kind === 'gold' ? NM.gold : kitMat('stone', { color: 0xe4e0d8 }));
  return { base, chunks };
}

/* ---------- Arbust de baies ---------- */
function bushTemplate(v) {
  return natureCached('bush' + v, () => {
    const blobs = [], berries = [];
    const n = 4;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + nr(-0.3, 0.3), d = i === 0 ? 0 : nr(0.45, 0.65);
      const r = i === 0 ? nr(0.75, 0.9) : nr(0.5, 0.7);
      const geo = lumpGeo(r, 2, v * 5 + i + 200, 0.18);
      geo.scale(1, 0.8, 1);
      const cx = Math.cos(a) * d, cy = 0.45 + nr(0, 0.15), cz = Math.sin(a) * d;
      geo.translate(cx, cy, cz);
      blobs.push(shadeByHeight(geo, 0, 1.3, new THREE.Color(1, 1, 1)));
      for (let k = 0; k < 7; k++) {
        const th = nr(0, Math.PI * 2), ph = nr(0.2, 1.3);
        berries.push(new THREE.Vector3(cx + Math.cos(th) * Math.sin(ph) * r, cy + Math.cos(ph) * r * 0.8, cz + Math.sin(th) * Math.sin(ph) * r));
      }
    }
    return { geo: mergeParts(blobs, true), berries };
  });
}
const berryGeoShared = new THREE.SphereGeometry(0.085, 8, 6);

/* ---------- Ovella ---------- */
const SHEEP_WOOL = [0xffffff, 0xf1e7d2, 0xdcd6cc, 0x5a524c];
const SHEEP_FACE = [0x2e2824, 0xe9dfcf, 0x4a3a30];
function sheepWoolMat(i) {
  return natureMat('wool' + i, () => new THREE.MeshStandardMaterial({ map: NM.wool.map, color: SHEEP_WOOL[i], roughness: 1 }));
}
const sheepParts = {
  body: null,
  get() {
    if (!this.body) {
      // Cos de llana: un volum principal i diversos flocs
      const lumps = [];
      const main = lumpGeo(0.5, 2, 3.3, 0.1);
      main.scale(1.0, 0.82, 1.35);
      lumps.push(main);
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2, r = nr(0.2, 0.26);
        const l = lumpGeo(r, 1, 10 + i, 0.15);
        l.translate(Math.cos(a) * 0.36, 0.22 + nr(-0.05, 0.1), Math.sin(a) * 0.52);
        lumps.push(l);
      }
      const tail = lumpGeo(0.12, 1, 40, 0.1); tail.translate(0, 0.12, -0.72);
      lumps.push(tail);
      this.body = mergeParts(lumps);
      this.face = new THREE.SphereGeometry(1, 12, 10).scale(0.14, 0.16, 0.27).translate(0, 0, 0.12);
      this.cap = lumpGeo(0.14, 1, 77, 0.15);
      this.ear = new THREE.SphereGeometry(1, 8, 6).scale(0.11, 0.035, 0.06);
      this.eye = new THREE.SphereGeometry(0.03, 6, 5);
      this.leg = new THREE.CylinderGeometry(0.05, 0.04, 0.5, 6).translate(0, -0.25, 0);
      this.hoof = new THREE.CylinderGeometry(0.05, 0.055, 0.06, 6).translate(0, -0.5, 0);
    }
    return this;
  },
};
