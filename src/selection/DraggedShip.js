import { SelectedShip } from './SelectedShip.js'
import { Ghost } from './Ghost.js'
import { placedShipsInstance } from './PlacedShips.js'

/**
 * @import type { CursorPosition, OffsetVector, MouseDragEvent } from './types/ui.types.js';
 * @import type { Ship, ShipCellGrid, Placeable } from './types/domain.types.js';
 */

/**
 * Represents a dragged ship with ghost preview and placement logic.
 * Extends SelectedShip to add drag-specific behavior including ghost preview visualization,
 * offset tracking for pixel-perfect positioning, and ship placement validation on the grid.
 * Maintains state of visibility, cursor position relative to grid, and drag offset from mouse.
 *
 * @class DraggedShip
 * @extends SelectedShip
 * @example
 * const draggedShip = new DraggedShip(ship, offsetX, offsetY, cellSize, source, variantIndex, builder);
 * draggedShip.move(mouseEvent);
 * draggedShip.show();
 * draggedShip.place(gridX, gridY, shipCellGrid);
 */
export class DraggedShip extends SelectedShip {
  /**
   * Creates a DraggedShip instance with initial drag state and ghost preview.
   * Initializes cursor position from drag offset and cell size, sets up ghost preview
   * for visual feedback during dragging. Inherits ship rotation/flip from SelectedShip.
   *
   * @param {Ship} ship - The ship object with id, letter, shape() method
   * @param {number} dragOffsetX - X offset from drag start point in pixels
   * @param {number} dragOffsetY - Y offset from drag start point in pixels
   * @param {number} cellSize - Size of each grid cell in pixels
   * @param {HTMLElement} source - Source element being dragged
   * @param {number} variantIndex - Index of the current ship variant (0-based)
   * @param {Function} contentBuilder - Function(element, board, letter) to render ship content
   * @returns {void}
   */
  constructor (
    ship,
    dragOffsetX,
    dragOffsetY,
    cellSize,
    source,
    variantIndex,
    contentBuilder
  ) {
    super(ship, variantIndex, contentBuilder)

    this.source = source
    this.cursor = DraggedShip._computeCursor(dragOffsetX, dragOffsetY, cellSize)
    this.offset = [dragOffsetX, dragOffsetY]
    this.ghost = this._createGhost()
    this.shown = true
  }

  /**
   * Computes cursor cell position from pixel drag offset and cell size.
   * Converts pixel-space offset to grid-space cursor coordinates by dividing by cell size
   * and flooring to nearest integer grid position. Row is offset/Y, column is offset/X.
   *
   * @param {number} dragOffsetX - Pixel offset in X dimension
   * @param {number} dragOffsetY - Pixel offset in Y dimension
   * @param {number} cellSize - Size of each grid cell in pixels
   * @returns {CursorPosition} [row, column] grid position
   * @static
   * @private
   */
  static _computeCursor (dragOffsetX, dragOffsetY, cellSize) {
    return [
      Math.floor(dragOffsetY / cellSize),
      Math.floor(dragOffsetX / cellSize)
    ]
  }

  /**
   * Creates the ghost preview instance for the dragged ship.
   * Ghost displays visual feedback of ship placement and current rotation/orientation
   * as user drags the ship across the board. Initialized with current board state.
   *
   * @returns {GhostType} New Ghost instance attached to current board
   * @private
   */
  _createGhost () {
    return new Ghost(super.board(), this.ship.letter, this.contentBuilder)
  }

  /**
   * Checks if the ship ghost is not currently visible on the board.
   * Returns inverse of shown flag, useful for conditional show/hide logic.
   *
   * @returns {boolean} True if ghost is hidden, false if shown
   */
  isNotShown () {
    return !this.shown
  }

  /**
   * Hides the dragged ship and its ghost preview from the board.
   * Sets shown flag to false and delegates to ghost hide action.
   * Used when drag operation is cancelled or completed.
   *
   * @returns {void}
   */
  hide () {
    this.shown = false
    this._ghostAction('hide')
  }

  /**
   * Shows the dragged ship and its ghost preview on the board.
   * Sets shown flag to true and delegates to ghost show action.
   * Called when drag operation starts or is resumed.
   *
   * @returns {void}
   */
  show () {
    this.shown = true
    this._ghostAction('show')
  }

  /**
   * Removes the ghost element from the DOM and clears ghost reference.
   * Called during cleanup after drag completion or cancellation.
   * Prevents memory leaks by ensuring ghost DOM elements are removed.
   *
   * @returns {void}
   */
  remove () {
    this._ghostAction('remove')
    this.ghost = null
  }

  /**
   * Moves the ghost to the specified screen position in pixels.
   * Updates visual position of ghost preview during drag operation.
   * Coordinates are screen/viewport pixels, not grid coordinates.
   *
   * @param {number} x - X coordinate in screen pixels
   * @param {number} y - Y coordinate in screen pixels
   * @returns {void}
   */
  moveTo (x, y) {
    this._ghostAction('moveTo', x, y)
  }

  /**
   * Updates ghost position based on mouse event coordinates and current drag offset.
   * Called during mousemove to track ship position as user drags.
   * Subtracts offset and margin (13px) to align ghost preview with cursor.
   *
   * @param {MouseDragEvent} event - Mouse event with clientX and clientY
   * @returns {void}
   */
  move (event) {
    const [x, y] = this._calculateGhostPosition(event)
    this.moveTo(x, y)
  }

  /**
   * Updates the ghost display to show current ship variant.
   * Called after variant changes to ensure ghost reflects active variant.
   * Synchronizes ghost visual state with parent SelectedShip state.
   *
   * @returns {void}
   */
  setGhostVariant () {
    this._ghostAction('setVariant', this.board())
  }

