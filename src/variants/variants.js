import { Random } from '../core/Random.js'
import { CellsToBePlaced } from './CellsToBePlaced.js'
import { Placeable } from './Placeable.js'

/**
 * @fileoverview Base variant management system for handling multiple board orientations and transformations.
 * Provides abstract foundation for variant classes supporting rotation, flipping, and transformation capabilities.
 * Manages variant selection, board manipulation, and placeable instance creation.
 *
 * @typedef {import('./Placeable.js').Placeable} PlaceableType
 * @typedef {import('./CellsToBePlaced.js').CellsToBePlaced} CellsToBePlacedType
 * @typedef {import('./types/variants.types.ts').VariantBoard} VariantBoard
 *
 * Type definitions extracted to dedicated type files for clarity and maintainability:
 * - {@link ZoneInfo} from types/placement.types.ts
 * - {@link PlacementValidator} from types/callbacks.types.ts
 * - {@link ZoneDetailType} from types/variants.types.ts
 * - {@link VariantIndex} from types/variants.types.ts
 * - {@link VariantTransitionFn} from types/callbacks.types.ts
 * @typedef {import('./types/placement.types.ts').ZoneInfo} ZoneInfo
 * @typedef {import('./types/callbacks.types.ts').PlacementValidator} PlacementValidator
 * @typedef {import('./types/variants.types.ts').ZoneDetailType} ZoneDetailType
 * @typedef {import('./types/variants.types.ts').VariantIndex} VariantIndex
 * @typedef {import('./types/callbacks.types.ts').VariantTransitionFn} VariantTransitionFn
 */

/**
 * Base class for managing variant boards with transformation capabilities.
 * Provides abstract foundation for variant types (Invariant, Blinker, Asymmetric, etc.).
 * Manages a list of board variants, current selection index, and transformation functions.
 * Supports rotation, flipping, and custom transformations through transition functions.
 * Cannot be instantiated directly - must be extended by concrete variant types.
 *
 * @abstract
 * @class Variants
 * @example
 * // Extended by concrete variants:
 * class Invariant extends Variants { ... }  // No transformation
 * class Blinker extends Variants { ... }    // 2 rotations
 * class Asymmetric extends Variants { ... } // 8 orientations
 *
 * @see {@link types/variants.types.ts} for VariantIndex, VariantTransitionFn types
 * @see {@link types/callbacks.types.ts} for PlacementValidator type
 */
