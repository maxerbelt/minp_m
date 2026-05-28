import { all } from '../../all/js/terrain.js'

/**
 * @typedef {import('../../all/js/SubTerrain.js').SubTerrain} SubTerrain
 * @typedef {import('../../all/js/Zone.js').Zone} Zone
 */

import {
  seaAndLand,
  land,
  inland,
  coast,
  sea,
  deep,
  littoral
} from './seaAndLand.js'
import { Shape } from '../../../ships/Shape.js'

/**
 * Type for zone information tuple.
 * Represents a pair of [subterrain, zone] for validation purposes.
 *
 * @typedef {[SubTerrain, Zone]} ZoneInfo
 */

/**
 * Base class for all sea and land terrain shapes.
 * Provides common functionality for ship placement and terrain interaction.
 * Extends Shape to handle terrain-specific placement rules for both sea and land environments.
 *
 * @class SeaShape
 * @extends Shape
 * @description
 * Represents a game shape (ship, building, or aircraft) that can be placed in sea/land terrain.
 * Provides terrain configuration and description methods used across all shape types.
 */
class SeaShape extends Shape {
  /**
   * The terrain configuration for this shape.
   * References seaAndLand configuration for mixed terrain operations.
   *
   * @type {Object}
   * @public
   */
  terrain

  /**
   * Human-readable description of this shape.
   * Set in constructor, used by description() method.
   *
   * @type {string}
   * @public
   */
  descriptionText

  /**
   * Creates a new sea shape instance.
   * Initializes the shape with terrain configuration and description text.
   * Calls parent Shape constructor with standardized parameters.
   *
   * @param {string} description - Human-readable description of the shape
   * @param {string} letter - Single character identifier for the shape
   * @param {string} symmetry - Symmetry type (S, A, G, X, W)
   * @param {Array<[number, number]>} cells - Cell configuration for the shape
   * @param {string} tallyGroup - Group identifier for scoring/tallying
   * @param {string} tip - Placement tip text for user guidance
   * @param {Array<[number, number]>|null} racks - Rack configuration (optional)
   *
   * @returns {void}
   * @public
   */
  constructor (description, letter, symmetry, cells, tallyGroup, tip, racks) {
    super(letter, symmetry, cells, tallyGroup, tip, racks)
    this.descriptionText = description
    this.terrain = seaAndLand
  }

  /**
   * Returns the raw sunk description for this shape.
   * Base implementation used by subclasses that override behavior.
   * Subclasses may override this method to provide terrain-specific descriptions.
   *
   * @returns {string} Always returns 'Destroyed' as base class default
   * @public
   * @example
   * const shape = new SeaShape('Test', 'T', 'S', [[0,0]], 'Test', 'tip')
   * shape.sunkDescriptionRaw() // 'Destroyed'
   */
  sunkDescriptionRaw () {
    return 'Destroyed'
  }

  /**
   * Returns the description text for this shape.
   * Provides human-readable name of the shape for UI display.
   * This is the primary identifier shown in the game UI for the shape.
   *
   * @returns {string} The shape's human-readable description
   * @public
   * @see descriptionText for the underlying property
   * @example
   * const shape = new SeaShape('Battleship', 'B', 'S', [[0,0]], 'Naval', 'Place in sea')
   * shape.description() // 'Battleship'
   */
  description () {
    return this.descriptionText
  }
}

/**
 * Building shape class for land-based installations.
 * Represents structures that can be placed on land terrain with validation rules.
 * Provides land-specific placement constraints for ground-based defensive structures.
 *
 * @class Building
 * @extends SeaShape
 * @description
 * Buildings are stationary structures constrained to land terrain only.
 * They cannot move and must satisfy land-based zone validation rules.
 */
export class Building extends SeaShape {
  /**
   * The subterrain for building placement validation.
   * Determines which terrain type buildings can be placed on.
   *
   * @type {SubTerrain}
   * @public
   */
  subterrain

