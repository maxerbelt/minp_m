/**
 * SubMask - A decorator that provides a windowed view into a larger MaskBase instance.
 *
 * SubMask acts as a transparent wrapper around a MaskBase, allowing operations on a subset
 * of the larger bitboard defined by an offset position and window dimensions. All coordinate
 * operations are automatically translated to absolute coordinates in the underlying mask.
 *
 * The window view is defined by:
 * - offsetX, offsetY: The top-left corner of the window in the parent mask's coordinates
 * - windowWidth, windowHeight: The dimensions of the window
 *
 * All coordinate-based methods (at, set, location, setRange, clearRange, isValid, index)
 * work in window-relative coordinates (0 to width-1, 0 to height-1), which are automatically
 * translated to absolute coordinates in the underlying mask.
 *
 * @class SubMask
 * @classdesc Transparent windowed view decorator for MaskBase bitboard operations
 */

/**
 * @typedef {Object} TransformContext
 * @property {string} type - Type of transformation: 'rotate-90', 'flip-horizontal', 'flip-vertical', 'translate'
 * @property {*} [param] - Optional transform-specific parameter (e.g., delta for translate)
 */

/**
 * @typedef {Array<number>} Point2D
 * @property {number} 0 - X coordinate
 * @property {number} 1 - Y coordinate
 */

/**
 * @typedef {Array<number>} WindowCell
 * @property {number} 0 - X coordinate (window-relative)
 * @property {number} 1 - Y coordinate (window-relative)
 * @property {number} 2 - Value at that coordinate
 */

/**
 * @typedef {string[]} SymbolsArray
 * @description Array of ASCII symbols for rendering depth values 0-f
 */

/**
 * @const {SymbolsArray} DEFAULT_ASCII_SYMBOLS
 * @description Default symbols for ASCII rendering: '.', '1'-'9', 'a'-'f'
 */
const DEFAULT_ASCII_SYMBOLS = [
  '.',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  'a',
  'b',
  'c',
  'd',
  'e',
  'f'
]

export class SubMask {
  /**
   * Create a SubMask window view into a larger mask
   * @param {MaskBase} mask - The underlying mask to wrap
   * @param {number} offsetX - X coordinate of window's top-left corner in parent mask
   * @param {number} offsetY - Y coordinate of window's top-left corner in parent mask
   * @param {number} windowWidth - Width of the window (must be positive)
   * @param {number} windowHeight - Height of the window (must be positive)
   */
  constructor (mask, offsetX, offsetY, windowWidth, windowHeight) {
    this.mask = mask
    this.offsetX = offsetX
    this.offsetY = offsetY
    this.windowWidth = windowWidth
    this.windowHeight = windowHeight

    // Expose underlying mask properties for compatibility
    this.indexer = mask.indexer
    this.store = mask.store
    this.depth = mask.depth
  }

  // ============================================================================
  // Properties: Expose window dimensions
  // ============================================================================

  /**
   * Get window width
   * @type {number}
   * @readonly
   */
  get width () {
    return this.windowWidth
  }

  /**
   * Get full width from origin to window end
   * @type {number}
   * @readonly
   */
  get fullWidth () {
    return this.windowWidth + this.offsetX
  }

  /**
   * Get window height
   * @type {number}
   * @readonly
   */
  get height () {
    return this.windowHeight
  }

  /**
   * Get full height from origin to window end
   * @type {number}
   * @readonly
   */
  get fullHeight () {
    return this.windowHeight + this.offsetY
  }

  /**
   * Get total number of cells in the window
   * @type {number}
   * @readonly
   */
  get size () {
    return this.windowWidth * this.windowHeight
  }

  // ============================================================================
  // Bit Access: Coordinate-adjusted read/write operations
  // ============================================================================

  /**
   * Convert window-relative coordinates to absolute parent-mask coordinates.
   * @private
   * @param {number} x - Window-relative X coordinate
   * @param {number} y - Window-relative Y coordinate
   * @returns {Point2D} Absolute coordinates [absX, absY]
   */
  _toAbsoluteCoords (x, y) {
    return [x + this.offsetX, y + this.offsetY]
  }

  /**
   * Convert absolute parent-mask coordinates to window-relative coordinates.
   * @private
   * @param {number} x - Absolute X coordinate in parent mask
   * @param {number} y - Absolute Y coordinate in parent mask
   * @returns {Point2D} Window-relative coordinates [windowX, windowY]
   */
  _toWindowCoords (x, y) {
    return [x - this.offsetX, y - this.offsetY]
  }

