/**
 * @typedef {Object} MaskInstance
 * @property {bigint|Array} bits - Bitboard representation of occupied cells
 * @property {number} width - Grid width in cells
 * @property {number} height - Grid height in cells
 * @property {Object} store - Bit storage backend with morphology methods
 * @property {Function} edgeMasks - Method returning boundary mask collection
 */

/**
 * @typedef {Object} EdgeMaskCollection
 * @property {bigint} top - Mask for top edge (boundary cells)
 * @property {bigint} bottom - Mask for bottom edge (boundary cells)
 * @property {bigint} left - Mask for left edge (boundary cells)
 * @property {bigint} right - Mask for right edge (boundary cells)
 */

/**
 * @typedef {Object} StoreBackend
 * @property {bigint} empty - Empty bit pattern (all zeros)
 * @property {bigint} one - Single set bit (1)
 * @property {Function} storeType - Convert number to store's native type
 * @property {Function} dilateSeparable - Separable dilation implementation
 * @property {Function} dilateCrossStep - Cross-pattern dilation step
 * @property {Function} erodeHorizontalClamp - Horizontal erosion with clamping
 * @property {Function} erodeVerticalClamp - Vertical erosion with clamping
 */

/**
 * MorphologicalOps - Encapsulates morphological operations (dilate, erode).
 * These operations expand or shrink bit regions using structural elements.
 * Provides both mutating (chainable) and non-mutating variants for flexible integration.
 * Supports multiple dilation patterns (rectangular, cross) and erosion with edge clamping.
 *
 * @class MorphologicalOps
 * @description Morphological image processing operations (dilation, erosion)
 */
export class MorphologicalOps {
  /**
   * Constructs a MorphologicalOps instance for a specific mask
   * Maintains references to mask and store for all morphological operations
   * Enables chainable dilation/erosion patterns via mutating variants
   *
   * @param {MaskInstance} maskInstance - Mask with bits, store, dimensions, edgeMasks() method
   * @throws {Error} If maskInstance missing required properties
   */
  constructor (maskInstance) {
    this.mask = maskInstance
    this.store = maskInstance.store
  }

  // ==================== DILATION OPERATIONS ====================

  /**
   * Expand set bits by given radius (mutating variant)
   * Modifies this.mask.bits in-place and returns mask for method chaining
   * Supports radius-based rectangular dilation
   *
   * @param {number} [radius=1] - Expansion distance in cells (non-negative integer)
   * @returns {MaskInstance} This mask instance (mutated) for chainable operations
   */
  dilate (radius = 1) {
    this.mask.bits = this.dilateBits(radius)
    return this.mask
  }

  /**
   * Expand set bits by given radius (non-mutating variant)
   * Returns dilated bits without modifying the original mask
   * Separable approach applies dilation in orthogonal directions
   *
   * @param {number} [radius=1] - Expansion distance in cells (non-negative integer)
   * @returns {bigint} Dilated bit pattern (original mask unchanged)
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
   * Single expansion step in 4-connectivity (no diagonal spreading)
   * Modifies this.mask.bits in-place and returns mask for method chaining
   *
   * @returns {MaskInstance} This mask instance (mutated) for chainable operations
   */
  dilateCross () {
    this.mask.bits = this.dilateCrossBits()
    return this.mask
  }

  /**
   * Expand set bits using cross pattern (non-mutating variant)
   * Single expansion step in cardinal directions (4-connectivity, no diagonals)
   * Useful for iterative multi-step dilation with cross pattern
   *
   * @returns {bigint} Cross-dilated bit pattern (original mask unchanged)
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
   * Edges are clamped (boundaries don't erode beyond grid extent)
   * Modifies this.mask.bits in-place and returns mask for method chaining
   *
   * @param {number} [radius=1] - Erosion distance in cells (non-negative integer)
   * @returns {MaskInstance} This mask instance (mutated) for chainable operations
   */
  erode (radius = 1) {
    this.mask.bits = this.erodeBits(radius)
    return this.mask
  }

