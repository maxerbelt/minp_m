/**
 * Base class for interactive grid drawing with canvas support
 * Handles common functionality like canvas setup, mouse events, and redraw cycles
 *
 * Provides:
 * - Canvas rendering utilities (cells, shapes, text)
 * - Mouse event handling and coordinate conversion
 * - Hover state management
 * - Redraw cycle orchestration
 */
export class DrawBase {
  constructor (canvasId, gridData, cellSize = 25, offsetX = 0, offsetY = 0) {
    this.canvas = document.getElementById(canvasId)
    if (!this.canvas) {
      throw new Error(`Canvas element with id "${canvasId}" not found`)
    }

    this.ctx = this.canvas.getContext('2d')
    this.gridData = gridData
    this.cellSize = cellSize
    this.offsetX = offsetX
    this.offsetY = offsetY

    // Hover state
    this.hoverLocation = null

    this._bindMouseEvents()
  }

  // ============================================================================
  // Canvas Rendering Utilities - Common drawing primitives
  // ============================================================================

  /**
   * Fill and stroke a rectangle cell
   * @protected
   */
  fillCell (
    x,
    y,
    width,
    height,
    fillColor,
    strokeColor = '#333',
    lineWidth = 1
  ) {
    this.ctx.fillStyle = fillColor
    this.ctx.fillRect(x, y, width, height)

    this.ctx.strokeStyle = strokeColor
    this.ctx.lineWidth = lineWidth
    this.ctx.strokeRect(x, y, width, height)
  }

  /**
   * Draw text centered in a rectangle
   * @protected
   */
  drawCellText (x, y, width, height, text, fontSize = 12, fillColor = '#fff') {
    const centerX = x + width / 2
    const centerY = y + height / 2

    this.ctx.fillStyle = fillColor
    this.ctx.font = `${fontSize}px Arial`
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'middle'
    this.ctx.fillText(text, centerX, centerY)
  }

  /**
   * Clear the entire canvas
   * @protected
   */
  clearCanvas () {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
  }

  /**
   * Convert grid coordinates to screen pixel coordinates
   * @protected
   */
  gridToScreenCoords (gridX, gridY) {
    return {
      x: gridX * this.cellSize + this.offsetX,
      y: gridY * this.cellSize + this.offsetY
    }
  }

  /**
   * Get mouse coordinates relative to canvas
   * @protected
   */
  getCanvasMouseCoords (event) {
    const rect = this.canvas.getBoundingClientRect()
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    }
  }

  // ============================================================================
  // Mouse Event Handling
  // ============================================================================

  /**
   * Bind mouse events to the canvas
   * @private
   */
  _bindMouseEvents () {
    this.canvas.addEventListener('mousemove', e => this._onMouseMove(e))
    this.canvas.addEventListener('mouseleave', () => this._onMouseLeave())
    this.canvas.addEventListener('click', e => this._onClick(e))
  }

  /**
   * Handle mouse move event - update hover and redraw
   * @private
   */
  _onMouseMove (event) {
    const { x, y } = this.getCanvasMouseCoords(event)
    const hit = this._hitTest(x, y)
    this.redrawWithHover(hit)
  }

  /**
   * Handle mouse leave event - clear hover and redraw
   * @private
   */
  _onMouseLeave () {
    this.redrawWithHover(null)
  }

  /**
   * Handle mouse click event - toggle cell
   * @private
   */
  _onClick (event) {
    const { x, y } = this.getCanvasMouseCoords(event)
    const hit = this._hitTest(x, y)
    this.toggleCell(hit)
  }

  // ============================================================================
  // Redraw Cycle
  // ============================================================================

  /**
   * Complete redraw: clear → draw grid → draw hover
   */
  redraw () {
    this.clearCanvas()
    this._drawGrid()
    this._drawHover()
  }

  /**
   * Update hover location and redraw
   */
  redrawWithHover (hoverLocation = null) {
    this.hoverLocation = hoverLocation
    this.redraw()
  }

  // ============================================================================
  // Abstract Methods - Implement in Subclasses
  // ============================================================================

  /**
   * Draw the grid - to be implemented by subclasses
   * @private
   */
  _drawGrid () {
    throw new Error('_drawGrid must be implemented by subclass')
  }

  /**
   * Draw the hover cell if one is selected
   * @private
   */
  _drawHover () {
    throw new Error('_drawHover must be implemented by subclass')
  }

  /**
   * Clear all cells
   */
  clear () {
    throw new Error('clear must be implemented by subclass')
  }

  /**
   * Toggle a cell on/off
   */
  toggleCell (location) {
    throw new Error('toggleCell must be implemented by subclass')
  }

  /**
   * Hit test to find which cell is at the given pixel coordinates
   * @private
   */
  _hitTest (px, py) {
    throw new Error('_hitTest must be implemented by subclass')
  }
}