  /**
   * Private helper: Apply offset to window-relative coordinates.
   * Kept for compatibility with existing tests and external callers.
   * @private
   * @param {number} x - Window-relative X coordinate
   * @param {number} y - Window-relative Y coordinate
   * @returns {Point2D} Absolute coordinates
   */
  _applyOffset (x, y) {
    return this._toAbsoluteCoords(x, y)
  }

  /**
   * Private helper: Remove offset from absolute coordinates.
   * Kept for compatibility with existing tests and external callers.
   * @private
   * @param {number} x - Absolute X coordinate
   * @param {number} y - Absolute Y coordinate
   * @returns {Point2D} Window-relative coordinates
   */
  _removeOffset (x, y) {
    return this._toWindowCoords(x, y)
  }

  /**
   * Private helper: Check if coordinates are within window bounds.
   * @private
   * @param {number} x - Window-relative X coordinate
   * @param {number} y - Window-relative Y coordinate
   * @returns {boolean} True if [x, y] is within [0, windowWidth) x [0, windowHeight)
   */
  _isInWindow (x, y) {
    return x >= 0 && x < this.windowWidth && y >= 0 && y < this.windowHeight
  }

  /**
   * Execute a callback with absolute coordinates if the window-relative
   * coordinate pair is valid.
   * @private
   * @param {number} x - Window-relative X coordinate
   * @param {number} y - Window-relative Y coordinate
   * @param {Function} callback - Function called with absolute coords: (absX, absY) => *
   * @returns {*} Result of callback or undefined if out of bounds
   */
  _withAbsoluteCoordinates (x, y, callback) {
    if (!this._isInWindow(x, y)) {
      return undefined
    }
    const [absX, absY] = this._toAbsoluteCoords(x, y)
    return callback(absX, absY)
  }

  /**
   * Ensure window-relative coordinates are valid and return absolute coords.
   * @private
   * @param {number} x - Window-relative X coordinate
   * @param {number} y - Window-relative Y coordinate
   * @returns {Point2D} Absolute coordinates [absX, absY]
   * @throws {Error} If coordinates are out of window bounds
   */
  _assertWindowCoordinates (x, y) {
    if (!this._isInWindow(x, y)) {
      throw new Error(
        `Coordinates (${x}, ${y}) out of window bounds [0, ${
          this.windowWidth - 1
        }] x [0, ${this.windowHeight - 1}]`
      )
    }
    return this._toAbsoluteCoords(x, y)
  }

  /**
   * Execute a callback for a row in window-relative coordinates.
   * @private
   * @param {number} r - Window-relative row
   * @param {Function} callback - Callback with absolute row index: (absR) => void
   */
  _withWindowRow (r, callback) {
    if (!this._isInWindow(0, r)) {
      return
    }
    const [, absR] = this._toAbsoluteCoords(0, r)
    callback(absR)
  }

  /**
   * Read value at window-relative coordinates
   * For Mask instances, depth is ignored (always depth=0).
   * For MaskBase instances, depth can be specified.
   * @param {number} x - Window-relative X coordinate
   * @param {number} y - Window-relative Y coordinate
   * @param {number} [depth=0] - Depth layer to read (may be ignored for Mask)
   * @returns {(number|null)} Value at that position, or null if out of bounds
   */
  at (x, y, depth = 0) {
    const value = this._withAbsoluteCoordinates(x, y, (absX, absY) =>
      this.mask.at(absX, absY, depth)
    )
    return value === undefined ? null : value
  }

  /**
   * Test if a cell at window-relative coordinates has a specific color value
   * @param {number} x - Window-relative X coordinate
   * @param {number} y - Window-relative Y coordinate
   * @param {number} [color=1] - Color value to test for (default: 1)
   * @returns {boolean} True if cell at [x, y] equals color
   */
  test (x, y, color = 1) {
    return this.at(x, y) === color
  }

  /**
   * Set value at window-relative coordinates
   * For Mask instances, the third parameter is color (default 1).
   * For MaskBase instances with depth, the third parameter can be depth.
   * @param {number} x - Window-relative X coordinate
   * @param {number} y - Window-relative Y coordinate
   * @param {number} [color=1] - Color or depth value to set
   * @returns {bigint} Updated bits value from underlying mask
   * @throws {Error} If coordinates are out of window bounds
   */
  set (x, y, color = 1) {
    const [absX, absY] = this._assertWindowCoordinates(x, y)
    return this.mask.set(absX, absY, color)
  }

