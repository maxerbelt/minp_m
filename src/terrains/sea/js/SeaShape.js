import { all } from '../../all/js/terrain.js'
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
 * Base class for all sea and land terrain shapes.
 * Provides common functionality for ship placement and terrain interaction.
 */
class SeaShape extends Shape {
  /**
   * Creates a new sea shape instance.
   * @param {string} description - Human-readable description of the shape
   * @param {string} letter - Single character identifier for the shape
   * @param {string} symmetry - Symmetry type (S, A, G, X, W)
   * @param {Array} cells - Cell configuration for the shape
   * @param {string} tallyGroup - Group identifier for scoring/tallying
   * @param {string} tip - Placement tip text
   * @param {Array} racks - Rack configuration
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
 */
export class Building extends SeaShape {
  /**
   * Creates a new building instance.
   * @param {string} description - Description of the building
   * @param {string} letter - Shape identifier letter
   * @param {string} symmetry - Symmetry type
   * @param {Array} cells - Cell configuration
   * @param {string} tip - Placement tip (optional)
   * @param {Array} racks - Rack configuration
   */
  constructor (description, letter, symmetry, cells, tip, racks) {
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
    this.validator = Building.validator
    this.zoneDetail = Building.zoneDetail
    this.canBeOn = HillFort.canBe
    this.immune = ['Z', '+']
  }

  /**
   * Returns the shape type identifier.
   * @returns {string} Always returns 'G' for ground/building
   */
  type () {
    return 'G'
  }

  // Static properties for building placement rules
  /** @type {Object} Subterrain configuration for buildings */
  static subterrain = land
  /** @type {Function} Function to check if placement is valid */
  static canBe = land.canBe
  /** @type {Function} Validator function for zone checking */
  static validator = land.validator
  /** @type {number} Zone detail level */
  static zoneDetail = land.zoneDetail
}
/**
 * Hill fort building - must be surrounded by land, cannot touch sea.
 */
export class HillFort extends Building {
  /**
   * Creates a new hill fort instance.
   * @param {string} description - Description of the hill fort
   * @param {string} letter - Shape identifier letter
   * @param {string} symmetry - Symmetry type
   * @param {Array} cells - Cell configuration
   * @param {Array} racks - Rack configuration
   */
  constructor (description, letter, symmetry, cells, racks) {
    super(
      description,
      letter,
      symmetry,
      cells,
      `place ${description} on the highlands`,
      racks
    )
    this.validator = HillFort.validator
    this.zoneDetail = HillFort.zoneDetail
    this.canBeOn = HillFort.canBe
    this.notes = [
      `${description} can not touch sea squares; must be surrounded by land squares.`
    ]
  }

  /**
   * Checks if this hill fort can be placed on the given subterrain and zone.
   * @param {Object} subterrain - The subterrain to check
   * @param {Object} zone - The zone to check
   * @returns {boolean} True if placement is valid (land + inland only)
   */
  static canBe (subterrain, zone) {
    return subterrain === land && zone === inland
  }

  /** @type {Function} Validator function that uses canBe logic */
  static validator = zoneInfo => HillFort.canBe(zoneInfo[0], zoneInfo[1])
  /** @type {number} Zone detail level for validation */
  static zoneDetail = 2
}
/**
 * Coastal port building - must be on the coast and touching sea squares.
 */
export class CoastalPort extends Building {
  /**
   * Creates a new coastal port instance.
   * @param {string} description - Description of the coastal port
   * @param {string} letter - Shape identifier letter
   * @param {string} symmetry - Symmetry type
   * @param {Array} cells - Cell configuration
   * @param {Array} racks - Rack configuration
   */
  constructor (description, letter, symmetry, cells, racks) {
    super(
      description,
      letter,
      symmetry,
      cells,
      `place ${description} on the coast`,
      racks
    )
    this.validator = CoastalPort.validator
    this.zoneDetail = CoastalPort.zoneDetail
    this.canBeOn = CoastalPort.canBe
    this.notes = [`${description} must be touching sea squares.`]
  }

  /**
   * Checks if this coastal port can be placed on the given subterrain and zone.
   * @param {Object} subterrain - The subterrain to check
   * @param {Object} zone - The zone to check
   * @returns {boolean} True if placement is valid (land + coast only)
   */
  static canBe (subterrain, zone) {
    return subterrain === land && zone === coast
  }

