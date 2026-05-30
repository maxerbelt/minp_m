/**
 * @typedef {Object} MaskInstance
 * @description A mask instance representing a set of grid coordinates with associated values
 * @property {Object} store - Bit store backend (BigInt-based storage with operations)
 * @property {bigint} store.empty - Empty bit pattern (0n)
 * @property {bigint} store.one - Single bit value (1n)
 * @property {Function} store.setIdx - Set bit at index: (bits, index, value) => bigint
 * @property {Function} store.storeType - Normalize value to store format: (value) => bigint
 * @property {Object} indexer - Coordinate indexer for this mask shape
 * @property {Function} indexer.isValid - Validate coordinates: (...args) => boolean
 * @property {Function} indexer.bitsToCoords - Convert bits to coordinates: (bits) => CoordinateTuple[]
 * @property {Function} indexer.location - Get coordinates from bit index: (index) => number[]
 * @property {bigint} bits - Current bit pattern
 * @property {Function} index - Convert coordinates to bit index: (...args) => number
 * @property {Object} emptyMask - Reference to empty mask instance
 */

/**
 * @typedef {Array<number>} CoordinateArray
 * @description Array of coordinate components [x, y, ...] or [x, y, value] for coordinate tuples
 */

/**
 * @typedef {Array<number|undefined>} CoordinateTuple
 * @description Coordinate tuple with optional value: [x, y, value?] where value defaults to 1
 */

/**
 * @typedef {Object} BoundingBox
 * @description Bounding box with min/max coordinate extents
 * @property {number[]} min - Minimum coordinate extents [minX, minY, ...]
 * @property {number[]} max - Maximum coordinate extents [maxX, maxY, ...]
 */

/**
 * CoordinateConversion - Encapsulates coordinate/bit conversion operations.
 * Bridges between coordinate space and bit positions, providing bidirectional conversion.
 * Handles validation, transformation, and iteration over coordinate sets with flexible
 * bit value handling (default or per-coordinate values).
 *
 * @class CoordinateConversion
 * @description Encapsulates coordinate/bit conversion operations
 * Provides bidirectional conversion: coordinates ↔ bit patterns
 * @public
 */
export class CoordinateConversion {
  /**
   * Constructs a CoordinateConversion helper for a mask instance.
   * Maintains references to mask structure, indexer, and bit storage backend
   * for performing coordinate-to-bit and bit-to-coordinate transformations.
   *
   * @param {MaskInstance} maskInstance - Mask instance with indexer, bits, store, and index() method
   * @throws {Error} If maskInstance is missing required properties (indexer, store, bits)
   * @public
   */
  constructor (maskInstance) {
    this.mask = maskInstance
    this.store = maskInstance.store
  }

  // ==================== COORDINATE ↔ BIT CONVERSION ====================

  /**
   * Convert current mask bits to coordinate array
   * @returns {CoordinateTuple[]} Array of [x, y, value] coordinate tuples
   * @public
   */
  bitsToCoordinates () {
    return this.mask.indexer.bitsToCoords(this.mask.bits)
  }

  /**
   * Convert coordinate array to bit pattern
   * Validates coordinates and accumulates bits with optional per-coordinate values
   * @param {CoordinateTuple[]} coords - [x, y, value?] tuples
   * @returns {bigint} Accumulated bit pattern
   * @public
   */
  coordinatesToBits (coords) {
    let resultBits = this.store.empty
    const defaultBitValue = this.store.one

    for (const coord of coords) {
      const [bitIndex, normalizedBitValue] = this._extractCoordinateBitInfo(
        coord,
        defaultBitValue
      )
      if (bitIndex !== null) {
        resultBits = this.store.setIdx(resultBits, bitIndex, normalizedBitValue)
      }
    }

    return resultBits
  }

  /**
   * Load coordinate array into mask bits (destructive assignment)
   * @param {CoordinateTuple[]} coords - Coordinate tuples to load
   * @returns {void} Modifies this.mask.bits
   * @public
   */
  fromCoordinates (coords) {
    this.mask.bits = this.coordinatesToBits(coords)
  }

  /**
   * Create new mask from coordinate array (non-destructive)
   * @param {CoordinateTuple[]} coords - Coordinate tuples
   * @returns {MaskInstance} New mask instance with coordinates loaded
   * @public
   */
  createMaskFromCoordinates (coords) {
    const mask = this.mask.emptyMask
    mask.bits = this.coordinatesToBits(coords)
    return mask
  }

