/**
 * @fileoverview Multi-bit (colored cell) morphological operations for rectangular grids.
 *
 * Specializes in morphological operations on multi-bit grids where each cell contains
 * color/value information (multiple bits per cell). Uses per-cell iteration and color
 * propagation rather than bit shifts, as color values must be preserved during operations.
 *
 * Operations:
 * - Dilation: Propagate cell colors to neighbors maintaining color information
 * - Erosion: Remove colors from cells without full neighbor sets maintaining color information
 *
 * Does not use edge masks; per-cell iteration naturally respects grid boundaries.
 *
 * @module grid/morphology/strategies/RectMultiBitMorphology
 * @requires src/grid/bitStore/helpers/BigStoreMorphology.js
 * @requires src/grid/bitStore/helpers/Store32Morphology.js
 */

/**
 * RectMultiBitMorphology - Morphological operations for multi-bit rectangular grids.
 *
 * Handles both BigInt and Uint32Array stores with per-cell color propagation.
 * Color information is preserved during dilation and erosion operations.
 *
 * Implements strategy pattern: provides morphological operations specialized for
 * multi-bit (colored) grids. Delegates to store-specific helpers (BigStoreMorphology,
 * Store32Morphology) for low-level per-cell operations.
 *
 * Key differences from 1-bit:
 * - No edge masks needed (per-cell iteration naturally enforces boundaries)
 * - Color values propagated to neighbors during operations
 * - Slower than 1-bit but necessary for colored grids
 *
 * @class RectMultiBitMorphology
 * @see Rect1BitMorphology for 1-bit specialization
 * @see BigStoreMorphology for BigInt helpers
 * @see Store32Morphology for Uint32Array helpers
 *
 * @example
 * const morphology = new RectMultiBitMorphology(mask, store);
 * const dilated = morphology.dilate(2);
 * const eroded = morphology.erode(1);
 */
export class RectMultiBitMorphology {
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
   * Current bitboard bits with color information.
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
   * Initializes a multi-bit morphology handler for rectangular grids.
   *
   * Caches references to mask, store, and grid dimensions for efficient
   * morphological operations. Validates that store supports multi-bit operations.
   *
   * @param {Object} mask - Mask instance with bits, store, width, height properties
   * @param {Object} store - Storage backend (StoreBig or Store32) with multi-bit support
   * @param {bigint|Uint32Array} bits - Current bitboard state with color information
   * @param {number} width - Grid width in cells
   * @param {number} height - Grid height in cells
   * @throws {Error} If store does not support multi-bit operations
   *
   * @example
   * const morph = new RectMultiBitMorphology(mask, store, bits, width, height);
   */
  constructor (mask, store, bits, width, height) {
    if (!store || !store.isMultiBit) {
      throw new Error(
        'RectMultiBitMorphology: store must support multi-bit operations'
      )
    }
    this.mask = mask
    this.store = store
    this.bits = bits
    this.width = width
    this.height = height
  }

  /**
   * Dilates (expands) colored cells by propagating colors to neighbors.
   *
   * Morphological dilation for multi-bit grids: propagates each cell's color
   * to its neighbors. Uses separable approach: horizontal propagation followed
   * by vertical propagation.
   *
   * Color information is preserved; only cells with colors expand to neighbors.
   * Empty cells remain empty unless populated by expanding neighbors.
   *
   * Operation flow:
   * 1. Horizontal dilation: propagate colors left/right
   * 2. Vertical dilation: propagate colors up/down
   * 3. Return resulting bitboard with preserved colors
   *
   * @param {number} [radius=1] - Number of dilation steps (non-negative integer)
   * @returns {bigint|Uint32Array} Dilated bitboard with color information
   * @side-effects None (non-mutating)
   * @example
   * // Expand colored regions by 2 cells
   * const dilated = morph.dilate(2);
   *
   * // Single-step color propagation
   * const expanded = morph.dilate(1);
   */
  dilate (radius = 1) {
    if (radius <= 0) return this.bits

    let result = this.bits

    // Horizontal dilation steps
    for (let i = 0; i < radius; i++) {
      result = this._dilateHorizontalMultiBit(result)
    }

    // Vertical dilation steps
    for (let i = 0; i < radius; i++) {
      result = this._dilateVerticalMultiBit(result)
    }

    return result
  }

