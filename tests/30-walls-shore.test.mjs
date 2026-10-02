/* Muralles com a l'AoE II: trams d'una casella (2×2 m) que segueixen el terreny. A la riba, ni les muralles ni
   els edificis aixequen el fons de l'aigua (abans en sortia un tros de terra dins del llac) */
export default async ({ open, assert, log }) => {
  const page = await open({ map: 'lakes', seed: 3 });
  const r = await page.evaluate(() => {
    const R = window.RTS, T = R.TERRAIN, P = R.PLAYER.id;
    R.AI.enabled = false;
    const L = R.CONFIG.MAP_LIMIT - 8;
    const snapshot = () => Float32Array.from(T.h);
    // Llocs de riba: terra on es pot construir amb aigua fonda a menys de 3 m
    const spots = [];
    for (let x = -L; x <= L && spots.length < 40; x += 2) for (let z = -L; z <= L && spots.length < 40; z += 2) {
      const X = R.wallSnap(x), Z = R.wallSnap(z);
      if (!R.canPlace('stonewall', X, Z)) continue;
      let wet = false;
      for (const [dx, dz] of [[3, 0], [-3, 0], [0, 3], [0, -3]]) if (R.waterCell(X + dx, Z + dz) === 1) wet = true;
      if (wet) spots.push([X, Z]);
    }
    const o = { spots: spots.length, wallChanged: 0, raisedWater: 0, houses: 0 };
    const h0 = snapshot();
    for (const [x, z] of spots.slice(0, 20)) R.createBuilding('stonewall', x, z, true, P);
    const h1 = snapshot();
    for (let k = 0; k < h0.length; k++) if (Math.abs(h1[k] - h0[k]) > 1e-6) o.wallChanged++;
    // Una casa a la riba: aplana la seva planta, però el fons de l'aigua no puja
    for (const [x, z] of spots.slice(20)) {
      let done = false;
      for (let d = 1; d <= 5 && !done; d++) for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
        const hx = Math.round(x + dx * d), hz = Math.round(z + dz * d);
        if (!R.canPlace('house', hx, hz)) continue;
        // (només si la vora de 4 m de l'aplanat arriba a l'aigua)
        let wet = false; for (const [ex, ez] of [[5, 0], [-5, 0], [0, 5], [0, -5]]) if (R.waterCell(hx + ex, hz + ez) === 1) wet = true;
        if (!wet) continue;
        R.createBuilding('house', hx, hz, true, P); o.houses++; done = true; break;
      }
    }
    const h2 = snapshot();
    // (només on es dibuixa l'aigua: a tocar d'una cel·la d'aigua; la terra plana lluny de l'aigua també és a 0,02 m)
    for (let k = 0; k < h1.length; k++) if (h1[k] < 0.07 && h2[k] >= 0.07) {
      const x = T.x0 + (k % T.n) * T.hs, z = T.x0 + Math.floor(k / T.n) * T.hs;
      if (R.waterCell(x, z) || R.waterCell(x + 1, z) || R.waterCell(x - 1, z) || R.waterCell(x, z + 1) || R.waterCell(x, z - 1)) o.raisedWater++;
    }   // (fons que surt per sobre del pla de l'aigua)
    const w = R.state.buildings.find(b => b.subtype === 'stonewall');
    o.size = w ? [w.footprint.hw * 2, w.footprint.hd * 2] : null;
    return o;
  });
  log(JSON.stringify(r));
  assert(r.spots >= 10, 'no s\'han trobat prou llocs de riba');
  assert(r.size && r.size[0] === 2 && r.size[1] === 2, 'el tram de muralla no fa una casella (2×2 m)');
  assert(r.wallChanged === 0, 'les muralles modifiquen el terreny');
  assert(r.houses >= 5, 'no s\'han pogut fer cases a la riba');
  assert(r.raisedWater === 0, 'un edifici a la riba aixeca el fons de l\'aigua');
};