  /**
   * Function to check if placement is valid.
   * Validates that the building can be placed on the given subterrain.
   *
   * @type {(subterrain: SubTerrain) => boolean}
   * @public
   */
  validator

  /**
   * Zone detail level for validation.
   * Determines how detailed zone information must be (0=none, 1=subterrain, 2=zone).
   *
   * @type {number}
   * @public
   */
  zoneDetail

  /**
   * Terrain types immune to damage for this building.
   * List of subterrain identifiers that cannot be damaged by attacks.
   *
   * @type {string[]}
   * @public
   */
  immune

  /**
   * Creates a new building instance.
   * Initializes building with land-based terrain constraints and placement rules.
   * Buildings can only be placed on land terrain and are immune to Z and + terrains.
   *
   * @param {string} description - Human-readable name of the building (e.g., 'Guard Tower')
   * @param {string} letter - Single character identifier for the building (e.g., 'G')
   * @param {string} symmetry - Symmetry type: S (single), A (asymmetric), G (group), X (no), W (wide)
   * @param {Array<[number, number]>} cells - Array of [row, column] cell offsets defining building shape
   * @param {string} [tip] - Placement tip text for user guidance (optional, default: 'place {description} on the land')
   * @param {Array<[number, number]>} [racks] - Array of rack positions for weapon placement (optional)
   *
   * @returns {void}
   * @public
   * @example
   * const tower = new Building('Tower', 'T', 'S', [[0,0], [1,0]], 'Place tower on highlands')
   * tower.canBeOn(land) // true
   * tower.type() // 'G'
   */

  constructor (
    description,
    letter,
    symmetry,
    cells,
    tip = undefined,
    racks = undefined
  ) {
    super(
      description,
      letter,
      symmetry,
      cells,
      'G',
      tip || `place ${description} on the land`,
      racks
    )
    this.subterrain = Building.subterrain
    this.validator = Building.validator.bind(Building)
    this.zoneDetail = Building.zoneDetail
    this.immune = ['Z', '+']
  }

  /**
   * Returns the shape type identifier.
   * Identifies this shape as a ground-based (building) unit.
   * Used for game mechanics to determine unit category and behavior.
   *
   * @returns {string} Always returns 'G' for ground/building type
   * @public
   * @example
   * const building = new Building('Tower', 'T', 'S', [[0,0]])
   * building.type() // 'G'
   */
  type () {
    return 'G'
  }

  /**
   * Checks if this building can be placed on the given subterrain.
   * Validates that placement is only on land terrain.
   * Buildings cannot be placed on sea or mixed terrains.
   *
   * @param {SubTerrain} subterrain - The subterrain type to validate for placement
   * @returns {boolean} True if subterrain is land type, false otherwise
   * @public
   * @example
   * const building = new Building('Tower', 'T', 'S', [[0,0]])
   * building.canBeOn(land) // true
   * building.canBeOn(sea) // false
   */
  canBeOn (subterrain) {
    return subterrain === land
  }

  // ============================================================================
  // Static properties for building placement rules
  // ============================================================================

  /**
   * Subterrain configuration for buildings.
   * All buildings constrained to land terrain only.
   *
   * @static
   * @type {SubTerrain}
   */
  static subterrain = land

  /**
   * Function to check if placement is valid for the given subterrain.
   * Delegates to land subterrain's canBe method.
   *
   * @static
   * @type {(subterrain: SubTerrain) => boolean}
   */
  static canBe = land.canBe.bind(land)

  /**
   * Validator function for zone checking.
   * Delegates to land subterrain's validator method.
   *
   * @static
   * @type {(zoneInfo: ZoneInfo) => boolean}
   */
  static validator = /** @type {(zoneInfo: ZoneInfo) => boolean} */ (
    land.validator.bind(land)
  )

