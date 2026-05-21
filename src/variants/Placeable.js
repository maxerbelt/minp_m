import { CellsToBePlaced } from './CellsToBePlaced.js'
import { placingTarget } from './makeCell3.js'
import { Mask } from '../grid/rectangle/mask.js'

/**
 * @typedef {import('./CellsToBePlaced.js').ZoneInfo} ZoneInfo
 * Information about a specific zone at a grid position.
 *
 * @typedef {import('./CellsToBePlaced.js').PlacementTarget} PlacementTarget
 * Configuration for checking bounds and zone constraints during placement.
 *
 * @typedef {(zoneInfo: ZoneInfo) => boolean} PlacementValidator
 * Function type for validating zone information during placement.
 */

/**
 * Represents a placeable board with validation and placement logic.
 * Manages the board representation, validates placement constraints,
 * and provides methods for creating constrained placements at specific positions.
 */
export class Placeable {
  /**
   * The board mask representing the shape/structure to be placed.
   * @type {Mask}
   */
  board

  /**
   * Validation function for zone constraints.
   * Determines whether cells can be placed in specific zones.
   * @type {PlacementValidator}
   */
  validator

  /**
   * Zone detail level for zone validation.
   * Controls granularity of zone checking during placement.
   * @type {number}
   */
  zoneDetail

  /**
   * Placement target configuration with bounds and zone checkers.
   * Provides methods for validating bounds and retrieving zone information.
   * @type {PlacementTarget}
   */
  target

  /**
   * Creates a placeable instance.
   * @param {Mask} board - The board mask representing the placeable shape.
   * @param {PlacementValidator} [validator] - Optional validation function (defaults to accept all zones).
   * @param {number} [zoneDetail=0] - Optional zone detail level for granular validation.
   * @param {PlacementTarget} [target] - Optional placement target (defaults to placingTarget).
   */
  constructor (board, validator, zoneDetail, target) {
    this.board = board // board.clone.shrinkToOccupied()
    this.validator = typeof validator === 'function' ? validator : () => true
    this.zoneDetail = zoneDetail ?? 0
    this.target = target || placingTarget
  }

  /**
   * Gets the cell coordinates of the board.
   * @returns {Array<Array<number>>} Array of [row, column] coordinate pairs for occupied cells.
   */
  get cells () {
    return this.board.toCoords
  }

  /**
   * Sets the cells by creating a new board from coordinates.
   * Replaces the board with a new Mask created from the provided coordinates.
   * @param {Array<Array<number>>} cells - Array of [row, column] coordinate pairs.
   */
  set cells (cells) {
    this.board = Mask.fromCoords(cells)
  }

  /**
   * Gets the height of the board in grid units.
   * @returns {number} The board height.
   */
  height () {
    return this.board.height
  }

  /**
   * Gets the width of the board in grid units.
   * @returns {number} The board width.
   */
  width () {
    return this.board.width
  }

  /**
   * Creates a placement at the specified position.
   * Generates a CellsToBePlaced instance with the board embedded at the given coordinates,
   * maintaining all validation constraints from this placeable.
   * @param {number} x - The x (column) position for placement.
   * @param {number} y - The y (row) position for placement.
   * @returns {CellsToBePlaced} Placement instance with cells positioned at (x, y).
   */
  placeAt (x, y) {
    return new CellsToBePlaced(
      this.board,
      x,
      y,
      this.validator,
      this.zoneDetail,
      this.target
    )
  }

  /**
   * Checks if the placeable fits within all applicable bounds.
   * Uses the placement target's allBoundsChecker to validate that all cells
   * fit within the allowed area given the board dimensions.
   * Includes error handling and logging for debugging placement issues.
   * @param {number} r - The row coordinate to check.
   * @param {number} c - The column coordinate to check.
   * @returns {boolean} True if the placeable is within all bounds, false otherwise.
   */
  inAllBounds (r, c) {
    try {
      const h = this.height()
      const w = this.width()
      return this.target.allBoundsChecker(r, c, h, w)
    } catch (error) {
      console.error(
        'An error occurred checking : ',
        JSON.stringify(this.cells),
        error.message
      )
      return false
    }
  }

  /**
   * Checks if the placeable can be placed at the specified position.
   * Performs comprehensive validation including bounds checking, zone validation,
   * and conflict detection against existing ship cells. Creates a temporary placement
   * and delegates to its canPlace method for validation.
   * @param {number} r - The row coordinate for placement.
   * @param {number} c - The column coordinate for placement.
   * @param {any} shipCellGrid - The grid containing existing ship cells to check against.
   * @returns {boolean} True if placement is valid, false if any constraint is violated.
   */
  canPlace (r, c, shipCellGrid) {
    const placing = this.placeAt(r, c)
    return placing.canPlace(shipCellGrid)
  }
}
