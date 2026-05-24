import { Actions } from './actions.js'
import { Indexer } from '../indexer.js'
import { RectNormalCover } from './RectNormalCover.js'
import { RectHalfCover } from './RectHalfCover.js'
import { RectSuperCover } from './RectSuperCover.js'
import { Connect4 } from './Connect4.js'
import { Connect4Diagonal } from './Connect4Diagonal.js'
import { Connect8 } from './Connect8.js'

/**
 * @typedef {Object} CoverTypes
 * @property {RectNormalCover} normal - Normal/full coverage
 * @property {RectHalfCover} half - Half-plane coverage
 * @property {RectSuperCover} super - Super-coverage
 */

/**
 * @typedef {Object} ConnectionTypes
 * Connectivity definitions for different neighbor configurations
 * @description
 * Map of connectivity objects:
 * - '4': Orthogonal (up, down, left, right)
 * - '4diag': Diagonal (NE, SE, SW, NW)
 * - '8': King-connected (all 8 surrounding)
 */

/**
 * @typedef {Object} TransformCapabilities
 * @property {boolean} canRotateCW - Can rotate 90° clockwise
 * @property {boolean} canRotateCCW - Can rotate 90° counter-clockwise
 * @property {boolean} canFlipH - Can flip horizontally
 * @property {boolean} canFlipV - Can flip vertically
 */

/**
 * @typedef {[number, number]} Location
 * A coordinate pair [x, y] where x is column (0-based) and y is row (0-based)
 */

/**
 * @typedef {[number, number]|null} ValidatedCoordinates
 * A validated coordinate pair [x, y] or null if validation failed
 */

/**
 * Modulo operator with proper handling of negative numbers
 *
 * Computes n mod m with result always in range [0, m), even for negative n.
 * Formula: ((n % m) + m) % m ensures positive result for standard modulo behavior.
 * This handles the JavaScript quirk where negative numbers mod returns negative results.
 *
 * @param {number} n - Dividend (any integer, including negative)
 * @param {number} m - Divisor (must be positive integer)
 * @returns {number} Remainder in range [0, m) (always non-negative)
 * @private
 */
function mod (n, m) {
  return ((n % m) + m) % m
}

/**
 * Rectangular grid index for efficient spatial indexing and connectivity queries
 *
 * Extends Indexer to provide grid-specific operations for rectangular grids,
 * including coordinate conversion, connectivity queries, line drawing, and
 * coverage calculations. Supports multiple connectivity modes (4-connected,
 * 8-connected, diagonal) and optional wrapping (toroidal topology).
 *
 * Key Features:
 * - Efficient 2D ↔ 1D index conversion using row-major order
 * - Multiple connectivity types for neighbor queries with flexible boundary modes
 * - Clamp and wrap validation modes for boundary handling (default: clamp)
 * - Line drawing algorithms (normal, half, super coverage)
 * - Grid traversal generators (rows, cells)
 * - Symmetry group capabilities detection (rotation, flip)
 *
 * Default Configuration:
 * - Width and height must be positive integers
 * - Connectivity: 8-connected (king-connected neighbors)
 * - Boundary mode: Clamping (out-of-bounds returns null)
 *
 * @class RectIndex
 * @extends Indexer
 * @example
 * const index = new RectIndex(10, 10);
 * const cellIdx = index.index(5, 3);          // Get 1D index from (x, y)
 * const [x, y] = index.location(cellIdx);     // Get (x, y) from 1D index
 * const neighbors = index.neighbors(5, 3);    // Get 8-connected neighbors
 * index.wrap();                               // Enable toroidal wrapping
 * const wrapped = index.validate(10, 5);      // [0, 5] on 10x10 grid
 */
