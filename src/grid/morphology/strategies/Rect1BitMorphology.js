/**
 * @fileoverview 1-bit (occupancy-only) morphological operations for rectangular grids.
 *
 * Specializes in morphological operations on single-bit grids where cells are either
 * occupied (1) or empty (0), with no per-cell color information. Uses fast bit shift
 * operations and edge masks to handle boundaries efficiently.
 *
 * Operations:
 * - Dilation: Expand occupied regions using separable horizontal/vertical shifts
 * - Erosion: Shrink occupied regions removing edge cells with clamping at boundaries
 * - Cross dilation: 4-connectivity expansion (cardinal directions only)
 *
 * @module grid/morphology/strategies/Rect1BitMorphology
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
 * Rect1BitMorphology - Fast morphological operations for 1-bit rectangular grids.
 *
 * Handles both BigInt and Uint32Array stores with optimized bit shift operations.
 * Uses separable approach (horizontal + vertical) for efficiency.
 * All operations use edge masks to enforce grid boundary constraints.
 *
 * Implements strategy pattern: provides morphological operations specialized for
 * single-bit (occupancy) grids. Delegates to store-specific helpers (BigStoreMorphology,
 * Store32Morphology) for low-level bit manipulation.
 *
 * @class Rect1BitMorphology
 * @see RectMultiBitMorphology for multi-bit specialization
 * @see BigStoreMorphology for BigInt helpers
 * @see Store32Morphology for Uint32Array helpers
 *
 * @example
 * const morphology = new Rect1BitMorphology(mask, store);
 * const dilated = morphology.dilate(2);
 * const eroded = morphology.erode(1);
 */
export class Rect1BitMorphology {
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
   * Cached edge masks for boundary-aware operations.
   * @type {EdgeMaskCollection|undefined}
   * @private
   */
  edgeMasks

