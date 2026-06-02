import { ActionsTri } from './actionsTri.js'
import { Indexer } from '../indexer.js'
import { Connect3 } from './Connect3.js'
import { Connect3Vertex } from './Connect3Vertex.js'
import { TriConnect6 } from './TriConnect6.js'
import { TriConnect6Extended } from './TriConnect6Extended.js'
import { Connect12 } from './Connect12.js'
import { TriNormalCover } from './TriNormalCover.js'
import { TriHalfCover } from './TriHalfCover.js'
import { TriSuperCover } from './TriSuperCover.js'

/**
 * @typedef {Object} ConnectionTypesTriangle
 * @description
 * Connectivity definitions for triangular grids with different neighbor configurations:
 * - '3': Edge neighbors only (triangles sharing an edge)
 * - '3vertex': Vertex neighbors (triangles sharing a vertex)
 * - '6': 6-connected neighborhood
 * - '6extended': Extended 6-connected neighborhood
 * - '12': All 12 surrounding neighbors (most inclusive)
 */

/**
 * @typedef {[number, number]} TriangleCoordinate
 * @description
 * Row-column coordinate for triangular grid [r, c].
 * - r: Row index (0 to side-1), determines triangle count per row
 * - c: Column index within row (0 to 2*r), determines position in row
 */

/**
 * @typedef {[number, number, number]} CubeCoordinate
 * @description
 * Cube coordinate representation for triangular grids [q, r, s].
 * Used internally for line drawing and coordinate transformations.
 * Constraint: q + r + s = 0 (always maintained).
 */

/**
 * Triangular grid index for efficient spatial indexing and connectivity queries.
 *
 * Extends Indexer to provide grid-specific operations for triangular grids,
 * using a row-column coordinate system where each row contains an increasing
 * number of triangles. Row r contains (2*r+1) triangles, from column 0 to 2*r.
 *
 * Key Features:
 * - Efficient 2D ↔ 1D index conversion using formula: index = r² + c
 * - Multiple connectivity types for neighbor queries:
 *   - Edge connectivity (3 edge-sharing neighbors)
 *   - Vertex connectivity (3 vertex-sharing neighbors)
 *   - 6-connectivity (edge + vertex neighbors)
 *   - 12-connectivity (all surrounding neighbors)
 * - Cube coordinate system for line drawing operations
 * - Line drawing algorithms (normal, half, super coverage)
 * - Grid traversal generators (rows, cells, all locations)
 * - Triangle parity detection (orientation determination)
 *
 * Coordinate System:
 * - Row-column (r, c) for user-facing operations
 * - Cube coordinates (q, r, s) used internally for line drawing
 * - Conversion formulas: q = c - r, s = -c, r = r (cube r different from grid r)
 *
 * Storage Model:
 * - Row r has (2*r+1) triangles
 * - Total cells: side²
 * - Index formula: r² + c (where r >= 0, c >= 0, c <= 2*r)
 *
 * Default Configuration:
 * - Connectivity: 12-connected (all surrounding neighbors)
 * - Boundary mode: Clamping (invalid coordinates return undefined)
 *
 * @class TriIndex
 * @extends Indexer
 * @example
 * const index = new TriIndex(10);
 * const cellIdx = index.index(5, 3);          // Get 1D index from [r, c]
 * const [r, c] = index.location(cellIdx);     // Get [r, c] from 1D index
 * const neighbors = index.neighbors(5, 3);    // Get 12-connected neighbors
 * const neighbors6 = index.neighbors6(5, 3);  // Get 6-connected neighbors
 */
