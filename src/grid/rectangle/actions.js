import { lazy } from '../../core/utilities.js'
import { buildTransformMaps } from './buildTransformMaps.js'
import { ActionsBase } from '../ActionsBase.js'

/**
 * @typedef {Object} BitboardStore
 * Abstraction for storing and manipulating bitboards with morphological operations.
 * Bitboards are efficient packed bit representations of grid occupancy.
 * @property {*} empty - Empty bitboard value (typically 0 or 0n for BigInt)
 * @property {(bitboard: *, height: number, width: number) => *} expandToSquare - Expand rectangular bitboard to square dimensions for uniform processing
 * @property {(width: number, height: number) => BitboardStore} resized - Create a copy of store resized to new dimensions
 * @property {(bits: *, height: number, width: number) => *} normalizeUpLeft - Translate bitboard so occupied cells' upper-left corner is at origin (0,0)
 */

/**
 * @typedef {Object} GridIndexer
 * Utility for converting between grid coordinates and linear indices in a bitboard.
 * Provides efficient cell-to-index and index-to-coordinate mapping.
 * @property {(width: number, height: number) => GridIndexer} resized - Create a copy of indexer resized to new dimensions
 */

/**
 * @typedef {Object} RectangleMask
 * Container for a shape template with storage, indexing, and occupancy bitboard.
 * Used as input to Actions constructor to provide grid infrastructure.
 * @property {BitboardStore} [store] - Bitboard storage backend with expansion/normalization capabilities
 * @property {GridIndexer} [indexer] - Grid indexer for coordinate-to-index conversions
 * @property {*} [bits] - Template bitboard representing the shape's occupancy pattern
 * @property {number} [width] - Original grid width in cells (before square expansion)
 * @property {number} [height] - Original grid height in cells (before square expansion)
 * @property {(width: number, height: number) => RectangleMask} [emptyOfSize] - Factory method to create empty mask of given dimensions
 */

/**
 * @typedef {Object<string, Array<number>>} TransformMapObject
 * Collection of D4 symmetry group transform index mappings for a grid.
 * Each map is an Array<number> where map[destIdx] = srcIdx, describing how cells move.
 * @property {Array<number>} [id] - Identity transformation (no-op)
 * @property {Array<number>} [r90] - 90° clockwise rotation index mapping
 * @property {Array<number>} [r180] - 180° rotation index mapping
 * @property {Array<number>} [r270] - 270° clockwise rotation (90° counter-clockwise) index mapping
 * @property {Array<number>} [fx] - Vertical flip (reflection across vertical axis, left↔right) index mapping
 * @property {Array<number>} [fy] - Horizontal flip (reflection across horizontal axis, top↔bottom) index mapping
 */

/**
 * @typedef {Array<number>} TransformMapArray
 * Array-based representation of a single transform index mapping.
 */

/**
 * @typedef {TransformMapObject|Array<TransformMapArray>} TransformMaps
 * Collection of all D4 transformation maps, either as object with named keys or array of maps.
 */

/**
 * Rectangle/square grid Actions handler with D4 dihedral group symmetry.
 *
 * Provides transformation and symmetry classification methods for rectangular grids
 * using the D4 (dihedral) symmetry group. Handles both square and rectangular grids
 * by expanding rectangles to square dimensions for uniform bitboard operations.
 *
 * ## D4 Symmetry Group
 * The dihedral group D4 contains 8 elements representing the symmetries of a square:
 * - **Rotations**: 0° (id), 90° (r90), 180° (r180), 270° (r270)
 * - **Reflections**: vertical (fx), horizontal (fy), and 2 diagonals
 * - **Total**: 8 elements (including identity)
 *
 * ## Grid Expansion Strategy
 * For non-square rectangles (width ≠ height):
 * 1. Expand to square using dimensions: side = max(width, height)
 * 2. Apply all transformations in square space
 * 3. Use store's `normalizeUpLeft()` to canonicalize results
 * 4. Original dimensions preserved for potential re-expansion
 *
 * ## Transform Operations
 * Transformations are represented as **index mapping arrays** where:
 * - Array element at position `i` indicates the source index for destination cell `i`
 * - Enables efficient in-place bitboard transformations via index permutation
 * - Format: `map[destIdx] = srcIdx`
 *
 * ## Orbit Classification
 * Shapes are classified into equivalence classes (orbits) based on symmetry count:
 * - **ASYM** (8 distinct): No symmetries beyond identity; all 8 transforms produce unique results
 * - **O4F/O4R** (4 distinct): Half symmetries; fixed or rotation variants
 * - **O2F/O2R** (2 distinct): Quarter symmetries; flip or rotation-flip variants
 * - **SYM** (1 distinct): Fully symmetric; all transforms equivalent
 *
 * ## Stabilizer Subgroups
 * The stabilizer indicates which transforms leave the shape unchanged:
 * - **C1**: Trivial (no non-identity symmetries)
 * - **C2F/C2R**: 180° rotational symmetry
 * - **V4/C4**: Partial symmetries
 * - **D4**: Full symmetry (all 8 transforms preserve shape)
 *
 * ## Caching & Lazy Initialization
 * - Transform maps are computed lazily on first access via `lazy()` utility
 * - Template bitboard is cached after first normalization
 * - Store and indexer instances are cached after first resize
 * - Empty mask is cached for efficient allocation
 *
 * @extends ActionsBase
 * @see ActionsBase for inherited transformation and orbit enumeration methods
 * @see buildTransformMaps for D4 transform map generation algorithm
 */
