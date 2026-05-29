import { Mask } from '../grid/rectangle/mask.js'

/** @typedef {import('../terrains/all/js/SubTerrain.js').SubTerrain} SubTerrain */
/** @typedef {import('../grid/rectangle/mask.js').Mask} MaskType */
/** @typedef {[number, number]} CoordPair */

/**
 * @typedef {(...args: any[]) => any} SubShapeValidator
 * Validation function that checks sub-shape constraints and rules.
 */

/**
 * Base class for sub-shapes representing portions of hybrid ships.
 *
 * Sub-shapes are terrain-specific components of a hybrid ship that define:
 * - Which terrain type they require (water, land, etc.)
 * - How they validate against grid constraints
 * - Their faction proportion/weight in the overall ship
 *
 * Each sub-shape is independent and can be composed with others to form
 * a complete hybrid ship. Properties like faction are computed based on
 * the sub-shape's cell count relative to the total hybrid ship.
 *
 * @class SubShape
 * @property {SubShapeValidator} validator - Function to validate this sub-shape against grid rules
 * @property {number} zoneDetail - Zone detail/classification level for terrain analysis
 * @property {SubTerrain} subterrain - Required terrain type (Water, Land, etc.)
 * @property {number} faction - Proportion/weight of this sub-shape (0-1); computed as area/totalArea
 *
 * @example
 * const water = new SubShape(validateWater, 1, waterTerrain);
 * water.faction = 0.4; // This sub-shape makes up 40% of hybrid ship
 */
export class SubShape {
  /**
   * Creates a sub-shape with validation and terrain properties.
   *
   * Initializes a terrain-specific sub-shape component with a default faction value of 1.
   * The faction property should be updated after creation to reflect this sub-shape's
   * proportion relative to the total hybrid ship (computed as cellCount/totalCellCount).
   *
   * @param {SubShapeValidator} validator - Validation function for this sub-shape; called during grid placement to verify constraints
   * @param {number} zoneDetail - Zone detail level; used for terrain classification and analysis
   * @param {SubTerrain} subterrain - Terrain object/type this sub-shape requires; determines where it can be placed
   *
   * @example
   * const subshape = new SubShape(validationFunc, 1, waterTerrain);
   * subshape.faction = 0.4; // This sub-shape comprises 40% of the hybrid
   */
  constructor (validator, zoneDetail, subterrain) {
    /** @type {SubShapeValidator} */
    this.validator = validator
    /** @type {number} */
    this.zoneDetail = zoneDetail
    /** @type {SubTerrain} */
    this.subterrain = subterrain
    /** @type {number} */
    this.faction = 1
  }

  /**
   * Creates a shallow clone of this sub-shape.
   *
   * Returns a new SubShape instance with identical validator, zoneDetail, and subterrain properties.
   * The faction is initialized to 1 (default) and must be set separately on the clone.
   *
   * Cloning is useful when creating variants or copies of sub-shapes for
   * different transformation forms in hybrid ships.
   *
   * @returns {SubShape} New sub-shape instance with same validation, detail, and terrain
   *
   * @example
   * const original = new SubShape(validator, 1, terrain);
   * original.faction = 0.4;
   * const copy = original.clone(); // copy.faction will be 1 (reset)
   */
  clone () {
    return new SubShape(this.validator, this.zoneDetail, this.subterrain)
  }
}

/**
 * Standard cells sub-shape with dynamic board management from coordinate arrays.
 *
 * Extends SubShape to provide board management capabilities via:
 * - setBoardFromSecondary(): Combines occupancy and secondary boards
 * - setCells(): Sets cells from coordinate arrays and combines boards
 *
 * This class is used for mutable sub-shapes where the board configuration
 * can change during initialization or when composing with other sub-shapes.
 * The board property holds a Mask representing the cells occupied by this sub-shape.
 *
 * @class StandardCells
 * @extends SubShape
 * @property {MaskType} board - Mask representing occupied cells; initially empty(0,0)
 * @property {number} size - Width of the board (for square boards)
 *
 * @example
 * const standardCells = new StandardCells(validator, 1, waterTerrain);
 * const occupancy = Mask.fromCoordsSquare([[0,0], [1,1], [2,2]]);
 * standardCells.setBoardFromSecondary(occupancy); // Set board directly
 */
export class StandardCells extends SubShape {
  /**
   * Creates a standard cells sub-shape with empty initial board.
   *
   * Initializes with parent class properties and an empty Mask.
   * The board must be populated via setBoardFromSecondary() or setCells().
   *
   * @param {SubShapeValidator} validator - Validation function for this sub-shape
   * @param {number} zoneDetail - Zone detail level for terrain analysis
   * @param {SubTerrain} subterrain - Required terrain type
   *
   * @example
   * const standardCells = new StandardCells(validateWater, 1, waterTerrain);
   * // Board is initially empty(0, 0); populate via setBoardFromSecondary()
   */
  constructor (validator, zoneDetail, subterrain) {
    super(validator, zoneDetail, subterrain)
    /** @type {MaskType} */
    this.board = Mask.empty(0, 0)
    /** @type {number} */
    this.size = 0
  }

  /**
   * Gets cell coordinates from the board mask.
   *
   * Returns the toCoords array from the underlying Mask, which contains
   * all occupied cell positions as [x, y] coordinate pairs.
   *
   * @type {number[][]}
   * @readonly
   */
  get cells () {
    return this.board.toCoords
  }

