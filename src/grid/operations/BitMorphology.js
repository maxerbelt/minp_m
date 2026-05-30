/**
 * @typedef {import('../../../back/StoreBig.js').StoreBig} StoreBig
 */

/**
 * @typedef {Object} EdgeMasks
 * @description Defines expansion boundaries for morphological operations
 * @property {bigint} [left] - Mask for left edge boundary cells
 * @property {bigint} [right] - Mask for right edge boundary cells
 * @property {bigint} [top] - Mask for top edge boundary cells
 * @property {bigint} [bottom] - Mask for bottom edge boundary cells
 */

/**
 * BitMorphology - Morphological operations on bitboard representations
 *
 * Encapsulates bit manipulation methods for morphological operations like dilation
 * and erosion on bitboard representations. Operations include horizontal dilation
 * and combination of bitboards using bitwise operations. Provides foundational
 * utilities for grid-based cellular operations.
 *
 * @class BitMorphology
 * @description Morphological operations on bitboard representations
 * @public
 */
class BitMorphology {
  /**
   * Create a BitMorphology instance for performing morphological bit operations
   *
   * @param {StoreBig} store - The bitboard store providing shift and expansion methods
   * @throws {Error} If store is not provided or missing required methods
   * @public
   */
  constructor (store) {
    this.store = store
  }

  /**
   * Dilate a bitboard horizontally using edge masks
   *
   * Performs horizontal dilation by:
   * 1. Preparing left and right expanded sources from the bitboard using edge masks
   * 2. Shifting the expanded sources left and right respectively
   * 3. Combining all three (original, left shift, right shift) with bitwise OR
   *
   * This operation expands set bits horizontally, creating a "thickening" effect in the
   * left and right directions while respecting edge boundaries defined by the masks.
   *
   * @param {bigint} bitboard - The bitboard to dilate (BigInt value where each bit represents a cell state)
   * @param {EdgeMasks} edgeMasks - Edge masks defining expansion boundaries for left/right operations
   * @returns {bigint} The horizontally dilated bitboard result
   * @throws {TypeError} If bitboard is not a BigInt or edgeMasks is malformed
   * @public
   */
  dilateHorizontal (bitboard, edgeMasks) {
    const srcLeft = this.store.prepareSrcForLeftExpansion(bitboard, edgeMasks)
    const srcRight = this.store.prepareSrcForRightExpansion(bitboard, edgeMasks)

    const left = this.store.shiftBits(srcLeft, -1)
    const right = this.store.shiftBits(srcRight, 1)

    return this.combine(bitboard, left, right)
  }

  /**
   * Combine multiple bitboards using bitwise OR operation
   *
   * Merges all provided bitboards together using bitwise OR and applies
   * the store's full bits mask to ensure the result is properly bounded
   * and doesn't exceed the grid dimensions.
   *
   * @param {...bigint} values - Variable number of bitboards to combine (each a BigInt)
   * @returns {bigint} Combined bitboard with all bits from input values ORed together
   * @throws {TypeError} If any value is not a BigInt
   * @public
   */
  combine (...values) {
    const mask = this.store.fullBits
    let result = 0n

    for (const v of values) {
      result |= v
    }
    return result & mask
  }
}

export { BitMorphology }
