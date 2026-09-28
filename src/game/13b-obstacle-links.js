/* =====================================================================
   FARCIMENT ENTRE OBSTACLES
   Com a l'AoE II, un bosc dens i una muralla són parets: no hi ha escletxes per on passar.
   Entre dos troncs propers, entre una muralla i l'arbre, l'edifici o la roca del costat, i entre
   dos trams de muralla en diagonal s'hi posa un obstacle invisible en forma de càpsula (segment
   amb gruix). Quan es talla l'arbre o cau la muralla, el farciment desapareix amb ella.
   ===================================================================== */
const LINKS = { trees: false, walls: false };
const TREE_LINK_DIST = 3.5;     // troncs a menys d'aquesta distància (centre a centre): no s'hi passa
const WALL_LINK_GAP = 1.4;      // forat màxim entre una muralla i el que té al costat que es tanca

function linkObstacle(ax, az, bx, bz, r, e1, e2, kind) {
  return { seg: true, ax, az, bx, bz, r, x: (ax + bx) / 2, z: (az + bz) / 2, ext: Math.hypot(bx - ax, bz - az) / 2 + r,
    entity: e1, entity2: e2, link: kind };
}
/* Treu els obstacles d'una entitat (i els farciments que la toquen) */
function dropObstaclesOf(e) {
  state.obstacles = state.obstacles.filter(o => o.entity !== e && o.entity2 !== e);
}
const isTreeObs = (o) => !o.link && o.entity && o.entity.subtype === 'tree';
const isWallObs = (o) => !o.link && o.entity && o.entity.kind === 'building' && (o.entity.isWall || (o.entity.def && o.entity.def.gate));

/* Farciment entre arbres propers (es refà quan es creen arbres: en generar el mapa o carregar) */
function rebuildTreeLinks() {
  state.obstacles = state.obstacles.filter(o => o.link !== 'tree');
  const trees = state.obstacles.filter(isTreeObs);
  const C = 4, grid = new Map();
  for (const o of trees) {
    const k = spatialKey(Math.floor(o.x / C), Math.floor(o.z / C));
    let a = grid.get(k); if (!a) grid.set(k, a = []); a.push(o);
  }
  const out = [];
  for (const o of trees) {
    const ci = Math.floor(o.x / C), cj = Math.floor(o.z / C);
    for (let i = ci - 1; i <= ci + 1; i++) for (let j = cj - 1; j <= cj + 1; j++) {
      const arr = grid.get(spatialKey(i, j));
      if (arr) for (const q of arr) {
        if (q.entity.id <= o.entity.id) continue;
        const d = Math.hypot(q.x - o.x, q.z - o.z);
        // Si els troncs ja es toquen gairebé, no cal: cap unitat hi cap
        if (d > TREE_LINK_DIST || d - o.r - q.r < 0.5) continue;
        out.push(linkObstacle(o.x, o.z, q.x, q.z, 0.3, o.entity, q.entity, 'tree'));
      }
    }
  }
  for (const l of out) state.obstacles.push(l);
}
/* Farciment al voltant de les muralles i portes (es refà quan es construeix o s'enderroca alguna cosa) */
function rebuildWallLinks() {
  state.obstacles = state.obstacles.filter(o => o.link !== 'wall');
  const walls = state.obstacles.filter(isWallObs);
  if (!walls.length) return;
  const out = [], buf = [];
  for (const w of walls) {
    for (const q of obstaclesNear(w.x, w.z, buf)) {
      if (q === w || q.link || (q.entity && q.entity.mobile)) continue;
      if (isWallObs(q)) {
        // Dos trams en diagonal (es toquen per la cantonada): no s'hi pot esmunyir ningú
        if (q.entity.id > w.entity.id && Math.abs(Math.abs(q.x - w.x) - 1) < 0.05 && Math.abs(Math.abs(q.z - w.z) - 1) < 0.05)
          out.push(linkObstacle(w.x, w.z, q.x, q.z, 0.3, w.entity, q.entity, 'wall'));
        continue;
      }
      // Punt de l'altre obstacle més proper a la muralla i punt de la muralla més proper a aquest
      const s = obstacleSurface(q, w.x, w.z);
      if (s.d > 3.5) continue;
      const qx = w.x - s.nx * s.d, qz = w.z - s.nz * s.d;
      const s2 = obstacleSurface(w, qx, qz);
      if (s2.d < 0.15 || s2.d > WALL_LINK_GAP) continue;
      out.push(linkObstacle(qx - s2.nx * s2.d, qz - s2.nz * s2.d, qx, qz, 0.3, w.entity, q.entity || null, 'wall'));
    }
  }
  for (const l of out) state.obstacles.push(l);
}
/* Es crida des de rebuildNav: refà els farciments pendents */
function refreshLinks() {
  if (LINKS.trees) { LINKS.trees = false; rebuildTreeLinks(); }
  if (LINKS.walls) { LINKS.walls = false; rebuildWallLinks(); }
}
/* Distància amb signe a una càpsula (segment amb gruix) i normal cap a fora */
function segmentSurface(o, x, z) {
  const vx = o.bx - o.ax, vz = o.bz - o.az;
  const L2 = vx * vx + vz * vz || 1e-6;
  const t = Math.max(0, Math.min(1, ((x - o.ax) * vx + (z - o.az) * vz) / L2));
  const dx = x - (o.ax + vx * t), dz = z - (o.az + vz * t);
  const l = Math.hypot(dx, dz);
  if (l < 1e-4) { const n = Math.hypot(vx, vz) || 1; return { d: -o.r, nx: -vz / n, nz: vx / n }; }
  return { d: l - o.r, nx: dx / l, nz: dz / l };
}
