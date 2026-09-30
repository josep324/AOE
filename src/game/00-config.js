import * as THREE from 'three';
import { UNITS } from '@data/units.js';
import { AGES } from '@data/ages.js';
import { TECHS } from '@data/techs.js';
import { BUILD_KEYS } from '@data/hotkeys.js';
import { BUILDINGS } from '@data/buildings.js';
import { DIFFICULTY } from '@data/difficulty.js';
import { CIVS } from '@data/civs.js';
import { GAME_TEMPO, AOE_UNITS, AOE_TECHS, AOE_GATHER, MINES } from '@data/tempo.js';

/* =====================================================================
   CONFIGURACIÓ GLOBAL
   ===================================================================== */
/* Mides de mapa de l'AoE II (en caselles). Una casella de l'AoE II equival a uns 2,15 metres
   del joc (una casa de 2×2 caselles fa 4×4, un castell de 4×4 en fa 10×10).
   La mida es tria al menú d'inici; canviar-la recarrega la pàgina, perquè el terreny,
   la navegació i la boira es dimensionen en arrencar. */
const MAP_SIZES = {
  tiny:   { name: 'Minúscul', tiles: 120, limit: 129 },
  small:  { name: 'Petit', tiles: 144, limit: 155 },
  medium: { name: 'Mitjà', tiles: 168, limit: 180 },
  normal: { name: 'Normal', tiles: 200, limit: 215 },
  large:  { name: 'Gran', tiles: 220, limit: 236 },
};
const MAP_SIZE_KEY = 'imperis.mapSize';
function storedMapSize() {
  try { const k = localStorage.getItem(MAP_SIZE_KEY); if (MAP_SIZES[k]) return k; } catch { /* sense emmagatzematge */ }
  return 'medium';
}
const MAP_SIZE = storedMapSize();
const TILE = 2.15;              // una casella de l'AoE II, en metres del joc (abasts, mides)
/* Ritme del combat: les recàrregues de les dades són les de l'AoE II (segons de joc); a la velocitat
   normal de l'AoE II DE (×1,7) passen més de pressa en temps real. Sense aquest factor els combats
   anaven massa lents comparats amb el moviment i l'economia (i els arquers disparaven massa poc). */
const COMBAT_TEMPO = 1.7;
const CONFIG = {
  GROUND_SIZE: 1000,          // mida visual del terreny (les vores queden dins la boira)
  MAP_LIMIT: MAP_SIZES[MAP_SIZE].limit,   // límit jugable (±): el mapa Mitjà fa 360×360
  CAM: {
    yaw: Math.PI / 4,        // angle isomètric
    pitch: 0.95,             // ~54° d'inclinació
    dist: 58, minDist: 16, maxDist: 130,
    zoomStep: 0.14,
    panSpeed: 1.05,          // multiplicat per la distància (pan proporcional al zoom)
    edge: 26,                // franja de vora (px): com més a prop de la vora, més ràpid
    bottomEdge: 30,          // franja inferior del MAPA (just a sobre del HUD) per baixar
    rotSpeed: 1.9,
    accel: 9,                // suavitat en arrencar (inèrcia)
    decel: 6,                // suavitat en frenar (lliscament)
    glide: 6,                // suavitat en centrar la càmera (H, Espai, grups…)
  },
  VILLAGER: { speed: 0.8 * TILE * GAME_TEMPO, radius: 0.45, hp: 25, attack: 3 },
  GATHER: {
    capacity: 10,                         // càrrega màxima per viatge
    // unitats per segon (real) segons el tipus de recurs: els de l'AoE II a la velocitat Normal
    rates: Object.fromEntries(Object.entries(AOE_GATHER).map(([k, v]) => [k, v * GAME_TEMPO])),
    reach: 0.75,                          // distància extra per començar a treballar
    autoSearchRadius: 32,                 // radi per buscar un recurs nou quan s'esgota
  },
  POP_CAP: 200,
  STARTING_RESOURCES: { food: 200, wood: 200, gold: 100, stone: 200 },   // com a l'AoE II

  UNITS,

  AGES,

  TECHS,
  TC_ARROWS: { range: 16, reload: 2.0, damage: 5 },   // fletxes del Centre de Ciutat (+1 per aldeà refugiat)
  GARRISON_MAX: 15,
  QUEUE_MAX: 15,
  TC_POP: 5,                 // població que dona el Centre de Ciutat

  BUILD_KEYS,

  BUILDINGS,
  TIME_SCALE: 1,             // velocitat de simulació (útil per depurar: RTS.CONFIG.TIME_SCALE = 3)
  PACE: 1,                   // ritme de la partida (menú): 1 = AoE II DE; 1,5 = economia i producció més ràpides
  DOUBLE_CLICK_MS: 350,
  DRAG_THRESHOLD: 6,
};

