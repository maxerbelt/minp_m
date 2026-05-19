import { FlippableVariant } from './FlippableVariant.js'
import { Mask } from '../grid/rectangle/mask.js'

/**
 * @fileoverview Asymmetric variant supporting 8 orientations (4 rotations + 4 flipped rotations).
 *
 * @typedef {import('../grid/rectangle/mask.js').Mask} MaskType
 * @typedef {{r:(idx:number)=>number, f:(idx:number)=>number, rf:(idx:number)=>number}} VariantTransitionClass
 * @typedef {{shrinkToOccupied: ()=>MaskType, clone: {rotate: ()=>any, flip?: ()=>any}}} RotatableBoard
 */

/**
 * Asymmetric variant class.
 * @extends {FlippableVariant}
 */
export class Asymmetric extends FlippableVariant {
  /**
   * Creates an asymmetric variant instance.
   * @param {{square: {defaultVariant: any}}} board - The base board. Expected to expose `square.defaultVariant`.
   * @param {(coords: any) => boolean} validator - Validation function used by the base class.
   * @param {object} zoneDetail - Zone details passed to the base class.
   * @param {Array<Array<Array<number>>>|Array<[number,number]>} [variants] - Optional array of shapes or a single shape coordinate array.
   */
  constructor (board, validator, zoneDetail, variants) {
    super(validator, zoneDetail, 'D')
    // prefer provided variants (coords) converted to Mask, otherwise derive from board
    let list = null
    if (variants) {
      // Mask.listFromCoords expects an array of shapes (Array<Array<Array<number>>>).
      // If a single shape (Array<[number,number]>) is provided, wrap it.
      if (
        Array.isArray(variants) &&
        variants.length > 0 &&
        Array.isArray(variants[0]) &&
        typeof variants[0][0] === 'number'
      ) {
        // variants is a single shape: wrap it and cast to the expected triple-nested array
        list = Mask.listFromCoords(
          /** @type {Array<Array<Array<number>>>} */ ([variants])
        )
      } else {
        list = Mask.listFromCoords(
          /** @type {Array<Array<Array<number>>>} */ (variants)
        )
      }
    }
    this.list = list || Asymmetric.variantsOf(board)
  }

  /**
   * Configure behaviour for an external Variant class using FlippableVariant helper.
   * @param {VariantTransitionClass} VariantClass - Class to configure.
   * @param {Asymmetric} instance - Instance to configure.
   * @returns {void}
   */
  static setBehaviour (VariantClass, instance) {
    FlippableVariant.setBehaviour(VariantClass, instance)
  }

  /**
   * Generate all 8 asymmetric variants from the provided board.
   * @param {{square: {defaultVariant: any}}} board - Board containing `square.defaultVariant`.
   * @returns {MaskType[]}
   */
  static variantsOf (board) {
    const unrotated = board.square.defaultVariant
    const rightList = Asymmetric.collectRotatedVariants(unrotated)
    const leftList = Asymmetric.collectRotatedVariants(unrotated.clone.flip())
    return rightList.concat(leftList)
  }

  /**
   * Build four successive rotations of the given base variant/board.
   * The `baseBoard` is expected to implement `shrinkToOccupied()`, `clone` and `rotate()`.
   * @param {RotatableBoard} baseBoard
   * @returns {MaskType[]}
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

  /**
   * Map an index to the 'r' rotation mapping used by the variant system.
   * @param {number} idx
   * @returns {number}
   */
  static r (idx) {
    return (idx > 3 ? 4 : 0) + (idx % 4 === 3 ? 0 : (idx + 1) % 4)
  }

  /**
   * Map an index to the 'f' (flip) mapping used by the variant system.
   * @param {number} idx
   * @returns {number}
   */
  static f (idx) {
    return (idx > 3 ? 0 : 4) + (idx % 4)
  }

  /**
   * Map an index to the 'rf' (rotate-then-flip) mapping used by the variant system.
   * @param {number} idx
   * @returns {number}
   */
  static rf (idx) {
    return (idx > 3 ? 4 : 0) + (idx % 4 === 0 ? 3 : (idx - 1) % 4)
  }
}
