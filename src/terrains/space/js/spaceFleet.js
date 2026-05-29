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
 * Space fleet definitions and factory helpers for the Space terrain.
 *
 * This module provides:
 * - Factory class for creating space fleet units (SpaceFleetFactory)
 * - Configurations for railgun variants (space and asteroid versions)
 * - Configurations for hybrid ships (habitat, space port, observation post)
 * - Complete spaceFleet array of all available space units
 *
 * The module exports `spaceFleet`, an array of ship/installation shapes used
 * by the Space terrain. Types are intentionally broad to accommodate a mix of:
 * - `SpaceVessel`: Vehicles that operate in space
 * - `Hybrid`: Ships with mixed terrain capabilities
 * - `Installation`: Fixed structures on asteroids
 * - `Transformer`: Units that change between forms
 *
 * Factory helpers reduce code duplication for creating armed shapes, hybrid ships,
 * and transformer variants with weapon attachments and terrain-specific properties.
 *
 * @module terrains/space/spaceFleet
 * @requires Transformer
 * @requires Hybrid
 * @requires SubShape
 * @requires spaceVessels
 * @requires space
 * @requires spaceShapes
 * @requires spaceWeapons
 * @requires shuttles
 * @requires installations
 *
 * @example
 * import { spaceFleet } from './spaceFleet.js'
 * // Access all available space units
 * const allUnits = spaceFleet
 * const firstUnit = allUnits[0]  // First unit in fleet
 */

/**
 * @typedef {new (...args: any[]) => any} ShapeConstructor
 * Constructor function for shape classes (SpaceVessel, Installation, etc.).
 * Represents any class that can be instantiated with arbitrary arguments.
 *
 * @example
 * // Example constructors matching this typedef
 * class SpaceVessel { constructor(description, letter, ...) {} }
 * class Installation { constructor(description, letter, ...) {} }
 */

/**
 * @typedef {() => any} WeaponFactory
 * Factory function that returns a weapon instance.
 * Typically returns weapon objects like RailBolt.single, LaserCannon, etc.
 *
 * @example
 * // Example weapon factories
 * () => RailBolt.single
 * () => LaserCannon.triple
 */

/**
 * @typedef {Object} ArmedShapeConfig
 * Configuration for creating armed shapes (vessels or installations) with attached weapons.
 *
 * Used by SpaceFleetFactory.createArmedShape() to reduce parameter count and improve
 * readability by grouping all configuration data in a single object.
 *
 * @property {ShapeConstructor} ShapeClass - Shape class to instantiate (ArmedVessel, ArmedInstallation, etc.)
 * @property {string} description - Human-readable name (e.g., 'Railgun', 'Destroyer')
 * @property {string} letter - Single letter identifier used in map notation
 * @property {string} symmetry - Symmetry type ('S'=symmetrical, 'H'=horizontal, 'D'=diagonal, etc.)
 * @property {Array<[number, number]>} cells - Array of [row, col] coordinates defining shape on grid
 * @property {string|null} tip - Placement instruction text or null if no special instructions
 * @property {Array<[number, number, number]>} racks - Array of [row, col, rackId] for weapon mount points
 * @property {WeaponFactory} weaponFactory - Function returning weapon instance to attach
 *
 * @example
 * {
 *   ShapeClass: ArmedVessel,
 *   description: 'Railgun',
 *   letter: 'R',
 *   symmetry: 'S',
 *   cells: [[0,1], [1,0], [1,1], [1,2], [2,1]],
 *   tip: null,
 *   racks: [[0,1,1], [1,0,2], [1,2,2], [2,1,1]],
 *   weaponFactory: () => RailBolt.single
 * }
 */

