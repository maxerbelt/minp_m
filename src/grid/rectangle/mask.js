import { minMaxXY } from '../../core/utilities.js'
import { Random } from '../../core/Random.js'
import { BlitOperation } from '../operations/BlitOperation.js'
import { SubMask } from '../SubMask.js'
import { SubBoard } from '../subBoard.js'
import { StoreBig } from '../bitStore/storeBig.js'
import { RectMaskBase } from './RectMaskBase.js'

/**
 * Mask - Rectangular grid mask implementation
 *
 * Provides bitmask operations for rectangular grids with (x, y) coordinates.
 * Supports morphological operations (dilate, erode), coordinate conversion,
 * and grid transformations specific to rectangular topology.
 * Uses BigInt-based storage for efficient memory usage.
 *
 * @extends RectMaskBase
 */
export class Mask extends RectMaskBase {
  /**
   * Get cached blit operation instance
   * @returns {BlitOperation} Blit operation instance for this mask
   * @private
   */
  get _blit () {
    if (!this.__blit) this.__blit = new BlitOperation(this)
    return this.__blit
  }

  /**
   * Get empty bitboard value
   * @returns {bigint} Empty bitboard (0n)
   */
  emptyBitboard () {
    return 0n
  }

  /**
   * Get default store for this mask type
   * @param {number} depth - Color depth
   * @returns {StoreBig} BigInt-based store instance
   */
  defaultStore (depth) {
    return new StoreBig(depth, this.area, null, this.width, this.height)
  }

  /**
   * Get default variant transformation
   * @returns {Mask} This instance with default variant applied
   * @throws {Error} If no default transform is found
   */
  get defaultVariant () {
    const defaultBits = this.actions?.defaultVariant
    if (defaultBits) {
      this.bits = defaultBits
    } else {
      throw new Error('No default transform found for this shape')
    }
    return this
  }

  // ============================================================================
  // Cell Access - set, at, test, clear, add
  // ============================================================================

  /**
   * Set cell value at (x, y) with optional color
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} [color=1] - Value to set
   * @returns {bigint} Updated bits value
   */
  set (x, y, color = 1) {
    const loc = this.for(x, y)
    this.bits = loc.set(color)
    return this.bits
  }

  /**
   * Get cell value at (x, y)
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {*} Cell value at the coordinates
   */
  at (x, y) {
    return this.for(x, y).readCellValue()
  }

  /**
   * Test if cell at (x, y) matches color value
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} [color=1] - Color value to test for
   * @returns {boolean} True if cell matches the color
   */
  test (x, y, color = 1) {
    return this.for(x, y).hasColor(color)
  }

  // ============================================================================
  // Random & Coordinate Conversion
  // ============================================================================

  /**
   * Get a random occupied coordinate
   * @returns {Array<number>} [x, y] coordinate of a random occupied cell
   */
  get randomOccupied () {
    const coords = this.toCoords
    return Random.element(coords)
  }

  /**
   * Get all occupied cells as [x, y] coordinate array
   * @returns {Array<Array<number>>} Array of [x, y] coordinates
   */
  get toCoords () {
    return this._coords.bitsToCoordinates().map(a => a.slice(0, 2))
  }

  /**
   * Create a window (sub-mask) of this mask
   * @param {number} x - X offset
   * @param {number} y - Y offset
   * @param {number} width - Window width
   * @param {number} height - Window height
   * @returns {SubMask} Sub-mask instance
   */
  window (x, y, width, height) {
    const w = new SubMask(this, x, y, width, height)
    return w
  }

  /**
   * Create a section (sub-board) of this mask
   * @param {number} x - X offset
   * @param {number} y - Y offset
   * @param {number} width - Section width
   * @param {number} height - Section height
   * @returns {SubBoard} Sub-board instance
   */
  section (x, y, width, height) {
    return SubBoard.fromMask(this, x, y, width, height)
  }

  /**
   * Embed this mask at specified position
   * @param {number} x - X position
   * @param {number} y - Y position
   * @returns {SubBoard} Embedded sub-board instance
   */
  embed (x, y) {
    return SubBoard.embed(this, x, y)
  }

