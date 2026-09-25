/* Enfrontaments bàsics (10 contra 10, sense micro) amb el resultat que toca a l'AoE II:
   arquers > llancers · escaramussadors > arquers · genets > arquers · llancers > genets */
export default async ({ open, assert, log }) => {
  const page = await open();
  const r = await page.evaluate(() => {
    const R = window.RTS, S = R.state, P = R.PLAYER.id, E = R.ENEMY.id;
    R.AI.enabled = false; R.FOG.enabled = false; R.updateFog();
    const run = (s) => { for (let i = 0; i < s * 60; i++) R.simulate(1 / 60); };
    // Camp de batalla net: fora arbres i mines al voltant de cada combat
    const clear = (x, z, r) => { for (const n of S.resourceNodes.slice()) if (Math.hypot(n.position.x - x, n.position.z - z) < r && !n.animal) R.depleteResource(n); };
    const fight = (a, b, n = 10, x = 0) => {
      clear(x + 3, 0, 26); run(3);
      const A = Array.from({ length: n }, (_, i) => R.createSoldierAt(a, x + (i % 5) * 1.5, -8 - Math.floor(i / 5) * 1.5, P));
      const B = Array.from({ length: n }, (_, i) => R.createSoldierAt(b, x + (i % 5) * 1.5, 8 + Math.floor(i / 5) * 1.5, E));
      R.commandAttackMove(A, B[0].position.clone()); R.commandAttackMove(B, A[0].position.clone());
      let t = 0;
      while (t < 90 && A.some(u => !u.dead) && B.some(u => !u.dead)) { run(1); t++; }
      const out = { a, b, left: [A.filter(u => !u.dead).length, B.filter(u => !u.dead).length], t };
      A.concat(B).forEach(u => { if (!u.dead) R.kill(u); }); run(2);
      return out;
    };
    R.completeTech(P, 'age1'); R.completeTech(E, 'age1');
    return [fight('archer', 'spearman', 10, -60), fight('archer', 'militia', 10, -20), fight('skirmisher', 'archer', 10, 20),
      fight('scout', 'archer', 10, 60), fight('archer', 'archer', 10, 100), fight('spearman', 'scout', 10, -100)];
  });
  for (const f of r) log(`${f.a} contra ${f.b}: ${f.left[0]}-${f.left[1]} (${f.t} s)`);
  const win = (i) => r[i].left[0] > r[i].left[1];
  assert(win(0), 'els arquers haurien de guanyar els llancers');
  assert(win(2), 'els escaramussadors haurien de guanyar els arquers');
  assert(win(3), 'els genets haurien de guanyar els arquers');
  assert(win(5), 'els llancers haurien de guanyar els genets');
};
