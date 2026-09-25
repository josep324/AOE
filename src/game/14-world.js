/* =====================================================================
   CONSTRUCCIÓ DEL MÓN
   Tipus de mapa: Aràbia (obert), Bosc Negre (boscos tancats amb camins), Llacs i Rius (amb guals).
   Cada jugador té la mateixa sortida (com un mapa 1v1 de l'AoE II) i els recursos neutrals
   es col·loquen per parelles simètriques respecte del centre.
   ===================================================================== */
const BASES = {
  [PLAYER.id]: { x: -72, z: -72, s: 1 },     // s = orientació (el rival té la base girada 180°)
  [ENEMY.id]: { x: 72, z: 72, s: -1 },
};
const MAP_TYPES = {
  arabia: { name: 'Aràbia', icon: '🏜️', desc: 'Terreny obert amb boscos petits: partides ràpides i agressives' },
  blackforest: { name: 'Bosc Negre', icon: '🌲', desc: 'Boscos immensos i tancats: només uns quants camins porten a l\'enemic' },
  lakes: { name: 'Llacs', icon: '🏞️', desc: 'Un gran llac al centre i altres de petits, amb peixos a la riba' },
  rivers: { name: 'Rius', icon: '🌊', desc: 'Un riu parteix el mapa: només es pot creuar pels guals' },
};
const WORLD = { type: 'arabia', seed: MAP_SEED };
let townCenter = null, enemyTC = null;

