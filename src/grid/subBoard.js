/**
 * @module grid/subBoard
 * @description A windowed view into a larger grid maintaining world-relative coordinates.
 * SubBoard encapsulates a rectangular viewport into a potentially much larger board,
 * automatically handling coordinate transformation between world space (absolute board coordinates)
 * and window-local coordinates. All public APIs work with world coordinates transparently.
 * Supports mask operations, morphological transformations, coordinate serialization,
 * and efficient copy/overlap operations between boards.
 */

import { SubMask } from './SubMask.js'
import { minMaxXY } from '../core/utilities.js'

/**
 * @typedef {import('./MaskBase.js').MaskBase} MaskBase
 * @description Bitboard-based mask implementation for multi-bit cell storage
 */

/**
 * @typedef {import('./rectangle/packed.js').Packed} Packed
 * @description Packed 32-bit mask implementation for efficient storage
 */

/**
 * @typedef {[number, number]} CoordinatePair
 * @description A 2D coordinate pair [x, y] representing a single cell location.
 * X is the column (0-based), Y is the row (0-based). Used for occupancy queries.
 */

/**
 * @typedef {[number, number, number]} CoordinateTuple
 * @description A 2D coordinate with value [x, y, value] for colored/multi-bit grids.
 * X is column, Y is row, value is the cell color/depth (0-255 depending on depth).
 */

/**
 * @typedef {MaskBase|Packed} MaskLike
 * @description Union type for mask implementations.
 * Either a MaskBase (multi-bit bitboard) or Packed (32-bit storage) mask.
 */

/**
 * @typedef {import('../core/utilities.js').MinMaxBounds} MinMaxBounds
 * @description Bounding box information: { minX, maxX, minY, maxY, depth, hasColor }
 */

/**
 * @typedef {import('./SubMask.js').SubMask} SubMaskType
 * @description SubMask windowed view type reference
 */

/**
 * @typedef {Object} SymbolMap
 * @description Custom symbol mapping for ASCII representation.
 * Maps cell values to display characters.
 * @property {string} [key] - Symbol character for each possible cell value
 */

/**
 * A windowed view into a larger grid with transparent world-relative coordinate mapping.
 *
 * SubBoard extends SubMask to provide a rectangular viewport (window) into a potentially
 * much larger game board. It maintains an offset (offsetX, offsetY) that defines the
 * window's position in world space. All public methods work with world coordinates
 * automatically; coordinate transformation between world and local space is handled
 * transparently via protected helper methods.
 *
 * Key features:
 * - World-relative coordinate system (no need to subtract offsets manually)
 * - Automatic bounds checking for world coordinates
 * - Efficient mask operations with copy/overlap/morphology
 * - Coordinate serialization for save/load and network transmission
 * - Static factory methods for creating SubBoards from various inputs
 * - Iterator support for occupied cells in world coordinates
 *
 * @extends SubMask
 * @class SubBoard
 */
/**
 * @ts-expect-error SubBoard overrides private methods from SubMask (_removeOffset, _isInWindow)
 * which is necessary for transparent world-coordinate transformation. The overrides are internal
 * implementation details that don't affect the public API contract.
 * @class SubBoard
 */
// @ts-expect-error
export class SubBoard extends SubMask {
  /**
   * Create a windowed grid view with world-relative coordinate system.
   *
   * Initializes a SubBoard representing a rectangular window into a larger board.
   * If no base mask is provided, creates an empty mask using the template's
   * emptyMaskOfSize method. Automatically calls SubMask's constructor to set up
   * offset and window dimensions.
   *
   * @constructor
   * @param {number} offsetX - X offset of window's top-left corner in world space.
   * Must be a non-negative integer representing absolute board column.
   * @param {number} offsetY - Y offset of window's top-left corner in world space.
   * Must be a non-negative integer representing absolute board row.
   * @param {number} width - Window width in cells. Must be a positive integer.
   * Represents the number of columns visible in this window.
   * @param {number} height - Window height in cells. Must be a positive integer.
   * Represents the number of rows visible in this window.
   * @param {MaskBase|Packed|null} [base] - Base mask to use, or null to create from template.
   * If null, creates empty mask via template.emptyMaskOfSize(width, height, depth).
   * @param {MaskBase|Packed} [template] - Template mask for creating empty masks.
   * Required when base is null. Used for emptyMaskOfSize and depth queries.
   * @param {number} [depth] - Color depth for multi-bit masks (bits per cell).
   * Optional; defaults to template's depth if not specified.
   * @throws {Error} If base is null and template is not provided
   */
  constructor (offsetX, offsetY, width, height, base, template, depth) {
    const mask = base || SubBoard._buildBaseMask(template, width, height, depth)
    super(mask, offsetX, offsetY, width, height)
  }

  /**
   * Build the underlying base mask when one is not provided.
   *
   * Static helper method that creates an empty mask for a new SubBoard when
   * no existing base mask is available. Delegates to the template's emptyMaskOfSize
   * method to ensure the new mask is compatible with the template's implementation.
   * This pattern allows SubBoard to work with any mask type (MaskBase or Packed).
   *
   * @static
   * @private
   * @param {MaskLike|null|undefined} template - Template mask used to create the underlying window mask.
   * Must provide an emptyMaskOfSize(width, height, depth) method.
   * @param {number} width - Width of the window in cells. Must be positive.
   * @param {number} height - Height of the window in cells. Must be positive.
   * @param {number} [depth] - Desired bit depth for the new mask.
   * Optional; if not provided, template's default depth is used.
   * @returns {MaskLike} The created base mask, same type as template.
   * @throws {Error} If template is null/undefined, indicating no mask type available
   */
  static _buildBaseMask (template, width, height, depth) {
    if (!template) {
      throw new Error(
        'SubBoard requires a template mask when no base mask is provided.'
      )
    }
    return template.emptyMaskOfSize(width, height, depth)
  }

  // ============================================================================
  // COORDINATE TRANSFORMATION - Core utilities for world <-> local conversion
  // ============================================================================

  /**
   * Convert world coordinates to local mask coordinates.
   *
   * Transforms a world-space coordinate (absolute board position) to the
   * corresponding local position within this window's coordinate system.
   * Simple subtraction: [worldX - offsetX, worldY - offsetY].
   *
   * @protected
   * @param {number} worldX - Absolute board column coordinate. Must be within window bounds.
   * @param {number} worldY - Absolute board row coordinate. Must be within window bounds.
   * @returns {CoordinatePair} [localX, localY] coordinates in window-local space.
   * If world coordinates are within bounds, returns [0..windowWidth-1, 0..windowHeight-1].
   *
   * @example
   * const board = new SubBoard(10, 5, 8, 8, ...);
   * const [localX, localY] = board._worldToLocal(15, 10);
   * // Returns [5, 5] (world coords 15,10 map to local 5,5 within window)
   */
  _worldToLocal (worldX, worldY) {
    return [worldX - this.offsetX, worldY - this.offsetY]
  }

