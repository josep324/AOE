/* Economia: recollir, portar al magatzem, construir i entrenar */
export default async ({ open, assert, log }) => {
  const page = await open();
  const r = await page.evaluate(() => {
    const R = window.RTS, S = R.state, P = R.PLAYER.id;
    R.AI.enabled = false;
    const run = (s) => { for (let i = 0; i < s * 60; i++) R.simulate(1 / 60); };
    const vs = S.units.filter(u => u.team === P && u.subtype === 'villager');
    const tc = R.townCenter.position;
    const near = (type) => S.resourceNodes.filter(n => n.subtype === type).sort((a, b) => a.position.distanceTo(tc) - b.position.distanceTo(tc))[0];
    const wood0 = R.PLAYER.res.wood, food0 = R.PLAYER.res.food;
    R.commandGather([vs[0]], near('tree'));
    R.commandGather([vs[1]], near('sheep') || near('berries'));
    // Una casa
    const h = R.createBuilding('house', tc.x + 14, tc.z - 12, false, P);
    R.commandBuild([vs[2]], h);
    R.queueUnit(R.townCenter, 'villager');
    run(60);
    return { wood: R.PLAYER.res.wood - wood0, food: R.PLAYER.res.food - food0, house: !h.underConstruction,
      vills: S.units.filter(u => u.team === P && u.subtype === 'villager').length };
  });
  log(JSON.stringify(r));
  assert(r.wood > 0, 'no s\'ha portat fusta');
  assert(r.food > -50, 'no s\'ha portat menjar');
  assert(r.house, 'la casa no s\'ha acabat');
  assert(r.vills === 4, 'no s\'ha entrenat l\'aldeà');
};
