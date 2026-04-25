import { seaAndLandGroups } from './seaAndLandGroups.js'
import { ShipCatalogue } from '../../../ships/ShipGroups.js'

/**
 * Color mapping for sea and land ship types.
 * Maps ship letter identifiers to their display colors.
 * @type {Object<string, string>}
 */
const SEA_SHIP_COLORS = {
  A: '#ff6666', // coral red
  T: '#ffccff',
  B: '#66ccff',
  C: '#55cc59',
  D: '#99ff33', // Bright Lime
  O: '#33cc99',
  S: '#3399cc', // Teal Blue
  Q: '#ffcc66', // Amber Orange
  H: '#ff6699',
  J: '#ff884d',
  P: '#cc99ff',
  G: '#ff99cc',
  R: '#6699ff',
  U: '#ffff66',
  L: '#ff9933',
  N: '#33ffcc', // Turquoise Mint
  I: '#cc33cc', // Deep Magenta
  Y: '#7799ee',
  M: '#000',
  K: '#fff',
  W: '#fff',
  '+': '#000',
  E: '#000',
  F: '#000',
  Z: '#000'
}

/**
 * Display names for sea and land ship types.
 * Maps ship letter identifiers to their human-readable names.
 * @type {Object<string, string>}
 */
const SEA_SHIP_NAMES = {
  A: 'Aircraft Carrier',
  T: 'Tanker',
  B: 'Battleship',
  C: 'Cruiser',
  O: 'Oil Rig',
  D: 'Destroyer',
  S: 'Submarine',
  Q: 'Stealth Bomber',
  H: 'Helicopter',
  J: 'Fighter Jet',
  P: 'Airplane',
  G: 'Anti-Aircraft Gun',
  R: 'Radar Station',
  U: 'Underground Bunker',
  L: 'Bomb Shelter',
  N: 'Naval Base',
  I: 'Pier',
  Y: 'Supply Depot'
}

/**
 * Symmetry types for sea and land ship types.
 * Maps ship letter identifiers to their symmetry classifications.
 * @type {Object<string, string>}
 */
const SEA_SHIP_SYMMETRIES = {
  A: 'S',
  T: 'S',
  B: 'S',
  C: 'S',
  O: 'S',
  D: 'S',
  S: 'S',
  Q: 'A',
  H: 'A',
  J: 'A',
  P: 'A',
  G: 'G',
  R: 'G',
  U: 'G',
  L: 'G',
  N: 'X',
  I: 'X',
  Y: 'X',
  M: 'W',
  K: 'W',
  W: 'W',
  '+': 'W',
  E: 'W',
  F: 'W',
  Z: 'W'
}

/**
 * Background styling for sea and land ship types.
 * Maps ship letter identifiers to their background colors/styles.
 * @type {Object<string, string>}
 */
const SEA_SHIP_BACKGROUNDS = {
  A: 'rgba(255,102,102,0.3)',
  B: 'rgba(102,204,255,0.3)',
  C: 'rgba(102,255,102,0.3)',
  D: 'rgba(153, 255, 51,0.3)',
  S: 'rgba(51, 153, 204,0.3)',
  G: 'rgba(255,153,204,0.3)',
  U: 'rgba(255,255,102,0.3)',
  T: 'rgba(255,204,255,0.3)',
  O: 'rgba(51,204,153,0.3)',
  Q: 'rgba(255,204,102,0.3)',
  H: 'rgba(255,102,153,0.3)',
  J: 'rgba(255,136,77,0.3)',
  R: 'rgba(102,153,255,0.3)',
  L: 'rgba(255, 153, 51,0.3)',
  N: 'rgba(51, 255, 204,0.3)',
  I: 'rgba(204, 51, 204,0.3)',
  Y: 'rgba(51, 51, 204,0.3)',
  M: '#ffd866',
  M1: '#ffd866',
  K: '#d84444',
  K1: '#2FA4A9',
  K2: '#cc3333',
  W: '#3333cc',
  '@': '#66ffcc', // Seafoam Green
  '+': '#8FE3D6',
  '+1': '#1F7F7A', //'#5Fa3b6',
  '+2': '#ff8f7a',
  E: '#9966ff',
  F: '#33ccff',
  F1: '#33ccff',
  Z: '#33cc33'
}

/**
 * Sea and land ships catalogue containing all ship configurations for sea and land terrain.
 * Provides color mapping, naming, symmetry rules, and background styling for all ship types.
 * @type {ShipCatalogue}
 */
export const seaAndLandShipsCatalogue = new ShipCatalogue(
  [],
  seaAndLandGroups,
  SEA_SHIP_COLORS,
  SEA_SHIP_NAMES,
  SEA_SHIP_SYMMETRIES,
  SEA_SHIP_BACKGROUNDS
)
