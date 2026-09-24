/* =====================================================================
   TERRENY
   Una textura gran pintada per a tot el mapa (variació de la gespa, terra sota els edificis,
   fullaraca als boscos, grava a les mines) i dues textures de detall que es repeteixen
   (fulles de gespa i terra) barrejades al shader segons el color de cada punt.
   ===================================================================== */
const GROUND_PAINT = { size: 1024, span: CONFIG.MAP_LIMIT * 2 + 60, canvas: null, ctx: null, tex: null, dirty: false };
const terrainRng = mulberry32(0x51a7e);

function detailTexture(draw) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  draw(c.getContext('2d'), 256);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return t;
}
/* Detall en escala de grisos (mitjana ≈ 0,5): fulles de gespa curtes en totes direccions */
const grassDetailTex = detailTexture((g, s) => {
  g.fillStyle = '#808080'; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 5200; i++) {
    const v = Math.floor(70 + terrainRng() * 120);
    g.strokeStyle = `rgb(${v},${v},${v})`;
    g.globalAlpha = 0.35 + terrainRng() * 0.5;
    g.lineWidth = 0.6 + terrainRng() * 1.2;
    const x = terrainRng() * s, y = terrainRng() * s, a = -Math.PI / 2 + (terrainRng() - 0.5) * 1.6, l = 3 + terrainRng() * 7;
    for (const ox of [0, -s, s]) for (const oy of [0, -s, s]) {
      g.beginPath(); g.moveTo(x + ox, y + oy); g.lineTo(x + ox + Math.cos(a) * l, y + oy + Math.sin(a) * l); g.stroke();
    }
  }
  g.globalAlpha = 1;
});
const dirtDetailTex = detailTexture((g, s) => {
  g.fillStyle = '#808080'; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 2600; i++) {
    const v = Math.floor(60 + terrainRng() * 140), r = 0.6 + terrainRng() * (terrainRng() < 0.1 ? 5 : 1.8);
    g.fillStyle = `rgb(${v},${v},${v})`;
    g.globalAlpha = 0.3 + terrainRng() * 0.5;
    const x = terrainRng() * s, y = terrainRng() * s;
    for (const ox of [0, -s, s]) for (const oy of [0, -s, s]) { g.beginPath(); g.arc(x + ox, y + oy, r, 0, Math.PI * 2); g.fill(); }
  }
  g.globalAlpha = 1;
});

/* Coordenades del món → píxels de la textura del mapa */
function groundPx(x, z) {
  const P = GROUND_PAINT;
  return [(x + P.span / 2) / P.span * P.size, (z + P.span / 2) / P.span * P.size];
}
const GROUND_KINDS = {
  dirt: ['rgba(122,98,66,', 'rgba(108,86,58,', 'rgba(134,110,76,'],
  forest: ['rgba(58,66,30,', 'rgba(66,62,34,', 'rgba(50,58,28,'],
  rock: ['rgba(118,108,90,', 'rgba(104,98,84,', 'rgba(128,118,98,'],
  trampled: ['rgba(120,118,64,', 'rgba(112,106,60,'],
};
/* Taca irregular sobre el terreny (diversos cercles difuminats) */
function groundPaint(x, z, r, kind = 'dirt', strength = 0.8) {
  const P = GROUND_PAINT;
  if (!P.ctx) return;
  const [px, py] = groundPx(x, z);
  const pr = r / P.span * P.size;
  const cols = GROUND_KINDS[kind] || GROUND_KINDS.dirt;
  const n = 4 + Math.floor(r / 2);
  for (let i = 0; i < n; i++) {
    const a = terrainRng() * Math.PI * 2, d = terrainRng() * pr * 0.55;
    const cx = px + Math.cos(a) * d, cy = py + Math.sin(a) * d, rr = pr * (0.45 + terrainRng() * 0.5);
    const grd = P.ctx.createRadialGradient(cx, cy, 0, cx, cy, rr);
    const c = cols[Math.floor(terrainRng() * cols.length)];
    grd.addColorStop(0, c + (strength * 0.9).toFixed(2) + ')');
    grd.addColorStop(0.6, c + (strength * 0.55).toFixed(2) + ')');
    grd.addColorStop(1, c + '0)');
    P.ctx.fillStyle = grd;
    P.ctx.beginPath(); P.ctx.arc(cx, cy, rr, 0, Math.PI * 2); P.ctx.fill();
  }
  P.dirty = true;
}
/* Rectangle de terra (sota un edifici) amb vores suaus */
function groundPaintRect(x, z, w, d, kind = 'dirt', strength = 0.75) {
  const r = Math.min(w, d) * 0.5;
  const nx = Math.max(1, Math.round(w / r)), nz = Math.max(1, Math.round(d / r));
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    groundPaint(x - w / 2 + (i + 0.5) * w / nx, z - d / 2 + (j + 0.5) * d / nz, r * 1.35, kind, strength);
  }
}
function flushGroundPaint() {
  if (GROUND_PAINT.dirty && GROUND_PAINT.tex) { GROUND_PAINT.tex.needsUpdate = true; GROUND_PAINT.dirty = false; }
}

