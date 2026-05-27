import { all } from '../../all/js/terrain.js'
/** @typedef {import('../../all/js/SubTerrain.js').SubTerrain} SubTerrain */
/** @typedef {import('../../all/js/Zone.js').Zone} Zone */
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
 * @typedef {[SubTerrain, Zone]} ZoneInfo
 */

/**
 * Base class for all sea and land terrain shapes.
 * Provides common functionality for ship placement and terrain interaction.
 * Extends Shape to handle terrain-specific placement rules.
 *
 * @class SeaShape
 * @extends Shape
 */
class SeaShape extends Shape {
  /**
   * The terrain configuration for this shape.
   * @type {Object}
   */
  terrain

  /**
   * Creates a new sea shape instance.
   * @param {string} description - Human-readable description of the shape
   * @param {string} letter - Single character identifier for the shape
   * @param {string} symmetry - Symmetry type (S, A, G, X, W)
   * @param {Array<[number, number]>} cells - Cell configuration for the shape
   * @param {string} tallyGroup - Group identifier for scoring/tallying
   * @param {string} tip - Placement tip text
   * @param {Array<[number, number]>|null} racks - Rack configuration
   */
  constructor (description, letter, symmetry, cells, tallyGroup, tip, racks) {
    super(letter, symmetry, cells, tallyGroup, tip, racks)
    this.descriptionText = description
    this.terrain = seaAndLand
  }

  /**
   * Returns the raw sunk description for this shape.
   * @returns {string} Always returns 'Destroyed'
   */
  sunkDescriptionRaw () {
    return 'Destroyed'
  }

  /**
   * Returns the description text for this shape.
   * @returns {string} The shape's description
   */
  description () {
    return this.descriptionText
  }
}

/**
 * Building shape class for land-based installations.
 * Represents structures that can be placed on land terrain.
 *
 * @class Building
 * @extends SeaShape
 */
export class Building extends SeaShape {
  /**
   * The subterrain for building placement validation.
   * @type {SubTerrain}
   */
  subterrain

  /**
   * Function to check if placement is valid.
   * @type {(subterrain: SubTerrain) => boolean}
   */
  validator

  /**
   * Zone detail level for validation.
   * @type {number}
   */
  zoneDetail

  /**
   * Terrain types immune to damage for this building.
   * @type {string[]}
   */
  immune

  /**
   * Creates a new building instance.
   * @param {string} description - Description of the building
   * @param {string} letter - Shape identifier letter
   * @param {string} symmetry - Symmetry type
   * @param {Array<[number, number]>} cells - Cell configuration
   * @param {string} [tip] - Placement tip (optional)
   * @param {Array<[number, number]>} [racks] - Rack configuration
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
   * @returns {string} Always returns 'G' for ground/building
   */
  type () {
    return 'G'
  }

  /**
   * Checks if this building can be placed on the given subterrain.
   * @param {SubTerrain} subterrain - The subterrain to check
   * @returns {boolean} True if placement is valid (land only)
   */
  canBeOn (subterrain) {
    return subterrain === land
  }

  // Static properties for building placement rules

  /** @type {SubTerrain} Subterrain configuration for buildings */
  static subterrain = land

  /** @type {(subterrain: SubTerrain) => boolean} Function to check if placement is valid */
  static canBe = land.canBe.bind(land)

  /** @type {(zoneInfo: ZoneInfo) => boolean} Validator function for zone checking */
  static validator = /** @type {(zoneInfo: ZoneInfo) => boolean} */ (
    land.validator.bind(land)
  )

  /** @type {number} Zone detail level */
  static zoneDetail = land.zoneDetail
}

/**
 * Base class for buildings that require specific zone validation.
 * Extends Building with zone-based placement rules.
 * Subclasses override the zone property to define placement constraints.
 *
 * @class ZoneValidatedBuilding
 * @extends Building
 */
class ZoneValidatedBuilding extends Building {
  /**
   * Specific zone for validation (overridden in subclasses).
   * @type {Zone | null}
   */
  static zone = null

  /**
   * Checks if this zone-validated building can be placed on the given subterrain and zone.
   * @param {SubTerrain} subterrain - The subterrain to check
   * @param {Zone} zone - The zone to check
   * @returns {boolean} True if placement is valid for the specific zone
   */
  static canBe (subterrain, zone) {
    return subterrain === this.subterrain && zone === this.zone
  }

  /**
   * Validator function that checks the passed zoneInfo against this class.
   * @param {ZoneInfo} zoneInfo - Tuple of [subterrain, zone]
   * @returns {boolean} True if the subterrain and zone match
   */
  static validator (zoneInfo) {
    return this.canBe(zoneInfo[0], zoneInfo[1])
  }