  /**
   * Create a temporary board of specified size
   * @param {number} [x=0] - X offset
   * @param {number} [y=0] - Y offset
   * @param {number} [w=this.width] - Width
   * @param {number} [h=this.height] - Height
   * @returns {SubBoard} Temporary sub-board instance
   */
  tempBoard (x = 0, y = 0, w = this.width, h = this.height) {
    return SubBoard.fromMask(this.emptyMaskOfSize(w, h), x, y, w, h)
  }

  /**
   * Create list of masks from coordinate arrays
   * @param {Array<Array<Array<number>>>} coords - Array of coordinate arrays
   * @returns {Array<Mask>|null} Array of mask instances or null if empty
   */
  static listFromCoords (coords) {
    if (!coords || coords.length === 0) return null
    return coords.map(c => Mask.fromCoords(c))
  }

  /**
   * Create list of square masks from coordinate arrays
   * @param {Array<Array<Array<number>>>} coords - Array of coordinate arrays
   * @returns {Array<Mask>|null} Array of square mask instances or null if empty
   */
  static listFromCoordsSquare (coords) {
    if (!coords || coords.length === 0) return null
    return coords.map(c => Mask.fromCoordsSquare(c))
  }

  /**
   * Create list of masks from XY coordinate arrays (alias)
   * @param {Array<Array<Array<number>>>} coords - Array of coordinate arrays
   * @returns {Array<Mask>|null} Array of mask instances or null if empty
   */
  static listFromXYcoords (coords) {
    return Mask.listFromCoords(coords)
  }

  /**
   * Create list of masks from RC coordinate arrays
   * @param {Array<Array<Array<number>>>} coords - Array of coordinate arrays
   * @returns {Array<Mask>|null} Array of mask instances or null if empty
   */
  static listFromRCcoords (coords) {
    if (!coords || coords.length === 0) return null
    return coords.map(c => Mask.fromRCcoords(c))
  }

  /**
   * Create list of square masks from XY coordinate arrays (alias)
   * @param {Array<Array<Array<number>>>} coords - Array of coordinate arrays
   * @returns {Array<Mask>|null} Array of square mask instances or null if empty
   */
  static listFromXYcoordsSquare (coords) {
    return Mask.listFromCoordsSquare(coords)
  }

  /**
   * Create list of square masks from RC coordinate arrays
   * @param {Array<Array<Array<number>>>} coords - Array of coordinate arrays
   * @returns {Array<Mask>|null} Array of square mask instances or null if empty
   */
  static listFromRCcoordsSquare (coords) {
    if (!coords || coords.length === 0) return null
    return coords.map(c => Mask.fromRCcoordsSquare(c))
  }

  /**
   * Create mask from [x, y] coordinate array with optional dimensions
   * @param {Array<Array<number>>} coords - Array of [x, y] coordinates
   * @param {number} [width=null] - Optional width
   * @param {number} [height=null] - Optional height
   * @returns {Mask} New mask instance
   */
  static fromCoords (coords, width = null, height = null) {
    const { maxX, maxY, depth } = minMaxXY(coords)

    width = Math.max(maxX + 1, width || -Infinity)
    height = Math.max(maxY + 1, height || -Infinity)
    const msk = new Mask(width, height, null, null, depth)
    msk.fromCoords(coords)
    return msk
  }

  /**
   * Create mask from [r, c] coordinate array (row/column) with optional width
   * @param {Array<Array<number>>} coords - Array of [r, c] coordinates
   * @param {number} [width=null] - Optional width
   * @returns {Mask} New mask instance
   */
  static fromRCcoords (coords, width = null) {
    return Mask.fromCoords(RectMaskBase.invertCoords(coords), width)
  }

  /**
   * Create mask from [x, y] coordinate array (alias)
   * @param {Array<Array<number>>} coords - Array of [x, y] coordinates
   * @param {number} [width=null] - Optional width
   * @returns {Mask} New mask instance
   */
  static fromXYcoords (coords, width = null) {
    return Mask.fromCoords(coords, width)
  }

  /**
   * Create empty mask of specified size
   * @param {number} newWidth - New mask width
   * @param {number} newHeight - New mask height
   * @returns {Mask} New empty mask instance
   */
  emptyOfSize (newWidth, newHeight) {
    const msk = new Mask(newWidth, newHeight, null, null, this.depth)
    return msk
  }

