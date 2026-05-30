/** @type {import('./types/index.js').SingleBitStore} */
/** @type {import('./types/index.js').EdgeMaskCollection} */
/** @type {import('./types/index.js').Bitboard} */

/**
 * SingleBitMorphology - Optimized morphology for 1-bit (occupancy-only) grids.
 * Specializes dilation and erosion for single-bit grids where only occupancy
 * matters (no color values). Uses fast bit-shift operations with edge masks
 * to prevent boundary wrap-around.
 *
 * Strategies:
 * - **Dilation**: Separable (horizontal + vertical) shifts with edge masking, or non-separable (8 neighbors at once)
 * - **Erosion**: Constraint-based approach using shifted neighbors with clamping
 * - **Efficiency**: No per-cell iteration needed, pure bitboard operations
 *
 * @class SingleBitMorphology
 * @description Optimized morphological operations for single-bit occupancy grids
 * @see RectMorphologyOps for high-level operation orchestration
 * @see BigStoreMorphology, Store32Morphology for low-level bit operations
 */
export class SingleBitMorphology {
  /**
   * Initialize single-bit morphology handler with store backend
   * Validates that store is configured for single-bit operations (isSingleBit === true)
   * Caches store reference for all morphological operations
   *
   * @param {import('./types/index.js').SingleBitStore} store - Store instance (StoreBig or Store32) with isSingleBit === true
   * @throws {Error} If store.isSingleBit is not true
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
   * Separable approach: apply 1D horizontal dilations, then 1D vertical dilations.
   * More efficient than non-separable and respects grid boundaries via edge masking.
   * Radius determines the number of dilation steps applied (cumulative expansion).
   *
   * @param {import('./types/index.js').Bitboard} bitboard - Input occupancy bits
   * @param {number} gridWidth - Grid width in cells (for vertical shift calculation)
   * @param {number} [radius=1] - Number of dilation steps (non-negative integer)
   * @returns {import('./types/index.js').Bitboard} Dilated occupancy bits
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
   * Expands in all directions (orthogonal + diagonal) in a single step.
   * More comprehensive neighborhood coverage but potentially slower than separable.
   * Useful for applications requiring immediate diagonal expansion.
   *
   * @param {Bitboard} bitboard - Input occupancy bits
   * @param {number} gridWidth - Grid width (for vertical shift calculation)
   * @param {number} [radius=1] - Number of dilation steps (non-negative integer)
   * @returns {Bitboard} Dilated bits (8-neighbor connectivity)
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
   * Expands in 4-connectivity (orthogonal neighbors), excluding diagonal neighbors.
   * Single dilation step, useful for controlled, directional expansion.
   *
   * @param {Bitboard} bitboard - Input occupancy bits
   * @param {number} gridWidth - Grid width (for vertical shift calculation)
   * @param {number} gridHeight - Grid height
   * @returns {Bitboard} Cross-dilated bits (4-neighbor connectivity)
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
   * Erode occupancy grid using constraint-based approach with edge clamping.
   * Separable erosion: horizontal pass removes boundary cells, vertical pass removes additional boundary.
   * Cells survive only if all required neighbors are present within grid bounds.
   * Edge clamping prevents erosion from extending beyond grid boundaries.
   *
   * @param {Bitboard} bitboard - Input occupancy bits
   * @param {number} gridWidth - Grid width (for vertical shift calculation)
   * @param {number} [radius=1] - Number of erosion steps (non-negative integer)
   * @returns {Bitboard} Eroded occupancy bits
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
   * Used internally by erodeConstrained to determine which cells satisfy horizontal neighbors.
   * Constraints identify cells with required neighbors present in both directions.
   *
   * @private
   * @param {Bitboard} bitboard - Input occupancy bits
   * @param {EdgeMaskCollection} edgeMasks - Boundary masks for constraint computation
   * @returns {Bitboard} Constraint mask for horizontal erosion
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
   * Used internally by erodeConstrained to determine which cells satisfy vertical neighbors.
   * Constraints identify cells with required neighbors present in both directions.
   *
   * @private
   * @param {Bitboard} bitboard - Input occupancy bits
   * @param {number} gridWidth - Grid width (for vertical neighbor calculation)
   * @param {EdgeMaskCollection} edgeMasks - Boundary masks for constraint computation
   * @returns {Bitboard} Constraint mask for vertical erosion
   */
  _computeVerticalConstraints (bitboard, gridWidth, edgeMasks) {
    return this.store.computeVerticalErodeConstraints?.(
      bitboard,
      gridWidth,
      edgeMasks
    )
  }
}
