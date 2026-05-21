import { placingTarget } from './makeCell3.js'

/**
 * @typedef {Object} ZoneInfo
 * Information about a zone at a specific position.
 *
 * @typedef {Object} PlacementTarget
 * @property {(r: number, c: number) => boolean} boundsChecker - Checks if a position is within bounds.
 * @property {(r: number, c: number, h?: number, w?: number) => boolean} [allBoundsChecker] - Checks if an area is within bounds.
 * @property {(r: number, c: number, zoneDetail?: number) => ZoneInfo} getZone - Gets zone information for a position.
 *
 * @typedef {Object} Board
 * A board object with grid manipulation methods.
 *
 * @typedef {Object} ShipCellGrid
 * A grid representing ship cells.
 */

/**
 * Represents cells to be placed on the grid with validation.
 * This class manages placement constraints including bounds checking,
 * zone validation, non-overlapping, and no-touch constraints.
 */
export class CellsToBePlaced {
  /**
   * The embedded board representing cells to be placed.
   * @type {Board}
   */
  board

  /**
   * Mask of empty cells.
   * @type {any}
   */
  notGood

  /**
   * Validation function for zone constraints.
   * @type {(zoneInfo: ZoneInfo) => boolean}
   */
  validator

  /**
   * Zone detail level for zone validation.
   * @type {number}
   */
  zoneDetail

  /**
   * Target placement area with bounds and zone information.
   * @type {PlacementTarget}
   */
  target

  /**
   * Creates cells to be placed.
   * @param {Board} board - The board to embed cells into.
   * @param {number} x - The x position for embedding.
   * @param {number} y - The y position for embedding.
   * @param {(zoneInfo: ZoneInfo) => boolean} [validator] - Optional validation function for zones.
   * @param {number} [zoneDetail=0] - Optional zone detail level.
   * @param {PlacementTarget} [target] - Optional placement target (defaults to placingTarget).
   */
  constructor (board, x, y, validator, zoneDetail, target) {
    board = board.embed(x, y)
    this.board = board
    this.notGood = board.emptyMask
    this.validator = typeof validator === 'function' ? validator : () => true
    this.zoneDetail = zoneDetail || 0
    this.target = target || placingTarget
  }

  /**
   * Gets the cell coordinates that have been placed.
   * @returns {Array<Array<number>>} Array of [column, row] coordinate pairs.
   */
  get cells () {
    return this.board.toCoords
  }

  /**
   * Gets the mask of the displaced area (dilated and expanded).
   * @param {number} width - The grid width.
   * @param {number} height - The grid height.
   * @returns {any} Mask representing the displaced area.
   */
  displacedArea (width, height) {
    return this.board.flatDilateExpand(1, 0).toMask(width, height)
  }

  /**
   * Checks if a position contains a candidate cell.
   * @param {number} r - The row coordinate.
   * @param {number} c - The column coordinate.
   * @returns {boolean} True if the position has a candidate cell.
   */
  isCandidate (r, c) {
    return this.board.at(r, c) > 0
  }

  /**
   * Gets zone information for a position.
   * @param {number} r - The row coordinate.
   * @param {number} c - The column coordinate.
   * @param {number} [zoneDetail] - Optional zone detail level (defaults to this.zoneDetail).
   * @returns {ZoneInfo} Zone information for the position.
   */
  zoneInfo (r, c, zoneDetail) {
    return this.target.getZone(r, c, zoneDetail ?? this.zoneDetail)
  }

  /**
   * Checks if a position is in a matching zone according to the validator.
   * @param {number} r - The row coordinate.
   * @param {number} c - The column coordinate.
   * @returns {boolean} True if the position is in a matching zone.
   */
  isInMatchingZone (r, c) {
    const zoneInfo = this.zoneInfo(r, c)
    return this.validator(zoneInfo)
  }

  /**
   * Checks if cells in a position don't touch other ship cells (3x3 no-touch rule).
   * @param {number} x - The x coordinate.
   * @param {number} y - The y coordinate.
   * @param {ShipCellGrid} shipCellGrid - The grid containing existing ship cells.
   * @returns {boolean} True if there is no touching with other cells.
   */
  noTouch (x, y, shipCellGrid) {
    return shipCellGrid.noTouch(
      x,
      y,
      this.target.boundsChecker.bind(this.target)
    )
  }

  /**
   * Checks if any cell is placed in an invalid zone.
   * @returns {boolean} True if any cell is in a zone that fails validation.
   */
  isWrongZone () {
    for (const [c, r] of this.board.occupiedLocations()) {
      if (this.isInMatchingZone(r, c) === false) {
        return true
      }
    }
    return false
  }

  /**
   * Checks if any cell is positioned outside the valid bounds.
   * @returns {boolean} True if any cell is out of bounds.
   */
  isNotInBounds () {
    for (const [c, r] of this.board.occupiedLocations()) {
      if (!this.target.boundsChecker(r, c)) {
        return true
      }
    }
    return false
  }

  /**
   * Checks if any cell overlaps with existing ship cells.
   * @param {ShipCellGrid} shipCellGrid - The grid containing existing ship cells.
   * @returns {boolean} True if there is any overlapping with existing cells.
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
   * @param {ShipCellGrid} shipCellGrid - The grid containing existing ship cells.
   * @returns {boolean} True if any cells are touching other ship cells.
   */
  isTouching (shipCellGrid) {
    for (const [x, y] of this.board.occupiedLocations()) {
      if (this.noTouch(x, y, shipCellGrid) === false) {
        return true
      }
    }
    return false
  }

  /**
   * Validates whether cells can be placed at the current position.
   * Performs comprehensive validation including bounds checking, zone validation,
   * overlap detection, and no-touch constraint verification.
   * @param {ShipCellGrid} shipCellGrid - The grid containing existing ship cells.
   * @returns {boolean} True if all placement constraints are satisfied.
   */
  canPlace (shipCellGrid) {
    if (this.isNotInBounds()) {
      // console.log('out of bounds')
      return false
    }
    if (this.isWrongZone()) {
      //  console.log('wrong Zone')
      return false
    }

    if (this.isOverlapping(shipCellGrid)) {
      //  console.log('overlapping')
      return false
    }
    if (this.isTouching(shipCellGrid)) {
      //  console.log('touching')
      return false
    }
    // console.log('good')
    return true
  }
}
