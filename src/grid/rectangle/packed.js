import { lazy } from '../../core/utilities.js'
import { buildTransformMaps } from './buildTransformMaps.js'
import { Store32 } from '../bitStore/store32.js'
import { BitMath } from '../bitMath.js'
import { RectMaskBase } from './RectMaskBase.js'

/**
 * Packed - Packed rectangular grid mask implementation
 *
 * Provides bitmask operations for packed rectangular grids using Store32.
 * Supports morphological operations (dilate, erode), coordinate conversion,
 * and grid transformations with efficient 32-bit word storage.
 */
export class Packed extends RectMaskBase {
  /**
   * Create a new packed rectangular grid mask
   * @param {number} width - Grid width
   * @param {number} height - Grid height
   * @param {*} bits - Bit representation of the mask data (optional)
   * @param {Store32} store - Bit storage implementation (optional)
   * @param {number} [depth=4] - Color depth
   */
  constructor (width, height, bits, store, depth = 4) {
    const bitlength = BitMath.bitLength32(depth)
    store =
      store || new Store32(depth, width * height, bitlength, width, height)
    bits = bits || store.newWords()
    super(width, height, bits, store, depth)
    this.words = store.words
    lazy(this, 'transformMaps', () => {
      return buildTransformMaps(this.width, this.height)
    })
  }

  /**
   * Get default store for this mask type
   * @param {number} depth - Color depth
   * @returns {Store32} Store32 instance
   */
  defaultStore (depth) {
    const bitlength = BitMath.bitLength32(depth)
    return new Store32(
      depth,
      this.width * this.height,
      bitlength,
      this.width,
      this.height
    )
  }

  /**
   * Get empty bitboard value
   * @returns {*} Empty bitboard (store-specific)
   */
  emptyBitboard () {
    return this.store.empty
  }

  /**
   * Create empty mask of specified size
   * @param {number} newWidth - New mask width
   * @param {number} newHeight - New mask height
   * @returns {Packed} New empty mask instance
   */
  emptyOfSize (newWidth, newHeight) {
    const msk = new Packed(newWidth, newHeight, null, null, this.depth)
    return msk
  }

  /**
   * Get reference object for cell at (x, y)
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {*} Reference object for the cell
   */
  readRef (x, y) {
    const i = this.index(x, y)
    return this.store.readRef(i)
  }

  // ============================================================================
  // Cell Access - at, set, testFor, isNonZero
  // ============================================================================

  /**
   * Get cell value at (x, y)
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {*} Cell value at the coordinates
   */
  at (x, y) {
    const idx = this.index(x, y)
    return this.store.getIdx(this.bits, idx)
  }

  /**
   * Set cell value at (x, y) to specified color
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} [color=1] - Value to set
   * @returns {*} Updated bits value
   */
  set (x, y, color = 1) {
    this.bits = this.store.setIdx(this.bits, this.index(x, y), color)
    return this.bits
  }

  /**
   * Test if cell at (x, y) matches specified color
   * Standard interface - use instead of testFor
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} [color=1] - Color value to test for
   * @returns {boolean} True if cell matches the color
   */
  test (x, y, color = 1) {
    return this.at(x, y) === color
  }

  /**
   * Test if cell at (x, y) matches specified color (legacy alias)
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} [color=1] - Color value to test for
   * @returns {boolean} True if cell matches the color
   */
  testFor (x, y, color = 1) {
    return this.test(x, y, color)
  }

  /**
   * Clear (zero out) a cell at (x, y)
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {*} Updated bits value
   */
  clear (x, y) {
    return this.set(x, y, 0)
  }

  /**
   * Check if cell at (x, y) has non-zero value
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {boolean} True if cell has non-zero value
   */
  isNonZero (x, y) {
    const idx = this.index(x, y)
    return this.store.isNonZero(this.bits, idx)
  }

  // ============================================================================
  // Range Operations
  // ============================================================================

  /**
   * Set range of cells in row to specified color
   * @param {number} r - Row index
   * @param {number} c0 - Starting column index
   * @param {number} c1 - Ending column index
   * @param {number} [color=1] - Value to set
   */
  setRange (r, c0, c1, color = 1) {
    const i0 = this.index(c0, r)
    const i1 = this.index(c1, r)
    this.bits = this.store.setRange(this.bits, i0, i1, color)
  }

  /**
   * Clear range of cells in row
   * @param {number} r - Row index
   * @param {number} c0 - Starting column index
   * @param {number} c1 - Ending column index
   */
  clearRange (r, c0, c1) {
    this.setRange(r, c0, c1, 0)
  }

  // ============================================================================
  // Occupancy & Normalization
  // ============================================================================

  /**
   * Get occupancy mask (1-bit per cell indicating if occupied)
   * @returns {Packed} Occupancy mask instance
   */
  occupancyMask () {
    const result = this.singleBitMask
    result.bits = this.store.extractOccuppancyLayer(
      this.bits,
      this.width,
      this.height
    )
    return result
  }

  /**
   * Normalize bits to canonical form (internal optimization)
   */
  normalize () {
    const data = this.bits
    const width = this.width
    const height = this.height
    this.bits = this.store.normalize(data, width, height)
  }

  // ============================================================================
  // Coordinate Conversion
  // ============================================================================

