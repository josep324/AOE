/* Equilibri entre civilitzacions: torneig IA contra IA (difícil, Aràbia, 30 min) entre totes les parelles,
   dues partides per parella (canviant de costat i de llavor). Si la partida no s'acaba, guanya qui té clarament
   més valor en unitats i edificis. Es pot repartir en processos: SHARD=0/4 node tests/run.mjs --bench balance
   Els resultats es desen (una línia JSON per partida) a BALANCE_OUT o a balance-results.jsonl. */
import { appendFileSync } from 'node:fs';
export default async ({ open, log }) => {
  const civs = ['franks', 'saracens', 'japanese', 'britons', 'byzantines', 'mongols', 'chinese', 'catalans'];
  const games = [];
  for (let i = 0; i < civs.length; i++) for (let j = i + 1; j < civs.length; j++) {
    games.push([civs[i], civs[j], 100 + games.length * 2]);
    games.push([civs[j], civs[i], 101 + games.length * 2]);
  }
  const [k, n] = (process.env.SHARD || '0/1').split('/').map(Number);
  const MIN = +(process.env.BALANCE_MIN || 30);
  const out = process.env.BALANCE_OUT || 'balance-results.jsonl';
  for (let g = k; g < games.length; g += n) {
    const [civ, enemyCiv, seed] = games[g];
    const page = await open({ seed, civ, enemyCiv, diff: 'hard', map: 'arabia' });
    const r = await page.evaluate((MIN) => {
      const R = window.RTS, S = R.state, P = R.PLAYER.id, E = R.ENEMY.id;
      R.enableAIFor(P, R.DIFFICULTY.hard);
      const value = (c) => Object.values(c || {}).reduce((a, b) => a + b, 0);
      const worth = (t) => S.units.filter(u => u.team === t && !u.dead).reduce((s, u) => s + value(R.CONFIG.UNITS[u.unitKind].cost), 0)
        + S.buildings.filter(b => b.team === t && !b.dead && !b.underConstruction && !b.isWall).reduce((s, b) => s + value((R.CONFIG.BUILDINGS[b.subtype] || {}).cost) * b.hp / b.maxHp, 0);
      const ages = { [P]: [], [E]: [] };
      for (let s = 0; s < MIN * 60 && !S.over; s++) {
        for (let i = 0; i < 20; i++) R.simulate(0.05);
        for (const t of [P, E]) if (R.teamOf(t).age > ages[t].length) ages[t].push(Math.round(S.elapsed));
      }
      const alive = (t) => S.units.some(u => u.team === t) || S.buildings.some(b => b.team === t && !b.underConstruction);
      const res = (t) => ({ civ: R.teamOf(t).civ, worth: Math.round(worth(t)), v: S.units.filter(u => u.team === t && u.subtype === 'villager').length,
        army: S.units.filter(u => u.team === t && u.isMilitary).length, ages: ages[t], resigned: !!(R.AIS.find(a => a.team === t) || {}).resigned, alive: alive(t) });
      return { t: Math.round(S.elapsed), over: S.over, a: res(P), b: res(E) };
    }, MIN);
    let winner = null;
    if (r.over || !r.a.alive || !r.b.alive || r.a.resigned || r.b.resigned) winner = (!r.a.alive || r.a.resigned) ? r.b.civ : r.a.civ;
    else if (r.a.worth > r.b.worth * 1.15) winner = r.a.civ;
    else if (r.b.worth > r.a.worth * 1.15) winner = r.b.civ;
    const line = { game: g, seed, ...r, winner, decided: r.over ? 'victòria' : winner ? 'valor' : 'empat' };
    appendFileSync(out, JSON.stringify(line) + '\n');
    log(`${civ} contra ${enemyCiv}: ${winner || 'empat'} (${line.decided}, ${r.t}s, valor ${r.a.worth}/${r.b.worth})`);
    await page.close();
  }
};
