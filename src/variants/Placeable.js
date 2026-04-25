import { CellsToBePlaced } from './CellsToBePlaced.js'
import { placingTarget } from './makeCell3.js'
import { Mask } from '../grid/rectangle/mask.js'

/**
 * Represents a placeable board with validation and placement logic.
 */
export class Placeable {
  /**
   * Creates a placeable instance.
   * @param {Mask} board - The board mask.
   * @param {Function} validator - The validation function.
   * @param {any} zoneDetail - The zone details.
   * @param {any} target - The placement target.
   */
  constructor (board, validator, zoneDetail, target) {
    this.board = board // board.clone.shrinkToOccupied()
    this.validator = validator
    this.zoneDetail = zoneDetail || 0
    this.target = target || placingTarget
  }

  /**
   * Gets the cells coordinates.
   * @returns {any[]} The cell coordinates.
   */
  get cells () {
    return this.board.toCoords
  }

  /**
   * Sets the cells coordinates.
   * @param {any[]} cells - The cell coordinates.
   */
  set cells (cells) {
    this.board = Mask.fromCoords(cells)
  }

  /**
   * Gets the height of the board.
   * @returns {number} The height.
   */
  height () {
    return this.board.height
  }

  /**
   * Gets the width of the board.
   * @returns {number} The width.
   */
  width () {
    return this.board.width
  }

  /**
   * Creates a placement at the specified position.
   * @param {number} row - The row position.
   * @param {number} col - The column position.
   * @returns {CellsToBePlaced} The cells to be placed.
   */
  placeAt (row, col) {
    return new CellsToBePlaced(
      this.board,
      row,
      col,
      this.validator,
      this.zoneDetail,
      this.target
    )
  }

  /**
   * Checks if the placeable is within all bounds.
   * @param {number} r - The row.
   * @param {number} c - The column.
   * @returns {boolean} True if within bounds.
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
   * Checks if the placeable can be placed at the position.
   * @param {number} r - The row.
   * @param {number} c - The column.
   * @param {any} shipCellGrid - The ship cell grid.
   * @returns {boolean} True if can place.
   */
  canPlace (r, c, shipCellGrid) {
    const placing = this.placeAt(r, c)
    return placing.canPlace(shipCellGrid)
  }
}
