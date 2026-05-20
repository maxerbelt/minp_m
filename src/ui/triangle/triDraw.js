import { MaskTri } from '../../grid/triangle/maskTri.js'
import { drawTri, triToPixel, pixelToTri } from './triDrawHelper.js'
import { DrawBase } from '../drawBase.js'
import { BigOne } from '../../grid/bitStore/helpers/bigbits.js'

/** @type {number} */
const SQRT_THREE_OVER_TWO = Math.sqrt(3) / 2

/**
 * Color palette for triangle rendering
 * @type {Object.<string, string>}
 */
const COLORS = {
  SET: '#4caf50',
  UNSET: '#2196F3',
  HOVER: '#FF9800',
  STROKE: '#333'
}

/** @type {number} */
const TRIANGLE_OFFSET = 0.3

/**
 * TriDraw - Interactive triangular grid renderer
 *
 * Manages rendering and interaction for triangular grid layouts with:
 * - Canvas-based triangle drawing
 * - Mouse event handling (hover, click)
 * - Bit manipulation for cell state
 * - Real-time visual feedback
 *
 * @class TriDraw
 * @extends {DrawBase}
 */
export class TriDraw extends DrawBase {
  /**
   * Initialize a triangular grid drawer
   *
   * @param {string} canvasId - ID of the canvas element to render to
   * @param {number} [side=3] - Number of rows in the triangle grid
   * @param {number} [offsetX=300] - X offset for grid positioning on canvas
   * @param {number} [offsetY=300] - Y offset for grid positioning on canvas
   * @param {number} [size=25] - Side length of each triangle in pixels
   * @throws {Error} If canvas element not found or context unavailable
   */
  constructor (canvasId, side = 3, offsetX = 300, offsetY = 300, size = 25) {
    const mask = new MaskTri(side)
    super(canvasId, mask, size, offsetX, offsetY)

    /** @type {MaskTri} */
    this.mask = mask
    /** @type {*} */
    this.indexer = mask.indexer
    /** @type {number} */
    this.side = side
    /** @type {number} */
    this.triSize = size
    /** @type {number} */
    this.triHeight = size * SQRT_THREE_OVER_TWO
    /** @type {bigint} */
    this.bits = 0n
  }

  /**
   * Set the bits to display on the triangle grid
   *
   * Updates the internal bit representation and triggers a full redraw
   * of the canvas with the new state.
   *
   * @param {bigint} bits - Bit mask where each bit position corresponds to a triangle cell
   * @returns {void}
   */
  setBits (bits) {
    this.bits = bits
    this.redraw()
  }

  /**
   * Set bits from an array of grid coordinates
   *
   * Converts grid coordinates (row, column pairs) to bit representation
   * and updates the display. Useful for populating the grid from external data.
   *
   * @param {Array<Array<number>>} coords - List of [row, column] coordinate pairs
   * @returns {void}
   */
  setBitsFromCoords (coords) {
    this.mask.fromCoords(coords)
    this.bits = this.mask.bits
    this.redraw()
  }

  /**
   * Clear all triangle bits to zero
   *
   * Resets the entire grid to an empty state and redraws the canvas.
   *
   * @returns {void}
   */
  clear () {
    this.bits = 0n
    this.redraw()
  }

  /**
   * Redraw the entire canvas
   *
   * Clears the canvas, renders all grid triangles, and applies
   * any active hover state visualization.
   *
   * @returns {void}
   */
  redraw () {
    this.clearCanvas()
    this._drawGrid()
    this._drawHover()
  }

  /**
   * Redraw with optional hover selection highlight
   *
   * Updates the hover location state and triggers a complete redraw
   * to show the hover visual feedback on the specified triangle.
   *
   * @param {number|null} [hoverIndex=null] - Index of triangle to highlight, or null to clear
   * @returns {void}
   */
  redrawWithHover (hoverIndex = null) {
    this.hoverLocation = hoverIndex
    this.redraw()
  }

  // ============================================================================
  // Grid Drawing
  // ============================================================================

