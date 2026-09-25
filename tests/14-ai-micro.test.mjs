/* Micro de la IA: els ballesters (Difícil) fan kiting davant dels homes d'armes i guanyen;
   sense micro, perden (com a l'AoE II: els tiradors sense control perden contra el cos a cos que carrega) */
export default async ({ open, assert, log }) => {
  const res = [];
  for (const micro of [0, 2]) {
    const page = await open({ seed: 3, diff: 'hard' });
    const r = await page.evaluate((micro) => {
      const R = window.RTS, S = R.state, P = R.PLAYER.id, E = R.ENEMY.id;
      R.AI.diff = { ...R.AI.diff, micro, raids: false, attackAt: 1e9 };
      R.FOG.enabled = false; R.updateFog();
      for (const n of S.resourceNodes.slice()) if (Math.hypot(n.position.x, n.position.z) < 30 && !n.animal) R.depleteResource(n);
      for (let i = 0; i < 60; i++) R.simulate(1 / 60);
      R.completeTech(E, 'age1'); R.completeTech(E, 'age2');
      const ar = Array.from({ length: 8 }, (_, i) => R.createSoldierAt('crossbow', -4 + (i % 4) * 1.5, -6 - Math.floor(i / 4) * 1.5, E));
      const mi = Array.from({ length: 6 }, (_, i) => R.createSoldierAt('manatarms', -4 + i * 1.5, 8, P));
      R.commandAttack(ar, mi[0]); R.commandAttack(mi, ar[0]);
      for (let s = 0; s < 40 * 20; s++) R.simulate(0.05);
      return { archers: ar.filter(u => !u.dead).length, maa: mi.filter(u => !u.dead).length };
    }, micro);
    res.push({ micro, ...r });
    await page.close();
  }
  log(JSON.stringify(res));
  assert(res[1].archers > res[0].archers + 2, 'el kiting no ajuda els ballesters');
  assert(res[1].maa < res[0].maa, 'amb micro els ballesters haurien de matar més homes d\'armes');
};
