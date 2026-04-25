import { Ghost } from './Ghost.js'
import { SelectedShip } from './SelectedShip.js'
import { placedShipsInstance } from './PlacedShips.js'

/**
 * Represents a dragged ship with ghost preview and placement logic.
 * Extends SelectedShip to add drag-specific behavior like ghost preview,
 * offset tracking, and placement validation.
 * @class DraggedShip
 * @extends SelectedShip
 */
export class DraggedShip extends SelectedShip {
  /**
   * Creates a DraggedShip instance.
   * @param {Object} ship - The ship object with id, letter, shape() method
   * @param {number} dragOffsetX - X offset from drag start point (pixels)
   * @param {number} dragOffsetY - Y offset from drag start point (pixels)
   * @param {number} cellSize - Size of each grid cell in pixels
   * @param {HTMLElement} source - Source element being dragged
   * @param {number} variantIndex - Index of the current variant
   * @param {Function} contentBuilder - Function(element, board, letter) to render ship
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
    const row = Math.floor(dragOffsetY / cellSize)
    const col = Math.floor(dragOffsetX / cellSize)
    this.source = source
    this.cursor = [row, col]
    this.offset = [dragOffsetX, dragOffsetY]
    this.ghost = new Ghost(super.board(), ship.letter, contentBuilder)
    this.shown = true
  }

  /**
   * Checks if the ship ghost is not currently visible.
   * @returns {boolean} True if not shown
   */
  isNotShown () {
    return !this.shown
  }

  /**
   * Hides the dragged ship and its ghost preview.
   * @returns {void}
   */
  hide () {
    this.shown = false
    this._hideGhost()
  }

  /**
   * Shows the dragged ship and its ghost preview.
   * @returns {void}
   */
  show () {
    this.shown = true
    this._showGhost()
  }

  /**
   * Removes the ghost element from the DOM.
   * @returns {void}
   */
  remove () {
    this._removeGhost()
  }

  /**
   * Moves the ghost to the specified screen position.
   * @param {number} x - X coordinate in pixels
   * @param {number} y - Y coordinate in pixels
   * @returns {void}
   */
  moveTo (x, y) {
    this._moveGhostTo(x, y)
  }

  /**
   * Updates ghost position based on mouse event coordinates and offset.
   * Adjusts coordinates by the drag offset and magic offset (13px) for pointer centering.
   * @param {MouseEvent} event - Mouse event with clientX and clientY
   * @returns {void}
   */
  move (event) {
    this.moveTo(
      event.clientX - this.offset[0] - 13,
      event.clientY - this.offset[1] - 13
    )
  }

  /**
   * Updates the ghost display to show current variant.
   * @returns {void}
   */
  setGhostVariant () {
    this._setGhostVariant()
  }

  /**
   * Rotates the ship and updates ghost preview.
   * @returns {Object} The rotated variant
   */
  rotate () {
    this._handleTransformation()
    return super.rotate()
  }

  /**
   * Resets the drag offset and cursor position to origin.
   * @returns {void}
   */
  resetOffset () {
    this.offset = [0, 0]
    this.cursor = [0, 0]
  }

  /**
   * Rotates the ship counter-clockwise and updates ghost.
   * @returns {Object} The left-rotated variant
   */
  leftRotate () {
    this._handleTransformation()
    return super.leftRotate()
  }

  /**
   * Flips the ship horizontally and updates ghost.
   * @returns {Object} The flipped variant
   */
  flip () {
    this._handleTransformation()
    return super.flip()
  }

  /**
   * Checks if the ship can be placed at the given grid position (without offset).
   * @param {number} row - Grid row position
   * @param {number} col - Grid column position
   * @param {Object} shipCellGrid - Ship cell grid for collision detection
   * @returns {boolean} True if can place
   */
  canPlaceRaw (row, col, shipCellGrid) {
    const placeable = this.placeable()
    if (this.ghost) {
      return placeable.canPlace(row, col, shipCellGrid)
    }
    return false
  }

