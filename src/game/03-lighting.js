/* =====================================================================
   IL·LUMINACIÓ (Sol direccional + ambient + hemisfèrica)
   ===================================================================== */
const ambient = new THREE.AmbientLight(0xfff6e8, 0.28);
const hemi = new THREE.HemisphereLight(0xcfe2f4, 0x5a5236, 0.8);
const sun = new THREE.DirectionalLight(0xffeccc, 2.7);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.035;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 320;
const SUN_OFFSET = new THREE.Vector3(-55, 95, 40);
scene.add(ambient, hemi, sun, sun.target);

let shadowExtent = 0;
function updateSun() {
  // El sol segueix el punt que mira la càmera perquè les ombres sempre cobreixin la vista
  const ext = Math.round(THREE.MathUtils.clamp(camState.dist * 1.3, 45, 170) / 5) * 5;
  // Ajustem el centre de les ombres a la mida d'un texel: evita el tremolor en desplaçar
  const texel = (ext * 2) / sun.shadow.mapSize.x;
  const cx = Math.round(camState.target.x / texel) * texel, cz = Math.round(camState.target.z / texel) * texel;
  sun.position.set(cx, 0, cz).add(SUN_OFFSET);
  sun.target.position.set(cx, 0, cz);
  if (ext !== shadowExtent) {
    shadowExtent = ext;
    const c = sun.shadow.camera;
    c.left = -ext; c.right = ext; c.top = ext; c.bottom = -ext;
    c.updateProjectionMatrix();
  }
}
