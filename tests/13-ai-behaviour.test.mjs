/* Comportaments de la IA com a l'AoE II:
   - un explorador sol que molesta els aldeans: els aldeans s'hi enfronten
   - un atac fort a la base: campana (els aldeans es refugien) i defensa
   - si el rival fa molta cavalleria, la IA fa llancers
   - l'explorador inicial va a veure la base rival */
export default async ({ open, assert, log }) => {
  const page = await open({ seed: 7, diff: 'hard' });
  const r = await page.evaluate(() => {
    const R = window.RTS, S = R.state, P = R.PLAYER.id, E = R.ENEMY.id, V = R.THREE.Vector3;
    const run = (s) => { for (let i = 0; i < s * 20; i++) R.simulate(0.05); };
    const o = {};
    R.townCenter.hp = R.townCenter.maxHp = 1e9;
    // L'explorador enemic arriba a prop de la nostra base
    let scoutNear = 0;
    for (let s = 0; s < 150; s++) { run(1); const sc = S.units.find(u => u.team === E && u.subtype === 'scout'); if (sc && sc.position.distanceTo(R.townCenter.position) < 45) scoutNear++; }
    o.scoutVisited = scoutNear > 0;
    run(210);                                                          // 6 min
    const etc = R.enemyTC.position;
    // 1) Un explorador nostre ataca els aldeans enemics
    const vill = S.units.find(u => u.team === E && u.subtype === 'villager' && !u.garrisoned && u.position.distanceTo(etc) < 40);
    const raider = R.createSoldierAt('scout', vill.position.x + 3, vill.position.z, P);
    R.commandAttack([raider], vill);
    run(4);
    o.villFight = S.units.filter(u => u.team === E && u.subtype === 'villager' && u.aiRole === 'fight').length;
    run(20);
    o.raiderDead = raider.dead;
    // 2) Un atac fort: 14 cavallers a la base enemiga → campana
    const knights = Array.from({ length: 14 }, (_, i) => R.createSoldierAt('knight', etc.x + 14 + (i % 4) * 1.6, etc.z + 14 + Math.floor(i / 4) * 1.6, P));
    R.commandAttackMove(knights, etc.clone());
    run(6);
    const tcs = S.buildings.filter(b => b.team === E && (b.subtype === 'towncenter' || b.subtype === 'watchtower' || b.subtype === 'castle'));
    o.garrisoned = tcs.reduce((s, b) => s + (b.garrison ? b.garrison.filter(u => u.subtype === 'villager').length : 0), 0)
      + S.units.filter(u => u.team === E && u.subtype === 'villager' && u.garrisonTarget).length;
    knights.forEach(k => { if (!k.dead) R.kill(k); });
    run(20);
    o.backToWork = S.units.filter(u => u.team === E && u.subtype === 'villager' && u.garrisoned).length;
    // 3) Contrarestar: la IA veu molta cavalleria nostra
    const cav = Array.from({ length: 12 }, (_, i) => R.createSoldierAt('knight', etc.x + 15 + (i % 4) * 1.6, etc.z + 15 + Math.floor(i / 4) * 1.6, P));
    cav.forEach(k => { k.stance = 'stand'; k.hp = k.maxHp = 1e6; });
    run(4);
    const A = R.AI;
    o.foeComp = A.foeComp && A.foeComp.comp;
    // (se'n van de la base: la IA se'n recorda)
    cav.forEach((k, i) => k.position.set(R.townCenter.position.x + 10 + (i % 4) * 1.6, 0, R.townCenter.position.z + 10 + Math.floor(i / 4) * 1.6));
    const before = S.units.filter(u => u.team === E && u.spearLine).length;
    run(120);
    o.spears = [before, S.units.filter(u => u.team === E && u.spearLine).length];
    o.strategy = A.strategy; o.age = R.ENEMY.age; o.res = Object.values(R.ENEMY.res).map(Math.round);
    o.queues = S.buildings.filter(b => b.team === E && b.trainQueue && b.trainQueue.length).map(b => b.subtype + ':' + b.trainQueue.map(q => q.kind).join('+'));
    o.army = S.units.filter(u => u.team === E && u.isMilitary).map(u => u.unitKind).join(',');
    return o;
  });
  log(JSON.stringify(r));
  assert(r.scoutVisited, 'l\'explorador de la IA no ha vingut a veure la nostra base');
  assert(r.villFight >= 2, 'els aldeans no s\'enfronten a l\'explorador');
  assert(r.garrisoned >= 5, 'la IA no toca la campana davant d\'un atac fort');
  assert(r.backToWork === 0, 'els aldeans no tornen a la feina després de l\'atac');
  assert(r.foeComp && r.foeComp.cavalry >= 8, 'la IA no ha vist la cavalleria');
  assert(r.spears[1] >= r.spears[0] + 4, 'la IA no fa llancers contra la cavalleria');
};
