/* Banc de proves de la IA (només mesura): 25 minuts de la IA sola contra un jugador que no fa res.
   node tests/run.mjs --bench ai */
export default async ({ open, log }) => {
  for (const diff of ['normal', 'hard']) {
    const page = await open({ seed: 5, diff });
    const r = await page.evaluate(() => {
      const R = window.RTS, S = R.state, E = R.ENEMY.id;
      R.townCenter.hp = R.townCenter.maxHp = 1e9;
      for (const b of S.buildings) if (b.team === 1) b.hp = b.maxHp = 1e9;
      const out = { ages: {}, t: [] };
      let idleVillSec = 0, tcIdleSec = 0, floatMax = 0;
      for (let s = 1; s <= 1500; s++) {
        for (let i = 0; i < 20; i++) R.simulate(0.05);
        const vs = S.units.filter(u => u.team === E && u.subtype === 'villager');
        idleVillSec += vs.filter(u => u.state === 'IDLE').length;
        const tc = S.buildings.find(b => b.team === E && b.subtype === 'towncenter');
        if (tc && !tc.trainQueue.length) tcIdleSec++;
        const res = R.ENEMY.res; floatMax = Math.max(floatMax, res.food + res.wood + res.gold + res.stone);
        if (R.ENEMY.age > 0 && !out.ages[R.ENEMY.age]) out.ages[R.ENEMY.age] = s;
        if (s % 300 === 0) out.t.push({ min: s / 60, vills: vs.length, army: S.units.filter(u => u.team === E && u.isMilitary).length,
          blds: S.buildings.filter(b => b.team === E).length, res: Object.values(res).map(Math.round), waves: R.AI.waveCount });
      }
      return { ...out, idleVillMin: Math.round(idleVillSec / 60), tcIdleMin: +(tcIdleSec / 60).toFixed(1), floatMax: Math.round(floatMax),
        milBlds: S.buildings.filter(b => b.team === E && ['barracks', 'archeryrange', 'stable', 'siegeworkshop', 'castle'].includes(b.subtype)).length };
    });
    log(diff, JSON.stringify(r));
    await page.close();
  }
};
