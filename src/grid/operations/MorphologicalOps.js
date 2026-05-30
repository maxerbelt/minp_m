/**
 * @module grid/operations/MorphologicalOps
 * @description Encapsulates morphological operations (dilate, erode).
 * These operations expand or shrink bit regions using structural elements.
 * Provides both mutating (chainable) and non-mutating variants for flexible integration.
 * Supports multiple dilation patterns (rectangular, cross) and erosion with edge clamping.
 */

/**
 * @typedef {Object} MaskInstance
 * @description A mask object with bitboard storage and morphological capabilities.
 * @property {bigint|Uint32Array} bits - Bitboard storage
 * @property {Object} store - Storage backend with morphology methods
 * @property {number} width - Grid width in cells
 * @property {number} height - Grid height in cells
 * @property {Function} edgeMasks - Method returning boundary masks
 */

/**
 * @typedef {Object} EdgeMaskCollection
 * @description Collection of boundary masks for edge-aware operations.
 * @property {bigint|Uint32Array} [top] - Top edge mask
 * @property {bigint|Uint32Array} [bottom] - Bottom edge mask
 * @property {bigint|Uint32Array} [left] - Left edge mask
 * @property {bigint|Uint32Array} [right] - Right edge mask
 */

/**
 * MorphologicalOps - Encapsulates morphological operations (dilate, erode).
 *
 * Provides a facade for morphological image processing operations. Each operation
 * (dilation, erosion) has two variants:
 * - Mutating variant: modifies mask.bits in-place and returns the mask for chaining
 * - Non-mutating variant: computes result without modifying the mask
 *
 * Supports multiple dilation patterns (rectangular, cross) and erosion with edge
 * clamping to prevent boundary artifacts.
 *
 * @class MorphologicalOps
 * @example
 * const morph = new MorphologicalOps(maskInstance);
 * // Mutating: expands region and returns mask for chaining
 * const dilated = morph.dilate(2).erode(1);
 *
 * // Non-mutating: preserves original mask
 * const expandedBits = morph.dilateBits(2);
 */
export class MorphologicalOps {
  /**
   * Bitboard store with morphological operation methods
   * @type {Object}
   * @private
   */
  store

  /**
   * Target mask instance to operate on
   * @type {MaskInstance}
   * @private
   */
  mask

  /**
   * Constructs a MorphologicalOps instance for a specific mask.
   *
   * Initializes morphological operation handler for a given mask instance.
   * Extracts and caches references to the mask and its storage backend.
   * All operations work relative to this mask's current bits and dimensions.
   *
   * @param {MaskInstance} maskInstance - Mask instance with bits, store, dimensions, and edgeMasks() method.
   * Must have: bits (bigint|Uint32Array), store (Object), width (number), height (number), edgeMasks() (Function).
   * @throws {Error} If maskInstance is null/undefined or missing required properties
   *
   * @example
   * const mask = new Mask(8, 8);
   * const morph = new MorphologicalOps(mask);
   * // Now ready to perform morphological operations on mask
   */
  constructor (maskInstance) {
    if (!maskInstance) {
      throw new Error('MorphologicalOps: maskInstance is required')
    }
    this.mask = maskInstance
    this.store = maskInstance.store
  }

  // ==================== DILATION OPERATIONS ====================

  /**
   * Expand set bits by given radius (mutating variant).
   *
   * Morphological dilation: expands all set bits outward by the given radius.
   * Modifies this.mask.bits in-place and returns the mask for method chaining.
   * Supports rectangular dilation using separable implementation.
   *
   * Uses separable approach: applies dilation in orthogonal directions (horizontal
   * then vertical) for efficiency. More efficient than full 2D kernel convolution.
   *
   * @param {number} [radius=1] - Expansion distance in cells (non-negative integer).
   * Use 0 for no expansion, 1 for single cell, 2+ for larger neighborhoods.
   * @returns {MaskInstance} This mask instance (mutated in-place) for chainable operations.
   * @chainable
   * @see dilateBits for non-mutating variant
   * @see dilateCross for cross-pattern dilation
   *
   * @example
   * // Expand region by 2 cells
   * morph.dilate(2);
   * // Returns the mask (same object) with expanded bits
   */
  dilate (radius = 1) {
    this.mask.bits = this.dilateBits(radius)
    return this.mask
  }

