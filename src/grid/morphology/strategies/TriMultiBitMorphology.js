/**
 * @fileoverview Multi-bit (colored cell) morphological operations for triangular grids.
 *
 * Specializes in morphological operations on multi-bit triangular grids where each cell can
 * have a color value (depth > 1). Uses per-cell iteration rather than bit shifts, as bit
 * shifts don't preserve color information. Adapts rectangular per-cell propagation for
 * triangle connectivity patterns.
 *
 * Operations:
 * - Dilation: Propagate colors into neighboring triangle cells
 * - Erosion: Keep colors only if neighbors exist in triangle pattern
 * - Respects grid boundaries without needing edge masks
 *
 * @module grid/morphology/strategies/TriMultiBitMorphology
 * @requires src/grid/bitStore/helpers/BigStoreMorphology.js
 * @requires src/grid/bitStore/helpers/Store32Morphology.js
 */

/**
 * TriMultiBitMorphology - Optimized morphology for multi-bit (colored) triangular grids.
 *
 * Specializes dilation and erosion for multi-bit triangular grids where each cell can
 * have a color value (depth > 1). Uses per-cell iteration adapted to triangle connectivity
 * rather than bit shifts, as bit shifts don't preserve color information.
 *
 * Multi-color triangle approach:
 * - Dilation: Propagate colors into neighboring triangle cells using triangle connectivity
 * - Erosion: Keep colors only if neighbors exist in expected triangle pattern
 * - Respects grid boundaries without needing edge masks (per-cell iteration handles this)
 *
 * @class TriMultiBitMorphology
 * @see Tri1BitMorphology for 1-bit specialization
 * @see BigStoreMorphology for per-cell operation helpers
 * @see Store32Morphology for per-cell operation helpers
 *
 * @example
 * const morphology = new TriMultiBitMorphology(mask, store);
 * const dilated = morphology.dilate(2);
 * const eroded = morphology.erode(1);
 */
export class TriMultiBitMorphology {
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
   * Grid width in cells (measured in triangular coordinate space).
   * @type {number}
   * @private
   */
  width

  /**
   * Grid height in cells (measured in triangular coordinate space).
   * @type {number}
   * @private
   */
  height

  /**
   * Triangle indexer for neighbor calculations.
   * @type {Object}
   * @private
   */
  indexer

  /**
   * Initialize multi-bit morphology handler for triangular grids.
   *
   * Caches references to mask, store, grid dimensions, and triangle indexer for
   * efficient morphological operations. Validates that store is multi-bit.
   *
   * @param {Object} mask - Mask instance with bits, store, width, height, indexer properties
   * @param {Object} store - Storage backend (StoreBig or Store32)
   * @param {bigint|Uint32Array} bits - Current bitboard state
   * @param {number} width - Grid width in cells (triangular coordinate space)
   * @param {number} height - Grid height in cells (triangular coordinate space)
   * @param {Object} indexer - Triangle indexer for neighbor connectivity
   * @throws {Error} If store is not configured for multi-bit operations
   *
   * @example
   * const morph = new TriMultiBitMorphology(mask, store, bits, width, height, indexer);
   */
  constructor (mask, store, bits, width, height, indexer) {
    if (!store?.isMultiBit) {
      throw new Error('TriMultiBitMorphology: store must be multi-bit')
    }
    this.mask = mask
    this.store = store
    this.bits = bits
    this.width = width
    this.height = height
    this.indexer = indexer
  }

  /**
   * Dilate colored triangle grid by propagating colors into triangle neighbors.
   *
   * Each occupied cell spreads its color to all neighboring triangle cells.
   * Respects grid boundaries through per-cell iteration (no wrap-around).
   *
   * @param {number} [radius=1] - Number of dilation steps (non-negative integer)
   * @returns {bigint|Uint32Array} Dilated colored bits
   * @side-effects None (non-mutating)
   * @example
   * // Expand by 2 triangle layers
   * const expanded = morphology.dilate(2);
   */
  dilate (radius = 1) {
    if (radius <= 0) return this.bits

    let result = this.bits

    for (let step = 0; step < radius; step++) {
      // Use triangle indexer to identify neighbors if available
      if (this.store.expandTriangleNeighborsCellwise) {
        result = this.store.expandTriangleNeighborsCellwise(
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
   * Erode colored triangle grid by removing cells without complete neighborhood.
   *
   * Cells survive only if they have occupied neighbors in triangle pattern.
   * Respects grid boundaries naturally through per-cell iteration.
   *
   * @param {number} [radius=1] - Number of erosion steps (non-negative integer)
   * @returns {bigint|Uint32Array} Eroded colored bits
   * @side-effects None (non-mutating)
   * @example
   * // Shrink by 1 triangle layer
   * const shrunk = morphology.erode(1);
   */
  erode (radius = 1) {
    if (radius <= 0) return this.bits

    let result = this.bits

    for (let step = 0; step < radius; step++) {
      // Erode using triangle neighbor constraints
      if (this.store.erodeTriangleNeighborsCellwise) {
        result = this.store.erodeTriangleNeighborsCellwise(
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
