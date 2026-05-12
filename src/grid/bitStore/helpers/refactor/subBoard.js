import { SubMask } from './SubMask.js'
import { minMaxXY } from '../core/utilities.js'

/** @typedef {import('./MaskBase.js').MaskBase} MaskBase */
/** @typedef {import('./rectangle/packed.js').Packed} Packed */

/**
 * SubBoard - A windowed view into a larger grid with world-relative coordinates
 *
 * SubBoard represents a rectangular window into a potentially larger grid,
 * maintaining an offset that allows mapping between local (window-relative)
 * and world (absolute) coordinates. All public APIs work with world coordinates
 * automatically, abstracting away the window offset.
 *
 * @extends SubMask
 */
export class SubBoard extends SubMask {
  /**
   * Create a windowed grid view
   * @param {number} offsetX - X offset of window in world space
   * @param {number} offsetY - Y offset in world space
   * @param {number} width - Window width in cells
   * @param {number} height - Window height in cells
   * @param {MaskBase|Packed|null} [base] - Base mask, or null to create from template
   * @param {MaskBase|Packed} [template] - Template mask for creating empty masks
   * @param {number} [depth] - Color depth, defaults to template's depth
   */
  constructor (offsetX, offsetY, width, height, base, template, depth) {
    base = base || template.emptyMaskOfSize(width, height, depth)
    super(base, offsetX, offsetY, width, height)
  }

  // ============================================================================
  // COORDINATE TRANSFORMATION - Core utilities for world <-> local conversion
  // ============================================================================

  /**
   * Convert world coordinates to local mask coordinates
   * @protected
   * @param {number} worldX - World X coordinate
   * @param {number} worldY - World Y coordinate
   * @returns {Array<number>} [localX, localY] coordinates in window space
   */
  _worldToLocal (worldX, worldY) {
    return [worldX - this.offsetX, worldY - this.offsetY]
  }

  /**
   * Convert local mask coordinates to world coordinates
   * @protected
   * @param {number} localX - Local mask X coordinate
   * @param {number} localY - Local mask Y coordinate
   * @returns {Array<number>} [worldX, worldY] coordinates in world space
   */
  _localToWorld (localX, localY) {
    return [localX + this.offsetX, localY + this.offsetY]
  }

  /**
   * Override SubMask's _applyOffset - delegates to _worldToLocal for consistency
   * @protected
   * @param {number} worldX - World X coordinate
   * @param {number} worldY - World Y coordinate
   * @returns {Array<number>} [localX, localY] coordinates in window space
   */
  _applyOffset (worldX, worldY) {
    return this._worldToLocal(worldX, worldY)
  }

  /**
   * Override SubMask's _removeOffset - delegates to _localToWorld for consistency
   * @param {number} localX - Local X coordinate
   * @param {number} localY - Local Y coordinate
   * @returns {Array<number>} [worldX, worldY] coordinates in world space
   */
  _removeOffset (localX, localY) {
    return this._localToWorld(localX, localY)
  }

  /**
   * Check if world coordinates are within this SubBoard's bounds
   * @protected
   * @param {number} worldX - World X coordinate
   * @param {number} worldY - World Y coordinate
   * @returns {boolean} True if coordinates are within window bounds
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
   * Override SubMask's _isInWindow - delegates to _isInWorldBounds for consistency
   * @protected
   * @param {number} worldX - World X coordinate
   * @param {number} worldY - World Y coordinate
   * @returns {boolean} True if coordinates are within window bounds
   */
  _isInWindow (worldX, worldY) {
    return this._isInWorldBounds(worldX, worldY)
  }

  // ============================================================================
  // ELEMENT ACCESS - Get/set values with world-relative coordinates
  // ============================================================================

  /**
   * Set value at world-relative coordinates
   * @param {number} worldX - World X coordinate
   * @param {number} worldY - World Y coordinate
   * @param {number} [color=1] - Color value to set (1-255 depending on depth)
   * @returns {bigint} The updated bitboard value
   * @throws {Error} If coordinates are out of window bounds
   */
  set (worldX, worldY, color = 1) {
    if (!this._isInWorldBounds(worldX, worldY)) {
      throw new Error(
        `Coordinates (${worldX}, ${worldY}) out of window bounds [${
          this.offsetX
        }, ${this.offsetX + this.windowWidth - 1}] x [${this.offsetY}, ${
          this.offsetY + this.windowHeight - 1
        }]`
      )
    }
    const [localX, localY] = this._worldToLocal(worldX, worldY)
    return this.mask.set(localX, localY, color)
  }

