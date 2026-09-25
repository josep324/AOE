/* =====================================================================
   RELLEU DEL TERRENY
   Mapa d'alçades amb una cel·la cada 2 m sobre la zona jugable (i una mica més enllà).
   Cada tipus de mapa té turons diferents (Aràbia és el més accidentat); les bases dels jugadors
   i la vora de l'aigua queden planes, i el fons dels llacs i rius queda sota l'aigua.
   Els edificis anivellen el terreny que ocupen (com a l'AoE II) i no es poden construir en un
   pendent massa fort. groundY(x, z) dona l'alçada de qualsevol punt (interpolació bilineal).
   ===================================================================== */
const TERRAIN = { hs: 2, pad: 30, n: 0, x0: 0, h: null, mesh: null, mmCanvas: null, maxH: 0, dirty: false };
const TERRAIN_AMP = { arabia: 9, blackforest: 5, lakes: 5.5, rivers: 5.5 };
const MAX_BUILD_SLOPE = 3.2;          // desnivell màxim (m) dins la planta d'un edifici

function terrainInit() {
  const L = CONFIG.MAP_LIMIT, T = TERRAIN;
  T.x0 = -(L + T.pad);
  T.n = Math.round((2 * (L + T.pad)) / T.hs) + 1;
  T.h = new Float32Array(T.n * T.n);
}
/* Alçada del terreny en un punt */
function groundY(x, z) {
  const T = TERRAIN;
  if (!T.h) return 0;
  const fx = (x - T.x0) / T.hs, fz = (z - T.x0) / T.hs;
  const i = Math.floor(fx), j = Math.floor(fz);
  if (i < 0 || j < 0 || i >= T.n - 1 || j >= T.n - 1) return 0;
  const tx = fx - i, tz = fz - j, n = T.n, h = T.h;
  const a = h[j * n + i], b = h[j * n + i + 1], c = h[(j + 1) * n + i], d = h[(j + 1) * n + i + 1];
  return (a * (1 - tx) + b * tx) * (1 - tz) + (c * (1 - tx) + d * tx) * tz;
}
/* Distància (m) de cada cel·la d'1 m a l'aigua més propera (dues passades de xamfrà) */
function waterDistanceField() {
  const N = WATER.N, D = new Float32Array(N * N).fill(1e9);
  for (let k = 0; k < N * N; k++) if (WATER.mask[k]) D[k] = 0;
  const S2 = Math.SQRT2;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const k = j * N + i;
    let v = D[k];
    if (i > 0) v = Math.min(v, D[k - 1] + 1);
    if (j > 0) { v = Math.min(v, D[k - N] + 1); if (i > 0) v = Math.min(v, D[k - N - 1] + S2); if (i < N - 1) v = Math.min(v, D[k - N + 1] + S2); }
    D[k] = v;
  }
  for (let j = N - 1; j >= 0; j--) for (let i = N - 1; i >= 0; i--) {
    const k = j * N + i;
    let v = D[k];
    if (i < N - 1) v = Math.min(v, D[k + 1] + 1);
    if (j < N - 1) { v = Math.min(v, D[k + N] + 1); if (i < N - 1) v = Math.min(v, D[k + N + 1] + S2); if (i > 0) v = Math.min(v, D[k + N - 1] + S2); }
    D[k] = v;
  }
  return D;
}
/* Genera el relleu d'un mapa (sempre el mateix per a la mateixa llavor) */
function setupHeights(type, seed) {
  if (!TERRAIN.h) terrainInit();
  const T = TERRAIN, L = CONFIG.MAP_LIMIT, n = T.n;
  const rng = mulberry32((seed ^ 0x4e1ff) >>> 0);
  const ox = rng() * 300, oz = rng() * 300, ox2 = rng() * 300, oz2 = rng() * 300;
  const amp = TERRAIN_AMP[type] ?? 4;
  const wd = WATER.any ? waterDistanceField() : null, WN = WATER.N;
  const bases = Object.values(BASES);
  let maxH = 0;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = T.x0 + i * T.hs, z = T.x0 + j * T.hs;
    // Turons: taques de soroll suau, amb el cim arrodonit, i ondulacions petites per tot arreu
    let h = THREE.MathUtils.smoothstep(fbm(x * 0.016 + ox, z * 0.016 + oz), 0.47, 0.76) * amp;
    h += (fbm(x * 0.055 + ox2, z * 0.055 + oz2) - 0.5) * 0.9;
    // Bases planes (el Centre, les cases i els recursos de sortida)
    for (const B of bases) h *= THREE.MathUtils.smoothstep(Math.hypot(x - B.x, z - B.z), 30, 52);
    // Fora de la zona jugable: baixa fins a 0
    const edge = Math.max(Math.abs(x), Math.abs(z)) - L;
    if (edge > 0) h *= 1 - THREE.MathUtils.smoothstep(edge, 0, T.pad * 0.8);
    // Aigua: fons sota el nivell de l'aigua i riba en pendent suau
    if (wd) {
      const wi = Math.floor(x + L), wj = Math.floor(z + L);
      if (wi >= 0 && wj >= 0 && wi < WN && wj < WN) {
        const k = wj * WN + wi, m = WATER.mask[k];
        if (m === 1) h = -0.75;
        else if (m === 2) h = -0.15;
        else h = Math.max(h, 0) * THREE.MathUtils.smoothstep(wd[k], 1, 12) + 0.02;
      }
    }
    T.h[j * n + i] = h;
    maxH = Math.max(maxH, h);
  }
  T.maxH = maxH;
  applyTerrainMesh();
  buildTerrainMinimap();
}
/* Anivella el terreny sota un edifici (a l'alçada mitjana de la planta). Retorna l'alçada */
function flattenArea(x, z, hw, hd, apply = true) {
  const T = TERRAIN;
  if (!T.h) return 0;
  const i0 = Math.max(0, Math.floor((x - hw - T.x0) / T.hs)), i1 = Math.min(T.n - 1, Math.ceil((x + hw - T.x0) / T.hs));
  const j0 = Math.max(0, Math.floor((z - hd - T.x0) / T.hs)), j1 = Math.min(T.n - 1, Math.ceil((z + hd - T.x0) / T.hs));
  let sum = 0, cnt = 0;
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { sum += T.h[j * T.n + i]; cnt++; }
  const level = cnt ? sum / cnt : 0;
  if (!apply) return level;
  // Planta a nivell i una vora que baixa suaument cap al terreny del voltant
  const ring = 2;
  for (let j = j0 - ring; j <= j1 + ring; j++) for (let i = i0 - ring; i <= i1 + ring; i++) {
    if (i < 0 || j < 0 || i >= T.n || j >= T.n) continue;
    const di = Math.max(i0 - i, i - i1, 0), dj = Math.max(j0 - j, j - j1, 0);
    const d = Math.max(di, dj);
    const k = j * T.n + i;
    const w = d === 0 ? 1 : 1 - d / (ring + 1);
    T.h[k] = T.h[k] * (1 - w) + level * w;
  }
  updateTerrainMesh(i0 - ring, j0 - ring, i1 + ring, j1 + ring);
  return level;
}
/* Desnivell dins d'una planta (per no construir en pendents massa forts) */
function slopeIn(x, z, hw, hd) {
  let lo = Infinity, hi = -Infinity;
  for (let dz = -hd; dz <= hd + 0.01; dz += Math.max(1, hd)) for (let dx = -hw; dx <= hw + 0.01; dx += Math.max(1, hw)) {
    const h = groundY(x + dx, z + dz);
    lo = Math.min(lo, h); hi = Math.max(hi, h);
  }
  return hi - lo;
}

