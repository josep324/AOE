/* =====================================================================
   NAVEGACIÓ: GRAELLA (1 cel·la = 1 unitat) + A* + SUAVITZAT DEL CAMÍ
   walk[]  → cel·les no transitables per les unitats
   build[] → cel·les ocupades (no s'hi pot construir)
   ===================================================================== */
const NAV = { cell: 1, N: 0, x0: 0, walk: null, build: null, gate: null, team: 0, version: 0, stampId: 0 };
function navInit() {
  const N = Math.ceil((CONFIG.MAP_LIMIT * 2) / NAV.cell);
  NAV.N = N;
  NAV.x0 = -CONFIG.MAP_LIMIT;
  NAV.walk = new Uint8Array(N * N);
  NAV.build = new Uint8Array(N * N);
  NAV.gate = new Uint8Array(N * N);     // cel·les de porta: equip que hi pot passar
  NAV.g = new Float32Array(N * N);
  NAV.parent = new Int32Array(N * N);
  NAV.seen = new Uint32Array(N * N);
  NAV.closed = new Uint32Array(N * N);
}
function navCell(v) { return Math.min(NAV.N - 1, Math.max(0, Math.floor((v - NAV.x0) / NAV.cell))); }
function navCenter(i) { return NAV.x0 + (i + 0.5) * NAV.cell; }
function navFree(i, j) {
  if (i < 0 || j < 0 || i >= NAV.N || j >= NAV.N) return false;
  const k = j * NAV.N + i;
  return !NAV.walk[k] && (!NAV.gate[k] || NAV.gate[k] === NAV.team);
}

function rebuildNav() {
  const N = NAV.N;
  NAV.walk.fill(0);
  NAV.build.fill(0);
  NAV.gate.fill(0);
  for (const o of state.obstacles) {
    if (o.entity && o.entity.mobile) continue;          // les ovelles es mouen: no bloquegen la graella
    const ex = (o.rect ? o.hw : o.r) + 1.2, ez = (o.rect ? o.hd : o.r) + 1.2;
    const i0 = navCell(o.x - ex), i1 = navCell(o.x + ex), j0 = navCell(o.z - ez), j1 = navCell(o.z + ez);
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const d = obstacleSurface(o, navCenter(i), navCenter(j)).d;
        if (o.gateTeam) { if (d < 0) NAV.gate[j * N + i] = o.gateTeam; else if (d < 0.35) NAV.walk[j * N + i] = 1; }
        else if (d < 0.35) NAV.walk[j * N + i] = 1;
        if (d < 0.5) NAV.build[j * N + i] = 1;
      }
    }
  }
  // Les granges es poden trepitjar però ocupen terreny
  for (const e of state.buildings.concat(state.resourceNodes)) {
    if (e.subtype !== 'farm' || e.dead || e.depleted) continue;
    const fp = e.footprint;
    for (let j = navCell(e.position.z - fp.hd + 0.01); j <= navCell(e.position.z + fp.hd - 0.01); j++)
      for (let i = navCell(e.position.x - fp.hw + 0.01); i <= navCell(e.position.x + fp.hw - 0.01); i++)
        NAV.build[j * N + i] = 1;
  }
  NAV.version++;
}

function nearestFreeCell(i, j, maxR = 8) {
  if (navFree(i, j)) return [i, j];
  for (let r = 1; r <= maxR; r++) {
    let best = null, bestD = Infinity;
    for (let dj = -r; dj <= r; dj++) {
      for (let di = -r; di <= r; di++) {
        if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
        if (!navFree(i + di, j + dj)) continue;
        const d = di * di + dj * dj;
        if (d < bestD) { bestD = d; best = [i + di, j + dj]; }
      }
    }
    if (best) return best;
  }
  return null;
}