  /**
   * Expand set bits by given radius (non-mutating variant).
   *
   * Computes dilated bits without modifying the original mask.
   * Useful when you need the expanded pattern for testing or composition.
   * Uses separable dilation: applies expansion in orthogonal directions.
   *
   * The dilation uses rectangular structural element with specified radius.
   * Result is bounded by grid boundaries (padding not applied beyond edges).
   *
   * @param {number} [radius=1] - Expansion distance in cells (non-negative integer).
   * Use 0 for no expansion, 1 for single cell, 2+ for larger neighborhoods.
   * @returns {bigint|Uint32Array} Dilated bit pattern (original mask unchanged).
   * Type matches the mask's storage backend (BigInt for StoreBig, Uint32Array for Store32).
   * @see dilate for mutating variant
   * @see dilateCrossBits for cross-pattern variant
   *
   * @example
   * // Get expanded bits without modifying mask
   * const expanded = morph.dilateBits(2);
   * // Can now use expanded for further computations
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
   * Expand set bits using cross pattern: cardinal directions only (mutating variant).
   *
   * Performs single expansion step in 4-connectivity (cardinal directions only).
   * Does not expand diagonally. Useful for iterative multi-step dilation with
   * cross pattern, or for connectivity analysis.
   *
   * Modifies this.mask.bits in-place and returns mask for method chaining.
   *
   * @returns {MaskInstance} This mask instance (mutated in-place) for chainable operations.
   * @chainable
   * @see dilateCrossBits for non-mutating variant
   * @see dilate for rectangular dilation
   *
   * @example
   * // Expand in cross pattern (no diagonals)
   * morph.dilateCross();
   * // Single step in 4-connectivity (up, down, left, right)
   */
  dilateCross () {
    this.mask.bits = this.dilateCrossBits()
    return this.mask
  }

  /**
   * Expand set bits using cross pattern (non-mutating variant).
   *
   * Computes cross-pattern dilation without modifying the original mask.
   * Single expansion step in cardinal directions only (4-connectivity, no diagonals).
   * Useful for iterative multi-step dilation with cross pattern.
   *
   * Each call performs one step: each set bit expands to adjacent cardinal neighbors.
   * For multi-step expansion, chain multiple calls or use dilate(radius) instead.
   *
   * @returns {bigint|Uint32Array} Cross-dilated bit pattern (original mask unchanged).
   * Type matches the mask's storage backend.
   * @see dilateCross for mutating variant
   * @see dilateBits for rectangular dilation
   *
   * @example
   * // Single step cross expansion
   * const expanded1 = morph.dilateCrossBits();
   * // For 2-step expansion, would need to manually repeat or create new instance
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
   * Shrink set bits by given radius with edge clamping (mutating variant).
   *
   * Morphological erosion: shrinks all set bits inward by the given radius.
   * Modifies this.mask.bits in-place and returns mask for method chaining.
   * Edges are clamped: boundaries don't erode beyond grid extent.
   *
   * Erosion removes boundary cells up to radius distance. Useful for separating
   * touching objects or removing small features. Uses separable implementation
   * (horizontal then vertical) for efficiency.
   *
   * Eroded regions smaller than radius will be completely removed (become empty).
   * Check wouldBeEmptyAfterEroding() to test before applying.
   *
   * @param {number} [radius=1] - Erosion distance in cells (non-negative integer).
   * Use 0 for no erosion, 1 for single cell, 2+ for larger removal.
   * @returns {MaskInstance} This mask instance (mutated in-place) for chainable operations.
   * @chainable
   * @see erodeBits for non-mutating variant
   * @see wouldBeEmptyAfterEroding for predicate test
   *
   * @example
   * // Shrink region by 2 cells
   * morph.erode(2);
   * // Returns the mask (same object) with shrunk bits
   */
  erode (radius = 1) {
    this.mask.bits = this.erodeBits(radius)
    return this.mask
  }

