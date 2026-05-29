import { lazy } from '../../core/utilities.js'
import { buildTransformMaps } from './buildTransformMaps.js'
import { ActionsBase } from '../ActionsBase.js'

/**
 * @typedef {Object} BitboardStore
 * @property {*} empty - Empty bitboard value
 * @property {(bitboard: *, height: number, width: number) => *} expandToSquare - Expand rect to square bitboard
 * @property {(width: number, height: number) => BitboardStore} resized - Create resized store copy
 * @property {(bits: *, height: number, width: number) => *} normalizeUpLeft - Normalize bitboard to upper-left origin
 */

/**
 * @typedef {Object} GridIndexer
 * @property {(width: number, height: number) => GridIndexer} resized - Create resized indexer copy
 */

/**
 * @typedef {Object} RectangleMask
 * @property {BitboardStore} [store] - Bitboard storage backend
 * @property {GridIndexer} [indexer] - Grid indexer for cell navigation
 * @property {*} [bits] - Template bitboard (occupancy pattern)
 * @property {number} [width] - Grid width in cells
 * @property {number} [height] - Grid height in cells
 * @property {(width: number, height: number) => RectangleMask} [emptyOfSize] - Create empty mask of dimensions
 */

/**
 * @typedef {Object<string, Array<number>>} TransformMapObject
 * @property {Array<number>} [id] - Identity transform map
 * @property {Array<number>} [r90] - 90° clockwise rotation map
 * @property {Array<number>} [r180] - 180° rotation map
 * @property {Array<number>} [r270] - 270° clockwise rotation map
 * @property {Array<number>} [fx] - Vertical flip transform map
 * @property {Array<number>} [fy] - Horizontal flip transform map
 */

/**
 * @typedef {Array<number>} TransformMapArray
 * @typedef {TransformMapObject|Array<TransformMapArray>} TransformMaps
 */

/**
 * Rectangle/square grid Actions handler with D4 dihedral group symmetry.
 *
 * ## D4 Symmetry Group
 * The dihedral group D4 contains 8 elements:
 * - **Rotations**: 0°, 90°, 180°, 270° (identity, r90, r180, r270)
 * - **Reflections**: vertical, horizontal, and 2 diagonal axes (fx, fy, and diagonals)
 *
 * ## Grid Expansion
 * For non-square rectangles, this class expands them to square bitboards for
 * uniform handling. Normalization uses store's upLeft normalization after
 * converting to square coordinates.
 *
 * ## Transform Operations
 * Transforms are represented as index mapping arrays where element at position i
 * indicates the source index of the destination cell i.
 *
 * ## Orbit Classification
 * Classifies shapes into orbit types based on their symmetry:
 * - **ASYM** (8-fold): No symmetries beyond identity
 * - **O4F/O4R** (4-fold): Half the symmetries (fixed vs rotated variants)
 * - **O2F/O2R** (2-fold): Quarter the symmetries
 * - **SYM** (1-fold): Full symmetry (all transforms equivalent)
 *
 * @extends ActionsBase
 * @see ActionsBase for inherited transformation and orbit methods
 */
export class Actions extends ActionsBase {
  /**
   * Create Actions handler for a rectangular grid.
   *
   * The width and height are expanded to the same square dimensions (max of the two)
   * to enable uniform morphological operations. The original grid extent is
   * preserved internally for re-expansion if needed.
   *
   * @param {number} width - Grid width in cells (may be non-square)
   * @param {number} height - Grid height in cells (may be non-square)
   * @param {RectangleMask|null} [mask=null] - Optional mask with store, indexer, bits template
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
   * Retrieves or creates a cached store instance configured for the square dimensions
   * (max of original width/height). Lazy-initializes on first access.
   *
   * @returns {BitboardStore} Store object configured for square grid
   */
  get store () {
    if (this._store) return this._store
    this._store = this.original?.store.resized(this.width, this.height)
    return this._store
  }

  /**
   * Get the grid indexer, resized for square dimensions.
   *
   * Retrieves or creates a cached indexer instance configured for the square dimensions
   * (max of original width/height). Lazy-initializes on first access.
   *
   * @returns {GridIndexer} Indexer object configured for square grid
   */
  get indexer () {
    if (this._indexer) return this._indexer
    this._indexer = this.original?.indexer.resized(this.width, this.height)
    return this._indexer
  }

  /**
   * Get an empty Mask of the specified dimensions.
   *
   * Retrieves or creates a cached empty mask instance with the same dimensions
   * as the store (square). Lazy-initializes on first access.
   *
   * @returns {RectangleMask} Empty mask with store, bits=0, indexer configured
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
   * Creates a temporary mask, assigns the given bitboard, and renders as ASCII
   * using the mask's built-in ASCII conversion method. Useful for visualizing
   * binary patterns in human-readable form.
   *
   * @param {*} bits - Bitboard to convert to ASCII art
   * @returns {string} ASCII visualization with '1' for occupied, '0' for empty cells
   */
  ascii (bits) {
    const temp = this.emptyMask
    temp.bits = bits
    return temp.toAsciiWith()
  }

