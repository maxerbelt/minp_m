import { bitsSafe } from './bitHelpers.js'

/**
 * Shared utility: Calculate delta (distance) and step direction for line drawing.
 * Used by Bresenham algorithm across all indexer types.
 * @param {number} endX - End x coordinate
 * @param {number} startX - Start x coordinate
 * @param {number} endY - End y coordinate
 * @param {number} startY - Start y coordinate
 * @returns {Object} {deltaX, deltaY, stepX, stepY} - Delta and step values
 */
export function deltaAndDirection (endX, startX, endY, startY) {
  let deltaX = Math.abs(endX - startX)
  let deltaY = Math.abs(endY - startY)

  // Convert boolean comparison into +1 or -1
  const stepX = (startX < endX) * 2 - 1
  const stepY = (startY < endY) * 2 - 1
  return { deltaX, deltaY, stepX, stepY }
}

/**
 * Abstract base class for coordinate-to-index mapping.
 * Provides common line drawing, ray casting, and grid traversal operations
 * that work with any coordinate system (rectangular, hexagonal, triangular).
 * Subclasses must implement index(), location(), and set().
 */
export class Indexer {
  /**
   * Create an indexer for grids of given size.
   * @param {number} size - Total number of cells (width × height)
   * @throws {Error} If instantiated directly (must subclass)
   */
  constructor (size) {
    this.size = size
    this.checkInstantiation()
  }

  /**
   * Convert (x, y) coordinate to linear index.
   * @abstract
   * @param {number} x - Column coordinate
   * @param {number} y - Row coordinate
   * @returns {number} Linear index
   * @throws {Error} Must be implemented in subclass
   */
  index () {
    throw new Error('index method in derived class must be implemented')
  }

  /**
   * Convert linear index to [x, y] coordinate.
   * @abstract
   * @param {number} index - Linear index
   * @returns {Array<number>} [x, y] coordinate
   * @throws {Error} Must be implemented in subclass
   */
  location () {
    throw new Error('location method in derived class must be implemented')
  }

  /**
   * Verify this is a subclass instance (abstract base check).
   * @throws {Error} If called on Indexer class directly
   * @private
   */
  checkInstantiation () {
    if (new.target === Indexer) {
      throw new Error(
        'base class cannot be instantiated directly. Please extend it.'
      )
    }
  }

  /**
   * Update grid cell value.
   * @abstract
   * @throws {Error} Must be implemented in subclass
   */
  set () {
    throw new Error('set method in derived class must be implemented')
  }

  /**
   * Check if coordinate is within grid bounds.
   * @param {number} x - Column coordinate
   * @param {number} y - Row coordinate
   * @returns {boolean} True if coordinate is valid
   */
  isValid (x, y) {
    return x >= 0 && x < this.width && y >= 0 && y < this.height
  }

  // ============================================================================
  // Exit Condition Factories
  // ============================================================================

  /**
   * Creates an exit condition for rays: stops at grid boundary.
   * @returns {Function} Predicate function(x, y) → boolean
   * @private
   */
  _createBoundaryExitCondition () {
    return (x, y) => !this.isValid(x, y)
  }

  /**
   * Creates an exit condition for distance-limited segments.
   * Pattern: Works with any coordinate system (rect, hex, tri).
   * @param {number} distance - Maximum distance in steps
   * @returns {Function} Predicate function(x, y, steps) → boolean
   * @private
   */
  _createDistanceLimitExitCondition (distance) {
    return (x, y, steps) => steps >= distance
  }

  /**
   * Creates an exit condition for segments: stops at exact endpoint.
   * Pattern: Works with any coordinate system (rect, hex, tri).
   * @param {number} endX - Target x coordinate
   * @param {number} endY - Target y coordinate
   * @returns {Function} Predicate function(x, y) → boolean
   * @private
   */
  _createEndpointExitCondition (endX, endY) {
    return (x, y) => x === endX && y === endY
  }

  // ============================================================================
  // Iterator Wrapper Helpers
  // ============================================================================

  /**
   * Converts an iterable of coordinate tuples into an iterable of indices.
   * This is used by the common *Indices methods across all indexers.
   * @param {string} baseMethodName - Name of base method to wrap
   * @returns {Function} Generator function that yields indices
   * @private
   */
  _createIndexIteratorWrapper (baseMethodName) {
    const baseMethod = this[baseMethodName]
    return function* (...args) {
      for (const coordinate of baseMethod.call(this, ...args)) {
        const x = coordinate[0]
        const y = coordinate[1]
        const index = this.index(x, y)
        if (index !== undefined) {
          yield index
        }
      }
    }
  }