export class Actions extends ActionsBase {
  /**
   * Create Actions handler for a rectangular grid.
   *
   * Initializes action handler for D4 symmetry group operations on rectangular grids.
   * Non-square rectangles are expanded to square dimensions to enable uniform morphological
   * processing. The expansion factor is `side = max(width, height)`.
   *
   * ## Lazy Initialization Pattern
   * - **transformMaps**: Computed via `buildTransformMaps()` on first access
   * - **template**: Normalized bitboard computed on first access (uses cached transformMaps)
   * - **store**: Cached resized store instance from original's store
   * - **indexer**: Cached resized indexer instance from original's indexer
   * - **emptyMask**: Cached empty mask instance for temporary operations
   *
   * All lazy properties use the `lazy()` utility to defer expensive computations.
   * This reduces initialization overhead for unused actions handlers.
   *
   * ## Caching Details
   * - Cached properties stored as `_store`, `_indexer`, `_emptyMask` on first access
   * - Transform maps may be indexed as `transformMaps['id']`, `transformMaps['r90']`, etc.
   * - Template is normalized using the cached store's `normalizeUpLeft()` method
   * - If original mask is null, getters return undefined (optional chaining)
   *
   * @param {number} width - Original grid width in cells (may be non-square)
   * @param {number} height - Original grid height in cells (may be non-square)
   * @param {RectangleMask|null} [mask=null] - Optional RectangleMask with store, indexer, bits; if null, store/indexer/emptyMask will be undefined
   * @throws {TypeError} If width or height is not a positive integer
   * @see lazy for implementation of lazy property initialization
   * @see buildTransformMaps for transform map generation
   */
  constructor (width, height, mask = null) {
    const side = Math.max(width, height)
    super(side, side, mask)

    // Lazily build transform maps for square dimensions
    lazy(this, 'transformMaps', () => {
      return buildTransformMaps(this.width, this.height)
    })

    // Template normalized to square after expanding to square bitboard
    lazy(this, 'template', () => {
      const original = /** @type {RectangleMask} */ (this.original)
      const squareBits = original.store.expandToSquare(
        original.bits,
        original.height,
        original.width
      )
      return this.normalized(squareBits)
    })
  }

  /**
   * Get the bitboard store, resized for square dimensions.
   *
   * Lazily retrieves or creates a cached store instance configured for square dimensions
   * (max of original width/height). Uses optional chaining to access original.store,
   * returning undefined if original mask was not provided to constructor.
   *
   * ## Caching
   * - First access: calls `original.store.resized(width, height)` and caches in `_store`
   * - Subsequent accesses: returns cached `_store` instance
   * - Cache invalidation: none (store configuration assumed immutable)
   *
   * @returns {BitboardStore|undefined} Store configured for square grid, or undefined if original was null
   * @see ActionsBase#original for the original mask reference
   */
  get store () {
    if (this._store) return this._store
    this._store = this.original?.store.resized(this.width, this.height)
    return this._store
  }

