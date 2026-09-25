/* =====================================================================
   ARQUITECTURA OCCIDENTAL (Francs): sòcols de pedra, entramat de fusta,
   arrebossat, teulades de palla i estendards
   ===================================================================== */

/* Paret d'entramat: bigues sobre la cara d'un cos (local: cara cap a +Z, amplada w, alçada h) */
function timberFace(g, { w, h, y0, px, pz, rotY, door = null, windows = [] }) {
  const f = new THREE.Group();
  f.position.set(px, 0, pz);
  f.rotation.y = rotY;
  const T = KM.timber, e = 0.035;
  const posts = Math.max(2, Math.round(w / 1.1) + 1);
  for (let i = 0; i < posts; i++) {
    const x = -w / 2 + 0.06 + (w - 0.12) * i / (posts - 1);
    if (door && Math.abs(x - door.x) < door.w / 2 + 0.05) continue;
    kbox(f, 0.13, h, 0.1, T, x, y0 + h / 2, e);
  }
  kbox(f, w + 0.04, 0.14, 0.11, T, 0, y0 + 0.07, e);
  kbox(f, w + 0.04, 0.14, 0.11, T, 0, y0 + h - 0.07, e);
  kbox(f, w, 0.1, 0.1, T, 0, y0 + h * 0.52, e);
  const bw = (w - 0.12) / (posts - 1), bh = h * 0.5;
  const diag = Math.hypot(bw, bh), ang = Math.atan2(bh, bw);
  for (const sx of [-1, 1]) {
    const cx = sx * (w / 2 - 0.06 - bw / 2);
    if (door && Math.abs(cx - door.x) < door.w / 2 + bw / 2) continue;
    kbox(f, diag, 0.1, 0.09, T, cx, y0 + h * 0.52 + bh / 2, e, [0, 0, sx * ang]);
  }
  if (door) {
    kbox(f, door.w + 0.24, door.h + 0.12, 0.12, T, door.x, y0 + door.h / 2 + 0.03, e + 0.01);
    kbox(f, door.w, door.h, 0.08, KM.planks, door.x, y0 + door.h / 2, e + 0.04);
    kbox(f, door.w * 0.8, 0.06, 0.04, KM.iron, door.x, y0 + door.h * 0.72, e + 0.1);
    kbox(f, door.w * 0.8, 0.06, 0.04, KM.iron, door.x, y0 + door.h * 0.28, e + 0.1);
  }
  for (const wn of windows) {
    const wy = y0 + (wn.y ?? h * 0.62);
    kbox(f, wn.w + 0.16, wn.h + 0.16, 0.1, T, wn.x, wy, e + 0.01);
    kbox(f, wn.w, wn.h, 0.06, KM.dark, wn.x, wy, e + 0.03);
    for (const sx of [-1, 1]) kbox(f, wn.w * 0.5, wn.h, 0.05, KM.planks, wn.x + sx * wn.w * 0.78, wy, e + 0.05, [0, sx * 0.35, 0]);
  }
  g.add(f);
  return f;
}
/* Cos arrebossat amb entramat a les quatre cares, centrat a (cx, cz) */
function timberBody(g, { w, d, h, y0, cx = 0, cz = 0, front = {}, back = {}, left = {}, right = {} }) {
  kbox(g, w, h, d, KM.plaster, cx, y0 + h / 2, cz);
  timberFace(g, { w, h, y0, px: cx, pz: cz + d / 2, rotY: 0, ...front });
  timberFace(g, { w, h, y0, px: cx, pz: cz - d / 2, rotY: Math.PI, ...back });
  timberFace(g, { w: d, h, y0, px: cx + w / 2, pz: cz, rotY: Math.PI / 2, ...right });
  timberFace(g, { w: d, h, y0, px: cx - w / 2, pz: cz, rotY: -Math.PI / 2, ...left });
}
/* Cobert obert: pilars i teulada de palla a dues aigües */
function openShed(g, { w, d, h, x = 0, z = 0, back = true, roofH = 1.1 }) {
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) kcyl(g, 0.1, 0.12, h, 7, KM.timber, x + sx * (w / 2 - 0.1), h / 2, z + sz * (d / 2 - 0.1));
  for (const sz of [-1, 1]) kbox(g, w, 0.14, 0.14, KM.timber, x, h - 0.07, z + sz * (d / 2 - 0.1));
  if (back) kbox(g, w - 0.2, h - 0.2, 0.1, KM.planks, x, (h - 0.2) / 2 + 0.1, z - d / 2 + 0.12);
  gableRoof(g, { w, d, h: roofH, over: 0.3, t: 0.18, y0: h, x, z, gableMat: KM.planks, frame: false });
}

