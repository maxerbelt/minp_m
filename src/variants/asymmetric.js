import { FlippableVariant } from './FlippableVariant.js'
import { Mask } from '../grid/rectangle/mask.js'

export class Asymmetric extends FlippableVariant {
  /**
   * @param {any} board
   * @param {any} validator
   * @param {any} zoneDetail
   * @param {any} variants
   */
  constructor (board, validator, zoneDetail, variants) {
    super(validator, zoneDetail, 'D')
    this.list = Mask.listFromCoords(variants) || Asymmetric.variantsOf(board)
  }

  static setBehaviour = FlippableVariant.setBehaviour.bind(null, Asymmetric)

  /**
   * @param {object} board
   * @returns {unknown[]}
   */
  static variantsOf (board) {
    const unrotated = board.square.defaultVariant
    const rightList = Asymmetric.collectRotatedVariants(unrotated)
    const leftList = Asymmetric.collectRotatedVariants(unrotated.clone.flip())
    return rightList.concat(leftList)
  }

  /**
   * Build four successive rotations of the given board.
   * @param {object} baseBoard
   * @returns {unknown[]}
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
