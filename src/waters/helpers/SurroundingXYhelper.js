import { makeKey } from '../../core/utilities.js'

/**
 * @fileoverview
 * Manages operations on cells surrounding a given coordinate in a grid.
 *
 * Provides static factory methods to iterate, map, and collect neighboring cells
 * within an 8-connected neighborhood (3×3 kernel) while respecting boundary constraints.
 * Uses a generic reducer pattern for flexible collection building without duplication.
 *
 * Key Patterns:
 * - All public methods use boundary-aware iteration
 * - Private #forEachSurroundingCell handles core iteration logic
 * - #collectSurroundingCells provides generic accumulation pattern
 * - Public methods delegate to collectors with custom reducer functions
 *
 * Coordinate System:
 * - Row (y): vertical axis, increases downward
 * - Column (x): horizontal axis, increases rightward
 * - Neighborhood: 3×3 kernel centered at (x, y)
 * - Iteration order: row-major from top-left to bottom-right
 *
 * Boundary Handling:
 * - All methods check map.inBounds(row, col) before processing
 * - Out-of-bounds cells are silently skipped
 * - Result size varies: 4 cells at corners, 6 at edges, 9 interior
 */

/**
 * Grid map interface for boundary checking.
 *
 * Defines contract for map objects used by SurroundingCellsHelper.
 * Maps must implement boundary validation to ensure operations stay within valid grid bounds.
 *
 * @typedef {Object} GridMap
 * @property {(x: number, y: number) => boolean} isInBoundsAt - Boundary check function.
 *
 */

/**
 * Callback signature for cell iteration.
 *
 * Invoked for each neighboring cell during iteration operations.
 * Called once per in-bounds cell within the 3×3 neighborhood.
 *
 * @callback  XYsIteratorCallback
 * @template T
 * @param {T} collection - Target collection being populated (mutated by reducer)
 * @param {number} x - Column coordinate of the cell (0-based, must be >= 0)
 * @param {number} y - Row coordinate of the cell (0-based, must be >= 0)
 * @returns {void} Callback performs side effects only
 */

/**
 * Callback signature for reducer function in cell collection.
 *
 * Invoked for each neighboring cell to accumulate into target collection.
 * Function receives collection and cell coordinates; must mutate collection if applicable.
 *
 * @callback  XYsReducerCallback
 * @template T
 * @param {T} collection - Target collection being populated (mutated by reducer)
 *
 * @param {number} x - Column coordinate of the cell (0-based, must be >= 0)
 * @param {number} y - Row coordinate of the cell (0-based, must be >= 0)
 * @returns {void} Reducer performs mutation on collection, no return value expected
 */

/**
 * Callback signature for maker function in value-generating collection methods.
 *
 * Called for each neighboring cell to generate a value for that cell.
 * Return value is used in the result collection (Set, Object, or Array).
 *
 * @callback XYsMakerCallback
 * @template T
 * @param {number} x - Column coordinate of the cell (0-based, must be >= 0)
 * @param {number} y - Row coordinate of the cell (0-based, must be >= 0)
 * @returns {T} Value to associate with this cell in result collection
 */

/**
 * Manages operations on cells surrounding a given coordinate.
 *
 * Provides static factory methods to iterate, map, and collect neighboring cells
 * within an 8-connected neighborhood (3×3 kernel) while respecting boundary constraints.
 * Implements a generic reducer pattern for flexible collection building.
 *
 * All methods include the center cell itself in the neighborhood.
 *
 * Design Pattern:
 * - Core iteration logic encapsulated in #forEachSurroundingCell()
 * - Generic accumulation provided by #collectSurroundingCells()
 * - Each public method (asKeySet, asObjectMap, asArray) creates custom reducer
 * - No code duplication: all collection logic shares single reducer framework
 *
 * Performance Characteristics:
 * - Time complexity: O(9) per call (fixed 3×3 neighborhood)
 * - Space complexity: O(4-9) based on position (corners, edges, interior)
 * - Boundary checking: O(1) per cell (delegated to map.inBounds)
 * - No iteration over full grid, only neighborhood cells
 *
 * @class SurroundingCellsHelper
 * @static
 *
 * @example
 * // Iterate over all neighboring cells
 * SurroundingCellsHelper.forEachSurroundingCell(map, 5, 5, (r, c) => {
 *   console.log(`Cell at (${r}, ${c})`);
 * });
 *
 * @example
 * // Collect neighbors as a Set of keys
 * const neighbors = SurroundingCellsHelper.asKeySet(map, 5, 5);
 *
 * @example
 * // Create a custom collection using asArray with a maker function
 * const cellObjects = SurroundingCellsHelper.asArray(map, 5, 5,
 *   (r, c) => ({ row: r, col: c, id: makeKey(r, c) })
 * );
 */