  // ============================================================================
  // ITERATION - Generators for occupied cells in world coordinates
  // ============================================================================

  /**
   * Generator yielding occupied cell locations in world coordinates
   * @generator
   * @yields {Array<number>} [worldX, worldY] coordinates of occupied cells
   */
  *occupiedLocations () {
    for (const [localX, localY] of this.mask.occupiedLocations()) {
      yield this._localToWorld(localX, localY)
    }
  }

  /**
   * Generator yielding occupied cell locations and values in world coordinates
   * @generator
   * @yields {Array<number>} [worldX, worldY, value] tuples of occupied cells
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
  // ============================================================================
  // DELEGATION - Properties delegated to underlying mask
  // ============================================================================

  /** @type {number} The occupancy percentage of the mask (0-1) */
  get occupancy () {
    return this.mask.occupancy
  }

  /** @type {string} ASCII representation of the mask grid */
  get toAscii () {
    return this.mask.toAscii
  }

  /**
   * Get ASCII representation with custom symbols
   * @param {Object} symbols - Symbol mapping for rendering
   * @returns {string} ASCII representation with custom symbols
   */
  toAsciiWith (symbols) {
    return this.mask.toAsciiWith(symbols)
  }

  /** @type {number} Minimum dimension of occupied region */
  get minSize () {
    return this.mask.minSize
  }

  /** @type {number} Maximum dimension of occupied region */
  get maxSize () {
    return this.mask.maxSize
  }

  /** @type {boolean} True if occupied region is taller than wide */
  get isTall () {
    return this.mask.isTall
  }

  /** @type {boolean} True if occupied region is wider than tall */
  get isWide () {
    return this.mask.isWide
  }

  /** @type {boolean} True if occupied region is square */
  get isSquare () {
    return this.mask.isSquare
  }

  // ============================================================================
  // COPY OPERATIONS - Transfer data between masks
  // ============================================================================

  /**
   * Clamp value to target mask's cell mask
   * @private
   * @param {number|bigint} value - Value to clamp
   * @param {number|bigint} targetMask - Target mask value for the store
   * @returns {number|bigint} Clamped value
   */
  _clampToDepth (value, targetMask) {
    if (typeof targetMask === 'bigint') {
      return BigInt(value) & targetMask
    }
    return Number(value) & targetMask
  }

  /**
   * Copy occupied cells from a larger mask into this window
   * Only copies values that are within this window's bounds and positive
   * @param {Object} largeMask - Source mask to copy from
   */
  copyFromMask (largeMask) {
    const depth = this.mask.store.cellMask
    for (let localY = 0; localY < this.windowHeight; localY++) {
      for (let localX = 0; localX < this.windowWidth; localX++) {
        const [worldX, worldY] = this._localToWorld(localX, localY)
        const value = largeMask.at(worldX, worldY)
        if (value > 0) {
          const clampedValue = this._clampToDepth(value, depth)
          this.mask.set(localX, localY, clampedValue)
        }
      }
    }
  }

  /**
   * Copy this window's occupied cells into a larger mask
   * @param {Object} largeMask - Target mask to copy to
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
   * Compute overlap between this window and a larger mask
   * @param {Object} largeMask - Mask to overlap with
   * @returns {SubBoard} New SubBoard containing only overlapping cells
   */
  overlap (largeMask) {
    const overlap = this.emptyMask
    overlap.copyFromMask(largeMask)
    overlap.mask.overlapWithBits(this.mask.bits)
    return overlap
  }

  /**
   * Apply this window's cells as an overlap mask onto a larger mask
   * @param {Object} largeMask - Target mask for overlap
   */
  overlapWith (largeMask) {
    const overlap = this.emptyMask
    overlap.copyFromMask(largeMask)
    this.mask.overlapWithBits(overlap.mask.bits)
  }

  /**
   * Convert this window to a new mask of specified dimensions
   * @param {number} newWidth - Width of new mask
   * @param {number} newHeight - Height of new mask
   * @returns {Object} New mask with this window's local content
   */
  toMask (newWidth, newHeight) {
    const newMask = this.mask.emptyMaskOfSize(newWidth, newHeight)
    this.copyToMask(newMask)
    return newMask
  }

