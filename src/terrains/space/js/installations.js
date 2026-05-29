/**
 * @import { Installation, CoreInstallation } from './spaceShapes.js'
 */

import { Installation, CoreInstallation } from './spaceShapes.js'

/**
 * @typedef {[number, number]} InstallationCell
 * A coordinate pair representing a single grid cell occupied by an installation.
 * First element is row (0-indexed), second is column (0-indexed).
 */

/**
 * @typedef {Record<string, InstallationCell[]>} InstallationCellMap
 * Map of installation names to arrays of cell coordinates they occupy on the grid.
 * Keys are installation type identifiers (SHELTER, MINE, COMMAND_CENTER).
 * Values are arrays of [row, column] coordinate pairs relative to installation anchor.
 */

/**
 * @typedef {Object} InstallationConfig
 * Configuration object for creating new installation instances.
 * @property {string} name - Display name of the installation
 * @property {string} shortCode - Single character representation for quick lookup
 * @property {string} armor - Character representing armor/defense type
 * @property {InstallationCell[]} cells - Grid cells occupied by installation
 */

/**
 * Space installations - defensive and support structures for space battles
 *
 * Defines pre-configured installation types used in space terrain battles,
 * including shelters, mines, and command centers. Each installation occupies
 * specific grid cells and has unique defensive properties.
 *
 * Installations serve as point-defense structures, early warning systems, and command centers
 * in asteroid field combat. They are placed on asteroid terrain and provide terrain-dependent
 * defensive capabilities.
 *
 * @module installations
 * @example
 * import { shelter, mine, commandCenter } from './installations.js'
 * const cells = shelter.cellList  // Get grid cells occupied
 * const code = mine.shortCode     // 'N' for mine
 *
 * @example
 * // Check installation hardening properties
 * if (commandCenter.hardened.includes('+')) {
 *   console.log('Command center is missile-hardened')
 * }
 *
 * @example
 * // Access installation placement tips
 * console.log(mine.tip)  // Detailed placement instructions
 */

/**
 * Cell configurations for space installations.
 * Each constant defines the grid coordinates occupied by an installation type.
 * Coordinates are relative to installation's anchor point (typically top-left corner).
 * These cells represent the physical footprint of each installation on the asteroid grid.
 *
 * @type {InstallationCellMap}
 * @constant
 * @readonly
 * @example
 * // Shelter occupies 4 cells in L-shape pattern
 * const shelterPositions = INSTALLATION_CELLS.SHELTER
 * // [[0,1], [0,2], [1,0], [2,0]]
 *
 * @example
 * // Mine occupies 5 cells in cross pattern
 * const minePositions = INSTALLATION_CELLS.MINE
 * // [[0,1], [1,0], [1,1], [2,1], [2,2]]
 */
const INSTALLATION_CELLS = {
  SHELTER: [
    [0, 1],
    [0, 2],
    [1, 0],
    [2, 0]
  ],
  MINE: [
    [0, 1],
    [1, 0],
    [1, 1],
    [2, 1],
    [2, 2]
  ],
  COMMAND_CENTER: [
    [0, 0],
    [0, 1],
    [1, 1],
    [2, 1],
    [2, 2]
  ]
}

/**
 * Shelter - Defensive installation with PDC (Point Defense Cannon) light and anti-missile systems
 *
 * A protective structure that occupies 4 grid cells in an L-shaped pattern.
 * Shelters provide basic area defense against incoming attacks and serve as deployment points.
 * They are vulnerable to missile attacks but can detect and engage multiple targets.
 *
 * Placement: On asteroid terrain at regular placement depth.
 *
 * @type {Installation}
 * @readonly
 * @property {string} name - Display name: 'Shelter'
 * @property {string} letter - Single character identifier: 'S'
 * @property {string} symmetry - Armor rating: 'H' (for armor type)
 * @property {InstallationCell[]} cellList - Grid footprint: [[0,1], [0,2], [1,0], [2,0]]
 * @property {number} cellList.length - Always 4 cells
 * @property {string} type - Installation type: 'G' (ground installation)
 * @property {string} tip - Detailed placement and usage instructions
 * @property {string} descriptionText - Display name from constructor
 *
 * @example
 * // Get shelter dimensions and position
 * const cells = shelter.cellList  // 4 cells in L-shape
 * const typeCode = shelter.shortCode  // 'S'
 * console.log(shelter.name)  // 'Shelter'
 *
 * @example
 * // Use in placement validation
 * if (shelter.type() === 'G') {
 *   console.log('Can place on asteroid terrain')
 * }
 */
export const shelter = new Installation(
  'Shelter',
  'S',
  'H',
  INSTALLATION_CELLS.SHELTER
)

