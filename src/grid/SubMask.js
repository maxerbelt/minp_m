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
 */
export class SubMask {
  /**
   * Create a SubMask window view into a larger mask
   * @param {MaskBase} mask - The underlying mask to wrap
   * @param {number} offsetX - X coordinate of window's top-left corner in parent mask
   * @param {number} offsetY - Y coordinate of window's top-left corner in parent mask
   * @param {number} windowWidth - Width of the window
   * @param {number} windowHeight - Height of the window
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

  get width () {
    return this.windowWidth
  }
  get fullWidth () {
    return this.windowWidth + this.offsetX
  }
  get height () {
    return this.windowHeight
  }
  get fullHeight () {
    return this.windowHeight + this.offsetY
  }

  get size () {
    return this.windowWidth * this.windowHeight
  }

  // ============================================================================
  // Bit Access: Coordinate-adjusted read/write operations
  // ============================================================================

  /**
   * Private helper: Apply offset to window-relative coordinates
   * @protected
   */
  _applyOffset (x, y) {
    return [x + this.offsetX, y + this.offsetY]
  }

  _removeOffset (x, y) {
    return [x - this.offsetX, y - this.offsetY]
  }
  /**
   * Private helper: Check if coordinates are within window bounds
   * @protected
   */
  _isInWindow (x, y) {
    return x >= 0 && x < this.windowWidth && y >= 0 && y < this.windowHeight
  }

  /**
   * Read value at window-relative coordinates
   * For Mask instances, depth is ignored (always depth=0).
   * For MaskBase instances, depth can be specified.
   * @param {number} x - Window-relative X coordinate
   * @param {number} y - Window-relative Y coordinate
   * @param {number} [depth=0] - Depth layer to read (may be ignored for Mask)
   * @returns {number} Value at that position, or null if out of bounds
   */
  at (x, y) {
    if (!this._isInWindow(x, y)) {
      return null
    }
    const [absX, absY] = this._applyOffset(x, y)
    // Call mask.at() without depth parameter if it doesn't support it
    // (JavaScript will ignore the extra parameter anyway)
    return this.mask.at(absX, absY)
  }
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
   * @returns {bigint} Updated bits value
   * @throws {Error} If coordinates are out of window bounds
   */
  set (x, y, color = 1) {
    if (!this._isInWindow(x, y)) {
      throw new Error(
        `Coordinates (${x}, ${y}) out of window bounds [0, ${
          this.windowWidth - 1
        }] x [0, ${this.windowHeight - 1}]`
      )
    }
    const [absX, absY] = this._applyOffset(x, y)
    return this.mask.set(absX, absY, color)
  }

  /**
   * Clear (zero out) a cell at window-relative coordinates
   * @param {number} x - Window-relative X coordinate
   * @param {number} y - Window-relative Y coordinate
   * @returns {bigint} Updated bits value
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
  for (x, y) {
    if (!this._isInWindow(x, y)) {
      throw new Error(
        `Coordinates (${x}, ${y}) out of window bounds [0, ${
          this.windowWidth - 1
        }] x [0, ${this.windowHeight - 1}]`
      )
    }
    const [absX, absY] = this._applyOffset(x, y)
    // Call mask.for() without depth parameter if it doesn't support it
    return this.mask.for(absX, absY)
  }

  /**
   * Get grid index for window-relative coordinates
   * @param {number} x - Window-relative X coordinate
   * @param {number} y - Window-relative Y coordinate
   * @returns {number} Index in the shape's grid, or -1 if out of bounds
   */
  index (x, y) {
    if (!this._isInWindow(x, y)) {
      return -1
    }
    const [absX, absY] = this._applyOffset(x, y)
    return this.mask.index(absX, absY)
  }

  /**
   * Convert grid index to window-relative coordinates
   * @param {number} index - Index in the underlying mask
   * @returns {Array<number>} [x, y] in window-relative coordinates
   */
  location (index) {
    const [absX, absY] = this.mask.location(index)
    return this._removeOffset(absX, absY)
  }

  *occupiedLocations () {
    for (const [x, y] of this.mask.occupiedLocations()) {
      yield this._removeOffset(x, y)
    }
  }
  *occupiedLocationsAndValues () {
    for (const [x, y, value] of this.mask.occupiedLocationsAndValues()) {
      yield [...this._removeOffset(x, y), value]
    }
  }

  /**
   * Check if window-relative coordinates are valid (within window bounds)
   * @param {number} x - Window-relative X coordinate
   * @param {number} y - Window-relative Y coordinate
   * @returns {boolean} True if coordinates are within window
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
   * @param {number} c0 - Column start
   * @param {number} c1 - Column end
   */
  setRange (r, c0, c1) {
    if (!this._isInWindow(0, r)) {
      return
    }
    const [, absR] = this._applyOffset(0, r)
    this.mask.setRange(absR, c0, c1)
  }

  /**
   * Clear a range of bits in a window-relative row
   * @param {number} r - Window-relative row
   * @param {number} c0 - Column start
   * @param {number} c1 - Column end
   */
  clearRange (r, c0, c1) {
    if (!this._isInWindow(0, r)) {
      return
    }
    const [, absR] = this._applyOffset(0, r)
    this.mask.clearRange(absR, c0, c1)
  }

  // ============================================================================
  // Coordinate Conversion: Convert to/from coordinate arrays
  // ============================================================================

  /**
   * Get all occupied cells as [x, y] coordinate array
   * Returns window-relative coordinates (0 to width-1, 0 to height-1)
   */
  get toCoords () {
    return Array.from(this.occupiedLocations())
  }