  /**
   * Install all index-based iterator wrapper methods from their base implementations.
   * Maps coordinate-based methods to index-based variants automatically.
   * @private
   */
  _installIndexIteratorWrappers () {
    const wrapperPairs = [
      ['rayIndices', 'ray'],
      ['superCoverRayIndices', 'superCoverRay'],
      ['halfCoverRayIndices', 'halfCoverRay'],
      ['segmentToIndices', 'segmentTo'],
      ['superCoverSegmentToIndices', 'superCoverSegmentTo'],
      ['halfCoverSegmentToIndices', 'halfCoverSegmentTo'],
      ['fullLineIndices', 'fullLine'],
      ['superCoverFullLineIndices', 'superCoverFullLine'],
      ['halfCoverFullLineIndices', 'halfCoverFullLine'],
      ['segmentForIndices', 'segmentFor'],
      ['superCoverSegmentForIndices', 'superCoverSegmentFor'],
      ['halfCoverSegmentForIndices', 'halfCoverSegmentFor']
    ]

    for (const [wrapperName, baseMethodName] of wrapperPairs) {
      this[wrapperName] = this._createIndexIteratorWrapper(baseMethodName)
    }
  }

  /**
   * Create an indices wrapper from a base method name.
   * @param {string} baseMethodName - Name of base coordinate method
   * @returns {Function} Generator function that yields indices
   * @private
   */
  _createIndicesWrapper (baseMethodName) {
    return this._createIndexIteratorWrapper(baseMethodName)
  }

  // ============================================================================
  // Parameter Resolution Helpers
  // ============================================================================

  /**
   * Resolve coordinate mapper to a function.
   * Returns identity mapper if not provided or invalid.
   * @param {Function} indexer - Optional coordinate mapper function
   * @returns {Function} Resolved mapper function(x, y, step) → [x, y, step]
   * @private
   */
  _resolveCoordinateMapper (indexer) {
    if (indexer == null || typeof indexer !== 'function') {
      return (x, y, step) => [x, y, step]
    }
    return indexer
  }

  /**
   * Ensure valid coordinate mapper (alias for _resolveCoordinateMapper).
   * @param {Function} indexer - Optional mapper function
   * @returns {Function} Valid mapper function
   * @private
   */
  _ensureIndexer (indexer) {
    return this._resolveCoordinateMapper(indexer)
  }

  /**
   * Resolve exit condition to a function.
   * Returns endpoint exit condition if not provided.
   * @param {Function} exitCondition - Optional exit condition
   * @param {number} endX - Default endpoint x
   * @param {number} endY - Default endpoint y
   * @returns {Function} Valid exit condition function
   * @private
   */
  _resolveExitCondition (exitCondition, endX, endY) {
    if (exitCondition == null || typeof exitCondition !== 'function') {
      return (x, y) => x === endX && y === endY
    }
    return exitCondition
  }

  /**
   * Ensure valid exit condition (alias for _resolveExitCondition).
   * @param {Function} exitCondition - Optional condition
   * @param {number} endX - Default endpoint x
   * @param {number} endY - Default endpoint y
   * @returns {Function} Valid condition function
   * @private
   */
  _ensureExitCondition (exitCondition, endX, endY) {
    return this._resolveExitCondition(exitCondition, endX, endY)
  }

  /**
   * Resolve validation strategy to a function.
   * Defaults to this.validate if not provided.
   * @param {Function} validate - Optional validation function
   * @returns {Function} Valid validation function
   * @private
   */
  _resolveValidationStrategy (validate) {
    if (validate == null || typeof validate !== 'function') {
      return this.validate.bind(this)
    }
    return validate
  }

  /**
   * Ensure valid validation function (alias for _resolveValidationStrategy).
   * @param {Function} validate - Optional validator
   * @returns {Function} Valid validator function
   * @private
   */
  _ensureValidate (validate) {
    return this._resolveValidationStrategy(validate)
  }

  // ============================================================================
  // Delegation Helpers
  // ============================================================================

  /**
   * Delegate a method call to a cover object.
   * @param {string} coverType - Type of cover ('normal', 'super', 'half')
   * @param {string} baseName - Name of method to call
   * @param {Array} args - Arguments to pass
   * @returns {*} Return value from delegated method
   * @throws {Error} If cover type or method not found
   * @private
   */
  _delegateCoverMethod (coverType, baseName, args) {
    const cover = this?.cover?.[coverType]
    if (!cover) {
      throw new Error(`Missing cover object for type ${coverType}`)
    }
    const method = cover[baseName]
    if (typeof method !== 'function') {
      throw new TypeError(`Missing cover delegate ${coverType}.${baseName}`)
    }
    return method.apply(cover, args)
  }

  /**
   * Delegate a generator method call to a cover object.
   * @generator
   * @param {string} coverType - Type of cover ('normal', 'super', 'half')
   * @param {string} baseName - Name of generator method
   * @param {...*} args - Arguments to pass
   * @private
   */
  *_delegateCoverGenerator (coverType, baseName, ...args) {
    return yield* this._delegateCoverMethod(coverType, baseName, args)
  }

