/* =====================================================================
   AIGUA: llacs i rius (amb guals)
   Una graella d'1 unitat (la mateixa que la navegació) diu on hi ha aigua:
   1 = aigua fonda (no es pot trepitjar ni construir) · 2 = gual (es pot travessar, no s'hi construeix).
   Es dibuixa amb un pla i un shader: color segons la fondària, onades, reflexos i escuma a la riba.
   Els mapes són simètrics respecte del centre: tots dos jugadors tenen la mateixa aigua.
   ===================================================================== */
const WATER = { N: 0, mask: null, any: false, mesh: null, tex: null, mmCanvas: null, fords: [], time: { value: 0 } };

function waterCell(x, z) {
  if (!WATER.any) return 0;
  const L = CONFIG.MAP_LIMIT, N = WATER.N;
  const i = Math.floor(x + L), j = Math.floor(z + L);
  if (i < 0 || j < 0 || i >= N || j >= N) return 0;
  return WATER.mask[j * N + i];
}
/* Hi ha aigua (o gual) a menys de m unitats? */
function waterNear(x, z, m) {
  if (!WATER.any) return false;
  const r = Math.ceil(m + 0.5);
  for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
    if (di * di + dj * dj > (m + 0.8) * (m + 0.8)) continue;
    if (waterCell(x + di, z + dj)) return true;
  }
  return false;
}
/* Les unitats no poden entrar a l'aigua fonda (per si les empenyen o hi llisquen) */
function keepOnLand(e) {
  if (!WATER.any) return;
  if (waterCell(e.position.x, e.position.z) === 1) {
    if (e.lastDry) { e.position.x = e.lastDry.x; e.position.z = e.lastDry.z; }
  } else (e.lastDry || (e.lastDry = new THREE.Vector3())).copy(e.position);
}
/* Direcció cap a la terra més propera (per pescar des de la riba) */
function landAngleFrom(x, z) {
  let best = null, bestD = Infinity;
  for (let dj = -4; dj <= 4; dj++) for (let di = -4; di <= 4; di++) {
    if (waterCell(x + di, z + dj)) continue;
    const d = di * di + dj * dj;
    if (d < bestD) { bestD = d; best = [di, dj]; }
  }
  return best ? Math.atan2(best[0], best[1]) : 0;
}

/* ---------- Formes ---------- */
function blobInside(x, z, cx, cz, r, off) {
  const dx = x - cx, dz = z - cz;
  const d = Math.hypot(dx, dz);
  if (d > r * 1.4) return false;
  return d < r * (0.78 + 0.45 * fbm(dx * 0.07 + off, dz * 0.07 - off));
}
function genLakes(rng, set) {
  const lakes = [{ x: 0, z: 0, r: 15 + rng() * 6, off: rng() * 100 }];
  // Llacs petits a banda i banda, lluny de les bases (cap a les cantonades lliures)
  const a = Math.PI * 0.75 + (rng() - 0.5) * 0.7, d = 44 + rng() * 14;
  lakes.push({ x: Math.cos(a) * d, z: Math.sin(a) * d, r: 7 + rng() * 4, off: rng() * 100 });
  const a2 = Math.PI * 0.75 + (rng() - 0.5) * 0.5, d2 = 88 + rng() * 14;
  if (rng() < 0.7) lakes.push({ x: Math.cos(a2) * d2, z: Math.sin(a2) * d2, r: 6 + rng() * 3, off: rng() * 100 });
  set((x, z) => lakes.some(l => blobInside(x, z, l.x, l.z, l.r, l.off) || blobInside(-x, -z, l.x, l.z, l.r, l.off)) ? 1 : 0);
}
function genRiver(rng, set) {
  // El riu travessa el mapa en diagonal entre les dues bases, amb meandres (funció senar: simètric)
  const A1 = 9 + rng() * 8, k1 = 0.016 + rng() * 0.01, A2 = 3 + rng() * 3, k2 = 0.045 + rng() * 0.03, k3 = 0.03 + rng() * 0.02;
  const f = (s) => A1 * Math.sin(k1 * s) + A2 * Math.sin(k2 * s);
  const S1 = 42 + rng() * 22;
  WATER.fords = [0, S1, -S1];
  set((x, z) => {
    const s = (x - z) / Math.SQRT2, p = (x + z) / Math.SQRT2;
    const w = 4.2 + 1.1 * Math.cos(k3 * s);
    if (Math.abs(p - f(s)) >= w) return 0;
    return WATER.fords.some(sf => Math.abs(s - sf) < 5.5) ? 2 : 1;
  });
}