/**
 * Mine - Hardened defensive installation with missile resistance
 *
 * A buried defensive installation occupying 5 grid cells in a cross pattern.
 * Mines are hardened against missile attacks - only the center square of a missile's
 * area of effect destroys the mine, while surrounding squares only reveal its position.
 *
 * Mines are particularly effective as deterrents against missile bombardment and require
 * precision targeting to eliminate. They provide a defensive advantage against area-effect
 * weapons by reducing collateral damage vulnerability.
 *
 * Placement: On asteroid terrain at regular deployment depth.
 *
 * @type {Installation}
 * @readonly
 * @property {string} name - Display name: 'Mine'
 * @property {string} letter - Single character identifier: 'N'
 * @property {string} symmetry - Armor rating: 'D' (for defense)
 * @property {InstallationCell[]} cellList - Grid footprint: [[0,1], [1,0], [1,1], [2,1], [2,2]]
 * @property {number} cellList.length - Always 5 cells
 * @property {string} type - Installation type: 'G' (ground installation)
 * @property {string} tip - Detailed placement and hardening instructions
 * @property {string} descriptionText - Display name from constructor
 * @property {string[]} hardened - Hardening pattern indicator: ['|']
 * @property {string[]} notes - Detailed tactical notes about missile hardening behavior
 * @property {string} notes[0] - Description of hardening properties
 * @property {string} notes[1] - Explanation of center-square destruction mechanic
 *
 * @example
 * // Check hardening status
 * if (mine.hardened.includes('|')) {
 *   console.log('Mine is protected from missile area damage')
 * }
 *
 * @example
 * // Get tactical information
 * console.log(mine.notes[0])  // Hardening description
 * console.log(mine.cellList.length)  // 5 cells
 */
export const mine = new Installation('Mine', 'N', 'D', INSTALLATION_CELLS.MINE)
/** @type {string[]} Hardening indicator pattern for missile resistance */
mine.hardened = ['|']
/** @type {string[]} Tactical notes about mine hardening and destruction mechanics */
mine.notes = [
  `The ${mine.descriptionText} is hardened against missiles.`,
  `Only the center square of the missile area of effect will destroy the ${mine.descriptionText} the surrounding squares will only reveal the ${mine.descriptionText} `
]

/**
 * Command Center - Core hardened installation with centralized control
 *
 * A critical infrastructure installation occupying 5 grid cells. Command Centers
 * are core installations (inherit from CoreInstallation) that control battlefield
 * operations. Like mines, they are hardened against missile attacks - only the center
 * square of a missile's area of effect destroys the command center, surrounding squares
 * only reveal its position.
 *
 * Command centers must be placed deep within asteroids and serve as strategic targets.
 * Their destruction significantly impacts unit coordination and defensive capabilities.
 * The hardening against area-effect weapons makes them resilient but requires precise
 * targeting for elimination.
 *
 * Placement: Deep within asteroid terrain (special placement rule for CoreInstallation).
 *
 * @type {CoreInstallation}
 * @readonly
 * @property {string} name - Display name: 'Command Center'
 * @property {string} letter - Single character identifier: 'J'
 * @property {string} symmetry - Armor rating: 'A' (for armor/armor-plated)
 * @property {InstallationCell[]} cellList - Grid footprint: [[0,0], [0,1], [1,1], [2,1], [2,2]]
 * @property {number} cellList.length - Always 5 cells
 * @property {string} type - Installation type: 'G' (ground installation)
 * @property {string} tip - Deep placement and hardening instructions
 * @property {string} descriptionText - Display name from constructor
 * @property {string[]} hardened - Hardening pattern indicator: ['+']
 * @property {string[]} notes - Detailed tactical notes about missile hardening and strategic value
 * @property {string} notes[0] - Description of hardening properties
 * @property {string} notes[1] - Explanation of center-square destruction mechanic
 *
 * @example
 * // Verify hardening and deployment
 * if (commandCenter.hardened.includes('+')) {
 *   console.log('Command center is hardened against missile attacks')
 * }
 *
 * @example
 * // Get strategic information
 * console.log(commandCenter.name)  // 'Command Center'
 * console.log(commandCenter.letter)  // 'J'
 * console.log(commandCenter.notes[0])  // Hardening description
 */
export const commandCenter = new CoreInstallation(
  'Command Center',
  'J',
  'A',
  INSTALLATION_CELLS.COMMAND_CENTER
)
/** @type {string[]} Hardening indicator pattern for missile resistance */
commandCenter.hardened = ['+']
/** @type {string[]} Tactical notes about command center hardening and destruction mechanics */
commandCenter.notes = [
  `The ${commandCenter.descriptionText} is hardened against missiles.`,
  `Only the center square of the missile area of effect will destroy the ${commandCenter.descriptionText} the surrounding squares will only reveal the ${commandCenter.descriptionText} `
]
