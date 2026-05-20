/**
 * MultiColorMorphology - Optimized morphology for multi-bit (colored) grids
 *
 * Specializes dilation and erosion for multi-bit grids where each cell can
 * have a color value (depth > 1). Uses per-cell iteration rather than bit
 * shifts, as bit shifts don't preserve color information across boundaries.
 *
 * Multi-color approach:
 * - Dilation: Propagate colors into neighboring cells
 * - Erosion: Keep colors only if neighbors exist in all directions
 * - Respects grid boundaries without needing edge masks
 *
 * @see RectMorphologyOps for high-level operation orchestration
 * @see BigStoreMorphology, Store32Morphology for per-cell operation helpers
 */
export class MultiColorMorphology {
  /**
   * Initialize multi-bit morphology handler
   * @param {Object} store - Store instance (StoreBig or Store32)
   */
  constructor (store) {
    this.store = store

    if (!store.isMultiBit) {
      throw new Error('MultiColorMorphology requires isMultiBit === true')
    }
  }

  // ============================================================================
  // DILATION - PER-CELL PROPAGATION
  // ============================================================================

  /**
   * Dilate colored grid by propagating colors into neighboring cells.
   * Each occupied cell spreads its color to adjacent cells.
   * @param {bigint|Uint32Array} bitboard - Input colored bits
   * @param {number} gridWidth - Grid width
   * @param {number} radius - Number of dilation steps
   * @returns {bigint|Uint32Array} Dilated colored bits
   */
  dilate (bitboard, gridWidth, radius = 1) {
    if (radius <= 0) return bitboard

    let result = bitboard

    for (let step = 0; step < radius; step++) {
      // Horizontal propagation: expand left and right
      result = this._dilateHorizontalStep(result)

      // Vertical propagation: expand up and down
      result = this._dilateVerticalStep(result, gridWidth)
    }

    return result
  }

  /**
   * Single horizontal dilation step: each cell propagates to left/right.
   * Respects column boundaries (no wrap-around).
   * @private
   */
  _dilateHorizontalStep (bitboard) {
    if (this.store.expandHorizontallyCellwise) {
      return this.store.expandHorizontallyCellwise(bitboard)
    }

    // Fallback for stores without the optimized method
    return this._dilateHorizontalIterative(bitboard)
  }

  /**
   * Iterative horizontal dilation when optimized method unavailable.
   * Iterate cells and propagate values to neighbors.
   * @private
   */
  _dilateHorizontalIterative (bitboard) {
    const width = this.store.width
    let result = bitboard

    const size = width * this.store.height
    for (let idx = 0; idx < size; idx++) {
      const value = this.store.getIdx(bitboard, idx)
      if (value === 0) continue

      const col = idx % width

      // Propagate to left neighbor
      if (col > 0) {
        result = this.store.setIdx(result, idx - 1, value)
      }

      // Propagate to right neighbor
      if (col < width - 1) {
        result = this.store.setIdx(result, idx + 1, value)
      }
    }

    return result
  }

  /**
   * Single vertical dilation step: each cell propagates to up/down.
   * Respects row boundaries.
   * @private
   */
  _dilateVerticalStep (bitboard, gridWidth) {
    if (this.store.propagateVerticalCellwise) {
      return this.store.propagateVerticalCellwise(bitboard, gridWidth)
    }

    // Fallback for stores without the optimized method
    return this._dilateVerticalIterative(bitboard, gridWidth)
  }

  /**
   * Iterative vertical dilation when optimized method unavailable.
   * @private
   */
  _dilateVerticalIterative (bitboard, gridWidth) {
    const height = this.store.height
    let result = bitboard

    const size = gridWidth * height
    for (let idx = 0; idx < size; idx++) {
      const value = this.store.getIdx(bitboard, idx)
      if (value === 0) continue

      const row = Math.floor(idx / gridWidth)

      // Propagate up
      if (row > 0) {
        result = this.store.setIdx(result, idx - gridWidth, value)
      }

      // Propagate down
      if (row < height - 1) {
        result = this.store.setIdx(result, idx + gridWidth, value)
      }
    }

    return result
  }

  // ============================================================================
  // EROSION - SURVIVAL-BASED APPROACH
  // ============================================================================

  /**
   * Erode colored grid by removing colors from cells without neighbors.
   * A cell survives only if it has occupied neighbors in all 4 cardinal directions.
   * @param {bigint|Uint32Array} bitboard - Input colored bits
   * @param {number} gridWidth - Grid width
   * @param {number} radius - Number of erosion steps
   * @returns {bigint|Uint32Array} Eroded colored bits
   */
  erode (bitboard, gridWidth, radius = 1) {
    if (radius <= 0) return bitboard

    let result = bitboard

    for (let step = 0; step < radius; step++) {
      // Horizontal erosion: keep cells with neighbors
      result = this._erodeHorizontalStep(result)

      // Vertical erosion: keep cells with neighbors
      result = this._erodeVerticalStep(result, gridWidth)
    }

    return result
  }

  /**
   * Single horizontal erosion step: remove cells without left/right neighbors.
   * @private
   */
  _erodeHorizontalStep (bitboard) {
    if (this.store.erodeHorizontalCellwise) {
      return this.store.erodeHorizontalCellwise(bitboard)
    }

    // Fallback: iterative approach
    return this._erodeHorizontalIterative(bitboard)
  }

  /**
   * Iterative horizontal erosion when optimized method unavailable.
   * Check each cell for left/right neighbors.
   * @private
   */
  _erodeHorizontalIterative (bitboard) {
    const width = this.store.width
    let result = bitboard
    const size = width * this.store.height

    for (let idx = 0; idx < size; idx++) {
      const value = this.store.getIdx(bitboard, idx)
      if (value === 0) continue

      const col = idx % width
      const hasLeft = col > 0 && this.store.getIdx(bitboard, idx - 1) !== 0
      const hasRight =
        col < width - 1 && this.store.getIdx(bitboard, idx + 1) !== 0

      // Remove if missing left OR right neighbor
      if (!hasLeft || !hasRight) {
        result = this.store.setIdx(result, idx, 0)
      }
    }

    return result
  }

  /**
   * Single vertical erosion step: remove cells without up/down neighbors.
   * @private
   */
  _erodeVerticalStep (bitboard, gridWidth) {
    if (this.store.erodeVerticalCellwise) {
      return this.store.erodeVerticalCellwise(bitboard, gridWidth)
    }

    // Fallback: iterative approach
    return this._erodeVerticalIterative(bitboard, gridWidth)
  }

  /**
   * Iterative vertical erosion when optimized method unavailable.
   * Check each cell for up/down neighbors.
   * @private
   */
  _erodeVerticalIterative (bitboard, gridWidth) {
    const height = this.store.height
    let result = bitboard
    const size = gridWidth * height

    for (let idx = 0; idx < size; idx++) {
      const value = this.store.getIdx(bitboard, idx)
      if (value === 0) continue

      const row = Math.floor(idx / gridWidth)
      const hasUp =
        row > 0 && this.store.getIdx(bitboard, idx - gridWidth) !== 0
      const hasDown =
        row < height - 1 && this.store.getIdx(bitboard, idx + gridWidth) !== 0

      // Remove if missing up OR down neighbor
      if (!hasUp || !hasDown) {
        result = this.store.setIdx(result, idx, 0)
      }
    }

    return result
  }
}