  /**
   * Convert local mask coordinates to world coordinates.
   *
   * Transforms a local position (within this window) to the corresponding
   * world-space position (absolute board coordinate).
   * Simple addition: [localX + offsetX, localY + offsetY].
   *
   * @protected
   * @param {number} localX - Window-local column coordinate [0..windowWidth-1].
   * @param {number} localY - Window-local row coordinate [0..windowHeight-1].
   * @returns {CoordinatePair} [worldX, worldY] coordinates in absolute board space.
   * Maps local coords to their absolute positions on the board.
   *
   * @example
   * const board = new SubBoard(10, 5, 8, 8, ...);
   * const [worldX, worldY] = board._localToWorld(5, 5);
   * // Returns [15, 10] (local position 5,5 maps to absolute 15,10 on board)
   */
  _localToWorld (localX, localY) {
    return [localX + this.offsetX, localY + this.offsetY]
  }

  /**
   * Apply offset transformation (world to local coordinates).
   *
   * Override of SubMask's _applyOffset method. Provides transparent coordinate
   * transformation for public APIs. Delegates to _worldToLocal for consistent
   * offset handling throughout the class.
   *
   * @ts-expect-error Override of private method - necessary for world coordinate system
   * @protected
   * @param {number} worldX - World space X coordinate (absolute board position).
   * @param {number} worldY - World space Y coordinate (absolute board position).
   * @returns {CoordinatePair} [localX, localY] coordinates in window-local space.
   * Equivalent to subtracting the window offset.
   * @see _worldToLocal
   */
  _applyOffset (worldX, worldY) {
    return this._worldToLocal(worldX, worldY)
  }

  /**
   * Remove offset transformation (local to world coordinates).
   *
   * Override of SubMask's _removeOffset method. Provides transparent coordinate
   * transformation for public APIs. Delegates to _localToWorld for consistent
   * offset handling throughout the class.
   *
   * @ts-expect-error Override of private method - necessary for world coordinate system
   * @protected
   * @param {number} localX - Window-local X coordinate (relative to window origin).
   * @param {number} localY - Window-local Y coordinate (relative to window origin).
   * @returns {CoordinatePair} [worldX, worldY] coordinates in absolute board space.
   * Equivalent to adding the window offset.
   * @see _localToWorld
   */
  _removeOffset (localX, localY) {
    return this._localToWorld(localX, localY)
  }

  /**
   * Check if world coordinates are within window (override of SubMask method).
   *
   * Override of SubMask's _isInWindow method for consistency with world-coordinate
   * semantics. Delegates to _isInWorldBounds which checks against the window's
   * absolute position on the board.
   *
   * @ts-expect-error Override of private method - necessary for world coordinate system
   * @protected
   * @param {number} worldX - World space X coordinate (absolute board position).
   * @param {number} worldY - World space Y coordinate (absolute board position).
   * @returns {boolean} True if coordinates fall within this window's bounds;
   * false otherwise.
   * @see _isInWorldBounds
   */
  _isInWindow (worldX, worldY) {
    return this._isInWorldBounds(worldX, worldY)
  }

  /**
   * Check if world coordinates are within this SubBoard's bounds.
   *
   * Validates whether a world-space coordinate falls within the rectangular
   * region defined by this window. Used for bounds checking before operations.
   * Checks if coordinate is within the range [offsetX, offsetX+windowWidth) x [offsetY, offsetY+windowHeight).
   *
   * @protected
   * @param {number} worldX - World space X coordinate (absolute board column).
   * @param {number} worldY - World space Y coordinate (absolute board row).
   * @returns {boolean} True if (worldX, worldY) falls within the window bounds;
   * false if outside the window region.
   *
   * @example
   * const board = new SubBoard(10, 5, 8, 8, ...);
   * board._isInWorldBounds(15, 10);  // true (within bounds)
   * board._isInWorldBounds(8, 10);   // false (left of window)
   * board._isInWorldBounds(20, 15);  // false (right/below window)
   */
  _isInWorldBounds (worldX, worldY) {
    return (
      worldX >= this.offsetX &&
      worldX < this.offsetX + this.windowWidth &&
      worldY >= this.offsetY &&
      worldY < this.offsetY + this.windowHeight
    )
  }

  /**
   * Create a human-readable description of the SubBoard's world-space bounds.
   *
   * Generates a formatted string describing the rectangular region occupied
   * by this window in world coordinates. Used in error messages for debugging.
   * Format: "[minX, maxX] x [minY, maxY]" where bounds are inclusive.
   *
   * @private
   * @returns {string} Bounds description like "[10, 17] x [5, 12]" for error messages.
   * Shows the inclusive coordinate ranges for X and Y axes.
   */
  _boundsDescription () {
    return `[${this.offsetX}, ${this.offsetX + this.windowWidth - 1}] x [${
      this.offsetY
    }, ${this.offsetY + this.windowHeight - 1}]`
  }

  /**
   * Assert world-relative coordinates are inside the window.
   *
   * Validates that provided world coordinates fall within this window's bounds.
   * If valid, converts to local coordinates. If invalid, throws an error with
   * detailed bounds information. Used internally to enforce bounds checking
   * on all public coordinate-taking methods.
   *
   * @private
   * @param {number} worldX - World space X coordinate to validate.
   * @param {number} worldY - World space Y coordinate to validate.
   * @returns {CoordinatePair} [localX, localY] converted to window-local coordinates
   * if validation succeeds.
   * @throws {Error} If coordinates are outside window bounds, with message showing
   * both the invalid coordinates and the valid bounds range.
   *
   * @example
   * const board = new SubBoard(10, 5, 8, 8, ...);
   * const [lx, ly] = board._assertWorldCoordinates(15, 10); // Returns [5, 5]
   * // board._assertWorldCoordinates(8, 10); // Throws: Coordinates (8, 10) out of window bounds [10, 17] x [5, 12]
   */
  _assertWorldCoordinates (worldX, worldY) {
    if (!this._isInWorldBounds(worldX, worldY)) {
      throw new Error(
        `Coordinates (${worldX}, ${worldY}) out of window bounds ${this._boundsDescription()}`
      )
    }
    return this._worldToLocal(worldX, worldY)
  }

  // ============================================================================
  // ELEMENT ACCESS - Get/set values with world-relative coordinates
  // ============================================================================

  /**
   * Set value at world-relative coordinates.
   *
   * Sets a cell value at the specified world-space coordinate. Automatically
   * converts to local coordinates and validates bounds. Throws if coordinates
   * are outside the window. The color value is clamped to the mask's depth.
   *
   * @param {number} worldX - World space column coordinate (absolute board position).
   * @param {number} worldY - World space row coordinate (absolute board position).
   * @param {number} [color=1] - Color/value to set at the cell.
   * Valid range is [0, 2^bitsPerCell - 1]. Defaults to 1 (occupied).
   * @returns {bigint} The updated bitboard value at that cell position.
   * @throws {Error} If coordinates are outside the window bounds.
   *
   * @example
   * const board = new SubBoard(10, 5, 8, 8, ...);
   * board.set(15, 10, 5); // Set world position (15,10) to color 5
   */
  set (worldX, worldY, color = 1) {
    const [localX, localY] = this._assertWorldCoordinates(worldX, worldY)
    return this.mask.set(localX, localY, color)
  }

