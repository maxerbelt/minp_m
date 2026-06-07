import { Shuttle, ArmedShuttle } from './spaceShapes.js'
import { Missile } from './spaceWeapons.js'

/**
 * @typedef {[number, number]} ShuttleCell
 * A coordinate pair representing a single grid cell occupied by a shuttle
 */

/**
 * @typedef {Record<string, ShuttleCell[]>} ShuttleCellMap
 * Map of shuttle names to arrays of cell coordinates they occupy
 */

/**
 * @typedef {Record<string, ShuttleCell[]>} ShuttleRackMap
 * Map of armed shuttle names to arrays of weapon rack cell coordinates
 */

/**
 * @typedef {Object} ShuttleConfig
 * @property {string} name - Display name of the shuttle
 * @property {string} shortCode - Single character identifier for quick lookup
 * @property {string} armor - Character representing armor/durability rating
 * @property {ShuttleCell[]} cells - Grid cells occupied by shuttle
 */

/**
 * Space shuttles - various spacecraft types for space terrain battles
 *
 * Defines pre-configured shuttle types used in space combat, including corvettes,
 * lifters, missile boats, mining ships, runabouts, and scout ships. Each shuttle
 * occupies specific grid cells and has unique combat or utility characteristics.
 *
 * Shuttles can have special properties:
 * - **vulnerable**: Vulnerable to specific weapon types (adjacent squares also damaged)
 * - **hardened**: Resistant to specific weapon types (only center square destroys)
 * - **attachWeapon**: Method to add weapons (for armed shuttles)
 *
 * @module shuttles
 * @example
 * import { corvette, missileBoat, miningShip } from './shuttles.js'
 * const cells = corvette.cells      // Get grid cells
 * const code = missileBoat.shortCode   // 'M' for missile boat
 *
 * @example
 * // Check shuttle vulnerabilities
 * if (lifter.vulnerable.includes('+')) {
 *   console.log('Lifter is vulnerable to missile damage')
 * }
 */

/**
 * Cell configurations for space shuttles.
 * Each constant defines the grid coordinates occupied by a shuttle type.
 * Coordinates are relative to shuttle's anchor point (typically top-left).
 *
 * @type {ShuttleCellMap}
 * @constant
 * @example
 * const corvettePositions = SHUTTLE_CELLS.CORVETTE
 * // [[0,0], [2,0], [1,1], [1,2]] - 4 cells in diamond-like pattern
 */
const SHUTTLE_CELLS = {
  CORVETTE: [
    [0, 0],
    [2, 0],
    [1, 1],
    [1, 2]
  ],
  LIFTER: [
    [0, 0],
    [0, 1],
    [0, 2],
    [0, 3]
  ],
  MISSILE_BOAT: [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, 2]
  ],
  MINING_SHIP: [
    [0, 0],
    [0, 1],
    [0, 2]
  ],
  RUNABOUT: [
    [0, 0],
    [0, 1],
    [1, 2]
  ],
  SCOUT_SHIP: [
    [0, 0],
    [1, 1],
    [2, 1],
    [1, 2]
  ]
}

/**
 * Weapon rack configurations for armed shuttles.
 * Each entry specifies grid cell positions where weapons can be mounted.
 * Only shuttles in this map can attach weapons.
 *
 * @type {ShuttleRackMap}
 * @constant
 * @example
 * const missileBoatRacks = SHUTTLE_RACKS.MISSILE_BOAT
 * // [[1,0], [1,2]] - Two weapon positions on either side
 */
const SHUTTLE_RACKS = {
  MISSILE_BOAT: [
    [1, 0],
    [1, 2]
  ]
}

/**
 * Corvette - Maneuverable shuttle craft optimized for speed and agility
 *
 * A nimble space-faring vessel designed for fast deployment and tactical
 * positioning. The Corvette occupies 4 grid cells in a diamond pattern,
 * providing balanced coverage with moderate durability.
 *
 * @type {Shuttle}
 * @readonly
 * @property {string} name - 'Corvette'
 * @property {string} shortCode - 'V' for quick identification
 * @property {string} armor - 'H' armor rating (standard hull)
 * @property {ShuttleCell[]} cells - 4 cells: [[0,0], [2,0], [1,1], [1,2]]
 *
 * @example
 * import { corvette } from './shuttles.js'
 * const cells = corvette.cells  // Access ship cells
 * const type = corvette.shortCode  // 'V'
 */
export const corvette = new Shuttle(
  'Corvette',
  'V',
  'H',
  SHUTTLE_CELLS.CORVETTE
)

/**
 * Lifter - Transport shuttle with vulnerable hull for cargo capacity
 *
 * A dedicated transport vessel that trades protective armor for cargo capacity.
 * Lifters are equipped with basic PDC (Point Defense Cannon) and anti-missile
 * systems, but their extended structure makes them vulnerable to missile attacks.
 *
 * Adjacent squares of missile detonations also destroy lifter cells, making
 * precision targeting critical for defense.
 *
 * @type {Shuttle}
 * @readonly
 * @property {string} name - 'Lifter'
 * @property {string} shortCode - 'L' for quick identification
 * @property {string} armor - 'L' armor rating (light/vulnerable)
 * @property {ShuttleCell[]} cells - 4 cells in vertical line: [[0,0], [0,1], [0,2], [0,3]]
 * @property {string[]} vulnerable - ['+'] indicates missile vulnerability marker
 * @property {string[]} notes - Descriptive notes about vulnerability mechanics
 *
 * @example
 * if (lifter.vulnerable.includes('+')) {
 *   console.log('Lifter is vulnerable to area missile damage')
 * }
 */
