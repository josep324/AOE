/* =====================================================================
   CONSTRUCCIÓ DEL MÓN
   Tipus de mapa: Aràbia (obert), Bosc Negre (boscos tancats amb camins), Llacs i Rius (amb guals).
   Com a l'AoE II: cada jugador té la mateixa sortida (bosc propi, arbres solts, or, pedra i menjar
   a les mateixes distàncies), els recursos neutrals van per parelles simètriques en llocs aleatoris
   i els boscos són taques compactes repartides a l'atzar per tot el mapa.
   ===================================================================== */
/* Les coordenades de disseny són d'un mapa de 250×250; MS les escala a la mida real del mapa */
const MS = CONFIG.MAP_LIMIT / 125;
const BASES = {
  [PLAYER.id]: { x: -72 * MS, z: -72 * MS, s: 1 },     // s = orientació (el rival té la base girada 180°)
  [ENEMY.id]: { x: 72 * MS, z: 72 * MS, s: -1 },
};
const MAP_TYPES = {
  arabia: { name: 'Aràbia', icon: '🏜️', desc: 'Terreny obert amb boscos petits: partides ràpides i agressives' },
  blackforest: { name: 'Bosc Negre', icon: '🌲', desc: 'Boscos immensos i tancats: només uns quants camins porten a l\'enemic' },
  lakes: { name: 'Llacs', icon: '🏞️', desc: 'Un gran llac al centre i altres de petits, amb peixos a la riba' },
  rivers: { name: 'Rius', icon: '🌊', desc: 'Un riu parteix el mapa: només es pot creuar pels guals' },
};
const WORLD = { type: 'arabia', seed: MAP_SEED };
let townCenter = null, enemyTC = null;

/* Proporció d'àrea respecte del mapa Mitjà (per escalar quantitats a la mida triada) */
const AREA_F = (CONFIG.MAP_LIMIT / 180) ** 2;
/* Un arbre de bosc no pot tocar cap altre obstacle ni tapar recursos, animals o l'aigua */
function forestBlocked(x, z, keep) {
  const L = CONFIG.MAP_LIMIT - 2.5;
  if (Math.abs(x) > L || Math.abs(z) > L) return true;
  if (WATER.any && waterNear(x, z, 1.2)) return true;
  for (const o of state.obstacles) {
    const d = obstacleSurface(o, x, z).d;
    if (d < (o.entity && o.entity.subtype === 'tree' ? 0.75 : 3.5)) return true;
  }
  for (const [kx, kz] of keep) if (Math.hypot(kx - x, kz - z) < 3.2) return true;
  return false;
}
/* Llocs que els boscos han de respectar: recursos que no són obstacles (ovelles, baies…) i animals */
function forestKeepList() {
  const out = [];
  for (const n of state.resourceNodes) if (n.subtype !== 'tree' && !n.obstacle) out.push([n.position.x, n.position.z]);
  for (const a of state.animals) out.push([a.position.x, a.position.z]);
  return out;
}
/* Radi aproximat d'un bosc compacte de n arbres */
const forestRadius = (n) => Math.sqrt(n * 4.9 / Math.PI);
/* Bosc a l'estil de l'AoE II: una taca compacta de contorn irregular (i sovint allargada),
   plena d'arbres de vora a vora, en lloc d'un núvol d'arbres escampats.
   elong > 1 l'allarga en la direcció «angle» (línies de bosc) */
function createForest(cx, cz, n, { elong = randRange(1, 1.7), angle = rand() * Math.PI } = {}) {
  const r = forestRadius(n), keep = forestKeepList();
  const a = r * Math.sqrt(elong), b = r / Math.sqrt(elong);
  const ca = Math.cos(angle), sa = Math.sin(angle);
  // Contorn irregular: el radi varia amb l'angle (uns quants harmònics aleatoris)
  const harm = [2, 3, 5].map(k => [k, randRange(0.06, 0.2), rand() * Math.PI * 2]);
  const edge = (phi) => 1 + harm.reduce((s, [k, amp, ph]) => s + amp * Math.sin(k * phi + ph), 0);
  const step = 2.3, R = Math.max(a, b) * 1.5 + step;
  const cands = [];
  for (let gz = -R; gz <= R; gz += step * 0.87) {
    const row = Math.round(gz / (step * 0.87));
    for (let gx = -R + (row & 1 ? step / 2 : 0); gx <= R; gx += step) {
      const x = gx + randRange(-0.4, 0.4), z = gz + randRange(-0.4, 0.4);
      const u = (x * ca + z * sa) / a, v = (-x * sa + z * ca) / b;
      const q = Math.hypot(u, v) / edge(Math.atan2(v, u)) + randRange(-0.07, 0.07);
      cands.push([q, cx + x, cz + z]);
    }
  }
  cands.sort((p, q) => p[0] - q[0]);
  let placed = 0;
  for (const [, x, z] of cands) {
    if (placed >= n) break;
    if (forestBlocked(x, z, keep)) continue;
    createTree(x, z, randRange(0.9, 1.2));
    placed++;
  }
  return placed;
}
/* Boscos repartits a l'atzar pel mapa (no simètrics), lluny de les bases i separats entre ells
   per deixar-hi passos, com els de l'AoE II */
