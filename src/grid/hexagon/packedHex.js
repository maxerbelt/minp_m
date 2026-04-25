import { MaskBase } from '../MaskBase.js'
import { HexagonShape } from './HexagonShape.js'
import { ActionsHex } from './actionHex.js'
import { Store32 } from '../bitStore/store32.js'
import { BitMath } from '../bitMath.js'

/**
 * PackedHex - Packed hexagonal grid mask implementation
 *
 * Provides bitmask operations for hexagonal grids using cube coordinates (q, r, s).
 * Supports morphological operations (dilate, erode), coordinate conversion,
 * and grid transformations specific to hexagonal topology.
 * Uses packed storage for efficient memory usage with multiple cell values.
 *
 * @extends MaskBase
 */
export class PackedHex extends MaskBase {
  /**
   * Create a new packed hexagonal grid mask
   * @param {number} radius - The radius of the hexagonal grid
   * @param {*} [bits] - Bit representation of the mask data (optional)
   * @param {Object} [store] - Bit storage implementation (optional)
   * @param {number} [depth=4] - Color depth (number of possible values per cell)
   */
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
  // Cube Coordinate Handling
  // ============================================================================

  /**
   * Get linear index from cube coordinates (q, r, s)
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
    return this.store.bitPos(this.index(q, r, s))
  }

  // ============================================================================
  // Cell Access - at, set, testFor, clear
  // ============================================================================

  /**
   * Get cell value at cube coordinates
   * @param {number} q - The q coordinate
   * @param {number} r - The r coordinate
   * @param {number} s - The s coordinate
   * @returns {*} Cell value at the coordinates
   */
  at (q, r, s) {
    const idx = this.index(q, r, s)
    return this.store.getIdx(this.bits, idx)
  }

  /**
   * Set cell value at cube coordinates to specified value
   * @param {number} q - The q coordinate
   * @param {number} r - The r coordinate
   * @param {number} s - The s coordinate
   * @param {number} [value=1] - Value to set
   */
  set (q, r, s, value = 1) {
    this.store.setAtIdx(this.bits, this.index(q, r, s), value)
  }

  /**
   * Test if cell at cube coordinates matches specified value
   * @param {number} q - The q coordinate
   * @param {number} r - The r coordinate
   * @param {number} s - The s coordinate
   * @param {number} [value=1] - Value to test for
   * @returns {boolean} True if cell matches the value
   */
  testFor (q, r, s, value = 1) {
    return this.at(q, r, s) === value
  }

  /**
   * Clear (zero out) cell at cube coordinates
   * @param {number} q - The q coordinate
   * @param {number} r - The r coordinate
   * @param {number} s - The s coordinate
   */
  clear (q, r, s) {
    this.set(q, r, s, 0)
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
   * Load coordinates into packed hex grid
   * @param {Array<Array<number>>} coords - Array of [q, r, s, value?] coordinates
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
   * @param {number} q - The q coordinate
   * @param {number} r - The r coordinate
   * @param {number} s - The s coordinate
   * @returns {boolean} True if coordinates are valid
   */
  _isValidCoordinate (q, r, s) {
    return this.indexer.index(q, r, s) !== undefined
  }

  /**
   * Get all occupied cells as cube coordinate tuples
   * @returns {Array<Array<number>>} Array of [q, r, s] coordinates
   */
  get toCoords () {
    return this.indexer.bitsToCoords(this.bits)
  }

  // ============================================================================
  // Factory Methods
  // ============================================================================

  /**
   * Create empty packed hex grid of same radius and depth
   * @returns {PackedHex} New empty mask with same dimensions
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
   * @param {number} [radius=1] - Expansion radius
   * @returns {PackedHex} This instance for chaining
   */
  dilate (radius = 1) {
    this._assertIndexerHasMethod('dilate')
    this.bits = this.indexer.dilate(this.bits, radius)
    return this
  }

  /**
   * Shrink set bits by radius using CubeIndex axis maps
   * Mutates this.bits and returns this for chaining
   * @param {number} [radius=1] - Erosion radius
   * @returns {PackedHex} This instance for chaining
   */
  erode (radius = 1) {
    this._assertIndexerHasMethod('erode')
    this.bits = this.indexer.erode(this.bits, radius)
    return this
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
  // Factory Methods - Static
  // ============================================================================

  /**
   * Create packed hex grid from coordinate array
   * @param {number} radius - The radius of the hexagonal grid
   * @param {Array<Array<number>>} coords - Array of [q, r, s, value?] coordinates
   * @param {number} [depth=4] - Color depth
   * @returns {PackedHex} New packed hex grid instance
   */
  static fromCoords (radius, coords, depth = 4) {
    const hex = new PackedHex(radius, undefined, undefined, depth)
    hex.fromCoords(coords)
    return hex
  }
}