/**
 * @typedef {Object} HybridShipConfig
 * Configuration for creating hybrid ships with mixed terrain capabilities.
 *
 * Hybrid ships can exist in multiple terrains (space and asteroid) simultaneously,
 * with different validators and zone details for each terrain layer.
 *
 * @property {string} description - Ship name and display label
 * @property {string} letter - Single character identifier
 * @property {string} symmetry - Symmetry configuration
 * @property {Array<[number, number]>} cells - Shape coordinates as [row, col] pairs
 * @property {Array<StandardCells|SpecialCells>} cellConfigs - Cell configuration layers for each terrain
 * @property {string} placementTip - User instructions for proper placement
 * @property {Object} [extras] - Optional additional configuration properties
 * @property {Object} [extras.canBeOn] - Validator for placement locations
 * @property {Object} [extras.subterrain] - Terrain configuration for special zones
 * @property {Array<string>} [extras.notes] - Additional placement notes
 *
 * @example
 * {
 *   description: 'Habitat',
 *   letter: 'H',
 *   symmetry: 'H',
 *   cells: [[0,0], [1,0], [2,0]],
 *   cellConfigs: [spaceConfig, asteroidConfig],
 *   placementTip: 'place lowest level on asteroid',
 *   extras: {}
 * }
 */

/**
 * @typedef {Object} RailgunConfig
 * Configuration specifically for railgun variants (space or asteroid based).
 *
 * @property {string} description - 'Railgun' for both variants
 * @property {string} letter - 'R' identifier
 * @property {string} symmetry - Symmetry type ('S' for symmetrical)
 * @property {Array<[number, number]>} cells - Railgun shape coordinates
 * @property {null} tip - No special placement tip needed
 * @property {Array<[number, number, number]>} racks - Weapon rack positions
 * @property {WeaponFactory} weaponFactory - Returns RailBolt.single weapon
 *
 * @example
 * {
 *   description: 'Railgun',
 *   letter: 'R',
 *   symmetry: 'S',
 *   cells: [[0,1], [1,0], [1,1], [1,2], [2,1]],
 *   tip: null,
 *   racks: [[0,1,1], [1,0,2], [1,2,2], [2,1,1]],
 *   weaponFactory: () => RailBolt.single
 * }
 */

/**
 * Factory class for creating space fleet units with improved maintainability.
 *
 * Provides methods for creating different types of ships while reducing code duplication
 * and improving readability through configuration objects. Handles:
 * - Armed shapes (vessels and installations) with weapon attachment
 * - Hybrid ships with mixed terrain capabilities
 * - Transformer units that switch between multiple forms
 *
 * The factory pattern encapsulates complex ship creation logic and ensures consistent
 * initialization across all space fleet units, making maintenance easier and reducing
 * the likelihood of configuration errors.
 *
 * @class SpaceFleetFactory
 * @description Factory for space fleet unit creation
 *
 * @example
 * // Create an armed vessel with a weapon
 * const railgun = SpaceFleetFactory.createArmedShape({
 *   ShapeClass: ArmedVessel,
 *   description: 'Railgun',
 *   letter: 'R',
 *   // ... other config
 * })
 *
 * @see createArmedShape - For creating armed vessels/installations
 * @see createHybridShip - For creating multi-terrain hybrid ships
 * @see createTransformer - For creating shape-shifting units
 */
class SpaceFleetFactory {
  /**
   * Creates an armed shape (vessel or installation) with an attached weapon.
   *
   * Accepts a single config object to reduce parameter count and improve readability.
   * Automatically attaches weapon via attachWeapon() method if available on the shape.
   *
   * This static factory method encapsulates the creation logic for armed units,
   * ensuring consistent initialization and weapon attachment across all armed shapes.
   *
   * @static
   * @param {ArmedShapeConfig} cfg - Configuration object for the armed shape
   * @param {ShapeConstructor} cfg.ShapeClass - Class to instantiate
   * @param {string} cfg.description - Unit name
   * @param {string} cfg.letter - Letter identifier
   * @param {string} cfg.symmetry - Symmetry type
   * @param {Array<[number, number]>} cfg.cells - Shape coordinates
   * @param {string|null} cfg.tip - Placement instructions
   * @param {Array<[number, number, number]>} cfg.racks - Weapon rack positions
   * @param {WeaponFactory} cfg.weaponFactory - Weapon creation function
   *
   * @returns {Object} Armed shape instance with attached weapon
   *
   * @example
   * const railgun = SpaceFleetFactory.createArmedShape({
   *   ShapeClass: ArmedVessel,
   *   description: 'Railgun',
   *   letter: 'R',
   *   symmetry: 'S',
   *   cells: [[0,1], [1,0], [1,1], [1,2], [2,1]],
   *   tip: null,
   *   racks: [[0,1,1], [1,0,2], [1,2,2], [2,1,1]],
   *   weaponFactory: () => RailBolt.single
   * })
   */
  static createArmedShape (cfg) {
    const {
      ShapeClass,
      description,
      letter,
      symmetry,
      cells,
      tip,
      racks,
      weaponFactory
    } = cfg

    const shape = new ShapeClass(
      description,
      letter,
      symmetry,
      cells,
      tip,
      racks
    )
    // Attach weapon if shape supports attachWeapon method
    if (typeof shape.attachWeapon === 'function') {
      shape.attachWeapon(weaponFactory)
    }
    return shape
  }

