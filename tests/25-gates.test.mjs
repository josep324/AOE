/* Portes i muralles:
   - la porta fa 4 cel·les i s'obre sola per a les unitats pròpies i les aliades, però no per a les enemigues
   - bloquejada, no hi passa ningú; desbloquejada, torna a deixar passar
   - traçar una muralla per dins d'un bosc només fa (i paga) els trams dels forats */
export default async ({ open, assert, log }) => {
  const page = await open({ seed: 12, layout: '2v2' });
  const r = await page.evaluate(() => {
    const R = window.RTS, S = R.state, P = R.PLAYER.id, V = R.THREE.Vector3;
    for (const A of R.AIS) A.enabled = false;
    R.FOG.enabled = false; R.updateFog();
    const run = (s) => { for (let i = 0; i < s * 20; i++) R.simulate(0.05); };
    const o = {};
    // Un lloc obert lluny de les bases
    let cx = 0, cz = 0;
    for (let k = 0; k < 4000; k++) {
      cx = Math.round(Math.sin(k * 7.1) * 60); cz = Math.round(Math.cos(k * 3.3) * 60);
      if (S.resourceNodes.every(n => Math.hypot(n.position.x - cx, n.position.z - cz) > 22) && S.buildings.every(b => Math.hypot(b.position.x - cx, b.position.z - cz) > 30) && R.canPlace('house', cx, cz)) break;
    }
    // Recinte tancat de muralla amb una porta a la cara nord (z = cz + 6)
    const h = 6;
    for (let i = -h; i < h; i++) for (const [x, z] of [[cx + i, cz - h], [cx + i, cz + h], [cx - h, cz + i], [cx + h, cz + i]]) R.createBuilding('stonewall', x + 0.5, z + 0.5, true, P);
    R.createBuilding('stonewall', cx + h + 0.5, cz + h + 0.5, true, P);
    const snap = R.snapGateToWall(new V(cx, 0, cz + h + 0.5));
    const walls = S.buildings.filter(b => b.isWall && Math.abs(b.position.z - snap.z) < 0.2 && Math.abs(b.position.x - snap.x) < 2);
    walls.forEach(w => R.kill(w));
    const gate = R.createBuilding('gate', snap.x, snap.z, true, P, snap.rot);
    run(1);
    o.gateWidth = gate.footprint.hw * 2;
    const inside = (u) => Math.abs(u.position.x - cx) < h - 0.3 && Math.abs(u.position.z - cz) < h - 0.3;
    const trip = (team, n = 12) => {
      const us = Array.from({ length: n }, (_, i) => R.createSoldierAt('militia', cx - 3 + (i % 4) * 1.4, cz + h + 5 + Math.floor(i / 4) * 1.3, team));
      R.commandMove(us, new V(cx, 0, cz - 2)); run(20);
      const k = us.filter(inside).length; us.forEach(u => R.kill(u)); run(1);
      return k;
    };
    o.own = trip(P);
    o.ally = trip(3);
    o.enemy = trip(2);
    R.setGateLocked(gate, true);
    o.ownLocked = trip(P);
    R.setGateLocked(gate, false);
    o.ownUnlocked = trip(P);
    // Muralla arrossegada per un bosc amb un forat: només es fan els trams que tanquen el forat
    const fz = cz + 30, fx0 = cx - 12;
    const trees = [];
    for (let x = fx0; x <= fx0 + 24; x += 2.2) if (Math.abs(x - (fx0 + 12)) > 2.6) for (const dz of [-2.2, 0, 2.2]) trees.push([x, fz + dz]);
    for (const [x, z] of trees) R.createTree(x, z, 1.1).dense = true;
    R.rebuildNav();
    run(1);
    const v = S.units.find(u => u.team === P && u.subtype === 'villager');
    R.setSelection([v]);
    R.startPlacement('palisade');
    R.placing.start = [fx0 + 0.5, fz + 0.5];
    const wood0 = R.PLAYER.res.wood;
    R.updateWallPlacement(new V(fx0 + 24.5, 0, fz + 0.5));
    o.line = 25;
    o.cells = R.placing.cells.length;
    o.closedCells = R.placing.cells.filter(([x, z]) => R.wallCellClosed(x, z)).length;
    o.gapCovered = R.placing.cells.some(([x]) => Math.abs(x - (fx0 + 12.5)) < 1);
    return o;
  });
  log(JSON.stringify(r));
  assert(r.gateWidth === 4, 'la porta no fa 4 cel·les');
  assert(r.own >= 10, 'les unitats pròpies no passen per la porta');
  assert(r.ally >= 10, 'les unitats aliades no passen per la porta');
  assert(r.enemy === 0, 'les unitats enemigues passen per la porta');
  assert(r.ownLocked === 0, 'la porta bloquejada deixa passar');
  assert(r.ownUnlocked >= 10, 'la porta desbloquejada no deixa passar');
  assert(r.cells > 0 && r.cells <= 8 && r.closedCells === 0 && r.gapCovered, 'la muralla pel bosc fa trams on no cal');
};