export class RectIndex extends Indexer {
  /**
   * Initialize rectangular grid index
   *
   * Creates a new rectangular grid index with specified dimensions.
   * Initializes coverage algorithms (normal, half, super), connectivity objects (4, 8, 4diag),
   * and traversal iterators. Defaults to 8-connected neighbors with clamping boundary mode.
   * The grid uses row-major order for index calculations.
   *
   * @param {number} width - Grid width in cells (must be positive integer > 0)
   * @param {number} height - Grid height in cells (must be positive integer > 0)
   * @throws {Error} If width or height is not a positive integer
   * @example
   * const grid = new RectIndex(8, 12);     // 8x12 rectangular grid
   * const grid2 = new RectIndex(1, 1);     // Minimum 1x1 grid
   */
  constructor (width, height) {
    super(width * height)
    /** @type {number} Grid width in cells (positive integer, immutable after construction) */
    this.width = width
    /** @type {number} Grid height in cells (positive integer, immutable after construction) */
    this.height = height
    /** @type {boolean} Whether toroidal wrapping is enabled (false = clamping boundary mode) */
    this._wrap = false
    /** @type {Function} Active validation function: validateClamp or validateWrap */
    this.validate = this.validateClamp
    /** @type {string} Current connectivity type: '4' (orthogonal), '8' (king), or '4diag' (diagonal) */
    this.connectType = '8'
    /** @type {CoverTypes} Coverage algorithms for line drawing (normal, half, super-coverage) */
    // @ts-ignore - cover classes import RectIndex from different module path
    this.cover = {
      // @ts-ignore - private _ensureIndexer mismatch between module paths
      normal: new RectNormalCover(this),
      // @ts-ignore - private _ensureIndexer mismatch between module paths
      half: new RectHalfCover(this),
      // @ts-ignore - private _ensureIndexer mismatch between module paths
      super: new RectSuperCover(this)
    }
    /** @type {Object} Connectivity objects for neighbor queries with different connectivity modes */
    // @ts-ignore - parent Indexer class compatibility
    this.connection = {
      4: new Connect4(this),
      '4diag': new Connect4Diagonal(this),
      8: new Connect8(this)
    }
    // @ts-ignore - parent Indexer class has private method, but we need access
    this._installIndexIteratorWrappers()
  }

  /**
   * Draw line using normal/full coverage algorithm
   *
   * Delegates to RectNormalCover.step() for line drawing with standard Bresenham-like algorithm.
   * Includes all pixels on the line between start and end points. See RectNormalCover for
   * parameter details and return type based on the specific coverage algorithm.
   *
   * @param {...any} args - Arguments to pass through to RectNormalCover.step()
   * @returns {*} Result from normal coverage step method (algorithm-dependent return type)
   * @see RectNormalCover#step
   */
  step (...args) {
    // @ts-ignore - spread operator with parent method
    return this.cover.normal.step(...args)
  }

  /**
   * Draw line with movement tracking using normal coverage
   *
   * Delegates to RectNormalCover.stepMove() for line drawing that tracks movement direction.
   * Useful for algorithms that need to understand how the line traversal moves through the grid.
   * See RectNormalCover for parameter details and return type.
   *
   * @param {...any} args - Arguments to pass through to RectNormalCover.stepMove()
   * @see RectNormalCover#stepMove
   */
  stepMove (...args) {
    // @ts-ignore - spread operator with parent method
    return this.cover.normal.stepMove(...args)
  }

  /**
   * Convert 2D grid coordinates to 1D linear index
   *
   * Computes index using row-major order: index = y * width + x
   * This is the standard layout for rectangular grids where row advances by width cells.
   * No bounds checking performed; caller responsible for valid coordinates.
   * Override of parent Indexer.index() method with specific rectangular parameters.
   *
   * @param {number} x - X coordinate/column (0-based, should be in [0, width))
   * @param {number} y - Y coordinate/row (0-based, should be in [0, height))
   * @returns {number} Linear index in range [0, width * height) (non-negative)
   * @override
   * @example
   * const idx = grid.index(5, 3); // Get index for column 5, row 3
   * // On 10-wide grid: 3 * 10 + 5 = 35
   */
  // @ts-ignore - override parent Indexer method with different signature
  index (x, y) {
    return y * this.width + x
  }

  /**
   * Convert 1D linear index to 2D grid coordinates
   *
   * Recovers (x, y) from linear index using row-major decomposition.
   * Formula: x = i % width, y = floor(i / width) reconstructs the original coordinates.
   * No bounds checking on index value; caller should validate if needed.
   * Override of parent Indexer.location() method with specific rectangular return type.
   *
   * @param {number} i - Linear index (should be in [0, width * height), but not validated)
   * @returns {Location} Array [x, y] where x is column (0-based), y is row (0-based)
   * @override
   * @example
   * const [x, y] = grid.location(15);  // Recover (x, y) from index 15
   * // On 10-wide grid: [5, 1] from index 15
   */
  // @ts-ignore - override parent Indexer method with different return type
  location (i) {
    const x = i % this.width
    const y = Math.floor(i / this.width)
    return /** @type {Location} */ ([x, y])
  }

