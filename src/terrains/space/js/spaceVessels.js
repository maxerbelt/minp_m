import { SpaceVessel, DeepSpaceVessel, ArmedVessel } from './spaceShapes.js'
import { GuassRound } from './spaceWeapons.js'

/**
 * Cell configurations for space vessels.
 * Each constant defines the grid coordinates occupied by a vessel type.
 * @type {Object<string, Array<[number, number]>>}
 */
const VESSEL_CELLS = {
  ATTACK_CRAFT: [
    [0, 0],
    [2, 0],
    [1, 1]
  ],
  GUN_BOAT: [
    [0, 0],
    [0, 1],
    [1, 0]
  ],
  ATTACK_CRAFT_CARRIER: [
    [1, 0],
    [0, 1],
    [2, 1],
    [0, 2],
    [2, 2]
  ],
  SUPER_CARRIER: [
    [0, 0],
    [1, 0],
    [0, 1],
    [2, 1],
    [0, 2],
    [2, 2]
  ],
  STARBASE: [
    [0, 0],
    [1, 0],
    [2, 0],
    [0, 1],
    [2, 1],
    [0, 2],
    [2, 2]
  ],
  FRIGATE: [
    [0, 0],
    [2, 0],
    [1, 1],
    [1, 2],
    [1, 3]
  ],
  DESTROYER: [
    [0, 0],
    [2, 0],
    [1, 1],
    [1, 2],
    [2, 2]
  ],
  CRUISER: [
    [0, 0],
    [2, 0],
    [1, 1],
    [0, 2],
    [1, 2],
    [2, 2]
  ],
  BATTLECRUISER: [
    [0, 0],
    [2, 0],
    [1, 1],
    [0, 2],
    [1, 2],
    [2, 2],
    [1, 3]
  ],
  ORBITAL: [
    [0, 0],
    [0, 1],
    [1, 0],
    [1, 2],
    [2, 1],
    [2, 2]
  ],
  WHEEL: [
    [0, 1],
    [1, 0],
    [1, 1],
    [2, 2],
    [2, 3],
    [3, 2]
  ],
  PATROL_BOAT: [
    [0, 0],
    [1, 1],
    [0, 2],
    [1, 2]
  ],
  PRIVATEER: [
    [0, 0],
    [1, 1],
    [2, 2],
    [1, 3],
    [2, 3]
  ],
  CARGO_HAULER: [
    [0, 0],
    [1, 1],
    [1, 2],
    [0, 3],
    [1, 3]
  ],
  MERCHANTER: [
    [0, 0],
    [1, 1],
    [1, 2],
    [1, 3],
    [0, 4],
    [1, 4]
  ],
  SPACE_LINER: [
    [0, 0],
    [1, 1],
    [1, 2],
    [1, 3]
  ],
  TRANSPORT: [
    [0, 0],
    [0, 1],
    [0, 2],
    [0, 3],
    [0, 4]
  ]
}

/**
 * Weapon rack configurations for armed shuttles.
 * @type {Object<string, Array<[number, number]>>}
 */
const VESSEL_RACKS = {
  GUN_BOAT: [[0, 0]]
}

/**
 * Attack Craft - Fast, maneuverable fighter vulnerable to missiles.
 * @type {SpaceVessel}
 */
export const attackCraft = new SpaceVessel(
  'Attack Craft',
  'A',
  'H',
  VESSEL_CELLS.ATTACK_CRAFT
)
attackCraft.vulnerable = ['+', '|', '^']
attackCraft.notes = [
  `The ${attackCraft.descriptionText} is vulnerable against missiles.`,
  `The squares of the ${attackCraft.descriptionText} adjacent to the missiles detonation will also be destroyed.`
]

/**
 * Gun Boat - Armed shuttle with light gauss weapons.
 * @type {ArmedVessel}
 */
export const gunBoat = new ArmedVessel(
  'Gun Boat',
  'G',
  'D',
  VESSEL_CELLS.GUN_BOAT,
  null, // tip - use default
  VESSEL_RACKS.GUN_BOAT
)

gunBoat.attachWeapon(() => {
  return GuassRound.single
})

/**
 * Attack Craft Carrier - Launches attack craft.
 * @type {SpaceVessel}
 */
