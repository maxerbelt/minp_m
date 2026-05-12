/**
 * SingleBitMorphology - Optimized morphology for 1-bit (occupancy-only) grids
 *
 * Specializes dilation and erosion for single-bit grids where only occupancy
 * matters (no color values). Uses fast bit-shift operations with edge masks
 * to prevent boundary wrap-around.
 *
 * Single-bit approach:
 * - Dilation: Use separable (horizontal + vertical) shifts with edge masking
 * - Erosion: Constraint-based approach using shifted neighbors
 * - No per-cell iteration needed
 *
 * @see RectMorphologyOps for high-level operation orchestration
 * @see BigStoreMorphology, Store32Morphology for low-level bit operations
 */
export class SingleBitMorphology {
  /**
   * Initialize single-bit morphology handler
   * @param {Object} store - Store instance (StoreBig or Store32)
   */
  constructor (store) {
    this.store = store

    if (!store.isSingleBit) {
      throw new Error('SingleBitMorphology requires isSingleBit === true')
    }
  }

  // ============================================================================
  // DILATION - SEPARABLE APPROACH (Horizontal + Vertical)
  // ============================================================================

  /**
   * Dilate occupancy grid using separable operations (horizontal then vertical).
   * More efficient than non-separable and respects grid boundaries.
   * @param {bigint|Uint32Array} bitboard - Input occupancy bits
   * @param {number} gridWidth - Grid width in cells
   * @param {number} radius - Number of dilation steps
   * @returns {bigint|Uint32Array} Dilated occupancy bits
   */
  dilateSeparable (bitboard, gridWidth, radius = 1) {
    const edgeMasks = this.store._createDefaultEdgeMasks?.()

    // Horizontal: expand left/right
    let horizontal = bitboard
    for (let i = 0; i < radius; i++) {
      horizontal = this.store.dilate1D_horizontal(horizontal, 1, edgeMasks)
    }

    // Vertical: expand up/down
    let result = horizontal
    for (let i = 0; i < radius; i++) {
      result = this.store.dilate1D_vertical(result, gridWidth, 1, edgeMasks)
    }

    return result
  }

  /**
   * Dilate using non-separable (all 8 neighbors simultaneously).
   * More comprehensive but may be slower.
   * @param {bigint|Uint32Array} bitboard - Input occupancy bits
   * @param {number} gridWidth - Grid width
   * @param {number} radius - Number of steps
   * @returns {bigint|Uint32Array} Dilated bits
   */
  dilateNonSeparable (bitboard, gridWidth, radius = 1) {
    const edgeMasks = this.store._createDefaultEdgeMasks?.()

    let result = bitboard
    for (let i = 0; i < radius; i++) {
      // Combine horizontal and vertical in one step
      const srcForLeft = this.store.prepareSrcForLeftExpansion(
        result,
        edgeMasks
      )
      const srcForRight = this.store.prepareSrcForRightExpansion(
        result,
        edgeMasks
      )
      const srcForUp = this.store.prepareSrcForUpExpansion(result, edgeMasks)
      const srcForDown = this.store.prepareSrcForDownExpansion(
        result,
        edgeMasks
      )

      const left = this.store.shiftBits(srcForLeft, -1)
      const right = this.store.shiftBits(srcForRight, 1)
      const up = this.store.shiftBits(srcForUp, -gridWidth)
      const down = this.store.shiftBits(srcForDown, gridWidth)

      result = this.store.combineMasked(result, left, right, up, down)
    }

    return result
  }

  /**
   * Cross dilation (cardinal directions only: up/down/left/right).
   * Excludes diagonal neighbors.
   * @param {bigint|Uint32Array} bitboard - Input bits
   * @param {number} gridWidth - Grid width
   * @param {number} gridHeight - Grid height
   * @returns {bigint|Uint32Array} Cross-dilated bits
   */
  dilateCross (bitboard, gridWidth, gridHeight) {
    const edgeMasks = this.store._createDefaultEdgeMasks?.()
    return this.store.dilateCrossStep(
      bitboard,
      edgeMasks,
      gridWidth,
      gridHeight
    )
  }

  // ============================================================================
  // EROSION - CONSTRAINT-BASED APPROACH
  // ============================================================================

  /**
   * Erode occupancy grid using constraint-based approach.
   * Cells survive only if all required neighbors are present.
   * @param {bigint|Uint32Array} bitboard - Input occupancy bits
   * @param {number} gridWidth - Grid width
   * @param {number} radius - Number of erosion steps
   * @returns {bigint|Uint32Array} Eroded occupancy bits
   */
  erodeConstrained (bitboard, gridWidth, radius = 1) {
    const edgeMasks = this.store._createDefaultEdgeMasks?.()

    // Horizontal erosion
    let horizontal = bitboard
    for (let i = 0; i < radius; i++) {
      horizontal = this.store.erodeHorizontalClamp(horizontal, 1, edgeMasks)
    }

    // Vertical erosion
    let result = horizontal
    for (let i = 0; i < radius; i++) {
      result = this.store.erodeVerticalClamp(result, gridWidth, 1, edgeMasks)
    }

    return result
  }

  /**
   * Compute left/right erosion constraint masks.
   * Used internally by erodeConstrained.
   * @private
   */
  _computeHorizontalConstraints (bitboard, edgeMasks) {
    const bitShift = this.store.bitsPerCell
    return this.store.computeHorizontalErodeConstraints?.(
      bitboard,
      edgeMasks,
      bitShift
    )
  }

  /**
   * Compute up/down erosion constraint masks.
   * Used internally by erodeConstrained.
   * @private
   */
  _computeVerticalConstraints (bitboard, gridWidth, edgeMasks) {
    return this.store.computeVerticalErodeConstraints?.(
      bitboard,
      gridWidth,
      edgeMasks
    )
  }
}
