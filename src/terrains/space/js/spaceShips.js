/**
 * Space Ships Configuration Module
 *
 * Provides comprehensive configuration and catalogues for space terrain ship types,
 * including visual styling (colors, backgrounds), naming conventions, and symmetry properties.
 * Exports the spaceShipsCatalogue which integrates all ship types for space gameplay.
 *
 * @module terrains/space/js/spaceShips
 */

import { ShipCatalogue } from '../../../ships/ShipGroups.js'
import { spaceFleet } from './spaceFleet.js'
import { spaceGroups } from './spaceGroups.js'

/**
 * Mapping of ship identifiers to hex color codes.
 * Used for visual representation of different ship types on the game board.
 * Keys represent ship type identifiers (A-Z, 1-4, special symbols).
 * Values are hex color strings (e.g., '#ff6666') used for rendering.
 *
 * @typedef {Record<string, string>} ShipColorMap
 */

/**
 * Mapping of ship identifiers to human-readable display names.
 * Provides localized or friendly names for ship types shown in the UI.
 * Keys represent ship type identifiers (A-Z, 1-4).
 * Values are descriptive ship type names (e.g., 'Battlecruiser', 'Cruiser').
 *
 * @typedef {Record<string, string>} ShipNameMap
 */

/**
 * Mapping of ship identifiers to symmetry group classifications.
 * Defines rotational and reflective symmetry properties for ship shapes.
 * Keys represent ship type identifiers.
 * Values are symmetry codes: 'S' (single/symmetric), 'A' (asymmetric), 'G' (group), 'X' (complex), 'W' (weapon).
 *
 * @typedef {Record<string, string>} ShipTallyGroupMap
 */

/**
 * Mapping of ship identifiers to background styling (colors with transparency).
 * Used for rendering semi-transparent backgrounds in the UI for ship types.
 * Keys represent ship type identifiers (A-Z, 1-4, special symbols with optional suffixes).
 * Values are CSS color strings with transparency (e.g., 'rgba(255,102,102,0.3)') or hex codes.
 *
 * @typedef {Record<string, string>} ShipBackgroundMap
 */

/**
 * Color mapping for space ship types.
 * Maps ship letter identifiers (A-Z, 1-4) and special symbols to their display colors.
 * Used for visual rendering of different ship types on the game board.
 *
 * Ship types A-V use named colors (e.g., coral red, teal blue, turquoise mint).
 * Special symbols (+, |, !, #, ^, @, %, &) use neutral or contrasting colors (black or white).
 *
 * @type {ShipColorMap}
 * @const
 */
const SHIP_COLORS = {
  A: '#ff6666', // coral red
  B: '#ffccff',
  C: '#66ccff',
  D: '#55cc59',
  E: '#99ff33', // Bright Lime
  F: '#3399cc', // Teal Blue
  G: '#33cc99',
  H: '#ffcc66', // Amber Orange
  I: '#ffdd77', // Amber Orange
  J: '#ff6699',
  K: '#ff884d',
  L: '#cc99ff',
  M: '#33ffcc', // Turquoise Mint
  N: '#6699ff',
  O: '#ffff66',
  P: '#ff9933',
  Q: '#ff99cc',
  R: '#cc33cc', // Deep Magenta
  S: '#7799ee',
  T: '#3366ff',
  U: '#2288dd',
  V: '#bb66ff',
  Y: '#3366ff',
  W: '#fff',
  Z: '#fff',
  1: '#fff',
  2: '#fff',
  3: '#fff',
  4: '#fff',
  '+': '#000',
  '|': '#000',
  '!': '#000',
  '#': '#000',
  '^': '#000',
  '@': '#000',
  '%': '#000',
  '&': '#000'
}

/**
 * Display names for space ship types.
 * Maps ship letter identifiers (A-Z, 1-4) to their human-readable names.
 * Used in UI elements for displaying ship type information to players.
 *
 * Standard ship types (A-V): Full name descriptors (e.g., 'Battlecruiser', 'Attack Craft').
 * Alternate types (W-Z, 1-4): Special ship variants (e.g., 'Wheel', 'Scout Ship').
 *
 * @type {ShipNameMap}
 * @const
 */
const SHIP_NAMES = {
  A: 'Attack Craft',
  B: 'Battlecruiser',
  C: 'Cruiser',
  D: 'Destroyer',
  E: 'Merchanter',
  F: 'Frigate',
  G: 'Gun Boat',
  H: 'Habitat',
  I: 'Space Liner',
  J: 'Command Center',
  K: 'Attack Craft Carrier',
  L: 'Lifter',
  M: 'Missle Boat',
  N: 'Mine',
  O: 'Orbital',
  P: 'Patrol Craft',
  Q: 'Space Port',
  R: 'Railgun',
  S: 'Shelter',
  T: 'Transport',
  U: 'Cargo Hauler',
  V: 'Corvette',
  W: 'Wheel',
  X: 'Super Carrier',
  Y: 'Observation Post',
  Z: 'Starbase',
  1: 'Scout Ship',
  2: 'Privateer',
  3: 'Mining Ship',
  4: 'Runabout'
}