  /**
   * Sets board from occupancy and optional secondary boards.
   *
   * Handles both scenarios:
   * 1. **Single board**: If secondaryBoard is null/undefined, uses occupancyBoard directly
   * 2. **Dual board**: Combines occupancy and secondary boards via intersection (take operation)
   *
   * The dual-board case expands the secondary board to match occupancy dimensions if needed.
   * Used when a sub-shape's cells are the intersection of two mask regions.
   *
   * @param {MaskType} occupancyBoard - Primary occupancy board defining occupied cells
   * @param {MaskType} [secondaryBoard] - Optional secondary board to intersect with occupancy
   * @returns {void}
   *
   * @example
   * // Single board case
   * const board = Mask.fromCoordsSquare([[0,0], [1,1]]);
   * standardCells.setBoardFromSecondary(board); // Uses board directly
   *
   * @example
   * // Dual board case
   * const occupancy = Mask.fromCoordsSquare([[0,0], [1,1], [2,2]]);
   * const secondary = Mask.fromCoordsSquare([[0,0], [1,1]]);
   * standardCells.setBoardFromSecondary(occupancy, secondary); // Intersection
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
   * Combines occupancy and secondary boards by intersection (take operation).
   *
   * Creates the intersection of two boards:
   * 1. Expands secondary board to match occupancy dimensions if needed
   * 2. Applies take() operation to get intersection: occupancy AND secondary
   *
   * Returns cells that are occupied in both boards.
   *
   * @param {MaskType} occupancyBoard - Primary board defining occupied cells
   * @param {MaskType} secondaryBoard - Secondary board to intersect with occupancy
   * @returns {MaskType} Combined board mask (intersection of both boards)
   * @private
   *
   * @example
   * const occupancy = Mask.fromCoordsSquare([[0,0], [1,1], [2,2], [3,3]]);
   * const secondary = Mask.fromCoordsSquare([[1,1], [2,2]]);
   * const combined = this._combineBoards(occupancy, secondary);
   * // combined has cells [1,1] and [2,2] only (intersection)
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
   * Expands secondary board to match occupancy board dimensions if needed.
   *
   * Checks if secondary board already matches target dimensions.
   * If dimensions match, returns secondary board unchanged.
   * If dimensions differ, expands secondary to targetWidth × targetHeight.
   *
   * Expansion preserves cell patterns and fills extra space with empty cells.
   *
   * @param {MaskType} secondaryBoard - Board to potentially expand
   * @param {number} targetWidth - Required width in cells
   * @param {number} targetHeight - Required height in cells
   * @returns {MaskType} Expanded board (or original if already correct size)
   * @private
   *
   * @example
   * const small = Mask.fromCoordsSquare([[0,0], [1,1]]); // 2×2
   * const expanded = this._expandBoardIfNeeded(small, 4, 4);
   * // Returns board expanded to 4×4
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
   * Sets board from coordinate arrays by creating masks and combining them.
   *
   * Process:
   * 1. Create occupancy board from all coordinates
   * 2. Get secondary board from secondary sub-shape (or empty if none)
   * 3. Combine both boards via setBoardFromSecondary()
   *
   * This method provides a convenience interface for setting the board
   * from raw coordinate data rather than pre-constructed Mask objects.
   *
   * @param {Array<CoordPair>} allCells - All cell coordinates as [x, y] pairs
   * @param {StandardCells} secondary - Secondary sub-shape for intersection
   * @returns {void}
   *
   * @example
   * const cells = [[0,0], [1,1], [2,2]];
   * const secondary = new StandardCells(validator, 1, terrain);
   * standardCells.setCells(cells, secondary); // Sets board from coordinates
   */
  setCells (allCells, secondary) {
    const occupancyBoard = Mask.fromCoordsSquare(allCells)
    const secondaryBoard =
      secondary.board || Mask.empty(occupancyBoard.width, occupancyBoard.height)
    this.setBoardFromSecondary(occupancyBoard, secondaryBoard)
  }
}

/**
 * Special cells sub-shape with immutable board set at construction.
 *
 * Extends SubShape to provide a fixed board configuration that is set once
 * during construction from provided cell coordinates. Unlike StandardCells,
 * the board cannot be changed after construction.
 *
 * Used for fixed sub-shapes where the cell pattern is known and immutable
 * throughout the ship's lifetime. This is more efficient than StandardCells
 * for shapes that don't need dynamic board updates.
 *
 * @class SpecialCells
 * @extends SubShape
 * @property {MaskType} board - Immutable mask representing occupied cells; set at construction
 *
 * @example
 * const specialCells = new SpecialCells(
 *   [[0,0], [1,1], [2,2]],
 *   validator,
 *   1,
 *   landTerrain
 * );
 * // board is now immutable with the specified coordinates
 */
export class SpecialCells extends SubShape {
  /**
   * Creates a special cells sub-shape with fixed immutable board.
   *
   * Constructs the board once from the provided coordinates and stores it.
   * The board cannot be changed after construction (no setters available).
   * This provides efficiency and safety for fixed sub-shape configurations.
   *
   * @param {Array<CoordPair>} cells - Cell coordinates defining the shape; used to construct the immutable board
   * @param {SubShapeValidator} validator - Validation function for this sub-shape
   * @param {number} zoneDetail - Zone detail level for terrain analysis
   * @param {SubTerrain} subterrain - Required terrain type
   *
   * @example
   * const special = new SpecialCells(
   *   [[0,0], [1,1], [2,2]],
   *   validationFunc,
   *   2,
   *   landTerrain
   * );
   * // Board is now fixed with coordinates [0,0], [1,1], [2,2]
   */
  constructor (cells, validator, zoneDetail, subterrain) {
    super(validator, zoneDetail, subterrain)
    this.board = Mask.fromCoordsSquare(cells)
  }
}
