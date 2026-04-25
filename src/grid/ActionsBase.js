/**
 * Common base class for shape-specific Actions implementations.
 * Handles transformation mapping, orbit generation, symmetry classification,
 * and normalization for different grid shapes (rectangles, hexagons, triangles).
 *
 * Subclasses must implement:
 * - normalized(bits, width, height): Apply shape-specific normalization
 * - classifyOrbitType(): Classify symmetry orbit types
 */
export class ActionsBase {
  /**
   * Create an Actions handler for a grid shape.
   * @param {number} width - Grid width
   * @param {number} height - Grid height
   * @param {Object} mask - Optional mask object with store, indexer, cube, bits
   * @param {Array<string>} rotateTags - Optional rotation transform names
   * @param {Array<string>} flipTags - Optional reflection transform names
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
   * @returns {Object} Store object with bit manipulation methods
   */
  get store () {
    if (this._store) return this._store
    this._store = this.original?.store
    return this._store
  }

  /**
   * Get the grid indexer from the original mask.
   * @returns {Object} Indexer object with grid position methods
   */
  get indexer () {
    if (this._indexer) return this._indexer
    this._indexer = this.original?.indexer
    return this._indexer
  }

  /**
   * Get transformation maps (rotations and reflections).
   * Default implementation accesses via indexer; subclasses may override.
   * @returns {Object|Array} Transform maps indexed by name or array
   */
  get transformMaps () {
    return this.original?.indexer?.transformMaps
  }

  /**
   * Get names of all rotation transformation keys.
   * @returns {Array<string>} Array of rotation transform names (e.g., ['r90', 'r180'])
   */
  get rotTags () {
    if (!this.transformMaps) return []
    this.rotateTags =
      this.rotateTags ||
      this._extractTransformNames(this.transformMaps, tag => tag.includes('r'))
    return this.rotateTags || []
  }

  /**
   * Get names of all reflection transformation keys.
   * @returns {Array<string>} Array of reflection transform names (e.g., ['fx', 'fy'])
   */
  get flpTags () {
    if (!this.transformMaps) return []
    this.flipTags =
      this.flipTags ||
      this._extractTransformNames(this.transformMaps, tag => tag.includes('f'))
    return this.flipTags || []
  }

  /**
   * Extract transform names from maps by filter predicate.
   * @private
   * @param {Object|Array} maps - Transform maps
   * @param {Function} predicate - Filter function for tag names
   * @returns {Array<string>} Filtered tag names
   */
  _extractTransformNames (maps, predicate) {
    if (Array.isArray(maps)) return []
    return Object.keys(maps).filter(predicate)
  }
  /**
   * Get the default variant (template) after applying default transformation.
   * @returns {*} Transformed bitboard
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
   * @returns {Array} Array of rotated bitboards
   */
  get rotVariantsRaw () {
    return this.rotTags.map(tag => this.applyMapByName(tag))
  }

  /**
   * Get all reflection variants from transform maps.
   * @private
   * @returns {Array} Array of reflected bitboards
   */
  get flpVariantsRaw () {
    return this.flpTags.map(tag => this.applyMapByName(tag))
  }

  /**
   * Get all unique rotational variants.
   * @returns {Array} Array of rotated bitboards (excludes default)
   */
  get rotationVariants () {
    if (this._rotationVariants) return [...this._rotationVariants]
    const variants = new Set([this.defaultVariant, ...this.rotVariantsRaw])
    variants.delete(this.defaultVariant)
    this._rotationVariants = [...variants]
    return [...this._rotationVariants]
  }

  /**
   * Get all unique reflection variants.
   * @returns {Array} Array of reflected bitboards (excludes default)
   */
  get flipVariants () {
    if (this._flipVariants) return [...this._flipVariants]
    const variants = new Set([this.defaultVariant, ...this.flpVariantsRaw])
    variants.delete(this.defaultVariant)
    this._flipVariants = [...variants]
    return [...this._flipVariants]
  }

  /**
   * Check if shape can be rotated (has non-symmetric rotations).
   * @returns {boolean} True if rotational variants exist
   */
  canRotate () {
    return this.rotationVariants.length !== 0
  }

  /**
   * Check if shape can be flipped (has non-symmetric reflections).
   * @returns {boolean} True if reflection variants exist
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
    if (!this.canRotate()) {
      throw new Error('No non-symmetric rotation found for this shape')
    }
    return this.applyMapByName(
      this.rotateTags.find(tag => this.nonSymmetric(tag)),
      bits
    )
  }

  /**
   * Rotate shape counter-clockwise (or negative direction).
   * @param {*} bits - Optional bitboard to transform; uses template if omitted
   * @returns {*} Rotated bitboard
   * @throws Error if no non-symmetric rotation exists
   */
  rotateCCW (bits = null) {
    if (!this.canRotate()) {
      throw new Error('No non-symmetric rotation found for this shape')
    }
    const tags = this.rotateTags.slice().reverse()
    const tag = tags.find(tag => this.nonSymmetric(tag))
    return this.applyMapByName(tag, bits)
  }

