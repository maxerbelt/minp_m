import { MaskTri } from '../../grid/triangle/maskTri.js'
import { drawTri, triToPixel, pixelToTri } from './triDrawHelper.js'
import { DrawBase } from '../drawBase.js'

const SQRT_THREE_OVER_TWO = Math.sqrt(3) / 2

const COLORS = {
  SET: '#4caf50',
  UNSET: '#2196F3',
  HOVER: '#FF9800',
  STROKE: '#333'
}

const TRIANGLE_OFFSET = 0.3

export class TriDraw extends DrawBase {
  /**
   * @param {string} canvasId - Canvas element ID.
   * @param {number} [side=3] - Number of rows in the triangle grid.
   * @param {number} [offsetX=300] - Canvas offset X position.
   * @param {number} [offsetY=300] - Canvas offset Y position.
   * @param {number} [size=25] - Triangle side length.
   */
  constructor (canvasId, side = 3, offsetX = 300, offsetY = 300, size = 25) {
    const mask = new MaskTri(side)
    super(canvasId, mask, size, offsetX, offsetY)

    this.mask = mask
    this.indexer = mask.indexer
    this.side = side
    this.triSize = size
    this.triHeight = size * SQRT_THREE_OVER_TWO
    this.bits = 0n
  }

  /**
   * Set the bits to display on the triangle grid.
   * @param {bigint} bits - Bit mask for filled triangles.
   */
  setBits (bits) {
    this.bits = bits
    this.redraw()
  }

  /**
   * Set bits from an array of grid coordinates.
   * @param {Array<Array<number>>} coords - List of [row, column] pairs.
   */
  setBitsFromCoords (coords) {
    this.mask.fromCoords(coords)
    this.bits = this.mask.bits
    this.redraw()
  }

  /**
   * Clear all triangle bits.
   */
  clear () {
    this.bits = 0n
    this.redraw()
  }

  /**
   * Redraw the entire canvas.
   */
  redraw () {
    this.clearCanvas()
    this._drawGrid()
    this._drawHover()
  }

  /**
   * Redraw with optional hover selection.
   * @param {number|null} [hoverIndex=null] - Hovered triangle index.
   */
  redrawWithHover (hoverIndex = null) {
    this.hoverLocation = hoverIndex
    this.redraw()
  }

  // ============================================================================
  // Grid Drawing
  // ============================================================================

  /**
   * Draw all triangles in the grid.
   * @private
   */
  _drawGrid () {
    for (let index = 0; index < this.indexer.size; index++) {
      const { row, column } = this._getCoordinatesForIndex(index)
      this._drawTriangleCell(
        row,
        column,
        this._getCellColor(index),
        this._getTriangleOrientation(column)
      )
    }
  }

  /**
   * Convert an index to row and column coordinates.
   * @param {number} index - Triangle index.
   * @returns {{row:number,column:number}}
   * @private
   */
  _getCoordinatesForIndex (index) {
    const [row, column] = this.indexer.location(index)
    return { row, column }
  }

  /**
   * Get triangle orientation from column.
   * @param {number} column - Triangle column.
   * @returns {'up'|'down'}
   * @private
   */
  _getTriangleOrientation (column) {
    return column % 2 === 0 ? 'up' : 'down'
  }

  /**
   * Get the vertical offset for an oriented triangle.
   * @param {'up'|'down'} orientation - Triangle orientation.
   * @returns {number}
   * @private
   */
  _getVerticalOffset (orientation) {
    return orientation === 'down' ? -(this.triHeight * TRIANGLE_OFFSET) : 0
  }

  /**
   * Determine the fill color for a cell.
   * @param {number} index - Triangle index.
   * @param {boolean} [isHover=false] - Whether the cell is hovered.
   * @returns {string} Hex color string.
   * @private
   */
  _getCellColor (index, isHover = false) {
    if (isHover) return COLORS.HOVER
    return this._isBitSet(index) ? COLORS.SET : COLORS.UNSET
  }

  /**
   * Check whether the bit is set for a triangle index.
   * @param {number} index - Triangle index.
   * @returns {boolean}
   * @private
   */
  _isBitSet (index) {
    return ((this.bits >> BigInt(index)) & 1n) === 1n
  }

  /**
   * Draw a single triangle cell.
   * @param {number} row - Grid row.
   * @param {number} column - Grid column.
   * @param {string} color - Fill color.
   * @param {'up'|'down'} orientation - Triangle orientation.
   * @private
   */
  _drawTriangleCell (row, column, color, orientation) {
    const { x, y } = triToPixel(row, column, this.triSize)
    drawTri(
      this.ctx,
      x + this.offsetX,
      y + this._getVerticalOffset(orientation) + this.offsetY,
      this.triSize,
      color,
      COLORS.STROKE,
      orientation
    )
  }

  // ============================================================================
  // Hover Rendering
  // ============================================================================

  /**
   * Draw the hover triangle if one is active.
   * @private
   */
  _drawHover () {
    if (this.hoverLocation === null) return
    const { row, column } = this._getCoordinatesForIndex(this.hoverLocation)
    const orientation = this._getTriangleOrientation(column)
    this._drawTriangleCell(
      row,
      column,
      this._getCellColor(this.hoverLocation, true),
      orientation
    )
  }

  // ============================================================================
  // State Management
  // ============================================================================

  /**
   * Toggle a triangle at the given index.
   * @param {number|null} index - Triangle index.
   */
  toggleCell (index) {
    if (index !== null) {
      this._toggleBitAtIndex(index)
    }
  }

  /**
   * Toggle the bit at a specific index.
   * @param {number} index - Triangle index.
   * @private
   */
  _toggleBitAtIndex (index) {
    const mask = 1n << BigInt(index)
    this.bits ^= mask
    this.redraw()
  }

  // ============================================================================
  // Mouse Event Handling
  // ============================================================================

  /**
   * Bind mouse events to the triangular canvas.
   * @private
   */
  _bindMouseEvents () {
    this.canvas.addEventListener('mousemove', event => this._onMouseMove(event))
    this.canvas.addEventListener('mouseleave', () => this.redrawWithHover(null))
    this.canvas.addEventListener('click', event => this._onCanvasClick(event))
  }

  /**
   * Handle mouse move events.
   * @param {MouseEvent} event - Mouse event.
   * @private
   */
  _onMouseMove (event) {
    const { x, y } = this.getCanvasMouseCoords(event)
    const hit = this._hitTest(x, y)
    this.redrawWithHover(hit)
  }

  /**
   * Handle click events.
   * @param {MouseEvent} event - Mouse event.
   * @private
   */
  _onCanvasClick (event) {
    const { x, y } = this.getCanvasMouseCoords(event)
    const hit = this._hitTest(x, y)
    if (hit == null) return
    this.toggleCell(hit)
  }

  /**
   * Find triangle index from pixel coordinates.
   * @param {number} px - Pixel X coordinate.
   * @param {number} py - Pixel Y coordinate.
   * @returns {number|null}
   * @private
   */
  _hitTest (px, py) {
    const [row, column] = pixelToTri(
      px - this.offsetX,
      py - this.offsetY,
      this.triSize
    )
    if (!this.indexer.isValid(row, column)) return null
    const idx = this.indexer.index(row, column)
    return idx !== undefined ? idx : null
  }
}
