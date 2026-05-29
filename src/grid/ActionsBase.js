/**
 * Common base class for shape-specific Actions implementations.
 * Handles transformation mapping, orbit generation, symmetry classification,
 * and normalization for different grid shapes (rectangles, hexagons, triangles).
 *
 * Subclasses must implement:
 * - normalized(bits, width, height): Apply shape-specific normalization
 * - classifyOrbitType(): Classify symmetry orbit types
 *
 * @typedef {Object} BitboardStore
 * @property {*} empty - Empty bitboard value (typically 0n for BigInt)
 * @property {(bitboard: *, index: number) => boolean} isOccupied - Check if cell at index is set
 * @property {(bitboard: *, index: number) => *} getIdx - Get color/value at index
 * @property {(bitboard: *, index: number, color: *) => *} setIdx - Set color/value at index
 * @property {(bitboard: *, width: number, height: number) => *} normalizeUpLeft - Normalize bitboard position
 *
 * @typedef {Object} GridIndexer
 * @property {number} size - Total number of cells/indices
 * @property {(bitboard?: *) => Generator<number>} indices - Iterate all cell indices
 * @property {(bitboard: *) => Generator<number>} bitsIndices - Iterate set bit indices
 * @property {TransformMaps} [transformMaps] - Rotation/reflection transform maps
 *
 * @typedef {Object} CubeHelper
 * @property {number} size - Total number of cells
 * @property {(bitboard?: *) => Generator<number>} indices - Iterate all indices
 * @property {(bitboard: *) => Generator<number>} bitsIndices - Iterate set bit indices
 *
 * @typedef {Object} Mask
 * @property {BitboardStore} [store] - Bitboard store with cell access operations
 * @property {GridIndexer} [indexer] - Grid indexer with size, iteration, and transformations
 * @property {CubeHelper} [cube] - Cube helper for alternative indexing (preferred over indexer)
 * @property {*} [bits] - Template bitboard value
 *
 * @typedef {Object<string, Array<number>>} TransformMapObject
 * @property {Array<number>} [id] - Identity map
 * @property {Array<number>} [r90] - 90° rotation
 * @property {Array<number>} [r180] - 180° rotation
 * @property {Array<number>} [f] - Reflection/flip
 *
 * @typedef {Array<number>} TransformMapArray
 * @typedef {TransformMapObject|Array<TransformMapArray>} TransformMaps
 */
export class ActionsBase {
  /**
   * Create an Actions handler for a grid shape.
   * @param {number} width - Grid width in cells
   * @param {number} height - Grid height in cells
   * @param {Mask|null} [mask=null] - Optional mask object with store, indexer, cube, and bits template
   * @param {Array<string>|null} [rotateTags=null] - Optional rotation transform tag names (e.g., ['r90', 'r180'])
   * @param {Array<string>|null} [flipTags=null] - Optional reflection transform tag names (e.g., ['fx', 'fy'])
   * @throws {Error} Subclass must implement normalized() and classifyOrbitType()
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
   * Maps index old position to new position under transformation.
   * Default implementation accesses via indexer; subclasses may override.
   * @returns {TransformMaps|undefined} Object with named transform arrays, or undefined if unavailable
   */
  get transformMaps () {
    // @ts-ignore: dynamic property access on mask object
    return this.original?.indexer?.transformMaps
  }

  /**
   * Get names of all rotation transformation keys.
   * Caches result after first access to avoid repeated filtering.
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
   * Caches result after first access to avoid repeated filtering.
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
   * Caches result to avoid recomputation.
   * @returns {*|null} Normalized transformed bitboard, or null if transformMaps unavailable
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
   * @returns {Array<*>} Array of rotated bitboards (may include duplicates if symmetric)
   */
  get rotVariantsRaw () {
    return this.rotTags.map(tag => this.applyMapByName(tag))
  }