export const attackCraftCarrier = new SpaceVessel(
  'Attack Craft Carrier',
  'K',
  'H',
  VESSEL_CELLS.ATTACK_CRAFT_CARRIER
)

/**
 * Super Carrier - Launches attack craft, gun boats, scout ships, and corvettes.
 * @type {SpaceVessel}
 */
export const superCarrier = new SpaceVessel(
  'Super Carrier',
  'X',
  'D',
  VESSEL_CELLS.SUPER_CARRIER
)

/**
 * Starbase - Launches gun boats, scout ships, corvettes, and frigates.
 * @type {SpaceVessel}
 */
export const starbase = new SpaceVessel(
  'Starbase',
  'Z',
  'D',
  VESSEL_CELLS.STARBASE
)

/**
 * Frigate - Armed with heavy thermal lance.
 * @type {SpaceVessel}
 */
export const frigate = new SpaceVessel(
  'Frigate',
  'F',
  'H',
  VESSEL_CELLS.FRIGATE
)

/**
 * Destroyer - Armed with heavy thermal lance.
 * @type {SpaceVessel}
 */
export const destroyer = new SpaceVessel(
  'Destroyer',
  'D',
  'D',
  VESSEL_CELLS.DESTROYER
)

/**
 * Cruiser - Lays and defuses mines.
 * @type {SpaceVessel}
 */
export const cruiser = new SpaceVessel(
  'Cruiser',
  'C',
  'H',
  VESSEL_CELLS.CRUISER
)

/**
 * Battlecruiser - Armed with extra heavy thermal lance x2.
 * @type {SpaceVessel}
 */
export const battlecruiser = new SpaceVessel(
  'Battlecruiser',
  'B',
  'H',
  VESSEL_CELLS.BATTLECRUISER
)

/**
 * Orbital - Deep space vessel vulnerable to rail bolts.
 * @type {DeepSpaceVessel}
 */
export const orbital = new DeepSpaceVessel(
  'Orbital',
  'O',
  'G',
  VESSEL_CELLS.ORBITAL
)
orbital.vulnerable = ['|']
orbital.notes = [
  `The ${orbital.descriptionText} is vulnerable against Rail Bolts.`,
  `The squares of the ${orbital.descriptionText} orthogonally adjacent to the strike will also be destroyed.`
]

/**
 * Wheel - Deep space vessel.
 * @type {DeepSpaceVessel}
 */
export const wheel = new DeepSpaceVessel('Wheel', 'W', 'G', VESSEL_CELLS.WHEEL)

/**
 * Patrol Boat - Generates privateers and merchanters.
 * @type {SpaceVessel}
 */
export const patrolBoat = new SpaceVessel(
  'Patrol Boat',
  'P',
  'D',
  VESSEL_CELLS.PATROL_BOAT
)

/**
 * Privateer - Armed with thermal lance.
 * @type {SpaceVessel}
 */
export const privateer = new SpaceVessel(
  'Privateer',
  '2',
  'D',
  VESSEL_CELLS.PRIVATEER
)

/**
 * Cargo Hauler - Armed with ion cannon.
 * @type {SpaceVessel}
 */
export const cargoHauler = new SpaceVessel(
  'Cargo Hauler',
  'U',
  'D',
  VESSEL_CELLS.CARGO_HAULER
)
cargoHauler.vulnerable = ['|', '^']
cargoHauler.notes = [
  `The ${cargoHauler.descriptionText} is vulnerable against missiles.`,
  `The squares of the ${cargoHauler.descriptionText} adjacent to the missiles detonation will also be destroyed.`
]
/**
 * Merchanter - Armed with ion cannon.
 * @type {SpaceVessel}
 */
export const merchanter = new SpaceVessel(
  'Merchanter',
  'E',
  'D',
  VESSEL_CELLS.MERCHANTER
)

/**
 * Space Liner - Civilian transport vessel.
 * @type {SpaceVessel}
 */
export const spaceLiner = new SpaceVessel(
  'Space Liner',
  'I',
  'D',
  VESSEL_CELLS.SPACE_LINER
)

/**
 * Transport - Large cargo vessel.
 * @type {SpaceVessel}
 */
export const transport = new SpaceVessel(
  'Transport',
  'T',
  'L',
  VESSEL_CELLS.TRANSPORT
)
