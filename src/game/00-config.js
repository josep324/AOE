import * as THREE from 'three';
import { UNITS } from '@data/units.js';
import { AGES } from '@data/ages.js';
import { TECHS } from '@data/techs.js';
import { BUILD_KEYS } from '@data/hotkeys.js';
import { BUILDINGS } from '@data/buildings.js';
import { DIFFICULTY } from '@data/difficulty.js';
import { CIVS } from '@data/civs.js';

/* =====================================================================
   CONFIGURACIÓ GLOBAL
   ===================================================================== */
const CONFIG = {
  GROUND_SIZE: 1000,          // mida visual del terreny (les vores queden dins la boira)
  MAP_LIMIT: 180,            // límit jugable (±): mapa de 360×360
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
  VILLAGER: { speed: 5.5, radius: 0.45, hp: 25, attack: 3 },
  GATHER: {
    capacity: 10,                         // càrrega màxima per viatge
    // unitats per segon segons el tipus de recurs
    rates: { tree: 1.25, gold: 0.95, stone: 0.9, berries: 0.85, sheep: 1.1, farm: 0.7, deer: 1.2, boar: 1.3, fish: 0.8, deepfish: 1.1 },
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
  DOUBLE_CLICK_MS: 350,
  DRAG_THRESHOLD: 6,
};

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
const SEL_COLOR_ENEMY = 0xff4a3a;
const ENEMY = { id: 2, name: 'Imperi Vermell', color: 0xa3302a, colorLight: 0xd05a48, colorDark: 0x661a14,
                res: { food: 0, wood: 0, gold: 0, stone: 0 } };
const TEAMS = { 1: PLAYER, 2: ENEMY };
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
  };
}
for (const T of [PLAYER, ENEMY]) { T.age = 0; T.techs = new Set(); T.mods = defaultMods(); T.prices = { food: 100, wood: 100, stone: 130 }; }
const teamOf = (id) => TEAMS[id] || PLAYER;
PLAYER.civ = 'franks';
ENEMY.civ = 'saracens';
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

/* Generador pseudoaleatori amb llavor (layout reproduïble) */
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/* Llavor del mapa: aleatòria a cada partida (o fixa amb ?seed=123 a l'adreça) */
const MAP_SEED = (parseInt(new URLSearchParams(location.search).get('seed'), 10) || Math.floor(Math.random() * 1e9)) >>> 0;
let randGen = mulberry32(MAP_SEED);
const rand = () => randGen();
/* Torna a sembrar l'aleatorietat de la simulació (cada mapa es genera igual a partir de la seva llavor) */
function reseedRand(seed) { randGen = mulberry32(seed >>> 0); }
const randRange = (a, b) => a + (b - a) * rand();