  /**
   * Read a value from world-relative coordinates.
   *
   * Retrieves the cell value at world-space coordinates. Returns null if
   * coordinates are outside the window (safe access). This is the only read
   * method that doesn't throw on out-of-bounds access.
   *
   * @param {number} worldX - World space column coordinate (absolute board position).
   * @param {number} worldY - World space row coordinate (absolute board position).
   * @param {number} [depth=0] - Depth layer/color plane to read.
   * For single-bit grids, use depth=0. For multi-bit, 0 is occupancy layer.
   * @returns {number|null} Value at the world coordinate if within bounds;
   * null if outside the window region. Value range depends on depth and bitsPerCell.
   *
   * @example
   * const board = new SubBoard(10, 5, 8, 8, ...);
   * const value = board.at(15, 10);    // Read world position (15,10)
   * // Returns value or null if outside bounds
   */
  at (worldX, worldY, depth = 0) {
    if (!this._isInWorldBounds(worldX, worldY)) {
      return null
    }
    const [localX, localY] = this._worldToLocal(worldX, worldY)
    return this.mask.at(localX, localY, depth)
  }

  /**
   * Get the window-relative index for world coordinates.
   *
   * Computes the linear index (position in the flat mask array) for a
   * world-space coordinate. Returns -1 if coordinates are outside the window.
   * Useful for direct bitboard access and indexing into mask storage.
   *
   * @param {number} worldX - World space column coordinate (absolute board position).
   * @param {number} worldY - World space row coordinate (absolute board position).
   * @returns {number} Index in the underlying mask [0, windowWidth*windowHeight),
   * or -1 if coordinates are outside window bounds.
   *
   * @example
   * const board = new SubBoard(10, 5, 8, 8, ...);
   * const idx = board.index(15, 10); // Index for world position (15,10)
   * // For 8x8 window, valid indices are [0..63]; returns -1 if outside
   */
  index (worldX, worldY) {
    if (!this._isInWorldBounds(worldX, worldY)) {
      return -1
    }
    const [localX, localY] = this._worldToLocal(worldX, worldY)
    return this.mask.index(localX, localY)
  }

  /**
   * Check if world-relative coordinates are valid (within window bounds).
   *
   * Override of SubMask's isValid method to work with world-space coordinates
   * instead of local coordinates. Returns true if the world coordinate falls
   * within this window's bounds.
   *
   * @param {number} worldX - World space X coordinate (absolute board position).
   * @param {number} worldY - World space Y coordinate (absolute board position).
   * @returns {boolean} True if coordinate is within window bounds; false otherwise.
   *
   * @example
   * const board = new SubBoard(10, 5, 8, 8, ...);
   * board.isValid(15, 10); // true (within bounds)
   * board.isValid(5, 10);  // false (outside window)
   */
  isValid (worldX, worldY) {
    return this._isInWorldBounds(worldX, worldY)
  }

  // ============================================================================
  // ITERATION - Generators for occupied cells in world coordinates
  // ============================================================================

  /**
   * Generator yielding occupied cell locations in world coordinates.
   *
   * Iterates through all occupied (non-zero) cells in the window, yielding
   * their world-space coordinates. Automatically transforms local mask
   * coordinates to world coordinates using _localToWorld.
   *
   * @generator
   * @yields {CoordinatePair} [worldX, worldY] coordinates of occupied cells.
   * Coordinates are in world space (absolute board positions).
   * @returns {Generator<CoordinatePair, void, undefined>} Generator yielding world coordinate pairs.
   *
   * @example
   * const board = new SubBoard(10, 5, 8, 8, ...);
   * for (const [x, y] of board.occupiedLocations()) {
   *   console.log(`Occupied cell at world position (${x}, ${y})`);
   * }
   */
  *occupiedLocations () {
    for (const [localX, localY] of this.mask.occupiedLocations()) {
      yield this._localToWorld(localX, localY)
    }
  }

  /**
   * Generator yielding occupied cell locations and values in world coordinates.
   *
   * Iterates through all occupied (non-zero) cells, yielding tuples of
   * world-space coordinates plus the cell value. Useful for serialization,
   * copying, and analyzing the grid contents with position and color info.
   *
   * @generator
   * @yields {CoordinateTuple} [worldX, worldY, value] tuples of occupied cells.
   * Coordinates are in world space; value is the cell color/occupancy.
   * @returns {Generator<CoordinateTuple, void, undefined>} Generator yielding world coord + value tuples.
   *
   * @example
   * const board = new SubBoard(10, 5, 8, 8, ...);
   * for (const [x, y, color] of board.occupiedLocationsAndValues()) {
   *   console.log(`Cell at world (${x}, ${y}) has color ${color}`);
   * }
   */
  *occupiedLocationsAndValues () {
    for (const [
      localX,
      localY,
      value
    ] of this.mask.occupiedLocationsAndValues()) {
      yield [...this._localToWorld(localX, localY), value]
    }
  }

  /**
   * Convert all occupied window cells to world-relative coordinate tuples.
   *
   * Efficiently collects all occupied cell positions and values as an array
   * of [worldX, worldY, value] tuples in world coordinates. Uses Array.from
   * with occupiedLocationsAndValues generator for memory efficiency.
   * Useful for serialization and bulk operations.
   *
   * @returns {Array<CoordinateTuple>} Array of [worldX, worldY, value] tuples
   * for all occupied cells in this window, expressed in world coordinates.
   * Empty array if no cells are occupied.
   *
   * @example
   * const board = new SubBoard(10, 5, 8, 8, ...);
   * const coords = board.copyToCoords();
   * // Returns: [[15, 10, 2], [16, 10, 3], [17, 11, 1], ...]
   */
  copyToCoords () {
    return Array.from(
      this.mask.occupiedLocationsAndValues(),
      ([x, y, value]) => [x + this.offsetX, y + this.offsetY, Number(value)]
    )
  }

  // ============================================================================
  // DELEGATION - Properties delegated to underlying mask
  // ============================================================================

  /**
   * The occupancy percentage of the mask (0-1).
   *
   * Getter that delegates to the underlying mask. Returns the fraction of
   * cells that are occupied (non-zero) in the window. Computed as
   * (occupiedCellCount / totalCellCount) where 0 = completely empty, 1 = completely full.
   *
   * @type {number}
   *
   * @example
   * const board = new SubBoard(10, 5, 8, 8, ...);
   * console.log(board.occupancy); // 0.25 for 25% occupancy
   */
  get occupancy () {
    return this.mask.occupancy
  }