  /**
   * Convert this window to a new mask matching another mask's dimensions and depth
   * @param {Object} otherMask - Template mask for dimensions/depth
   * @returns {Object} New mask matching otherMask's properties
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
   * Extract occupancy layer (1-bit) from this window
   * @returns {SubBoard} New SubBoard with occupancy-only layer
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
   * Shrink this window to minimum bounding box of occupied cells
   * @returns {SubBoard} New SubBoard with shrunken bounds
   */
  shrinkToOccupied () {
    const shrunkMask = this.mask.shrinkToOccupied()
    return this._createSubBoardFromMask(shrunkMask, this.offsetX, this.offsetY)
  }

  /**
   * Extract a single color layer from this window
   * @param {number} color - Color value to extract
   * @returns {SubBoard} New SubBoard containing only cells matching color
   */
  extractColorLayer (color) {
    const layer = this.mask.extractColorLayer(color)
    return this.shiftToThis(layer)
  }

  /**
   * Extract all individual color layers from this window
   * @returns {Array<SubBoard>} Array of SubBoards, one per color
   */
  extractColorLayers () {
    return this.mask.extractColorLayers().map(layer => this.shiftToThis(layer))
  }

  // ============================================================================
  // COORDINATE SERIALIZATION - Convert to/from coordinate arrays
  // ============================================================================

  /**
   * Load window contents from a list of world-relative coordinates
   * @param {Array<Array<number>>} coords - [x, y, value] tuples in world coordinates
   */
  copyFromCoords (coords) {
    for (const [worldX, worldY, value] of coords) {
      if (this.isValid(worldX, worldY)) {
        this.set(worldX, worldY, value)
      }
    }
  }

  /**
   * Get all occupied cells as coordinate tuples in world coordinates
   * For multi-bit (colored) grids, includes color value: [x, y, value]
   * For single-bit grids, includes only position: [x, y]
   * @returns {Array<Array<number>>} Array of [worldX, worldY] or [worldX, worldY, value]
   */
  get toCoords () {
    const coords = []
    const isMultiBit = this.store.bitsPerCell > 0

    for (const [
      localX,
      localY,
      value
    ] of this.mask.occupiedLocationsAndValues()) {
      const [worldX, worldY] = this._localToWorld(localX, localY)
      coords.push(isMultiBit ? [worldX, worldY, value] : [worldX, worldY])
    }

    return coords
  }

  /**
   * Populate mask from coordinate list (helper to eliminate duplication)
   * @private
   * @param {SubBoard} subBoard - SubBoard instance to populate
   * @param {Array<Array<number>>} coords - Coordinates to populate from
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
        subBoard.mask.set(x, y, value)
      }
    }
  }

  // ============================================================================
  // STATIC FACTORY METHODS - Create SubBoards from various inputs
  // ============================================================================

  /**
   * Create empty SubBoard from template
   * @static
   * @param {Object} template - Template mask for creating new masks
   * @param {number} [width=template.width] - Width of new SubBoard
   * @param {number} [height=template.height] - Height of new SubBoard
   * @param {number} [offsetX=0] - X offset in world space
   * @param {number} [offsetY=0] - Y offset in world space
   * @param {number} [depth=template.depth] - Color depth
   * @returns {SubBoard} New empty SubBoard
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
   * Create SubBoard from mask at specified offset
   * @static
   * @param {Object} mask - Source mask
   * @param {number} offsetX - X offset in world space
   * @param {number} offsetY - Y offset in world space
   * @param {number} width - Width of window
   * @param {number} height - Height of window
   * @returns {SubBoard} New SubBoard at given offset
   */
  static fromMask (mask, offsetX, offsetY, width, height) {
    const sb = new SubBoard(offsetX, offsetY, width, height, null, mask)
    sb.copyFromMask(mask)
    return sb
  }

