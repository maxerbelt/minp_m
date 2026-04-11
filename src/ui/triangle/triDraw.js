import { MaskTri } from '../../grid/triangle/maskTri.js'
import { drawTri, triToPixel, pixelToTri } from './triDrawHelper.js'
import { DrawBase } from '../drawBase.js'

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
   * Draw all triangles with color coding: set=green, unset=blue
   * @private
   */
  _drawGrid () {
    for (let i = 0; i < this.indexer.size; i++) {
      this._drawTriAtIndex(i)
    }
  }

  /**
   * Draw a single triangle at the given index
   * @private
   */
  _drawTriAtIndex (index) {
    const [r, c] = this.indexer.location(index)
    const color = this._getTriColorForIndex(index)
    const orient = this._getTriangleOrientation(c)
    this._drawTriangleCell(r, c, color, orient)
  }

  /**
   * Determine triangle color based on bit state
   * @private
   */
  _getTriColorForIndex (index) {
    const isSet = this._isBitSet(index)
    return isSet ? '#4caf50' : '#2196F3' // green for set, blue for unset
  }

  /**
   * Check if a bit at index is set
   * @private
   */
  _isBitSet (index) {
    return ((this.bits >> BigInt(index)) & 1n) === 1n
  }

  /**
   * Get triangle orientation based on column
   * @private
   */
  _getTriangleOrientation (column) {
    return column % 2 === 0 ? 'up' : 'down'
  }

  /**
   * Get vertical offset for inverted triangles
   * @private
   */
  _getTriangleVerticalOffset (orient) {
    // Inverted triangles sit slightly higher; lift by 30% of row height
    return orient === 'down' ? -(this.triHeight * 0.3) : 0
  }

  /**
   * Draw a triangle cell at grid coordinates
   * @private
   */
  _drawTriangleCell (r, c, color = '#4caf50', orient = 'up', stroke = '#333') {
    const { x, y } = triToPixel(r, c, this.triSize)
    const yOffset = this._getTriangleVerticalOffset(orient)
    drawTri(
      this.ctx,
      x + this.offsetX,
      y + yOffset + this.offsetY,
      this.triSize,
      color,
      stroke,
      orient
    )
  }

  // ============================================================================
  // Hover Rendering
  // ============================================================================

  /**
   * Draw the hover triangle if one is selected
   * @private
   */
  _drawHover () {
    if (this.hoverLocation !== null) {
      this._drawHoverCell()
    }
  }

  /**
   * Render the hover highlight at current location
   * @private
   */
  _drawHoverCell () {
    const [r, c] = this.indexer.location(this.hoverLocation)
    const orient = this._getTriangleOrientation(c)
    this._drawTriangleCell(r, c, '#FF9800', orient) // orange for hover
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
   * Hit test to find which triangle is at pixel coordinates
   * @private
   */
  _hitTest (px, py) {
    const gridCoords = this._pixelToTriCoords(px, py)
    const idx = this._findTriangleIndex(gridCoords)
    return idx
  }

  /**
   * Convert pixel coordinates to triangle grid coordinates
   * @private
   */
  _pixelToTriCoords (px, py) {
    const x = px - this.offsetX
    const y = py - this.offsetY
    return pixelToTri(x, y, this.triSize)
  }

  /**
   * Find triangle index from row/column coordinates
   * @private
   */
  _findTriangleIndex ([r, c]) {
    if (!this.indexer.isValid(r, c)) return null
    const idx = this.indexer.index(r, c)
    return idx !== undefined ? idx : null
  }
}