/**
 * Symmetry types for space ship types.
 * Maps ship letter identifiers (A-Z, 1-4) and special symbols to their symmetry classifications.
 * Used for determining how ships rotate and reflect on the game board.
 *
 * Symmetry codes:
 * - 'S': Single/Symmetric - rotationally symmetric shapes
 * - 'A': Asymmetric - non-symmetric shapes with unique orientations
 * - 'G': Group - symmetry group classifications for complex shapes
 * - 'X': Complex - multi-axis symmetry properties
 * - 'W': Weapon - special weapon symbols with limited symmetry
 *
 * @type {ShipTallyGroupMap}
 * @const
 */
const SHIP_TALLYGROUPS = {
  A: 'S',
  B: 'S',
  C: 'S',
  D: 'S',
  E: 'S',
  F: 'S',
  G: 'S',
  H: 'X',
  I: 'S',
  J: 'G',
  K: 'S',
  L: 'A',
  M: 'A',
  N: 'G',
  O: 'S',
  P: 'S',
  Q: 'X',
  R: 'X',
  S: 'G',
  T: 'S',
  U: 'S',
  V: 'A',
  W: 'S',
  X: 'S',
  Y: 'G',
  Z: 'S',
  1: 'A',
  2: 'S',
  3: 'A',
  4: 'A',
  '+': 'W',
  '^': 'W',
  '|': 'W',
  '#': 'W'
}

/**
 * Background styling for space ship types.
 * Maps ship letter identifiers (A-Z, 1-4) and special symbols to background colors or RGBA values with transparency.
 * Used for rendering semi-transparent background highlights in the UI.
 *
 * Standard ship types (A-Z, 1-4): RGBA color strings with 0.3 (30%) transparency.
 * Special symbols (+, |, !, ^, @, %, &) and variants: Hex colors or RGBA without transparency.
 * Variants with suffixes (+1, +2, |1, |2, !1, !2, ^1, ^2): Provide alternative styling for modified symbols.
 *
 * @type {ShipBackgroundMap}
 * @const
 */
const SHIP_BACKGROUNDS = {
  A: 'rgba(255,102,102,0.3)',
  B: 'rgba(255,204,255,0.3)',
  C: 'rgba(102,204,255,0.3)',
  D: 'rgba(102,255,102,0.3)',
  E: 'rgba(153, 255, 51,0.3)',
  F: 'rgba(51, 153, 204,0.3)',
  G: 'rgba(51,204,153,0.3)',
  H: 'rgba(244,244,102,0.3)',
  I: 'rgba(255,255,162,0.3)',
  J: 'rgba(255,153,204,0.3)',
  K: 'rgba(255,204,102,0.3)',
  L: 'rgba(255,102,153,0.3)',
  M: 'rgba(51, 255, 204,0.3)',
  N: 'rgba(102,153,255,0.3)',
  O: 'rgba(255, 153, 51,0.3)',
  P: 'rgba(233,122,88,0.3)',
  Q: 'rgba(204, 51, 204,0.3)',
  R: 'rgba(244, 100, 40,0.3)',
  S: 'rgba(210, 100, 204,0.3)',
  T: 'rgba(160, 80, 244,0.3)',
  U: 'rgba(40, 100, 244,0.3)',
  V: 'rgba(190, 70, 130,0.3)',
  W: 'rgba(40, 200, 120,0.3)',
  X: 'rgba(160, 80, 244,0.3)',
  Y: 'rgba(51, 51, 204,0.3)',
  Z: 'rgba(71, 31, 204,0.3)',
  1: 'rgba(80, 200, 244,0.3)',
  2: 'rgba(120, 180, 244,0.3)',
  3: 'rgba(90, 200, 220,0.3)',
  4: 'rgba(120, 80, 244,0.3)',
  '+': '#ffd866',
  '+1': '#D96B4C',
  '+2': '#ffd866',
  '|': '#cc3333',
  '|1': '#5a2b2f', // #5a2b2f   // #3f5a2a. // #243a5e
  '|2': '#cc3333',
  '!': '#339933',
  '!1': '#abcc33',
  '!2': '#339933',
  '^': '#cc3388',
  '^1': '#33abcc',
  '^2': '#cc3388',
  '*': '#3333cc',
  '@': '#66ffcc', // Seafoam Green
  '%': '#9966ff',
  '&': '#33ccff',
  '#': '#33cc33'
}

/**
 * Space ships catalogue containing all ship configurations for space terrain.
 *
 * Provides comprehensive configuration for all space ship types including:
 * - Visual styling with color mappings for each ship type
 * - Human-readable display names for UI presentation
 * - Symmetry classification for rotation and reflection handling
 * - Background styling with transparency for UI highlights
 *
 * Initialized with spaceGroups configuration and supplemented with spaceFleet shapes.
 * This catalogue is used throughout the space terrain gameplay for ship identification,
 * rendering, and transformation operations.
 *
 * @type {ShipCatalogue}
 * @const
 * @see {@link ShipCatalogue} for catalogue structure and methods
 * @see {@link spaceFleet} for ship fleet configuration
 * @see {@link spaceGroups} for ship group definitions
 */
export const spaceShipsCatalogue = new ShipCatalogue(
  [],
  spaceGroups,
  SHIP_COLORS,
  SHIP_NAMES,
  SHIP_TALLYGROUPS,
  SHIP_BACKGROUNDS
)

spaceShipsCatalogue.addShapes(spaceFleet)
