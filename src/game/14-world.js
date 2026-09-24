/* =====================================================================
   CONSTRUCCIÓ DEL MÓN
   ===================================================================== */
createGround();
const townCenter = createTownCenter(0, 0);
createTree(-17, -12, 1.1);
createTree(-21, -4, 0.95);
createTree(-13, -19, 1.2);
// Petit bosc a l'oest: quan un arbre s'esgota, els aldeans busquen el següent
[[-30, -16], [-33, -9], [-28, -24], [-36, -20], [-38, -12], [-31, -31], [-41, -26], [-26, -32], [-43, -17], [-35, -3]]
  .forEach(([x, z]) => createTree(x + randRange(-1, 1), z + randRange(-1, 1), randRange(0.85, 1.25)));
createGoldMine(19, -15);
createGoldMine(23, 11);
// Aliment: arbustos de baies i ovelles (com a l'inici d'una partida d'AoE II)
[[11, 22], [13.6, 23.4], [10.2, 24.8], [13.2, 26.4], [15.8, 25.2], [11.6, 27.6]].forEach(([x, z]) => createBerryBush(x, z));
[[-11, 13], [-13, 15.5], [-9, 16], [-14, 11.5]].forEach(([x, z]) => createSheep(x, z));
[[42, 30], [44, 33]].forEach(([x, z]) => createSheep(x, z));
// Pedra
createStoneMine(-24, 17);
createStoneMine(46, -38);
// ---- Base de l'Imperi Vermell (cantonada oposada) ----
[[80, 46], [83, 52], [86, 58], [79, 63], [84, 67], [88, 48], [76, 72], [90, 62], [82, 40], [87, 73], [91, 54]]
  .forEach(([x, z]) => createTree(x + randRange(-1, 1), z + randRange(-1, 1), randRange(0.9, 1.25)));
createGoldMine(44, 74);
createGoldMine(70, 86);
// Mines extres repartides pel mapa (or i pedra per a partides llargues)
[[-38, 12], [4, -34], [-70, -30], [30, -75], [-20, 70], [75, -5], [-80, 70], [85, -80]].forEach(([x, z]) => createGoldMine(x, z));
[[-45, -45], [15, 55], [-85, -5], [60, -65]].forEach(([x, z]) => createStoneMine(x, z));
[[70, 36], [72.6, 37.4], [69.2, 39], [72.2, 40.4], [74.8, 39.2]].forEach(([x, z]) => createBerryBush(x, z));
[[50, 52], [52.5, 49], [48, 47]].forEach(([x, z]) => createSheep(x, z));
createStoneMine(34, 86);
// Boscos grans repartits pel mapa (fusta per a tota la partida)
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
createForest(-8, -58, 18, 11);
createForest(-62, 30, 18, 11);
createForest(88, 18, 14, 8);
createForest(22, 88, 14, 9);
createForest(-50, -60, 14, 10);
createForest(60, -45, 14, 10);
const enemyTC = createTownCenter(62, 60, ENEMY.id);
createDecorations();
// Tres aldeans inicials (com als RTS clàssics)
createVillager(-2.5, 9.5);
createVillager(0, 10.2);
createVillager(2.5, 9.5);
createVillager(59.5, 69.5, ENEMY.id);
createVillager(62, 70.2, ENEMY.id);
createVillager(64.5, 69.5, ENEMY.id);
