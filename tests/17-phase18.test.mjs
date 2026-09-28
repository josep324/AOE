/* Fase 18: canoner, petard, torre de bombarda, millores de vaixell i tecnologies noves */
export default async ({ open, assert, log }) => {
  const page = await open({ map: 'lakes' });
  const r = await page.evaluate(() => {
    const R = window.RTS, S = R.state, P = R.PLAYER.id, E = R.ENEMY.id;
    R.AI.enabled = false; R.FOG.enabled = false; R.updateFog();
    const run = (s) => { for (let i = 0; i < s * 60; i++) R.simulate(1 / 60); };
    const o = {};
    R.PLAYER.age = 3; for (const k of ['food', 'wood', 'gold', 'stone']) R.PLAYER.res[k] = 50000;
    // Arena buida lluny dels Centres
    const cx = 0, cz = 0;
    for (const n of S.resourceNodes.slice()) if (Math.hypot(n.position.x - cx, n.position.z - cz) < 30) R.depleteResource(n);
    run(0.1);
    // Canoner: requereix Química; no el millora Plomes; +10 contra infanteria
    o.hcBlocked = !!R.itemBlockReason('handcannon', P);
    R.completeTech(P, 'chemistry');
    o.hcFree = R.itemBlockReason('handcannon', P);
    const hc = R.createSoldierAt('handcannon', cx - 6, cz, P);
    const atk0 = hc.attack, rng0 = hc.range;
    R.completeTech(P, 'fletching');
    o.hcUpg = [hc.attack - atk0, hc.range - rng0];
    const mil = R.createSoldierAt('militia', cx + 6, cz, E), sc = R.createSoldierAt('scout', cx + 6, cz + 4, E);
    o.hcDmg = [R.hitDamage(hc, mil, 1), R.hitDamage(hc, sc, 1)];
    R.kill(mil); R.kill(sc);
    const tgt = R.createSoldierAt('manatarms', cx + 8, cz, E);
    tgt.hp = tgt.maxHp = 2000; tgt.stance = 'stand';
    R.commandAttack([hc], tgt); run(10);
    o.hcShot = 2000 - tgt.hp;
    R.kill(hc); R.kill(tgt); run(0.5);
    // Petard: esclata contra un edifici (+500) i mor
    const wall = R.createBuilding('house', cx + 10, cz + 12, true, E);
    const pet = R.createSoldierAt('petard', cx + 4, cz + 12, P);
    const whp = wall.hp;
    R.commandAttack([pet], wall); run(8);
    o.petard = [pet.dead, whp - (wall.dead ? 0 : wall.hp)];
    // Torre de bombarda: bloquejada sense la tecnologia; dispara bales
    o.bbtBlocked = !!R.buildBlockReason('bombardtower', P);
    R.completeTech(P, 'bombardtowertech');
    o.bbtFree = R.buildBlockReason('bombardtower', P);
    const bbt = R.createBuilding('bombardtower', cx - 12, cz - 12, true, P);
    const foe = R.createSoldierAt('knight', cx - 12, cz - 2, E);
    foe.hp = foe.maxHp = 3000; foe.stance = 'stand';
    run(12);
    o.bbt = [3000 - foe.hp, !!bbt.model.userData.cannon];
    R.kill(foe);
    // Tecnologies
    const c0 = R.costFor('militia', P).food; R.completeTech(P, 'supplies'); o.supplies = c0 - R.costFor('militia', P).food;
    const ms = R.createSoldierAt('militia', cx - 20, cz + 20, P), pa = ms.armor[1];
    R.completeTech(P, 'gambesons'); o.gambesons = ms.armor[1] - pa;
    const v = R.createVillager(cx - 22, cz + 20, P), vb = v.vsBuilding; R.completeTech(P, 'sappers'); o.sappers = v.vsBuilding - vb;
    const s0 = R.sellRate(P); R.completeTech(P, 'guilds'); o.guilds = [s0, R.sellRate(P)];
    const los0 = bbt.los; R.completeTech(P, 'townwatch'); o.townwatch = bbt.los - los0;
    const castle = R.createBuilding('castle', cx + 30, cz - 30, true, P), chp = castle.maxHp;
    R.completeTech(P, 'hoardings'); o.hoardings = +(castle.maxHp / chp).toFixed(2);
    const ca = R.createSoldierAt('cavarcher', cx - 24, cz + 24, P), caA = ca.armor.slice();
    R.completeTech(P, 'parthian'); o.parthian = [ca.armor[0] - caA[0], ca.armor[1] - caA[1], ca.bonusSpear];
    // Lleva: la caserna entrena més de pressa
    const bar = R.createBuilding('barracks', cx + 30, cz + 30, true, P);
    R.completeTech(P, 'conscription');
    R.queueUnit(bar, 'militia'); run(11);
    o.conscription = S.units.filter(u => u.team === P && u.unitKind === 'militia').length;
    // Millores de vaixell: el brulot passa a brulot ràpid (model i estadístiques)
    const spot = R.findDockSpot(R.townCenter.position, 140);
    const dock = R.createBuilding('dock', spot.x, spot.z, true, P);
    const fsh = R.spawnUnit(dock, 'fireship');
    const fsp = fsh.speed;
    R.completeTech(P, 'up_fastfireship');
    o.ship = [fsh.subtype, fsh.speed > fsp, !!fsh.model];
    R.completeTech(P, 'shipwright');
    o.shipwright = R.costFor('galley', P).wood;
    return o;
  });
  log(JSON.stringify(r));
  assert(r.hcBlocked && !r.hcFree, 'el canoner no depèn de la Química');
  assert(r.hcUpg[0] === 0 && r.hcUpg[1] === 0, 'les Plomes milloren el canoner');
  assert(r.hcDmg[0] >= r.hcDmg[1] + 9, 'el canoner no té bonificació contra infanteria');
  assert(r.hcShot > 20, 'el canoner no fa mal');
  assert(r.petard[0] && r.petard[1] > 400, 'el petard no fa prou mal als edificis');
  assert(r.bbtBlocked && !r.bbtFree, 'la torre de bombarda no depèn de la tecnologia');
  assert(r.bbt[0] > 40 && r.bbt[1], 'la torre de bombarda no dispara');
  assert(r.supplies === 15 && r.gambesons === 1 && r.sappers === 15, 'Subministraments, Gambesons o Sapadors no fan efecte');
  assert(r.guilds[1] > r.guilds[0], 'els Gremis no milloren el mercat');
  assert(r.townwatch === 4 && r.hoardings > 1.2, 'Guàrdia urbana o Cadafals no fan efecte');
  assert(r.parthian[0] === 1 && r.parthian[1] === 2 && r.parthian[2] === 4, 'la Tàctica part no fa efecte');
  assert(r.conscription >= 2, 'la Lleva no accelera l\'entrenament');
  assert(r.ship[0] === 'fastfireship' && r.ship[1] && r.ship[2], 'la millora del brulot no funciona');
  assert(r.shipwright === 72, 'el Mestre d\'aixa no abarateix els vaixells');
};