  /**
   * Zone detail level required for building placement validation.
   * Determines depth of zone checking needed.
   *
   * @static
   * @type {number}
   */
  static zoneDetail = land.zoneDetail
}

/**
 * Base class for buildings that require specific zone validation.
 * Extends Building with zone-based placement rules for specialized land structures.
 * Subclasses override the zone property to define placement constraints.
 *
 * @class ZoneValidatedBuilding
 * @extends Building
 * @description
 * Provides zone-aware validation for buildings that require specific zone types.
 * Validates both subterrain AND zone matches before allowing placement.
 */
class ZoneValidatedBuilding extends Building {
  /**
   * Specific zone for validation (overridden in subclasses).
   * Each subclass defines its own zone requirement (inland, coast, etc).
   *
   * @static
   * @type {Zone | null}
   */
  static zone = null

  /**
   * Checks if this zone-validated building can be placed on the given subterrain and zone.
   * Validates both terrain type and specific zone match using the class's zone property.
   * This is a stricter validation than parent Building class, requiring zone match.
   *
   * @static
   * @param {SubTerrain} subterrain - The subterrain to check for terrain type match
   * @param {Zone} zone - The zone to check against this.zone property
   * @returns {boolean} True if both subterrain and zone match, false otherwise
   * @public
   * @example
   * HillFort.canBe(land, inland) // true
   * HillFort.canBe(land, coast) // false
   */
  static canBe (subterrain, zone) {
    return subterrain === this.subterrain && zone === this.zone
  }

  /**
   * Validator function that checks the passed zoneInfo against this class.
   * Extracts subterrain and zone from tuple and validates both.
   *
   * @static
   * @param {ZoneInfo} zoneInfo - Tuple of [subterrain, zone]
   * @returns {boolean} True if the subterrain and zone match
   * @public
   */
  static validator (zoneInfo) {
    return this.canBe(zoneInfo[0], zoneInfo[1])
  }

  /**
   * Zone detail level required for validation.
   * Requires full zone information for proper validation.
   *
   * @static
   * @type {number}
   */
  static zoneDetail = 2
}

/**
 * Hill fort building - must be surrounded by land, cannot touch sea.
 * A defensive structure that requires inland terrain and cannot be placed near coastal areas.
 * Provides protection by requiring elevated terrain away from sea influences.
 *
 * @class HillFort
 * @extends ZoneValidatedBuilding
 * @description
 * Hill forts are constrained to inland zones only.
 * They cannot be adjacent to any sea squares and must be completely surrounded by land.
 */
export class HillFort extends ZoneValidatedBuilding {
  /**
   * Creates a new hill fort instance.
   * Initializes with inland zone constraints and placement rules.
   * Hill forts cannot touch sea squares and must be completely surrounded by land.
   *
   * @param {string} description - Human-readable name of the hill fort (e.g., 'Stone Fort')
   * @param {string} letter - Single character identifier for the hill fort
   * @param {string} symmetry - Symmetry type: S (single), A (asymmetric), G (group), X (no), W (wide)
   * @param {Array<[number, number]>} cells - Array of [row, column] cell offsets defining fort shape
   * @param {Array<[number, number]>} [racks] - Array of rack positions for weapon placement (optional)
   *
   * @returns {void}
   * @public
   * @example
   * const fort = new HillFort('Stone Fort', 'F', 'S', [[0,0], [1,0]])
   * fort.zone // inland
   */

  constructor (description, letter, symmetry, cells, racks = undefined) {
    super(
      description,
      letter,
      symmetry,
      cells,
      `place ${description} on the highlands`,
      racks
    )
    this.notes = [
      `${description} can not touch sea squares; must be surrounded by land squares.`
    ]
  }

  /**
   * Specific zone for hill forts.
   * Inland zones provide protection from sea-based threats.
   *
   * @static
   * @type {Zone}
   */
  static zone = inland
}

