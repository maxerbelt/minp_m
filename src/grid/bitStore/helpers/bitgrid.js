/**
 * @typedef {Object} BitStore
 * @property {number} [width] - Grid width in cells (optional)
 * @property {number} [height] - Grid height in cells (optional)
 * @property {number} [bitWidth] - Bit width per cell (1 for boolean, >1 for multi-color)
 * @property {Function} getIdx - Get value at index: (bitboard: bigint, index: number) => bigint
 * @property {Function} hasIdxSet - Check if index has set bit: (bitboard: bigint, index: number) => boolean
 * @property {Function} setIdx - Set value at index: (bitboard: bigint, index: number, value: bigint) => bigint
 * @property {Function} [bitsOccupied] - Optional fast path for occupied indices: (bitboard: bigint, area: number) => Generator<number>
 * @property {Function} [rowMaskForWidth] - Generate row mask: (width: number) => bigint
 */

/**
 * @typedef {Object} Coordinate
 * @property {number} x - Column index (0 to width-1)
 * @property {number} y - Row index (0 to height-1)
 */

/**
 * Manages bitboard operations for grid-like data structures.
 *
 * Wraps a bit store implementation with convenient methods for iteration,
 * filtering, and analysis over grids. Supports both generic iteration
 * and optimized iteration for occupied cells via fast path when available.
 *
 * Key features:
 * - Row-major indexing (index = y * width + x)
 * - Generator-based iteration for memory efficiency
 * - Fast path optimization for 1-bit stores via store.bitsOccupied()
 * - Coordinate ↔ index conversion utilities
 * - Aggregate functions (min/max value calculation)
 *
 * @class BitGrid
 * @property {BitStore} store - Bit store implementation with index/get/has operations
 * @property {number} width - Grid width in cells
 * @property {number} height - Grid height in cells
 * @property {boolean} fast - Enable fast path optimization via store.bitsOccupied()
 *
 * @example
 * const grid = new BitGrid(store, 8, 8, true);
 * for (const [x, y] of grid.locations(bitboard)) {
 *   console.log(`Cell at ${x}, ${y}`);
 * }
 */
export class BitGrid {
  /**
   * Initializes a BitGrid with optional dimension overrides.
   *
   * @param {BitStore} store - Bit store implementation with index/get/has operations
   * @param {number} [width=null] - Grid width in cells; defaults to store.width if omitted
   * @param {number} [height=null] - Grid height in cells; defaults to store.height if omitted
   * @param {boolean} [fast=false] - Enable fast path optimization via store.bitsOccupied() for 1-bit stores
   */
  constructor (store, width = null, height = null, fast = false) {
    this.store = store
    this.width = width || this.store.width || 0
    this.height = height || this.store.height || 0
    this.fast = fast
  }

  /**
   * Total cell count (width × height).
   * Represents the number of cells in the grid.
   *
   * @type {number}
   * @readonly
   */
  get area () {
    return this.width * this.height
  }
  /**
   * Executes a callback for each cell index in the grid.
   * Iterates sequentially from 0 to (area - 1) in row-major order.
   *
   * @param {(index: number) => void} callback - Function called with each cell index
   * @returns {void}
   */
  forEachCell (callback) {
    for (let index = 0; index < this.area; index++) {
      callback(index)
    }
  }

  /**
   * Executes a callback for each set (non-zero) cell in the bitboard.
   * Uses store.hasIdxSet to filter only set bits for efficient iteration.
   * Automatically selects fast path if enabled and store.bitsOccupied is available.
   *
   * @param {bigint} bitboard - Bitboard to iterate over
   * @param {(index: number) => void} callback - Function called with index of each occupied cell
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
   * Internal helper: Execute callback for each index in range [0, count).
   * Extracted to reduce iteration pattern duplication between similar methods.
   *
   * @param {number} count - Number of iterations (0 to count-1)
   * @param {(index: number) => void} callback - Function called for each sequential index
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
   * Iterates from 0 to (height - 1).
   *
   * @param {(rowIndex: number) => void} callback - Function called with each row index
   * @returns {void}
   */
  forEachRow (callback) {
    this.#forEachInRange(this.height, callback)
  }

