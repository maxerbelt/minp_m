import { all } from './space.js'
import { Shape } from '../ships/Shape.js'
import {
  spaceAndAsteroids,
  asteroid,
  core,
  surface,
  space,
  deep,
  near
} from './space.js'
import { Armed } from '../variants/WeaponVariant.js'

class SpaceShape extends Shape {
  constructor (description, letter, symmetry, cells, tallyGroup, tip, racks) {
    super(letter, symmetry, cells, tallyGroup, tip, racks)
    this.descriptionText = description
    this.terrain = spaceAndAsteroids
  }
  sunkDescriptionRaw () {
    return 'Destroyed'
  }

  description () {
    return this.descriptionText
  }
}
export class Installation extends SpaceShape {
  constructor (description, letter, symmetry, cells, tip, racks) {
    super(
      description,
      letter,
      symmetry,
      cells,
      'G',
      tip || `place ${description} on an asteroid`,
      racks
    )
    this.subterrain = Installation.subterrain
    this.validator = Installation.validator
    this.zoneDetail = Installation.zoneDetail
    this.canBeOn = Installation.canBe
  }
  static subterrain = asteroid
  static canBe = asteroid.canBe
  static validator = asteroid.validator
  static zoneDetail = asteroid.zoneDetail

  type () {
    return 'G'
  }
}
export class ArmedInstallation extends Armed(Installation) {}

export class CoreInstallation extends Installation {
  constructor (description, letter, symmetry, cells, racks) {
    super(
      description,
      letter,
      symmetry,
      cells,
      `place ${description} deep within an asteroid`,
      racks
    )
    this.validator = CoreInstallation.validator
    this.zoneDetail = CoreInstallation.zoneDetail
    this.canBeOn = CoreInstallation.canBe
    this.notes = [
      `${description} can not touch space squares; must be surrounded by asteroid squares.`
    ]
  }
  static canBe (subterrain, zone) {
    return subterrain === asteroid && zone === core
  }
  static validator = zoneInfo =>
    CoreInstallation.canBe(zoneInfo[0], zoneInfo[1])
  static zoneDetail = 2
}
export class SurfaceInstallation extends Installation {
  constructor (description, letter, symmetry, cells, racks) {
    super(
      description,
      letter,
      symmetry,
      cells,
      `place ${description} on the surface of an asteroid`,
      racks
    )
    this.validator = SurfaceInstallation.validator
    this.zoneDetail = SurfaceInstallation.zoneDetail
    this.canBeOn = SurfaceInstallation.canBe
    this.notes = [`${description} must be touching sea squares.`]
  }

  static canBe (subterrain, zone) {
    return subterrain === asteroid && zone === surface
  }
  static validator = zoneInfo =>
    SurfaceInstallation.canBe(zoneInfo[0], zoneInfo[1])
  static zoneDetail = 2
}
export class Shuttle extends SpaceShape {
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
    this.subterrain = Shuttle.subterrain
    this.canBeOn = Shuttle.canBe
    this.immune = ['#']
  }
  static subterrain = all
  static canBe = all.canBe
  static validator = all.canBe
  static zoneDetail = all.zoneDetail

  type () {
    return 'A'
  }
  sunkDescription () {
    return 'Shot Down'
  }

  canBeOn () {
    return true
  }
}
export class ArmedShuttle extends Armed(Shuttle) {}

export class SpaceVessel extends SpaceShape {
  constructor (description, letter, symmetry, cells, tip, racks) {
    super(
      description,
      letter,
      symmetry,
      cells,
      'S',
      tip || `place ${description} in space`,
      racks
    )
    this.subterrain = SpaceVessel.subterrain
    this.validator = SpaceVessel.validator
    this.zoneDetail = SpaceVessel.zoneDetail
    this.canBeOn = SpaceVessel.canBe
  }
  static subterrain = space
  static canBe = space.canBe
  static validator = space.validator
  static zoneDetail = space.zoneDetail

  type () {
    return 'S'
  }
}

export class ArmedVessel extends Armed(SpaceVessel) {}

export class DeepSpaceVessel extends SpaceVessel {
  constructor (description, letter, symmetry, cells, racks) {
    super(
      description,
      letter,
      symmetry,
      cells,
      `place ${description} in deep space`,
      racks
    )
    this.validator = DeepSpaceVessel.validator
    this.zoneDetail = DeepSpaceVessel.zoneDetail
    this.notes = [
      `${description} can not touch land squares; must be surrounded by sea squares.`
    ]
    this.canBeOn = DeepSpaceVessel.canBe
  }
  static canBe (subterrain, zone) {
    return subterrain === space && zone === deep
  }
  static validator = zoneInfo => DeepSpaceVessel.canBe(zoneInfo[0], zoneInfo[1])
  static zoneDetail = 2
}
export class SpacePort extends SpaceVessel {
  constructor (description, letter, symmetry, cells, racks) {
    super(
      description,
      letter,
      symmetry,
      cells,
      `place ${description} in near space`,
      racks
    )
    this.validator = SpacePort.validator
    this.zoneDetail = SpacePort.zoneDetail
    this.notes = [`${description} must be touching asteroid squares.`]
    this.canBeOn = SpacePort.canBe
  }
  static canBe (subterrain, zone) {
    return subterrain === space && zone === near
  }
  static validator = zoneInfo => SpacePort.canBe(zoneInfo[0], zoneInfo[1])
  static zoneDetail = 2
}