export class TriIndex extends Indexer {
  /**
   * Initialize triangular grid index.
   *
   * Creates a new triangular grid index with specified side length.
   * Initializes coverage algorithms (normal, half, super) and connectivity objects
   * for different neighbor configurations (edge, vertex, 6, 12).
   * The grid uses a row-based storage model where row r contains (2*r+1) triangles.
   *
   * Grid Configuration:
   * - Total cells: side²
   * - Row r contains: 2*r+1 triangles (r = 0 to side-1)
   * - Valid columns: c = 0 to 2*r for row r
   * - Width (bounding box): 2*side-1
   * - Height (bounding box): side
   *
   * @param {number} side - Grid side length (must be positive integer > 0)
   * @throws {Error} If side is not a positive integer
   * @example
   * const grid = new TriIndex(10);     // 10x10 triangular grid (100 cells)
   * const grid2 = new TriIndex(1);     // Minimum 1x1 grid (1 cell)
   */
  constructor (side) {
    // pattern: row r has 2*r+1 triangles (odd counts), total size = side*side
    const size = side * side
    super(size)

    /**
     * Grid side length (determines total grid size as side²).
     * @type {number}
     * @readonly
     */
    this.side = side

    /**
     * Bounding box width (2*side-1) for normalization and bounds checking.
     * @type {number}
     * @readonly
     */
    // bounding dimensions for normalization: width is full base (2*side-1)
    this.width = 2 * side - 1

    /**
     * Bounding box height (side) for normalization and bounds checking.
     * @type {number}
     * @readonly
     */
    this.height = side

    this._installIndexIteratorWrappers()

    /**
     * Connectivity objects for different neighbor configurations.
     * @type {Object}
     * @property {Connect3} 3 - Edge-connected neighbors (triangles sharing an edge)
     * @property {Connect3Vertex} 3vertex - Vertex-connected neighbors (triangles sharing a vertex)
     * @property {TriConnect6} 6 - 6-connected neighborhood
     * @property {TriConnect6Extended} 6extended - Extended 6-connected neighborhood
     * @property {Connect12} 12 - All 12 surrounding neighbors
     */
    this.connection = {
      3: new Connect3(this),
      '3vertex': new Connect3Vertex(this),
      6: new TriConnect6(this),
      '6extended': new TriConnect6Extended(this),
      12: new Connect12(this)
    }

    /**
     * Coverage algorithms for line drawing (normal, half, super-coverage).
     * @type {Object}
     * @property {TriNormalCover} normal - Normal/full coverage line drawing
     * @property {TriHalfCover} half - Half-plane coverage line drawing
     * @property {TriSuperCover} super - Super-coverage (Euclidean) line drawing
     */
    this.cover = {
      normal: new TriNormalCover(this),
      half: new TriHalfCover(this),
      super: new TriSuperCover(this)
    }
  }

  /**
   * Convert [row, column] coordinate to linear index.
   *
   * Maps a 2D triangular coordinate to a 1D index using the formula: index = r² + c.
   * Returns undefined for invalid coordinates.
   *
   * @param {number} r - Row index (0 to side-1)
   * @param {number} c - Column index within row (0 to 2*r)
   * @returns {number|undefined} Linear index (0 to size-1) or undefined if invalid
   * @example
   * const idx = index.index(5, 3);   // Returns 5*5 + 3 = 28
   */
  index (r, c) {
    if (!this.isValid(r, c)) return undefined
    // base index for row r is r^2
    return r * r + c
  }

  /**
   * Convert linear index to [row, column] coordinate.
   *
   * Maps a 1D index back to 2D triangular coordinates.
   * Inverse operation of index(). Returns undefined for out-of-bounds indices.
   *
   * @param {number} i - Linear index (0 to size-1)
   * @returns {TriangleCoordinate|undefined} [r, c] coordinate pair or undefined if invalid
   * @example
   * const [r, c] = index.location(28);   // Returns approximately [5, 3]
   */
  location (i) {
    if (i < 0 || i >= this.size) return undefined
    const r = Math.floor(Math.sqrt(i))
    const c = i - r * r
    return [r, c]
  }

