import { Transformer, Hybrid } from '../ships/SpecialShapes.js'
import { StandardCells, SpecialCells } from '../ships/SubShape.js'
import {
  attackCraft,
  frigate,
  destroyer,
  cruiser,
  battlecruiser,
  attackCraftCarrier,
  superCarrier,
  starbase,
  orbital,
  wheel,
  patrolBoat,
  cargoHauler,
  privateer,
  merchanter,
  spaceLiner,
  transport
} from './spaceVessels.js'
import { space, asteroid } from './space.js'
import {
  SpaceVessel,
  ArmedVessel,
  ArmedInstallation,
  Installation,
  SurfaceInstallation
} from './spaceShapes.js'

import { RailBolt } from './spaceWeapons.js'
import {
  scoutShip,
  corvette,
  missileBoat,
  gunBoat,
  miningShip,
  runabout,
  lifter
} from './shuttles.js'
import { shelter, mine, commandCenter } from './installations.js'

const railgunSpace = new ArmedVessel(
  'Railgun',
  'R',
  'S',
  [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, 2],
    [2, 1]
  ],
  null,
  [
    [0, 1, 1],
    [1, 0, 2],
    [1, 2, 2],
    [2, 1, 1]
  ]
)
railgunSpace.attachWeapon(() => {
  return RailBolt.single
})
const railgunAsteroid = new ArmedInstallation(
  'Railgun',
  'R',
  'S',
  [
    [0, 0],
    [2, 0],
    [1, 1],
    [0, 2],
    [2, 2]
  ],
  null,
  [
    [0, 0, 5],
    [2, 0, 6],
    [0, 2, 6],
    [2, 2, 5]
  ]
)
railgunAsteroid.attachWeapon(() => {
  return RailBolt.single
})
const railgun = new Transformer([railgunSpace, railgunAsteroid])

const habitat = new Hybrid(
  'Habitat',
  'H',
  'H',
  [
    [0, 0],
    [1, 0],
    [2, 0]
  ],
  [
    new StandardCells(SpaceVessel.validator, SpaceVessel.zoneDetail, space),
    new SpecialCells(
      [[0, 0]],
      Installation.validator,
      Installation.zoneDetail,
      asteroid
    )
  ],
  'place Habitat lowest level on an asteroid and the upper levels in space.'
)
const spacePort = new Hybrid(
  'Space Port',
  'Q',
  'H',
  [
    [0, 0],
    [0, 1],
    [0, 2],
    [1, 1],
    [2, 1]
  ],
  [
    new StandardCells(SpaceVessel.validator, SpaceVessel.zoneDetail, space),
    new SpecialCells(
      [
        [1, 1],
        [2, 1]
      ],
      Installation.validator,
      Installation.zoneDetail,
      asteroid
    )
  ],
  'place Space Port lower level on an asteroid and the upper levels in space.'
)
const observationPost = new Hybrid(
  'Observation Post',
  'Y',
  'D',
  [
    [0, 0],
    [1, 0],
    [1, 1]
  ],
  [
    new StandardCells(
      Installation.validator,
      Installation.zoneDetail,
      asteroid
    ),
    new SpecialCells(
      [[0, 0]],
      SurfaceInstallation.validator,
      SurfaceInstallation.zoneDetail,
      space
    )
  ],
  'place observation Post adjacent to the surface.'
)
observationPost.canBeOn = Installation.canBe
observationPost.subterrain = space
observationPost.notes = [
  `the dotted parts of the ${observationPost.descriptionText} must be placed adjacent to space.`
]
export const spaceFleet = [
  attackCraft,
  frigate,
  destroyer,
  cruiser,
  battlecruiser,
  attackCraftCarrier,
  superCarrier,
  starbase,
  orbital,
  wheel,
  patrolBoat,
  cargoHauler,
  privateer,
  merchanter,
  spaceLiner,
  transport,
  railgun,
  scoutShip,
  corvette,
  missileBoat,
  gunBoat,
  miningShip,
  runabout,
  lifter,
  shelter,
  mine,
  commandCenter,
  habitat,
  spacePort,
  observationPost
]