  /**
   * Rotates the ship clockwise and updates ghost preview.
   * Handles transformation by resetting offset and updating ghost variant display.
   * Delegates rotation to parent SelectedShip class.
   *
   * @returns {Object} Rotation result object from parent class
   */
  rotate () {
    this._handleTransformation()
    return super.rotate()
  }

  /**
   * Resets the drag offset and cursor position to origin [0, 0].
   * Called after transformations (rotation/flip) to reset cursor tracking.
   * Ensures ghost position aligns correctly after shape changes.
   *
   * @returns {void}
   */
  resetOffset () {
    this.offset = /** @type {OffsetVector} */ ([0, 0])
    this.cursor = /** @type {CursorPosition} */ ([0, 0])
  }

  /**
   * Rotates the ship counter-clockwise and updates ghost preview.
   * Handles transformation by resetting offset and updating ghost variant display.
   * Delegates rotation to parent SelectedShip class.
   *
   * @returns {Object} Counter-rotation result object from parent class
   */
  leftRotate () {
    this._handleTransformation()
    return super.leftRotate()
  }

  /**
   * Flips the ship horizontally and updates ghost preview.
   * Handles transformation by resetting offset and updating ghost variant display.
   * Delegates flip to parent SelectedShip class.
   *
   * @returns {Object} Flip result object from parent class
   */
  flip () {
    this._handleTransformation()
    return super.flip()
  }

  /**
   * Calculates grid position offset from cursor to target position.
   * Computes displacement between current cursor position and target grid coordinates.
   * Used for placement validation and cell adjustment calculations.
   *
   * @param {number} x - Target grid column
   * @param {number} y - Target grid row
   * @returns {CursorPosition} [rowOffset, colOffset] from cursor to target
   */
  offsetCell (x, y) {
    return /** @type {CursorPosition} */ ([
      x - this.cursor[0],
      y - this.cursor[1]
    ])
  }

  /**
   * Places the ship cells at the cursor-adjusted grid position.
   * Validates placement and calculates final cell coordinates adjusted for cursor offset.
   * Adds ship to existing ship cell grid for collision detection and placement validation.
   *
   * @param {number} x - Target grid column
   * @param {number} y - Target grid row
   * @param {ShipCellGrid} shipCellGrid - Grid tracking all placed ship cells
   * @returns {number[][]|null} Array of [row, col] cells if placement valid, null if invalid
   */
  placeCells (x, y, shipCellGrid) {
    if (!this.ghost) return null
    const [offsetX, offsetY] = this.offsetCell(x, y)

    return this.addCurrentToShipCells(offsetX, offsetY, shipCellGrid)
  }

  /**
   * Places the ship at the target grid position and registers with PlacedShips manager.
   * Finalizes ship placement by adding to ship cell grid and recording in placement registry.
   * Called when user drops ship during drag operation.
   *
   * @param {number} x - Target grid column
   * @param {number} y - Target grid row
   * @param {ShipCellGrid} shipCellGrid - Grid tracking all placed ship cells
   * @returns {Object|null} PlacedShips registry entry if successful, null if placement invalid
   */
  place (x, y, shipCellGrid) {
    const placedCells = this.placeCells(x, y, shipCellGrid)
    return placedCells ? placedShipsInstance.push(this.ship, placedCells) : null
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  /**
   * Handles transformation by resetting offset and updating ghost.
   * Called after rotation/flip to ensure cursor and ghost display are synchronized.
   * Private helper that maintains visual consistency after shape changes.
   *
   * @returns {void}
   * @private
   */
  _handleTransformation () {
    this.resetOffset()
    this.setGhostVariant()
  }

  /**
   * Safely invokes a ghost method when the ghost exists.
   * Uses optional chaining to prevent errors if ghost has been removed.
   * Private helper for delegating actions to ghost preview instance.
   *
   * @param {string} method - Name of ghost method to invoke
   * @param {...any} args - Arguments to pass to ghost method
   * @returns {void}
   * @private
   */
  _ghostAction (method, ...args) {
    this.ghost?.[method]?.(...args)
  }

  /**
   * Computes the screen coordinates for ghost positioning from mouse event.
   * Subtracts drag offset and 13px margin to align ghost visual with cursor.
   * The 13px offset centers the ghost preview on the cursor position.
   *
   * @param {MouseDragEvent} event - Mouse event with clientX and clientY
   * @returns {Array<number>} [screenX, screenY] position for ghost element
   * @private
   */
  _calculateGhostPosition (event) {
    return [
      event.clientX - this.offset[0] - 13,
      event.clientY - this.offset[1] - 13
    ]
  }

  /**
   * Gets the current placeable object from the selected ship.
   * Accesses placeable() method from parent SelectedShip to get current variant's placement interface.
   * Private helper for accessing placement validation during drag operations.
   *
   * @returns {Placeable|null} Current placeable if available, null otherwise
   * @private
   */
  _currentPlaceable () {
    return this.placeable()
  }

  /**
   * Adds the current variant to ship cells at given grid position.
   * Gets current placeable, creates placement at coordinates, and adds ship to grid.
   * Internal method handling the actual cell placement logic during drop.
   *
   * @param {number} x - Target grid column
   * @param {number} y - Target grid row
   * @param {ShipCellGrid} shipCellGrid - Grid tracking all placed ship cells
   * @returns {null|number[][]} Array of [row, col] cells if placement valid, null if invalid
   * @private
   */
  addCurrentToShipCells (x, y, shipCellGrid) {
    const placeable = this._currentPlaceable()
    const placement = placeable.placeAt(x, y)
    return this.ship.placeOnGrid(shipCellGrid, placement)
  }
}
