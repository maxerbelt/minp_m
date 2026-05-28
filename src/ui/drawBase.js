/**
 * Base class for interactive grid drawing with canvas support
 *
 * Provides a common foundation for rendering different grid shapes (rectangular,
 * hexagonal, triangular, etc.) with interactive features like mouse hover and
 * click handling.
 *
 * Features:
 * - Canvas rendering utilities (fill cells, draw text, clear canvas)
 * - Mouse event handling and coordinate conversion
 * - Hover state management with visual feedback
 * - Redraw cycle orchestration (clear → draw grid → draw hover)
 * - Coordinate transformation (grid ↔ pixel, canvas-relative mouse coords)
 *
 * Abstract Methods (must be implemented by subclasses):
 * - _drawGrid(): Render the grid based on grid shape
 * - _drawHover(): Render hover visualization for the current cell
 * - _hitTest(): Determine which cell is at pixel coordinates
 * - toggleCell(): Toggle the state of a cell
 * - clear(): Reset the grid to empty state
 *
 * Subclass Flow:
 * 1. Constructor calls super() with canvas ID and grid data
 * 2. Mouse events are auto-bound in constructor
 * 3. On mouse interaction: _hitTest() → toggleCell() or redrawWithHover()
 * 4. Redraw cycle: clearCanvas() → _drawGrid() → _drawHover()
 *
 * @abstract
 * @class DrawBase
 * @example
 * // Create a subclass for rectangular grids
 * class RectDraw extends DrawBase {
 *   _drawGrid() { ... }
 *   _drawHover() { ... }
 *   _hitTest(px, py) { ... }
 *   toggleCell(location) { ... }
 *   clear() { ... }
 * }
 */

/**
 * @typedef {Object} PixelCoords
 * @property {number} x - X pixel coordinate
 * @property {number} y - Y pixel coordinate
 * @description Canvas pixel coordinate pair used for screen-space calculations
 */

/**
 * @typedef {Object} GridDimensions
 * @property {number} width - Width in grid units
 * @property {number} height - Height in grid units
 * @description Grid dimensions for determining cell boundaries
 */

/**
 * @typedef {*} CellLocation
 * @description Cell location/identifier (shape-specific: array, object, or number)
 */

/**
 * @typedef {Function} HitTestCallback
 * @param {CellLocation|null} location - The cell location or null if no hit
 * @returns {void}
 * @description Callback function for hit test results
 */

export class DrawBase {
  /**
   * Initialize the draw base with canvas and grid data.
   *
   * Sets up canvas rendering context, properties, and mouse event handlers.
   * Validates that the canvas element exists and supports 2D rendering.
   *
   * Subclasses should call `super()` and then initialize their own
   * grid-specific properties and state.
   *
   * @param {string} canvasId - ID of the canvas element in the DOM
   * @param {Object} gridData - Grid data structure (mask, shape, etc.)
   * @param {number} [cellSize=25] - Size of each cell in pixels
   * @param {number} [offsetX=0] - X offset for grid positioning on canvas
   * @param {number} [offsetY=0] - Y offset for grid positioning on canvas
   * @throws {Error} If canvas element not found or 2D context unavailable
   */
  constructor (canvasId, gridData, cellSize = 25, offsetX = 0, offsetY = 0) {
    const canvasElement = document.getElementById(canvasId)
    if (!canvasElement || !(canvasElement instanceof HTMLCanvasElement)) {
      throw new Error(`Canvas element with id "${canvasId}" not found`)
    }

    /** @type {HTMLCanvasElement} */
    this.canvas = canvasElement

    const context = this.canvas.getContext('2d')
    if (!context) {
      throw new Error(`Failed to get 2D context from canvas "${canvasId}"`)
    }

    /** @type {CanvasRenderingContext2D} */
    this.ctx = context
    /** @type {Object} */
    this.gridData = gridData
    /** @type {number} */
    this.cellSize = cellSize
    /** @type {number} */
    this.offsetX = offsetX
    /** @type {number} */
    this.offsetY = offsetY

    /** @type {CellLocation|null} */
    this.hoverLocation = null

    this._bindMouseEvents()
  }

  // ============================================================================
  // Canvas Rendering Utilities - Common drawing primitives
  // ============================================================================

