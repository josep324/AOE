/* Naval: moll a l'aigua, vaixells a l'aigua, pesca i combat */
export default async ({ open, assert, log }) => {
  const page = await open({ map: 'lakes' });
  const r = await page.evaluate(() => {
    const R = window.RTS, S = R.state, P = R.PLAYER.id, E = R.ENEMY.id;
    R.AI.enabled = false;
    R.FOG.enabled = false; R.updateFog();
    const run = (s) => { for (let i = 0; i < s * 20; i++) R.simulate(0.05); };
    R.PLAYER.age = 3; for (const k of ['food', 'wood', 'gold', 'stone']) R.PLAYER.res[k] = 20000;
    const spot = R.findDockSpot(R.townCenter.position, 140);
    const dock = R.createBuilding('dock', spot.x, spot.z, true, P);
    const fs = R.spawnUnit(dock, 'fishingship'), g = R.spawnUnit(dock, 'galley');
    const wet = [fs, g].every(u => R.waterCell(u.position.x, u.position.z) === 1);
    const fish = S.resourceNodes.filter(n => n.subtype === 'fish' || n.subtype === 'deepfish')
      .sort((a, b) => a.position.distanceTo(fs.position) - b.position.distanceTo(fs.position))[0];
    const food0 = R.PLAYER.res.food;
    R.commandGather([fs], fish); run(60);
    const eg = R.createSoldierAt('galley', g.position.x + 6, g.position.z, E);
    const h0 = eg.hp;
    R.commandAttack([g], eg); run(30);
    return { wet, food: R.PLAYER.res.food - food0, hit: eg.dead || eg.hp < h0,
      onLand: S.units.filter(u => u.naval && R.waterCell(u.position.x, u.position.z) !== 1).length };
  });
  log(JSON.stringify(r));
  assert(r.wet, 'els vaixells no surten a l\'aigua');
  assert(r.food > 0, 'el vaixell pesquer no porta peix');
  assert(r.hit, 'la galera no fa mal a la galera enemiga');
  assert(r.onLand === 0, 'hi ha vaixells a terra');
};