  /**
   * Initializes a 1-bit morphology handler for rectangular grids.
   *
   * Caches references to mask, store, and grid dimensions for efficient
   * morphological operations. Validates that store is single-bit optimized.
   *
   * @param {Object} mask - Mask instance with bits, store, width, height properties
   * @param {Object} store - Storage backend (StoreBig or Store32)
   * @param {bigint|Uint32Array} bits - Current bitboard state
   * @param {number} width - Grid width in cells
   * @param {number} height - Grid height in cells
   * @throws {Error} If store is not configured for 1-bit operations
   *
   * @example
   * const morph = new Rect1BitMorphology(mask, store, bits, width, height);
   */
  constructor (mask, store, bits, width, height) {
    if (!store || store.isMultiBit) {
      throw new Error('Rect1BitMorphology: store must be 1-bit optimized')
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
   * Dilates (expands) occupied cells using separable operations.
   *
   * Morphological dilation for 1-bit grids: expands each occupied cell to its
   * neighbors. Uses separable approach: applies horizontal expansion followed by
   * vertical expansion. This is more efficient than 2D kernel convolution.
   *
   * Operation flow:
   * 1. Apply horizontal dilation (left/right expansion)
   * 2. Apply vertical dilation (up/down expansion)
   * 3. Return resulting bitboard
   *
   * @param {number} [radius=1] - Number of dilation steps (non-negative integer)
   * @returns {bigint|Uint32Array} Dilated bitboard
   * @side-effects None (non-mutating)
   * @example
   * // Expand region by 2 cells
   * const dilated = morph.dilate(2);
   *
   * // Single-step dilation
   * const expanded = morph.dilate(1);
   */
  dilate (radius = 1) {
    if (radius <= 0) return this.bits

    const masks = this._getEdgeMasks()
    let result = this.bits

    // Horizontal dilation steps
    for (let i = 0; i < radius; i++) {
      result = this._dilateHorizontal1Bit(result, masks)
    }

    // Vertical dilation steps
    for (let i = 0; i < radius; i++) {
      result = this._dilateVertical1Bit(result, masks)
    }

    return result
  }

  /**
   * Applies single horizontal dilation step for 1-bit grids.
   *
   * Expands cells left and right to neighbors using bit shifts with edge masking.
   * Prevents expansion beyond grid left/right boundaries via masks.
   *
   * Delegates to store-specific helper based on store type:
   * - BigStoreMorphology for BigInt stores
   * - Store32Morphology for Uint32Array stores
   *
   * @param {bigint|Uint32Array} bitboard - Input occupancy bitboard
   * @param {EdgeMaskCollection} masks - Edge masks for boundary constraint
   * @returns {bigint|Uint32Array} Horizontally dilated bitboard
   * @private
   */
  _dilateHorizontal1Bit (bitboard, masks) {
    if (this.store.dilateHorizontal1Bit) {
      return this.store.dilateHorizontal1Bit(bitboard, masks)
    }
    return bitboard
  }

  /**
   * Applies single vertical dilation step for 1-bit grids.
   *
   * Expands cells up and down to neighbors using bit shifts with edge masking.
   * Prevents expansion beyond grid top/bottom boundaries via masks.
   *
   * Delegates to store-specific helper based on store type.
   *
   * @param {bigint|Uint32Array} bitboard - Input occupancy bitboard
   * @param {EdgeMaskCollection} masks - Edge masks for boundary constraint
   * @returns {bigint|Uint32Array} Vertically dilated bitboard
   * @private
   */
  _dilateVertical1Bit (bitboard, masks) {
    if (this.store.dilateVertical1Bit) {
      return this.store.dilateVertical1Bit(bitboard, this.width, masks)
    }
    return bitboard
  }

  /**
   * Applies cross dilation (4-connectivity) for 1-bit grids.
   *
   * Expands cells in cardinal directions only (up, down, left, right).
   * Single expansion step, no radius parameter (use dilate() for multi-step).
   *
   * Delegates to store-specific helper for cross-step implementation.
   *
   * @returns {bigint|Uint32Array} Cross-dilated bitboard (4-connectivity)
   * @side-effects None (non-mutating)
   * @example
   * // Expand only in cardinal directions
   * const crossDilated = morph.dilateCross();
   */
  dilateCross () {
    const masks = this._getEdgeMasks()
    if (this.store.dilateCross1Bit) {
      return this.store.dilateCross1Bit(
        this.bits,
        this.width,
        this.height,
        masks
      )
    }
    return this.bits
  }

  /**
   * Erodes (shrinks) occupied cells by removing edge cells.
   *
   * Morphological erosion for 1-bit grids: removes boundary cells, shrinking
   * the occupied region inward. Cells survive only if all neighbors (within grid
   * bounds) are occupied.
   *
   * Uses separable approach with edge clamping: applies horizontal erosion followed
   * by vertical erosion. Edge clamping ensures erosion respects grid boundaries
   * (no wrap-around effects).
   *
   * Operation flow:
   * 1. Apply horizontal erosion (left/right neighbor requirement)
   * 2. Apply vertical erosion (up/down neighbor requirement)
   * 3. Return resulting bitboard
   *
   * @param {number} [radius=1] - Number of erosion steps (non-negative integer)
   * @returns {bigint|Uint32Array} Eroded bitboard
   * @side-effects None (non-mutating)
   * @example
   * // Shrink region by 2 cells
   * const eroded = morph.erode(2);
   *
   * // Single-step erosion
   * const shrunk = morph.erode(1);
   */
  erode (radius = 1) {
    if (radius <= 0) return this.bits

    const masks = this._getEdgeMasks()
    let result = this.bits

    // Horizontal erosion steps
    for (let i = 0; i < radius; i++) {
      result = this._erodeHorizontal1Bit(result, masks)
    }

    // Vertical erosion steps
    for (let i = 0; i < radius; i++) {
      result = this._erodeVertical1Bit(result, masks)
    }

    return result
  }

  /**
   * Applies single horizontal erosion step for 1-bit grids with boundary clamping.
   *
   * Removes cells without horizontal neighbors (left and right both occupied).
   * Cells at grid edges are removed (no neighbors beyond boundary).
   * Uses edge masks to enforce clamping behavior.
   *
   * Delegates to store-specific helper based on store type.
   *
   * @param {bigint|Uint32Array} bitboard - Input occupancy bitboard
   * @param {EdgeMaskCollection} masks - Edge masks for boundary clamping
   * @returns {bigint|Uint32Array} Horizontally eroded bitboard
   * @private
   */
  _erodeHorizontal1Bit (bitboard, masks) {
    if (this.store.erodeHorizontal1Bit) {
      return this.store.erodeHorizontal1Bit(bitboard, masks)
    }
    return bitboard
  }

  /**
   * Applies single vertical erosion step for 1-bit grids with boundary clamping.
   *
   * Removes cells without vertical neighbors (top and bottom both occupied).
   * Cells at grid edges are removed (no neighbors beyond boundary).
   * Uses edge masks to enforce clamping behavior.
   *
   * Delegates to store-specific helper based on store type.
   *
   * @param {bigint|Uint32Array} bitboard - Input occupancy bitboard
   * @param {EdgeMaskCollection} masks - Edge masks for boundary clamping
   * @returns {bigint|Uint32Array} Vertically eroded bitboard
   * @private
   */
  _erodeVertical1Bit (bitboard, masks) {
    if (this.store.erodeVertical1Bit) {
      return this.store.erodeVertical1Bit(bitboard, this.width, masks)
    }
    return bitboard
  }
}