  /**
   * Embed mask as SubBoard at specified offset
   * @static
   * @param {MaskBase|Packed} mask - Mask to embed
   * @param {number} offsetX - X offset in world space
   * @param {number} offsetY - Y offset in world space
   * @returns {SubBoard} New SubBoard wrapping the mask
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
   * Create SubBoard from coordinate list using bounding box
   * @static
   * @param {Array<Array<number>>} coords - [x, y, value] tuples in world coordinates
   * @param {MaskBase|Packed|null} base - Base mask, or null to create from template
   * @param {MaskBase|Packed} template - Template mask for creating empty masks
   * @param {number} [offsetX=0] - Additional X offset to apply
   * @param {number} [offsetY=0] - Additional Y offset to apply
   * @returns {SubBoard} New SubBoard containing the coordinates
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
   * Create SubBoard from coordinate list with swapped X/Y (row-column to X/Y)
   * @param {Array<Array<number>>} coords - [row, col, value] tuples
   * @param {MaskBase|Packed|null} base - Base mask, or null to create from template
   * @param {MaskBase|Packed} template - Template mask for creating empty masks
   * @param {number} [offsetX=0] - Additional X offset to apply
   * @param {number} [offsetY=0] - Additional Y offset to apply
   * @returns {SubBoard} New SubBoard with coordinates swapped to X/Y
   */
  static fromXYcoords (coords, base, template, offsetX = 0, offsetY = 0) {
    return SubBoard.fromCoords(coords, base, template, offsetX, offsetY)
  }

  /**
   * Create SubBoard from row-column coordinates (swaps to X/Y internally)
   * @param {Array<Array<number>>} coords - [row, col, value] tuples
   * @param {MaskBase|Packed|null} base - Base mask, or null to create from template
   * @param {MaskBase|Packed} template - Template mask for creating empty masks
   * @param {number} [offsetX=0] - Additional X offset to apply
   * @param {number} [offsetY=0] - Additional Y offset to apply
   * @returns {SubBoard} New SubBoard with swapped coordinates
   */
  static fromRCcoords (coords, base, template, offsetX = 0, offsetY = 0) {
    const xyCoords = coords.map(c => [c[1], c[0], c[2] || 1])
    return SubBoard.fromCoords(xyCoords, base, template, offsetX, offsetY)
  }

  /**
   * Create SubBoard from coordinate list using square bounding box
   * Creates a square window that fits all coordinates
   * @static
   * @param {Array<Array<number>>} coords - [x, y, value] tuples in world coordinates
   * @param {MaskBase|Packed|null} base - Base mask, or null to create from template
   * @param {MaskBase|Packed} template - Template mask for creating empty masks
   * @returns {SubBoard} New square SubBoard containing the coordinates
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
   * Create expanded SubBoard helper
   * Shared logic for morphology expand operations
   * @private
   * @param {MaskBase|Packed} morphedMask - Result from morphology operation
   * @param {number} borderSize - Size of border added
   * @returns {SubBoard} New SubBoard with expanded bounds
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
   * Create SubBoard from mask (helper for shrinkToOccupied)
   * @private
   * @param {MaskBase|Packed} mask - Source mask
   * @param {number} offsetX - X offset
   * @param {number} offsetY - Y offset
   * @returns {SubBoard} New SubBoard
   */
  _createSubBoardFromMask (mask, offsetX, offsetY) {
    return new SubBoard(offsetX, offsetY, mask.width, mask.height, mask)
  }

  /**
   * Shift mask to window position and create SubBoard
   * @param {MaskBase|Packed} mask - Mask to shift
   * @returns {SubBoard} New SubBoard at window's position
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
   * Get empty mask at window position
   * @type {SubBoard} Empty SubBoard at same position and size
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
   * Create empty mask of specified dimensions at window position
   * @param {number} width - Width of new mask
   * @param {number} height - Height of new mask
   * @returns {SubBoard} Empty SubBoard at window position
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
   * Dilate with border, filling border with specified value
   * Creates expanded grid by adding border of empty cells then dilating into them
   * @param {number} [borderSize=1] - Size of border to add on all sides
   * @param {number} [fillValue=0] - Value to fill border with (typically 0 or empty)
   * @returns {SubBoard} New expanded SubBoard with dilated content
   */
  dilateExpand (borderSize = 1, fillValue = 0) {
    const dilated = this.mask.dilateExpand(borderSize, fillValue)
    return this._createExpandedSubBoard(dilated, borderSize)
  }

  /**
   * Dilate with border, treating border as background for expansion
   * Like dilateExpand but uses "flat" dilation that expands into background
   * @param {number} [borderSize=1] - Size of border to add on all sides
   * @returns {SubBoard} New expanded SubBoard with dilated content
   */
  flatDilateExpand (borderSize = 1) {
    const dilated = this.mask.flatDilateExpand(borderSize)
    return this._createExpandedSubBoard(dilated, borderSize)
  }

  /**
   * Simple dilation by one unit
   * Convenience method for dilateExpand(1, 0)
   * @returns {SubBoard} New SubBoard with dilated content
   */
  dilate () {
    return this.dilateExpand(1, 0)
  }
}
