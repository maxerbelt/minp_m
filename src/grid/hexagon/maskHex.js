import { ActionsHex } from './actionHex.js'
import { MaskBase } from '../MaskBase.js'
import { HexagonShape } from './HexagonShape.js'

/**
 * MaskHex - Hexagonal grid mask implementation
 *
 * Provides bitmask operations for hexagonal grids using cube coordinates (q, r, s).
 * Supports morphological operations (dilate, erode), coordinate conversion,
 * and grid transformations specific to hexagonal topology.
 *
 * @extends MaskBase
 */
export class MaskHex extends MaskBase {
  /**
   * Create a new hexagonal grid mask
   * @param {number} radius - The radius of the hexagonal grid
   * @param {*} [bits] - Bit representation of the mask data (optional)
   * @param {Object} [store] - Bit storage implementation (optional)
   */
  constructor (radius, bits, store) {
    super(HexagonShape(radius), 1, bits, store)
    this.radius = radius
  }

  // ============================================================================
  // Clone & Factory Methods
  // ============================================================================

  /**
   * Create a clone of this hex mask with same radius and depth
   * @returns {MaskHex} Cloned mask instance
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
   * @returns {MaskHex} New empty mask with same dimensions
   */
  get emptyMask () {
    return new MaskHex(this.radius)
  }

  /**
   * Create hex mask with all bits set
   * @returns {MaskHex} New mask with all cells occupied
   */
  get fullMask () {
    const mask = this.emptyMask
    mask.bits = this.fullBits
    return mask
  }

  /**
   * Create hex mask with inverted bits
   * @returns {MaskHex} New mask with inverted occupancy
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
   * @param {number} q - The q coordinate
   * @param {number} r - The r coordinate
   * @param {number} s - The s coordinate
   * @returns {number} Linear index for the cell
   * @throws {Error} If coordinates are invalid for this hexagon
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
   * @param {number} q - The q coordinate
   * @param {number} r - The r coordinate
   * @param {number} s - The s coordinate
   * @returns {*} Bit position in the store
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
   * @param {*} bb - Current bits value
   * @param {number} q - The q coordinate
   * @param {number} r - The r coordinate
   * @param {number} s - The s coordinate
   * @returns {*} Updated bits value with bit set
   */
  addBit (bb, q, r, s) {
    const i = this._getBitMaskAtCoords(q, r, s)
    return bb | i
  }

  /**
   * Get bit mask for hex at cube coordinates
   * @private
   * @param {number} q - The q coordinate
   * @param {number} r - The r coordinate
   * @param {number} s - The s coordinate
   * @returns {*} Bit mask for the coordinate
   */
  _getBitMaskAtCoords (q, r, s) {
    const i = this.bitPos(q, r, s)
    return this._getBitMaskAtIndex(i)
  }

  /**
   * Get bit mask for hex at index (internal helper)
   * @private
   * @param {number} i - Linear index
   * @returns {*} Bit mask for the index
   */
  _getBitMaskAtIndex (i) {
    return this.store.bitMaskByPos(this.store.bitPos(i))
  }

  /**
   * Set cell at cube coordinates with optional color
   * @param {number} q - The q coordinate
   * @param {number} r - The r coordinate
   * @param {number} s - The s coordinate
   * @param {number} [color=1] - Value to set
   * @returns {*} Updated bits value
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
   * @param {number} i - Linear index
   * @param {number} [color=1] - Value to set
   * @returns {*} Updated bits value
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
   * @param {number} q - The q coordinate
   * @param {number} r - The r coordinate
   * @param {number} s - The s coordinate
   * @returns {*} Cell value at the coordinates
   */
  at (q, r, s) {
    return this.for(q, r, s).at()
  }

  /**
   * Test if cell at cube coordinates matches color
   * @param {number} q - The q coordinate
   * @param {number} r - The r coordinate
   * @param {number} s - The s coordinate
   * @param {number} [color=1] - Color value to test for
   * @returns {boolean} True if cell matches the color
   */
  test (q, r, s, color = 1) {
    return this.for(q, r, s).test(color)
  }

  /**
   * Clear (zero out) cell at cube coordinates
   * @param {number} q - The q coordinate
   * @param {number} r - The r coordinate
   * @param {number} s - The s coordinate
   * @returns {*} Updated bits value
   */
  clear (q, r, s) {
    return this.set(q, r, s, 0)
  }

  // ============================================================================
  // Actions
  // ============================================================================

