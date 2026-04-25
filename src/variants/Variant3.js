import { SpecialVariant } from './SpecialVariant.js'

/**
 * Variant class for handling three-layer variants with subgroups.
 */
export class Variant3 extends SpecialVariant {
  /**
   * Creates a variant3 instance.
   * @param {any} board - The base board.
   * @param {any[]} subGroups - The subgroups.
   * @param {string} symmetry - The symmetry type.
   */
  constructor (board, subGroups, symmetry) {
    super(symmetry)
    this.subGroups = subGroups || []
    const [head, ...tail] = subGroups
    this.standardGroup = head
    this.specialGroups = tail
    this.buildBoard3(symmetry, board)
  }

  /**
   * Configures behavior for variant3.
   * @param {Function} v3 - The variant class.
   * @param {Variant3} symmetry - The instance.
   */
  static setBehaviour = SpecialVariant.setBehaviourTo
}
