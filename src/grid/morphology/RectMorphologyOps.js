/** @type {import('./types/index.js').RectMask} */
/** @type {import('./types/index.js').AnyStore} */
/** @type {import('./types/index.js').EdgeMaskCollection} */

/**
 * RectMorphologyOps - Morphological operations orchestration for rectangular grids.
 * Separates morphological operation logic from storage classes.
 * Handles both 1-bit (occupancy) and multi-bit (colored) morphology using strategy pattern.
 * Delegates to store-specific helpers (StoreBigMorphology, Store32Morphology) for low-level
 * bitwise operations, while this class manages orchestration, edge mask handling, and higher-level patterns.
 *
 * Morphological operations supported:
 * - **Dilation**: Expand regions by expanding each occupied cell to neighbors
 * - **Erosion**: Shrink regions by removing edge cells (cells without all neighbors present)
 * - **Cross dilation**: Expand in cardinal directions only (4-connectivity)
 * - **Expand & dilate**: Create larger grid with border and dilate into it
 *
 * Strategy patterns:
 * - **1-bit stores**: Use fast separable (horizontal + vertical) bit shifts with edge masks
 * - **Multi-bit stores**: Use per-cell expansion/erosion with color propagation
 *
 * @class RectMorphologyOps
 * @description High-level morphological operations orchestration for rectangular grids
 * @see BigStoreMorphology for BigInt morphology helpers
 * @see Store32Morphology for Uint32Array morphology helpers
 * @see SingleBitMorphology for 1-bit specialization
 */
export class RectMorphologyOps {
  /**
   * Create a morphology operation handler for rectangular grids
   * Caches mask dimensions and store reference for all morphological operations
   *
   * @param {import('./types/index.js').RectMask} mask - Mask or packed grid instance with required properties
   * @throws {Error} If mask is missing required properties (store, width, height, indexer)
   */
  constructor (mask) {
    this.mask = mask
    this.store = mask.store
    this.bits = mask.bits
    this.width = mask.width
    this.height = mask.height
    this.indexer = mask.indexer
  }

  // ============================================================================
  // DILATION OPERATIONS
  // ============================================================================

  /**
   * Dilate (expand) the occupied cells by expanding into neighbors.
   * Mutating variant - modifies this.mask.bits and returns mask for chaining.
   * Uses strategy pattern: separable bit shifts for 1-bit stores, per-cell expansion for multi-bit.
   *
   * @param {number} [radius=1] - Number of dilation steps (non-negative integer)
   * @returns {import('./types/index.js').RectMask} This mask instance (mutated) for method chaining
   */
  dilate (radius = 1) {
    this.mask.bits = this.dilateBits(radius)
    return this.mask
  }

  /**
   * Perform dilation and return the bits without mutating the mask
   * Non-mutating variant - original mask unchanged, new bits returned
   * Selects strategy based on store type (isMultiBit vs single-bit)
   *
   * @param {number} [radius=1] - Number of dilation steps (non-negative integer)
   * @returns {import('./types/index.js').Bitboard} Dilated bits
   */
  dilateBits (radius = 1) {
    if (radius <= 0) return this.bits

    const edgeMasks = this._getEdgeMasks()

    // For multi-bit stores, use per-cell expansion (no edge masks)
    if (this.store.isMultiBit) {
      return this._dilateMultiBit(radius)
    }

    // For 1-bit stores, use separable (horizontal + vertical) dilation
    return this._dilateSeparable1Bit(radius, edgeMasks)
  }

  /**
   * Multi-bit dilation: expand each colored cell into neighbors.
   * Uses per-cell expansion rather than bit shifts (respects color per cell).
   * Processes each radius step sequentially: horizontal then vertical.
   *
   * @private
   * @param {number} radius - Number of dilation steps
   * @returns {bigint|Uint32Array} Dilated bits with color information preserved
   */
  _dilateMultiBit (radius) {
    let result = this.bits
    for (let i = 0; i < radius; i++) {
      // Horizontal: each cell propagates to left/right neighbors
      if (this.store.expandHorizontallyCellwise) {
        result = this.store.expandHorizontallyCellwise(result)
      }
      // Vertical: each cell propagates to up/down neighbors
      if (this.store.propagateVerticalCellwise) {
        result = this.store.propagateVerticalCellwise(result, this.width)
      }
    }
    return result
  }