export class Variants {
  /**
   * Creates a new Variants instance.
   * Initializes variant list, current index, and transformation functions.
   * Cannot be instantiated directly - must be extended by concrete variant classes.
   *
   * @constructor
   * @param {PlacementValidator} validator - Function to validate placements in specific zones.
   *   Called with zone information to determine placement validity.
   *   If not a function, defaults to always-true validator (accepts all zones).
   * @param {ZoneDetailType} zoneDetail - Zone detail level for placement queries.
   *   Controls granularity of zone information retrieval during validation.
   *   0 = no zone detail, 1 = subterrain level, 2 = zone level.
   * @param {string} symmetry - Symmetry type identifier for this variant class.
   *   One character code indicating transformation capabilities.
   *   Examples: 'S' (invariant), 'L' (blinker), 'D' (asymmetric), 'A' (orbit4f).
   *
   * @throws {Error} Always throws when instantiated directly (abstract class).
   *   Subclasses must call via super() in their constructors.
   *
   * @protected
   */
  constructor (validator, zoneDetail, symmetry) {
    if (new.target === Variants) {
      throw new Error(
        'base class cannot be instantiated directly. Please extend it.'
      )
    }
    /**
     * Array of variant boards - each board is one orientation/configuration.
     * Typically Mask instances representing different rotations/flips.
     * Populated by subclass constructors with all available variant orientations.
     *
     * @type {VariantBoard[]}
     * @protected
     */
    this.list = []

    /**
     * Current active variant index.
     * Index into the variants list of the currently selected variant.
     * Updated via setByIndex() when variant selection changes.
     * Starts at 0 (first variant in list).
     *
     * @type {VariantIndex}
     * @public
     */
    this.index = 0

    /**
     * Whether this variant supports flipping transformations.
     * If true, flip operations and f/f1 transition functions are available.
     * Determines if flip UI controls should be shown to user.
     *
     * @type {boolean}
     * @public
     */
    this.canFlip = false

    /**
     * Whether this variant supports rotation transformations.
     * If true, rotation operations and r/r1 transition functions are available.
     * Determines if rotation UI controls should be shown to user.
     *
     * @type {boolean}
     * @public
     */
    this.canRotate = false

    /**
     * Whether this variant supports any transformations (rotation or flipping).
     * True if variant has any transformation capability.
     * Used to determine if variant selection UI should be visible.
     *
     * @type {boolean}
     * @public
     */
    this.canTransform = false

    /**
     * Zone validation function for placement constraint checking.
     * Determines whether cells can be placed in specific zones.
     * Called with zone information to validate placement feasibility.
     * Assigned from constructor parameter or defaults to always-true.
     *
     * @type {PlacementValidator}
     * @public
     */
    this.validator = typeof validator === 'function' ? validator : () => true

    /**
     * Zone detail level for placement validation queries.
     * Controls granularity of zone information during validation.
     * Passed to placement target's getZone() method.
     *
     * @type {ZoneDetailType}
     * @public
     */
    this.zoneDetail = zoneDetail

    /**
     * Symmetry type identifier for this variant class.
     * Single character string indicating transformation schema.
     * Used to determine available transition functions.
     *
     * @type {string}
     * @public
     */
    this.symmetry = symmetry

    /**
     * Event handler called when variant selection changes.
     * Used to notify observers of variant transformations.
     * Set to no-op function by default; subclasses may override.
     *
     * @type {() => void}
     * @public
     */
    this.onChange = () => {}

    /**
     * Rotation transition function for this variant instance.
     * Maps current variant index to its clockwise rotation equivalent.
     * Bound to this variant's specific transformation schema.
     * Defaults to identity function (no transformation).
     *
     * @type {VariantTransitionFn}
     * @protected
     */
    this.r1 = index => index

    /**
     * Flip transition function for this variant instance.
     * Maps current variant index to its mirrored/flipped equivalent.
     * Bound to this variant's specific transformation schema.
     * Defaults to identity function (no transformation).
     *
     * @type {VariantTransitionFn}
     * @protected
     */
    this.f1 = index => index

    /**
     * Rotate-then-flip transition function for this variant instance.
     * Maps current variant index to its rotated-and-flipped equivalent.
     * Bound to this variant's specific transformation schema.
     * Defaults to identity function (no transformation).
     *
     * @type {VariantTransitionFn}
     * @protected
     */
    this.rf1 = index => index
  }

  /**
   * Gets the total number of available variants in this set.
   * Represents the size of the variants list.
   * Used to determine which variant indices are valid.
   *
   * @returns {number} Count of variants in the list (>= 1 for valid variant sets).
   *
   * @example
   * if (variant.numVariants() > 1) {
   *   // Can offer rotation/flip options
   * }
   *
   * @public
   */
  numVariants () {
    return this.list.length
  }

  /**
   * Resolves a possibly undefined variant index into an explicit number.
   * Converts null/undefined to current active index, returns numeric indices as-is.
   * Useful for optional index parameters that default to current index.
   *
   * @param {VariantIndex | undefined | null} index - Variant index to resolve.
   *   Can be number (explicit index), undefined, or null (use current).
   * @returns {VariantIndex} Resolved numeric index.
   *   Returns this.index if input is null/undefined, otherwise returns input.
   *
   * @example
   * const idx = variant.resolveIndex(undefined) // Returns variant.index
   * const idx2 = variant.resolveIndex(2)        // Returns 2
   *
   * @public
   */
  resolveIndex (index) {
    return index == null ? this.index : index
  }

  /**
   * Gets the board at the specified index or the active board if index omitted.
   * Convenience wrapper for boardFor() - delegates directly to it.
   *
   * @param {VariantIndex | undefined | null} [index] - Variant index to retrieve.
   *   If omitted/null/undefined, returns active board at this.index.
   * @returns {VariantBoard} Board at specified or active index.
   *   Typically a Mask instance representing board orientation.
   *
   * @example
   * const activeBoard = variant.board()      // Current selected board
   * const rotatedBoard = variant.board(1)    // Specific index
   *
   * @public
   */
  board (index) {
    return this.boardFor(index)
  }

  /**
   * Returns the board at the requested index, or the active board when index is omitted.
   * Core method for retrieving variant boards from the list.
   * Always returns a valid board if variants list is populated.
   *
   * @param {VariantIndex | undefined | null} [index] - Variant index to retrieve.
   *   If omitted, null, or undefined, returns active board at this.index.
   * @returns {VariantBoard} Board at specified or active index.
   *   Returns this.list[resolvedIndex].
   *
   * @throws {TypeError} If board at index is undefined (invalid index).
   *   Accessing out-of-bounds indices will return undefined board.
   *
   * @public
   */
  boardFor (index) {
    return this.list[this.resolveIndex(index)]
  }

