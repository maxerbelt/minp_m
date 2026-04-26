import { Shuttle, ArmedShuttle } from './spaceShapes.js'
import { Missile } from './spaceWeapons.js'

/**
 * Cell configurations for space shuttles.
 * Each constant defines the grid coordinates occupied by a shuttle type.
 * @type {Object<string, Array<[number, number]>>}
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
 * @type {Object<string, Array<[number, number]>>}
 */
const SHUTTLE_RACKS = {
  MISSILE_BOAT: [
    [1, 0],
    [1, 2]
  ]
}

/**
 * Corvette - Maneuverable shuttle craft.
 * @type {Shuttle}
 */
export const corvette = new Shuttle(
  'Corvette',
  'V',
  'H',
  SHUTTLE_CELLS.CORVETTE
)

/**
 * Lifter - Transport shuttle with PDC and anti-missile defenses.
 * @type {Shuttle}
 */
export const lifter = new Shuttle('Lifter', 'L', 'L', SHUTTLE_CELLS.LIFTER)

/**
 * Missile Boat - Armed shuttle with missile weapons.
 * @type {ArmedShuttle}
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
 * Mining Ship - Resource extraction vessel.
 * @type {Shuttle}
 */
export const miningShip = new Shuttle(
  'Mining Ship',
  '3',
  'L',
  SHUTTLE_CELLS.MINING_SHIP
)

/**
 * Runabout - Small utility craft.
 * @type {Shuttle}
 */
export const runabout = new Shuttle(
  'Runabout',
  '4',
  'D',
  SHUTTLE_CELLS.RUNABOUT
)

/**
 * Scout Ship - Reconnaissance vessel.
 * @type {Shuttle}
 */
export const scoutShip = new Shuttle(
  'Scout Ship',
  '1',
  'D',
  SHUTTLE_CELLS.SCOUT_SHIP
)
