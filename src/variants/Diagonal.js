import { Blinker } from './Blinker.js'
import { FlippableVariant } from './FlippableVariant.js'
import { Mask } from '../grid/mask.js'

export class Diagonal extends FlippableVariant {
  constructor (board, validator, zoneDetail, variants) {
    super(validator, zoneDetail, 'A')
    this.list = Mask.listFromCoords(variants) || Diagonal.variantsOf(board)
  }

  static variantsOf (board) {
    return [
      board.square.defaultVariant.shrinkToOccupied(),
      board.square.clone.rotate().shrinkToOccupied()
    ]
  }

  static setBehaviour (rotatable) {
    rotatable.canFlip = true
    rotatable.canRotate = true
    rotatable.r1 = Blinker.r
    rotatable.f1 = Blinker.r
    rotatable.rf1 = Blinker.r
  }
}