  /**
   * 1-bit dilation: separable (horizontal + vertical) using bit shifts.
   * Respects edge masks to prevent wrap-around at grid boundaries.
   * More efficient than multi-bit: uses fast bit operations instead of per-cell processing.
   *
   * @private
   * @param {number} radius - Number of dilation steps
   * @param {EdgeMaskCollection|undefined} edgeMasks - Pre-computed boundary masks
   * @returns {bigint|Uint32Array} Dilated bits
   */
  _dilateSeparable1Bit (radius, edgeMasks) {
    let result = this.bits

    // Horizontal expansion
    for (let i = 0; i < radius; i++) {
      if (this.store.dilate1D_horizontal) {
        result = this.store.dilate1D_horizontal(result, radius, edgeMasks)
      }
    }

    // Vertical expansion
    for (let i = 0; i < radius; i++) {
      if (this.store.dilate1D_vertical) {
        result = this.store.dilate1D_vertical(
          result,
          this.width,
          radius,
          edgeMasks
        )
      }
    }

    return result
  }

  /**
   * Cross dilation: expand in cardinal directions (up, down, left, right) only.
   * Single expansion step using 4-connectivity (excludes diagonals).
   * Mutating variant - modifies this.mask.bits and returns mask for chaining.
   *
   * @returns {MaskInstance} This mask instance (mutated) for method chaining
   */
  dilateCross () {
    this.mask.bits = this.dilateCrossBits()
    return this.mask
  }

  /**
   * Cross dilation: return bits without mutation.
   * Non-mutating variant - original mask unchanged, cross-dilated bits returned.
   *
   * @returns {bigint|Uint32Array} Cross-dilated bits (4-connectivity)
   */
  dilateCrossBits () {
    const edgeMasks = this._getEdgeMasks()
    return this.store.dilateCrossStep(
      this.bits,
      edgeMasks,
      this.width,
      this.height
    )
  }

  // ============================================================================
  // EROSION OPERATIONS
  // ============================================================================

  /**
   * Erode (shrink) occupied cells by removing edge cells.
   * Cells survive only if they have neighbors on all sides (within grid bounds).
   * Mutating variant - modifies this.mask.bits and returns mask for chaining.
   *
   * @param {number} [radius=1] - Number of erosion steps (non-negative integer)
   * @returns {MaskInstance} This mask instance (mutated) for method chaining
   */
  erode (radius = 1) {
    this.mask.bits = this.erodeBits(radius)
    return this.mask
  }

  /**
   * Perform erosion and return bits without mutation
   * Non-mutating variant - original mask unchanged, eroded bits returned.
   * Selects strategy based on store type (isMultiBit vs single-bit).
   *
   * @param {number} [radius=1] - Number of erosion steps (non-negative integer)
   * @returns {bigint|Uint32Array} Eroded bits
   */
  erodeBits (radius = 1) {
    if (radius <= 0) return this.bits

    const edgeMasks = this._getEdgeMasks()

    // For multi-bit stores, use per-cell erosion (no edge masks)
    if (this.store.isMultiBit) {
      return this._erodeMultiBit(radius)
    }

    // For 1-bit stores, use clamped erosion (respects grid boundaries)
    return this._erodeClamped1Bit(radius, edgeMasks)
  }

  /**
   * Multi-bit erosion: remove colors from cells without neighbors.
   * Cells must have occupied neighbors in all cardinal directions to survive.
   * Processes each radius step sequentially: horizontal then vertical.
   *
   * @private
   * @param {number} radius - Number of erosion steps
   * @returns {bigint|Uint32Array} Eroded bits with color information
   */
  _erodeMultiBit (radius) {
    let result = this.bits
    for (let i = 0; i < radius; i++) {
      // Horizontal: keep cells with left/right neighbors
      if (this.store.erodeHorizontalCellwise) {
        result = this.store.erodeHorizontalCellwise(result)
      }
      // Vertical: keep cells with top/bottom neighbors
      if (this.store.erodeVerticalCellwise) {
        result = this.store.erodeVerticalCellwise(result, this.width)
      }
    }
    return result
  }