const FORESTS = [];
function scatterForests(count, minT, maxT, baseGap = 50) {
  const L = CONFIG.MAP_LIMIT - 8;
  for (let i = 0; i < count; i++) {
    const n = Math.round(randRange(minT, maxT)), r = forestRadius(n) * 1.25;
    for (let k = 0; k < 80; k++) {
      const x = randRange(-L, L), z = randRange(-L, L);
      if (Object.values(BASES).some(B => Math.hypot(x - B.x, z - B.z) < baseGap + r)) continue;
      if (FORESTS.some(f => Math.hypot(f.x - x, f.z - z) < f.r + r + 9)) continue;
      if (isNearObstacle(x, z, 4)) continue;
      if (createForest(x, z, n) > n * 0.5) FORESTS.push({ x, z, r });
      break;
    }
  }
}
/* Arbres solts i grupets de 2-3 escampats pel mapa */
function scatterTrees(count, baseGap = 30) {
  const L = CONFIG.MAP_LIMIT - 5;
  for (let i = 0; i < count; i++) {
    for (let k = 0; k < 30; k++) {
      const x = randRange(-L, L), z = randRange(-L, L);
      if (Object.values(BASES).some(B => Math.hypot(x - B.x, z - B.z) < baseGap)) continue;
      if (isNearObstacle(x, z, 3)) continue;
      const g = rand() < 0.35 ? Math.floor(randRange(2, 4)) : 1;
      for (let t = 0; t < g; t++) {
        const tx = x + (t ? randRange(-3, 3) : 0), tz = z + (t ? randRange(-3, 3) : 0);
        if (!t || !isNearObstacle(tx, tz, 1.2)) createTree(tx, tz, randRange(0.9, 1.25));
      }
      break;
    }
  }
}
/* Punt a una distància i angle del Centre, lliure d'obstacles (prova diversos angles) */
function freeSpot(B, dist, angle, spread, margin) {
  for (let k = 0; k < 40; k++) {
    const a = angle + (k === 0 ? 0 : randRange(-spread, spread) * (1 + k / 15)), d = dist + (k === 0 ? 0 : randRange(-1.5, 1.5) * (1 + k / 20));
    const x = B.x + Math.cos(a) * d, z = B.z + Math.sin(a) * d;
    if (Math.abs(x) < CONFIG.MAP_LIMIT - 6 && Math.abs(z) < CONFIG.MAP_LIMIT - 6 && !isNearObstacle(x, z, margin)) return [x, z, a];
  }
  return null;
}
const angDiff = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
/* Sortida d'un jugador: les mateixes quantitats i distàncies per a tothom (partida justa),
   però amb una disposició aleatòria diferent a cada costat */