  /**
   * Load coordinates into this window
   * Expects window-relative coordinates (0 to width-1, 0 to height-1)
   */
  fromCoords (coords) {
    // Clear existing content
    for (let y = 0; y < this.windowHeight; y++) {
      for (let x = 0; x < this.windowWidth; x++) {
        if (this.at(x, y) !== 0 && this.at(x, y) !== null) {
          this.clear(x, y)
        }
      }
    }
    // Load new coordinates
    for (const [x, y] of coords) {
      if (x >= 0 && x < this.windowWidth && y >= 0 && y < this.windowHeight) {
        this.set(x, y, 1)
      }
    }
  }

  // ============================================================================
  // ASCII Representation: Window-only rendering
  // ============================================================================

  /**
   * Get ASCII representation of just the window
   * @returns {string} ASCII art showing window contents
   */
  get toAscii () {
    return this._generateAscii()
  }

  /**
   * Get ASCII representation with custom symbols
   * @param {Array<string>} [symbols] - Symbol array for each depth value
   * @returns {string} ASCII art with custom symbols
   */
  toAsciiWith (
    symbols = [
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
  ) {
    return this._generateAscii(symbols)
  }

  /**
   * Generate ASCII representation of window
   * @protected
   */
  _generateAscii (
    symbols = [
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
  ) {
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
   * @param {Object} [transformContext] - Optional context for offset adjustment
   * @param {string} [transformContext.type] - Type of transform ('rotate', 'flip', 'translate', etc.)
   * @param {*} [transformContext.param] - Transform-specific parameter
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
   * @protected
   */
  _adjustOffsetForTransform (transformContext) {
    // This implementation depends on the specific transform
    // Common transforms might include:
    // - rotations: offset needs to be rotated around center
    // - flips: offset needs to be mirrored around center
    // - translations: offset shifts by translation amount

    const { type, param } = transformContext

    switch (type) {
      case 'rotate-90':
        // For 90-degree rotation around top-left (0,0):
        // new position = (oldY, -oldX)
        // For rotation around other centers, adjustment differs
        {
          const newOffsetX = this.offsetY
          const newOffsetY = -this.offsetX
          this.offsetX = newOffsetX
          this.offsetY = newOffsetY
        }
        break

      case 'flip-horizontal':
        // Flip around vertical axis
        this.offsetX = this.mask.width - this.offsetX - this.windowWidth
        break

      case 'flip-vertical':
        // Flip around horizontal axis
        this.offsetY = this.mask.height - this.offsetY - this.windowHeight
        break

      case 'translate':
        // Simple offset translation
        if (param && typeof param === 'object') {
          this.offsetX += param.x || 0
          this.offsetY += param.y || 0
        }
        break

      default:
        // No offset adjustment for unknown transforms
        break
    }
  }

  // ============================================================================
  // Copy Operations: Transfer contents to/from parent or coordinate lists
  // ============================================================================

  /**
   * Extract window contents as a list of [x, y, value] coordinates
   * Coordinates are in window-relative format.
   * @returns {Array<Array>} List of [x, y, value] tuples for all set bits in window
   */
  copyToCoords () {
    const coords = []
    for (let y = 0; y < this.windowHeight; y++) {
      for (let x = 0; x < this.windowWidth; x++) {
        const value = this.at(x, y)
        if (value > 0) {
          coords.push([x, y, value])
        }
      }
    }
    return coords
  }

  /**
   * Load window contents from a list of [x, y, value] coordinates
   * Coordinates should be in window-relative format.
   * @param {Array<Array>} coords - List of [x, y, value] tuples
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
    for (let y = 0; y < this.windowHeight; y++) {
      for (let x = 0; x < this.windowWidth; x++) {
        const [absX, absY] = this._applyOffset(x, y)
        const value = largeMask.at(absX, absY)
        if (value > 0) {
          this.set(x, y, value)
        }
      }
    }
  }

  /**
   * Copy window contents to a larger mask using absolute coordinates
   * Reads from the window and writes to the parent mask at absolute positions.
   * @param {MaskBase} largeMask - The target mask to copy to
   */
  copyToMask (largeMask) {
    for (let y = 0; y < this.windowHeight; y++) {
      for (let x = 0; x < this.windowWidth; x++) {
        const value = this.at(x, y)
        if (value > 0) {
          const [absX, absY] = this._applyOffset(x, y)
          largeMask.set(absX, absY, value)
        }
      }
    }
  }

  // ============================================================================
  // Bit Access: Direct bit property delegation
  // ============================================================================

  /**
   * Get reference to underlying mask bits
   */
  get bits () {
    return this.mask.bits
  }

  /**
   * Set underlying mask bits
   */
  set bits (value) {
    this.mask.bits = value
  }

  // ============================================================================
  // Occupancy and Statistics
  // ============================================================================

  /**
   * Count number of set cells in the window
   */
  get occupancy () {
    let count = 0
    for (let y = 0; y < this.windowHeight; y++) {
      for (let x = 0; x < this.windowWidth; x++) {
        if (this.at(x, y) > 0) {
          count++
        }
      }
    }
    return count
  }

  // ============================================================================
  // Window Movement: Change offset while maintaining window view
  // ============================================================================

  /**
   * Move the window to a new position in the parent mask
   * @param {number} newOffsetX - New X offset
   * @param {number} newOffsetY - New Y offset
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
   * Get the absolute bounds of this window [x1, y1, x2, y2]
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
