/**
 * @typedef {import('./types/interfaces.types.js').BitboardStore} BitboardStore
 * @typedef {import('./types/interfaces.types.js').GridIndexer} GridIndexer
 * @typedef {import('./types/interfaces.types.js').CubeHelper} CubeHelper
 * @typedef {import('./types/interfaces.types.js').TransformMaps} TransformMaps
 * @typedef {import('./types/interfaces.types.js').TransformMapObject} TransformMapObject
 * @typedef {import('./types/interfaces.types.js').TransformMap} TransformMap
 */

/**
 * Common base class for shape-specific Actions implementations.
 *
 * Handles transformation mapping, orbit generation, symmetry classification,
 * and normalization for different grid shapes (rectangles, hexagons, triangles).
 *
 * **Type Definitions**:
 * - {@link BitboardStore}: Storage backend with cell access operations
 * - {@link GridIndexer}: Coordinate-to-index converter for any grid topology
 * - {@link CubeHelper}: Alternative indexing for hexagonal/complex grids
 * - {@link TransformMaps}: Rotation and reflection transformation mapping
 *
 * **Subclass Requirements**:
 * - Implement {@link normalized}(bits, width, height) for shape-specific normalization
 * - Implement {@link classifyOrbitType}() to classify symmetry orbit types
 *
 * **Architecture**:
 * - Uses pluggable storage backends (BitboardStore interface)
 * - Supports multiple indexing schemes (GridIndexer or CubeHelper)
 * - Generates canonical forms and symmetry groups
 * - Caches transformation results for performance
 *
 * @example
 * // Subclass for rectangular grids
 * class RectangleActions extends ActionsBase {
 *   normalized(bits, width, height) {
 *     // Rectangle-specific normalization: move to upper-left
 *     return this.store.normalizeUpLeft(bits, height, width);
 *   }
 *
 *   classifyOrbitType() {
 *     const size = this.symmetries.length;
 *     if (size === 1) return 'I';  // Fully symmetric
 *     if (size === 2) return 'D1'; // One axis
 *     if (size === 4) return 'D2'; // Two axes
 *     return 'D4'; // 90° rotations
 *   }
 * }
 *
 * @class
 * @abstract
 */
export class ActionsBase {
  /**
   * @type {number}
   * @protected
   */
  width

  /**
   * @type {number}
   * @protected
   */
  height

  /**
   * Original mask with store, indexer, cube, and bitboard template
   * @type {Object|null}
   * @protected
   */
  original

  /**
   * Cached rotation transformation tag names
   * @type {string[]|null}
   * @private
   */
  rotateTags

  /**
   * Cached reflection transformation tag names
   * @type {string[]|null}
   * @private
   */
  flipTags

  /**
   * Cached bitboard store reference
   * @type {BitboardStore|undefined}
   * @private
   */
  _store

  /**
   * Cached grid indexer reference
   * @type {GridIndexer|undefined}
   * @private
   */
  _indexer

  /**
   * Cached cube helper reference
   * @type {CubeHelper|undefined}
   * @private
   */
  _cube

  /**
   * Cached default variant
   * @type {unknown}
   * @private
   */
  _defaultVariant

  /**
   * Cached rotation variants array
   * @type {unknown[]}
   * @private
   */
  _rotationVariants

  /**
   * Cached flip variants array
   * @type {unknown[]}
   * @private
   */
  _flipVariants

  /**
   * Cached template bitboard
   * @type {unknown}
   * @private
   */
  _template

  /**
   * Cached orbit (all symmetries)
   * @type {unknown[]}
   * @private
   */
  _orbit

  /**
   * Cached unique symmetries
   * @type {unknown[]}
   * @private
   */
  _symmetries
  /**
   * Create an Actions handler for a grid shape.
   *
   * Initializes transformation handling for a specific grid shape (rectangle, hexagon, triangle).
   * The mask parameter should provide a store, indexer/cube, and template bitboard.
   *
   * @param {number} width - Grid width in cells
   * @param {number} height - Grid height in cells
   * @param {Object|null} [mask=null] - Optional mask with {store: BitboardStore, indexer?: GridIndexer, cube?: CubeHelper, bits: unknown}
   * @param {string[]|null} [rotateTags=null] - Optional cached rotation tag names (e.g., ['r90', 'r180']); auto-cached if omitted
   * @param {string[]|null} [flipTags=null] - Optional cached reflection tag names (e.g., ['fx', 'fy']); auto-cached if omitted
   *
   * @throws {Error} If mask.store is provided but normalized() not implemented in subclass
   * @throws {Error} If transformations are applied but classifyOrbitType() not implemented in subclass
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
   * Caches result after first access for performance.
   *
   * @returns {BitboardStore|undefined} Store with cell access operations, or undefined if no mask
   */
  get store () {
    if (this._store) return this._store
    this._store = this.original?.store
    return this._store
  }