/* Temps i velocitats de l'AoE II DE (segons de joc → segons reals, caselles/s → m/s) */
for (const [k, [t, v]] of Object.entries(AOE_UNITS)) {
  const d = UNITS[k]; if (!d) continue;
  if (t) d.time = Math.round(t / GAME_TEMPO * 10) / 10;
  d.speed = Math.round(v * TILE * GAME_TEMPO * 100) / 100;
}
for (const [k, t] of Object.entries(AOE_TECHS)) if (TECHS[k]) TECHS[k].time = Math.round(t / GAME_TEMPO);
BUILDINGS.wonder.time = Math.round(3500 / GAME_TEMPO);
/* Ritmes de partida: el Ràpid només accelera l'economia i la producció (recol·lectar, entrenar,
   investigar, construir); el moviment i el combat queden igual, perquè no sigui ofegant */
const PACES = { normal: { name: 'Normal (AoE II)', k: 1 }, fast: { name: 'Ràpid ×1,5', k: 1.5 } };

const STATE = Object.freeze({ IDLE: 'IDLE', MOVING: 'MOVING', GATHERING: 'GATHERING', RETURNING: 'RETURNING', BUILDING: 'BUILDING',
                              ATTACKING: 'ATTACKING', GARRISONED: 'GARRISONED', TRADING: 'TRADING',
                              CONVERTING: 'CONVERTING', HEALING: 'HEALING' });
const STATE_LABEL = { IDLE: 'Inactiu', MOVING: 'En marxa', GATHERING: 'Recol·lectant', RETURNING: 'A descarregar', BUILDING: 'Construint',
                      ATTACKING: 'Atacant', GARRISONED: 'Refugiat', TRADING: 'Comerciant',
                      CONVERTING: 'Convertint', HEALING: 'Curant' };
const RES_LABEL = { wood: 'Fusta', gold: 'Or', food: 'Aliment', stone: 'Pedra' };
const RES_ICON = { wood: '🪵', gold: '🪙', food: '🍖', stone: '🪨' };

const PLAYER = { id: 1, name: 'Civilització Blava', color: 0x2c5aa8, colorLight: 0x5b8ad8, colorDark: 0x1a3266 };
const SEL_COLOR_OWN = 0xcfeeff;
const SEL_COLOR_NEUTRAL = 0xffe07a;
const SEL_COLOR_ALLY = 0x9ef07a;
const SEL_COLOR_ENEMY = 0xff4a3a;
const ENEMY = { id: 2, name: 'Imperi Vermell', color: 0xa3302a, colorLight: 0xd05a48, colorDark: 0x661a14,
                res: { food: 0, wood: 0, gold: 0, stone: 0 } };
/* Fase 20: fins a 4 jugadors. Els jugadors 3 i 4 només juguen si la partida en té (GAME.players) */
const P3 = { id: 3, name: 'Regne Verd', color: 0x3a8a3a, colorLight: 0x68c060, colorDark: 0x1c4a1c,
             res: { food: 0, wood: 0, gold: 0, stone: 0 } };
const P4 = { id: 4, name: 'Senyoria Groga', color: 0xc9a019, colorLight: 0xefd060, colorDark: 0x6e560a,
             res: { food: 0, wood: 0, gold: 0, stone: 0 } };