/**
 * Validator function for HillFort zone checking.
 * Bound to HillFort class for use in placement validation.
 *
 * @type {(zoneInfo: ZoneInfo) => boolean}
 */
HillFort.validator = HillFort.validator.bind(HillFort)

/**
 * Coastal port building - must be on the coast and touching sea squares.
 * A trading structure that requires coastal access and sea proximity for maritime operations.
 * Provides trade benefits by ensuring access to both land and sea resources.
 *
 * @class CoastalPort
 * @extends ZoneValidatedBuilding
 * @description
 * Coastal ports are constrained to coastal zones only.
 * They must be adjacent to sea squares to function as trading posts.
 */
export class CoastalPort extends ZoneValidatedBuilding {
  /**
   * Creates a new coastal port instance.
   * Initializes with coastal zone constraints and placement rules.
   * Coastal ports must be touching sea squares for maritime trading operations.
   *
   * @param {string} description - Human-readable name of the coastal port (e.g., 'Trading Post')
   * @param {string} letter - Single character identifier for the coastal port
   * @param {string} symmetry - Symmetry type: S (single), A (asymmetric), G (group), X (no), W (wide)
   * @param {Array<[number, number]>} cells - Array of [row, column] cell offsets defining port shape
   * @param {Array<[number, number]>} [racks] - Array of rack positions for weapon placement (optional)
   *
   * @returns {void}
   * @public
   * @example
   * const port = new CoastalPort('Trading Post', 'P', 'S', [[0,0], [1,0]])
   * port.zone // coast
   */

  constructor (description, letter, symmetry, cells, racks = undefined) {
    super(
      description,
      letter,
      symmetry,
      cells,
      `place ${description} on the coast`,
      racks
    )
    this.notes = [`${description} must be touching sea squares.`]
  }

  /**
   * Specific zone for coastal ports.
   * Coastal zones allow both land and sea access.
   *
   * @static
   * @type {Zone}
   */
  static zone = coast
}

/**
 * Validator function for CoastalPort zone checking.
 * Bound to CoastalPort class for use in placement validation.
 *
 * @type {(zoneInfo: ZoneInfo) => boolean}
 */
CoastalPort.validator = CoastalPort.validator.bind(CoastalPort)

/**
 * Plane/aircraft shape class for aerial units.
 * Can be placed anywhere on the map without terrain restrictions.
 * Provides air superiority and mobility unaffected by terrain constraints.
 *
 * @class Plane
 * @extends SeaShape
 * @description
 * Planes are not constrained by terrain or zone restrictions.
 * They can be placed on any terrain type (sea, land, etc) without validation.
 */
export class Plane extends SeaShape {
  /**
   * The subterrain for plane placement validation.
   * References 'all' to allow placement anywhere.
   *
   * @type {Object}
   * @public
   */
  subterrain

  /**
   * Validator function for zone checking.
   * Planes have no terrain restrictions, always returns true.
   *
   * @type {(subterrain: SubTerrain) => boolean}
   * @public
   */
  validator

  /**
   * Zone detail level for validation.
   * No zone validation needed for aircraft.
   *
   * @type {number}
   * @public
   */
  zoneDetail

  /**
   * Terrain types immune to damage for this plane.
   * Terrain features that cannot damage the aircraft.
   *
   * @type {string[]}
   * @public
   */
  immune

  /**
   * Terrain types vulnerable to damage for this plane.
   * Terrain features that can damage the aircraft.
   *
   * @type {string[]}
   * @public
   */
  vulnerable

