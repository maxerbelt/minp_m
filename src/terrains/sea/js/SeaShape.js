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
 * Zone information tuple for terrain and zone validation.
 *
 * Represents a pair of [subterrain, zone] for comprehensive placement validation.
 * Used throughout terrain classes to validate that placement occurs in both the correct
 * terrain type AND the correct zone type within that terrain.
 *
 * @typedef {[SubTerrain, Zone]} ZoneInfo
 * @description
 * First element: SubTerrain - the base terrain type (sea, land, all, etc)
 * Second element: Zone - the zone within that terrain (deep, littoral, inland, coast, etc)
 *
 * @example
 * const zoneInfo = [sea, deep] // sea terrain, deep zone
 * const isValid = DeepSeaVessel.validator(zoneInfo) // true if valid
 */

/**
 * Base class for all sea and land terrain shapes.
 *
 * Provides common functionality for ship placement and terrain interaction across sea/land environments.
 * Extends {@link Shape} to handle terrain-specific placement rules and validation constraints.
 * Serves as the abstract foundation for specialized shape types (Building, Plane, SeaVessel).
 *
 * Includes terrain configuration, description management, and placement notes for all shape variants.
 * Coordinates with terrain systems (seaAndLand) to validate placement compatibility.
 *
 * @class SeaShape
 * @extends Shape
 * @abstract
 * @description
 * Represents a game shape (ship, building, or aircraft) that can be placed in sea/land terrain.
 * Provides terrain configuration and description methods used across all shape types.
 * This is an abstract base class providing shared infrastructure for terrain-aware placements.
 *
 * @see {@link Building} for land-based structure implementation
 * @see {@link Plane} for unrestricted aerial unit implementation
 * @see {@link SeaVessel} for sea-based naval unit implementation
 * @protected
 */
class SeaShape extends Shape {
  /**
   * The terrain configuration for this shape.
   * References seaAndLand configuration for mixed terrain operations.
   * Provides terrain rules applicable to all shape subtypes.
   *
   * @type {Object}
   * @public
   */
  terrain

  /**
   * Human-readable description of this shape.
   * Set in constructor, used by description() method for UI display.
   * Provides the primary identifier shown to players for this shape type.
   *
   * @type {string}
   * @public
   */
  descriptionText

  /**
   * Optional notes about placement constraints.
   * May contain additional constraints for subclasses explaining limitations.
   * Displayed to players during placement to clarify terrain/zone requirements.
   *
   * @type {string[]}
   * @public
   */
  notes

  /**
   * Creates a new sea shape instance.
   *
   * Initializes the shape with terrain configuration and description text.
   * Calls parent {@link Shape} constructor with standardized parameters and sets up
   * terrain validation infrastructure. Used by all terrain-aware shape subclasses.
   *
   * @param {string} description - Human-readable description of the shape (e.g., 'Battleship', 'Guard Tower')
   *                               Displayed in UI and used as primary shape identifier
   * @param {string} letter - Single character identifier for the shape (e.g., 'B', 'T', 'F')
   *                         Used in serialization and compact representation
   * @param {string} symmetry - Symmetry type affecting placement constraints
   *                           Valid values: 'S' (single), 'A' (asymmetric), 'G' (group),
   *                           'X' (no symmetry), 'W' (wide)
   * @param {Array<[number, number]>} cells - Cell configuration defining shape footprint
   *                                          Array of [row, column] offsets relative to placement origin
   * @param {string} tallyGroup - Group identifier for scoring/tallying during combat
   *                             Used to categorize shapes for point calculations
   * @param {string} tip - Placement tip text for user guidance
   *                      Displayed to help players understand placement rules
   * @param {Array<[number, number]>|null} racks - Rack configuration for weapon placement (optional)
   *                                               Array of [row, column] positions where weapons attach
   *                                               Null for non-weapon shapes (e.g., buildings, aircraft)
   *
   * @throws {Error} If parent Shape constructor validation fails
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
   *
   * Base implementation used by subclasses that override behavior with specialized terminology.
   * Subclasses override this method to provide terrain-specific destruction descriptions:
   * - Plane: 'Shot Down'
   * - SeaVessel: 'Sunk'
   * - Building/other: 'Destroyed'
   *
   * @returns {string} Always returns 'Destroyed' as base class default
   * @public
   * @example
   * const shape = new SeaShape('Test', 'T', 'S', [[0,0]], 'Test', 'tip')
   * shape.sunkDescriptionRaw() // 'Destroyed'
   *
   * @see {@link Plane#sunkDescription} for aircraft destruction description
   * @see {@link SeaVessel#sunkDescription} for vessel destruction description
   */
  sunkDescriptionRaw () {
    return 'Destroyed'
  }