// Bosc irregular dins d'un cercle, sense trepitjar res del que ja hi ha
function createForest(cx, cz, n, r) {
  let placed = 0, tries = 0;
  while (placed < n && tries++ < n * 12) {
    const a = rand() * Math.PI * 2, d = Math.sqrt(rand()) * r;
    const x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
    if (Math.abs(x) > CONFIG.MAP_LIMIT - 3 || Math.abs(z) > CONFIG.MAP_LIMIT - 3 || isNearObstacle(x, z, 1.6)) continue;
    createTree(x, z, randRange(0.85, 1.25));
    placed++;
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
  // Línia d'arbres: darrere la base, amb un angle aleatori
  const wood = back + randRange(-0.9, 0.9);
  for (let i = 0; i < 3; i++) {
    const p = freeSpot(B, randRange(17, 21), wood + (i - 1) * 0.35, 0.2, 1.8);
    if (p) createTree(p[0], p[1], randRange(0.95, 1.2));
  }
  const fx = B.x + Math.cos(wood) * 33, fz = B.z + Math.sin(wood) * 33;
  createForest(fx, fz, 12, 8);
  // Or i pedra a banda i banda, separats de la fusta i entre ells
  const used = [wood];
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
  return tc;
}
/* Recurs neutral a cada meitat del mapa: posició simètrica amb una petita variació independent
   (si el lloc és ocupat, en busca un de lliure cada cop més lluny) */
function mirrored(fn, x, z, ...args) {
  for (const s of [1, -1]) {
    for (let k = 0; k < 30; k++) {
      const j = 5 + k * 0.6;
      const px = s * x + randRange(-j, j), pz = s * z + randRange(-j, j);
      if (Math.abs(px) > CONFIG.MAP_LIMIT - 6 || Math.abs(pz) > CONFIG.MAP_LIMIT - 6) continue;
      if (Object.values(BASES).some(B => Math.hypot(px - B.x, pz - B.z) < 30)) continue;
      if (!isNearObstacle(px, pz, fn === createForest ? 0 : 4)) { fn(px, pz, ...args); break; }
    }
  }
}
/* Llops: parelles simètriques lluny de les dues bases */
function placeWolves(n) {
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < 40; k++) {
      const x = randRange(-110, 110), z = randRange(-110, 110);
      if (Object.values(BASES).some(B => Math.hypot(x - B.x, z - B.z) < 52 || Math.hypot(-x - B.x, -z - B.z) < 52)) continue;
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

/* ---------- Generadors de cada tipus de mapa ---------- */
function neutralResources(extraForests = true) {
  // Or i pedra al centre (disputats) i als costats
  mirrored(createGoldMine, 6, -10);
  mirrored(createStoneMine, -22, 20);
  mirrored(createGoldMine, -100, -26);
  mirrored(createGoldMine, -26, -102);
  mirrored(createStoneMine, -104, 12);
  mirrored(createGoldMine, -58, 40);
  // Ovelles soltes per explorar
  mirrored(createSheep, -36, -12);
  mirrored(createSheep, -34, -15);
  mirrored(createSheep, 20, -70);
  if (!extraForests) return;
}
const GENERATORS = {
  arabia() {
    mirrored(createForest, -104, -92, 16, 11);
    mirrored(createForest, -92, -106, 14, 10);
    neutralResources();
    mirrored(createForest, -10, -58, 16, 11);
    mirrored(createForest, -58, -8, 16, 11);
    mirrored(createForest, 40, -44, 14, 9);
    mirrored(createForest, -108, 44, 16, 10);
    mirrored(createForest, 44, -108, 16, 10);
    mirrored(createForest, 0, 0, 10, 7);
    placeWolves(3);
  },
  lakes() {
    mirrored(createForest, -104, -92, 16, 11);
    mirrored(createForest, -92, -106, 14, 10);
    neutralResources();
    mirrored(createForest, -10, -62, 14, 10);
    mirrored(createForest, -62, -10, 14, 10);
    mirrored(createForest, -108, 44, 14, 10);
    mirrored(createForest, 44, -108, 14, 10);
    placeFish(10);
    placeWolves(2);
  },
  rivers() {
    mirrored(createForest, -104, -92, 16, 11);
    mirrored(createForest, -92, -106, 14, 10);
    neutralResources();
    mirrored(createForest, -40, -70, 14, 10);
    mirrored(createForest, -70, -40, 14, 10);
    mirrored(createForest, -110, 30, 14, 10);
    mirrored(createForest, 30, -110, 14, 10);
    placeFish(8);
    placeWolves(2);
  },
  blackforest() {
    // Primer els recursos (a les clarianes) i després el bosc, que ho omple tot menys camins i clarianes
    neutralResources(false);
    const B1 = BASES[PLAYER.id], B2 = BASES[ENEMY.id];
    const paths = [
      [[B1.x, B1.z], [0, 0], [B2.x, B2.z]],
      [[B1.x, B1.z], [-84, 18], [-18, 84], [B2.x, B2.z]],
      [[B2.x, B2.z], [84, -18], [18, -84], [B1.x, B1.z]],
    ].map(pts => pts.map(([x, z]) => [x + randRange(-4, 4), z + randRange(-4, 4)]));
    const segDist = (x, z, a, b) => {
      const vx = b[0] - a[0], vz = b[1] - a[1], wx = x - a[0], wz = z - a[1];
      const t = Math.max(0, Math.min(1, (wx * vx + wz * vz) / (vx * vx + vz * vz)));
      return Math.hypot(wx - vx * t, wz - vz * t);
    };
    const onPath = (x, z) => paths.some(p => p.some((a, i) => i > 0 && segDist(x, z, p[i - 1], a) < 5.5 + 2 * fbm(x * 0.05, z * 0.05)));
    const clearing = (x, z) => Object.values(BASES).some(B => Math.hypot(x - B.x, z - B.z) < 34) || Math.hypot(x, z) < 12;
    const L = CONFIG.MAP_LIMIT - 3, step = 4.0;
    for (let gx = -L; gx <= L; gx += step) for (let gz = -L; gz <= L; gz += step) {
      if (gx + gz < 0 || (gx + gz === 0 && gx < 0)) continue;           // mitja graella: l'altra meitat és el mirall
      const x = gx + randRange(-0.9, 0.9), z = gz + randRange(-0.9, 0.9);
      const dens = fbm(x * 0.025 + 11, z * 0.025 - 7);
      if (dens < 0.44) continue;                                        // clarianes naturals
      for (const [px, pz] of [[x, z], [-x, -z]]) {
        if (onPath(px, pz) || clearing(px, pz) || isNearObstacle(px, pz, 1.5)) continue;
        createTree(px, pz, randRange(1.0, 1.35));
      }
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