  /**
   * Get the grid indexer from the original mask.
   * Caches result after first access for performance.
   *
   * @returns {GridIndexer|undefined} Indexer for coordinate conversion, or undefined if no mask
   */
  get indexer () {
    if (this._indexer) return this._indexer
    this._indexer = this.original?.indexer
    return this._indexer
  }

  /**
   * Get the cube helper from the original mask.
   * Caches result after first access for performance.
   * Cube helper is preferred over indexer for some coordinate systems (hexagonal, triangular).
   *
   * @returns {CubeHelper|undefined} Cube helper for alternative indexing, or undefined if no mask
   */
  get cube () {
    if (this._cube) return this._cube
    this._cube = this.original?.cube
    return this._cube
  }

  /**
   * Get transformation maps (rotations and reflections).
   *
   * Maps index from old position to new position under transformation.
   * For example, a 90° clockwise rotation maps cell at old position to new position.
   *
   * Default implementation accesses via `indexer.transformMaps`; subclasses may override.
   *
   * @returns {TransformMaps|undefined} Object with named transform arrays (e.g., {id: [...], r90: [...], f: [...]}),
   *                                     or array of transform arrays, or undefined if unavailable
   */
  get transformMaps () {
    return this.original?.indexer?.transformMaps
  }

  /**
   * Get names of all rotation transformation keys.
   *
   * Lazily filters transformMaps keys for rotations (tags containing 'r').
   * Caches result after first access to avoid repeated filtering.
   *
   * @returns {string[]} Array of rotation transform names (e.g., ['r90', 'r180', 'r270'])
   */
  get rotTags () {
    if (!this.transformMaps) return []
    this.rotateTags =
      this.rotateTags || this._filterTransformKeys(tag => tag.includes('r'))
    return this.rotateTags || []
  }

  /**
   * Get names of all reflection transformation keys.
   *
   * Lazily filters transformMaps keys for reflections (tags containing 'f').
   * Caches result after first access to avoid repeated filtering.
   *
   * @returns {string[]} Array of reflection transform names (e.g., ['fx', 'fy', 'fxy'])
   */
  get flpTags () {
    if (!this.transformMaps) return []
    this.flipTags =
      this.flipTags || this._filterTransformKeys(tag => tag.includes('f'))
    return this.flipTags || []
  }

  /**
   * Get the default variant (template) after applying default transformation.
   *
   * The default variant is the template bitboard transformed by the default map.
   * Result is cached to avoid recomputation on repeated accesses.
   *
   * @returns {unknown|null} Normalized transformed bitboard, or null if transformMaps unavailable
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
   *
   * Applies each rotation transformation to the template.
   * May include duplicates if shape has rotational symmetries.
   *
   * @private
   * @returns {unknown[]} Array of rotated bitboards (may include duplicates if symmetric)
   */
  get rotVariantsRaw () {
    return this.rotTags.map(tag => this.applyMapByName(tag))
  }

  /**
   * Get all reflection variants from transform maps.
   *
   * Applies each reflection transformation to the template.
   * May include duplicates if shape has reflection symmetries.
   *
   * @private
   * @returns {unknown[]} Array of reflected bitboards (may include duplicates if symmetric)
   */
  get flpVariantsRaw () {
    return this.flpTags.map(tag => this.applyMapByName(tag))
  }

  /**
   * Get all unique rotational variants.
   *
   * Deduplicates rotVariantsRaw and excludes the default variant.
   * Cached for performance.
   *
   * @returns {unknown[]} Array of rotated bitboards (excludes default, no duplicates)
   */
  get rotationVariants () {
    return this._getCachedVariants('_rotationVariants', this.rotVariantsRaw)
  }

  /**
   * Get all unique reflection variants.
   *
   * Deduplicates flpVariantsRaw and excludes the default variant.
   * Cached for performance.
   *
   * @returns {unknown[]} Array of reflected bitboards (excludes default, no duplicates)
   */
  get flipVariants () {
    return this._getCachedVariants('_flipVariants', this.flpVariantsRaw)
  }