  /**
   * Reflect/flip shape across axis.
   * @param {*} bits - Optional bitboard to transform; uses template if omitted
   * @returns {*} Reflected bitboard
   * @throws Error if no non-symmetric reflection exists
   */
  flip (bits = null) {
    if (!this.canFlip()) {
      throw new Error('No non-symmetric flip found for this shape')
    }
    return this.applyMapByName(
      this.flipTags.find(tag => this.nonSymmetric(tag)),
      bits
    )
  }

  /**
   * Reflect then rotate shape.
   * @param {*} bits - Optional bitboard to transform; uses template if omitted
   * @returns {*} Transformed bitboard
   */
  rotateFlip (bits = null) {
    const flipped = this.flip(bits)
    return this.rotate(flipped)
  }

  /**
   * Check if a transform tag produces a non-symmetric result.
   * @private
   * @param {string} tag - Transform map name
   * @returns {boolean} True if transform changes the shape
   */
  nonSymmetric (tag) {
    const map = this.transformMaps?.[tag]
    return map != null && this.applyMap(map) !== this.original.bits
  }

  /**
   * Apply a named transformation to a bitboard.
   * @param {string} tag - Transform map name
   * @param {*} bits - Optional bitboard; uses template if omitted
   * @returns {*} Transformed and normalized bitboard
   */
  applyMapByName (tag, bits = null) {
    const map = this.transformMaps?.[tag]
    return this.applyMap(map, bits)
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
    const b = bits == null ? this.template : bits
    if (this.store && typeof this.store.normalizeUpLeft === 'function') {
      return this.store.normalizeUpLeft(b, width, height)
    }
    throw new Error('normalized() not implemented in subclass')
  }

  /**
   * Find the canonical (lexicographically smallest) form under all symmetries.
   * @param {Object} maps - Transformation maps
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
   * @param {Object} maps - Transformation maps
   * @param {*} bits - Bitboard to transform
   * @param {number} width - Grid width
   * @param {number} height - Grid height
   * @returns {Set} Set of unique transformed bitboards
   */
  symetriesFor (
    maps = this.transformMaps,
    bits = null,
    width = this.width,
    height = this.height
  ) {
    const images = this.orbitRaw(maps, bits, width, height)
    return new Set(images)
  }

  /**
   * Collect indices of all set bits in a bitboard.
   * Uses preferred source: cube > indexer > generic fallback.
   * @private
   * @param {*} bitboard - Bitboard to iterate
   * @returns {Iterator<number>} Indices of set bits
   */
  *_bitsIndices (bitboard) {
    if (this.cube && typeof this.cube.bitsIndices === 'function') {
      yield* this.cube.bitsIndices(bitboard)
      return
    }
    if (this.indexer && typeof this.indexer.bitsIndices === 'function') {
      if (!Array.isArray(bitboard) && !(bitboard instanceof Uint32Array)) {
        yield* this.indexer.bitsIndices(bitboard)
        return
      }
    }
    if (
      this.store &&
      typeof this.store.isNonZero === 'function' &&
      (this.indexer?.size || this.cube?.size)
    ) {
      const size = this.indexer?.size || this.cube?.size
      for (let i = 0; i < size; i++) {
        if (this.store.isNonZero(bitboard, i)) {
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
   * @returns {Iterator<number>} Cell indices
   */
  *_indices (bitboard) {
    if (this.cube && typeof this.cube.bitsIndices === 'function') {
      yield* this.cube.indices(bitboard)
      return
    }
    if (typeof this.indexer?.indices === 'function') {
      if (!Array.isArray(bitboard) && !(bitboard instanceof Uint32Array)) {
        yield* this.indexer.indices(bitboard)
        return
      }
    }
    if (this.indexer?.size || this.cube?.size) {
      const size = this.indexer?.size || this.cube?.size
      for (let i = 0; i < size; i++) {
        yield i
      }
      return
    }
    throw new Error('no indices implementation available')
  }

  /**
   * Convert arbitrary bitboard representation to bigint.
   * @private
   * @param {*} bitboard - Bitboard in any supported format
   * @returns {bigint} Bitboard as bigint
   */
  _convertToBigint (bitboard) {
    let result = 0n
    for (const index of this._bitsIndices(bitboard)) {
      result |= 1n << BigInt(index)
    }
    return result
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
    if (maps?.id !== undefined) return maps.id
    return undefined
  }

  /**
   * Apply a transformation map to a bitboard using index mapping.
   * @param {Array<number>} map - Index mapping array
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
    let output = this.store?.empty || 0n
    const bitboard = bits == null ? this.template : bits
    for (const index of this._indices(bitboard)) {
      const mappedIndex = map[index]
      if (mappedIndex !== undefined) {
        const color = this.store.getIdx(bitboard, index)
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
   * @param {Object} maps - Transformation maps (defaults to this.transformMaps)
   * @param {*} bits - Bitboard (defaults to template)
   * @param {number} width - Grid width
   * @param {number} height - Grid height
   * @returns {Array} Unique transformed bitboards
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
   * @param {Object} maps - Transformation maps (defaults to this.transformMaps)
   * @returns {Array} Array of unique symmetries
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
   * @returns {Array} Array of unique symmetries
   */
  get symmetries () {
    if (this._symmetries) return [...this._symmetries]
    const images = this.orbit(this.transformMaps)
    this._symmetries = [...new Set(images)]
    return [...this._symmetries]
  }
}
