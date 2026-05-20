/**
 * Common base class for shape-specific Actions implementations.
 * Handles transformation mapping, orbit generation, symmetry classification,
 * and normalization for different grid shapes (rectangles, hexagons, triangles).
 *
 * Subclasses must implement:
 * - normalized(bits, width, height): Apply shape-specific normalization
 * - classifyOrbitType(): Classify symmetry orbit types
 *
 * @typedef {Object} Mask
 * @property {Object} [store] - Bitboard store with empty, isOccupied, getIdx, setIdx, normalizeUpLeft
 * @property {Object} [indexer] - Grid indexer with size, indices, bitsIndices, transformMaps
 * @property {Object} [cube] - Cube helper with indices, bitsIndices
 * @property {*} [bits] - Template bitboard
 *
 * @typedef {Object<string, Array<number>>} TransformMapObject
 * @typedef {Array<number>} TransformMapArray
 * @typedef {TransformMapObject|Array<TransformMapArray>} TransformMaps
 */
export class ActionsBase {
  /**
   * Create an Actions handler for a grid shape.
   * @param {number} width - Grid width
   * @param {number} height - Grid height
   * @param {Mask|null} mask - Optional mask object with store, indexer, cube, bits
   * @param {Array<string>|null} rotateTags - Optional rotation transform names
   * @param {Array<string>|null} flipTags - Optional reflection transform names
   */
  constructor (width, height, mask = null, rotateTags = null, flipTags = null) {
    this.width = width
    this.height = height
    this.original = mask
    this.rotateTags = rotateTags
    this.flipTags = flipTags
  }

  /**
   * Get the bitboard store from the original mask.
   * @returns {Object|undefined}
   */
  get store () {
    if (this._store) return this._store
    this._store = this.original?.store
    return this._store
  }

  /**
   * Get the grid indexer from the original mask.
   * @returns {Object|undefined}
   */
  get indexer () {
    if (this._indexer) return this._indexer
    this._indexer = this.original?.indexer
    return this._indexer
  }

  /**
   * Get the cube helper from the original mask.
   * @returns {Object|undefined}
   */
  get cube () {
    if (this._cube) return this._cube
    this._cube = this.original?.cube
    return this._cube
  }

  /**
   * Get transformation maps (rotations and reflections).
   * Default implementation accesses via indexer; subclasses may override.
   * @returns {TransformMaps|undefined}
   */
  get transformMaps () {
    // @ts-ignore: dynamic property access on mask object
    return this.original?.indexer?.transformMaps
  }

  /**
   * Get names of all rotation transformation keys.
   * @returns {Array<string>} Array of rotation transform names (e.g., ['r90', 'r180'])
   */
  get rotTags () {
    if (!this.transformMaps) return []
    this.rotateTags =
      this.rotateTags || this._filterTransformKeys(tag => tag.includes('r'))
    return this.rotateTags || []
  }

  /**
   * Get names of all reflection transformation keys.
   * @returns {Array<string>} Array of reflection transform names (e.g., ['fx', 'fy'])
   */
  get flpTags () {
    if (!this.transformMaps) return []
    this.flipTags =
      this.flipTags || this._filterTransformKeys(tag => tag.includes('f'))
    return this.flipTags || []
  }

  /**
   * Get the default variant (template) after applying default transformation.
   * @returns {*|null} Transformed bitboard or null when unavailable
   */
  get defaultVariant () {
    if (this._defaultVariant) return this._defaultVariant
    if (!this.transformMaps) return null
    const defaultMap = this._defaultMap()
    if (!defaultMap) return null
    this._defaultVariant = this.applyMap(defaultMap)
    return this._defaultVariant
  }

  /**
   * Get all rotational variants from transform maps.
   * @private
   * @returns {Array<*>} Array of rotated bitboards
   */
  get rotVariantsRaw () {
    return this.rotTags.map(tag => this.applyMapByName(tag))
  }

  /**
   * Get all reflection variants from transform maps.
   * @private
   * @returns {Array<*>} Array of reflected bitboards
   */
  get flpVariantsRaw () {
    return this.flpTags.map(tag => this.applyMapByName(tag))
  }

  /**
   * Get all unique rotational variants.
   * @returns {Array<*>} Array of rotated bitboards (excludes default)
   */
  get rotationVariants () {
    return this._getCachedVariants('_rotationVariants', this.rotVariantsRaw)
  }

