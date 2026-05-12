/**
 * Store32Morphology - Helper utilities for Store32 (Uint32Array) morphology.
 *
 * Isolates morphology-specific operations from Store32 to maintain separation
 * of concerns. Store32 focuses on Uint32Array storage semantics while this class
 * handles morphological operation logic.
 *
 * Operations are split by storage type:
 * - Shift-based: for 1-bit (occupancy) grids using fast bit operations
 * - Cell-wise: for multi-bit (colored) grids using per-cell iteration
 *
 * Uint32Array operations require word-by-word processing, unlike BigInt's
 * monolithic representation. All array operations respect word boundaries.
 *
 * @example
 * // 1-bit dilation using shifts
 * const dilated = Store32Morphology.propagateVerticalShift(store, bits, width, masks)
 *
 * @example
 * // Multi-bit dilation using per-cell propagation
 * const dilated = Store32Morphology.expandAdjacentCellsHorizontally(store, bits)
 */
export class Store32Morphology {
  /**
   * Normalize an edge mask value for Uint32Array bitwise calculations.
   * Converts primitives to Uint32Array for consistent word-wise operations.
   * @param {Uint32Array|number|null|undefined} maskValue - Value to normalize
   * @returns {Uint32Array} Normalized edge mask
   */
  static normalizeEdgeMask (maskValue) {
    if (maskValue instanceof Uint32Array) return maskValue
    return new Uint32Array([maskValue || 0])
  }

  /**
   * Expand each populated cell into its horizontal neighbors.
   * Per-cell dilation for multi-bit stores: propagates color values left and right.
   * Does not use edge masks (relies on grid boundaries via iteration).
   *
   * @param {Object} store - Store32 instance with width, height properties
   * @param {Uint32Array} bitboard - Input colored bitboard
   * @returns {Uint32Array} Bitboard with colors expanded to adjacent columns
   */
  static expandAdjacentCellsHorizontally (store, bitboard) {
    const width = store.width
    const result = bitboard.slice()

    for (let idx = 0; idx < store.size; idx++) {
      const value = store.getIdx(bitboard, idx)
      if (value !== 0) {
        store.setAtIdx(result, idx, value)
        const column = idx % width
        if (column > 0) store.setAtIdx(result, idx - 1, value)
        if (column < width - 1) store.setAtIdx(result, idx + 1, value)
      }
    }
    return result
  }

  /**
   * Expand each populated cell into its vertical neighbors.
   * Per-cell dilation for multi-bit stores: propagates color values up and down.
   * Does not use edge masks (relies on grid boundaries via iteration).
   *
   * @param {Object} store - Store32 instance with width, height properties
   * @param {Uint32Array} bitboard - Input colored bitboard
   * @param {number} gridWidth - Width of grid (for row offset calculation)
   * @returns {Uint32Array} Bitboard with colors expanded to adjacent rows
   */
  static propagateAdjacentCellsVertically (store, bitboard, gridWidth) {
    const height = store.height
    const result = bitboard.slice()

    for (let idx = 0; idx < store.size; idx++) {
      const value = store.getIdx(bitboard, idx)
      if (value !== 0) {
        store.setAtIdx(result, idx, value)
        const row = Math.floor(idx / gridWidth)
        if (row > 0) store.setAtIdx(result, idx - gridWidth, value)
        if (row < height - 1) store.setAtIdx(result, idx + gridWidth, value)
      }
    }
    return result
  }

  /**
   * Propagate 1-bit values vertically using Uint32Array shifts and edge masks.
   * Optimized shift-based operation for single-bit grids (occupancy only).
   * Applies edge masks to prevent cells from expanding beyond grid boundaries.
   * Processes word-by-word to respect Uint32Array structure.
   *
   * @param {Object} store - Store32 instance with shiftBits and combineMasked methods
   * @param {Uint32Array} bitboard - Input 1-bit occupancy bitboard
   * @param {number} gridWidth - Width in cells (shift amount for vertical operations)
   * @param {Object} [edgeMasks] - Edge masks to restrict boundary expansion
   * @param {Uint32Array} [edgeMasks.notTop] - Mask preventing expansion beyond top edge
   * @param {Uint32Array} [edgeMasks.notBottom] - Mask preventing expansion beyond bottom edge
   * @returns {Uint32Array} Bitboard with vertical expansion (up and down shifts)
   */
  static propagateVerticalShift (store, bitboard, gridWidth, edgeMasks) {
    const bitsPerCell = store.bitsPerCell
    const bitShift = gridWidth * bitsPerCell
    let srcForUp = bitboard
    let srcForDown = bitboard

    if (edgeMasks?.notTop) srcForUp = store.bitAnd(bitboard, edgeMasks.notTop)
    if (edgeMasks?.notBottom)
      srcForDown = store.bitAnd(bitboard, edgeMasks.notBottom)

    const upShifted = store.shiftBits(srcForUp, -bitShift)
    const downShifted = store.shiftBits(srcForDown, bitShift)

    const result = store.createEmptyBitboard(bitboard)
    const fullMask = store.fullBits
    for (let i = 0; i < result.length; i++) {
      result[i] = (bitboard[i] | upShifted[i] | downShifted[i]) & fullMask[i]
    }
    return result
  }

  /**
   * Apply horizontal erosion for multi-bit stores using neighbor survival rules.
   * Per-cell operation that removes colors from cells without horizontal neighbors.
   * A cell survives only if it has an occupied neighbor on both left and right.
   *
   * @param {Object} store - Store32 instance with cellSurvivesHorizontalErosion method
   * @param {Uint32Array} bitboard - Input colored bitboard
   * @returns {Uint32Array} Eroded bitboard with edge colors removed
   */
  static erodeHorizontalCells (store, bitboard) {
    const result = bitboard.slice()

    for (let idx = 0; idx < store.size; idx++) {
      const value = store.getIdx(bitboard, idx)
      if (value !== 0 && !store.cellSurvivesHorizontalErosion(bitboard, idx)) {
        store.setAtIdx(result, idx, 0)
      }
    }
    return result
  }