  /**
   * ASCII representation of the mask grid.
   *
   * Getter that delegates to the underlying mask. Renders the window contents
   * as a string of ASCII characters, with '.' for empty and digits/letters for occupied.
   * Multi-color grids use 0-9 for colors. Useful for debugging and visualization.
   *
   * @type {string}
   *
   * @example
   * const board = new SubBoard(10, 5, 3, 3, ...);
   * // Might return: "..1\n.11\n111"
   */
  get toAscii () {
    return this.mask.toAscii
  }

  /**
   * Get ASCII representation with custom symbols.
   *
   * Delegates to the underlying mask. Renders window contents with custom
   * characters for each cell value. Useful for generating readable output
   * with application-specific symbols.
   *
   * @param {string[]} [symbols] - Symbol array mapping cell values to characters.
   * symbols[0] for empty, symbols[1] for color 1, etc.
   * If not provided, uses mask's default symbols.
   * @returns {string} ASCII representation using provided custom symbols.
   * Format: one character per cell, newlines between rows.
   *
   * @example
   * const symbols = ['.', '@', '#', '*'];
   * console.log(board.toAsciiWith(symbols));
   * // "..\@\n.\@\@\n###"
   */
  toAsciiWith (symbols) {
    return this.mask.toAsciiWith(symbols)
  }

  /**
   * Minimum dimension of occupied region.
   *
   * Getter that delegates to the underlying mask. Returns the smaller of
   * the occupied region's width and height. Useful for determining shape compactness.
   * Returns 0 if no cells are occupied.
   *
   * @type {number}
   *
   * @example
   * const board = new SubBoard(10, 5, 8, 8, ...);
   * console.log(board.minSize); // Minimum of width and height of occupied cells
   */
  get minSize () {
    return this.mask.minSize
  }

  /**
   * Maximum dimension of occupied region.
   *
   * Getter that delegates to the underlying mask. Returns the larger of
   * the occupied region's width and height.
   *
   * @type {number}
   *
   * @example
   * const board = new SubBoard(10, 5, 8, 8, ...);
   * console.log(board.maxSize); // Maximum of width and height of occupied cells
   */
  get maxSize () {
    return this.mask.maxSize
  }

  /**
   * True if occupied region is taller than wide.
   *
   * Getter that delegates to the underlying mask. Returns true when
   * the occupied region's height exceeds its width. Useful for shape analysis.
   *
   * @type {boolean}
   */
  get isTall () {
    return this.mask.isTall
  }

  /**
   * True if occupied region is wider than tall.
   *
   * Getter that delegates to the underlying mask. Returns true when
   * the occupied region's width exceeds its height.
   *
   * @type {boolean}
   */
  get isWide () {
    return this.mask.isWide
  }

  /**
   * True if occupied region is square.
   *
   * Getter that delegates to the underlying mask. Returns true when
   * the occupied region's width equals its height.
   *
   * @type {boolean}
   */
  get isSquare () {
    return this.mask.isSquare
  }

  // ============================================================================
  // COPY OPERATIONS - Transfer data between masks
  // ============================================================================

  /**
   * Clamp value to target mask's cell mask.
   *
   * Helper method that ensures a value fits within the target mask's color depth.
   * Applies bitwise AND with the target's cellMask to truncate excess high bits.
   * Handles both bigint and number types transparently.
   *
   * @private
   * @param {number|bigint} value - Value to clamp to target mask's depth.
   * @param {number|bigint} targetMask - Target mask value/cell mask for the store.
   * Defines the valid bit range for the cell.
   * @returns {number} Clamped value as a JavaScript number.
   * Value & targetMask, truncated to JS numeric range.
   *
   * @example
   * board._clampToDepth(0xFF, 0x0F); // Returns 0x0F (masks off high byte)
   */
  _clampToDepth (value, targetMask) {
    if (typeof targetMask === 'bigint') {
      return Number(BigInt(value) & targetMask)
    }
    return Number(value) & targetMask
  }

  /**
   * Copy occupied cells from a larger mask into this window.
   *
   * Populates this window by copying occupied cells from a larger source mask.
   * Only copies cells that fall within this window's bounds and have positive values.
   * Uses world-relative coordinate mapping to find corresponding positions in the
   * source mask. Clamps values to this window's depth.
   *
   * @param {MaskBase|Packed} largeMask - Source mask to copy from.
   * Can be larger or smaller than this window's dimensions.
   * @throws {Error} If largeMask doesn't implement the required interface
   *
   * @example
   * const window = new SubBoard(10, 5, 8, 8, null, template);
   * const fullBoard = new SubBoard(0, 0, 50, 50, null, template);
   * window.copyFromMask(fullBoard.mask); // Copy all cells within window bounds
   */
  copyFromMask (largeMask) {
    const depthMask = this.mask.store.cellMask
    for (let y = 0; y < this.windowHeight; y++) {
      for (let x = 0; x < this.windowWidth; x++) {
        const [worldX, worldY] = this._localToWorld(x, y)
        const value = largeMask.at(worldX, worldY)
        if (value > 0) {
          this.mask.set(x, y, this._clampToDepth(value, depthMask))
        }
      }
    }
  }

  /**
   * Copy this window's occupied cells into a larger mask.
   *
   * Populates a target (larger) mask by copying all occupied cells from this
   * window to their world-relative positions in the target. Only copies cells
   * that exist in the target (validated via isValid). Clamps values to the
   * target mask's depth.
   *
   * @param {MaskBase|Packed} largeMask - Target mask to copy to.
   * Typically larger than this window but can be any valid mask.
   * @throws {Error} If largeMask doesn't implement the required interface
   *
   * @example
   * const window = new SubBoard(10, 5, 8, 8, null, template);
   * const fullBoard = new SubBoard(0, 0, 50, 50, null, template);
   * window.copyToMask(fullBoard.mask); // Populate fullBoard from window
   */
  copyToMask (largeMask) {
    const depth = largeMask.store.cellMask
    for (const [worldX, worldY, value] of this.occupiedLocationsAndValues()) {
      if (largeMask.isValid(worldX, worldY)) {
        const clampedValue = this._clampToDepth(value, depth)
        largeMask.set(worldX, worldY, clampedValue)
      }
    }
  }

  /**
   * Compute overlap between this window and a larger mask.
   *
   * Creates a new SubBoard containing only the cells where both this window
   * and the larger mask have occupied cells. Performs a bitwise AND operation
   * between the two masks' bits.
   *
   * @param {MaskBase|Packed} largeMask - Mask to overlap with.
   * @returns {SubBoard} New SubBoard at same position and size containing
   * only cells occupied in both masks.
   *
   * @example
   * const window = new SubBoard(10, 5, 8, 8, ...);
   * const other = new SubBoard(12, 7, 8, 8, ...);
   * const intersection = window.overlap(other.mask);
   * // Returns cells in the overlapping region
   */
  overlap (largeMask) {
    const overlap = this.emptyMask
    overlap.copyFromMask(largeMask)
    overlap.mask.overlapWithBits(this.mask.bits)
    return overlap
  }