  /**
   * Shrink set bits by given radius with edge clamping (non-mutating variant).
   *
   * Computes eroded bits without modifying the original mask.
   * Applies separable horizontal then vertical erosion with boundary clamping.
   * Prevents erosion from extending beyond grid boundaries.
   *
   * Erosion removes boundary cells: interior becomes new boundary after each step.
   * Repeated erosion eventually eliminates the region entirely.
   *
   * @param {number} [radius=1] - Erosion distance in cells (non-negative integer).
   * Use 0 for no erosion, 1 for single cell, 2+ for larger removal.
   * @returns {bigint|Uint32Array} Eroded bit pattern (original mask unchanged).
   * Type matches the mask's storage backend (BigInt for StoreBig, Uint32Array for Store32).
   * @see erode for mutating variant
   * @see wouldBeEmptyAfterEroding for empty test
   *
   * @example
   * // Get shrunk bits without modifying mask
   * const shrunk = morph.erodeBits(2);
   * // Can now use shrunk for further computations or comparisons
   */
  erodeBits (radius = 1) {
    const normalizedRadius = this._normalizeRadius(radius)
    const edgeMasks = this._getEdgeMasks()
    return this._erodeSeparable(normalizedRadius, edgeMasks)
  }

  // ==================== MORPHOLOGICAL PREDICATES ====================

  /**
   * Test whether mask would be empty after erosion.
   *
   * Useful for checking if erosion would eliminate the entire region.
   * Performs non-destructive test - does not modify the mask.
   * More efficient than computing erode() and checking isEmpty().
   *
   * Returns true if eroded result would be all zeros (empty), false if any bits remain.
   * Use this before applying erode() when you need to preserve the region on failure.
   *
   * @param {number} [radius=1] - Erosion distance to test (non-negative integer).
   * @returns {boolean} True if eroded result would be all zeros (empty).
   * @see erodeBits to get the actual eroded bits
   *
   * @example
   * if (!morph.wouldBeEmptyAfterEroding(2)) {
   *   morph.erode(2); // Safe to erode - region survives
   * }
   */
  wouldBeEmptyAfterEroding (radius = 1) {
    const eroded = this.erodeBits(radius)
    // Handle both bigint and Uint32Array types
    if (typeof eroded === 'bigint') {
      return eroded === this.store.empty
    }
    // For Uint32Array, check if all elements are zero
    return eroded.every(v => v === 0)
  }

  /**
   * Test whether mask would change after dilation.
   *
   * Useful for checking if dilation has any effect on the region.
   * Performs non-destructive test - does not modify the mask.
   * More efficient than computing dilate() and comparing.
   *
   * Returns true if dilated result differs from original bits, false if unchanged.
   * Use this to avoid redundant dilation operations on already-large regions.
   *
   * @param {number} [radius=1] - Dilation distance to test (non-negative integer).
   * @returns {boolean} True if dilated result differs from original bits.
   * @see dilateBits to get the actual dilated bits
   *
   * @example
   * if (morph.changesWithDilation(2)) {
   *   const expanded = morph.dilateBits(2);
   *   // Process expanded region
   * }
   */
  changesWithDilation (radius = 1) {
    const dilated = this.dilateBits(radius)
    // Handle both bigint and Uint32Array types
    if (typeof dilated === 'bigint' && typeof this.mask.bits === 'bigint') {
      return dilated !== this.mask.bits
    }
    // For Uint32Array, compare element-wise
    if (
      dilated instanceof Uint32Array &&
      this.mask.bits instanceof Uint32Array
    ) {
      if (dilated.length !== this.mask.bits.length) return true
      return !dilated.every((v, i) => v === this.mask.bits[i])
    }
    // Mixed types: always consider as different
    return true
  }

