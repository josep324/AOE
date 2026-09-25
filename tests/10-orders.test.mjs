/* Ordres noves: patrullar, escortar, cua de granges al Molí i soldats inactius */
export default async ({ open, assert, log }) => {
  const page = await open();
  const r = await page.evaluate(() => {
    const R = window.RTS, S = R.state, P = R.PLAYER.id, E = R.ENEMY.id, V = R.THREE.Vector3;
    R.AI.enabled = false; R.FOG.enabled = false; R.updateFog();
    const run = (s) => { for (let i = 0; i < s * 60; i++) R.simulate(1 / 60); };
    const o = {};
    // Patrulla: va i ve entre dos punts
    const tc = R.townCenter.position;
    const a = new V(tc.x + 20, 0, tc.z - 5), b = new V(tc.x + 20, 0, tc.z + 25);
    const m = R.createSoldierAt('manatarms', a.x, a.z, P);
    R.commandPatrol([m], b);
    let nearA = 0, nearB = 0;
    for (let k = 0; k < 40; k++) { run(1); if (m.position.distanceTo(a) < 4) nearA++; if (m.position.distanceTo(b) < 4) nearB++; }
    o.patrol = [nearA, nearB, !!m.patrol];
    // Un enemic a la ruta: l'ataca
    const intruder = R.createSoldierAt('militia', tc.x + 20, tc.z + 10, E);
    intruder.stance = 'stand';
    run(25);
    o.patrolFight = intruder.dead || intruder.hp < intruder.maxHp;
    R.commandStop([m]);
    o.stopClears = !m.patrol;
    // Escorta: un soldat segueix un aldeà que es mou lluny
    const v = S.units.find(u => u.team === P && u.subtype === 'villager');
    const g = R.createSoldierAt('spearman', v.position.x + 3, v.position.z, P);
    R.commandFollow([g], v);
    R.commandMove([v], new V(tc.x + 40, 0, tc.z + 40));
    run(20);
    o.follow = [Math.round(g.position.distanceTo(v.position)), !!g.follow];
    // Cua de granges: es paguen ara i una granja esgotada es resembra sola
    R.PLAYER.res.wood = 1000;
    const mill = R.createBuilding('mill', tc.x - 16, tc.z + 14, true, P);
    const farm = R.createBuilding('farm', tc.x - 16, tc.z + 24, true, P);
    const f = S.units.filter(u => u.team === P && u.subtype === 'villager')[1];
    R.orderGather(f, S.resourceNodes.find(n => n.subtype === 'farm') || farm, null);
    const w0 = R.PLAYER.res.wood;
    o.queued = R.queueFarm(P, 2);
    o.woodPaid = w0 - R.PLAYER.res.wood;
    run(5);
    const node = S.resourceNodes.find(n => n.subtype === 'farm' && n.team === P);
    if (node) node.amount = 1;
    run(20);
    o.afterQueue = [R.PLAYER.farmQueue, S.buildings.filter(b2 => b2.subtype === 'farm' && b2.team === P).length + S.resourceNodes.filter(n => n.subtype === 'farm' && n.team === P).length, R.PLAYER.res.wood === w0 - o.woodPaid];
    // Soldats inactius
    R.createSoldierAt('militia', tc.x - 20, tc.z - 20, P);
    return o;
  });
  await page.evaluate(() => { window.RTS.state.paused = false; });
  const idleMil = await page.waitForFunction(() => Number(document.getElementById('idle-mil-count').textContent) || 0, null, { timeout: 15000 })
    .then(h => h.jsonValue()).catch(() => 0);
  log(JSON.stringify({ ...r, idleMil }));
  assert(r.patrol[0] > 0 && r.patrol[1] > 0 && r.patrol[2], 'la patrulla no va i ve');
  assert(r.patrolFight, 'la patrulla no ataca l\'intrús');
  assert(r.stopClears, 'Aturar no cancel·la la patrulla');
  assert(r.follow[0] < 9 && r.follow[1], 'l\'escorta no segueix l\'aldeà');
  assert(r.queued === 2 && r.woodPaid > 0, 'no s\'han pogut encuar granges');
  assert(r.afterQueue[0] === 1 && r.afterQueue[1] >= 1 && r.afterQueue[2], 'la granja no s\'ha resembrat de la cua sense pagar');
  assert(idleMil >= 1, 'no es compten els soldats inactius');
};
