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
 * @property {Connect4} 4 - Orthogonal connectivity (up, down, left, right)
 * @property {Connect4Diagonal} 4diag - Diagonal connectivity (diagonals only)
 * @property {Connect8} 8 - King-connected (edges and diagonals)
 */

/**
 * @typedef {Object} TransformCapabilities
 * @property {boolean} canRotateCW - Can rotate 90° clockwise
 * @property {boolean} canRotateCCW - Can rotate 90° counter-clockwise
 * @property {boolean} canFlipH - Can flip horizontally
 * @property {boolean} canFlipV - Can flip vertically
 */

/**
 * @typedef {Object} Location
 * @property {number} 0 - X coordinate (column, 0-based)
 * @property {number} 1 - Y coordinate (row, 0-based)
 */

/**
 * @typedef {Object} ValidatedCoordinates
 * @property {number} 0 - Validated or transformed X coordinate (may be null if invalid)
 * @property {number} 1 - Validated or transformed Y coordinate (may be null if invalid)
 */

/**
 * Modulo operator with proper handling of negative numbers
 *
 * Computes n mod m with result always in range [0, m), even for negative n.
 * Formula: ((n % m) + m) % m ensures positive result.
 *
 * @param {number} n - Dividend (any integer)
 * @param {number} m - Divisor (must be positive integer)
 * @returns {number} Remainder in range [0, m) (non-negative)
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
 * - Efficient 2D ↔ 1D index conversion
 * - Multiple connectivity types for neighbor queries
 * - Clamp and wrap validation modes for boundary handling
 * - Line drawing algorithms (normal, half, super coverage)
 * - Grid traversal generators (rows, cells)
 * - Symmetry group capabilities detection (rotation, flip)
 *
 * @class RectIndex
 * @extends Indexer
 * @example
 * const index = new RectIndex(10, 10);
 * const cellIdx = index.index(5, 3);        // Get 1D index from (x, y)
 * const [x, y] = index.location(cellIdx);   // Get (x, y) from 1D index
 * const neighbors = index.neighbors(5, 3);  // Get 8-connected neighbors
 */
export class RectIndex extends Indexer {
  /**
   * Initialize rectangular grid index
   *
   * Creates a new rectangular grid index with specified dimensions.
   * Initializes coverage algorithms, connectivity objects, and traversal iterators.
   * Defaults to 8-connected neighbors with clamping boundary mode.
   *
   * @param {number} width - Grid width in cells (must be > 0)
   * @param {number} height - Grid height in cells (must be > 0)
   * @throws {Error} If width or height is not a positive integer
   * @example
   * const grid = new RectIndex(8, 12); // 8x12 rectangular grid
   */
  constructor (width, height) {
    super(width * height)
    /** @type {number} Grid width in cells (positive integer) */
    this.width = width
    /** @type {number} Grid height in cells (positive integer) */
    this.height = height
    /** @type {boolean} Whether wrapping is enabled (false = clamping) */
    this._wrap = false
    /** @type {Function} Validation function: validateClamp or validateWrap */
    this.validate = this.validateClamp
    /** @type {string} Current connectivity type: '4', '8', or '4diag' */
    this.connectType = '8'
    /** @type {CoverTypes} Coverage algorithms for line drawing */
    this.cover = {
      normal: new RectNormalCover(this),
      half: new RectHalfCover(this),
      super: new RectSuperCover(this)
    }
    /** @type {ConnectionTypes} Connectivity definitions for neighbor queries */
    this.connection = {
      4: new Connect4(this),
      '4diag': new Connect4Diagonal(this),
      8: new Connect8(this)
    }
    this._installIndexIteratorWrappers()
  }

  /**
   * Draw line using normal/full coverage algorithm
   *
   * Delegates to RectNormalCover for line drawing with standard Bresenham-like algorithm.
   * Includes all pixels on the line between start and end points.
   *
   * @param {...*} args - Arguments to pass to RectNormalCover.step()
   * @returns {*} Result from normal coverage step method
   * @see RectNormalCover#step
   */
  step (...args) {
    return this.cover.normal.step(...args)
  }

  /**
   * Draw line with movement tracking using normal coverage
   *
   * Delegates to RectNormalCover for line drawing that tracks movement direction.
   *
   * @param {...*} args - Arguments to pass to RectNormalCover.stepMove()
   * @returns {*} Result from normal coverage stepMove method
   * @see RectNormalCover#stepMove
   */
  stepMove (...args) {
    return this.cover.normal.stepMove(...args)
  }

