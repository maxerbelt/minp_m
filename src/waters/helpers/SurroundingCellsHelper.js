import { makeKey } from '../../core/utilities.js'

/**
 * Grid map interface for boundary checking.
 *
 * Defines contract for map objects used by SurroundingCellsHelper.
 * Maps must implement boundary validation to ensure operations stay within valid grid bounds.
 *
 * @typedef {Object} GridMap
 * @property {Function} inBounds - Function signature: (row: number, col: number) => boolean
 *                                 Returns true if the given row and column are within grid bounds.
 *                                 Used to validate neighboring cells before iteration.
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
export class SurroundingCellsHelper {
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
   * Iterates over all in-bounds cells in the 3×3 neighborhood around (r, c).
   *
   * Processes all neighboring cells within the 8-connected neighborhood,
   * including the center cell itself. Skips any cells outside grid bounds.
   * Iteration order: row-major from top-left to bottom-right.
   *
   * @static
   * @param {GridMap} map - Grid map with inBounds(row, col) boundary checking method.
   *                        Used to validate cells before invoking callback.
   * @param {number} r - Center row coordinate. Must be >= 0.
   * @param {number} c - Center column coordinate. Must be >= 0.
   * @param {Function} callback - Function(row: number, col: number) => void
   *                             Invoked for each in-bounds neighboring cell.
   *                             Parameters: row and col coordinates of cell.
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
  static forEachSurroundingCell (map, r, c, callback) {
    const { MIN_DELTA, MAX_DELTA } = this.#NEIGHBORHOOD

    for (let dr = MIN_DELTA; dr <= MAX_DELTA; dr++) {
      for (let dc = MIN_DELTA; dc <= MAX_DELTA; dc++) {
        const row = r + dr
        const col = c + dc
        if (map.inBounds(row, col)) {
          callback(row, col)
        }
      }
    }
  }

  /**
   * Generic reducer for surrounding cells. Collects neighbor coordinates
   * into a target collection using a provided reducer function.
   *
   * Internal helper that implements the core accumulation pattern used by
   * all public collection methods. Encapsulates boundary checking and iteration.
   * Private helper method: not part of public API.
   *
   * @static
   * @param {GridMap} map - Grid map with inBounds(row, col) boundary checking method.
   * @param {number} r - Center row coordinate.
   * @param {number} c - Center column coordinate.
   * @param {Object|Array|Set} initialCollection - Starting collection to populate.
   *                                               Can be any mutable collection type.
   *                                               Passed by reference and mutated by reducer.
   * @param {Function} reducer - Accumulation function: (collection, row: number, col: number) => void
   *                            Receives collection and cell coordinates.
   *                            Must mutate collection (no return value expected).
   * @returns {Object|Array|Set} The populated collection (same reference as initialCollection).
   *
   * @see {@link asKeySet}
   * @see {@link asObjectMap}
   * @see {@link asArray}
   */
  static #collectSurroundingCells (map, r, c, initialCollection, reducer) {
    this.forEachSurroundingCell(map, r, c, (row, col) => {
      reducer(initialCollection, row, col)
    })
    return initialCollection
  }

  /**
   * Returns a Set of key strings for all surrounding cells.
   *
   * Collects neighboring cell coordinates as string keys for use in Set operations.
   * Keys are generated by makeKey(row, col) function.
   * Useful for O(1) membership checks and deduplication.
   *
   * @static
   * @public
   * @param {GridMap} map - Grid map with inBounds(row, col) boundary checking method.
   * @param {number} r - Center row coordinate.
   * @param {number} c - Center column coordinate.
   * @returns {Set<string>} Set of string keys for all neighboring cells.
   *                       Each key generated via makeKey(row, col).
   *                       Excludes out-of-bounds cells.
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
  static asKeySet (map, r, c) {
    return this.#collectSurroundingCells(
      map,
      r,
      c,
      new Set(),
      (set, row, col) => set.add(makeKey(row, col))
    )
  }

  /**
   * Returns an object map keyed by cell key strings, with values
   * generated by a custom maker function.
   *
   * Creates a key-value object where keys are cell coordinates (via makeKey)
   * and values are generated by invoking maker(row, col) for each neighboring cell.
   * Useful for associating metadata or computed values with each neighbor.
   *
   * @static
   * @public
   * @param {GridMap} map - Grid map with inBounds(row, col) boundary checking method.
   * @param {number} r - Center row coordinate.
   * @param {number} c - Center column coordinate.
   * @param {Function} maker - Mapping function: (row: number, col: number) => any
   *                          Called for each in-bounds neighboring cell.
   *                          Return value becomes the value for that cell's key.
   * @returns {Object<string, any>} Object map where:
   *                                - Keys: string identifiers (via makeKey(row, col))
   *                                - Values: results from maker(row, col)
   *                                - Excludes out-of-bounds cells
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
  static asObjectMap (map, r, c, maker) {
    return this.#collectSurroundingCells(map, r, c, {}, (obj, row, col) => {
      obj[makeKey(row, col)] = maker(row, col)
    })
  }

  /**
   * Returns an array of values generated by a maker function
   * for all surrounding cells.
   *
   * Creates an ordered array where each element is the result of calling
   * maker(row, col) for each neighboring cell. Order follows row-major
   * iteration (top-left to bottom-right).
   * Useful for collecting computed values from all neighbors.
   *
   * @static
   * @public
   * @param {GridMap} map - Grid map with inBounds(row, col) boundary checking method.
   * @param {number} r - Center row coordinate.
   * @param {number} c - Center column coordinate.
   * @param {Function} maker - Mapping function: (row: number, col: number) => any
   *                          Called for each in-bounds neighboring cell.
   *                          Return value is pushed to result array.
   * @returns {Array<any>} Array of maker results, one per neighboring cell.
   *                      Order: row-major from (r-1,c-1) to (r+1,c+1).
   *                      Excludes out-of-bounds cells.
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
  static asArray (map, r, c, maker) {
    return this.#collectSurroundingCells(map, r, c, [], (arr, row, col) => {
      arr.push(maker(row, col))
    })
  }
}
