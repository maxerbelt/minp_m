/**
 * @typedef {'single'|'segment'|'ray'|'full'} ToolType
 */

/**
 * @typedef {[number, number]} Coordinates
 */

/**
 * @typedef {Object} LineToolState
 * @property {ToolType|null} currentTool - Currently selected tool
 * @property {Coordinates|null} lineStart - Starting coordinates of current line
 * @property {boolean} isActive - Whether a tool is currently active
 */

/**
 * @typedef {Object} LineCompletedEvent
 * @property {Coordinates} start - Starting coordinates
 * @property {Coordinates} end - Ending coordinates
 */

/**
 * LineToolController - Manages line drawing state and operations
 * Used by both RectCanvas and ColorPackedRectCanvas
 *
 * Coordinates the process of drawing lines with:
 * - Tool selection (single, segment, ray, full line)
 * - Line start/end points
 * - Preview cell computation
 * - Line completion and mask mutation
 *
 * @class LineToolController
 * @example
 *   const controller = new LineToolController(canvas, eventBus)
 *   controller.setTool('segment')
 *   controller.onCanvasClick([0, 0])
 *   controller.onCanvasClick([5, 5])
 */
export class LineToolController {
  /**
   * Initialize the line tool controller
   * @param {Object} gridCanvas - The canvas instance (RectCanvas, ColorPackedRectCanvas, etc.)
   * @param {Object} gridCanvas.grid - Grid data structure with previewCells, hoverLocation
   * @param {Function} [gridCanvas.completeLine] - Method to complete line drawing
   * @param {Function} [gridCanvas.updateLinePreview] - Method to update line preview
   * @param {Function} [gridCanvas.redraw] - Optional redraw method
   * @param {Object} eventBus - Event bus for emitting state changes
   * @param {Function} eventBus.emit - Method to emit events
   */
  constructor (gridCanvas, eventBus) {
    /** @type {Object} Reference to canvas instance */
    this.canvas = gridCanvas

    /** @type {Object} Reference to event bus */
    this.eventBus = eventBus

    /** @type {ToolType|null} Currently selected tool (single, segment, ray, full, or null) */
    this.currentTool = null

    /** @type {Coordinates|null} Starting coordinates of current line operation */
    this.lineStart = null
  }

  /**
   * Clear preview cells on the grid
   * @private
   * @returns {void}
   */
  _clearGridPreview () {
    if (this.canvas?.grid) {
      this.canvas.grid.previewCells = []
    }
  }

  /**
   * Set the current tool and reset line state
   * @param {ToolType|null} tool - Tool name or null to deactivate
   * @returns {void}
   */
  setTool (tool) {
    this.currentTool = tool
    this.lineStart = null
    this._clearGridPreview()
    this.eventBus.emit('lineTool:changed', tool)
  }

  /**
   * Check if a line tool is currently active
   * @returns {boolean} True if a tool is selected, false if no tool is active
   */
  isActive () {
    return this.currentTool !== null
  }

  /**
   * Clear grid preview and hover state, then request redraw
   * @private
   * @returns {void}
   */
  _clearGridPreviewAndHover () {
    if (this.canvas?.grid) {
      this.canvas.grid.previewCells = []
      this.canvas.grid.hoverLocation = null
      if (this.canvas.grid.redraw) {
        this.canvas.grid.redraw()
      }
    }
  }

  /**
   * Set the starting point for line drawing
   * @param {Coordinates} point - [x, y] coordinates
   * @returns {void}
   */
  setLineStart (point) {
    this.lineStart = point
    this._clearGridPreviewAndHover()
    this.eventBus.emit('lineTool:lineStartSet', point)
  }

  /**
   * Clear the line start point and preview
   * @returns {void}
   */
  clearLineStart () {
    this.lineStart = null
    this._clearGridPreview()
    this.eventBus.emit('lineTool:lineStartCleared')
  }

  /**
   * Handle canvas click for line tool operations
   * Manages the state machine: idle -> start point set -> line drawn
   * @param {Coordinates|null} hit - Hit test result [x, y] or null if miss
   * @returns {boolean} True if click was handled, false if no tool active or invalid hit
   */
  onCanvasClick (hit) {
    if (!this.isActive() || hit == null) {
      return false
    }

    if (this.lineStart == null) {
      this.setLineStart(hit)
      return true
    } else {
      this.completeLine(this.lineStart, hit)
      this.clearLineStart()
      return true
    }
  }

  /**
   * Complete the line drawing operation
   * Delegates to canvas for grid-specific mutation and preview computation
   * @param {Coordinates} start - Starting coordinates
   * @param {Coordinates} end - Ending coordinates
   * @returns {void}
   */
  completeLine (start, end) {
    if (!this.canvas?.completeLine) {
      console.warn('Canvas does not implement completeLine')
      return
    }
    this.canvas.completeLine(start, end)
    this.eventBus.emit('lineTool:lineCompleted', { start, end })
  }

  /**
   * Update the preview for the current line being drawn
   * @param {Coordinates} end - Current cursor position
   * @returns {void}
   */
  updatePreview (end) {
    if (!this.isActive() || this.lineStart == null) {
      return
    }

    if (!this.canvas?.updateLinePreview) {
      console.warn('Canvas does not implement updateLinePreview')
      return
    }

    this.canvas.updateLinePreview(this.lineStart, end)
    this.eventBus.emit('lineTool:previewUpdated', {
      start: this.lineStart,
      end
    })
  }

  /**
   * Reset all line tool state to initial values
   * @returns {void}
   */
  reset () {
    this.currentTool = null
    this.lineStart = null
    this._clearGridPreview()
    this.eventBus.emit('lineTool:reset')
  }

  /**
   * Get the current state for serialization or debugging
   * @returns {LineToolState} Current tool state and active status
   */
  getState () {
    return {
      currentTool: this.currentTool,
      lineStart: this.lineStart,
      isActive: this.isActive()
    }
  }
}
