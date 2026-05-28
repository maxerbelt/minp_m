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
 */

/**
 * @typedef {[number, number]} CellCoordinate
 * Represents a [row, column] coordinate for a ship cell
 */

/**
 * @typedef {Object} ShipProperties
 * @property {string[]} [vulnerable] - Weapon types this ship is vulnerable to
 * @property {string[]} [hardened] - Weapon types this ship is hardened against
 * @property {string[]} [immune] - Weapon types this ship is immune to
 * @property {string[]} [notes] - Flavor text and special rules for this ship
 */

/**
 * Underground defensive structure providing hardened shelter against Mega bombs.
 * @type {Building}
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
 * @type {Building}
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
 * @type {Building}
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
 * @type {HillFort}
 */
const bombShelter = new HillFort('Bomb Shelter', 'L', 'H', [
  [0, 0],
  [1, 0],
  [1, 1],
  [1, 2],
  [0, 2]
])
bombShelter.hardened = ['M']
bombShelter.notes = [
  `The ${bombShelter.descriptionText} is hardened against Mega bombs.`,

  `Only the center square of the bomb will destroy the ${bombShelter.descriptionText} the surrounding squares will only reveal the ${bombShelter.descriptionText} `
]

/**
 * Hybrid structure with land and coastal port components.
 * The dotted parts must be placed adjacent to sea.
 * @type {Hybrid}
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
supplyDepot.subterrain = Building.subterrain
supplyDepot.canBeOn = Building.canBe
supplyDepot.notes = [
  `the dotted parts of the ${supplyDepot.descriptionText} must be placed adjacent to sea.`
]
/**
 * Hybrid seaport structure with shallow dock component.
 * The dotted parts must be placed adjacent to land.
 * @type {Hybrid}
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
pier.canBeOn = SeaVessel.canBe
pier.subterrain = SeaVessel.subterrain
pier.notes = [
  `the dotted parts of the ${pier.descriptionText} must be placed adjacent to land.`
]
/**
 * Hybrid military facility with land and sea components.
 * Must be placed half on land and half on sea.
 * Dotted parts on sea, undotted parts on land.
 * @type {Hybrid}
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
navalBase.notes = [
  `the dotted parts of the ${navalBase.descriptionText} must be placed on sea, while the undotted parts on the land`
]
/**
 * Fast tactical aircraft with delta wing configuration.
 * @type {Plane}
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
 */
const helicopter = new Plane('Helicopter', 'H', 'S', [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, 2],
  [2, 1]
])
helicopter.vulnerable = ['W', 'F']
/**
 * Standard transport or utility aircraft vulnerable to conventional and fire weapons.
 * @type {Plane}
 */
const airplane = new Plane('Airplane', 'P', 'H', [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, 2]
])
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
stealthBomber.vulnerable = ['K']
stealthBomber.hardened = ['W']
stealthBomber.immune = ['+']
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
 * @type {DeepSeaVessel}
 */
const oilRig = new DeepSeaVessel('Oil Rig', 'O', 'S', [
  [0, 0],
  [0, 1],
  [1, 0],
  [1, 1]
])
oilRig.vulnerable = ['M']
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
submarine.vulnerable = ['%', 'Z']
submarine.hardened = ['M']
submarine.immune = ['R']
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

export { seaAndLandShipsCatalogue as seaShipsCatalogue } from './seaShipsCatalogue.js'
