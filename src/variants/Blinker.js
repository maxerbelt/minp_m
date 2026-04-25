import { Invariant } from './Invariant.js'
import { RotatableVariant } from './RotatableVariant.js'
import { Mask } from '../grid/rectangle/mask.js'

export class Blinker extends RotatableVariant {
  /**
   * @param {any} board
   * @param {any} validator
   * @param {any} zoneDetail
   * @param {any} variants
   */
  constructor (board, validator, zoneDetail, variants) {
    super(validator, zoneDetail)
    this.list = Mask.listFromCoords(variants) || Blinker.variantsOf(board)
  }

  /**
   * @param {object} board
   * @returns {unknown[]}
   */
  static variantsOf (board) {
    const unrotated = board.square
    return [
      unrotated.shrinkToOccupied(),
      unrotated.clone.rotate().shrinkToOccupied()
    ]
  }

  /**
   * Configure a rotatable blinker variant.
   * @param {object} instance
   */
  static setBehaviour (instance) {
    instance.canFlip = false
    instance.canRotate = true
    instance.r1 = Blinker.r
    instance.f1 = Invariant.r
    instance.rf1 = Blinker.r
  }

  static r = idx => (idx === 0 ? 1 : 0)

  /**
   * Rotate and update the active variant index.
   * @returns {unknown}
   */
  rotate () {
    return this.setByIndex(this.r1(this.index))
  }

  /**
   * Left rotate behaves the same as rotate for this shape.
   * @returns {unknown}
   */
  leftRotate () {
    return this.rotate()
  }
}
