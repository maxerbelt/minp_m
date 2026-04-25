import { lazy } from '../../core/utilities.js'
import { buildTransformMaps } from './buildTransformMaps.js'
import { ActionsBase } from '../ActionsBase.js'

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
      const squareBits = this.original.store.expandToSquare(
        this.original.bits,
        this.original.height,
        this.original.width
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
    this._emptyMask = this.original?.emptyOfSize(this.width, this.height)
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
   * Apply 90° clockwise rotation transformation.
   * @param {bigint} bits - Optional bitboard
   * @returns {bigint} Rotated bitboard
   */
  r90Map (bits = null) {
    return this.applyMap(this.transformMaps.r90, bits)
  }

  /**
   * Apply 180° rotation transformation.
   * @param {bigint} bits - Optional bitboard
   * @returns {bigint} Rotated bitboard
   */
  r180Map (bits = null) {
    return this.applyMap(this.transformMaps.r180, bits)
  }

  /**
   * Apply 270° clockwise rotation transformation.
   * @param {bigint} bits - Optional bitboard
   * @returns {bigint} Rotated bitboard
   */
  r270Map (bits = null) {
    return this.applyMap(this.transformMaps.r270, bits)
  }

  /**
   * Apply vertical flip transformation.
   * @param {bigint} bits - Optional bitboard
   * @returns {bigint} Flipped bitboard
   */
  fxMap (bits = null) {
    return this.applyMap(this.transformMaps.fx, bits)
  }

  /**
   * Apply horizontal flip transformation.
   * @param {bigint} bits - Optional bitboard
   * @returns {bigint} Flipped bitboard
   */
  fyMap (bits = null) {
    return this.applyMap(this.transformMaps.fy, bits)
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
    const maps = this.transformMaps
    const template = this.template
    const symmetryCount = this.order

    if (symmetryCount === 8) return 'ASYM' // Full asymmetry (all 8 transforms differ)
    if (symmetryCount === 4) {
      // 4 symmetries: either 180° rotation fixes it, or rotations by 90° cycle
      if (this.applyMap(maps.r180) === template) return 'O4F' // 180° fixes it (diagonal symmetry)
      return 'O4R' // Rotational symmetry only
    }
    if (symmetryCount === 2) {
      // 2 symmetries: check if both flips + rotation give same result
      if (
        this.applyMap(maps.r90) === this.applyMap(maps.fx) &&
        this.applyMap(maps.r90) === this.applyMap(maps.fy)
      ) {
        return 'O2F' // Both flips are equivalent (V4 mirror symmetry)
      }
      return 'O2R' // Only one symmetry (half-turn blinker)
    }
    return 'SYM' // Full D4 symmetry
  }

  /**
   * Classify the stabilizer subgroup based on which transforms fix the shape.
   * Returns the smallest subgroup that leaves the shape unchanged.
   * @returns {string} Stabilizer group name
   */
  classifyStabilizer () {
    const maps = this.transformMaps
    const template = this.template
    const symmetryCount = this.order

    if (symmetryCount === 8) return 'C1' // Trivial stabilizer (all transforms produce different results)
    if (symmetryCount === 4) {
      if (this.applyMap(maps.r180) === template) return 'C2F' // 180° fixes it (reflection symmetry V4)
      return 'C2R' // Rotational symmetry (order 2)
    }
    if (symmetryCount === 2) {
      if (
        this.applyMap(maps.r90) === this.applyMap(maps.fx) &&
        this.applyMap(maps.r90) === this.applyMap(maps.fy)
      ) {
        return 'V4' // Klein 4-group (both mirror lines)
      }
      return 'C4' // Cyclic group of order 4 (single rotation)
    }
    return 'D4' // Full D4 symmetry group
  }
}