  /**
   * Get the grid indexer, resized for square dimensions.
   *
   * Lazily retrieves or creates a cached indexer instance configured for square dimensions
   * (max of original width/height). Uses optional chaining to access original.indexer,
   * returning undefined if original mask was not provided to constructor.
   *
   * ## Caching
   * - First access: calls `original.indexer.resized(width, height)` and caches in `_indexer`
   * - Subsequent accesses: returns cached `_indexer` instance
   * - Cache invalidation: none (indexer configuration assumed immutable)
   *
   * @returns {GridIndexer|undefined} Indexer configured for square grid, or undefined if original was null
   * @see ActionsBase#original for the original mask reference
   */
  get indexer () {
    if (this._indexer) return this._indexer
    this._indexer = this.original?.indexer.resized(this.width, this.height)
    return this._indexer
  }

  /**
   * Get an empty Mask of the specified dimensions.
   *
   * Lazily retrieves or creates a cached empty mask instance with dimensions matching
   * the square store (max of original width/height). The returned mask has all cells
   * unoccupied (bits = 0) and can be reused for temporary operations like ASCII rendering.
   *
   * ## Caching
   * - First access: calls `original.emptyOfSize(width, height)` and caches in `_emptyMask`
   * - Subsequent accesses: returns cached `_emptyMask` instance
   * - Mutability: The cached instance is returned by reference; modifications persist
   *
   * ## Usage
   * - Visualizing bitboards via `temp.bits = bits; temp.toAsciiWith()`
   * - Temporary containers for morphological operations
   * - Efficient reuse avoids allocation overhead
   *
   * @returns {RectangleMask|undefined} Empty mask with store, bits=0, indexer configured; undefined if original was null
   * @see #ascii for example usage in bitboard visualization
   */
  get emptyMask () {
    if (this._emptyMask) return this._emptyMask
    const original = /** @type {RectangleMask} */ (this.original)
    this._emptyMask = original?.emptyOfSize(this.width, this.height)
    return this._emptyMask
  }

  /**
   * Convert bitboard to ASCII representation for debugging.
   *
   * Creates a temporary rendering by assigning the provided bitboard to a cached empty mask
   * and invoking its ASCII conversion method. Produces human-readable visualization of binary
   * occupancy patterns using '1' for occupied cells and '0' for empty cells. Useful for
   * visual debugging and unit test output.
   *
   * ## Algorithm
   * 1. Get cached emptyMask instance
   * 2. Temporarily assign bits to mask.bits
   * 3. Call mask.toAsciiWith() for rendering
   * 4. Return ASCII string
   *
   * ## Example Output
   * ```
   * 1 0 1
   * 0 1 0
   * 1 0 1
   * ```
   *
   * @param {*} bits - Bitboard to convert to ASCII art (e.g., BigInt, number)
   * @returns {string} ASCII visualization with '1' for occupied, '0' for empty cells
   * @throws {Error} If bits cannot be assigned to mask or toAsciiWith() fails
   */
  ascii (bits) {
    const temp = this.emptyMask
    temp.bits = bits
    return temp.toAsciiWith()
  }

  /**
   * Normalize bitboard using store helper (up-left normalization).
   *
   * Applies the store's `normalizeUpLeft()` algorithm to translate the shape's bounding box
   * so its upper-left corner is at grid origin (0, 0). When bits is null or undefined,
   * uses the cached template bitboard. This canonical form is essential for:
   * - Efficient shape comparison (canonical representatives)
   * - Orbit computation (deterministic equivalence)
   * - Shape classification (symmetry analysis)
   *
   * ## Normalization Algorithm (implemented by store)
   * 1. Find the minimum bounding box of all occupied cells
   * 2. Translate shape so upper-left corner is at (0, 0)
   * 3. Recompute bitboard with new positions
   * 4. Return the normalized bitboard representation
   *
   * ## Example
   * ```
   * Input:  0 0 1        Normalized:  1 0
   *         0 1 0                     0 1
   *         1 0 0
   * ```
   *
   * ## Parameters
   * - If `bits` is explicitly passed: normalizes that specific bitboard
   * - If `bits` is null or undefined: normalizes the cached template
   * - Null check uses strict comparison: `bits !== null && bits !== undefined`
   *
   * @param {*|null} [bits=null] - Bitboard to normalize (e.g., BigInt, number), or null to normalize template
   * @returns {*} Normalized bitboard in canonical form (same type as input)
   * @see #template for the cached template bitboard
   * @see BitboardStore#normalizeUpLeft for the actual translation algorithm
   */
  normalized (bits) {
    const b = bits !== null && bits !== undefined ? bits : this.template
    return this.store.normalizeUpLeft(b, this.height, this.width)
  }

