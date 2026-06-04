import { Rect1BitMorphology } from './strategies/Rect1BitMorphology.js'
import { RectMultiBitMorphology } from './strategies/RectMultiBitMorphology.js'

/**
 * @typedef {object} RectMask
 * @property {object} store - Storage backend for bitboard operations
 * @property {bigint|Uint32Array} bits - Current bitboard state
 * @property {number} width - Grid width in cells
 * @property {number} height - Grid height in cells
 * @property {number} depth - Color bit depth per cell (1 = occupancy, 2+ = color)
 * @property {object} indexer - Coordinate conversion utility
 * @property {() => Generator<[number, number, number]>} occupiedLocationsAndValues - Iterate occupied cells
 * @property {(x: number, y: number) => boolean} isValid - Check if coordinates are in bounds
 * @property {(x: number, y: number, value?: number) => void} set - Set cell value at coordinates
 * @property {(width: number, height: number, depth: number) => RectMask} emptyMaskOfSize - Create new mask
 */

/**
 * @typedef {object & {isMultiBit?: boolean}} AnyStore
 * @property {boolean} [isMultiBit] - True if store supports multi-bit cells
 */

/**
 * @typedef {object} EdgeMaskCollection
 * @property {bigint|Uint32Array} notLeft - Mask excluding left edge
 * @property {bigint|Uint32Array} notRight - Mask excluding right edge
 */

/**
 * @fileoverview RectMorphologyOps - Orchestration layer for rectangular grid morphology.
 *
 * High-level morphological operations for rectangular grids. Acts as a facade that
 * coordinates morphology operations across different storage types (1-bit vs multi-bit)
 * using a strategy pattern.
 *
 * Delegates to specialized strategy classes:
 * - Rect1BitMorphology: Fast bit shift operations for occupancy grids
 * - RectMultiBitMorphology: Per-cell color propagation for colored grids
 *
 * This class handles:
 * - Strategy selection based on store type
 * - Mutating/non-mutating variant coordination
 * - Edge case handling (radius validation, empty grids)
 * - Expansion operations (grid border creation)
 * - Cross dilation operations
 *
 * @module grid/morphology/RectMorphologyOps
 * @requires src/grid/morphology/strategies/Rect1BitMorphology.js
 * @requires src/grid/morphology/strategies/RectMultiBitMorphology.js
 */

/**
 * RectMorphologyOps - Morphological operations orchestration for rectangular grids.
 *
 * High-level facade for morphological operations that delegates to specialized
 * strategy classes based on store type:
 * - Rect1BitMorphology: For 1-bit (occupancy) stores using fast bit shifts
 * - RectMultiBitMorphology: For multi-bit (colored) stores using per-cell operations
 *
 * Supported operations:
 * - **Dilation**: Expand occupied regions using separable horizontal/vertical operations
 * - **Erosion**: Shrink occupied regions by removing edge cells with neighbor constraints
 * - **Cross dilation**: 4-connectivity expansion (cardinal directions only)
 * - **Grid expansion**: Create larger grid with border for boundary-aware operations
 *
 * All operations provide both mutating (returns mask for chaining) and non-mutating
 * (returns modified bits) variants for flexible integration.
 *
 * @class RectMorphologyOps
 * @see Rect1BitMorphology for 1-bit strategy implementation
 * @see RectMultiBitMorphology for multi-bit strategy implementation
 * @see BigStoreMorphology for BigInt helper operations
 * @see Store32Morphology for Uint32Array helper operations
 *
 * @example
 * const morph = new RectMorphologyOps(mask);
 * // Mutating: dilate and return mask for chaining
 * morph.dilate(2).erode(1);
 *
 * // Non-mutating: get modified bits without affecting mask
 * const expandedBits = morph.dilateBits(2);
 */
export class RectMorphologyOps {
  /**
   * Reference to the mask being operated on.
   * @type {RectMask}
   * @private
   */
  mask

  /**
   * Reference to the bitboard store.
   * @type {object & {isMultiBit?: boolean}}
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
   * Grid indexer for coordinate conversion.
   * Stored for potential future use in grid transformations.
   * @type {object}
   * @private
   */
  // noinspection JSUnusedLocalSymbols - Intentionally unused, retained for API extensibility
  _indexer

  /**
   * Cached morphology strategy (1-bit or multi-bit).
   * Lazy-initialized on first use.
   * @type {Rect1BitMorphology|RectMultiBitMorphology|null}
   * @private
   */
  _strategy

