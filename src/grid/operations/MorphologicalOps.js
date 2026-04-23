/**
 * MorphologicalOps - Encapsulates morphological operations (dilate, erode)
 * These operations expand or shrink bit regions using structural elements
 * Provides both mutating (chainable) and non-mutating variants
 */
export class MorphologicalOps {
  /**
   * @param {Object} maskInstance - Mask with bits, store, width, height, edgeMasks() method
   */
  constructor (maskInstance) {
    this.mask = maskInstance
    this.store = maskInstance.store
  }

  // ==================== DILATION OPERATIONS ====================

  /**
   * Expand set bits by given radius (mutating variant)
   * Modifies this.mask.bits and returns mask for method chaining
   * @param {number} [radius=1] - Expansion distance in cells
   * @returns {Object} This mask instance (mutated)
   */
  dilate (radius = 1) {
    this.mask.bits = this.dilateBits(radius)
    return this.mask
  }

  /**
   * Expand set bits by given radius (non-mutating variant)
   * Returns dilated bits without modifying the mask
   * @param {number} [radius=1] - Expansion distance in cells
   * @returns {bigint} Dilated bit pattern
   */
  dilateBits (radius = 1) {
    const normalizedRadius = this._normalizeRadius(radius)
    const edgeMasks = this._getEdgeMasks()
    return this.store.dilateSeparable(
      this.mask.bits,
      this.mask.width,
      normalizedRadius,
      edgeMasks
    )
  }

  /**
   * Expand set bits using cross pattern: cardinal directions only (mutating variant)
   * Modifies this.mask.bits and returns mask for method chaining
   * Single expansion step in 4-connectivity (no diagonal)
   * @returns {Object} This mask instance (mutated)
   */
  dilateCross () {
    this.mask.bits = this.dilateCrossBits()
    return this.mask
  }

  /**
   * Expand set bits using cross pattern (non-mutating variant)
   * Single expansion in cardinal directions (4-connectivity)
   * @returns {bigint} Cross-dilated bit pattern
   */
  dilateCrossBits () {
    const edgeMasks = this._getEdgeMasks()
    return this.store.dilateCrossStep(
      this.mask.bits,
      edgeMasks,
      this.mask.width,
      this.mask.height
    )
  }

  // ==================== EROSION OPERATIONS ====================

  /**
   * Shrink set bits by given radius with edge clamping (mutating variant)
   * Morphological erosion: removes boundary cells up to radius distance
   * Edges are clamped (boundaries don't erode beyond grid)
   * Modifies this.mask.bits and returns mask for method chaining
   * @param {number} [radius=1] - Erosion distance in cells
   * @returns {Object} This mask instance (mutated)
   */
  erode (radius = 1) {
    this.mask.bits = this.erodeBits(radius)
    return this.mask
  }

  /**
   * Shrink set bits by given radius with edge clamping (non-mutating variant)
   * Applies separable horizontal then vertical erosion with clamping
   * @param {number} [radius=1] - Erosion distance in cells
   * @returns {bigint} Eroded bit pattern
   */
  erodeBits (radius = 1) {
    const normalizedRadius = this._normalizeRadius(radius)
    const edgeMasks = this._getEdgeMasks()
    return this._erodeSeparable(normalizedRadius, edgeMasks)
  }

  // ==================== MORPHOLOGICAL PREDICATES ====================

  /**
   * Test whether mask would be empty after erosion
   * Useful for checking if erosion would eliminate the region
   * @param {number} [radius=1] - Erosion distance to test
   * @returns {boolean} True if eroded result would be all zeros
   */
  wouldBeEmptyAfterEroding (radius = 1) {
    return this.erodeBits(radius) === this.store.empty
  }

  /**
   * Test whether mask would change after dilation
   * Useful for checking if dilation has any effect
   * @param {number} [radius=1] - Dilation distance to test
   * @returns {boolean} True if dilated result differs from original
   */
  changesWithDilation (radius = 1) {
    return this.dilateBits(radius) !== this.mask.bits
  }

  // ==================== PRIVATE HELPERS ====================

  /**
   * Get cached or compute edge masks for boundary handling
   * Edge masks define which bits are on grid boundaries
   * Prevents repeated computation across multiple operations
   * @private
   * @returns {Object} Edge mask collection {top, bottom, left, right, ...}
   */
  _getEdgeMasks () {
    return this.mask.edgeMasks()
  }

  /**
   * Normalize radius parameter to store's native bit type
   * Converts JavaScript number to BigInt or appropriate store type
   * Single source of truth for radius conversion
   * @private
   * @param {number} radius - Radius value in cells
   * @returns {bigint} Normalized radius in store type
   */
  _normalizeRadius (radius) {
    return this.store.storeType(radius)
  }

  /**
   * Apply separable erosion: horizontal erosion followed by vertical erosion
   * Separable approach is more efficient than 2D kernel
   * Each step clamps at edges to prevent erosion beyond grid boundary
   * @private
   * @param {bigint} normalizedRadius - Pre-normalized radius in store type
   * @param {Object} edgeMasks - Pre-computed edge masks
   * @returns {bigint} Eroded bits after both passes
   */
  _erodeSeparable (normalizedRadius, edgeMasks) {
    // First pass: horizontal erosion (left-right)
    const horizontallyEroded = this.store.erodeHorizontalClamp(
      this.mask.bits,
      normalizedRadius,
      edgeMasks
    )

    // Second pass: vertical erosion (top-bottom) on horizontally eroded result
    const horizontalVerticallyEroded = this.store.erodeVerticalClamp(
      horizontallyEroded,
      this.mask.width,
      normalizedRadius,
      edgeMasks
    )

    return horizontalVerticallyEroded
  }
}
