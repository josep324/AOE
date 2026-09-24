/* =====================================================================
   ARQUITECTURA DE L'ORIENT MITJÀ (Sarraïns): tova, pedra arenisca, terrats,
   arcs apuntats, cúpules de rajola, bigues sortints i tendals
   ===================================================================== */

/* Cos de tova amb cornisa, ampit al terrat i bigues sortints */
function meBody(g, { w, d, h, y0 = 0, cx = 0, cz = 0, parapet = 0.45, vigas = true, material = null }) {
  const M = material || KM.adobe;
  kbox(g, w, h, d, M, cx, y0 + h / 2, cz);
  kbox(g, w + 0.14, 0.14, d + 0.14, KM.sandstone, cx, y0 + h + 0.07, cz);
  if (parapet) {
    const t = 0.16, py = y0 + h + 0.14 + parapet / 2;
    kbox(g, w + 0.14, parapet, t, M, cx, py, cz + d / 2 + 0.07 - t / 2);
    kbox(g, w + 0.14, parapet, t, M, cx, py, cz - d / 2 - 0.07 + t / 2);
    kbox(g, t, parapet, d - 0.2, M, cx + w / 2 + 0.07 - t / 2, py, cz);
    kbox(g, t, parapet, d - 0.2, M, cx - w / 2 - 0.07 + t / 2, py, cz);
    kbox(g, w - 0.2, 0.06, d - 0.2, KM.dirt, cx, y0 + h + 0.12, cz);
  }
  if (vigas) {
    const n = Math.max(2, Math.round(w / 0.7));
    for (let i = 0; i < n; i++) {
      const x = cx - w / 2 + (i + 0.5) * w / n;
      for (const sz of [-1, 1]) kcyl(g, 0.06, 0.06, 0.4, 6, KM.palewood, x, y0 + h - 0.25, cz + sz * (d / 2 + 0.1), [Math.PI / 2, 0, 0]);
    }
  }
}
/* Porta o finestra d'arc apuntat amb marc d'arenisca a la cara +Z (o girada) */
function meArch(g, w, h, x, y, z, rotY = 0) { return kopening(g, w, h, x, y, z, rotY, 'pointed', KM.sandstone); }
function kAmphora(g, x, z, s = 1) {
  const c = mat(0xa8603a, { roughness: 0.8 });
  ksphere(g, 0.26 * s, c, x, 0.3 * s, z, 1, 1.3, 1, 1);
  kcyl(g, 0.08 * s, 0.11 * s, 0.22 * s, 8, c, x, 0.68 * s, z);
}
function kRug(g, x, z, w, d, color, rotY = 0) {
  kbox(g, w, 0.03, d, KM.cloth(color), x, 0.02, z, [0, rotY, 0]);
  kbox(g, w * 0.7, 0.035, d * 0.6, KM.cloth(0xe8d6a8), x, 0.025, z, [0, rotY, 0]);
}
/* Tendal pla sobre quatre pals */
function meCanopy(g, cloth, x, z, w, d, h = 2.2, rotY = 0, y0 = 0) {
  const c = new THREE.Group();
  c.position.set(x, y0, z); c.rotation.y = rotY;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) kcyl(c, 0.05, 0.06, h + sz * 0.2, 6, KM.palewood, sx * (w / 2 - 0.08), (h + sz * 0.2) / 2, sz * (d / 2 - 0.08));
  kbox(c, w + 0.2, 0.04, d + 0.3, cloth, 0, h + 0.02, 0, [-0.1, 0, 0]);
  g.add(c);
}
function meTower(g, r, h, x, z, material = null, dome = true) {
  const M = material || KM.sandstone;
  kcyl(g, r, r * 1.12, h, 12, M, x, h / 2, z);
  kcyl(g, r * 1.15, r * 1.15, 0.16, 12, M, x, h + 0.08, z);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    kbox(g, 0.26, 0.34, 0.2, M, x + Math.cos(a) * r * 1.02, h + 0.33, z + Math.sin(a) * r * 1.02, [0, -a, 0]);
  }
  if (dome) kdome(g, r * 0.7, r * 0.75, KM.adobe, x, h + 0.16, z, 0.6, 12);
}