  /**
   * Generator yielding [x, y] coordinate pairs for all cells.
   * If bitboard is provided, yields coordinates only for occupied cells.
   * Coordinates use row-major indexing: [x, y] where x is column, y is row.
   *
   * @param {bigint} [bitboard] - Optional bitboard; if omitted yields all cells, if provided yields only occupied cells
   * @generator
   * @yields {[number, number]} [x, y] coordinate tuples
   *
   * @example
   * for (const [x, y] of grid.locations(board)) {
   *   console.log(`Cell at column ${x}, row ${y}`);
   * }
   */
  *locations (bitboard) {
    const cellIndices = this.#getIndices(bitboard, bitboard != null)
    for (const index of cellIndices) {
      const { x, y } = this.indexToLocation(index)
      yield [x, y]
    }
  }

  /**
   * Generator yielding [x, y, value] tuples for all or occupied cells.
   * When fast path is enabled and bitWidth === 1, yields value as 1n for occupied cells.
   * Otherwise retrieves actual value from store for each cell.
   *
   * @param {bigint} bitboard - Bitboard to iterate
   * @param {boolean} [occupiedOnly=false] - If true, only yield occupied (non-zero) cells; otherwise yield all
   * @generator
   * @yields {[number, number, bigint]} [x, y, value] coordinate and value tuples
   *
   * @example
   * // Get all cells with their color values
   * for (const [x, y, color] of grid.locationsWithValues(board, false)) {
   *   console.log(`Cell (${x}, ${y}) has color ${color}`);
   * }
   */
  *locationsWithValues (bitboard, occupiedOnly = false) {
    const useValueProvider = this.#shouldUseFastPath(bitboard)
    const cellIndices = this.#getIndices(bitboard, occupiedOnly)

    for (const index of cellIndices) {
      const { x, y } = this.indexToLocation(index)
      const value = useValueProvider ? 1n : this.store.getIdx(bitboard, index)

      // Skip zero values if occupiedOnly requested
      if (occupiedOnly && value === 0n) continue

      yield [x, y, value]
    }
  }

