/* =====================================================================
   ARBRES PER LOTS
   Milers d'arbres com a objectes separats són milers de crides de dibuix. Aquí els arbres
   quiets es dibuixen agrupats (InstancedMesh) per zona del mapa i model d'arbre: cada zona
   es pot descartar sencera si queda fora de la càmera.
   Quan un arbre s'ha de moure (el talen i tremola, o cau), surt del lot i passa a tenir
   el seu propi model, com abans.
   ===================================================================== */
const TREE_CHUNK = 48;                                  // mida (m) de cada zona
const TREE_BATCH = { batches: new Map(), dirty: new Set() };
const tbMatrix = new THREE.Matrix4(), tbPos = new THREE.Vector3(), tbQuat = new THREE.Quaternion(), tbScale = new THREE.Vector3();
const tbUp = new THREE.Vector3(0, 1, 0);

/* Model d'arbre que toca a una posició (sempre el mateix per al mateix lloc) */
function treeTemplateAt(x, z) {
  const pine = hash2(x * 0.071 + 3, z * 0.053 - 1) < 0.33;
  const v = Math.floor(hash2(x * 1.3, z * 1.7) * 6);
  return { key: (pine ? 'pine' : 'oak') + v, tpl: pine ? pineTemplate(v) : oakTemplate(v) };
}
function treeBatchFor(e) {
  const { key, tpl } = treeTemplateAt(e.position.x, e.position.z);
  const ci = Math.floor(e.position.x / TREE_CHUNK), cj = Math.floor(e.position.z / TREE_CHUNK);
  const id = `${ci},${cj},${key}`;
  let b = TREE_BATCH.batches.get(id);
  if (!b) {
    b = { id, tpl, cap: 0, meshes: [], ents: [] };
    treeBatchGrow(b, 32);
    TREE_BATCH.batches.set(id, b);
  }
  return b;
}
/* Crea (o amplia) les malles instanciades d'un lot conservant-ne el contingut */
function treeBatchGrow(b, cap) {
  const old = b.meshes;
  b.meshes = b.tpl.parts.map(([geo, m], k) => {
    const mesh = new THREE.InstancedMesh(geo, NM[m], cap);
    mesh.count = b.ents.length;
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.userData.noPick = true;
    if (old[k]) { mesh.instanceMatrix.array.set(old[k].instanceMatrix.array.subarray(0, b.ents.length * 16)); scene.remove(old[k]); old[k].dispose(); }
    scene.add(mesh);
    return mesh;
  });
  b.cap = cap;
}
function treeSlotMatrix(e, shown) {
  tbPos.set(e.position.x, e.position.y, e.position.z);
  tbQuat.setFromAxisAngle(tbUp, e.group.rotation.y);
  tbScale.setScalar(shown ? e.group.scale.x : 0);
  return tbMatrix.compose(tbPos, tbQuat, tbScale);
}
/* Posa un arbre nou al lot de la seva zona */
function treeBatchAdd(e) {
  const b = treeBatchFor(e);
  if (b.ents.length >= b.cap) treeBatchGrow(b, b.cap * 2);
  const slot = b.ents.length;
  b.ents.push(e);
  e.inst = { b, slot, shown: true };
  for (const m of b.meshes) { m.setMatrixAt(slot, treeSlotMatrix(e, true)); m.count = b.ents.length; }
  TREE_BATCH.dirty.add(b);
}
/* Mostra o amaga un arbre del lot (boira de guerra) */
function treeBatchShow(e, shown) {
  const I = e.inst;
  if (!I || I.shown === shown) return;
  I.shown = shown;
  for (const m of I.b.meshes) m.setMatrixAt(I.slot, treeSlotMatrix(e, shown));
  TREE_BATCH.dirty.add(I.b);
}
/* Treu l'arbre del lot i li dona el seu propi model (per tremolar o caure) */
function treeDetach(e) {
  const I = e.inst;
  if (!I) return;
  const b = I.b, last = b.ents.length - 1;
  if (I.slot !== last) {
    // L'últim arbre del lot ocupa el lloc que queda lliure
    const moved = b.ents[last];
    b.ents[I.slot] = moved;
    moved.inst.slot = I.slot;
    for (const m of b.meshes) m.setMatrixAt(I.slot, treeSlotMatrix(moved, moved.inst.shown));
  }
  b.ents.pop();
  for (const m of b.meshes) m.count = b.ents.length;
  TREE_BATCH.dirty.add(b);
  e.inst = null;
  for (const [geo, m] of b.tpl.parts) {
    const mesh = new THREE.Mesh(geo, NM[m]);
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.userData.noPick = true;
    e.model.add(mesh);
  }
}
/* Aplica els canvis pendents abans de dibuixar (un cop per fotograma) */
function flushTreeBatches() {
  for (const b of TREE_BATCH.dirty) {
    for (const m of b.meshes) { m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere(); }
  }
  TREE_BATCH.dirty.clear();
}
function clearTreeBatches() {
  for (const b of TREE_BATCH.batches.values()) for (const m of b.meshes) { scene.remove(m); m.dispose(); }
  TREE_BATCH.batches.clear();
  TREE_BATCH.dirty.clear();
}
/* Volum invisible per poder seleccionar l'arbre amb el ratolí (el lot no es pot seleccionar) */
const treePickGeo = new THREE.CylinderGeometry(1.6, 1.6, 7, 6).translate(0, 3.5, 0);
const treePickMat = new THREE.MeshBasicMaterial({ visible: false });
