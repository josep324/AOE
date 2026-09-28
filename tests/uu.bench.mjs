/* Equilibri de les unitats úniques: cada una contra totes les altres i contra unitats normals de Castells,
   amb el mateix valor en recursos (1200) a cada costat, cadascuna amb les bonificacions de la seva civilització.
   Resultat: part del valor que sobreviu (+ guanya el primer, − guanya el segon). node tests/run.mjs --bench uu */
export default async ({ open, log }) => {
  const page = await open();
  const r = await page.evaluate(() => {
    const R = window.RTS, S = R.state, P = R.PLAYER.id, E = R.ENEMY.id;
    R.AI.enabled = false; R.FOG.enabled = false; R.updateFog();
    const run = (s) => { for (let i = 0; i < s * 20; i++) R.simulate(0.05); };
    const clear = (x, z, r) => { for (const n of S.resourceNodes.slice()) if (Math.hypot(n.position.x - x, n.position.z - z) < r && !n.animal) R.depleteResource(n); };
    const U = R.CONFIG.UNITS, C = R.CIVS || {};
    const civOfUnit = (k) => U[k].unique || 'franks';
    const val = (k) => Object.values(U[k].cost).reduce((a, b) => a + b, 0);
    const BUDGET = 1200;
    let slot = 0;
    const fight = (a, b) => {
      const x = -120 + (slot % 8) * 32, z = -100 + Math.floor(slot / 8) * 40; slot++;
      clear(x, z, 24); run(1);
      R.setTeamCiv(R.PLAYER, civOfUnit(a)); R.setTeamCiv(R.ENEMY, civOfUnit(b));
      R.PLAYER.age = R.ENEMY.age = 2;
      const na = Math.round(BUDGET / val(a)), nb = Math.round(BUDGET / val(b));
      const A = Array.from({ length: na }, (_, i) => R.createSoldierAt(a, x - 5 + (i % 6) * 1.6, z - 9 - Math.floor(i / 6) * 1.6, P));
      const B = Array.from({ length: nb }, (_, i) => R.createSoldierAt(b, x - 5 + (i % 6) * 1.6, z + 9 + Math.floor(i / 6) * 1.6, E));
      R.commandAttackMove(A, new R.THREE.Vector3(x, 0, z + 12)); R.commandAttackMove(B, new R.THREE.Vector3(x, 0, z - 12));
      for (let t = 0; t < 120 && A.some(u => !u.dead) && B.some(u => !u.dead); t++) run(1);
      const left = (L, k) => L.filter(u => !u.dead).reduce((s, u) => s + val(k) * u.hp / u.maxHp, 0) / BUDGET;
      const score = left(A, a) - left(B, b);
      A.concat(B).forEach(u => { if (!u.dead) R.kill(u); }); run(1);
      return +score.toFixed(2);
    };
    const uniq = ['throwingaxe', 'mameluke', 'samurai', 'longbowman', 'cataphract', 'mangudai', 'chukonu', 'almogaver'];
    const generic = ['knight', 'crossbow', 'pikeman', 'longsword', 'eliteskirm', 'cavarcher', 'camel', 'lightcav'];
    const out = {};
    // (i unitats normals com a referència: sense micro, les de distància surten perjudicades totes)
    for (const a of uniq.concat(['crossbow', 'cavarcher', 'knight', 'longsword'])) {
      out[a] = {};
      for (const b of uniq.concat(generic)) if (b !== a) out[a][b] = fight(a, b);
    }
    return out;
  });
  const uniq = Object.keys(r).filter(k => !['crossbow', 'cavarcher', 'knight', 'longsword'].includes(k));
  for (const a of Object.keys(r)) {
    const vsU = uniq.filter(b => b !== a).map(b => r[a][b]), vsG = Object.entries(r[a]).filter(([b]) => !uniq.includes(b)).map(([, v]) => v);
    const avg = (L) => (L.reduce((s, v) => s + v, 0) / L.length).toFixed(2);
    log(`${a.padEnd(12)} contra úniques ${avg(vsU)} · contra normals ${avg(vsG)} · ${JSON.stringify(r[a])}`);
  }
};
