/* =====================================================================
   ARQUITECTURA D'ÀSIA ORIENTAL (Japonesos): sòcols de granit, pilars de fusta
   fosca, parets blanques, teulades corbes de teula i banderes nobori
   ===================================================================== */

/* Cos de pilars i bigues de fusta fosca amb panells blancs (o de paper) */
function eaBody(g, { w, d, h, y0 = 0, cx = 0, cz = 0, panel = null, lower = true, door = null }) {
  kbox(g, w, h, d, panel || KM.whiteplaster, cx, y0 + h / 2, cz);
  if (lower) kbox(g, w + 0.02, h * 0.3, d + 0.02, KM.darkplanks, cx, y0 + h * 0.15, cz);
  const D = KM.darkwood;
  for (const [len, px, pz, alongX] of [[w, cx, cz + d / 2, true], [w, cx, cz - d / 2, true], [d, cx + w / 2, cz, false], [d, cx - w / 2, cz, false]]) {
    const n = Math.max(1, Math.round(len / 1.2));
    for (let i = 0; i <= n; i++) {
      const t = -len / 2 + len * i / n;
      kbox(g, 0.14, h, 0.14, D, alongX ? px + t : px, y0 + h / 2, alongX ? pz : pz + t);
    }
    for (const y of [y0 + h - 0.08, y0 + h * 0.3]) kbox(g, alongX ? len + 0.1 : 0.1, 0.12, alongX ? 0.1 : len + 0.1, D, px, y, pz);
  }
  if (door) {
    kbox(g, door.w, door.h, 0.06, KM.paper, cx + door.x, y0 + door.h / 2, cz + d / 2 + 0.04);
    for (let i = 1; i < 4; i++) kbox(g, 0.03, door.h, 0.08, D, cx + door.x - door.w / 2 + door.w * i / 4, y0 + door.h / 2, cz + d / 2 + 0.05);
    for (let i = 1; i < 4; i++) kbox(g, door.w, 0.03, 0.08, D, cx + door.x, y0 + door.h * i / 4, cz + d / 2 + 0.05);
  }
}
/* Teulada corba de teula amb carener i acroteris (onigawara) */
function eaRoof(g, { w, d, h, y0, x = 0, z = 0, over = 0.55, lift = 0.32, curve = 1.7, gold = false, material = null }) {
  hipRoof(g, { w, d, h, over, y0, x, z, roofMat: material || KM.kawara, curve, lift, ridge: 0.22, ridgeMat: KM.darkwood });
  // Ràfec: bigues fosques sota la teulada
  kbox(g, w + over * 1.6, 0.1, d + over * 1.6, KM.darkwood, x, y0 - 0.02, z);
  const rl = Math.abs(w - d) / 2;
  if (rl > 0.05) for (const s of [-1, 1]) {
    const ex = w >= d ? x + s * (rl + 0.1) : x, ez = w >= d ? z : z + s * (rl + 0.1);
    kbox(g, 0.26, 0.34, 0.26, gold ? KM.gold : KM.kawara, ex, y0 + h + 0.35, ez);
  }
}
/* Plataforma de granit amb talús (base de castell) */
function eaStoneBase(g, w, d, h, x = 0, z = 0) {
  const geo = new THREE.CylinderGeometry(Math.SQRT1_2, Math.SQRT1_2 * 1.18, 1, 4, 1);
  geo.rotateY(Math.PI / 4);
  geo.scale(w, h, d);
  const tile = KM.granite.userData.tile;
  scaleUV(geo, (i, u, v) => [u * (w + d) * 2 / tile, v * h / tile]);
  return place(g, new THREE.Mesh(geo, KM.granite), x, h / 2, z);
}
function kLantern(g, x, z) {
  kbox(g, 0.4, 0.12, 0.4, KM.granite, x, 0.06, z);
  kcyl(g, 0.08, 0.1, 0.7, 6, KM.granite, x, 0.47, z);
  kbox(g, 0.34, 0.3, 0.34, KM.granite, x, 0.95, z);
  kbox(g, 0.16, 0.16, 0.36, KM.paper, x, 0.95, z);
  kcyl(g, 0.02, 0.3, 0.22, 4, KM.granite, x, 1.2, z, [0, Math.PI / 4, 0]);
}
function kBamboo(g, x0, z0, x1, z1, h = 1.2) {
  const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(2, Math.round(len / 0.14));
  const bam = mat(0x9a9a52, { roughness: 0.6 });
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    kcyl(g, 0.05, 0.05, h, 6, bam, x0 + (x1 - x0) * t, h / 2, z0 + (z1 - z0) * t);
  }
  for (const y of [h * 0.35, h * 0.8]) kbox(g, len, 0.05, 0.05, KM.darkwood, (x0 + x1) / 2, y, (z0 + z1) / 2, [0, -Math.atan2(z1 - z0, x1 - x0), 0]);
}
function kNoren(g, team, x, y, z, w = 1.0, rotY = 0) {
  const n = new THREE.Group(); n.position.set(x, y, z); n.rotation.y = rotY;
  for (let i = 0; i < 3; i++) kbox(n, w / 3 - 0.03, 0.55, 0.02, KM.team(team), -w / 3 + i * w / 3, -0.28, 0);
  g.add(n);
}

