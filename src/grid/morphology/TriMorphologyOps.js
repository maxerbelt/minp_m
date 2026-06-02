import { Tri1BitMorphology } from './strategies/Tri1BitMorphology.js'
import { TriMultiBitMorphology } from './strategies/TriMultiBitMorphology.js'

/**
 * @fileoverview TriMorphologyOps - Orchestration layer for triangular grid morphology.
 *
 * High-level morphological operations for triangular grids. Acts as a facade that
 * coordinates morphology operations across different storage types (1-bit vs multi-bit)
 * using a strategy pattern.
 *
 * Delegates to specialized strategy classes:
 * - Tri1BitMorphology: Fast bit shift operations for occupancy grids
 * - TriMultiBitMorphology: Per-cell color propagation for colored grids
 *
 * This class handles:
 * - Strategy selection based on store type
 * - Mutating/non-mutating variant coordination
 * - Edge case handling (radius validation, empty grids)
 *
 * Triangular grids have variable connectivity based on triangle orientation.
 *
 * @module grid/morphology/TriMorphologyOps
 * @requires src/grid/morphology/strategies/Tri1BitMorphology.js
 * @requires src/grid/morphology/strategies/TriMultiBitMorphology.js
 */

/**
 * TriMorphologyOps - Morphological operations orchestration for triangular grids.
 *
 * High-level facade for morphological operations that delegates to specialized
 * strategy classes based on store type:
 * - Tri1BitMorphology: For 1-bit (occupancy) stores using fast bit shifts
 * - TriMultiBitMorphology: For multi-bit (colored) stores using per-cell operations
 *
 * Supported operations:
 * - **Dilation**: Expand occupied regions into all triangle neighbors
 * - **Erosion**: Shrink occupied regions by removing edge cells with neighbor constraints
 *
 * All operations provide both mutating (returns mask for chaining) and non-mutating
 * (returns modified bits) variants for flexible integration.
 *
 * @class TriMorphologyOps
 * @see Tri1BitMorphology for 1-bit strategy implementation
 * @see TriMultiBitMorphology for multi-bit strategy implementation
 * @see BigStoreMorphology for BigInt helper operations
 * @see Store32Morphology for Uint32Array helper operations
 *
 * @example
 * const morph = new TriMorphologyOps(mask);
 * // Mutating: dilate and return mask for chaining
 * morph.dilate(2).erode(1);
 *
 * // Non-mutating: get modified bits without affecting mask
 * const expandedBits = morph.dilateBits(2);
 */
export class TriMorphologyOps {
  /**
   * Reference to the mask being operated on.
   * @type {Object}
   * @private
   */
  mask

  /**
   * Reference to the bitboard store.
   * @type {Object}
   * @private
   */
  store

  /**
   * Current bitboard state.
   * @type {bigint|Uint32Array}
   * @private
   */
  bits

  /**
   * Grid width in cells (triangular coordinate space).
   * @type {number}
   * @private
   */
  width

  /**
   * Grid height in cells (triangular coordinate space).
   * @type {number}
   * @private
   */
  height

  /**
   * Grid indexer for triangle-specific coordinate operations.
   * @type {Object}
   * @private
   */
  indexer

  /**
   * Cached strategy instance for lazy initialization.
   * @type {Tri1BitMorphology|TriMultiBitMorphology|undefined}
   * @private
   */
  _strategy

  /**
   * Creates a morphology operation handler for triangular grids.
   *
   * Initializes the facade with references to mask, storage, bits, and indexer.
   *
   * @param {Object} mask - Triangular mask instance
   * @throws {Error} If mask lacks required properties
   */
  constructor (mask) {
    this.mask = mask
    this.store = mask.store
    this.bits = mask.bits
    this.width = mask.width
    this.height = mask.height
    this.indexer = mask.indexer
    this._strategy = undefined
  }

  /**
   * Gets or initializes the appropriate morphology strategy based on store type.
   *
   * Lazy-initializes strategy on first use. Selects between 1-bit and multi-bit
   * implementations based on the store's isMultiBit property.
   *
   * @returns {Tri1BitMorphology|TriMultiBitMorphology} Initialized strategy instance
   * @private
   */
  _getStrategy () {
    if (this._strategy) {
      return this._strategy
    }

    if (this.store.isMultiBit) {
      this._strategy = new TriMultiBitMorphology(
        this.mask,
        this.store,
        this.bits,
        this.width,
        this.height,
        this.indexer
      )
    } else {
      this._strategy = new Tri1BitMorphology(
        this.mask,
        this.store,
        this.bits,
        this.width,
        this.height
      )
    }

    return this._strategy
  }

  // ============================================================================
  // DILATION OPERATIONS
  // ============================================================================

  /**
   * Dilate triangular grid by expanding occupied cells into triangle neighbors (mutating).
   *
   * Expands the occupied region into all neighbors of each cell. Updates mask.bits
   * in-place and returns mask for method chaining.
   *
   * @param {number} [radius=1] - Number of dilation expansion steps (must be >= 0)
   * @returns {Object} this.mask for method chaining
   */
  dilate (radius = 1) {
    this.mask.bits = this.dilateBits(radius)
    return this.mask
  }

  /**
   * Perform triangle dilation and return bits without mutation.
   *
   * Expands occupied cells into all triangle neighbors for each step. Returns new bits
   * without modifying this.bits, enabling non-mutating operation patterns.
   *
   * @param {number} [radius=1] - Number of expansion steps (non-negative integer)
   * @returns {bigint|Uint32Array} Dilated bits (same type as input)
   */
  dilateBits (radius = 1) {
    if (radius <= 0) return this.bits
    const strategy = this._getStrategy()
    return strategy.dilate(radius)
  }

  // ============================================================================
  // EROSION OPERATIONS
  // ============================================================================

  /**
   * Erode triangular grid by removing cells that lack complete neighborhood (mutating).
   *
   * Shrinks the occupied region to keep only cells with expected neighbors.
   * Updates mask.bits in-place and returns mask for method chaining.
   *
   * @param {number} [radius=1] - Number of erosion removal steps (must be >= 0)
   * @returns {Object} this.mask for method chaining
   */
  erode (radius = 1) {
    this.mask.bits = this.erodeBits(radius)
    return this.mask
  }

  /**
   * Perform triangle erosion and return bits without mutation.
   *
   * Shrinks occupied region to keep only cells with expected triangle neighbors.
   * Returns new bits without modifying this.bits, enabling non-mutating patterns.
   *
   * @param {number} [radius=1] - Number of shrink steps (non-negative integer)
   * @returns {bigint|Uint32Array} Eroded bits (same type as input)
   */
  erodeBits (radius = 1) {
    if (radius <= 0) return this.bits
    const strategy = this._getStrategy()
    return strategy.erode(radius)
  }
}
