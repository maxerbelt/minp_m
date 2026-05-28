import { placingTarget } from './placingTarget.js'

/** @typedef {import('../grid/subBoard.js').SubBoard} SubBoard */
/** @typedef {import('../grid/rectangle/ShipCellGrid.js').ShipCellGrid} ShipCellGridType */
/** @typedef {import('./placingTarget.js').ZoneInfo} ZoneInfo */
/** @typedef {import('./placingTarget.js').PlacementTarget} PlacementTarget */

/**
 * Board object with grid manipulation methods (typically a SubBoard instance).
 * Provides methods for embedding, querying, and transforming grid data.
 * All coordinate operations support world-relative positioning.
 *
 * @typedef {Object} Board
 * @property {(x: number, y: number) => Board} embed - Creates embedded board at offset (x, y)
 * @property {Board} emptyMask - Empty board at same position and size
 * @property {(x: number, y: number, depth?: number) => number|null} at - Gets value at coordinates (optional depth for multi-layer)
 * @property {() => Generator<[number, number]>} occupiedLocations - Generator yielding [x, y] of occupied cells
 * @property {() => Generator<[number, number, *]>} occupiedLocationsAndValues - Generator yielding [x, y, value] of occupied cells
 * @property {Array<[number, number, number]>} toCoords - Array of [x, y, value] coordinate tuples
 * @property {(width: number, height: number) => Board} toMask - Creates new mask at specified dimensions
 * @property {(mask: Board) => void} copyToMask - Copies occupied cells to another mask
 * @property {() => Board} flatDilate - Returns dilated version (expanded by 1 cell in all directions)
 * @property {number} width - Grid width in cells
 * @property {number} height - Grid height in cells
 * @property {number} occupancy - Count or percentage of occupied cells
 */

/**
 * Ship cell grid for tracking placed ship cells and validating placement constraints.
 * Provides methods for checking ship cell positions and validating no-touch constraints.
 *
 * @typedef {Object} ShipCellGrid
 * @property {(x: number, y: number) => boolean} has - Checks if ship cell exists at position (x, y)
 * @property {(x: number, y: number, boundsChecker: (r: number, c: number) => boolean) => boolean} isAreaClearAroundXY - Validates 3×3 neighborhood is clear of ship cells with bounds checking
 * @property {number} width - Grid width in cells
 * @property {number} height - Grid height in cells
 */

/**
 * Represents cells to be placed on the grid with comprehensive validation.
 * This class manages placement constraints including bounds checking,
 * zone validation, non-overlapping, and no-touch constraints.
 * All coordinate operations are world-relative after embedding transformation.
 * Validation is performed in order: bounds → zone → overlaps → touches (optimized for fail-fast).
 *
 * @class CellsToBePlaced
 */
export class CellsToBePlaced {
  /**
   * The embedded board representing cells to be placed.
   * Contains world-relative coordinates after embedding transformation.
   * Maintains all placed cell positions and values.
   * @type {Board}
   */
  board

  /**
   * Mask of empty/invalid cells for placement.
   * Initialized as empty mask; used to track excluded/invalid regions.
   * Can be updated during validation to mark non-good placement areas.
   * @type {Board}
   */
  notGood

  /**
   * Validation function that checks zone constraints for a position.
   * Called with zone information tuple [subterrain, zone].
   * Returns true if zone is valid for placement, false otherwise.
   * Defaults to always-true validator if not provided.
   * @type {(zoneInfo: ZoneInfo) => boolean}
   */
  validator

  /**
   * Zone detail level for zone validation queries.
   * Passed to PlacementTarget.getZone() to control granularity of zone queries.
   * Values: 0 (no zone detail), 1 (subterrain level), 2 (zone level).
   * @type {number}
   */
  zoneDetail

  /**
   * Target placement area with bounds checking and zone information.
   * Provides boundsChecker (validates coordinate bounds) and getZone methods.
   * Used for constraint validation during placement checks.
   * @type {PlacementTarget}
   */
  target

  /**
   * Creates cells to be placed with optional zone validation and target configuration.
   * Embeds the board at the specified (x, y) position for world-relative operations.
   * Initializes validation function and zone detail level for constraint checking.
   *
   * @param {Board} board - The board to embed cells into (must support embed() method)
   * @param {number} x - The x-coordinate position for embedding cells
   * @param {number} y - The y-coordinate position for embedding cells
   * @param {(zoneInfo: ZoneInfo) => boolean} [validator] - Optional validation function for zones
   *   If not provided, defaults to always-true validator (accepts all zones)
   * @param {number} [zoneDetail=0] - Optional zone detail level for granular validation
   *   0=no zone detail, 1=subterrain level, 2=zone level
   * @param {PlacementTarget} [target] - Optional placement target with bounds and zone info
   *   If not provided, defaults to placingTarget from makeCell3.js
   * @throws {Error} If board does not have required embed() method or is invalid
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
   * Each entry is [x, y, value] where value represents cell occupancy.
   * Used to iterate over all placed cells for validation checks.
   *
   * @returns {Array<[number, number, number]>} Array of [x, y, value] coordinate tuples in world space
   */
  get cells () {
    return this.board.toCoords
  }

  /**
   * Gets the mask of the displaced area (dilated and expanded by 1 cell).
   * Represents the combined footprint of placed cells plus a one-cell border (dilation).
   * Useful for determining which areas are affected by or adjacent to the placement.
   * The dilation accounts for no-touch constraints around placed cells.
   *
   * @param {number} width - The target grid width in cells
   * @param {number} height - The target grid height in cells
   * @returns {Board} Mask representing the displaced area with dilation applied
   */
  displacedArea (width, height) {
    return this.board.toMask(width, height).flatDilate()
  }

