/**
 * LineToolController - Manages line drawing state and operations
 * Used by both RectCanvas and ColorPackedRectCanvas
 *
 * Coordinates the process of drawing lines with:
 * - Tool selection (single, segment, ray, full line)
 * - Line start/end points
 * - Preview cell computation
 * - Line completion and mask mutation
 */
export class LineToolController {
  /**
   * Initialize the line tool controller
   * @param {GridCanvas} gridCanvas - The canvas instance (RectCanvas, etc.)
   * @param {EventEmitter} eventBus - Event bus for emitting state changes
   */
  constructor (gridCanvas, eventBus) {
    this.canvas = gridCanvas
    this.eventBus = eventBus
    this.currentTool = null // null | 'single' | 'segment' | 'ray' | 'full'
    this.lineStart = null
  }

  /**
   * Set the current tool
   * @param {string|null} tool - null | 'single' | 'segment' | 'ray' | 'full'
   */
  setTool (tool) {
    this.currentTool = tool
    this.lineStart = null
    // Clear preview cells on the grid
    if (this.canvas?.grid) {
      this.canvas.grid.previewCells = []
    }
    this.eventBus.emit('lineTool:changed', tool)
  }

  /**
   * Check if a line tool is currently active
   * @returns {boolean}
   */
  isActive () {
    return this.currentTool !== null && this.currentTool !== undefined
  }

  /**
   * Set the starting point for line drawing
   * @param {[number, number]} point - [x, y] coordinates
   */
  setLineStart (point) {
    this.lineStart = point
    if (this.canvas?.grid) {
      this.canvas.grid.previewCells = []
      this.canvas.grid.hoverLocation = null
      if (this.canvas.grid.redraw) {
        this.canvas.grid.redraw()
      }
    }
    this.eventBus.emit('lineTool:lineStartSet', point)
  }

  /**
   * Clear the line start point
   */
  clearLineStart () {
    this.lineStart = null
    if (this.canvas?.grid) {
      this.canvas.grid.previewCells = []
    }
    this.eventBus.emit('lineTool:lineStartCleared')
  }

  /**
   * Handle canvas click for line tool operations
   * Manages the state machine: idle -> start point set -> line drawn
   * @param {[number, number]} hit - Hit test result [x, y]
   * @returns {boolean} - Whether the click was handled
   */
  onCanvasClick (hit) {
    if (!this.isActive() || !hit) {
      return false
    }

    if (!this.lineStart) {
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
   * @param {[number, number]} start - Starting coordinates
   * @param {[number, number]} end - Ending coordinates
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
   * @param {[number, number]} end - Current cursor position
   */
  updatePreview (end) {
    if (!this.isActive() || !this.lineStart) {
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
   * Reset all line tool state
   */
  reset () {
    this.currentTool = null
    this.lineStart = null
    if (this.canvas?.grid) {
      this.canvas.grid.previewCells = []
    }
    this.eventBus.emit('lineTool:reset')
  }

  /**
   * Get the current state for serialization/debugging
   * @returns {Object}
   */
  getState () {
    return {
      currentTool: this.currentTool,
      lineStart: this.lineStart,
      isActive: this.isActive()
    }
  }
}
