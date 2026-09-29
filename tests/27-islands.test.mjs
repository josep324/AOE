/* Mapa d'Illes: cada jugador a la seva illa (amb els mateixos recursos), relíquies a terra, i la IA
   que porta l'exèrcit amb vaixells de transport fins a l'illa rival i hi desembarca */
export default async ({ open, assert, log }) => {
  // Generació amb 2 i 4 jugadors
  const page0 = await open({ start: false });
  for (const layout of ['1v1', '2v2']) {
    const g = await page0.evaluate((layout) => {
      const R = window.RTS, S = R.state;
      R.setLayout(layout); R.resetWorld(); R.buildWorld('islands', 31);
      R.labelRegions();
      const tcs = S.buildings.filter(b => b.subtype === 'towncenter');
      const zones = tcs.map(tc => R.landZoneAt(tc.position));
      const per = tcs.map((tc, k) => {
        const mine = (n) => R.landZoneAt(n.position, 4) === zones[k];
        const c = (sub) => S.resourceNodes.filter(n => n.subtype === sub && mine(n)).length;
        const berries = S.resourceNodes.filter(n => n.subtype === 'berries' && n.position.distanceTo(tc.position) < 30).length;
        return { gold: c('gold'), stone: c('stone'), tree: c('tree'), berries };
      });
      const relicsOnLand = S.relics.every(r => R.waterCell(r.position.x, r.position.z) !== 1 && R.landZoneAt(r.position, 3) > 0);
      return { zones, per, relics: S.relics.length, relicsOnLand, fish: S.resourceNodes.filter(n => n.subtype === 'fish').length };
    }, layout);
    log(layout, JSON.stringify(g));
    assert(new Set(g.zones).size === g.zones.length && g.zones.every(z => z > 0), `${layout}: cada jugador hauria de tenir la seva illa`);
    assert(g.per.every(p => p.gold >= 5 && p.stone >= 2 && p.tree >= 250 && p.berries >= 6), `${layout}: falten recursos a alguna illa`);
    assert(g.per.every(p => p.gold === g.per[0].gold && p.stone === g.per[0].stone), `${layout}: les illes no tenen el mateix or i pedra`);
    assert(g.relics === 5 && g.relicsOnLand, `${layout}: relíquies a l'aigua`);
    assert(g.fish >= 16, `${layout}: massa pocs peixos`);
  }

  await page0.close();
  // Desembarcament: la IA embarca 12 piquers en dos transports i els porta a l'illa del jugador
  const page = await open({ map: 'islands', seed: 31 });
  const r = await page.evaluate(() => {
    const R = window.RTS, S = R.state, P = R.PLAYER.id, E = R.ENEMY.id, A = R.AI;
    const run = (s) => { for (let i = 0; i < s * 20; i++) R.simulate(0.05); };
    const C0 = R.aiContext(A);
    const dock = R.findDockSpot(C0.home, 120);
    const ships = [0, 1].map(i => R.createSoldierAt('transport', dock.x + i * 3, dock.z, E));
    const army = Array.from({ length: 12 }, (_, i) => R.createSoldierAt('spearman', C0.homeRally.x + (i % 4) * 1.5, C0.homeRally.z + Math.floor(i / 4) * 1.5, E));
    A.nextAttackAt = 1e9;                                 // (només la travessia de la prova)
    const C = R.aiContext(A);
    C.overseas = true;
    const ok = R.aiStartFerry(A, C, army, false);
    const pz = R.landZoneAt(R.townCenter.position);
    let landedAt = null;
    for (let t = 0; t < 240 && landedAt === null; t += 5) {
      run(5);
      if (army.filter(u => !u.dead && !u.garrisoned && R.landZoneAt(u.position, 3) === pz).length >= 8) landedAt = t;
    }
    for (let t = 0; t < 90 && !A.army; t += 5) run(5);    // (quan tots han baixat, formen l'exèrcit)
    return { ok, dock: !!dock, ships: ships.length, landedAt, onFoe: army.filter(u => !u.dead && !u.garrisoned && R.landZoneAt(u.position, 3) === pz).length,
      phase: A.ferry ? A.ferry.phase : null, army: A.army ? A.army.units.length : 0, overseas: A.army ? !!A.army.overseas : null };
  });
  log(JSON.stringify(r));
  assert(r.ok, 'la IA no ha començat la travessia');
  assert(r.landedAt !== null && r.onFoe >= 8, 'la IA no ha desembarcat les tropes a l\'illa rival');
  assert(r.army >= 8 && r.overseas, 'les tropes desembarcades no ataquen');
};
