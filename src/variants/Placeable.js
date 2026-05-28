import { CellsToBePlaced } from './CellsToBePlaced.js'
import { placingTarget } from './placingTarget.js'
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
 * All coordinate operations are world-relative when used with CellsToBePlaced instances.
 *
 * @class Placeable
 */
export class Placeable {
  /**
   * The board mask representing the shape/structure to be placed.
   * Stores the geometric footprint of this placeable shape.
   * Remains immutable; use cells setter to update shape.
   *
   * @type {Mask}
   */
  board

  /**
   * Validation function for zone constraints.
   * Determines whether cells can be placed in specific zones.
   * Receives ZoneInfo and returns true if valid, false otherwise.
   * Defaults to always-true validator if not provided.
   *
   * @type {PlacementValidator}
   */
  validator

  /**
   * Zone detail level for zone validation queries.
   * Controls granularity of zone checking: 0=no detail, 1=subterrain, 2=zone.
   * Passed to PlacementTarget.getZone() during validation.
   *
   * @type {number}
   */
  zoneDetail

  /**
   * Placement target configuration with bounds and zone checkers.
   * Provides methods for validating bounds and retrieving zone information.
   * Used during placement constraint validation.
   *
   * @type {PlacementTarget}
   */
  target

  /**
   * Creates a placeable instance with optional zone validation and target configuration.
   * Initializes the placeable shape and validation constraints for placement checks.
   * All coordinates in placements created by this placeable will be world-relative.
   *
   * @constructor
   * @param {Mask} board - The board mask representing the placeable shape (required)
   * @param {PlacementValidator} [validator] - Optional validation function for zones
   *   If not provided, defaults to always-true validator (accepts all zones)
   * @param {number} [zoneDetail=0] - Optional zone detail level for granular validation
   *   0=no zone detail, 1=subterrain level, 2=zone level
   * @param {PlacementTarget} [target] - Optional placement target with bounds and zone info
   *   If not provided, defaults to placingTarget from placingTarget.js
   */
  constructor (board, validator, zoneDetail, target) {
    this.board = board // board.clone.shrinkToOccupied()
    this.validator = typeof validator === 'function' ? validator : () => true
    this.zoneDetail = zoneDetail ?? 0
    this.target = target || placingTarget
  }

  /**
   * Gets the cell coordinates of the board.
   * Returns the shape's footprint as local coordinate pairs.
   * Used to inspect the placeable's geometric structure.
   * This getter is read-only; use cells setter to replace shape.
   *
   * @readonly
   * @returns {Array<Array<number>>} Array of [row, column] coordinate pairs for occupied cells in local space
   */
  get cells () {
    return this.board.toCoords
  }

  /**
   * Sets the cells by creating a new board from coordinates.
   * Replaces the board with a new Mask created from the provided coordinates.
   * The new board shape will be used for all subsequent placement operations.
   *
   * @param {Array<Array<number>>} cells - Array of [row, column] coordinate pairs in local space
   */
  set cells (cells) {
    this.board = Mask.fromCoords(cells)
  }

  /**
   * Gets the height of the board in grid units.
   * Returns the maximum row extent of the shape in local space.
   *
   * @returns {number} The board height in grid cells
   */
  height () {
    return this.board.height
  }

  /**
   * Gets the width of the board in grid units.
   * Returns the maximum column extent of the shape in local space.
   *
   * @returns {number} The board width in grid cells
   */
  width () {
    return this.board.width
  }

  /**
   * Creates a placement at the specified position.
   * Generates a CellsToBePlaced instance with the board embedded at the given coordinates,
   * maintaining all validation constraints from this placeable.
   * The returned placement will have world-relative coordinates after embedding.
   *
   * @param {number} x - The x (column) position for placement in world space
   * @param {number} y - The y (row) position for placement in world space
   * @returns {CellsToBePlaced} Placement instance with cells positioned at (x, y) with world-relative coordinates
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
   * Includes comprehensive error handling and logging for debugging placement issues.
   * Returns false if any error occurs during bounds checking.
   *
   * @param {number} r - The row coordinate to check (world space)
   * @param {number} c - The column coordinate to check (world space)
   * @returns {boolean} True if the placeable is within all bounds, false if out of bounds or error occurs
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
   * and delegates to its canPlace method for constraint validation.
   * Validates the full placement sequence: bounds → zone → overlaps → touches.
   *
   * @param {number} x - The x (column) coordinate for placement (world space)
   * @param {number} y - The y (row) coordinate for placement (world space)
   * @param {any} shipCellGrid - The grid containing existing ship cells to check against
   * @returns {boolean} True if all placement constraints are satisfied, false if any constraint is violated
   */
  canPlace (x, y, shipCellGrid) {
    const placing = this.placeAt(x, y)
    return placing.canPlace(shipCellGrid)
  }
}
