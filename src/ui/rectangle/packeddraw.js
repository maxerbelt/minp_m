import { Packed } from '../../grid/rectangle/packed.js'
import { DrawBase } from '../drawBase.js'

/**
 * Interactive packed grid drawer for Packed class
 * Supports multi-bit cells with value display
 * Color intensity based on cell value
 */
export class PackedDraw extends DrawBase {
  // ============================================================================
  // Constants
  // ============================================================================

  /** Default grid width */
  static get DEFAULT_WIDTH () {
    return 10
  }

  /** Default grid height */
  static get DEFAULT_HEIGHT () {
    return 10
  }

  /** Default cell size in pixels */
  static get DEFAULT_CELL_SIZE () {
    return 25
  }

  /** Default depth (number of discrete values) */
  static get DEFAULT_DEPTH () {
    return 4
  }

  /** Minimum cell size to display value text */
  static get MIN_CELL_SIZE_FOR_TEXT () {
    return 20
  }

  /** Default cell fill color */
  static get DEFAULT_CELL_COLOR () {
    return '#4caf50'
  }

  /** Default cell stroke color */
  static get DEFAULT_STROKE_COLOR () {
    return '#333'
  }

  /** Text color for cell values */
  static get TEXT_COLOR () {
    return '#fff'
  }

  /** Font for cell value text */
  static get TEXT_FONT () {
    return '12px Arial'
  }

  /** Color for empty cells (value 0) */
  static get EMPTY_CELL_COLOR () {
    return '#2196F3'
  }

  /** Color for hover highlight */
  static get HOVER_COLOR () {
    return '#FF9800'
  }

  /** Coordinate mode: clamped to bounds */
  static get COORDINATE_MODE_CLAMPED () {
    return 'clamped'
  }

  /** Coordinate mode: wrapped around bounds */
  static get COORDINATE_MODE_WRAPPED () {
    return 'wrapped'
  }

  /**
   * Create a new PackedDraw instance
   * @param {string} canvasId - ID of the canvas element
   * @param {number} [width=10] - Grid width in cells
   * @param {number} [height=10] - Grid height in cells
   * @param {number} [cellSize=25] - Size of each cell in pixels
   * @param {number} [offsetX=0] - X offset for drawing
   * @param {number} [offsetY=0] - Y offset for drawing
   * @param {number} [depth=4] - Number of discrete values per cell
   */
  constructor (
    canvasId,
    width = PackedDraw.DEFAULT_WIDTH,
    height = PackedDraw.DEFAULT_HEIGHT,
    cellSize = PackedDraw.DEFAULT_CELL_SIZE,
    offsetX = 0,
    offsetY = 0,
    depth = PackedDraw.DEFAULT_DEPTH
  ) {
    const packed = new Packed(width, height, undefined, undefined, depth)
    super(canvasId, packed, cellSize, offsetX, offsetY)
    this.packed = packed
    this.width = width
    this.height = height
    this.depth = depth
    // depth is number of discrete values; max index is depth-1
    this.maxValue = depth - 1
    this.coordinateMode = PackedDraw.COORDINATE_MODE_CLAMPED
  }

  /**
   * Set cell value at coordinate
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} value - Value to set (0 to maxValue)
   */
  setCellValue (x, y, value) {
    if (this._isValidCell(x, y)) {
      this.packed.set(x, y, value)
      this.redraw()
    }
  }

  /**
   * Get cell value at coordinate
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {number} Cell value, or 0 if invalid coordinates
   */
  getCellValue (x, y) {
    if (this._isValidCell(x, y)) {
      return this.packed.at(x, y)
    }
    return 0
  }

  /**
   * Set bits from array of [x, y] or [x, y, color] coordinates
   * @param {Array<Array<number>>} coords - Array of coordinate arrays
   */
  setBitsFromCoords (coords) {
    for (const coord of coords) {
      this._setCoordWithValidatedColor(coord)
    }
    this.redraw()
  }

  /**
   * Set a coordinate with optional color, defaulting to max value
   * @param {Array<number>} coord - [x, y] or [x, y, color]
   * @private
   */
  _setCoordWithValidatedColor (coord) {
    const [x, y, color = this.maxValue] = coord
    const validatedColor = this._validateAndClampColor(color)

    if (this._isValidCell(x, y)) {
      this.packed.set(x, y, validatedColor)
    }
  }

  /**
   * Validate and clamp color value to valid range
   * @param {number} color - Color value to validate
   * @returns {number} Validated color value
   * @private
   */
  _validateAndClampColor (color) {
    if (typeof color !== 'number' || color < 0 || color > this.maxValue) {
      return this.maxValue
    }
    return color
  }

  /**
   * Clear all cells in the grid
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
      this._drawCell(x, y, color)
      this._conditionallyDrawValueText(x, y, value)
    })
  }

  /**
   * Iterate over grid dimensions with callback
   * @param {Function} callback - Function to call for each (x, y) pair
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
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {number} Cell value
   * @private
   */
  _getCellValue (x, y) {
    return this.packed.at(x, y)
  }

  /**
   * Draw a cell and optionally its value text
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {string} [color='#4caf50'] - Fill color
   * @param {string} [strokeColor='#333'] - Stroke color
   * @private
   */
  _drawCellWithValue (
    x,
    y,
    color = PackedDraw.DEFAULT_CELL_COLOR,
    strokeColor = PackedDraw.DEFAULT_STROKE_COLOR
  ) {
    this._drawCell(x, y, color, strokeColor)
    const value = this._getCellValue(x, y)
    this._conditionallyDrawValueText(x, y, value)
  }

