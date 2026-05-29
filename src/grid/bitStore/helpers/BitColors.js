/**
 * @typedef {Object} SingleBitStore
 * @property {Function} setIdx - Set single bit at index
 * @property {Function} getIdx - Get bit value at index
 * @property {number} bitsPerCell - Bits per cell (should be 1)
 */

/**
 * @typedef {Object} MultiColorStore
 * @property {Function} getIdx - Get cell value at index from multi-color bitboard
 * @property {Function} setIdx - Set cell value at index in multi-color bitboard
 * @property {number} width - Grid width in cells
 * @property {number} height - Grid height in cells
 * @property {number} bitsPerCell - Bits per cell for color depth
 * @property {SingleBitStore} singleBitStore - Underlying 1-bit store for color extraction
 */

/**
 * BitColors - Extracts single-color layers from multi-color bitboards.
 *
 * Converts a color value into a boolean mask where set bits indicate
 * cells containing that color. Useful for separating individual color
 * layers from a multi-bit representation for morphological operations
 * or rendering.
 *
 * @class BitColors
 * @example
 * const bitColors = new BitColors(multiColorStore);
 * const layer3 = bitColors.extractLayer(board, 3, width, height);
 * // layer3 is a 1-bit mask of all cells with color 3
 */
export class BitColors {
  /**
   * Initializes BitColors with a multi-color store implementation.
   *
   * @param {MultiColorStore} store - Store with multi-color cell access and singleBitStore property
   */
  constructor (store) {
    this.store = store
  }

  /**
   * Extracts a single-color layer from a multi-color bitboard.
   *
   * Returns a bitboard where set bits mark all cells containing the specified color.
   * Empty cells (value 0) are never included in the result, allowing clean separation
   * of color layers for independent processing.
   *
   * Algorithm: Iterates through all grid positions, comparing each cell's color value
   * against the target color. Set bits in the result mark matching cells.
   *
   * @param {bigint} bitboard - Multi-color bitboard to filter
   * @param {number|bigint} color - Target color value to extract (will be converted to BigInt)
   * @param {number} width - Grid width in cells (must be positive)
   * @param {number} height - Grid height in cells (must be positive)
   * @returns {bigint} Single-bit mask where set bits indicate target color presence
   *
   * @example
   * // Extract all cells containing color 3 from an 8x8 grid
   * const colorBoard = bitColors.extractLayer(multiColorBoard, 3, 8, 8);
   * // colorBoard now has bits set where grid cells contain color value 3
   *
   * @example
   * // Use extracted layer for morphological operations
   * const color2Layer = bitColors.extractLayer(board, 2, 16, 16);
   * const dilated = morphology.dilate(color2Layer);
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