  /**
   * Internal helper: Generate occupied cell indices using fast path if available.
   * Delegates to store.bitsOccupied() for efficiency when fast mode is enabled.
   * Falls back to iterating indexAndValues() and filtering for zero values.
   *
   * @param {bigint} bitboard - Bitboard to iterate
   * @generator
   * @yields {number} Index of each occupied (non-zero) cell
   * @private
   */
  *#occupiedIndices (bitboard) {
    if (this.fast && this.store.bitsOccupied) {
      yield* this.store.bitsOccupied(bitboard, this.area)
    } else {
      for (const [index, value] of this.indexAndValues(bitboard)) {
        if (value !== 0n) {
          yield index
        }
      }
    }
  }

  /**
   * Internal helper: Get an iterator for cell indices based on occupiedOnly flag.
   * Yields either all indices (0 to area-1) or only occupied cell indices.
   *
   * @param {bigint} bitboard - Bitboard to check
   * @param {boolean} occupiedOnly - If true, yields only occupied cell indices; if false, yields all
   * @returns {Generator<number>} Iterator over cell indices
   * @generator
   * @private
   */
  *#getIndices (bitboard, occupiedOnly) {
    yield* occupiedOnly ? this.#occupiedIndices(bitboard) : this.indices()
  }

  /**
   * Internal helper: Determine if fast path optimization should be used.
   * Fast path applies when all conditions met:
   * - fast mode enabled (this.fast === true)
   * - store supports bitsOccupied method
   * - grid is 1-bit (store.bitWidth === 1)
   *
   * Fast path returns 1n for occupied cells without store lookup (optimization for boolean grids).
   *
   * @param {bigint} _bitboard - Bitboard to check (parameter unused, included for consistency)
   * @returns {boolean} True if fast path should be used for value retrieval
   * @private
   */
  #shouldUseFastPath (_bitboard) {
    return this.fast && this.store.bitsOccupied && this.store.bitWidth === 1
  }

  /**
   * Legacy alias for locations(bitboard).
   * Yields coordinates only for occupied cells.
   *
   * @deprecated Use locations(bitboard) instead for consistency with locationsWithValues()
   * @param {bigint} bitboard - Bitboard to iterate
   * @generator
   * @yields {[number, number]} [x, y] coordinate tuples for occupied cells
   *
   * @example
   * // Old way (deprecated)
   * for (const [x, y] of grid.occupiedLocations(board)) { ... }
   * // New way
   * for (const [x, y] of grid.locations(board)) { ... }
   */
  *occupiedLocations (bitboard) {
    yield* this.locations(bitboard)
  }

  /**
   * Legacy alias for locationsWithValues(bitboard, true).
   * Yields coordinates and values for occupied cells with standard path (no fast optimization).
   *
   * @deprecated Use locationsWithValues(bitboard, true) instead for explicit control
   * @param {bigint} bitboard - Bitboard to iterate
   * @generator
   * @yields {[number, number, bigint]} [x, y, value] tuples for occupied cells
   *
   * @example
   * // Old way (deprecated)
   * for (const [x, y, val] of grid.occupiedLocationsAndValues(board)) { ... }
   * // New way
   * for (const [x, y, val] of grid.locationsWithValues(board, true)) { ... }
   */
  *occupiedLocationsAndValues (bitboard) {
    yield* this.locationsWithValues(bitboard, true)
  }

  /**
   * Legacy alias maintained for backward compatibility.
   * This method is now consolidated into locationsWithValues() core logic.
   * For 1-bit stores with fast mode enabled, yields value as 1n without store lookup.
   *
   * @deprecated Use locationsWithValues(bitboard, true) instead
   * @param {bigint} bitboard - Bitboard to iterate
   * @generator
   * @yields {[number, number, bigint]} [x, y, 1n] tuples (value always 1n for occupied cells)
   *
   * @example
   * // Old way (deprecated)
   * for (const [x, y, val] of grid.occupiedLocationsAndValuesFast(board)) { ... }
   * // New way
   * for (const [x, y, val] of grid.locationsWithValues(board, true)) { ... }
   */
  *occupiedLocationsAndValuesFast (bitboard) {
    yield* this.locationsWithValues(bitboard, true)
  }
  /**
   * Converts a linear cell index to [x, y] grid coordinates.
   * Uses row-major ordering: index = y * width + x, so inverse is x = index % width, y = index / width.
   *
   * @param {number} index - Linear index (0 to area-1)
   * @returns {Coordinate} Coordinate pair where x is column (0 to width-1), y is row (0 to height-1)
   *
   * @example
   * const coord = grid.indexToLocation(42);
   * // For 8-wide grid: index 42 = row 5, col 2, so returns {x: 2, y: 5}
   */
  indexToLocation (index) {
    const x = index % this.width
    const y = Math.floor(index / this.width)
    return { x, y }
  }

  /**
   * Generator yielding cell values for all grid indices.
   * Retrieves value from store for each cell position in row-major order.
   *
   * @param {bigint} bitboard - Bitboard to read from
   * @generator
   * @yields {bigint} Cell value at each index (0n for empty cells in multi-bit stores)
   */
  *values (bitboard) {
    for (const index of this.indices()) {
      yield this.store.getIdx(bitboard, index)
    }
  }

  /**
   * Generator yielding [index, value] pairs for all cells.
   * Combines cell position with its value from the bitboard in row-major order.
   *
   * @param {bigint} bitboard - Bitboard to read from
   * @generator
   * @yields {[number, bigint]} [index, value] pairs for each grid cell
   */
  *indexAndValues (bitboard) {
    for (const index of this.indices()) {
      yield [index, this.store.getIdx(bitboard, index)]
    }
  }

  /**
   * Generator yielding [index, value] pairs for only non-zero (occupied) cells.
   * Automatically chooses fast path via store.bitsOccupied() if fast mode enabled.
   * Use occupiedIndicesFast() if only indices are needed (better performance).
   *
   * @param {bigint} bitboard - Bitboard to iterate
   * @generator
   * @yields {[number, bigint]} [index, value] pairs where value !== 0n
   *
   * @example
   * for (const [idx, val] of grid.occupiedIndexAndValues(board)) {
   *   console.log(`Cell ${idx} has non-zero value ${val}`);
   * }
   */
  *occupiedIndexAndValues (bitboard) {
    if (this.isFastPathEnabled) {
      yield* this.#occupiedIndexAndValuesFast(bitboard)
      return
    }
    yield* this.occupiedIndexAndValuesSlow(bitboard)
  }
  /**
   * Determines if fast path optimization is currently enabled.
   * Returns true when fast mode is active and store.bitsOccupied is available.
   *
   * @type {boolean}
   * @readonly
   */
  get isFastPathEnabled () {
    return this.fast && this.store.bitsOccupied
  }

  /**
   * Generator yielding indices of all occupied (non-zero) cells.
   * Automatically selects fast path if enabled, otherwise uses slow path with value comparison.
   *
   * @param {bigint} bitboard - Bitboard to iterate
   * @generator
   * @yields {number} Index of each occupied cell
   */
  *occupiedIndices (bitboard) {
    if (this.isFastPathEnabled) {
      yield* this.occupiedIndicesFast(bitboard)
      return
    }
    yield* this.occupiedIndicesSlow(bitboard)
  }
  /**
   * Generator yielding indices of occupied cells using standard iteration (no fast path).
   * Iterates through all cells and yields indices with non-zero values.
   *
   * @param {bigint} bitboard - Bitboard to iterate
   * @generator
   * @yields {number} Index of each occupied cell
   */
  *occupiedIndicesSlow (bitboard) {
    for (const [index, value] of this.indexAndValues(bitboard)) {
      if (value !== 0n) {
        yield index
      }
    }
  }
  /**
   * Generator yielding [index, value] pairs for occupied cells using standard iteration.
   * Slower than occupiedIndexAndValues() fast path but always correct.
   * Use when fast path is unavailable or precision is critical.
   *
   * @param {bigint} bitboard - Bitboard to iterate
   * @generator
   * @yields {[number, bigint]} [index, value] pairs where value !== 0n
   */
  *occupiedIndexAndValuesSlow (bitboard) {
    for (const [index, value] of this.indexAndValues(bitboard)) {
      if (value !== 0n) {
        yield [index, value]
      }
    }
  }

  /**
   * Internal helper: Optimized iteration for occupied cells using store.bitsOccupied.
   * Retrieves values only for indices returned by store's fast path (avoiding zero check).
   * Much faster than occupiedIndexAndValuesSlow for large sparse grids.
   *
   * @param {bigint} bitboard - Bitboard to iterate
   * @generator
   * @yields {[number, bigint]} [index, value] pairs via bitsOccupied fast path
   * @private
   */
  *#occupiedIndexAndValuesFast (bitboard) {
    for (const index of this.occupiedIndicesFast(bitboard)) {
      yield [index, this.store.getIdx(bitboard, index)]
    }
  }

  /**
   * Generator yielding indices of occupied (non-zero) cells.
   * Delegates to store.bitsOccupied() for optimized bit enumeration.
   * Faster than occupiedIndexAndValues() when values are not needed.
   *
   * @param {bigint} bitboard - Bitboard to iterate
   * @generator
   * @yields {number} Index of each occupied cell
   */
  *occupiedIndicesFast (bitboard) {
    yield* this.store.bitsOccupied(bitboard, this.area)
  }

  /**
   * Generator yielding [index, value] pairs for cells matching a specific value.
   * Searches all cells for exact value match using strict equality (===).
   * Useful for finding all cells with a particular color or state.
   *
   * @param {bigint} bitboard - Bitboard to search
   * @param {bigint} searchValue - Value to find and match
   * @generator
   * @yields {[number, bigint]} [index, value] pairs where value === searchValue
   *
   * @example
   * for (const [idx, val] of grid.indicesMatching(board, 3n)) {
   *   console.log(`Cell ${idx} contains color 3`);
   * }
   */
  *indicesMatching (bitboard, searchValue) {
    for (const [index, value] of this.indexAndValues(bitboard)) {
      if (value === searchValue) {
        yield [index, value]
      }
    }
  }
  /**
   * Finds the maximum cell value in the bitboard (as BigInt).
   * Returns 0n if all cells are empty. Use maxNumber() to convert to Number type.
   * Iterates through all cells to find maximum.
   *
   * @param {bigint} bitboard - Bitboard to analyze
   * @returns {bigint} Maximum value found (0n if all cells empty)
   *
   * @example
   * const maxVal = grid.maxValue(board);
   * console.log(`Highest color: ${maxVal}`);
   */
  maxValue (bitboard) {
    return this.#extremeValue(bitboard, (a, b) => a > b, 0n)
  }

  /**
   * Finds the maximum cell value and converts result to Number type.
   * Convenience wrapper: equivalent to Number(maxValue(bitboard)).
   * Returns 0 if all cells are empty.
   *
   * @param {bigint} bitboard - Bitboard to analyze
   * @returns {number} Maximum value as JavaScript Number (0 if empty)
   */
  maxNumber (bitboard) {
    return Number(this.maxValue(bitboard))
  }

  /**
   * Finds the minimum cell value in the bitboard (as BigInt).
   * Returns Infinity initially but converts to 0n or BigInt if any cells are occupied.
   * Use minNumber() to convert to Number type.
   *
   * @param {bigint} bitboard - Bitboard to analyze
   * @returns {bigint} Minimum value found (0n or higher if cells occupied)
   *
   * @example
   * const minVal = grid.minValue(board);
   * console.log(`Lowest color: ${minVal}`);
   */
  minValue (bitboard) {
    return this.#extremeValue(bitboard, (a, b) => a < b, Infinity)
  }

  /**
   * Finds the minimum cell value and converts result to Number type.
   * Convenience wrapper: equivalent to Number(minValue(bitboard)).
   *
   * @param {bigint} bitboard - Bitboard to analyze
   * @returns {number} Minimum value as JavaScript Number (0 or higher if cells occupied)
   */
  minNumber (bitboard) {
    return Number(this.minValue(bitboard))
  }

  /**
   * Internal helper: Find extreme value (minimum or maximum) using a comparator function.
   * Single implementation shared by minValue/maxValue to eliminate duplication.
   * Iterates through all cell values and applies comparator to track extremum.
   *
   * @param {bigint} bitboard - Bitboard to analyze
   * @param {(current: bigint|number, extreme: bigint|number) => boolean} comparator - Comparison function; returns true if current is more extreme than extreme
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
   * Generator yielding all cell indices in row-major order (0 to area-1).
   * Yields every position in the grid sequentially.
   *
   * @generator
   * @yields {number} Cell index for each grid position
   */
  *indices () {
    yield* this.#rangeGenerator(this.area)
  }

  /**
   * Internal helper: Generate integers from 0 to count-1.
   * Extracted helper to reduce generator code duplication between indices() and rows().
   * Simple counter generator used by multiple public methods.
   *
   * @param {number} count - Number of values to yield
   * @generator
   * @yields {number} Integers 0 through count-1 (inclusive)
   * @private
   */
  *#rangeGenerator (count) {
    for (let i = 0; i < count; i++) {
      yield i
    }
  }

  /**
   * Generator yielding all row indices (0 to height-1).
   * Yields each row index sequentially from top to bottom.
   *
   * @generator
   * @yields {number} Row index for each grid row
   */
  *rows () {
    yield* this.#rangeGenerator(this.height)
  }

  /**
   * Creates a row mask matching the grid's width.
   * Delegates to store.rowMaskForWidth() for format-specific mask generation.
   * Useful for isolating individual rows during bit manipulation.
   *
   * @returns {bigint} Bit mask representing one full row (width cells)
   */
  rowMask () {
    return this.store.rowMaskForWidth(this.width)
  }
}