  /**
   * Check if coordinate is within grid bounds.
   *
   * Validates that the given coordinate exists in the triangular grid.
   * Row r is valid if 0 <= r < side and c is valid if 0 <= c <= 2*r.
   *
   * @param {number} r - Row index
   * @param {number} c - Column index
   * @returns {boolean} True if coordinate is valid
   * @example
   * index.isValid(5, 3);    // Returns true if 0 <= 5 < side and 0 <= 3 <= 10
   * index.isValid(5, 15);   // Returns false if 15 > 10 (max for row 5)
   */
  isValid (r, c) {
    return r >= 0 && r < this.side && c >= 0 && c <= 2 * r
  }

  /**
   * Determine triangle parity (orientation).
   *
   * Returns 0 for up-pointing triangles and 1 for down-pointing triangles.
   * Determined by the column index's parity (odd/even).
   *
   * @param {number} _r - Row index (unused, provided for interface consistency)
   * @param {number} c - Column index
   * @returns {number} 0 for even column (up-pointing), 1 for odd column (down-pointing)
   * @example
   * index.parity(5, 3);    // Returns 1 (odd column = down-pointing)
   * index.parity(5, 4);    // Returns 0 (even column = up-pointing)
   */
  parity (_r, c) {
    return c & 1
  }

  /**
   * Convert grid coordinates to cube coordinates.
   *
   * Transforms [row, column] into cube coordinate system [q, r, s] for
   * internal line drawing calculations. Uses formulas:
   * - q = c - r
   * - s = -c
   * - r_cube = r_grid (reuse row index)
   *
   * @param {number} row - Grid row coordinate
   * @param {number} col - Grid column coordinate
   * @returns {CubeCoordinate} [q, r_cube, s] cube coordinates
   * @private
   */
  _gridToCube (row, col) {
    const q = col - row
    const s = -col
    return [q, row, s]
  }

  /**
   * Convert cube coordinates to grid coordinates.
   *
   * Transforms cube coordinate [q, r, s] back to grid [row, column].
   * Inverse of _gridToCube().
   *
   * @param {number} q - Cube q coordinate
   * @param {number} r - Cube r coordinate (equals grid row)
   * @param {number} s - Cube s coordinate
   * @returns {TriangleCoordinate} [row, column] grid coordinates
   * @private
   */
  _cubeToGrid (q, r, s) {
    return [r, -s]
  }

  /**
   * Round fractional cube coordinates to valid integer coordinates.
   *
   * Projects fractional cube coordinates onto the nearest valid grid point
   * while maintaining the cube constraint (q + r + s = 0).
   * Determines which coordinate has the largest error and corrects it.
   *
   * @param {number} q - Fractional q coordinate
   * @param {number} r - Fractional r coordinate
   * @param {number} s - Fractional s coordinate
   * @returns {[number, number]} [rounded_q, rounded_r, rounded_s] (s is implied)
   * @private
   */
  _roundCubeCoordinates (q, r, s) {
    let roundedQ = Math.round(q)
    let roundedR = Math.round(r)
    let roundedS = Math.round(s)

    const [qDiff, rDiff, sDiff] = this._calculateCubeDifferences(
      q,
      r,
      s,
      roundedQ,
      roundedR,
      roundedS
    )

    if (qDiff > rDiff && qDiff > sDiff) {
      roundedQ = -roundedR - roundedS
    } else if (rDiff > sDiff) {
      roundedR = -roundedQ - roundedS
    } else {
      roundedS = -roundedQ - roundedR
    }

    return [roundedQ, roundedR, roundedS]
  }

