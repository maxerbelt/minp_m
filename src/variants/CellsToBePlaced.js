import { placingTarget } from './makeCell3.js'

/** @typedef {import('../grid/subBoard.js').SubBoard} SubBoard */
/** @typedef {import('../grid/rectangle/ShipCellGrid.js').ShipCellGrid} ShipCellGridType */
/** @typedef {import('./makeCell3.js').ZoneInfo} ZoneInfo */
/** @typedef {import('./makeCell3.js').PlacementTarget} PlacementTarget */

/**
 * Board object with grid manipulation methods (typically a SubBoard instance).
 * @typedef {Object} Board
 * @property {(x: number, y: number) => Board} embed - Creates embedded board at offset
 * @property {Board} emptyMask - Empty board at same position and size
 * @property {(x: number, y: number, depth?: number) => number|null} at - Gets value at coordinates
 * @property {() => Generator<[number, number]>} occupiedLocations - Generator of occupied cell positions
 * @property {() => Generator<[number, number, *]>} occupiedLocationsAndValues - Generator of occupied cells with values
 * @property {Array<[number, number, number]>} toCoords - Array of coordinate tuples
 * @property {(width: number, height: number) => Board} toMask - Creates new mask at specified dimensions
 * @property {(mask: Board) => void} copyToMask - Copies occupied cells to another mask
 * @property {() => Board} flatDilate - Returns dilated version
 * @property {number} width - Grid width
 * @property {number} height - Grid height
 * @property {number} occupancy - Count or percentage of occupied cells
 */

/**
 * Ship cell grid for tracking placed ship cells and validating constraints.
 * @typedef {Object} ShipCellGrid
 * @property {(x: number, y: number) => boolean} has - Checks if ship cell exists at position
 * @property {(x: number, y: number, boundsChecker: (r: number, c: number) => boolean) => boolean} isAreaClearAroundXY - Validates 3×3 neighborhood is clear
 * @property {number} width - Grid width
 * @property {number} height - Grid height
 */

/**
 * Represents cells to be placed on the grid with comprehensive validation.
 * This class manages placement constraints including bounds checking,
 * zone validation, non-overlapping, and no-touch constraints.
 * All coordinate operations are row-column based (r, c).
 *
 * @class CellsToBePlaced
 */
export class CellsToBePlaced {
  /**
   * The embedded board representing cells to be placed.
   * Maintains world-relative coordinates for all operations.
   * @type {Board}
   */
  board

  /**
   * Mask of empty/invalid cells for placement.
   * Used to track excluded regions.
   * @type {Board}
   */
  notGood

  /**
   * Validation function that checks zone constraints for a position.
   * Returns true if zone is valid for placement, false otherwise.
   * @type {(zoneInfo: ZoneInfo) => boolean}
   */
  validator

  /**
   * Zone detail level for zone validation queries.
   * Passed to PlacementTarget.getZone() for granular control.
   * @type {number}
   */
  zoneDetail

  /**
   * Target placement area with bounds checking and zone information.
   * Provides boundsChecker, allBoundsChecker, and getZone methods.
   * @type {PlacementTarget}
   */
  target

  /**
   * Creates cells to be placed with optional zone validation.
   * @param {Board} board - The board to embed cells into (must support embed method).
   * @param {number} x - The x position for embedding cells.
   * @param {number} y - The y position for embedding cells.
   * @param {(zoneInfo: ZoneInfo) => boolean} [validator] - Optional validation function for zones.
   *   If not provided, all zones are considered valid.
   * @param {number} [zoneDetail=0] - Optional zone detail level for granular zone validation.
   * @param {PlacementTarget} [target] - Optional placement target
   *   (defaults to placingTarget from makeCell3.js).
   * @throws {Error} If board does not have required methods.
   */
  constructor (board, x, y, validator, zoneDetail, target) {
    this.board = board.embed(x, y)
    this.notGood = this.board.emptyMask
    this.validator = typeof validator === 'function' ? validator : () => true
    this.zoneDetail = zoneDetail || 0
    this.target = target || placingTarget
  }

  /**
   * Gets the cell coordinates that have been placed.
   * Returns coordinates in world space (after embedding transformation).
   * @returns {Array<[number, number, number]>} Array of [x, y, value] coordinate tuples in world space.
   */
  get cells () {
    return this.board.toCoords
  }

  /**
   * Gets the mask of the displaced area (dilated and expanded).
   * This represents cells to place plus a one-cell border (dilation).
   * Useful for determining which areas are affected by the placement.
   * @param {number} width - The target grid width.
   * @param {number} height - The target grid height.
   * @returns {Board} Mask representing the displaced area with dilation applied.
   */
  displacedArea (width, height) {
    return this.board.toMask(width, height).flatDilate()
  }

  /**
   * Checks if a position contains a candidate cell to be placed.
   * A candidate cell is one with a value greater than 0.
   * @param {number} r - The row coordinate.
   * @param {number} c - The column coordinate.
   * @returns {boolean} True if the position has a candidate cell (value > 0).
   */
  isCandidate (r, c) {
    return /** @type {number} */ (this.board.at(r, c)) > 0
  }

  /**
   * Gets zone information for a position using the placement target.
   * Delegates to the placement target's getZone method.
   * @param {number} y - The row coordinate.
   * @param {number} x - The column coordinate.
   * @param {number} [zoneDetail] - Optional zone detail level
   *   (defaults to this.zoneDetail if not provided).
   * @returns {ZoneInfo} Zone information for the position.
   */
  zoneInfo (x, y, zoneDetail) {
    return this.target.getZone(x, y, zoneDetail ?? this.zoneDetail)
  }

