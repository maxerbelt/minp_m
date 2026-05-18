import { Mask } from '../grid/rectangle/mask.js'

/** @typedef {import('../terrains/all/js/SubTerrain.js').SubTerrain} SubTerrain */
/** @typedef {import('../grid/rectangle/mask.js').Mask} MaskType */
/** @typedef {[number, number]} CoordPair */
/** @typedef {(...args: any[]) => any} SubShapeValidator */

/**
 * Base class for sub-shapes with terrain-specific properties
 * Represents a portion of a hybrid ship with specific terrain requirements
 */
export class SubShape {
  /**
   * Creates a sub-shape with validation and terrain properties
   * @param {SubShapeValidator} validator - Validation function for this sub-shape
   * @param {number} zoneDetail - Zone detail level
   * @param {SubTerrain} subterrain - Terrain object this sub-shape requires
   */
  constructor (validator, zoneDetail, subterrain) {
    this.validator = validator
    this.zoneDetail = zoneDetail
    this.subterrain = subterrain
    this.faction = 1
  }

  /**
   * Creates a clone of this sub-shape
   * @returns {SubShape} New sub-shape instance with same properties
   */
  clone () {
    return new SubShape(this.validator, this.zoneDetail, this.subterrain)
  }
}

/**
 * Standard cells sub-shape that can dynamically set its board from coordinates
 * Extends SubShape with board management capabilities
 * @extends SubShape
 */
export class StandardCells extends SubShape {
  /**
   * Creates a standard cells sub-shape with empty initial board
   * @param {SubShapeValidator} validator - Validation function
   * @param {number} zoneDetail - Zone detail level
   * @param {SubTerrain} subterrain - Required terrain type
   */
  constructor (validator, zoneDetail, subterrain) {
    super(validator, zoneDetail, subterrain)
    /** @type {MaskType} */
    this.board = Mask.empty(0, 0)
    /** @type {number} */
    this.size = 0
  }

  /**
   * Gets cell coordinates from the board
   * @returns {number[][]} Array of row/column coordinate pairs
   */
  get cells () {
    return this.board.toCoords
  }

  /**
   * Sets board from occupancy and secondary boards
   * Handles both single-board and dual-board scenarios
   * @param {MaskType} occupancyBoard - Primary occupancy board
   * @param {MaskType} [secondaryBoard] - Optional secondary board to subtract
   */
  setBoardFromSecondary (occupancyBoard, secondaryBoard) {
    if (secondaryBoard == null) {
      // Single board case - use occupancy board directly
      this.board = occupancyBoard
      this.size = occupancyBoard.width
    } else {
      // Dual board case - combine occupancy and secondary
      this.board = this._combineBoards(occupancyBoard, secondaryBoard)
    }
  }

  /**
   * Combines occupancy and secondary boards by taking their intersection
   * @param {MaskType} occupancyBoard - Primary board with occupied cells
   * @param {MaskType} secondaryBoard - Secondary board to intersect with
   * @returns {MaskType} Combined board mask
   * @private
   */
  _combineBoards (occupancyBoard, secondaryBoard) {
    const expandedSecondary = this._expandBoardIfNeeded(
      secondaryBoard,
      occupancyBoard.width,
      occupancyBoard.height
    )
    return occupancyBoard.take(expandedSecondary)
  }

  /**
   * Expands secondary board to match occupancy board dimensions if needed
   * @param {MaskType} secondaryBoard - Board to potentially expand
   * @param {number} targetWidth - Required width
   * @param {number} targetHeight - Required height
   * @returns {MaskType} Expanded board or original if already correct size
   * @private
   */
  _expandBoardIfNeeded (secondaryBoard, targetWidth, targetHeight) {
    if (
      secondaryBoard.width === targetWidth &&
      secondaryBoard.height === targetHeight
    ) {
      return secondaryBoard
    }
    return secondaryBoard.expand(targetWidth, targetHeight)
  }

  /**
   * Sets cells from coordinate arrays, creating boards and combining them
   * @param {Array<[number, number]>} allCells - All cell coordinates
   * @param {StandardCells} secondary - Secondary sub-shape for intersection
   */
  setCells (allCells, secondary) {
    const occupancyBoard = Mask.fromCoordsSquare(allCells)
    const secondaryBoard =
      secondary.board || Mask.empty(occupancyBoard.width, occupancyBoard.height)
    this.setBoardFromSecondary(occupancyBoard, secondaryBoard)
  }
}

/**
 * Special cells sub-shape with fixed board from initial coordinates
 * Extends SubShape with immutable board set at construction
 * @extends SubShape
 */
export class SpecialCells extends SubShape {
  /**
   * Creates a special cells sub-shape with fixed board
   * @param {Array<[number, number]>} cells - Cell coordinates defining the shape
   * @param {SubShapeValidator} validator - Validation function
   * @param {number} zoneDetail - Zone detail level
   * @param {SubTerrain} subterrain - Required terrain type
   */
  constructor (cells, validator, zoneDetail, subterrain) {
    super(validator, zoneDetail, subterrain)
    this.board = Mask.fromCoordsSquare(cells)
  }
}