  /**
   * Apply the named transform map to the supplied bitboard.
   *
   * Helper method that applies a precomputed transform map identified by name from the
   * transformMaps collection. The transform map contains index mappings defining how each
   * cell moves under the transformation. This is the internal dispatch mechanism for all
   * public transformation methods (r90Map, fxMap, etc.).
   *
   * ## Transform Map Format
   * - Index mapping array where `map[destIdx] = srcIdx`
   * - Enables efficient permutation of bitboard cells
   * - Maps are cached in transformMaps property
   *
   * ## Tags
   * - **id**: Identity (no-op)
   * - **r90**: 90° clockwise rotation
   * - **r180**: 180° rotation
   * - **r270**: 270° clockwise rotation (90° counter-clockwise)
   * - **fx**: Vertical flip (left ↔ right)
   * - **fy**: Horizontal flip (top ↔ bottom)
   *
   * @private
   * @param {string} tag - Transform map name ('id'|'r90'|'r180'|'r270'|'fx'|'fy')
   * @param {*|null} [bits=null] - Bitboard to transform (e.g., BigInt, number), or template if not provided
   * @returns {*} Transformed bitboard (same type as input bits or template)
   * @throws {TypeError} If tag is not a valid transform map name
   * @see #applyMap for the inherited transformation application logic
   */
  _applyTransformTag (tag, bits = null) {
    return this.applyMap(this.transformMaps[tag], bits)
  }

  /**
   * Apply 90° clockwise rotation transformation.
   *
   * Rotates the shape 90 degrees in the clockwise direction using the 'r90' transformation
   * map from the D4 symmetry group. The rotation is performed by index permutation
   * (index mapping) applied to the bitboard. Normalized bitboards will remain normalized
   * after applying this transformation.
   *
   * ## Geometry
   * ```
   * Before:           After (r90):
   * 1 0 0            0 0 1
   * 0 1 0    →  →    0 1 0
   * 0 0 0            0 0 0
   * ```
   * Top row becomes right column (rotated 90° CW).
   *
   * ## Parameters
   * - If `bits` provided: rotates that specific bitboard
   * - If `bits` omitted: rotates the cached template bitboard
   *
   * ## Example
   * ```javascript
   * const shape = 0x7n; // BigInt bitboard
   * const rotated = actions.r90Map(shape);
   * const templateRotated = actions.r90Map(); // Uses template
   * ```
   *
   * @param {*|null} [bits=null] - Bitboard to transform, or template if omitted
   * @returns {*} 90° clockwise rotated bitboard (same type as input)
   * @see #template for the default template bitboard
   * @see #_applyTransformTag for internal dispatch implementation
   */
  r90Map (bits = null) {
    return this._applyTransformTag('r90', bits)
  }

  /**
   * Apply 180° rotation transformation.
   *
   * Rotates the shape 180 degrees (point symmetry about grid center). Applies the 'r180'
   * transformation map from the D4 symmetry group. This is equivalent to two sequential
   * 90° rotations but is provided as a precomputed direct transform for efficiency.
   * Normalized bitboards remain normalized after this transformation.
   *
   * ## Geometry
   * ```
   * Before:           After (r180):
   * 1 0 0            0 0 0
   * 0 1 0    →  →    0 1 0
   * 0 0 1            1 0 0
   * ```
   * Shape is flipped both horizontally and vertically (180° rotation).
   *
   * ## Parameters
   * - If `bits` provided: rotates that specific bitboard
   * - If `bits` omitted: rotates the cached template bitboard
   *
   * ## Example
   * ```javascript
   * const shape = 0x147n; // BigInt bitboard
   * const rotated = actions.r180Map(shape);
   * const equivalent = actions.r90Map(actions.r90Map(shape)); // Same result
   * ```
   *
   * @param {*|null} [bits=null] - Bitboard to transform, or template if omitted
   * @returns {*} 180° rotated bitboard (same type as input)
   * @see #template for the default template bitboard
   * @see #_applyTransformTag for internal dispatch implementation
   */
  r180Map (bits = null) {
    return this._applyTransformTag('r180', bits)
  }

