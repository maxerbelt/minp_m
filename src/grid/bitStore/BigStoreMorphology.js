/**
 * BigStoreMorphology - Helper utilities for BigInt store morphology.
 *
 * This module isolates morphology-specific operations from StoreBig so that
 * StoreBig stays focused on BigInt storage semantics and bitboard representation.
 */
export class BigStoreMorphology {
  /**
   * Normalize an edge mask value for BigInt bitwise calculations.
   * @param {bigint|number|null|undefined} maskValue
   * @returns {bigint}
   */
  static normalizeEdgeMask (maskValue) {
    return typeof maskValue === 'bigint' ? maskValue : BigInt(maskValue || 0n)
  }

  /**
   * Expand each populated cell into its horizontal neighbors.
   * @param {Object} store - StoreBig instance
   * @param {bigint} bitboard
   * @returns {bigint}
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
   * @param {Object} store - StoreBig instance
   * @param {bigint} bitboard
   * @param {number} gridWidth
   * @returns {bigint}
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
   * @param {Object} store - StoreBig instance
   * @param {bigint} bitboard
   * @param {number} gridWidth
   * @param {Object} edgeMasks
   * @returns {bigint}
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
   * @param {Object} store - StoreBig instance
   * @param {bigint} bitboard
   * @returns {bigint}
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
   * @param {Object} store - StoreBig instance
   * @param {bigint} bitboard
   * @param {number} gridWidth
   * @returns {bigint}
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
