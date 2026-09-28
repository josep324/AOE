/* Simulacions llargues a la cerca d'errors: IA contra IA a cada tipus de mapa, comprovant cada 5 s
   que no passa res impossible. node tests/run.mjs --bench soak */
export default async ({ open, log }) => {
  const runs = [
    [31, 'arabia', 'britons', 'byzantines'], [32, 'blackforest', 'mongols', 'chinese'],
    [33, 'lakes', 'catalans', 'saracens'], [34, 'rivers', 'japanese', 'franks'],
  ];
  const MIN = +(process.env.SOAK_MIN || 15);
  for (const [seed, map, civ, enemyCiv] of runs) {
    const page = await open({ seed, map, civ, enemyCiv, diff: 'hard' });
    const r = await page.evaluate((MIN) => {
      const R = window.RTS, S = R.state, P = R.PLAYER.id, E = R.ENEMY.id;
      R.enableAIFor(P, R.DIFFICULTY.hard);
      const bugs = {}, first = {};
      const bug = (k, info) => { bugs[k] = (bugs[k] || 0) + 1; if (!first[k]) first[k] = { t: Math.round(S.elapsed), ...info }; };
      const L = R.CONFIG.MAP_LIMIT;
      const inside = new Map(), still = new Map(), lastPos = new Map(), found = new Map();
      for (let s = 5; s <= MIN * 60 && !S.over; s += 5) {
        for (let i = 0; i < 100; i++) R.simulate(0.05);
        for (const T of [R.PLAYER, R.ENEMY]) for (const [k, v] of Object.entries(T.res)) if (!(v >= 0)) bug('recurs negatiu o NaN', { team: T === R.PLAYER ? 1 : 2, k, v });
        for (const t of [P, E]) if (R.popUsed(t) > R.popCap(t) + 5 && R.popCap(t) < 200) bug('població per sobre del límit', { team: t, used: R.popUsed(t), cap: R.popCap(t) });
        for (const u of S.units) {
          if (u.dead || u.garrisoned) continue;
          const x = u.position.x, z = u.position.z;
          if (!Number.isFinite(x) || !Number.isFinite(z) || !Number.isFinite(u.position.y)) { bug('posició NaN', { kind: u.subtype }); continue; }
          if (Math.abs(x) > L + 0.5 || Math.abs(z) > L + 0.5) bug('fora del mapa', { kind: u.subtype, p: [x, z].map(Math.round) });
          if (!u.naval && R.waterCell(x, z) === 1) bug('unitat de terra a l\'aigua fonda', { kind: u.subtype, p: [x, z].map(Math.round) });
          if (u.naval && R.waterCell(x, z) !== 1) bug('vaixell a terra', { kind: u.subtype, p: [x, z].map(Math.round) });
          if (!u.naval && Math.abs(u.position.y - R.groundY(x, z)) > 0.05) bug('unitat que no toca a terra', { kind: u.subtype, state: u.state, dy: +(u.position.y - R.groundY(x, z)).toFixed(2), p: [x, z].map(Math.round) });
          // Dins d'un edifici (no porta pròpia) durant més de 10 s
          const inB = S.buildings.some(b => !b.dead && b.footprint && !(b.def && (b.def.walkable || (b.def.gate && b.team === u.team)))
            && Math.abs(x - b.position.x) < b.footprint.hw - 0.2 && Math.abs(z - b.position.z) < b.footprint.hd - 0.2);
          inside.set(u, inB ? (inside.get(u) || 0) + 5 : 0);
          if (inside.get(u) === 10) bug('unitat dins d\'un edifici', { kind: u.subtype, state: u.state, p: [x, z].map(Math.round) });
          // Encallada: vol moure's i no es mou en 20 s
          const p0 = lastPos.get(u); lastPos.set(u, [x, z]);
          const moved = p0 ? Math.hypot(x - p0[0], z - p0[1]) : 99;
          const busy = u.state === 'MOVING' || (u.state === 'ATTACKING' && !u.inRange);
          still.set(u, moved < 0.5 && busy ? (still.get(u) || 0) + 5 : 0);
          if (still.get(u) === 20) bug('unitat encallada', { kind: u.subtype, team: u.team, state: u.state, p: [x, z].map(Math.round), target: u.target && [u.target.x, u.target.z].map(Math.round) });
        }
        // Fonaments abandonats més de 2 minuts
        for (const b of S.buildings) {
          if (!b.underConstruction || b.dead || b.isWall) { found.delete(b); continue; }
          const builders = S.units.some(u => u.team === b.team && (u.buildTarget === b || u.orderQueue.some(o => o.building === b)));
          found.set(b, builders ? 0 : (found.get(b) || 0) + 5);
          if (found.get(b) === 120) bug('fonament abandonat', { kind: b.subtype, team: b.team, progress: +b.progress.toFixed(2) });
        }
        // Recursos que suren o s'enfonsen
        if (s % 60 === 0) for (const n of S.resourceNodes) {
          if (n.depleted || n.mobile || n.animal || n.subtype === 'fish' || n.subtype === 'deepfish' || n.subtype === 'farm') continue;
          const g = R.groundY(n.position.x, n.position.z), y = n.group.position.y;
          if (Math.abs(y - g) > 0.12) bug('recurs que sura o s\'enfonsa', { kind: n.subtype, dy: +(y - g).toFixed(2) });
        }
      }
      const TT = (t) => { const T = R.teamOf(t); return `${T.civ} edat${T.age} v${S.units.filter(u => u.team === t && u.subtype === 'villager').length} m${S.units.filter(u => u.team === t && u.isMilitary).length}`; };
      return { t: Math.round(S.elapsed), over: S.over, state: `${TT(P)} | ${TT(E)}`, bugs, first };
    }, MIN);
    log(`${map} ${civ}-${enemyCiv}: ${r.t}s${r.over ? ' ACABADA' : ''} · ${r.state}`);
    log('   errors: ' + (Object.keys(r.bugs).length ? JSON.stringify(r.bugs) : 'cap'));
    for (const [k, v] of Object.entries(r.first)) log(`   · ${k}: ${JSON.stringify(v)}`);
    await page.close();
  }
};
