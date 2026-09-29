/* Partides de diversos jugadors només amb IA (difícil): 2 contra 2, 1 contra 2 i tots contra tots.
   Comprova que s'acaben (o qui va guanyant) i quant triguen. node tests/run.mjs --bench teams */
export default async ({ open, log }) => {
  const MIN = +(process.env.TEAMS_MIN || 40);
  const games = [
    { layout: '2v2', map: 'arabia', seed: 201 },
    { layout: '1v2', map: 'arabia', seed: 202 },
    { layout: 'ffa4', map: 'arabia', seed: 203 },
    { layout: '2v2', map: 'rivers', seed: 204 },
  ];
  for (const g of games) {
    const page = await open({ seed: g.seed, map: g.map, layout: g.layout, diff: 'hard', civ: 'franks', enemyCiv: 'britons', slots: { 3: 'chinese', 4: 'catalans' } });
    const t0 = Date.now();
    const r = await page.evaluate((MIN) => {
      const R = window.RTS, S = R.state;
      R.enableAIFor(R.PLAYER.id, R.DIFFICULTY.hard);
      R.FOG.enabled = false; R.updateFog();
      const out = [];
      for (let s = 0; s < MIN * 60 && !S.over; s++) {
        for (let i = 0; i < 20; i++) R.simulate(0.05);
        if (s % 300 === 299) out.push(`${Math.round(S.elapsed / 60)}m ` + R.GAME.players.map(t => `${t}:${S.units.filter(u => u.team === t && u.subtype === 'villager').length}v/${S.units.filter(u => u.team === t && u.isMilitary).length}m${R.GAME.defeated.has(t) ? '†' : ''}`).join(' ') + ` u=${S.units.length}`);
      }
      return { t: Math.round(S.elapsed), over: S.over, title: document.getElementById('end-title').textContent, defeated: [...R.GAME.defeated], log: out };
    }, MIN);
    log(`${g.layout} ${g.map}: ${r.over ? r.title : 'sense acabar'} en ${r.t}s (eliminats ${r.defeated.join(',') || '-'}) · ${Math.round((Date.now() - t0) / 1000)}s reals`);
    for (const l of r.log) log('   ' + l);
    await page.close();
  }
};