  /**
   * Convert 2D grid coordinates to 1D linear index
   *
   * Computes index using row-major order: index = y * width + x
   * No bounds checking; caller responsible for valid coordinates.
   *
   * @param {number} x - X coordinate/column (0-based, must be in [0, width))
   * @param {number} y - Y coordinate/row (0-based, must be in [0, height))
   * @returns {number} Linear index in range [0, width * height) (non-negative)
   * @example
   * const idx = grid.index(5, 3); // Get index for column 5, row 3
   */
  index (x, y) {
    return y * this.width + x
  }

  /**
   * Convert 1D linear index to 2D grid coordinates
   *
   * Recovers (x, y) from linear index using row-major decomposition.
   * Formula: x = i % width, y = floor(i / width)
   * No bounds checking on index value.
   *
   * @param {number} i - Linear index (should be in [0, width * height))
   * @returns {Location} Array [x, y] where x is column, y is row (both 0-based)
   * @example
   * const [x, y] = grid.location(15); // Get (x, y) for index 15
   */
  location (i) {
    const x = i % this.width
    const y = Math.floor(i / this.width)
    return [x, y]
  }

  /**
   * Check if coordinates are within grid bounds
   *
   * Uses unsigned right shift (>>>) for fast non-negative check.
   * Valid coordinates: 0 ≤ x < width AND 0 ≤ y < height
   *
   * @param {number} x - X coordinate to validate (0-based column)
   * @param {number} y - Y coordinate to validate (0-based row)
   * @returns {boolean} True if coordinates are in bounds, false otherwise
   * @example
   * if (grid.isValid(x, y)) { ... }
   */
  isValid (x, y) {
    return x >>> 0 < this.width && y >>> 0 < this.height
  }
  /**
   * Enable wrapping (toroidal) boundary mode
   *
   * Switches to wrapping validation where coordinates outside bounds are wrapped
   * using modulo arithmetic. Creates a toroidal (donut-shaped) topology where
   * the edges connect to opposite edges.
   *
   * @example
   * grid.wrap(); // Enable wrapping
   * grid.validate(10, 5);  // On 10x10 grid: [0, 5]
   */
  wrap () {
    this._wrap = true
    this.validate = this.validateWrap
  }

  /**
   * Enable clamping (clipping) boundary mode
   *
   * Switches to clamping validation where coordinates outside bounds are rejected
   * (return null) rather than wrapped. This is the default mode.
   *
   * @example
   * grid.clamp(); // Enable clamping (default)
   * grid.validate(10, 5);  // On 10x10 grid: null
   */
  clamp () {
    this._wrap = false
    this.validate = this.validateClamp
  }

  /**
   * Validate coordinates using clamping (boundary clipping)
   *
   * Checks if coordinates are within bounds. Returns null if out of bounds.
   * Default validation mode.
   *
   * @param {number} x - X coordinate to validate (0-based column)
   * @param {number} y - Y coordinate to validate (0-based row)
   * @returns {Location|null} Coordinates if valid, null if out of bounds
   * @private
   */
  validateClamp (x, y) {
    if (this.isValid(x, y)) return [x, y]
    return null
  }

  /**
   * Validate coordinates using wrapping (toroidal topology)
   *
   * Maps coordinates to equivalent positions within bounds using modulo arithmetic.
   * Creates a toroidal (wrap-around) topology. Always returns valid coordinates.
   *
   * @param {number} x - X coordinate (any integer, including negative)
   * @param {number} y - Y coordinate (any integer, including negative)
   * @returns {Location} Wrapped coordinates in range [0, width) × [0, height)
   * @private
   */
  validateWrap (x, y) {
    const wrappedX = mod(x, this.width)
    const wrappedY = mod(y, this.height)
    return [wrappedX, wrappedY]
  }

  /**
   * Create a new resized RectIndex with same configuration
   *
   * Creates a new RectIndex with different dimensions but preserving the
   * current boundary mode (wrap or clamp).
   *
   * @param {number} width - New grid width (must be positive integer)
   * @param {number} height - New grid height (must be positive integer)
   * @returns {RectIndex} New RectIndex with specified dimensions and same boundary mode
   * @example
   * grid.wrap();
   * const resized = grid.resized(20, 20); // New 20x20 grid, also wrapped
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
   * Determines which symmetry operations (rotation, flip) produce a different
   * result than the identity transformation for the given bitboard.
   * Used to show available transformations in UI.
   *
   * @param {Object} bb - Bitboard/mask object with transformation maps and template
   * @param {Object} bb.actions - Actions instance with transform capabilities
   * @param {Object} bb.actions.transformMaps - Map of symmetry transformations
   * @param {Object} bb.actions.template - Identity/original state
   * @returns {TransformCapabilities} Object indicating which transforms are possible
   * @example
   * const caps = grid.getTransformCapabilities(bitboard);
   * if (caps.canRotateCW) { rotateButton.enabled = true; }
   */
  getTransformCapabilities (bb) {
    const actions = bb.actions
    const maps = actions.transformMaps
    const template = actions.template

    return {
      canRotateCW: actions.applyMap(maps.r90) !== template,
      canRotateCCW: actions.applyMap(maps.r270) !== template,
      canFlipH: actions.applyMap(maps.fx) !== template,
      canFlipV: actions.applyMap(maps.fy) !== template
    }
  }

