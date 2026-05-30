import {
  Building,
  HillFort,
  CoastalPort,
  SeaVessel,
  ShallowDock,
  Plane,
  DeepSeaVessel
} from './SeaShape.js'

import { seaAndLandShipsCatalogue } from './seaShipsCatalogue.js'
import { Hybrid } from '../../../ships/Hybrid.js'
import { SpecialCells, StandardCells } from '../../../ships/SubShape.js'

/**
 * @typedef {Building | HillFort | CoastalPort | SeaVessel | ShallowDock | Plane | DeepSeaVessel | Hybrid} SeaShip
 * Union type representing all possible sea and land ship types available in the game.
 * Each type represents a different class of military unit or structure with unique properties.
 *
 * Ship Type Categories:
 * - Buildings: Underground Bunker, Anti-Aircraft Gun, Radar Station (defensive structures)
 * - Hill Forts: Bomb Shelter (hardened shelters)
 * - Sea Vessels: Aircraft Carrier, Battleship, Cruiser, Destroyer, Submarine, Tanker (naval combat units)
 * - Planes: Jet Fighter, Helicopter, Airplane, Stealth Bomber (air support units)
 * - Hybrid: Supply Depot, Naval Base, Pier (multi-terrain structures)
 * - Deep Sea: Oil Rig (resource extraction)
 *
 * @example
 * // All ship types can be added to the seaFleet array
 * const ship: SeaShip = new Building('Test', 'T', 'H', [[0, 0]])
 */

/**
 * @typedef {[number, number]} CellCoordinate
 * Represents a [row, column] coordinate for a ship cell on the game grid.
 * Row and column indices are zero-based integers.
 *
 * @example
 * // Top-left corner of the grid
 * const topLeft: CellCoordinate = [0, 0]
 * // Third row, fifth column
 * const cell: CellCoordinate = [2, 4]
 */

/**
 * @typedef {Object} ShipProperties
 * Properties that can be assigned to any ship to define weapon interactions and special rules.
 * These properties modify how weapons affect the ship and provide gameplay descriptions.
 * @property {string[]} [vulnerable] - Weapon types this ship is vulnerable to (single hit destroys)
 * @property {string[]} [hardened] - Weapon types this ship is hardened against (reduced damage)
 * @property {string[]} [immune] - Weapon types this ship is completely immune to (no effect)
 * @property {string[]} [notes] - Flavor text and special rules describing ship mechanics and interactions
 *
 * @example
 * // Submarine with multiple defense properties
 * const sub = { vulnerable: ['%', 'Z'], hardened: ['M'], immune: ['R'], notes: [...] }
 */

/**
 * Underground defensive structure providing hardened shelter against Mega bombs.
 * Strategic defensive installation for protecting key land positions.
 * Resists conventional bombardment with hardened construction.
 *
 * @type {Building}
 * @readonly
 */
const undergroundBunker = new Building('Underground Bunker', 'U', 'H', [
  [0, 0],
  [1, 0],
  [1, 1],
  [1, 2],
  [1, 3],
  [1, 4],
  [0, 4]
])
/**
 * Ground-based defensive structure for anti-air combat.
 * Provides aerial defense against air-based threats.
 *
 * @type {Building}
 * @readonly
 */
const antiAircraftGun = new Building('Anti-Aircraft Gun', 'G', 'S', [
  [0, 0],
  [1, 1],
  [0, 2],
  [2, 0],
  [2, 2]
])
/**
 * Detection facility for tracking enemy movements and air targets.
 * Strategic information gathering installation for battlefield awareness.
 *
 * @type {Building}
 * @readonly
 */
const radarStation = new Building('Radar Station', 'R', 'H', [
  [0, 0],
  [1, 0],
  [2, 0],
  [2, 1],
  [2, 2]
])
/**
 * Fortified underground shelter hardened against Mega bombs.
 * Only the center square of the bomb will destroy this structure;
 * surrounding squares only reveal it.
 *
 * @type {HillFort}
 * @readonly
 */
const bombShelter = new HillFort('Bomb Shelter', 'L', 'H', [
  [0, 0],
  [1, 0],
  [1, 1],
  [1, 2],
  [0, 2]
])
/** @type {string[]} */
bombShelter.hardened = ['M']
/** @type {string[]} */
bombShelter.notes = [
  `The ${bombShelter.descriptionText} is hardened against Mega bombs.`,

  `Only the center square of the bomb will destroy the ${bombShelter.descriptionText} the surrounding squares will only reveal the ${bombShelter.descriptionText} `
]

