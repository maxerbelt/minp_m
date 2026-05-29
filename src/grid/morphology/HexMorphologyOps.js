/**
 * @typedef {Object} HexMask
 * @property {bigint|Uint32Array} bits - Current bit state of the mask
 * @property {number} width - Grid width in cells
 * @property {number} height - Grid height in cells
 * @property {Object} store - Storage backend handling bit operations
 * @property {Object} indexer - Hex indexer with dilate/erode methods
 * @property {Function} edgeMasks - Method returning boundary mask collection
 */

/**
 * @typedef {Object} HexIndexer
 * @property {Function} dilate - Dilate hex mask: (bits, radius, store) => bits
 * @property {Function} erode - Erode hex mask: (bits, radius, store) => bits
 */

/**
 * @typedef {Object} StoreBackend
 * @property {boolean} [isMultiBit] - Whether store supports multi-bit cells
 * @property {Function} [dilate] - Per-cell dilation operation
 * @property {Function} [erode] - Per-cell erosion operation
 */

/**
 * HexMorphologyOps - Morphological operations for hexagonal grids
 *
 * Orchestrates morphological image processing (dilation, erosion) on hexagonal
 * grid masks. Implements the strategy pattern, delegating hex-specific neighbor
 * calculations to an external indexer while handling the broader operation flow.
 *
 * ## Hexagonal Connectivity
 * Hexagonal grids have 6-neighbor connectivity (vs 8-neighbor rectangular grids).
 * Each hex cell is adjacent to 6 neighbors in cardinal and diagonal directions.
 *
 * ## Operation Variants
 * Two variants available for each operation:
 * - **Mutating** (e.g., `dilate()`): Modifies mask.bits and returns mask for chaining
 * - **Non-mutating** (e.g., `dilateBits()`): Returns new bits, preserves original
 *
 * ## Architecture
 * Separates concerns between:
 * - **HexMorphologyOps**: High-level operation orchestration and flow control
 * - **HexIndexer**: Low-level hex neighbor calculations and connectivity
 * - **StoreBackend**: Bit storage and bitwise operations
 *
 * This separation enables reuse across different hex storage implementations
 * (single BigInt, Uint32Array packed, multi-bit cells, etc.).
 *
 * @see HexIndexer for hex-specific neighbor calculations
 * @see StoreBig for hex bitboard storage implementation
 */
export class HexMorphologyOps {
  /**
   * Create morphology operation handler for hexagonal grids
   *
   * Captures references to mask, storage, bits, and indexer for morphological
   * operations. The indexer must implement hex-aware dilate/erode methods.
   *
   * @param {HexMask} mask - Hexagonal mask instance with indexer support
   * @throws {Error} If mask lacks required properties (bits, store, indexer)
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
   * Dilate hexagonal grid by expanding occupied cells into hex neighbors (mutating).
   *
   * Expands the occupied region into all 6 neighbors of each cell. Updates mask.bits
   * in-place and returns mask for method chaining.
   *
   * ## Example
   * ```javascript
   * // Single step dilation: expand by one neighbor layer
   * morphOps.dilate(1)
   *
   * // Multi-step dilation: expand by three layers
   * morphOps.dilate(3)
   * ```
   *
   * @param {number} [radius=1] - Number of dilation expansion steps (must be >= 0)
   * @returns {HexMask} this.mask for method chaining
   * @throws {Error} If indexer lacks dilate method
   */
  dilate (radius = 1) {
    this.mask.bits = this.dilateBits(radius)
    return this.mask
  }

  /**
   * Perform hex dilation and return bits without mutation.
   *
   * Expands occupied cells into all 6 hex neighbors for each step. Returns new bits
   * without modifying this.bits, enabling non-mutating operation patterns.
   *
   * Delegates to indexer's hex-aware dilate method which handles neighbor connectivity.
   * For radius <= 0, returns original bits unchanged.
   *
   * ## Performance Notes
   * - Single step O(n) where n = number of cells
   * - Multi-step repeats single-step internally (delegates to indexer)
   *
   * @param {number} [radius=1] - Number of expansion steps (non-negative integer)
   * @returns {bigint|Uint32Array} Dilated bits (same type as input)
   * @throws {Error} If indexer.dilate method not implemented
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
   * Erode hexagonal grid by removing cells that lack complete hex neighbors (mutating).
   *
   * Shrinks the occupied region to keep only cells with all 6 hex neighbors occupied.
   * Updates mask.bits in-place and returns mask for method chaining.
   *
   * ## Erosion Semantics
   * A cell survives erosion only if all 6 neighbors are occupied before erosion.
   * Boundary cells (at grid edges) may be removed unless surrounded by occupied cells.
   *
   * ## Example
   * ```javascript
   * // Single erosion step: remove 1-cell thick boundary
   * morphOps.erode(1)
   *
   * // Multi-step erosion: shrink by three cell layers
   * morphOps.erode(3)
   * ```
   *
   * @param {number} [radius=1] - Number of erosion removal steps (must be >= 0)
   * @returns {HexMask} this.mask for method chaining
   * @throws {Error} If indexer lacks erode method
   */
  erode (radius = 1) {
    this.mask.bits = this.erodeBits(radius)
    return this.mask
  }

  /**
   * Perform hex erosion and return bits without mutation.
   *
   * Shrinks occupied region to keep only cells with all 6 hex neighbors occupied.
   * Returns new bits without modifying this.bits, enabling non-mutating patterns.
   *
   * Delegates to indexer's hex-aware erode method. For radius <= 0, returns
   * original bits unchanged.
   *
   * ## Boundary Behavior
   * Erosion naturally handles boundaries: edge cells are considered to lack neighbors
   * outside the grid, so they are typically removed first. Multi-radius erosion
   * progressively shrinks from the boundary inward.
   *
   * @param {number} [radius=1] - Number of shrink steps (non-negative integer)
   * @returns {bigint|Uint32Array} Eroded bits (same type as input)
   * @throws {Error} If indexer.erode method not implemented
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
   * Apply a single erosion step as a convenience method.
   *
   * Equivalent to `erode(1)`. Useful for situations where a single erosion
   * step is sufficient, making code more expressive than `erode()` without arguments.
   *
   * ## Convenience vs Explicit
   * - `erodeOnce()` - Clear intent: exactly one erosion step
   * - `erode(1)` - Same semantics, more verbose
   *
   * @returns {HexMask} this.mask for method chaining
   */
  erodeOnce () {
    return this.erode(1)
  }
}
