import { rotate3, flip3, rf3 } from './normalize.js'
import { FlippableVariant } from './FlippableVariant.js'
import { makeCell3 } from './makeCell3.js'
import { Mask } from '../grid/mask.js'

export class Orbit4F extends FlippableVariant {
  constructor (board, validator, zoneDetail, variants) {
    super(validator, zoneDetail, 'A')
    this.list = Mask.listFromCoordsSquare(variants) || Orbit4F.variantsOf(board)
  }

  static variantsOf (board) {
    return [
      board.square.defaultVariant,
      board.square.rotate(),
      board.square.flip(),
      board.square.rotateFlip()
    ]
  }

  static setBehaviour = FlippableVariant.setBehaviour.bind(null, Orbit4F)

  static cell3 (full, subGroups) {
    const unrotated = makeCell3(full, subGroups)
    return [unrotated, rotate3(unrotated), flip3(unrotated), rf3(unrotated)]
  }

  static r = idx => (idx > 1 ? 2 : 0) + (idx % 2 === 0 ? 1 : 0)
  static f = idx => (idx > 1 ? 0 : 2) + (idx % 2)
  static rf = idx => (idx > 1 ? 2 : 0) + (idx % 2 === 0 ? 1 : 0)
}
