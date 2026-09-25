/* Dues IA l'una contra l'altra (la del jugador i la de l'enemic): les dues fan economia,
   pugen d'edat i s'ataquen. Serveix per ajustar la IA sense jugar-hi. */
export default async ({ open, assert, log }) => {
  const page = await open({ seed: 9, diff: 'normal' });
  const r = await page.evaluate(() => {
    const R = window.RTS, S = R.state, P = R.PLAYER.id, E = R.ENEMY.id;
    R.enableAIFor(P, R.DIFFICULTY.normal);
    const deaths = { [P]: 0, [E]: 0 };
    const seen = new Set();
    for (let s = 0; s < 720; s++) {
      for (let i = 0; i < 20; i++) R.simulate(0.05);
      for (const u of S.units) seen.add(u);
      for (const u of seen) if (u.dead && !u.counted) { u.counted = true; deaths[u.team] = (deaths[u.team] || 0) + 1; }
    }
    const info = (t) => ({ vills: S.units.filter(u => u.team === t && u.subtype === 'villager').length,
      army: S.units.filter(u => u.team === t && u.isMilitary).length, blds: S.buildings.filter(b => b.team === t).length });
    return { ages: [R.PLAYER.age, R.ENEMY.age], p: info(P), e: info(E), deaths, over: S.over };
  });
  log(JSON.stringify(r));
  assert(r.ages[0] >= 1 && r.ages[1] >= 1, 'alguna de les dues IA no ha pujat a l\'Edat Feudal');
  assert(r.p.vills >= 12 && r.e.vills >= 12, 'alguna IA té massa pocs aldeans');
  assert(r.deaths[1] + r.deaths[2] > 0, 'les IA no han lluitat');
};
