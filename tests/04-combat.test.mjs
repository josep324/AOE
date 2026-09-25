/* Combat: dos exèrcits es troben i lluiten; formacions i contraatacs */
export default async ({ open, assert, log }) => {
  const page = await open();
  const r = await page.evaluate(() => {
    const R = window.RTS, S = R.state, P = R.PLAYER.id, E = R.ENEMY.id;
    R.AI.enabled = false;
    R.FOG.enabled = false; R.updateFog();
    const run = (s) => { for (let i = 0; i < s * 60; i++) R.simulate(1 / 60); };
    const mk = (kind, n, x, z, t) => Array.from({ length: n }, (_, i) => R.createSoldierAt(kind, x + (i % 5) * 1.6, z + Math.floor(i / 5) * 1.6, t));
    const A = [...mk('spearman', 10, -10, -10, P), ...mk('archer', 5, -14, -14, P)];
    const B = mk('scout', 10, 12, 12, E);
    R.commandAttack(A.filter(u => u.subtype === 'spearman'), B[0]);
    run(40);
    const alive = (L) => L.filter(u => !u.dead && u.hp > 0).length;
    const slots = R.formationSlots ? R.formationSlots(A, new R.THREE.Vector3(0, 0, 0)).length : A.length;
    return { a: alive(A), b: alive(B), slots };
  });
  log(JSON.stringify(r));
  assert(r.b < 10, 'l\'enemic no ha rebut baixes');
  assert(r.a > r.b, 'els piquers haurien de guanyar la cavalleria lleugera');
};
