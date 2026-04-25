import { Transformer } from '../../../ships/Transformer.js'
import { Hybrid } from '../../../ships/Hybrid.js'
import { StandardCells, SpecialCells } from '../../../ships/SubShape.js'
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

/**
 * Creates an armed shape (vessel or installation) with an attached weapon.
 * @param {Function} ShapeClass - Constructor (ArmedVessel or ArmedInstallation)
 * @param {string} description - Name of the unit
 * @param {string} letter - Letter identifier
 * @param {string} symmetry - Symmetry type
 * @param {Array<[number, number]>} cells - Shape cells
 * @param {string|null} tip - Placement tip
 * @param {Array<[number, number, number]>} racks - Weapon rack positions
 * @param {Function} weaponFactory - Factory function returning weapon
 * @returns {Object} Armed shape instance with attached weapon
 * @private
 */
const createArmedShape = (
  ShapeClass,
  description,
  letter,
  symmetry,
  cells,
  tip,
  racks,
  weaponFactory
) => {
  const shape = new ShapeClass(description, letter, symmetry, cells, tip, racks)
  shape.attachWeapon(weaponFactory)
  return shape
}

/**
 * Creates a hybrid ship configuration with specified cell placements.
 * @param {string} description - Ship name
 * @param {string} letter - Letter identifier
 * @param {string} symmetry - Symmetry type
 * @param {Array<[number, number]>} cells - Ship shape
 * @param {Array<Object>} cellConfigs - Cell configuration objects (StandardCells/SpecialCells)
 * @param {string} placementTip - Placement instruction
 * @param {Object} [extras] - Optional properties (canBeOn, subterrain, notes)
 * @returns {Hybrid} Configured hybrid ship
 * @private
 */
const createHybridShip = (
  description,
  letter,
  symmetry,
  cells,
  cellConfigs,
  placementTip,
  extras = {}
) => {
  const ship = new Hybrid(
    description,
    letter,
    symmetry,
    cells,
    cellConfigs,
    placementTip
  )
  Object.assign(ship, extras)
  return ship
}

const railgunSpace = createArmedShape(
  ArmedVessel,
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
  ],
  () => RailBolt.single
)

const railgunAsteroid = createArmedShape(
  ArmedInstallation,
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
  ],
  () => RailBolt.single
)

const railgun = new Transformer([railgunSpace, railgunAsteroid])

const habitat = createHybridShip(
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

const spacePort = createHybridShip(
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

const observationPost = createHybridShip(
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
  'place observation Post adjacent to the surface.',
  {
    canBeOn: Installation.canBe,
    subterrain: space,
    notes: [
      'the dotted parts of the Observation Post must be placed adjacent to space.'
    ]
  }
)

/**
 * Complete fleet of space units including vessels, shuttles, installations,
 * and special hybrid/transformer configurations.
 * @type {Array<Object>}
 */
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