  /**
   * Returns the description text for this shape.
   *
   * Provides human-readable name of the shape for UI display and identification.
   * This is the primary identifier shown in the game UI for the shape.
   * Retrieved from the descriptionText property set during construction.
   *
   * @returns {string} The shape's human-readable description (e.g., 'Battleship', 'Tower')
   * @public
   * @see {@link descriptionText} for the underlying property storage
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
 *
 * Represents structures that can be placed on land terrain with validation rules.
 * Provides land-specific placement constraints for ground-based defensive structures.
 * Buildings are immobile defensive installations that provide tactical advantages.
 *
 * Extends {@link SeaShape} with land-specific terrain and zone validation. All buildings
 * are constrained to land terrain only and use the land subterrain validator for placement.
 *
 * @class Building
 * @extends SeaShape
 * @description
 * Buildings are stationary structures constrained to land terrain only.
 * They cannot move and must satisfy land-based zone validation rules.
 * Immune to 'Z' and '+' terrain damage types.
 *
 * @see {@link HillFort} for inland-specific building implementation
 * @see {@link CoastalPort} for coastal-specific building implementation
 * @public
 */
export class Building extends SeaShape {
  /**
   * The subterrain for building placement validation.
   * Determines which terrain type buildings can be placed on.
   * Set to Building.subterrain (land) during construction.
   *
   * @type {SubTerrain}
   * @public
   */
  subterrain

  /**
   * Function to check if placement is valid.
   * Validates that the building can be placed on the given subterrain.
   * Bound validator from Building.validator for context preservation.
   *
   * @type {(subterrain: SubTerrain) => boolean}
   * @public
   */
  validator

  /**
   * Zone detail level for validation.
   * Determines how detailed zone information must be during validation:
   * - 0: no zone checking
   * - 1: subterrain only
   * - 2: subterrain and zone
   *
   * @type {number}
   * @public
   */
  zoneDetail

  /**
   * Terrain types immune to damage for this building.
   * List of subterrain identifiers ('Z', '+') that cannot damage this building.
   * Buildings are immune to these specific terrain effects during combat.
   *
   * @type {string[]}
   * @public
   */
  immune

