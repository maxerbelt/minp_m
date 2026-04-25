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
 * Canvas implementation backed by a list of coordinates.
 * Provides drawing operations and grid representations for coordinate-based data.
 * Extends GridBase to provide shape-aware operations.
 */
export class ListCanvas extends GridBase {
  /**
   * Create a canvas backed by a coordinate list.
   * @param {Object} shape - Shape configuration object
   * @param {Array<Array<number>>} list - List of [x, y, color] coordinates
   */
  constructor (shape, list) {
    super(shape)
    this.list = list || []
  }

  /**
   * Get the value at a coordinate.
   * @param {number} x - Column index
   * @param {number} y - Row index
   * @returns {number|undefined} Cell value (0 if not found, 1 if no color, stored color otherwise; undefined if invalid)
   */
  at (x, y) {
    if (!this.isValid(x, y)) return undefined
    const item = this.list.find(([x1, y1]) => x === x1 && y === y1)
    if (!item) return 0
    return item[2] || 1
  }

  /**
   * Set the value at a coordinate.
   * @param {number} x - Column index
   * @param {number} y - Row index
   * @param {number} [value] - Color value (optional, defaults to 1)
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
   * @param {number} x - Column index
   * @param {number} y - Row index
   * @returns {boolean} True if coordinate exists
   * @private
   */
  isDuplicate (x, y) {
    return this.list.some(([x1, y1]) => x === x1 && y === y1)
  }

  /**
   * Reverse the order of coordinates in the list.
   */
  reverse () {
    this.list.reverse()
  }

  /**
   * Iterate over [x, y, color, index, canvas] tuples.
   * @generator
   * @yields {Array} [x, y, color, index, this]
   */
  *entries () {
    for (let i = 0; i < this.list.length; i++) {
      yield [this.list[i][0], this.list[i][1], this.list[i][2] || 1, i, this]
    }
  }

  /**
   * Iterate over color values.
   * @generator
   * @yields {number} Color value (1 if not specified)
   */
  *values () {
    for (const element of this.list) {
      yield element[2] || 1
    }
  }

  /**
   * Iterate over [x, y, index] tuples.
   * @generator
   * @yields {Array} [x, y, index]
   */
  *keys () {
    for (let i = 0; i < this.list.length; i++) {
      yield [this.list[i][0], this.list[i][1], i]
    }
  }

  /**
   * Get cached or computed actions mask.
   * @returns {*} Actions mask from indexer
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
   * @param {number} x0 - Start x coordinate
   * @param {number} y0 - Start y coordinate
   * @param {number} x1 - End x coordinate
   * @param {number} y1 - End y coordinate
   * @returns {Object} {x0, y0, x1, y1} boundary intercepts
   */
  intercepts (x0, y0, x1, y1) {
    return intercepts(x0, y0, x1, y1, this)
  }

  /**
   * Call a drawing function with optional color parameter.
   * @param {Function} drawFn - Drawing function to call
   * @param {...*} args - Arguments for the drawing function (last may be color)
   * @private
   */
  _callDrawWithOptionalColor (drawFn, ...args) {
    const lastArg = args[args.length - 1]
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
   * @param {number} x0 - Start x
   * @param {number} y0 - Start y
   * @param {number} x1 - End x
   * @param {number} y1 - End y
   * @param {number} [color] - Color value (optional)
   */
  drawSegmentTo (x0, y0, x1, y1, color) {
    this._callDrawWithOptionalColor(drawSegmentTo, x0, y0, x1, y1, color)
  }

  /**
   * Draw a line segment up to endpoint (exclusive).
   * @param {number} x0 - Start x
   * @param {number} y0 - Start y
   * @param {number} x1 - End x
   * @param {number} y1 - End y
   * @param {number} [color] - Color value (optional)
   */
  drawSegmentUpTo (x0, y0, x1, y1, color) {
    this._callDrawWithOptionalColor(drawSegmentUpTo, x0, y0, x1, y1, color)
  }

  /**
   * Draw a line segment for a specific distance.
   * @param {number} x0 - Start x
   * @param {number} y0 - Start y
   * @param {number} x1 - End x
   * @param {number} y1 - End y
   * @param {number} distance - Maximum steps
   * @param {number} [color] - Color value (optional)
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
   * @param {number} x0 - Center x
   * @param {number} y0 - Center y
   * @param {number} x1 - Direction x
   * @param {number} y1 - Direction y
   * @param {number} radius - Sector radius
   */
  drawPie (x0, y0, x1, y1, radius) {
    drawPie2(x0, y0, x1, y1, radius, this, 22.5)
  }

  /**
   * Draw a ray from one point through another.
   * @param {number} x0 - Start x
   * @param {number} y0 - Start y
   * @param {number} x1 - Direction x
   * @param {number} y1 - Direction y
   * @param {number} [color] - Color value (optional)
   */
  drawRay (x0, y0, x1, y1, color) {
    this._callDrawWithOptionalColor(drawRay, x0, y0, x1, y1, color)
  }

  /**
   * Draw a line extended infinitely through canvas boundaries.
   * @param {number} x0 - Start x
   * @param {number} y0 - Start y
   * @param {number} x1 - End x
   * @param {number} y1 - End y
   * @param {number} [color] - Color value (optional)
   */
  drawLineInfinite (x0, y0, x1, y1, color) {
    this._callDrawWithOptionalColor(drawLineInfinite, x0, y0, x1, y1, color)
  }

  /**
   * Get 2D array representation of canvas.
   * @returns {Array<Array<number>>} Grid of coordinates
   */
  get grid () {
    if (!this._grid) {
      this._grid = coordsToGrid(this.list, this.width, this.height)
    }
    return this._grid
  }

  /**
   * Get ASCII string representation of canvas.
   * @returns {string} Rows separated by newlines
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
   * @private
   */
  _invalidateCache () {
    this._actions = null
    this._grid = null
  }
}
