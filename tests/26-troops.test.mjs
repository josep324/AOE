/* Grups grans: marxen en formació (tropa) i, quan uns quants troben l'enemic, hi va tot el grup */
export default async ({ open, assert, log }) => {
  const page = await open({ seed: 21 });
  const r = await page.evaluate(() => {
    const R = window.RTS, S = R.state, P = R.PLAYER.id, E = R.ENEMY.id, V = R.THREE.Vector3;
    for (const A of R.AIS) A.enabled = false;
    R.FOG.enabled = false; R.updateFog();
    const run = (s) => { for (let i = 0; i < s * 20; i++) R.simulate(0.05); };
    const tc = R.townCenter.position;
    const kinds = ['militia','militia','spearman','archer','archer','knight','scout','militia','spearman','archer','skirmisher','militia','knight','spearman','archer','militia','militia','spearman','archer','knight'];
    const us = kinds.map((k, i) => R.createSoldierAt(k, tc.x + 12 + (i % 7) * 2.3 + (i * 0.37 % 1), tc.z + 12 + Math.floor(i / 7) * 3.1, P));
    const goal = new V(tc.x + 70, 0, tc.z + 60);
    R.commandMove(us, goal);
    const o = { troops: R.TROOPS.length, spread: [] };
    const spread = () => { const c = new V(); us.forEach(u => c.add(u.position)); c.divideScalar(us.length); return Math.round(Math.max(...us.map(u => u.position.distanceTo(c))) * 10) / 10; };
    // Marxa seguida (sense parar i arrencar): a cada pas real (1/60 s), cap unitat no s'ha de quedar
    // aturada (sense destí) mentre el guia avança
    run(8);
    let stops = 0, samples = 0, lead = R.TROOPS[0] && R.TROOPS[0].pos.clone();
    for (let k = 0; k < 600; k++) {
      R.simulate(1 / 60);
      const T = R.TROOPS[0];
      const lv = T && lead ? T.pos.distanceTo(lead) : 0;
      if (lv > 0.02) us.forEach(u => { samples++; if (!u.target || !u.path || !u.path.length) stops++; });
      lead = T && T.pos.clone();
    }
    o.stopFrac = samples ? Math.round(stops / samples * 1000) / 10 : -1;
    for (let t = 0; t < 6; t++) { run(5); o.spread.push(spread()); }
    o.arrived = us.filter(u => u.position.distanceTo(goal) < 12).length;
    // Combat: 3 enemics apareixen a prop del grup quiet; tot el grup hi va
    const c = new V(); us.forEach(u => c.add(u.position)); c.divideScalar(us.length);
    const foes = [0,1,2].map(i => R.createSoldierAt('militia', c.x + 13, c.z + i * 1.5, E));
    run(3);
    o.engaged = us.filter(u => u.state === 'ATTACKING').length;
    // Rendir-se: des del menú, amb confirmació (dues pulsacions)
    document.getElementById('menu-btn').click();
    const rb = document.getElementById('menu-resign');
    rb.click(); o.afterOne = S.over;
    rb.click();
    o.resigned = S.over && document.getElementById('end-title').textContent === 'DERROTA' && /rendit/.test(document.getElementById('end-text').textContent);
    return o;
  });
  log(JSON.stringify(r));
  assert(r.troops === 1, 'el grup no marxa com a tropa');
  assert(Math.max(...r.spread) < 12, 'el grup es desfà pel camí');
  assert(r.stopFrac >= 0 && r.stopFrac < 3, 'les unitats avancen a batzegades (paren i arrenquen)');
  assert(r.arrived === 20, 'no arriben totes les unitats');
  assert(!r.afterOne && r.resigned, 'el botó de rendir-se no acaba la partida (o no demana confirmació)');
  assert(r.engaged >= 16, 'no hi va tot el grup quan troben l\'enemic');
};