  /**
   * Draw all triangles in the grid
   *
   * Iterates through all valid triangle positions and renders them
   * with appropriate colors based on their bit state.
   *
   * @returns {void}
   * @protected
   */
  _drawGrid () {
    const indexerSize = this.indexer.size ?? this.indexer.length ?? 0
    for (let index = 0; index < indexerSize; index++) {
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
   * Convert a triangle index to row and column coordinates
   *
   * Maps a linear index to 2D grid coordinates using the grid's
   * indexer implementation.
   *
   * @param {number} index - Linear index of triangle in the grid
   * @returns {{row: number, column: number}} Row and column coordinates
   * @private
   */
  _getCoordinatesForIndex (index) {
    const [row, column] = this.indexer.location(index)
    return { row, column }
  }

  /**
   * Determine triangle orientation based on column position
   *
   * In triangular grids, triangles alternate between pointing up
   * and down based on their column index.
   *
   * @param {number} column - Triangle column index
   * @returns {'up'|'down'} Triangle orientation
   * @private
   */
  _getTriangleOrientation (column) {
    return column % 2 === 0 ? 'up' : 'down'
  }

  /**
   * Calculate vertical pixel offset for an oriented triangle
   *
   * Applies positioning adjustments for downward-pointing triangles
   * to maintain consistent visual alignment.
   *
   * @param {'up'|'down'} orientation - Triangle orientation direction
   * @returns {number} Vertical offset in pixels
   * @private
   */
  _getVerticalOffset (orientation) {
    return orientation === 'down' ? -(this.triHeight * TRIANGLE_OFFSET) : 0
  }

  /**
   * Determine the fill color for a triangle cell
   *
   * Returns hover color if cell is hovered, otherwise returns set or unset
   * color based on bit state.
   *
   * @param {number} index - Triangle index
   * @param {boolean} [isHover=false] - Whether cell is currently hovered
   * @returns {string} Hex color string for rendering
   * @private
   */
  _getCellColor (index, isHover = false) {
    if (isHover) return COLORS.HOVER
    return this._isBitSet(index) ? COLORS.SET : COLORS.UNSET
  }

  /**
   * Check whether a bit is set for a given triangle index
   *
   * Tests a specific bit position in the bit field to determine
   * if that triangle cell should appear as "filled" or "set".
   *
   * @param {number} index - Triangle index to test
   * @returns {boolean} True if bit is set (1), false if unset (0)
   * @private
   */
  _isBitSet (index) {
    return ((this.bits >> BigInt(index)) & 1n) === 1n
  }

  /**
   * Render a single triangle cell on the canvas
   *
   * Calculates pixel coordinates from grid coordinates and invokes
   * the drawing helper to render the triangle with appropriate color
   * and stroke styling.
   *
   * @param {number} row - Grid row index
   * @param {number} column - Grid column index
   * @param {string} color - Fill color as CSS color string
   * @param {'up'|'down'} orientation - Triangle pointing direction
   * @returns {void}
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
   * Draw the hover triangle highlight if one is active
   *
   * Renders the hovered triangle with its special hover color to provide
   * visual feedback to the user. Only draws if hoverLocation is set.
   *
   * @returns {void}
   * @protected
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
   * Toggle the bit state of a triangle cell
   *
   * Flips the bit at the specified index (0→1 or 1→0) and redraws
   * the canvas. If index is null, performs no operation.
   *
   * @param {number|null} index - Triangle index to toggle, or null for no-op
   * @returns {void}
   */
  toggleCell (index) {
    if (index !== null) {
      this._toggleBitAtIndex(index)
    }
  }

  /**
   * Toggle the bit at a specific index
   *
   * Uses XOR operation with a single-bit mask to flip the target bit,
   * then triggers a redraw to reflect the state change.
   *
   * @param {number} index - Triangle index to toggle
   * @returns {void}
   * @private
   */
  _toggleBitAtIndex (index) {
    this.bits ^= BigOne.bitMaskByPos(index)
    this.redraw()
  }

  // ============================================================================
  // Mouse Event Handling
  // ============================================================================

  /**
   * Find triangle index from pixel coordinates using hit testing
   *
   * Converts pixel coordinates to grid coordinates and validates
   * that they fall within the triangular grid bounds. Returns the
   * corresponding triangle index or null if outside grid.
   *
   * This method is called by the parent DrawBase class during mouse
   * move and click events.
   *
   * @param {number} px - Pixel X coordinate
   * @param {number} py - Pixel Y coordinate
   * @returns {number|null} Triangle index if hit, null if miss
   * @protected
   */
  _hitTest (px, py) {
    const [row, column] = pixelToTri(
      px - this.offsetX,
      py - this.offsetY,
      this.triSize
    )
    if (!this.indexer.isValid(row, column)) return null
    const idx = this.indexer.index(row, column)
    return idx ?? null
  }
}
