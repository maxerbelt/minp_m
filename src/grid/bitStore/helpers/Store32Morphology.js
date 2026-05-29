/**
 * @typedef {Object} Store32Instance
 * @property {number} width - Grid width in cells
 * @property {number} height - Grid height in cells
 * @property {number} size - Total grid size (width × height)
 * @property {number} bitsPerCell - Bits allocated per cell (1, 2, 4, 8)
 * @property {Uint32Array} fullBits - Mask array covering all bits
 * @property {Function} getIdx - Get cell value at index
 * @property {Function} setAtIdx - Set cell value at index (mutating)
 * @property {Function} shiftBits - Perform bitwise shift on bitboard
 * @property {Function} bitAnd - Bitwise AND operation
 * @property {Function} bitOr - Bitwise OR operation
 * @property {Function} createEmptyBitboard - Create zeroed bitboard array
 * @property {Function} cellSurvivesHorizontalErosion - Check horizontal erosion survival
 * @property {Function} cellSurvivesVerticalErosion - Check vertical erosion survival
 * @property {Function} _createInvertedMask - Create inverted edge mask
 * @property {Function} _computeVerticalConstraintFromShift - Compute vertical constraint
 * @property {Function} _calculateVerticalBitShift - Calculate vertical shift amount
 */

/**
 * @typedef {Object} EdgeMasks
 * @property {Uint32Array} [notTop] - Mask preventing expansion beyond top edge
 * @property {Uint32Array} [notBottom] - Mask preventing expansion beyond bottom edge
 * @property {Uint32Array} [notLeft] - Mask preventing expansion beyond left edge
 * @property {Uint32Array} [notRight] - Mask preventing expansion beyond right edge
 */

/**
 * @typedef {Object} ConstraintPair
 * @property {Uint32Array} leftConstraint - Left/up neighbor constraint
 * @property {Uint32Array} rightConstraint - Right/down neighbor constraint
 */

/**
 * @typedef {Object} VerticalConstraints
 * @property {Uint32Array} upShifted - Constraint for cells above
 * @property {Uint32Array} downShifted - Constraint for cells below
 */

