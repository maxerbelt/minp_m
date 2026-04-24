import { Mask } from '../../grid/rectangle/mask.js'
import { DrawBase } from '../drawBase.js'

/**
 * Interactive rectangular grid drawer for Mask class
 * Color coding: set=green, unset=blue, hover=orange
 */
export class RectDraw extends DrawBase {
  /**
   * Creates a RectDraw instance for rendering rectangular grids.
   * @param {string} canvasId - The ID of the canvas element.
   * @param {number} [width=10] - Width of the grid in cells.
   * @param {number} [height=10] - Height of the grid in cells.
   * @param {number} [cellSize=25] - Size of each cell in pixels.
   * @param {number} [offsetX=0] - X offset for drawing.
   * @param {number} [offsetY=0] - Y offset for drawing.
   * @param {number} [depth=2] - Bit depth per cell.
   */
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
   * @param {Array<Array<number>>} coords - Array of [x, y] coordinate pairs.
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
   * Iterate over grid dimensions executing callback for each cell.
   * @param {Function} callback - Function receiving (x, y) coordinates.
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
   * Check if a cell at (x, y) is set to 1.
   * @param {number} x - X coordinate.
   * @param {number} y - Y coordinate.
   * @returns {boolean} True if cell is set.
   * @private
   */
  _isCellSet (x, y) {
    return this.mask.at(x, y) === 1
  }

  /**
   * Determine color for cell based on set/unset state.
   * @param {boolean} isSet - Whether cell is set.
   * @returns {string} Color string.
   * @private
   */
  _getCellColor (isSet) {
    return isSet ? '#4caf50' : '#2196F3' // green for set, blue for unset
  }

  /**
   * Draw a single cell at (x, y) with color and stroke.
   * @param {number} x - X coordinate.
   * @param {number} y - Y coordinate.
   * @param {string} [color='#4caf50'] - Fill color.
   * @param {string} [stroke='#333'] - Stroke color.
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
   * Draw a rectangular cell at grid coordinates with color and stroke.
   * @param {number} x - X coordinate.
   * @param {number} y - Y coordinate.
   * @param {string} [color='#4caf50'] - Fill color.
   * @param {string} [strokeColor='#333'] - Stroke color.
   * @private
   */
  _drawRectCell (x, y, color = '#4caf50', strokeColor = '#333') {
    this._drawCell(x, y, color, strokeColor)
  }

  // ============================================================================
  // Hover Rendering
  // ============================================================================

  /**
   * Draw hovered cell in orange highlight.
   * @private
   */
  _drawHover () {
    if (this.hoverLocation !== null) {
      this._drawHoverCell()
    }
  }

  /**
   * Render the hover highlight at current hover location.
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
   * Toggle a cell at [x, y] coordinates.
   * @param {Array<number>|null} location - [x, y] coordinate pair or null.
   */
  toggleCell (location) {
    if (location !== null) {
      this._toggleCellState(location[0], location[1])
    }
  }

  /**
   * Toggle binary state of a cell and redraw.
   * @param {number} x - X coordinate.
   * @param {number} y - Y coordinate.
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
   * Hit test to find which cell is at pixel coordinates.
   * @param {number} px - Pixel X coordinate.
   * @param {number} py - Pixel Y coordinate.
   * @returns {Array<number>|null} [x, y] coordinates or null if out of bounds.
   * @private
   */
  _hitTest (px, py) {
    const gridCoords = this._pixelToGridCoords(px, py)
    return this._isValidCell(gridCoords[0], gridCoords[1]) ? gridCoords : null
  }

  /**
   * Convert pixel coordinates to grid coordinates.
   * Respects coordinateMode (clamped vs wrapped).
   * @param {number} px - Pixel X coordinate.
   * @param {number} py - Pixel Y coordinate.
   * @returns {Array<number>} [x, y] grid coordinates.
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
   * Check if coordinates are within grid bounds.
   * In wrapped mode, all coordinates are valid.
   * @param {number} x - X coordinate.
   * @param {number} y - Y coordinate.
   * @returns {boolean} True if valid.
   * @private
   */
  _isValidCell (x, y) {
    if (this.coordinateMode === 'wrapped') {
      return true
    }
    return x >= 0 && x < this.width && y >= 0 && y < this.height
  }
}