  /**
   * Create square mask from [x, y] coordinates (alias)
   * @param {Array<Array<number>>} coords - Array of [x, y] coordinates
   * @param {number} [width=null] - Optional width
   * @returns {Mask} New square mask instance
   */
  static fromXYcoordsSquare (coords, width = null) {
    return Mask.fromCoordsSquare(coords, width)
  }

  /**
   * Create square mask from [r, c] coordinates (row/column)
   * @param {Array<Array<number>>} coords - Array of [r, c] coordinates
   * @param {number} [width=null] - Optional width
   * @returns {Mask} New square mask instance
   */
  static fromRCcoordsSquare (coords, width = null) {
    return Mask.fromCoordsSquare(RectMaskBase.invertCoords(coords), width)
  }

  /**
   * Create square mask from [x, y] coordinate array with optional dimensions
   * @param {Array<Array<number>>} coords - Array of [x, y] coordinates
   * @param {number} [width=null] - Optional width
   * @returns {Mask} New square mask instance
   */
  static fromCoordsSquare (coords, width = null) {
    // Handle empty coordinates array
    if (!coords || coords.length === 0) {
      return new Mask(1, 1, 0n, null, 2)
    }
    const { maxX, maxY, depth } = minMaxXY(coords)
    const size = Math.max(maxX + 1, maxY + 1, width || -Infinity)
    const msk = new Mask(size, size, null, null, depth)
    msk.fromCoords(coords)
    return msk
  }
  /**
   * Convert bits to coordinates and store in this mask
   */
  fromCoords (coords) {
    this._coords.fromCoordinates(coords)
  }

  /**
   * Convert coordinate array to bits (utility function)
   */
  bitsFromCoords (coords) {
    return this._coords.coordinatesToBits(coords)
  }

  // ============================================================================

  // ============================================================================
  // Iteration
  // ============================================================================

  /**
   * Iterate over indices of set bits
   */
  *bitsIndices () {
    yield* this.indexer.bitsIndices(this.bits)
  }
  *indices () {
    yield* this.indexer.indices(this.bits)
  }

  /**
   * Iterate over [x, y] coordinates of set bits
   */
  *bitKeys () {
    yield* this.indexer.bitKeys(this.bits)
  }

  // ============================================================================
  // Blit Operations
  // ============================================================================

  /**
   * Copy rectangular region from source mask to destination
   * @param {Mask} src - Source mask
   * @param {number} srcX - Source X offset
   * @param {number} srcY - Source Y offset
   * @param {number} width - Region width
   * @param {number} height - Region height
   * @param {number} dstX - Destination X offset
   * @param {number} dstY - Destination Y offset
   * @param {string} [mode='copy'] - Blit mode
   */
  /**
   * Blit wrapper accepting an options bag to keep parameter count low.
   * Maintains a small public surface but forwards to the BlitOperation.
   * @param {Object} src - Source mask/grid
   * @param {Object} [opts] - Options describing source/destination rectangle
   * @param {number} [opts.srcX]
   * @param {number} [opts.srcY]
   * @param {number} [opts.width]
   * @param {number} [opts.height]
   * @param {number} [opts.dstX]
   * @param {number} [opts.dstY]
   * @param {string} [opts.mode='copy']
   */
  blit (src, opts = {}) {
    const {
      srcX = 0,
      srcY = 0,
      width = 0,
      height = 0,
      dstX = 0,
      dstY = 0,
      mode = 'copy'
    } = opts
    this._blit.blit({ src, srcX, srcY, width, height, dstX, dstY, mode })
  }

  // ============================================================================
  // Flood Fill Utilities
  // ============================================================================

  // ============================================================================
  // Dimension Manipulation
  // ============================================================================

  /**
   * Expand mask border symmetrically on all sides.
   * Creates a new mask with expanded dimensions, placing original content
   * at the specified offset with fillValue padding around it.
   *
   * @param {number} borderSize - Number of cells to expand on each side
   * @returns {Mask} New mask with expanded dimensions
   */
  expandBorderMask (borderSize = 1) {
    const newWidth = this.width + 2 * borderSize
    const newHeight = this.height + 2 * borderSize

    // Use store's expand method with symmetric offsets
    const expandedBits = this.store.expandToWidthWithXYOffset(
      this.width,
      this.height,
      this.bits,
      newWidth,
      borderSize,
      borderSize
    )

    return new Mask(newWidth, newHeight, expandedBits, null, this.depth)
  }

