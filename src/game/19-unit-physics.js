/* =====================================================================
   ACTUALITZACIÓ D'UNITATS
   ===================================================================== */
function lerpAngle(a, b, t) {
  const d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
  return a + d * t;
}
const easeOutBack = t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };

function resolveObstacleCollision(u, dt) {
  for (const o of state.obstacles) {
    if (o.gateTeam === u.team) continue;
    const s = pushOutOf(u.position, o, u.radius);
    if (s && u.target) {
      // Llisquem per la tangent cap al costat del destí per no quedar encallats
      const wp = (u.path && u.path[0]) || u.target;
      let tx = -s.nz, tz = s.nx;
      const toX = wp.x - u.position.x, toZ = wp.z - u.position.z;
      if (tx * toX + tz * toZ < 0) { tx = -tx; tz = -tz; }
      u.position.x += tx * u.speed * dt * 0.4;
      u.position.z += tz * u.speed * dt * 0.4;
    }
  }
}

/* ---------- Índex espacial: graella de cel·les de 8 unitats amb les unitats de cada cel·la ----------
   Evita comparar cada unitat amb totes les altres (clau per a centenars d'unitats). */
const SPATIAL = { cell: 8, map: new Map() };
const spatialKey = (i, j) => (i + 4096) * 8192 + (j + 4096);
function spatialRebuild() {
  SPATIAL.map.clear();
  const c = SPATIAL.cell;
  for (const u of state.units) {
    if (u.garrisoned || u.dead) continue;
    const k = spatialKey(Math.floor(u.position.x / c), Math.floor(u.position.z / c));
    let arr = SPATIAL.map.get(k);
    if (!arr) SPATIAL.map.set(k, arr = []);
    arr.push(u);
  }
}
/* Unitats dins d'un radi (aproximat per cel·les; el filtre exacte el fa qui crida) */
function unitsNear(x, z, r, out = []) {
  out.length = 0;
  const c = SPATIAL.cell;
  const i0 = Math.floor((x - r) / c), i1 = Math.floor((x + r) / c);
  const j0 = Math.floor((z - r) / c), j1 = Math.floor((z + r) / c);
  for (let i = i0; i <= i1; i++) {
    for (let j = j0; j <= j1; j++) {
      const arr = SPATIAL.map.get(spatialKey(i, j));
      if (arr) for (const u of arr) out.push(u);
    }
  }
  return out;
}

const nearBuf = [];
function separateUnits() {
  for (const a of state.units) {
    if (a.garrisoned || a.dead) continue;
    for (const b of unitsNear(a.position.x, a.position.z, 2, nearBuf)) {
      if (b.id <= a.id || b.garrisoned || b.dead) continue;
      if (a.target && b.target) continue;
      const dx = b.position.x - a.position.x, dz = b.position.z - a.position.z;
      const min = a.radius + b.radius;
      const d2 = dx * dx + dz * dz;
      if (d2 >= min * min) continue;
      const d = Math.sqrt(d2) || 0.001;
      const overlap = (min - d);
      const nx = d2 > 0 ? dx / d : 1, nz = d2 > 0 ? dz / d : 0;
      if (!a.target && !b.target) {
        a.position.x -= nx * overlap * 0.5; a.position.z -= nz * overlap * 0.5;
        b.position.x += nx * overlap * 0.5; b.position.z += nz * overlap * 0.5;
      } else if (!a.target) {
        a.position.x -= nx * overlap; a.position.z -= nz * overlap;
      } else {
        b.position.x += nx * overlap; b.position.z += nz * overlap;
      }
    }
  }
}