function createStartingBase(team) {
  const B = BASES[team];
  const tc = createTownCenter(B.x, B.z, team);
  const back = Math.atan2(-B.z, -B.x) + Math.PI;              // direcció cap a la cantonada (lluny del rival)
  // Bosc principal: una línia de bosc llarga darrere la base, i un segon bosc més petit a un costat
  const wood = back + randRange(-0.9, 0.9);
  createForest(B.x + Math.cos(wood) * 34, B.z + Math.sin(wood) * 34, 60, { elong: randRange(2.2, 3), angle: wood + Math.PI / 2 });
  const wood2 = wood + (rand() < 0.5 ? -1 : 1) * randRange(1.5, 2.2);
  createForest(B.x + Math.cos(wood2) * 42, B.z + Math.sin(wood2) * 42, 30, { elong: randRange(1.2, 1.9), angle: wood2 + Math.PI / 2 });
  // Or i pedra a banda i banda, separats de la fusta i entre ells
  const used = [wood, wood2];
  const pickAngle = (minSep) => {
    for (let k = 0; k < 60; k++) {
      const a = randRange(0, Math.PI * 2);
      if (used.every(u => angDiff(a, u) > minSep)) { used.push(a); return a; }
    }
    const a = randRange(0, Math.PI * 2); used.push(a); return a;
  };
  for (const [fn, dist] of [[createGoldMine, randRange(18, 21)], [createGoldMine, randRange(22, 26)], [createStoneMine, randRange(20, 24)]]) {
    const p = freeSpot(B, dist, pickAngle(0.95), 0.3, 3.5);
    if (p) fn(p[0], p[1]);
  }
  // Baies i ovelles
  const bp = freeSpot(B, randRange(14, 17), pickAngle(0.8), 0.3, 3);
  if (bp) {
    const [bx, bz] = bp;
    [[0, 0], [2.6, 1.4], [-0.8, 2.8], [2.2, 4.2], [4.8, 3.2], [1.6, 5.6]].forEach(([dx, dz]) => {
      const x = bx + dx, z = bz + dz;
      if (!isNearObstacle(x, z, 1.1)) createBerryBush(x, z);
    });
  }
  const sp = freeSpot(B, randRange(10, 13), pickAngle(0.6), 0.4, 2);
  if (sp) [[0, 0], [-2, 2.5], [2, 3], [-3, -1.5]].forEach(([dx, dz]) => createSheep(sp[0] + dx, sp[1] + dz));
  // Caça: dos senglars a prop i dos ramats de cérvols una mica més lluny
  for (let i = 0; i < 2; i++) {
    const p = freeSpot(B, randRange(24, 30), pickAngle(0.5), 0.5, 2.5);
    if (p) createAnimal('boar', p[0], p[1]);
  }
  for (let h = 0; h < 2; h++) {
    const p = freeSpot(B, randRange(32, 42), pickAngle(0.4), 0.6, 3);
    if (p) for (let i = 0; i < 3; i++) {
      const x = p[0] + randRange(-2.5, 2.5), z = p[1] + randRange(-2.5, 2.5);
      if (!isNearObstacle(x, z, 0.8)) createAnimal('deer', x, z);
    }
  }
  // Arbres solts a prop del Centre (com els de l'AoE II): dos de més a prop i tres una mica més enllà,
  // lluny dels aldeans inicials
  const vill = [-2.5, 0, 2.5].map(dx => [B.x + dx * B.s, B.z + 10 * B.s]);
  for (const [dmin, dmax] of [[10, 12], [10, 12], [13, 17], [13, 17], [13, 17]]) {
    for (let k = 0; k < 40; k++) {
      const a = rand() * Math.PI * 2, d = randRange(dmin, dmax);
      const x = B.x + Math.cos(a) * d, z = B.z + Math.sin(a) * d;
      if (vill.some(([vx, vz]) => Math.hypot(vx - x, vz - z) < 5) || isNearObstacle(x, z, 2.2)) continue;
      createTree(x, z, randRange(1, 1.2));
      break;
    }
  }
  return tc;
}
/* Recursos neutrals: parelles simètriques respecte del centre (partida justa) però en llocs
   triats a l'atzar a cada partida, lluny de les bases i separats entre ells */