  /**
   * Get coordinates as array property (enables getter access)
   * @returns {CoordinateTuple[]} Current mask coordinates
   * @public
   */
  get toCoordinates () {
    return this.bitsToCoordinates()
  }

  // ==================== COORDINATE VALIDATION & INDEXING ====================

  /**
   * Check if a coordinate is valid for this grid shape
   * @param {...number} args - Coordinate components (x, y, ...)
   * @returns {boolean} True if coordinate is within bounds
   * @public
   */
  isValidCoordinate (...args) {
    return this.mask.indexer.isValid(...args)
  }

  /**
   * Convert a single coordinate to bit index
   * Assumes coordinate is valid; use isValidCoordinate first if uncertain
   * @param {...number} args - Coordinate components
   * @returns {number} Bit index in mask
   * @public
   */
  coordinateToBitIndex (...args) {
    return this.mask.index(...args)
  }

  /**
   * Convert bit index back to coordinates
   * @param {number} bitIndex - Position in bit pattern
   * @returns {CoordinateArray} Coordinate components [x, y, ...]
   * @public
   */
  bitIndexToCoordinates (bitIndex) {
    return this.mask.indexer.location(bitIndex)
  }

  // ==================== COORDINATE ITERATION ====================

  /**
   * Get generator over all set bit coordinates
   * Alternative to bitsToCoordinates for streaming access
   * @generator
   * @yields {CoordinateTuple} Each coordinate tuple
   * @public
   */
  *coordinatesOfSetBits () {
    for (const coord of this.bitsToCoordinates()) {
      yield coord
    }
  }

  // ==================== GEOMETRIC OPERATIONS ====================

  /**
   * Get bounding box of occupied coordinates
   * Computes min/max extents for all dimensions present in coordinates
   * @returns {BoundingBox|null} Bounding box with min/max extents, or null if empty
   * @public
   */
  getBoundingBox () {
    const coords = this.bitsToCoordinates()
    if (coords.length === 0) return null

    const firstCoord = coords[0]
    const minCoords = [...firstCoord]
    const maxCoords = [...firstCoord]

    for (const coord of coords) {
      this._updateBoundingBoxExtent(minCoords, maxCoords, coord)
    }

    return { min: minCoords, max: maxCoords }
  }

  /**
   * Invert (transpose) coordinates: swap x and y
   * Static utility for coordinate transformation
   * @static
   * @param {CoordinateTuple[]} coords - Coordinate tuples
   * @returns {CoordinateTuple[]} Transposed coordinates [y, x, value]
   * @public
   */
  static invert (coords) {
    return coords.map(c => [c[1], c[0], c[2] || 1])
  }

  // ==================== PRIVATE HELPERS ====================

  /**
   * Extract and normalize bit index and value from coordinate tuple
   * Validates coordinate and handles optional bit value at index 2
   * @private
   * @param {CoordinateTuple} coord - Coordinate tuple [x, y, value?]
   * @param {bigint} defaultValue - Default bit value if not provided
   * @returns {[number|null, bigint|undefined]} [bitIndex, normalizedValue] or [null, undefined] if invalid
   */
  _extractCoordinateBitInfo (coord, defaultValue) {
    if (!this.isValidCoordinate(...coord)) {
      return [null, undefined]
    }

    const bitIndex = this.coordinateToBitIndex(...coord)
    const providedValue = coord.at(2)
    const normalizedValue =
      providedValue === undefined
        ? defaultValue
        : this.store.storeType(providedValue)

    return [bitIndex, normalizedValue]
  }

  /**
   * Update min/max extents for bounding box calculation
   * Mutates minCoords and maxCoords arrays in-place
   * @private
   * @param {number[]} minCoords - Current minimum extent (mutated)
   * @param {number[]} maxCoords - Current maximum extent (mutated)
   * @param {CoordinateTuple} coord - New coordinate to consider
   * @returns {void}
   */
  _updateBoundingBoxExtent (minCoords, maxCoords, coord) {
    for (let i = 0; i < coord.length; i++) {
      minCoords[i] = Math.min(minCoords[i], coord[i])
      maxCoords[i] = Math.max(maxCoords[i], coord[i])
    }
  }
}