  /**
   * Apply vertical erosion for multi-bit stores using neighbor survival rules.
   * Per-cell operation that removes colors from cells without vertical neighbors.
   * A cell survives only if it has an occupied neighbor on both top and bottom.
   *
   * @param {Object} store - Store32 instance with cellSurvivesVerticalErosion method
   * @param {Uint32Array} bitboard - Input colored bitboard
   * @param {number} gridWidth - Grid width (used for neighbor offset calculation)
   * @returns {Uint32Array} Eroded bitboard with edge colors removed
   */
  static erodeVerticalCells (store, bitboard, gridWidth) {
    const result = bitboard.slice()

    for (let idx = 0; idx < store.size; idx++) {
      const value = store.getIdx(bitboard, idx)
      if (
        value !== 0 &&
        !store.cellSurvivesVerticalErosion(bitboard, idx, gridWidth)
      ) {
        store.setAtIdx(result, idx, 0)
      }
    }
    return result
  }

  /**
   * Build an inverted edge mask for horizontal erosion constraints.
   * @param {Object} store - Store32 instance
   * @param {Object} edgeMasks
   * @param {string} maskKey
   * @returns {Uint32Array}
   */
  static computeInvertedEdgeMask (store, edgeMasks, maskKey) {
    return store._createInvertedMask(edgeMasks, maskKey)
  }

  /**
   * Create horizontal erosion constraints from a shift and inverted mask.
   * @param {Object} store - Store32 instance
   * @param {Uint32Array} bitboard
   * @param {number} bitShift
   * @param {Uint32Array} invertedMask
   * @returns {Uint32Array}
   */
  static computeHorizontalConstraintFromShift (
    store,
    bitboard,
    bitShift,
    invertedMask
  ) {
    const shiftedNeighbor = store.shiftBits(bitboard, bitShift)
    return store.bitOr(shiftedNeighbor, invertedMask)
  }

  /**
   * Compute horizontal erosion constraints for Store32.
   * @param {Object} store - Store32 instance
   * @param {Uint32Array} bitboard
   * @param {Object} edgeMasks
   * @param {number} bitShift
   * @returns {{leftConstraint: Uint32Array, rightConstraint: Uint32Array}}
   */
  static computeHorizontalErodeConstraints (
    store,
    bitboard,
    edgeMasks,
    bitShift
  ) {
    const invNotLeft = Store32Morphology.computeInvertedEdgeMask(
      store,
      edgeMasks,
      'notLeft'
    )
    const invNotRight = Store32Morphology.computeInvertedEdgeMask(
      store,
      edgeMasks,
      'notRight'
    )

    const leftConstraint =
      Store32Morphology.computeHorizontalConstraintFromShift(
        store,
        bitboard,
        bitShift,
        invNotLeft
      )
    const rightConstraint =
      Store32Morphology.computeHorizontalConstraintFromShift(
        store,
        bitboard,
        -bitShift,
        invNotRight
      )

    return { leftConstraint, rightConstraint }
  }

  /**
   * Apply horizontal erosion for 1-bit Store32.
   * @param {Object} store - Store32 instance
   * @param {Uint32Array} bitboard
   * @param {Object} edgeMasks
   * @returns {Uint32Array}
   */
  static erodeHorizontalShift (store, bitboard, edgeMasks) {
    if (!edgeMasks) return bitboard

    const bitShift = store.bitsPerCell
    const { leftConstraint, rightConstraint } =
      Store32Morphology.computeHorizontalErodeConstraints(
        store,
        bitboard,
        edgeMasks,
        bitShift
      )

    return store.bitAnd(store.bitAnd(bitboard, leftConstraint), rightConstraint)
  }

  /**
   * Compute vertical erosion constraints for Store32.
   * @param {Object} store - Store32 instance
   * @param {Uint32Array} bitboard
   * @param {number} gridWidth
   * @param {Object} edgeMasks
   * @param {number} bitShift
   * @returns {{upShifted: Uint32Array, downShifted: Uint32Array}}
   */
  static computeVerticalErodeConstraints (
    store,
    bitboard,
    gridWidth,
    edgeMasks,
    bitShift
  ) {
    const upShifted = store._computeVerticalConstraintFromShift(
      bitboard,
      edgeMasks,
      'notTop',
      -bitShift
    )
    const downShifted = store._computeVerticalConstraintFromShift(
      bitboard,
      edgeMasks,
      'notBottom',
      bitShift
    )
    return { upShifted, downShifted }
  }

  /**
   * Apply vertical erosion for 1-bit Store32.
   * @param {Object} store - Store32 instance
   * @param {Uint32Array} bitboard
   * @param {number} gridWidth
   * @param {Object} edgeMasks
   * @returns {Uint32Array}
   */
  static erodeVerticalShift (store, bitboard, gridWidth, edgeMasks) {
    const bitShift = store._calculateVerticalBitShift(gridWidth)
    const { upShifted, downShifted } =
      Store32Morphology.computeVerticalErodeConstraints(
        store,
        bitboard,
        gridWidth,
        edgeMasks,
        bitShift
      )

    const result = store.createEmptyBitboard(bitboard)
    const fullMask = store.fullBits
    for (let i = 0; i < result.length; i++) {
      result[i] =
        (store.bitAnd(store.bitAnd(bitboard, upShifted), downShifted)[i] &
          fullMask[i]) >>>
        0
    }
    return result
  }
}
