/**
 * @fileoverview 1-bit (occupancy-only) morphological operations for triangular grids.
 *
 * Specializes in morphological operations on single-bit triangular grids where cells are either
 * occupied (1) or empty (0), with no per-cell color information. Uses fast bit shift operations
 * and edge masks to handle boundaries efficiently with triangle-specific connectivity patterns.
 *
 * Triangle grids have variable connectivity depending on triangle orientation (3-12 neighbors).
 *
 * Operations:
 * - Dilation: Expand occupied regions using efficient shifts adapted for triangle topology
 * - Erosion: Shrink occupied regions removing edge cells with clamping at boundaries
 *
 * @module grid/morphology/strategies/Tri1BitMorphology
 * @requires src/grid/bitStore/helpers/BigStoreMorphology.js
 * @requires src/grid/bitStore/helpers/Store32Morphology.js
 */

/**
 * @typedef {Object} EdgeMaskCollection
 * @property {bigint|Uint32Array} [notTop] - Prevents expansion beyond top edge
 * @property {bigint|Uint32Array} [notBottom] - Prevents expansion beyond bottom edge
 * @property {bigint|Uint32Array} [notLeft] - Prevents expansion beyond left edge
 * @property {bigint|Uint32Array} [notRight] - Prevents expansion beyond right edge
 */

/**
 * Tri1BitMorphology - Fast morphological operations for 1-bit triangular grids.
 *
 * Handles both BigInt and Uint32Array stores with optimized bit shift operations.
 * Adapts rectangular shift-based morphology for triangular connectivity patterns.
 * Uses separable or non-separable approach depending on triangle orientation configuration.
 * All operations use edge masks to enforce grid boundary constraints.
 *
 * Implements strategy pattern: provides morphological operations specialized for
 * single-bit (occupancy) triangular grids. Delegates to store-specific helpers
 * (BigStoreMorphology, Store32Morphology) for low-level bit manipulation.
 *
 * @class Tri1BitMorphology
 * @see TriMultiBitMorphology for multi-bit specialization
 * @see BigStoreMorphology for BigInt helpers
 * @see Store32Morphology for Uint32Array helpers
 *
 * @example
 * const morphology = new Tri1BitMorphology(mask, store, bits, width, height);
 * const dilated = morphology.dilate(2);
 * const eroded = morphology.erode(1);
 */
export class Tri1BitMorphology {
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
   * Cached edge masks for boundary-aware operations.
   * @type {EdgeMaskCollection|undefined}
   * @private
   */
  edgeMasks

  /**
   * Initializes a 1-bit morphology handler for triangular grids.
   *
   * Caches references to mask, store, and grid dimensions for efficient
   * morphological operations. Validates that store is single-bit optimized.
   *
   * @param {Object} mask - Mask instance with bits, store, width, height properties
   * @param {Object} store - Storage backend (StoreBig or Store32)
   * @param {bigint|Uint32Array} bits - Current bitboard state
   * @param {number} width - Grid width in cells (triangular coordinate space)
   * @param {number} height - Grid height in cells (triangular coordinate space)
   * @throws {Error} If store is not configured for 1-bit operations
   *
   * @example
   * const morph = new Tri1BitMorphology(mask, store, bits, width, height);
   */
  constructor (mask, store, bits, width, height) {
    if (!store || store.isMultiBit) {
      throw new Error('Tri1BitMorphology: store must be 1-bit optimized')
    }
    this.mask = mask
    this.store = store
    this.bits = bits
    this.width = width
    this.height = height
    this.edgeMasks = undefined
  }

  /**
   * Gets or computes edge masks for boundary-aware operations.
   *
   * Lazy-loads edge masks on first access. Edge masks define which cells
   * can expand in each direction without wrapping around grid boundaries.
   *
   * @returns {EdgeMaskCollection} Edge masks object with notTop, notBottom, notLeft, notRight
   * @private
   */
  _getEdgeMasks () {
    if (!this.edgeMasks && this.store._createDefaultEdgeMasks) {
      this.edgeMasks = this.store._createDefaultEdgeMasks()
    }
    return this.edgeMasks
  }

  /**
   * Dilates (expands) occupied cells for triangular grids.
   *
   * Morphological dilation for 1-bit triangular grids: expands each occupied cell to its
   * triangle neighbors. Connectivity depends on triangle orientation and configuration.
   *
   * @param {number} [radius=1] - Number of dilation steps (non-negative integer)
   * @returns {bigint|Uint32Array} Dilated bitboard
   * @side-effects None (non-mutating)
   * @example
   * // Expand region by 2 cells
   * const expanded = morphology.dilate(2);
   */
  dilate (radius = 1) {
    if (radius <= 0) return this.bits

    let result = this.bits
    const edgeMasks = this._getEdgeMasks()

    // For triangular grids, dilation involves expanding to triangle-specific neighbors
    for (let i = 0; i < radius; i++) {
      if (this.store.dilateTriangle1Bit) {
        result = this.store.dilateTriangle1Bit(
          result,
          edgeMasks,
          this.width,
          this.height
        )
      }
    }

    return result
  }

  /**
   * Erodes (shrinks) occupied cells by removing cells that lack complete triangle neighborhoods.
   *
   * Morphological erosion for 1-bit triangular grids: removes cells that don't have
   * occupied neighbors in all expected triangle directions.
   *
   * @param {number} [radius=1] - Number of erosion steps (non-negative integer)
   * @returns {bigint|Uint32Array} Eroded bitboard
   * @side-effects None (non-mutating)
   * @example
   * // Shrink region by 1 layer
   * const shrunk = morphology.erode(1);
   */
  erode (radius = 1) {
    if (radius <= 0) return this.bits

    let result = this.bits
    const edgeMasks = this._getEdgeMasks()

    // Triangle erosion: cell survives if it has occupied neighbors
    for (let i = 0; i < radius; i++) {
      if (this.store.erodeTriangle1Bit) {
        result = this.store.erodeTriangle1Bit(
          result,
          edgeMasks,
          this.width,
          this.height
        )
      }
    }

    return result
  }
}
