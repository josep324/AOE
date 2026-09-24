/* =====================================================================
   CONSTRUCCIÓ DEL MÓN
   Mapa simètric: cada jugador té la mateixa sortida (com un mapa 1v1 de l'AoE II)
   i els recursos neutrals es col·loquen per parelles, un a cada meitat del mapa.
   ===================================================================== */
const BASES = {
  [PLAYER.id]: { x: -72, z: -72, s: 1 },     // s = orientació (el rival té la base girada 180°)
  [ENEMY.id]: { x: 72, z: 72, s: -1 },
};
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
  for (let k = 0; k < 30; k++) {
    const a = angle + (k === 0 ? 0 : randRange(-spread, spread)), d = dist + (k === 0 ? 0 : randRange(-1.5, 1.5));
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
  return tc;
}
/* Recurs neutral a cada meitat del mapa: posició simètrica amb una petita variació independent */
function mirrored(fn, x, z, ...args) {
  for (const s of [1, -1]) {
    for (let k = 0; k < 12; k++) {
      const px = s * x + randRange(-5, 5), pz = s * z + randRange(-5, 5);
      if (!isNearObstacle(px, pz, fn === createForest ? 0 : 4)) { fn(px, pz, ...args); break; }
    }
  }
}

createGround();
const townCenter = createStartingBase(PLAYER.id);
const enemyTC = createStartingBase(ENEMY.id);
// Bosc gran a les cantonades, darrere de cada base
mirrored(createForest, -104, -92, 16, 11);
mirrored(createForest, -92, -106, 14, 10);
// Or i pedra al centre (disputats) i als costats
mirrored(createGoldMine, 6, -10);
mirrored(createStoneMine, -22, 20);
mirrored(createGoldMine, -100, -26);
mirrored(createGoldMine, -26, -102);
mirrored(createStoneMine, -104, 12);
mirrored(createGoldMine, -58, 40);
// Boscos neutrals repartits
mirrored(createForest, -10, -58, 16, 11);
mirrored(createForest, -58, -8, 16, 11);
mirrored(createForest, 40, -44, 14, 9);
mirrored(createForest, -108, 44, 16, 10);
mirrored(createForest, 44, -108, 16, 10);
mirrored(createForest, 0, 0, 10, 7);
// Ovelles soltes per explorar
mirrored(createSheep, -36, -12);
mirrored(createSheep, -34, -15);
mirrored(createSheep, 20, -70);
createDecorations();
// Tres aldeans inicials per jugador (com als RTS clàssics)
for (const team of [PLAYER.id, ENEMY.id]) {
  const B = BASES[team];
  [[-2.5, 9.5], [0, 10.2], [2.5, 9.5]].forEach(([dx, dz]) => createVillager(B.x + dx * B.s, B.z + dz * B.s, team));
}