  /**
   * Checks if a position contains a candidate cell to be placed.
   * A candidate cell is one with a value greater than 0.
   * Used to identify occupied positions within the placement area.
   *
   * @param {number} r - The row coordinate (y-axis)
   * @param {number} c - The column coordinate (x-axis)
   * @returns {boolean} True if the position has a candidate cell (value > 0), false otherwise
   */
  isCandidate (r, c) {
    return /** @type {number} */ (this.board.at(r, c)) > 0
  }

  /**
   * Gets zone information for a position using the placement target.
   * Delegates to the placement target's getZone method with specified detail level.
   * Zone structure depends on map configuration and detail level.
   * Note: Parameters are swapped when passed to getZone (y, x order expected by target).
   *
   * @param {number} x - The x-coordinate (column)
   * @param {number} y - The y-coordinate (row)
   * @param {number} [zoneDetail] - Optional zone detail level override
   *   If not provided, uses this.zoneDetail (0=no detail, 1=subterrain, 2=zone)
   * @returns {ZoneInfo} Zone information object for the position
   */
  zoneInfo (x, y, zoneDetail) {
    //  don't swap x and y here, target.getZone expects (x, y) format which is (column, row)
    return this.target.getZone(x, y, zoneDetail ?? this.zoneDetail)
  }

  /**
   * Checks if a position is in a matching zone according to the validator.
   * Uses the zone validator function to validate the zone at the given position.
   * Handles null zone info gracefully by returning true (assumes valid if no zone info).
   *
   * @param {number} x - The x-coordinate (column)
   * @param {number} y - The y-coordinate (row)
   * @returns {boolean} True if the position's zone passes validation or no zone info available,
   *   false if zone validation explicitly fails
   */
  isInMatchingZone (x, y) {
    const zoneInfo = this.zoneInfo(x, y)
    if (!zoneInfo) {
      return true
    }
    const result = this.validator(zoneInfo)
    return result
  }

  /**
   * Checks if cells don't touch other ship cells (enforces 3×3 no-touch rule).
   * Delegates to shipCellGrid.isAreaClearAroundXY() with bounds validation.
   * Positions are considered "touching" if they are adjacent (including diagonally)
   * to any existing ship cell. The 3×3 neighborhood around the position is checked.
   *
   * @param {number} x - The x-coordinate (column)
   * @param {number} y - The y-coordinate (row)
   * @param {ShipCellGrid} shipCellGrid - The grid containing existing ship cells to check against
   * @returns {boolean} True if there is no touching with other cells in 3×3 neighborhood, false otherwise
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
   * Returns true on first zone validation failure for fail-fast behavior.
   * If no validator is set, always returns false (all zones considered valid).
   *
   * @returns {boolean} True if any cell is in a zone that fails validation,
   *   false if all zones valid or no validator configured
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
   * according to the target's boundsChecker. Returns true on first out-of-bounds cell.
   * Note: boundsChecker expects (row, column) parameter order.
   *
   * @returns {boolean} True if any cell is out of bounds, false if all cells are in bounds
   */
  isNotInBounds () {
    for (const [x, y] of this.board.occupiedLocations()) {
      if (!this.target.boundsChecker(y, x)) {
        // Note: boundsChecker expects (row, col) format
        return true
      }
    }
    return false
  }

  /**
   * Checks if any cell overlaps with existing ship cells.
   * Overlapping occurs when a candidate cell position already contains a ship cell.
   * Returns true on first overlapping cell detected for fail-fast behavior.
   * Uses ShipCellGrid.has() to check for existing cells at each position.
   *
   * @param {ShipCellGrid} shipCellGrid - The grid containing existing ship cells to check against
   * @returns {boolean} True if any cell overlaps with existing cells, false if no overlaps
   */
  isOverlapping (shipCellGrid) {
    for (const [x, y] of this.board.occupiedLocations()) {
      if (shipCellGrid.has(x, y)) {
        return true
      }
    }
    return false
  }

  /**
   * Checks if any cell is touching existing ship cells (violates no-touch rule).
   * Iterates through all occupied cells and checks 3×3 neighborhood for conflicts
   * with existing ship cells. A cell is considered "touching" if any adjacent position
   * (including diagonals) contains an existing ship cell. Returns true on first touch.
   * Delegates to isAreaClearAroundXY() for neighborhood validation.
   *
   * @param {ShipCellGrid} shipCellGrid - The grid containing existing ship cells to check against
   * @returns {boolean} True if any cells are touching other ship cells, false if no touches detected
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
   * All constraints must pass for placement to be valid.
   *
   * Validation sequence:
   * 1. isNotInBounds() - Checks if any cell is outside grid boundaries
   * 2. isWrongZone() - Validates zone constraints for all cells
   * 3. isOverlapping() - Checks for overlap with existing ship cells
   * 4. isTouching() - Enforces 3×3 no-touch constraint
   *
   * @param {ShipCellGrid} shipCellGrid - The grid containing existing ship cells
   * @returns {boolean} True if all placement constraints are satisfied, false on any violation
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
   * The returned reason corresponds to which constraint was first violated.
   *
   * Validation order (same as canPlace()):
   * 1. out of bounds - Cell is outside valid grid area
   * 2. wrong Zone - Cell fails zone validation constraints
   * 3. overlapping - Cell overlaps with existing ship cells
   * 4. touching - Cell violates 3×3 no-touch rule
   * 5. good - All constraints pass
   *
   * @param {ShipCellGrid} shipCellGrid - The grid containing existing ship cells
   * @returns {'out of bounds'|'wrong Zone'|'overlapping'|'touching'|'good'}
   *   Reason for placement failure, or 'good' if placement is valid
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