  /**
   * Get all unique reflection variants.
   * @returns {Array<*>} Array of reflected bitboards (excludes default)
   */
  get flipVariants () {
    return this._getCachedVariants('_flipVariants', this.flpVariantsRaw)
  }

  /**
   * Compute and cache unique variants, excluding the default.
   * @private
   * @param {string} cacheProp - Cache property name
   * @param {Array<*>} variantsRaw - Raw variant array
   * @returns {Array<*>} Unique variants excluding default
   */
  _getCachedVariants (cacheProp, variantsRaw) {
    // @ts-ignore: dynamic property access
    if (this[cacheProp]) return [...this[cacheProp]]
    const variants = new Set([this.defaultVariant, ...variantsRaw])
    variants.delete(this.defaultVariant)
    // @ts-ignore: dynamic property assignment
    this[cacheProp] = [...variants]
    // @ts-ignore: dynamic property access
    return [...this[cacheProp]]
  }

  /**
   * Check if shape can be rotated (has non-symmetric rotations).
   * @returns {boolean}
   */
  canRotate () {
    return this.rotationVariants.length !== 0
  }

  /**
   * Check if shape can be flipped (has non-symmetric reflections).
   * @returns {boolean}
   */
  canFlip () {
    return this.flipVariants.length !== 0
  }

  /**
   * Rotate shape clockwise (or positive direction).
   * @param {*} bits - Optional bitboard to transform; uses template if omitted
   * @returns {*} Rotated bitboard
   * @throws Error if no non-symmetric rotation exists
   */
  rotate (bits = null) {
    const tag = this._findNonSymmetricTag(this.rotTags)
    if (!tag) {
      throw new Error('No non-symmetric rotation found for this shape')
    }
    return this.applyMapByName(tag, bits)
  }

  /**
   * Rotate shape counter-clockwise (or negative direction).
   * @param {*} bits - Optional bitboard to transform; uses template if omitted
   * @returns {*} Rotated bitboard
   * @throws Error if no non-symmetric rotation exists
   */
  rotateCCW (bits = null) {
    const tag = this._findNonSymmetricTag(this.rotTags, true)
    if (!tag) {
      throw new Error('No non-symmetric rotation found for this shape')
    }
    return this.applyMapByName(tag, bits)
  }

  /**
   * Reflect/flip shape across axis.
   * @param {*} bits - Optional bitboard to transform; uses template if omitted
   * @returns {*} Reflected bitboard
   * @throws Error if no non-symmetric reflection exists
   */
  flip (bits = null) {
    const tag = this._findNonSymmetricTag(this.flpTags)
    if (!tag) {
      throw new Error('No non-symmetric flip found for this shape')
    }
    return this.applyMapByName(tag, bits)
  }

  /**
   * Reflect then rotate shape.
   * @param {*} bits - Optional bitboard to transform; uses template if omitted
   * @returns {*} Transformed bitboard
   */
  rotateFlip (bits = null) {
    return this.rotate(this.flip(bits))
  }

  /**
   * Apply a named transformation to a bitboard.
   * @param {string} tag - Transform map name
   * @param {*} bits - Optional bitboard; uses template if omitted
   * @returns {*} Transformed and normalized bitboard
   */
  applyMapByName (tag, bits = null) {
    return this.applyMap(this._mapForTag(tag), bits)
  }

  /**
   * Shape-specific normalization (move bounding box to origin, apply canonical form, etc).
   * Must be implemented by subclasses.
   * @abstract
   * @param {*} bits - Bitboard to normalize
   * @param {number} width - Grid width
   * @param {number} height - Grid height
   * @returns {*} Normalized bitboard
   * @throws Error if not implemented in subclass
   */
  normalized (bits, width = this.width, height = this.height) {
    const normalizedBits = bits == null ? this.template : bits
    // @ts-ignore: dynamic property access on store object
    if (this.store && typeof this.store.normalizeUpLeft === 'function') {
      // @ts-ignore: dynamic property access on store object
      return this.store.normalizeUpLeft(normalizedBits, width, height)
    }
    throw new Error('normalized() not implemented in subclass')
  }

  /**
   * Find the canonical (lexicographically smallest) form under all symmetries.
   * @param {TransformMaps|undefined} maps - Transformation maps
   * @param {*} bits - Bitboard to canonicalize
   * @param {number} width - Grid width
   * @param {number} height - Grid height
   * @returns {string} Canonical form as string
   */
  canonicalForm (
    maps = this.transformMaps,
    bits = null,
    width = this.width,
    height = this.height
  ) {
    let bestForm = null
    for (const image of this.symetriesFor(maps, bits, width, height)) {
      if (bestForm === null || image < bestForm) {
        bestForm = image
      }
    }
    return bestForm.toString()
  }