  /**
   * Creates a hybrid ship configuration with specified cell placements.
   *
   * Hybrid ships can exist in multiple terrains simultaneously (e.g., space and asteroid),
   * with different validators and zone details for each terrain layer. This method
   * creates and configures such ships with flexible terrain capability.
   *
   * @static
   * @param {string} description - Ship name and display label
   * @param {string} letter - Single character identifier
   * @param {string} symmetry - Symmetry type ('S', 'H', 'D', etc.)
   * @param {Array<[number, number]>} cells - Ship shape as [row, col] coordinate pairs
   * @param {Array<StandardCells|SpecialCells>} cellConfigs - Cell configuration objects defining terrain layers
   * @param {string} placementTip - Placement instruction text for users
   * @param {Object} [extras={}] - Optional additional configuration properties
   * @param {Object} [extras.canBeOn] - Validator for allowed placement locations
   * @param {Object} [extras.subterrain] - Terrain configuration for special zones
   * @param {Array<string>} [extras.notes] - Array of additional placement notes
   *
   * @returns {Hybrid} Configured hybrid ship instance with all properties set
   *
   * @example
   * const habitat = SpaceFleetFactory.createHybridShip(
   *   'Habitat',
   *   'H',
   *   'H',
   *   [[0,0], [1,0], [2,0]],
   *   [spaceConfig, asteroidConfig],
   *   'place lowest level on an asteroid',
   *   {}
   * )
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
   *
   * Transformer units can shift between multiple configurations, allowing them to
   * adapt to different terrain types or combat situations. Common transformers include
   * ships that switch between space and asteroid variants.
   *
   * @static
   * @param {Array<Object>} variants - Array of ship variant objects to switch between
   *
   * @returns {Transformer} Transformer instance capable of switching between variants
   *
   * @example
   * const railgun = SpaceFleetFactory.createTransformer([
   *   railgunSpace,    // Space terrain variant
   *   railgunAsteroid  // Asteroid terrain variant
   * ])
   *
   * @see Transformer - Transformer class in ships module
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
 *
 * Defines a railgun installation designed for operation in space terrain.
 * Features:
 * - Cross-shaped configuration with center mount
 * - Four weapon racks positioned at cardinal points
 * - Symmetrical design allowing rotation
 *
 * @type {RailgunConfig}
 * @constant
 * @readonly
 *
 * @see createArmedShape - Method that uses this configuration
 * @see RAILGUN_ASTEROID_CONFIG - Asteroid variant alternative
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
 *
 * Defines a railgun installation designed for operation on asteroid terrain.
 * Features:
 * - Corner-based configuration with center control point
 * - Four weapon racks positioned at corners for coverage
 * - Different cell arrangement optimized for asteroid placement
 *
 * @type {RailgunConfig}
 * @constant
 * @readonly
 *
 * @see createArmedShape - Method that uses this configuration
 * @see RAILGUN_SPACE_CONFIG - Space variant alternative
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

/**
 * Space-based railgun instance created from RAILGUN_SPACE_CONFIG.
 *
 * Armed vessel variant optimized for space terrain with weapon attachment.
 * Created using SpaceFleetFactory for consistent initialization.
 *
 * @type {Object}
 * @readonly
 *
 * @see RAILGUN_SPACE_CONFIG - Source configuration
 * @see railgunAsteroid - Asteroid variant
 * @see railgun - Transformer combining both variants
 */
const railgunSpace = SpaceFleetFactory.createArmedShape({
  ShapeClass: ArmedVessel,
  description: RAILGUN_SPACE_CONFIG.description,
  letter: RAILGUN_SPACE_CONFIG.letter,
  symmetry: RAILGUN_SPACE_CONFIG.symmetry,
  cells: RAILGUN_SPACE_CONFIG.cells,
  tip: RAILGUN_SPACE_CONFIG.tip,
  racks: RAILGUN_SPACE_CONFIG.racks,
  weaponFactory: RAILGUN_SPACE_CONFIG.weaponFactory
})

/**
 * Asteroid-based railgun instance created from RAILGUN_ASTEROID_CONFIG.
 *
 * Armed installation variant optimized for asteroid terrain with weapon attachment.
 * Created using SpaceFleetFactory for consistent initialization.
 *
 * @type {Object}
 * @readonly
 *
 * @see RAILGUN_ASTEROID_CONFIG - Source configuration
 * @see railgunSpace - Space variant
 * @see railgun - Transformer combining both variants
 */
const railgunAsteroid = SpaceFleetFactory.createArmedShape({
  ShapeClass: ArmedInstallation,
  description: RAILGUN_ASTEROID_CONFIG.description,
  letter: RAILGUN_ASTEROID_CONFIG.letter,
  symmetry: RAILGUN_ASTEROID_CONFIG.symmetry,
  cells: RAILGUN_ASTEROID_CONFIG.cells,
  tip: RAILGUN_ASTEROID_CONFIG.tip,
  racks: RAILGUN_ASTEROID_CONFIG.racks,
  weaponFactory: RAILGUN_ASTEROID_CONFIG.weaponFactory
})

/**
 * Transformer railgun that switches between space and asteroid variants.
 *
 * This transformer unit can adapt between:
 * - **Space variant**: ArmedVessel for open space combat
 * - **Asteroid variant**: ArmedInstallation for asteroid-based defense
 *
 * The railgun is a key dual-terrain unit providing consistent firepower
 * across different space regions.
 *
 * @type {Transformer}
 * @readonly
 *
 * @see railgunSpace - Space terrain implementation
 * @see railgunAsteroid - Asteroid terrain implementation
 * @see spaceFleet - Array containing this unit
 */
const railgun = SpaceFleetFactory.createTransformer([
  railgunSpace,
  railgunAsteroid
])

// ============================================================================
// HYBRID SHIP CONFIGURATIONS
// ============================================================================

/**
 * Configuration for habitat hybrid ship.
 *
 * A vertical installation that spans both space and asteroid terrains.
 * Features:
 * - Three-cell vertical layout
 * - Upper cells in space as SpaceVessel
 * - Bottom cell on asteroid as Installation
 * - Placement-sensitive with specific instructions
 *
 * The Habitat serves as a civilian installation providing resource generation
 * or crew quarters in space operations.
 *
 * @type {HybridShipConfig}
 * @constant
 * @readonly
 *
 * @see createHybridShip - Method that uses this configuration
 * @see SPACE_PORT_CONFIG - Other hybrid variant
 * @see OBSERVATION_POST_CONFIG - Third hybrid variant
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
 *
 * A larger hybrid installation with space platform and asteroid anchor.
 * Features:
 * - Cross-shaped layout with five cells
 * - Horizontal bar in space (SpaceVessel)
 * - Two lower cells anchored on asteroid (Installation)
 * - T-shaped overall configuration
 *
 * The Space Port serves as a major hub for fleet operations and cargo transfer
 * between space and asteroid zones.
 *
 * @type {HybridShipConfig}
 * @constant
 * @readonly
 *
 * @see createHybridShip - Method that uses this configuration
 * @see HABITAT_CONFIG - Other hybrid variant
 * @see OBSERVATION_POST_CONFIG - Third hybrid variant
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
 *
 * A small strategic installation bridging space and asteroid terrains.
 * Features:
 * - Three-cell L-shaped layout
 * - Two cells on asteroid as Installation
 * - Top cell extending into space as SurfaceInstallation
 * - Diagonal symmetry
 *
 * The Observation Post provides surveillance and early warning capabilities,
 * requiring placement adjacent to the space-asteroid boundary.
 *
 * @type {HybridShipConfig}
 * @constant
 * @readonly
 *
 * @see createHybridShip - Method that uses this configuration
 * @see HABITAT_CONFIG - Other hybrid variant
 * @see SPACE_PORT_CONFIG - Other hybrid variant
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

/**
 * Habitat instance created from HABITAT_CONFIG.
 *
 * Hybrid ship combining space vessel and asteroid installation capabilities.
 * Created using SpaceFleetFactory for consistent initialization.
 *
 * @type {Hybrid}
 * @readonly
 *
 * @see HABITAT_CONFIG - Source configuration
 * @see spacePort - Other hybrid unit
 * @see observationPost - Third hybrid unit
 */
const habitat = SpaceFleetFactory.createHybridShip(
  HABITAT_CONFIG.description,
  HABITAT_CONFIG.letter,
  HABITAT_CONFIG.symmetry,
  HABITAT_CONFIG.cells,
  HABITAT_CONFIG.cellConfigs,
  HABITAT_CONFIG.placementTip,
  HABITAT_CONFIG.extras
)

/**
 * Space port instance created from SPACE_PORT_CONFIG.
 *
 * Hybrid ship combining space platform and asteroid anchor capabilities.
 * Created using SpaceFleetFactory for consistent initialization.
 *
 * @type {Hybrid}
 * @readonly
 *
 * @see SPACE_PORT_CONFIG - Source configuration
 * @see habitat - Other hybrid unit
 * @see observationPost - Third hybrid unit
 */
const spacePort = SpaceFleetFactory.createHybridShip(
  SPACE_PORT_CONFIG.description,
  SPACE_PORT_CONFIG.letter,
  SPACE_PORT_CONFIG.symmetry,
  SPACE_PORT_CONFIG.cells,
  SPACE_PORT_CONFIG.cellConfigs,
  SPACE_PORT_CONFIG.placementTip,
  SPACE_PORT_CONFIG.extras
)

/**
 * Observation post instance created from OBSERVATION_POST_CONFIG.
 *
 * Hybrid ship combining asteroid installation and space surface capabilities.
 * Created using SpaceFleetFactory for consistent initialization.
 *
 * @type {Hybrid}
 * @readonly
 *
 * @see OBSERVATION_POST_CONFIG - Source configuration
 * @see habitat - Other hybrid unit
 * @see spacePort - Other hybrid unit
 */
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
 * Complete fleet of space units available in the Space and Asteroids terrain.
 *
 * This array contains all available units for space combat including:
 * - **Armed Vessels**: Attack craft, fighters, capital ships (destroyer, cruiser, battlecruiser)
 * - **Carriers**: Aircraft carriers with strike capability
 * - **Stations**: Starbases, orbital stations, wheel stations
 * - **Support Ships**: Patrol boats, cargo haulers, transports
 * - **Mercenary Units**: Privateers and merchant vessels
 * - **Shuttles & Fighters**: Scout ships, corvettes, missile boats, mining ships, runabouts
 * - **Installations**: Shelters, mines, command centers
 * - **Hybrid Ships**: Habitat, space port, observation post
 * - **Transformers**: Railgun (space/asteroid variants)
 *
 * Units are organized by role with various gameplay mechanics:
 * - Standard vessels with weapon mounts
 * - Hybrid installations spanning space and asteroid terrains
 * - Transformer units adapting to different terrain types
 * - Specialized installations (mines for area denial, shelters for protection)
 *
 * The fleet is initialized with all imported vessel types, shuttles, installations,
 * and factory-created units (railgun transformer, habitat, space port, observation post).
 *
 * @type {Array<Object>}
 * @constant
 * @readonly
 *
 * @property {Object} [*] - Individual fleet units indexed by position
 *
 * @example
 * import { spaceFleet } from './spaceFleet.js'
 *
 * // Access individual units
 * const firstUnit = spaceFleet[0]  // attackCraft
 * const railgun = spaceFleet[17]   // Transformer unit
 *
 * // Iterate all units
 * spaceFleet.forEach((unit, index) => {
 *   console.log(`Unit ${index}: ${unit.description}`)
 * })
 *
 * // Count units
 * console.log(`Fleet size: ${spaceFleet.length}`)
 *
 * @see SpaceFleetFactory - Factory class creating some units
 * @see spaceVessels - Armed vessel definitions
 * @see shuttles - Shuttle and fighter definitions
 * @see installations - Installation definitions
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
