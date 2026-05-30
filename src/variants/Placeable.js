import { CellsToBePlaced } from './CellsToBePlaced.js'
import { placingTarget } from './placingTarget.js'
import { Mask } from '../grid/rectangle/mask.js'

/**
 * Type definitions extracted to dedicated type files for clarity and maintainability:
 * - {@link ZoneInfo} from types/placement.types.ts
 * - {@link PlacementTarget} from types/placement.types.ts
 * - {@link PlacementValidator} from types/callbacks.types.ts
 * @typedef {import('./types/placement.types.ts').ZoneInfo} ZoneInfo
 * @typedef {import('./types/placement.types.ts').PlacementTarget} PlacementTarget
 * @typedef {import('./types/callbacks.types.ts').PlacementValidator} PlacementValidator
 */

/**
 * Represents a placeable board with validation and placement logic.
 * Encapsulates a geometric shape (stored as a Mask) along with placement validation rules and constraints.
 * Provides methods for creating placements at specific world coordinates, validating placement feasibility,
 * and checking bounds compliance. Manages zone-based validation through configurable validators.
 * All coordinate operations are world-relative when used with CellsToBePlaced instances.
 * Acts as a factory for creating validated placements with consistent constraint application.
 *
 * @class Placeable
 * @example
 * const placeable = new Placeable(board, validator, zoneDetail, target);
 * const placement = placeable.placeAt(10, 5);
 * if (placeable.canPlace(10, 5, shipCellGrid)) {
 *   shipCellGrid.place(placement);
 * }
 */
export class Placeable {
  /**
   * The board mask representing the shape/structure to be placed.
   * Stores the geometric footprint of this placeable shape as a bitmask of occupied cells.
   * Coordinates are in local space relative to the placeable's origin.
   * Remains immutable during operations; replace using cells setter to update shape.
   * Used as the template for all placements created via placeAt().
   *
   * @type {Mask}
   * @readonly
   */
  board

  /**
   * Validation function for zone constraints during placement.
   * Determines whether cells can be placed in specific zones by evaluating zone information.
   * Receives ZoneInfo and returns true if zone is valid for placement, false if placement is rejected.
   * Defaults to always-true validator if not provided during construction (accepts all zones).
   * Called for each zone during canPlace validation to ensure zone constraints are satisfied.
   *
   * @type {PlacementValidator}
   */
  validator

  /**
   * Zone detail level for zone validation queries.
   * Controls granularity of zone checking during validation:
   * - 0: No zone detail (no zone validation)
   * - 1: Subterrain level (terrain type based)
   * - 2: Zone level (specific zone identifier based)
   * Passed to PlacementTarget.getZone() during validation to retrieve appropriate zone information.
   * Higher detail levels enable more granular placement constraints.
   *
   * @type {number}
   */
  zoneDetail

  /**
   * Placement target configuration with bounds and zone checkers.
   * Provides methods for validating bounds (allBoundsChecker) and retrieving zone information (getZone).
   * Encapsulates board boundary definitions and grid metadata for placement validation.
   * Used during placement constraint validation in canPlace() and inAllBounds() methods.
   * Shared across multiple placeable instances to maintain consistent validation rules.
   *
   * @type {PlacementTarget}
   */
  target

  /**
   * Creates a placeable instance with optional zone validation and target configuration.
   * Initializes the placeable geometric shape and validation constraints for placement checks.
   * All coordinates in placements created by this placeable will be world-relative (embedded at specified position).
   * Stores the board mask and optional validator/target for use during placement validation.
   * Enables reusable placement templates with consistent constraint application.
   *
   * @constructor
   * @param {Mask} board - The board mask representing the placeable shape with local coordinates (required)
   * @param {PlacementValidator} [validator] - Optional validation function for zone constraints
   *   Receives ZoneInfo and returns true if valid, false to reject placement
   *   If not provided, defaults to always-true validator (accepts all zones)
   * @param {number} [zoneDetail=0] - Optional zone detail level for granular zone validation
   *   0 = no zone detail (no zone validation)
   *   1 = subterrain level (terrain type based constraints)
   *   2 = zone level (specific zone identifier based constraints)
   * @param {PlacementTarget} [target] - Optional placement target with bounds and zone checkers
   *   Provides allBoundsChecker() and getZone() methods for validation
   *   If not provided, defaults to placingTarget singleton from placingTarget.js
   */
  constructor (board, validator, zoneDetail, target) {
    this.board = board // board.clone.shrinkToOccupied()
    this.validator = typeof validator === 'function' ? validator : () => true
    this.zoneDetail = zoneDetail ?? 0
    this.target = target || placingTarget
  }