ARCH.middleeast = {
  towncenter(g, { team }) {
    kbox(g, 12.8, 0.4, 12.8, KM.sandstone, 0, 0.2, 0);
    // Sala central amb tambor i gran cúpula de rajola
    meBody(g, { w: 6.8, d: 6.8, h: 4.0, y0: 0.4, parapet: 0.5 });
    for (const [x, z, r] of [[-2, 3.4, 0], [2, 3.4, 0], [3.4, 0, Math.PI / 2], [-3.4, 0, -Math.PI / 2], [0, -3.4, Math.PI]]) meArch(g, 0.7, 1.4, x, 2.2, z, r);
    kcyl(g, 2.5, 2.6, 1.0, 16, KM.sandstone, 0, 5.1, 0);
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      kopening(g, 0.36, 0.6, Math.sin(a) * 2.58, 4.75, Math.cos(a) * 2.58, a, 'pointed');
    }
    kdome(g, 2.55, 2.4, KM.tile, 0, 5.6, 0, 0.5, 24);
    kcyl(g, 0.06, 0.1, 0.9, 8, KM.gold, 0, 8.9, 0);
    ksphere(g, 0.16, KM.gold, 0, 9.0, 0);
    // Iwan: portal alt amb arc apuntat
    kbox(g, 3.4, 5.6, 1.2, KM.sandstone, 0, 3.2, 3.9);
    meArch(g, 1.9, 3.8, 0, 0.4, 4.5, 0);
    kbox(g, 3.0, 0.4, 0.05, KM.tile, 0, 5.0, 4.52);
    battlements(g, 3.4, 1.2, 6.0, KM.sandstone, { z: 3.9, round: true, size: 0.3, gap: 0.25, h: 0.4, thick: 0.2 });
    // Torres a les cantonades unides per muralles baixes amb arcades
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      meTower(g, 0.95, 5.2, sx * 5.4, sz * 5.4);
      kPennant(g, team, sx * 5.4, 6.4, sz * 5.4, 1.6);
    }
    for (const [x, z, w, d] of [[0, -5.4, 9.8, 0.6], [-5.4, 0, 0.6, 9.8], [5.4, 0, 0.6, 9.8]]) {
      kbox(g, w, 2.2, d, KM.adobe, x, 1.5, z);
      battlements(g, w, d, 2.6, KM.adobe, { x, z, round: true, size: 0.3, gap: 0.3, h: 0.35, thick: 0.18 });
    }
    for (let i = -3; i <= 3; i += 2) {
      meArch(g, 0.7, 1.4, i * 1.1, 0.4, -5.1, 0);
      meArch(g, 0.7, 1.4, 5.1, 0.4, i * 1.1, -Math.PI / 2);
      meArch(g, 0.7, 1.4, -5.1, 0.4, i * 1.1, Math.PI / 2);
    }
    // Tendals, gerres i catifes davant
    meCanopy(g, KM.team(team), -3.6, 4.4, 2.2, 1.6, 2.2);
    meCanopy(g, KM.cloth(0xd8c8a0), 3.6, 4.4, 2.2, 1.6, 2.2);
    kAmphora(g, -4.2, 3.9); kAmphora(g, -3.6, 3.7, 0.85); kAmphora(g, 4.2, 4.0);
    kRug(g, 3.6, 4.5, 1.6, 1.1, 0x8a2a2a);
    kSack(g, -3.0, 4.6, 0.9, 0xd2b27a);
    return 9.4;
  },
  house(g, { team, variant }) {
    const flip = variant % 2 ? -1 : 1;
    kbox(g, 3.4, 0.2, 3.0, KM.sandstone, 0, 0.1, 0);
    meBody(g, { w: 3.0, d: 2.6, h: 2.4, y0: 0.2 });
    meArch(g, 0.75, 1.5, -0.6 * flip, 0.2, 1.3, 0);
    meArch(g, 0.36, 0.55, 0.75 * flip, 1.3, 1.3, 0);
    meArch(g, 0.36, 0.55, 0, 1.3, -1.3, Math.PI);
    if (variant === 1) {
      meBody(g, { w: 1.4, d: 1.3, h: 1.1, y0: 2.74, cx: 0.7, cz: -0.55, vigas: false, parapet: 0.3 });
      meArch(g, 0.4, 0.7, 0.7, 2.74, 0.1, 0);
    } else if (variant === 2) {
      kdome(g, 0.7, 0.6, KM.adobe, 0.6 * flip, 2.74, -0.4, 0.4, 12);
    }
    meCanopy(g, KM.team(team), variant === 1 ? -0.7 : -0.6 * flip, 0.2, 1.3, 1.2, 1.2, 0, 2.74);
    kAmphora(g, 1.3 * flip, 1.6, 0.9); kAmphora(g, 1.7 * flip, 1.35, 0.75);
    return 3.9;
  },
  lumbercamp(g, { team }) {
    kbox(g, 4.4, 1.8, 0.4, KM.adobe, 0, 0.9, -2.0);
    for (const sx of [-1, 1]) kbox(g, 0.4, 1.8, 2.0, KM.adobe, sx * 2.0, 0.9, -1.2);
    for (const sx of [-1, 1]) kcyl(g, 0.08, 0.1, 2.3, 7, KM.palewood, sx * 1.9, 1.15, 0.4);
    kbox(g, 4.2, 0.12, 0.12, KM.palewood, 0, 2.3, 0.4);
    for (let i = 0; i < 6; i++) kbox(g, 0.1, 0.1, 2.8, KM.palewood, -1.9 + i * 0.76, 2.35, -0.9);
    kbox(g, 4.0, 0.04, 2.6, KM.team(team), 0, 2.45, -0.8, [0.05, 0, 0]);
    kLogPile(g, -0.8, -1.0, 0, 4, 1.8, KM.palewood);
    kLogPile(g, 1.2, -1.0, 0, 3, 1.4);
    kSawhorse(g, 0.4, 1.4, 0.3);
    kLogPile(g, -1.8, 1.6, Math.PI / 2, 2, 1.2);
    return 3.0;
  },
  miningcamp(g, { team }) {
    kbox(g, 4.4, 1.8, 0.4, KM.adobe, 0, 0.9, -2.0);
    for (const sx of [-1, 1]) kbox(g, 0.4, 1.8, 2.0, KM.adobe, sx * 2.0, 0.9, -1.2);
    meArch(g, 0.6, 1.2, 0, 0, -1.78, 0);
    meCanopy(g, KM.team(team), 0, -0.7, 3.4, 2.2, 2.3);
    kOrePile(g, -1.0, -1.0, KM.gold, 9, 1.2);
    kOrePile(g, 1.1, -1.0, KM.sandstone, 9, 1.3);
    kCart(g, 1.3, 1.4, 0.5, 'gold');
    kCart(g, -1.1, 1.5, -0.3, 'stone');
    kAmphora(g, -2.0, 0.5); kAmphora(g, 2.0, 0.3, 0.8);
    return 3.0;
  },
  mill(g, { team }) {
    kbox(g, 3.6, 0.3, 3.0, KM.sandstone, -0.4, 0.15, -0.4);
    meBody(g, { w: 3.2, d: 2.6, h: 2.6, y0: 0.3, cx: -0.4, cz: -0.4 });
    kdome(g, 0.8, 0.8, KM.adobe, -0.9, 3.04, -0.6, 0.5, 14);
    meArch(g, 0.8, 1.6, -0.9, 0.3, 0.9, 0);
    // Sínia: roda vertical que gira
    kbox(g, 0.3, 2.3, 0.3, KM.sandstone, 1.6, 1.15, 0.6);
    const wheel = animPart(g, 'blades', 1.6, 1.5, 1.05);
    kcyl(wheel, 1.2, 1.2, 0.12, 20, KM.palewood, 0, 0, 0, [Math.PI / 2, 0, 0], true);
    kcyl(wheel, 0.16, 0.16, 0.3, 8, KM.palewood, 0, 0, 0, [Math.PI / 2, 0, 0]);
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      kbox(wheel, 0.06, 2.3, 0.06, KM.palewood, 0, 0, 0, [0, 0, a]);
      kbox(wheel, 0.2, 0.25, 0.3, mat(0x9a5a34), Math.cos(a) * 1.2, Math.sin(a) * 1.2, 0, [0, 0, a]);
    }
    kSack(g, 1.9, -1.4, 1, 0xd8c08a); kSack(g, 1.5, -1.8, 0.9, 0xd8c08a);
    kAmphora(g, -2.1, 1.2);
    kPennant(g, team, -1.9, 3.05, -1.6, 1.5);
    return 4.8;
  },
  market(g, { team }) {
    kbox(g, 5.8, 0.1, 5.8, KM.sandstone, 0, 0.05, 0);
    meBody(g, { w: 2.4, d: 2.4, h: 2.4, y0: 0.1, cx: 0, cz: -1.6 });
    kdome(g, 1.05, 1.0, KM.tile, 0, 2.64, -1.6, 0.6, 16);
    meArch(g, 0.8, 1.6, 0, 0.1, -0.4, 0);
    const colors = [teamOf(team).color, 0xc9892f, 0x2f6f5a, 0x8a2a3a];
    [[-2.0, -1.4], [2.0, -1.4], [-1.7, 1.5], [1.7, 1.5]].forEach(([x, z], i) => {
      meCanopy(g, KM.cloth(colors[i]), x, z, 1.7, 1.3, 1.9);
      kbox(g, 1.3, 0.6, 0.6, KM.planks, x, 0.3, z - 0.2);
      kAmphora(g, x + 0.5, z + 0.4, 0.7);
    });
    kRug(g, -1.7, 1.6, 1.2, 0.8, 0x7a2030); kRug(g, 1.7, 1.6, 1.2, 0.8, 0x203a7a);
    kSack(g, 0.3, 0.8, 0.9, 0xc07030); kSack(g, -0.3, 0.9, 0.8, 0xd8c08a);
    kPennant(g, team, 0, 2.95, -1.6 + 1.3, 1.4);
    return 4.2;
  },
  barracks(g, { team }) {
    kbox(g, 6.8, 0.2, 6.8, KM.dirt, 0, 0.1, 0);
    // Recinte emmurallat amb merlets arrodonits
    for (const [x, z, w, d] of [[0, -3.1, 6.6, 0.4], [-3.1, 0, 0.4, 5.8], [3.1, 0, 0.4, 5.8], [-2.25, 3.1, 2.1, 0.4], [2.25, 3.1, 2.1, 0.4]]) {
      kbox(g, w, 2.0, d, KM.adobe, x, 1.1, z);
      battlements(g, w, d, 2.1, KM.adobe, { x, z, round: true, size: 0.3, gap: 0.28, h: 0.36, thick: 0.18 });
    }
    // Portal
    for (const sx of [-1, 1]) kbox(g, 0.6, 3.0, 0.7, KM.sandstone, sx * 1.0, 1.5, 3.1);
    kbox(g, 2.6, 0.8, 0.7, KM.sandstone, 0, 3.0, 3.1);
    kshape(g, archShape(1.4, 0.8, 'pointed'), KM.sandstone, 0, 2.6, 3.46);
    kbox(g, 1.8, 0.2, 0.05, KM.tile, 0, 3.1, 3.47);
    // Caserna de dos pisos al fons i torre
    meBody(g, { w: 5.0, d: 2.2, h: 3.4, y0: 0.2, cz: -1.8 });
    for (const x of [-1.6, 0, 1.6]) { meArch(g, 0.7, 1.5, x, 0.2, -0.7, 0); meArch(g, 0.4, 0.6, x, 2.3, -0.7, 0); }
    meTower(g, 0.75, 4.6, 2.9, -2.9);
    kPennant(g, team, 2.9, 5.45, -2.9, 1.6);
    kPennant(g, team, -1.0, 4.0, 3.1, 1.2);
    kPennant(g, team, 1.0, 4.0, 3.1, 1.2);
    kWeaponRack(g, team, -2.3, 1.0, Math.PI / 2, true, KM.palewood);
    kTarget(g, team, 2.0, 1.4, -0.3);
    kDummy(g, 0.2, 1.0);
    meCanopy(g, KM.team(team), -1.8, 0.8, 1.6, 1.2, 2.0);
    return 5.8;
  },
  stable(g, { team }) {
    meBody(g, { w: 5.6, d: 2.4, h: 2.4, cz: -1.6 });
    for (const x of [-1.9, 0, 1.9]) meArch(g, 1.1, 1.8, x, 0, -0.4, 0);
    meCanopy(g, KM.team(team), 1.6, 0.4, 2.2, 1.4, 2.2);
    kRailFence(g, -2.8, 0.2, -2.8, 2.8, 1.0, KM.palewood);
    kRailFence(g, 2.8, 0.2, 2.8, 2.8, 1.0, KM.palewood);
    kRailFence(g, -2.8, 2.8, -0.8, 2.8, 1.0, KM.palewood);
    kRailFence(g, 0.8, 2.8, 2.8, 2.8, 1.0, KM.palewood);
    kHay(g, 1.6, 1.4, 0.3); kHay(g, 2.1, 2.0, 1.2);
    kbox(g, 1.3, 0.4, 0.5, KM.sandstone, -1.5, 0.2, 1.0);
    kbox(g, 1.2, 0.05, 0.36, mat(0x4a6a7a, { roughness: 0.2 }), -1.5, 0.41, 1.0);
    kPennant(g, team, -2.6, 2.9, -2.6, 1.3);
    return 3.8;
  },
  blacksmith(g, { team }) {
    meBody(g, { w: 3.6, d: 2.8, h: 2.5, cz: -0.9 });
    kdome(g, 1.0, 0.9, KM.adobe, -0.6, 2.64, -1.1, 0.4, 14);
    kbox(g, 0.7, 1.6, 0.7, KM.sandstone, 1.2, 3.3, -1.6);
    meArch(g, 0.9, 1.7, -0.8, 0, 0.5, 0);
    meCanopy(g, KM.team(team), 0.8, 1.2, 2.2, 1.6, 2.1);
    kbox(g, 1.1, 0.7, 0.8, KM.sandstone, 1.0, 0.35, 1.0);
    kbox(g, 0.8, 0.12, 0.5, KM.glow, 1.0, 0.72, 1.0).userData.noShadow = true;
    kAnvil(g, -0.2, 1.5, 0.3);
    kAmphora(g, -1.6, 1.6, 0.9);
    return 4.9;
  },
  watchtower(g, { team }) {
    kbox(g, 2.8, 0.4, 2.8, KM.sandstone, 0, 0.2, 0);
    kcyl(g, 1.0 * Math.SQRT2, 1.25 * Math.SQRT2, 5.6, 4, KM.sandstone, 0, 3.2, 0, [0, Math.PI / 4, 0]);
    meArch(g, 0.7, 1.4, 0, 0.4, 1.24, 0);
    meArch(g, 0.3, 0.7, 0, 3.4, 1.1, 0);
    kbox(g, 2.5, 0.22, 2.5, KM.sandstone, 0, 6.1, 0);
    battlements(g, 2.5, 2.5, 6.2, KM.sandstone, { round: true, size: 0.32, gap: 0.3, h: 0.42, thick: 0.2 });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) kcyl(g, 0.07, 0.07, 1.4, 6, KM.palewood, sx * 0.8, 6.9, sz * 0.8);
    kbox(g, 1.9, 0.1, 1.9, KM.adobe, 0, 7.6, 0);
    kdome(g, 0.9, 0.8, KM.tile, 0, 7.65, 0, 0.6, 14);
    kPennant(g, team, 0, 8.4, 0, 1.2);
    return 9.2;
  },
  stonewall(g) {
    kbox(g, 1.0, 2.7, 1.0, KM.sandstone, 0, 1.35, 0);
    kbox(g, 1.04, 0.12, 1.04, KM.sandstone, 0, 2.72, 0);
    for (const [sx, sz] of [[-0.28, -0.28], [0.28, 0.28]]) {
      kbox(g, 0.34, 0.3, 0.34, KM.sandstone, sx, 2.93, sz);
      kcyl(g, 0.17, 0.17, 0.34, 8, KM.sandstone, sx, 3.08, sz, [Math.PI / 2, 0, 0]);
    }
    return 3.3;
  },
  gate(g, { team }) {
    for (const sx of [-1, 1]) meTower(g, 0.5, 3.8, sx * 1.1, 0, KM.sandstone, false);
    kbox(g, 1.6, 0.9, 0.9, KM.sandstone, 0, 3.25, 0);
    for (const sz of [-1, 1]) kshape(g, archShape(1.4, 0.7, 'pointed'), KM.sandstone, 0, 2.7, sz * 0.46, sz > 0 ? 0 : Math.PI);
    kbox(g, 1.2, 0.18, 0.04, KM.tile, 0, 3.4, 0.46);
    kPennant(g, team, 0, 3.7, 0, 1.2);
    for (const sx of [-1, 1]) {
      const door = animPart(g, 'doors', sx * 0.68, 0, 0.1);
      kbox(door, 0.68, 2.6, 0.1, KM.planks, -sx * 0.34, 1.3, 0);
      for (const y of [0.5, 1.3, 2.1]) kbox(door, 0.7, 0.07, 0.12, KM.iron, -sx * 0.34, y, 0);
    }
    return 4.4;
  },
};
