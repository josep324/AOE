/* IA: en 10 minuts de joc fa economia, puja d'edat i ataca */
export default async ({ open, assert, log }) => {
  const page = await open({ seed: 5, diff: 'normal' });
  const r = await page.evaluate(() => {
    const R = window.RTS, S = R.state, E = R.ENEMY.id;
    R.townCenter.hp = R.townCenter.maxHp = 1e7;
    let maxNear = 0;
    for (let s = 0; s < 600; s++) {
      for (let i = 0; i < 20; i++) R.simulate(0.05);
      const near = S.units.filter(u => u.team === E && u.isMilitary && u.position.distanceTo(R.townCenter.position) < 45).length;
      maxNear = Math.max(maxNear, near);
    }
    return { age: R.ENEMY.age, vills: S.units.filter(u => u.team === E && u.subtype === 'villager').length,
      army: S.units.filter(u => u.team === E && u.isMilitary).length, blds: S.buildings.filter(b => b.team === E).length, maxNear };
  });
  log(JSON.stringify(r));
  assert(r.vills >= 12, 'la IA té massa pocs aldeans');
  assert(r.age >= 1, 'la IA no ha pujat a l\'Edat Feudal');
  assert(r.maxNear > 0, 'la IA no ha atacat');
};
