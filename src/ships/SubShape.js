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
   * The faction property is reset to its default value of 1 and must be updated separately
   * on the cloned instance to reflect the actual proportion for the new context.
   *
   * Cloning is useful when creating variants or copies of sub-shapes for different
   * transformation forms in hybrid ships, or when duplicating sub-shapes across multiple placements.
   * Each clone is independent and can have its own faction value assigned.
   *
   * @returns {SubShape} New sub-shape instance with same validator, detail, and terrain;
   *   faction reset to 1 (requires manual assignment to match context)
   *
   * @example
   * const original = new SubShape(validator, 1, terrain);
   * original.faction = 0.4; // Original is 40% of hybrid ship
   * const copy = original.clone(); // copy.faction reset to 1
   * copy.faction = 0.3; // Clone is 30% of new hybrid ship
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
   * all occupied cell positions as [x, y] coordinate pairs in the order they appear
   * in the mask. This is a read-only view of the board's cell coordinates.
   *
   * The returned array reflects the current state of the board and updates
   * automatically when the board is modified via setBoardFromSecondary() or setCells().
   *
   * @type {Array<CoordPair>}
   * @readonly
   *
   * @example
   * const subshape = new StandardCells(validator, 1, terrain);
   * subshape.setBoardFromSecondary(Mask.fromCoordsSquare([[0,0], [1,1]]));
   * console.log(subshape.cells); // [[0,0], [1,1]]
   */
  get cells () {
    return this.board.toCoords
  }

  /**
   * Sets board from occupancy and optional secondary boards.
   *
   * Handles both scenarios:
   * 1. **Single board**: If secondaryBoard is null/undefined, uses occupancyBoard directly
   *    (efficient for simple single-board configurations)
   * 2. **Dual board**: Combines occupancy and secondary boards via intersection (take operation)
   *    (used when sub-shape cells are the intersection of two mask regions)
   *
   * The dual-board case automatically expands the secondary board to match occupancy dimensions
   * if they differ. This allows flexible composition of boards of different sizes.
   *
   * Updates both this.board and this.size properties to reflect the new board configuration.
   *
   * @param {MaskType} occupancyBoard - Primary occupancy board defining occupied cells;
   *   dimensions determine the size of the resulting board
   * @param {MaskType} [secondaryBoard] - Optional secondary board to intersect with occupancy;
   *   will be expanded to match occupancy dimensions if smaller
   * @returns {void}
   *
   * @example
   * // Single board case - simple direct assignment
   * const board = Mask.fromCoordsSquare([[0,0], [1,1]]);
   * standardCells.setBoardFromSecondary(board);
   * // board property now set directly, size = 2
   *
   * @example
   * // Dual board case - intersection of two boards
   * const occupancy = Mask.fromCoordsSquare([[0,0], [1,1], [2,2]]);
   * const secondary = Mask.fromCoordsSquare([[0,0], [1,1]]);
   * standardCells.setBoardFromSecondary(occupancy, secondary);
   * // board property set to intersection of both, size = 3
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
   * Internal method that creates the intersection of two boards:
   * 1. Expands secondary board to match occupancy dimensions if needed
   * 2. Applies take() operation to get intersection: occupancy AND secondary
   *
   * Returns only cells that are occupied in both boards, providing the
   * logical AND operation between the two mask regions.
   *
   * @param {MaskType} occupancyBoard - Primary board defining occupied cells;
   *   dimensions serve as target size for expansion
   * @param {MaskType} secondaryBoard - Secondary board to intersect with occupancy
   * @returns {MaskType} Combined board mask (intersection of both boards);
   *   only cells occupied in both input boards are set
   * @private
   *
   * @example
   * // Intersection example:
   * // occupancy has cells: [0,0], [1,1], [2,2], [3,3]
   * // secondary has cells: [1,1], [2,2]
   * const occupancy = Mask.fromCoordsSquare([[0,0], [1,1], [2,2], [3,3]]);
   * const secondary = Mask.fromCoordsSquare([[1,1], [2,2]]);
   * const combined = this._combineBoards(occupancy, secondary);
   * // combined only has cells [1,1] and [2,2] (intersection)
   *
   * @example
   * // No intersection example:
   * const occupancy = Mask.fromCoordsSquare([[0,0], [1,1]]);
   * const secondary = Mask.fromCoordsSquare([[2,2], [3,3]]);
   * const combined = this._combineBoards(occupancy, secondary);
   * // combined is empty (no shared cells)
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
   * Optimization method that checks if secondary board already matches target dimensions.
   * If dimensions match, returns secondary board unchanged (avoids unnecessary expansion).
   * If dimensions differ, expands secondary to targetWidth × targetHeight via expand() call.
   *
   * Expansion preserves cell patterns within the secondary board and fills extra
   * space (added rows/columns) with empty cells (all zeros).
   *
   * This method is used during board combination to ensure both masks have
   * compatible dimensions before applying the take operation.
   *
   * @param {MaskType} secondaryBoard - Board to potentially expand
   * @param {number} targetWidth - Required width in cells (must be positive)
   * @param {number} targetHeight - Required height in cells (must be positive)
   * @returns {MaskType} Expanded board (original if already correct size, new Mask if expanded)
   * @private
   *
   * @example
   * // No expansion needed
   * const board = Mask.fromCoordsSquare([[0,0], [1,1]]); // 2×2
   * const result = this._expandBoardIfNeeded(board, 2, 2);
   * // Returns same board (dimensions match)
   *
   * @example
   * // Expansion required
   * const small = Mask.fromCoordsSquare([[0,0], [1,1]]); // 2×2
   * const expanded = this._expandBoardIfNeeded(small, 4, 4);
   * // Returns new board expanded to 4×4 with original cells preserved
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
   * High-level convenience method that converts raw coordinate data into board configuration:
   * 1. Create occupancy board from all coordinates via Mask.fromCoordsSquare()
   * 2. Get secondary board from secondary sub-shape's board (or create empty board if none)
   * 3. Combine both boards via setBoardFromSecondary()
   *
   * This provides an alternative to directly calling setBoardFromSecondary() with
   * pre-constructed Mask objects. Useful when working with raw coordinate arrays.
   *
   * @param {Array<CoordPair>} allCells - All cell coordinates as [x, y] pairs;
   *   used to construct the occupancy board
   * @param {StandardCells} secondary - Secondary sub-shape for intersection;
   *   its board property is used for combination, or empty board if not set
   * @returns {void}
   *
   * @example
   * // Simple case: set cells directly without secondary
   * const cells = [[0,0], [1,1], [2,2]];
   * const secondary = new StandardCells(validator, 1, terrain);
   * standardCells.setCells(cells, secondary);
   * // Board now set from cell coordinates
   *
   * @example
   * // With secondary board intersection
   * const allCells = [[0,0], [1,1], [2,2], [3,3]];
   * const secondary = new StandardCells(validator, 1, terrain);
   * secondary.setBoardFromSecondary(Mask.fromCoordsSquare([[0,0], [1,1]]));
   * standardCells.setCells(allCells, secondary);
   * // Board is intersection of allCells and secondary's board
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
   * Constructs the board once from the provided coordinates and stores it as an immutable
   * configuration. The board cannot be changed after construction (no setters available).
   * This provides efficiency and safety for fixed sub-shape configurations that don't
   * need dynamic updates during gameplay.
   *
   * Note: The cells parameter order is different from other classes (cells first)
   * to emphasize the immutable nature of the board.
   *
   * @param {Array<CoordPair>} cells - Cell coordinates defining the shape;
   *   used to construct the immutable board via Mask.fromCoordsSquare()
   * @param {SubShapeValidator} validator - Validation function for this sub-shape;
   *   called during grid placement to verify constraints
   * @param {number} zoneDetail - Zone detail level for terrain analysis and classification
   * @param {SubTerrain} subterrain - Required terrain type for placement;
   *   determines where this sub-shape can be placed on the map
   *
   * @example
   * // Create a fixed sub-shape with specific cells
   * const special = new SpecialCells(
   *   [[0,0], [1,1], [2,2]],
   *   validationFunc,
   *   2,
   *   landTerrain
   * );
   * // Board is now fixed with coordinates [0,0], [1,1], [2,2]
   * // Cannot be changed via setters after construction
   *
   * @example
   * // Using immutable special cells in hybrid ship
   * const waterPart = new SpecialCells([[0,0], [0,1]], validateWater, 1, waterTerrain);
   * const landPart = new SpecialCells([[1,0], [1,1]], validateLand, 1, landTerrain);
   * // Both configurations are now fixed and cannot be modified
   */
  constructor (cells, validator, zoneDetail, subterrain) {
    super(validator, zoneDetail, subterrain)
    this.board = Mask.fromCoordsSquare(cells)
  }
}