  // ============================================================================
  // Cover Delegation Methods
  // ============================================================================

  /**
   * Draw line using normal (basic) coverage.
   * @generator
   * @param {...*} args - Arguments for cover.normal.line()
   * @yields {Array<number>} [x, y] coordinates
   */
  *line (...args) {
    return yield* this._delegateCoverGenerator('normal', 'line', ...args)
  }

  /**
   * Draw line using super coverage (Euclidean).
   * @generator
   * @param {...*} args - Arguments for cover.super.line()
   * @yields {Array<number>} [x, y] coordinates
   */
  *superCoverLine (...args) {
    return yield* this._delegateCoverGenerator('super', 'line', ...args)
  }

  /**
   * Draw line using half coverage.
   * @generator
   * @param {...*} args - Arguments for cover.half.line()
   * @yields {Array<number>} [x, y] coordinates
   */
  *halfCoverLine (...args) {
    return yield* this._delegateCoverGenerator('half', 'line', ...args)
  }

  /**
   * Draw ray using normal coverage.
   * @generator
   * @param {...*} args - Arguments for cover.normal.ray()
   * @yields {Array<number>} [x, y] coordinates
   */
  *ray (...args) {
    return yield* this._delegateCoverGenerator('normal', 'ray', ...args)
  }

  /**
   * Draw ray using super coverage.
   * @generator
   * @param {...*} args - Arguments for cover.super.ray()
   * @yields {Array<number>} [x, y] coordinates
   */
  *superCoverRay (...args) {
    return yield* this._delegateCoverGenerator('super', 'ray', ...args)
  }

  /**
   * Draw ray using half coverage.
   * @generator
   * @param {...*} args - Arguments for cover.half.ray()
   * @yields {Array<number>} [x, y] coordinates
   */
  *halfCoverRay (...args) {
    return yield* this._delegateCoverGenerator('half', 'ray', ...args)
  }

  /**
   * Draw segment to endpoint using normal coverage.
   * @generator
   * @param {...*} args - Arguments for cover.normal.segmentTo()
   * @yields {Array<number>} [x, y] coordinates
   */
  *segmentTo (...args) {
    return yield* this._delegateCoverGenerator('normal', 'segmentTo', ...args)
  }

  /**
   * Draw segment to endpoint using super coverage.
   * @generator
   * @param {...*} args - Arguments for cover.super.segmentTo()
   * @yields {Array<number>} [x, y] coordinates
   */
  *superCoverSegmentTo (...args) {
    return yield* this._delegateCoverGenerator('super', 'segmentTo', ...args)
  }

  /**
   * Draw segment to endpoint using half coverage.
   * @generator
   * @param {...*} args - Arguments for cover.half.segmentTo()
   * @yields {Array<number>} [x, y] coordinates
   */
  *halfCoverSegmentTo (...args) {
    return yield* this._delegateCoverGenerator('half', 'segmentTo', ...args)
  }

  /**
   * Draw full (infinite) line using normal coverage.
   * @generator
   * @param {...*} args - Arguments for cover.normal.fullLine()
   * @yields {Array<number>} [x, y] coordinates
   */
  *fullLine (...args) {
    return yield* this._delegateCoverGenerator('normal', 'fullLine', ...args)
  }

  /**
   * Draw full line using super coverage.
   * @generator
   * @param {...*} args - Arguments for cover.super.fullLine()
   * @yields {Array<number>} [x, y] coordinates
   */
  *superCoverFullLine (...args) {
    return yield* this._delegateCoverGenerator('super', 'fullLine', ...args)
  }

  /**
   * Draw full line using half coverage.
   * @generator
   * @param {...*} args - Arguments for cover.half.fullLine()
   * @yields {Array<number>} [x, y] coordinates
   */
  *halfCoverFullLine (...args) {
    return yield* this._delegateCoverGenerator('half', 'fullLine', ...args)
  }

  /**
   * Draw segment for specific distance using normal coverage.
   * @generator
   * @param {...*} args - Arguments for cover.normal.segmentFor()
   * @yields {Array<number>} [x, y] coordinates
   */
  *segmentFor (...args) {
    return yield* this._delegateCoverGenerator('normal', 'segmentFor', ...args)
  }

  /**
   * Draw segment for distance using super coverage.
   * @generator
   * @param {...*} args - Arguments for cover.super.segmentFor()
   * @yields {Array<number>} [x, y] coordinates
   */
  *superCoverSegmentFor (...args) {
    return yield* this._delegateCoverGenerator('super', 'segmentFor', ...args)
  }

  /**
   * Draw segment for distance using half coverage.
   * @generator
   * @param {...*} args - Arguments for cover.half.segmentFor()
   * @yields {Array<number>} [x, y] coordinates
   */
  *halfCoverSegmentFor (...args) {
    return yield* this._delegateCoverGenerator('half', 'segmentFor', ...args)
  }

