import { FlippableVariant } from './FlippableVariant.js'
import { Mask } from '../grid/mask.js'

export class Orbit4F extends FlippableVariant {
  constructor (board, validator, zoneDetail, variants) {
    super(validator, zoneDetail, 'A')
    this.list = Mask.listFromCoordsSquare(variants) || Orbit4F.variantsOf(board)
  }

  static variantsOf (board) {
    return [
      board.square.defaultVariant.shrinkToOccupied(),
      board.square.rotate().shrinkToOccupied(),
      board.square.flip().shrinkToOccupied(),
      board.square.rotateFlip().shrinkToOccupied()
    ]
  }

  static setBehaviour = FlippableVariant.setBehaviour.bind(null, Orbit4F)

  static r = idx => (idx > 1 ? 2 : 0) + (idx % 2 === 0 ? 1 : 0)
  static f = idx => (idx > 1 ? 0 : 2) + (idx % 2)
  static rf = idx => (idx > 1 ? 2 : 0) + (idx % 2 === 0 ? 1 : 0)
}