  /**
   * Creates a new plane instance.
   * Initializes with unrestricted placement rules across all terrain types.
   * Planes can be placed anywhere on the map without terrain constraints.
   *
   * @param {string} description - Human-readable name of the aircraft (e.g., 'Fighter Jet')
   * @param {string} letter - Single character identifier for the aircraft
   * @param {string} symmetry - Symmetry type: S (single), A (asymmetric), G (group), X (no), W (wide)
   * @param {Array<[number, number]>} cells - Array of [row, column] cell offsets defining aircraft shape
   * @param {Array<[number, number]>} [racks] - Array of rack positions for weapon placement (optional)
   *
   * @returns {void}
   * @public
   * @example
   * const plane = new Plane('Fighter Jet', 'F', 'S', [[0,0], [1,0]])
   * plane.type() // 'A'
   */

  constructor (description, letter, symmetry, cells, racks = undefined) {
    super(
      description,
      letter,
      symmetry,
      cells,
      'A',
      `place ${description} at any location`,
      racks
    )
    this.subterrain = all
    this.immune = ['Z', '+']
    this.vulnerable = ['F']
  }

  /**
   * Returns the shape type identifier.
   * Identifies this shape as an aerial (plane) unit.
   * Used for game mechanics to distinguish air units from sea and land units.
   *
   * @returns {string} Always returns 'A' for air/aircraft type
   * @public
   * @example
   * const plane = new Plane('Fighter', 'F', 'S', [[0,0]])
   * plane.type() // 'A'
   */
  type () {
    return 'A'
  }

  /**
   * Returns the sunk description for aerial units.
   * Describes what happens when this aircraft is destroyed.
   * Overrides SeaShape.sunkDescriptionRaw() with aircraft-specific terminology.
   *
   * @returns {string} Always returns 'Shot Down' for aircraft destruction
   * @public
   * @example
   * const plane = new Plane('Fighter', 'F', 'S', [[0,0]])
   * plane.sunkDescription() // 'Shot Down'
   */
  sunkDescription () {
    return 'Shot Down'
  }

  /**
   * Checks if this plane can be placed on the given subterrain.
   * Planes have no terrain restrictions and can be placed anywhere.
   * The subterrain parameter is accepted for interface compatibility but is not used.
   *
   * @param {SubTerrain} _subterrain - The subterrain to check (unused in planes)
   * @returns {boolean} Always returns true (planes unrestricted by terrain)
   * @public
   * @example
   * const plane = new Plane('Fighter', 'F', 'S', [[0,0]])
   * plane.canBeOn(sea) // true
   * plane.canBeOn(land) // true
   */
  canBeOn (_subterrain) {
    return true
  }

  // ============================================================================
  // Static properties for plane placement rules
  // ============================================================================

  /**
   * Subterrain configuration for planes.
   * All terrain types allowed for aircraft placement.
   *
   * @static
   * @type {Object}
   */
  static subterrain = all

  /**
   * Function to check if placement is valid for the given subterrain.
   * Delegates to all subterrain's canBe method (always true).
   *
   * @static
   * @type {(subterrain: SubTerrain) => boolean}
   */
  static canBe = all.canBe.bind(all)

  /**
   * Validator function for zone checking.
   * Delegates to all subterrain's canBe method, always returns true for planes.
   * Planes accept any zone without restrictions during placement validation.
   *
   * @static
   * @type {(subterrain: SubTerrain) => boolean}
   * @example
   * Plane.validator({subterrain: sea, zone: deep}) // true
   */
  static validator = /** @type {(subterrain: SubTerrain) => boolean} */ (
    all.canBe.bind(all)
  )

  /**
   * Zone detail level required for plane placement validation.
   * No zone detail needed (planes unrestricted).
   *
   * @static
   * @type {number}
   */
  static zoneDetail = all.zoneDetail
}

/**
 * Sea vessel shape class for water-based naval units.
 * Represents ships that operate in sea terrain with specific zone constraints.
 * Provides naval combat capabilities with sea-based placement rules.
 *
 * @class SeaVessel
 * @extends SeaShape
 * @description
 * Sea vessels are constrained to sea terrain only.
 * They validate placement using zone information for proper naval positioning.
 */