/* Comprova si un segment és transitable (ignora els extrems, on la unitat pot tocar l'objectiu) */
function segmentWalkable(ax, az, bx, bz) {
  const len = Math.hypot(bx - ax, bz - az);
  const steps = Math.ceil(len / 0.3);
  const N = NAV.N;
  for (let s = 1; s < steps; s++) {
    const t = s / steps;
    const x = ax + (bx - ax) * t, z = az + (bz - az) * t;
    if (t * len < 0.8 || (1 - t) * len < 0.8) continue;
    const k = navCell(z) * N + navCell(x);
    if (NAV.walk[k] || (NAV.gate[k] && NAV.gate[k] !== NAV.team)) return false;
  }
  return true;
}

/* A* sobre la graella (8 direccions, sense tallar cantonades) */
const NAV_DIRS = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]];
function findPath(sx, sz, tx, tz) {
  const N = NAV.N;
  const s = nearestFreeCell(navCell(sx), navCell(sz), 4);
  const g = nearestFreeCell(navCell(tx), navCell(tz), 12);
  if (!s || !g) return null;
  const si = s[1] * N + s[0], gi = g[1] * N + g[0];
  if (si === gi) return [];
  const stamp = ++NAV.stampId;
  const gx = g[0], gz = g[1];
  const H = (idx) => {
    const dx = Math.abs((idx % N) - gx), dz = Math.abs(((idx / N) | 0) - gz);
    return dx + dz + (Math.SQRT2 - 2) * Math.min(dx, dz);
  };
  // Munt binari (heap) amb prioritat f = g + h
  const heap = [], fOf = [];
  const push = (idx, f) => {
    heap.push(idx); fOf.push(f);
    let c = heap.length - 1;
    while (c > 0) {
      const p = (c - 1) >> 1;
      if (fOf[p] <= fOf[c]) break;
      [heap[p], heap[c]] = [heap[c], heap[p]]; [fOf[p], fOf[c]] = [fOf[c], fOf[p]];
      c = p;
    }
  };
  const pop = () => {
    const top = heap[0];
    const lastI = heap.pop(), lastF = fOf.pop();
    if (heap.length) {
      heap[0] = lastI; fOf[0] = lastF;
      let c = 0;
      for (;;) {
        const l = c * 2 + 1, r = l + 1;
        let m = c;
        if (l < heap.length && fOf[l] < fOf[m]) m = l;
        if (r < heap.length && fOf[r] < fOf[m]) m = r;
        if (m === c) break;
        [heap[m], heap[c]] = [heap[c], heap[m]]; [fOf[m], fOf[c]] = [fOf[c], fOf[m]];
        c = m;
      }
    }
    return top;
  };
  NAV.seen[si] = stamp; NAV.g[si] = 0; NAV.parent[si] = -1;
  push(si, H(si));
  let found = false, iter = 0;
  while (heap.length && iter++ < 60000) {
    const cur = pop();
    if (cur === gi) { found = true; break; }
    if (NAV.closed[cur] === stamp) continue;
    NAV.closed[cur] = stamp;
    const ci = cur % N, cj = (cur / N) | 0;
    for (const [dx, dz, cost] of NAV_DIRS) {
      const ni = ci + dx, nj = cj + dz;
      if (!navFree(ni, nj)) continue;
      if (dx && dz && (!navFree(ci + dx, cj) || !navFree(ci, cj + dz))) continue;
      const n = nj * N + ni;
      if (NAV.closed[n] === stamp) continue;
      const ng = NAV.g[cur] + cost;
      if (NAV.seen[n] !== stamp || ng < NAV.g[n]) {
        NAV.seen[n] = stamp; NAV.g[n] = ng; NAV.parent[n] = cur;
        push(n, ng + H(n));
      }
    }
  }
  if (!found) return null;
  const cells = [];
  for (let c = gi; c !== si && c !== -1; c = NAV.parent[c]) cells.push([navCenter(c % N), navCenter((c / N) | 0)]);
  return cells.reverse();
}

/* Elimina punts intermedis innecessaris: el camí queda en trams rectes */
function smoothPath(start, pts) {
  const out = [];
  let cur = start, i = 0;
  while (i < pts.length) {
    let j = i;
    while (j + 1 < pts.length && segmentWalkable(cur.x, cur.z, pts[j + 1].x, pts[j + 1].z)) j++;
    out.push(pts[j]);
    cur = pts[j];
    i = j + 1;
  }
  return out;
}

