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
/* Sortida estàndard d'un jugador (posicions relatives al Centre de Ciutat) */
function createStartingBase(team) {
  const B = BASES[team];
  const at = (dx, dz) => [B.x + dx * B.s, B.z + dz * B.s];
  const tc = createTownCenter(B.x, B.z, team);
  // Línia d'arbres propera i bosc darrere la base
  [[-17, -12, 1.1], [-21, -4, 0.95], [-13, -19, 1.2]].forEach(([dx, dz, sc]) => createTree(...at(dx, dz), sc));
  [[-30, -16], [-33, -9], [-28, -24], [-36, -20], [-38, -12], [-31, -31], [-41, -26], [-26, -32], [-43, -17], [-35, -3]]
    .forEach(([dx, dz]) => { const [x, z] = at(dx + randRange(-1, 1), dz + randRange(-1, 1)); createTree(x, z, randRange(0.85, 1.25)); });
  createGoldMine(...at(19, -15));
  createGoldMine(...at(23, 11));
  createStoneMine(...at(-24, 17));
  [[11, 22], [13.6, 23.4], [10.2, 24.8], [13.2, 26.4], [15.8, 25.2], [11.6, 27.6]].forEach(([dx, dz]) => createBerryBush(...at(dx, dz)));
  [[-11, 13], [-13, 15.5], [-9, 16], [-14, 11.5]].forEach(([dx, dz]) => createSheep(...at(dx, dz)));
  return tc;
}
/* Recurs neutral i el seu simètric respecte del centre del mapa */
function mirrored(fn, x, z, ...args) { fn(x, z, ...args); fn(-x, -z, ...args); }

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