export const lifter = new Shuttle('Lifter', 'L', 'L', SHUTTLE_CELLS.LIFTER)
lifter.vulnerable = ['+']
lifter.notes = [
  `The ${lifter.descriptionText} is vulnerable against missiles.`,
  `The squares of the ${lifter.descriptionText} adjacent to the missiles detonation will also be destroyed.`
]

/**
 * Missile Boat - Armed shuttle with missile weapon capability
 *
 * A combat-focused shuttle equipped with mounted missile systems. The Missile Boat
 * is an ArmedShuttle subclass that can carry and fire missiles at enemy targets.
 * Two weapon racks allow mounting missiles at strategic positions on the hull.
 *
 * Single missile attachment configured to use Missile.single weapon type.
 *
 * @type {ArmedShuttle}
 * @readonly
 * @property {string} name - 'Missile Boat'
 * @property {string} shortCode - 'M' for quick identification
 * @property {string} armor - 'H' armor rating
 * @property {ShuttleCell[]} cells - 4 cells: [[0,1], [1,0], [1,1], [1,2]]
 * @property {ShuttleCell[]} weaponRacks - 2 weapon positions: [[1,0], [1,2]]
 * @property {Function} attachWeapon - Returns Missile.single for weapon system
 *
 * @example
 * import { missileBoat } from './shuttles.js'
 * const racks = missileBoat.weaponRacks  // Access weapon positions
 * const code = missileBoat.shortCode     // 'M'
 */
export const missileBoat = new ArmedShuttle(
  'Missile Boat',
  'M',
  'H',
  SHUTTLE_CELLS.MISSILE_BOAT,
  SHUTTLE_RACKS.MISSILE_BOAT
)
missileBoat.attachWeapon(() => {
  return Missile.single
})

/**
 * Mining Ship - Resource extraction vessel with specialized hardening
 *
 * A specialized shuttle designed for asteroid resource extraction and mining
 * operations. Mining ships are hardened against gauss round attacks, allowing
 * them to operate near hostile installations.
 *
 * Only the center square of a gauss round's area of effect destroys the mining
 * ship; penetrating rounds only reveal the ship's position without causing damage.
 *
 * @type {Shuttle}
 * @readonly
 * @property {string} name - 'Mining Ship'
 * @property {string} shortCode - '3' for quick identification
 * @property {string} armor - 'L' armor rating (light)
 * @property {ShuttleCell[]} cells - 3 cells in vertical line: [[0,0], [0,1], [0,2]]
 * @property {string[]} hardened - ['^'] indicates gauss round hardening pattern
 * @property {string[]} notes - Descriptive notes about hardening mechanics
 *
 * @example
 * if (miningShip.hardened.includes('^')) {
 *   console.log('Mining ship is hardened against gauss rounds')
 * }
 */
export const miningShip = new Shuttle(
  'Mining Ship',
  '3',
  'L',
  SHUTTLE_CELLS.MINING_SHIP
)
miningShip.hardened = ['^']
miningShip.notes = [
  `The ${miningShip.descriptionText} is hardened against gauss rounds.`,
  `Only the center square of the gauss round area of effect will destroy the ${miningShip.descriptionText} a penetrating round will only reveal the ${miningShip.descriptionText} `
]

/**
 * Runabout - Small utility craft for general support operations
 *
 * A compact multipurpose shuttle used for various support operations. The Runabout
 * occupies only 3 grid cells in a scattered pattern, making it highly maneuverable
 * and difficult to target.
 *
 * @type {Shuttle}
 * @readonly
 * @property {string} name - 'Runabout'
 * @property {string} shortCode - '4' for quick identification
 * @property {string} armor - 'D' armor rating (standard durability)
 * @property {ShuttleCell[]} cells- 3 cells: [[0,0], [0,1], [1,2]]
 *
 * @example
 * const runaboutCells = runabout.cells
 * const type = runabout.shortCode  // '4'
 */
export const runabout = new Shuttle(
  'Runabout',
  '4',
  'D',
  SHUTTLE_CELLS.RUNABOUT
)

/**
 * Scout Ship - Reconnaissance vessel for tactical intelligence gathering
 *
 * A fast reconnaissance shuttle optimized for intelligence gathering and patrol.
 * Scout ships occupy 4 grid cells in a cross-like pattern, providing good visibility
 * for sensor operations while maintaining decent evasion capability.
 *
 * @type {Shuttle}
 * @readonly
 * @property {string} name - 'Scout Ship'
 * @property {string} shortCode - '1' for quick identification
 * @property {string} armor - 'D' armor rating (standard durability)
 * @property {ShuttleCell[]} cella - 4 cells in cross pattern: [[0,0], [1,1], [2,1], [1,2]]
 *
 * @example
 * const scoutCells = scoutShip.cells
 * if (scoutShip.shortCode === '1') {
 *   console.log('Scout ship reconnaissance active')
 * }
 */
export const scoutShip = new Shuttle(
  'Scout Ship',
  '1',
  'D',
  SHUTTLE_CELLS.SCOUT_SHIP
)