  /**
   * Check if coordinates are within grid bounds
   *
   * Validates that both x and y are non-negative and less than width and height respectively.
   * Uses unsigned right shift (>>>) for fast non-negative check instead of comparison.
   * Valid range: 0 ≤ x < width AND 0 ≤ y < height
   *
   * @param {number} x - X coordinate to validate (0-based column)
   * @param {number} y - Y coordinate to validate (0-based row)
   * @returns {boolean} True if coordinates are in bounds, false if out of bounds
   * @example
   * if (grid.isValid(x, y)) { process(x, y); }
   * grid.isValid(-1, 5);   // false (negative x)
   * grid.isValid(10, 5);   // false on 10-wide grid (x >= width)
   * grid.isValid(5, 5);    // true on 10x10 grid
   */
  isValid (x, y) {
    return x >>> 0 < this.width && y >>> 0 < this.height
  }
  /**
   * Enable wrapping (toroidal) boundary mode
   *
   * Switches to wrapping validation where coordinates outside bounds are wrapped
   * using modulo arithmetic. Creates a toroidal (donut-shaped) topology where
   * the top edge connects to the bottom edge and left connects to right.
   * This mode always returns valid coordinates (never null).
   *
   * @returns {void}
   * @example
   * grid.wrap();                       // Enable wrapping mode
   * const [x, y] = grid.validate(10, 5);   // Returns [0, 5] on 10x10 grid
   * @see clamp
   * @see validateWrap
   */
  wrap () {
    this._wrap = true
    this.validate = this.validateWrap
  }

  /**
   * Enable clamping (clipping) boundary mode
   *
   * Switches to clamping validation where coordinates outside bounds are rejected
   * (return null) rather than wrapped. This is the default mode for all new RectIndex instances.
   * Clamping provides safe boundary handling when out-of-bounds access should be prevented.
   *
   * @returns {void}
   * @example
   * grid.clamp();                          // Enable clamping (default)
   * const result = grid.validate(10, 5);   // Returns null on 10x10 grid
   * @see wrap
   * @see validateClamp
   */
  clamp () {
    this._wrap = false
    this.validate = this.validateClamp
  }

  /**
   * Validate coordinates using clamping (boundary clipping)
   *
   * Checks if coordinates are within bounds and returns them if valid, or null if out of bounds.
   * This is the default validation mode for newly created RectIndex instances.
   * Use this when you need to prevent access outside the grid boundaries.
   *
   * @param {number} x - X coordinate to validate (0-based column)
   * @param {number} y - Y coordinate to validate (0-based row)
   * @returns {Location|null} Validated coordinates [x, y] if valid, null if out of bounds
   * @private
   * @example
   * const result = grid.validateClamp(15, 5);  // null on 10x10 grid
   * const result2 = grid.validateClamp(5, 5);  // [5, 5]
   */
  validateClamp (x, y) {
    if (this.isValid(x, y)) return /** @type {Location} */ ([x, y])
    return null
  }

  /**
   * Validate coordinates using wrapping (toroidal topology)
   *
   * Maps coordinates to equivalent positions within bounds using modulo arithmetic.
   * Creates a toroidal (wrap-around) topology where coordinates always wrap to valid positions.
   * This method always returns valid coordinates (never null) by design.
   * Handles negative coordinates correctly due to the custom mod() function.
   *
   * @param {number} x - X coordinate (any integer, including negative or >= width)
   * @param {number} y - Y coordinate (any integer, including negative or >= height)
   * @returns {Location} Wrapped coordinates in range [0, width) × [0, height)
   * @private
   * @example
   * const result = grid.validateWrap(12, 8);  // [2, 8] on 10x10 grid
   * const result2 = grid.validateWrap(-1, 5); // [9, 5] on 10x10 grid
   */
  validateWrap (x, y) {
    const wrappedX = mod(x, this.width)
    const wrappedY = mod(y, this.height)
    return /** @type {Location} */ ([wrappedX, wrappedY])
  }

