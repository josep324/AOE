/* Tecnologies noves i punteria dels arquers */
export default async ({ open, assert, log }) => {
  const page = await open();
  const r = await page.evaluate(() => {
    const R = window.RTS, S = R.state, P = R.PLAYER.id, E = R.ENEMY.id, V = R.THREE.Vector3;
    R.AI.enabled = false; R.FOG.enabled = false; R.updateFog();
    const run = (s) => { for (let i = 0; i < s * 60; i++) R.simulate(1 / 60); };
    const o = {};
    // Punteria: arquers contra genets que es mouen, sense i amb Balística
    const volley = () => {
      const tgt = R.createSoldierAt('scout', 30, 0, E);
      tgt.hp = tgt.maxHp = 100000; tgt.stance = 'stand';
      const archers = Array.from({ length: 8 }, (_, i) => R.createSoldierAt('archer', 20 + (i % 4), -12 + Math.floor(i / 4), P));
      R.setStance(archers, 'stand');
      let dealt = 0;
      for (let k = 0; k < 12; k++) {
        R.commandMove([tgt], new V(30, 0, k % 2 ? 12 : -12));   // corre amunt i avall
        R.commandAttack(archers, tgt);
        const h = tgt.hp; run(2); dealt += h - tgt.hp;
      }
      archers.forEach(a => R.kill(a)); R.kill(tgt); run(1);
      return Math.round(dealt);
    };
    // Unitats que carreguen contra els arquers: les fletxes les toquen
    const ar = Array.from({ length: 6 }, (_, i) => R.createSoldierAt('archer', -40 + i * 1.5, 0, P));
    const en = Array.from({ length: 4 }, (_, i) => R.createSoldierAt('manatarms', -40 + i * 1.5, 16, E));
    R.commandAttack(en, ar[0]);
    const chp0 = en.reduce((s, u) => s + u.hp, 0);
    run(3);
    o.charge = Math.round(chp0 - en.reduce((s, u) => s + Math.max(0, u.hp), 0));
    ar.concat(en).forEach(u => R.kill(u)); run(1);
    o.noBallistics = volley();
    R.completeTech(P, 'ballistics');
    o.ballistics = volley();
    // Anell del polze
    const a = R.createSoldierAt('archer', -30, 30, P);
    const reload0 = a.reload, acc0 = a.accuracy;
    R.completeTech(P, 'thumbring');
    o.thumb = [acc0, a.accuracy, +(reload0 / a.reload).toFixed(2)];
    // Llinatges i Ramaderia
    const k = R.createSoldierAt('knight', -34, 30, P);
    const hp0 = k.maxHp, sp0 = k.speed;
    R.completeTech(P, 'bloodlines'); R.completeTech(P, 'husbandry');
    o.cav = [k.maxHp - hp0, +(k.speed / sp0).toFixed(2)];
    // Escuders
    const inf = R.createSoldierAt('spearman', -38, 30, P);
    const isp = inf.speed; R.completeTech(P, 'squires');
    o.squires = +(inf.speed / isp).toFixed(2);
    // Muralla fortificada
    const w = R.createBuilding('stonewall', -40.5, 40.5, true, P);
    const whp = w.maxHp; R.completeTech(P, 'fortifiedwall');
    const w2 = R.createBuilding('stonewall', -41.5, 40.5, true, P);
    o.wall = [w.maxHp / whp, w2.maxHp / whp].map(x => +x.toFixed(2));
    // Heretgia: la unitat convertida mor
    R.completeTech(P, 'heresy');
    const victim = R.createSoldierAt('militia', -44, 30, P);
    R.convertEntity(victim, E);
    o.heresy = [victim.dead, victim.team];
    return o;
  });
  log(JSON.stringify(r));
  assert(r.ballistics > r.noBallistics + 40, 'la Balística no millora la punteria contra objectius en moviment');
  assert(r.charge > 10, 'les fletxes no toquen les unitats que carreguen');
  assert(r.thumb[0] < 1 && r.thumb[1] === 1 && r.thumb[2] > 1.1, 'l\'Anell del polze no fa efecte');
  assert(r.cav[0] === 20 && r.cav[1] > 1.05, 'Llinatges o Ramaderia no fan efecte');
  assert(r.squires > 1.05, 'Escuders no fa efecte');
  assert(r.wall[0] > 1.5 && r.wall[1] > 1.5, 'la Muralla fortificada no fa efecte');
  assert(r.heresy[0] === true && r.heresy[1] === 1, 'Heretgia no fa efecte');
};
