/**
 * Store32Morphology - Helper utilities for Store32 morphology.
 *
 * This module isolates morphology-specific operations from Store32 so that
 * Store32 stays focused on Uint32Array storage semantics and bitboard representation.
 */
export class Store32Morphology {
  /**
   * Normalize an edge mask value for Uint32Array bitwise calculations.
   * @param {Uint32Array|number|null|undefined} maskValue
   * @returns {Uint32Array}
   */
  static normalizeEdgeMask (maskValue) {
    if (maskValue instanceof Uint32Array) return maskValue
    return new Uint32Array([maskValue || 0])
  }

  /**
   * Expand each populated cell into its horizontal neighbors.
   * @param {Object} store - Store32 instance
   * @param {Uint32Array} bitboard
   * @returns {Uint32Array}
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
   * @param {Object} store - Store32 instance
   * @param {Uint32Array} bitboard
   * @param {number} gridWidth
   * @returns {Uint32Array}
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
   * @param {Object} store - Store32 instance
   * @param {Uint32Array} bitboard
   * @param {number} gridWidth
   * @param {Object} edgeMasks
   * @returns {Uint32Array}
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
   * @param {Object} store - Store32 instance
   * @param {Uint32Array} bitboard
   * @returns {Uint32Array}
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
   * @param {Object} store - Store32 instance
   * @param {Uint32Array} bitboard
   * @param {number} gridWidth
   * @returns {Uint32Array}
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