function mirroredRandom(fn, count, { baseGap = 45, gap = 24, margin = 4 } = {}) {
  const L = CONFIG.MAP_LIMIT - 10, placed = [];
  const farFromBases = (x, z) => Object.values(BASES).every(B => Math.hypot(x - B.x, z - B.z) > baseGap);
  for (let i = 0; i < count; i++) {
    for (let k = 0; k < 120; k++) {
      const x = randRange(-L, L), z = randRange(-L, L);
      if (Math.hypot(x, z) * 2 < gap) continue;                      // la parella no pot quedar enganxada
      if (!farFromBases(x, z) || !farFromBases(-x, -z)) continue;
      if (placed.some(([px, pz]) => Math.hypot(px - x, pz - z) < gap || Math.hypot(px + x, pz + z) < gap)) continue;
      if (isNearObstacle(x, z, margin) || isNearObstacle(-x, -z, margin)) continue;
      fn(x, z); fn(-x, -z);
      placed.push([x, z], [-x, -z]);
      break;
    }
  }
}
/* Llops: parelles simètriques lluny de les dues bases */
function placeWolves(n) {
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < 40; k++) {
      const lim = CONFIG.MAP_LIMIT - 15;
      const x = randRange(-lim, lim), z = randRange(-lim, lim);
      if (Object.values(BASES).some(B => Math.hypot(x - B.x, z - B.z) < 60 || Math.hypot(-x - B.x, -z - B.z) < 60)) continue;
      if (isNearObstacle(x, z, 2) || isNearObstacle(-x, -z, 2)) continue;
      createAnimal('wolf', x, z); createAnimal('wolf', -x, -z);
      break;
    }
  }
}
/* Peixos a la riba de l'aigua (simètrics), separats entre ells */
function placeFish(max, minGap = 9) {
  if (!WATER.any) return;
  const cells = shoreCells();
  for (let i = cells.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [cells[i], cells[j]] = [cells[j], cells[i]]; }
  const placed = [];
  for (const [x, z] of cells) {
    if (placed.length >= max) break;
    if (placed.some(([px, pz]) => Math.hypot(px - x, pz - z) < minGap)) continue;
    if (Object.values(BASES).some(B => Math.hypot(x - B.x, z - B.z) < 22)) continue;
    placed.push([x, z]);
    createFish(x, z);
    createFish(-x, -z);
  }
}

/* Peix d'altura: al mig de l'aigua, lluny de la riba (només per als vaixells) */
function placeDeepFish(max) {
  if (!WATER.any) return;
  const L = CONFIG.MAP_LIMIT, N = WATER.N, cands = [];
  for (let j = 3; j < N - 3; j += 2) for (let i = 3; i < N - 3; i += 2) {
    const x = -L + i + 0.5, z = -L + j + 0.5;
    if (x + z < 0 || WATER.mask[j * N + i] !== 1) continue;
    let deep = true;
    for (let dj = -3; dj <= 3 && deep; dj++) for (let di = -3; di <= 3; di++) if (WATER.mask[(j + dj) * N + i + di] !== 1) { deep = false; break; }
    if (deep) cands.push([x, z]);
  }
  for (let i = cands.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [cands[i], cands[j]] = [cands[j], cands[i]]; }
  const placed = [];
  for (const [x, z] of cands) {
    if (placed.length >= max) break;
    if (placed.some(([px, pz]) => Math.hypot(px - x, pz - z) < 8)) continue;
    placed.push([x, z]);
    createFish(x, z, true);
    createFish(-x, -z, true);
  }
}
/* ---------- Generadors de cada tipus de mapa ---------- */
function neutralResources() {
  // Or i pedra repartits pel mapa (la quantitat creix amb la mida)
  mirroredRandom(createGoldMine, Math.max(3, Math.round(5 * AREA_F)), { gap: 30 });
  mirroredRandom(createStoneMine, Math.max(2, Math.round(3 * AREA_F)), { gap: 30 });
  // Ovelles soltes per explorar
  mirroredRandom(createSheep, Math.max(3, Math.round(6 * AREA_F)), { baseGap: 38, gap: 14, margin: 2 });
}
const GENERATORS = {
  arabia() {
    neutralResources();
    scatterForests(Math.round(16 * AREA_F), 24, 75);
    scatterTrees(Math.round(40 * AREA_F));
    placeWolves(4);
  },
  lakes() {
    neutralResources();
    scatterForests(Math.round(13 * AREA_F), 24, 65);
    scatterTrees(Math.round(30 * AREA_F));
    placeFish(14);
    placeDeepFish(4);
    placeWolves(2);
  },
  rivers() {
    neutralResources();
    scatterForests(Math.round(13 * AREA_F), 24, 65);
    scatterTrees(Math.round(30 * AREA_F));
    placeFish(12);
    placeDeepFish(2);
    placeWolves(2);
  },
  blackforest() {
    // Primer els recursos (a les clarianes) i després el bosc, que ho omple tot menys camins i clarianes
    neutralResources();
    const B1 = BASES[PLAYER.id], B2 = BASES[ENEMY.id];
    const paths = [
      [[B1.x, B1.z], [0, 0], [B2.x, B2.z]],
      [[B1.x, B1.z], [-84 * MS, 18 * MS], [-18 * MS, 84 * MS], [B2.x, B2.z]],
      [[B2.x, B2.z], [84 * MS, -18 * MS], [18 * MS, -84 * MS], [B1.x, B1.z]],
    ].map(pts => pts.map(([x, z]) => [x + randRange(-4, 4), z + randRange(-4, 4)]));
    const segDist = (x, z, a, b) => {
      const vx = b[0] - a[0], vz = b[1] - a[1], wx = x - a[0], wz = z - a[1];
      const t = Math.max(0, Math.min(1, (wx * vx + wz * vz) / (vx * vx + vz * vz)));
      return Math.hypot(wx - vx * t, wz - vz * t);
    };
    const onPath = (x, z) => paths.some(p => p.some((a, i) => i > 0 && segDist(x, z, p[i - 1], a) < 5.5 + 2 * fbm(x * 0.05, z * 0.05)));
    const clearing = (x, z) => Object.values(BASES).some(B => Math.hypot(x - B.x, z - B.z) < 34) || Math.hypot(x, z) < 12;
    // Arbres llançats a l'atzar (amb una distància mínima entre ells) allà on el soroll diu que hi ha bosc:
    // cap patró de graella, com un bosc de debò
    const L = CONFIG.MAP_LIMIT - 3, gap = 3.9, cell = gap, GN = Math.ceil(2 * L / cell) + 1;
    const grid = new Map(), ox = rand() * 100, oz = rand() * 100;       // clarianes diferents a cada partida
    const key = (i, j) => j * GN + i;
    const tooClose = (x, z) => {
      const ci = Math.floor((x + L) / cell), cj = Math.floor((z + L) / cell);
      for (let j = cj - 1; j <= cj + 1; j++) for (let i = ci - 1; i <= ci + 1; i++) {
        const t = grid.get(key(i, j));
        if (t && t.some(([tx, tz]) => Math.hypot(tx - x, tz - z) < gap)) return true;
      }
      return false;
    };
    const tries = Math.round((2 * L) ** 2 / (gap * gap) * 3);
    for (let k = 0; k < tries; k++) {
      const x = randRange(-L, L), z = randRange(-L, L);
      if (fbm(x * 0.025 + ox, z * 0.025 + oz) < 0.44) continue;         // clarianes naturals
      if (tooClose(x, z) || onPath(x, z) || clearing(x, z) || isNearObstacle(x, z, 1.5)) continue;
      createTree(x, z, randRange(1.1, 1.5));
      const kk = key(Math.floor((x + L) / cell), Math.floor((z + L) / cell));
      if (!grid.has(kk)) grid.set(kk, []);
      grid.get(kk).push([x, z]);
    }
    placeWolves(4);
  },
};

