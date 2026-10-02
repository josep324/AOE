/* =====================================================================
   EDIFICIS PROPIS DE CADA CIVILITZACIÓ
   - Mongols: campament d'iurtes de feltre (cases, Centre, casernes, estables, mercat, magatzems)
   - Una Meravella per a cada civilització, com a l'AoE II: Notre-Dame (Francs, la de l'arquitectura
     occidental), catedral de Salisbury (Britons), Santa Maria del Mar (Catalans), gran mesquita (Sarraïns),
     Santa Sofia (Bizantins), palau d'iurtes de Karakorum (Mongols), Tōdai-ji (Japonesos) i torre de
     porcellana de Nanquín (Xinesos)
   ===================================================================== */

/* ---------- Iurta ---------- */
function kYurt(g, team, r, x, z, rotY = 0, y0 = 0) {
  const y = new THREE.Group();
  y.position.set(x, y0, z); y.rotation.y = rotY;
  const felt = kitMat('felt'), wall = r * 0.62, roof = r * 0.5;
  kcyl(y, r, r * 1.02, wall, 18, felt, 0, wall / 2, 0);
  // Cordes de subjecció i franja de l'equip
  for (const h of [wall * 0.3, wall * 0.75]) kcyl(y, r * 1.03, r * 1.03, 0.06, 18, KM.timber, 0, h, 0, null, true);
  kcyl(y, r * 1.025, r * 1.025, 0.22, 18, KM.team(team), 0, wall - 0.14, 0, null, true);
  // Sostre cònic de feltre i corona de fusta (toono)
  kcyl(y, r * 0.2, r * 1.08, roof, 18, felt, 0, wall + roof / 2, 0);
  kcyl(y, r * 0.22, r * 0.22, 0.12, 12, KM.timber, 0, wall + roof + 0.04, 0);
  kcyl(y, r * 0.16, r * 0.16, 0.14, 10, KM.dark, 0, wall + roof + 0.08, 0);
  // Porta de fusta pintada
  const door = mat(0xb8402a, { roughness: 0.7 });
  kbox(y, r * 0.4, wall * 0.78, 0.08, door, 0, wall * 0.39, r * 0.99);
  kbox(y, r * 0.46, 0.08, 0.1, KM.gold, 0, wall * 0.8, r * 1.0);
  g.add(y);
  return y0 + wall + roof + 0.15;
}
/* Estendard de l'estepa (sulde): llança amb una cua de crins */
function kSulde(g, x, z, h = 3.4) {
  kcyl(g, 0.04, 0.05, h, 6, KM.timber, x, h / 2, z);
  kcyl(g, 0.22, 0.05, 0.6, 8, mat(0x1c1612, { roughness: 1 }), x, h - 0.45, z);
  kcyl(g, 0, 0.06, 0.4, 6, KM.gold, x, h + 0.15, z);
}