  // ==================== PRIVATE HELPERS ====================

  /**
   * Get cached or compute edge masks for boundary handling.
   *
   * Edge masks define which bits are on grid boundaries (top, bottom, left, right).
   * Prevents repeated computation across multiple morphological operations.
   * Delegates to mask instance's edgeMasks() method for caching strategy.
   *
   * The returned masks typically define:
   * - Which cells are on edges (used for erosion clamping)
   * - Which cells are interior (used for dilation constraints)
   *
   * @private
   * @returns {EdgeMaskCollection} Edge mask collection with top, bottom, left, right masks.
   * Type and structure depends on mask implementation (may include inverted masks).
   * @throws {Error} If mask.edgeMasks() is not available or returns invalid result.
   */
  _getEdgeMasks () {
    return this.mask.edgeMasks()
  }

  /**
   * Normalize radius parameter to store's native bit type.
   *
   * Converts JavaScript number to BigInt or appropriate store type.
   * Handles type polymorphism: different stores use different native types.
   * Single source of truth for radius conversion across all operations.
   *
   * Supports two stores:
   * - StoreBig: uses BigInt, requires conversion via storeType() or BigInt()
   * - Store32: uses Uint32Array, numbers converted via storeType()
   *
   * @private
   * @param {number} radius - Radius value in cells (non-negative integer).
   * @returns {bigint|number} Normalized radius in store's native type.
   * @throws {Error} If radius is negative (should validate caller-side, but good defensive check).
   *
   * @example
   * const norm1 = this._normalizeRadius(2); // -> BigInt(2) or 2 depending on store
   */
  _normalizeRadius (radius) {
    // Check if store has storeType method (preferred conversion)
    if (typeof this.store.storeType === 'function') {
      return this.store.storeType(radius)
    }
    // Fallback: determine type from store's one property
    if (typeof this.store.one === 'bigint') {
      return BigInt(radius)
    }
    // If store.one is number, radius is already correct type
    return radius
  }

  /**
   * Apply separable erosion: horizontal erosion followed by vertical erosion.
   *
   * Separable approach is more efficient than full 2D kernel convolution.
   * Each step clamps at edges to prevent erosion beyond grid boundary.
   * Cascading: output of horizontal pass becomes input to vertical pass.
   *
   * Separability property: morphological erosion with rectangular element equals
   * sequential erosion with horizontal and vertical line elements.
   * Enables O(n·r) algorithm instead of O(n·r²) for radius r.
   *
   * @private
   * @param {bigint|number} normalizedRadius - Pre-normalized radius in store type.
   * Must be output from _normalizeRadius(); ensures type compatibility with store.
   * @param {EdgeMaskCollection} edgeMasks - Pre-computed edge masks for clamping.
   * @returns {bigint|Uint32Array} Eroded bits after both horizontal and vertical passes.
   * Type matches input bits (depends on mask's storage backend).
   * @throws {Error} If store methods are unavailable or return invalid types.
   *
   * @example
   * const norm = this._normalizeRadius(2);
   * const edges = this._getEdgeMasks();
   * const eroded = this._erodeSeparable(norm, edges);
   */
  _erodeSeparable (normalizedRadius, edgeMasks) {
    // First pass: horizontal erosion (left-right axis)
    // Erodes each row independently using horizontal line element
    const horizontallyEroded = this.store.erodeHorizontalClamp(
      this.mask.bits,
      normalizedRadius,
      edgeMasks
    )

    // Second pass: vertical erosion (top-bottom axis) on horizontally eroded result
    // Erodes each column independently using vertical line element
    // operates on width to stride properly over the 2D grid layout
    const horizontalVerticallyEroded = this.store.erodeVerticalClamp(
      horizontallyEroded,
      this.mask.width,
      normalizedRadius,
      edgeMasks
    )

    return horizontalVerticallyEroded
  }
}