  /**
   * Conditionally draw value text if cell is large enough and has non-zero value
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} value - Cell value
   * @private
   */
  _conditionallyDrawValueText (x, y, value) {
    if (this._shouldDrawValueText(value)) {
      this._drawValueText(x, y, value)
    }
  }

  /**
   * Draw a single cell at (x, y)
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {string} [color='#4caf50'] - Fill color
   * @param {string} [stroke='#333'] - Stroke color
   * @private
   */
  _drawCell (
    x,
    y,
    color = PackedDraw.DEFAULT_CELL_COLOR,
    stroke = PackedDraw.DEFAULT_STROKE_COLOR
  ) {
    const pixelCoords = this._gridToPixelCoords(x, y)
    const { px, py } = pixelCoords

    this.ctx.fillStyle = color
    this.ctx.fillRect(px, py, this.cellSize, this.cellSize)

    this.ctx.strokeStyle = stroke
    this.ctx.lineWidth = 1
    this.ctx.strokeRect(px, py, this.cellSize, this.cellSize)
  }

  /**
   * Convert grid coordinates to pixel coordinates
   * @param {number} x - Grid X coordinate
   * @param {number} y - Grid Y coordinate
   * @returns {{px: number, py: number}} Pixel coordinates
   * @private
   */
  _gridToPixelCoords (x, y) {
    return {
      px: x * this.cellSize + this.offsetX,
      py: y * this.cellSize + this.offsetY
    }
  }

  /**
   * Determine if cell value should be displayed as text
   * @param {number} value - Cell value to check
   * @returns {boolean} True if text should be drawn
   * @private
   */
  _shouldDrawValueText (value) {
    return value > 0 && this.cellSize > PackedDraw.MIN_CELL_SIZE_FOR_TEXT
  }

  /**
   * Render value text centered in cell
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} value - Value to display
   * @private
   */
  _drawValueText (x, y, value) {
    const pixelCoords = this._gridToPixelCoords(x, y)
    const { px, py } = pixelCoords

    this.ctx.fillStyle = PackedDraw.TEXT_COLOR
    this.ctx.font = PackedDraw.TEXT_FONT
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'middle'

    const centerX = px + this.cellSize / 2
    const centerY = py + this.cellSize / 2
    this.ctx.fillText(value.toString(), centerX, centerY)
  }

  /**
   * Convert cell value to color (intensity gradient)
   * 0=blue, max=green with intermediate colors
   * @param {number} value - Cell value (0 to maxValue)
   * @returns {string} RGB color string
   * @private
   */
  _valueToColor (value) {
    if (value === 0) {
      return PackedDraw.EMPTY_CELL_COLOR
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
    this._drawCellWithValue(x, y, PackedDraw.HOVER_COLOR)
  }

  // ============================================================================
  // State Management
  // ============================================================================

  /**
   * Cycle cell value on click (0 -> 1 -> ... -> max -> 0)
   * @param {Array<number>|null} location - [x, y] coordinates or null
   */
  toggleCell (location) {
    if (location !== null) {
      this._cycleCellValue(location[0], location[1])
    }
  }

  /**
   * Advance cell value to next in cycle
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
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
   * @param {number} px - Pixel X coordinate
   * @param {number} py - Pixel Y coordinate
   * @returns {Array<number>|null} [x, y] grid coordinates or null if invalid
   * @private
   */
  _hitTest (px, py) {
    const gridCoords = this._pixelToGridCoords(px, py)
    return this._isValidCell(gridCoords[0], gridCoords[1]) ? gridCoords : null
  }

  /**
   * Convert pixel coordinates to grid coordinates
   * Respects coordinateMode (clamped vs wrapped)
   * @param {number} px - Pixel X coordinate
   * @param {number} py - Pixel Y coordinate
   * @returns {Array<number>} [x, y] grid coordinates
   * @private
   */
  _pixelToGridCoords (px, py) {
    const x = Math.floor((px - this.offsetX) / this.cellSize)
    const y = Math.floor((py - this.offsetY) / this.cellSize)

    if (this.coordinateMode === PackedDraw.COORDINATE_MODE_WRAPPED) {
      return this._wrapCoordinates(x, y)
    }
    return [x, y]
  }

  /**
   * Wrap coordinates around grid boundaries
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {Array<number>} Wrapped [x, y] coordinates
   * @private
   */
  _wrapCoordinates (x, y) {
    return [
      ((x % this.width) + this.width) % this.width,
      ((y % this.height) + this.height) % this.height
    ]
  }

  /**
   * Check if coordinates are within grid bounds
   * In wrapped mode, all coordinates are valid
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {boolean} True if coordinates are valid
   * @private
   */
  _isValidCell (x, y) {
    if (this.coordinateMode === PackedDraw.COORDINATE_MODE_WRAPPED) {
      return true
    }
    return this._isWithinBounds(x, y)
  }

  /**
   * Check if coordinates are within grid boundaries
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {boolean} True if within bounds
   * @private
   */
  _isWithinBounds (x, y) {
    return x >= 0 && x < this.width && y >= 0 && y < this.height
  }
}
