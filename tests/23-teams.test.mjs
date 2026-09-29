/* Fase 20: partides de fins a 4 jugadors amb equips
   - 2 contra 2: quatre bases, l'aliat no ataca ni és atacat, visió compartida, les IA juguen
   - mapes de 4 jugadors (Rius, Llacs, Bosc Negre): cap base a l'aigua i totes es poden arribar a peu
   - tots contra tots: un jugador eliminat desapareix i la partida continua; sense rivals, victòria
   - desar i carregar conserva els jugadors i els equips */
export default async ({ open, assert, log }) => {
  // ---------- 2 contra 2 ----------
  let page = await open({ seed: 31, layout: '2v2', diff: 'normal', slots: { 3: 'britons', 4: 'mongols' } });
  let r = await page.evaluate(() => {
    const R = window.RTS, S = R.state, V = R.THREE.Vector3;
    const run = (s) => { for (let i = 0; i < s * 20; i++) R.simulate(0.05); };
    const o = {};
    o.players = R.GAME.players.join(',');
    o.tcs = S.buildings.filter(b => b.subtype === 'towncenter').map(b => b.team).sort().join(',');
    o.civs = R.GAME.players.map(t => R.teamOf(t).civ).join(',');
    o.ally = R.allied(1, 3) && !R.hostile(1, 3) && R.hostile(1, 2) && R.hostile(3, 4) && R.allied(2, 4);
    o.ais = R.AIS.filter(A => A.enabled).map(A => A.team).sort().join(',');
    // Visió compartida: la base de l'aliat es veu des del principi
    R.updateFog();
    const tc3 = S.buildings.find(b => b.team === 3 && b.subtype === 'towncenter');
    const tc2 = S.buildings.find(b => b.team === 2 && b.subtype === 'towncenter');
    o.allyVisible = tc3.group.visible && S.units.filter(u => u.team === 3).every(u => u.group.visible || u.garrisoned);
    o.enemyHidden = !S.units.filter(u => u.team === 2).some(u => u.group.visible);
    // Un cavaller nostre al costat dels aldeans de l'aliat: no els ataca (i el Centre aliat no li dispara)
    const k = R.createSoldierAt('knight', tc3.position.x + 6, tc3.position.z + 6, 1);
    const allyVills = S.units.filter(u => u.team === 3 && u.subtype === 'villager').length;
    run(20);
    o.friendlyFire = k.hp < k.maxHp || S.units.filter(u => u.team === 3 && u.subtype === 'villager').length < allyVills;
    o.noAttackAlly = (R.commandAttack([k], tc3), k.attackTarget !== tc3);
    // 8 minuts de partida: totes les IA fan economia
    run(460);
    o.vills = R.GAME.players.map(t => S.units.filter(u => u.team === t && u.subtype === 'villager').length).join(',');
    o.foes = R.AIS.filter(A => A.enabled).map(A => `${A.team}>${A.foe}`).join(',');
    o.over = S.over;
    // Desar i carregar
    const data = R.serializeGame();
    o.saved = Object.keys(data.teams).join(',') + ' ' + data.layout;
    R.GAME.players = [1, 2]; R.GAME.side = { 1: 1, 2: 2 };
    o.loaded = R.loadGame(data);
    o.after = R.GAME.players.join(',') + ' ' + R.GAME.layout + ' ' + R.GAME.players.map(t => R.teamOf(t).civ).join(',')
      + ' ' + S.buildings.filter(b => b.subtype === 'towncenter').length;
    return o;
  });
  log(JSON.stringify(r));
  assert(r.players === '1,2,3,4' && r.tcs.startsWith('1,2,3,4'), 'no hi ha quatre jugadors amb Centre');
  assert(r.civs.split(',')[2] === 'britons' && r.civs.split(',')[3] === 'mongols', 'no es respecten les civilitzacions triades');
  assert(r.ally, 'els equips no són correctes');
  assert(r.ais === '2,3,4', 'no hi ha IA per als altres tres jugadors');
  assert(r.allyVisible && r.enemyHidden, 'la visió no es comparteix només amb l\'aliat');
  assert(!r.friendlyFire && r.noAttackAlly, 'els aliats s\'ataquen');
  assert(r.vills.split(',').slice(1).every(v => +v >= 14), 'alguna IA no fa economia: ' + r.vills);
  assert(!r.over, 'la partida s\'ha acabat sola');
  assert(r.loaded && r.after.startsWith('1,2,3,4 2v2 franks,saracens,britons,mongols'), 'desar/carregar no conserva els jugadors: ' + r.after);
  await page.close();

  // ---------- Mapes amb quatre bases ----------
  for (const map of ['rivers', 'lakes', 'blackforest']) {
    page = await open({ seed: 32, map, layout: 'ffa4' });
    const m = await page.evaluate(() => {
      const R = window.RTS, S = R.state, N = R.NAV.N;
      const tcs = S.buildings.filter(b => b.subtype === 'towncenter');
      const cell = (p) => { const i = Math.floor(p.x + R.CONFIG.MAP_LIMIT), j = Math.floor(p.z + R.CONFIG.MAP_LIMIT); return [i, j]; };
      const labels = tcs.map(tc => { const v = S.units.find(u => u.team === tc.team && u.subtype === 'villager'); return R.NAV.label[Math.floor(v.position.z + R.CONFIG.MAP_LIMIT) * N + Math.floor(v.position.x + R.CONFIG.MAP_LIMIT)]; });
      const wet = tcs.filter(tc => R.waterCell(tc.position.x, tc.position.z)).length;
      const gold = tcs.map(tc => S.resourceNodes.filter(n => n.subtype === 'gold' && n.position.distanceTo(tc.position) < 30).length);
      return { n: tcs.length, sameRegion: new Set(labels).size === 1, wet, gold: gold.join(','), relics: S.relics.length };
    });
    log(map, JSON.stringify(m));
    assert(m.n === 4 && m.wet === 0, `${map}: bases que falten o a l'aigua`);
    assert(m.sameRegion, `${map}: alguna base no es pot arribar a peu`);
    assert(m.gold.split(',').every(g => +g >= 2), `${map}: alguna base no té el seu or`);
    await page.close();
  }

  // ---------- Tots contra tots: eliminació i victòria ----------
  page = await open({ seed: 33, layout: 'ffa3' });
  r = await page.evaluate(() => {
    const R = window.RTS, S = R.state;
    const run = (s) => { for (let i = 0; i < s * 20; i++) R.simulate(0.05); };
    const o = {};
    o.hostileAll = R.hostile(1, 2) && R.hostile(1, 3) && R.hostile(2, 3);
    const wipe = (t) => { for (const e of [...S.units, ...S.buildings].filter(e => e.team === t)) R.kill(e); };
    run(5);
    wipe(3);
    run(3);
    o.defeated3 = R.GAME.defeated.has(3);
    o.overAfter3 = S.over;
    o.ai3 = R.AIS.find(A => A.team === 3).enabled;
    o.ai2foe = R.AI.foe;
    wipe(2);
    run(3);
    o.over = S.over;
    o.title = document.getElementById('end-title').textContent;
    return o;
  });
  log(JSON.stringify(r));
  assert(r.hostileAll, 'en tots contra tots, algú és aliat');
  assert(r.defeated3 && !r.overAfter3 && !r.ai3, 'el jugador eliminat no s\'elimina bé o la partida s\'acaba abans d\'hora');
  assert(r.ai2foe === 1, 'la IA que queda no busca l\'altre rival');
  assert(r.over && r.title === 'VICTÒRIA', 'sense rivals no es guanya la partida');
};