/* ---------- Malla del terreny: una graella que segueix el mapa d'alçades ---------- */
function makeTerrainMesh(material) {
  if (!TERRAIN.h) terrainInit();
  const T = TERRAIN, n = T.n, P = GROUND_PAINT;
  const pos = new Float32Array(n * n * 3), uv = new Float32Array(n * n * 2);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const k = j * n + i, x = T.x0 + i * T.hs, z = T.x0 + j * T.hs;
    pos[k * 3] = x; pos[k * 3 + 1] = T.h[k]; pos[k * 3 + 2] = z;
    uv[k * 2] = (x + P.span / 2) / P.span; uv[k * 2 + 1] = 1 - (z + P.span / 2) / P.span;
  }
  const idx = new Uint32Array((n - 1) * (n - 1) * 6);
  let q = 0;
  for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) {
    const a = j * n + i, b = a + 1, c = a + n, d = c + 1;
    idx[q++] = a; idx[q++] = c; idx[q++] = b;
    idx[q++] = b; idx[q++] = c; idx[q++] = d;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * n * 3).fill(1), 3));
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  const mesh = new THREE.Mesh(geo, material);
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  mesh.name = 'terrain';
  T.mesh = mesh;
  return mesh;
}
function applyTerrainMesh() {
  const T = TERRAIN;
  if (!T.mesh) return;
  const p = T.mesh.geometry.attributes.position;
  for (let k = 0; k < T.n * T.n; k++) p.array[k * 3 + 1] = T.h[k];
  p.needsUpdate = true;
  T.mesh.geometry.computeVertexNormals();
  T.mesh.geometry.computeBoundingSphere();
  terrainShade();
}
/* Ombrejat del relleu (com els turons de l'AoE II): vessants cap al sol més clares, les de
   l'altra banda més fosques, i els cims una mica més secs */