  /**
   * Calculates absolute differences between original and rounded cube coordinates.
   *
   * Helper method that computes per-axis error between fractional and rounded
   * cube coordinates. Used to determine which coordinate needs correction.
   *
   * @param {number} q - Original q coordinate
   * @param {number} r - Original r coordinate
   * @param {number} s - Original s coordinate
   * @param {number} roundedQ - Rounded q coordinate
   * @param {number} roundedR - Rounded r coordinate
   * @param {number} roundedS - Rounded s coordinate
   * @returns {Array<number>} [qDiff, rDiff, sDiff] - Absolute differences per axis
   * @private
   */
  _calculateCubeDifferences (q, r, s, roundedQ, roundedR, roundedS) {
    return [
      Math.abs(roundedQ - q),
      Math.abs(roundedR - r),
      Math.abs(roundedS - s)
    ]
  }

  /**
   * Compute cube coordinate deltas for line segment.
   *
   * Calculates the start/end points and deltas in cube coordinate space
   * for a line from (startRow, startCol) to (endRow, endCol).
   * Used by line drawing algorithms.
   *
   * @param {number} startRow - Starting grid row
   * @param {number} startCol - Starting grid column
   * @param {number} endRow - Ending grid row
   * @param {number} endCol - Ending grid column
   * @returns {Object} Line data with start points, end points, and deltas
   * @private
   */
  _computeCubeLineDeltas (startRow, startCol, endRow, endCol) {
    const [startQ, startCubeR, startS] = this._gridToCube(startRow, startCol)
    const [endQ, endCubeR, endS] = this._gridToCube(endRow, endCol)

    return {
      startQ,
      startCubeR,
      startS,
      endQ,
      endCubeR,
      endS,
      deltaQ: endQ - startQ,
      deltaCubeR: endCubeR - startCubeR,
      deltaS: endS - startS
    }
  }

  /**
   * Calculate number of steps needed for cube line.
   *
   * Determines the maximum number of steps in any dimension (Chebyshev distance).
   * Used to divide the line into uniform steps for interpolation.
   *
   * @param {number} deltaQ - Change in q coordinate
   * @param {number} deltaCubeR - Change in r coordinate
   * @param {number} deltaS - Change in s coordinate
   * @returns {number} Number of interpolation steps
   * @private
   */
  _cubeLineStepCount (deltaQ, deltaCubeR, deltaS) {
    return Math.max(Math.abs(deltaQ), Math.abs(deltaCubeR), Math.abs(deltaS))
  }

  /**
   * Calculate cube position at a specific interpolation step.
   *
   * Computes the cube coordinates at a given step along the line,
   * then rounds to the nearest valid grid point.
   *
   * @param {number} step - Current step (0 to totalSteps)
   * @param {number} totalSteps - Total steps in the line
   * @param {number} startQ - Start q coordinate
   * @param {number} startCubeR - Start r coordinate
   * @param {number} startS - Start s coordinate
   * @param {number} deltaQ - Delta q per step
   * @param {number} deltaCubeR - Delta r per step
   * @param {number} deltaS - Delta s per step
   * @returns {CubeCoordinate} [q, r, s] rounded cube coordinates at this step
   * @private
   */
  _calculateCubePositionAtStep (
    step,
    totalSteps,
    startQ,
    startCubeR,
    startS,
    deltaQ,
    deltaCubeR,
    deltaS
  ) {
    const progress = step / totalSteps
    return this._roundCubeCoordinates(
      startQ + deltaQ * progress,
      startCubeR + deltaCubeR * progress,
      startS + deltaS * progress
    )
  }

  /**
   * Check if current grid cell is a duplicate of the previous one.
   *
   * Helper to skip duplicate cells when drawing lines through triangular grids.
   * Line drawing may visit the same cell multiple times due to interpolation.
   *
   * @param {number} currentR - Current cell row
   * @param {number} currentC - Current cell column
   * @param {number} previousR - Previous cell row
   * @param {number} previousC - Previous cell column
   * @returns {boolean} True if current cell equals previous cell
   * @private
   */
  _isDuplicateGridCell (currentR, currentC, previousR, previousC) {
    return currentR === previousR && currentC === previousC
  }