ARCH.eastasian = {
  towncenter(g, { team }) {
    eaStoneBase(g, 12.0, 12.0, 1.2);
    // Planta baixa amb galeria i primera teulada
    kbox(g, 10.2, 0.2, 10.2, KM.darkplanks, 0, 1.3, 0);
    eaBody(g, { w: 7.6, d: 7.0, h: 2.6, y0: 1.4, door: { x: 0, w: 2.2, h: 2.0 } });
    for (let i = -4; i <= 4; i++) for (const s of [-1, 1]) {
      kbox(g, 0.16, 2.5, 0.16, KM.darkwood, i * 1.18, 2.65, s * 4.9);
      if (Math.abs(i) < 4) kbox(g, 0.16, 2.5, 0.16, KM.darkwood, s * 4.9, 2.65, i * 1.18);
    }
    eaRoof(g, { w: 9.8, d: 9.8, h: 1.9, y0: 3.9, over: 0.7, lift: 0.45 });
    // Segon pis i teulada superior amb acroteris daurats
    eaBody(g, { w: 5.2, d: 4.4, h: 2.0, y0: 5.3, lower: false });
    for (const x of [-1.5, 0, 1.5]) kbox(g, 0.7, 0.9, 0.06, KM.paper, x, 6.4, 2.24);
    eaRoof(g, { w: 5.2, d: 4.4, h: 2.3, y0: 7.3, over: 0.75, lift: 0.5, gold: true });
    // Entrada amb escalinata, fanals i banderes
    kbox(g, 3.0, 0.4, 1.4, KM.granite, 0, 0.2, 6.6);
    kbox(g, 3.0, 0.4, 0.8, KM.granite, 0, 0.6, 6.0);
    kbox(g, 3.0, 0.4, 0.6, KM.granite, 0, 1.0, 5.6);
    kNoren(g, team, 0, 3.4, 3.56, 2.2);
    kLantern(g, -2.2, 6.4); kLantern(g, 2.2, 6.4);
    for (const [x, z] of [[-5.9, 5.9], [5.9, 5.9], [-5.9, -5.9], [5.9, -5.9]]) kNobori(g, team, x, z, 4.4);
    kBarrel(g, -4.6, 6.0, 0.9); kBarrel(g, -4.0, 6.3, 0.8);
    kCrate(g, 4.6, 6.1, 0.8, 0.2);
    return 10.4;
  },
  house(g, { team, variant }) {
    kbox(g, 3.5, 0.35, 3.1, KM.granite, 0, 0.175, 0);
    kbox(g, 3.4, 0.12, 0.7, KM.darkplanks, 0, 0.41, 1.2);
    eaBody(g, { w: 3.0, d: 2.4, h: 1.8, y0: 0.35, cz: -0.2, door: { x: variant === 1 ? 0.6 : -0.5, w: 0.9, h: 1.45 } });
    if (variant === 2) eaRoof(g, { w: 3.0, d: 2.4, h: 1.2, y0: 2.15, cz: -0.2, z: -0.2, over: 0.5, lift: 0.22 });
    else {
      // Minka: gran teulada de palla amb carener de teula
      hipRoof(g, { w: 3.0, d: 2.4, h: 1.8, over: 0.55, y0: 2.15, z: -0.2, roofMat: KM.thatch, curve: 1.15, ridge: 0 });
      kbox(g, 1.3, 0.3, 0.5, KM.kawara, 0, 3.98, -0.2);
      kgable(g, 0.9, 0.5, KM.darkwood, 0.72, 3.58, -0.2, Math.PI / 2);
      kgable(g, 0.9, 0.5, KM.darkwood, -0.72, 3.58, -0.2, -Math.PI / 2);
    }
    kNoren(g, team, variant === 1 ? 0.6 : -0.5, 1.8, 1.02, 0.9);
    kBarrel(g, 1.45, 1.35, 0.8);
    if (variant !== 2) kLogPile(g, -1.9, -0.3, Math.PI / 2, 2, 1.2);
    return 4.2;
  },
  lumbercamp(g, { team }) {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) kbox(g, 0.16, 2.2, 0.16, KM.darkwood, sx * 1.9, 1.1, -0.9 + sz * 1.2);
    kbox(g, 3.8, 1.8, 0.1, KM.darkplanks, 0, 1.0, -2.05);
    eaRoof(g, { w: 3.8, d: 2.4, h: 0.9, y0: 2.2, z: -0.9, over: 0.45, lift: 0.25 });
    kLogPile(g, -0.8, -1.0, 0, 4, 1.8);
    kLogPile(g, 1.2, -1.0, 0, 3, 1.4);
    kSawhorse(g, 0.5, 1.3, 0.2);
    kLogPile(g, -1.8, 1.4, Math.PI / 2, 2, 1.2);
    kNobori(g, team, 2.1, 1.8, 3.2);
    return 3.6;
  },
  miningcamp(g, { team }) {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) kbox(g, 0.16, 2.2, 0.16, KM.darkwood, sx * 1.9, 1.1, -0.9 + sz * 1.2);
    kbox(g, 3.8, 1.8, 0.1, KM.darkplanks, 0, 1.0, -2.05);
    eaRoof(g, { w: 3.8, d: 2.4, h: 0.9, y0: 2.2, z: -0.9, over: 0.45, lift: 0.25 });
    kOrePile(g, -1.0, -1.0, KM.gold, 9, 1.2);
    kOrePile(g, 1.1, -1.0, KM.granite, 9, 1.3);
    kCart(g, 1.3, 1.4, 0.5, 'gold');
    kCart(g, -1.1, 1.5, -0.3, 'stone');
    kNobori(g, team, -2.1, 0.3, 3.2);
    return 3.6;
  },
  mill(g, { team }) {
    kbox(g, 3.4, 0.3, 2.8, KM.granite, -0.5, 0.15, -0.5);
    eaBody(g, { w: 3.0, d: 2.4, h: 2.0, y0: 0.3, cx: -0.5, cz: -0.5, door: { x: -0.4, w: 0.9, h: 1.5 } });
    hipRoof(g, { w: 3.0, d: 2.4, h: 1.6, over: 0.5, y0: 2.3, x: -0.5, z: -0.5, roofMat: KM.thatch, curve: 1.15, ridge: 0 });
    kbox(g, 1.3, 0.28, 0.45, KM.kawara, -0.5, 3.95, -0.5);
    // Roda hidràulica de fusta
    kbox(g, 0.25, 1.9, 0.25, KM.darkwood, 1.55, 0.95, 0.7);
    const wheel = animPart(g, 'blades', 1.55, 1.4, 1.0);
    kcyl(wheel, 1.15, 1.15, 0.1, 20, KM.darkwood, 0, 0, 0.12, [Math.PI / 2, 0, 0], true);
    kcyl(wheel, 1.15, 1.15, 0.1, 20, KM.darkwood, 0, 0, -0.12, [Math.PI / 2, 0, 0], true);
    kcyl(wheel, 0.15, 0.15, 0.4, 8, KM.darkwood, 0, 0, 0, [Math.PI / 2, 0, 0]);
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2;
      kbox(wheel, 0.05, 2.25, 0.05, KM.darkwood, 0, 0, 0, [0, 0, a]);
      kbox(wheel, 0.26, 0.05, 0.32, KM.palewood, Math.cos(a) * 1.15, Math.sin(a) * 1.15, 0, [0, 0, a + Math.PI / 2]);
    }
    kSack(g, -1.8, 1.3, 1, 0xd8c8a0); kSack(g, -1.4, 1.6, 0.85, 0xd8c8a0);
    kNobori(g, team, -2.2, -1.9, 3.0);
    return 4.3;
  },
  market(g, { team }) {
    kbox(g, 5.8, 0.1, 5.8, KM.granite, 0, 0.05, 0);
    [[-1.6, -1.5, 0], [1.6, -1.5, 0], [-1.6, 1.6, Math.PI], [1.6, 1.6, Math.PI]].forEach(([x, z, ry], i) => {
      const st = new THREE.Group();
      st.position.set(x, 0, z); st.rotation.y = ry;
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) kbox(st, 0.1, 2.0, 0.1, KM.darkwood, sx * 0.9, 1.0, sz * 0.55);
      kbox(st, 1.8, 0.7, 0.8, KM.darkplanks, 0, 0.35, -0.1);
      eaRoof(st, { w: 1.9, d: 1.2, h: 0.55, y0: 2.0, over: 0.3, lift: 0.14 });
      kNoren(st, team, 0, 1.95, 0.62, 1.7);
      if (i % 2) kBarrel(st, 0.5, 0.2, 0.7); else kSack(st, -0.5, 0.2, 0.7, 0xd8c8a0);
      kbox(st, 0.35, 0.2, 0.3, i % 2 ? KM.gold : mat(0x8a3a2a), -0.3, 0.8, 0);
      g.add(st);
    });
    kLantern(g, 0, 0);
    kNobori(g, team, -2.7, 0, 3.4);
    kNobori(g, team, 2.7, 0, 3.4);
    return 4.0;
  },
  barracks(g, { team }) {
    // Dojo: sala elevada amb gran teulada corba
    eaStoneBase(g, 6.4, 3.6, 0.6, 0, -1.5);
    kbox(g, 6.2, 0.14, 3.6, KM.darkplanks, 0, 0.67, -1.5);
    eaBody(g, { w: 5.4, d: 2.8, h: 2.1, y0: 0.74, cz: -1.6, panel: KM.paper, lower: false, door: { x: 0, w: 1.8, h: 1.7 } });
    eaRoof(g, { w: 5.4, d: 2.8, h: 1.6, y0: 2.84, z: -1.6, over: 0.65, lift: 0.4 });
    kbox(g, 1.6, 0.35, 0.5, KM.granite, 0, 0.18, 0.5);
    // Pati amb tanca de bambú
    kbox(g, 6.4, 0.05, 3.0, KM.dirt, 0, 0.025, 1.8);
    kBamboo(g, -3.1, 0.4, -3.1, 3.2);
    kBamboo(g, 3.1, 0.4, 3.1, 3.2);
    kBamboo(g, -3.1, 3.2, -0.9, 3.2);
    kBamboo(g, 0.9, 3.2, 3.1, 3.2);
    kWeaponRack(g, team, -2.4, 1.6, Math.PI / 2, false, KM.darkwood);
    kcyl(g, 0.12, 0.12, 1.4, 8, KM.straw, 1.0, 0.7, 1.6);
    kcyl(g, 0.12, 0.12, 1.4, 8, KM.straw, 1.6, 0.7, 1.9);
    kTarget(g, team, 2.3, 2.5, -0.4);
    kNobori(g, team, -1.2, 3.0, 4.0);
    kNobori(g, team, 1.2, 3.0, 4.0);
    kNobori(g, team, 2.8, -3.0, 4.0);
    return 5.4;
  },
  stable(g, { team }) {
    kbox(g, 5.8, 0.3, 2.8, KM.granite, 0, 0.15, -1.4);
    kbox(g, 5.4, 2.0, 2.4, KM.darkplanks, 0, 1.3, -1.4);
    for (let i = 0; i <= 4; i++) kbox(g, 0.16, 2.0, 0.16, KM.darkwood, -2.7 + i * 1.35, 1.3, -0.18);
    for (let i = 0; i < 3; i++) kopening(g, 1.0, 1.4, -1.8 + i * 1.8, 0.3, -0.2, 0, 'flat');
    eaRoof(g, { w: 5.4, d: 2.4, h: 1.2, y0: 2.3, z: -1.4, over: 0.55, lift: 0.3 });
    kRailFence(g, -2.8, 0.4, -2.8, 2.8, 1.0, KM.darkwood);
    kRailFence(g, 2.8, 0.4, 2.8, 2.8, 1.0, KM.darkwood);
    kRailFence(g, -2.8, 2.8, -0.8, 2.8, 1.0, KM.darkwood);
    kRailFence(g, 0.8, 2.8, 2.8, 2.8, 1.0, KM.darkwood);
    kHay(g, 1.6, 1.2, 0.2); kHay(g, 2.0, 1.9, 1.3);
    kbox(g, 1.3, 0.35, 0.45, KM.darkplanks, -1.5, 0.3, 1.2);
    kbox(g, 1.2, 0.05, 0.36, mat(0x4a6a7a, { roughness: 0.2 }), -1.5, 0.46, 1.2);
    kNobori(g, team, -2.5, 2.4, 3.4);
    return 4.2;
  },
  blacksmith(g, { team }) {
    kbox(g, 4.2, 0.3, 3.2, KM.granite, 0, 0.15, -0.9);
    eaBody(g, { w: 3.6, d: 2.6, h: 2.2, y0: 0.3, cz: -0.9, door: { x: -0.8, w: 1.0, h: 1.6 } });
    eaRoof(g, { w: 3.6, d: 2.6, h: 1.3, y0: 2.5, z: -0.9, over: 0.5, lift: 0.3 });
    kcyl(g, 0.3, 0.36, 1.4, 8, mat(0x6a5a4a, { roughness: 0.9 }), 1.2, 3.4, -1.6);
    for (const sx of [-1, 1]) kbox(g, 0.12, 1.8, 0.12, KM.darkwood, sx * 1.6, 0.9, 1.7);
    kbox(g, 3.4, 0.1, 1.6, KM.kawara, 0, 1.95, 1.1, [-0.25, 0, 0]);
    kbox(g, 1.1, 0.7, 0.8, KM.granite, 0.9, 0.35, 1.1);
    kbox(g, 0.8, 0.12, 0.5, KM.glow, 0.9, 0.72, 1.1).userData.noShadow = true;
    kAnvil(g, -0.3, 1.4, 0.4);
    kBarrel(g, -1.3, 1.6, 0.8);
    kNobori(g, team, -2.0, 2.1, 3.2);
    return 4.9;
  },
  watchtower(g, { team }) {
    eaStoneBase(g, 2.9, 2.9, 1.6);
    eaBody(g, { w: 2.2, d: 2.2, h: 2.4, y0: 1.6, lower: false });
    kopening(g, 0.5, 0.5, 0, 2.6, 1.11, 0, 'flat');
    eaRoof(g, { w: 2.2, d: 2.2, h: 0.5, y0: 4.0, over: 0.35, lift: 0.18 });
    eaBody(g, { w: 1.8, d: 1.8, h: 1.5, y0: 4.4, lower: false });
    for (let k = 0; k < 4; k++) kopening(g, 1.0, 0.5, Math.sin(k * Math.PI / 2) * 0.91, 5.1, Math.cos(k * Math.PI / 2) * 0.91, k * Math.PI / 2, 'flat');
    eaRoof(g, { w: 1.8, d: 1.8, h: 1.5, y0: 5.9, over: 0.55, lift: 0.3 });
    kNobori(g, team, 1.3, 1.3, 2.8);
    return 7.8;
  },
  castle(g, { team }) {
    // Torre principal (tenshu) de diversos pisos sobre un gran sòcol de granit
    eaStoneBase(g, 9.8, 9.8, 2.4);
    for (const [x, z, w, d] of [[0, 4.5, 8.4, 0.5], [0, -4.5, 8.4, 0.5], [4.5, 0, 0.5, 8.4], [-4.5, 0, 0.5, 8.4]]) {
      kbox(g, w, 1.2, d, KM.whiteplaster, x, 3.0, z);
      hipRoof(g, { w: w + 0.2, d: d + 0.2, h: 0.3, over: 0.2, y0: 3.6, x, z, roofMat: KM.kawara, ridge: 0 });
    }
    eaBody(g, { w: 6.4, d: 5.6, h: 2.3, y0: 2.4, lower: false });
    eaRoof(g, { w: 6.4, d: 5.6, h: 1.1, y0: 4.7, over: 0.7, lift: 0.4 });
    eaBody(g, { w: 5.0, d: 4.3, h: 1.9, y0: 5.5, lower: false });
    eaRoof(g, { w: 5.0, d: 4.3, h: 1.0, y0: 7.4, over: 0.6, lift: 0.38 });
    eaBody(g, { w: 3.6, d: 3.0, h: 1.7, y0: 8.1, lower: false });
    for (const x of [-0.9, 0, 0.9]) kbox(g, 0.5, 0.8, 0.05, KM.paper, x, 9.0, 1.53);
    eaRoof(g, { w: 3.6, d: 3.0, h: 1.6, y0: 9.8, over: 0.65, lift: 0.45, gold: true });
    // Frontons corbats (chidori-hafu) a la façana
    for (const [y, w] of [[4.9, 2.4], [7.6, 1.8]]) kgable(g, w, 0.9, KM.whiteplaster, 0, y, 2.9 - (y > 6 ? 0.7 : 0), 0);
    // Portalada i banderes
    kbox(g, 2.4, 0.3, 1.6, KM.granite, 0, 0.15, 5.2);
    for (const sx of [-1, 1]) kbox(g, 0.22, 2.8, 0.22, KM.darkwood, sx * 0.9, 1.4, 5.0);
    eaRoof(g, { w: 2.4, d: 0.8, h: 0.4, y0: 2.8, z: 5.0, over: 0.3, lift: 0.15 });
    for (const [x, z] of [[-4.6, 4.9], [4.6, 4.9], [-4.6, -4.9], [4.6, -4.9]]) kNobori(g, team, x, z, 5.4);
    kNoren(g, team, 0, 2.6, 5.12, 1.6);
    return 13.0;
  },
  archeryrange(g, { team }) {
    // Kyūdōjō: sala de tir oberta i dianes (mato) al fons
    kbox(g, 5.8, 0.4, 2.4, KM.granite, 0, 0.2, -1.6);
    kbox(g, 5.6, 0.1, 2.2, KM.darkplanks, 0, 0.45, -1.6);
    for (let i = 0; i < 5; i++) kbox(g, 0.16, 2.0, 0.16, KM.darkwood, -2.6 + i * 1.3, 1.4, -0.6);
    kbox(g, 5.6, 1.8, 0.1, KM.whiteplaster, 0, 1.4, -2.65);
    eaRoof(g, { w: 5.6, d: 2.2, h: 1.0, y0: 2.4, z: -1.6, over: 0.5, lift: 0.3 });
    kbox(g, 5.8, 0.04, 3.0, KM.dirt, 0, 0.02, 1.4);
    kBamboo(g, -2.9, 0.2, -2.9, 2.9, 1.0); kBamboo(g, 2.9, 0.2, 2.9, 2.9, 1.0);
    for (const x of [-1.6, 0, 1.6]) {
      kbox(g, 1.0, 1.0, 0.3, KM.dirt, x, 0.5, 2.8);
      kcyl(g, 0.28, 0.28, 0.05, 16, mat(0xf0ece0), x, 0.6, 2.6, [Math.PI / 2, 0, 0]);
      kcyl(g, 0.16, 0.16, 0.055, 16, mat(0x1a1a1a), x, 0.6, 2.6, [Math.PI / 2, 0, 0]);
    }
    kNobori(g, team, 2.6, 0.4, 3.4);
    return 4.2;
  },
  university(g, { team }) {
    eaStoneBase(g, 5.8, 5.2, 0.6, 0, -0.3);
    eaBody(g, { w: 4.8, d: 4.0, h: 2.2, y0: 0.6, cz: -0.3, door: { x: 0, w: 1.4, h: 1.6 } });
    eaRoof(g, { w: 4.8, d: 4.0, h: 1.0, y0: 2.8, z: -0.3, over: 0.6, lift: 0.35 });
    eaBody(g, { w: 3.4, d: 2.8, h: 1.5, y0: 3.4, cz: -0.3, lower: false });
    eaRoof(g, { w: 3.4, d: 2.8, h: 1.4, y0: 4.9, z: -0.3, over: 0.6, lift: 0.4, gold: true });
    kLantern(g, -1.8, 2.3); kLantern(g, 1.8, 2.3);
    kNobori(g, team, 2.6, -2.6, 3.8);
    return 6.8;
  },
  siegeworkshop(g, { team }) {
    kbox(g, 6.6, 0.3, 3.8, KM.granite, 0, 0.15, -1.5);
    kbox(g, 6.0, 2.4, 0.2, KM.darkplanks, 0, 1.5, -3.2);
    for (const sx of [-1, 1]) kbox(g, 0.2, 2.4, 3.4, KM.darkplanks, sx * 3.0, 1.5, -1.5);
    for (const x of [-3.0, -1, 1, 3.0]) kbox(g, 0.18, 2.6, 0.18, KM.darkwood, x, 1.6, 0.2);
    eaRoof(g, { w: 6.2, d: 3.6, h: 1.4, y0: 2.8, z: -1.5, over: 0.55, lift: 0.35 });
    kRamFrame(g, -1.2, -1.4, Math.PI / 2, KM.darkwood);
    kWheelProp(g, 1.8, 1.4, 0.6, false, KM.darkwood); kWheelProp(g, 2.5, 2.2, 0.55, true, KM.darkwood);
    kLogPile(g, -1.8, 2.0, 0, 3, 1.8);
    kNobori(g, team, 3.0, 2.8, 3.8);
    return 4.6;
  },
  stonewall(g) {
    eaStoneBase(g, 1.04, 1.04, 1.1);
    kbox(g, 0.8, 1.4, 0.8, KM.whiteplaster, 0, 1.8, 0);
    kbox(g, 0.84, 0.1, 0.84, KM.darkwood, 0, 2.5, 0);
    hipRoof(g, { w: 1.0, d: 1.0, h: 0.35, over: 0.12, y0: 2.52, roofMat: KM.kawara, ridge: 0 });
    return 3.0;
  },
  gate(g, { team }) {
    for (const sx of [-1, 1]) {
      eaStoneBase(g, 0.8, 1.0, 0.9, sx * 1.15, 0);
      kbox(g, 0.6, 2.2, 0.8, KM.whiteplaster, sx * 1.15, 2.0, 0);
    }
    for (const sx of [-1, 1]) kbox(g, 0.22, 3.1, 0.22, KM.darkwood, sx * 0.78, 1.55, 0);
    kbox(g, 1.8, 0.2, 0.26, KM.darkwood, 0, 3.0, 0);
    eaRoof(g, { w: 3.0, d: 1.0, h: 0.6, y0: 3.12, over: 0.35, lift: 0.22 });
    kNoren(g, team, 0, 2.85, 0.14, 1.3);
    for (const sx of [-1, 1]) {
      const door = animPart(g, 'doors', sx * 0.66, 0, 0);
      kbox(door, 0.66, 2.6, 0.08, KM.darkplanks, -sx * 0.33, 1.3, 0);
      kbox(door, 0.68, 0.06, 0.1, KM.iron, -sx * 0.33, 0.9, 0);
      kbox(door, 0.68, 0.06, 0.1, KM.iron, -sx * 0.33, 1.9, 0);
    }
    return 4.1;
  },
};