  /**
   * Apply this window's cells as an overlap mask onto a larger mask.
   *
   * Modifies this window in place by computing the overlap between a larger
   * source mask and this window's current content. Updates this window to
   * contain only cells occupied in both the source and this window.
   * Used for intersection/AND operations.
   *
   * @param {MaskBase|Packed} largeMask - Mask to overlap with.
   * @modifies this window in place
   *
   * @example
   * const window = new SubBoard(10, 5, 8, 8, ...);
   * const source = new SubBoard(0, 0, 50, 50, ...);
   * window.overlapWith(source.mask); // Modify window to intersection
   */
  overlapWith (largeMask) {
    const overlap = this.emptyMask
    overlap.copyFromMask(largeMask)
    this.mask.overlapWithBits(overlap.mask.bits)
  }

  /**
   * Convert this window to a new mask of specified dimensions.
   *
   * Creates a new mask of the given dimensions and copies this window's
   * occupied cells (local coordinates) into it. Useful for extracting
   * a window's content as a standalone mask object.
   *
   * @param {number} newWidth - Width of the new mask in cells. Must be positive.
   * @param {number} newHeight - Height of the new mask in cells. Must be positive.
   * @returns {MaskBase|Packed} New mask containing this window's local content,
   * positioned at origin (0, 0).
   *
   * @example
   * const window = new SubBoard(10, 5, 8, 8, ...);
   * const extracted = window.toMask(8, 8);
   * // extracted is a new mask with local content at origin
   */
  toMask (newWidth, newHeight) {
    const newMask = this.mask.emptyMaskOfSize(newWidth, newHeight)
    this.copyToMask(newMask)
    return newMask
  }

  /**
   * Convert this window to a new mask matching another mask's dimensions and depth.
   *
   * Creates a new mask with the same width, height, and depth as another mask,
   * then copies this window's occupied cells into it using world-relative positioning.
   * Ensures the new mask is compatible with the template mask in all properties.
   *
   * @param {MaskBase|Packed} otherMask - Template mask to match dimensions/depth from.
   * @returns {MaskBase|Packed} New mask matching otherMask's properties,
   * populated with this window's content at world positions.
   *
   * @example
   * const window = new SubBoard(10, 5, 8, 8, ...);
   * const template = new SubBoard(0, 0, 50, 50, ...);
   * const matched = window.toMaskMatching(template.mask);
   * // matched has same depth/size as template
   */
  toMaskMatching (otherMask) {
    const newMask = otherMask.emptyMaskOfSize(
      otherMask.width,
      otherMask.height,
      otherMask.depth
    )
    this.copyToMask(newMask)
    return newMask
  }

  /**
   * Extract occupancy layer (1-bit) from this window.
   *
   * Creates a new SubBoard containing only the occupancy (binary existence)
   * information from this window. Removes color information, leaving only
   * 1 where cells are occupied and 0 where empty.
   *
   * @returns {SubBoard} New SubBoard at same position with occupancy-only layer.
   * Same dimensions and offset as this window.
   *
   * @example
   * const window = new SubBoard(10, 5, 8, 8, ...); // Multi-color
   * const occupancy = window.occupancyLayer(); // Just occupied/empty
   */
  occupancyLayer () {
    const occupancyMask = this.mask.occupancyLayer()
    return new SubBoard(
      this.offsetX,
      this.offsetY,
      this.windowWidth,
      this.windowHeight,
      occupancyMask,
      this.mask
    )
  }

  /**
   * Shrink this window to minimum bounding box of occupied cells.
   *
   * Creates a new SubBoard with reduced dimensions that tightly fits all
   * occupied cells in this window. Shifts the offset to the minimum occupied
   * position. Useful for trimming empty space around content.
   *
   * @returns {SubBoard} New SubBoard with shrunken bounds containing only occupied cells.
   * Position and size adjusted to minimal bounding box.
   *
   * @example
   * const window = new SubBoard(10, 5, 8, 8, ...); // Sparse content
   * const shrunk = window.shrinkToOccupied();
   * // shrunk has reduced dimensions and shifted position
   */
  shrinkToOccupied () {
    const shrunkMask = this.mask.shrinkToOccupied()
    return this._createSubBoardFromMask(shrunkMask, this.offsetX, this.offsetY)
  }

  /**
   * Extract a single color layer from this window.
   *
   * Creates a new SubBoard containing only cells of a specified color.
   * All other colors are removed (set to 0). Useful for filtering multi-color
   * content to a single color plane.
   *
   * @param {number} color - Color value to extract [0..255 depending on depth].
   * @returns {SubBoard} New SubBoard containing only cells matching the color,
   * positioned at this window's location.
   *
   * @example
   * const window = new SubBoard(10, 5, 8, 8, ...); // Multi-color
   * const redOnly = window.extractColorLayer(1); // Only red cells
   */
  extractColorLayer (color) {
    const layer = this.mask.extractColorLayer(color)
    return this.shiftToThis(layer)
  }

  /**
   * Extract all individual color layers from this window.
   *
   * Creates an array of SubBoards, one for each color present in this window.
   * Each SubBoard contains only cells of its corresponding color. Useful for
   * processing each color separately or analyzing color distribution.
   *
   * @returns {Array<SubBoard>} Array of SubBoards, one per color value found.
   * Each positioned at this window's location. Empty array if window is empty.
   *
   * @example
   * const window = new SubBoard(10, 5, 8, 8, ...); // Contains colors 1,2,3
   * const layers = window.extractColorLayers();
   * // layers.length === 3, each containing single color
   */
  extractColorLayers () {
    return this.mask
      .extractColorLayers()
      .map((/** @type {MaskLike} */ layer) => {
        return this.shiftToThis(layer)
      })
  }

  // ============================================================================
  // COORDINATE SERIALIZATION - Convert to/from coordinate arrays
  // ============================================================================

  /**
   * Load window contents from a list of world-relative coordinates.
   *
   * Populates this window by reading from an array of world-space coordinate
   * tuples. Only processes coordinates that fall within the window bounds.
   * Silently ignores coordinates outside bounds (does not throw). Overwrites
   * existing content at specified coordinates.
   *
   * @param {(CoordinatePair|CoordinateTuple)[]} coords - Array of [x, y] or [x, y, value] tuples in world coordinates.
   * For single-bit grids, may contain just [x, y] (value defaults to 1).
   * For multi-bit grids, [x, y, value] where value is 0-255 depending on depth.
   * @modifies this - Updates underlying mask at specified world coordinates
   * @throws {Error} If coords array is malformed or values are invalid
   *
   * @example
   * const board = new SubBoard(10, 5, 8, 8, ...);
   * board.copyFromCoords([[15, 10, 3], [16, 10, 2], [17, 11, 1]]);
   */
  copyFromCoords (coords) {
    for (const [worldX, worldY, value] of coords) {
      if (this.isValid(worldX, worldY)) {
        this.set(worldX, worldY, /** @type {number} */ (value))
      }
    }
  }

