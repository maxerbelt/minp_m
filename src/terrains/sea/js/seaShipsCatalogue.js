/**
 * Sea and land ships catalogue configuration module.
 * Provides comprehensive ship data including visual styling, naming, and symmetry information.
 *
 * This module centralizes all ship configuration data for sea and land terrain,
 * ensuring consistent styling, naming, and behavioral rules across the game.
 *
 * @module seaShipsCatalogue
 * @typedef {import('./types/config.types.js').ShipColorMap} ShipColorMap
 *   Mapping of ship identifiers to hex color values for UI rendering
 * @typedef {import('./types/config.types.js').ShipNameMap} ShipNameMap
 *   Mapping of ship identifiers to human-readable display names
 * @typedef {import('./types/config.types.js').ShipSymmetryMap} ShipSymmetryMap
 *   Mapping of ship identifiers to symmetry classification codes
 * @typedef {import('./types/config.types.js').ShipBackgroundMap} ShipBackgroundMap
 *   Mapping of ship identifiers to background color/style strings
 */

import { seaAndLandGroups } from './seaAndLandGroups.js'
import { ShipCatalogue } from '../../../ships/ShipGroups.js'

/**
 * Color mapping for sea and land ship types.
 * Maps ship letter identifiers to their display colors used in UI rendering.
 *
 * Ship Categories:
 * - Naval Vessels: A, B, C, D, E, O, S, T (sea-based units in hex colors)
 * - Aircraft: H, J, P, Q (air-based units in hex colors)
 * - Structures: G, L, N, R, U, Y, I (land-based structures in hex colors)
 * - Weapons: M, K, W, +, %, F, Z (abstract weapon types in black/white)
 *
 * Color Format: Hex color codes (#RRGGBB) for precise UI rendering control.
 * Used for ship selection highlighting, board display, and status indicators.
 *
 * @type {Readonly<Record<string, string>>}
 * @readonly
 * @example
 * // Get color for Aircraft Carrier
 * const carrierColor = SEA_SHIP_COLORS['A']; // '#ff6666'
 */
const SEA_SHIP_COLORS = {
  A: '#ff6666', // coral red
  E: '#9966ff', // amethyst purple
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
  '%': '#000',
  F: '#000',
  Z: '#000'
}

/**
 * Display names for sea and land ship types.
 * Maps ship letter identifiers to their human-readable names for UI display.
 *
 * These names are used in tooltips, status messages, selection dialogs, and
 * ship identification throughout the game interface. Each name provides clear,
 * player-friendly identification of the corresponding ship type.
 *
 * Follows standardized game terminology for:
 * - Naval vessels (Aircraft Carrier, Battleship, etc.)
 * - Aircraft (Fighter Jet, Helicopter, etc.)
 * - Defensive structures (Radar Station, Anti-Aircraft Gun, etc.)
 *
 * @type {Readonly<Record<string, string>>}
 * @readonly
 * @example
 * // Get display name for Battleship
 * const shipName = SEA_SHIP_NAMES['B']; // 'Battleship'
 */