  /**
   * Normalize bitboard using store helper (up-left normalization).
   *
   * Applies the store's normalizeUpLeft algorithm to move the shape's upper-left
   * corner to the grid origin. When bits is null, uses the cached template
   * bitboard. This canonical form enables efficient orbit computation and shape comparison.
   *
   * ## Normalization Algorithm
   * 1. Find the minimum bounding box of occupied cells
   * 2. Translate shape so upper-left corner is at (0, 0)
   * 3. Recompute bitboard with new positions
   * 4. Store's normalizeUpLeft implements the actual translation
   *
   * @param {*|null} [bits=null] - Bitboard to normalize, or template if null
   * @returns {*} Normalized bitboard in canonical form
   */
  normalized (bits) {
    const b = bits !== null && bits !== undefined ? bits : this.template
    return this.store.normalizeUpLeft(b, this.height, this.width)
  }

  /**
   * Apply the named transform map to the supplied bitboard.
   *
   * Helper method that applies a precomputed transform map by name from the
   * transformMaps collection. The transform map contains index mappings that
   * define how each cell moves under the transformation.
   *
   * @private
   * @param {string} tag - Transform map name ('id', 'r90', 'r180', 'r270', 'fx', 'fy')
   * @param {*|null} [bits=null] - Optional bitboard to transform, or template if not provided
   * @returns {*} Transformed bitboard
   */
  _applyTransformTag (tag, bits = null) {
    return this.applyMap(this.transformMaps[tag], bits)
  }

  /**
   * Apply 90° clockwise rotation transformation.
   *
   * Rotates the shape 90 degrees in the clockwise direction. Applies the 'r90'
   * transformation map which contains the index remapping for this rotation in
   * the D4 symmetry group.
   *
   * ## Example
   * ```javascript
   * // Rotate shape bitboard 90 degrees clockwise
   * const rotated = actions.r90Map(myBits)
   *
   * // Or use template bitboard
   * const rotated = actions.r90Map()
   * ```
   *
   * @param {*|null} [bits=null] - Bitboard to transform, or template if omitted
   * @returns {*} 90° clockwise rotated bitboard
   */
  r90Map (bits = null) {
    return this._applyTransformTag('r90', bits)
  }

  /**
   * Apply 180° rotation transformation.
   *
   * Rotates the shape 180 degrees (point symmetry). Applies the 'r180'
   * transformation map from the D4 symmetry group. This is equivalent to
   * two sequential 90° rotations.
   *
   * ## Example
   * ```javascript
   * // Rotate shape bitboard 180 degrees
   * const rotated = actions.r180Map(myBits)
   * ```
   *
   * @param {*|null} [bits=null] - Bitboard to transform, or template if omitted
   * @returns {*} 180° rotated bitboard
   */
  r180Map (bits = null) {
    return this._applyTransformTag('r180', bits)
  }

  /**
   * Apply 270° clockwise rotation transformation.
   *
   * Rotates the shape 270 degrees clockwise (equivalent to 90° counter-clockwise).
   * Applies the 'r270' transformation map from the D4 symmetry group.
   *
   * ## Example
   * ```javascript
   * // Rotate shape bitboard 270 degrees clockwise
   * const rotated = actions.r270Map(myBits)
   * ```
   *
   * @param {*|null} [bits=null] - Bitboard to transform, or template if omitted
   * @returns {*} 270° clockwise rotated bitboard
   */
  r270Map (bits = null) {
    return this._applyTransformTag('r270', bits)
  }

  /**
   * Apply vertical flip transformation (reflection across vertical axis).
   *
   * Reflects the shape across a vertical axis through the center. In a rectangular
   * grid, this flips left ↔ right. Applies the 'fx' (flip-x) transformation
   * from the D4 symmetry group.
   *
   * ## Example
   * ```javascript
   * // Flip shape left-to-right
   * const flipped = actions.fxMap(myBits)
   * ```
   *
   * @param {*|null} [bits=null] - Bitboard to transform, or template if omitted
   * @returns {*} Vertically flipped bitboard
   */
  fxMap (bits = null) {
    return this._applyTransformTag('fx', bits)
  }

