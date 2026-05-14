import { lazy } from '../../core/utilities.js'
import { buildTransformMaps } from './buildTransformMaps.js'
import { ActionsBase } from '../ActionsBase.js'

/**
 * @typedef {Object} RectangleMask
 * @property {Object} [store]
 * @property {Object} [indexer]
 * @property {bigint} [bits]
 * @property {number} [width]
 * @property {number} [height]
 * @property {Function} [emptyOfSize]
 *
 * @typedef {Object<string, Array<number>>} TransformMapObject
 * @typedef {Array<number>} TransformMapArray
 * @typedef {TransformMapObject|Array<TransformMapArray>} TransformMaps
 */

/**
 * Rectangle/square grid Actions handler with D4 symmetry.
 * Handles rotations (90°, 180°, 270°) and reflections (vertical, horizontal, diagonal).
 * Extends ActionsBase to provide rectangle-specific normalization and classification.
 */
export class Actions extends ActionsBase {
  /**
   * Create Actions handler for a rectangular grid.
   * @param {number} width - Grid width
   * @param {number} height - Grid height
   * @param {Object} mask - Optional Mask object
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
   * @returns {Object} Store object
   */
  get store () {
    if (this._store) return this._store
    this._store = this.original?.store.resized(this.width, this.height)
    return this._store
  }

  /**
   * Get the grid indexer, resized for square dimensions.
   * @returns {Object} Indexer object
   */
  get indexer () {
    if (this._indexer) return this._indexer
    this._indexer = this.original?.indexer.resized(this.width, this.height)
    return this._indexer
  }

  /**
   * Get an empty Mask of the specified dimensions.
   * @returns {Object} Empty mask
   */
  get emptyMask () {
    if (this._emptyMask) return this._emptyMask
    const original = /** @type {RectangleMask} */ (this.original)
    this._emptyMask = original?.emptyOfSize(this.width, this.height)
    return this._emptyMask
  }

  /**
   * Convert bitboard to ASCII representation for debugging.
   * @param {bigint} bits - Bitboard to convert
   * @returns {string} ASCII visualization
   */
  ascii (bits) {
    const temp = this.emptyMask
    temp.bits = bits
    return temp.toAsciiWith()
  }

  /**
   * Normalize bitboard using store helper (up-left normalization).
   * @param {bigint} bits - Bitboard to normalize
   * @returns {bigint} Normalized bitboard
   */
  normalized (bits) {
    const b = bits === undefined ? this.template : bits
    return this.store.normalizeUpLeft(b, this.height, this.width)
  }

  /**
   * Apply the named transform map to the supplied bitboard.
   * @private
   * @param {string} tag - Transform map name
   * @param {bigint|null} [bits=null] - Optional bitboard
   * @returns {bigint} Transformed bitboard
   */
  _applyTransformTag (tag, bits = null) {
    return this.applyMap(this.transformMaps[tag], bits)
  }

  /**
   * Apply 90° clockwise rotation transformation.
   * @param {bigint|null} bits - Optional bitboard
   * @returns {bigint} Rotated bitboard
   */
  r90Map (bits = null) {
    return this._applyTransformTag('r90', bits)
  }

  /**
   * Apply 180° rotation transformation.
   * @param {bigint|null} bits - Optional bitboard
   * @returns {bigint} Rotated bitboard
   */
  r180Map (bits = null) {
    return this._applyTransformTag('r180', bits)
  }

  /**
   * Apply 270° clockwise rotation transformation.
   * @param {bigint|null} bits - Optional bitboard
   * @returns {bigint} Rotated bitboard
   */
  r270Map (bits = null) {
    return this._applyTransformTag('r270', bits)
  }

  /**
   * Apply vertical flip transformation.
   * @param {bigint|null} bits - Optional bitboard
   * @returns {bigint} Flipped bitboard
   */
  fxMap (bits = null) {
    return this._applyTransformTag('fx', bits)
  }

  /**
   * Apply horizontal flip transformation.
   * @param {bigint|null} bits - Optional bitboard
   * @returns {bigint} Flipped bitboard
   */
  fyMap (bits = null) {
    return this._applyTransformTag('fy', bits)
  }

  /**
   * Get the symmetry group type (D4 for rectangles).
   * @returns {string} "D4"
   */
  classifyActionGroup () {
    return 'D4'
  }

  /**
   * Classify the orbit type based on symmetry group size and structure.
   * Maps to specific classes: ASYM (asymmetric), O4F, O4R, O2F, O2R, SYM.
   * @returns {string} Orbit type classification
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
   * Returns the smallest subgroup that leaves the shape unchanged.
   * @returns {string} Stabilizer group name
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
   * @private
   * @param {string} transformKey - Transform map key
   * @returns {boolean}
   */
  _isFixedByTransform (transformKey) {
    return this.applyMap(this.transformMaps[transformKey]) === this.template
  }

  /**
   * Compare multiple transforms for equivalence.
   * @private
   * @param {string} firstKey - First transform map key
   * @param {string} secondKey - Second transform map key
   * @param {string} thirdKey - Third transform map key
   * @returns {boolean}
   */
  _areTransformsEquivalent (firstKey, secondKey, thirdKey) {
    const firstImage = this.applyMap(this.transformMaps[firstKey])
    return (
      this.applyMap(this.transformMaps[secondKey]) === firstImage &&
      this.applyMap(this.transformMaps[thirdKey]) === firstImage
    )
  }
}
