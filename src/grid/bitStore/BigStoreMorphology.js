/**
 * BigStoreMorphology - Helper utilities for BigInt store morphology.
 *
 * Isolates morphology-specific operations from StoreBig to maintain separation
 * of concerns. StoreBig focuses on BigInt storage semantics while this class
 * handles morphological operation logic.
 *
 * Operations are split by storage type:
 * - Shift-based: for 1-bit (occupancy) grids using fast bit operations
 * - Cell-wise: for multi-bit (colored) grids using per-cell iteration
 *
 * @example
 * // 1-bit dilation using shifts
 * const dilated = BigStoreMorphology.propagateVerticalShift(store, bits, width, masks)
 *
 * @example
 * // Multi-bit dilation using per-cell propagation
 * const dilated = BigStoreMorphology.expandAdjacentCellsHorizontally(store, bits)
 */
export class BigStoreMorphology {
  /**
   * Normalize an edge mask value for BigInt bitwise calculations.
   * Converts numbers and other primitives to BigInt for consistent operations.
   * @param {bigint|number|null|undefined} maskValue - Value to normalize
   * @returns {bigint} Normalized edge mask as BigInt
   */
  static normalizeEdgeMask (maskValue) {
    return typeof maskValue === 'bigint' ? maskValue : BigInt(maskValue || 0n)
  }

  /**
   * Expand each populated cell into its horizontal neighbors.
   * Per-cell dilation for multi-bit stores: propagates color values left and right.
   * Does not use edge masks (relies on grid boundaries via iteration).
   *
   * @param {Object} store - StoreBig instance with width, height properties
   * @param {bigint} bitboard - Input colored bitboard
   * @returns {bigint} Bitboard with colors expanded to adjacent columns
   */
  static expandAdjacentCellsHorizontally (store, bitboard) {
    const width = store.width
    let result = bitboard

    for (const [idx, value] of store.all.occupiedIndexAndValues(bitboard)) {
      result = store.setIdx(result, idx, value)
      const column = idx % width
      if (column > 0) result = store.setIdx(result, idx - 1, value)
      if (column < width - 1) result = store.setIdx(result, idx + 1, value)
    }
    return result
  }

  /**
   * Expand each populated cell into its vertical neighbors.
   * Per-cell dilation for multi-bit stores: propagates color values up and down.
   * Does not use edge masks (relies on grid boundaries via iteration).
   *
   * @param {Object} store - StoreBig instance with width, height properties
   * @param {bigint} bitboard - Input colored bitboard
   * @param {number} gridWidth - Width of grid (for row offset calculation)
   * @returns {bigint} Bitboard with colors expanded to adjacent rows
   */
  static propagateAdjacentCellsVertically (store, bitboard, gridWidth) {
    const height = store.height
    let result = bitboard
    const width = gridWidth

    for (const [idx, value] of store.all.occupiedIndexAndValues(bitboard)) {
      result = store.setIdx(result, idx, value)
      const row = Math.floor(idx / width)
      if (row > 0) result = store.setIdx(result, idx - width, value)
      if (row < height - 1) result = store.setIdx(result, idx + width, value)
    }
    return result
  }

  /**
   * Propagate 1-bit values vertically using BigInt shifts and edge masks.
   * Optimized shift-based operation for single-bit grids (occupancy only).
   * Applies edge masks to prevent cells from expanding beyond grid boundaries.
   *
   * @param {Object} store - StoreBig instance with shiftBits and combineMasked methods
   * @param {bigint} bitboard - Input 1-bit occupancy bitboard
   * @param {number} gridWidth - Width in cells (shift amount for vertical operations)
   * @param {Object} [edgeMasks] - Edge masks to restrict boundary expansion
   * @param {bigint} [edgeMasks.notTop] - Mask preventing expansion beyond top edge
   * @param {bigint} [edgeMasks.notBottom] - Mask preventing expansion beyond bottom edge
   * @returns {bigint} Bitboard with vertical expansion (up and down shifts)
   */
  static propagateVerticalShift (store, bitboard, gridWidth, edgeMasks) {
    const srcForUp = store.prepareSrcForUpExpansion(bitboard, edgeMasks)
    const srcForDown = store.prepareSrcForDownExpansion(bitboard, edgeMasks)

    const upShifted = store.shiftBits(srcForUp, -gridWidth)
    const downShifted = store.shiftBits(srcForDown, gridWidth)

    return store.combineMasked(bitboard, upShifted, downShifted)
  }

  /**
   * Apply horizontal erosion for multi-bit stores using neighbor survival rules.
   * Per-cell operation that removes colors from cells without horizontal neighbors.
   * A cell survives only if it has an occupied neighbor on both left and right.
   *
   * @param {Object} store - StoreBig instance with cellSurvivesHorizontalErosion method
   * @param {bigint} bitboard - Input colored bitboard
   * @returns {bigint} Eroded bitboard with edge colors removed
   */
  static erodeHorizontalCells (store, bitboard) {
    let result = bitboard

    for (const [idx] of store.all.occupiedIndexAndValues(bitboard)) {
      if (!store.cellSurvivesHorizontalErosion(bitboard, idx)) {
        result = store.setIdx(result, idx, 0n)
      }
    }
    return result
  }