  /**
   * Create a new resized RectIndex with same configuration
   *
   * Creates a new RectIndex with different dimensions but preserving the
   * current boundary mode (wrap or clamp). This is useful for creating a
   * new grid with the same behavior settings but different size.
   *
   * @param {number} width - New grid width (must be positive integer)
   * @param {number} height - New grid height (must be positive integer)
   * @returns {RectIndex} New RectIndex with specified dimensions and current boundary mode
   * @example
   * grid.wrap();
   * const resized = grid.resized(20, 20); // New 20x20 grid, also wrapped
   * resized.validate(25, 10);              // Returns [5, 10]
   */
  resized (width, height) {
    const rect = new RectIndex(width, height)
    if (this._wrap) {
      rect.wrap()
    } else {
      rect.clamp()
    }
    return rect
  }
  /**
   * Get Actions object for symmetry and transformation operations
   *
   * Creates a fresh Actions instance reflecting the current bitboard state.
   * Important: Always creates new instance (no caching) to ensure symmetry
   * calculations reflect the current mask state rather than staying fixed
   * to the original state.
   *
   * @param {Object} bb - Bitboard/mask object with current state
   * @param {Object} bb.width - Width dimension from bitboard
   * @param {Object} bb.height - Height dimension from bitboard
   * @returns {Actions} Fresh Actions instance for symmetry group operations
   * @example
   * const actions = grid.actions(bitboard);
   * const rotated = actions.applyMap(actions.transformMaps.r90);
   */
  actions (bb) {
    // always create a fresh Actions instance so that symmetry/template
    // calculations reflect the *current* bitboard.  Caching caused the
    // classification to stay fixed to the original mask state (frequently
    // D4 when starting full), leading to an unchanging display.
    return new Actions(this.width, this.height, bb)
  }

  /**
   * Get symmetry group transformation capabilities for a bitboard
   *
   * Analyzes the current bitboard state and determines which symmetry operations
   * (rotation, flip) produce a different result than the identity transformation.
   * Used to show which transformations are meaningful/applicable in the UI.
   * Compares transformed states against the template (identity) state.
   *
   * @param {Object} bb - Bitboard/mask object with transformation capabilities
   * @param {Object} bb.actions - Actions instance with transform capabilities
   * @param {Function} bb.actions.applyMap - Method to apply transformation map to bitboard
   * @param {Object} bb.actions.transformMaps - Map object with symmetry transformations (r90, r270, fx, fy)
   * @param {Object} bb.actions.template - Identity/original state for comparison
   * @returns {TransformCapabilities} Object with boolean flags for each transformation capability
   * @example
   * const caps = grid.getTransformCapabilities(bitboard);
   * if (caps.canRotateCW) { rotateButton.enabled = true; }
   * if (caps.canFlipH) { flipHButton.enabled = true; }
   */
  getTransformCapabilities (bb) {
    // @ts-ignore - bb.actions type is loose, but methods exist at runtime
    const actions = bb.actions
    const maps = actions.transformMaps
    const template = actions.template

    return /** @type {TransformCapabilities} */ ({
      canRotateCW: actions.applyMap(maps.r90) !== template,
      canRotateCCW: actions.applyMap(maps.r270) !== template,
      canFlipH: actions.applyMap(maps.fx) !== template,
      canFlipV: actions.applyMap(maps.fy) !== template
    })
  }

  /**
   * Get neighbors of a cell based on current connectivity mode
   *
   * Returns all neighbors according to this.connectType ('4', '8', or '4diag').
   * Uses current validation mode (wrap or clamp) for boundary handling.
   * The number of returned neighbors depends on the connectivity mode and location:
   * - '4': 2-4 orthogonal neighbors (up, down, left, right)
   * - '8': 3-8 king-connected neighbors (orthogonal + diagonal)
   * - '4diag': 1-4 diagonal neighbors (NE, SE, SW, NW)
   * Delegates to parent class internal method _getConnectionResult.
   *
   * @param {number} x - X coordinate (0-based column)
   * @param {number} y - Y coordinate (0-based row)
   * @returns {Array<Location>} Array of [x, y] neighbor coordinates (may be empty if isolated)
   * @example
   * grid.connectType = '8';          // King-connected mode
   * const neighbors = grid.neighbors(5, 5); // Get up to 8 surrounding cells
   * @protected
   */
  neighbors (x, y) {
    // @ts-ignore - parent Indexer class has private _getConnectionResult
    return this._getConnectionResult(this.connectType, 'neighbors', x, y)
  }

  /**
   * Get orthogonal (4-connected) neighbors of a cell
   *
   * Returns up, down, left, right neighbors regardless of current connectivity mode.
   * Uses current validation mode (wrap or clamp) for boundary handling.
   * At edges, returns fewer neighbors (2-4 depending on position).
   *
   * @param {number} x - X coordinate (0-based column)
   * @param {number} y - Y coordinate (0-based row)
   * @returns {Array<Location>} Array of [x, y] orthogonal neighbor coordinates (2-4 neighbors)
   * @example
   * const orthoNeighbors = grid.othoNeighbors(5, 5); // Up, down, left, right only
   * @protected
   */
  othoNeighbors (x, y) {
    // @ts-ignore - parent Indexer class has private _getConnectionResult
    return this._getConnectionResult('4', 'neighbors', x, y)
  }