  /**
   * Clear (zero out) a cell at window-relative coordinates
   * @param {number} x - Window-relative X coordinate
   * @param {number} y - Window-relative Y coordinate
   * @returns {bigint} Updated bits value from underlying mask
   */
  clear (x, y) {
    return this.set(x, y, 0)
  }

  /**
   * Get ForLocation helper for window-relative coordinates
   * @param {number} x - Window-relative X coordinate
   * @param {number} y - Window-relative Y coordinate
   * @param {number} [depth=0] - Depth layer (may be ignored for Mask)
   * @returns {ForLocation} Position helper for bit manipulation
   * @throws {Error} If coordinates are out of window bounds
   */
  for (x, y, depth = 0) {
    const [absX, absY] = this._assertWindowCoordinates(x, y)
    return this.mask.for(absX, absY, depth)
  }

  /**
   * Get grid index for window-relative coordinates
   * @param {number} x - Window-relative X coordinate
   * @param {number} y - Window-relative Y coordinate
   * @returns {number} Index in the shape's grid, or -1 if out of bounds
   */
  index (x, y) {
    const indexValue = this._withAbsoluteCoordinates(x, y, (absX, absY) =>
      this.mask.index(absX, absY)
    )
    return indexValue === undefined ? -1 : indexValue
  }

  /**
   * Convert grid index to window-relative coordinates
   * @param {number} index - Index in the underlying mask
   * @returns {Point2D} [x, y] in window-relative coordinates
   */
  location (index) {
    const [absX, absY] = this.mask.location(index)
    return this._removeOffset(absX, absY)
  }

  /**
   * Iterate through all occupied locations in window-relative coordinates
   * @generator
   * @yields {Point2D} Occupied [x, y] coordinates in window-relative space
   */
  *occupiedLocations () {
    for (const [x, y] of this.mask.occupiedLocations()) {
      yield this._removeOffset(x, y)
    }
  }

  /**
   * Iterate through all occupied locations with their values in window-relative coordinates
   * @generator
   * @yields {WindowCell} [x, y, value] tuples for occupied cells
   */
  *occupiedLocationsAndValues () {
    for (const [x, y, value] of this.mask.occupiedLocationsAndValues()) {
      yield [...this._removeOffset(x, y), value]
    }
  }

  /**
   * Check if window-relative coordinates are valid (within window bounds)
   * @param {number} x - Window-relative X coordinate
   * @param {number} y - Window-relative Y coordinate
   * @returns {boolean} True if coordinates are within window [0, width) x [0, height)
   */
  isValid (x, y) {
    return this._isInWindow(x, y)
  }

  // ============================================================================
  // Range Operations: Row/column operations with offset adjustment
  // ============================================================================

  /**
   * Set a range of bits in a window-relative row
   * @param {number} r - Window-relative row
   * @param {number} c0 - Column start (inclusive)
   * @param {number} c1 - Column end (inclusive)
   */
  setRange (r, c0, c1) {
    this._withWindowRow(r, absR => this.mask.setRange(absR, c0, c1))
  }

  /**
   * Clear a range of bits in a window-relative row
   * @param {number} r - Window-relative row
   * @param {number} c0 - Column start (inclusive)
   * @param {number} c1 - Column end (inclusive)
   */
  clearRange (r, c0, c1) {
    this._withWindowRow(r, absR => this.mask.clearRange(absR, c0, c1))
  }

  // ============================================================================
  // Coordinate Conversion: Convert to/from coordinate arrays
  // ============================================================================

  /**
   * Get all occupied cells as [x, y] coordinate array
   * @type {Array<Point2D>}
   * @readonly
   * @returns {Array<Array<number>>} Array of [windowX, windowY] coordinates
   *  in window-relative format (0 to width-1, 0 to height-1)
   */
  get toCoords () {
    return Array.from(this.occupiedLocations())
  }

  /**
   * Load coordinates into this window
   * Expects window-relative coordinates (0 to width-1, 0 to height-1)
   * @param {Array<Point2D>} coords - Coordinates to load into the window
   */
  fromCoords (coords) {
    this._clearWindow()
    for (const [x, y] of coords) {
      if (this.isValid(x, y)) {
        this.set(x, y, 1)
      }
    }
  }

