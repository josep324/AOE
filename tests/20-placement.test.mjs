/* Construir no ha de ser gairebé impossible: a tots els mapes, al voltant del Centre (entre 9 i 40 m),
   la majoria de llocs han de ser vàlids per a una casa i una caserna (sense comptar els que ocupen
   els recursos de sortida). Va passar que a Llacs i Rius tot el terreny pla semblava «sota l'aigua». */
export default async ({ open, assert, log }) => {
  for (const map of ['arabia', 'blackforest', 'lakes', 'rivers']) {
    const page = await open({ map, seed: 21 });
    const r = await page.evaluate(() => {
      const R = window.RTS, B = R.CONFIG.BUILDINGS, T = R.townCenter.position, out = {};
      for (const type of ['house', 'barracks']) {
        const [sw, sd] = B[type].size;
        let ok = 0, n = 0;
        for (let dz = -40; dz <= 40; dz++) for (let dx = -40; dx <= 40; dx++) {
          const d = Math.hypot(dx, dz);
          if (d < 9 || d > 40) continue;
          n++;
          if (R.canPlace(type, Math.round(T.x + dx) + (sw % 2 ? 0.5 : 0), Math.round(T.z + dz) + (sd % 2 ? 0.5 : 0))) ok++;
        }
        out[type] = +(ok / n).toFixed(2);
      }
      return out;
    });
    log(map, JSON.stringify(r));
    assert(r.house >= 0.5 && r.barracks >= 0.35, `a ${map} gairebé no es pot construir (${JSON.stringify(r)})`);
    await page.close();
  }
};