  /**
   * Get all unique symmetries of a bitboard.
   * @private
   * @param {TransformMaps|undefined} maps - Transformation maps
   * @param {*} bits - Bitboard to transform
   * @param {number} width - Grid width
   * @param {number} height - Grid height
   * @returns {Set<*>} Set of unique transformed bitboards
   */
  symetriesFor (
    maps = this.transformMaps,
    bits = null,
    width = this.width,
    height = this.height
  ) {
    return new Set(this.orbitRaw(maps, bits, width, height))
  }

  /**
   * Collect indices of all set bits in a bitboard.
   * Uses preferred source: cube > indexer > generic fallback.
   * @private
   * @param {*} bitboard - Bitboard to iterate
   * @returns {IterableIterator<number>} Indices of set bits
   */
  // @ts-ignore: method may be referenced by subclasses outside this file
  *_bitsIndices (bitboard) {
    // @ts-ignore: dynamic property access on cube object
    if (this.cube && typeof this.cube.bitsIndices === 'function') {
      // @ts-ignore: dynamic property access on cube object
      yield* this.cube.bitsIndices(bitboard)
      return
    }
    // @ts-ignore: dynamic property access on indexer object
    if (
      // @ts-ignore: dynamic property access on indexer object
      this.indexer?.bitsIndices &&
      !Array.isArray(bitboard) &&
      !(bitboard instanceof Uint32Array)
    ) {
      // @ts-ignore: dynamic property access on indexer object
      yield* this.indexer.bitsIndices(bitboard)
      return
    }

    const size = this._storageSize()
    // @ts-ignore: dynamic property access on store object
    if (
      this.store &&
      // @ts-ignore: dynamic property access on store object
      typeof this.store.isOccupied === 'function' &&
      size != null
    ) {
      for (let i = 0; i < size; i++) {
        // @ts-ignore: dynamic property access on store object
        if (this.store.isOccupied(bitboard, i)) {
          yield i
        }
      }
      return
    }
    throw new Error('no bitsIndices implementation available')
  }

  /**
   * Collect indices of all cells referenced by a bitboard or spatial structure.
   * Uses preferred source: cube > indexer > generic fallback.
   * @private
   * @param {*} bitboard - Bitboard or spatial structure
   * @returns {IterableIterator<number>} Cell indices
   */
  *_indices (bitboard) {
    // @ts-ignore: dynamic property access on cube object
    if (this.cube && typeof this.cube.indices === 'function') {
      // @ts-ignore: dynamic property access on cube object
      yield* this.cube.indices(bitboard)
      return
    }
    // @ts-ignore: dynamic property access on indexer object
    if (
      // @ts-ignore: dynamic property access on indexer object
      this.indexer?.indices &&
      !Array.isArray(bitboard) &&
      !(bitboard instanceof Uint32Array)
    ) {
      // @ts-ignore: dynamic property access on indexer object
      yield* this.indexer.indices(bitboard)
      return
    }

    const size = this._storageSize()
    if (size != null) {
      for (let i = 0; i < size; i++) {
        yield i
      }
      return
    }
    throw new Error('no indices implementation available')
  }

  /**
   * Get default transformation map (identity or first in array).
   * Subclasses can override for different defaults.
   * @private
   * @returns {Array<number>|undefined} Default transformation map
   */
  _defaultMap () {
    const maps = this.transformMaps
    if (Array.isArray(maps)) return maps[0]
    return maps?.id
  }

  /**
   * Apply a transformation map to a bitboard using index mapping.
   * @param {Array<number>|undefined} map - Index mapping array
   * @param {*} bits - Optional bitboard; uses template if omitted
   * @param {number} width - Grid width for normalization
   * @param {number} height - Grid height for normalization
   * @returns {*} Transformed and normalized bitboard
   */
  applyMap (
    map = this._defaultMap(),
    bits = null,
    width = this.width,
    height = this.height
  ) {
    // @ts-ignore: dynamic property access on store object
    let output = this.store?.empty || 0n
    const bitboard = bits == null ? this.template : bits
    for (const index of this._indices(bitboard)) {
      const mappedIndex = map?.[index]
      if (mappedIndex !== undefined) {
        // @ts-ignore: dynamic property access on store object
        const color = this.store.getIdx(bitboard, index)
        // @ts-ignore: dynamic property access on store object
        output = this.store.setIdx(output, mappedIndex, color)
      }
    }
    return this.normalized(output, width, height)
  }

