/* Cap unitat encallada: 8 minuts d'IA contra IA a Llacs (on les ribes i els llacs posen a prova els camins).
   Una unitat que vol caminar i en 15 s no es mou compta com a encallada. */
export default async ({ open, assert, log }) => {
  for (const [seed, map] of [[7, 'lakes']]) {
  const page = await open({ seed, map, diff: 'hard' });
  const r = await page.evaluate(() => {
    const R = window.RTS, S = R.state, P = R.PLAYER.id, E = R.ENEMY.id;
    R.enableAIFor(P, R.DIFFICULTY.hard);
    const last = new Map(), still = new Map(), rep = [];
    for (let s = 1; s <= 480; s++) {
      for (let i = 0; i < 20; i++) R.simulate(0.05);
      if (s % 5) continue;
      for (const u of S.units) {
        if (u.garrisoned || u.naval || u.dead) continue;
        const p = last.get(u);
        const moved = p ? Math.hypot(u.position.x - p[0], u.position.z - p[1]) : 99;
        last.set(u, [u.position.x, u.position.z]);
        const busy = u.state === 'MOVING' || (u.state === 'ATTACKING' && !u.inRange) || (u.state === 'GATHERING' && u.gatherNode && !u.inRange && false);
        if (moved < 0.5 && busy) still.set(u, (still.get(u) || 0) + 5); else still.set(u, 0);
        if (still.get(u) === 15) {
          const t = u.target, g = u.gatherNode, a = u.attackTarget;
          rep.push({ t: s, kind: u.subtype, team: u.team, state: u.state, pos: [u.position.x, u.position.z].map(Math.round), nearWater: R.waterCell(u.position.x + 1.5, u.position.z) || R.waterCell(u.position.x - 1.5, u.position.z) || R.waterCell(u.position.x, u.position.z + 1.5) || R.waterCell(u.position.x, u.position.z - 1.5),
            target: t && [t.x, t.z].map(Math.round), targetWater: t && R.waterCell(t.x, t.z), path: u.path && u.path.length, gather: g && g.subtype, attack: a && (a.subtype || a.kind), role: u.aiRole, am: !!u.attackMove });
        }
      }
    }
    return rep;
  });
  log(seed, map, r.length, JSON.stringify(r.slice(0, 5)));
  assert(r.length === 0, `${r.length} unitats encallades a ${map}`);
  await page.close();
  }
};
