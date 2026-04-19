import { MaskBase } from '../MaskBase.js'
import { HexagonShape } from './HexagonShape.js'
import { ActionsHex } from './actionHex.js'
import { Store32 } from '../bitStore/store32.js'
import { BitMath } from '../bitMath.js'

export class PackedHex extends MaskBase {
  constructor (radius, bits, store, depth = 4) {
    const bitlength = BitMath.bitLength32(depth)
    const shape = HexagonShape(radius)
    const size = shape.indexer.size
    store =
      store || new Store32(depth, size, bitlength, shape.width, shape.height)
    bits = bits || store.newWords()

    super(shape, depth, bits, store)
    this.radius = radius
  }

  // ============================================================================
  // Actions
  // ============================================================================

  /**
   * Get cached actions instance or create new one
   */
  get actions () {
    if (this._actions && this._actions?.original?.bits === this.bits) {
      return this._actions
    }
    this._actions = new ActionsHex(this.radius, this)
    return this._actions
  }

  // ============================================================================
  // Cube Coordinate Handling
  // ============================================================================

  /**
   * Get index from cube coordinates (q, r, s)
   * @throws Error if coordinates invalid
   */
  index (q, r, s) {
    const i = this.indexer.index(q, r, s)
    if (i === undefined) {
      throw new Error(`Invalid cube coordinates: ${q},${r},${s}`)
    }
    return i
  }

  /**
   * Get bit position from cube coordinates
   */
  bitPos (q, r, s) {
    return this.store.bitPos(this.index(q, r, s))
  }

  // ============================================================================
  // Cell Access - at, set, testFor, clear
  // ============================================================================

  /**
   * Get cell value at cube coordinates
   */
  at (q, r, s) {
    const idx = this.index(q, r, s)
    return this.store.getIdx(this.bits, idx)
  }

  /**
   * Set cell value at cube coordinates to specified value
   */
  set (q, r, s, value = 1) {
    this.store.setAtIdx(this.bits, this.index(q, r, s), value)
  }

  /**
   * Test if cell at cube coordinates matches specified value
   */
  testFor (q, r, s, value = 1) {
    return this.at(q, r, s) === value
  }

  /**
   * Clear (zero out) cell at cube coordinates
   */
  clear (q, r, s) {
    this.set(q, r, s, 0)
  }

  // ============================================================================
  // Iteration
  // ============================================================================

  /**
   * Iterate over [q, r, s, index] tuples for all cells
   */
  *keys () {
    for (const [loc, i] of this.indexer.qrsToI) {
      const [q, r, s] = this._parseCubeString(loc)
      yield [q, r, s, i]
    }
  }

  /**
   * Iterate over [q, r, s, value, index, mask] tuples for all cells
   */
  *entries () {
    for (const [loc, i] of this.indexer.qrsToI) {
      const [q, r, s] = this._parseCubeString(loc)
      yield [q, r, s, this.at(q, r, s), i, this]
    }
  }

  /**
   * Iterate over values of all cells
   */
  *values () {
    for (const [loc] of this.indexer.qrsToI) {
      const [q, r, s] = this._parseCubeString(loc)
      yield this.at(q, r, s)
    }
  }

  /**
   * Iterate over indices of set bits
   */
  *bitsIndices () {
    yield* this.indexer.bitsIndices(this.bits)
  }

  /**
   * Iterate over [q, r, s] coordinates of set bits
   */
  *bitKeys () {
    yield* this.indexer.bitKeys(this.bits)
  }

  /**
   * Parse cube coordinate string "q,r,s" to array
   * @private
   */
  _parseCubeString (loc) {
    return loc.split(',').map(Number)
  }

  // ============================================================================
  // Coordinate Conversion
  // ============================================================================

  /**
   * Load coordinates into packed hex grid
   * Coords format: [[q, r, s, value?], ...]
   */
  fromCoords (coords) {
    let resultBits = this.store.empty

    for (const coord of coords) {
      const [q, r, s, value = 1] = coord
      if (this._isValidCoordinate(q, r, s)) {
        this.store.setAtIdx(resultBits, this.index(q, r, s), value)
      }
    }

    this.bits = resultBits
  }

  /**
   * Check if cube coordinates are valid
   * @private
   */
  _isValidCoordinate (q, r, s) {
    return this.indexer.index(q, r, s) !== undefined
  }

  /**
   * Get all occupied cells as cube coordinate tuples
   */
  get toCoords () {
    return this.indexer.bitsToCoords(this.bits)
  }

  // ============================================================================
  // Factory Methods
  // ============================================================================

  /**
   * Create empty packed hex grid of same radius and depth
   */
  get emptyMask () {
    return new PackedHex(this.radius, undefined, undefined, this.depth)
  }

  // ============================================================================
  // Morphological Operations
  // ============================================================================

  /**
   * Expand set bits by radius using CubeIndex axis maps
   * Mutates this.bits and returns this for chaining
   */
  dilate (radius = 1) {
    this._assertIndexerHasMethod('dilate')
    this.bits = this.indexer.dilate(this.bits, radius)
    return this
  }

  /**
   * Shrink set bits by radius using CubeIndex axis maps
   * Mutates this.bits and returns this for chaining
   */
  erode (radius = 1) {
    this._assertIndexerHasMethod('erode')
    this.bits = this.indexer.erode(this.bits, radius)
    return this
  }

  /**
   * Check that indexer has required method
   * @private
   */
  _assertIndexerHasMethod (methodName) {
    if (!this.indexer[methodName]) {
      throw new Error(`Indexer missing ${methodName} method`)
    }
  }

  // ============================================================================
  // Factory Methods - Static
  // ============================================================================

  /**
   * Create packed hex grid from coordinate array
   */
  static fromCoords (radius, coords, depth = 4) {
    const hex = new PackedHex(radius, undefined, undefined, depth)
    hex.fromCoords(coords)
    return hex
  }
}
