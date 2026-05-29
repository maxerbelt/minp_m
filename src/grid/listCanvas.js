import {
  drawSegmentTo,
  drawSegmentUpTo,
  drawPie2,
  drawRay,
  drawSegmentFor,
  drawLineInfinite,
  intercepts
} from './maskShape.js'
import { GridBase } from './gridBase.js'
import { coordsToGrid, coordsToOccBig } from './coordsConvert.js'

/**
 * Coordinate with optional color value.
 * @typedef {[number, number] | [number, number, number]} CoordinateWithColor
 */

/**
 * Coordinate list entry with index and canvas reference.
 * @typedef {[number, number, number, number, ListCanvas]} CanvasEntry
 */

/**
 * Canvas implementation backed by a list of coordinates.
 *
 * Provides shape-aware drawing operations and grid representations for coordinate-based data.
 * Unlike grid-based canvases, ListCanvas stores only non-empty cells, making it efficient
 * for sparse data. Extends GridBase to provide boundary checking and shape validation.
 *
 * The canvas maintains an internal list of [x, y, color] tuples and provides caching
 * for computed representations (grid layout, actions mask). Cache is invalidated on modifications.
 *
 * Supports multiple drawing algorithms (segments, rays, lines, pie sectors) via delegated
 * functions from maskShape module.
 *
 * @extends GridBase
 * @example
 * const canvas = new ListCanvas(shape, [[0, 0, 1], [1, 1, 2]]);
 * canvas.drawSegmentTo(0, 0, 5, 5);      // Draw line to point
 * console.log(canvas.at(2, 2));           // Get value at coordinate
 * console.log(canvas.grid);               // Get 2D array representation
 */
export class ListCanvas extends GridBase {
  /**
   * Create a canvas backed by a coordinate list.
   *
   * Initializes a sparse coordinate-based canvas with optional initial data.
   * The list stores only occupied cells as [x, y, color] tuples.
   *
   * @constructor
   * @param {Object} shape - Shape configuration object with dimensions
   * @param {Array<CoordinateWithColor>} [list] - Initial coordinate list (optional)
   *
   * @property {Array<CoordinateWithColor>} list - List of [x, y, color] coordinates
   * @property {*} [_actions] - Cached actions mask (invalidated on modifications)
   * @property {Array<Array<number>>} [_grid] - Cached 2D grid representation
   *
   * @example
   * const canvas = new ListCanvas(shape);
   * canvas.set(0, 0, 1);
   * canvas.set(1, 1, 2);
   */
  constructor (shape, list) {
    super(shape)
    /**
     * List of coordinate tuples with optional color values.
     * @type {Array<CoordinateWithColor>}
     */
    this.list = list || []
    this._actions = null
    this._grid = null
  }

  /**
   * Get the value at a coordinate.
   *
   * Retrieves the color value stored at the given coordinate. Returns 0 for empty cells
   * (not in list), 1 for cells with implicit color, or the stored color value.
   *
   * @param {number} x - Column index
   * @param {number} y - Row index
   * @returns {number|undefined} Cell value: 0 if empty, 1+ for occupied; undefined if out of bounds
   *
   * @example
   * const color = canvas.at(2, 3);  // Get color at (2, 3)
   * console.log(color);              // 0, 1, or stored color
   */
  at (x, y) {
    if (!this.isValid(x, y)) return undefined
    const item = this.list.find(([x1, y1]) => x === x1 && y === y1)
    if (!item) return 0
    return item[2] || 1
  }

  /**
   * Set the value at a coordinate.
   *
   * Adds a new coordinate to the list. Skips duplicates to prevent double-entry.
   * Omits color value (stores [x, y] only) if value is null/undefined for space efficiency.
   *
   * @param {number} x - Column index
   * @param {number} y - Row index
   * @param {number} [value] - Color value (optional, stores without if omitted)
   * @throws {Error} If coordinate is invalid
   *
   * @example
   * canvas.set(0, 0);       // Set with implicit color 1
   * canvas.set(1, 1, 2);    // Set with explicit color
   */
  set (x, y, value) {
    const isDuplicate = this.isDuplicate(x, y)
    if (isDuplicate) return
    if (value == null) {
      this.list.push([x, y])
    } else {
      this.list.push([x, y, value])
    }
    this._invalidateCache()
  }

  /**
   * Check if coordinate already exists in list.
   *
   * Used to prevent duplicate entries when adding coordinates.
   *
   * @private
   * @param {number} x - Column index
   * @param {number} y - Row index
   * @returns {boolean} True if coordinate exists in list
   */
  isDuplicate (x, y) {
    return this.list.some(([x1, y1]) => x === x1 && y === y1)
  }

  /**
   * Reverse the order of coordinates in the list.
   *
   * Reverses the coordinate list in-place. Useful for reversing drawing order
   * or layering effects.
   *
   * @returns {void}
   */
  reverse () {
    this.list.reverse()
  }

