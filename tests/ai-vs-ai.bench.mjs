/* IA contra IA durant 25 minuts: quantes incursions, atacs i retirades, qui guanya.
   node tests/run.mjs --bench vs */
export default async ({ open, log }) => {
  for (const [seed, civ, enemyCiv] of [[11, 'franks', 'saracens'], [12, 'japanese', 'franks']]) {
    const page = await open({ seed, diff: 'hard', civ, enemyCiv });
    const r = await page.evaluate(() => {
      const R = window.RTS, S = R.state, P = R.PLAYER.id, E = R.ENEMY.id;
      const AP = R.enableAIFor(P, R.DIFFICULTY.hard); R.aiReset(AP, R.DIFFICULTY.hard);
      const stats = { [P]: { raids: 0, attacks: 0, retreats: 0, villLost: 0, milLost: 0 }, [E]: { raids: 0, attacks: 0, retreats: 0, villLost: 0, milLost: 0 } };
      const prev = new Map();
      const seen = new Set();
      const t = [];
      for (let s = 1; s <= 1500 && !S.over; s++) {
        for (let i = 0; i < 20; i++) R.simulate(0.05);
        for (const A of R.AIS) {
          const p = prev.get(A) || {};
          if (A.raid && !p.raid) stats[A.team].raids++;
          if (A.army && A.army.phase === 'attack' && !(p.army && p.phase === 'attack')) stats[A.team].attacks++;
          if (p.army && !A.army && p.phase === 'attack' && A.nextAttackAt > S.elapsed + 40) stats[A.team].retreats++;
          prev.set(A, { raid: !!A.raid, army: !!A.army, phase: A.army && A.army.phase });
        }
        for (const u of S.units) seen.add(u);
        for (const u of seen) if (u.dead && !u.__c) { u.__c = 1; if (u.subtype === 'villager') stats[u.team].villLost++; else if (u.isMilitary) stats[u.team].milLost++; }
        if (s % 300 === 0) t.push(`${s / 60}min ` + [P, E].map(T => { const TT = R.teamOf(T); return `${TT.civ} age${TT.age} v${S.units.filter(u => u.team === T && u.subtype === 'villager').length} a${S.units.filter(u => u.team === T && u.isMilitary).length} tc${S.buildings.filter(b => b.team === T && b.subtype === 'towncenter').length}`; }).join(' | '));
      }
      return { t, stats, over: S.over, time: Math.round(S.elapsed), strategies: R.AIS.map(A => A.strategy) };
    });
    log(`${civ} contra ${enemyCiv}: ${JSON.stringify(r.stats)} final ${r.time}s ${r.over ? 'ACABADA' : ''} estratègies ${r.strategies}`);
    for (const l of r.t) log('  ' + l);
    await page.close();
  }
};