  /**
   * 1-bit erosion: remove bits at grid edges with clamping at boundaries.
   * Uses edge masks to correctly handle boundary conditions (no erosion beyond grid).
   * More efficient than multi-bit: uses fast bit operations.
   *
   * @private
   * @param {number} radius - Number of erosion steps
   * @param {EdgeMaskCollection|undefined} edgeMasks - Pre-computed boundary masks
   * @returns {bigint|Uint32Array} Eroded bits
   */
  _erodeClamped1Bit (radius, edgeMasks) {
    let result = this.bits

    // Horizontal erosion
    for (let i = 0; i < radius; i++) {
      if (this.store.erodeHorizontalClamp) {
        result = this.store.erodeHorizontalClamp(result, radius, edgeMasks)
      }
    }

    // Vertical erosion
    for (let i = 0; i < radius; i++) {
      if (this.store.erodeVerticalClamp) {
        result = this.store.erodeVerticalClamp(
          result,
          this.width,
          radius,
          edgeMasks
        )
      }
    }

    return result
  }

  // ============================================================================
  // EXPANSION OPERATIONS
  // ============================================================================

  /**
   * Expand the grid with a border of empty cells and dilate into them.
   * Creates a larger grid with this mask positioned at an offset from edges.
   * Useful for preventing edge effects when dilating near boundaries.
   * Takes an optional fill value parameter for future extension to color dilation.
   *
   * @param {number} [borderSize=1] - Border size to add on all sides (non-negative)
   * @param {number} [_fillValue=0] - Color value for border cells (reserved for future use)
   * @returns {MaskInstance} New expanded and dilated mask (original unchanged)
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
    expanded.bits = this._dilateExpandedMask(expanded.bits, expanded.store)

    return expanded
  }

  /**
   * Expand and dilate for footprint/shadow calculations.
   * Semantically distinct from dilateExpand: intended for calculating spatial footprints.
   * Expands the grid with a border but does NOT dilate into the border area.
   * Used when background context (empty space boundaries) is relevant to the morphological operation.
   * Useful for shadow/footprint analysis without expansion effects.
   *
   * @param {number} [borderSize=1] - Border size to add on all sides (non-negative)
   * @returns {MaskInstance} New expanded mask without dilation (original unchanged)
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
   * Copy this mask's bits to the center of a larger expanded mask.
   * Positions original mask at offset (borderSize, borderSize) in the new grid.
   * Only copies cells that fit within the expanded mask bounds.
   *
   * @private
   * @param {MaskInstance} expandedMask - Target expanded mask to copy into
   * @param {number} borderSize - Offset/border size from edges
   * @returns {void} Modifies expandedMask in-place
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

  /**
   * Dilate an expanded mask by one step into empty border area.
   * Single dilation step applied to the expanded grid.
   *
   * @private
   * @param {bigint|Uint32Array} bits - Input bits for expanded mask
   * @param {StoreBackend} store - Store backend for dilation operation
   * @returns {bigint|Uint32Array} Dilated bits
   */
  _dilateExpandedMask (bits, store) {
    const edgeMasks = store._createDefaultEdgeMasks?.() || {}
    return store.dilate1D_horizontal?.(bits, 1, edgeMasks) || bits
  }

  // ============================================================================
  // EDGE MASK MANAGEMENT
  // ============================================================================

  /**
   * Get or create edge masks that prevent expansion across grid boundaries.
   * Edge masks mark which cells can expand in each direction without wrapping.
   * Different strategies for 1-bit vs multi-bit stores:
   * - **1-bit stores**: Create and cache boundary masks for efficient bit shift operations
   * - **Multi-bit stores**: Return undefined (use per-cell expansion, no masks needed)
   *
   * @private
   * @returns {EdgeMaskCollection|undefined} Edge masks object or undefined for per-cell expansion
   */
  _getEdgeMasks () {
    // Multi-bit stores don't use edge masks (per-cell expansion)
    if (this.store.isMultiBit) {
      return undefined
    }

    // Delegate to store for 1-bit edge mask creation
    if (this.store._createDefaultEdgeMasks) {
      return this.store._createDefaultEdgeMasks()
    }

    return undefined
  }
}
