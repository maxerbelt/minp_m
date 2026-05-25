import { Ghost } from './Ghost.js'
import { SelectedShip } from './SelectedShip.js'
import { placedShipsInstance } from './PlacedShips.js'

/**
 * @typedef {[number, number]} CursorPosition
 * @typedef {[number, number]} OffsetVector
 * @typedef {import('./Ghost.js').Ghost} GhostType
 * @typedef {import('./SelectedShip.js').SelectedShip} SelectedShipType
 * @typedef {Object} MouseDragEvent
 * @property {number} clientX
 * @property {number} clientY
 * @typedef {Object} ShipCellGrid
 * @typedef {Object} Placeable
 * @property {Function} canPlace
 * @typedef {Object} Ship
 * @property {string} id
 * @property {string} letter
 * @property {Function} shape
 * @property {Function} placeAt
 * @property {Function} placePlacement
 * @property {Function} addToGrid
 * @property {Function} placeAtCells
 * @property {Function} removeFromPlacement
 * @property {Array} cells
 */

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

    this.source = source
    this.cursor = DraggedShip._computeCursor(dragOffsetX, dragOffsetY, cellSize)
    this.offset = [dragOffsetX, dragOffsetY]
    this.ghost = this._createGhost()
    this.shown = true
  }

  /**
   * Computes cursor cell position using drag offset and cell size.
   * @param {number} dragOffsetX
   * @param {number} dragOffsetY
   * @param {number} cellSize
   * @returns {CursorPosition}
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
   * @returns {GhostType}
   * @private
   */
  _createGhost () {
    return new Ghost(super.board(), this.ship.letter, this.contentBuilder)
  }

  /**
   * Checks if the ship ghost is not currently visible.
   * @returns {boolean}
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
    this._ghostAction('hide')
  }

  /**
   * Shows the dragged ship and its ghost preview.
   * @returns {void}
   */
  show () {
    this.shown = true
    this._ghostAction('show')
  }

  /**
   * Removes the ghost element from the DOM.
   * @returns {void}
   */
  remove () {
    this._ghostAction('remove')
    this.ghost = null
  }

  /**
   * Moves the ghost to the specified screen position.
   * @param {number} x - X coordinate in pixels
   * @param {number} y - Y coordinate in pixels
   * @returns {void}
   */
  moveTo (x, y) {
    this._ghostAction('moveTo', x, y)
  }

  /**
   * Updates ghost position based on mouse event coordinates and offset.
   * @param {MouseDragEvent} event - Mouse event with clientX and clientY
   * @returns {void}
   */
  move (event) {
    const [x, y] = this._calculateGhostPosition(event)
    this.moveTo(x, y)
  }

  /**
   * Updates the ghost display to show current variant.
   * @returns {void}
   */
  setGhostVariant () {
    this._ghostAction('setVariant', this.board())
  }

  /**
   * Rotates the ship and updates ghost preview.
   * @returns {Object}
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
    this.offset = /** @type {OffsetVector} */ ([0, 0])
    this.cursor = /** @type {CursorPosition} */ ([0, 0])
  }

  /**
   * Rotates the ship counter-clockwise and updates ghost.
   * @returns {Object}
   */
  leftRotate () {
    this._handleTransformation()
    return super.leftRotate()
  }

  /**
   * Flips the ship horizontally and updates ghost.
   * @returns {Object}
   */
  flip () {
    this._handleTransformation()
    return super.flip()
  }

  /**
   * Checks if the ship can be placed at the given grid position (without cursor offset).
   * @param {number} x
   * @param {number} y
   * @param {ShipCellGrid} shipCellGrid
   * @returns {boolean}
   */
  canPlaceRaw (x, y, shipCellGrid) {
    const placeable = this._currentPlaceable()
    return Boolean(this.ghost && placeable?.canPlace(x, y, shipCellGrid))
  }

  /**
   * Calculates grid position offset from cursor.
   * @param {number} x
   * @param {number} y
   * @returns {CursorPosition}
   */
  offsetCell (x, y) {
    return /** @type {CursorPosition} */ ([
      x - this.cursor[0],
      y - this.cursor[1]
    ])
  }

  /**
   * Checks if the ship can be placed at the cursor-adjusted position.
   * @param {number} x
   * @param {number} y
   * @param {ShipCellGrid} shipCellGrid
   * @returns {boolean}
   */
  canPlace (x, y, shipCellGrid) {
    const [offsetX, offsetY] = this.offsetCell(x, y)
    return this.canPlaceRaw(offsetX, offsetY, shipCellGrid)
  }

  /**
   * Places the ship cells at the cursor-adjusted position.
   * @param {number} x
   * @param {number} y
   * @param {ShipCellGrid} shipCellGrid
   * @returns {Array|null}
   */
  placeCells (x, y, shipCellGrid) {
    if (!this.ghost) return null
    const [offsetX, offsetY] = this.offsetCell(x, y)

    return this.addCurrentToShipCells(offsetX, offsetY, shipCellGrid)
  }

  /**
   * Places the ship and registers it with placed ships manager.
   * @param {number} x
   * @param {number} y
   * @param {ShipCellGrid} shipCellGrid
   * @returns {Object|null}
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
   * @private
   */
  _handleTransformation () {
    this.resetOffset()
    this.setGhostVariant()
  }

  /**
   * Safely invokes a ghost method when the ghost exists.
   * @param {string} method
   * @param {...any} args
   * @private
   */
  _ghostAction (method, ...args) {
    this.ghost?.[method]?.(...args)
  }

  /**
   * Computes the screen coordinates for ghost positioning.
   * @param {MouseDragEvent} event
   * @returns {Array<number>}
   * @private
   */
  _calculateGhostPosition (event) {
    return [
      event.clientX - this.offset[0] - 13,
      event.clientY - this.offset[1] - 13
    ]
  }

  /**
   * Gets the current placeable from the selected ship.
   * @returns {Placeable|null}
   * @private
   */
  _currentPlaceable () {
    return this.placeable()
  }

  /**
   * Adds the current variant to ship cells at given position.
   * @param {number} x
   * @param {number} y
   * @param {ShipCellGrid} shipCellGrid
   * @returns {null|number[][]} Updated ship cells or null if placement invalid
   * @private
   */
  addCurrentToShipCells (x, y, shipCellGrid) {
    const placeable = this._currentPlaceable()
    const placement = placeable.placeAt(x, y)
    return this.ship.placeOnGrid(shipCellGrid, placement)
  }
}
