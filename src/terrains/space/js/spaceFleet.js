import { Transformer } from '../../../ships/Transformer.js'
import { Hybrid } from '../../../ships/Hybrid.js'
import { StandardCells, SpecialCells } from '../../../ships/SubShape.js'
import {
  attackCraft,
  gunBoat,
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
  miningShip,
  runabout,
  lifter
} from './shuttles.js'
import { shelter, mine, commandCenter } from './installations.js'

/**
 * Factory class for creating space fleet units with improved maintainability.
 * Provides methods for creating different types of ships while reducing code duplication.
 */
class SpaceFleetFactory {
  /**
   * Creates an armed shape (vessel or installation) with an attached weapon.
   * @param {Function} ShapeClass - Constructor for ArmedVessel or ArmedInstallation
   * @param {string} description - Name of the unit
   * @param {string} letter - Letter identifier
   * @param {string} symmetry - Symmetry type
   * @param {Array<[number, number]>} cells - Shape cells as [row, col] pairs
   * @param {string|null} tip - Placement tip
   * @param {Array<[number, number, number]>} racks - Weapon rack positions as [row, col, power]
   * @param {Function} weaponFactory - Factory function returning weapon instance
   * @returns {Object} Armed shape instance with attached weapon
   */
  static createArmedShape (
    ShapeClass,
    description,
    letter,
    symmetry,
    cells,
    tip,
    racks,
    weaponFactory
  ) {
    const shape = new ShapeClass(
      description,
      letter,
      symmetry,
      cells,
      tip,
      racks
    )
    shape.attachWeapon(weaponFactory)
    return shape
  }

  /**
   * Creates a hybrid ship configuration with specified cell placements.
   * @param {string} description - Ship name
   * @param {string} letter - Letter identifier
   * @param {string} symmetry - Symmetry type
   * @param {Array<[number, number]>} cells - Ship shape as [row, col] pairs
   * @param {Array<StandardCells|SpecialCells>} cellConfigs - Cell configuration objects
   * @param {string} placementTip - Placement instruction text
   * @param {Object} [extras={}] - Optional additional properties (canBeOn, subterrain, notes)
   * @returns {Hybrid} Configured hybrid ship instance
   */
  static createHybridShip (
    description,
    letter,
    symmetry,
    cells,
    cellConfigs,
    placementTip,
    extras = {}
  ) {
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

  /**
   * Creates a transformer ship that can change between different forms.
   * @param {Array<Object>} variants - Array of ship variants for transformation
   * @returns {Transformer} Transformer instance
   */
  static createTransformer (variants) {
    return new Transformer(variants)
  }
}

// ============================================================================
// RAILGUN CONFIGURATIONS
// ============================================================================

/**
 * Configuration for space-based railgun variant.
 * @type {Object}
 */
const RAILGUN_SPACE_CONFIG = {
  description: 'Railgun',
  letter: 'R',
  symmetry: 'S',
  cells: [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, 2],
    [2, 1]
  ],
  tip: null,
  racks: [
    [0, 1, 1],
    [1, 0, 2],
    [1, 2, 2],
    [2, 1, 1]
  ],
  weaponFactory: () => RailBolt.single
}

/**
 * Configuration for asteroid-based railgun variant.
 * @type {Object}
 */
const RAILGUN_ASTEROID_CONFIG = {
  description: 'Railgun',
  letter: 'R',
  symmetry: 'S',
  cells: [
    [0, 0],
    [2, 0],
    [1, 1],
    [0, 2],
    [2, 2]
  ],
  tip: null,
  racks: [
    [0, 0, 5],
    [2, 0, 6],
    [0, 2, 6],
    [2, 2, 5]
  ],
  weaponFactory: () => RailBolt.single
}

// Create railgun variants using factory
const railgunSpace = SpaceFleetFactory.createArmedShape(
  ArmedVessel,
  RAILGUN_SPACE_CONFIG.description,
  RAILGUN_SPACE_CONFIG.letter,
  RAILGUN_SPACE_CONFIG.symmetry,
  RAILGUN_SPACE_CONFIG.cells,
  RAILGUN_SPACE_CONFIG.tip,
  RAILGUN_SPACE_CONFIG.racks,
  RAILGUN_SPACE_CONFIG.weaponFactory
)

