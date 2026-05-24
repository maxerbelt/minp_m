/**
 * @typedef {[number, number]} NeighborOffset
 * A relative coordinate offset representing the displacement from a reference cell to a neighbor.
 * Format: [deltaX, deltaY]
 * Example: [+1, 0] represents the cell directly to the right.
 */

/**
 * @typedef {[number, number]} Coordinate
 * An absolute grid coordinate representing a cell's position.
 * Format: [x, y] where x is column (0-based) and y is row (0-based).
 * Example: [3, 5] represents column 3, row 5.
 */

/**
 * Base class for rectangular grid connectivity topology definitions.
 *
 * Defines neighbor relationships for grid cells using offset patterns.
 * Supports multiple connectivity types through static offset accessors:
 * - **Orthogonal (4-connected)**: Only edge-sharing neighbors
 * - **Diagonal**: Only corner-sharing neighbors
 * - **All (8-connected)**: Both edge and corner neighbors
 *
 * **Key Concepts:**
 * - **Offset**: Relative displacement [dx, dy] from a cell to a neighbor
 * - **Neighbor**: Cell adjacent to a reference cell according to the topology
 * - **Area**: A cell plus all its neighbors
 *
 * **Usage Pattern:**
 * Subclasses (Connect4, Connect8, etc.) specify which offsets to use.
 * Instance methods apply these offsets to absolute coordinates.
 *
 * @example
 * // Create connectivity with orthogonal neighbors
 * class Connect4 extends ConnectBase {
 *   constructor(rectIndex) {
 *     super(rectIndex, ConnectBase.orthogonalNeighborOffsets);
 *   }
 * }
 *
 * @example
 * // Use connectivity to find neighbors
 * const connect4 = new Connect4(rectIndex);
 * const neighbors = connect4.neighbors(5, 5);
 * // Returns: [[6, 5], [4, 5], [5, 6], [5, 4]]
 */
export class ConnectBase {
  /**
   * Initialize a connectivity topology for a rectangular grid.
   *
   * Creates an instance with specified neighbor offsets that define
   * which cells are considered adjacent. The rectIndex provides
   * grid bounds information for boundary checking (if needed).
   *
   * @param {import('./RectIndex.js').RectIndex} rectIndex - Rectangular grid indexer for coordinate validation
   * @param {NeighborOffset[]} neighborOffsets - Array of [dx, dy] offsets defining neighbors
   *                                              Defaults to orthogonal (4-connected) offsets
   *
   * @example
   * const rectIndex = new RectIndex(8, 8);
   * // Orthogonal connectivity (default)
   * const connect4 = new ConnectBase(rectIndex);
   *
   * // Custom connectivity (all 8-connected)
   * const connect8 = new ConnectBase(rectIndex, ConnectBase.allNeighborOffsets);
   */
  constructor (
    rectIndex,
    neighborOffsets = ConnectBase.orthogonalNeighborOffsets
  ) {
    this.rectIndex = rectIndex
    this.neighborOffsets = neighborOffsets
  }

  /**
   * Orthogonal (4-connected) neighbor offsets for rectangular grids.
   *
   * Defines cells that share an edge (not diagonal). Forms the basic connectivity
   * for many grid-based games and algorithms like flood-fill.
   *
   * **Offset Directions:**
   * - [+1, 0]: Right
   * - [-1, 0]: Left
   * - [0, +1]: Down
   * - [0, -1]: Up
   *
   * @type {NeighborOffset[]}
   * @static
   *
   * @example
   * const offsets = ConnectBase.orthogonalNeighborOffsets;
   * // [[1, 0], [-1, 0], [0, 1], [0, -1]]
   */
  static get orthogonalNeighborOffsets () {
    return [
      [+1, 0],
      [-1, 0],
      [0, +1],
      [0, -1]
    ]
  }

  /**
   * Diagonal neighbor offsets for rectangular grids.
   *
   * Defines only cells that share a corner (diagonal), excluding edge-sharing cells.
   * Used in algorithms requiring diagonal-only connectivity.
   *
   * **Offset Directions:**
   * - [+1, +1]: Down-right
   * - [-1, -1]: Up-left
   * - [-1, +1]: Down-left
   * - [+1, -1]: Up-right
   *
   * @type {NeighborOffset[]}
   * @static
   *
   * @example
   * const offsets = ConnectBase.diagonalNeighborOffsets;
   * // [[1, 1], [-1, -1], [-1, 1], [1, -1]]
   */
  static get diagonalNeighborOffsets () {
    return [
      [+1, +1],
      [-1, -1],
      [-1, +1],
      [+1, -1]
    ]
  }