  /**
   * Apply 270° clockwise rotation transformation.
   *
   * Rotates the shape 270 degrees clockwise, which is equivalent to 90 degrees counter-clockwise.
   * Applies the 'r270' transformation map from the D4 symmetry group. This is a precomputed
   * direct transform rather than three sequential 90° rotations, for efficiency.
   * Normalized bitboards remain normalized after this transformation.
   *
   * ## Geometry
   * ```
   * Before:           After (r270):
   * 1 0 0            0 0 0
   * 0 1 0    →  →    0 1 0
   * 0 0 0            0 0 1
   * ```
   * Right column becomes top row (rotated 270° CW = 90° CCW).
   *
   * ## Equivalence
   * `r270Map(bits)` is equivalent to applying r90Map three times, but more efficient.
   *
   * ## Parameters
   * - If `bits` provided: rotates that specific bitboard
   * - If `bits` omitted: rotates the cached template bitboard
   *
   * ## Example
   * ```javascript
   * const shape = 0x147n; // BigInt bitboard
   * const rotated = actions.r270Map(shape);
   * const ccw90 = actions.r270Map(shape); // 90° counter-clockwise
   * ```
   *
   * @param {*|null} [bits=null] - Bitboard to transform, or template if omitted
   * @returns {*} 270° clockwise rotated bitboard (same type as input)
   * @see #template for the default template bitboard
   * @see #_applyTransformTag for internal dispatch implementation
   */
  r270Map (bits = null) {
    return this._applyTransformTag('r270', bits)
  }

  /**
   * Apply vertical flip transformation (reflection across vertical axis).
   *
   * Reflects the shape across a vertical axis through the grid center. In a rectangular
   * grid, this swaps left ↔ right (mirror image along vertical line). Applies the 'fx'
   * (flip-x) transformation from the D4 symmetry group. Normalized bitboards remain
   * normalized after this transformation.
   *
   * ## Geometry
   * ```
   * Before:           After (fx):
   * 1 0 0            0 0 1
   * 0 1 0    →  →    0 1 0
   * 0 0 0            0 0 0
   * ```
   * Left column becomes right column (vertical reflection).
   *
   * ## Axis of Reflection
   * Reflection axis passes through the vertical center of the grid.
   * For even-width grids, axis falls between center columns.
   * For odd-width grids, axis passes through center column.
   *
   * ## Parameters
   * - If `bits` provided: flips that specific bitboard
   * - If `bits` omitted: flips the cached template bitboard
   *
   * ## Example
   * ```javascript
   * const shape = 0x100n; // Left-aligned bit
   * const flipped = actions.fxMap(shape); // Now right-aligned
   * ```
   *
   * @param {*|null} [bits=null] - Bitboard to transform, or template if omitted
   * @returns {*} Vertically flipped bitboard (same type as input)
   * @see #template for the default template bitboard
   * @see #_applyTransformTag for internal dispatch implementation
   */
  fxMap (bits = null) {
    return this._applyTransformTag('fx', bits)
  }

  /**
   * Apply horizontal flip transformation (reflection across horizontal axis).
   *
   * Reflects the shape across a horizontal axis through the grid center. In a rectangular
   * grid, this swaps top ↔ bottom (mirror image along horizontal line). Applies the 'fy'
   * (flip-y) transformation from the D4 symmetry group. Normalized bitboards remain
   * normalized after this transformation.
   *
   * ## Geometry
   * ```
   * Before:           After (fy):
   * 1 0 0            0 0 0
   * 0 1 0    →  →    0 1 0
   * 0 0 1            1 0 0
   * ```
   * Top row becomes bottom row (horizontal reflection).
   *
   * ## Axis of Reflection
   * Reflection axis passes through the horizontal center of the grid.
   * For even-height grids, axis falls between center rows.
   * For odd-height grids, axis passes through center row.
   *
   * ## Parameters
   * - If `bits` provided: flips that specific bitboard
   * - If `bits` omitted: flips the cached template bitboard
   *
   * ## Example
   * ```javascript
   * const shape = 0x7n; // Top-aligned bits
   * const flipped = actions.fyMap(shape); // Now bottom-aligned
   * ```
   *
   * @param {*|null} [bits=null] - Bitboard to transform, or template if omitted
   * @returns {*} Horizontally flipped bitboard (same type as input)
   * @see #template for the default template bitboard
   * @see #_applyTransformTag for internal dispatch implementation
   */
  fyMap (bits = null) {
    return this._applyTransformTag('fy', bits)
  }

