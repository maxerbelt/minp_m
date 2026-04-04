import { Packed } from '../../grid/rectangle/packed.js'
import { DrawBase } from '../drawBase.js'

/**
 * Interactive packed grid drawer for Packed class
 * Supports multi-bit cells with value display
 * Color intensity based on cell value
 */
export class PackedDraw extends DrawBase {
  constructor (
    canvasId,
    width = 10,
    height = 10,
    cellSize = 25,
    offsetX = 0,
    offsetY = 0,
    depth = 4
  ) {
    const packed = new Packed(width, height, undefined, undefined, depth)
    super(canvasId, packed, cellSize, offsetX, offsetY)
    this.packed = packed
    this.width = width
    this.height = height
    this.depth = depth
    // depth is number of discrete values; max index is depth-1
    this.maxValue = depth - 1
    this.coordinateMode = 'clamped' // 'clamped' or 'wrapped'
  }

  /**
   * Set cell value at coordinate
   */
  setCellValue (x, y, value) {
    if (this._isValidCell(x, y)) {
      this.packed.set(x, y, value)
      this.redraw()
    }
  }

  /**
   * Get cell value at coordinate
   */
  getCellValue (x, y) {
    if (this._isValidCell(x, y)) {
      return this.packed.at(x, y)
    }
    return 0
  }

  /**
   * Set bits from array of [x, y] coordinates (sets to max value)
   */
  setBitsFromCoords (coords) {
    for (const item of coords) {
      this._setCoordWithColor(item)
    }
    this.redraw()
  }

  /**
   * Set a coordinate with optional color, defaulting to max value
   * @private
   */
  _setCoordWithColor (item) {
    const x = item[0]
    const y = item[1]
    let color = item[2]

    // Validate color value
    if (typeof color !== 'number' || color > this.maxValue) {
      color = this.maxValue
    }

    if (this._isValidCell(x, y)) {
      this.packed.set(x, y, color)
    }
  }

  /**
   * Clear all cells
   */
  clear () {
    this.packed.bits = this.packed.store.newWords()
    this.redraw()
  }

  // ============================================================================
  // Grid Drawing
  // ============================================================================

  /**
   * Draw all cells with intensity based on value
   * @private
   */
  _drawGrid () {
    this._iterateGridCells((x, y) => {
      const value = this._getCellValue(x, y)
      const color = this._valueToColor(value)
      this._drawCellWithValue(x, y, color)
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
   * Get cell value with bounds checking
   * @private
   */
  _getCellValue (x, y) {
    return this.packed.at(x, y)
  }

  /**
   * Draw a cell and optionally its value text
   * @private
   */
  _drawCellWithValue (x, y, color = '#4caf50', strokeColor = '#333') {
    this._drawCell(x, y, color, strokeColor)

    // Draw value text if it's significant
    const value = this._getCellValue(x, y)
    if (this._shouldDrawValueText(value)) {
      this._drawValueText(x, y, value)
    }
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
   * Determine if cell value should be displayed as text
   * @private
   */
  _shouldDrawValueText (value) {
    return value > 0 && this.cellSize > 20
  }

  /**
   * Render value text centered in cell
   * @private
   */
  _drawValueText (x, y, value) {
    const px = x * this.cellSize + this.offsetX
    const py = y * this.cellSize + this.offsetY

    this.ctx.fillStyle = '#fff'
    this.ctx.font = '12px Arial'
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'middle'
    const centerX = px + this.cellSize / 2
    const centerY = py + this.cellSize / 2
    this.ctx.fillText(value.toString(), centerX, centerY)
  }

  /**
   * Convert cell value to color (intensity gradient)
   * 0=blue, max=green
   * @private
   */
  _valueToColor (value) {
    if (value === 0) {
      return '#2196F3' // blue for empty
    }
    const intensity = Math.round((value / this.maxValue) * 255)
    const green = Math.round(intensity * 0.8)
    const red = Math.round(intensity * 0.3)
    return `rgb(${red}, ${green}, 50)`
  }

  // ============================================================================
  // Hover Rendering
  // ============================================================================

  /**
   * Draw the hovered cell with orange highlight
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
    this._drawCellWithValue(x, y, '#FF9800')
  }

  // ============================================================================
  // State Management
  // ============================================================================

  /**
   * Cycle cell value on click (0 -> 1 -> ... -> max -> 0)
   */
  toggleCell (location) {
    if (location !== null) {
      this._cycleCellValue(location[0], location[1])
    }
  }

  /**
   * Advance cell value to next in cycle
   * @private
   */
  _cycleCellValue (x, y) {
    const current = this._getCellValue(x, y)
    const next = (current + 1) % (this.maxValue + 1)
    this.packed.set(x, y, next)
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