  /**
   * Gets the cell coordinates of the board in local space.
   * Returns the shape's footprint as array of [row, column] coordinate pairs in local coordinate system.
   * Local coordinates are relative to the placeable's origin (typically [0, 0]).
   * Used to inspect the placeable's geometric structure and create copies.
   * This getter is read-only; use cells setter to replace shape entirely.
   *
   * @readonly
   * @returns {Array<Array<number>>} Array of [row, column] coordinate pairs for occupied cells in local space
   */
  get cells () {
    return this.board.toCoords
  }

  /**
   * Sets the cells by creating a new board from coordinates.
   * Replaces the board mask with a new Mask created from the provided coordinate array.
   * The new board shape will be used for all subsequent placement operations via placeAt().
   * Coordinates should be in local space relative to the placeable's origin.
   * Use this setter to update the shape after construction or to rotate/transform the placeable.
   *
   * @param {Array<Array<number>>} cells - Array of [row, column] coordinate pairs in local space
   * @returns {void}
   */
  set cells (cells) {
    this.board = Mask.fromCoords(cells)
  }

  /**
   * Gets the height of the board in grid units.
   * Returns the maximum row extent of the shape in local coordinate space.
   * Used for bounds checking and placement validation to ensure the shape fits within the grid.
   *
   * @returns {number} The board height in grid cells (maximum row index + 1)
   */
  height () {
    return this.board.height
  }

  /**
   * Gets the width of the board in grid units.
   * Returns the maximum column extent of the shape in local coordinate space.
   * Used for bounds checking and placement validation to ensure the shape fits within the grid.
   *
   * @returns {number} The board width in grid cells (maximum column index + 1)
   */
  width () {
    return this.board.width
  }

  /**
   * Creates a placement at the specified world position.
   * Generates a CellsToBePlaced instance with the board embedded at the given world coordinates.
   * Maintains all validation constraints (validator, zoneDetail, target) from this placeable.
   * The returned placement contains the same cells as this board, but transformed to world-relative coordinates.
   * Factory method that produces validated placements ready for canPlace() checks and grid placement.
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
   * Checks if the placeable fits within all applicable bounds at the given position.
   * Uses the placement target's allBoundsChecker to validate that all cells fit within allowed area.
   * Accounts for board dimensions (height/width) and position to ensure full placement stays in bounds.
   * Includes comprehensive error handling with logging for debugging placement constraint issues.
   * Returns false if any error occurs during bounds checking (graceful failure for safety).
   * This is the first validation step before zone and overlap checking.
   *
   * @param {number} r - The row coordinate to check in world space
   * @param {number} c - The column coordinate to check in world space
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
   * and conflict detection against existing ship cells on the grid.
   * Creates a temporary placement via placeAt() and delegates validation to CellsToBePlaced.canPlace().
   * Validates the full placement sequence in order: bounds → zone → overlaps → touches.
   * Use this method to check feasibility before actually placing ships on the board.
   *
   * @param {number} x - The x (column) coordinate for placement in world space
   * @param {number} y - The y (row) coordinate for placement in world space
   * @param {any} shipCellGrid - The grid containing existing ship cells to check against for conflicts
   * @returns {boolean} True if all placement constraints are satisfied, false if any constraint is violated
   */
  canPlace (x, y, shipCellGrid) {
    const placing = this.placeAt(x, y)
    return placing.canPlace(shipCellGrid)
  }
}
