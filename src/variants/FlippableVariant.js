import { Mask } from '../grid/rectangle/mask.js'
import { RotatableVariant } from './RotatableVariant.js'

/**
 * Variant class that supports both rotation and flipping transformations.
 */
export class FlippableVariant extends RotatableVariant {
  /**
   * Creates a flippable variant instance.
   * @param {Function} validator - Validation function.
   * @param {object} zoneDetail - Zone details.
   * @param {string} symmetry - Symmetry type.
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
   * Builds the variant list from optional coordinate variants or the subclass fallback.
   * @param {any} board - The base board.
   * @param {any} variantCoordinates - Optional coordinates.
   * @returns {any[]} The list of variants.
   */
  static createVariantList (board, variantCoordinates) {
    return (
      Mask.listFromCoordsSquare(variantCoordinates) || this.variantsOf(board)
    )
  }

  /**
   * Configures rotation and flip transition functions for a flippable variant.
   * @param {Function} VariantClass - The variant class.
   * @param {FlippableVariant} instance - The instance to configure.
   */
  static setBehaviour (VariantClass, instance) {
    super.setBehaviour(VariantClass, instance)
    instance.canFlip = true
  }
}
