/* =====================================================================
   CÀMERA RTS
   ===================================================================== */
const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.5, 4000);
const camState = {
  vel: new THREE.Vector3(),        // velocitat actual del desplaçament (amb inèrcia)
  yawVel: 0,
  goal: null,                      // punt cap on llisca la càmera en centrar
  grab: null,                      // arrossegament amb el botó del mig
  target: new THREE.Vector3(5, 0, 5),
  yaw: CONFIG.CAM.yaw,
  pitch: CONFIG.CAM.pitch,
  dist: CONFIG.CAM.dist,
  targetDist: CONFIG.CAM.dist,
};

function updateCamera() {
  const { target, yaw, dist } = camState;
  const zt = THREE.MathUtils.clamp((dist - CONFIG.CAM.minDist) / (CONFIG.CAM.maxDist - CONFIG.CAM.minDist), 0, 1);
  const pitch = camState.pitch - 0.16 * (1 - zt);
  const horizontal = Math.cos(pitch) * dist;
  camera.position.set(
    target.x + Math.sin(yaw) * horizontal,
    target.y + Math.sin(pitch) * dist,
    target.z + Math.cos(yaw) * horizontal
  );
  camera.lookAt(target);
}