  /**
   * Shrink set bits by given radius with edge clamping (non-mutating variant)
   * Applies separable horizontal then vertical erosion with boundary clamping
   * Prevents erosion from extending beyond grid boundaries
   *
   * @param {number} [radius=1] - Erosion distance in cells (non-negative integer)
   * @returns {bigint} Eroded bit pattern (original mask unchanged)
   */
  erodeBits (radius = 1) {
    const normalizedRadius = this._normalizeRadius(radius)
    const edgeMasks = this._getEdgeMasks()
    return this._erodeSeparable(normalizedRadius, edgeMasks)
  }

  // ==================== MORPHOLOGICAL PREDICATES ====================

  /**
   * Test whether mask would be empty after erosion
   * Useful for checking if erosion would eliminate the entire region
   * Non-destructive test - does not modify the mask
   *
   * @param {number} [radius=1] - Erosion distance to test (non-negative integer)
   * @returns {boolean} True if eroded result would be all zeros (empty)
   */
  wouldBeEmptyAfterEroding (radius = 1) {
    return this.erodeBits(radius) === this.store.empty
  }

  /**
   * Test whether mask would change after dilation
   * Useful for checking if dilation has any effect on the region
   * Non-destructive test - does not modify the mask
   *
   * @param {number} [radius=1] - Dilation distance to test (non-negative integer)
   * @returns {boolean} True if dilated result differs from original bits
   */
  changesWithDilation (radius = 1) {
    return this.dilateBits(radius) !== this.mask.bits
  }

  // ==================== PRIVATE HELPERS ====================

  /**
   * Get cached or compute edge masks for boundary handling
   * Edge masks define which bits are on grid boundaries (top, bottom, left, right)
   * Prevents repeated computation across multiple morphological operations
   * Delegates to mask instance's edgeMasks() method for caching strategy
   *
   * @private
   * @returns {EdgeMaskCollection} Edge mask collection {top, bottom, left, right, ...}
   */
  _getEdgeMasks () {
    return this.mask.edgeMasks()
  }

  /**
   * Normalize radius parameter to store's native bit type
   * Converts JavaScript number to BigInt or appropriate store type
   * Handles type polymorphism - different stores use different native types
   * Single source of truth for radius conversion across all operations
   *
   * @private
   * @param {number} radius - Radius value in cells (non-negative integer)
   * @returns {bigint|number} Normalized radius in store's native type
   */
  _normalizeRadius (radius) {
    // Check if store has storeType method, otherwise use the store's one property to determine type
    if (typeof this.store.storeType === 'function') {
      return this.store.storeType(radius)
    }
    // Fallback: determine type from store's one property
    if (typeof this.store.one === 'bigint') {
      return BigInt(radius)
    }
    return radius
  }

  /**
   * Apply separable erosion: horizontal erosion followed by vertical erosion
   * Separable approach is more efficient than full 2D kernel convolution
   * Each step clamps at edges to prevent erosion beyond grid boundary
   * Cascading: output of horizontal pass becomes input to vertical pass
   *
   * @private
   * @param {bigint|number} normalizedRadius - Pre-normalized radius in store type
   * @param {EdgeMaskCollection} edgeMasks - Pre-computed edge masks for clamping
   * @returns {bigint} Eroded bits after both horizontal and vertical passes
   */
  _erodeSeparable (normalizedRadius, edgeMasks) {
    // First pass: horizontal erosion (left-right axis)
    const horizontallyEroded = this.store.erodeHorizontalClamp(
      this.mask.bits,
      normalizedRadius,
      edgeMasks
    )

    // Second pass: vertical erosion (top-bottom axis) on horizontally eroded result
    const horizontalVerticallyEroded = this.store.erodeVerticalClamp(
      horizontallyEroded,
      this.mask.width,
      normalizedRadius,
      edgeMasks
    )

    return horizontalVerticallyEroded
  }
}