  /**
   * Compute and cache unique variants, excluding the default.
   *
   * Deduplicates variants by creating a Set then converting back to Array.
   * Used internally by rotationVariants and flipVariants getters.
   *
   * @private
   * @param {string} cacheProp - Instance property name for caching (e.g., '_rotationVariants')
   * @param {unknown[]} variantsRaw - Raw variant array (may have duplicates)
   * @returns {unknown[]} Unique variants excluding the default variant
   */
  _getCachedVariants (cacheProp, variantsRaw) {
    if (this[cacheProp]) return [...this[cacheProp]]
    const variants = new Set([this.defaultVariant, ...variantsRaw])
    variants.delete(this.defaultVariant)
    this[cacheProp] = [...variants]
    return [...this[cacheProp]]
  }

  /**
   * Check if shape can be rotated (has non-symmetric rotations).
   *
   * @returns {boolean} True if any rotation is non-symmetric (changes shape)
   */
  canRotate () {
    return this.rotationVariants.length !== 0
  }

  /**
   * Check if shape can be flipped (has non-symmetric reflections).
   *
   * @returns {boolean} True if any reflection is non-symmetric (changes shape)
   */
  canFlip () {
    return this.flipVariants.length !== 0
  }

  /**
   * Rotate shape clockwise (or positive direction).
   *
   * Applies the first non-symmetric rotation transformation.
   * Throws if shape is rotationally symmetric.
   *
   * @param {unknown} [bits=null] - Optional bitboard to transform; uses template if omitted
   * @returns {unknown} Rotated and normalized bitboard
   * @throws {Error} If no non-symmetric rotation exists (shape is rotationally symmetric)
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
   *
   * Applies the first non-symmetric rotation transformation in reverse order.
   * Reverse of the rotate() method.
   *
   * @param {unknown} [bits=null] - Optional bitboard to transform; uses template if omitted
   * @returns {unknown} Rotated and normalized bitboard
   * @throws {Error} If no non-symmetric rotation exists (shape is rotationally symmetric)
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
   *
   * Applies the first non-symmetric reflection transformation.
   * Throws if shape is reflectionally symmetric.
   *
   * @param {unknown} [bits=null] - Optional bitboard to transform; uses template if omitted
   * @returns {unknown} Reflected and normalized bitboard
   * @throws {Error} If no non-symmetric reflection exists (shape is reflectionally symmetric)
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
   *
   * Combines flip() and rotate() operations.
   * Equivalent to: rotate(flip(bits))
   *
   * @param {unknown} [bits=null] - Optional bitboard to transform; uses template if omitted
   * @returns {unknown} Reflected and rotated bitboard
   */
  rotateFlip (bits = null) {
    return this.rotate(this.flip(bits))
  }

  /**
   * Apply a named transformation to a bitboard.
   *
   * Looks up the transform map by tag, applies it to the bitboard, and normalizes result.
   * The map is an index mapping array where map[oldIndex] = newIndex.
   *
   * @param {string} tag - Transform map name (e.g., 'r90', 'f', 'id')
   * @param {unknown} [bits=null] - Optional bitboard; uses template if omitted
   * @returns {unknown} Transformed and normalized bitboard
   */
  applyMapByName (tag, bits = null) {
    return this.applyMap(this._mapForTag(tag), bits)
  }

  /**
   * Shape-specific normalization (move bounding box to origin, apply canonical form, etc).
   *
   * **Abstract method**: Must be implemented by subclasses for shape-specific logic.
   *
   * Typical implementations:
   * - Rectangle: Move bounding box to upper-left corner
   * - Hexagon: Apply canonical hexagonal orientation
   * - Triangle: Normalize to standard triangular orientation
   *
   * @abstract
   * @param {unknown} bits - Bitboard to normalize
   * @param {number} [width=this.width] - Grid width for normalization context
   * @param {number} [height=this.height] - Grid height for normalization context
   * @returns {unknown} Normalized bitboard
   * @throws {Error} If not implemented in subclass, or if normalizeUpLeft not available in store
   */
  normalized (bits, width = this.width, height = this.height) {
    const normalizedBits = bits == null ? this.template : bits
    if (this.store && typeof this.store.normalizeUpLeft === 'function') {
      return this.store.normalizeUpLeft(normalizedBits, height, width)
    }
    throw new Error('normalized() not implemented in subclass')
  }