  /**
   * Fill and stroke a rectangle cell.
   *
   * Renders a filled rectangle with a stroke outline at the specified position.
   * The rectangle is drawn in the coordinate system specified by x, y (typically
   * already transformed to screen coordinates).
   *
   * @param {number} x - X coordinate of top-left corner (in pixels)
   * @param {number} y - Y coordinate of top-left corner (in pixels)
   * @param {number} width - Width of the rectangle in pixels
   * @param {number} height - Height of the rectangle in pixels
   * @param {string} fillColor - CSS color string for fill (e.g., '#FF0000', 'rgba(255,0,0,0.5)')
   * @param {string} [strokeColor='#333'] - CSS color string for stroke outline
   * @param {number} [lineWidth=1] - Width of stroke line in pixels
   * @returns {void}
   * @protected
   * @example
   * // Draw a 50x50 red cell with black outline
   * this.fillCell(10, 10, 50, 50, '#FF0000', '#000', 2);
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
   *
   * Renders text horizontally and vertically centered within the specified bounds.
   * Automatically sets up font, alignment, and baseline for centered rendering.
   *
   * @param {number} x - X coordinate of rectangle's top-left corner (in pixels)
   * @param {number} y - Y coordinate of rectangle's top-left corner (in pixels)
   * @param {number} width - Width of the bounding rectangle in pixels
   * @param {number} height - Height of the bounding rectangle in pixels
   * @param {string} text - Text content to render
   * @param {number} [fontSize=12] - Font size in pixels
   * @param {string} [fillColor='#fff'] - CSS color string for text fill
   * @returns {void}
   * @protected
   * @example
   * // Draw centered text in a 50x50 cell
   * this.drawCellText(10, 10, 50, 50, 'A', 14, '#000');
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
   *
   * Removes all drawn content by clearing the canvas to transparency.
   *
   * @returns {void}
   * @protected
   */
  clearCanvas () {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
  }

  /**
   * Convert grid coordinates to screen pixel coordinates
   *
   * Transforms logical grid coordinates (0-based) into canvas pixel positions
   * accounting for cell size and offset positioning. Used to determine where
   * to render a cell based on its grid location.
   *
   * @param {number} gridX - X coordinate in grid units
   * @param {number} gridY - Y coordinate in grid units
   * @returns {PixelCoords} Pixel coordinates on the canvas
   * @protected
   * @example
   * // Convert grid position (2, 3) to pixel coordinates with cellSize=25, offsetX=10
   * const pixels = this.gridToScreenCoords(2, 3); // { x: 60, y: 85 }
   */
  gridToScreenCoords (gridX, gridY) {
    return {
      x: gridX * this.cellSize + this.offsetX,
      y: gridY * this.cellSize + this.offsetY
    }
  }

  /**
   * Get mouse coordinates relative to canvas
   *
   * Calculates mouse pointer position relative to the canvas element's
   * top-left corner, accounting for canvas position within the viewport.
   * Essential for hit testing and interactive features.
   *
   * @param {MouseEvent} event - Mouse event with clientX and clientY properties
   * @returns {PixelCoords} Coordinates relative to canvas top-left
   * @protected
   * @example
   * canvas.addEventListener('mousemove', (e) => {
   *   const coords = this.getCanvasMouseCoords(e);
   *   console.log(`Mouse at canvas pixel ${coords.x}, ${coords.y}`);
   * });
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
   *
   * Attaches event listeners to the canvas element for mouse interactions:
   * - mousemove: Track pointer position for hover effects and visual feedback
   * - mouseleave: Clear hover state when mouse exits the canvas bounds
   * - click: Handle cell selection/toggling when user clicks a cell
   *
   * Called during constructor initialization. Subclasses may override to add
   * additional event handlers or modify event behavior.
   *
   * @returns {void}
   * @private
   */
  _bindMouseEvents () {
    this.canvas.addEventListener('mousemove', e => this._onMouseMove(e))
    this.canvas.addEventListener('mouseleave', () => this._onMouseLeave())
    this.canvas.addEventListener('click', e => this._onClick(e))
  }

  /**
   * Handle mouse events that require coordinate conversion and hit testing
   *
   * Helper method to standardize mouse event processing: converts pixel
   * coordinates to grid coordinates via hit test, then invokes callback.
   * Centralizes the common pattern of: pixel coords → hit test → callback.
   *
   * @param {MouseEvent} event - Mouse event from the canvas
   * @param {HitTestCallback} callback - Function to invoke with hit test result
   * @returns {void}
   * @private
   * @example
   * this._handleMouseEventWithCoords(event, (hit) => {
   *   if (hit) console.log('Hit cell:', hit);
   * });
   */
  _handleMouseEventWithCoords (event, callback) {
    const { x, y } = this.getCanvasMouseCoords(event)
    const hit = this._hitTest(x, y)
    callback(hit)
  }

  /**
   * Handle mouse move event - update hover and redraw
   *
   * Called on every mouse move within the canvas. Performs hit testing
   * to determine which cell is under the cursor and updates the visual
   * hover indication by triggering a redraw.
   *
   * @param {MouseEvent} event - Mouse event from canvas
   * @returns {void}
   * @private
   */
  _onMouseMove (event) {
    this._handleMouseEventWithCoords(event, hit => this.redrawWithHover(hit))
  }

  /**
   * Handle mouse leave event - clear hover and redraw
   *
   * Called when the mouse leaves the canvas bounds. Clears any active
   * hover visualization and redraws the canvas.
   *
   * @returns {void}
   * @private
   */
  _onMouseLeave () {
    this.redrawWithHover(null)
  }

  /**
   * Handle mouse click event - toggle cell
   *
   * Called on mouse click within the canvas. Performs hit testing to find
   * the clicked cell and calls toggleCell() to update its state.
   *
   * @param {MouseEvent} event - Mouse event from canvas
   * @returns {void}
   * @private
   */
  _onClick (event) {
    this._handleMouseEventWithCoords(event, hit => this.toggleCell(hit))
  }

