import { Ghost } from './Ghost.js'
import { SelectedShip } from './SelectedShip.js'
import { placedShipsInstance } from './PlacedShips.js'

/**
 * Represents a dragged ship with ghost preview and placement logic.
 */
export class DraggedShip extends SelectedShip {
  /**
   * Creates a DraggedShip instance.
   * @param {Object} ship - The ship object
   * @param {number} dragOffsetX - X offset from drag start
   * @param {number} dragOffsetY - Y offset from drag start
   * @param {number} cellSize - Size of each cell
   * @param {HTMLElement} source - Source element
   * @param {number} variantIndex - Index of the current variant
   * @param {Function} contentBuilder - Function to build content for the ship
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
   * Checks if the ship is not shown.
   * @returns {boolean} True if not shown
   */
  isNotShown () {
    return !this.shown
  }

  /**
   * Hides the dragged ship and its ghost.
   */
  hide () {
    this.shown = false
    this.ghost?.hide()
  }

  /**
   * Shows the dragged ship and its ghost.
   */
  show () {
    this.shown = true
    this.ghost?.show()
  }

  /**
   * Removes the ghost element.
   */
  remove () {
    this.ghost?.remove()
    this.ghost = null
  }

  /**
   * Moves the ghost to the specified position.
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   */
  moveTo (x, y) {
    this.ghost?.moveTo(x, y)
  }

  /**
   * Moves the ghost based on mouse event.
   * @param {MouseEvent} event - Mouse event
   */
  move (event) {
    this.moveTo(
      event.clientX - this.offset[0] - 13,
      event.clientY - this.offset[1] - 13
    )
  }

  /**
   * Updates the ghost variant.
   */
  setGhostVariant () {
    this.ghost?.setVariant(this.board())
  }

  /**
   * Handles transformation by resetting offset and updating ghost.
   * @private
   */
  _handleTransformation () {
    this.resetOffset()
    this.setGhostVariant()
  }

  /**
   * Rotates the ship and updates ghost.
   */
  rotate () {
    this._handleTransformation()
    super.rotate()
  }

  /**
   * Resets the drag offset and cursor.
   */
  resetOffset () {
    this.offset = [0, 0]
    this.cursor = [0, 0]
  }

  /**
   * Rotates the ship left and updates ghost.
   */
  leftRotate () {
    this._handleTransformation()
    super.leftRotate()
  }

  /**
   * Flips the ship and updates ghost.
   */
  flip () {
    this._handleTransformation()
    super.flip()
  }

  /**
   * Checks if the ship can be placed at the given position.
   * @param {number} row - Row position
   * @param {number} col - Column position
   * @param {Object} shipCellGrid - Ship cell grid
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
   * Adds the placeable to ship cells.
   * @param {Object} placeable - The placeable variant
   * @param {number} row - Row position
   * @param {number} col - Column position
   * @param {Object} shipCellGrid - Ship cell grid
   * @returns {Array} Ship cells
   */
  addPlaceableToShipCells (placeable, row, col, shipCellGrid) {
    this.ship.placeVariant(placeable, row, col)
    this.ship.addToGrid(shipCellGrid)
    return this.ship.cells
  }

  /**
   * Adds the current placeable to ship cells.
   * @param {number} row - Row position
   * @param {number} col - Column position
   * @param {Object} shipCellGrid - Ship cell grid
   * @returns {Array} Ship cells
   */
  addCurrentToShipCells (row, col, shipCellGrid) {
    return this.addPlaceableToShipCells(
      this.placeable(),
      row,
      col,
      shipCellGrid
    )
  }

  /**
   * Calculates offset cell position.
   * @param {number} row - Row
   * @param {number} col - Column
   * @returns {[number, number]} Offset row and column
   */
  offsetCell (row, col) {
    const offsetRow = row - this.cursor[0]
    const offsetCol = col - this.cursor[1]
    return [offsetRow, offsetCol]
  }

  /**
   * Checks if the ship can be placed at the cursor-adjusted position.
   * @param {number} row - Row position
   * @param {number} col - Column position
   * @param {Object} shipCellGrid - Ship cell grid
   * @returns {boolean} True if can place
   */
  canPlace (row, col, shipCellGrid) {
    const [offsetRow, offsetCol] = this.offsetCell(row, col)
    return this.canPlaceRaw(offsetRow, offsetCol, shipCellGrid)
  }

  /**
   * Places the ship cells at the cursor-adjusted position.
   * @param {number} row - Row position
   * @param {number} col - Column position
   * @param {Object} shipCellGrid - Ship cell grid
   * @returns {Array|null} Placed cells or null if cannot place
   */
  placeCells (row, col, shipCellGrid) {
    const [offsetRow, offsetCol] = this.offsetCell(row, col)
    if (this.canPlaceRaw(offsetRow, offsetCol, shipCellGrid)) {
      return this.addCurrentToShipCells(offsetRow, offsetCol, shipCellGrid)
    }
    return null
  }

  /**
   * Places the ship and adds to placed ships.
   * @param {number} row - Row position
   * @param {number} col - Column position
   * @param {Object} shipCellGrid - Ship cell grid
   * @returns {Object|null} Placed ship instance or null
   */
  place (row, col, shipCellGrid) {
    const placedCells = this.placeCells(row, col, shipCellGrid)
    if (placedCells) {
      return placedShipsInstance.push(this.ship, placedCells)
    }
    return null
  }
}