/* Assigna un destí a una unitat: línia recta si és lliure, si no camí A* */
function setMoveTarget(u, p) {
  u.target = p;
  u.path = null;
  u.pathVersion = NAV.version;
  if (!p) return;
  NAV.team = u.team;                  // les portes només deixen passar el seu equip
  if (segmentWalkable(u.position.x, u.position.z, p.x, p.z)) { u.path = [p]; return; }
  const cells = findPath(u.position.x, u.position.z, p.x, p.z);
  if (!cells) { u.path = [p]; return; }
  const pts = cells.map(([x, z]) => new THREE.Vector3(x, 0, z));
  pts.push(p);
  u.path = smoothPath(u.position, pts);
}
const decor = { grass: null, grassPos: [], rocks: null, rockPos: [] };
const zeroMatrix = new THREE.Matrix4().makeScale(0, 0, 0);
function hideDecorIn(x, z, hw, hd) {
  for (const [mesh, pos] of [[decor.grass, decor.grassPos], [decor.rocks, decor.rockPos]]) {
    if (!mesh) continue;
    let changed = false;
    for (let i = 0; i < pos.length / 2; i++) {
      if (Math.abs(pos[i * 2] - x) < hw && Math.abs(pos[i * 2 + 1] - z) < hd) {
        mesh.setMatrixAt(i, zeroMatrix);
        changed = true;
      }
    }
    if (changed) mesh.instanceMatrix.needsUpdate = true;
  }
}
function createDecorations() {
  const dummy = new THREE.Object3D();
  const area = CONFIG.MAP_LIMIT + 60;

  const grassCount = 2600;
  const grass = new THREE.InstancedMesh(
    new THREE.ConeGeometry(0.16, 0.7, 4).translate(0, 0.35, 0),
    fogify(new THREE.MeshStandardMaterial({ color: 0x4f8f2f, roughness: 1 })),
    grassCount
  );
  const tint = new THREE.Color();
  let gi = 0;
  while (gi < grassCount) {
    const cx = randRange(-area, area), cz = randRange(-area, area);
    if (isNearObstacle(cx, cz, 1.5)) continue;
    const clump = 3 + Math.floor(rand() * 4);
    for (let k = 0; k < clump && gi < grassCount; k++) {
      dummy.position.set(cx + randRange(-0.5, 0.5), 0, cz + randRange(-0.5, 0.5));
      dummy.rotation.set(randRange(-0.25, 0.25), rand() * Math.PI, randRange(-0.25, 0.25));
      dummy.scale.setScalar(randRange(0.6, 1.3));
      dummy.updateMatrix();
      grass.setMatrixAt(gi, dummy.matrix);
      decor.grassPos.push(dummy.position.x, dummy.position.z);
      tint.setHSL(0.26 + randRange(-0.03, 0.03), 0.55, 0.3 + randRange(-0.06, 0.08));
      grass.setColorAt(gi, tint);
      gi++;
    }
  }
  grass.receiveShadow = true;
  scene.add(grass);

  const rockCount = 70;
  const rocks = new THREE.InstancedMesh(
    new THREE.DodecahedronGeometry(0.5, 0),
    fogify(new THREE.MeshStandardMaterial({ color: 0x8a867d, roughness: 0.95, flatShading: true })),
    rockCount
  );
  let ri = 0;
  while (ri < rockCount) {
    const x = randRange(-area, area), z = randRange(-area, area);
    if (isNearObstacle(x, z, 2.5)) continue;
    dummy.position.set(x, 0.1, z);
    dummy.rotation.set(rand() * 3, rand() * 3, rand() * 3);
    const s = randRange(0.4, 1.4);
    dummy.scale.set(s, s * randRange(0.5, 0.9), s * randRange(0.8, 1.2));
    dummy.updateMatrix();
    rocks.setMatrixAt(ri++, dummy.matrix);
    decor.rockPos.push(x, z);
  }
  rocks.castShadow = true;
  rocks.receiveShadow = true;
  scene.add(rocks);
  decor.grass = grass;
  decor.rocks = rocks;
}