  /**
   * Get neighbors of a cell based on current connectivity mode
   *
   * Returns all neighbors according to this.connectType ('4', '8', or '4diag').
   * Uses current validation mode (wrap or clamp) for boundary handling.
   *
   * @param {number} x - X coordinate (0-based column)
   * @param {number} y - Y coordinate (0-based row)
   * @returns {Array<Location>} Array of [x, y] neighbor coordinates (may be empty if isolated)
   * @example
   * grid.connectType = '8'; // King-connected mode
   * const neighbors = grid.neighbors(5, 5); // Get 8 surrounding cells
   */
  neighbors (x, y) {
    return this._getConnectionResult(this.connectType, 'neighbors', x, y)
  }

  /**
   * Get orthogonal (4-connected) neighbors of a cell
   *
   * Returns up, down, left, right neighbors regardless of current connectivity mode.
   * Uses current validation mode (wrap or clamp) for boundary handling.
   *
   * @param {number} x - X coordinate (0-based column)
   * @param {number} y - Y coordinate (0-based row)
   * @returns {Array<Location>} Array of [x, y] orthogonal neighbor coordinates (max 4 or fewer at edges)
   * @example
   * const orthoNeighbors = grid.othoNeighbors(5, 5); // Up, down, left, right only
   */
  othoNeighbors (x, y) {
    return this._getConnectionResult('4', 'neighbors', x, y)
  }

  /**
   * Get diagonal (4diag-connected) neighbors of a cell
   *
   * Returns diagonal neighbors (NE, SE, SW, NW) regardless of current connectivity mode.
   * Uses current validation mode (wrap or clamp) for boundary handling.
   *
   * @param {number} x - X coordinate (0-based column)
   * @param {number} y - Y coordinate (0-based row)
   * @returns {Array<Location>} Array of [x, y] diagonal neighbor coordinates (max 4 or fewer at edges)
   * @example
   * const diagNeighbors = grid.diagNeighbors(5, 5); // Diagonal neighbors only
   */
  diagNeighbors (x, y) {
    return this._getConnectionResult('4diag', 'neighbors', x, y)
  }

  /**
   * Get all 8-connected neighbors (king-connected area)
   *
   * Returns all 8 surrounding cells (orthogonal + diagonal) regardless of
   * current connectivity mode. Uses current validation mode for boundaries.
   *
   * @param {number} x - X coordinate (0-based column)
   * @param {number} y - Y coordinate (0-based row)
   * @returns {Array<Location>} Array of [x, y] coordinates for all surrounding cells (max 8 or fewer at edges)
   * @example
   * const area = grid.area(5, 5); // All 8 surrounding cells
   */
  area (x, y) {
    return this._getConnectionResult('8', 'area', x, y)
  }

  // ============================================================================
  // CONCEPT: Grid Traversal (Key generators organized by algorithm type)
  // ============================================================================

  /**
   * Generate all row indices in order
   *
   * Yields each row index from 0 to height-1. Useful for iterating over
   * horizontal slices of the grid.
   *
   * @returns {Generator<number>} Generator yielding row indices [0, 1, ..., height-1]
   * @example
   * for (const y of grid.rows()) {
   *   // Process row y
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
   * Returns empty string. Subclasses or calling code may override
   * to add visual padding between rows when printing grids.
   *
   * @returns {string} Padding string (empty by default)
   * @private
   */
  rowPadding () {
    return ''
  }

  /**
   * Get cell padding string (placeholder)
   *
   * Returns empty string. Subclasses or calling code may override
   * to add visual spacing between cells when printing grids.
   *
   * @returns {string} Padding string (empty by default)
   * @private
   */
  cellPadding () {
    return ''
  }

  /**
   * Generate all cells in a specific row
   *
   * Yields [x, y] coordinates for each cell in the given row, from x=0 to x=width-1.
   * Useful for iterating over cells in a horizontal line.
   *
   * @param {number} y - Row index (0-based, must be in [0, height))
   * @returns {Generator<Location>} Generator yielding [x, y] coordinates for each cell in row y
   * @example
   * for (const [x, y] of grid.row(5)) {
   *   // Process cell at (x, 5)
   * }
   */
  *row (y) {
    for (let x = 0; x < this.width; x++) {
      yield [x, y]
    }
  }
}
