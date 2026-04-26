/**
 * CoordinateConversion - Encapsulates coordinate/bit conversion operations
 * Bridges between coordinate space and bit positions
 * Provides bidirectional conversion: coordinates ↔ bit patterns
 */
export class CoordinateConversion {
  /**
   * @param {Object} maskInstance - Mask with indexer, bits, store, and index() method
   */
  constructor (maskInstance) {
    this.mask = maskInstance
    this.store = maskInstance.store
  }

  // ==================== COORDINATE ↔ BIT CONVERSION ====================

  /**
   * Convert current mask bits to coordinate array
   * @returns {Array<[number, number, number]>} Array of [x, y, value] coordinate tuples
   */
  bitsToCoordinates () {
    return this.mask.indexer.bitsToCoords(this.mask.bits)
  }

  /**
   * Convert coordinate array to bit pattern
   * Validates coordinates and accumulates bits with optional per-coordinate values
   * @param {Array<[number, number, number|undefined]>} coords - [x, y, value?] tuples
   * @returns {bigint} Accumulated bit pattern
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
   * @param {Array<[number, number, number|undefined]>} coords - Coordinate tuples to load
   * @returns {void} Modifies this.mask.bits
   */
  fromCoordinates (coords) {
    this.mask.bits = this.coordinatesToBits(coords)
  }

  /**
   * Create new mask from coordinate array (non-destructive)
   * @param {Array<[number, number, number|undefined]>} coords - Coordinate tuples
   * @returns {Object} New mask instance with coordinates loaded
   */
  createMaskFromCoordinates (coords) {
    const mask = this.mask.emptyMask
    mask.bits = this.coordinatesToBits(coords)
    return mask
  }

  /**
   * Get coordinates as array property (enables getter access)
   * @returns {Array<[number, number, number]>} Current mask coordinates
   */
  get toCoordinates () {
    return this.bitsToCoordinates()
  }

  // ==================== COORDINATE VALIDATION & INDEXING ====================

  /**
   * Check if a coordinate is valid for this grid shape
   * @param {...number} args - Coordinate components (x, y, ...)
   * @returns {boolean} True if coordinate is within bounds
   */
  isValidCoordinate (...args) {
    return this.mask.indexer.isValid(...args)
  }

  /**
   * Convert a single coordinate to bit index
   * Assumes coordinate is valid; use isValidCoordinate first if uncertain
   * @param {...number} args - Coordinate components
   * @returns {number} Bit index in mask
   */
  coordinateToBitIndex (...args) {
    return this.mask.index(...args)
  }

  /**
   * Convert bit index back to coordinates
   * @param {number} bitIndex - Position in bit pattern
   * @returns {Array<number>} Coordinate components [x, y, ...]
   */
  bitIndexToCoordinates (bitIndex) {
    return this.mask.indexer.location(bitIndex)
  }

  // ==================== COORDINATE ITERATION ====================

  /**
   * Get generator over all set bit coordinates
   * Alternative to bitsToCoordinates for streaming access
   * @generator
   * @yields {Array<[number, number, number]>} Each coordinate tuple
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
   * @returns {Object|null} {min: [minX, minY], max: [maxX, maxY]} or null if empty
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
   * @param {Array<[number, number, number|undefined]>} coords - Coordinate tuples
   * @returns {Array<[number, number, number]>} Transposed coordinates [y, x, value]
   */
  static invert (coords) {
    return coords.map(c => [c[1], c[0], c[2] || 1])
  }

  // ==================== PRIVATE HELPERS ====================

  /**
   * Extract and normalize bit index and value from coordinate tuple
   * Validates coordinate and handles optional bit value at index 2
   * @private
   * @param {Array<number>} coord - Coordinate tuple [x, y, value?]
   * @param {bigint} defaultValue - Default bit value if not provided
   * @returns {[number|null, bigint]} [bitIndex, normalizedValue] or [null, undefined] if invalid
   */
  _extractCoordinateBitInfo (coord, defaultValue) {
    if (!this.isValidCoordinate(...coord)) {
      return [null, undefined]
    }

    const bitIndex = this.coordinateToBitIndex(...coord)
    const providedValue = coord.at(2)
    const normalizedValue =
      providedValue === undefined || providedValue === null
        ? defaultValue
        : this.store.storeType(providedValue)

    return [bitIndex, normalizedValue]
  }

  /**
   * Update min/max extents for bounding box calculation
   * Mutates minCoords and maxCoords arrays in-place
   * @private
   * @param {Array<number>} minCoords - Current minimum extent (mutated)
   * @param {Array<number>} maxCoords - Current maximum extent (mutated)
   * @param {Array<number>} coord - New coordinate to consider
   * @returns {void}
   */
  _updateBoundingBoxExtent (minCoords, maxCoords, coord) {
    for (let i = 0; i < coord.length; i++) {
      minCoords[i] = Math.min(minCoords[i], coord[i])
      maxCoords[i] = Math.max(maxCoords[i], coord[i])
    }
  }
}
