import { Shape } from '../../../ships/Shape.js'
//import { all } from '../../all/js/terrain.js'
import {
  all,
  spaceAndAsteroids,
  asteroid,
  core,
  surface,
  space,
  deep,
  near
} from './space.js'
import { Armed } from '../../../variants/WeaponVariant.js'

const buildPlacementTip = (description, placementPhrase) =>
  `place ${description} ${placementPhrase}`

const zoneValidator = canBe => zoneInfo => canBe(zoneInfo[0], zoneInfo[1])

/**
 * Base shape for space and asteroid objects.
 * @extends Shape
 */
class SpaceShape extends Shape {
  /**
   * @param {string} description
   * @param {string} letter
   * @param {string} symmetry
   * @param {Array<[number, number]>} cells
   * @param {string} tallyGroup
   * @param {string} tip
   * @param {Set<string>|Array<string>|Array<[number, number]>|null} [racks]
   */
  constructor (description, letter, symmetry, cells, tallyGroup, tip, racks) {
    super(letter, symmetry, cells, tallyGroup, tip, racks)
    this.descriptionText = description
    this.terrain = spaceAndAsteroids
  }

  /**
   * Applies the placement-related static properties from a concrete subclass.
   * @param {Function} klass
   * @protected
   */
  _initializePlacementProperties (klass) {
    this.subterrain = klass.subterrain
    this.validator = klass.validator
    this.zoneDetail = klass.zoneDetail
    this.canBeOn = klass.canBe
  }

  /**
   * Internal description used when the shape is sunk.
   * @returns {string}
   */
  sunkDescriptionRaw () {
    return 'Destroyed'
  }

  /**
   * Returns the human-readable description of the shape.
   * @returns {string}
   */
  description () {
    return this.descriptionText
  }
}

/**
 * Installation placed on asteroid terrain.
 * @extends SpaceShape
 */
export class Installation extends SpaceShape {
  /**
   * @param {string} description
   * @param {string} letter
   * @param {string} symmetry
   * @param {Array<[number, number]>} cells
   * @param {string} [tip]
   * @param {Set<string>|Array<string>|Array<[number, number]>|null} [racks]
   */
  constructor (description, letter, symmetry, cells, tip, racks) {
    super(
      description,
      letter,
      symmetry,
      cells,
      'G',
      tip || buildPlacementTip(description, 'on an asteroid'),
      racks
    )
    this._initializePlacementProperties(this.constructor)
  }

  static subterrain = asteroid
  static canBe = asteroid.canBe
  static validator = asteroid.validator
  static zoneDetail = asteroid.zoneDetail

  /**
   * Returns the installation type identifier.
   * @returns {'G'}
   */
  type () {
    return 'G'
  }
}

export class ArmedInstallation extends Armed(Installation) {}

/**
 * Installation that must be placed deep within an asteroid.
 * @extends Installation
 */
export class CoreInstallation extends Installation {
  /**
   * @param {string} description
   * @param {string} letter
   * @param {string} symmetry
   * @param {Array<[number, number]>} cells
   * @param {Set<string>|Array<string>|Array<[number, number]>|null} [racks]
   */
  constructor (description, letter, symmetry, cells, racks) {
    super(
      description,
      letter,
      symmetry,
      cells,
      buildPlacementTip(description, 'deep within an asteroid'),
      racks
    )
    this.notes = [
      `${description} can not touch space squares; must be surrounded by asteroid squares.`
    ]
  }

  static canBe (subterrain, zone) {
    return subterrain === asteroid && zone === core
  }

  static validator = zoneValidator(CoreInstallation.canBe)
  static zoneDetail = 2
}

/**
 * Installation placed on the surface of an asteroid.
 * @extends Installation
 */
export class SurfaceInstallation extends Installation {
  /**
   * @param {string} description
   * @param {string} letter
   * @param {string} symmetry
   * @param {Array<[number, number]>} cells
   * @param {Set<string>|Array<string>|Array<[number, number]>|null} [racks]
   */
  constructor (description, letter, symmetry, cells, racks) {
    super(
      description,
      letter,
      symmetry,
      cells,
      buildPlacementTip(description, 'on the surface of an asteroid'),
      racks
    )
    this.notes = [`${description} must be touching sea squares.`]
  }

