/**
 * Manages bitboard operations for grid-like data structures.
 * Wraps a bit store implementation with convenient methods for iteration,
 * filtering, and analysis over grids. Supports both generic iteration
 * and optimized iteration for occupied cells.
 *
 * @class BitGrid
 */
export class BitGrid {
  /**
   * Initializes a BitGrid with optional dimension overrides.
   *
   * @param {Object} store - Bit store implementation with index/get/has operations
   * @param {number} [width=null] - Grid width in cells; defaults to store.width
   * @param {number} [height=null] - Grid height in cells; defaults to store.height
   * @param {boolean} [fast=false] - Enable fast path optimization via store.bitsOccupied()
   */
  constructor (store, width = null, height = null, fast = false) {
    this.store = store
    this.width = width || this.store.width || 0
    this.height = height || this.store.height || 0
    this.fast = fast
  }

  /**
   * Total cell count (width × height).
   *
   * @type {number}
   */
  get area () {
    return this.width * this.height
  }
  /**
   * Executes a callback for each cell index in the grid.
   *
   * @param {(index: number) => void} callback - Function called with cell index
   * @returns {void}
   */
  forEachCell (callback) {
    for (let index = 0; index < this.area; index++) {
      callback(index)
    }
  }

  /**
   * Executes a callback for each set cell in the bitboard.
   * Uses store.hasIdxSet to filter only set bits (non-zero values).
   *
   * @param {bigint} bitboard - Bitboard to iterate
   * @param {(index: number) => void} callback - Function called with index of each set cell
   * @returns {void}
   */
  forEachSetCell (bitboard, callback) {
    for (let index = 0; index < this.area; index++) {
      if (this.store.hasIdxSet(bitboard, index)) {
        callback(index)
      }
    }
  }

