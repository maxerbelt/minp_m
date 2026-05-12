/**
 * HexMorphologyOps - Morphological operations for hexagonal grids
 *
 * Separates morphological operation logic for hexagonal grids from storage and
 * indexing code. Handles dilation and erosion specific to hexagonal connectivity.
 *
 * Hexagonal connectivity uses an indexer that maps logical hex cells to linear
 * indices. Morphological operations delegate to the indexer's hex-aware
 * dilation/erosion methods.
 *
 * @see HexIndexer for hex-specific neighbor calculations
 */
export class HexMorphologyOps {
  /**
   * Create morphology operation handler for hexagonal grids
   * @param {MaskHex|PackedHex} mask - Hexagonal mask instance
   */
  constructor (mask) {
    this.mask = mask
    this.store = mask.store
    this.bits = mask.bits
    this.indexer = mask.indexer
  }

  // ============================================================================
  // DILATION OPERATIONS
  // ============================================================================

  /**
   * Dilate hexagonal grid by expanding into hex neighbors.
   * Returns this for method chaining.
   * @param {number} [radius=1] - Number of dilation steps
   * @returns {MaskHex|PackedHex} this for chaining
   */
  dilate (radius = 1) {
    this.mask.bits = this.dilateBits(radius)
    return this.mask
  }

  /**
   * Perform dilation and return bits without mutation
   * @param {number} [radius=1] - Number of dilation steps
   * @returns {bigint|Uint32Array} dilated bits
   */
  dilateBits (radius = 1) {
    if (radius <= 0) return this.bits
    if (!this.indexer.dilate) {
      throw new Error(
        'Indexer must implement dilate method for hexagonal grids'
      )
    }

    // Hexagonal dilation: expand to all 6 neighbors
    return this.indexer.dilate(this.bits, radius, this.store)
  }

  // ============================================================================
  // EROSION OPERATIONS
  // ============================================================================

  /**
   * Erode hexagonal grid by removing cells without all hex neighbors.
   * Returns this for method chaining.
   * @param {number} [radius=1] - Number of erosion steps
   * @returns {MaskHex|PackedHex} this for chaining
   */
  erode (radius = 1) {
    this.mask.bits = this.erodeBits(radius)
    return this.mask
  }

  /**
   * Perform erosion and return bits without mutation
   * @param {number} [radius=1] - Number of erosion steps
   * @returns {bigint|Uint32Array} eroded bits
   */
  erodeBits (radius = 1) {
    if (radius <= 0) return this.bits
    if (!this.indexer.erode) {
      throw new Error('Indexer must implement erode method for hexagonal grids')
    }

    // Hexagonal erosion: keep only cells with all 6 neighbors occupied
    return this.indexer.erode(this.bits, radius, this.store)
  }

  // ============================================================================
  // HELPER OPERATIONS
  // ============================================================================

  /**
   * Apply a single erosion step (convenience method)
   * @returns {MaskHex|PackedHex} this for chaining
   */
  erodeOnce () {
    return this.erode(1)
  }
}
