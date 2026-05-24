import { ConnectBase } from './ConnectBase.js'

/**
 * @typedef {import('./RectIndex.js').RectIndex} RectIndex
 * @typedef {[number, number]} NeighborOffset
 * @typedef {[number, number]} Coordinate
 */

/**
 * Rectangular grid connectivity with orthogonal neighbor relationships.
 *
 * Defines orthogonal (4-connected) grid neighbor topology where only cells sharing
 * an edge are considered neighbors. No diagonal connectivity.
 *
 * **Neighbor Directions:**
 * - Right: (+1, 0)
 * - Left: (-1, 0)
 * - Down: (0, +1)
 * - Up: (0, -1)
 *
 * **Use Cases:**
 * - Standard grid games (checkers, some puzzle games)
 * - Flood-fill algorithms requiring orthogonal connectivity
 * - Manhattan distance calculations
 * - Movement without diagonal transitions
 *
 * **Example:**
 * ```javascript
 * const rectIndex = new RectIndex(8, 8);
 * const connect4 = new Connect4(rectIndex);
 *
 * // Get orthogonal neighbors of cell (3, 3)
 * const neighborCoords = connect4.neighbors(3, 3);
 * // Result: [[4, 3], [2, 3], [3, 4], [3, 2]]
 *
 * // Get cell plus all orthogonal neighbors
 * const area = connect4.area(3, 3);
 * // Result: [[3, 3], [4, 3], [2, 3], [3, 4], [3, 2]]
 * ```
 *
 * @extends ConnectBase
 */
export class Connect4 extends ConnectBase {
  /**
   * Initialize orthogonal grid connectivity.
   *
   * Creates a connectivity object with orthogonal neighbor offsets
   * (up, down, left, right). All neighbor lookups are relative to
   * the provided rectangular index for coordinate validation.
   *
   * @param {RectIndex} rectIndex - Rectangular grid indexer for coordinate handling
   *
   * @example
   * // Create 8×8 grid with orthogonal connectivity
   * const grid = new RectIndex(8, 8);
   * const connect4 = new Connect4(grid);
   */
  constructor (rectIndex) {
    super(rectIndex, Connect4.orthogonalNeighborOffsets)
  }

  /**
   * Orthogonal neighbor offset directions for rectangular grids.
   *
   * Provides the set of relative coordinate offsets that define
   * orthogonal (4-connected) neighborhood relationships. Each offset
   * is [deltaX, deltaY] representing one step in the grid.
   *
   * **Offset Array:**
   * - Index 0: (+1, 0) - Right
   * - Index 1: (-1, 0) - Left
   * - Index 2: (0, +1) - Down
   * - Index 3: (0, -1) - Up
   *
   * @type {NeighborOffset[]}
   * @static
   *
   * @example
   * const offsets = Connect4.orthogonalNeighborOffsets;
   * // offsets = [[1, 0], [-1, 0], [0, 1], [0, -1]]
   */
  static get orthogonalNeighborOffsets () {
    return ConnectBase.orthogonalNeighborOffsets
  }
}
