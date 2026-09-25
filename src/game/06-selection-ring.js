/* =====================================================================
   INDICADOR DE SELECCIÓ (anell Torus + halo)
   ===================================================================== */
const selMaterials = new Map();
function getSelMaterials(color) {
  if (!selMaterials.has(color)) {
    selMaterials.set(color, {
      ring: new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, depthWrite: false, fog: false, toneMapped: false }),
      disc: new THREE.MeshBasicMaterial({
        color, map: radialTex, transparent: true, opacity: 0.85, depthWrite: false,
        blending: THREE.AdditiveBlending, fog: false, toneMapped: false,
      }),
    });
  }
  return selMaterials.get(color);
}
function makeSelectionIndicator(radius, color) {
  const m = getSelMaterials(color);
  const group = new THREE.Group();
  const tube = THREE.MathUtils.clamp(radius * 0.022, 0.035, 0.09);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 8, 72), m.ring);
  ring.rotation.x = -Math.PI / 2;
  const disc = new THREE.Mesh(new THREE.CircleGeometry(radius * 1.22, 56), m.disc);
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = -0.03;
  group.add(disc, ring);
  group.position.y = 0.1;
  group.visible = false;
  group.traverse(o => {
    o.userData.noPick = true;
    o.userData.noShadow = true;
    o.renderOrder = 5;
    if (o.isMesh) o.raycast = () => {};
  });
  return group;
}
