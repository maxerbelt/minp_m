import { Mask } from '../grid/rectangle/mask.js'
import { RotatableVariant } from './RotatableVariant.js'

export class FlippableVariant extends RotatableVariant {
  /**
   * @param {unknown} validator
   * @param {unknown} zoneDetail
   * @param {string} symmetry
   */
  constructor (validator, zoneDetail, symmetry) {
    super(validator, zoneDetail, symmetry)
    if (new.target === FlippableVariant) {
      throw new Error(
        'base class cannot be instantiated directly. Please extend it.'
      )
    }
    this.canFlip = true
  }

  /**
   * Build the variant list from optional coordinate variants or the subclass fallback.
   * @param {unknown} board
   * @param {unknown} variantCoordinates
   * @returns {unknown[]}
   */
  static createVariantList (board, variantCoordinates) {
    return (
      Mask.listFromCoordsSquare(variantCoordinates) || this.variantsOf(board)
    )
  }

  /**
   * Configure rotation and flip transition functions for a flippable variant.
   * @param {Function} VariantClass
   * @param {FlippableVariant} instance
   */
  static setBehaviour (VariantClass, instance) {
    super.setBehaviour(VariantClass, instance)
    instance.canFlip = true
  }
}