  /**
   * Get the symmetry group type (D4 for rectangles).
   *
   * Returns the group identifier for the dihedral symmetry group D4, which represents
   * the full symmetry group of any rectangle or square:
   * - **4 Rotations**: 0° (id), 90° (r90), 180° (r180), 270° (r270)
   * - **4 Reflections**: vertical (fx), horizontal (fy), and 2 diagonal axes
   * - **Total Elements**: 8 (including identity)
   *
   * The D4 group is isomorphic to the symmetry group of a square, regardless of whether
   * the actual grid is rectangular (since rectangles are expanded to square dimensions
   * for processing).
   *
   * ## Group Properties
   * - **Order**: 8 (number of group elements)
   * - **Type**: Dihedral group (both rotations and reflections)
   * - **Generation**: Can be generated by one 90° rotation and one flip
   * - **Subgroups**: C1, C2, C4, V4, D2 (various proper subgroups)
   *
   * @returns {string} "D4" indicating dihedral group of order 8
   * @see #classifyOrbitType for orbit classification based on D4 symmetries
   * @see #classifyStabilizer for stabilizer subgroup identification
   */
  classifyActionGroup () {
    return 'D4'
  }

  /**
   * Classify the orbit type based on symmetry group size and structure.
   *
   * Determines which equivalence class (orbit) the template shape belongs to by analyzing
   * its symmetry properties within the D4 group. The orbit type indicates how many distinct
   * shapes result from applying all 8 D4 transformations to the template. Smaller orbit
   * sizes indicate higher symmetry.
   *
   * The orbit size is determined by the formula: `|Orbit| = |G| / |Stabilizer|`
   * where |G| = 8 (order of D4 group).
   *
   * ## Orbit Classification
   * - **ASYM** (8 orbits): Asymmetric; no symmetries beyond identity
   *   - All 8 D4 transformations produce distinct results
   *   - Stabilizer size: 1 (trivial)
   *   - Examples: most random polyominoes
   *
   * - **O4F** (4 orbits): Fixed by 180° rotation (point symmetry)
   *   - Transforms r90 and r270 produce identical results to their rotations
   *   - Stabilizer: {id, r180}
   *   - Examples: L-tetromino, Z-tetromino
   *
   * - **O4R** (4 orbits): Rotation-symmetric but not fixed by 180°
   *   - Rotations cycle through 4 distinct images
   *   - Stabilizer: Rotation subgroup {id, r90, r180, r270}
   *   - Examples: S-tetromino in some configurations
   *
   * - **O2F** (2 orbits): Fixed by a flip axis
   *   - Reflection across an axis fixes the shape
   *   - Equivalent transforms: r90, fx, fy all produce same result
   *   - Stabilizer: {id, flip}
   *   - Examples: I-tetromino (horizontal or vertical)
   *
   * - **O2R** (2 orbits): Rotation and flip produce distinct results
   *   - Rotation and flip are independent but map only to 2 orbits
   *   - Examples: O-tetromino (with some asymmetry)
   *
   * - **SYM** (1 orbit): Fully symmetric under all 8 transformations
   *   - All transforms produce the identical shape
   *   - Stabilizer: Full D4 group (8 elements)
   *   - Examples: O-tetromino (2×2 square), highly regular patterns
   *
   * ## Algorithm
   * ```
   * count = number of distinct transforms (computed by parent ActionsBase class)
   * if (count === 8) → ASYM
   * else if (count === 4):
   *   if (r180 fixes shape) → O4F else → O4R
   * else if (count === 2):
   *   if (r90, fx, fy equivalent) → O2F else → O2R
   * else → SYM (count === 1)
   * ```
   *
   * ## Usage
   * ```javascript
   * const orbitType = actions.classifyOrbitType();
   * if (orbitType === 'SYM') {
   *   // Fully symmetric, only 1 unique orientation needed
   * } else if (orbitType === 'ASYM') {
   *   // All 8 orientations are distinct
   * }
   * ```
   *
   * @returns {string} Orbit type classification: one of 'ASYM', 'O4F', 'O4R', 'O2F', 'O2R', 'SYM'
   * @see #classifyStabilizer for the stabilizer subgroup identification
   * @see ActionsBase#orbit for the parent class orbit enumeration
   * @see #_isFixedByTransform for testing if a transform leaves the shape unchanged
   */
  classifyOrbitType () {
    const symmetryCount = this.order

    if (symmetryCount === 8) return 'ASYM'
    if (symmetryCount === 4) {
      return this._isFixedByTransform('r180') ? 'O4F' : 'O4R'
    }
    if (symmetryCount === 2) {
      return this._areTransformsEquivalent('r90', 'fx', 'fy') ? 'O2F' : 'O2R'
    }
    return 'SYM'
  }

