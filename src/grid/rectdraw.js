import { Mask } from './mask.js'
import { DrawBase } from './drawBase.js'

/**
 * Interactive rectangular grid drawer for Mask class
 * Color coding: set=green, unset=blue, hover=orange
 */
export class RectDraw extends DrawBase {
  constructor (
    canvasId,
    width = 10,
    height = 10,
    cellSize = 25,
    offsetX = 0,
    offsetY = 0,
    depth = 2
  ) {
    const mask = new Mask(width, height, null, null, depth)
    super(canvasId, mask, cellSize, offsetX, offsetY)
    this.mask = mask
    this.width = width
    this.height = height
    this.coordinateMode = 'clamped' // 'clamped' or 'wrapped'
  }

  /**
   * Set bits from array of [x, y] coordinates
   */
  setBitsFromCoords (coords) {
    this.mask.fromCoords(coords)
    this.redraw()
  }

  /**
   * Clear all cells
   */
  clear () {
    this.mask.bits = this.mask.store.empty
    this.redraw()
  }

  // ============================================================================
  // Grid Drawing
  // ============================================================================

  /**
   * Iterate over all grid cells and draw them
   * @private
   */
  _drawGrid () {
    this._iterateGridCells((x, y) => {
      const isSet = this._isCellSet(x, y)
      const color = this._getCellColor(isSet)
      this._drawRectCell(x, y, color)
    })
  }

  /**
   * Iterate over grid dimensions with callback
   * @private
   */
  _iterateGridCells (callback) {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        callback(x, y)
      }
    }
  }

  /**
   * Check if a cell at (x, y) is set
   * @private
   */
  _isCellSet (x, y) {
    return this.mask.at(x, y) === 1
  }

  /**
   * Determine color based on cell state
   * @private
   */
  _getCellColor (isSet) {
    return isSet ? '#4caf50' : '#2196F3' // green for set, blue for unset
  }

  /**
   * Draw a single cell at (x, y)
   * @private
   */
  _drawCell (x, y, color = '#4caf50', stroke = '#333') {
    const px = x * this.cellSize + this.offsetX
    const py = y * this.cellSize + this.offsetY

    this.ctx.fillStyle = color
    this.ctx.fillRect(px, py, this.cellSize, this.cellSize)

    this.ctx.strokeStyle = stroke
    this.ctx.lineWidth = 1
    this.ctx.strokeRect(px, py, this.cellSize, this.cellSize)
  }

  /**
   * Draw a rectangular cell at grid coordinates with color
   * @private
   */
  _drawRectCell (x, y, color = '#4caf50', strokeColor = '#333') {
    this._drawCell(x, y, color, strokeColor)
  }

  // ============================================================================
  // Hover Rendering
  // ============================================================================

  /**
   * Draw the hovered cell in orange
   * @private
   */
  _drawHover () {
    if (this.hoverLocation !== null) {
      this._drawHoverCell()
    }
  }

  /**
   * Render the hover highlight at current hover location
   * @private
   */
  _drawHoverCell () {
    const [x, y] = this.hoverLocation
    this._drawRectCell(x, y, '#FF9800') // orange for hover
  }

  // ============================================================================
  // State Management
  // ============================================================================

  /**
   * Toggle a cell at [x, y] coordinates
   */
  toggleCell (location) {
    if (location !== null) {
      this._toggleCellState(location[0], location[1])
    }
  }

  /**
   * Toggle binary state of a cell and redraw
   * @private
   */
  _toggleCellState (x, y) {
    const current = this.mask.at(x, y)
    this.mask.set(x, y, current ? 0 : 1)
    this.redraw()
  }

  // ============================================================================
  // Hit Testing & Coordinate Conversion
  // ============================================================================

  /**
   * Hit test to find which cell is at pixel coordinates
   * @private
   */
  _hitTest (px, py) {
    const gridCoords = this._pixelToGridCoords(px, py)
    return this._isValidCell(gridCoords[0], gridCoords[1]) ? gridCoords : null
  }

  /**
   * Convert pixel coordinates to grid coordinates
   * Respects coordinateMode (clamped vs wrapped)
   * @private
   */
  _pixelToGridCoords (px, py) {
    const x = Math.floor((px - this.offsetX) / this.cellSize)
    const y = Math.floor((py - this.offsetY) / this.cellSize)

    if (this.coordinateMode === 'wrapped') {
      return [
        ((x % this.width) + this.width) % this.width,
        ((y % this.height) + this.height) % this.height
      ]
    }
    return [x, y]
  }

  /**
   * Check if coordinates are within grid bounds
   * In wrapped mode, all coordinates are valid
   * @private
   */
  _isValidCell (x, y) {
    if (this.coordinateMode === 'wrapped') {
      return true
    }
    return x >= 0 && x < this.width && y >= 0 && y < this.height
  }
}
