import { Installation, CoreInstallation } from './spaceShapes.js'

/**
 * @typedef {[number, number]} InstallationCell
 * A coordinate pair representing a single grid cell occupied by an installation
 */

/**
 * @typedef {Record<string, InstallationCell[]>} InstallationCellMap
 * Map of installation names to arrays of cell coordinates they occupy
 */

/**
 * @typedef {Object} InstallationConfig
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
 * @module installations
 * @example
 * import { shelter, mine, commandCenter } from './installations.js'
 * const cells = shelter.cellList  // Get grid cells occupied
 * const code = mine.shortCode     // 'N' for mine
 *
 * @example
 * // Check installation properties
 * if (commandCenter.hardened.includes('+')) {
 *   console.log('Command center is missile-hardened')
 * }
 */

/**
 * Cell configurations for space installations.
 * Each constant defines the grid coordinates occupied by an installation type.
 * Coordinates are relative to installation's anchor point (typically top-left).
 * @type {InstallationCellMap}
 * @constant
 * @example
 * const shelterPositions = INSTALLATION_CELLS.SHELTER
 * // [[0,1], [0,2], [1,0], [2,0]] - 4 cells in L-shape pattern
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
 * Shelters provide basic defense and are vulnerable to missile attacks.
 *
 * @type {Installation}
 * @readonly
 * @property {string} name - 'Shelter'
 * @property {string} shortCode - 'S' for quick identification
 * @property {string} armor - 'H' armor rating
 * @property {InstallationCell[]} cellList - 4 cells in L-shape: [[0,1], [0,2], [1,0], [2,0]]
 *
 * @example
 * const occupiedCells = shelter.cellList
 * const typeCode = shelter.shortCode  // 'S'
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
 * A buried defensive installation occupying 5 grid cells. Unlike normal installations,
 * mines are hardened against missile attacks - only the center square of a missile's
 * area of effect destroys the mine, surrounding squares only reveal its position.
 *
 * @type {Installation}
 * @readonly
 * @property {string} name - 'Mine'
 * @property {string} shortCode - 'N' for identification
 * @property {string} armor - 'D' for defense rating
 * @property {InstallationCell[]} cellList - 5 cells: [[0,1], [1,0], [1,1], [2,1], [2,2]]
 * @property {string[]} hardened - ['|'] indicates missile hardening pattern
 * @property {string[]} notes - Descriptive notes about hardening and damage behavior
 *
 * @example
 * if (mine.hardened.includes('|')) {
 *   console.log('Mine is protected from missile area damage')
 * }
 */
export const mine = new Installation('Mine', 'N', 'D', INSTALLATION_CELLS.MINE)
mine.hardened = ['|']
mine.notes = [
  `The ${mine.descriptionText} is hardened against missiles.`,
  `Only the center square of the missile area of effect will destroy the ${mine.descriptionText} the surrounding squares will only reveal the ${mine.descriptionText} `
]

/**
 * Command Center - Core hardened installation with centralized control
 *
 * A critical infrastructure installation occupying 5 grid cells. Command Centers
 * are core installations (inherit from CoreInstallation) that control battlefield
 * operations. Like mines, they are hardened against missile attacks.
 *
 * @type {CoreInstallation}
 * @readonly
 * @property {string} name - 'Command Center'
 * @property {string} shortCode - 'J' for identification
 * @property {string} armor - 'A' for armor rating
 * @property {InstallationCell[]} cellList - 5 cells: [[0,0], [0,1], [1,1], [2,1], [2,2]]
 * @property {string[]} hardened - ['+'] indicates missile hardening pattern
 * @property {string[]} notes - Descriptive notes about hardening and strategic importance
 *
 * @example
 * if (commandCenter.hardened.includes('+')) {
 *   console.log('Command center is hardened against missile attacks')
 * }
 */
export const commandCenter = new CoreInstallation(
  'Command Center',
  'J',
  'A',
  INSTALLATION_CELLS.COMMAND_CENTER
)
commandCenter.hardened = ['+']
commandCenter.notes = [
  `The ${commandCenter.descriptionText} is hardened against missiles.`,
  `Only the center square of the missile area of effect will destroy the ${commandCenter.descriptionText} the surrounding squares will only reveal the ${commandCenter.descriptionText} `
]