export class SeaVessel extends SeaShape {
  /**
   * The subterrain for vessel placement validation.
   * Determines which terrain type vessels can be placed on.
   *
   * @type {SubTerrain}
   * @public
   */
  subterrain

  /**
   * Validator function for zone checking.
   * Validates that the vessel can be placed in the given zone.
   *
   * @type {(zoneInfo: ZoneInfo) => boolean}
   * @public
   */
  validator

  /**
   * Zone detail level for validation.
   * Determines how detailed zone information must be.
   *
   * @type {number}
   * @public
   */
  zoneDetail

  /**
   * Creates a new sea vessel instance.
   * Initializes vessel with sea-based terrain constraints and placement rules.
   * Vessels can only be placed on sea terrain and use validator for zone checking.
   *
   * @param {string} description - Human-readable name of the vessel (e.g., 'Battleship')
   * @param {string} letter - Single character identifier for the vessel (e.g., 'B')
   * @param {string} symmetry - Symmetry type: S (single), A (asymmetric), G (group), X (no), W (wide)
   * @param {Array<[number, number]>} cells - Array of [row, column] cell offsets defining vessel shape
   * @param {string} [tip] - Placement tip text for user guidance (optional, default: 'place {description} in the sea')
   * @param {Array<[number, number]>} [racks] - Array of rack positions for weapon placement (optional)
   *
   * @returns {void}
   * @public
   * @example
   * const ship = new SeaVessel('Battleship', 'B', 'S', [[0,0], [1,0]], 'Place in deep water')
   * ship.type() // 'S'
   */

  constructor (
    description,
    letter,
    symmetry,
    cells,
    tip = undefined,
    racks = undefined
  ) {
    super(
      description,
      letter,
      symmetry,
      cells,
      'S',
      tip || `place ${description} in the sea`,
      racks
    )
    this.subterrain = sea
    this.validator = SeaVessel.validator.bind(SeaVessel)
    this.zoneDetail = SeaVessel.zoneDetail
  }

  /**
   * Returns the shape type identifier.
   * Identifies this shape as a sea-based (vessel) unit.
   * Used for game mechanics to determine unit category and naval behavior.
   *
   * @returns {string} Always returns 'S' for sea/vessel type
   * @public
   * @example
   * const ship = new SeaVessel('Battleship', 'B', 'S', [[0,0]])
   * ship.type() // 'S'
   */
  type () {
    return 'S'
  }

  /**
   * Returns the sunk description for sea vessels.
   * Describes what happens when this ship is destroyed.
   * Overrides SeaShape.sunkDescriptionRaw() with maritime-specific terminology.
   *
   * @returns {string} Always returns 'Sunk' for naval vessel destruction
   * @public
   * @example
   * const ship = new SeaVessel('Battleship', 'B', 'S', [[0,0]])
   * ship.sunkDescription() // 'Sunk'
   */
  sunkDescription () {
    return 'Sunk'
  }

  /**
   * Returns the description text for this vessel.
   * Provides human-readable name of the vessel for UI display.
   * Inherits from SeaShape parent class implementation.
   *
   * @returns {string} The vessel's human-readable description
   * @public
   * @example
   * const ship = new SeaVessel('Battleship', 'B', 'S', [[0,0]])
   * ship.description() // 'Battleship'
   */
  description () {
    return this.descriptionText
  }

  /**
   * Checks if this sea vessel can be placed on the given subterrain.
   * Validates that placement is only on sea terrain.
   * Vessels cannot be placed on land or mixed terrain types.
   *
   * @param {SubTerrain} subterrain - The subterrain type to validate for placement
   * @returns {boolean} True if subterrain is sea type, false otherwise
   * @public
   * @example
   * const ship = new SeaVessel('Battleship', 'B', 'S', [[0,0]])
   * ship.canBeOn(sea) // true
   * ship.canBeOn(land) // false
   */
  canBeOn (subterrain) {
    return subterrain === sea
  }

