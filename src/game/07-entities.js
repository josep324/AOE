/* =====================================================================
   ENTITATS
   ===================================================================== */
let nextEntityId = 1;
const selColorFor = (team) => team === PLAYER.id ? SEL_COLOR_OWN : team === 0 ? SEL_COLOR_NEUTRAL : allied(team, PLAYER.id) ? SEL_COLOR_ALLY : SEL_COLOR_ENEMY;
class Entity {
  constructor({ kind, subtype, name, icon, team = 0, radius = 1, selRadius, hp = 0, maxHp = 0 }) {
    this.id = nextEntityId++;
    this.kind = kind;           // 'unit' | 'building' | 'resource' | 'relic'
    this.subtype = subtype;
    this.name = name;
    this.icon = icon;
    this.team = team;
    this.radius = radius;
    this.hp = hp;
    this.maxHp = maxHp;
    this.selected = false;
    this.group = new THREE.Group();
    this.group.userData.entity = this;
    this.selRadius = selRadius ?? radius * 1.3;
    this.selection = makeSelectionIndicator(this.selRadius,
      selColorFor(team));
    this.group.add(this.selection);
  }
  get position() { return this.group.position; }
  get isOwn() { return this.team === PLAYER.id; }
  get isAlly() { return this.team !== PLAYER.id && allied(this.team, PLAYER.id); }
  get isFriendly() { return allied(this.team, PLAYER.id); }        // propi o aliat (visió compartida)
  isEnemyOf(other) { return !!other && hostile(this.team, other.team); }
  finalize() {
    this.group.traverse(o => {
      if (!o.isMesh) return;
      if (!o.userData.noShadow) { o.castShadow = true; o.receiveShadow = true; }
      if (!o.userData.noPick) { o.userData.entity = this; state.pickables.push(o); }
    });
    scene.add(this.group);
    this.group.updateMatrixWorld(true);   // seleccionable des del primer instant
  }
  /* Canvi d'equip (conversió): nou color de l'indicador de selecció */
  recolorSelection() {
    const vis = this.selection.visible;
    this.group.remove(this.selection);
    this.selection = makeSelectionIndicator(this.selRadius, selColorFor(this.team));
    this.selection.visible = vis;
    this.group.add(this.selection);
  }
  setSelected(v) {
    this.selected = v;
    this.selection.visible = v;
  }
}