/* Genera un món sencer (el mateix mapa per a la mateixa llavor i tipus) */
function buildWorld(type, seed = MAP_SEED) {
  if (!GENERATORS[type]) type = 'arabia';
  WORLD.type = type;
  WORLD.seed = seed >>> 0;
  reseedRand((WORLD.seed ^ { arabia: 0x1111, blackforest: 0x2222, lakes: 0x3333, rivers: 0x4444 }[type]) >>> 0);
  setupWater(type, WORLD.seed);
  rebuildNav();
  createBuilding.batch = true;
  FORESTS.length = 0;
  townCenter = createStartingBase(PLAYER.id);
  enemyTC = createStartingBase(ENEMY.id);
  GENERATORS[type]();
  placeRelics();
  createDecorations();
  // Tres aldeans inicials per jugador (com als RTS clàssics)
  for (const team of [PLAYER.id, ENEMY.id]) {
    const B = BASES[team];
    [[-2.5, 9.5], [0, 10.2], [2.5, 9.5]].forEach(([dx, dz]) => createVillager(B.x + dx * B.s, B.z + dz * B.s, team));
  }
  createBuilding.batch = false;
  rebuildNav();
}
/* Esborra tot el món (entitats, decoració, aigua i terreny pintat) per generar-ne un de nou */
function resetWorld() {
  for (const e of [...state.units, ...state.buildings, ...state.resourceNodes, ...state.dying, ...state.relics]) scene.remove(e.group);
  for (const p of state.projectiles) scene.remove(p.g);
  for (const m of state.markers) scene.remove(m.g);
  Object.assign(state, { units: [], buildings: [], resourceNodes: [], obstacles: [], pickables: [], selected: [], dying: [],
    projectiles: [], markers: [], relics: [], animals: [], relicWin: null, controlGroups: {}, pings: [] });
  removeDecorations();
  clearWater();
  paintGroundBase();
  if (FOG.explored) FOG.explored.fill(0);
}

createGround();