  /**
   * Generate coordinates along a line using cube coordinate interpolation.
   *
   * Yields grid coordinates [r, c] for all cells along a line from
   * (startR, startC) to (endR, endC) using cube coordinate space.
   * Skips duplicate cells and respects grid boundaries.
   *
   * @generator
   * @param {number} startR - Starting row
   * @param {number} startC - Starting column
   * @param {number} endR - Ending row
   * @param {number} endC - Ending column
   * @yields {TriangleCoordinate} [r, c] coordinates along the line
   * @returns {Generator<TriangleCoordinate, void, void>}
   * @private
   */
  *_cubeLineCoords (startR, startC, endR, endC) {
    const lineData = this._computeCubeLineDeltas(startR, startC, endR, endC)
    const steps = this._cubeLineStepCount(
      lineData.deltaQ,
      lineData.deltaCubeR,
      lineData.deltaS
    )

    if (steps === 0) {
      if (this.isValid(startR, startC)) {
        yield [startR, startC]
      }
      return
    }

    yield* this._generateCubeLinePoints(lineData, steps)
  }

  /**
   * Generates points along the cube coordinate line.
   *
   * Iterator that yields all valid grid cells along an interpolated cube line,
   * filtering out duplicates and out-of-bounds coordinates.
   *
   * @generator
   * @param {Object} lineData - Line delta data with start/end/delta coordinates
   * @param {number} steps - Total steps in the line
   * @yields {TriangleCoordinate} [r, c] valid coordinates along the line
   * @returns {Generator<TriangleCoordinate, void, void>}
   * @private
   */
  *_generateCubeLinePoints (lineData, steps) {
    let previousR = null
    let previousC = null

    for (let step = 0; step <= steps; step++) {
      const point = this._calculateCubePointAtStep(lineData, step, steps)
      if (!point) continue

      const [currentR, currentC] = point
      if (this._isDuplicateGridCell(currentR, currentC, previousR, previousC)) {
        continue
      }

      if (!this.isValid(currentR, currentC)) {
        continue
      }

      yield [currentR, currentC]
      previousR = currentR
      previousC = currentC
    }
  }

  /**
   * Calculates cube coordinates at a specific step and converts to grid coordinates.
   *
   * Helper that performs step-by-step interpolation along a cube coordinate line,
   * rounds the result, and converts back to grid coordinates.
   *
   * @param {Object} lineData - Line delta data
   * @param {number} step - Current step
   * @param {number} steps - Total steps
   * @returns {TriangleCoordinate|null} [r, c] coordinates or null if invalid
   * @private
   */
  _calculateCubePointAtStep (lineData, step, steps) {
    const [q, cubeR, s] = this._calculateCubePositionAtStep(
      step,
      steps,
      lineData.startQ,
      lineData.startCubeR,
      lineData.startS,
      lineData.deltaQ,
      lineData.deltaCubeR,
      lineData.deltaS
    )
    return this._cubeToGrid(q, cubeR, s)
  }

  /**
   * Extend line endpoint to grid boundary.
   *
   * Computes a far endpoint in the direction of (endR, endC) so that extending
   * a ray in that direction will hit the grid boundary. Used for infinite line drawing.
   *
   * @param {number} startR - Starting row
   * @param {number} startC - Starting column
   * @param {number} endR - Direction ending row
   * @param {number} endC - Direction ending column
   * @returns {TriangleCoordinate} Extended endpoint coordinates
   * @private
   */
  _extendLineEndToBoundary (startR, startC, endR, endC) {
    const [startQ, startCubeR, startS] = this._gridToCube(startR, startC)
    const [endQ, endCubeR, endS] = this._gridToCube(endR, endC)
    const deltaQ = endQ - startQ
    const deltaCubeR = endCubeR - startCubeR
    const deltaS = endS - startS

    if (deltaQ === 0 && deltaCubeR === 0 && deltaS === 0) {
      return [startR, startC]
    }

    const maxScale = Math.max(this.side * 3, 10)
    return this._cubeToGrid(
      startQ + deltaQ * maxScale,
      startCubeR + deltaCubeR * maxScale,
      startS + deltaS * maxScale
    )
  }

