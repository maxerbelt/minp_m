import { makeCell3 } from './makeCell3.js'
import { Variants } from './variants.js'

export class Invariant extends Variants {
  constructor (board, validator, zoneDetail) {
    super(validator, zoneDetail, 'S')
    this.list = [board.shrinkToOccupied()]
  }

  static variantsOf (board) {
    return [board.shrinkToOccupied()]
  }
  static setBehaviour (invariant) {
    invariant.canFlip = false
    invariant.canRotate = false
    invariant.canTransform = false
    invariant.r1 = Invariant.r
    invariant.f1 = Invariant.r
    invariant.rf1 = Invariant.r
  }

  variant (_index) {
    return this.list[0].toCoords
  }

  setByIndex (_index) {
    throw new Error('can not change this variant')
  }

  static r = idx => idx
}