let ground;
function createGround() {
  const P = GROUND_PAINT;
  // Textura base: variació de la gespa amb soroll (a baixa resolució, s'amplia suaument)
  const lo = 256;
  const base = document.createElement('canvas');
  base.width = base.height = lo;
  const bctx = base.getContext('2d');
  const img = bctx.createImageData(lo, lo);
  const lush = [86, 118, 44], dark = [66, 96, 36], dry = [132, 130, 70], yellow = [118, 124, 52];
  for (let j = 0; j < lo; j++) for (let i = 0; i < lo; i++) {
    const x = -P.span / 2 + (i + 0.5) / lo * P.span, z = -P.span / 2 + (j + 0.5) / lo * P.span;
    const n = fbm(x * 0.03, z * 0.03), n2 = fbm(x * 0.011 + 50, z * 0.011 - 20), n3 = fbm(x * 0.09 - 7, z * 0.09 + 3);
    const t = THREE.MathUtils.smoothstep(n, 0.3, 0.75);
    const dk = THREE.MathUtils.smoothstep(n2, 0.58, 0.82) * 0.55;
    const yl = THREE.MathUtils.smoothstep(n3, 0.6, 0.85) * 0.35;
    const k = (j * lo + i) * 4;
    for (let c = 0; c < 3; c++) {
      let v = dark[c] + (lush[c] - dark[c]) * t;
      v += (dry[c] - v) * dk;
      v += (yellow[c] - v) * yl;
      img.data[k + c] = v;
    }
    img.data[k + 3] = 255;
  }
  bctx.putImageData(img, 0, 0);
  P.canvas = document.createElement('canvas');
  P.canvas.width = P.canvas.height = P.size;
  P.ctx = P.canvas.getContext('2d');
  P.ctx.imageSmoothingEnabled = true;
  P.ctx.drawImage(base, 0, 0, P.size, P.size);
  // Petites clarianes i flors
  for (let i = 0; i < 1400; i++) {
    const x = terrainRng() * P.size, y = terrainRng() * P.size;
    P.ctx.fillStyle = terrainRng() < 0.5 ? 'rgba(140,140,76,0.12)' : 'rgba(58,80,30,0.16)';
    P.ctx.beginPath(); P.ctx.arc(x, y, 1 + terrainRng() * 3, 0, Math.PI * 2); P.ctx.fill();
  }
  P.tex = new THREE.CanvasTexture(P.canvas);
  P.tex.colorSpace = THREE.SRGBColorSpace;
  P.tex.wrapS = P.tex.wrapT = THREE.ClampToEdgeWrapping;
  P.tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  const size = CONFIG.GROUND_SIZE;
  const geo = new THREE.PlaneGeometry(size, size, 1, 1);
  geo.rotateX(-Math.PI / 2);
  // UV: la textura del mapa cobreix només la zona jugable (més enllà s'estira la vora)
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + P.span / 2) / P.span, 1 - (pos.getZ(i) + P.span / 2) / P.span);
  const material = new THREE.MeshStandardMaterial({ map: P.tex, roughness: 0.97, metalness: 0 });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uGrassDetail = { value: grassDetailTex };
    shader.uniforms.uDirtDetail = { value: dirtDetailTex };
    shader.vertexShader = 'varying vec2 vGroundXZ;\n' + shader.vertexShader.replace('#include <worldpos_vertex>',
      `#include <worldpos_vertex>
      vGroundXZ = (modelMatrix * vec4(transformed, 1.0)).xz;`);
    shader.fragmentShader = 'uniform sampler2D uGrassDetail;\nuniform sampler2D uDirtDetail;\nvarying vec2 vGroundXZ;\n' +
      shader.fragmentShader.replace('#include <map_fragment>', `
      vec4 macroC = texture2D(map, vMapUv);
      float dirtK = smoothstep(-0.015, 0.06, macroC.r - macroC.g);
      float g1 = texture2D(uGrassDetail, vGroundXZ * 0.32).r;
      float g2 = texture2D(uGrassDetail, vGroundXZ * 0.071 + 0.37).r;
      float d1 = texture2D(uDirtDetail, vGroundXZ * 0.28).r;
      float det = mix(g1 * 0.65 + g2 * 0.35, d1, dirtK);
      diffuseColor.rgb *= macroC.rgb * (0.55 + 0.9 * det);`);
  };
  // Les UV del mapa arriben al vertex shader gràcies a la textura (USE_MAP)
  material.customProgramCacheKey = () => 'terrain-v1';
  ground = new THREE.Mesh(geo, fogify(material));
  ground.receiveShadow = true;
  ground.name = 'ground';
  scene.add(ground);
}