  /**
   * Get edge-connected neighbors of a cell.
   *
   * Returns all triangles that share an edge with the cell at (r, c).
   * Each triangle has at most 3 edge neighbors (one per edge).
   *
   * @param {number} r - Row index
   * @param {number} c - Column index
   * @returns {Array<TriangleCoordinate>} Array of [r, c] neighbor coordinates
   * @example
   * const neighbors = index.neighborsEdge(5, 3);
   */
  neighborsEdge (r, c) {
    return this._getConnectionResult('3', 'neighbors', r, c)
  }

  /**
   * Get area of edge-connected cells.
   *
   * Returns the area covered by all edge-connected neighbors, useful for
   * neighborhood-based operations.
   *
   * @param {number} r - Row index
   * @param {number} c - Column index
   * @returns {Array<TriangleCoordinate>} Array of [r, c] cell coordinates in area
   * @example
   * const area = index.areaEdge(5, 3);
   */
  areaEdge (r, c) {
    return this._getConnectionResult('3', 'area', r, c)
  }

  /**
   * Get vertex-connected neighbors of a cell.
   *
   * Returns all triangles that share a vertex with the cell at (r, c).
   * Each triangle has at most 3 vertex neighbors (one per vertex).
   *
   * @param {number} r - Row index
   * @param {number} c - Column index
   * @returns {Array<TriangleCoordinate>} Array of [r, c] neighbor coordinates
   * @example
   * const neighbors = index.neighborsVertex(5, 3);
   */
  neighborsVertex (r, c) {
    return this._getConnectionResult('3vertex', 'neighbors', r, c)
  }

  /**
   * Get area of vertex-connected cells.
   *
   * Returns the area covered by all vertex-connected neighbors.
   *
   * @param {number} r - Row index
   * @param {number} c - Column index
   * @returns {Array<TriangleCoordinate>} Array of [r, c] cell coordinates in area
   * @example
   * const area = index.areaVertex(5, 3);
   */
  areaVertex (r, c) {
    return this._getConnectionResult('3vertex', 'area', r, c)
  }

  /**
   * Get extended 6-connected neighbors of a cell.
   *
   * Returns neighbors using extended 6-connectivity.
   *
   * @param {number} r - Row index
   * @param {number} c - Column index
   * @returns {Array<TriangleCoordinate>} Array of [r, c] neighbor coordinates
   * @example
   * const neighbors = index.neighborsExtended(5, 3);
   */
  neighborsExtended (r, c) {
    return this._getConnectionResult('6extended', 'neighbors', r, c)
  }

  /**
   * Get area of extended 6-connected cells.
   *
   * Returns the area covered by all extended 6-connected neighbors.
   *
   * @param {number} r - Row index
   * @param {number} c - Column index
   * @returns {Array<TriangleCoordinate>} Array of [r, c] cell coordinates in area
   * @example
   * const area = index.areaExtended(5, 3);
   */
  areaExtended (r, c) {
    return this._getConnectionResult('6extended', 'area', r, c)
  }

  /**
   * Get 6-connected neighbors of a cell.
   *
   * Returns all triangles in the 6-neighborhood (edge and some vertex neighbors).
   *
   * @param {number} r - Row index
   * @param {number} c - Column index
   * @returns {Array<TriangleCoordinate>} Array of [r, c] neighbor coordinates
   * @example
   * const neighbors = index.neighbors6(5, 3);
   */
  neighbors6 (r, c) {
    return this._getConnectionResult('6', 'neighbors', r, c)
  }

