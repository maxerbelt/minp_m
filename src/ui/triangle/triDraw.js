import { MaskTri } from '../../grid/triangle/maskTri.js'
import { drawTri, triToPixel, pixelToTri } from './triDrawHelper.js'
import { DrawBase } from '../drawBase.js'

// Color constants
const COLORS = {
  SET: '#4caf50', // green for set cells
  UNSET: '#2196F3', // blue for unset cells
  HOVER: '#FF9800', // orange for hover
  STROKE: '#333' // dark gray for outline
}

const TRIANGLE_OFFSET = 0.3 // 30% offset for inverted triangles

export class TriDraw extends DrawBase {
  constructor (canvasId, side = 3, offsetX = 300, offsetY = 300, size = 25) {
    const mask = new MaskTri(side)
    super(canvasId, mask, size, offsetX, offsetY)

    this.mask = mask
    this.indexer = this.mask.indexer
    this.side = side
    this.triSize = size
    this.triHeight = (size * Math.sqrt(3)) / 2

    // bits representing cells to color
    this.bits = 0n
  }

  /**
   * Set the bits to display on the triangle grid
   */
  setBits (bits) {
    this.bits = bits
    this.redraw()
  }

  /**
   * Set bits from array of coordinates
   */
  setBitsFromCoords (coords) {
    this.mask.fromCoords(coords)
    this.bits = this.mask.bits
    this.redraw()
  }

  /**
   * Clear all bits
   */
  clear () {
    this.bits = 0n
    this.redraw()
  }

  /**
   * Main redraw function
   */
  redraw () {
    this.clearCanvas()
    this._drawGrid()
    this._drawHover()
  }

  /**
   * Redraw with hover state (called on mousemove)
   */
  redrawWithHover (hoverIndex = null) {
    this.hoverLocation = hoverIndex
    this.redraw()
  }

  // ============================================================================
  // Grid Drawing
  // ============================================================================

  /**
   * Draw all triangles with color coding: set=green, unset=blue.
   * @private
   */
  _drawGrid () {
    for (let i = 0; i < this.indexer.size; i++) {
      const [r, c] = this.indexer.location(i)
      const orient = this._getTriangleOrientation(c)
      const color = this._getCellColor(i)
      this._drawTriangleCell(r, c, color, orient)
    }
  }

  /**
   * Get triangle orientation based on column.
   * @param {number} column - Column index.
   * @returns {string} 'up' or 'down'.
   * @private
   */
  _getTriangleOrientation (column) {
    return column % 2 === 0 ? 'up' : 'down'
  }

  /**
   * Get vertical offset for inverted triangles.
   * @param {string} orient - Orientation ('up' or 'down').
   * @returns {number} Vertical offset in pixels.
   * @private
   */
  _getVerticalOffset (orient) {
    return orient === 'down' ? -(this.triHeight * TRIANGLE_OFFSET) : 0
  }

  /**
   * Determine triangle color based on bit state and hover.
   * @param {number} index - Cell index.
   * @param {boolean} isHover - Whether cell is being hovered.
   * @returns {string} Color hex code.
   * @private
   */
  _getCellColor (index, isHover = false) {
    if (isHover) return COLORS.HOVER
    return this._isBitSet(index) ? COLORS.SET : COLORS.UNSET
  }

  /**
   * Check if a bit at index is set.
   * @param {number} index - Cell index.
   * @returns {boolean} True if bit is set.
   * @private
   */
  _isBitSet (index) {
    return ((this.bits >> BigInt(index)) & 1n) === 1n
  }

  /**
   * Draw a triangle cell at grid coordinates.
   * @param {number} r - Row coordinate.
   * @param {number} c - Column coordinate.
   * @param {string} color - Fill color.
   * @param {string} orient - Orientation ('up' or 'down').
   * @private
   */
  _drawTriangleCell (r, c, color, orient) {
    const { x, y } = triToPixel(r, c, this.triSize)
    const yOffset = this._getVerticalOffset(orient)
    drawTri(
      this.ctx,
      x + this.offsetX,
      y + yOffset + this.offsetY,
      this.triSize,
      color,
      COLORS.STROKE,
      orient
    )
  }

  // ============================================================================
  // Hover Rendering
  // ============================================================================

  /**
   * Draw the hover triangle if one is selected.
   * @private
   */
  _drawHover () {
    if (this.hoverLocation === null) return
    const [r, c] = this.indexer.location(this.hoverLocation)
    const orient = this._getTriangleOrientation(c)
    const color = this._getCellColor(this.hoverLocation, true)
    this._drawTriangleCell(r, c, color, orient)
  }

  // ============================================================================
  // State Management
  // ============================================================================

  /**
   * Toggle a triangle on/off by index
   */
  toggleCell (index) {
    if (index !== null) {
      this._toggleBitAtIndex(index)
    }
  }

  /**
   * Toggle bit at index and redraw
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
   * Bind mouse events with triangle hit test
   * @private
   */
  _bindMouseEvents () {
    this.canvas.addEventListener('mousemove', e => {
      const { x, y } = this.getCanvasMouseCoords(e)
      const hit = this._hitTest(x, y)
      this.redrawWithHover(hit)
    })

    this.canvas.addEventListener('mouseleave', () => {
      this.redrawWithHover(null)
    })

    this.canvas.addEventListener('click', e => {
      const { x, y } = this.getCanvasMouseCoords(e)
      const hit = this._hitTest(x, y)
      if (hit == null) return
      this.toggleCell(hit)
    })
  }

  /**
   * Find triangle index from pixel coordinates.
   * @param {number} px - Pixel X coordinate.
   * @param {number} py - Pixel Y coordinate.
   * @returns {number|null} Index or null if invalid.
   * @private
   */
  _hitTest (px, py) {
    const [r, c] = pixelToTri(
      px - this.offsetX,
      py - this.offsetY,
      this.triSize
    )
    if (!this.indexer.isValid(r, c)) return null
    const idx = this.indexer.index(r, c)
    return idx !== undefined ? idx : null
  }
}
