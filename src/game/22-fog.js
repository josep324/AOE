/* =====================================================================
   BOIRA DE GUERRA (graella de 2 unitats: explorat / visible ara)
   ===================================================================== */
const FOG = { enabled: true, cell: 2, N: 0, explored: null, visible: null, data: null, tex: null, canvas: null, ctx: null, img: null };
function fogInit() {
  const N = Math.ceil((CONFIG.MAP_LIMIT * 2) / FOG.cell);
  FOG.N = N;
  FOG.explored = new Uint8Array(N * N);
  FOG.visible = new Uint8Array(N * N);
  FOG.data = new Uint8Array(N * N * 4);
  FOG.tex = new THREE.DataTexture(FOG.data, N, N, THREE.RGBAFormat);
  FOG.tex.magFilter = THREE.LinearFilter;
  FOG.tex.minFilter = THREE.LinearFilter;
  FOG.tex.wrapS = FOG.tex.wrapT = THREE.ClampToEdgeWrapping;
  FOG.tex.needsUpdate = true;
  FOG_UNIFORMS.uFogTex.value = FOG.tex;
  FOG.canvas = document.createElement('canvas');
  FOG.canvas.width = FOG.canvas.height = N;
  FOG.ctx = FOG.canvas.getContext('2d');
  FOG.img = FOG.ctx.createImageData(N, N);
}
function fogIndex(x, z) {
  const N = FOG.N;
  const i = Math.min(N - 1, Math.max(0, Math.floor((x + CONFIG.MAP_LIMIT) / FOG.cell)));
  const j = Math.min(N - 1, Math.max(0, Math.floor((z + CONFIG.MAP_LIMIT) / FOG.cell)));
  return j * N + i;
}
function isVisibleAt(x, z) { return !!FOG.visible[fogIndex(x, z)]; }
function isExploredAt(x, z) { return !!FOG.explored[fogIndex(x, z)]; }
function revealCircle(x, z, r) {
  const N = FOG.N, c = FOG.cell, L = CONFIG.MAP_LIMIT;
  const i0 = Math.max(0, Math.floor((x - r + L) / c)), i1 = Math.min(N - 1, Math.floor((x + r + L) / c));
  const j0 = Math.max(0, Math.floor((z - r + L) / c)), j1 = Math.min(N - 1, Math.floor((z + r + L) / c));
  const r2 = r * r;
  for (let j = j0; j <= j1; j++) {
    const cz = -L + (j + 0.5) * c - z;
    for (let i = i0; i <= i1; i++) {
      const cx = -L + (i + 0.5) * c - x;
      if (cx * cx + cz * cz <= r2) { FOG.visible[j * N + i] = 1; FOG.explored[j * N + i] = 1; }
    }
  }
}
function entityVisible(e) {
  if (e.footprint) {
    const { hw, hd } = e.footprint;
    return isVisibleAt(e.position.x, e.position.z) || isVisibleAt(e.position.x - hw, e.position.z - hd) || isVisibleAt(e.position.x + hw, e.position.z + hd)
      || isVisibleAt(e.position.x - hw, e.position.z + hd) || isVisibleAt(e.position.x + hw, e.position.z - hd);
  }
  const r = e.radius || 0;
  return isVisibleAt(e.position.x, e.position.z) || (r > 2 && (isVisibleAt(e.position.x + r, e.position.z) || isVisibleAt(e.position.x - r, e.position.z)
    || isVisibleAt(e.position.x, e.position.z + r) || isVisibleAt(e.position.x, e.position.z - r)));
}
function updateFog() {
  const N = FOG.N;
  FOG.visible.fill(0);
  if (!FOG.enabled) { FOG.visible.fill(1); FOG.explored.fill(1); }
  else {
    for (const u of state.units) if (u.isOwn && !u.garrisoned) revealCircle(u.position.x, u.position.z, u.los || 10);
    for (const b of state.buildings) if (b.isOwn) revealCircle(b.position.x, b.position.z, (b.underConstruction ? 6 : (b.los || 8)) + (b.footprint ? b.footprint.hw : b.radius));
  }
  const d = FOG.data, im = FOG.img.data;
  for (let k = 0; k < N * N; k++) {
    const v = FOG.visible[k] ? 255 : FOG.explored[k] ? 100 : 0;
    d[k * 4] = v; d[k * 4 + 1] = v; d[k * 4 + 2] = v; d[k * 4 + 3] = 255;
    im[k * 4] = 8; im[k * 4 + 1] = 10; im[k * 4 + 2] = 14;
    im[k * 4 + 3] = FOG.visible[k] ? 0 : FOG.explored[k] ? 120 : 255;
  }
  FOG.tex.needsUpdate = true;
  FOG.ctx.putImageData(FOG.img, 0, 0);
  // Visibilitat de les entitats que no són del jugador
  for (const u of state.units) {
    if (u.isOwn) continue;
    const vis = entityVisible(u);
    u.group.visible = vis && !u.garrisoned;
    if (!vis && u.selected) { removeFromSelection(u); onSelectionChanged(); }
  }
  for (const b of state.buildings) {
    if (b.isOwn) continue;
    if (entityVisible(b)) b.seen = true;       // els edificis enemics es recorden un cop vistos
    b.group.visible = !!b.seen;
  }
  for (const n of state.resourceNodes) {
    const ex = isExploredAt(n.position.x, n.position.z) || (n.footprint && entityVisible(n));
    if (n.subtype === 'sheep') n.group.visible = entityVisible(n) || (ex && n.killed);
    else n.group.visible = ex;
  }
}