  /**
   * Get all reflection variants from transform maps.
   * @private
   * @returns {Array<*>} Array of reflected bitboards (may include duplicates if symmetric)
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
   * Deduplicates variants by creating a Set then converting back to Array.
   * @private
   * @param {string} cacheProp - Instance property name for caching
   * @param {Array<*>} variantsRaw - Raw variant array (may have duplicates)
   * @returns {Array<*>} Unique variants excluding the default variant
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
   * @param {*} [bits=null] - Optional bitboard to transform; uses template if omitted
   * @returns {*} Rotated and normalized bitboard
   * @throws {Error} If no non-symmetric rotation exists for this shape
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
   * Reverse of rotate() method.
   * @param {*} [bits=null] - Optional bitboard to transform; uses template if omitted
   * @returns {*} Rotated and normalized bitboard
   * @throws {Error} If no non-symmetric rotation exists for this shape
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
   * @param {*} [bits=null] - Optional bitboard to transform; uses template if omitted
   * @returns {*} Reflected and normalized bitboard
   * @throws {Error} If no non-symmetric reflection exists for this shape
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
   * Combines flip() and rotate() operations.
   * @param {*} [bits=null] - Optional bitboard to transform; uses template if omitted
   * @returns {*} Reflected and rotated bitboard
   */

  rotateFlip (bits = null) {
    return this.rotate(this.flip(bits))
  }

  /**
   * Apply a named transformation to a bitboard.
   * Looks up transform map by tag, applies it, and normalizes result.
   * @param {string} tag - Transform map name (e.g., 'r90', 'f', 'id')
   * @param {*} [bits=null] - Optional bitboard; uses template if omitted
   * @returns {*} Transformed and normalized bitboard
   */

  applyMapByName (tag, bits = null) {
    return this.applyMap(this._mapForTag(tag), bits)
  }

  /**
   * Shape-specific normalization (move bounding box to origin, apply canonical form, etc).
   * Must be implemented by subclasses.
   * Typical implementations: move to upper-left, apply canonical orientation, etc.
   * @abstract
   * @param {*} bits - Bitboard to normalize
   * @param {number} [width=this.width] - Grid width for normalization context
   * @param {number} [height=this.height] - Grid height for normalization context
   * @returns {*} Normalized bitboard
   * @throws {Error} If not implemented in subclass
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
   * Generates all symmetries and returns the minimal string representation.
   * @param {TransformMaps|undefined} [maps=this.transformMaps] - Transformation maps
   * @param {*} [bits=null] - Bitboard to canonicalize; uses template if omitted
   * @param {number} [width=this.width] - Grid width
   * @param {number} [height=this.height] - Grid height
   * @returns {string} Canonical form as string (lexicographically smallest)
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
   * Applies all transformations and deduplicates results.
   * @private
   * @param {TransformMaps|undefined} [maps=this.transformMaps] - Transformation maps
   * @param {*} [bits=null] - Bitboard to transform; uses template if omitted
   * @param {number} [width=this.width] - Grid width
   * @param {number} [height=this.height] - Grid height
   * @returns {Set<*>} Set of unique transformed bitboards (no duplicates)
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
   * Prefers cube.bitsIndices over indexer.bitsIndices for better performance.
   * @private
   * @param {*} bitboard - Bitboard to iterate (often BigInt)
   * @returns {Generator<number>} Generator yielding indices of set bits
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
   * Iterates all possible indices (0 to size-1).
   * Uses preferred source: cube > indexer > generic fallback.
   * @private
   * @param {*} bitboard - Bitboard or spatial structure (for type discrimination)
   * @returns {Generator<number>} Generator yielding all cell indices
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
   * @returns {Array<number>|undefined} Default transformation map array, or undefined if unavailable
   */
  _defaultMap () {
    const maps = this.transformMaps
    if (Array.isArray(maps)) return maps[0]
    return maps?.id
  }

  /**
   * Apply a transformation map to a bitboard using index mapping.
   * For each set bit at index i, creates output with same bit at map[i], preserving color.
   * @param {Array<number>|undefined} [map=this._defaultMap()] - Index mapping array
   * @param {*} [bits=null] - Optional bitboard; uses template if omitted
   * @param {number} [width=this.width] - Grid width for normalization
   * @param {number} [height=this.height] - Grid height for normalization
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
   * Caches result to avoid recomputation.
   * Subclasses typically implement via lazy property.
   * @returns {*} Normalized template bitboard (lazy loaded and cached)
   */