  /**
   * Get diagonal (4diag-connected) neighbors of a cell
   *
   * Returns diagonal neighbors (NE, SE, SW, NW) regardless of current connectivity mode.
   * Uses current validation mode (wrap or clamp) for boundary handling.
   * At edges, returns fewer neighbors (1-4 depending on position).
   *
   * @param {number} x - X coordinate (0-based column)
   * @param {number} y - Y coordinate (0-based row)
   * @returns {Array<Location>} Array of [x, y] diagonal neighbor coordinates (1-4 neighbors)
   * @example
   * const diagNeighbors = grid.diagNeighbors(5, 5); // Diagonal neighbors only (NE, SE, SW, NW)
   * @protected
   */
  diagNeighbors (x, y) {
    // @ts-ignore - parent Indexer class has private _getConnectionResult
    return this._getConnectionResult('4diag', 'neighbors', x, y)
  }

  /**
   * Get all 8-connected neighbors (king-connected area)
   *
   * Returns all 8 surrounding cells (orthogonal + diagonal neighbors) regardless of
   * current connectivity mode setting. Uses current validation mode (wrap or clamp) for boundaries.
   * At edges, returns fewer neighbors (3-8 depending on position).
   *
   * @param {number} x - X coordinate (0-based column)
   * @param {number} y - Y coordinate (0-based row)
   * @returns {Array<Location>} Array of [x, y] coordinates for all surrounding cells (3-8 neighbors)
   * @example
   * const area = grid.area(5, 5); // All 8 surrounding cells (up to 8)
   * @protected
   */
  area (x, y) {
    // @ts-ignore - parent Indexer class has private _getConnectionResult
    return this._getConnectionResult('8', 'area', x, y)
  }

  // ============================================================================
  // CONCEPT: Grid Traversal (Key generators organized by algorithm type)
  // ============================================================================

  /**
   * Generate all row indices in order
   *
   * Yields each row index from 0 to height-1 in sequence. Useful for iterating over
   * horizontal slices of the grid or processing grid rows sequentially.
   *
   * @returns {Generator<number>} Generator yielding row indices [0, 1, ..., height-1]
   * @example
   * for (const y of grid.rows()) {
   *   // Process each row y
   *   for (const x of grid.row(y)) {
   *     process(x, y);
   *   }
   * }
   */
  *rows () {
    for (let y = 0; y < this.height; y++) {
      yield y
    }
  }

  /**
   * Get horizontal padding string (placeholder)
   *
   * Returns empty string by default. This method is a placeholder for subclasses or
   * calling code to add visual padding/spacing between rows when printing/displaying grids.
   * Override in subclasses to customize row display formatting.
   *
   * @returns {string} Padding string (empty by default, override to customize)
   * @protected
   * @example
   * class FormattedRectIndex extends RectIndex {
   *   rowPadding() { return '\\n'; }
   * }
   */
  rowPadding () {
    return ''
  }

  /**
   * Get cell padding string (placeholder)
   *
   * Returns empty string by default. This method is a placeholder for subclasses or
   * calling code to add visual spacing/padding between cells when printing/displaying grids.
   * Override in subclasses to customize cell display formatting.
   *
   * @returns {string} Padding string (empty by default, override to customize)
   * @protected
   * @example
   * class FormattedRectIndex extends RectIndex {
   *   cellPadding() { return ' '; }  // Space between cells
   * }
   */
  cellPadding () {
    return ''
  }

  /**
   * Generate all cells in a specific row
   *
   * Yields [x, y] coordinates for each cell in the given row, from x=0 to x=width-1.
   * Useful for iterating over cells in a horizontal line or processing rows cell-by-cell.
   *
   * @param {number} y - Row index (0-based, should be in [0, height))
   * @returns {Generator<Location>} Generator yielding [x, y] coordinates for each cell in row y
   * @example
   * for (const [x, y] of grid.row(5)) {
   *   // Process cell at (x, 5)
   *   console.log(`Processing cell (${x}, 5)`);
   * }
   */
  *row (y) {
    for (let x = 0; x < this.width; x++) {
      yield /** @type {Location} */ ([x, y])
    }
  }
}