  /**
   * Creates a new building instance.
   *
   * Initializes building with land-based terrain constraints and placement rules.
   * Buildings can only be placed on land terrain and are immune to 'Z' and '+' terrain damage.
   * Sets up land-specific validator and zone detail level for placement validation.
   *
   * @param {string} description - Human-readable name of the building (e.g., 'Guard Tower', 'Watchtower')
   *                              Displayed in UI and used as primary identifier
   * @param {string} letter - Single character identifier for the building (e.g., 'T', 'F', 'W')
   *                         Used in serialization and grid representation
   * @param {string} symmetry - Symmetry type affecting rotation/placement constraints
   *                           Valid values: 'S' (single), 'A' (asymmetric), 'G' (group), 'X' (no), 'W' (wide)
   * @param {Array<[number, number]>} cells - Array of [row, column] cell offsets defining building shape
   *                                          Offsets relative to placement origin
   * @param {string} [tip] - Placement tip text for user guidance (optional, auto-generated if not provided)
   *                        Default: 'place {description} on the land'
   * @param {Array<[number, number]>} [racks] - Array of rack positions for weapon attachment (optional)
   *                                            Array of [row, column] positions where weapons can be placed
   *                                            Null or omitted for non-weapon buildings
   *
   * @throws {Error} If parent constructor validation fails
   *
   * @returns {void}
   * @public
   * @example
   * const tower = new Building('Tower', 'T', 'S', [[0,0], [1,0]], 'Place tower on highlands')
   * tower.canBeOn(land) // true
   * tower.type() // 'G'
   *
   * @example
   * // Building with weapon racks
   * const fortified = new Building('Fortress', 'F', 'S', [[0,0], [1,0], [0,1]], undefined, [[0,1]])
   * fortified.immune // ['Z', '+']\n   */
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
   *
   * Identifies this shape as a ground-based (building) unit for game mechanics.
   * Used to determine unit category and behavior in placement and combat systems.
   * Enables type-based filtering and special handling throughout game logic.
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
   *
   * Validates that placement is only on land terrain, rejecting sea or mixed terrains.
   * Used during placement validation to ensure buildings respect terrain constraints.
   *
   * @param {SubTerrain} subterrain - The subterrain type to validate for placement
   *                                 Must be compared against the land subterrain
   * @returns {boolean} True if subterrain is land type, false otherwise
   * @public
   * @example
   * const building = new Building('Tower', 'T', 'S', [[0,0]])
   * building.canBeOn(land) // true
   * building.canBeOn(sea) // false
   * building.canBeOn(seaAndLand) // false
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
   * Provides static terrain reference for validation throughout Building class.
   *
   * @static
   * @type {SubTerrain}
   * @readonly
   * @public
   */
  static subterrain = land

  /**
   * Function to check if placement is valid for the given subterrain.
   * Delegates to land subterrain's canBe method for compatibility checking.
   * Binds to the land object to maintain proper context and reference.
   *
   * @static
   * @type {(subterrain: SubTerrain) => boolean}
   * @readonly
   * @public
   */
  static canBe = land.canBe.bind(land)

  /**
   * Validator function for zone checking.
   * Delegates to land subterrain's validator method for zone validation.
   * Binds to the land object for proper context in validation calls.
   * Type-cast to ZoneInfo validator for type safety.
   *
   * @static
   * @type {(zoneInfo: ZoneInfo) => boolean}
   * @readonly
   * @public
   */
  static validator = /** @type {(zoneInfo: ZoneInfo) => boolean} */ (
    land.validator.bind(land)
  )

