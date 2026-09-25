/* Partides reproduïbles: la mateixa llavor i les mateixes ordres donen exactament el mateix resultat
   (la IA inclosa). Base per ajustar la IA repetint partides i per a les repeticions. */
export default async ({ open, assert, log }) => {
  const play = async () => {
    const page = await open({ seed: 1234, diff: 'hard' });
    const out = await page.evaluate(() => {
      const R = window.RTS, S = R.state, P = R.PLAYER.id;
      const vs = S.units.filter(u => u.team === P && u.subtype === 'villager');
      const tree = S.resourceNodes.filter(n => n.subtype === 'tree').sort((a, b) => a.position.distanceTo(R.townCenter.position) - b.position.distanceTo(R.townCenter.position))[0];
      R.commandGather(vs, tree);
      for (let i = 0; i < 180 * 60; i++) R.simulate(1 / 60);
      // Empremta de l'estat: posicions, vida i recursos de tot
      let h = 0;
      const mix = (v) => { h = (Math.imul(h ^ Math.round(v * 1000), 2654435761) + 0x9e3779b9) | 0; };
      for (const u of S.units) { mix(u.id); mix(u.position.x); mix(u.position.z); mix(u.hp); }
      for (const b of S.buildings) { mix(b.id); mix(b.hp); mix(b.progress || 0); }
      for (const n of S.resourceNodes) mix(n.amount || 0);
      for (const T of [R.PLAYER, R.ENEMY]) for (const k of ['food', 'wood', 'gold', 'stone']) mix(T.res[k]);
      return { h, units: S.units.length, bld: S.buildings.length, enemyRes: Object.values(R.ENEMY.res).map(Math.round) };
    });
    await page.close();
    return out;
  };
  const a = await play(), b = await play();
  log(JSON.stringify(a)); log(JSON.stringify(b));
  assert(a.h === b.h, 'dues partides iguals han donat resultats diferents');
};