CIV_BUILDERS.mongols = {
  house(g, { team }) {
    const h = kYurt(g, team, 1.55, -0.2, -0.2, kr(-0.4, 0.4));
    kLogPile(g, 1.4, 1.2, 0.4, 2, 0.9);
    kSack(g, -1.5, 1.3, 0.8);
    return h;
  },
  towncenter(g, { team }) {
    kbox(g, 12.6, 0.3, 12.6, KM.planks, 0, 0.15, 0);
    const h = kYurt(g, team, 4.2, 0, -0.4, 0, 0.3);
    for (const [x, z] of [[-4.6, 3.6], [4.6, 3.6], [-4.8, -4.6], [4.8, -4.6]]) kYurt(g, team, 1.5, x, z, Math.atan2(-x, -z) + Math.PI, 0.3);
    kStakeFence(g, -6.1, -6.1, 6.1, -6.1, 1.2, 0.5);
    for (const sx of [-1, 1]) kStakeFence(g, sx * 6.1, -6.1, sx * 6.1, 2.0, 1.2, 0.5);
    for (const sx of [-1, 1]) kSulde(g, sx * 2.0, 4.8, 4.2);
    kBanner(g, team, 0, 5.6, 4.4);
    kCart(g, -2.6, 5.0, 0.3);
    return h;
  },
  mill(g, { team }) {
    const h = kYurt(g, team, 1.6, -0.6, -0.7);
    kcyl(g, 0.6, 0.6, 0.25, 14, KM.granite, 1.4, 0.13, 1.2);       // mola de mà
    kcyl(g, 0.5, 0.5, 0.2, 14, KM.granite, 1.4, 0.36, 1.2);
    for (const [x, z] of [[-1.8, 1.3], [-1.3, 1.7], [-0.7, 1.5]]) kSack(g, x, z, 0.85);
    kHay(g, 1.6, -1.4, 0.4);
    return h;
  },
  lumbercamp(g, { team }) {
    kYurt(g, team, 1.3, -1.2, -1.2);
    meCanopy(g, kitMat('felt'), 1.0, -0.6, 2.4, 2.0, 2.0);
    kLogPile(g, 1.0, -0.6, 0, 4, 1.8);
    kLogPile(g, -1.0, 1.4, Math.PI / 2, 3, 1.4);
    kSawhorse(g, 1.2, 1.5, 0.4);
    return 2.6;
  },
  miningcamp(g, { team }) {
    kYurt(g, team, 1.3, -1.2, -1.2);
    meCanopy(g, kitMat('felt'), 1.0, -0.6, 2.4, 2.0, 2.0);
    kOrePile(g, 0.6, -0.8, KM.gold, 9, 1.1);
    kOrePile(g, 1.6, -0.4, KM.granite, 8, 1.1);
    kCart(g, -0.9, 1.5, -0.3, 'stone');
    kCart(g, 1.4, 1.5, 0.4, 'gold');
    return 2.6;
  },
  barracks(g, { team }) {
    const h = kYurt(g, team, 2.3, -0.8, -1.0);
    kWeaponRack(g, team, 2.2, -1.6, Math.PI / 2, true);
    kWeaponRack(g, team, 2.2, 0.6, Math.PI / 2, true);
    kDummy(g, -1.8, 2.2); kDummy(g, 0.4, 2.6);
    kStakeFence(g, -3.3, 3.3, 3.3, 3.3, 1.0, 0.45);
    kSulde(g, 2.6, 2.8, 3.6);
    return h;
  },
  stable(g, { team }) {
    const h = kYurt(g, team, 1.7, -1.3, -1.3);
    kRailFence(g, -0.2, 0.4, 2.8, 0.4); kRailFence(g, 2.8, 0.4, 2.8, 2.8); kRailFence(g, -0.2, 2.8, 2.8, 2.8);
    kHay(g, 1.3, 1.6, 0.3); kHay(g, -2.0, 1.8, 1.2);
    kSulde(g, 2.6, -2.4, 3.2);
    return h;
  },
  archeryrange(g, { team }) {
    const h = kYurt(g, team, 1.7, -1.3, -1.3);
    kTarget(g, team, 2.0, -1.8, -0.6); kTarget(g, team, 2.2, 0.6, -0.9);
    kWeaponRack(g, team, -1.2, 2.0, 0, false);
    kSulde(g, -2.6, 2.4, 3.2);
    return h;
  },
  market(g, { team }) {
    const h = kYurt(g, team, 1.6, -1.3, -1.4);
    meCanopy(g, KM.team(team), 1.4, -1.2, 2.0, 1.8, 2.0);
    meCanopy(g, kitMat('felt'), 1.4, 1.4, 2.0, 1.8, 2.0, 0.2);
    kRug(g, -1.2, 1.6, 1.6, 1.2, 0x8a2a2a);
    for (const [x, z] of [[1.0, -1.0], [1.7, -1.4], [1.2, 1.3]]) kSack(g, x, z, 0.8, 0xc8a050);
    kCart(g, -2.2, 2.2, 0.5, 'gold');
    return h;
  },
};

