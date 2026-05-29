/**
 * @typedef {import('../../../back/StoreBig.js').StoreBig} StoreBig
 */

/**
 * BitMorphology
 *
 * Holds bit manipulation methods for morphological operations like dilation and erosion
 * on bitboard representations. Operations include horizontal dilation and combination
 * of bitboards using bitwise operations.
 *
 * Consider consolidating into mask classes if not needed separately.
 *
 * @class BitMorphology
 */
// eslint-disable-next-line no-unused-vars
class BitMorphology {
  /**
   * Create a BitMorphology instance for performing morphological bit operations
   *
   * @param {StoreBig} store - The bitboard store providing shift and expansion methods
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
   * @param {bigint} bitboard - The bitboard to dilate (BigInt value where each bit represents a cell state)
   * @param {object} edgeMasks - Edge masks defining expansion boundaries for left/right operations
   * @returns {bigint} The horizontally dilated bitboard result
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
   *
   * @param {...bigint} values - Variable number of bitboards to combine
   * @returns {bigint} Combined bitboard with all bits from input values ORed together
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
