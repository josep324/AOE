/* Desar i carregar: mateixa partida després de carregar; codi xifrat amb contrasenya */
export default async ({ open, assert, log }) => {
  const page = await open({ map: 'lakes' });
  const r = await page.evaluate(async () => {
    const R = window.RTS, S = R.state;
    for (let i = 0; i < 600; i++) R.simulate(1 / 60);
    const sig = () => ({ units: S.units.length, bld: S.buildings.length, nodes: S.resourceNodes.length, relics: S.relics.length,
      food: Math.round(R.PLAYER.res.food), t: Math.round(S.elapsed), map: R.WORLD.type });
    const before = sig();
    const data = R.serializeGame();
    R.loadGame(JSON.parse(JSON.stringify(data)));
    const after = sig();
    const code = await R.exportGameCode('secret');
    const wrong = await R.importGameCode(code, 'nope').then(() => 'ok').catch(e => 'error');
    const right = await R.importGameCode(code, 'secret').then(d => d.ents.length).catch(() => -1);
    return { before, after, wrong, right };
  });
  log(JSON.stringify(r));
  assert(JSON.stringify(r.before) === JSON.stringify(r.after), 'la partida carregada no coincideix amb la desada');
  assert(r.wrong === 'error' && r.right > 0, 'el codi xifrat no funciona');
};