  /**
   * Gets the first board in the variant list.
   * Represents the default/base orientation of the shape.
   * Often used as reference for generating other variants.
   *
   * @returns {VariantBoard} First board in the variants list (this.list[0]).
   *
   * @example
   * const defaultShape = variant.firstBoard // Base orientation
   *
   * @public
   */
  get firstBoard () {
    return this.list[0]
  }

  /**
   * Checks if there are multiple variants available.
   * Determines whether variant selection UI should be offered to user.
   *
   * @returns {boolean} True if variants.length > 1, false for single variant sets.
   *
   * @example
   * if (variant.hasMultipleVariants) {
   *   showRotationControls()
   * }
   *
   * @public
   */
  get hasMultipleVariants () {
    return this.list.length > 1
  }

  /**
   * Gets the currently active board (board at this.index).
   * Represents the user's current selection within the variant set.
   *
   * @returns {VariantBoard} Active board at this.index.
   *   Equivalent to this.boardFor(this.index).
   *
   * @public
   */
  get activeBoard () {
    return this.boardFor(this.index)
  }

  /**
   * Chooses the best variant index for a placement with given height constraint.
   * Selects smallest variant fitting within specified cell height.
   * If no variants fit the constraint, falls back to height/width heuristic.
   * Optimized for space-constrained placement scenarios.
   *
   * @param {number} cellHeight - Maximum available height in cells.
   *   Used to determine which variant fits in available space.
   * @returns {VariantIndex} Index of best-fitting variant.
   *   Returns 0 (first/default) if only one variant exists.
   *   Otherwise returns index of variant with better aspect ratio.
   *
   * @example
   * const bestVariant = variant.indexUnder(3) // Find variant fitting 3 cells height
   *
   * @public
   */
  indexUnder (cellHeight) {
    if (!this.hasMultipleVariants) {
      return 0
    }

    const occupiedBoard = this.firstBoard.shrinkToOccupied()
    if (occupiedBoard.maxSize <= cellHeight) {
      return occupiedBoard.isWide ? 1 : 0
    }

    return occupiedBoard.isTall ? 1 : 0
  }

  /**
   * Returns the occupied (shrunk) board and chosen variant index for placement height.
   * Combines indexUnder() logic with board shrinking for placement validation.
   * Returns both the best-fitting variant index and its occupied footprint.
   *
   * @param {number} cellHeight - Maximum available height in cells.
   *   Used to find best-fitting variant orientation.
   * @returns {{index: number, board: VariantBoard}} Result object.
   *   index: Best variant index for height constraint.
   *   board: Shrunk board of selected variant (occupied cells only).
   *
   * @example
   * const { index, board } = variant.shrunkUnder(4)
   * if (target.allBoundsChecker(row, col, board.height, board.width)) {
   *   placeVariant(index, row, col)
   * }
   *
   * @public
   */
  shrunkUnder (cellHeight) {
    const index = this.indexUnder(cellHeight)
    const board = this.boardFor(index).shrinkToOccupied()
    return { index, board }
  }

  /**
   * Returns the cell coordinates of a variant board.
   * Provides array of occupied cell positions in local coordinate space.
   *
   * @param {VariantIndex | undefined | null} index - Board variant index.
   *   If omitted/null/undefined, uses active board (this.index).
   * @returns {Array<[number, number, number]>} Array of [x, y, value] coordinate tuples.
   *   Represents occupied cells in local (board-relative) coordinates.
   *   Value indicates cell occupancy level or depth.
   *
   * @example
   * const cells = variant.variant(0) // Get cells of first variant
   * for (const [x, y, value] of cells) {
   *   console.log(`Cell at (${x},${y}): ${value}`)
   * }
   *
   * @public
   */
  variant (index) {
    return this.boardFor(index).toCoords
  }

  /**
   * Creates a Placeable instance for the specified variant.
   * Factory method for creating placement templates with validation rules.
   * The resulting Placeable can be used to validate and place the variant on a grid.
   *
   * @param {VariantIndex | undefined | null} index - Variant index for placeable.
   *   If omitted/null/undefined, creates placeable for active variant.
   * @returns {PlaceableType} New Placeable instance with this variant's validator and zone detail.
   *   Can be used for placement validation and constraint checking.
   *
   * @example
   * const placeable = variant.placeable(0)
   * if (placeable.canPlace(x, y, shipCellGrid)) {
   *   shipCellGrid.place(placeable.placeAt(x, y))
   * }
   *
   * @public
   */
  placeable (index) {
    return new Placeable(this.boardFor(index), this.validator, this.zoneDetail)
  }

