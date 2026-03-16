import { MaskBase } from './MaskBase.js'
import { lazy } from '../utilities.js'
import { buildTransformMaps } from './buildTransformMaps.js'
import { ShapeEnum } from './shapeEnum.js'
import { Store32 } from './store32.js'
import { BitMath } from './bitMath.js'

export class Packed extends MaskBase {
  constructor (width, height, bits, store, depth = 4) {
    const bitlength = BitMath.bitLength32(depth)
    store =
      store || new Store32(depth, width * height, bitlength, width, height)
    bits = bits || store.newWords()
    super(ShapeEnum.rectangle(width, height), depth, bits, store)
    this.words = store.words
    lazy(this, 'transformMaps', () => {
      return buildTransformMaps(this.width, this.height)
    })
  }

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

  emptyBitboard () {
    return this.store.empty
  }
  emptyOfSize (newWidth, newHeight) {
    const msk = new Packed(newWidth, newHeight, null, null, this.depth)
    return msk
  }
  rotate () {
    const rotated = this.actions?.rotate(this)
    if (rotated) {
      this.bits = rotated.bits
    } else {
      throw new Error('No non-symmetric rotation found for this shape')
    }
  }
  rotateFlip () {
    const rotated = this.actions?.rotateFlip(this)
    if (rotated) {
      this.bits = rotated.bits
    } else {
      throw new Error('No non-symmetric rotation found for this shape')
    }
  }
  rotateCCW () {
    const rotated = this.actions?.rotateCCW(this)
    if (rotated) {
      this.bits = rotated.bits
    } else {
      throw new Error('No non-symmetric rotation found for this shape')
    }
  }
  flip () {
    const flipped = this.actions?.flip(this)
    if (flipped) {
      this.bits = flipped.bits
    } else {
      throw new Error('No non-symmetric flip found for this shape')
    }
  }
  canRotate () {
    const capabilities = this.getTransformCapabilities()
    return capabilities.canRotate || false
  }
  canFlip () {
    const capabilities = this.getTransformCapabilities()
    return capabilities.canFlip || false
  }
  get actions () {
    if (
      !this._actions ||
      !this.store.bitEqual(this._actions?.original?.bits, this.bits)
    ) {
      this._actions = this.indexer?.actions(this)
    }
    return this._actions
  }
  getTransformCapabilities () {
    return this.indexer?.getTransformCapabilities(this) || {}
  }
  // ============================================================================
  // Indexing & Bit Positioning
  // ============================================================================

  /**
   * Convert rectangular (x, y) to linear index
   */
  index (x, y) {
    return y * this.width + x
  }

  /**
   * Get bit position in store for rectangular coordinates
   */
  bitPos (x, y) {
    return this.store.bitPos(this.index(x, y))
  }

  /**
   * Get reference object for cell at (x, y)
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
   */
  at (x, y) {
    const idx = this.index(x, y)
    return this.store.getIdx(this.bits, idx)
  }

  /**
   * Set cell value at (x, y) to specified color
   */
  set (x, y, color = 1) {
    this.bits = this.store.setIdx(this.bits, this.index(x, y), color)
    return this.bits
  }

  /**
   * Test if cell at (x, y) matches specified color
   * Standard interface - use instead of testFor
   */
  test (x, y, color = 1) {
    return this.at(x, y) === color
  }

  /**
   * Test if cell at (x, y) matches specified color (legacy alias)
   */
  testFor (x, y, color = 1) {
    return this.test(x, y, color)
  }

  /**
   * Clear (zero out) a cell at (x, y)
   */
  clear (x, y) {
    return this.set(x, y, 0)
  }

  /**
   * Check if cell at (x, y) has non-zero value
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
   */
  setRange (r, c0, c1, color = 1) {
    const i0 = this.index(c0, r)
    const i1 = this.index(c1, r)
    this.bits = this.store.setRange(this.bits, i0, i1, color)
  }

  /**
   * Clear range of cells in row
   */
  clearRange (r, c0, c1) {
    this.setRange(r, c0, c1, 0)
  }

  // ============================================================================
  // Occupancy & Normalization
  // ============================================================================

  /**
   * Get occupancy mask (1-bit per cell indicating if occupied)
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
   */
  static empty (width, height, depth = 4) {
    return new Packed(width, height, 0n, null, depth)
  }

  /**
   * Create full (all bits set) packed grid
   */
  static full (width, height) {
    const mask = Packed.empty(width, height)
    mask.bits = mask.fullBits
    return mask
  }
  get singleBitMask () {
    if (this.store.bitsPerCell === 1) return this.emptyMask
    if (this._singleBitMaskCache) return this._singleBitMaskCache
    this._singleBitMaskCache = Packed.empty(this.width, this.height, 2)
    return this._singleBitMaskCache.emptyMask
  }
  /**
   * Get empty packed grid of same dimensions and depth
   */
  get emptyMask () {
    return Packed.empty(this.width, this.height, this.depth)
  }

  // ============================================================================
  // Type Checking
  // ============================================================================

  /**
   * Verify compatible mask type for operations
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
   * @private
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
   */
  dilate (radius = 1) {
    this.bits = this.dilateBits(radius)
    return this
  }

  /**
   * Get dilated bits without mutation
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
   */
  dilateCross () {
    this.bits = this.dilateCrossBits()
    return this
  }

  /**
   * Get cross-dilated bits without mutation
   */
  dilateCrossBits () {
    const edges = this.edgeMasks()
    return this.store.dilateCrossStep(this.bits, edges, this.width, this.height)
  }
}