/**
 * Hybrid structure with land and coastal port components.
 * The dotted parts must be placed adjacent to sea.
 * Combines a land-based building component with a coastal port component.
 * Provides supply and logistics support for naval operations.
 *
 * @type {Hybrid}
 * @readonly
 */
const supplyDepot = new Hybrid(
  'Supply Depot',
  'Y',
  'D',
  [
    [0, 0],
    [1, 0],
    [1, 1]
  ],
  [
    new StandardCells(
      Building.validator,
      Building.zoneDetail,
      Building.subterrain
    ),
    new SpecialCells(
      [[0, 0]],
      CoastalPort.validator,
      CoastalPort.zoneDetail,
      Building.subterrain
    )
  ],
  'place Supply Depot on the coast.'
)
/** @type {number} */
supplyDepot.subterrain = Building.subterrain
/** @type {boolean|Function} */
supplyDepot.canBeOn = Building.canBe
/** @type {string[]} */
supplyDepot.notes = [
  `the dotted parts of the ${supplyDepot.descriptionText} must be placed adjacent to sea.`
]
/**
 * Hybrid seaport structure with shallow dock component.
 * The dotted parts must be placed adjacent to land.
 * Combines a sea-based vessel component with a shallow dock component.
 * @type {Hybrid}
 * @readonly
 */
const pier = new Hybrid(
  'Pier',
  'I',
  'H',
  [
    [0, 0],
    [1, 0]
  ],
  [
    new StandardCells(
      SeaVessel.validator,
      SeaVessel.zoneDetail,
      SeaVessel.subterrain
    ),
    new SpecialCells(
      [[0, 0]],
      ShallowDock.validator,
      ShallowDock.zoneDetail,
      SeaVessel.subterrain
    )
  ],
  'place Pier adjacent to the coast.'
)
/** @type {boolean|Function} */
pier.canBeOn = SeaVessel.canBe
/** @type {number} */
pier.subterrain = SeaVessel.subterrain
/** @type {string[]} */
pier.notes = [
  `the dotted parts of the ${pier.descriptionText} must be placed adjacent to land.`
]
/**
 * Hybrid military facility with land and sea components.
 * Must be placed half on land and half on sea.
 * Dotted parts on sea, undotted parts on land.
 * Strategic installation combining land fortifications with naval docking.
 * @type {Hybrid}
 * @readonly
 */
const navalBase = new Hybrid(
  'Naval Base',
  'N',
  'D',
  [
    [0, 0],
    [1, 0],
    [2, 0],
    [2, 1]
  ],
  [
    new StandardCells(
      Building.validator,
      Building.zoneDetail,
      Building.subterrain
    ),
    new SpecialCells(
      [
        [0, 0],
        [1, 0]
      ],
      SeaVessel.validator,
      SeaVessel.zoneDetail,
      SeaVessel.subterrain
    )
  ],
  'place Naval Base half on land and half on sea.'
)
/** @type {string[]} */
navalBase.notes = [
  `the dotted parts of the ${navalBase.descriptionText} must be placed on sea, while the undotted parts on the land`
]
/**
 * Fast tactical aircraft with delta wing configuration.
 * @type {Plane}
 * @readonly
 */
const jetFighterCraft = new Plane('Jet Fighter', 'J', 'H', [
  [0, 1],
  [1, 1],
  [2, 0],
  [2, 1],
  [2, 2]
])
/**
 * Lightweight rotary-wing aircraft vulnerable to conventional and fire weapons.
 * @type {Plane}
 * @readonly
 */
const helicopter = new Plane('Helicopter', 'H', 'S', [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, 2],
  [2, 1]
])
/** @type {string[]} */
helicopter.vulnerable = ['W', 'F']
/**
 * Standard transport or utility aircraft vulnerable to conventional and fire weapons.
 * @type {Plane}
 * @readonly
 */
const airplane = new Plane('Airplane', 'P', 'H', [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, 2]
])
/** @type {string[]} */
airplane.vulnerable = ['W', 'F']
/**
 * Advanced stealth bomber with specialized defenses.
 * Vulnerable to Kinetic Strikes; orthogonally adjacent squares destroyed.
 * Hardened against conventional weapons, immune to area effects.
 * @type {Plane}
 */
const stealthBomber = new Plane('Stealth Bomber', 'Q', 'H', [
  [0, 0],
  [1, 0],
  [2, 0],
  [0, 1],
  [1, 1],
  [0, 2]
])
/** @type {string[]} */
stealthBomber.vulnerable = ['K']
/** @type {string[]} */
stealthBomber.hardened = ['W']
/** @type {string[]} */
stealthBomber.immune = ['+']
/** @type {string[]} */
stealthBomber.notes = [
  `The ${stealthBomber.descriptionText} is vulnerable against Kinetic Strikes.`,
  `The squares of the ${stealthBomber.descriptionText} orthogonally adjacent to the strike will also be destroyed.`
]
/**
 * Large capital ship designed to launch and recover aircraft.
 * @type {SeaVessel}
 */
