import { ConnectBase } from './ConnectBase.js'

/**
 * @typedef {import('./RectIndex.js').RectIndex} RectIndex
 * @typedef {[number, number]} NeighborOffset
 * @typedef {[number, number]} Coordinate
 */

/**
 * Rectangular grid connectivity with king's move (8-connected) neighbor relationships.
 *
 * Defines complete 8-connected grid neighbor topology where cells sharing either
 * an edge or a corner are considered neighbors. Combines orthogonal and diagonal
 * connectivity for maximum neighborhood coverage.
 *
 * **Neighbor Directions:**
 * - Orthogonal (4 edge-sharing):
 *   - Right: (+1, 0)
 *   - Left: (-1, 0)
 *   - Down: (0, +1)
 *   - Up: (0, -1)
 * - Diagonal (4 corner-sharing):
 *   - Down-right: (+1, +1)
 *   - Up-left: (-1, -1)
 *   - Down-left: (-1, +1)
 *   - Up-right: (+1, -1)
 *
 * **Use Cases:**
 * - Standard grid pathfinding algorithms (A*, Dijkstra)
 * - Chess-like movement with king piece mobility
 * - Flood-fill algorithms with full neighborhood connectivity
 * - Proximity queries requiring all adjacent cells
 * - Game of Life and cellular automaton simulations
 *
 * **Example:**
 * ```javascript
 * const rectIndex = new RectIndex(8, 8);
 * const connect8 = new Connect8(rectIndex);
 *
 * // Get all 8 neighbors of cell (3, 3)
 * const neighborCoords = connect8.neighbors(3, 3);
 * // Result: [[4, 3], [2, 3], [3, 4], [3, 2], [4, 4], [2, 2], [2, 4], [4, 2]]
 *
 * // Get cell plus all 8 neighbors
 * const area = connect8.area(3, 3);
 * // Result: [[3, 3], [4, 3], [2, 3], [3, 4], [3, 2], [4, 4], [2, 2], [2, 4], [4, 2]]
 * ```
 *
 * @extends ConnectBase
 */
export class Connect8 extends ConnectBase {
  /**
   * Initialize 8-connected (king's move) grid connectivity.
   *
   * Creates a connectivity object with all neighbor offsets combining
   * orthogonal (up, down, left, right) and diagonal (all corners) connectivity.
   * All neighbor lookups are relative to the provided rectangular index for
   * coordinate validation.
   *
   * @param {RectIndex} rectIndex - Rectangular grid indexer for coordinate handling
   *
   * @example
   * // Create 8×8 grid with full 8-connected neighborhood
   * const grid = new RectIndex(8, 8);
   * const connect8 = new Connect8(grid);
   */
  constructor (rectIndex) {
    super(rectIndex, Connect8.allNeighborOffsets)
  }

  /**
   * All neighbor offsets for 8-connected (king's move) rectangular grids.
   *
   * Provides the complete set of relative coordinate offsets that define
   * 8-connected (king-connected) neighborhood relationships. Combines orthogonal
   * and diagonal offsets for maximum neighborhood coverage. Each offset is
   * [deltaX, deltaY] representing one step in any direction (orthogonal or diagonal).
   *
   * **8 Neighbor Directions:**
   * - Index 0-3: Orthogonal (right, left, down, up)
   * - Index 4-7: Diagonal (down-right, up-left, down-left, up-right)
   *
   * **Offset Array:**
   * - Index 0: (+1, 0) - Right
   * - Index 1: (-1, 0) - Left
   * - Index 2: (0, +1) - Down
   * - Index 3: (0, -1) - Up
   * - Index 4: (+1, +1) - Down-right
   * - Index 5: (-1, -1) - Up-left
   * - Index 6: (-1, +1) - Down-left
   * - Index 7: (+1, -1) - Up-right
   *
   * @type {NeighborOffset[]}
   * @static
   *
   * @example
   * const offsets = Connect8.allNeighborOffsets;
   * // offsets = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [-1, 1], [1, -1]]
   */
  static get allNeighborOffsets () {
    return ConnectBase.allNeighborOffsets
  }
}
