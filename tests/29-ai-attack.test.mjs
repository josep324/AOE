/* La IA no llança grups petits contra les torres: tria un objectiu que pot guanyar, i davant de relíquies o una
   Meravella rivals hi va amb un exèrcit de debò (no grups de 4 cada mig minut) */
export default async ({ open, assert, log }) => {
  const page = await open({ seed: 9, diff: 'hard' });
  const r = await page.evaluate(() => {
    const R = window.RTS, S = R.state, P = R.PLAYER.id, E = R.ENEMY.id, A = R.AI;
    R.FOG.enabled = false;
    R.completeTech(E, 'age1'); R.completeTech(E, 'age2');
    R.completeTech(P, 'age1'); R.completeTech(P, 'age2'); R.completeTech(P, 'guardtower'); R.completeTech(P, 'keep');
    const tc = R.townCenter.position;
    const towers = [[12, -14], [-14, 12], [16, 14]].map(([dx, dz]) => R.createBuilding('watchtower', tc.x + dx, tc.z + dz, true, P));
    // Un Quarter lluny de les torres
    const et = R.enemyTC.position, dir = et.clone().sub(tc).normalize();
    const far = tc.clone().addScaledVector(dir, 70);
    const bar = R.createBuilding('barracks', Math.round(far.x), Math.round(far.z), true, P);
    const C0 = R.aiContext(A);
    for (const b of S.buildings) if (b.team === P) A.seenBld.set(b.id, { b, t: C0.now });
    S.units.filter(u => u.team === E && u.isMilitary).forEach(u => R.kill(u));
    const mk = (n) => Array.from({ length: n }, (_, i) => R.createSoldierAt('manatarms', C0.homeRally.x + (i % 5) * 1.4, C0.homeRally.z + Math.floor(i / 5) * 1.4, E));
    const o = {};
    // 1) 8 homes d'armes: l'objectiu és el Quarter sense defensa, no el Centre envoltat de torres
    const g1 = mk(8);
    const t1 = R.aiObjective(A, C0, C0.home, g1);
    o.target1 = t1 && t1.subtype;
    o.defTC = +R.aiKnownDefense(A, tc, 20).toFixed(1);
    o.defBar = +R.aiKnownDefense(A, bar.position, 20).toFixed(1);
    g1.forEach(u => R.kill(u));
    towers.length; R.kill(bar); A.seenBld.delete(bar.id);
    // 2) Totes les relíquies del jugador: amb 6 soldats no hi va; amb 16, sí, contra el Monestir
    const mon = R.createBuilding('monastery', tc.x - 18, tc.z - 16, true, P);
    A.seenBld.set(mon.id, { b: mon, t: C0.now });
    mon.relics = S.relics.slice();
    S.relics.forEach(rl => { rl.holder = mon; });
    S.relicWin = { team: P, end: S.elapsed + 200 };
    A.army = null; A.nextAttackAt = 0; A.wasUrgent = false;
    const g2 = mk(6);
    for (let i = 0; i < 3 * 20; i++) R.simulate(0.05);
    o.smallArmy = !!A.army;
    g2.push(...mk(10));
    for (let i = 0; i < 3 * 20; i++) R.simulate(0.05);
    o.bigArmy = A.army ? A.army.units.length : 0;
    o.bigTarget = A.army && A.army.target && A.army.target.subtype;
    // 3) Sense urgència: un exèrcit que ha perdut dos terços davant les torres no rep reforços de 10 en 10
    //    (es perdien pel camí): es retira i s'ajunta amb els nous
    S.relicWin = null; mon.relics = []; S.relics.forEach(rl => { rl.holder = null; });
    S.units.filter(u => u.team === E && u.isMilitary).forEach(u => R.kill(u));
    for (let i = 0; i < 20; i++) R.simulate(0.05);
    const left = Array.from({ length: 4 }, (_, i) => R.createSoldierAt('manatarms', tc.x + 20 + i, tc.z + 20, E));
    left.forEach(u => { u.aiRole = 'army'; });
    A.army = { units: left, rally: C0.homeRally.clone(), phase: 'attack', t0: S.elapsed, target: R.townCenter, str0: 40 };
    A.urgent = false; A.wasUrgent = false;
    const home = mk(10);
    for (let i = 0; i < 3 * 20; i++) R.simulate(0.05);
    o.reinforced = home.filter(u => !u.dead && u.aiRole === 'army').length;
    o.retreated = !A.army || A.army.units !== left;
    return o;
  });
  log(JSON.stringify(r));
  assert(r.defTC > 12 && r.defBar < 3, 'la IA no veu la defensa de les torres');
  assert(r.target1 !== 'towncenter' && r.target1 !== 'watchtower', 'la IA envia un grup petit contra les torres');
  assert(!r.smallArmy, 'la IA ataca amb un grup de 6 per recuperar les relíquies');
  assert(r.reinforced === 0 && r.retreated, 'la IA envia reforços a un exèrcit que ja ha perdut (onades de 10)');
  assert(r.bigArmy >= 14 && r.bigTarget === 'monastery', 'la IA no hi va amb un exèrcit de debò contra el Monestir');
};