  /**
   * Apply horizontal flip transformation (reflection across horizontal axis).
   *
   * Reflects the shape across a horizontal axis through the center. In a rectangular
   * grid, this flips top ↔ bottom. Applies the 'fy' (flip-y) transformation
   * from the D4 symmetry group.
   *
   * ## Example
   * ```javascript
   * // Flip shape top-to-bottom
   * const flipped = actions.fyMap(myBits)
   * ```
   *
   * @param {*|null} [bits=null] - Bitboard to transform, or template if omitted
   * @returns {*} Horizontally flipped bitboard
   */
  fyMap (bits = null) {
    return this._applyTransformTag('fy', bits)
  }

  /**
   * Get the symmetry group type (D4 for rectangles).
   *
   * Returns the group identifier for the dihedral symmetry group D4,
   * which represents the full symmetry group of a rectangle/square:
   * - 4 rotations (0°, 90°, 180°, 270°)
   * - 4 reflections (vertical, horizontal, 2 diagonals)
   * - Total: 8 elements
   *
   * @returns {string} "D4" indicating dihedral group of order 8
   */
  classifyActionGroup () {
    return 'D4'
  }

  /**
   * Classify the orbit type based on symmetry group size and structure.
   *
   * Determines which equivalence class (orbit) the shape belongs to by analyzing
   * its symmetry properties. The orbit type indicates how many distinct shapes
   * result from applying all D4 transformations.
   *
   * ## Orbit Classification
   * - **ASYM** (8 orbits): No symmetries; all 8 D4 transformations produce distinct shapes
   * - **O4F** (4 orbits): Fixed by 180° rotation; transforms r90 and r270 are equivalent
   * - **O4R** (4 orbits): Rotation-symmetric; rotations form a cycle
   * - **O2F** (2 orbits): Fixed by a flip; reflection and rotation-flip are equivalent
   * - **O2R** (2 orbits): Rotation and flip produce 2 distinct shapes
   * - **SYM** (1 orbit): Fully symmetric; all transforms are equivalent
   *
   * ## Algorithm
   * ```
   * if (8 transforms distinct) → ASYM
   * else if (4 transforms distinct):
   *   if (r180 fixes shape) → O4F else → O4R
   * else if (2 transforms distinct):
   *   if (r90, fx, fy equivalent) → O2F else → O2R
   * else → SYM (all equivalent)
   * ```
   *
   * @returns {string} Orbit type: one of 'ASYM', 'O4F', 'O4R', 'O2F', 'O2R', 'SYM'
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
   * Returns the minimal subgroup of D4 that leaves the shape unchanged. The stabilizer
   * determines which transformations leave the bitboard invariant. Smaller stabilizers
   * (like C1) mean fewer symmetries; larger (like D4) mean full symmetry.
   *
   * ## Stabilizer Groups
   * - **C1** (8 symmetries): Trivial group; no non-identity symmetries
   * - **C2F** (4 symmetries): 180° rotation fixes shape
   * - **C2R** (4 symmetries): Rotation symmetry (but not 180°)
   * - **V4** (2 symmetries): Reflection and rotation-reflection equivalence
   * - **C4** (2 symmetries): Rotation and rotation-flip equivalence
   * - **D4** (1 symmetry): All 8 transformations produce the same shape (fully symmetric)
   *
   * ## Relationship to Orbit Type
   * If orbit type has N orbits, stabilizer has 8/N symmetries.
   * - ASYM (8 orbits) → C1 (no symmetry)
   * - O4F/O4R (4 orbits) → C2F or C2R (2 symmetries)
   * - O2F/O2R (2 orbits) → V4 or C4 (4 symmetries)
   * - SYM (1 orbit) → D4 (full 8-fold symmetry)
   *
   * @returns {string} Stabilizer subgroup name: 'C1', 'C2F', 'C2R', 'V4', 'C4', or 'D4'
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
   * the identical bitboard. This is used to detect symmetries: if a transform
   * returns the same shape, it's a symmetry of that shape.
   *
   * @private
   * @param {string} transformKey - Transform name from transformMaps
   * @returns {boolean} true if transform fixes the template shape
   */
  _isFixedByTransform (transformKey) {
    return this.applyMap(this.transformMaps[transformKey]) === this.template
  }

  /**
   * Compare multiple transforms for equivalence.
   *
   * Tests whether three transformations produce equivalent results on the template
   * shape. Used for classifying orbit type: if multiple distinct transforms produce
   * the same output, the shape has additional symmetries.
   *
   * @private
   * @param {string} firstKey - First transform name
   * @param {string} secondKey - Second transform name
   * @param {string} thirdKey - Third transform name
   * @returns {boolean} true if all three transforms produce identical results
   */
  _areTransformsEquivalent (firstKey, secondKey, thirdKey) {
    const firstImage = this.applyMap(this.transformMaps[firstKey])
    return (
      this.applyMap(this.transformMaps[secondKey]) === firstImage &&
      this.applyMap(this.transformMaps[thirdKey]) === firstImage
    )
  }
}
