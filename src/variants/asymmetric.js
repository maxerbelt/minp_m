import { FlippableVariant } from './FlippableVariant.js'
import { Mask } from '../grid/rectangle/mask.js'

/**
 * Asymmetric variant that supports 8 orientations (4 rotations + 4 flipped rotations).
 */
export class Asymmetric extends FlippableVariant {
  /**
   * Creates an asymmetric variant instance.
   * @param {any} board - The base board.
   * @param {Function} validator - Validation function.
   * @param {object} zoneDetail - Zone details.
   * @param {any[]} variants - Optional variant coordinates.
   */
  constructor (board, validator, zoneDetail, variants) {
    super(validator, zoneDetail, 'D')
    this.list = Mask.listFromCoords(variants) || Asymmetric.variantsOf(board)
  }

  /**
   * Configures behavior for asymmetric variants.
   * @param {Function} VariantClass - The variant class.
   * @param {Asymmetric} instance - The instance to configure.
   */
  static setBehaviour (VariantClass, instance) {
    FlippableVariant.setBehaviour(VariantClass, instance)
  }

  /**
   * Generates all 8 asymmetric variants from the base board.
   * @param {any} board - The base board.
   * @returns {any[]} The list of variants.
   */
  static variantsOf (board) {
    const unrotated = board.square.defaultVariant
    const rightList = Asymmetric.collectRotatedVariants(unrotated)
    const leftList = Asymmetric.collectRotatedVariants(unrotated.clone.flip())
    return rightList.concat(leftList)
  }

  /**
   * Builds four successive rotations of the given board.
   * @param {any} baseBoard - The base board to rotate.
   * @returns {any[]} The rotated variants.
   */
  static collectRotatedVariants (baseBoard) {
    const variants = [baseBoard.shrinkToOccupied()]
    let current = baseBoard
    for (let i = 0; i < 3; i++) {
      current = current.clone.rotate()
      variants.push(current.shrinkToOccupied())
    }
    return variants
  }

  static r (idx) {
    return (idx > 3 ? 4 : 0) + (idx % 4 === 3 ? 0 : (idx + 1) % 4)
  }

  static f = idx => (idx > 3 ? 0 : 4) + (idx % 4)

  static rf = idx => (idx > 3 ? 4 : 0) + (idx % 4 === 0 ? 3 : (idx - 1) % 4)
}