  /**
   * Zone detail level required for building placement validation.
   * Determines depth of zone checking needed during validation.
   * Inherited from land subterrain configuration.
   *
   * @static
   * @type {number}
   * @readonly
   * @public
   */
  static zoneDetail = land.zoneDetail
}

/**
 * Base class for buildings that require specific zone validation.
 *
 * Extends {@link Building} with zone-based placement rules for specialized land structures.
 * Subclasses override the static zone property to define placement constraints.
 * Provides stricter validation requiring both terrain AND zone match.
 *
 * @class ZoneValidatedBuilding
 * @extends Building
 * @description
 * Provides zone-aware validation for buildings that require specific zone types.
 * Validates both subterrain AND zone matches before allowing placement.
 * Enables specialized building types with specific zone requirements (inland, coastal, etc).
 * @protected
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
 * @public
 */
export class HillFort extends ZoneValidatedBuilding {
  /**
   * Creates a new hill fort instance.
   *
   * Initializes with inland zone constraints and placement rules.
   * Hill forts cannot touch sea squares and must be completely surrounded by land.
   * Provides strategic defense positions for inland-only positioning.
   *
   * @param {string} description - Human-readable name of the hill fort (e.g., 'Stone Fort', 'Highland Keep')
   *                              Displayed in UI for player reference
   * @param {string} letter - Single character identifier for the hill fort
   *                         Used in serialization and grid representation
   * @param {string} symmetry - Symmetry type: S (single), A (asymmetric), G (group), X (no), W (wide)
   *                           Determines rotation/placement flexibility
   * @param {Array<[number, number]>} cells - Array of [row, column] cell offsets defining fort shape
   *                                          Offsets relative to placement origin
   * @param {Array<[number, number]>} [racks] - Array of rack positions for weapon placement (optional)
   *                                            Null or omitted for unweaponized forts
   *
   * @throws {Error} If parent constructor validation fails
   *
   * @returns {void}
   * @public
   * @example
   * const fort = new HillFort('Stone Fort', 'F', 'S', [[0,0], [1,0]])
   * fort.zone // inland
   * fort.canBeOn(land) // true
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
 * Ensures hill forts can only be placed in inland zones.
 *
 * @type {(zoneInfo: ZoneInfo) => boolean}
 * @static
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
 * @public
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
 * Ensures coastal ports can only be placed in coastal zones.
 *
 * @type {(zoneInfo: ZoneInfo) => boolean}
 * @static
 */
CoastalPort.validator = CoastalPort.validator.bind(CoastalPort)

/**
 * Plane/aircraft shape class for aerial units.
 *
 * Can be placed anywhere on the map without terrain restrictions.
 * Provides air superiority and mobility unaffected by terrain constraints.
 * Aircraft units operate above terrain limitations with complete placement freedom.
 *
 * Extends {@link SeaShape} with unrestricted terrain access using the 'all' subterrain.
 * Uses 'A' type identifier to distinguish air units from naval ('S') and ground ('G') units.
 *
 * @class Plane
 * @extends SeaShape
 * @description
 * Planes are not constrained by terrain or zone restrictions.
 * They can be placed on any terrain type (sea, land, etc) without validation.
 * Immune to 'Z' and '+' terrain effects, vulnerable to 'F' (fire) terrain.
 *
 * @see {@link Plane#type} returns 'A' for aircraft type
 * @see {@link Plane#sunkDescription} returns 'Shot Down' for destruction
 * @public
 */
export class Plane extends SeaShape {
  /**
   * The subterrain for plane placement validation.
   * References 'all' to allow placement anywhere.
   * Initialized with all subterrain in constructor.
   *
   * @type {Object}
   * @public
   */
  subterrain

  /**
   * Validator function for zone checking.
   * Planes have no terrain restrictions, always returns true.
   * Initialized with all.canBe.bind(all) in constructor.
   *
   * @type {(zoneInfo: ZoneInfo) => boolean}
   * @public
   */
  validator

  /**
   * Zone detail level for validation.
   * No zone validation needed for aircraft.
   * Inherited from all subterrain.
   *
   * @type {number}
   * @public
   */
  zoneDetail

  /**
   * Terrain types immune to damage for this plane.
   * Terrain features that cannot damage the aircraft.
   * Initialized with ['Z', '+'] to be immune to certain terrains.
   *
   * @type {string[]}
   * @public
   */
  immune

  /**
   * Terrain types vulnerable to damage for this plane.
   * Terrain features that can damage the aircraft.
   * Initialized with ['F'] to be vulnerable to fire terrain.
   *
   * @type {string[]}
   * @public
   */
  vulnerable

