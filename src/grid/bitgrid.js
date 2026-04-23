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
   * @param {Function} callback - Function(index) called for each cell
   * @returns {void}
   */
  forEachCell (callback) {
    for (let index = 0; index < this.area; index++) {
      callback(index)
    }
  }

  /**
   * Executes a callback for each set cell in the bitboard.
   * Uses store.hasIdxSet to filter only set bits.
   *
   * @param {bigint} bitboard - Bitboard to iterate
   * @param {Function} callback - Function(index) called for set cells
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
   * Generator yielding all cell indices in order.
   *
   * @generator
   * @yields {number} Linear index for each cell
   */
  *indices () {
    for (let index = 0; index < this.area; index++) {
      yield index
    }
  }

  /**
   * Generator yielding [x, y] coordinate pairs for all cells.
   *
   * @generator
   * @yields {Array<number>} [x, y] tuples
   */
  *locations () {
    for (const index of this.indices()) {
      const { x, y } = this.indexToLocation(index)
      yield [x, y]
    }
  }
  *locationAndValues (bitboard) {
    for (const index of this.indices()) {
      const { x, y } = this.indexToLocation(index)
      const value = this.store.getIdx(bitboard, index)
      yield [x, y, value]
    }
  }
  *occupiedLocations (bitboard) {
    for (const [index] of this.idxFilled(bitboard)) {
      const { x, y } = this.indexToLocation(index)
      yield [x, y]
    }
  }

  /**
   * Generator yielding [x, y] coordinates for only occupied cells.
   * Skips empty cells using idxFilled for efficiency.
   *
   * @param {bigint} bitboard - Bitboard to iterate
   * @generator
   * @yields {Array<number>} [x, y] tuples for occupied cells
   */
  *occupiedLocationsAndValues (bitboard) {
    if (this.store.bitWidth === 1) {
      return yield* this.occupiedLocationsAndValuesFast(bitboard)
    }
    for (const [index] of this.idxFilled(bitboard)) {
      const { x, y } = this.indexToLocation(index)
      const value = this.store.getIdx(bitboard, index)
      yield [x, y, value]
    }
  }
  *occupiedLocationsAndValuesFast (bitboard) {
    for (const [index] of this.idxFilled(bitboard)) {
      const { x, y } = this.indexToLocation(index)
      yield [x, y, 1]
    }
  }
  /**
   * Converts a linear index to 2D coordinates.
   *
   * @param {number} index - Linear index
   * @returns {Object} {x, y} coordinate pair
   */
  indexToLocation (index) {
    const x = index % this.width
    const y = Math.floor(index / this.width)
    return { x, y }
  }

  /**
   * Generator yielding cell values for all indices.
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
   *
   * @param {bigint} bitboard - Bitboard to read from
   * @generator
   * @yields {Array} [index, value] tuples
   */
  *idxCells (bitboard) {
    for (const index of this.indices()) {
      yield [index, this.store.getIdx(bitboard, index)]
    }
  }

  /**
   * Generator yielding [index, value] pairs for only non-zero cells.
   * Automatically chooses fast path if enabled and available.
   *
   * @param {bigint} bitboard - Bitboard to iterate
   * @generator
   * @yields {Array} [index, value] tuples where value !== 0n
   */
  *idxFilled (bitboard) {
    if (this.fast && this.store.bitsOccupied) {
      return yield* this.#idxFilledFast(bitboard)
    }
    for (const [index, value] of this.idxCells(bitboard)) {
      if (value !== 0n) {
        yield [index, value]
      }
    }
  }

  /**
   * Generator yielding [index, value] pairs using store.bitsOccupied optimization.
   * Used internally by idxFilled when fast mode is enabled.
   *
   * @param {bigint} bitboard - Bitboard to iterate
   * @generator
   * @yields {Array} [index, value] tuples via bitsOccupied
   */
  *#idxFilledFast (bitboard) {
    for (const index of this.store.bitsOccupied(bitboard, this.area)) {
      yield [index, this.store.getIdx(bitboard, index)]
    }
  }

  /**
   * Generator yielding indices of occupied cells via store.bitsOccupied.
   *
   * @param {bigint} bitboard - Bitboard to iterate
   * @generator
   * @yields {number} Indices where cells are occupied
   */
  *idxBits (bitboard) {
    return yield* this.store.bitsOccupied(bitboard, this.area)
  }

  /**
   * Generator yielding [index, value] pairs for cells matching a specific value.
   *
   * @param {bigint} bitboard - Bitboard to search
   * @param {bigint} searchValue - Value to match
   * @generator
   * @yields {Array} [index, value] tuples where value === searchValue
   */
  *idxFilledWith (bitboard, searchValue) {
    for (const [index, value] of this.idxCells(bitboard)) {
      if (value === searchValue) {
        yield [index, value]
      }
    }
  }
  /**
   * Finds the maximum cell value in the bitboard.
   * Returns BigInt value; use maxNumber() for Number conversion.
   *
   * @param {bigint} bitboard - Bitboard to analyze
   * @returns {bigint} Maximum value found, or 0n if all cells empty
   */
  maxValue (bitboard) {
    return this.#extremeValue(bitboard, (a, b) => a > b, 0n)
  }

  /**
   * Finds the maximum cell value and converts to Number.
   *
   * @param {bigint} bitboard - Bitboard to analyze
   * @returns {number} Maximum value as Number
   */
  maxNumber (bitboard) {
    return Number(this.maxValue(bitboard))
  }

  /**
   * Finds the minimum cell value in the bitboard.
   * Returns BigInt value; use minNumber() for Number conversion.
   *
   * @param {bigint} bitboard - Bitboard to analyze
   * @returns {bigint} Minimum value found (may be 0n)
   */
  minValue (bitboard) {
    return this.#extremeValue(bitboard, (a, b) => a < b, Infinity)
  }

  /**
   * Finds the minimum cell value and converts to Number.
   *
   * @param {bigint} bitboard - Bitboard to analyze
   * @returns {number} Minimum value as Number
   */
  minNumber (bitboard) {
    return Number(this.minValue(bitboard))
  }

  /**
   * Helper to find extreme value (min or max) using a comparator.
   * Eliminates duplication between minValue and maxValue logic.
   *
   * @param {bigint} bitboard - Bitboard to analyze
   * @param {Function} comparator - Function(current, extreme) → boolean
   * @param {bigint|number} initialValue - Starting value for comparison
   * @returns {bigint|number} Extreme value found
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
   * @param {Function} callback - Function(rowIndex) called for each row
   * @returns {void}
   */
  forEachRow (callback) {
    for (let row = 0; row < this.height; row++) {
      callback(row)
    }
  }

  /**
   * Generator yielding all row indices.
   *
   * @generator
   * @yields {number} Row index for each row
   */
  *rows () {
    for (let row = 0; row < this.height; row++) {
      yield row
    }
  }

  /**
   * Creates a row mask matching the grid's width.
   * Delegates to store for format-specific mask generation.
   *
   * @returns {bigint} Bit mask representing one row
   */
  rowMask () {
    return this.store.rowMaskForWidth(this.width)
  }
}
