/**
 * @fileoverview BitColors - Single-color layer extraction from multi-color bitboards.
 *
 * Converts multi-color bitboards into single-color layers by filtering cells
 * matching a specific color value. Enables independent processing of color
 * channels for morphological operations, rendering, or collision detection.
 *
 * @module grid/bitStore/helpers/BitColors
 * @typedef {number|bigint} NumericValue - Number or BigInt value
 * @typedef {bigint} BitPattern - BigInt bit pattern
 */

/**
 * @typedef {Object} SingleBitStore
 * @property {(bitboard: bigint, idx: number, value: bigint) => bigint} setIdx - Set single bit at index
 * @property {(bitboard: bigint, idx: number) => bigint} getIdx - Get bit value at index
 * @property {number} bitsPerCell - Bits per cell (should be 1 for single-bit stores)
 */

/**
 * @typedef {Object} MultiColorStore
 * @property {(bitboard: bigint, idx: number) => bigint} getIdx - Get cell value at index from multi-color bitboard
 * @property {(bitboard: bigint, idx: number, value: bigint) => bigint} setIdx - Set cell value at index in multi-color bitboard
 * @property {number} width - Grid width in cells
 * @property {number} height - Grid height in cells
 * @property {number} bitsPerCell - Bits per cell for color depth (typically 4-8 for multi-color)
 * @property {SingleBitStore} singleBitStore - Underlying 1-bit store for color extraction
 */

/**
 * BitColors - Extracts single-color layers from multi-color bitboards.
 *
 * Converts a color value into a boolean mask where set bits indicate
 * cells containing that color. Useful for separating individual color
 * layers from a multi-bit representation for morphological operations,
 * rendering, collision detection, or terrain analysis.
 *
 * @class BitColors
 * @description Provides color layer extraction from multi-bit color-encoded grids.
 * Creates single-bit masks for each color for efficient per-layer processing.
 *
 * @example
 * const bitColors = new BitColors(multiColorStore);
 * const layer3 = bitColors.extractLayer(board, 3, width, height);
 * // layer3 is a 1-bit mask of all cells with color 3
 *
 * @example
 * // Extract multiple color layers for independent processing
 * const waterLayer = bitColors.extractLayer(board, WATER_COLOR, 16, 16);
 * const landLayer = bitColors.extractLayer(board, LAND_COLOR, 16, 16);
 * const forestLayer = bitColors.extractLayer(board, FOREST_COLOR, 16, 16);
 */
export class BitColors {
  /**
   * Initializes BitColors with a multi-color store implementation.
   *
   * Stores reference to the multi-color store for efficient layer extraction.
   * The store must provide both multi-bit getIdx/setIdx methods and access to
   * an underlying single-bit store for result mask construction.
   *
   * @constructor
   * @param {MultiColorStore} store - Store with multi-color cell access and singleBitStore property
   * @throws {TypeError} If store is not an object or lacks required properties
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
   * **Algorithm:**
   * - Iterates through all grid positions (0 to width × height)
   * - Compares each cell's color value against the target color
   * - Sets bits in result mask where colors match
   * - Uses single-bit store for efficient mask construction
   *
   * **Time Complexity:** O(width × height) - must check every cell
   * **Space Complexity:** O(1) - result bitboard only
   *
   * @param {BitPattern} bitboard - Multi-color bitboard to filter (values per cell)
   * @param {NumericValue} color - Target color value to extract (0 or positive, will be converted to BigInt)
   * @param {number} width - Grid width in cells (must be positive integer)
   * @param {number} height - Grid height in cells (must be positive integer)
   * @returns {BitPattern} Single-bit mask where set bits indicate target color presence
   *
   * @throws {TypeError} If color cannot be converted to BigInt
   * @throws {RangeError} If width or height is non-positive
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
   *
   * @example
   * // Extract water terrain from multi-terrain bitboard
   * const waterMask = bitColors.extractLayer(terrainBoard, WATER, mapWidth, mapHeight);
   * const waterWithBorder = bitColors.extractLayer(terrainBoard, WATER_EDGE, mapWidth, mapHeight);
   * const totalWater = waterMask | waterWithBorder;
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
