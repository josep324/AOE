/* Bosc Negre: el bosc és una paret. Per a punts de l'interior del bosc, una unitat a cada banda (a terreny
   obert) rep l'ordre d'anar a l'altra: ha de fer la volta pels camins. Cap unitat no pot entrar ben endins
   de la zona de bosc que defineix el generador del mapa (WORLD.forestAt). */
export default async ({ open, assert, log }) => {
  const res = [];
  for (const seed of [11, 33]) {
    const page = await open({ map: 'blackforest', seed });
    const r = await page.evaluate(() => {
      const R = window.RTS, S = R.state, P = R.PLAYER.id, V = R.THREE.Vector3, F = R.WORLD.forestAt;
      R.AI.enabled = false;
      const run = (s, f) => { for (let i = 0; i < s * 20; i++) { R.simulate(0.05); if (f) f(); } };
      const trees = S.resourceNodes.filter(n => n.subtype === 'tree');
      const tn = (x, z, r) => {
        let c = 0;
        for (const t of trees) if (!t.depleted && Math.abs(t.position.x - x) < r && Math.abs(t.position.z - z) < r && Math.hypot(t.position.x - x, t.position.z - z) < r) c++;
        return c;
      };
      // Ben endins del bosc: el punt i tot el seu voltant (2,5 m) són zona de bosc
      const deep = (x, z) => {
        if (!F(x, z)) return false;
        for (let a = 0; a < 8; a++) if (!F(x + Math.cos(a * Math.PI / 4) * 2.5, z + Math.sin(a * Math.PI / 4) * 2.5)) return false;
        return true;
      };
      const L = R.CONFIG.MAP_LIMIT - 12;
      let sd = 5; const rnd = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
      const cases = [];
      for (let k = 0; k < 4000 && cases.length < 16; k++) {
        const t = trees[Math.floor(rnd() * trees.length)], cx = t.position.x, cz = t.position.z;
        if (Math.abs(cx) > L || Math.abs(cz) > L || !deep(cx, cz)) continue;
        // Dues bandes obertes, en línia recta a través del punt
        for (let a = 0; a < 6; a++) {
          const ang = rnd() * Math.PI * 2, dx = Math.cos(ang), dz = Math.sin(ang);
          let A = null, B = null;
          for (let d = 5; d < 30 && !(A && B); d += 1) {
            if (!A && !F(cx - dx * d, cz - dz * d) && tn(cx - dx * d, cz - dz * d, 3) === 0) A = [cx - dx * (d + 2), cz - dz * (d + 2)];
            if (!B && !F(cx + dx * d, cz + dz * d) && tn(cx + dx * d, cz + dz * d, 3) === 0) B = [cx + dx * (d + 2), cz + dz * (d + 2)];
          }
          if (!A || !B || !R.canPlace('house', Math.round(A[0]), Math.round(A[1])) || !R.canPlace('house', Math.round(B[0]), Math.round(B[1]))) continue;
          cases.push({ c: [cx, cz], A, B });
          break;
        }
      }
      const us = cases.map(c => { const u = R.createSoldierAt('militia', c.A[0], c.A[1], P); R.commandMove([u], new V(c.B[0], 0, c.B[1])); return u; });
      const inside = new Set();
      run(45, () => us.forEach((u, i) => { if (deep(u.position.x, u.position.z)) inside.add(i); }));
      return { trees: trees.length, links: S.obstacles.filter(o => o.link === 'tree').length, cases: cases.length, inside: inside.size };
    });
    res.push(r);
    await page.close();
  }
  log(JSON.stringify(res));
  for (const r of res) {
    assert(r.cases >= 8, 'no s\'han trobat prou punts de bosc per provar');
    assert(r.inside === 0, `${r.inside} de ${r.cases} unitats entren al Bosc Negre pel mig`);
  }
};