  /**
   * Iterate over [x, y, color, index, canvas] tuples.
   *
   * Yields complete information for each coordinate in the list.
   * Color defaults to 1 if not explicitly stored.
   *
   * @generator
   * @yields {CanvasEntry} [x, y, color, index, canvas]
   * @returns {Generator<CanvasEntry, void, void>} Generator of canvas entries
   *
   * @example
   * for (const [x, y, color, idx, canvas] of canvas.entries()) {
   *   console.log(`[${x}, ${y}] = ${color}`);
   * }
   */
  *entries () {
    for (let i = 0; i < this.list.length; i++) {
      yield [this.list[i][0], this.list[i][1], this.list[i][2] || 1, i, this]
    }
  }

  /**
   * Iterate over color values.
   *
   * Yields the color value for each coordinate. Implicit colors default to 1.
   *
   * @generator
   * @yields {number} Color value (1 if not explicitly stored)
   * @returns {Generator<number, void, void>} Generator of color values
   */
  *values () {
    for (const element of this.list) {
      yield element[2] || 1
    }
  }

  /**
   * Iterate over [x, y, index] tuples.
   *
   * Yields coordinate pairs with their position in the list.
   *
   * @generator
   * @yields {Array<number>} [x, y, index] coordinate pair with list index
   * @returns {Generator<Array<number>, void, void>} Generator of coordinate tuples
   */
  *keys () {
    for (let i = 0; i < this.list.length; i++) {
      yield [this.list[i][0], this.list[i][1], i]
    }
  }

  /**
   * Get cached or computed actions mask.
   *
   * Lazily computes and caches the actions mask from the list of coordinates.
   * The cache is invalidated when the list is modified.
   *
   * @type {Object}
   * @readonly
   * @returns {Object} Actions mask for symmetry operations
   *
   * @example
   * const actions = canvas.actions;  // Computed on first access
   * console.log(actions);             // Cached on subsequent accesses
   */
  get actions () {
    if (this._actions) {
      return this._actions
    }
    const mask = coordsToOccBig(this.list, this.width)
    this._actions = this.indexer.actions(mask)
    return this._actions
  }

  /**
   * Find where a line intercepts canvas boundaries.
   *
   * Determines where a line segment (extended infinitely) crosses the grid boundaries.
   * Returns the boundary intercept points.
   *
   * @param {number} x0 - Start x coordinate
   * @param {number} y0 - Start y coordinate
   * @param {number} x1 - End x coordinate
   * @param {number} y1 - End y coordinate
   * @returns {Object} Boundary intercepts {x0, y0, x1, y1}
   *
   * @example
   * const intercept = canvas.intercepts(0, 0, 10, 10);
   * console.log(intercept);  // {x0: ..., y0: ..., x1: ..., y1: ...}
   */
  intercepts (x0, y0, x1, y1) {
    return intercepts(x0, y0, x1, y1, this)
  }

  /**
   * Call a drawing function with optional color parameter.
   *
   * Helper that routes optional color parameter handling. If the last argument is undefined,
   * calls the function without color. Otherwise passes the color through.
   *
   * @private
   * @access private
   * @param {Function} drawFn - Drawing function to call (receives canvas as second-to-last arg)
   * @param {...*} args - Arguments for drawing function (last may be optional color)
   * @returns {void}
   */
  _callDrawWithOptionalColor (drawFn, ...args) {
    const lastArg = args.at(-1)
    if (lastArg === undefined) {
      // No color provided, call without color
      drawFn(...args.slice(0, -1), this)
    } else {
      // Color provided, pass it
      drawFn(...args.slice(0, -1), this, lastArg)
    }
  }

  /**
   * Draw a line segment to endpoint (inclusive).
   *
   * Draws a line from start point to end point, including both endpoints.
   * Uses Bresenham algorithm via maskShape.drawSegmentTo.
   *
   * @param {number} x0 - Start x coordinate
   * @param {number} y0 - Start y coordinate
   * @param {number} x1 - End x coordinate
   * @param {number} y1 - End y coordinate
   * @param {number} [color] - Color value (optional, defaults to 1)
   * @returns {void}
   *
   * @example
   * canvas.drawSegmentTo(0, 0, 5, 5);      // Draw line [0,0] to [5,5]
   * canvas.drawSegmentTo(0, 0, 5, 5, 2);   // With explicit color
   */
  drawSegmentTo (x0, y0, x1, y1, color) {
    this._callDrawWithOptionalColor(drawSegmentTo, x0, y0, x1, y1, color)
  }

  /**
   * Draw a line segment up to endpoint (exclusive).
   *
   * Draws a line from start point towards end point, including start but excluding end.
   * Useful for drawing rays of fixed length.
   *
   * @param {number} x0 - Start x coordinate
   * @param {number} y0 - Start y coordinate
   * @param {number} x1 - End x coordinate
   * @param {number} y1 - End y coordinate
   * @param {number} [color] - Color value (optional, defaults to 1)
   * @returns {void}
   *
   * @example
   * canvas.drawSegmentUpTo(0, 0, 5, 5);    // Draw [0,0]...[4,4] (exclude [5,5])
   */
  drawSegmentUpTo (x0, y0, x1, y1, color) {
    this._callDrawWithOptionalColor(drawSegmentUpTo, x0, y0, x1, y1, color)
  }