  /**
   * Checks if a position is in a matching zone according to the validator.
   * Uses the zone validator function to validate the zone at the given position.
   * @param {number} y - The row coordinate.
   * @param {number} x - The column coordinate.
   * @returns {boolean} True if the position's zone passes validation, false otherwise.
   */
  isInMatchingZone (x, y) {
    const zoneInfo = this.zoneInfo(x, y)
    if (!zoneInfo || zoneInfo.length === 0 || zoneInfo[0] == null) {
      return true
    }
    const result = this.validator(zoneInfo)
    // if (!result) {
    ///  console.log(
    // `Position (${x}, ${y}) failed zone validation with info:`,
    //  zoneInfo
    //   )
    //  }
    return result
  }

  /**
   * Checks if cells don't touch other ship cells (enforces 3×3 no-touch rule).
   * Delegates to shipCellGrid.isAreaClearAroundXY() with bounds validation.
   * Positions are considered "touching" if they are adjacent (including diagonally)
   * to any existing ship cell.
   * @param {number} x - The x coordinate.
   * @param {number} y - The y coordinate.
   * @param {ShipCellGrid} shipCellGrid - The grid containing existing ship cells.
   * @returns {boolean} True if there is no touching with other cells in 3×3 neighborhood, false otherwise.
   */
  isAreaClearAroundXY (x, y, shipCellGrid) {
    return shipCellGrid.isAreaClearAroundXY(
      x,
      y,
      this.target.boundsChecker.bind(this.target)
    )
  }

  /**
   * Checks if any cell is placed in an invalid zone.
   * Iterates through all occupied cells and validates each zone independently.
   * @returns {boolean} True if any cell is in a zone that fails validation, false if all zones valid.
   */
  isWrongZone () {
    for (const [x, y] of this.board.occupiedLocations()) {
      if (!this.isInMatchingZone(x, y)) {
        return true
      }
    }
    return false
  }

  /**
   * Checks if any cell is positioned outside the valid bounds.
   * Iterates through all occupied cells and validates each is within bounds
   * according to the target's boundsChecker.
   * @returns {boolean} True if any cell is out of bounds, false if all cells in bounds.
   */
  isNotInBounds () {
    for (const [x, y] of this.board.occupiedLocations()) {
      if (!this.target.boundsChecker(y, x)) {
        ///    console.log(`Cell at (${x}, ${y}) is out of bounds.`)
        return true
      }
    }

    return false
  }

  /**
   * Checks if any cell overlaps with existing ship cells.
   * Overlapping occurs when a candidate cell position already contains a ship cell.
   * @param {ShipCellGrid} shipCellGrid - The grid containing existing ship cells.
   * @returns {boolean} True if any cell overlaps with existing cells, false if no overlaps.
   */
  isOverlapping (shipCellGrid) {
    for (const [x, y] of this.board.occupiedLocations()) {
      if (shipCellGrid.has(x, y)) {
        ///  console.log(
        ///    `Cell at (${x}, ${y}) is overlapping with an existing ship.`
        ///  )
        return true
      }
    }
    return false
  }

  /**
   * Checks if any cell is touching existing ship cells (violates no-touch rule).
   * Iterates through all occupied cells and checks 3×3 neighborhood for conflicts
   * with existing ship cells. A cell is considered "touching" if any adjacent position
   * (including diagonals) contains an existing ship cell.
   * @param {ShipCellGrid} shipCellGrid - The grid containing existing ship cells.
   * @returns {boolean} True if any cells are touching other ship cells, false if no touches.
   */
  isTouching (shipCellGrid) {
    for (const [x, y] of this.board.occupiedLocations()) {
      if (!this.isAreaClearAroundXY(x, y, shipCellGrid)) {
        return true
      }
    }
    return false
  }

  /**
   * Validates whether cells can be placed at the current position.
   * Performs comprehensive validation including bounds checking, zone validation,
   * overlap detection, and no-touch constraint verification.
   * Checks are performed in order: bounds → zone → overlaps → touches.
   * This order is optimized to fail fast on the most common violations.
   * @param {ShipCellGrid} shipCellGrid - The grid containing existing ship cells.
   * @returns {boolean} True if all placement constraints are satisfied, false otherwise.
   */
  canPlace (shipCellGrid) {
    return (
      !this.isNotInBounds() &&
      !this.isWrongZone() &&
      !this.isOverlapping(shipCellGrid) &&
      !this.isTouching(shipCellGrid)
    )
  }

  /**
   * Determines the reason why cells cannot be placed at the current position.
   * Returns a descriptive string indicating the first constraint violation encountered.
   * Checks are performed in order: bounds → zone → overlaps → touches.
   * This helps diagnose placement failures for debugging and UI feedback.
   * @param {ShipCellGrid} shipCellGrid - The grid containing existing ship cells.
   * @returns {'out of bounds'|'wrong Zone'|'overlapping'|'touching'|'good'}
   *   Reason for placement failure, or 'good' if placement is valid.
   */
  cantPlaceReason (shipCellGrid) {
    if (this.isNotInBounds()) {
      return 'out of bounds'
    }
    if (this.isWrongZone()) {
      return 'wrong Zone'
    }
    if (this.isOverlapping(shipCellGrid)) {
      return 'overlapping'
    }
    if (this.isTouching(shipCellGrid)) {
      return 'touching'
    }
    return 'good'
  }
}
