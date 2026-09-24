/* =====================================================================
   TERRENY
   ===================================================================== */
let ground;
function createGround() {
  const size = CONFIG.GROUND_SIZE;
  const geo = new THREE.PlaneGeometry(size, size, 220, 220);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const dark = new THREE.Color(0x3e7a2a);
  const light = new THREE.Color(0x7fb84b);
  const dry = new THREE.Color(0x9aa653);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const n = fbm(x * 0.028, z * 0.028);
    const n2 = fbm(x * 0.009 + 50, z * 0.009 - 20);
    c.copy(dark).lerp(light, THREE.MathUtils.smoothstep(n, 0.25, 0.8));
    c.lerp(dry, THREE.MathUtils.smoothstep(n2, 0.6, 0.85) * 0.45);
    const jitter = (hash2(x * 3.1, z * 1.7) - 0.5) * 0.04;
    colors[i * 3] = c.r + jitter;
    colors[i * 3 + 1] = c.g + jitter;
    colors[i * 3 + 2] = c.b + jitter * 0.5;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  ground = new THREE.Mesh(geo, fogify(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96, metalness: 0 })));
  ground.receiveShadow = true;
  ground.name = 'ground';
  scene.add(ground);
}
