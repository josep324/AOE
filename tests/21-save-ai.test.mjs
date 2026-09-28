/* Desar i carregar a mitja partida IA contra IA: les IA recorden el que sabien (el que han vist, l'estratègia,
   l'exèrcit, la ruta de l'explorador) i la partida carregada continua de manera semblant a l'original. */
export default async ({ open, assert, log }) => {
  const page = await open({ seed: 17, diff: 'hard', civ: 'franks', enemyCiv: 'japanese' });
  const r = await page.evaluate(() => {
    const R = window.RTS, S = R.state, P = R.PLAYER.id, E = R.ENEMY.id;
    R.enableAIFor(P, R.DIFFICULTY.hard);
    const run = (s) => { for (let i = 0; i < s * 20; i++) R.simulate(0.05); };
    const mem = () => R.AIS.filter(A => A.enabled).map(A => ({
      team: A.team, strategy: A.strategy, seen: [...A.seen.values()].filter(s => !s.u.dead).length, seenBld: [...A.seenBld.values()].filter(s => !s.b.dead && !s.b.depleted).length,
      army: A.army ? A.army.units.filter(u => !u.dead).length : 0,
      scout: A.scoutPlan ? A.scoutPlan.i : -1, attacks: A.attackCount, saving: !!A.saving, reserve: !!A.reserve,
    }));
    const stats = () => [P, E].map(t => ({ age: R.teamOf(t).age, v: S.units.filter(u => u.team === t && u.subtype === 'villager').length,
      m: S.units.filter(u => u.team === t && u.isMilitary).length, b: S.buildings.filter(b => b.team === t).length }));
    run(9 * 60);
    const data = JSON.parse(JSON.stringify(R.serializeGame()));
    const memBefore = mem();
    run(3 * 60);
    const cont = stats();
    R.loadGame(data);
    const memAfter = mem();
    run(3 * 60);
    const loaded = stats();
    return { memBefore, memAfter, cont, loaded, over: S.over };
  });
  log(JSON.stringify(r));
  assert(r.memAfter.length === r.memBefore.length, 'no s\'han recuperat totes les IA');
  assert(JSON.stringify(r.memAfter) === JSON.stringify(r.memBefore), 'la IA ha perdut la memòria en carregar');
  // La continuació no és idèntica (hi ha estat transitori que no es desa), però ha de ser semblant
  for (let t = 0; t < 2; t++) {
    const a = r.cont[t], b = r.loaded[t];
    assert(Math.abs(a.age - b.age) <= 1 && Math.abs(a.v - b.v) <= Math.max(6, a.v * 0.2), `equip ${t + 1}: la partida carregada divergeix massa (${JSON.stringify(a)} / ${JSON.stringify(b)})`);
  }
};
