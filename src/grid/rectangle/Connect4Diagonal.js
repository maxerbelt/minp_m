import { ConnectBase } from './ConnectBase.js'

/**
 * @typedef {import('./RectIndex.js').RectIndex} RectIndex
 * @typedef {[number, number]} NeighborOffset
 * @typedef {[number, number]} Coordinate
 */

/**
 * Rectangular grid connectivity with diagonal neighbor relationships.
 *
 * Defines diagonal (4-connected) grid neighbor topology where only cells sharing
 * a corner are considered neighbors. No orthogonal (edge-sharing) connectivity.
 *
 * **Neighbor Directions:**
 * - Down-right: (+1, +1)
 * - Up-left: (-1, -1)
 * - Down-left: (-1, +1)
 * - Up-right: (+1, -1)
 *
 * **Use Cases:**
 * - Grid algorithms requiring diagonal-only movement
 * - Specific puzzle game mechanics with diagonal-first rules
 * - Specialized pathfinding with diagonal topology
 * - Pattern matching on diagonal axes
 *
 * **Example:**
 * ```javascript
 * const rectIndex = new RectIndex(8, 8);
 * const connect4Diag = new Connect4Diagonal(rectIndex);
 *
 * // Get diagonal neighbors of cell (3, 3)
 * const neighborCoords = connect4Diag.neighbors(3, 3);
 * // Result: [[4, 4], [2, 2], [2, 4], [4, 2]]
 *
 * // Get cell plus all diagonal neighbors
 * const area = connect4Diag.area(3, 3);
 * // Result: [[3, 3], [4, 4], [2, 2], [2, 4], [4, 2]]
 * ```
 *
 * @extends ConnectBase
 */
export class Connect4Diagonal extends ConnectBase {
  /**
   * Initialize diagonal grid connectivity.
   *
   * Creates a connectivity object with diagonal neighbor offsets
   * (up-left, down-right, down-left, up-right). All neighbor lookups are relative to
   * the provided rectangular index for coordinate validation.
   *
   * @param {RectIndex} rectIndex - Rectangular grid indexer for coordinate handling
   *
   * @example
   * // Create 8×8 grid with diagonal-only connectivity
   * const grid = new RectIndex(8, 8);
   * const connect4Diag = new Connect4Diagonal(grid);
   */
  constructor (rectIndex) {
    super(rectIndex, Connect4Diagonal.diagonalNeighborOffsets)
  }

  /**
   * Diagonal neighbor offset directions for rectangular grids.
   *
   * Provides the set of relative coordinate offsets that define
   * diagonal (4-connected, corner-sharing) neighborhood relationships. Each offset
   * is [deltaX, deltaY] representing one diagonal step in the grid.
   *
   * **Offset Array:**
   * - Index 0: (+1, +1) - Down-right
   * - Index 1: (-1, -1) - Up-left
   * - Index 2: (-1, +1) - Down-left
   * - Index 3: (+1, -1) - Up-right
   *
   * @type {NeighborOffset[]}
   * @static
   *
   * @example
   * const offsets = Connect4Diagonal.diagonalNeighborOffsets;
   * // offsets = [[1, 1], [-1, -1], [-1, 1], [1, -1]]
   */
  static get diagonalNeighborOffsets () {
    return ConnectBase.diagonalNeighborOffsets
  }
}