  /** @type {Function} Validator function that uses canBe logic */
  static validator = zoneInfo => CoastalPort.canBe(zoneInfo[0], zoneInfo[1])
  /** @type {number} Zone detail level for validation */
  static zoneDetail = 2
}
/**
 * Plane/aircraft shape class for aerial units.
 * Can be placed anywhere on the map.
 */
export class Plane extends SeaShape {
  /**
   * Creates a new plane instance.
   * @param {string} description - Description of the aircraft
   * @param {string} letter - Shape identifier letter
   * @param {string} symmetry - Symmetry type
   * @param {Array} cells - Cell configuration
   * @param {Array} racks - Rack configuration
   */
  constructor (description, letter, symmetry, cells, racks) {
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
    this.canBeOn = Plane.canBe
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
   * Checks if this plane can be placed anywhere.
   * @returns {boolean} Always returns true (planes can be placed anywhere)
   */
  canBeOn () {
    return true
  }

  // Static properties for plane placement rules
  /** @type {Object} Subterrain configuration for planes */
  static subterrain = all
  /** @type {Function} Function to check if placement is valid */
  static canBe = all.canBe
  /** @type {Function} Validator function for zone checking */
  static validator = all.canBe
  /** @type {number} Zone detail level */
  static zoneDetail = all.zoneDetail
}
/**
 * Sea vessel shape class for water-based naval units.
 * Represents ships that operate in sea terrain.
 */
export class SeaVessel extends SeaShape {
  /**
   * Creates a new sea vessel instance.
   * @param {string} description - Description of the vessel
   * @param {string} letter - Shape identifier letter
   * @param {string} symmetry - Symmetry type
   * @param {Array} cells - Cell configuration
   * @param {string} tip - Placement tip (optional)
   * @param {Array} racks - Rack configuration
   */
  constructor (description, letter, symmetry, cells, tip, racks) {
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
    this.validator = SeaVessel.validator
    this.zoneDetail = SeaVessel.zoneDetail
    this.canBeOn = SeaVessel.canBe
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

  // Static properties for sea vessel placement rules
  /** @type {Object} Subterrain configuration for sea vessels */
  static subterrain = sea
  /** @type {Function} Function to check if placement is valid */
  static canBe = sea.canBe
  /** @type {Function} Validator function for zone checking */
  static validator = sea.validator
  /** @type {number} Zone detail level */
  static zoneDetail = sea.zoneDetail
}
/**
 * Deep sea vessel - must be surrounded by sea squares, cannot touch land.
 */
export class DeepSeaVessel extends SeaVessel {
  /**
   * Creates a new deep sea vessel instance.
   * @param {string} description - Description of the deep sea vessel
   * @param {string} letter - Shape identifier letter
   * @param {string} symmetry - Symmetry type
   * @param {Array} cells - Cell configuration
   * @param {Array} racks - Rack configuration
   */
  constructor (description, letter, symmetry, cells, racks) {
    super(
      description,
      letter,
      symmetry,
      cells,
      `place ${description} in the deep sea`,
      racks
    )
    this.validator = DeepSeaVessel.validator
    this.zoneDetail = DeepSeaVessel.zoneDetail
    this.notes = [
      `${description} can not touch land squares; must be surrounded by sea squares.`
    ]
    this.canBeOn = DeepSeaVessel.canBe
  }

  /**
   * Checks if this deep sea vessel can be placed on the given subterrain and zone.
   * @param {Object} subterrain - The subterrain to check
   * @param {Object} zone - The zone to check
   * @returns {boolean} True if placement is valid (sea + deep only)
   */
  static canBe (subterrain, zone) {
    return subterrain === sea && zone === deep
  }

  /** @type {Function} Validator function that uses canBe logic */
  static validator = zoneInfo => DeepSeaVessel.canBe(zoneInfo[0], zoneInfo[1])
  /** @type {number} Zone detail level for validation */
  static zoneDetail = 2
}
/**
 * Shallow dock vessel - must be touching land squares.
 */
export class ShallowDock extends SeaVessel {
  /**
   * Creates a new shallow dock instance.
   * @param {string} description - Description of the shallow dock
   * @param {string} letter - Shape identifier letter
   * @param {string} symmetry - Symmetry type
   * @param {Array} cells - Cell configuration
   * @param {Array} racks - Rack configuration
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
    this.validator = ShallowDock.validator
    this.zoneDetail = ShallowDock.zoneDetail
    this.notes = [`${description} must be touching land squares.`]
    this.canBeOn = ShallowDock.canBe
  }

  /**
   * Checks if this shallow dock can be placed on the given subterrain and zone.
   * @param {Object} subterrain - The subterrain to check
   * @param {Object} zone - The zone to check
   * @returns {boolean} True if placement is valid (sea + littoral only)
   */
  static canBe (subterrain, zone) {
    return subterrain === sea && zone === littoral
  }

  /** @type {Function} Validator function that uses canBe logic */
  static validator = zoneInfo => ShallowDock.canBe(zoneInfo[0], zoneInfo[1])
  /** @type {number} Zone detail level for validation */
  static zoneDetail = 2
}
