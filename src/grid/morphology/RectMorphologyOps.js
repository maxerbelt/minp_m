/**
 * RectMorphologyOps - Morphological operations for rectangular grids
 *
 * Separates morphological operation logic from storage classes. Handles both
 * 1-bit (occupancy) and multi-bit (colored) morphology. Uses the existing
 * helper classes (StoreBigMorphology, Store32Morphology) for low-level
 * bitwise operations, while this class manages orchestration and higher-level
 * patterns.
 *
 * Morphological operations:
 * - Dilation: expand regions by 1 cell
 * - Erosion: shrink regions by removing edge cells
 * - Cross dilation: expand in cardinal directions only
 *
 * @see BigStoreMorphology for BigInt morphology helpers
 * @see Store32Morphology for Uint32Array morphology helpers
 */
export class RectMorphologyOps {
  /**
   * Create a morphology operation handler for rectangular grids
   * @param {MaskBase|Packed} mask - Mask or packed grid instance
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
   * Dilate (expand) the occupied cells by 1 unit.
   * Returns this for method chaining.
   * @returns {MaskBase|Packed} this for chaining
   */
  dilate (radius = 1) {
    this.mask.bits = this.dilateBits(radius)
    return this.mask
  }

  /**
   * Perform dilation and return the bits without mutating the mask
   * @param {number} [radius=1] - Number of steps to dilate
   * @returns {bigint|Uint32Array} dilated bits
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
   * Uses per-cell expansion rather than bit shifts.
   * @private
   * @returns {bigint|Uint32Array} dilated bits
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
   * Respects edge masks to prevent wrap-around.
   * @private
   * @returns {bigint|Uint32Array} dilated bits
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
   * Cross dilation: expand in cardinal directions (up, down, left, right) only
   * Returns this for method chaining.
   * @returns {MaskBase|Packed} this for chaining
   */
  dilateCross () {
    this.mask.bits = this.dilateCrossBits()
    return this.mask
  }

  /**
   * Cross dilation: return bits without mutation
   * @returns {bigint|Uint32Array} cross-dilated bits
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
   * Returns this for method chaining.
   * @param {number} [radius=1] - Number of erosion steps
   * @returns {MaskBase|Packed} this for chaining
   */
  erode (radius = 1) {
    this.mask.bits = this.erodeBits(radius)
    return this.mask
  }

  /**
   * Perform erosion and return bits without mutation
   * @param {number} [radius=1] - Number of erosion steps
   * @returns {bigint|Uint32Array} eroded bits
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
   * Cells must have occupied neighbors in all cardinal directions.
   * @private
   * @returns {bigint|Uint32Array} eroded bits
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
   * 1-bit erosion: remove bits at grid edges (clamped at boundaries).
   * Uses edge masks to correctly handle boundary conditions.
   * @private
   * @returns {bigint|Uint32Array} eroded bits
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
   * Creates a larger grid with this mask at an offset.
   * @param {number} [borderSize=1] - Border size to add
   * @param {number} [fillValue=0] - Color to fill new border cells with
   * @returns {MaskBase} New expanded & dilated mask
   */
  dilateExpand (borderSize = 1, fillValue = 0) {
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
   * Expand and dilate, but fill new cells with background (occupancy only).
   * Used for footprint/shadow calculations.
   * @param {number} [borderSize=1] - Border size to add
   * @returns {MaskBase} New expanded & dilated mask
   */
  flatDilateExpand (borderSize = 1) {
    const newWidth = this.width + 2 * borderSize
    const newHeight = this.height + 2 * borderSize
    const expanded = this.mask.emptyMaskOfSize(
      newWidth,
      newHeight,
      this.mask.depth
    )

    // Copy and dilate
    this._copyToCenter(expanded, borderSize)
    expanded.bits = this._dilateExpandedMask(expanded.bits, expanded.store)

    return expanded
  }

  /**
   * Copy this mask's bits to the center of a larger expanded mask.
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

  /**
   * Dilate an expanded mask by one step into empty border area.
   * @private
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
   * Edge masks mark which cells can expand in each direction.
   * @private
   * @returns {Object|undefined} Edge masks object or undefined if using per-cell expansion
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