function clearWater() {
  if (WATER.mesh) { scene.remove(WATER.mesh); WATER.mesh.geometry.dispose(); WATER.mesh = null; }
  if (WATER.tex) { WATER.tex.dispose(); WATER.tex = null; }
  WATER.any = false;
  WATER.mmCanvas = null;
  WATER.fords = [];
  if (WATER.mask) WATER.mask.fill(0);
}
function setupWater(type, seed) {
  clearWater();
  const L = CONFIG.MAP_LIMIT, N = Math.ceil(L * 2);
  WATER.N = N;
  if (!WATER.mask || WATER.mask.length !== N * N) WATER.mask = new Uint8Array(N * N);
  const rng = mulberry32((seed ^ 0x5eaf00d) >>> 0);
  const set = (fn) => {
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) WATER.mask[j * N + i] = fn(-L + i + 0.5, -L + j + 0.5);
  };
  if (type === 'lakes') genLakes(rng, set);
  else if (type === 'rivers') genRiver(rng, set);
  else return;
  WATER.any = WATER.mask.some(v => v);
  if (!WATER.any) return;
  paintWaterGround();
  buildWaterMesh();
}

/* Riba de sorra i fons de fang sobre la textura del terreny */
function paintWaterGround() {
  const P = GROUND_PAINT, L = CONFIG.MAP_LIMIT, N = WATER.N;
  const c = document.createElement('canvas');
  c.width = c.height = P.size;
  const g = c.getContext('2d');
  const k = P.size / P.span;
  const px = (v) => (v + P.span / 2) * k;
  g.fillStyle = 'rgb(192,174,124)';
  for (let j = 0; j < N; j += 1) for (let i = 0; i < N; i += 1) {
    if (!WATER.mask[j * N + i]) continue;
    g.beginPath(); g.arc(px(-L + i + 0.5), px(-L + j + 0.5), 3.4 * k, 0, Math.PI * 2); g.fill();
  }
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const v = WATER.mask[j * N + i];
    if (!v) continue;
    g.fillStyle = v === 1 ? 'rgb(74,78,60)' : 'rgb(150,140,100)';
    g.fillRect(px(-L + i) - 0.5, px(-L + j) - 0.5, k + 1, k + 1);
  }
  P.ctx.save();
  P.ctx.filter = 'blur(3px)';
  P.ctx.globalAlpha = 0.9;
  P.ctx.drawImage(c, 0, 0);
  P.ctx.restore();
  P.dirty = true;
}

