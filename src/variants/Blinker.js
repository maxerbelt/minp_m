import { Invariant } from './Invariant.js'
import { RotatableVariant } from './RotatableVariant.js'
import { Mask } from '../grid/mask.js'

export class Blinker extends RotatableVariant {
  constructor (board, validator, zoneDetail, variants) {
    super(validator, zoneDetail)
    this.list = Mask.listFromCoords(variants) || Blinker.variantsOf(board)
  }
  static variantsOf (board) {
    const unrotated = board.square
    return [unrotated, unrotated.clone.rotate()]
  }

  static setBehaviour (rotatable) {
    rotatable.canFlip = false
    rotatable.canRotate = true
    rotatable.r1 = Blinker.r
    rotatable.f1 = Invariant.r
    rotatable.rf1 = Blinker.r
  }

  static r = idx => (idx === 0 ? 1 : 0)

  rotate () {
    this.setByIndex(this.r1(this.index))
  }

  leftRotate () {
    this.rotate()
  }
}