const SEA_SHIP_NAMES = {
  A: 'Aircraft Carrier',
  E: 'Heli Carrier',
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
 * Maps ship letter identifiers to their symmetry classifications used in placement validation.
 *
 * Symmetry classifications control how ships can be rotated and placed on the grid:
 * - 'S' (Symmetric): Vertical line of symmetry; can be flipped horizontally
 * - 'A' (Asymmetric): No reflectional symmetry; rotations allowed
 * - 'G' (Grid): Grid-based placement with symmetry rules
 * - 'X' (Cross): Symmetric across both horizontal and vertical axes
 * - 'W' (Weapon): Abstract weapon type with special placement rules
 *
 * Impact on Gameplay:
 * - Symmetric ships offer more flexible placement options
 * - Asymmetric ships require careful orientation during placement
 * - Weapon types bypass normal symmetry rules
 *
 * @type {Readonly<Record<string, string>>}
 * @readonly
 * @example
 * // Check symmetry type for Cruiser
 * const symmetry = SEA_SHIP_SYMMETRIES['C']; // 'S' (Symmetric)
 */
const SEA_SHIP_SYMMETRIES = {
  A: 'S',
  E: 'S',
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
  '%': 'W',
  F: 'W',
  Z: 'W'
}

/**
 * Background styling for sea and land ship types.
 * Maps ship letter identifiers to their background colors/styles used in rendering cells on the game board.
 *
 * Color Format and Transparency:
 * - Ship cells: RGBA colors with 0.3-0.4 alpha for translucent ship overlays
 * - Weapon effects: Hex colors for opaque effect highlighting
 * - Special variants: K1, K2, +1, +2 for weapon-specific effect zones
 *
 * Usage:
 * - Ship placement preview in semi-transparent RGBA
 * - Weapon effect zones in bright contrasting hex colors
 * - Distinct colors for different damage/effect types
 *
 * @type {Readonly<Record<string, string>>}
 * @readonly
 * @example
 * // Get background color for Aircraft Carrier
 * const bgColor = SEA_SHIP_BACKGROUNDS['A']; // 'rgba(255,102,102,0.3)'
 * // Get kinetic strike effect color
 * const effectColor = SEA_SHIP_BACKGROUNDS['K1']; // '#2FA4A9'
 */
const SEA_SHIP_BACKGROUNDS = {
  A: 'rgba(255,102,102,0.3)',
  E: 'rgba(153, 102, 255,0.3)',
  B: 'rgba(102,204,255,0.3)',
  C: 'rgba(102,255,102,0.3)',
  D: 'rgba(153, 255, 51,0.3)',
  S: 'rgba(51, 153, 204,0.3)',
  G: 'rgba(255,153,204,0.3)',
  U: 'rgba(255,255,102,0.4)',
  T: 'rgba(255,204,255,0.3)',
  O: 'rgba(51,204,153,0.3)',
  Q: 'rgba(255,204,102,0.3)',
  H: 'rgba(255,102,153,0.3)',
  J: 'rgba(255,136,77,0.3)',
  P: 'rgba(204, 153, 255,0.3)',
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
  '%': '#9966ff', // Seafoam Green
  '+': '#8FE3D6',
  '+1': '#1F7F7A', //'#5Fa3b6',
  '+2': '#ff8f7a',
  F: '#33ccff',
  F1: '#33ccff',
  Z: '#33cc33'
}

/**
 * Sea and land ships catalogue containing all ship configurations for sea and land terrain.
 *
 * Provides comprehensive ship data including:
 * - Color mapping for visual rendering in UI and game board displays
 * - Human-readable names for display in tooltips, selection dialogs, and status messages
 * - Symmetry rules for placement validation, rotation, and flip operations
 * - Background styling for visual distinction and effect highlighting between ship types
 *
 * Architecture:
 * - Integrates with `seaAndLandGroups` to organize ships by category (Naval, Air, Land)
 * - Provides complete configuration for the ShipCatalogue system
 * - Centralizes configuration to ensure consistency across all game systems
 * - Enables easy modification of ship properties without touching core gameplay logic
 *
 * Dependencies:
 * - `seaAndLandGroups`: Ship grouping and categorization
 * - `ShipCatalogue`: Configuration container and API
 *
 * @type {ShipCatalogue}
 * @readonly
 * @name seaAndLandShipsCatalogue
 * @description Complete configuration catalogue for all sea and land terrain ships
 */
export const seaAndLandShipsCatalogue = new ShipCatalogue(
  [],
  seaAndLandGroups,
  SEA_SHIP_COLORS,
  SEA_SHIP_NAMES,
  SEA_SHIP_SYMMETRIES,
  SEA_SHIP_BACKGROUNDS
)