  // ============================================================================
  // Redraw Cycle
  // ============================================================================

  /**
   * Complete redraw: clear → draw grid → draw hover
   *
   * Orchestrates the full rendering cycle in the correct order:
   * 1. Clear the canvas to remove previous content
   * 2. Draw the grid cells with their current state
   * 3. Draw hover visualization if a cell is currently hovered
   *
   * Call this method when the grid state changes or visual update is needed.
   *
   * @returns {void}
   * @protected
   */
  redraw () {
    this.clearCanvas()
    this._drawGrid()
    this._drawHover()
  }

  /**
   * Update hover location and redraw
   *
   * Sets the currently hovered cell location and triggers a complete redraw
   * to update the hover visualization. Pass null to clear the current hover.
   *
   * @param {CellLocation|null} [hoverLocation=null] - The location to hover or null to clear
   * @returns {void}
   * @protected
   * @example
   * // Show hover on cell at [2, 3]
   * this.redrawWithHover([2, 3]);
   *
   * // Clear hover
   * this.redrawWithHover(null);
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
   *
   * Renders all cells of the grid with their current state. The implementation
   * varies depending on grid shape (rectangular, hexagonal, triangular, etc.).
   * This method is called as part of the redraw cycle after clearCanvas().
   *
   * Subclasses MUST override this method to provide shape-specific rendering:
   * - Rectangular: Iterate rows/columns and draw filled rectangles
   * - Hexagonal: Calculate hex positions and draw hexagon shapes
   * - Triangular: Calculate triangle positions and draw triangle shapes
   *
   * @returns {void}
   * @protected
   * @abstract
   * @throws {Error} If not implemented by subclass
   */
  _drawGrid () {
    throw new Error('_drawGrid must be implemented by subclass')
  }

  /**
   * Draw the hover cell if one is selected
   *
   * Renders visual feedback for the currently hovered cell using a distinct
   * color or style. Called after _drawGrid() to layer on top of the grid.
   * Check this.hoverLocation to determine what to draw.
   *
   * Implementation should:
   * - Check if this.hoverLocation is null (nothing to draw)
   * - Use this.hoverLocation to find the cell coordinates
   * - Draw with a distinct color (typically semi-transparent highlight)
   * - Layer on top of grid cells without obscuring them
   *
   * Subclasses MUST override this method with shape-specific hover
   * visualization.
   *
   * @returns {void}
   * @protected
   * @abstract
   * @throws {Error} If not implemented by subclass
   */
  _drawHover () {
    throw new Error('_drawHover must be implemented by subclass')
  }

  /**
   * Clear all cells in the grid
   *
   * Resets the grid state by clearing all cells to an empty or default state.
   * The implementation depends on the grid's internal representation (bits,
   * array, etc.). This is typically called via the UI by the user, not during
   * the redraw cycle.
   *
   * After clearing, the grid should be regenerated by calling redraw().
   *
   * Subclasses MUST override this method to provide grid-specific clearing logic:
   * - Bitboard grids: Reset all bits to 0
   * - Array grids: Clear or reset all array elements
   * - Object grids: Delete or reset all properties
   *
   * @returns {void}
   * @protected
   * @abstract
   * @throws {Error} If not implemented by subclass
   */
  clear () {
    throw new Error('clear must be implemented by subclass')
  }

  /**
   * Toggle a cell on/off
   *
   * Flips the state of the cell at the given location. The exact behavior
   * depends on the grid's state representation:
   * - Binary toggle: on ↔ off
   * - Cycle: 0 → 1 → 2 → 0
   * - Custom: Subclass-defined behavior
   *
   * Called when the user clicks on a cell. After toggling, should trigger
   * a redraw to show the new state.
   *
   * Subclasses MUST override this method with grid-specific toggle logic.
   *
   * @param {CellLocation} _location - The cell location to toggle (implementation-specific)
   * @returns {void}
   * @protected
   * @abstract
   * @throws {Error} If not implemented by subclass
   */
  toggleCell (_location) {
    throw new Error('toggleCell must be implemented by subclass')
  }

  /**
   * Hit test to find which cell is at the given pixel coordinates
   *
   * Performs spatial lookup to determine which grid cell, if any, contains
   * the given pixel position. Returns the cell identifier or null if no
   * cell is at that location.
   *
   * Implementation varies by grid shape:
   * - RectDraw: Array index [row, col] or row*width+col
   * - HexDraw: Cube coordinates [q, r, s] or axial [q, r]
   * - TriDraw: Triangle index number
   *
   * Called during every mouse event to determine the target cell. Must
   * be efficient as it's called frequently.
   *
   * Subclasses MUST override this method with shape-specific hit test logic.
   *
   * @param {number} _px - X pixel coordinate relative to canvas
   * @param {number} _py - Y pixel coordinate relative to canvas
   * @returns {CellLocation|null} The hit test result (cell identifier) or null if no hit
   * @protected
   * @abstract
   * @throws {Error} If not implemented by subclass
   */
  _hitTest (_px, _py) {
    throw new Error('_hitTest must be implemented by subclass')
  }
}
