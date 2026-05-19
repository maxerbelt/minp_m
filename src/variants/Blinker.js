import { Invariant } from './Invariant.js'
import { RotatableVariant } from './RotatableVariant.js'
import { Mask } from '../grid/rectangle/mask.js'

/**
 * @fileoverview Blinker variant that supports rotation but not flipping.
 *
 * @typedef {import('../grid/rectangle/mask.js').Mask} MaskType
 * @typedef {{r:(idx:number)=>number, f:(idx:number)=>number, rf:(idx:number)=>number}} VariantTransitionClass
 */

/**
 * Blinker variant class.
 * @extends {RotatableVariant}
 */
export class Blinker extends RotatableVariant {
  /**
   * Creates a blinker variant instance.
   * @param {{square: any}} board - The base board (expects `square` property).
   * @param {Function} validator - Validation function.
   * @param {object} zoneDetail - Zone details.
   * @param {Array<Array<Array<number>>>|Array<[number,number]>} [variants] - Optional shapes or a single shape.
   */
  constructor (board, validator, zoneDetail, variants) {
    super(validator, zoneDetail, 'L')
    let list = null
    if (variants) {
      if (
        Array.isArray(variants) &&
        variants.length > 0 &&
        Array.isArray(variants[0]) &&
        typeof variants[0][0] === 'number'
      ) {
        list = Mask.listFromCoords(
          /** @type {Array<Array<Array<number>>>} */ ([variants])
        )
      } else {
        list = Mask.listFromCoords(
          /** @type {Array<Array<Array<number>>>} */ (variants)
        )
      }
    }
    this.list = list || Blinker.variantsOf(board)
  }

  /**
   * Generates the two blinker variants.
   * @param {{square: any}} board - The base board.
   * @returns {MaskType[]} The variants.
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
   * @param {VariantTransitionClass} VariantClass - The variant class containing static transition methods.
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

  /**
   * Map rotation index for blinker (two orientations).
   * @param {number} idx
   * @returns {number}
   */
  static r (idx) {
    return idx === 0 ? 1 : 0
  }
}
