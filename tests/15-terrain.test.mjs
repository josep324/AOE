/* Relleu: turons i penya-segats, unitats i edificis sobre el terreny, clic al terreny i
   avantatge d'altura (+25% des de dalt, −25% des de baix, com a l'AoE II) */
export default async ({ open, assert, log }) => {
  const page = await open({ seed: 21, map: 'arabia' });
  const r = await page.evaluate(() => {
    const R = window.RTS, S = R.state, P = R.PLAYER.id, E = R.ENEMY.id, T = R.TERRAIN;
    R.AI.enabled = false; R.FOG.enabled = false; R.updateFog();
    const run = (s) => { for (let i = 0; i < s * 60; i++) R.simulate(1 / 60); };
    const o = { maxH: +T.maxH.toFixed(1), cliffs: T.cliffs.length };
    // El punt més alt (lluny de les bases) i un de baix a prop
    let hi = null, hh = -1;
    for (let z = -150; z <= 150; z += 3) for (let x = -150; x <= 150; x += 3) { const h = R.groundY(x, z); if (h > hh && !R.waterCell(x, z)) { hh = h; hi = [x, z]; } }
    let lo = null, lh = Infinity;
    for (let a = 0; a < 24; a++) for (const d of [8, 10, 12]) { const x = hi[0] + Math.cos(a / 24 * 6.283) * d, z = hi[1] + Math.sin(a / 24 * 6.283) * d; const h = R.groundY(x, z); if (h < lh) { lh = h; lo = [x, z]; } }
    o.drop = +(hh - lh).toFixed(1);
    // Unitat a dalt del turó: a l'alçada del terreny
    const up = R.createSoldierAt('archer', hi[0], hi[1], P), down = R.createSoldierAt('archer', lo[0], lo[1], E);
    run(0.2);
    o.onGround = Math.abs(up.position.y - R.groundY(up.position.x, up.position.z)) < 0.05;
    // Avantatge d'altura
    o.dmgDown = R.hitDamage(up, down, 1); o.dmgUp = R.hitDamage(down, up, 1);
    const flat1 = R.createSoldierAt('archer', 0, 0, P), flat2 = R.createSoldierAt('archer', 2, 0, E);
    run(0.1);
    o.dmgFlat = R.hitDamage(flat1, flat2, 1); o.dmgFlatE = R.hitDamage(flat2, flat1, 1);
    // Un edifici en pendent anivella el terreny
    const bx = Math.round((hi[0] + lo[0]) / 2), bz = Math.round((hi[1] + lo[1]) / 2);
    const slopeBefore = Math.abs(R.groundY(bx - 2, bz - 2) - R.groundY(bx + 2, bz + 2));
    const b = R.createBuilding('house', bx, bz, true, P);
    const c = [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]].map(([dx, dz]) => R.groundY(bx + dx, bz + dz));
    o.flatten = [+slopeBefore.toFixed(2), +(Math.max(...c) - Math.min(...c)).toFixed(2), +(b.position.y - c[0]).toFixed(2)];
    // Clic al terreny: un punt del turó projectat a la pantalla torna al mateix lloc
    const v = new R.THREE.Vector3(hi[0], R.groundY(hi[0], hi[1]), hi[1]);
    R.camState.target.set(hi[0], v.y, hi[1]); R.camState.dist = R.camState.targetDist = 50;
    R.camera.position.set(hi[0] + 25, v.y + 40, hi[1] + 25); R.camera.lookAt(v); R.camera.updateMatrixWorld();
    const s = v.clone().project(R.camera);
    const p = R.pickGround((s.x + 1) / 2 * innerWidth, (1 - s.y) / 2 * innerHeight);
    o.pickErr = p ? +p.distanceTo(v).toFixed(2) : -1;
    return o;
  });
  log(JSON.stringify(r));
  assert(r.maxH > 5, 'Aràbia hauria de tenir turons');
  assert(r.cliffs >= 2, 'hi hauria d\'haver penya-segats');
  assert(r.onGround, 'la unitat no és a l\'alçada del terreny');
  assert(r.dmgDown > r.dmgFlat && r.dmgUp < r.dmgFlatE, 'l\'altura no dona avantatge');
  assert(r.flatten[1] < 0.05, 'l\'edifici no ha anivellat el terreny');
  assert(r.pickErr >= 0 && r.pickErr < 0.8, 'el clic al terreny no troba el punt del turó');
};
