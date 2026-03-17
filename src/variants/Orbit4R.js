import { FlippableVariant } from './FlippableVariant.js'
import { Mask } from '../grid/mask.js'

export class Orbit4R extends FlippableVariant {
  constructor (board, validator, zoneDetail, variants) {
    super(validator, zoneDetail)
    this.list = Mask.listFromCoordsSquare(variants) || Orbit4R.variantsOf(board)
  }
  static variantsOf (board) {
    return [
      board.square.defaultVariant.shrinkToOccupied(),
      board.square.r90().shrinkToOccupied(),
      board.square.r180().shrinkToOccupied(),
      board.square.r270().shrinkToOccupied()
    ]
  }

  static setBehaviour = FlippableVariant.setBehaviour.bind(null, Orbit4R)

  static r = idx => (idx + 1) % 4
  static f = idx => (idx + 2) % 4
  static rf = idx => (idx === 0 ? 3 : idx - 1)
}