/* ---------- Meravelles ---------- */
CIV_BUILDERS.britons = {
  wonder(g, { team }) {
    // Catedral de Salisbury: planta de creu, torre del creuer i l'agulla més alta
    kbox(g, 11.8, 0.5, 11.8, KM.stone, 0, 0.25, 0);
    const n = new THREE.Group(); n.rotation.y = Math.PI / 2; g.add(n);
    kbox(n, 10.6, 6.2, 3.8, KM.stone, 0, 3.6, 0);
    gableRoof(n, { w: 10.6, d: 3.8, h: 2.6, over: 0.3, y0: 6.7, roofMat: KM.thatch, gableMat: KM.stone, frame: false });
    kbox(g, 10.0, 5.6, 3.0, KM.stone, 0, 3.3, -1.4);
    gableRoof(g, { w: 10.0, d: 3.0, h: 2.2, over: 0.3, y0: 6.1, z: -1.4, roofMat: KM.thatch, gableMat: KM.stone, frame: false });
    for (const sx of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        const z = i < 2 ? 1.6 + i * 1.7 : -4.0 - (i - 2) * 1.4;
        kopening(g, 0.5, 2.6, sx * 1.91, 2.4, z, sx * Math.PI / 2, 'pointed');
        kbox(g, 0.35, 5.0, 0.45, KM.stone, sx * 2.05, 2.9, z + 0.8);
        kcyl(g, 0, 0.25, 0.9, 4, KM.stone, sx * 2.05, 5.8, z + 0.8);
      }
      kopening(g, 0.8, 3.0, sx * 5.01, 2.0, -1.4, sx * Math.PI / 2, 'pointed', KM.stone);
    }
    // Torre del creuer i agulla
    kbox(g, 3.0, 4.6, 3.0, KM.stone, 0, 9.4, -1.4);
    for (const s of [[0, 1.51, 0], [0, -1.51, Math.PI], [1.51, 0, Math.PI / 2], [-1.51, 0, -Math.PI / 2]])
      for (const dx of [-0.5, 0.5]) kopening(g, 0.36, 1.9, s[0] ? s[0] : dx, 9.2, -1.4 + (s[1] || dx), s[2], 'pointed');
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) kcyl(g, 0, 0.22, 1.4, 4, KM.stone, sx * 1.4, 12.4, -1.4 + sz * 1.4);
    kcyl(g, 0, 1.45, 8.4, 8, KM.thatch, 0, 15.9, -1.4);
    kbox(g, 0.1, 0.9, 0.1, KM.gold, 0, 20.4, -1.4); kbox(g, 0.5, 0.1, 0.1, KM.gold, 0, 20.55, -1.4);
    // Façana oest: portal, finestral i torretes
    kopening(g, 1.3, 2.8, 0, 0.5, 5.31, 0, 'pointed', KM.stone);
    kopening(g, 1.6, 2.4, 0, 3.8, 5.31, 0, 'pointed');
    for (const sx of [-1, 1]) { kbox(g, 0.7, 8.6, 0.7, KM.stone, sx * 2.1, 4.8, 5.0); kcyl(g, 0, 0.42, 1.6, 4, KM.stone, sx * 2.1, 9.9, 5.0); }
    kBanner(g, team, -4.4, 4.4, 5.0); kBanner(g, team, 4.4, 4.4, 5.0);
    return 20.8;
  },
};
CIV_BUILDERS.catalans = {
  wonder(g, { team }) {
    // Santa Maria del Mar: gòtic català, murs llisos i massissos, terrats, dos campanars octogonals i rosassa
    kbox(g, 11.8, 0.5, 11.8, KM.stone, 0, 0.25, 0);
    kbox(g, 7.6, 9.4, 7.4, KM.stone, 0, 5.2, -0.2);
    kbox(g, 7.9, 0.3, 7.7, KM.stone, 0, 10.0, -0.2);
    kbox(g, 7.2, 0.25, 7.0, KM.thatch, 0, 10.2, -0.2);                 // terrat de teula
    // Capelles entre contraforts (cos baix) i contraforts
    for (const sx of [-1, 1]) {
      kbox(g, 1.6, 4.6, 7.0, KM.stone, sx * 4.6, 2.8, -0.4);
      kbox(g, 1.8, 0.2, 7.2, KM.thatch, sx * 4.6, 5.2, -0.4, [0, 0, sx * -0.18]);
      for (let i = 0; i < 4; i++) {
        const z = -3.4 + i * 2.0;
        kbox(g, 0.5, 7.6, 0.6, KM.stone, sx * 4.0, 4.3, z);
        kopening(g, 0.5, 2.6, sx * 3.81, 6.2, z + 1.0, sx * Math.PI / 2, 'pointed');
        kopening(g, 0.5, 1.4, sx * 5.41, 1.6, z + 1.0, sx * Math.PI / 2, 'pointed');
      }
    }
    // Absis poligonal
    kcyl(g, 3.0, 3.0, 9.4, 7, KM.stone, 0, 5.2, -3.9);
    kcyl(g, 3.15, 3.15, 0.3, 7, KM.stone, 0, 10.0, -3.9);
    // Façana: portal amb arquivoltes, rosassa amb vidre de l'equip i campanars octogonals
    for (let k = 0; k < 3; k++) kopening(g, 2.4 - k * 0.4, 3.6 - k * 0.3, 0, 0.5, 3.51 + k * 0.01, 0, 'pointed', KM.stone);
    kcyl(g, 1.5, 1.5, 0.12, 24, KM.stone, 0, 6.6, 3.52, [Math.PI / 2, 0, 0]);
    kcyl(g, 1.25, 1.25, 0.14, 24, mat(teamOf(team).color, { emissive: teamOf(team).colorDark, emissiveIntensity: 0.6, roughness: 0.25 }), 0, 6.6, 3.56, [Math.PI / 2, 0, 0]);
    for (let k = 0; k < 8; k++) kbox(g, 0.07, 2.5, 0.03, KM.stone, 0, 6.6, 3.64, [0, 0, k * Math.PI / 8]);
    for (const sx of [-1, 1]) {
      const x = sx * 3.3;
      kcyl(g, 1.05, 1.1, 14.4, 8, KM.stone, x, 7.7, 3.2);
      for (const y of [10.6, 12.6]) for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 8; kopening(g, 0.36, 1.2, x + Math.sin(a) * 1.04, y, 3.2 + Math.cos(a) * 1.04, a, 'pointed'); }
      kcyl(g, 1.2, 1.2, 0.25, 8, KM.stone, x, 15.0, 3.2);
      for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; kcyl(g, 0, 0.12, 0.6, 4, KM.stone, x + Math.sin(a) * 1.1, 15.4, 3.2 + Math.cos(a) * 1.1); }
    }
    kBanner(g, team, -5.2, 5.0, 5.0); kBanner(g, team, 5.2, 5.0, 5.0);
    return 15.8;
  },
};
CIV_BUILDERS.byzantines = {
  wonder(g, { team }) {
    // Santa Sofia: gran cúpula sobre un cos quadrat, semicúpules, contraforts i quatre minarets
    kbox(g, 11.8, 0.5, 11.8, KM.sandstone, 0, 0.25, 0);
    meBody(g, { w: 8.4, d: 8.0, h: 5.0, y0: 0.5, parapet: 0, vigas: false });
    for (const sz of [-1, 1]) {
      kcyl(g, 2.6, 2.6, 1.2, 20, KM.sandstone, 0, 6.0, sz * 2.4);
      kdome(g, 2.6, 1.9, KM.tile, 0, 6.6, sz * 2.4, 0, 22);
    }
    // Contraforts (torres quadrades) als costats
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      kbox(g, 1.4, 7.6, 1.6, KM.sandstone, sx * 3.6, 4.3, sz * 1.4);
      kdome(g, 0.6, 0.5, KM.tile, sx * 3.6, 8.1, sz * 1.4, 0, 10);
    }
    // Tambor amb finestres i cúpula gran
    kcyl(g, 3.3, 3.4, 1.4, 28, KM.sandstone, 0, 7.3, 0);
    for (let k = 0; k < 20; k++) { const a = k / 20 * Math.PI * 2; kopening(g, 0.3, 0.7, Math.sin(a) * 3.36, 7.0, Math.cos(a) * 3.36, a, 'round'); }
    kdome(g, 3.4, 2.4, KM.tile, 0, 8.0, 0, 0, 30);
    kcyl(g, 0.06, 0.1, 1.0, 8, KM.gold, 0, 10.8, 0);
    kbox(g, 0.5, 0.08, 0.08, KM.gold, 0, 11.1, 0);
    // Nàrtex i portes
    kbox(g, 6.0, 3.0, 1.4, KM.sandstone, 0, 2.0, 4.6);
    for (const x of [-1.8, 0, 1.8]) kopening(g, 0.9, 2.0, x, 0.5, 5.31, 0, 'round', KM.sandstone);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const x = sx * 5.2, z = sz * 5.2;
      kcyl(g, 0.4, 0.5, 11.0, 12, KM.adobe, x, 6.0, z);
      kcyl(g, 0.6, 0.45, 0.3, 12, KM.adobe, x, 9.0, z);
      kcyl(g, 0, 0.42, 1.8, 12, KM.tile, x, 12.4, z);
    }
    kPennant(g, team, -3.0, 0.5, 5.6, 2.4); kPennant(g, team, 3.0, 0.5, 5.6, 2.4);
    return 13.4;
  },
};
CIV_BUILDERS.mongols = {
  ...CIV_BUILDERS.mongols,
  wonder(g, { team }) {
    // Palau d'iurtes de Karakorum: iurta gran sobre una plataforma de dos pisos, portalada i suldes
    kbox(g, 11.8, 0.4, 11.8, KM.planks, 0, 0.2, 0);
    kcyl(g, 4.9, 5.1, 1.2, 20, KM.sandstone, 0, 1.0, -0.6);
    kcyl(g, 4.6, 4.6, 0.12, 20, KM.planks, 0, 1.66, -0.6);
    const h = kYurt(g, team, 4.3, 0, -0.6, 0, 1.6);
    kYurt(g, team, 1.6, 0, -0.6, 0, h - 0.3);                              // pavelló superior
    kcyl(g, 0.12, 0.2, 1.2, 8, KM.gold, 0, h + 2.6, -0.6);
    for (const [x, z] of [[-4.8, 4.2], [4.8, 4.2], [-4.9, -4.9], [4.9, -4.9]]) kYurt(g, team, 1.3, x, z, Math.atan2(-x, -z) + Math.PI, 0.4);
    // Portalada de fusta amb travesser i tela de l'equip
    for (const sx of [-1, 1]) kcyl(g, 0.22, 0.26, 4.6, 8, mat(0xa8301f, { roughness: 0.6 }), sx * 1.6, 2.7, 5.0);
    kbox(g, 4.4, 0.4, 0.5, mat(0xa8301f, { roughness: 0.6 }), 0, 5.1, 5.0);
    kbox(g, 3.0, 0.9, 0.06, KM.team(team), 0, 4.4, 5.05);
    for (const x of [-3.2, -2.6, 2.6, 3.2]) kSulde(g, x, 5.4, 4.6);
    kBanner(g, team, 0, -5.6, 5.0);
    return h + 3.2;
  },
};
CIV_BUILDERS.chinese = {
  wonder(g, { team }) {
    // Torre de porcellana de Nanquín: pagoda octogonal de nou pisos, blanca, amb teulades vidrades
    eaStoneBase(g, 11.8, 11.8, 0.8);
    const white = KM.whiteplaster;
    let y = 0.8;
    for (let i = 0; i < 9; i++) {
      const r = 3.0 - i * 0.22, hh = 1.35;
      kcyl(g, r, r, hh, 8, white, 0, y + hh / 2, -0.8);
      for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2 + Math.PI / 8; kopening(g, 0.36, 0.7, Math.sin(a) * r * 0.93, y + 0.3, -0.8 + Math.cos(a) * r * 0.93, a, 'round', KM.gold); }
      kcyl(g, r * 0.6, r + 0.75, 0.5, 8, KM.kawara, 0, y + hh + 0.25, -0.8);
      kcyl(g, r + 0.78, r + 0.78, 0.08, 8, KM.darkwood, 0, y + hh + 0.02, -0.8);
      y += hh + 0.5;
    }
    kcyl(g, 0.1, 0.16, 2.4, 8, KM.gold, 0, y + 1.2, -0.8);
    for (let k = 0; k < 4; k++) ksphere(g, 0.26 - k * 0.04, KM.gold, 0, y + 0.4 + k * 0.5, -0.8);
    // Pavellons de l'entrada i llanternes
    for (const sx of [-1, 1]) {
      eaBody(g, { w: 2.4, d: 1.8, h: 1.6, y0: 0.8, cx: sx * 4.0, cz: 4.2, door: { x: 0, w: 0.9, h: 1.2 } });
      eaRoof(g, { w: 2.4, d: 1.8, h: 0.9, y0: 2.4, x: sx * 4.0, z: 4.2, over: 0.5, lift: 0.3 });
      kLantern(g, sx * 1.6, 5.0);
    }
    for (const [x, z] of [[-5.3, -5.3], [5.3, -5.3]]) kNobori(g, team, x, z, 5.0);
    return y + 2.6;
  },
};