ARCH.western = {
  towncenter(g, { team }) {
    kbox(g, 12.8, 0.5, 12.8, KM.stone, 0, 0.25, 0);
    kbox(g, 7.2, 2.5, 7.2, KM.stone, 0, 1.75, 0);
    timberBody(g, {
      w: 7.0, d: 7.0, h: 2.3, y0: 3.0,
      front: { windows: [{ x: -2.2, w: 0.6, h: 0.55 }, { x: 0, w: 0.6, h: 0.55 }, { x: 2.2, w: 0.6, h: 0.55 }] },
      back: { windows: [{ x: -1.5, w: 0.6, h: 0.55 }, { x: 1.5, w: 0.6, h: 0.55 }] },
      left: { windows: [{ x: 0, w: 0.6, h: 0.55 }] },
      right: { windows: [{ x: 0, w: 0.6, h: 0.55 }] },
    });
    hipRoof(g, { w: 7.0, d: 7.0, h: 3.2, over: 0.55, y0: 5.3 });
    // Campanar de fusta al capdamunt
    kbox(g, 1.3, 1.1, 1.3, KM.timber, 0, 8.6, 0);
    kopening(g, 0.6, 0.8, 0, 8.2, 0.65, 0, 'round');
    kopening(g, 0.6, 0.8, 0, 8.2, -0.65, Math.PI, 'round');
    kcyl(g, 0.22, 0.3, 0.4, 10, mat(0x8a6a2a, { metalness: 0.7, roughness: 0.4 }), 0, 8.5, 0);
    hipRoof(g, { w: 1.3, d: 1.3, h: 1.1, over: 0.2, y0: 9.15 });
    // Porxo perimetral: pilars i una teulada de palla contínua al voltant de la sala
    const R = 5.8;
    for (let k = 0; k < 4; k++) {
      const side = new THREE.Group();
      side.rotation.y = k * Math.PI / 2;
      for (let i = -3; i <= 3; i++) if (!(k === 0 && Math.abs(i) < 1)) kcyl(side, 0.12, 0.14, 2.45, 8, KM.timber, i * 1.9, 0.5 + 1.22, R);
      kbox(side, 11.8, 0.16, 0.16, KM.timber, 0, 2.95, R);
      g.add(side);
    }
    hipRoof(g, { w: 11.6, d: 11.6, h: 3.4, over: 0.4, y0: 2.95, ridge: 0 });
    // Entrada principal amb frontó
    kbox(g, 2.6, 0.3, 1.6, KM.stone, 0, 0.15, 6.7);
    kopening(g, 1.7, 2.3, 0, 0.5, 3.6, 0, 'round', KM.stone);
    kbox(g, 2.4, 0.18, 0.18, KM.timber, 0, 3.4, R + 0.1);
    gableRoof(g, { w: 2.6, d: 2.2, h: 1.2, over: 0.2, t: 0.18, y0: 3.3, z: R - 0.3, gableMat: KM.plaster });
    kBanner(g, team, -1.9, R + 0.35, 4.6);
    kBanner(g, team, 1.9, R + 0.35, 4.6, Math.PI);
    // Provisions i pou
    kWell(g, 4.4, 4.4, KM.stone, KM.thatch);
    kBarrel(g, -4.8, 4.2); kBarrel(g, -4.3, 4.7, 0.9); kCrate(g, -4.9, 3.4, 0.9, 0.3);
    kSack(g, 4.9, -4.6); kSack(g, 4.4, -4.9, 0.9); kLogPile(g, -4.6, -4.4, Math.PI / 4);
    return 9.8;
  },
  house(g, { team, variant }) {
    const flip = variant % 2 ? -1 : 1;
    kbox(g, 3.5, 0.4, 2.9, KM.stone, 0, 0.2, 0);
    timberBody(g, {
      w: 3.1, d: 2.5, h: 1.85, y0: 0.4,
      front: { door: { x: -0.55 * flip, w: 0.75, h: 1.35 }, windows: [{ x: 0.75 * flip, w: 0.5, h: 0.45 }] },
      back: { windows: [{ x: 0, w: 0.5, h: 0.45 }] },
      right: { windows: variant === 2 ? [{ x: 0, w: 0.45, h: 0.4 }] : [] },
    });
    gableRoof(g, { w: 3.1, d: 2.5, h: 1.45, over: 0.38, y0: 2.25 });
    kbox(g, 0.5, 1.9, 0.5, KM.stone, 1.05 * flip, 3.3, -0.55);
    kbox(g, 0.6, 0.12, 0.6, KM.stone, 1.05 * flip, 4.28, -0.55);
    kbox(g, 1.05, 0.05, 0.55, KM.team(team), -0.55 * flip, 1.95, 1.5, [0.35, 0, 0]);
    if (variant !== 1) kLogPile(g, 1.95 * flip, 0.3, Math.PI / 2);
    kBarrel(g, 1.2 * flip, 1.55, 0.9);
    if (variant === 1) kCrate(g, -1.75, -1.1, 0.9, 0.4);
    return 4.4;
  },
  lumbercamp(g, { team }) {
    openShed(g, { w: 4.2, d: 2.8, h: 2.2, z: -0.9 });
    kLogPile(g, -0.9, -1.0, 0, 4, 1.8);
    kLogPile(g, 1.2, -0.9, 0, 3, 1.5);
    kSawhorse(g, 0.6, 1.3, 0.3);
    kcyl(g, 0.34, 0.38, 0.5, 10, KM.bark, -1.4, 0.25, 1.4);
    kbox(g, 0.05, 0.55, 0.05, KM.timber, -1.4, 0.72, 1.4, [0, 0, 0.4]);
    kbox(g, 0.05, 0.18, 0.28, KM.iron, -1.52, 0.95, 1.4, [0, 0, 0.4]);
    kLogPile(g, 2.0, 1.6, Math.PI / 2, 3, 1.4);
    kBanner(g, team, -2.1, 1.9, 3.0);
    return 3.5;
  },
  miningcamp(g, { team }) {
    openShed(g, { w: 4.2, d: 2.8, h: 2.2, z: -0.9 });
    kOrePile(g, -1.0, -1.0, KM.gold, 9, 1.2);
    kOrePile(g, 1.1, -1.0, KM.stone, 9, 1.3);
    kCart(g, 1.3, 1.3, 0.5, 'gold');
    kCart(g, -1.1, 1.5, -0.3, 'stone');
    kCrate(g, 2.0, -2.0, 0.8); kBarrel(g, -2.0, -2.0, 0.8);
    kBanner(g, team, -2.2, 0.4, 3.0);
    return 3.5;
  },
  mill(g, { team }) {
    kcyl(g, 1.7, 1.9, 0.7, 10, KM.stone, 0, 0.35, -0.3);
    timberBody(g, { w: 2.6, d: 2.3, h: 3.1, y0: 0.7, cz: -0.3, front: { windows: [{ x: 0.6, w: 0.45, h: 0.45 }] }, left: { door: { x: 0, w: 0.75, h: 1.4 } } });
    gableRoof(g, { w: 2.6, d: 2.3, h: 1.3, over: 0.25, y0: 3.8, z: -0.3 });
    kbox(g, 0.3, 0.3, 0.6, KM.timber, 0, 3.2, 0.95);
    const blades = animPart(g, 'blades', 0, 3.2, 1.28);
    kcyl(blades, 0.22, 0.22, 0.3, 10, KM.timber, 0, 0, 0, [Math.PI / 2, 0, 0]);
    for (let k = 0; k < 4; k++) {
      const arm = new THREE.Group();
      arm.rotation.z = k * Math.PI / 2;
      kbox(arm, 0.1, 2.9, 0.1, KM.timber, 0, 1.45, 0.1);
      kbox(arm, 0.62, 2.2, 0.03, KM.cloth(0xe6dcc2), 0.34, 1.65, 0.12);
      for (let i = 0; i < 4; i++) kbox(arm, 0.66, 0.04, 0.05, KM.timber, 0.34, 0.65 + i * 0.66, 0.14);
      blades.add(arm);
    }
    kSack(g, 1.6, 1.5); kSack(g, 2.0, 1.1, 0.9); kSack(g, 1.2, 1.9, 0.85);
    kCart(g, -1.6, 1.6, 0.4);
    kBanner(g, team, -2.1, -1.8, 2.8);
    return 6.8;
  },
  market(g, { team }) {
    kbox(g, 5.8, 0.12, 5.8, KM.dirt, 0, 0.06, 0);
    timberBody(g, { w: 5.0, d: 2.2, h: 2.1, y0: 0, cz: -1.7, front: { door: { x: 0, w: 1.0, h: 1.5 }, windows: [{ x: -1.6, w: 0.5, h: 0.45 }, { x: 1.6, w: 0.5, h: 0.45 }] } });
    gableRoof(g, { w: 5.0, d: 2.2, h: 1.3, over: 0.35, y0: 2.1, z: -1.7 });
    for (const [sx, sz, ry, c] of [[-1.55, 1.3, 0, team], [1.55, 1.3, 0, 0]]) {
      const st = new THREE.Group();
      st.position.set(sx, 0, sz); st.rotation.y = ry;
      kbox(st, 1.9, 0.85, 0.9, KM.planks, 0, 0.43, 0);
      for (const px of [-0.85, 0.85]) for (const pz of [-0.4, 0.4]) kbox(st, 0.08, 2.0, 0.08, KM.timber, px, 1.0, pz);
      for (let k = 0; k < 4; k++) kbox(st, 0.5, 0.05, 1.3, k % 2 ? KM.cloth(0xeee4cc) : (c ? KM.team(team) : KM.cloth(0x9a3a2a)), -0.72 + k * 0.48, 2.05, 0.05, [0.3, 0, 0]);
      kbox(st, 0.3, 0.22, 0.3, KM.gold, -0.45, 0.97, 0.1);
      kSack(st, 0.4, 0.05, 0.6, 0xc8a060);
      g.add(st);
    }
    kBarrel(g, 2.5, -0.1); kBarrel(g, 2.2, 0.35, 0.85); kCrate(g, -2.5, -0.1, 0.8, 0.3); kSack(g, -2.2, 0.4);
    kBanner(g, team, 0, 2.6, 3.4);
    return 4.8;
  },
  barracks(g, { team }) {
    const hz = -1.45;
    kbox(g, 6.4, 0.45, 3.5, KM.stone, 0, 0.225, hz);
    kbox(g, 6.0, 0.8, 3.1, KM.stone, 0, 0.85, hz);
    timberBody(g, {
      w: 6.0, d: 3.1, h: 1.6, y0: 1.25, cz: hz,
      front: { windows: [{ x: -1.9, w: 0.5, h: 0.45 }, { x: 1.9, w: 0.5, h: 0.45 }] },
      back: { windows: [{ x: -1.4, w: 0.5, h: 0.45 }, { x: 1.4, w: 0.5, h: 0.45 }] },
    });
    kbox(g, 1.7, 2.15, 0.2, KM.timber, 0, 1.52, hz + 1.6);
    kbox(g, 1.4, 1.95, 0.1, KM.planks, 0, 1.42, hz + 1.66);
    kbox(g, 0.05, 1.95, 0.12, KM.dark, 0, 1.42, hz + 1.68);
    kbox(g, 1.9, 0.18, 0.22, KM.stone, 0, 0.54, hz + 1.9);
    gableRoof(g, { w: 6.0, d: 3.1, h: 1.65, over: 0.45, y0: 2.85, z: hz });
    kbox(g, 6.3, 0.06, 3.0, KM.dirt, 0, 0.03, 1.75);
    kStakeFence(g, -3.1, 0.4, -3.1, 3.2);
    kStakeFence(g, 3.1, 0.4, 3.1, 3.2);
    kStakeFence(g, -3.1, 3.2, -0.9, 3.2);
    kStakeFence(g, 0.9, 3.2, 3.1, 3.2);
    for (const [px, ph] of [[-2.95, 2.25], [-1.7, 1.75]]) for (const pz of [0.55, 2.55]) kcyl(g, 0.07, 0.08, ph, 6, KM.timber, px, ph / 2, pz);
    for (const [px, ph] of [[-2.95, 2.25], [-1.7, 1.75]]) kbox(g, 0.12, 0.12, 2.2, KM.timber, px, ph, 1.55);
    kbox(g, 1.75, 0.16, 2.6, KM.thatch, -2.3, 2.1, 1.55, [0, 0, -0.38]);
    kWeaponRack(g, team, -2.55, 1.55, Math.PI / 2);
    kDummy(g, 1.2, 1.6);
    kTarget(g, team, 2.3, 2.3);
    kBanner(g, team, -1.3, 3.0, 3.8);
    kBanner(g, team, 2.75, 3.0, 3.8);
    kBarrel(g, 2.65, 0.75); kBarrel(g, 2.2, 0.62, 0.85);
    kCrate(g, -0.9, 0.75, 0.85, 0.3); kCrate(g, -0.95, 1.35, 0.7, 0.9);
    return 5.4;
  },
  stable(g, { team }) {
    const hz = -1.3;
    kbox(g, 5.7, 0.3, 2.9, KM.stone, 0, 0.15, hz);
    kbox(g, 5.4, 2.0, 2.6, KM.planks, 0, 1.3, hz);
    for (const sx of [-1, 1]) kbox(g, 0.14, 2.0, 2.7, KM.timber, sx * 2.7, 1.3, hz);
    for (let i = 0; i < 3; i++) {
      const x = -1.8 + i * 1.8;
      kopening(g, 1.1, 1.5, x, 0.3, hz + 1.3, 0, 'flat', KM.timber);
      kbox(g, 1.1, 0.75, 0.08, KM.planks, x, 0.68, hz + 1.38);
    }
    gableRoof(g, { w: 5.4, d: 2.6, h: 1.4, over: 0.5, y0: 2.3, z: hz, gableMat: KM.planks, frame: false });
    kRailFence(g, -2.8, 0.4, -2.8, 2.8);
    kRailFence(g, 2.8, 0.4, 2.8, 2.8);
    kRailFence(g, -2.8, 2.8, -0.8, 2.8);
    kRailFence(g, 0.8, 2.8, 2.8, 2.8);
    kHay(g, 1.6, 1.2, 0.2); kHay(g, 2.0, 1.9, 1.3);
    kbox(g, 1.3, 0.35, 0.45, KM.planks, -1.5, 0.3, 1.2);
    kbox(g, 1.2, 0.05, 0.36, mat(0x4a6a7a, { roughness: 0.2 }), -1.5, 0.46, 1.2);
    kBanner(g, team, -2.4, 2.4, 3.2);
    return 4.2;
  },
  blacksmith(g, { team }) {
    const hz = -0.8;
    kbox(g, 4.0, 0.3, 3.2, KM.stone, 0, 0.15, hz);
    kbox(g, 3.6, 2.4, 2.8, KM.stone, 0, 1.5, hz);
    kopening(g, 0.9, 1.6, -0.9, 0.3, hz + 1.4, 0, 'round', KM.timber);
    kopening(g, 0.5, 0.55, 1.0, 1.4, hz + 1.4, 0, 'flat', KM.timber);
    gableRoof(g, { w: 3.6, d: 2.8, h: 1.4, over: 0.35, y0: 2.7, z: hz, gableMat: KM.stone, frame: false });
    kbox(g, 0.8, 3.4, 0.8, KM.stone, 1.3, 3.0, hz - 0.7);
    kbox(g, 0.95, 0.15, 0.95, KM.stone, 1.3, 4.75, hz - 0.7);
    // Cobert de la fornal
    for (const sx of [-1, 1]) kcyl(g, 0.08, 0.1, 1.9, 7, KM.timber, sx * 1.7, 0.95, 1.9);
    kbox(g, 3.6, 0.14, 1.6, KM.thatch, 0, 2.05, 1.3, [-0.3, 0, 0]);
    kbox(g, 1.1, 0.7, 0.8, KM.stone, 0.9, 0.35, 1.1);
    kbox(g, 0.8, 0.12, 0.5, KM.glow, 0.9, 0.72, 1.1).userData.noShadow = true;
    kAnvil(g, -0.3, 1.4, 0.4);
    kBarrel(g, -1.3, 1.6, 0.8);
    kcyl(g, 0.35, 0.35, 0.1, 12, KM.stone, 1.9, 0.6, -0.2, [0, 0, Math.PI / 2]);
    kBanner(g, team, -1.9, 2.3, 3.0);
    return 5.0;
  },
  watchtower(g, { team }) {
    kbox(g, 2.8, 0.4, 2.8, KM.stone, 0, 0.2, 0);
    kcyl(g, 1.05 * Math.SQRT2, 1.25 * Math.SQRT2, 4.6, 4, KM.stone, 0, 2.7, 0, [0, Math.PI / 4, 0]);
    kopening(g, 0.7, 1.2, 0, 0.4, 1.23, 0, 'round', KM.timber);
    kopening(g, 0.22, 0.6, 0, 3.0, 1.12, 0, 'flat');
    kbox(g, 2.9, 0.2, 2.9, KM.timber, 0, 5.1, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) kbox(g, 0.16, 1.4, 0.16, KM.timber, sx * 1.35, 5.9, sz * 1.35);
    for (let k = 0; k < 4; k++) {
      const s = new THREE.Group(); s.rotation.y = k * Math.PI / 2;
      kbox(s, 2.8, 0.6, 0.08, KM.planks, 0, 5.5, 1.38);
      g.add(s);
    }
    hipRoof(g, { w: 2.8, d: 2.8, h: 1.7, over: 0.35, y0: 6.6 });
    kBanner(g, team, 1.2, 1.3, 2.6);
    return 8.6;
  },
  castle(g, { team }) {
    kbox(g, 9.8, 0.4, 9.8, KM.stone, 0, 0.2, 0);
    // Muralla perimetral amb merlets
    for (const [x, z, w, d] of [[0, 4.2, 6.2, 0.9], [0, -4.2, 6.2, 0.9], [4.2, 0, 0.9, 6.2], [-4.2, 0, 0.9, 6.2]]) {
      kbox(g, w, 4.6, d, KM.stone, x, 2.7, z);
      battlements(g, w, d, 5.0, KM.stone, { x, z, size: 0.36, gap: 0.3, h: 0.5, thick: 0.25 });
    }
    // Torres rodones a les cantonades amb teulada cònica
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const x = sx * 4.1, z = sz * 4.1;
      kcyl(g, 1.35, 1.5, 6.6, 14, KM.stone, x, 3.5, z);
      kcyl(g, 1.5, 1.5, 0.3, 14, KM.stone, x, 6.9, z);
      kcyl(g, 0, 1.65, 2.2, 14, KM.darkplanks, x, 8.15, z);
      kopening(g, 0.22, 0.7, x + sx * 0.02, 4.3, z + sz * 1.36, sz > 0 ? 0 : Math.PI, 'flat');
    }
    // Torre de l'homenatge
    kbox(g, 4.2, 9.6, 4.2, KM.stone, 0, 5.0, -0.3);
    battlements(g, 4.2, 4.2, 9.8, KM.stone, { z: -0.3, size: 0.38, gap: 0.3, h: 0.55, thick: 0.28 });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      kcyl(g, 0.5, 0.5, 1.6, 10, KM.stone, sx * 2.05, 10.4, -0.3 + sz * 2.05);
      kcyl(g, 0, 0.62, 1.1, 10, KM.darkplanks, sx * 2.05, 11.75, -0.3 + sz * 2.05);
    }
    for (const [x, y] of [[-1.0, 6.5], [1.0, 6.5], [0, 8.2]]) kopening(g, 0.4, 0.9, x, y, 1.8, 0, 'round');
    kBanner(g, team, 0.9, -0.3, 12.8);
    // Porta fortificada
    for (const sx of [-1, 1]) {
      kbox(g, 1.2, 5.6, 1.4, KM.stone, sx * 1.3, 2.8, 4.4);
      battlements(g, 1.2, 1.4, 5.6, KM.stone, { x: sx * 1.3, z: 4.4, size: 0.3, gap: 0.22, h: 0.45, thick: 0.22 });
    }
    kopening(g, 1.4, 2.8, 0, 0.4, 4.66, 0, 'round', KM.stone);
    for (let i = 0; i < 5; i++) kbox(g, 0.05, 2.2, 0.05, KM.iron, -0.55 + i * 0.27, 1.5, 4.72);
    for (const sx of [-1, 1]) kbox(g, 0.7, 1.5, 0.04, KM.team(team), sx * 2.6, 3.4, 4.67);
    return 13.8;
  },
  archeryrange(g, { team }) {
    const hz = -1.4;
    kbox(g, 5.8, 0.3, 2.8, KM.stone, 0, 0.15, hz);
    timberBody(g, { w: 5.4, d: 2.4, h: 2.0, y0: 0.3, cz: hz, front: { door: { x: 0, w: 1.2, h: 1.6 }, windows: [{ x: -1.8, w: 0.6, h: 0.4 }, { x: 1.8, w: 0.6, h: 0.4 }] } });
    gableRoof(g, { w: 5.4, d: 2.4, h: 1.3, over: 0.4, y0: 2.3, z: hz });
    // Camp de tir: dianes de palla sobre cavallets i un armer amb arcs
    kbox(g, 5.6, 0.04, 2.8, KM.dirt, 0, 0.02, 1.5);
    for (const x of [-1.8, 0, 1.8]) kTarget(g, team, x, 2.4, Math.PI);
    kRailFence(g, -2.8, 0.2, -2.8, 2.9, 0.9);
    kRailFence(g, 2.8, 0.2, 2.8, 2.9, 0.9);
    kHay(g, -2.1, 0.7, 0.2);
    kBanner(g, team, 2.4, 0.4, 3.4);
    return 4.4;
  },
  university(g, { team }) {
    kbox(g, 5.8, 0.4, 5.2, KM.stone, 0, 0.2, -0.3);
    kbox(g, 5.2, 2.4, 4.4, KM.stone, 0, 1.6, -0.3);
    for (const x of [-1.6, 0, 1.6]) kopening(g, 0.6, 1.3, x, 1.0, 1.92, 0, 'round', KM.stone);
    timberBody(g, { w: 5.2, d: 4.4, h: 1.7, y0: 2.8, cz: -0.3, front: { windows: [{ x: -1.5, w: 0.5, h: 0.5 }, { x: 0, w: 0.5, h: 0.5 }, { x: 1.5, w: 0.5, h: 0.5 }] } });
    gableRoof(g, { w: 5.2, d: 4.4, h: 2.0, over: 0.4, y0: 4.5, z: -0.3, roofMat: KM.darkplanks, ridgeMat: KM.darkplanks });
    // Torre del rellotge
    kbox(g, 1.2, 2.2, 1.2, KM.stone, 0, 6.6, -0.3);
    kcyl(g, 0.35, 0.35, 0.06, 16, mat(0xe8e0c8), 0, 6.9, 0.32, [Math.PI / 2, 0, 0]);
    kcyl(g, 0, 1.0, 2.0, 4, KM.darkplanks, 0, 8.7, -0.3, [0, Math.PI / 4, 0]);
    kbox(g, 2.2, 0.3, 1.0, KM.stone, 0, 0.15, 2.4);
    kBanner(g, team, 2.4, 2.4, 3.6);
    return 9.7;
  },
  siegeworkshop(g, { team }) {
    const hz = -1.6;
    kbox(g, 6.6, 0.25, 3.6, KM.stone, 0, 0.125, hz);
    for (const sx of [-1, 1]) kbox(g, 0.3, 2.6, 3.4, KM.planks, sx * 3.1, 1.55, hz);
    kbox(g, 6.2, 2.6, 0.3, KM.planks, 0, 1.55, hz - 1.55);
    for (const x of [-3.05, -1, 1, 3.05]) kcyl(g, 0.14, 0.16, 2.9, 8, KM.timber, x, 1.45, hz + 1.6);
    kbox(g, 6.4, 0.2, 0.2, KM.timber, 0, 2.95, hz + 1.6);
    gableRoof(g, { w: 6.2, d: 3.4, h: 1.7, over: 0.5, y0: 2.85, z: hz, gableMat: KM.planks, frame: false });
    kRamFrame(g, -1.2, hz + 0.1, Math.PI / 2);
    kWheelProp(g, 1.8, 1.2, 0.6); kWheelProp(g, 2.5, 1.6, 0.6, true); kWheelProp(g, 1.4, 2.2, 0.5, true);
    kLogPile(g, -1.9, 1.9, 0, 3, 1.8);
    kSawhorse(g, 0.2, 1.6, 0.4);
    kBanner(g, team, 3.0, 2.8, 3.6);
    return 5.0;
  },
  monastery(g, { team }) {
    // Església romànica: nau de pedra, absis, campanar i un petit hort
    kbox(g, 5.8, 0.3, 5.8, KM.stone, 0, 0.15, 0);
    const n = new THREE.Group(); n.rotation.y = Math.PI / 2; g.add(n);
    kbox(n, 4.6, 3.0, 3.0, KM.stone, 0, 1.8, 0);
    gableRoof(n, { w: 4.6, d: 3.0, h: 1.7, over: 0.28, y0: 3.3, roofMat: KM.darkplanks, gableMat: KM.stone, frame: false, ridgeMat: KM.darkplanks });
    kopening(g, 0.9, 1.7, 0, 0.3, 2.31, 0, 'round', KM.stone);
    kcyl(g, 0.52, 0.52, 0.06, 18, KM.stone, 0, 3.0, 2.32, [Math.PI / 2, 0, 0]);
    kcyl(g, 0.4, 0.4, 0.08, 18, mat(teamOf(team).color, { emissive: teamOf(team).colorDark, emissiveIntensity: 0.5, roughness: 0.3 }), 0, 3.0, 2.34, [Math.PI / 2, 0, 0]);
    kbox(g, 0.08, 0.8, 0.02, KM.dark, 0, 3.0, 2.39); kbox(g, 0.8, 0.08, 0.02, KM.dark, 0, 3.0, 2.39);
    kbox(g, 0.1, 0.62, 0.1, KM.gold, 0, 5.35, 2.35); kbox(g, 0.36, 0.1, 0.1, KM.gold, 0, 5.46, 2.35);
    for (const sx of [-1, 1]) for (const z of [-1.2, 0, 1.2]) {
      kopening(g, 0.32, 0.85, sx * 1.51, 1.7, z, sx * Math.PI / 2, 'round');
      kbox(g, 0.28, 2.2, 0.34, KM.stone, sx * 1.62, 1.4, z + 0.6);
    }
    // Absis semicircular
    kcyl(g, 1.25, 1.25, 2.5, 16, KM.stone, 0, 1.55, -2.3);
    kcyl(g, 0, 1.42, 1.1, 16, KM.darkplanks, 0, 3.35, -2.3);
    // Campanar amb finestres geminades i coberta piramidal
    kbox(g, 1.3, 6.4, 1.3, KM.stone, -2.05, 3.5, 1.6);
    for (let k = 0; k < 4; k++) {
      const a = k * Math.PI / 2;
      kopening(g, 0.3, 0.7, -2.05 + Math.sin(a) * 0.66, 5.6, 1.6 + Math.cos(a) * 0.66, a, 'round');
    }
    kcyl(g, 0.2, 0.26, 0.34, 10, mat(0x8a6a2a, { metalness: 0.7, roughness: 0.4 }), -2.05, 5.7, 1.6);
    kcyl(g, 0, 1.05, 1.9, 4, KM.darkplanks, -2.05, 7.65, 1.6, [0, Math.PI / 4, 0]);
    kbox(g, 0.07, 0.5, 0.07, KM.gold, -2.05, 8.8, 1.6); kbox(g, 0.28, 0.07, 0.07, KM.gold, -2.05, 8.88, 1.6);
    // Hort del monestir i pou
    kbox(g, 1.3, 0.12, 1.9, KM.soil, 2.25, 0.36, 1.4);
    for (let i = 0; i < 3; i++) kbox(g, 1.1, 0.18, 0.2, KM.sprouts, 2.25, 0.48, 0.8 + i * 0.6);
    kcyl(g, 0.4, 0.42, 0.6, 12, KM.stone, 2.3, 0.6, -1.4);
    kcyl(g, 0.3, 0.3, 0.05, 12, KM.dark, 2.3, 0.92, -1.4);
    kBanner(g, team, 1.2, 2.8, 3.2);
    return 9.0;
  },
  wonder(g, { team }) {
    // Catedral gòtica: nau alta, naus laterals, arcbotants, dues torres amb agulla i rosassa
    kbox(g, 11.8, 0.5, 11.8, KM.stone, 0, 0.25, 0);
    kbox(g, 5.6, 0.4, 2.4, KM.stone, 0, 0.7, 5.2);
    const n = new THREE.Group(); n.rotation.y = Math.PI / 2; g.add(n);
    kbox(n, 8.4, 7.2, 4.2, KM.stone, 0.4, 4.1, 0);
    gableRoof(n, { w: 8.4, d: 4.2, h: 3.4, over: 0.3, y0: 7.7, x: 0.4, roofMat: KM.darkplanks, gableMat: KM.stone, frame: false, ridgeMat: KM.darkplanks });
    for (const sx of [-1, 1]) {
      // Nau lateral i coberta en pendent
      kbox(g, 1.9, 4.2, 8.0, KM.stone, sx * 3.05, 2.6, -0.3);
      kbox(g, 2.3, 0.2, 8.2, KM.darkplanks, sx * 3.05, 5.05, -0.3, [0, 0, sx * -0.42]);
      for (let i = 0; i < 5; i++) {
        const z = -3.6 + i * 1.65;
        kopening(g, 0.6, 1.9, sx * 4.01, 1.6, z, sx * Math.PI / 2, 'pointed');
        kopening(g, 0.55, 1.9, sx * 2.11, 5.4, z, sx * Math.PI / 2, 'pointed');
        // Arcbotant i pinacle
        kbox(g, 0.45, 5.4, 0.5, KM.stone, sx * 4.25, 3.2, z + 0.8);
        kcyl(g, 0, 0.3, 1.0, 4, KM.stone, sx * 4.25, 6.4, z + 0.8);
        kbox(g, 2.4, 0.3, 0.3, KM.stone, sx * 3.2, 6.4, z + 0.8, [0, 0, sx * 0.5]);
      }
    }
    // Façana: portals, rosassa i torres
    for (const x of [-1.4, 0, 1.4]) kopening(g, x ? 0.8 : 1.3, x ? 2.1 : 3.0, x, 0.9, 4.02, 0, 'pointed', KM.stone);
    kcyl(g, 1.2, 1.2, 0.1, 24, KM.stone, 0, 6.0, 4.02, [Math.PI / 2, 0, 0]);
    kcyl(g, 1.0, 1.0, 0.12, 24, mat(teamOf(team).color, { emissive: teamOf(team).colorDark, emissiveIntensity: 0.6, roughness: 0.25 }), 0, 6.0, 4.05, [Math.PI / 2, 0, 0]);
    for (let k = 0; k < 6; k++) kbox(g, 0.07, 2.0, 0.03, KM.gold, 0, 6.0, 4.12, [0, 0, k * Math.PI / 6]);
    for (const sx of [-1, 1]) {
      const x = sx * 3.0;
      kbox(g, 2.4, 11.5, 2.4, KM.stone, x, 6.25, 3.3);
      for (const y of [4.0, 8.0]) kopening(g, 0.55, 1.8, x, y, 4.51, 0, 'pointed');
      battlements(g, 2.4, 2.4, 12.0, KM.stone, { x, z: 3.3, size: 0.3, gap: 0.3, h: 0.4, thick: 0.2 });
      kcyl(g, 0, 1.2, 5.2, 8, KM.darkplanks, x, 14.6, 3.3);
      kcyl(g, 0.06, 0.06, 0.8, 6, KM.gold, x, 17.5, 3.3);
      for (const sz of [-1, 1]) kcyl(g, 0, 0.18, 1.1, 4, KM.stone, x + 1.05, 12.6, 3.3 + sz * 1.05);
    }
    // Agulla del creuer
    kbox(g, 1.4, 1.6, 1.4, KM.stone, 0, 11.6, -1.2);
    kcyl(g, 0, 0.8, 5.0, 8, KM.darkplanks, 0, 14.9, -1.2);
    kbox(g, 0.1, 0.9, 0.1, KM.gold, 0, 17.8, -1.2); kbox(g, 0.5, 0.1, 0.1, KM.gold, 0, 17.95, -1.2);
    // Absis
    kcyl(g, 2.1, 2.1, 7.2, 16, KM.stone, 0, 4.1, -4.4);
    kcyl(g, 0, 2.4, 2.6, 16, KM.darkplanks, 0, 9.0, -4.4);
    kBanner(g, team, -5.0, 5.2, 5.0); kBanner(g, team, 5.0, 5.2, 5.0);
    return 18.2;
  },
  stonewall(g) {
    kbox(g, 1.0, 2.6, 1.0, KM.stone, 0, 1.3, 0);
    kbox(g, 1.04, 0.16, 1.04, KM.stone, 0, 2.62, 0);
    for (const [sx, sz] of [[-0.3, -0.3], [0.3, 0.3]]) kbox(g, 0.36, 0.45, 0.36, KM.stone, sx, 2.92, sz);
    return 3.2;
  },
  gate(g, { team }) {
    for (const sx of [-1, 1]) {
      kbox(g, 0.8, 3.6, 1.1, KM.stone, sx * 1.1, 1.8, 0);
      battlements(g, 0.8, 1.1, 3.6, KM.stone, { x: sx * 1.1, size: 0.26, gap: 0.2, h: 0.35, thick: 0.2 });
    }
    kbox(g, 1.5, 0.9, 1.0, KM.stone, 0, 3.05, 0);
    kbox(g, 0.5, 0.6, 0.04, KM.team(team), 0, 2.95, 0.52);
    for (const sx of [-1, 1]) {
      const door = animPart(g, 'doors', sx * 0.7, 0, 0.1);
      kbox(door, 0.7, 2.2, 0.1, KM.planks, -sx * 0.35, 1.1, 0);
      kbox(door, 0.72, 0.08, 0.12, KM.iron, -sx * 0.35, 0.6, 0);
      kbox(door, 0.72, 0.08, 0.12, KM.iron, -sx * 0.35, 1.7, 0);
    }
    return 4.0;
  },
};