  // ============================================================================
  // Intercept/Boundary Detection
  // ============================================================================

  /**
   * Find the last point before ray hits boundary.
   * @param {number} startX - Start x coordinate
   * @param {number} startY - Start y coordinate
   * @param {number} endX - Target x coordinate
   * @param {number} endY - Target y coordinate
   * @returns {Array<number>} [x, y] boundary intercept
   */
  intercept (startX, startY, endX, endY) {
    let lastX = startX
    let lastY = startY

    for (const [x, y] of this.ray(startX, startY, endX, endY)) {
      lastX = x
      lastY = y
    }
    return [lastX, lastY]
  }

  /**
   * Find intercepts in both directions from a line.
   * @param {number} startX - Start x coordinate
   * @param {number} startY - Start y coordinate
   * @param {number} endX - End x coordinate
   * @param {number} endY - End y coordinate
   * @returns {Object} {x0, y0, x1, y1} boundary intercepts
   */
  intercepts (startX, startY, endX, endY) {
    const [x1, y1] = this.intercept(startX, startY, endX, endY)
    const [x0, y0] = this.intercept(endX, endY, startX, startY)
    return { x0, y0, x1, y1 }
  }

  // ============================================================================
  // List and Bitboard Conversion
  // ============================================================================

  /**
   * Convert coordinate list to index list.
   * @generator
   * @param {Array<Array>} coords - List of [x, y] coordinates
   * @yields {number} Index for each valid coordinate
   */
  *list (coords) {
    for (const point of coords) {
      const i = this.index(...point)
      if (i !== undefined) {
        yield i
      }
    }
  }

  /**
   * Convert coordinate list to index list (alias for list).
   * @generator
   * @param {Array<Array>} coords - List of [x, y] coordinates
   * @yields {number} Index for each valid coordinate
   */
  *indicesFromCoords (coords) {
    yield* this.list(coords)
  }

  /**
   * Convert coordinate list to bitboard representation.
   * @param {Object} bbc - Bitboard container with store
   * @param {Array<Array>} coords - List of [x, y] coordinates
   * @returns {bigint} Bitboard with indices set
   */
  bitsFromCoords (bbc, coords) {
    // generic helper used by various classes; make sure we update the bitboard
    let bits = bbc.store.empty

    for (const i of this.list(coords)) {
      bits = bbc.store.setIdx(bits, i, 1)
    }
    return bits
  }

  /**
   * Convert bitboard to coordinate list.
   * @param {bigint} bb - Bitboard value
   * @returns {Array<Array>} List of [x, y] coordinates
   */
  bitsToCoords (bb) {
    const coords = []
    for (const args of this.bitKeys(bb)) {
      coords.push(args)
    }
    return coords
  }

  /**
   * Convert bitboard to coordinate list (alias for bitsToCoords).
   * @param {bigint} bb - Bitboard value
   * @returns {Array<Array>} List of [x, y] coordinates
   */
  coordinatesFromBitboard (bb) {
    return this.bitsToCoords(bb)
  }

  // ============================================================================
  // Grid Iteration
  // ============================================================================

  /**
   * Iterate over all grid positions as [x, y, index] tuples.
   * @generator
   * @yields {Array<number>} [x, y, index]
   */
  *keys () {
    const n = this.size
    for (let i = 0; i < n; i++) {
      const lc = this.location(i)
      yield [...lc, i]
    }
  }

  /**
   * Iterate over all indices in grid.
   * @generator
   * @yields {number} Index from 0 to size-1
   */
  *indices () {
    const n = this.size
    for (let i = 0; i < n; i++) {
      yield i
    }
  }

  /**
   * Iterate over all grid positions with bitboard values.
   * @generator
   * @param {Object} bb - Bitboard object with at(x, y) method
   * @yields {Array} [x, y, index, value, bb]
   */
  *entries (bb) {
    for (const key of this.keys()) {
      yield [...key, bb.at(...key), bb]
    }
  }

  /**
   * Iterate over all grid values from bitboard.
   * @generator
   * @param {Object} bb - Bitboard object with at(x, y) method
   * @yields {number} Cell value at each position
   */
  *values (bb) {
    for (const key of this.keys()) {
      yield bb.at(...key)
    }
  }
  *bitsIndices (bb) {
    yield* bitsSafe(bb, this.size)
  }

  *bitKeys (bb) {
    for (const i of this.bitsIndices(bb)) {
      const loc = this.location(i)
      yield [...loc, i]
    }
  }
  *indicesValues (bb) {
    for (const i of this.bitsIndices(bb)) {
      const loc = this.location(i)
      const value = bb.at(...loc)
      yield [i, value]
    }
  }
}
