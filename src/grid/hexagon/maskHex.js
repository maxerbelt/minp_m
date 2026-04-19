import { ActionsHex } from './actionHex.js'
import { MaskBase } from '../MaskBase.js'
import { HexagonShape } from './HexagonShape.js'

export class MaskHex extends MaskBase {
  constructor (radius, bits, store) {
    super(HexagonShape(radius), 1, bits, store)
    this.radius = radius
  }

  // ============================================================================
  // Clone & Factory Methods
  // ============================================================================

  /**
   * Create a clone of this hex mask with same radius and depth
   * Overrides MaskBase.clone to use radius instead of width/height
   */
  get clone () {
    const cloned = new MaskHex(this.radius, null, null)
    cloned.depth = this.depth
    cloned.bits = this.store.clone(this.bits)
    cloned.store = this.store
    return cloned
  }

  /**
   * Create empty hex mask of same radius
   */
  get emptyMask () {
    return new MaskHex(this.radius)
  }

  /**
   * Create hex mask with all bits set
   */
  get fullMask () {
    const mask = this.emptyMask
    mask.bits = this.fullBits
    return mask
  }

  /**
   * Create hex mask with inverted bits
   */
  get invertedMask () {
    const mask = this.emptyMask
    mask.bits = this.invertedBits
    return mask
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
    return this.index(q, r, s)
  }

  // ============================================================================
  // Bit Manipulation - Hex-specific
  // ============================================================================

  /**
   * Add bit at cube coordinates to bits value
   * @private
   */
  addBit (bb, q, r, s) {
    const i = this._getBitMaskAtCoords(q, r, s)
    return bb | i
  }

  /**
   * Get bit mask for hex at cube coordinates
   * @private
   */
  _getBitMaskAtCoords (q, r, s) {
    const i = this.bitPos(q, r, s)
    return this._getBitMaskAtIndex(i)
  }

  /**
   * Get bit mask for hex at index (internal helper)
   * @private
   */
  _getBitMaskAtIndex (i) {
    return this.store.bitMaskByPos(this.store.bitPos(i))
  }

  /**
   * Set cell at cube coordinates with optional color
   */
  set (q, r, s, color = 1) {
    if (s === undefined) {
      s = -(q + r)
    }
    const loc = this.for(q, r, s)
    this.bits = loc.set(color)
    return this.bits
  }

  /**
   * Set cell by store index (internal helper)
   * @private
   */
  setIndex (i, color = 1) {
    const bitPosition = this.store.bitPos(i)
    const cellMask = this.store.cellMask << bitPosition
    const colorMask = this.store.setMask(bitPosition, color)
    this.bits = (this.bits & ~cellMask) | colorMask
    return this.bits
  }

  // ============================================================================
  // Cell Access - at, test, clear
  // ============================================================================

  /**
   * Get cell value at cube coordinates
   */
  at (q, r, s) {
    return this.for(q, r, s).at()
  }

  /**
   * Test if cell at cube coordinates matches color
   */
  test (q, r, s, color = 1) {
    return this.for(q, r, s).test(color)
  }

  /**
   * Clear (zero out) cell at cube coordinates
   */
  clear (q, r, s) {
    return this.set(q, r, s, 0)
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
   * Load coordinates into this mask
   */
  fromCoords (coords) {
    this._coords.fromCoordinates(coords)
  }

  /**
   * Get all occupied cells as cube coordinate tuples
   */
  get toCoords () {
    return this._coords.bitsToCoordinates()
  }

  // ============================================================================
  // Normalization
  // ============================================================================

  /**
   * Get normalized bits with minimum coordinates at (0, 0, 0)
   * Useful for canonical representation and comparison
   * @private
   */
  normalized () {
    const cells = this._extractSetCells()
    const minCoords = this._findMinimumCoordinates(cells)
    return this._createNormalizedBits(cells, minCoords)
  }

  /**
   * Extract all set cells as [q, r, s] coordinates
   * @private
   */
  _extractSetCells () {
    return [...this.bitKeys()].map(([q, r, s]) => [q, r, s])
  }

  /**
   * Find minimum q, r, s values across cells
   * @private
   */
  _findMinimumCoordinates (cells) {
    if (cells.length === 0) return { minQ: 0, minR: 0, minS: 0 }
    return {
      minQ: Math.min(...cells.map(c => c[0])),
      minR: Math.min(...cells.map(c => c[1])),
      minS: Math.min(...cells.map(c => c[2]))
    }
  }

  /**
   * Create bits with normalized coordinates
   * @private
   */
  _createNormalizedBits (cells, { minQ, minR, minS }) {
    let normalizedBits = 0n
    for (const [q, r, s] of cells) {
      const nq = q - minQ
      const nr = r - minR
      const ns = s - minS
      normalizedBits |= 1n << this.index(nq, nr, ns)
    }
    return normalizedBits
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
    this.bits = this.indexer.dilate(this.bits, radius, this.store)
    return this
  }

  /**
   * Shrink set bits by radius using CubeIndex axis maps
   * Mutates this.bits and returns this for chaining
   */
  erode (radius = 1) {
    this._assertIndexerHasMethod('erode')
    this.bits = this.indexer.erode(this.bits, radius, this.store)
    return this
  }

  /**
   * Cross (cardinal direction) dilation for hex grids
   * Approximated as single dilate step (hex grids don't have traditional cross pattern)
   * Mutates this.bits and returns this for chaining
   */
  dilateCross (radius = 1) {
    return this.dilate(1)
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
  // Edge Detection
  // ============================================================================

  /**
   * Return edge masks for hex grid
   * Hex grids don't have rectangular edges, so return null for fallback logic
   * @private
   */
  edgeMasks () {
    return null
  }

  // ============================================================================
  // Factory Methods - Static
  // ============================================================================

  /**
   * Create hex mask from coordinate array
   */
  static fromCoords (radius, coords) {
    const mask = new MaskHex(radius)
    mask.fromCoords(coords)
    return mask
  }
}