  /**
   * Clear all bits inside the window.
   * @private
   */
  _clearWindow () {
    this._forEachWindowCell((x, y) => {
      if (this.at(x, y) !== 0) {
        this.clear(x, y)
      }
    })
  }

  /**
   * Iterate through all window-relative coordinates.
   * @private
   * @param {Function} callback - Called for each window coordinate: (x, y) => void
   */
  _forEachWindowCell (callback) {
    for (let y = 0; y < this.windowHeight; y++) {
      for (let x = 0; x < this.windowWidth; x++) {
        callback(x, y)
      }
    }
  }

  // ============================================================================
  // ASCII Representation: Window-only rendering
  // ============================================================================

  /**
   * Get ASCII representation of just the window
   * @type {string}
   * @readonly
   * @returns {string} ASCII art showing window contents with default symbols
   */
  get toAscii () {
    return this._generateAscii()
  }

  /**
   * Get ASCII representation with custom symbols
   * @param {SymbolsArray} [symbols] - Symbol array for each depth value (default: DEFAULT_ASCII_SYMBOLS)
   * @returns {string} ASCII art with custom symbols
   */
  toAsciiWith (symbols = DEFAULT_ASCII_SYMBOLS) {
    return this._generateAscii(symbols)
  }

  /**
   * Generate ASCII representation of window
   * @private
   * @param {SymbolsArray} [symbols=DEFAULT_ASCII_SYMBOLS] - Symbol array for each depth value
   * @returns {string} Newline-separated ASCII representation
   */
  _generateAscii (symbols = DEFAULT_ASCII_SYMBOLS) {
    const lines = []
    for (let y = 0; y < this.windowHeight; y++) {
      let line = ''
      for (let x = 0; x < this.windowWidth; x++) {
        const value = this.at(x, y) || 0
        line += symbols[value % symbols.length] || '?'
      }
      lines.push(line)
    }
    return lines.join('\n')
  }

  // ============================================================================
  // Transform Operations: Adjust offset when window is transformed
  // ============================================================================

  /**
   * Apply a transformation to the underlying mask and adjust the window offset
   * accordingly, as if the window was transformed as part of the larger bitboard.
   *
   * NOTE: The offset adjustment depends on the specific transformation being applied.
   * Callers must provide the transformation context for proper offset calculation.
   *
   * @param {MaskBase} bbc - Bit-based context or mask for bit operations
   * @param {Map|Array} map - Transformation map (index remapping)
   * @param {TransformContext} [transformContext] - Optional context for offset adjustment
   */
  applyTransform (bbc, map, transformContext) {
    // Apply transform to underlying mask bits
    const newBits = this.mask.applyTransform(bbc, map)
    this.mask.bits = newBits

    // Adjust offset based on transform context
    if (transformContext) {
      this._adjustOffsetForTransform(transformContext)
    }
  }

  /**
   * Adjust window offset based on transformation applied to parent mask
   * @private
   * @param {TransformContext} transformContext - Describes the transformation type and parameters
   */
  _adjustOffsetForTransform (transformContext) {
    const { type, param } = transformContext

    switch (type) {
      case 'rotate-90':
        this._rotateOffset90()
        break

      case 'flip-horizontal':
        this._flipHorizontalOffset()
        break

      case 'flip-vertical':
        this._flipVerticalOffset()
        break

      case 'translate':
        this._translateOffset(param)
        break

      default:
        break
    }
  }

  /**
   * Rotate the window offset 90 degrees around the top-left origin.
   * @private
   */
  _rotateOffset90 () {
    const newOffsetX = this.offsetY
    const newOffsetY = -this.offsetX
    this.offsetX = newOffsetX
    this.offsetY = newOffsetY
  }

  /**
   * Flip the window offset horizontally across the mask.
   * @private
   */
  _flipHorizontalOffset () {
    this.offsetX = this.mask.width - this.offsetX - this.windowWidth
  }

  /**
   * Flip the window offset vertically across the mask.
   * @private
   */
  _flipVerticalOffset () {
    this.offsetY = this.mask.height - this.offsetY - this.windowHeight
  }

  /**
   * Translate the window offset by the provided delta.
   * @private
   * @param {*} param - Translation parameters (should have x and y properties)
   */
  _translateOffset (param) {
    if (param && typeof param === 'object') {
      this.offsetX += param.x || 0
      this.offsetY += param.y || 0
    }
  }

