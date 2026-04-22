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

export class ListCanvas extends GridBase {
  /**
   * Create a canvas backed by a coordinate list.
   * @param {Object} shape - Shape configuration
   * @param {Array<Array>} list - List of [x, y, color] coordinates
   */
  constructor (shape, list) {
    super(shape)
    this.list = list || []
  }

  /**
   * Get the value at a coordinate.
   * @param {number} x - Column index
   * @param {number} y - Row index
   * @returns {number} Cell value (0 if not found, 1 if no color, stored color otherwise)
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
   * @param {number} value - Color value (optional)
   */
  set (x, y, value) {
    const isDuplicate = this.isDuplicate(x, y)
    if (isDuplicate) return
    if (value == null) {
      this.list.push([x, y])
      this._actions = null
    } else {
      this.list.push([x, y, value])
      this._actions = null
    }
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
   * Delegate drawing method with optional color parameter.
   * @private
   */
  _delegateDraw (methodName, args, optionalColor) {
    const drawFn = eval(methodName)
    if (optionalColor === undefined) {
      drawFn(...args, this)
    } else {
      drawFn(...args, this, optionalColor)
    }
  }

  /**
   * Draw a line segment to endpoint (inclusive).
   * @param {number} x0 - Start x
   * @param {number} y0 - Start y
   * @param {number} x1 - End x
   * @param {number} y1 - End y
   * @param {number} color - Color value (optional)
   */
  drawSegmentTo (x0, y0, x1, y1, color) {
    if (color === undefined) drawSegmentTo(x0, y0, x1, y1, this)
    else drawSegmentTo(x0, y0, x1, y1, this, color)
  }

  /**
   * Draw a line segment up to endpoint (exclusive).
   * @param {number} x0 - Start x
   * @param {number} y0 - Start y
   * @param {number} x1 - End x
   * @param {number} y1 - End y
   * @param {number} color - Color value (optional)
   */
  drawSegmentUpTo (x0, y0, x1, y1, color) {
    if (color === undefined) drawSegmentUpTo(x0, y0, x1, y1, this)
    else drawSegmentUpTo(x0, y0, x1, y1, this, color)
  }

  /**
   * Draw a line segment for a specific distance.
   * @param {number} x0 - Start x
   * @param {number} y0 - Start y
   * @param {number} x1 - End x
   * @param {number} y1 - End y
   * @param {number} distance - Maximum steps
   * @param {number} color - Color value (optional)
   */
  drawSegmentFor (x0, y0, x1, y1, distance, color) {
    if (color === undefined) drawSegmentFor(x0, y0, x1, y1, distance, this)
    else drawSegmentFor(x0, y0, x1, y1, distance, this, color)
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
   * @param {number} color - Color value (optional)
   */
  drawRay (x0, y0, x1, y1, color) {
    if (color === undefined) drawRay(x0, y0, x1, y1, this)
    else drawRay(x0, y0, x1, y1, this, color)
  }

  /**
   * Draw a line extended infinitely through canvas boundaries.
   * @param {number} x0 - Start x
   * @param {number} y0 - Start y
   * @param {number} x1 - End x
   * @param {number} y1 - End y
   * @param {number} color - Color value (optional)
   */
  drawLineInfinite (x0, y0, x1, y1, color) {
    if (color === undefined) drawLineInfinite(x0, y0, x1, y1, this)
    else drawLineInfinite(x0, y0, x1, y1, this, color)
  }

  /**
   * Get 2D array representation of canvas.
   * @returns {Array<Array>} Grid of coordinates
   */
  get grid () {
    this._grid = coordsToGrid(this.list, this.width, this.height)
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
}