  /**
   * Apply vertical erosion for multi-bit stores using neighbor survival rules.
   * Per-cell operation that removes colors from cells without vertical neighbors.
   * A cell survives only if it has an occupied neighbor on both top and bottom.
   *
   * @param {Object} store - StoreBig instance with cellSurvivesVerticalErosion method
   * @param {bigint} bitboard - Input colored bitboard
   * @param {number} gridWidth - Grid width (used for neighbor offset calculation)
   * @returns {bigint} Eroded bitboard with edge colors removed
   */
  static erodeVerticalCells (store, bitboard, gridWidth) {
    const size = gridWidth * store.height
    let result = bitboard

    for (let idx = 0; idx < size; idx++) {
      const value = store.getIdx(bitboard, idx)
      if (value === 0n) continue
      if (!store.cellSurvivesVerticalErosion(bitboard, idx, gridWidth)) {
        result = store.setIdx(result, idx, 0n)
      }
    }
    return result
  }

  /**
   * Build an inverted edge mask for horizontal erosion constraints.
   * @param {Object} store - StoreBig instance
   * @param {Object} edgeMasks
   * @param {string} maskKey
   * @returns {bigint}
   */
  static computeInvertedEdgeMask (store, edgeMasks, maskKey) {
    const fullMask = store.fullBits
    const maskValue = BigStoreMorphology.normalizeEdgeMask(edgeMasks?.[maskKey])
    return ~maskValue & fullMask
  }

  /**
   * Create horizontal erosion constraints from a shift and inverted mask.
   * @param {Object} store - StoreBig instance
   * @param {bigint} bitboard
   * @param {number} bitShift
   * @param {bigint} invertedMask
   * @returns {bigint}
   */
  static computeHorizontalConstraintFromShift (
    store,
    bitboard,
    bitShift,
    invertedMask
  ) {
    const shiftedNeighbor = store.shiftBits(bitboard, bitShift)
    return shiftedNeighbor | invertedMask
  }

  /**
   * Compute horizontal erosion constraints for BigInt stores.
   * @param {Object} store - StoreBig instance
   * @param {bigint} bitboard
   * @param {Object} edgeMasks
   * @param {number} bitShift
   * @returns {{leftConstraint: bigint, rightConstraint: bigint}}
   */
  static computeHorizontalErodeConstraints (
    store,
    bitboard,
    edgeMasks,
    bitShift
  ) {
    const invNotLeft = BigStoreMorphology.computeInvertedEdgeMask(
      store,
      edgeMasks,
      'notLeft'
    )
    const invNotRight = BigStoreMorphology.computeInvertedEdgeMask(
      store,
      edgeMasks,
      'notRight'
    )

    const leftConstraint =
      BigStoreMorphology.computeHorizontalConstraintFromShift(
        store,
        bitboard,
        bitShift,
        invNotLeft
      )
    const rightConstraint =
      BigStoreMorphology.computeHorizontalConstraintFromShift(
        store,
        bitboard,
        -bitShift,
        invNotRight
      )

    return { leftConstraint, rightConstraint }
  }

  /**
   * Apply horizontal erosion for 1-bit BigInt stores.
   * @param {Object} store - StoreBig instance
   * @param {bigint} bitboard
   * @param {Object} edgeMasks
   * @returns {bigint}
   */
  static erodeHorizontalShift (store, bitboard, edgeMasks) {
    if (!edgeMasks) return bitboard

    const bitShift = store.bitsPerCell
    const { leftConstraint, rightConstraint } =
      BigStoreMorphology.computeHorizontalErodeConstraints(
        store,
        bitboard,
        edgeMasks,
        bitShift
      )

    return bitboard & leftConstraint & rightConstraint
  }

  /**
   * Compute vertical erosion constraints for BigInt stores.
   * @param {Object} store - StoreBig instance
   * @param {bigint} bitboard
   * @param {number} gridWidth
   * @param {Object} edgeMasks
   * @returns {{upConstraint: bigint, downConstraint: bigint}}
   */
  static computeVerticalErodeConstraints (
    store,
    bitboard,
    gridWidth,
    edgeMasks
  ) {
    const upShifted = store.shiftBits(bitboard, -gridWidth)
    const downShifted = store.shiftBits(bitboard, gridWidth)

    if (!edgeMasks) {
      return { upConstraint: upShifted, downConstraint: downShifted }
    }

    const fullMask = store.fullBits
    const notTopBig = BigStoreMorphology.normalizeEdgeMask(edgeMasks.notTop)
    const notBottomBig = BigStoreMorphology.normalizeEdgeMask(
      edgeMasks.notBottom
    )

    const invNotTop = ~notTopBig & fullMask
    const invNotBottom = ~notBottomBig & fullMask

    const upConstraint = downShifted | invNotTop
    const downConstraint = upShifted | invNotBottom
    return { upConstraint, downConstraint }
  }

  /**
   * Apply vertical erosion for 1-bit BigInt stores.
   * @param {Object} store - StoreBig instance
   * @param {bigint} bitboard
   * @param {number} gridWidth
   * @param {Object} edgeMasks
   * @returns {bigint}
   */
  static erodeVerticalShift (store, bitboard, gridWidth, edgeMasks) {
    const { upConstraint, downConstraint } =
      BigStoreMorphology.computeVerticalErodeConstraints(
        store,
        bitboard,
        gridWidth,
        edgeMasks
      )
    return bitboard & upConstraint & downConstraint
  }
}