  /** @type {number} Zone detail level for validation */
  static zoneDetail = 2
}

/**
 * Hill fort building - must be surrounded by land, cannot touch sea.
 * A defensive structure that requires inland terrain and cannot be placed near coastal areas.
 *
 * @class HillFort
 * @extends ZoneValidatedBuilding
 */
export class HillFort extends ZoneValidatedBuilding {
  /**
   * Creates a new hill fort instance.
   * @param {string} description - Description of the hill fort
   * @param {string} letter - Shape identifier letter
   * @param {string} symmetry - Symmetry type
   * @param {Array<[number, number]>} cells - Cell configuration
   * @param {Array<[number, number]>} [racks] - Rack configuration
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

  /** @type {Zone} Specific zone for hill forts */
  static zone = inland
}

/** @type {(zoneInfo: ZoneInfo) => boolean} */
HillFort.validator = HillFort.validator.bind(HillFort)

/**
 * Coastal port building - must be on the coast and touching sea squares.
 * A trading structure that requires coastal access and sea proximity.
 *
 * @class CoastalPort
 * @extends ZoneValidatedBuilding
 */
export class CoastalPort extends ZoneValidatedBuilding {
  /**
   * Creates a new coastal port instance.
   * @param {string} description - Description of the coastal port
   * @param {string} letter - Shape identifier letter
   * @param {string} symmetry - Symmetry type
   * @param {Array<[number, number]>} cells - Cell configuration
   * @param {Array<[number, number]>} [racks] - Rack configuration
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

  /** @type {Zone} Specific zone for coastal ports */
  static zone = coast
}

/** @type {(zoneInfo: ZoneInfo) => boolean} */
CoastalPort.validator = CoastalPort.validator.bind(CoastalPort)

/**
 * Plane/aircraft shape class for aerial units.
 * Can be placed anywhere on the map without terrain restrictions.
 *
 * @class Plane
 * @extends SeaShape
 */
export class Plane extends SeaShape {
  /**
   * The subterrain for plane placement validation.
   * @type {Object}
   */
  subterrain

  /**
   * Validator function for zone checking.
   * @type {(subterrain: SubTerrain) => boolean}
   */
  validator

  /**
   * Zone detail level for validation.
   * @type {number}
   */
  zoneDetail

  /**
   * Terrain types immune to damage for this plane.
   * @type {string[]}
   */
  immune

  /**
   * Terrain types vulnerable to damage for this plane.
   * @type {string[]}
   */
  vulnerable

  /**
   * Creates a new plane instance.
   * @param {string} description - Description of the aircraft
   * @param {string} letter - Shape identifier letter
   * @param {string} symmetry - Symmetry type
   * @param {Array<[number, number]>} cells - Cell configuration
   * @param {Array<[number, number]>} [racks] - Rack configuration
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
   * @returns {string} Always returns 'A' for air
   */
  type () {
    return 'A'
  }

  /**
   * Returns the sunk description for aerial units.
   * @returns {string} Always returns 'Shot Down'
   */
  sunkDescription () {
    return 'Shot Down'
  }

  /**
   * Checks if this plane can be placed on the given subterrain.
   * @param {SubTerrain} _subterrain - The subterrain to check (unused)
   * @returns {boolean} Always returns true (planes can be placed anywhere)
   */
  canBeOn (_subterrain) {
    return true
  }

  // Static properties for plane placement rules

  /** @type {Object} Subterrain configuration for planes */
  static subterrain = all

  /** @type {(subterrain: SubTerrain) => boolean} Function to check if placement is valid */
  static canBe = all.canBe.bind(all)

  /** @type {(subterrain: SubTerrain) => boolean} Validator function for zone checking */
  static validator = /** @type {(subterrain: SubTerrain) => boolean} */ (
    all.canBe.bind(all)
  )

  /** @type {number} Zone detail level */
  static zoneDetail = all.zoneDetail
}

/**
 * Sea vessel shape class for water-based naval units.
 * Represents ships that operate in sea terrain with specific zone constraints.
 *
 * @class SeaVessel
 * @extends SeaShape
 */
export class SeaVessel extends SeaShape {
  /**
   * The subterrain for vessel placement validation.
   * @type {SubTerrain}
   */
  subterrain

  /**
   * Validator function for zone checking.
   * @type {(zoneInfo: ZoneInfo) => boolean}
   */
  validator

  /**
   * Zone detail level for validation.
   * @type {number}
   */
  zoneDetail

