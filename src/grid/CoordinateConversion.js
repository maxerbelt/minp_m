/**
 * CoordinateConversion - Encapsulates coordinate/bit conversion operations
 * Bridges between coordinate space and bit positions
 */
export class CoordinateConversion {
  constructor (maskInstance) {
    this.mask = maskInstance
    this.store = maskInstance.store
  }

  /**
   * Convert current bits to coordinate array
   */
  bitsToCoordinates () {
    return this.mask.indexer.bitsToCoords(this.mask.bits)
  }

  /**
   * Convert coordinate array to bits
   * only includes valid coordinates
   */
  coordinatesToBits (coords) {
    let resultBits = this.store.empty
    const one = this.store.one
    for (const coord of coords) {
      if (this.isValidCoordinate(...coord)) {
        let bitValue = coord.at(2)
        if (bitValue === undefined) {
          bitValue = one // Default to 1 if no bit value provided
        } else {
          bitValue = this.store.storeType(bitValue) // Ensure bitValue is a BigInt
        }
        resultBits = this.store.setIdx(
          resultBits,
          this.mask.index(...coord),
          bitValue
        )
      }
    }
    return resultBits
  }

  /**
   * Load coordinates into mask bits
   */
  fromCoordinates (coords) {
    this.mask.bits = this.coordinatesToBits(coords)
  }

  /**
   * Get coordinates as array property
   */
  get toCoordinates () {
    // Default: return raw coords from bitsToCoordinates
    // Subclasses can override to slice/format
    return this.bitsToCoordinates()
  }

  /**
   * Check if a coordinate is valid for this grid shape
   */
  isValidCoordinate (...args) {
    return this.mask.indexer.isValid(...args)
  }

  /**
   * Convert a single coordinate to bit index
   */
  coordinateToBitIndex (...args) {
    return this.mask.index(...args)
  }

  /**
   * Convert bit index back to coordinates
   */
  bitIndexToCoordinates (bitIndex) {
    return this.mask.indexer.location(bitIndex)
  }

  /**
   * Get iterator over all set bit coordinates
   */
  *coordinatesOfSetBits () {
    for (const coord of this.bitsToCoordinates()) {
      yield coord
    }
  }

  /**
   * Create new mask from coordinate array
   */
  createMaskFromCoordinates (coords) {
    const mask = this.mask.emptyMask
    mask.bits = this.coordinatesToBits(coords)
    return mask
  }

  /**
   * Get bounding box of occupied coordinates
   */
  getBoundingBox () {
    const coords = this.bitsToCoordinates()
    if (coords.length === 0) return null

    const firstCoord = coords[0]
    let minCoords = [...firstCoord]
    let maxCoords = [...firstCoord]

    for (const coord of coords) {
      for (let i = 0; i < coord.length; i++) {
        minCoords[i] = Math.min(minCoords[i], coord[i])
        maxCoords[i] = Math.max(maxCoords[i], coord[i])
      }
    }

    return { min: minCoords, max: maxCoords }
  }
}