  /**
   * Returns all variants shuffled into random order.
   * Creates a shuffled copy of the variants list for randomized selection.
   * Original list remains unchanged - does not affect this.index.
   *
   * @returns {VariantBoard[]} New array of boards in random order.
   *   Useful for randomized placement variant selection.
   *
   * @example
   * const randomVariants = variant.variations()
   * const chosenVariant = randomVariants[0] // Random variant
   *
   * @public
   */
  variations () {
    return Random.shuffleArray(this.list)
  }

  /**
   * Creates Placeable instances for all shuffled variants.
   * Combines variations() shuffling with placeable factory for each variant.
   * Enables randomized variant selection with lazy Placeable creation.
   *
   * @returns {PlaceableType[]} Array of Placeable instances in shuffled order.
   *   Each Placeable configured with this variant's validator and zone detail.
   *   Order randomized for unbiased variant selection.
   *
   * @example
   * const placeables = variant.placeables()
   * const randomPlaceable = placeables[0]
   *
   * @public
   */
  placeables () {
    return this.variations().map(
      v => new Placeable(v, this.validator, this.zoneDetail)
    )
  }

  /**
   * Normalizes all boards in the variant list.
   * Applies normalization to each variant (typically positioning at origin).
   * Returns normalized copies - does not modify this.list.
   *
   * @returns {VariantBoard[]} Array of normalized boards in same order as this.list.
   *   Each board positioned/scaled according to normalize() rules.
   *
   * @example
   * const normalized = variant.normalize()
   * // normalized[i] corresponds to this.list[i] after normalization
   *
   * @public
   */
  normalize () {
    return this.list.map(board => board.normalize())
  }

  /**
   * Gets the cell coordinates of the first (default) board.
   * Convenience getter for variant's base orientation.
   * Equivalent to variant(0) or variant.variant(0).
   *
   * @returns {Array<[number, number, number]>} Array of [x, y, value] coordinate tuples.
   *   Represents occupied cells of first variant in local coordinates.
   *
   * @public
   */
  get cells () {
    return this.firstBoard.toCoords
  }

  /**
   * Gets the height of the first (default) board.
   * Maximum row extent in local coordinate space.
   *
   * @returns {number} Height in cells (number of rows).
   *
   * @public
   */
  height () {
    return this.firstBoard.height
  }

  /**
   * Gets the width of the first (default) board.
   * Maximum column extent in local coordinate space.
   *
   * @returns {number} Width in cells (number of columns).
   *
   * @public
   */
  width () {
    return this.firstBoard.width
  }

  /**
   * Activates the variant at the requested index and notifies listeners.
   * Changes this.index to the specified variant and calls onChange() handler.
   * Used when user selects different variant transformation (rotation/flip).
   *
   * @param {VariantIndex} index - Variant index to activate.
   *   Must be within range [0, numVariants()).
   * @returns {VariantBoard} Board at the new index.
   *   Returns this.boardFor(index) after updating selection.
   *
   * @example
   * variant.setByIndex(1)
   * // Calls onChange() to notify UI of variant change
   * // activeBoard now returns board at index 1
   *
   * @fires onChange
   *
   * @public
   */
  setByIndex (index) {
    this.index = index
    this.onChange()
    return this.boardFor(index)
  }

  /**
   * Creates a placement helper for creating validated placements at given position.
   * Convenience method combining current board with placement validation setup.
   * Returns CellsToBePlaced instance ready for validation and placement.
   *
   * @param {number} r - Row (y-coordinate) for placement position in world space.
   * @param {number} c - Column (x-coordinate) for placement position in world space.
   * @returns {CellsToBePlacedType} Placement helper configured with active board.
   *   Includes all validation constraints (validator, zoneDetail, target).
   *   Ready for canPlace() checks before grid placement.
   *
   * @example
   * const placing = variant.placingAt(5, 10)
   * if (placing.canPlace(shipCellGrid)) {
   *   placeOnGrid(placing)
   * }
   *
   * @see {@link CellsToBePlaced} for placement validation interface
   *
   * @public
   */
  placingAt (r, c) {
    return new CellsToBePlaced(this.board(), r, c, this.validator)
  }
}