  /**
   * Classify the stabilizer subgroup based on which transforms fix the shape.
   *
   * Returns the minimal subgroup of D4 that leaves the template shape completely unchanged.
   * The stabilizer determines which transformations preserve the bitboard's exact binary pattern.
   * A larger stabilizer indicates higher symmetry; the size relates to orbit size by:
   * `|Orbit| × |Stabilizer| = |D4| = 8`
   *
   * ## Stabilizer Subgroups
   * - **C1** (order 1): Trivial subgroup; only identity fixes the shape
   *   - Orbit size: 8 (asymmetric shape)
   *   - No non-identity symmetries
   *   - Examples: most irregular polyominoes
   *
   * - **C2F** (order 2): Cyclic group generated by 180° rotation
   *   - Elements: {id, r180}
   *   - Orbit size: 4
   *   - Shape is point-symmetric (180° rotational symmetry)
   *   - Examples: L-tetromino, Z-tetromino
   *
   * - **C2R** (order 2): Cyclic group from rotational symmetry (but not 180°)
   *   - Different rotation structure than C2F
   *   - Orbit size: 4
   *   - Rotation by some power generates symmetries
   *   - Examples: certain reflection-asymmetric shapes
   *
   * - **V4** (order 4): Klein four-group; reflection symmetries
   *   - Elements: {id, flip1, flip2, 180°}
   *   - Orbit size: 2
   *   - Generated by two perpendicular reflections
   *   - Examples: I-tetromino (fixed by vertical and horizontal flips)
   *
   * - **C4** (order 4): Cyclic group generated by 90° rotation
   *   - Elements: {id, r90, r180, r270}
   *   - Orbit size: 2
   *   - All four rotations fix the shape (4-fold rotational symmetry)
   *   - Examples: Very rare; would require perfect square-like symmetry
   *
   * - **D4** (order 8): Full dihedral group
   *   - All 8 D4 transformations leave the shape unchanged
   *   - Orbit size: 1 (single equivalence class)
   *   - Perfect symmetry under rotations and reflections
   *   - Examples: 2×2 square, highly regular patterns
   *
   * ## Subgroup Lattice
   * ```
   *          D4 (8)
   *         /   |  \
   *       C4    V4   (other subgroups)
   *      / \    / \
   *    C2F C2R ...
   *      \  |  /
   *       C1 (1)
   * ```
   *
   * ## Relationship to Orbit Type
   * Inverse relationship based on Lagrange's theorem:
   * - ASYM (8 orbits) → C1 (1 element)
   * - O4F/O4R (4 orbits) → C2F/C2R (2 elements)
   * - O2F/O2R (2 orbits) → V4/C4 (4 elements)
   * - SYM (1 orbit) → D4 (8 elements)
   *
   * ## Algorithm
   * ```
   * symmetryCount = |orbit| (number of distinct transforms)
   * if (symmetryCount === 8) → C1 (no symmetries)
   * else if (symmetryCount === 4):
   *   if (r180 fixes shape) → C2F else → C2R
   * else if (symmetryCount === 2):
   *   if (r90, fx, fy equivalent) → V4 else → C4
   * else → D4 (all fix shape)
   * ```
   *
   * ## Usage
   * ```javascript
   * const stabilizer = actions.classifyStabilizer();
   * const orderMap = {C1: 1, C2F: 2, C2R: 2, V4: 4, C4: 4, D4: 8};
   * console.log(`Stabilizer order: ${orderMap[stabilizer]}`);
   * ```
   *
   * @returns {string} Stabilizer subgroup name: one of 'C1', 'C2F', 'C2R', 'V4', 'C4', 'D4'
   * @see #classifyOrbitType for the corresponding orbit classification
   * @see ActionsBase#order for the computed symmetry count (orbit size)
   * @see #_isFixedByTransform for testing individual symmetries
   */
  classifyStabilizer () {
    const symmetryCount = this.order

    if (symmetryCount === 8) return 'C1'
    if (symmetryCount === 4) {
      return this._isFixedByTransform('r180') ? 'C2F' : 'C2R'
    }
    if (symmetryCount === 2) {
      return this._areTransformsEquivalent('r90', 'fx', 'fy') ? 'V4' : 'C4'
    }
    return 'D4'
  }