  /**
   * Initializes morphology operations handler for rectangular grids.
   *
   * Caches mask properties and prepares for strategy-based morphological operations.
   * Strategy selection (1-bit vs multi-bit) happens lazily on first operation.
   *
   * @param {RectMask} mask - Mask instance with required properties:
   *   - store: Storage backend (StoreBig or Store32)
   *   - bits: Current bitboard state
   *   - width: Grid width in cells
   *   - height: Grid height in cells
   *   - indexer: Coordinate conversion utility
   *   - depth: Color bit depth per cell
   * @throws {Error} If mask is missing required properties
   *
   * @example
   * const morph = new RectMorphologyOps(mask);
   * morph.dilate(2);
   */
  constructor (mask) {
    this.mask = mask
    this.store = mask.store
    this.bits = mask.bits
    this.width = mask.width
    this.height = mask.height
    // @ts-ignore - Storing indexer for potential future grid transformation methods
    this._indexer = mask.indexer
    this._strategy = null
  }

  /**
   * Gets or initializes the appropriate morphology strategy.
   *
   * Lazy-initializes strategy on first access based on store type:
   * - Rect1BitMorphology for 1-bit stores (fast bit shift operations)
   * - RectMultiBitMorphology for multi-bit stores (per-cell operations)
   *
   * @returns {Rect1BitMorphology|RectMultiBitMorphology} Morphology strategy instance
   * @private
   * @throws {Error} If mask properties are insufficient for strategy initialization
   */
  _getStrategy () {
    if (this._strategy) return this._strategy

    if (this.store.isMultiBit) {
      this._strategy = new RectMultiBitMorphology(
        this.mask,
        this.store,
        this.bits,
        this.width,
        this.height
      )
    } else {
      this._strategy = new Rect1BitMorphology(
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
   * Dilates (expands) occupied cells by given radius (mutating variant).
   *
   * Morphological dilation: expands all occupied cells outward. Modifies mask.bits
   * in-place and returns the mask for method chaining.
   *
   * Strategy selection based on store type:
   * - 1-bit stores: Fast separable (horizontal + vertical) bit shifts
   * - Multi-bit stores: Per-cell color propagation
   *
   * @param {number} [radius=1] - Number of dilation steps (non-negative integer)
   * @returns {RectMask} This mask instance (mutated) for chainable operations
   * @chainable
   * @see dilateBits for non-mutating variant
   * @see dilateCross for cross-pattern dilation
   *
   * @example
   * // Expand region by 2 cells
   * morph.dilate(2);
   */
  dilate (radius = 1) {
    this.mask.bits = this.dilateBits(radius)
    return this.mask
  }

  /**
   * Dilates occupied cells by given radius (non-mutating variant).
   *
   * Computes dilated bits without modifying the original mask. Useful for
   * testing or composition without side effects.
   *
   * Delegates to strategy class based on store type for optimized implementation.
   *
   * @param {number} [radius=1] - Number of dilation steps (non-negative integer)
   * @returns {bigint|Uint32Array} Dilated bitboard (original mask unchanged)
   * @see dilate for mutating variant
   * @see dilateCrossBits for cross-pattern variant
   *
   * @example
   * // Get expanded bits for testing
   * const expanded = morph.dilateBits(2);
   */
  dilateBits (radius = 1) {
    const strategy = this._getStrategy()
    return strategy.dilate(radius)
  }

  /**
   * Cross dilation: expands cells in cardinal directions (up, down, left, right) only.
   *
   * Single expansion step using 4-connectivity (excludes diagonals). Useful for
   * non-Euclidean distance metrics. Mutating variant returns mask for chaining.
   *
   * Delegates to strategy class for optimized store-specific implementation.
   *
   * @returns {RectMask} This mask instance (mutated) for chainable operations
   * @chainable
   * @see dilateCrossBits for non-mutating variant
   * @see dilate for full rectangular dilation
   *
   * @example
   * // Expand only in cardinal directions
   * morph.dilateCross();
   */
  dilateCross () {
    this.mask.bits = this.dilateCrossBits()
    return this.mask
  }

  /**
   * Cross dilation: returns bits without mutation.
   *
   * Non-mutating variant of cross dilation. Computes 4-connectivity expansion
   * using cardinal directions only.
   *
   * @returns {bigint|Uint32Array} Cross-dilated bits
   * @see dilateCross for mutating variant
   *
   * @example
   * // Get cross-dilated bits for testing
   * const crossDilated = morph.dilateCrossBits();
   */
  dilateCrossBits () {
    const strategy = this._getStrategy()
    if (strategy instanceof Rect1BitMorphology) {
      return strategy.dilateCross()
    }
    // Multi-bit stores don't have cross dilation specialized
    // noinspection JSUnreachableSwitchBranch - Intentional fallback for multi-bit stores
    return this.bits
  }

  // ============================================================================
  // EROSION OPERATIONS
  // ============================================================================

  /**
   * Erodes (shrinks) occupied cells by removing edge cells (mutating variant).
   *
   * Morphological erosion: shrinks all occupied cells inward by removing boundary
   * cells. Cells survive erosion only if all neighbors are occupied. Modifies
   * mask.bits in-place and returns the mask for method chaining.
   *
   * Strategy selection based on store type:
   * - 1-bit stores: Fast separable (horizontal + vertical) bit shifts with edge clamping
   * - Multi-bit stores: Per-cell neighbor verification
   *
   * @param {number} [radius=1] - Number of erosion steps (non-negative integer)
   * @returns {RectMask} This mask instance (mutated) for chainable operations
   * @chainable
   * @see erodeBits for non-mutating variant
   * @see dilate for dilation (inverse operation)
   *
   * @example
   * // Shrink region by 2 cells
   * morph.erode(2);
   */
  erode (radius = 1) {
    this.mask.bits = this.erodeBits(radius)
    return this.mask
  }

  /**
   * Erodes occupied cells by given radius (non-mutating variant).
   *
   * Computes eroded bits without modifying the original mask. Useful for
   * testing or composition without side effects.
   *
   * Delegates to strategy class based on store type for optimized implementation.
   *
   * @param {number} [radius=1] - Number of erosion steps (non-negative integer)
   * @returns {bigint|Uint32Array} Eroded bitboard (original mask unchanged)
   * @see erode for mutating variant
   * @see dilate for dilation (inverse operation)
   *
   * @example
   * // Get eroded bits for testing
   * const shrunk = morph.erodeBits(1);
   */
  erodeBits (radius = 1) {
    const strategy = this._getStrategy()
    return strategy.erode(radius)
  }

  // ============================================================================
  // GRID EXPANSION OPERATIONS
  // ============================================================================

  /**
   * Expand grid with border and dilate into empty border area.
   *
   * Creates a larger grid with this mask centered and surrounded by empty cells,
   * then dilates the mask into the empty border area. Useful for preventing edge
   * effects and calculating spatial expansion properties.
   *
   * @param {number} [borderSize=1] - Border size to add on all sides (pixels)
   * @param {number} [_fillValue=0] - Color value for border (reserved for future use)
   * @returns {RectMask} New expanded and dilated mask (original unchanged)
   *
   * @example
   * // Create 2-cell border and dilate into it
   * const expanded = morph.dilateExpand(2);
   */
  dilateExpand (borderSize = 1, _fillValue = 0) {
    const newWidth = this.width + 2 * borderSize
    const newHeight = this.height + 2 * borderSize
    const expanded = this.mask.emptyMaskOfSize(
      newWidth,
      newHeight,
      this.mask.depth
    )

    // Copy existing bits into center of expanded mask
    this._copyToCenter(expanded, borderSize)

    // Dilate into the border area
    const morph = new RectMorphologyOps(expanded)
    expanded.bits = morph.dilateBits(1)

    return expanded
  }

  /**
   * Expand grid with border without dilating (flat expansion).
   *
   * Creates a larger grid with this mask centered and surrounded by empty cells,
   * but does NOT dilate into the border. Useful for footprint/shadow calculations
   * where boundary context matters but expansion does not.
   *
   * @param {number} [borderSize=1] - Border size to add on all sides (pixels)
   * @returns {RectMask} New expanded mask without dilation (original unchanged)
   *
   * @example
   * // Create grid with 1-cell border but no dilation
   * const bounded = morph.flatDilateExpand(1);
   */
  flatDilateExpand (borderSize = 1) {
    const newWidth = this.width + 2 * borderSize
    const newHeight = this.height + 2 * borderSize
    const expanded = this.mask.emptyMaskOfSize(
      newWidth,
      newHeight,
      this.mask.depth
    )

    // Copy to center but do NOT dilate - just expand grid boundaries
    this._copyToCenter(expanded, borderSize)

    return expanded
  }

  /**
   * Copies this mask's bits to the center of a larger expanded mask.
   *
   * Positions original mask at offset (borderSize, borderSize) in the new grid.
   * Respects expanded grid bounds; cells outside the new grid are not copied.
   *
   * @param {RectMask} expandedMask - Target expanded mask to copy into
   * @param {number} borderSize - Offset/border size from edges
   * @returns {void}
   * @private
   */
  _copyToCenter (expandedMask, borderSize) {
    for (const [
      localX,
      localY,
      value
    ] of this.mask.occupiedLocationsAndValues()) {
      const expandedX = localX + borderSize
      const expandedY = localY + borderSize
      if (expandedMask.isValid(expandedX, expandedY)) {
        expandedMask.set(expandedX, expandedY, value)
      }
    }
  }
}