  /**
   * Get all occupied cells as coordinate tuples in world coordinates.
   *
   * Getter that collects all occupied cells into an array of coordinate tuples
   * in world space. For multi-bit (colored) grids, returns [x, y, value] tuples.
   * For single-bit grids, returns [x, y] pairs (no value). Useful for serialization,
   * network transmission, and save/load operations. Returns empty array if no cells
   * are occupied.
   *
   * @type {(CoordinatePair|CoordinateTuple)[]}
   *
   * @example
   * const board = new SubBoard(10, 5, 8, 8, ...); // Multi-color
   * const coords = board.toCoords;
   * // [[15, 10, 3], [16, 10, 2], [17, 11, 1], ...]
   */
  get toCoords () {
    const coords = /** @type {(CoordinatePair|CoordinateTuple)[]} */ ([])
    const isMultiBit = this.store.bitsPerCell > 0

    for (const [
      localX,
      localY,
      value
    ] of this.mask.occupiedLocationsAndValues()) {
      const [worldX, worldY] = this._localToWorld(localX, localY)
      coords.push(
        isMultiBit ? [worldX, worldY, Number(value)] : [worldX, worldY]
      )
    }

    return coords
  }

  /**
   * Populate mask from coordinate list (helper to eliminate duplication).
   *
   * Private static helper used by factory methods to populate a SubBoard's
   * mask from a coordinate array. Converts world coordinates to local window
   * coordinates and sets cells in the underlying mask. Silently skips
   * coordinates outside the window bounds. Does not clear existing content
   * before populating.
   *
   * @static
   * @private
   * @param {SubBoard} subBoard - SubBoard instance to populate.
   * Must have offsetX, offsetY, windowWidth, windowHeight, and mask properties.
   * @param {(CoordinatePair|CoordinateTuple)[]} coords - Coordinates to populate from.
   * Array of [x, y] or [x, y, value] tuples in world coordinates.
   * If value is omitted or falsy, defaults to 1.
   * @modifies subBoard - Updates the underlying mask by setting cells
   *
   * @example
   * const sb = new SubBoard(10, 5, 8, 8, null, template);
   * SubBoard._populateFromCoords(sb, [[15, 10, 1], [16, 10, 2]]);
   */
  static _populateFromCoords (subBoard, coords) {
    const windowCoords = coords.map(([x, y, value]) => [
      x - subBoard.offsetX,
      y - subBoard.offsetY,
      value || 1
    ])

    for (const [x, y, value] of windowCoords) {
      if (
        x >= 0 &&
        x < subBoard.windowWidth &&
        y >= 0 &&
        y < subBoard.windowHeight
      ) {
        subBoard.mask.set(x, y, /** @type {number} */ (value))
      }
    }
  }

  // ============================================================================
  // STATIC FACTORY METHODS - Create SubBoards from various inputs
  // ============================================================================

  /**
   * Create empty SubBoard from template.
   *
   * Static factory method that creates a new, empty SubBoard initialized
   * with a fresh mask created from the template. Useful for creating new
   * windows at specific positions without copying existing content.
   * All cells are initialized to 0 (unoccupied).
   *
   * @static
   * @param {MaskLike} template - Template mask for creating new masks.
   * Must implement emptyMaskOfSize(width, height, depth) method.
   * @param {number} [width=template.width] - Width of new SubBoard in cells.
   * Defaults to template's width if not provided. Must be positive.
   * @param {number} [height=template.height] - Height of new SubBoard in cells.
   * Defaults to template's height if not provided. Must be positive.
   * @param {number} [offsetX=0] - X offset in world space (top-left corner).
   * Defaults to 0. Represents absolute board column coordinate.
   * @param {number} [offsetY=0] - Y offset in world space (top-left corner).
   * Defaults to 0. Represents absolute board row coordinate.
   * @param {number} [depth=template.depth] - Color depth in bits per cell.
   * Defaults to template's depth if not provided. Determines color range [0, 2^depth-1].
   * @returns {SubBoard} New empty SubBoard at specified position and size.
   * All cells are initialized to 0 (unoccupied).
   *
   * @example
   * const template = new SubBoard(0, 0, 50, 50, ...);
   * const empty = SubBoard.emptyFromTemplate(template.mask, 10, 10, 5, 5);
   * // New 10x10 SubBoard at world position (5, 5)
   */
  static emptyFromTemplate (
    template,
    width = template.width,
    height = template.height,
    offsetX = 0,
    offsetY = 0,
    depth = template.depth
  ) {
    return new SubBoard(offsetX, offsetY, width, height, null, template, depth)
  }

  /**
   * Create SubBoard from mask at specified offset.
   *
   * Static factory that wraps an existing mask as a SubBoard at a specific
   * world position. Copies the mask's content into a new window, useful for
   * creating windowed views of existing masks with specific world positioning.
   *
   * @static
   * @param {MaskLike} mask - Source mask to wrap as SubBoard.
   * Must implement at() method for reading cell values.
   * @param {number} offsetX - X offset in world space for the window position.
   * Top-left corner X coordinate. Must be non-negative.
   * @param {number} offsetY - Y offset in world space for the window position.
   * Top-left corner Y coordinate. Must be non-negative.
   * @param {number} width - Width of the window in cells. Must be positive.
   * @param {number} height - Height of the window in cells. Must be positive.
   * @returns {SubBoard} New SubBoard at given offset, populated with mask content.
   * Window size matches specified width and height.
   *
   * @example
   * const mask = new MaskBase(...);
   * const board = SubBoard.fromMask(mask, 10, 5, 8, 8);
   * // board is a 8x8 window at world (10, 5) containing mask's content
   */
  static fromMask (mask, offsetX, offsetY, width, height) {
    const sb = new SubBoard(offsetX, offsetY, width, height, null, mask)
    sb.copyFromMask(mask)
    return sb
  }

  /**
   * Embed mask as SubBoard at specified offset.
   *
   * Static factory that directly embeds an existing mask as a SubBoard.
   * Uses the mask's dimensions for the window size. Useful for creating
   * windowed views without copying (or with shallow clone if needed).
   * The embedded mask becomes the SubBoard's underlying mask.
   *
   * @static
   * @param {MaskLike} mask - Mask to embed as a SubBoard.
   * Must have width and height properties. Will be cloned if clone method exists.
   * @param {number} offsetX - X offset in world space for the window position.
   * Top-left corner. Must be non-negative.
   * @param {number} offsetY - Y offset in world space for the window position.
   * Top-left corner. Must be non-negative.
   * @returns {SubBoard} New SubBoard wrapping the mask at specified offset.
   * Window size matches mask's dimensions (mask.width x mask.height).
   *
   * @example
   * const mask = new MaskBase(8, 8, ...);
   * const board = SubBoard.embed(mask, 10, 5);
   * // board is 8x8 at world (10, 5), containing mask
   */
  static embed (mask, offsetX, offsetY) {
    const sb = new SubBoard(
      offsetX,
      offsetY,
      mask.width,
      mask.height,
      mask.clone,
      mask
    )
    return sb
  }