  /**
   * Check whether a transform leaves the template unchanged.
   *
   * Tests if applying the given transformation to the template shape produces
   * the identical bitboard by reference equality. This is used to detect symmetries:
   * if a transform returns the same object reference as the template, it's a symmetry
   * of that shape.
   *
   * ## Algorithm
   * 1. Apply the named transform to the template
   * 2. Compare result with strict equality (===) to template
   * 3. Returns true if transformation is identity on template
   *
   * ## Note on Equality
   * Uses reference equality (===), not value equality. For bitboard values:
   * - BigInt: Reference equality works because normalized templates are cached
   * - Number: Reference equality works (primitives auto-box)
   * - Custom objects: Reference must match cached template instance
   *
   * ## Usage in Classification
   * - Distinguishes C2F (180° fixes shape) from C2R
   * - Helps classify orbit types O4F vs O4R
   * - Used to build transform equivalence detection
   *
   * ## Example
   * ```javascript
   * if (actions._isFixedByTransform('r180')) {
   *   // Shape has 180° rotational symmetry → C2F or O4F
   * }
   * ```
   *
   * @private
   * @param {string} transformKey - Transform name from transformMaps ('id'|'r90'|'r180'|'r270'|'fx'|'fy')
   * @returns {boolean} true if transforming template produces identical result; false otherwise
   * @see #template for the cached template bitboard
   * @see #applyMap for the inherited transformation application
   */
  _isFixedByTransform (transformKey) {
    return this.applyMap(this.transformMaps[transformKey]) === this.template
  }

  /**
   * Compare multiple transforms for equivalence.
   *
   * Tests whether three transformations produce equivalent results on the template shape
   * by comparing results via strict equality (===). If all three transforms map to the
   * same bitboard representation, they are classified as equivalent symmetries.
   *
   * ## Algorithm
   * 1. Apply first transform, cache result
   * 2. Apply second transform, compare with cached result (strict ===)
   * 3. Apply third transform, compare with cached result (strict ===)
   * 4. Return true only if all three produce identical results
   *
   * ## Equivalence Definition
   * Two transforms are equivalent if:
   * - They produce the same bitboard representation
   * - Using strict equality (===) for comparison
   * - Indicates transforms are conjugate under shape symmetries
   *
   * ## Usage in Classification
   * - Distinguishes O2F (r90≡fx≡fy) from O2R
   * - Distinguishes V4 (reflection equivalence) from C4 (rotation equivalence)
   * - Identifies when distinct algebraic transforms produce identical geometric results
   *
   * ## Example
   * ```javascript
   * // Check if shape is O2F (reflection-fixed, 2-fold symmetry)
   * if (actions._areTransformsEquivalent('r90', 'fx', 'fy')) {
   *   // All three produce same result → O2F symmetry type
   * }
   * ```
   *
   * ## Performance
   * - Applies transforms sequentially (not in parallel)
   * - Caches first result for two comparisons
   * - Suitable for classification on shape construction
   *
   * @private
   * @param {string} firstKey - First transform name from transformMaps
   * @param {string} secondKey - Second transform name from transformMaps
   * @param {string} thirdKey - Third transform name from transformMaps
   * @returns {boolean} true if all three transforms produce identical results; false if any differ
   * @see #classifyOrbitType for orbit classification that uses this method
   * @see #applyMap for the inherited transformation application
   */
  _areTransformsEquivalent (firstKey, secondKey, thirdKey) {
    const firstImage = this.applyMap(this.transformMaps[firstKey])
    return (
      this.applyMap(this.transformMaps[secondKey]) === firstImage &&
      this.applyMap(this.transformMaps[thirdKey]) === firstImage
    )
  }
}
