/**
 * @fileoverview Multi-bit (colored cell) morphological operations for hexagonal grids.
 *
 * Specializes in morphological operations on multi-bit hexagonal grids where each cell can
 * have a color value (depth > 1). Uses per-cell iteration rather than bit shifts, as bit
 * shifts don't preserve color information across hex boundaries. Adapts rectangular
 * per-cell propagation for hexagonal 6-connectivity patterns.
 *
 * Operations:
 * - Dilation: Propagate colors into neighboring hex cells
 * - Erosion: Keep colors only if neighbors exist in all 6 hex directions
 * - Respects grid boundaries without needing edge masks
 *
 * @module grid/morphology/strategies/HexMultiBitMorphology
 * @requires src/grid/bitStore/helpers/BigStoreMorphology.js
 * @requires src/grid/bitStore/helpers/Store32Morphology.js
 */

/**
 * HexMultiBitMorphology - Optimized morphology for multi-bit (colored) hexagonal grids.
 *
 * Specializes dilation and erosion for multi-bit hexagonal grids where each cell can
 * have a color value (depth > 1). Uses per-cell iteration adapted to hex 6-connectivity
 * rather than bit shifts, as bit shifts don't preserve color information across boundaries.
 *
 * Multi-color hex approach:
 * - Dilation: Propagate colors into neighboring hex cells using hex neighbor connectivity
 * - Erosion: Keep colors only if neighbors exist in all 6 hex directions
 * - Respects grid boundaries without needing edge masks (per-cell iteration handles this)
 *
 * @class HexMultiBitMorphology
 * @see Hex1BitMorphology for 1-bit specialization
 * @see BigStoreMorphology for per-cell operation helpers
 * @see Store32Morphology for per-cell operation helpers
 *
 * @example
 * const morphology = new HexMultiBitMorphology(mask, store);
 * const dilated = morphology.dilate(2);
 * const eroded = morphology.erode(1);
 */
export class HexMultiBitMorphology {
  /**
   * Reference to the mask being operated on.
   * @type {Object}
   * @private
   */
  mask

  /**
   * Reference to the bitboard store (StoreBig or Store32).
   * @type {Object}
   * @private
   */
  store

  /**
   * Current bitboard bits.
   * @type {bigint|Uint32Array}
   * @private
   */
  bits

  /**
   * Grid width in cells.
   * @type {number}
   * @private
   */
  width

  /**
   * Grid height in cells.
   * @type {number}
   * @private
   */
  height

  /**
   * Hex indexer for neighbor calculations.
   * @type {Object}
   * @private
   */
  indexer

  /**
   * Initialize multi-bit morphology handler for hexagonal grids.
   *
   * Caches references to mask, store, grid dimensions, and hex indexer for
   * efficient morphological operations. Validates that store is multi-bit.
   *
   * @param {Object} mask - Mask instance with bits, store, width, height, indexer properties
   * @param {Object} store - Storage backend (StoreBig or Store32)
   * @param {bigint|Uint32Array} bits - Current bitboard state
   * @param {number} width - Grid width in cells (hex coordinate space)
   * @param {number} height - Grid height in cells (hex coordinate space)
   * @param {Object} indexer - Hex indexer for neighbor connectivity
   * @throws {Error} If store is not configured for multi-bit operations
   *
   * @example
   * const morph = new HexMultiBitMorphology(mask, store, bits, width, height, indexer);
   */
  constructor (mask, store, bits, width, height, indexer) {
    if (!store || !store.isMultiBit) {
      throw new Error('HexMultiBitMorphology: store must be multi-bit')
    }
    this.mask = mask
    this.store = store
    this.bits = bits
    this.width = width
    this.height = height
    this.indexer = indexer
  }

  /**
   * Dilate colored hex grid by propagating colors into hex neighbors.
   *
   * Each occupied cell spreads its color to all 6 hex neighbors.
   * Respects grid boundaries through per-cell iteration (no wrap-around).
   *
   * @param {number} [radius=1] - Number of dilation steps (non-negative integer)
   * @returns {bigint|Uint32Array} Dilated colored bits
   * @side-effects None (non-mutating)
   * @example
   * // Expand by 2 hex layers
   * const expanded = morphology.dilate(2);
   */
  dilate (radius = 1) {
    if (radius <= 0) return this.bits

    let result = this.bits

    for (let step = 0; step < radius; step++) {
      // Use hex indexer to identify neighbors if available
      if (this.store.expandHexNeighborsCellwise) {
        result = this.store.expandHexNeighborsCellwise(
          result,
          this.indexer,
          this.width,
          this.height
        )
      }
    }

    return result
  }

  /**
   * Erode colored hex grid by removing cells without complete hex neighborhoods.
   *
   * Cells survive only if they have occupied neighbors in all 6 hex directions.
   * Respects grid boundaries naturally through per-cell iteration.
   *
   * @param {number} [radius=1] - Number of erosion steps (non-negative integer)
   * @returns {bigint|Uint32Array} Eroded colored bits
   * @side-effects None (non-mutating)
   * @example
   * // Shrink by 1 hex layer
   * const shrunk = morphology.erode(1);
   */
  erode (radius = 1) {
    if (radius <= 0) return this.bits

    let result = this.bits

    for (let step = 0; step < radius; step++) {
      // Erode using hex neighbor constraints
      if (this.store.erodeHexNeighborsCellwise) {
        result = this.store.erodeHexNeighborsCellwise(
          result,
          this.indexer,
          this.width,
          this.height
        )
      }
    }

    return result
  }
}