const aircraftCarrier = new SeaVessel('Aircraft Carrier', 'A', 'A', [
  [0, 0],
  [0, 1],
  [0, 2],
  [0, 3],
  [1, 1],
  [1, 2],
  [1, 3],
  [1, 4]
])

/**
 * Naval vessel optimized for helicopter operations.
 * @type {SeaVessel}
 */
const heliCarrier = new SeaVessel('Heli Carrier', 'E', 'A', [
  [0, 0],
  [0, 1],
  [0, 2],
  [1, 1],
  [1, 2],
  [1, 3]
])
/**
 * Large cargo vessel vulnerable to sonar and area effect weapons.
 * @type {SeaVessel}
 */
const tanker = new SeaVessel('Tanker', 'T', 'L', [
  [0, 0],
  [0, 1],
  [0, 2],
  [0, 3],
  [0, 4],
  [0, 5]
])
/** @type {string[]} */
tanker.vulnerable = ['Z', '+']
/**
 * Heavily armed capital ship designed for direct naval combat.
 * @type {SeaVessel}
 */
const battleship = new SeaVessel('Battleship', 'B', 'L', [
  [0, 0],
  [0, 1],
  [0, 2],
  [0, 3],
  [0, 4]
])
/**
 * Offshore extraction facility vulnerable to Mega bombs.
 * Squares adjacent to bomb strikes are also destroyed.
 * Strategic resource structure with regional economic importance.
 * @type {DeepSeaVessel}
 */
const oilRig = new DeepSeaVessel('Oil Rig', 'O', 'S', [
  [0, 0],
  [0, 1],
  [1, 0],
  [1, 1]
])
/** @type {string[]} */
oilRig.vulnerable = ['M']
/** @type {string[]} */
oilRig.notes = [
  `The ${oilRig.descriptionText} is vulnerable against Mega bombs.`,
  `The squares of the ${oilRig.descriptionText} adjacent to the bomb will also be destroyed.`
]
/**
 * Medium-sized warship designed for fleet support and commerce raiding.
 * @type {SeaVessel}
 */
const cruiser = new SeaVessel('Cruiser', 'C', 'L', [
  [0, 0],
  [0, 1],
  [0, 2],
  [0, 3]
])
/**
 * Fast warship designed for escort and anti-submarine duties.
 * @type {SeaVessel}
 */
const destroyer = new SeaVessel(
  'Destroyer',
  'D',
  'L',
  [
    [0, 0],
    [0, 1],
    [0, 2]
  ],
  null,
  [[0, 2]]
)
/**
 * Underwater vessel with specialized damage properties.
 * Vulnerable to depth charges and sonar (not revealed by them).
 * Only revealed by Mega bombs, but hardened against their damage.
 * Immune to radar detection.
 * Only center square of bomb destroys; surrounding squares only reveal.
 * @type {SeaVessel}
 */
const submarine = new SeaVessel(
  'Submarine',
  'S',
  'L',
  [
    [0, 0],
    [0, 1]
  ],
  null,
  [
    [0, 0],
    [0, 1]
  ]
)
/** @type {string[]} */
submarine.vulnerable = ['%', 'Z']
/** @type {string[]} */
submarine.hardened = ['M']
/** @type {string[]} */
submarine.immune = ['R']
/** @type {string[]} */
submarine.notes = [
  `The ${submarine.descriptionText} is hardened against Mega bombs.`,
  `Only the center square of the bomb will destroy the ${submarine.descriptionText} the surrounding squares will only reveal the ${submarine.descriptionText}.`
]
/** @type {SeaShip[]} */
const seaFleet = [
  undergroundBunker,
  antiAircraftGun,
  radarStation,
  aircraftCarrier,
  heliCarrier,
  stealthBomber,
  helicopter,
  jetFighterCraft,
  bombShelter,
  airplane,
  tanker,
  battleship,
  navalBase,
  cruiser,
  oilRig,
  supplyDepot,
  destroyer,
  pier,
  submarine
]

seaAndLandShipsCatalogue.addShapes(seaFleet)

/**
 * Export the sea and land ships catalogue.
 * Provides access to all configured ship shapes for the sea and land terrain.
 * @type {typeof seaAndLandShipsCatalogue}
 */
export { seaAndLandShipsCatalogue as seaShipsCatalogue } from './seaShipsCatalogue.js'