  /**
   * Internal: Execute callback for each index in range [0, count).
   * Extracted helper to reduce iteration pattern duplication.
   *
   * @param {number} count - Number of iterations (0 to count-1)
   * @param {(index: number) => void} callback - Function called for each index
   * @returns {void}
   * @private
   */
  #forEachInRange (count, callback) {
    for (let index = 0; index < count; index++) {
      callback(index)
    }
  }

  /**
   * Executes a callback for each row index.
   *
   * @param {(rowIndex: number) => void} callback - Function called with row index
   * @returns {void}
   */
  forEachRow (callback) {
    this.#forEachInRange(this.height, callback)
  }

  /**
   * Generator yielding [x, y] coordinate pairs for all cells.
   *
   * @param {bigint} [bitboard] - Optional bitboard (if provided, only yields occupied cells)
   * @generator
   * @yields {[number, number]} [x, y] coordinate tuples
   */
  *locations (bitboard) {
    const cellIndices =
      bitboard == null ? this.indices() : this.#occupiedIndices(bitboard)
    for (const index of cellIndices) {
      const { x, y } = this.indexToLocation(index)
      yield [x, y]
    }
  }

  /**
   * Generator yielding [x, y, value] tuples for all or occupied cells.
   * When fast path is enabled and bitWidth === 1, yields value as 1 for occupied cells.
   *
   * @param {bigint} bitboard - Bitboard to iterate
   * @param {boolean} [occupiedOnly=false] - If true, only yield occupied cells; otherwise yield all
   * @generator
   * @yields {[number, number, bigint]} [x, y, value] coordinate and value tuples
   */
  *locationsWithValues (bitboard, occupiedOnly = false) {
    const useValueProvider = this.#shouldUseFastPath(bitboard)
    const cellIndices = occupiedOnly
      ? this.#occupiedIndices(bitboard)
      : this.indices()

    for (const index of cellIndices) {
      const { x, y } = this.indexToLocation(index)
      const value = useValueProvider ? 1n : this.store.getIdx(bitboard, index)

      // Skip zero values if occupiedOnly requested
      if (occupiedOnly && value === 0n) continue

      yield [x, y, value]
    }
  }

  /**
   * Internal: Generate occupied cell indices using fast path if available.
   * Delegates to store.bitsOccupied for efficiency when enabled.
   *
   * @param {bigint} bitboard - Bitboard to iterate
   * @generator
   * @yields {number} Index of each occupied cell
   * @private
   */
  *#occupiedIndices (bitboard) {
    if (this.fast && this.store.bitsOccupied) {
      yield* this.store.bitsOccupied(bitboard, this.area)
    } else {
      for (const [index, value] of this.idxFilled(bitboard)) {
        yield index
      }
    }
  }

  /**
   * Internal: Determine if fast path optimization should be used.
   * Fast path applies when: fast mode enabled, store supports bitsOccupied, and bitWidth === 1.
   *
   * @param {bigint} bitboard - Bitboard to check
   * @returns {boolean} True if fast path should be used for value retrieval
   * @private
   */
  #shouldUseFastPath (bitboard) {
    return this.fast && this.store.bitsOccupied && this.store.bitWidth === 1
  }

  /**
   * Legacy alias for locationsWithValues(bitboard, false).
   * Yields all cells with their values.
   *
   * @deprecated Use locationsWithValues(bitboard, false) instead
   * @param {bigint} bitboard - Bitboard to iterate
   * @generator
   * @yields {[number, number, bigint]} [x, y, value] tuples
   */
  *locationAndValues (bitboard) {
    yield* this.locationsWithValues(bitboard, false)
  }

  /**
   * Legacy alias for locations(bitboard).
   * Yields coordinates for occupied cells only.
   *
   * @deprecated Use locations(bitboard) instead
   * @param {bigint} bitboard - Bitboard to iterate
   * @generator
   * @yields {[number, number]} [x, y] coordinate tuples
   */
  *occupiedLocations (bitboard) {
    yield* this.locations(bitboard)
  }

  /**
   * Legacy alias for locationsWithValues(bitboard, true).
   * Yields coordinates and values for occupied cells with fast path optimization.
   *
   * @deprecated Use locationsWithValues(bitboard, true) instead
   * @param {bigint} bitboard - Bitboard to iterate
   * @generator
   * @yields {[number, number, bigint]} [x, y, value] tuples
   */
  *occupiedLocationsAndValues (bitboard) {
    yield* this.locationsWithValues(bitboard, true)
  }

  /**
   * Legacy alias maintained for backward compatibility.
   * This method is now consolidated into locationsWithValues() core logic.
   *
   * @deprecated Use locationsWithValues(bitboard, true) instead
   * @param {bigint} bitboard - Bitboard to iterate
   * @generator
   * @yields {[number, number, bigint]} [x, y, 1] tuples
   */
  *occupiedLocationsAndValuesFast (bitboard) {
    yield* this.locationsWithValues(bitboard, true)
  }
  /**
   * Converts a linear cell index to [x, y] grid coordinates.
   * Uses row-major ordering: index = row * width + column.
   * Inverse of: index = y * width + x
   *
   * @param {number} index - Linear index (0 to area-1)
   * @returns {{x: number, y: number}} Coordinate pair where x is column, y is row
   */
  indexToLocation (index) {
    const x = index % this.width
    const y = Math.floor(index / this.width)
    return { x, y }
  }

  /**
   * Generator yielding cell values for all indices.
   * Retrieves value from store for each cell position.
   *
   * @param {bigint} bitboard - Bitboard to read from
   * @generator
   * @yields {bigint} Cell value at each index
   */
  *values (bitboard) {
    for (const index of this.indices()) {
      yield this.store.getIdx(bitboard, index)
    }
  }

  /**
   * Generator yielding [index, value] pairs for all cells.
   * Combines cell position with its value from the bitboard.
   *
   * @param {bigint} bitboard - Bitboard to read from
   * @generator
   * @yields {[number, bigint]} [index, value] pairs for each cell
   */
  *idxCells (bitboard) {
    for (const index of this.indices()) {
      yield [index, this.store.getIdx(bitboard, index)]
    }
  }

  /**
   * Generator yielding [index, value] pairs for only non-zero cells.
   * Automatically chooses fast path via store.bitsOccupied if enabled.
   * Use idxBits() if only indices are needed for better performance.
   *
   * @param {bigint} bitboard - Bitboard to iterate
   * @generator
   * @yields {[number, bigint]} [index, value] pairs where value !== 0n
   */
  *idxFilled (bitboard) {
    if (this.fast && this.store.bitsOccupied) {
      yield* this.#idxFilledFast(bitboard)
      return
    }
    for (const [index, value] of this.idxCells(bitboard)) {
      if (value !== 0n) {
        yield [index, value]
      }
    }
  }

  /**
   * Internal: Optimized iteration for occupied cells using store.bitsOccupied.
   * Retrieves values only for indices returned by store method (avoiding zero check).
   *
   * @param {bigint} bitboard - Bitboard to iterate
   * @generator
   * @yields {[number, bigint]} [index, value] pairs via bitsOccupied fast path
   * @private
   */
  *#idxFilledFast (bitboard) {
    for (const index of this.store.bitsOccupied(bitboard, this.area)) {
      yield [index, this.store.getIdx(bitboard, index)]
    }
  }

  /**
   * Generator yielding indices of occupied (non-zero) cells.
   * Delegates to store.bitsOccupied for optimized bit enumeration.
   * Faster than idxFilled when values are not needed.
   *
   * @param {bigint} bitboard - Bitboard to iterate
   * @generator
   * @yields {number} Index of each occupied cell
   */
  *idxBits (bitboard) {
    yield* this.store.bitsOccupied(bitboard, this.area)
  }

  /**
   * Generator yielding [index, value] pairs for cells matching a specific value.
   * Searches all cells for exact value match.
   *
   * @param {bigint} bitboard - Bitboard to search
   * @param {bigint} searchValue - Value to find and match
   * @generator
   * @yields {[number, bigint]} [index, value] pairs where value === searchValue
   */
  *idxFilledWith (bitboard, searchValue) {
    for (const [index, value] of this.idxCells(bitboard)) {
      if (value === searchValue) {
        yield [index, value]
      }
    }
  }
  /**
   * Finds the maximum cell value in the bitboard (as BigInt).
   * Use maxNumber() to convert to Number type.
   * Returns 0n if all cells are empty.
   *
   * @param {bigint} bitboard - Bitboard to analyze
   * @returns {bigint} Maximum value found (0n if empty)
   */
  maxValue (bitboard) {
    return this.#extremeValue(bitboard, (a, b) => a > b, 0n)
  }

  /**
   * Finds the maximum cell value and converts result to Number type.
   * Convenience wrapper for maxValue(); equivalent to Number(maxValue(bitboard)).
   *
   * @param {bigint} bitboard - Bitboard to analyze
   * @returns {number} Maximum value as Number (0 if empty)
   */
  maxNumber (bitboard) {
    return Number(this.maxValue(bitboard))
  }

  /**
   * Finds the minimum cell value in the bitboard (as BigInt).
   * Use minNumber() to convert to Number type.
   * May return 0n if any cells contain zero.
   *
   * @param {bigint} bitboard - Bitboard to analyze
   * @returns {bigint} Minimum value found (0n or higher)
   */
  minValue (bitboard) {
    return this.#extremeValue(bitboard, (a, b) => a < b, Infinity)
  }

  /**
   * Finds the minimum cell value and converts result to Number type.
   * Convenience wrapper for minValue(); equivalent to Number(minValue(bitboard)).
   *
   * @param {bigint} bitboard - Bitboard to analyze
   * @returns {number} Minimum value as Number (0 or higher)
   */
  minNumber (bitboard) {
    return Number(this.minValue(bitboard))
  }

  /**
   * Internal: Find extreme value (minimum or maximum) using a comparator function.
   * Single implementation shared by minValue/maxValue to eliminate duplication.
   * Iterates through all cell values and applies comparator to track extremum.
   *
   * @param {bigint} bitboard - Bitboard to analyze
   * @param {(current: bigint|number, extreme: bigint|number) => boolean} comparator - Comparison function returns true if current is more extreme
   * @param {bigint|number} initialValue - Starting value for comparison (0n for max, Infinity for min)
   * @returns {bigint|number} Extreme value found using comparator
   * @private
   */
  #extremeValue (bitboard, comparator, initialValue) {
    let extremeValue = initialValue
    for (const cellValue of this.values(bitboard)) {
      if (comparator(cellValue, extremeValue)) {
        extremeValue = cellValue
      }
    }
    return extremeValue
  }
  /**
   * Executes a callback for each row index.
   *
   * @param {(rowIndex: number) => void} callback - Function called with row index
   * @returns {void}
   */
  forEachRow (callback) {
    this.#forEachInRange(this.height, callback)
  }

  /**
   * Creates a row mask matching the grid's width.
   * Mask represents one complete row (all columns set for a single row).
   * Delegates to store for format-specific mask generation.
   *
   * @returns {bigint} Bit mask representing one full row in this grid
   */
  rowMask () {
    return this.store.rowMaskForWidth(this.width)
  }
}