export class SurroundingXYsHelper {
  /**
   * Neighborhood span constants for 8-connected adjacency (3×3 kernel).
   *
   * Covers all cells within one step in any direction (including diagonals).
   * Delta range of [-1, 1] creates a 3×3 kernel centered on the target cell.
   * When applied to (r, c): neighbors include cells from (r-1, c-1) to (r+1, c+1).
   *
   * @readonly
   * @type {Object<string, number>}
   * @property {number} MIN_DELTA - Minimum coordinate delta (-1)
   * @property {number} MAX_DELTA - Maximum coordinate delta (1)
   */
  static #NEIGHBORHOOD = {
    MIN_DELTA: -1,
    MAX_DELTA: 1
  }

  /**
   * Iterates over all in-bounds cells in the 3×3 neighborhood around (row, col).
   *
   * Processes all neighboring cells within the 8-connected neighborhood,
   * including the center cell itself. Skips any cells outside grid bounds.
   * Iteration order: row-major from top-left to bottom-right.
   *
   * Core iteration logic shared by all collection methods.
   * This is the single point of iteration logic for the entire helper class.
   *
   * @static
   * @param {GridMap} map - Grid map with inBounds(row, col) boundary checking method.
   *                        Used to validate cells before invoking callback.
   * @param {number} x - Center column coordinate (0-based). Must be >= 0.
   * @param {number} y - Center row coordinate (0-based). Must be >= 0.
   * @param { XYsIteratorCallback} callback - Iterator function invoked for each in-bounds neighboring cell.
   *                                          Called in row-major order (top-left to bottom-right).
   * @returns {void} This method performs side effects (iteration) only.
   *
   * @example
   * // Print all neighboring cell coordinates
   * SurroundingCellsHelper.forEachSurroundingCell(map, 5, 5, (r, c) => {
   *   console.log(`Cell at (${r}, ${c})`);
   * });
   *
   * @example
   * // Collect neighboring cells into an external array
   * const neighbors = [];
   * SurroundingCellsHelper.forEachSurroundingCell(map, 5, 5, (r, c) => {
   *   neighbors.push([r, c]);
   * });
   */
  static #forEachSurroundingCell (map, x, y, callback) {
    const { MIN_DELTA, MAX_DELTA } = this.#NEIGHBORHOOD

    for (let dy = MIN_DELTA; dy <= MAX_DELTA; dy++) {
      for (let dx = MIN_DELTA; dx <= MAX_DELTA; dx++) {
        const sy = y + dy
        const sx = x + dx
        if (map.isInBoundsAt(sx, sy)) {
          callback(sx, sy)
        }
      }
    }
  }

  /**
   * Generic reducer for surrounding cells. Collects neighbor coordinates
   * into a target collection using a provided reducer function.
   *
   * Internal helper that implements the core accumulation pattern used by all public collection methods.
   * Encapsulates boundary checking and iteration logic, supporting flexible collection types.
   * This is the primary implementation pattern: delegates iteration to #forEachSurroundingCell,
   * then applies reducer to accumulate results into provided collection.
   * Not part of public API.
   *
   * @static
   * @template T
   * @param {GridMap} map - Grid map with inBounds(row, col) boundary checking method.
   * @param {number} x - Center column coordinate (0-based).
   * @param {number} y - Center row coordinate (0-based).
   * @param {T} initialCollection - Starting collection to populate (Object, Array, Set, or custom type).
   *                                 Passed by reference and mutated by reducer.
   *                                 Must be a mutable collection (array, Set, Object, etc.).
   * @param {XYsReducerCallback<T>} reducer - Accumulation function.
   *                                           Receives collection and cell coordinates.
   *                                           Must mutate collection (no return value expected).
   *                                           Called exactly once per in-bounds neighboring cell.
   * @returns {T} The populated collection (same reference as initialCollection).
   *              Mutation occurs inside the reducer callbacks.
   *
   * @see {@link asKeySet}
   * @see {@link asObjectMap}
   * @see {@link asArray}
   *
   * @example
   * // Collect keys into custom Set (internal implementation)
   * const keys = SurroundingCellsHelper.#collectSurroundingCells(
   *   map, x, y,
   *   new Set(),
   *   (set, row, col) => set.add(makeKey(row, col))
   * );
   */
  static #collectSurroundingCells (map, x, y, initialCollection, reducer) {
    this.#forEachSurroundingCell(map, x, y, (sx, sy) => {
      reducer(initialCollection, sx, sy)
    })
    return initialCollection
  }

  /**
   * Returns a Set of key strings for all surrounding cells.
   *
   * Collects neighboring cell coordinates as string keys for use in Set operations and lookups.
   * Keys are generated by calling makeKey(row, col) for each cell.
   * Useful for O(1) membership checks and deduplication.
   * Cells are included in row-major iteration order starting from top-left.
   *
   * Implementation uses generic #collectSurroundingCells with custom reducer that
   * adds keys to the result Set.
   *
   * @static
   * @public
   * @param {GridMap} map - Grid map with inBounds(row, col) boundary checking method.
   * @param {number} x - Center column coordinate (0-based).
   * @param {number} y - Center row coordinate (0-based).
   * @returns {Set<string>} Set of string keys for all in-bounds neighboring cells.
   *                        Each key generated via makeKey(row, col).
   *                        Excludes out-of-bounds cells.
   *                        Size ranges from 4 (corner) to 9 (interior).
   *
   * @example
   * // Check if a specific neighbor exists
   * const neighbors = SurroundingCellsHelper.asKeySet(map, 5, 5);
   * if (neighbors.has(makeKey(4, 5))) { // cell above
   *   console.log('Cell above exists in bounds');
   * }
   *
   * @example
   * // Find all in-bounds neighbors and their count
   * const neighbors = SurroundingCellsHelper.asKeySet(map, 0, 0);
   * console.log(`Found ${neighbors.size} neighbors near corner`);
   */
  static asKeySet (map, x, y) {
    return this.#collectSurroundingCells(map, x, y, new Set(), (set, sx, sy) =>
      set.add(makeKey(sx, sy))
    )
  }

  /**
   * Returns an object map keyed by cell key strings, with values
   * generated by a custom maker function.
   *
   * Creates a key-value object where keys are cell coordinates (via makeKey)
   * and values are generated by invoking maker(row, col) for each neighboring cell.
   * Useful for associating metadata or computed values with each neighbor.
   * Values can be any type returned by the maker function.
   *
   * Implementation uses generic #collectSurroundingCells with reducer that
   * invokes maker for each cell and stores result in object.
   *
   * @static
   * @public
   * @template T
   * @param {GridMap} map - Grid map with inBounds(row, col) boundary checking method.
   * @param {number} x - Center column coordinate (0-based).
   * @param {number} y - Center row coordinate (0-based).
   * @param {XYsMakerCallback<T>} maker - Mapping function for generating values.
   *                                       Called for each in-bounds neighboring cell.
   *                                       Return value becomes the value for that cell's key.
   * @returns {Object<string, T>} Object map where:
   *                             - Keys: string identifiers (via makeKey(row, col))
   *                             - Values: results from maker(row, col)
   *                             - Excludes out-of-bounds cells
   *                             - Size ranges from 4 (corner) to 9 (interior)
   *
   * @example
   * // Create coordinate object for each neighbor
   * const coordMap = SurroundingCellsHelper.asObjectMap(
   *   map, 5, 5,
   *   (r, c) => ({ row: r, col: c })
   * );
   * // Result: { '4-4': {row:4, col:4}, '4-5': {row:4, col:5}, ... }
   *
   * @example
   * // Create map with cell content values
   * const contentMap = SurroundingCellsHelper.asObjectMap(
   *   map, 5, 5,
   *   (r, c) => map.getCell(r, c).content
   * );
   */
  static asObjectMap (map, x, y, maker) {
    return this.#collectSurroundingCells(map, x, y, {}, (obj, sx, sy) => {
      obj[makeKey(sx, sy)] = maker(sx, sy)
    })
  }

  /**
   * Returns an array of values generated by a maker function
   * for all surrounding cells.
   *
   * Creates an ordered array where each element is the result of calling
   * maker(row, col) for each neighboring cell. Order follows row-major
   * iteration from top-left to bottom-right within the 3×3 neighborhood.
   * Useful for collecting computed values from all neighbors in a consistent order.
   * Out-of-bounds cells are excluded from the result.
   *
   * Implementation uses generic #collectSurroundingCells with reducer that
   * pushes maker results to array.
   *
   * @static
   * @public
   * @template T
   * @param {GridMap} map - Grid map with inBounds(row, col) boundary checking method.
   * @param {number} x - Center column coordinate (0-based).
   * @param {number} y - Center row coordinate (0-based).
   * @param {XYsMakerCallback<T>} maker - Mapping function for generating values.
   *                                       Called for each in-bounds neighboring cell.
   *                                       Return value is pushed to result array.
   * @returns {Array<T>} Array of maker results, one per neighboring cell.
   *                     Order: row-major from (y-1,x-1) to (y+1,x+1).
   *                     Excludes out-of-bounds cells.
   *                     Length ranges from 4 (corner) to 9 (interior).
   *
   * @example
   * // Collect actual cell objects from map
   * const neighbors = SurroundingCellsHelper.asArray(
   *   map, 5, 5,
   *   (r, c) => map.cellAt(r, c)
   * );
   *
   * @example
   * // Collect coordinate pairs as arrays
   * const coords = SurroundingCellsHelper.asArray(
   *   map, 5, 5,
   *   (r, c) => [r, c]
   * );
   * // Result: [[4,4], [4,5], [4,6], [5,4], [5,5], [5,6], [6,4], [6,5], [6,6]]
   */
  static asArray (map, x, y, maker) {
    return this.#collectSurroundingCells(map, x, y, [], (arr, sx, sy) => {
      arr.push(maker(sx, sy))
    })
  }
}