const TEAMS = { 1: PLAYER, 2: ENEMY, 3: P3, 4: P4 };
const COLOR_NAME = { 1: 'blau', 2: 'vermell', 3: 'verd', 4: 'groc' };
/* Jugadors de la partida i el bàndol (equip) de cadascun: els del mateix bàndol són aliats
   (no s'ataquen, comparteixen la visió i guanyen o perden junts) */
const GAME = { players: [1, 2], side: { 1: 1, 2: 2 }, layout: '1v1', defeated: new Set() };
const sideOf = (id) => GAME.side[id] || 0;
const hostile = (a, b) => !!a && !!b && a !== b && sideOf(a) !== sideOf(b);
const allied = (a, b) => a === b || (!!a && !!b && sideOf(a) === sideOf(b));
const activeTeams = () => GAME.players;
/* Formes de partida: bàndol de cada jugador (1 = el teu) */
const LAYOUTS = {
  '1v1': { name: '1 contra 1', side: { 1: 1, 2: 2 } },
  '1v2': { name: '1 contra 2', side: { 1: 1, 2: 2, 3: 2 } },
  '2v2': { name: '2 contra 2', side: { 1: 1, 3: 1, 2: 2, 4: 2 } },
  '1v3': { name: '1 contra 3', side: { 1: 1, 2: 2, 3: 2, 4: 2 } },
  'ffa3': { name: 'Tots contra tots (3)', side: { 1: 1, 2: 2, 3: 3 } },
  'ffa4': { name: 'Tots contra tots (4)', side: { 1: 1, 2: 2, 3: 3, 4: 4 } },
};
function setLayout(id) {
  const L = LAYOUTS[id] || LAYOUTS['1v1'];
  GAME.layout = LAYOUTS[id] ? id : '1v1';
  GAME.side = { ...L.side };
  GAME.players = Object.keys(L.side).map(Number).sort();
  GAME.defeated = new Set();
  GAME.playerResigned = false;
}
function defaultMods() {
  return {
    gather: {}, capacity: 0, villagerSpeed: 1, villagerHp: 0, villagerArmor: [0, 0], farmBonus: 0,
    attack: { infantry: 0, cavalry: 0, archer: 0 }, range: { archer: 0 }, buildingArrow: 0,
    armor: { infantry: [0, 0], cavalry: [0, 0], archer: [0, 0] },
    hpMul: {}, reloadMul: {}, vsBuilding: {}, tradeMul: 1,
    elite: {}, unitRange: {}, unitHp: {}, towerArrows: 0, buildingHpMul: 1, buildingArmor: 0,
    lineKind: {}, buildSpeed: 1, towerLevel: 0, siegeBldMul: 1,
    monkSpeed: 1, monkHp: 0, faithRegen: 1, convRange: 0,
    shipSpeed: 1, shipArmor: 0, shipGather: 1, transportCap: 0,
    speedMul: {}, mountedHp: 0, mountedSpeed: 1, perfectAim: {}, ballistics: false, wallHpMul: 1,
    lineArmor: {}, lineBonusSpear: {}, lineCost: {}, towerAttack: 0, heatedShot: false, castleHpMul: 1,
    trainSpeed: 1, garrisonHeal: 1, guilds: false, buildingLos: 0, shipWoodMul: 1,
    // Fase 17: bonificacions de civilització i tecnologies úniques
    lineHpMul: {}, lineReloadMul: {}, lineLos: {}, ageRange: {}, trainAt: {}, tcPop: 0, techCost: 1,
    unitAttack: {}, unitBonusInf: {}, unitArmor: {},
  };
}
for (const T of Object.values(TEAMS)) { T.age = 0; T.techs = new Set(); T.mods = defaultMods(); T.prices = { food: 100, wood: 100, stone: 130 }; }
const teamOf = (id) => TEAMS[id] || PLAYER;
PLAYER.civ = 'franks';
ENEMY.civ = 'saracens';
P3.civ = 'japanese';
P4.civ = 'britons';
const civOf = (team) => CIVS[teamOf(team).civ] || CIVS.franks;
const archOf = (team) => (team && TEAMS[team] ? civOf(team).arch : 'western');
/* Bonificacions de civilització sobre els modificadors de l'equip (es criden en començar o carregar) */
function applyCivMods(T) {
  const C = CIVS[T.civ];
  if (!C) return;
  const m = C.mods || {};
  for (const [k, v] of Object.entries(m.gather || {})) T.mods.gather[k] = (T.mods.gather[k] || 1) * v;
  Object.assign(T.mods.hpMul, m.hpMul || {});
  Object.assign(T.mods.reloadMul, m.reloadMul || {});
  Object.assign(T.mods.vsBuilding, m.vsBuilding || {});
  if (m.tradeMul) T.mods.tradeMul = m.tradeMul;
  for (const [k, v] of Object.entries(m.speedMul || {})) T.mods.speedMul[k] = (T.mods.speedMul[k] || 1) * v;
  Object.assign(T.mods.lineHpMul, m.lineHpMul || {});
  Object.assign(T.mods.lineReloadMul, m.lineReloadMul || {});
  Object.assign(T.mods.lineLos, m.lineLos || {});
  Object.assign(T.mods.ageRange, m.ageRange || {});
  Object.assign(T.mods.trainAt, m.trainAt || {});
  if (m.buildingHpMul) T.mods.buildingHpMul *= m.buildingHpMul;
  if (m.tcPop) T.mods.tcPop = m.tcPop;
  if (m.techCost) T.mods.techCost = m.techCost;
}