  /**
   * Get cached actions instance for transformations
   * @returns {ActionsHex} Actions instance for this mask
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
   * @yields {Array<number>} [q, r, s, index] for each cell
   */
  *keys () {
    for (const [q, r, s, i] of this._allCellCoordinates()) {
      yield [q, r, s, i]
    }
  }

  /**
   * Iterate over [q, r, s, value, index, mask] tuples for all cells
   * @yields {Array} [q, r, s, value, index, mask] for each cell
   */
  *entries () {
    for (const [q, r, s, i] of this._allCellCoordinates()) {
      yield [q, r, s, this.at(q, r, s), i, this]
    }
  }

  /**
   * Iterate over values of all cells
   * @yields {*} Value of each cell
   */
  *values () {
    for (const [q, r, s] of this._allCellCoordinates()) {
      yield this.at(q, r, s)
    }
  }

  /**
   * Iterate over indices of set bits
   * @yields {number} Index of each set bit
   */
  *bitsIndices () {
    yield* this.indexer.bitsIndices(this.bits)
  }

  /**
   * Iterate over [q, r, s] coordinates of set bits
   * @yields {Array<number>} [q, r, s] coordinates of set cells
   */
  *bitKeys () {
    yield* this.indexer.bitKeys(this.bits)
  }

  /**
   * Parse cube coordinate string "q,r,s" to array
   * @private
   * @param {string} loc - Coordinate string in format "q,r,s"
   * @returns {number[]} Array of [q, r, s]
   */
  _parseCubeCoordinates (loc) {
    return loc.split(',').map(Number)
  }

  /**
   * Iterate over all cell coordinates with their indices
   * @private
   * @yields {Array<number>} [q, r, s, index] for each cell
   */
  *_allCellCoordinates () {
    for (const [loc, i] of this.indexer.qrsToI) {
      const [q, r, s] = this._parseCubeCoordinates(loc)
      yield [q, r, s, i]
    }
  }

  // ============================================================================
  // Coordinate Conversion
  // ============================================================================

  /**
   * Load coordinates into this mask
   * @param {Array<Array<number>>} coords - Array of [q, r, s] or [q, r, s, value] coordinates
   */
  fromCoords (coords) {
    this._coords.fromCoordinates(coords)
  }

  /**
   * Get all occupied cells as cube coordinate tuples
   * @returns {Array<Array<number>>} Array of [q, r, s] coordinates
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
   * @returns {*} Normalized bits value
   */
  normalized () {
    const cells = this._extractSetCells()
    const minCoords = this._findMinimumCoordinates(cells)
    return this._createNormalizedBits(cells, minCoords)
  }

  /**
   * Extract all set cells as [q, r, s] coordinates
   * @private
   * @returns {Array<Array<number>>} Array of [q, r, s] coordinates
   */
  _extractSetCells () {
    return [...this.bitKeys()].map(([q, r, s]) => [q, r, s])
  }

  /**
   * Find minimum q, r, s values across cells
   * @private
   * @param {Array<Array<number>>} cells - Array of [q, r, s] coordinates
   * @returns {Object} Object with minQ, minR, minS properties
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
   * @param {Array<Array<number>>} cells - Array of [q, r, s] coordinates
   * @param {Object} minCoords - Object with minQ, minR, minS
   * @returns {*} Normalized bits value
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
   * @param {number} [radius=1] - Expansion radius
   * @returns {MaskHex} This instance for chaining
   */
  dilate (radius = 1) {
    this._assertIndexerHasMethod('dilate')
    this.bits = this.indexer.dilate(this.bits, radius, this.store)
    return this
  }

  /**
   * Shrink set bits by radius using CubeIndex axis maps
   * Mutates this.bits and returns this for chaining
   * @param {number} [radius=1] - Erosion radius
   * @returns {MaskHex} This instance for chaining
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
   * @param {number} [radius=1] - Expansion radius (ignored, uses 1)
   * @returns {MaskHex} This instance for chaining
   */
  dilateCross (radius = 1) {
    return this.dilate(1)
  }

  /**
   * Check that indexer has required method
   * @private
   * @param {string} methodName - Name of the method to check
   * @throws {Error} If the method is missing
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
   * @returns {null} Always returns null
   */
  edgeMasks () {
    return null
  }

  // ============================================================================
  // Factory Methods - Static
  // ============================================================================

  /**
   * Create hex mask from coordinate array
   * @param {number} radius - The radius of the hexagonal grid
   * @param {Array<Array<number>>} coords - Array of [q, r, s] or [q, r, s, value] coordinates
   * @returns {MaskHex} New hex mask instance
   */
  static fromCoords (radius, coords) {
    const mask = new MaskHex(radius)
    mask.fromCoords(coords)
    return mask
  }
}