  /**
   * Creates a new plane instance.
   *
   * Initializes with unrestricted placement rules across all terrain types.
   * Planes can be placed anywhere on the map without terrain constraints or zone validation.
   * Aircraft are immune to 'Z' and '+' terrain effects but vulnerable to 'F' (fire) terrain.
   *
   * @param {string} description - Human-readable name of the aircraft (e.g., 'Fighter Jet', 'Bomber')
   *                              Displayed in UI and used as primary identifier
   * @param {string} letter - Single character identifier for the aircraft
   *                         Used in serialization and grid representation
   * @param {string} symmetry - Symmetry type affecting rotation/placement flexibility
   *                           Valid values: 'S' (single), 'A' (asymmetric), 'G' (group), 'X' (no), 'W' (wide)
   * @param {Array<[number, number]>} cells - Array of [row, column] cell offsets defining aircraft shape
   *                                          Offsets relative to placement origin
   * @param {Array<[number, number]>} [racks] - Array of rack positions for weapon placement (optional)
   *                                            Array of [row, column] positions where weapons attach
   *                                            Null or omitted for unweaponized aircraft
   *
   * @throws {Error} If parent constructor validation fails
   *
   * @returns {void}
   * @public
   * @example
   * const plane = new Plane('Fighter Jet', 'F', 'S', [[0,0], [1,0]])
   * plane.type() // 'A'
   * plane.canBeOn(sea) // true
   * plane.canBeOn(land) // true
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
   *
   * Identifies this shape as an aerial (plane) unit for game mechanics.
   * Used to distinguish air units from sea ('S') and ground ('G') units throughout game logic.
   * Enables type-based filtering and special air-unit handling in combat and movement systems.
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
   *
   * Planes have no terrain restrictions and can be placed anywhere.
   * The subterrain parameter is accepted for interface compatibility but is not used.
   * Aircraft can operate at any altitude above all terrain types.
   *
   * @param {SubTerrain} _subterrain - The subterrain to check (unused in planes, ignored for aircraft)
   * @returns {boolean} Always returns true (planes unrestricted by terrain)
   * @public
   * @example
   * const plane = new Plane('Fighter', 'F', 'S', [[0,0]])
   * plane.canBeOn(sea) // true
   * plane.canBeOn(land) // true
   * plane.canBeOn(seaAndLand) // true
   * plane.canBeOn(all) // true
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
   * Binds to the all object's canBe for proper context.
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
   * @type {(zoneInfo: ZoneInfo) => boolean}
   * @example
   * Plane.validator([sea, deep]) // true
   */
  static validator = /** @type {(zoneInfo: ZoneInfo) => boolean} */ (
    all.canBe.bind(all)
  )

  /**
   * Zone detail level required for plane placement validation.
   * No zone detail needed (planes unrestricted).
   * Inherited from all subterrain configuration.
   *
   * @static
   * @type {number}
   */
  static zoneDetail = all.zoneDetail
}

/**
 * Sea vessel shape class for water-based naval units.
 *
 * Represents ships that operate in sea terrain with specific zone constraints.
 * Provides naval combat capabilities with sea-based placement rules and validation.
 * Vessels are the primary naval combat units constrained to ocean environments.
 *
 * Extends {@link SeaShape} with sea-specific terrain and zone validation. All vessels
 * are constrained to sea terrain only and use the sea subterrain validator for placement.
 * Uses 'S' type identifier to distinguish sea units from air ('A') and ground ('G') units.
 *
 * @class SeaVessel
 * @extends SeaShape
 * @description
 * Sea vessels are constrained to sea terrain only.
 * They validate placement using zone information for proper naval positioning.
 * Supports specialized vessel types through zone-validated subclasses.
 *
 * @see {@link DeepSeaVessel} for deep-water-only vessel implementation
 * @see {@link ShallowDock} for shallow-water dock implementation
 * @public
 */
export class SeaVessel extends SeaShape {
  /**
   * The subterrain for vessel placement validation.
   * Determines which terrain type vessels can be placed on.
   * Initialized to sea subterrain in constructor.
   *
   * @type {SubTerrain}
   * @public
   */
  subterrain

  /**
   * Validator function for zone checking.
   * Validates that the vessel can be placed in the given zone.
   * Uses sea subterrain's validator method.
   *
   * @type {(zoneInfo: ZoneInfo) => boolean}
   * @public
   */
  validator

