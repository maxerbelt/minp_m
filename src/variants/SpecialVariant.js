import { Random } from '../core/Random.js'
import { Placeable } from './Placeable.js'
import { Placeable3 } from './Placeable3.js'
import { RotatableVariant } from './RotatableVariant.js'
import { variantType } from './variantType.js'
import { Mask } from '../grid/rectangle/mask.js'

/**
 * Special variant class that handles multi-layer boards with subgroups.
 */
export class SpecialVariant extends RotatableVariant {
  /**
   * Creates a special variant instance.
   * @param {string} symmetry - The symmetry type.
   */
  constructor (symmetry) {
    super(Function.prototype, 0, symmetry)
  }

  /**
   * Builds the board list based on symmetry.
   * @param {string} symmetry - The symmetry type.
   * @param {any} board - The base board.
   */
  buildBoard3 (symmetry, board) {
    if (Array.isArray(board)) {
      board = Mask.fromCoordsSquare(board)
    }
    if (!(board instanceof Mask)) {
      throw new Error(
        'Board must be a Mask instance or an array of coordinates'
      )
    }
    const unrotated = board.square.defaultVariant
    const VariantType = variantType(symmetry)
    let boards = []
    if (typeof VariantType.variantsOf === 'function') {
      boards = VariantType.variantsOf(unrotated)
    } else {
      throw new TypeError(
        `Variant '${symmetry}' does not support variantsOf method`,
        { VariantType }
      )
    }
    this.list = boards
    this.specialGroups.forEach(g => {
      g.parent = this
    })
  }

  /**
   * Gets the board at the specified index.
   * @param {number | undefined | null} index - The variant index.
   * @returns {any} The board.
   */
  boardFor (index) {
    const idx = index == null ? this.index : index
    return this.list[idx]
  }

  /**
   * Gets the special board for a subgroup.
   * @param {number} index - The variant index.
   * @param {number} groupIndex - The subgroup index.
   * @returns {any} The special board.
   */
  specialBoard (index, groupIndex) {
    const board = this.boardFor(index)
    return board.extractColorLayer(groupIndex + 1)
  }

  /**
   * Creates a placeable for the specified index.
   * @param {number | undefined | null} index - The variant index.
   * @returns {Placeable3} The placeable.
   */
  placeable (index) {
    const idx = index == null ? this.index : index
    return new Placeable3(
      super.placeable(idx),
      this.subGroups.map(
        (g, i) =>
          new Placeable(this.specialBoard(idx, i), g.validator, g.zoneDetail)
      )
    )
  }

  /**
   * Configures behavior for special variants.
   * @param {Function} v3 - The variant class.
   * @param {SpecialVariant} symmetry - The instance.
   */
  static setBehaviourTo (v3, symmetry) {
    const VariantType = variantType(symmetry.symmetry)
    // Set static transition functions on the variant class
    v3.r = VariantType.r
    v3.f = VariantType.f
    v3.rf = VariantType.rf
    VariantType.setBehaviour(v3, symmetry)
  }

  /**
   * Gets shuffled placeables.
   * @returns {Placeable3[]} The shuffled placeables.
   */
  placeables () {
    return this.shuffledPlaceables()
  }

  /**
   * Shuffles placeables based on variant count.
   * @returns {Placeable3[]} The shuffled placeables.
   */
  shuffledPlaceables () {
    const shuffledIndices = this.getShuffledIndices()
    return shuffledIndices.map(i => this.placeable(i))
  }

  /**
   * Gets shuffled indices based on list length.
   * @returns {number[]} The shuffled indices.
   * @private
   */
  getShuffledIndices () {
    switch (this.list.length) {
      case 8:
        return Random.shuffleArray([0, 1, 2, 3, 4, 5, 6, 7])
      case 4:
        return Random.shuffleArray([0, 1, 2, 3])
      case 2:
        return Random.shuffleArray([0, 1])
      case 1:
        return [0]
      default:
        throw new Error(`Unknown number of variants: ${this.list.length}`)
    }
  }
}