  get template () {
    if (this._template) return this._template
    if (!this.original?.bits) return 0n
    this._template = this.normalized(this.original.bits)
    return this._template
  }

  /**
   * Generate all orbit members (symmetries) of a bitboard.
   * Applies all transformations in maps to bitboard, may include duplicates.
   * @param {TransformMaps|undefined} [maps=this.transformMaps] - Transformation maps
   * @param {*} [bits=null] - Bitboard (defaults to template if omitted)
   * @param {number} [width=this.width] - Grid width for normalization
   * @param {number} [height=this.height] - Grid height for normalization
   * @returns {Array<*>} All transformed bitboards (may have duplicates if symmetric)
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
   * Results are cached for subsequent calls using the same transformMaps.
   * @param {TransformMaps|undefined} [maps=this.transformMaps] - Transformation maps
   * @returns {Array<*>} Array of unique symmetries (copy of cached array)
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
   * Must be implemented by subclasses for specific grid shapes (D4 for rectangles, D6 for hexagons, D3 for triangles, etc).
   * @abstract
   * @returns {string} Orbit type name (e.g., 'I', 'D1', 'D2', 'D3', 'D4', 'D6')
   * @throws {Error} If not implemented in subclass
   */

  classifyOrbitType () {
    throw new Error('classifyOrbitType() not implemented in subclass')
  }

  /**
   * Get the size of the symmetry group (number of symmetries including identity).
   * @returns {number} Cardinality of symmetry group (order of symmetry group)
   */

  get order () {
    return this.symmetries.length
  }

  /**
   * Get all unique symmetries of the template bitboard.
   * Results are cached for subsequent calls.
   * @returns {Array<*>} Array of unique symmetries (copy of cached array, no duplicates)
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
   * @param {string} tag - Transform map name (e.g., 'r90', 'f')
   * @returns {Array<number>|undefined} Index mapping array, or undefined if tag not found
   */

  _mapForTag (tag) {
    // @ts-ignore: dynamic property access on transformMaps
    return this.transformMaps?.[tag]
  }

  /**
   * Filter transform keys by predicate.
   * @private
   * @param {(key: string) => boolean} predicate - Filter function for tag names (returns true to include)
   * @returns {Array<string>} Matching transform tag names
   */

  _filterTransformKeys (predicate) {
    const maps = this.transformMaps
    if (!maps || Array.isArray(maps)) return []
    return Object.keys(maps).filter(predicate)
  }

  /**
   * Find the first non-symmetric transform tag.
   * Searches tags array (forward or reverse) for a tag that changes the shape.
   * @private
   * @param {Array<string>} tags - Candidate transform tag names
   * @param {boolean} [reverse=false] - Search in reverse order
   * @returns {string|undefined} First non-symmetric tag name, or undefined if all are symmetric
   */

  _findNonSymmetricTag (tags, reverse = false) {
    const candidates = reverse ? [...tags].reverse() : tags
    return candidates.find(tag => this._isNonSymmetricTag(tag))
  }

  /**
   * Determine whether a given transform tag changes the shape.
   * Returns false if transformation is symmetric (leaves shape unchanged).
   * @private
   * @param {string} tag - Transform map name
   * @returns {boolean} True if transformation is non-symmetric (changes shape), false if symmetric
   */

  _isNonSymmetricTag (tag) {
    const map = this._mapForTag(tag)
    return map != null && this.applyMap(map) !== this.original?.bits
  }

  /**
   * Determine size used by generic index iteration.
   * Prefers indexer.size over cube.size.
   * @private
   * @returns {number|undefined} Grid size in cells, or undefined if unavailable
   */

  _storageSize () {
    // @ts-ignore: dynamic property access on indexer/cube objects
    return this.indexer?.size || this.cube?.size
  }
}
