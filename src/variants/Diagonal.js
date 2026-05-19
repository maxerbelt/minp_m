import { Blinker } from './Blinker.js'
import { FlippableVariant } from './FlippableVariant.js'
import { Mask } from '../grid/rectangle/mask.js'

/**
 * @typedef {{r:(idx:number)=>number, f:(idx:number)=>number, rf:(idx:number)=>number}} VariantTransitionClass
 */

/**
 * Diagonal variant that supports flipping and limited rotation.
 */
export class Diagonal extends FlippableVariant {
  /**
   * Creates a diagonal variant instance.
   * @param {any} board - The base board.
   * @param {Function} validator - Validation function.
   * @param {object} zoneDetail - Zone details.
   * @param {any[]} variants - Optional variant coordinates.
   */
  constructor (board, validator, zoneDetail, variants) {
    super(validator, zoneDetail, 'G')
    this.list = Mask.listFromCoords(variants) || Diagonal.variantsOf(board)
  }

  /**
   * Generates the two diagonal variants.
   * @param {any} board - The base board.
   * @returns {any[]} The variants.
   */
  static variantsOf (board) {
    return [
      board.square.defaultVariant.shrinkToOccupied(),
      board.square.defaultVariant.clone.rotate().shrinkToOccupied()
    ]
  }

  /**
   * Configures behavior for diagonal variants.
   * @param {VariantTransitionClass} VariantClass - The variant class.
   * @param {Diagonal} instance - The instance to configure.
   */
  static setBehaviour (VariantClass, instance) {
    FlippableVariant.setBehaviour(VariantClass, instance)
  }

  static r = Blinker.r
  static f = Blinker.r
  static rf = Blinker.r
}