const RELIEF_LIGHT = new THREE.Vector3(-0.62, 0.55, 0.56).normalize();
function terrainShade() {
  const T = TERRAIN;
  if (!T.mesh) return;
  const nrm = T.mesh.geometry.attributes.normal.array, col = T.mesh.geometry.attributes.color;
  const c = col.array;
  for (let k = 0; k < T.n * T.n; k++) {
    const nx = nrm[k * 3], ny = nrm[k * 3 + 1], nz = nrm[k * 3 + 2];
    const lit = nx * RELIEF_LIGHT.x + ny * RELIEF_LIGHT.y + nz * RELIEF_LIGHT.z;
    const flat = RELIEF_LIGHT.y;                         // il·luminació d'un pla
    const s = THREE.MathUtils.clamp(1 + (lit - flat) * 1.35, 0.55, 1.35);
    const h = Math.max(0, T.h[k]);
    const dry = Math.min(1, h / 12) * 0.12;
    c[k * 3] = s * (1 + dry * 0.9); c[k * 3 + 1] = s * (1 + dry * 0.5); c[k * 3 + 2] = s * (1 - dry * 0.4);
  }
  col.needsUpdate = true;
}
/* Actualitza només un tros de la malla (després d'anivellar per a un edifici) */
function updateTerrainMesh(i0, j0, i1, j1) {
  const T = TERRAIN;
  if (!T.mesh) return;
  const p = T.mesh.geometry.attributes.position;
  for (let j = Math.max(0, j0); j <= Math.min(T.n - 1, j1); j++) for (let i = Math.max(0, i0); i <= Math.min(T.n - 1, i1); i++) {
    const k = j * T.n + i;
    p.array[k * 3 + 1] = T.h[k];
  }
  p.needsUpdate = true;
  TERRAIN.dirty = true;               // les normals es recalculen un cop per fotograma
}
function flushTerrain() {
  if (!TERRAIN.dirty || !TERRAIN.mesh) return;
  TERRAIN.dirty = false;
  TERRAIN.mesh.geometry.computeVertexNormals();
  terrainShade();
}
/* Punt del terreny sota el ratolí: el raig avança sobre el mapa d'alçades (molt més ràpid que
   intersecar tots els triangles de la malla) */
function rayGround(ray) {
  const o = ray.origin, d = ray.direction;
  if (d.y >= -1e-4) return null;
  const top = Math.max(1, TERRAIN.maxH + 1);
  let t = Math.max(0, (o.y - top) / -d.y);
  const tEnd = (o.y + 1.5) / -d.y;
  const step = 0.6;
  let prevT = t;
  for (; t <= tEnd; t += step) {
    const x = o.x + d.x * t, y = o.y + d.y * t, z = o.z + d.z * t;
    if (y <= groundY(x, z)) {
      // Afinament entre l'últim punt a sobre i el primer a sota
      let a = prevT, b = t;
      for (let k = 0; k < 10; k++) {
        const m = (a + b) / 2, mx = o.x + d.x * m, my = o.y + d.y * m, mz = o.z + d.z * m;
        if (my <= groundY(mx, mz)) b = m; else a = m;
      }
      return new THREE.Vector3(o.x + d.x * b, o.y + d.y * b, o.z + d.z * b);
    }
    prevT = t;
  }
  const t0 = o.y / -d.y;
  return new THREE.Vector3(o.x + d.x * t0, 0, o.z + d.z * t0);
}
/* Relleu per al minimapa: ombrejat (llum des del nord-oest) i zones altes més clares */
function buildTerrainMinimap() {
  const T = TERRAIN, L = CONFIG.MAP_LIMIT;
  const N = Math.round(2 * L / T.hs);
  const c = document.createElement('canvas');
  c.width = c.height = N;
  const g = c.getContext('2d');
  const img = g.createImageData(N, N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const x = -L + (i + 0.5) * T.hs, z = -L + (j + 0.5) * T.hs;
    const h = groundY(x, z);
    const sl = (groundY(x - 1.5, z - 1.5) - groundY(x + 1.5, z + 1.5));
    const k = (j * N + i) * 4;
    const light = THREE.MathUtils.clamp(sl * 0.35, -1, 1);
    img.data[k] = light > 0 ? 255 : 0; img.data[k + 1] = light > 0 ? 250 : 0; img.data[k + 2] = light > 0 ? 220 : 0;
    img.data[k + 3] = Math.round(Math.min(0.5, Math.abs(light) * 0.6 + Math.max(0, h) * 0.015) * 255);
  }
  g.putImageData(img, 0, 0);
  T.mmCanvas = c;
}