  /**
   * Create SubBoard from coordinate list using bounding box.
   *
   * Static factory that creates a SubBoard sized to fit a list of coordinates.
   * Computes the minimal bounding box around all provided coordinates and
   * creates a window at that position. Useful for creating windows around
   * a collection of points without manually computing bounds.
   *
   * @static
   * @param {(CoordinatePair|CoordinateTuple)[]} coords - Array of [x, y] or [x, y, value] tuples
   * in world coordinates. Must not be empty; will compute bounds from these points.
   * @param {MaskLike|null} base - Base mask, or null to create from template.
   * If null, creates empty mask via template.emptyMaskOfSize().
   * @param {MaskLike} template - Template mask for creating empty masks.
   * Required when base is null. Must implement emptyMaskOfSize().
   * @param {number} [offsetX=0] - Additional X offset to apply to bounding box origin.
   * Used to shift the computed bounding box. Defaults to 0.
   * @param {number} [offsetY=0] - Additional Y offset to apply to bounding box origin.
   * Used to shift the computed bounding box. Defaults to 0.
   * @returns {SubBoard} New SubBoard sized to bounding box, populated with coordinates.
   * Window positioned at (minX + offsetX, minY + offsetY).
   *
   * @example
   * const coords = [[15, 10, 1], [20, 15, 2]];
   * const board = SubBoard.fromCoords(coords, null, template);
   * // Creates 6x6 window at position (15, 10) containing the coordinates
   */
  static fromCoords (coords, base, template, offsetX = 0, offsetY = 0) {
    const { minX, maxX, minY, maxY, depth, hasColor } = minMaxXY(coords)
    const sb = new SubBoard(
      minX + offsetX,
      minY + offsetY,
      maxX - minX + 1,
      maxY - minY + 1,
      base,
      template,
      hasColor ? depth : template?.depth
    )
    SubBoard._populateFromCoords(sb, coords)
    return sb
  }

  /**
   * Create SubBoard from coordinate list with swapped X/Y (row-column to X/Y).
   *
   * Static factory that creates a SubBoard from coordinates in row-column
   * format (row, col, value) by internally swapping to X/Y (col, row, value).
   * Maintains the same bounding box logic as fromCoords but with transposed
   * coordinate interpretation. Useful when coordinates come from matrix/array data.
   *
   * @static
   * @param {(CoordinatePair|CoordinateTuple)[]} coords - Array of [row, col] or [row, col, value] tuples.
   * Coordinates are in row-column format (as used in matrices).
   * Row is Y, col is X in standard grid terminology.
   * @param {MaskLike|null} base - Base mask, or null to create from template.
   * If null, creates empty mask via template.
   * @param {MaskLike} template - Template mask for creating empty masks.
   * Required when base is null.
   * @param {number} [offsetX=0] - Additional X offset to apply after conversion.
   * Applied to the minimum column value.
   * @param {number} [offsetY=0] - Additional Y offset to apply after conversion.
   * Applied to the minimum row value.
   * @returns {SubBoard} New SubBoard with coordinates swapped to X/Y.
   * Window contains the transposed coordinates.
   *
   * @example
   * const rows = [[0, 1, 1], [1, 0, 2]]; // row, col format
   * const board = SubBoard.fromXYcoords(rows, null, template);
   * // Creates window with coordinates transposed to [col, row] format
   */
  static fromXYcoords (coords, base, template, offsetX = 0, offsetY = 0) {
    return SubBoard.fromCoords(coords, base, template, offsetX, offsetY)
  }

  /**
   * Create SubBoard from row-column coordinates (swaps to X/Y internally).
   *
   * Static factory that creates a SubBoard from coordinates in row-column
   * format [row, col, value]. Internally converts to X/Y format [col, row, value]
   * and proceeds with normal SubBoard creation. Commonly used when populating
   * from matrix or array-based data where row index = Y, col index = X.
   *
   * @static
   * @param {(CoordinatePair|CoordinateTuple)[]} coords - Array of [row, col] or [row, col, value] tuples.
   * Interpreted as row-column format where row = Y, col = X.
   * @param {MaskLike|null} base - Base mask, or null to create from template.
   * If null, creates empty mask via template.
   * @param {MaskLike} template - Template mask for creating empty masks.
   * Required when base is null.
   * @param {number} [offsetX=0] - Additional X offset to apply after conversion.
   * Applied after swapping col to X.
   * @param {number} [offsetY=0] - Additional Y offset to apply after conversion.
   * Applied after swapping row to Y.
   * @returns {SubBoard} New SubBoard with row/col coordinates converted to X/Y.
   * Internally swaps [row, col, value] to [col, row, value].
   *
   * @example
   * const rows = [[0, 1, 1], [1, 0, 2]]; // row, col format
   * const board = SubBoard.fromRCcoords(rows, null, template);
   * // Swaps to [[1, 0, 1], [0, 1, 2]] (col, row) internally
   */
  static fromRCcoords (coords, base, template, offsetX = 0, offsetY = 0) {
    const xyCoords = coords.map(c => {
      const [row, col, value] = c
      return [col, row, value || 1]
    })
    return SubBoard.fromCoords(
      /** @type {(CoordinatePair|CoordinateTuple)[]} */ (xyCoords),
      base,
      template,
      offsetX,
      offsetY
    )
  }

  /**
   * Create SubBoard from coordinate list using square bounding box.
   *
   * Static factory similar to fromCoords but creates a square window that
   * fits all coordinates. The square size is max(width, height) of the
   * bounding box, ensuring the window is always square-shaped. Useful for
   * creating consistent square viewport regions or analyzing square shapes.
   *
   * @static
   * @param {(CoordinatePair|CoordinateTuple)[]} coords - Array of [x, y] or [x, y, value] tuples
   * in world coordinates. Must not be empty.
   * @param {MaskLike|null} base - Base mask, or null to create from template.
   * If null, creates empty mask via template.
   * @param {MaskLike} template - Template mask for creating empty masks.
   * Required when base is null.
   * @returns {SubBoard} New square SubBoard containing all coordinates.
   * Size is max(maxX - minX, maxY - minY) + 1 in both dimensions.
   * Positioned at (minX, minY) to contain the bounding box.
   *
   * @example
   * const coords = [[10, 5, 1], [15, 8, 2]]; // 6 wide, 4 tall
   * const board = SubBoard.fromCoordsSquare(coords, null, template);
   * // Creates 6x6 square window at (10, 5)
   */
  static fromCoordsSquare (coords, base, template) {
    const { minX, maxX, minY, maxY, depth, hasColor } = minMaxXY(coords)
    const size = Math.max(maxX - minX + 1, maxY - minY + 1)
    const sb = new SubBoard(
      minX,
      minY,
      size,
      size,
      base,
      template,
      hasColor ? depth : template?.depth
    )
    SubBoard._populateFromCoords(sb, coords)
    return sb
  }

  // ============================================================================
  // MORPHOLOGICAL OPERATIONS - Dilation and border expansion
  // ============================================================================