  // ============================================================================
  // Static properties for sea vessel placement rules
  // ============================================================================

  /**
   * Subterrain configuration for sea vessels.
   * All vessels constrained to sea terrain only.
   *
   * @static
   * @type {SubTerrain}
   */
  static subterrain = sea

  /**
   * Function to check if placement is valid for the given subterrain.
   * Delegates to sea subterrain's canBe method.
   *
   * @static
   * @type {(subterrain: SubTerrain) => boolean}
   */
  static canBe = sea.canBe.bind(sea)

  /**
   * Validator function for zone checking.
   * Delegates to sea subterrain's validator method.
   * Ensures vessels are placed in valid sea zones based on zone configuration.
   *
   * @static
   * @type {(zoneInfo: ZoneInfo) => boolean}
   * @example
   * SeaVessel.validator([sea, deep]) // true
   */
  static validator = /** @type {(zoneInfo: ZoneInfo) => boolean} */ (
    sea.validator.bind(sea)
  )

  /**
   * Zone detail level required for vessel placement validation.
   * Determines depth of zone checking needed.
   *
   * @static
   * @type {number}
   */
  static zoneDetail = sea.zoneDetail
}

/**
 * Base class for sea vessels that require specific zone validation.
 * Extends SeaVessel with zone-based placement rules for specialized naval units.
 * Subclasses override the zone property to define placement constraints.
 *
 * @class ZoneValidatedSeaVessel
 * @extends SeaVessel
 * @description
 * Provides zone-aware validation for vessels that require specific zone types.
 * Validates both subterrain AND zone matches before allowing placement.
 */
class ZoneValidatedSeaVessel extends SeaVessel {
  /**
   * Specific zone for validation (overridden in subclasses).
   * Each subclass defines its own zone requirement (deep, littoral, etc).
   *
   * @static
   * @type {Zone | null}
   */
  static zone = null

  /**
   * Checks if this zone-validated sea vessel can be placed on the given subterrain and zone.
   * Validates both terrain type and specific zone match using the class's zone property.
   * This is a stricter validation than parent SeaVessel class, requiring zone match.
   *
   * @static
   * @param {SubTerrain} subterrain - The subterrain to check for terrain type match
   * @param {Zone} zone - The zone to check against this.zone property
   * @returns {boolean} True if both subterrain and zone match, false otherwise
   * @public
   * @example
   * DeepSeaVessel.canBe(sea, deep) // true
   * DeepSeaVessel.canBe(sea, littoral) // false
   */
  static canBe (subterrain, zone) {
    return subterrain === this.subterrain && zone === this.zone
  }

  /**
   * Validator function that checks the passed zoneInfo against this class.
   * Extracts subterrain and zone from tuple and validates both.
   *
   * @static
   * @param {ZoneInfo} zoneInfo - Tuple of [subterrain, zone]
   * @returns {boolean} True if the subterrain and zone match
   * @public
   */
  static validator (zoneInfo) {
    return this.canBe(zoneInfo[0], zoneInfo[1])
  }

  /**
   * Zone detail level required for validation.
   * Requires full zone information for proper validation.
   *
   * @static
   * @type {number}
   */
  static zoneDetail = 2
}

/**
 * Deep sea vessel - must be surrounded by sea squares, cannot touch land.
 * An oceanic unit that requires deep water conditions and cannot approach coastlines.
 * Represents powerful naval forces operating far from shore.
 *
 * @class DeepSeaVessel
 * @extends ZoneValidatedSeaVessel
 * @description
 * Deep sea vessels are constrained to deep zones only.
 * They cannot be adjacent to any land squares and must be completely surrounded by sea.
 */