  /**
   * Get all occupied cells as [x, y] coordinate array
   * @returns {Array<Array<number>>} Array of [x, y] coordinates
   */
  get toCoords () {
    const coords = []
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.at(x, y) !== 0) {
          coords.push([x, y])
        }
      }
    }
    return coords
  }

  /**
   * Convert coordinate array to bits and load into this grid
   * For Packed, we need to use cell-level set instead of store.addBit
   * @param {Array<Array<number>>} coords - Array of [x, y] coordinates
   */
  fromCoords (coords) {
    // Clear existing bits first
    this.bits = this.store.newWords()
    // Set each coordinate to value 1
    for (const [x, y] of coords) {
      if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
        this.set(x, y, 1)
      }
    }
  }

  // ============================================================================
  // Factory Methods
  // ============================================================================

  /**
   * Create empty packed grid
   * @param {number} width - Grid width
   * @param {number} height - Grid height
   * @param {number} [depth=4] - Color depth
   * @returns {Packed} New empty packed grid instance
   */
  static empty (width, height, depth = 4) {
    return new Packed(width, height, 0n, null, depth)
  }

  /**
   * Create full (all bits set) packed grid
   * @param {number} width - Grid width
   * @param {number} height - Grid height
   * @returns {Packed} New full packed grid instance
   */
  static full (width, height) {
    const mask = Packed.empty(width, height)
    mask.bits = mask.fullBits
    return mask
  }

  /**
   * Get single bit mask cache
   * @returns {Packed} Single bit mask instance
   * @private
   */
  get singleBitMask () {
    if (this.store.bitsPerCell === 1) return this.emptyMask
    if (this._singleBitMaskCache) return this._singleBitMaskCache
    this._singleBitMaskCache = Packed.empty(this.width, this.height, 2)
    return this._singleBitMaskCache.emptyMask
  }

  /**
   * Get empty packed grid of same dimensions and depth
   * @returns {Packed} Empty mask with same dimensions
   */
  get emptyMask () {
    return Packed.empty(this.width, this.height, this.depth)
  }

  // ============================================================================
  // Type Checking
  // ============================================================================

  /**
   * Verify compatible mask type for operations
   * @param {Packed} bb - Mask instance to check
   * @private
   */
  checkType (bb) {
    if (!(bb instanceof Packed)) {
      throw new Error('union requires a Packed instance')
    }
  }

  // ============================================================================
  // Edge Masks & Boundary Detection
  // ============================================================================

  /**
   * Get edge masks for morph operations on packed grid
   * Returns {left, right, top, bottom, notLeft, notRight, notTop, notBottom}
   * @returns {Object} Edge mask object
   */
  edgeMasks () {
    // generate independent empty bitboards for each edge mask; previous
    // implementation reused the same reference which worked for primitive
    // stores but mutated incorrectly when using arrays.
    const e = this.store.empty
    let left = this.store.createEmptyBitboard(e)
    let right = this.store.createEmptyBitboard(e)
    let top = this.store.createEmptyBitboard(e)
    let bottom = this.store.createEmptyBitboard(e)
    // top and bottom rows
    ;({ top, bottom } = this._markTopBottomEdges(top, bottom))

    // left & right columns
    ;({ left, right } = this._markLeftRightEdges(left, right))
    const notLeft = this.store.invertedBits(left)
    const notRight = this.store.invertedBits(right)
    const notTop = this.store.invertedBits(top)
    const notBottom = this.store.invertedBits(bottom)
    return { left, right, top, bottom, notRight, notLeft, notTop, notBottom }
  }

  /**
   * Mark cells in top and bottom rows
   * @param {*} top - Top edge bits
   * @param {*} bottom - Bottom edge bits
   * @returns {Object} Updated {top, bottom}
   * @private
   */
  _markTopBottomEdges (top, bottom) {
    const store = this.store
    const one = this.one
    for (let x = 0; x < this.width; x++) {
      store.setAtIdx(top, this.index(x, 0), one)
      store.setAtIdx(bottom, this.index(x, this.height - 1), one)
    }
    return { top, bottom }
  }

  /**
   * Mark cells in left and right columns
   * @param {*} left - Left edge bits
   * @param {*} right - Right edge bits
   * @returns {Object} Updated {left, right}
   * @private
   */
  _markLeftRightEdges (left, right) {
    const store = this.store
    const one = this.one
    for (let y = 0; y < this.height; y++) {
      store.setAtIdx(left, this.index(0, y), one)
      store.setAtIdx(right, this.index(this.width - 1, y), one)
    }
    return { left, right }
  }

  // ============================================================================
  // Morphology - Dilation
  // ============================================================================

  /**
   * Dilate packed grid by radius
   * Mutates this.bits and returns this for chaining
   * @param {number} [radius=1] - Dilation radius
   * @returns {Packed} This instance for chaining
   */
  dilate (radius = 1) {
    this.bits = this.dilateBits(radius)
    return this
  }

  /**
   * Get dilated bits without mutation
   * @param {number} [radius=1] - Dilation radius
   * @returns {*} Dilated bits
   */
  dilateBits (radius = 1) {
    const edges = this.edgeMasks()
    return this.store.dilateSeparable(
      this.bits,
      this.width,
      this.store.storeType(radius),
      edges
    )
  }

  /**
   * Cross (cardinal) dilation of packed grid
   * Mutates this.bits and returns this for chaining
   * @returns {Packed} This instance for chaining
   */
  dilateCross () {
    this.bits = this.dilateCrossBits()
    return this
  }

  /**
   * Get cross-dilated bits without mutation
   * @returns {*} Cross-dilated bits
   */
  dilateCrossBits () {
    const edges = this.edgeMasks()
    return this.store.dilateCrossStep(this.bits, edges, this.width, this.height)
  }
}