/**
 * Store32Morphology - Helper utilities for Store32 (Uint32Array) morphology.
 *
 * Isolates morphology-specific operations from Store32 to maintain separation
 * of concerns. Store32 focuses on Uint32Array storage semantics while this class
 * handles morphological operation logic.
 *
 * Key differences from BigStoreMorphology:
 * - Works with Uint32Array instead of monolithic BigInt
 * - Requires word-by-word processing and boundary handling
 * - Respects 32-bit word boundaries throughout
 * - Uses store helper methods for bitwise operations
 *
 * Operations are split by storage type:
 * - Shift-based: for 1-bit (occupancy) grids using fast bit operations
 * - Cell-wise: for multi-bit (colored) grids using per-cell iteration
 *
 * @class Store32Morphology
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
   * Handles both scalar and array inputs gracefully.
   *
   * @static
   * @param {Uint32Array|number|null|undefined} maskValue - Value to normalize
   * @returns {Uint32Array} Normalized edge mask as single-word array (or 0 if falsy)
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
   * Algorithm: For each non-zero cell, set value in current and adjacent columns
   * if within bounds. Creates new array with expanded colors.
   *
   * @static
   * @param {Store32Instance} store - Store32 instance with width, height, size properties
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
   * Algorithm: For each non-zero cell, set value in current and adjacent rows
   * if within bounds. Creates new array with expanded colors.
   *
   * @static
   * @param {Store32Instance} store - Store32 instance with width, height, size properties
   * @param {Uint32Array} bitboard - Input colored bitboard
   * @param {number} gridWidth - Width in cells (for row offset calculation = gridWidth * bitsPerCell)
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
   * Algorithm:
   * 1. Optionally apply edge masks to restrict expansion
   * 2. Shift bitboard up and down by gridWidth bits
   * 3. OR all three versions (original, up-shifted, down-shifted)
   * 4. Apply full-bits mask to each word
   *
   * @static
   * @param {Store32Instance} store - Store32 instance with shiftBits and combineMasked methods
   * @param {Uint32Array} bitboard - Input 1-bit occupancy bitboard
   * @param {number} gridWidth - Width in cells (shift amount = gridWidth * bitsPerCell)
   * @param {EdgeMasks} [edgeMasks] - Edge masks to restrict boundary expansion (optional)
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
   * Algorithm: Iterate all cells, test survival condition, clear non-surviving cells.
   *
   * @static
   * @param {Store32Instance} store - Store32 instance with cellSurvivesHorizontalErosion method
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
   * Algorithm: Iterate all cells, test survival condition, clear non-surviving cells.
   *
   * @static
   * @param {Store32Instance} store - Store32 instance with cellSurvivesVerticalErosion method
   * @param {Uint32Array} bitboard - Input colored bitboard
   * @param {number} gridWidth - Grid width in cells (used for neighbor offset calculation)
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
   * Delegates to store helper for format-specific mask generation and inversion.
   *
   * @static
   * @param {Store32Instance} store - Store32 instance with _createInvertedMask method
   * @param {EdgeMasks|undefined} edgeMasks - Edge masks configuration
   * @param {string} maskKey - Key of mask to invert (e.g., 'notLeft', 'notRight')
   * @returns {Uint32Array} Inverted edge mask value
   */
  static computeInvertedEdgeMask (store, edgeMasks, maskKey) {
    return store._createInvertedMask(edgeMasks, maskKey)
  }

  /**
   * Create horizontal erosion constraints from a shift and inverted mask.
   * Shifts bitboard and combines with inverted mask for erosion boundary.
   *
   * @static
   * @param {Store32Instance} store - Store32 instance with shiftBits and bitOr methods
   * @param {Uint32Array} bitboard - Input bitboard to shift
   * @param {number} bitShift - Number of bits to shift per word
   * @param {Uint32Array} invertedMask - Inverted edge mask to apply
   * @returns {Uint32Array} Constraint bitboard for erosion
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
   * Calculates left and right neighbor constraints for erosion operation.
   *
   * @static
   * @param {Store32Instance} store - Store32 instance
   * @param {Uint32Array} bitboard - Input bitboard
   * @param {EdgeMasks|undefined} edgeMasks - Edge masks configuration
   * @param {number} bitShift - Bit shift amount (usually bitsPerCell)
   * @returns {ConstraintPair} Left and right neighbor constraints
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
   * Removes cells that lack horizontal neighbors using shift-based constraints.
   *
   * Algorithm:
   * 1. If no edge masks, return unmodified bitboard
   * 2. Compute left and right neighbor constraints
   * 3. AND bitboard with both constraints to keep only cells with both neighbors
   *
   * @static
   * @param {Store32Instance} store - Store32 instance
   * @param {Uint32Array} bitboard - Input 1-bit bitboard
   * @param {EdgeMasks|undefined} edgeMasks - Edge masks configuration (optional)
   * @returns {Uint32Array} Eroded bitboard
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
   * Calculates up and down neighbor constraints for vertical erosion.
   *
   * Algorithm: Delegates to store helpers for constraint calculation at specific shifts.
   *
   * @static
   * @param {Store32Instance} store - Store32 instance
   * @param {Uint32Array} bitboard - Input bitboard
   * @param {number} gridWidth - Width in cells (for shift calculation)
   * @param {EdgeMasks|undefined} edgeMasks - Edge masks configuration (optional)
   * @param {number} bitShift - Bit shift amount (gridWidth * bitsPerCell)
   * @returns {VerticalConstraints} Up and down neighbor constraints
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
   * Removes cells that lack vertical neighbors using shift-based constraints.
   *
   * Algorithm:
   * 1. Calculate vertical bit shift (gridWidth * bitsPerCell)
   * 2. Compute up and down neighbor constraints
   * 3. AND bitboard with both constraints to keep only cells with both neighbors
   * 4. Apply full-bits mask to each word
   *
   * @static
   * @param {Store32Instance} store - Store32 instance
   * @param {Uint32Array} bitboard - Input 1-bit bitboard
   * @param {number} gridWidth - Width in cells (for neighbor offset)
   * @param {EdgeMasks|undefined} edgeMasks - Edge masks configuration (optional)
   * @returns {Uint32Array} Eroded bitboard
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