  /**
   * Applies single horizontal dilation step for multi-bit grids.
   *
   * Propagates each cell's color to its left and right neighbors.
   * Empty cells (no color) are not propagated.
   *
   * Delegates to store-specific helper based on store type:
   * - BigStoreMorphology for BigInt stores
   * - Store32Morphology for Uint32Array stores
   *
   * @param {bigint|Uint32Array} bitboard - Input colored bitboard
   * @returns {bigint|Uint32Array} Horizontally dilated bitboard
   * @private
   */
  _dilateHorizontalMultiBit (bitboard) {
    if (this.store.expandHorizontallyMultiBit) {
      return this.store.expandHorizontallyMultiBit(bitboard)
    }
    return bitboard
  }

  /**
   * Applies single vertical dilation step for multi-bit grids.
   *
   * Propagates each cell's color to its top and bottom neighbors.
   * Empty cells (no color) are not propagated.
   *
   * Delegates to store-specific helper based on store type.
   *
   * @param {bigint|Uint32Array} bitboard - Input colored bitboard
   * @returns {bigint|Uint32Array} Vertically dilated bitboard
   * @private
   */
  _dilateVerticalMultiBit (bitboard) {
    if (this.store.expandVerticallyMultiBit) {
      return this.store.expandVerticallyMultiBit(bitboard, this.width)
    }
    return bitboard
  }

  /**
   * Erodes (shrinks) colored cells by removing edge cells.
   *
   * Morphological erosion for multi-bit grids: removes colors from cells
   * without complete neighbor sets in all cardinal directions. Uses separable
   * approach: horizontal erosion followed by vertical erosion.
   *
   * Color information is preserved in surviving cells; eroded cells become empty.
   * A cell survives erosion only if all four cardinal neighbors are occupied.
   *
   * Operation flow:
   * 1. Horizontal erosion: keep colors only if left AND right neighbors occupied
   * 2. Vertical erosion: keep colors only if top AND bottom neighbors occupied
   * 3. Return resulting bitboard with surviving colors
   *
   * @param {number} [radius=1] - Number of erosion steps (non-negative integer)
   * @returns {bigint|Uint32Array} Eroded bitboard with color information
   * @side-effects None (non-mutating)
   * @example
   * // Shrink colored regions by 2 cells
   * const eroded = morph.erode(2);
   *
   * // Single-step erosion
   * const shrunk = morph.erode(1);
   */
  erode (radius = 1) {
    if (radius <= 0) return this.bits

    let result = this.bits

    // Horizontal erosion steps
    for (let i = 0; i < radius; i++) {
      result = this._erodeHorizontalMultiBit(result)
    }

    // Vertical erosion steps
    for (let i = 0; i < radius; i++) {
      result = this._erodeVerticalMultiBit(result)
    }

    return result
  }

  /**
   * Applies single horizontal erosion step for multi-bit grids.
   *
   * Removes colors from cells without both left and right neighbors occupied.
   * Cells at grid edges are removed (no neighbors beyond boundary).
   *
   * Delegates to store-specific helper based on store type.
   *
   * @param {bigint|Uint32Array} bitboard - Input colored bitboard
   * @returns {bigint|Uint32Array} Horizontally eroded bitboard
   * @private
   */
  _erodeHorizontalMultiBit (bitboard) {
    if (this.store.erodeHorizontalMultiBit) {
      return this.store.erodeHorizontalMultiBit(bitboard)
    }
    return bitboard
  }

  /**
   * Applies single vertical erosion step for multi-bit grids.
   *
   * Removes colors from cells without both top and bottom neighbors occupied.
   * Cells at grid edges are removed (no neighbors beyond boundary).
   *
   * Delegates to store-specific helper based on store type.
   *
   * @param {bigint|Uint32Array} bitboard - Input colored bitboard
   * @returns {bigint|Uint32Array} Vertically eroded bitboard
   * @private
   */
  _erodeVerticalMultiBit (bitboard) {
    if (this.store.erodeVerticalMultiBit) {
      return this.store.erodeVerticalMultiBit(bitboard, this.width)
    }
    return bitboard
  }
}