  /**
   * Draw a line segment for a specific distance.
   *
   * Draws a line from start point towards end point, limited to a maximum distance.
   * Stops after drawing `distance` cells.
   *
   * @param {number} x0 - Start x coordinate
   * @param {number} y0 - Start y coordinate
   * @param {number} x1 - End x coordinate
   * @param {number} y1 - End y coordinate
   * @param {number} distance - Maximum distance in cells
   * @param {number} [color] - Color value (optional, defaults to 1)
   * @returns {void}
   *
   * @example
   * canvas.drawSegmentFor(0, 0, 10, 10, 3);  // Draw up to 3 cells from origin
   */
  drawSegmentFor (x0, y0, x1, y1, distance, color) {
    this._callDrawWithOptionalColor(
      drawSegmentFor,
      x0,
      y0,
      x1,
      y1,
      distance,
      color
    )
  }

  /**
   * Draw a pie/sector shape.
   *
   * Draws a filled pie sector (wedge shape) centered at (x0, y0) extending towards
   * direction (x1, y1) with the specified radius. Uses 22.5° angular resolution.
   *
   * @param {number} x0 - Center x coordinate
   * @param {number} y0 - Center y coordinate
   * @param {number} x1 - Direction x coordinate
   * @param {number} y1 - Direction y coordinate
   * @param {number} radius - Sector radius in cells
   * @returns {void}
   *
   * @example
   * canvas.drawPie(10, 10, 15, 10, 5);  // Pie centered at (10,10), facing right
   */
  drawPie (x0, y0, x1, y1, radius) {
    drawPie2(x0, y0, x1, y1, radius, this, 22.5)
  }

  /**
   * Draw a ray from one point through another.
   *
   * Draws a ray starting at (x0, y0) and extending towards (x1, y1) until
   * reaching the grid boundary.
   *
   * @param {number} x0 - Start x coordinate
   * @param {number} y0 - Start y coordinate
   * @param {number} x1 - Direction x coordinate
   * @param {number} y1 - Direction y coordinate
   * @param {number} [color] - Color value (optional, defaults to 1)
   * @returns {void}
   *
   * @example
   * canvas.drawRay(5, 5, 10, 10);  // Ray from (5,5) towards (10,10)
   */
  drawRay (x0, y0, x1, y1, color) {
    this._callDrawWithOptionalColor(drawRay, x0, y0, x1, y1, color)
  }

  /**
   * Draw a line extended infinitely through canvas boundaries.
   *
   * Draws a full line passing through both points, extended to reach all grid boundaries.
   * The line extends in both directions from the start point through the end point.
   *
   * @param {number} x0 - First point x coordinate
   * @param {number} y0 - First point y coordinate
   * @param {number} x1 - Second point x coordinate
   * @param {number} y1 - Second point y coordinate
   * @param {number} [color] - Color value (optional, defaults to 1)
   * @returns {void}
   *
   * @example
   * canvas.drawLineInfinite(0, 0, 5, 5);  // Full diagonal line through (0,0) and (5,5)
   */
  drawLineInfinite (x0, y0, x1, y1, color) {
    this._callDrawWithOptionalColor(drawLineInfinite, x0, y0, x1, y1, color)
  }

  /**
   * Get 2D array representation of canvas.
   *
   * Lazily computes and caches a 2D grid array from the coordinate list.
   * Each cell contains the color value or 0 for empty cells.
   * Cache is invalidated on modifications.
   *
   * @type {Array<Array<number>>}
   * @readonly
   * @returns {Array<Array<number>>} 2D grid indexed as [y][x]
   *
   * @example
   * const grid = canvas.grid;
   * console.log(grid[2][3]);  // Value at y=2, x=3
   */
  get grid () {
    if (!this._grid) {
      this._grid = coordsToGrid(this.list, this.width, this.height)
    }
    return this._grid
  }

  /**
   * Get ASCII string representation of canvas.
   *
   * Generates a human-readable ASCII visualization of the canvas.
   * Each cell displays its color value or '.' for empty cells.
   * Rows are separated by newlines.
   *
   * @type {string}
   * @readonly
   * @returns {string} ASCII representation with rows separated by newlines
   *
   * @example
   * console.log(canvas.asci);
   * // Output:
   * // 1.2....
   * // ..3....
   * // .......
   */
  get asci () {
    const grid = this.grid
    let out = ''
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        out += grid[y][x] || '.'
      }
      out += '\n'
    }
    return out
  }

  /**
   * Invalidate cached data when canvas is modified.
   *
   * Clears cached representations (grid and actions) so they will be
   * recomputed on next access. Called automatically by set() and reverse().
   *
   * @private
   * @access private
   * @returns {void}
   */
  _invalidateCache () {
    this._actions = null
    this._grid = null
  }
}