  /**
   * Creates a new sea vessel instance.
   * @param {string} description - Description of the vessel
   * @param {string} letter - Shape identifier letter
   * @param {string} symmetry - Symmetry type
   * @param {Array<[number, number]>} cells - Cell configuration
   * @param {string} [tip] - Placement tip (optional)
   * @param {Array<[number, number]>} [racks] - Rack configuration
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
   * @returns {string} Always returns 'S' for sea
   */
  type () {
    return 'S'
  }

  /**
   * Returns the sunk description for sea vessels.
   * @returns {string} Always returns 'Sunk'
   */
  sunkDescription () {
    return 'Sunk'
  }

  /**
   * Returns the description text for this vessel.
   * @returns {string} The vessel's description
   */
  description () {
    return this.descriptionText
  }

  /**
   * Checks if this sea vessel can be placed on the given subterrain.
   * @param {SubTerrain} subterrain - The subterrain to check
   * @returns {boolean} True if placement is valid (sea only)
   */
  canBeOn (subterrain) {
    return subterrain === sea
  }

  // Static properties for sea vessel placement rules

  /** @type {SubTerrain} Subterrain configuration for sea vessels */
  static subterrain = sea

  /** @type {(subterrain: SubTerrain) => boolean} Function to check if placement is valid */
  static canBe = sea.canBe.bind(sea)

  /** @type {(zoneInfo: ZoneInfo) => boolean} Validator function for zone checking */
  static validator = /** @type {(zoneInfo: ZoneInfo) => boolean} */ (
    sea.validator.bind(sea)
  )

  /** @type {number} Zone detail level */
  static zoneDetail = sea.zoneDetail
}

/**
 * Base class for sea vessels that require specific zone validation.
 * Extends SeaVessel with zone-based placement rules.
 * Subclasses override the zone property to define placement constraints.
 *
 * @class ZoneValidatedSeaVessel
 * @extends SeaVessel
 */
class ZoneValidatedSeaVessel extends SeaVessel {
  /**
   * Specific zone for validation (overridden in subclasses).
   * @type {Zone | null}
   */
  static zone = null

  /**
   * Checks if this zone-validated sea vessel can be placed on the given subterrain and zone.
   * @param {SubTerrain} subterrain - The subterrain to check
   * @param {Zone} zone - The zone to check
   * @returns {boolean} True if placement is valid for the specific zone
   */
  static canBe (subterrain, zone) {
    return subterrain === this.subterrain && zone === this.zone
  }

  /**
   * Validator function that checks the passed zoneInfo against this class.
   * @param {ZoneInfo} zoneInfo - Tuple of [subterrain, zone]
   * @returns {boolean} True if the subterrain and zone match
   */
  static validator (zoneInfo) {
    return this.canBe(zoneInfo[0], zoneInfo[1])
  }

  /** @type {number} Zone detail level for validation */
  static zoneDetail = 2
}

/**
 * Deep sea vessel - must be surrounded by sea squares, cannot touch land.
 * An oceanic unit that requires deep water conditions and cannot approach coastlines.
 *
 * @class DeepSeaVessel
 * @extends ZoneValidatedSeaVessel
 */
export class DeepSeaVessel extends ZoneValidatedSeaVessel {
  /**
   * Creates a new deep sea vessel instance.
   * @param {string} description - Description of the deep sea vessel
   * @param {string} letter - Shape identifier letter
   * @param {string} symmetry - Symmetry type
   * @param {Array<[number, number]>} cells - Cell configuration
   * @param {Array<[number, number]>} [racks] - Rack configuration
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

  /** @type {Zone} Specific zone for deep sea vessels */
  static zone = deep
}

/** @type {(zoneInfo: ZoneInfo) => boolean} */
DeepSeaVessel.validator = DeepSeaVessel.validator.bind(DeepSeaVessel)

/**
 * Shallow dock vessel - must be touching land squares.
 * A coastal unit that requires shallow water conditions and land proximity for docking.
 *
 * @class ShallowDock
 * @extends ZoneValidatedSeaVessel
 */
export class ShallowDock extends ZoneValidatedSeaVessel {
  /**
   * Creates a new shallow dock instance.
   * @param {string} description - Description of the shallow dock
   * @param {string} letter - Shape identifier letter
   * @param {string} symmetry - Symmetry type
   * @param {Array<[number, number]>} cells - Cell configuration
   * @param {Array<[number, number]>} racks - Rack configuration
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

  /** @type {Zone} Specific zone for shallow docks */
  static zone = littoral
}

/** @type {(zoneInfo: ZoneInfo) => boolean} */
ShallowDock.validator = ShallowDock.validator.bind(ShallowDock)