  /**
   * All neighbor offsets (8-connected: king's move).
   *
   * Combines orthogonal and diagonal offsets to create king-connected topology.
   * A cell has up to 8 neighbors: 4 edge-sharing + 4 corner-sharing.
   * Used in algorithms like A*, pathfinding, and flood-fill with full connectivity.
   *
   * **8 Neighbor Directions:**
   * - Orthogonal: Right, Left, Down, Up
   * - Diagonal: Down-right, Up-left, Down-left, Up-right
   *
   * @type {NeighborOffset[]}
   * @static
   *
   * @example
   * const offsets = ConnectBase.allNeighborOffsets;
   * // [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [-1, 1], [1, -1]]
   */
  static get allNeighborOffsets () {
    return ConnectBase.combineNeighborOffsetGroups(
      this.orthogonalNeighborOffsets,
      this.diagonalNeighborOffsets
    )
  }

  /**
   * Combine multiple neighbor offset groups into a single flattened offset list.
   *
   * Merges multiple offset arrays, useful for creating composite connectivity patterns.
   * For example: combining orthogonal and diagonal to create 8-connected topology.
   *
   * @param {...NeighborOffset[]} groups - One or more arrays of offsets to combine
   * @returns {NeighborOffset[]} Flattened array of all offsets from all groups
   * @static
   *
   * @example
   * const orthogonal = [[1, 0], [-1, 0]];
   * const diagonal = [[1, 1], [-1, -1]];
   * const combined = ConnectBase.combineNeighborOffsetGroups(orthogonal, diagonal);
   * // combined = [[1, 0], [-1, 0], [1, 1], [-1, -1]]
   */
  static combineNeighborOffsetGroups (...groups) {
    return groups.flat()
  }

  /**
   * Translate relative neighbor offsets into absolute grid coordinates.
   *
   * Converts offset patterns to absolute coordinates by adding the reference point.
   * Core method used by neighbors() and area() to compute actual cell positions.
   *
   * @param {number} x - Reference cell's X coordinate (column)
   * @param {number} y - Reference cell's Y coordinate (row)
   * @param {NeighborOffset[]} offsets - Array of [dx, dy] relative displacements
   * @returns {Coordinate[]} Array of absolute [x, y] coordinates for all offsets
   *
   * @example
   * const offsets = [[1, 0], [-1, 0], [0, 1], [0, -1]];
   * const coords = connectBase.translateOffsets(5, 5, offsets);
   * // coords = [[6, 5], [4, 5], [5, 6], [5, 4]]
   */
  translateOffsets (x, y, offsets) {
    return offsets.map(([dx, dy]) => [x + dx, y + dy])
  }

  /**
   * Return the coordinates of all neighboring cells for the given position.
   *
   * Applies the connectivity topology's neighbor offsets to the reference point.
   * Does not include the reference cell itself.
   * Does not validate boundary conditions.
   *
   * @param {number} x - Reference cell's X coordinate (column)
   * @param {number} y - Reference cell's Y coordinate (row)
   * @returns {Coordinate[]} Array of absolute coordinates of all neighbors
   *
   * @example
   * // Orthogonal connectivity at (3, 3)
   * const neighbors = connect4.neighbors(3, 3);
   * // Returns: [[4, 3], [2, 3], [3, 4], [3, 2]]
   *
   * // All 8-connected neighbors at (5, 5)
   * const neighbors8 = connect8.neighbors(5, 5);
   * // Returns 8 coordinates surrounding (5, 5)
   */
  neighbors (x, y) {
    return this.translateOffsets(x, y, this.neighborOffsets)
  }

  /**
   * Return the area: the center cell plus all its neighbors.
   *
   * Convenience method combining the reference cell with its neighborhood.
   * The center cell [x, y] is always first in the returned array.
   * Useful for flood-fill, pattern matching, and local analysis algorithms.
   *
   * @param {number} x - Center cell's X coordinate (column)
   * @param {number} y - Center cell's Y coordinate (row)
   * @returns {Coordinate[]} Array with center cell first, followed by neighbors
   *
   * @example
   * // Orthogonal connectivity area at (3, 3)
   * const area = connect4.area(3, 3);
   * // Returns: [[3, 3], [4, 3], [2, 3], [3, 4], [3, 2]]
   * // Center at index 0, then 4 orthogonal neighbors
   *
   * // 8-connected area includes diagonals
   * const area8 = connect8.area(5, 5);
   * // Returns: [[5, 5], ...8 neighbors]
   */
  area (x, y) {
    return [[x, y], ...this.neighbors(x, y)]
  }
}
