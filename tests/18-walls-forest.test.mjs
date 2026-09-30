/* Bosc dens i muralles: ningú no s'escola entre els troncs ni per les escletxes entre muralla i bosc,
   ni travessa una muralla empès pels companys. Vista prèvia de construcció i arbre tecnològic. */
export default async ({ open, assert, log }) => {
  const page = await open({ map: 'blackforest', seed: 11 });
  const r = await page.evaluate(() => {
    const R = window.RTS, S = R.state, P = R.PLAYER.id, V = R.THREE.Vector3;
    R.AI.enabled = false; R.FOG.enabled = false; R.updateFog();
    const run = (s) => { for (let i = 0; i < s * 20; i++) R.simulate(0.05); };
    const trees = S.resourceNodes.filter(n => n.subtype === 'tree');
    const tn = (x, z, r) => trees.filter(t => !t.depleted && Math.hypot(t.position.x - x, t.position.z - z) < r).length;
    const o = { closures: [] };
    // 1) Tancar una zona amb muralla aprofitant el bosc (només on la vista prèvia deixa construir)
    let tries = 0;
    for (const t of trees) {
      if (o.closures.length >= 3 || tries > 80) break;
      if (tn(t.position.x, t.position.z, 6) < 12) continue;
      tries++;
      let sx = 0, sz = 0;
      for (const q of trees) { const dx = q.position.x - t.position.x, dz = q.position.z - t.position.z; if (dx * dx + dz * dz < 64) { sx += dx; sz += dz; } }
      const l = Math.hypot(sx, sz) || 1, ox = -sx / l, oz = -sz / l;
      const cx = Math.round(t.position.x + ox * 6), cz = Math.round(t.position.z + oz * 6);
      if (tn(cx, cz, 3.5) > 0 || Math.hypot(cx - R.townCenter.position.x, cz - R.townCenter.position.z) < 25) continue;
      if (o.closures.some(c => Math.hypot(c.at[0] - cx, c.at[1] - cz) < 20)) continue;
      // (sense mines a la vora: una mina rodona trenca la muralla i deixa escletxes que no són del bosc)
      if (S.resourceNodes.some(n => (n.subtype === 'gold' || n.subtype === 'stone') && Math.max(Math.abs(n.position.x - cx), Math.abs(n.position.z - cz)) < 11)) continue;
      const h = 7, placed = new Set();
      for (let i = -h; i <= h; i++) for (const [x, z] of [[cx + i, cz - h], [cx + i, cz + h], [cx - h, cz + i], [cx + h, cz + i]]) {
        const X = x + 0.5, Z = z + 0.5, key = X + ',' + Z;
        if (placed.has(key) || !R.canPlace('stonewall', X, Z)) continue;
        placed.add(key); R.createBuilding('stonewall', X, Z, true, P);
      }
      const us = [];
      for (let i = 0; i < 18; i++) { const x = cx + 0.5 - 3 + (i % 5) * 1.4, z = cz + 0.5 - 2 + Math.floor(i / 5) * 1.3; if (tn(x, z, 2) === 0) us.push(R.createSoldierAt(i % 3 ? 'militia' : 'knight', x, z, P)); }
      const inside = (v) => Math.max(Math.abs(v.position.x - cx - 0.5), Math.abs(v.position.z - cz - 0.5)) < h + 0.2;
      for (const [gx, gz] of [[ox, oz], [-ox, -oz], [oz, -ox], [-oz, ox]]) { R.commandMove(us, new V(cx + gx * 30, 0, cz + gz * 30)); run(12); }
      o.closures.push({ at: [cx, cz], walls: placed.size, units: us.length, out: us.filter(v => !inside(v)).length });
      us.forEach(v => R.kill(v));
    }
    // 2) Un grup gran que empeny contra una muralla tancada no la travessa
    let cx = 0, cz = 0;
    for (let k = 0; k < 3000; k++) { cx = Math.round(Math.sin(k * 7.1) * 70); cz = Math.round(Math.cos(k * 3.3) * 70); if (tn(cx, cz, 16) === 0 && R.canPlace('house', cx, cz)) break; }
    const h = 7;
    for (let i = -h; i <= h; i++) for (const [x, z] of [[cx + i, cz - h], [cx + i, cz + h], [cx - h, cz + i], [cx + h, cz + i]]) R.createBuilding('stonewall', x + 0.5, z + 0.5, true, P);
    const crowd = [];
    for (let i = 0; i < 40; i++) crowd.push(R.createSoldierAt(i % 3 ? 'militia' : 'knight', cx - 4 + (i % 8) + 0.5, cz - 3 + Math.floor(i / 8) * 1.4, P));
    R.commandMove(crowd, new V(cx + 25, 0, cz + 2)); run(15);
    R.commandMove(crowd, new V(cx - 25, 0, cz - 2)); run(15);
    o.crowdOut = crowd.filter(v => Math.max(Math.abs(v.position.x - cx - 0.5), Math.abs(v.position.z - cz - 0.5)) > h).length;
    // 3) Vista prèvia: no es pot construir sobre una relíquia
    const rel = S.relics[0];
    o.relic = R.canPlace('house', Math.round(rel.position.x), Math.round(rel.position.z));
    // 4) Arbre tecnològic
    R.setTeamCiv(R.PLAYER, 'japanese');
    o.japCamel = R.itemBlockReason('camel', P);
    o.japHussar = R.itemBlockReason('up_hussar', P);
    R.setTeamCiv(R.PLAYER, 'saracens');
    R.PLAYER.age = 2;
    o.sarCamel = R.itemBlockReason('camel', P);
    return o;
  });
  log(JSON.stringify(r));
  assert(r.closures.length >= 2, 'no s\'han pogut provar prou tancaments amb bosc');
  for (const c of r.closures) assert(c.out === 0, `${c.out} unitats s'escapen d'una zona tancada amb muralla i bosc a ${c.at}`);
  assert(r.crowdOut === 0, `${r.crowdOut} unitats travessen la muralla empeses pels companys`);
  assert(r.relic === false, 'es pot construir a sobre d\'una relíquia');
  assert(/arbre/.test(r.japCamel) && /arbre/.test(r.japHussar), 'els Japonesos tenen camells o Hússars');
  assert(!r.sarCamel || !/arbre/.test(r.sarCamel), 'els Sarraïns no poden fer camells');
};