export class DeepSeaVessel extends ZoneValidatedSeaVessel {
  /**
   * Creates a new deep sea vessel instance.
   * Initializes with deep zone constraints and placement rules.
   * Deep sea vessels cannot touch land squares and must be surrounded by sea.
   *
   * @param {string} description - Human-readable name of the deep sea vessel (e.g., 'Battleship')
   * @param {string} letter - Single character identifier for the vessel
   * @param {string} symmetry - Symmetry type: S (single), A (asymmetric), G (group), X (no), W (wide)
   * @param {Array<[number, number]>} cells - Array of [row, column] cell offsets defining vessel shape
   * @param {Array<[number, number]>} [racks] - Array of rack positions for weapon placement (optional)
   *
   * @returns {void}
   * @public
   * @example
   * const warship = new DeepSeaVessel('Battleship', 'B', 'S', [[0,0], [1,0]])
   * warship.zone // deep
   */

  constructor (description, letter, symmetry, cells, racks = undefined) {
    super(
      description,
      letter,
      symmetry,
      cells,
      `place ${description} in the deep sea`,
      racks
    )
    this.notes = [
      `${description} can not touch land squares; must be surrounded by sea squares.`
    ]
  }

  /**
   * Specific zone for deep sea vessels.
   * Deep zones provide protection and power for oceanic operations.
   *
   * @static
   * @type {Zone}
   */
  static zone = deep
}

/**
 * Validator function for DeepSeaVessel zone checking.
 * Bound to DeepSeaVessel class for use in placement validation.
 * Ensures deep sea vessels are only placed in deep zones of sea terrain.
 *
 * @type {(zoneInfo: ZoneInfo) => boolean}
 * @example
 * DeepSeaVessel.validator([sea, deep]) // true
 * DeepSeaVessel.validator([sea, littoral]) // false
 */
DeepSeaVessel.validator = DeepSeaVessel.validator.bind(DeepSeaVessel)

/**
 * Shallow dock vessel - must be touching land squares.
 * A coastal unit that requires shallow water conditions and land proximity for docking.
 * Represents vessels optimized for coastal operations and supply lines.
 *
 * @class ShallowDock
 * @extends ZoneValidatedSeaVessel
 * @description
 * Shallow docks are constrained to littoral zones only.
 * They must be adjacent to land squares to function as naval bases.
 */
export class ShallowDock extends ZoneValidatedSeaVessel {
  /**
   * Creates a new shallow dock instance.
   * Initializes with littoral zone constraints and placement rules.
   * Shallow docks must be touching land squares for supply and trade operations.
   *
   * @param {string} description - Human-readable name of the shallow dock (e.g., 'Naval Base')
   * @param {string} letter - Single character identifier for the dock
   * @param {string} symmetry - Symmetry type: S (single), A (asymmetric), G (group), X (no), W (wide)
   * @param {Array<[number, number]>} cells - Array of [row, column] cell offsets defining dock shape
   * @param {Array<[number, number]>} racks - Array of rack positions for weapon placement
   *
   * @returns {void}
   * @public
   * @example
   * const dock = new ShallowDock('Naval Base', 'N', 'S', [[0,0], [1,0]], [[1,1]])
   * dock.zone // littoral
   */

  constructor (description, letter, symmetry, cells, racks) {
    super(
      description,
      letter,
      symmetry,
      cells,
      `place ${description} in the shallow sea`,
      racks
    )
    this.notes = [`${description} must be touching land squares.`]
  }

  /**
   * Specific zone for shallow docks.
   * Littoral zones enable supply lines and coastal control.
   *
   * @static
   * @type {Zone}
   */
  static zone = littoral
}

/**
 * Validator function for ShallowDock zone checking.
 * Bound to ShallowDock class for use in placement validation.
 * Ensures shallow docks are only placed in littoral zones of sea terrain.
 *
 * @type {(zoneInfo: ZoneInfo) => boolean}
 * @example
 * ShallowDock.validator([sea, littoral]) // true
 * ShallowDock.validator([sea, deep]) // false
 */
ShallowDock.validator = ShallowDock.validator.bind(ShallowDock)