  // ============================================================================
  // Copy Operations: Transfer contents to/from parent or coordinate lists
  // ============================================================================

  /**
   * Extract window contents as a list of [x, y, value] coordinates
   * Coordinates are in window-relative format.
   * @returns {Array<Array<number>>} List of [x, y, value] tuples for all set bits in window
   */
  copyToCoords () {
    const coords = []
    this._forEachWindowCell((x, y) => {
      const value = this.at(x, y)
      if (value > 0) {
        coords.push([x, y, value])
      }
    })
    return coords
  }

  /**
   * Load window contents from a list of [x, y, value] coordinates
   * Coordinates should be in window-relative format.
   * @param {Array<Array<number>>} coords - List of [x, y, value] tuples
   */
  copyFromCoords (coords) {
    for (const [x, y, value] of coords) {
      if (this.isValid(x, y)) {
        this.set(x, y, value)
      }
    }
  }

  /**
   * Copy window contents from a larger mask using absolute coordinates
   * Reads from the parent mask at absolute positions and writes to window.
   * @param {MaskBase} largeMask - The source mask to copy from
   */
  copyFromMask (largeMask) {
    this._forEachWindowCell((x, y) => {
      const [absX, absY] = this._applyOffset(x, y)
      const value = largeMask.at(absX, absY)
      if (value > 0) {
        this.set(x, y, value)
      }
    })
  }

  /**
   * Copy window contents to a larger mask using absolute coordinates
   * Reads from the window and writes to the parent mask at absolute positions.
   * @param {MaskBase} largeMask - The target mask to copy to
   */
  copyToMask (largeMask) {
    this._forEachWindowCell((x, y) => {
      const value = this.at(x, y)
      if (value > 0) {
        const [absX, absY] = this._applyOffset(x, y)
        largeMask.set(absX, absY, value)
      }
    })
  }

  /**
   * Convert window contents to a new mask of specified dimensions
   * @param {number} newWidth - Width of the new mask
   * @param {number} newHeight - Height of the new mask
   * @returns {MaskBase} New mask containing window contents
   */
  toMask (newWidth, newHeight) {
    const newMask = this.mask.emptyMaskOfSize(newWidth, newHeight)
    this.copyToMask(newMask)
    return newMask
  }

  /**
   * Convert window contents to a new mask matching another mask's dimensions
   * @param {MaskBase} otherMask - Template mask to match dimensions from
   * @returns {MaskBase} New mask with window contents and matching other mask's properties
   */
  toMaskMatching (otherMask) {
    const newMask = otherMask.emptyMaskOfSize(
      this.windowWidth,
      this.windowHeight
    )
    this.copyToMask(newMask)
    return newMask
  }
  // ============================================================================
  // Bit Access: Direct bit property delegation
  // ============================================================================

  /**
   * Get reference to underlying mask bits
   * @type {bigint}
   */
  get bits () {
    return this.mask.bits
  }

  /**
   * Set underlying mask bits
   * @param {bigint} value - New bits value for underlying mask
   */
  set bits (value) {
    this.mask.bits = value
  }

  // ============================================================================
  // Occupancy and Statistics
  // ============================================================================

  /**
   * Count number of set cells in the window
   * @type {number}
   * @readonly
   */
  get occupancy () {
    let count = 0
    this._forEachWindowCell((x, y) => {
      if (this.at(x, y) > 0) {
        count++
      }
    })
    return count
  }

  // ============================================================================
  // Window Movement: Change offset while maintaining window view
  // ============================================================================

  /**
   * Move the window to a new position in the parent mask
   * @param {number} newOffsetX - New X offset (top-left corner)
   * @param {number} newOffsetY - New Y offset (top-left corner)
   */
  moveWindow (newOffsetX, newOffsetY) {
    this.offsetX = newOffsetX
    this.offsetY = newOffsetY
  }

  /**
   * Shift the window by a relative amount
   * @param {number} dx - Change in X offset
   * @param {number} dy - Change in Y offset
   */
  shiftWindow (dx, dy) {
    this.offsetX += dx
    this.offsetY += dy
  }

  /**
   * Get the absolute bounds of this window in parent mask coordinates
   * @returns {Array<number>} [x1, y1, x2, y2] representing top-left and bottom-right corners
   */
  getAbsoluteBounds () {
    return [
      this.offsetX,
      this.offsetY,
      this.offsetX + this.windowWidth - 1,
      this.offsetY + this.windowHeight - 1
    ]
  }
}