  /**
   * Get the template: the normalized form of the original bitboard.
   * Subclasses typically implement via lazy property.
   * @returns {*} Normalized template bitboard
   */
  get template () {
    if (this._template) return this._template
    if (!this.original?.bits) return 0n
    this._template = this.normalized(this.original.bits)
    return this._template
  }

  /**
   * Generate all orbit members (symmetries) of a bitboard.
   * @param {TransformMaps|undefined} maps - Transformation maps
   * @param {*} bits - Bitboard (defaults to template)
   * @param {number} width - Grid width
   * @param {number} height - Grid height
   * @returns {Array<*>} Unique transformed bitboards
   */
  orbitRaw (
    maps = this.transformMaps,
    bits = null,
    width = this.width,
    height = this.height
  ) {
    if (!maps) return []
    const bitboard = bits == null ? this.template : bits
    if (Array.isArray(maps)) {
      return maps.map(m => this.applyMap(m, bitboard, width, height))
    }
    return Object.values(maps).map(m =>
      this.applyMap(m, bitboard, width, height)
    )
  }

  /**
   * Get the orbit (all symmetries) of the template bitboard.
   * Results are cached for subsequent calls.
   * @param {TransformMaps|undefined} maps - Transformation maps
   * @returns {Array<*>} Array of unique symmetries
   */
  orbit (maps = this.transformMaps) {
    if (maps === this.transformMaps) {
      if (this._orbit) return [...this._orbit]
      this._orbit = this.orbitRaw(maps)
      return [...this._orbit]
    }
    return this.orbitRaw(maps)
  }

  /**
   * Classify the orbit type based on symmetry group size and properties.
   * Must be implemented by subclasses (D4, D6, D3, etc).
   * @abstract
   * @returns {string} Orbit type name
   * @throws Error if not implemented in subclass
   */
  classifyOrbitType () {
    throw new Error('classifyOrbitType() not implemented in subclass')
  }

  /**
   * Get the size of the symmetry group (number of symmetries including identity).
   * @returns {number} Cardinality of symmetry group
   */
  get order () {
    return this.symmetries.length
  }

  /**
   * Get all unique symmetries of the template bitboard.
   * Results are cached for subsequent calls.
   * @returns {Array<*>} Array of unique symmetries
   */
  get symmetries () {
    if (this._symmetries) return [...this._symmetries]
    const images = this.orbit(this.transformMaps)
    this._symmetries = [...new Set(images)]
    return [...this._symmetries]
  }

  /**
   * Get the transformation map associated with a tag.
   * @private
   * @param {string} tag - Transform map name
   * @returns {Array<number>|undefined}
   */
  _mapForTag (tag) {
    // @ts-ignore: dynamic property access on transformMaps
    return this.transformMaps?.[tag]
  }

  /**
   * Filter transform keys by predicate.
   * @private
   * @param {(key: string) => boolean} predicate - Filter function for tag names
   * @returns {Array<string>} Matching transform tags
   */
  _filterTransformKeys (predicate) {
    const maps = this.transformMaps
    if (!maps || Array.isArray(maps)) return []
    return Object.keys(maps).filter(predicate)
  }

  /**
   * Find the first non-symmetric transform tag.
   * @private
   * @param {Array<string>} tags - Candidate transform tags
   * @param {boolean} [reverse=false] - Search in reverse order
   * @returns {string|undefined}
   */
  _findNonSymmetricTag (tags, reverse = false) {
    const candidates = reverse ? [...tags].reverse() : tags
    return candidates.find(tag => this._isNonSymmetricTag(tag))
  }

  /**
   * Determine whether a given transform tag changes the shape.
   * @private
   * @param {string} tag - Transform map name
   * @returns {boolean}
   */
  _isNonSymmetricTag (tag) {
    const map = this._mapForTag(tag)
    return map != null && this.applyMap(map) !== this.original?.bits
  }

  /**
   * Determine size used by generic index iteration.
   * @private
   * @returns {number|undefined}
   */
  _storageSize () {
    // @ts-ignore: dynamic property access on indexer/cube objects
    return this.indexer?.size || this.cube?.size
  }
}
