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
import { Hybrid } from '../ships/SpecialShapes.js'
import { SpecialCells, StandardCells } from '../ships/SubShape.js'

const undergroundBunker = new Building('Underground Bunker', 'U', 'H', [
  [0, 0],
  [1, 0],
  [1, 1],
  [1, 2],
  [1, 3],
  [1, 4],
  [0, 4]
])
const antiAircraftGun = new Building('Anti-Aircraft Gun', 'G', 'S', [
  [0, 0],
  [1, 1],
  [0, 2],
  [2, 0],
  [2, 2]
])
const radarStation = new Building('Radar Station', 'R', 'H', [
  [0, 0],
  [1, 0],
  [2, 0],
  [2, 1],
  [2, 2]
])
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
const jetFighterCraft = new Plane('Jet Fighter', 'J', 'H', [
  [0, 1],
  [1, 1],
  [2, 0],
  [2, 1],
  [2, 2]
])
const helicopter = new Plane('Helicopter', 'H', 'S', [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, 2],
  [2, 1]
])
helicopter.vulnerable = ['W', 'F']
const airplane = new Plane('Airplane', 'P', 'H', [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, 2]
])
airplane.vulnerable = ['W', 'F']
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

const tanker = new SeaVessel('Tanker', 'T', 'L', [
  [0, 0],
  [0, 1],
  [0, 2],
  [0, 3],
  [0, 4],
  [0, 5]
])
tanker.vulnerable = ['Z', '+']
const battleship = new SeaVessel('Battleship', 'B', 'L', [
  [0, 0],
  [0, 1],
  [0, 2],
  [0, 3],
  [0, 4]
])
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
const cruiser = new SeaVessel('Cruiser', 'C', 'L', [
  [0, 0],
  [0, 1],
  [0, 2],
  [0, 3]
])
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
submarine.vulnerable = ['E']
submarine.hardened = ['M']
submarine.immune = ['R']
submarine.notes = [
  `The ${submarine.descriptionText} is hardened against Mega bombs.`,
  `Only the center square of the bomb will destroy the ${submarine.descriptionText} the surrounding squares will only reveal the ${submarine.descriptionText}.`
]
const seaFleet = [
  undergroundBunker,
  antiAircraftGun,
  radarStation,
  aircraftCarrier,
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

export const seaShipsCatalogue = seaAndLandShipsCatalogue