const railgunAsteroid = SpaceFleetFactory.createArmedShape(
  ArmedInstallation,
  RAILGUN_ASTEROID_CONFIG.description,
  RAILGUN_ASTEROID_CONFIG.letter,
  RAILGUN_ASTEROID_CONFIG.symmetry,
  RAILGUN_ASTEROID_CONFIG.cells,
  RAILGUN_ASTEROID_CONFIG.tip,
  RAILGUN_ASTEROID_CONFIG.racks,
  RAILGUN_ASTEROID_CONFIG.weaponFactory
)

const railgun = SpaceFleetFactory.createTransformer([
  railgunSpace,
  railgunAsteroid
])

// ============================================================================
// HYBRID SHIP CONFIGURATIONS
// ============================================================================

/**
 * Configuration for habitat hybrid ship.
 * @type {Object}
 */
const HABITAT_CONFIG = {
  description: 'Habitat',
  letter: 'H',
  symmetry: 'H',
  cells: [
    [0, 0],
    [1, 0],
    [2, 0]
  ],
  cellConfigs: [
    new StandardCells(SpaceVessel.validator, SpaceVessel.zoneDetail, space),
    new SpecialCells(
      [[0, 0]],
      Installation.validator,
      Installation.zoneDetail,
      asteroid
    )
  ],
  placementTip:
    'place Habitat lowest level on an asteroid and the upper levels in space.',
  extras: {}
}

/**
 * Configuration for space port hybrid ship.
 * @type {Object}
 */
const SPACE_PORT_CONFIG = {
  description: 'Space Port',
  letter: 'Q',
  symmetry: 'H',
  cells: [
    [0, 0],
    [0, 1],
    [0, 2],
    [1, 1],
    [2, 1]
  ],
  cellConfigs: [
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
  placementTip:
    'place Space Port lower level on an asteroid and the upper levels in space.',
  extras: {}
}

/**
 * Configuration for observation post hybrid ship.
 * @type {Object}
 */
const OBSERVATION_POST_CONFIG = {
  description: 'Observation Post',
  letter: 'Y',
  symmetry: 'D',
  cells: [
    [0, 0],
    [1, 0],
    [1, 1]
  ],
  cellConfigs: [
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
  placementTip: 'place observation Post adjacent to the surface.',
  extras: {
    canBeOn: Installation.canBe,
    subterrain: space,
    notes: [
      'the dotted parts of the Observation Post must be placed adjacent to space.'
    ]
  }
}

// Create hybrid ships using factory
const habitat = SpaceFleetFactory.createHybridShip(
  HABITAT_CONFIG.description,
  HABITAT_CONFIG.letter,
  HABITAT_CONFIG.symmetry,
  HABITAT_CONFIG.cells,
  HABITAT_CONFIG.cellConfigs,
  HABITAT_CONFIG.placementTip,
  HABITAT_CONFIG.extras
)

const spacePort = SpaceFleetFactory.createHybridShip(
  SPACE_PORT_CONFIG.description,
  SPACE_PORT_CONFIG.letter,
  SPACE_PORT_CONFIG.symmetry,
  SPACE_PORT_CONFIG.cells,
  SPACE_PORT_CONFIG.cellConfigs,
  SPACE_PORT_CONFIG.placementTip,
  SPACE_PORT_CONFIG.extras
)

const observationPost = SpaceFleetFactory.createHybridShip(
  OBSERVATION_POST_CONFIG.description,
  OBSERVATION_POST_CONFIG.letter,
  OBSERVATION_POST_CONFIG.symmetry,
  OBSERVATION_POST_CONFIG.cells,
  OBSERVATION_POST_CONFIG.cellConfigs,
  OBSERVATION_POST_CONFIG.placementTip,
  OBSERVATION_POST_CONFIG.extras
)

/**
 * Complete fleet of space units including vessels, shuttles, installations,
 * and special hybrid/transformer configurations.
 * @type {Array<Object>}
 */
export const spaceFleet = [
  attackCraft,
  gunBoat,
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