  /**
   * Calculates grid position offset from cursor.
   * @param {number} row - Grid row position
   * @param {number} col - Grid column position
   * @returns {[number, number]} [offsetRow, offsetCol] relative to cursor
   */
  offsetCell (row, col) {
    const offsetRow = row - this.cursor[0]
    const offsetCol = col - this.cursor[1]
    return [offsetRow, offsetCol]
  }

  /**
   * Checks if the ship can be placed at the cursor-adjusted position.
   * Applies cursor offset to grid coordinates before validation.
   * @param {number} row - Grid row position
   * @param {number} col - Grid column position
   * @param {Object} shipCellGrid - Ship cell grid for collision detection
   * @returns {boolean} True if can place
   */
  canPlace (row, col, shipCellGrid) {
    const [offsetRow, offsetCol] = this.offsetCell(row, col)
    return this.canPlaceRaw(offsetRow, offsetCol, shipCellGrid)
  }

  /**
   * Places the ship cells at the cursor-adjusted position.
   * @param {number} row - Grid row position
   * @param {number} col - Grid column position
   * @param {Object} shipCellGrid - Ship cell grid for collision detection
   * @returns {Array|null} Placed ship cells or null if cannot place
   */
  placeCells (row, col, shipCellGrid) {
    const [offsetRow, offsetCol] = this.offsetCell(row, col)
    if (this.canPlaceRaw(offsetRow, offsetCol, shipCellGrid)) {
      return this.addCurrentToShipCells(offsetRow, offsetCol, shipCellGrid)
    }
    return null
  }

  /**
   * Places the ship and registers it with placed ships manager.
   * @param {number} row - Grid row position
   * @param {number} col - Grid column position
   * @param {Object} shipCellGrid - Ship cell grid for collision detection
   * @returns {Object|null} Placed ship instance or null if placement failed
   */
  place (row, col, shipCellGrid) {
    const placedCells = this.placeCells(row, col, shipCellGrid)
    if (placedCells) {
      return placedShipsInstance.push(this.ship, placedCells)
    }
    return null
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  /**
   * Handles transformation by resetting offset and updating ghost.
   * @returns {void}
   * @private
   */
  _handleTransformation () {
    this.resetOffset()
    this.setGhostVariant()
  }

  /**
   * Hides the ghost element.
   * @returns {void}
   * @private
   */
  _hideGhost () {
    this.ghost?.hide()
  }

  /**
   * Shows the ghost element.
   * @returns {void}
   * @private
   */
  _showGhost () {
    this.ghost?.show()
  }

  /**
   * Removes the ghost element from DOM.
   * @returns {void}
   * @private
   */
  _removeGhost () {
    this.ghost?.remove()
    this.ghost = null
  }

  /**
   * Moves the ghost element to specified coordinates.
   * @param {number} x - X coordinate in pixels
   * @param {number} y - Y coordinate in pixels
   * @returns {void}
   * @private
   */
  _moveGhostTo (x, y) {
    this.ghost?.moveTo(x, y)
  }

  /**
   * Updates the ghost variant display.
   * @returns {void}
   * @private
   */
  _setGhostVariant () {
    this.ghost?.setVariant(this.board())
  }

  /**
   * Adds the placeable to ship cells at given position.
   * Places the variant and adds ship to grid.
   * @param {Object} placeable - The placeable variant
   * @param {number} row - Grid row position
   * @param {number} col - Grid column position
   * @param {Object} shipCellGrid - Ship cell grid
   * @returns {Array} Ship cells after placement
   * @private
   */
  addPlaceableToShipCells (placeable, row, col, shipCellGrid) {
    this.ship.placeVariant(placeable, row, col)
    this.ship.addToGrid(shipCellGrid)
    return this.ship.cells
  }

  /**
   * Adds the current variant to ship cells at given position.
   * @param {number} row - Grid row position
   * @param {number} col - Grid column position
   * @param {Object} shipCellGrid - Ship cell grid
   * @returns {Array} Ship cells after placement
   * @private
   */
  addCurrentToShipCells (row, col, shipCellGrid) {
    return this.addPlaceableToShipCells(
      this.placeable(),
      row,
      col,
      shipCellGrid
    )
  }
}