  /**
   * Flatten and expand mask border.
   * Expands the mask while collapsing color layers to single bit (depth 1).
   * Creates new mask with expanded dimensions and flattened bit representation.
   *
   * @param {number} borderSize - Number of cells to expand on each side
   * @returns {Mask} New flattened mask with expanded dimensions
   */
  flattenExpandMask (borderSize = 1) {
    const newWidth = this.width + 2 * borderSize
    const newHeight = this.height + 2 * borderSize

    // Create flattened version (all colors collapsed to 1-bit representation)
    const flattenedBits = this.store.expandToWidthWithXYOffset(
      this.width,
      this.height,
      this.bits,
      newWidth,
      borderSize,
      borderSize
    )

    // Return with depth 1 to indicate single-bit representation
    return new Mask(newWidth, newHeight, flattenedBits, null, 1)
  }

  /**
   * Get edge masks for morph operations on rectangular grid
   * Returns {left, right, top, bottom, notLeft, notRight, notTop, notBottom}
   * @returns {Object} Edge mask object
   */
  edgeMasks () {
    const empty = this.store.empty
    let left = this.store.createEmptyBitboard(empty)
    let right = this.store.createEmptyBitboard(empty)
    let top = this.store.createEmptyBitboard(empty)
    let bottom = this.store.createEmptyBitboard(empty)

    for (let x = 0; x < this.width; x++) {
      top = this.store.setIdx(top, this.index(x, 0), this.one)
      bottom = this.store.setIdx(
        bottom,
        this.index(x, this.height - 1),
        this.one
      )
    }

    for (let y = 0; y < this.height; y++) {
      left = this.store.setIdx(left, this.index(0, y), this.one)
      right = this.store.setIdx(right, this.index(this.width - 1, y), this.one)
    }

    const notLeft = this.store.invertedBits(left)
    const notRight = this.store.invertedBits(right)
    const notTop = this.store.invertedBits(top)
    const notBottom = this.store.invertedBits(bottom)

    return { left, right, top, bottom, notRight, notLeft, notTop, notBottom }
  }

  // ============================================================================
  // Factory Methods
  // ============================================================================

  /**
   * Create empty rectangular mask
   * @param {number} width - Mask width
   * @param {number} height - Mask height
   * @returns {Mask} New empty mask instance
   */
  static empty (width, height) {
    return new Mask(width, height, 0n, null, 2)
  }

  /**
   * Create full (all bits set) rectangular mask
   * @param {number} width - Mask width
   * @param {number} height - Mask height
   * @returns {Mask} New full mask instance
   */
  static full (width, height) {
    const mask = Mask.empty(width, height)
    mask.bits = mask.fullBits
    return mask
  }

  /**
   * Get empty mask of same dimensions
   * @returns {Mask} Empty mask with same width and height
   */
  get emptyMask () {
    return Mask.empty(this.width, this.height)
  }

  /**
   * Assemble color layers into bit arrays
   * @param {Array} colorLayers - Color layer data
   * @param {number} gridWidth - Grid width
   * @param {number} gridHeight - Grid height
   * @param {number} depth - Color depth
   * @returns {*} Array of assembled bit arrays
   */
  static assembleColorLayersBits (colorLayers, gridWidth, gridHeight, depth) {
    const store = new StoreBig(
      depth,
      gridWidth * gridHeight,
      null,
      gridWidth,
      gridHeight
    )
    return store.assembleColorLayers(colorLayers, gridWidth, gridHeight)
  }

  /**
   * Assemble color layers into mask instances
   * @param {Array} colorLayers - Color layer data
   * @param {number} gridWidth - Grid width
   * @param {number} gridHeight - Grid height
   * @param {number} depth - Color depth
   * @returns {Array<Mask>} Array of mask instances
   */
  static assembleColorLayers (colorLayers, gridWidth, gridHeight, depth) {
    return Mask.assembleColorLayersBits(
      colorLayers,
      gridWidth,
      gridHeight,
      depth
    ).map(bits => new Mask(gridWidth, gridHeight, bits, null, depth))
  }
}