  /**
   * Find the canonical (lexicographically smallest) form under all symmetries.
   *
   * Generates all symmetries and returns the minimal string representation.
   * This represents the canonical form in the shape's symmetry group.
   *
   * @param {TransformMaps|undefined} [maps=this.transformMaps] - Transformation maps
   * @param {unknown} [bits=null] - Bitboard to canonicalize; uses template if omitted
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
    return bestForm?.toString() || ''
  }

  /**
   * Get all unique symmetries of a bitboard.
   *
   * Applies all transformations and deduplicates results using a Set.
   * Does not include duplicates if shape has symmetries.
   *
   * @private
   * @param {TransformMaps|undefined} [maps=this.transformMaps] - Transformation maps
   * @param {unknown} [bits=null] - Bitboard to transform; uses template if omitted
   * @param {number} [width=this.width] - Grid width
   * @param {number} [height=this.height] - Grid height
   * @returns {Set<unknown>} Set of unique transformed bitboards (no duplicates)
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
   *
   * Uses preferred source in priority order: cube.bitsIndices > indexer.bitsIndices > generic fallback
   * Prefers cube.bitsIndices over indexer.bitsIndices for better performance.
   *
   * @private
   * @generator
   * @param {unknown} bitboard - Bitboard to iterate (often BigInt)
   * @yields {number} Indices of set bits
   * @throws {Error} If no bitsIndices implementation available
   */
  *_bitsIndices (bitboard) {
    if (this.cube && typeof this.cube.bitsIndices === 'function') {
      yield* this.cube.bitsIndices(bitboard)
      return
    }
    if (
      this.indexer?.bitsIndices &&
      !Array.isArray(bitboard) &&
      !(bitboard instanceof Uint32Array)
    ) {
      yield* this.indexer.bitsIndices(bitboard)
      return
    }

    const size = this._storageSize()
    if (
      this.store &&
      typeof this.store.isOccupied === 'function' &&
      size != null
    ) {
      for (let i = 0; i < size; i++) {
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
   *
   * Iterates all possible indices (0 to size-1).
   * Uses preferred source in priority order: cube.indices > indexer.indices > generic fallback
   *
   * @private
   * @generator
   * @param {unknown} bitboard - Bitboard or spatial structure (for type discrimination)
   * @yields {number} All cell indices
   * @throws {Error} If no indices implementation available
   */
  *_indices (bitboard) {
    if (this.cube && typeof this.cube.indices === 'function') {
      yield* this.cube.indices(bitboard)
      return
    }
    if (
      this.indexer?.indices &&
      !Array.isArray(bitboard) &&
      !(bitboard instanceof Uint32Array)
    ) {
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
   *
   * If transformMaps is an array, returns first element.
   * If transformMaps is an object, returns the 'id' (identity) entry.
   * Subclasses can override for different defaults.
   *
   * @private
   * @returns {number[]|undefined} Default transformation map array, or undefined if unavailable
   */
  _defaultMap () {
    const maps = this.transformMaps
    if (Array.isArray(maps)) return maps[0]
    return maps?.id
  }

  /**
   * Apply a transformation map to a bitboard using index mapping.
   *
   * For each set bit at index i, creates output with same bit at map[i], preserving color.
   * Then normalizes the result.
   *
   * Algorithm:
   * 1. Initialize output as empty bitboard
   * 2. For each set bit at index i in input
   * 3. Get the mapped index from map[i]
   * 4. Get the color/value at index i in input
   * 5. Set bit at mapped index in output with same color
   * 6. Normalize and return
   *
   * @param {number[]|undefined} [map=this._defaultMap()] - Index mapping array (map[oldIdx] = newIdx)
   * @param {unknown} [bits=null] - Optional bitboard; uses template if omitted
   * @param {number} [width=this.width] - Grid width for normalization
   * @param {number} [height=this.height] - Grid height for normalization
   * @returns {unknown} Transformed and normalized bitboard
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
      const mappedIndex = map?.[index]
      if (mappedIndex !== undefined) {
        const color = this.store?.getIdx(bitboard, index)
        output = this.store?.setIdx(output, mappedIndex, color) || output
      }
    }
    return this.normalized(output, width, height)
  }

  /**
   * Get the template: the normalized form of the original bitboard.
   *
   * The template is computed once and cached. It's the normalized version of
   * the original bitboard passed to the constructor.
   *
   * Subclasses typically implement via lazy property initialization.
   *
   * @returns {unknown} Normalized template bitboard (lazy loaded and cached)
   */
  get template () {
    if (this._template) return this._template
    if (!this.original?.bits) return 0n
    this._template = this.normalized(this.original.bits)
    return this._template
  }

  /**
   * Generate all orbit members (symmetries) of a bitboard.
   *
   * Applies all transformations in maps to bitboard.
   * May include duplicates if the shape has symmetries.
   *
   * **Example**: A square has 4 rotations but 90° rotation gives a different bitboard.
   * An equilateral triangle has 3 rotations but they're all the same shape (symmetric),
   * so orbitRaw returns 3 copies while symetriesFor deduplicates.
   *
   * @param {TransformMaps|undefined} [maps=this.transformMaps] - Transformation maps
   * @param {unknown} [bits=null] - Bitboard (defaults to template if omitted)
   * @param {number} [width=this.width] - Grid width for normalization
   * @param {number} [height=this.height] - Grid height for normalization
   * @returns {unknown[]} All transformed bitboards (may have duplicates if symmetric)
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
   *
   * Results are cached for subsequent calls using the same transformMaps.
   * If maps is different, returns uncached result.
   *
   * The orbit includes all symmetries, but may have duplicates (use symetriesFor for unique).
   *
   * @param {TransformMaps|undefined} [maps=this.transformMaps] - Transformation maps
   * @returns {unknown[]} Array of all symmetries (copy of cached array, may have duplicates)
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
   *
   * **Abstract method**: Must be implemented by subclasses for specific grid shapes.
   *
   * **Examples**:
   * - D4 (8 symmetries): Rectangle with 90° rotations and reflections
   * - D3 (6 symmetries): Triangle with 120° rotations and reflections
   * - D6 (12 symmetries): Regular hexagon with 60° rotations and reflections
   * - I (1 symmetry): Asymmetric shape (identity only)
   *
   * @abstract
   * @returns {string} Orbit type name (e.g., 'I', 'D1', 'D2', 'D3', 'D4', 'D6')
   * @throws {Error} If not implemented in subclass
   */
  classifyOrbitType () {
    throw new Error('classifyOrbitType() not implemented in subclass')
  }

  /**
   * Get the size of the symmetry group (number of symmetries including identity).
   *
   * Also known as the "order" of the symmetry group.
   *
   * @returns {number} Cardinality of symmetry group (number of unique symmetries)
   */
  get order () {
    return this.symmetries.length
  }

  /**
   * Get all unique symmetries of the template bitboard.
   *
   * Results are cached for subsequent calls.
   * Deduplicates using Set to remove symmetric variations.
   *
   * @returns {unknown[]} Array of unique symmetries (copy of cached array, no duplicates)
   */
  get symmetries () {
    if (this._symmetries) return [...this._symmetries]
    const images = this.orbit(this.transformMaps)
    this._symmetries = [...new Set(images)]
    return [...this._symmetries]
  }

  /**
   * Get the transformation map associated with a tag.
   *
   * @private
   * @param {string} tag - Transform map name (e.g., 'r90', 'f', 'id')
   * @returns {number[]|undefined} Index mapping array, or undefined if tag not found
   */
  _mapForTag (tag) {
    return this.transformMaps?.[tag]
  }

  /**
   * Filter transform keys by predicate.
   *
   * Used to extract rotation or reflection tag names from transformMaps.
   *
   * @private
   * @param {(key: string) => boolean} predicate - Filter function for tag names (returns true to include)
   * @returns {string[]} Matching transform tag names
   */
  _filterTransformKeys (predicate) {
    const maps = this.transformMaps
    if (!maps || Array.isArray(maps)) return []
    return Object.keys(maps).filter(predicate)
  }

  /**
   * Find the first non-symmetric transform tag.
   *
   * Searches tags array (forward or reverse) for a tag that changes the shape.
   * Returns the first tag that produces a different bitboard when applied.
   *
   * @private
   * @param {string[]} tags - Candidate transform tag names
   * @param {boolean} [reverse=false] - Search in reverse order (for counter-clockwise)
   * @returns {string|undefined} First non-symmetric tag name, or undefined if all are symmetric
   */
  _findNonSymmetricTag (tags, reverse = false) {
    const candidates = reverse ? [...tags].reverse() : tags
    return candidates.find(tag => this._isNonSymmetricTag(tag))
  }

  /**
   * Determine whether a given transform tag changes the shape.
   *
   * Returns false if transformation is symmetric (leaves shape unchanged).
   * A tag is symmetric if applying it to the original bits yields the same result.
   *
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
   *
   * Prefers indexer.size over cube.size.
   * Returns undefined if neither is available.
   *
   * @private
   * @returns {number|undefined} Grid size in cells, or undefined if unavailable
   */
  _storageSize () {
    return this.indexer?.size || this.cube?.size
  }
}
