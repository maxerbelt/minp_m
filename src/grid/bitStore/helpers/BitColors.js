/**
 * Extracts single-color layers from multi-color bitboards.
 * Converts a color value into a boolean mask where set bits indicate
 * cells containing that color.
 *
 * @class BitColors
 */
export class BitColors {
  /**
   * Initializes BitColors with a multi-color store implementation.
   *
   * @param {Object} store - Store with multi-color cell access and singleBitStore
   */
  constructor (store) {
    this.store = store
  }

  /**
   * Extracts a single-color layer from a multi-color bitboard.
   * Returns a bitboard where set bits mark all cells containing the specified color.
   * Empty cells (value 0) are never included in the result.
   *
   * @param {bigint} bitboard - Multi-color bitboard to filter
   * @param {number|bigint} color - Target color value to extract
   * @param {number} width - Grid width in cells
   * @param {number} height - Grid height in cells
   * @returns {bigint} Single-bit mask where set bits indicate target color presence
   * @example
   * const colorBoard = bitColors.extractLayer(multiColorBoard, 3, 8, 8);
   * // colorBoard has bits set where grid cells contain color value 3
   */
  extractLayer (bitboard, color, width, height) {
    const colorValue = BigInt(color)
    let result = 0n

    for (let index = 0; index < width * height; index++) {
      if (this.store.getIdx(bitboard, index) === colorValue) {
        result = this.store.singleBitStore.setIdx(result, index, 1n)
      }
    }

    return result
  }
}
