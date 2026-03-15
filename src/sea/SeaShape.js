import { all, Terrain } from '../terrain/terrain.js'
import { SubTerrain } from '../terrain/SubTerrain.js'
import { Zone } from '../terrain/Zone.js'
import {
  seaAndLand,
  land,
  inland,
  coast,
  sea,
  deep,
  littoral
} from './seaAndLand.js'
import { Shape } from '../ships/Shape.js'

class SeaShape extends Shape {
  constructor (description, letter, symmetry, cells, tallyGroup, tip, racks) {
    super(letter, symmetry, cells, tallyGroup, tip, racks)
    this.descriptionText = description
    this.terrain = seaAndLand
  }
  sunkDescriptionRaw () {
    return 'Destroyed'
  }

  description () {
    return this.descriptionText
  }
}
export class Building extends SeaShape {
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
  static subterrain = land
  static canBe = land.canBe
  static validator = land.validator
  static zoneDetail = land.zoneDetail

  type () {
    return 'G'
  }
}
export class HillFort extends Building {
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
  static canBe (subterrain, zone) {
    return subterrain === land && zone === inland
  }
  static validator = zoneInfo => HillFort.canBe(zoneInfo[0], zoneInfo[1])
  static zoneDetail = 2
}
export class CoastalPort extends Building {
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

  static canBe (subterrain, zone) {
    return subterrain === land && zone === coast
  }
  static validator = zoneInfo => CoastalPort.canBe(zoneInfo[0], zoneInfo[1])
  static zoneDetail = 2
}
export class Plane extends SeaShape {
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
export class SeaVessel extends SeaShape {
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
  static subterrain = sea
  static canBe = sea.canBe
  static validator = sea.validator
  static zoneDetail = sea.zoneDetail

  type () {
    return 'S'
  }
  sunkDescription () {
    return 'Sunk'
  }
  description () {
    return this.descriptionText
  }
}
export class DeepSeaVessel extends SeaVessel {
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
  static canBe (subterrain, zone) {
    return subterrain === sea && zone === deep
  }
  static validator = zoneInfo => DeepSeaVessel.canBe(zoneInfo[0], zoneInfo[1])
  static zoneDetail = 2
}
export class ShallowDock extends SeaVessel {
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
  static canBe (subterrain, zone) {
    return subterrain === sea && zone === littoral
  }
  static validator = zoneInfo => ShallowDock.canBe(zoneInfo[0], zoneInfo[1])
  static zoneDetail = 2
}
