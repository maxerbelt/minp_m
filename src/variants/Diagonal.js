import { Blinker } from './Blinker.js'
import { FlippableVariant } from './FlippableVariant.js'
import { Mask } from '../grid/rectangle/mask.js'

export class Diagonal extends FlippableVariant {
  /**
   * @param {any} board
   * @param {any} validator
   * @param {any} zoneDetail
   * @param {any} variants
   */
  constructor (board, validator, zoneDetail, variants) {
    super(validator, zoneDetail, 'A')
    this.list = Mask.listFromCoords(variants) || Diagonal.variantsOf(board)
  }

  /**
   * @param {object} board
   * @returns {unknown[]}
   */
  static variantsOf (board) {
    return [
      board.square.defaultVariant.shrinkToOccupied(),
      board.square.clone.rotate().shrinkToOccupied()
    ]
  }

  static r = Blinker.r
  static f = Blinker.r
  static rf = Blinker.r
  static setBehaviour = FlippableVariant.setBehaviour.bind(null, Diagonal)
}
