import { Invariant } from './Invariant.js'
import { RotatableVariant } from './RotatableVariant.js'
import { Mask } from '../grid/rectangle/mask.js'

/**
 * Blinker variant that supports rotation but not flipping.
 */
export class Blinker extends RotatableVariant {
  /**
   * Creates a blinker variant instance.
   * @param {any} board - The base board.
   * @param {Function} validator - Validation function.
   * @param {object} zoneDetail - Zone details.
   * @param {any[]} variants - Optional variant coordinates.
   */
  constructor (board, validator, zoneDetail, variants) {
    super(validator, zoneDetail, 'L')
    this.list = Mask.listFromCoords(variants) || Blinker.variantsOf(board)
  }

  /**
   * Generates the two blinker variants.
   * @param {any} board - The base board.
   * @returns {any[]} The variants.
   */
  static variantsOf (board) {
    const unrotated = board.square
    return [
      unrotated.shrinkToOccupied(),
      unrotated.clone.rotate().shrinkToOccupied()
    ]
  }

  /**
   * Configures behavior for blinker variants.
   * @param {Function} VariantClass - The variant class.
   * @param {Blinker} instance - The instance to configure.
   */
  static setBehaviour (VariantClass, instance) {
    instance.canFlip = false
    instance.canRotate = true
    instance.canTransform = true
    instance.r1 = VariantClass.r
    instance.f1 = Invariant.r
    instance.rf1 = VariantClass.r
  }

  static r = idx => (idx === 0 ? 1 : 0)
}