const state = {
  resources: { food: 0, wood: 0, gold: 0, stone: 0 },   // s'omple amb STARTING_RESOURCES
  controlGroups: {},
  units: [],
  buildings: [],
  resourceNodes: [],
  obstacles: [],      // { x, z, r, entity }
  pickables: [],      // meshes que responen al raycaster
  selected: [],
  markers: [],
  animated: [],       // objectes amb update(t, dt) propi (bandera, etc.)
  particles: [],
  floaters: [],
  dying: [],          // recursos esgotats fent l'animació de desaparició
  projectiles: [],
  animals: [],        // fauna salvatge (cérvols, senglars, llops), vius o caçats
  relics: [],         // relíquies (a terra, portades per un monjo o guardades en un monestir)
  sparkles: [],       // espurnes de conversió i curació (només visuals)
  victory: 'standard',   // standard (conquesta + Meravella + relíquies) · conquest · regicide
  relicWin: null,     // { team, end }: un equip té totes les relíquies
  pings: [],          // avisos d'atac al minimapa
  elapsed: 0,
  paused: true,       // la partida comença en prémer «Començar»
  over: false,
};
PLAYER.res = state.resources;

/* Generador pseudoaleatori amb llavor (mulberry32). L'estat és accessible perquè les partides
   desades continuïn exactament igual: amb la mateixa llavor i les mateixes ordres, la simulació
   dona sempre el mateix resultat. Només la lògica del joc el fa servir; els efectes purament
   visuals (partícules, espurnes…) fan servir vrand perquè no alterin la seqüència. */
const RNG = { s: 0 };
/* Cada generador té el seu estat; només el del joc (shared) el guarda a RNG, que es desa amb la partida.
   (Abans tots compartien RNG.s: l'aigua, el relleu i la decoració reiniciaven l'atzar del joc) */
function mulberry32(seed, shared = false) {
  const S = shared ? RNG : { s: 0 };
  S.s = seed | 0;
  return function () {
    S.s = (S.s + 0x6D2B79F5) | 0;
    let t = Math.imul(S.s ^ (S.s >>> 15), 1 | S.s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/* Llavor del mapa: aleatòria a cada partida (o fixa amb ?seed=123 a l'adreça) */
const MAP_SEED = (parseInt(new URLSearchParams(location.search).get('seed'), 10) || Math.floor(Math.random() * 1e9)) >>> 0;
let randGen = mulberry32(MAP_SEED, true);
const rand = () => randGen();
/* Torna a sembrar l'aleatorietat de la simulació (cada mapa es genera igual a partir de la seva llavor) */
function reseedRand(seed) { randGen = mulberry32(seed >>> 0, true); }
const vrand = Math.random;
const vrandRange = (a, b) => a + (b - a) * vrand();
const randRange = (a, b) => a + (b - a) * rand();