  /**
   * Get area of 6-connected cells.
   *
   * Returns the area covered by all 6-connected neighbors.
   *
   * @param {number} r - Row index
   * @param {number} c - Column index
   * @returns {Array<TriangleCoordinate>} Array of [r, c] cell coordinates in area
   * @example
   * const area = index.area6(5, 3);
   */
  area6 (r, c) {
    return this._getConnectionResult('6', 'area', r, c)
  }

  /**
   * Get all neighbors of a cell (12-connected, default connectivity).
   *
   * Returns all 12 surrounding triangles (most inclusive neighborhood).
   * This is the default connectivity mode for triangular grids.
   *
   * @param {number} r - Row index
   * @param {number} c - Column index
   * @returns {Array<TriangleCoordinate>} Array of [r, c] neighbor coordinates
   * @example
   * const neighbors = index.neighbors(5, 3);   // 12-connected by default
   */
  neighbors (r, c) {
    return this._getConnectionResult('12', 'neighbors', r, c)
  }

  /**
   * Get area of all neighbors (12-connected).
   *
   * Returns the area covered by all 12-connected neighbors.
   *
   * @param {number} r - Row index
   * @param {number} c - Column index
   * @returns {Array<TriangleCoordinate>} Array of [r, c] cell coordinates in area
   * @example
   * const area = index.area(5, 3);
   */
  area (r, c) {
    return this._getConnectionResult('12', 'area', r, c)
  }

  /**
   * Iterate over all rows in the grid.
   *
   * Generates row indices from 0 to side-1.
   *
   * @generator
   * @yields {number} Row index
   * @returns {Generator<number, void, void>}
   * @example
   * for (const r of index.rows()) {
   *   console.log(r);   // Outputs 0, 1, 2, ..., side-1
   * }
   */
  *rows () {
    for (let r = 0; r < this.side; r++) {
      yield r
    }
  }

  /**
   * Get padding string for row display.
   *
   * Returns leading spaces for ASCII grid visualization, accounting for
   * the triangular shape where rows are centered.
   *
   * @param {number} r - Row index
   * @returns {string} Padding string (side - r - 1) spaces
   * @example
   * const padding = index.rowPadding(2);
   */
  rowPadding (r) {
    return ' '.repeat(this.side - r - 1)
  }

  /**
   * Get padding between cells in a row.
   *
   * Returns the string to place between cells when displaying a row.
   *
   * @returns {string} Padding string (single space)
   */
  cellPadding () {
    return ' '
  }

  /**
   * Iterate over all cells in a specific row.
   *
   * Generates [r, c] coordinates for all cells in row r (c from 0 to 2*r).
   *
   * @generator
   * @param {number} r - Row index
   * @yields {TriangleCoordinate} [r, c] coordinate pairs
   * @returns {Generator<TriangleCoordinate, void, void>}
   * @example
   * for (const [r, c] of index.row(5)) {
   *   console.log([r, c]);   // Outputs all cells in row 5
   * }
   */
  *row (r) {
    for (let c = 0; c <= 2 * r; c++) {
      yield [r, c]
    }
  }

  /**
   * Iterate over all cells in the entire grid.
   *
   * Generates [r, c] coordinates for every cell, in row-major order.
   *
   * @generator
   * @yields {TriangleCoordinate} [r, c] coordinate pairs
   * @returns {Generator<TriangleCoordinate, void, void>}
   * @example
   * for (const [r, c] of index.allRClocations()) {
   *   console.log([r, c]);   // Outputs all cells in order
   * }
   */
  *allRClocations () {
    for (const r of this.rows()) {
      for (const [, c] of this.row(r)) {
        yield [r, c]
      }
    }
  }

  /**
   * Get actions handler for triangular grid operations.
   *
   * Returns a cached or newly created ActionsTri instance for performing
   * grid manipulation operations.
   *
   * @param {Object} bb - Bitboard object
   * @returns {ActionsTri} Actions handler instance
   * @private
   */
  actions (bb) {
    return this._getCachedActions(bb, () => new ActionsTri(this.side, bb))
  }
}