  /**
   * Zone detail level for validation.
   * Determines how detailed zone information must be.
   * Inherited from sea subterrain configuration.
   *
   * @type {number}
   * @public
   */
  zoneDetail

  /**
   * Creates a new sea vessel instance.
   *
   * Initializes vessel with sea-based terrain constraints and placement rules.
   * Vessels can only be placed on sea terrain and use validator for zone checking.
   * Sets up sea-specific validator and zone detail level for placement validation.
   *
   * @param {string} description - Human-readable name of the vessel (e.g., 'Battleship', 'Cruiser')
   *                              Displayed in UI and used as primary identifier
   * @param {string} letter - Single character identifier for the vessel (e.g., 'B', 'C', 'D')
   *                         Used in serialization and grid representation
   * @param {string} symmetry - Symmetry type affecting rotation/placement constraints
   *                           Valid values: 'S' (single), 'A' (asymmetric), 'G' (group), 'X' (no), 'W' (wide)
   * @param {Array<[number, number]>} cells - Array of [row, column] cell offsets defining vessel shape
   *                                          Offsets relative to placement origin
   * @param {string} [tip] - Placement tip text for user guidance (optional, auto-generated if not provided)
   *                        Default: 'place {description} in the sea'
   * @param {Array<[number, number]>} [racks] - Array of rack positions for weapon attachment (optional)
   *                                            Array of [row, column] positions where weapons can be placed
   *                                            Null or omitted for unarmed vessels
   *
   * @throws {Error} If parent constructor validation fails
   *
   * @returns {void}
   * @public
   * @example
   * const ship = new SeaVessel('Battleship', 'B', 'S', [[0,0], [1,0]], 'Place in deep water')
   * ship.type() // 'S'
   * ship.canBeOn(sea) // true
   *
   * @example
   * // Warship with weapon racks
   * const warship = new SeaVessel('Warship', 'W', 'S', [[0,0], [1,0]], undefined, [[0,1], [1,1]])
   * warship.sunkDescription() // 'Sunk'
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
   *
   * Identifies this shape as a sea-based (vessel) unit for game mechanics.
   * Used to determine unit category and behavior in placement and combat systems.
   * Enables type-based filtering and special naval handling throughout game logic.
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
   *
   * Validates that placement is only on sea terrain, rejecting land or mixed terrains.
   * Used during placement validation to ensure vessels respect sea terrain constraints.
   *
   * @param {SubTerrain} subterrain - The subterrain type to validate for placement
   *                                 Must be compared against the sea subterrain
   * @returns {boolean} True if subterrain is sea type, false otherwise
   * @public
   * @example
   * const ship = new SeaVessel('Battleship', 'B', 'S', [[0,0]])
   * ship.canBeOn(sea) // true
   * ship.canBeOn(land) // false
   * ship.canBeOn(seaAndLand) // false
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
   * Binds to the sea object's canBe for proper context.
   *
   * @static
   * @type {(subterrain: SubTerrain) => boolean}
   */
  static canBe = sea.canBe.bind(sea)

  /**
   * Validator function for zone checking.
   * Delegates to sea subterrain's validator method.
   * Ensures vessels are placed in valid sea zones based on zone configuration.
   * Binds to the sea object's validator for proper context.
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
   * Inherited from sea subterrain configuration.
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
 * @protected
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
 * @public
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
 * Binds to DeepSeaVessel class's validator for proper context.
 *
 * @type {(zoneInfo: ZoneInfo) => boolean}
 * @static
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
 * @public
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
 * Binds to ShallowDock class's validator for proper context.
 *
 * @type {(zoneInfo: ZoneInfo) => boolean}
 * @static
 * @example
 * ShallowDock.validator([sea, littoral]) // true
 * ShallowDock.validator([sea, deep]) // false
 */
ShallowDock.validator = ShallowDock.validator.bind(ShallowDock)