  /**
   * Create expanded SubBoard helper.
   *
   * Private helper method that constructs a new SubBoard after a morphological
   * operation that expands the window. Shifts the offset to account for the
   * border expansion and increases dimensions by 2*borderSize.
   * Used by dilateExpand and flatDilateExpand methods.
   *
   * @private
   * @param {MaskLike} morphedMask - Result mask from morphology operation.
   * Must have width and height properties.
   * @param {number} borderSize - Size of border that was added on all sides.
   * Must be non-negative. Typically 1-3 for reasonable expansion.
   * @returns {SubBoard} New SubBoard with expanded bounds.
   * Offset reduced by borderSize, dimensions increased by 2*borderSize.
   *
   * @example
   * const dilated = this.mask.dilateExpand(2, 0);
   * return this._createExpandedSubBoard(dilated, 2);
   */
  _createExpandedSubBoard (morphedMask, borderSize) {
    return new SubBoard(
      this.offsetX - borderSize,
      this.offsetY - borderSize,
      this.windowWidth + 2 * borderSize,
      this.windowHeight + 2 * borderSize,
      morphedMask
    )
  }

  /**
   * Create SubBoard from mask (helper for shrinkToOccupied).
   *
   * Private helper method that creates a new SubBoard wrapping a mask at
   * specified world-space offsets. Used internally to simplify SubBoard
   * construction during morphological operations and coordinate transformations.
   *
   * @private
   * @param {MaskLike} mask - Source mask to wrap.
   * Must have width and height properties.
   * @param {number} offsetX - X offset in world space (top-left corner).
   * Must be non-negative.
   * @param {number} offsetY - Y offset in world space (top-left corner).
   * Must be non-negative.
   * @returns {SubBoard} New SubBoard wrapping the mask at given offset.
   * Window size matches mask's width and height.
   */
  _createSubBoardFromMask (mask, offsetX, offsetY) {
    return new SubBoard(offsetX, offsetY, mask.width, mask.height, mask)
  }

  /**
   * Shift mask to window position and create SubBoard.
   *
   * Helper method that wraps a mask as a SubBoard positioned at this window's
   * location. Used by extractColorLayer(s) and other operations that need to
   * position a derived mask at the same world location as this window.
   *
   * @param {MaskLike} mask - Mask to shift to this window's position.
   * Must have width and height properties.
   * @returns {SubBoard} New SubBoard at this window's position and size,
   * wrapping the provided mask. Same offsetX/offsetY as this window.
   *
   * @example
   * const colorLayer = this.mask.extractColorLayer(1);
   * return this.shiftToThis(colorLayer);
   */
  shiftToThis (mask) {
    return SubBoard.fromMask(
      mask,
      this.offsetX,
      this.offsetY,
      this.windowWidth,
      this.windowHeight
    )
  }

  /**
   * Get empty mask at window position.
   *
   * Getter that creates a new, empty SubBoard at this window's position
   * and size. All cells are initialized to 0 (unoccupied). Useful for creating
   * temporary working masks or accumulation buffers.
   *
   * @type {SubBoard}
   *
   * @example
   * const empty = this.emptyMask;
   * // empty is 0-initialized at this window's position
   */
  get emptyMask () {
    return SubBoard.emptyFromTemplate(
      this.mask,
      this.windowWidth,
      this.windowHeight,
      this.offsetX,
      this.offsetY,
      this.mask.depth
    )
  }

  /**
   * Create empty mask of specified dimensions at window position.
   *
   * Creates a new empty SubBoard with custom dimensions, positioned at this
   * window's location. Useful for creating temporary masks of different sizes
   * while maintaining position context. All cells are 0-initialized.
   *
   * @param {number} width - Width of new mask in cells. Must be positive.
   * @param {number} height - Height of new mask in cells. Must be positive.
   * @returns {SubBoard} Empty SubBoard at this window's position with specified dimensions.
   * All cells initialized to 0 (unoccupied). Same depth as this window.
   *
   * @example
   * const working = this.emptyMaskOfSize(16, 16);
   * // working is 16x16 empty SubBoard at this window's position
   */
  emptyMaskOfSize (width, height) {
    return SubBoard.emptyFromTemplate(
      this.mask,
      width,
      height,
      this.offsetX,
      this.offsetY,
      this.mask.depth
    )
  }

  /**
   * Dilate with border, filling border with specified value.
   *
   * Performs dilation (morphological expansion) by adding a border of specified
   * size on all sides and filling it with a fill value, then expanding the window
   * content into the border. The resulting SubBoard is larger by 2*borderSize
   * in each dimension. Position is shifted to account for border.
   *
   * @param {number} [borderSize=1] - Size of border to add on all sides.
   * Must be positive. Typically 1-3 for reasonable expansion.
   * @param {number} [fillValue=0] - Value to fill border with (typically 0 for empty).
   * Defines the background for dilation to expand into.
   * Valid range [0, 2^bitsPerCell - 1].
   * @returns {SubBoard} New expanded SubBoard with dilated content.
   * Position shifted by -borderSize, dimensions increased by 2*borderSize.
   *
   * @example
   * const board = new SubBoard(10, 5, 8, 8, ...);
   * const expanded = board.dilateExpand(2, 0);
   * // expanded is 12x12 at position (8, 3)
   */
  dilateExpand (borderSize = 1, fillValue = 0) {
    const dilated = this.mask.dilateExpand(borderSize, fillValue)
    return this._createExpandedSubBoard(dilated, borderSize)
  }

  /**
   * Dilate with border, treating border as background for expansion.
   *
   * Performs "flat" dilation where the border is treated as the background
   * for expansion (like a pool of water the shape can flow into). Unlike
   * dilateExpand, doesn't explicitly fill the border with a value; instead
   * uses background semantics. Useful for organic expansion patterns.
   *
   * @param {number} [borderSize=1] - Size of border to add on all sides.
   * Must be positive. Defines the expansion radius.
   * @returns {SubBoard} New expanded SubBoard with dilated content.
   * Position shifted by -borderSize, dimensions increased by 2*borderSize.
   *
   * @example
   * const board = new SubBoard(10, 5, 8, 8, ...);
   * const expanded = board.flatDilateExpand(2);
   * // expanded is 12x12 at position (8, 3), dilated into background
   */
  flatDilateExpand (borderSize = 1) {
    const dilated = this.mask.flatDilateExpand(borderSize)
    return this._createExpandedSubBoard(dilated, borderSize)
  }

  /**
   * Simple dilation by one unit.
   *
   * Convenience method for dilateExpand(1, 0). Expands the window content
   * by one cell in all directions with empty (0) background. Useful for
   * creating slightly larger bounding regions around shapes.
   *
   * @returns {SubBoard} New SubBoard with dilated content.
   * Size increased by 2 in each dimension, position shifted by -1.
   *
   * @example
   * const board = new SubBoard(10, 5, 8, 8, ...);
   * const dilated = board.dilate();
   * // dilated is 10x10 at position (9, 4)
   */
  dilate () {
    return this.dilateExpand(1, 0)
  }
}