function buildWaterMesh() {
  const L = CONFIG.MAP_LIMIT, N = WATER.N;
  // Màscara suavitzada: 1 = fons, ~0,6 = gual, 0 = terra
  const raw = document.createElement('canvas');
  raw.width = raw.height = N;
  const rg = raw.getContext('2d');
  const img = rg.createImageData(N, N);
  const mm = document.createElement('canvas');
  mm.width = mm.height = N;
  const mg = mm.getContext('2d');
  const mimg = mg.createImageData(N, N);
  for (let k = 0; k < N * N; k++) {
    const v = WATER.mask[k];
    const val = v === 1 ? 255 : v === 2 ? 150 : 0;
    img.data[k * 4] = img.data[k * 4 + 1] = img.data[k * 4 + 2] = val;
    img.data[k * 4 + 3] = 255;
    if (v) {
      mimg.data[k * 4] = v === 1 ? 44 : 96; mimg.data[k * 4 + 1] = v === 1 ? 104 : 150; mimg.data[k * 4 + 2] = v === 1 ? 156 : 170;
      mimg.data[k * 4 + 3] = 255;
    }
  }
  rg.putImageData(img, 0, 0);
  mg.putImageData(mimg, 0, 0);
  WATER.mmCanvas = mm;
  const soft = document.createElement('canvas');
  soft.width = soft.height = N * 2;
  const sg = soft.getContext('2d');
  sg.filter = 'blur(2.2px)';
  sg.imageSmoothingEnabled = true;
  sg.drawImage(raw, 0, 0, N * 2, N * 2);
  WATER.tex = new THREE.CanvasTexture(soft);
  WATER.tex.flipY = false;
  WATER.tex.magFilter = WATER.tex.minFilter = THREE.LinearFilter;
  WATER.tex.generateMipmaps = false;

  const geo = new THREE.PlaneGeometry(L * 2, L * 2, 1, 1).rotateX(-Math.PI / 2);
  const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.14, metalness: 0.2, transparent: true, depthWrite: false });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uMask = { value: WATER.tex };
    shader.uniforms.uTime = WATER.time;
    shader.uniforms.uL = { value: L };
    shader.vertexShader = 'varying vec2 vWXZ;\n' + shader.vertexShader.replace('#include <worldpos_vertex>',
      `#include <worldpos_vertex>
      vWXZ = (modelMatrix * vec4(transformed, 1.0)).xz;`);
    shader.fragmentShader = 'uniform sampler2D uMask;\nuniform float uTime;\nuniform float uL;\nvarying vec2 vWXZ;\n' + shader.fragmentShader
      .replace('#include <map_fragment>', `
      float m = texture2D(uMask, (vWXZ + uL) / (2.0 * uL)).r;
      if (m < 0.26) discard;
      float depth = smoothstep(0.58, 1.0, m);
      float w1 = sin(vWXZ.x * 0.55 + uTime * 1.1) * cos(vWXZ.y * 0.47 - uTime * 0.9);
      float w2 = sin((vWXZ.x + vWXZ.y) * 1.3 - uTime * 1.7);
      vec3 col = mix(vec3(0.34, 0.56, 0.5), vec3(0.06, 0.22, 0.31), depth);
      col += (w1 * 0.5 + w2 * 0.5) * 0.03;
      float foam = 1.0 - smoothstep(0.26, 0.42, m);
      foam += smoothstep(0.82, 1.0, sin(vWXZ.x * 2.1 + vWXZ.y * 1.7 + uTime * 2.0 + w1 * 2.0)) * (1.0 - depth) * 0.3;
      foam = clamp(foam, 0.0, 1.0);
      col = mix(col, vec3(0.9, 0.94, 0.92), foam * 0.75);
      diffuseColor.rgb = col;
      diffuseColor.a = mix(0.5, 0.9, depth) + foam * 0.25;`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      vec2 wg = vec2(cos(vWXZ.x * 0.55 + uTime * 1.1) * 0.14, sin(vWXZ.y * 0.47 - uTime * 0.9) * 0.12)
              + vec2(0.08) * cos((vWXZ.x + vWXZ.y) * 1.3 - uTime * 1.7);
      normal = normalize(normal + (viewMatrix * vec4(wg.x, 0.0, wg.y, 0.0)).xyz);`);
  };
  material.customProgramCacheKey = () => 'water-v1';
  WATER.mesh = new THREE.Mesh(geo, fogify(material));
  WATER.mesh.position.y = 0.07;
  WATER.mesh.receiveShadow = true;
  WATER.mesh.renderOrder = 2;
  WATER.mesh.name = 'water';
  scene.add(WATER.mesh);
}
function updateWater(t) { WATER.time.value = t; }
/* Cel·les d'aigua fonda tocant a la riba (per posar-hi peixos), només d'una meitat del mapa */
function shoreCells() {
  const L = CONFIG.MAP_LIMIT, N = WATER.N, out = [];
  for (let j = 1; j < N - 1; j++) for (let i = 1; i < N - 1; i++) {
    if (WATER.mask[j * N + i] !== 1) continue;
    const x = -L + i + 0.5, z = -L + j + 0.5;
    if (x + z < 0 || (x + z === 0 && x < 0)) continue;
    let land = false;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!WATER.mask[(j + dj) * N + i + di]) land = true;
    if (land) out.push([x, z]);
  }
  return out;
}
