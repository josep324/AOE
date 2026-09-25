/* =====================================================================
   RAYCASTING
   ===================================================================== */
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
function setRayFromScreen(x, y) {
  ndc.set((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
}
function pickEntity(x, y) {
  setRayFromScreen(x, y);
  const hits = raycaster.intersectObjects(state.pickables, false);
  for (const h of hits) {
    const ent = h.object.userData.entity;
    if (ent && ent.group.visible && !ent.dead) return ent;
  }
  return null;
}
function pickGround(x, y) {
  setRayFromScreen(x, y);
  return rayGround(raycaster.ray);
}
const projVec = new THREE.Vector3();
function worldToScreen(pos, yOffset = 0) {
  projVec.set(pos.x, pos.y + yOffset, pos.z).project(camera);
  return {
    x: (projVec.x + 1) / 2 * window.innerWidth,
    y: (1 - projVec.y) / 2 * window.innerHeight,
    visible: projVec.z > -1 && projVec.z < 1,
  };
}
