import { placingTarget } from './makeCell3.js'

/**
 * Represents cells to be placed on the grid with validation.
 */
export class CellsToBePlaced {
  /**
   * Creates cells to be placed.
   * @param {any} board - The board.
   * @param {number} r0 - The row offset.
   * @param {number} c0 - The column offset.
   * @param {Function} validator - The validation function.
   * @param {any} zoneDetail - The zone details.
   * @param {any} target - The placement target.
   */
  constructor (board, r0, c0, validator, zoneDetail, target) {
    board = board.embed(r0, c0)
    this.board = board
    this.notGood = board.emptyMask
    this.validator = validator
    this.zoneDetail = zoneDetail || 0
    this.target = target || placingTarget
  }

  /**
   * Gets the cell coordinates.
   * @returns {Array<Array<number>>} The cells.
   */
  get cells () {
    return this.board.toCoords
  }

  /**
   * Gets the displaced area mask.
   * @param {number} width - The width.
   * @param {number} height - The height.
   * @returns {any} The mask.
   */
  displacedArea (width, height) {
    return this.board.flatDilateExpand(1, 0).toMask(width, height)
  }

  /**
   * Checks if a position is a candidate.
   * @param {number} r - The row.
   * @param {number} c - The column.
   * @returns {boolean} True if candidate.
   */
  isCandidate (r, c) {
    return this.board.at(r, c) > 0
  }

  /**
   * Gets zone info for a position.
   * @param {number} r - The row.
   * @param {number} c - The column.
   * @param {any} zoneDetail - The zone detail.
   * @returns {any} The zone info.
   */
  zoneInfo (r, c, zoneDetail) {
    return this.target.getZone(r, c, zoneDetail || this.zoneDetail)
  }

  /**
   * Checks if a position is in matching zone.
   * @param {number} r - The row.
   * @param {number} c - The column.
   * @returns {boolean} True if in matching zone.
   */
  isInMatchingZone (r, c) {
    const zoneInfo = this.zoneInfo(r, c)
    return this.validator(zoneInfo)
  }

  /**
   * Checks if no touching in 3x3 area.
   * @param {number} r - The row.
   * @param {number} c - The column.
   * @param {any} shipCellGrid - The ship cell grid.
   * @returns {boolean} True if no touch.
   */
  noTouch (x, y, shipCellGrid) {
    return shipCellGrid.noTouch(
      x,
      y,
      this.target.boundsChecker.bind(this.target)
    )
  }

  /**
   * Checks if any cell is in wrong zone.
   * @returns {boolean} True if wrong zone.
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
   * Checks if any cell is not in bounds.
   * @returns {boolean} True if not in bounds.
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
   * Checks if overlapping with ship cells.
   * @param {any} shipCellGrid - The ship cell grid.
   * @returns {boolean} True if overlapping.
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
   * Checks if touching ship cells.
   * @param {any} shipCellGrid - The ship cell grid.
   * @returns {boolean} True if touching.
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
   * Checks if can place the cells.
   * @param {any} shipCellGrid - The ship cell grid.
   * @returns {boolean} True if can place.
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
