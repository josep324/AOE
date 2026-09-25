/* Els quatre tipus de mapa: camí entre bases, relíquies escampades i recursos */
export default async ({ open, assert, log }) => {
  const page = await open({ start: false });
  for (const m of ['arabia', 'blackforest', 'lakes', 'rivers']) {
    const r = await page.evaluate((m) => {
      const R = window.RTS, S = R.state;
      R.resetWorld(); R.buildWorld(m, 77);
      const rel = S.relics.map(r => [r.position.x, r.position.z]);
      let minGap = Infinity, minBase = Infinity;
      for (let i = 0; i < rel.length; i++) {
        for (let j = i + 1; j < rel.length; j++) minGap = Math.min(minGap, Math.hypot(rel[i][0] - rel[j][0], rel[i][1] - rel[j][1]));
        for (const tc of [R.townCenter, R.enemyTC]) minBase = Math.min(minBase, Math.hypot(rel[i][0] - tc.position.x, rel[i][1] - tc.position.z));
      }
      const c = {}; for (const n of S.resourceNodes) c[n.subtype] = (c[n.subtype] || 0) + 1;
      const a = R.townCenter.position, b = R.enemyTC.position;
      const path = R.findPath(a.x + 10, a.z + 10, b.x - 10, b.z - 10);
      return { m, relics: rel.length, minGap: Math.round(minGap), minBase: Math.round(minBase), c, path: path ? path.length : 0 };
    }, m);
    log(JSON.stringify(r));
    assert(r.path > 0, `${m}: no hi ha camí entre les bases`);
    assert(r.relics === 5 && r.minGap >= 40 && r.minBase >= 50, `${m}: relíquies mal repartides`);
    assert(r.c.gold >= 8 && r.c.stone >= 4, `${m}: falten mines`);
    assert(r.c.tree > 300, `${m}: massa pocs arbres`);
    if (m === 'lakes' || m === 'rivers') assert(r.c.fish > 0, `${m}: no hi ha peixos`);
  }
};