  static canBe (subterrain, zone) {
    return subterrain === asteroid && zone === surface
  }

  static validator = zoneValidator(SurfaceInstallation.canBe)
  static zoneDetail = 2
}

/**
 * Shuttle placed on shuttle terrain.
 * @extends SpaceShape
 */
export class Shuttle extends SpaceShape {
  /**
   * @param {string} description
   * @param {string} letter
   * @param {string} symmetry
   * @param {Array<[number, number]>} cells
   * @param {Set<string>|Array<string>|Array<[number, number]>|null} [racks]
   */
  constructor (description, letter, symmetry, cells, racks) {
    super(
      description,
      letter,
      symmetry,
      cells,
      'A',
      buildPlacementTip(description, 'at any location'),
      racks
    )
    this._initializePlacementProperties(this.constructor)
    this.immune = ['#']
  }

  static subterrain = all
  static canBe = all.canBe
  static validator = all.canBe
  static zoneDetail = all.zoneDetail

  /**
   * Returns the shuttle type identifier.
   * @returns {'A'}
   */
  type () {
    return 'A'
  }

  /**
   * Override ship-specific sunk description for shuttle shapes.
   * @returns {string}
   */
  sunkDescription () {
    return 'Shot Down'
  }

  /**
   * Shuttles can always occupy shuttle terrain.
   * @returns {boolean}
   */
  canBeOn () {
    return true
  }
}

export class ArmedShuttle extends Armed(Shuttle) {}

/**
 * Vessel placed in open space terrain.
 * @extends SpaceShape
 */
export class SpaceVessel extends SpaceShape {
  /**
   * @param {string} description
   * @param {string} letter
   * @param {string} symmetry
   * @param {Array<[number, number]>} cells
   * @param {string} [tip]
   * @param {Set<string>|Array<string>|Array<[number, number]>|null} [racks]
   */
  constructor (description, letter, symmetry, cells, tip, racks) {
    super(
      description,
      letter,
      symmetry,
      cells,
      'S',
      tip || buildPlacementTip(description, 'in space'),
      racks
    )
    this._initializePlacementProperties(this.constructor)
  }

  static subterrain = space
  static canBe = space.canBe
  static validator = space.validator
  static zoneDetail = space.zoneDetail

  /**
   * Vessel placement category.
   * @returns {'S'}
   */
  type () {
    return 'S'
  }
}

export class ArmedVessel extends Armed(SpaceVessel) {}

/**
 * Vessel that must be placed in deep space.
 * @extends SpaceVessel
 */
export class DeepSpaceVessel extends SpaceVessel {
  /**
   * @param {string} description
   * @param {string} letter
   * @param {string} symmetry
   * @param {Array<[number, number]>} cells
   * @param {Set<string>|Array<string>|Array<[number, number]>|null} [racks]
   */
  constructor (description, letter, symmetry, cells, racks) {
    super(
      description,
      letter,
      symmetry,
      cells,
      buildPlacementTip(description, 'in deep space'),
      racks
    )
    this.notes = [
      `${description} can not touch land squares; must be surrounded by sea squares.`
    ]
  }

  static canBe (subterrain, zone) {
    return subterrain === space && zone === deep
  }

  static validator = zoneValidator(DeepSpaceVessel.canBe)
  static zoneDetail = 2
}

/**
 * Vessel that must be placed in near space adjacent to asteroids.
 * @extends SpaceVessel
 */
export class SpacePort extends SpaceVessel {
  /**
   * @param {string} description
   * @param {string} letter
   * @param {string} symmetry
   * @param {Array<[number, number]>} cells
   * @param {Set<string>|Array<string>|Array<[number, number]>|null} [racks]
   */
  constructor (description, letter, symmetry, cells, racks) {
    super(
      description,
      letter,
      symmetry,
      cells,
      buildPlacementTip(description, 'in near space'),
      racks
    )
    this.notes = [`${description} must be touching asteroid squares.`]
  }

  static canBe (subterrain, zone) {
    return subterrain === space && zone === near
  }

  static validator = zoneValidator(SpacePort.canBe)
  static zoneDetail = 2
}
