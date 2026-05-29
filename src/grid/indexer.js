import { bitsSafe } from './bitStore/helpers/bitHelpers.js'

/**
 * Coordinate pair representing a grid position.
 * @typedef {[number, number]} Coordinate
 * @property {number} 0 - Column coordinate (x)
 * @property {number} 1 - Row coordinate (y)
 */

/**
 * Coordinate tuple with index.
 * @typedef {[number, number, number]} CoordinateWithIndex
 * @property {number} 0 - Column coordinate (x)
 * @property {number} 1 - Row coordinate (y)
 * @property {number} 2 - Linear grid index
 */

/**
 * Line drawing parameters.
 * @typedef {Object} LineParameters
 * @property {number} deltaX - Absolute horizontal distance
 * @property {number} deltaY - Absolute vertical distance
 * @property {number} stepX - Horizontal step direction (+1 or -1)
 * @property {number} stepY - Vertical step direction (+1 or -1)
 */

/**
 * Boundary intercept result.
 * @typedef {Object} InterceptResult
 * @property {number} x0 - Start boundary x coordinate
 * @property {number} y0 - Start boundary y coordinate
 * @property {number} x1 - End boundary x coordinate
 * @property {number} y1 - End boundary y coordinate
 */

/**
 * Shared utility: Calculate delta (distance) and step direction for line drawing.
 * Used by Bresenham algorithm across all indexer types.
 *
 * Computes the absolute distances and direction multipliers needed for line drawing
 * algorithms. The step values are +1 or -1, determined by comparing start/end positions.
 *
 * @param {number} endX - End x coordinate
 * @param {number} startX - Start x coordinate
 * @param {number} endY - End y coordinate
 * @param {number} startY - Start y coordinate
 * @returns {LineParameters} {deltaX, deltaY, stepX, stepY} - Delta and step values
 *
 * @example
 * const {deltaX, deltaY, stepX, stepY} = deltaAndDirection(10, 0, 5, 0);
 * // Returns: {deltaX: 10, deltaY: 5, stepX: 1, stepY: 1}
 */
export function deltaAndDirection (endX, startX, endY, startY) {
  let deltaX = Math.abs(endX - startX)
  let deltaY = Math.abs(endY - startY)

  // Convert boolean comparison into +1 or -1
  const stepX = (startX < endX) * 2 - 1
  const stepY = (startY < endY) * 2 - 1
  return { deltaX, deltaY, stepX, stepY }
}

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
 *
 * Provides common line drawing, ray casting, and grid traversal operations
 * that work with any coordinate system (rectangular, hexagonal, triangular).
 * Implements the bridge between coordinate-based and index-based representations.
 *
 * Subclasses must implement the abstract methods:
 * - index(x, y) - Convert coordinate to linear index
 * - location(index) - Convert linear index to coordinate
 * - set() - Update grid cell value
 *
 * The class provides three types of line drawing algorithms:
 * - Normal: Basic connectivity
 * - Super cover (Euclidean): Covers all cells touching the line
 * - Half cover: Balanced coverage between start and end
 *
 * Cannot be instantiated directly - must be extended by concrete implementations.
 *
 * @abstract
 * @class Indexer
 *
 * @example
 * // Concrete subclass implementation
 * class RectIndexer extends Indexer {
 *   constructor(width, height) {
 *     super(width * height);
 *     this.width = width;
 *     this.height = height;
 *   }
 *   index(x, y) {
 *     return y * this.width + x;
 *   }
 *   location(idx) {
 *     return [idx % this.width, Math.floor(idx / this.width)];
 *   }
 * }
 */
export class Indexer {
  /**
   * Create an indexer for grids of given size.
   *
   * Initializes the indexer and enforces the abstract base class constraint
   * by preventing direct instantiation. The size parameter defines the total
   * number of cells in the grid and is used for bounds checking.
   *
   * @constructor
   * @protected
   * @param {number} size - Total number of cells (width × height or equivalent)
   * @throws {Error} If instantiated directly as Indexer (must extend)
   * @throws {Error} If size is not a positive number
   */
  constructor (size) {
    this.size = size
    this.checkInstantiation()
  }

  /**
   * Convert (x, y) coordinate to linear index.
   *
   * Must be implemented by subclasses to map from 2D coordinates to a linear
   * index suitable for bitboard storage. The mapping depends on the coordinate
   * system (rectangular, hexagonal, etc.).
   *
   * @abstract
   * @method index
   * @param {number} x - Column coordinate
   * @param {number} y - Row coordinate
   * @returns {number} Linear index (0 to size-1)
   * @throws {Error} Must be implemented in subclass
   */
  index () {
    throw new Error('index method in derived class must be implemented')
  }

  /**
   * Convert linear index to [x, y] coordinate.
   *
   * Must be implemented by subclasses to map from a linear index back to
   * 2D coordinates. Inverse operation of index().
   *
   * @abstract
   * @method location
   * @param {number} index - Linear index (0 to size-1)
   * @returns {Coordinate} [x, y] coordinate pair
   * @throws {Error} Must be implemented in subclass
   */
  location () {
    throw new Error('location method in derived class must be implemented')
  }

  /**
   * Verify this is a subclass instance (abstract base check).
   *
   * Uses the new.target intrinsic to detect if Indexer was instantiated directly
   * (rather than a subclass), which would indicate misuse of the abstract class.
   *
   * @private
   * @access private
   * @throws {Error} If called on Indexer class directly
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
   *
   * Must be implemented by subclasses to provide cell write operations.
   * The semantics depend on the concrete implementation.
   *
   * @abstract
   * @method set
   * @throws {Error} Must be implemented in subclass
   */
  set () {
    throw new Error('set method in derived class must be implemented')
  }

  /**
   * Check if coordinate is within grid bounds.
   *
   * Validates that the given coordinate is valid for this grid.
   * Requires this.width and this.height to be set by subclasses.
   *
   * @param {number} x - Column coordinate
   * @param {number} y - Row coordinate
   * @returns {boolean} True if coordinate is valid (0 <= x < width, 0 <= y < height)
   */
  isValid (x, y) {
    return x >= 0 && x < this.width && y >= 0 && y < this.height
  }

  // ============================================================================
  // Exit Condition Factories
  // ============================================================================

  /**
   * Creates an exit condition for rays: stops at grid boundary.
   *
   * Returns a predicate that tests if a coordinate is outside the grid bounds.
   * Used to terminate ray tracing at the grid edge.
   *
   * @private
   * @access private
   * @returns {Function} Predicate function(x, y) → boolean (true if outside bounds)
   */
  _createBoundaryExitCondition () {
    return (x, y) => !this.isValid(x, y)
  }

  /**
   * Creates an exit condition for distance-limited segments.
   *
   * Returns a predicate that checks if the step count has reached the limit.
   * Pattern: Works with any coordinate system (rect, hex, tri).
   *
   * @private
   * @access private
   * @param {number} distance - Maximum distance in steps
   * @returns {Function} Predicate function(x, y, steps) → boolean (true if distance exceeded)
   */
  _createDistanceLimitExitCondition (distance) {
    return (x, y, steps) => steps >= distance
  }

  /**
   * Creates an exit condition for segments: stops at exact endpoint.
   *
   * Returns a predicate that checks if the current position matches the endpoint.
   * Pattern: Works with any coordinate system (rect, hex, tri).
   *
   * @private
   * @access private
   * @param {number} endX - Target x coordinate
   * @param {number} endY - Target y coordinate
   * @returns {Function} Predicate function(x, y) → boolean (true if at endpoint)
   */
  _createEndpointExitCondition (endX, endY) {
    return (x, y) => x === endX && y === endY
  }

  // ============================================================================
  // Iterator Wrapper Helpers
  // ============================================================================

  /**
   * Converts an iterable of coordinate tuples into an iterable of indices.
   *
   * Creates a wrapper generator that transforms the output of a coordinate-based
   * method into indices using the index() mapping. Used by the common *Indices
   * methods across all indexers to avoid code duplication.
   *
   * @private
   * @access private
   * @param {string} baseMethodName - Name of base method to wrap
   * @returns {Function} Generator function that yields indices
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
   *
   * Maps coordinate-based methods to index-based variants automatically.
   * Called during subclass construction to avoid manual method definitions.
   * Creates wrappers for all twelve line drawing variants.
   *
   * @private
   * @access private
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
   *
   * Convenience method that delegates to _createIndexIteratorWrapper.
   *
   * @private
   * @access private
   * @param {string} baseMethodName - Name of base coordinate method
   * @returns {Function} Generator function that yields indices
   */
  _createIndicesWrapper (baseMethodName) {
    return this._createIndexIteratorWrapper(baseMethodName)
  }

  // ============================================================================
  // Parameter Resolution Helpers
  // ============================================================================

  /**
   * Resolve coordinate mapper to a function.
   *
   * Returns identity mapper if the provided parameter is null, undefined, or not a function.
   * Ensures a valid mapper is always returned.
   *
   * @private
   * @access private
   * @param {Function} indexer - Optional coordinate mapper function
   * @returns {Function} Resolved mapper function(x, y, step) → [x, y, step]
   */
  _resolveCoordinateMapper (indexer) {
    if (indexer == null || typeof indexer !== 'function') {
      return (x, y, step) => [x, y, step]
    }
    return indexer
  }

  /**
   * Ensure valid coordinate mapper (alias for _resolveCoordinateMapper).
   *
   * Convenience wrapper for _resolveCoordinateMapper with clearer naming intent.
   *
   * @private
   * @access private
   * @param {Function} indexer - Optional mapper function
   * @returns {Function} Valid mapper function
   */
  _ensureIndexer (indexer) {
    return this._resolveCoordinateMapper(indexer)
  }

  /**
   * Resolve exit condition to a function.
   *
   * Returns endpoint exit condition if the provided parameter is null, undefined,
   * or not a function. Ensures a valid condition is always returned.
   *
   * @private
   * @access private
   * @param {Function} exitCondition - Optional exit condition
   * @param {number} endX - Default endpoint x
   * @param {number} endY - Default endpoint y
   * @returns {Function} Valid exit condition function(x, y) → boolean
   */
  _resolveExitCondition (exitCondition, endX, endY) {
    if (exitCondition == null || typeof exitCondition !== 'function') {
      return (x, y) => x === endX && y === endY
    }
    return exitCondition
  }

  /**
   * Ensure valid exit condition (alias for _resolveExitCondition).
   *
   * Convenience wrapper for _resolveExitCondition with clearer naming intent.
   *
   * @private
   * @access private
   * @param {Function} exitCondition - Optional condition
   * @param {number} endX - Default endpoint x
   * @param {number} endY - Default endpoint y
   * @returns {Function} Valid condition function
   */
  _ensureExitCondition (exitCondition, endX, endY) {
    return this._resolveExitCondition(exitCondition, endX, endY)
  }

  /**
   * Resolve validation strategy to a function.
   *
   * Defaults to this.validate if not provided or invalid.
   * Ensures a valid validation function is always returned.
   *
   * @private
   * @access private
   * @param {Function} validate - Optional validation function
   * @returns {Function} Valid validation function
   */
  _resolveValidationStrategy (validate) {
    if (validate == null || typeof validate !== 'function') {
      return this.validate.bind(this)
    }
    return validate
  }

  /**
   * Ensure valid validation function (alias for _resolveValidationStrategy).
   *
   * Convenience wrapper for _resolveValidationStrategy with clearer naming intent.
   *
   * @private
   * @access private
   * @param {Function} validate - Optional validator
   * @returns {Function} Valid validator function
   */
  _ensureValidate (validate) {
    return this._resolveValidationStrategy(validate)
  }

  // ============================================================================
  // Delegation Helpers
  // ============================================================================

  /**
   * Delegate a method call to a cover object.
   *
   * Routes method calls to specialized cover type objects (normal, super, half).
   * Used to enable pluggable line drawing algorithms without code duplication.
   *
   * @private
   * @access private
   * @param {string} coverType - Type of cover ('normal', 'super', 'half')
   * @param {string} baseName - Name of method to call
   * @param {Array} args - Arguments to pass
   * @returns {*} Return value from delegated method
   * @throws {Error} If cover type or method not found
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
   *
   * Routes generator method calls to specialized cover type objects.
   * Uses yield* to transparently pass through the delegated generator.
   *
   * @generator
   * @private
   * @access private
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
   *
   * Yields coordinates along a line using the standard line drawing algorithm.
   *
   * @generator
   * @param {...*} args - Arguments for cover.normal.line()
   * @yields {Coordinate} [x, y] coordinates along the line
   * @returns {Generator<Coordinate, void, void>} Generator of coordinates
   */
  *line (...args) {
    return yield* this._delegateCoverGenerator('normal', 'line', ...args)
  }

  /**
   * Draw line using super coverage (Euclidean).
   *
   * Yields all cells that the line touches, providing complete coverage.
   *
   * @generator
   * @param {...*} args - Arguments for cover.super.line()
   * @yields {Coordinate} [x, y] coordinates along the line
   * @returns {Generator<Coordinate, void, void>} Generator of coordinates
   */
  *superCoverLine (...args) {
    return yield* this._delegateCoverGenerator('super', 'line', ...args)
  }

  /**
   * Draw line using half coverage.
   *
   * Yields coordinates using balanced coverage between start and end points.
   *
   * @generator
   * @param {...*} args - Arguments for cover.half.line()
   * @yields {Coordinate} [x, y] coordinates along the line
   * @returns {Generator<Coordinate, void, void>} Generator of coordinates
   */
  *halfCoverLine (...args) {
    return yield* this._delegateCoverGenerator('half', 'line', ...args)
  }

  /**
   * Draw ray using normal coverage.
   *
   * Yields coordinates along a ray from start towards target, stopping at grid boundary.
   *
   * @generator
   * @param {...*} args - Arguments for cover.normal.ray()
   * @yields {Coordinate} [x, y] coordinates along the ray
   * @returns {Generator<Coordinate, void, void>} Generator of coordinates
   */
  *ray (...args) {
    return yield* this._delegateCoverGenerator('normal', 'ray', ...args)
  }

  /**
   * Draw ray using super coverage.
   *
   * Yields all cells touched by a ray using Euclidean coverage.
   *
   * @generator
   * @param {...*} args - Arguments for cover.super.ray()
   * @yields {Coordinate} [x, y] coordinates along the ray
   * @returns {Generator<Coordinate, void, void>} Generator of coordinates
   */
  *superCoverRay (...args) {
    return yield* this._delegateCoverGenerator('super', 'ray', ...args)
  }

  /**
   * Draw ray using half coverage.
   *
   * Yields coordinates along a ray using balanced coverage.
   *
   * @generator
   * @param {...*} args - Arguments for cover.half.ray()
   * @yields {Coordinate} [x, y] coordinates along the ray
   * @returns {Generator<Coordinate, void, void>} Generator of coordinates
   */
  *halfCoverRay (...args) {
    return yield* this._delegateCoverGenerator('half', 'ray', ...args)
  }

  /**
   * Draw segment to endpoint using normal coverage.
   *
   * Yields coordinates from start to end point using standard line algorithm.
   *
   * @generator
   * @param {...*} args - Arguments for cover.normal.segmentTo()
   * @yields {Coordinate} [x, y] coordinates along the segment
   * @returns {Generator<Coordinate, void, void>} Generator of coordinates
   */
  *segmentTo (...args) {
    return yield* this._delegateCoverGenerator('normal', 'segmentTo', ...args)
  }

  /**
   * Draw segment to endpoint using super coverage.
   *
   * Yields all cells touched by a line segment using Euclidean coverage.
   *
   * @generator
   * @param {...*} args - Arguments for cover.super.segmentTo()
   * @yields {Coordinate} [x, y] coordinates along the segment
   * @returns {Generator<Coordinate, void, void>} Generator of coordinates
   */
  *superCoverSegmentTo (...args) {
    return yield* this._delegateCoverGenerator('super', 'segmentTo', ...args)
  }

  /**
   * Draw segment to endpoint using half coverage.
   *
   * Yields coordinates along a line segment using balanced coverage.
   *
   * @generator
   * @param {...*} args - Arguments for cover.half.segmentTo()
   * @yields {Coordinate} [x, y] coordinates along the segment
   * @returns {Generator<Coordinate, void, void>} Generator of coordinates
   */
  *halfCoverSegmentTo (...args) {
    return yield* this._delegateCoverGenerator('half', 'segmentTo', ...args)
  }

  /**
   * Draw full (infinite) line using normal coverage.
   *
   * Yields coordinates along a line extended through both endpoints until grid boundary.
   *
   * @generator
   * @param {...*} args - Arguments for cover.normal.fullLine()
   * @yields {Coordinate} [x, y] coordinates along the line
   * @returns {Generator<Coordinate, void, void>} Generator of coordinates
   */
  *fullLine (...args) {
    return yield* this._delegateCoverGenerator('normal', 'fullLine', ...args)
  }

  /**
   * Draw full line using super coverage.
   *
   * Yields all cells touched by a full line using Euclidean coverage.
   *
   * @generator
   * @param {...*} args - Arguments for cover.super.fullLine()
   * @yields {Coordinate} [x, y] coordinates along the line
   * @returns {Generator<Coordinate, void, void>} Generator of coordinates
   */
  *superCoverFullLine (...args) {
    return yield* this._delegateCoverGenerator('super', 'fullLine', ...args)
  }

  /**
   * Draw full line using half coverage.
   *
   * Yields coordinates along a full line using balanced coverage.
   *
   * @generator
   * @param {...*} args - Arguments for cover.half.fullLine()
   * @yields {Coordinate} [x, y] coordinates along the line
   * @returns {Generator<Coordinate, void, void>} Generator of coordinates
   */
  *halfCoverFullLine (...args) {
    return yield* this._delegateCoverGenerator('half', 'fullLine', ...args)
  }

  /**
   * Draw segment for specific distance using normal coverage.
   *
   * Yields coordinates for a segment of given length from start point.
   *
   * @generator
   * @param {...*} args - Arguments for cover.normal.segmentFor()
   * @yields {Coordinate} [x, y] coordinates along the segment
   * @returns {Generator<Coordinate, void, void>} Generator of coordinates
   */
  *segmentFor (...args) {
    return yield* this._delegateCoverGenerator('normal', 'segmentFor', ...args)
  }

  /**
   * Draw segment for distance using super coverage.
   *
   * Yields all cells touched by a distance-limited segment using Euclidean coverage.
   *
   * @generator
   * @param {...*} args - Arguments for cover.super.segmentFor()
   * @yields {Coordinate} [x, y] coordinates along the segment
   * @returns {Generator<Coordinate, void, void>} Generator of coordinates
   */
  *superCoverSegmentFor (...args) {
    return yield* this._delegateCoverGenerator('super', 'segmentFor', ...args)
  }

  /**
   * Draw segment for distance using half coverage.
   *
   * Yields coordinates for a distance-limited segment using balanced coverage.
   *
   * @generator
   * @param {...*} args - Arguments for cover.half.segmentFor()
   * @yields {Coordinate} [x, y] coordinates along the segment
   * @returns {Generator<Coordinate, void, void>} Generator of coordinates
   */
  *halfCoverSegmentFor (...args) {
    return yield* this._delegateCoverGenerator('half', 'segmentFor', ...args)
  }

  /**
   * Detects and yields corner-crossing cells for super-cover algorithm.
   *
   * Yields cells at corners that the line touches but main algorithm misses.
   * Delegates to cover.super implementation for consistency.
   *
   * @generator
   * @param {...*} args - Arguments for cover.super.yieldSuperCoverCornerCells()
   * @yields {Coordinate} [x, y] coordinates of corner cells
   * @returns {Generator<Coordinate, void, void>} Generator of coordinates
   */
  *yieldSuperCoverCornerCells (...args) {
    return yield* this._delegateCoverGenerator(
      'super',
      'yieldSuperCoverCornerCells',
      ...args
    )
  }

  /**
   * Detects and yields corner-crossing cells for half-cover algorithm.
   *
   * Yields cells at corners that the line touches but main algorithm misses.
   * Delegates to cover.half implementation for consistency.
   *
   * @generator
   * @param {...*} args - Arguments for cover.half.yieldHalfCoverCornerCells()
   * @yields {Coordinate} [x, y] coordinates of corner cells
   * @returns {Generator<Coordinate, void, void>} Generator of coordinates
   */
  *yieldHalfCoverCornerCells (...args) {
    return yield* this._delegateCoverGenerator(
      'half',
      'yieldHalfCoverCornerCells',
      ...args
    )
  }

  // ============================================================================
  // Intercept/Boundary Detection
  // ============================================================================

  /**
   * Find the last point before ray hits boundary.
   *
   * Traces a ray from start towards end and returns the last valid coordinate
   * before exiting the grid. Useful for boundary detection and clipping.
   *
   * @param {number} startX - Start x coordinate
   * @param {number} startY - Start y coordinate
   * @param {number} endX - Target x coordinate
   * @param {number} endY - Target y coordinate
   * @returns {Coordinate} [x, y] boundary intercept (last valid position)
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
   * @param {number} origSX - original Start x coordinate
   * @param {number} origSY - original Start y coordinate
   * @param {number} origEX - original End x coordinate
   * @param {number} origEY - original End y coordinate
   * @returns {Object} {x0, y0, x1, y1} boundary intercepts
   */
  reverseIntercept (origSX, origSY, origEX, origEY) {
    return this.intercept(origEX, origEY, origSX, origSY)
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
    const [x0, y0] = this.reverseIntercept(startX, startY, endX, endY)
    return { x0, y0, x1, y1 }
  }

  // ============================================================================
  // List and Bitboard Conversion
  // ============================================================================

  /**
   * Convert coordinate list to index list.
   *
   * Transforms an array of [x, y] coordinate pairs into linear indices.
   * Skips invalid coordinates (those outside grid bounds).
   *
   * @generator
   * @param {Array<Coordinate>} coords - List of [x, y] coordinates
   * @yields {number} Index for each valid coordinate
   * @returns {Generator<number, void, void>} Generator of indices
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
   *
   * Convenience wrapper with explicit naming for coordinate-to-index conversion.
   *
   * @generator
   * @param {Array<Coordinate>} coords - List of [x, y] coordinates
   * @yields {number} Index for each valid coordinate
   * @returns {Generator<number, void, void>} Generator of indices
   */
  *indicesFromCoords (coords) {
    yield* this.list(coords)
  }

  /**
   * Convert coordinate list to bitboard representation.
   *
   * Takes a list of [x, y] coordinates and creates a bitboard with bits set
   * at corresponding indices. Used for mask creation from coordinate lists.
   *
   * @param {Object} bbc - Bitboard container with store property
   * @param {Array<Coordinate>} coords - List of [x, y] coordinates
   * @returns {bigint} Bitboard with indices set at coordinate positions
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
   *
   * Transforms a bitboard value into an array of [x, y] coordinate pairs
   * for all set bits. Inverse operation of bitsFromCoords.
   *
   * @param {bigint} bb - Bitboard value
   * @returns {Array<Coordinate>} List of [x, y] coordinates
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
   *
   * Convenience wrapper with explicit naming for bitboard-to-coordinate conversion.
   *
   * @param {bigint} bb - Bitboard value
   * @returns {Array<Coordinate>} List of [x, y] coordinates
   */
  coordinatesFromBitboard (bb) {
    return this.bitsToCoords(bb)
  }

  // ============================================================================
  // Connection Handling
  // ============================================================================

  /**
   * Gets neighbors or area from a specific connection type.
   * @param {string|number} connectionKey - Connection type key
   * @param {string} methodName - Method name ('neighbors' or 'area')
   * @param {...number} coords - Coordinate arguments
   * @returns {Array} Neighbor coordinates or area coordinates
   * @throws {Error} If connection type or method not found
   * @private
   */
  _getConnectionResult (connectionKey, methodName, ...coords) {
    if (!this.connection || !this.connection[connectionKey]) {
      throw new Error(`Missing connection object for type ${connectionKey}`)
    }
    const connection = this.connection[connectionKey]
    if (typeof connection[methodName] !== 'function') {
      throw new TypeError(
        `Missing connection method ${connectionKey}.${methodName}`
      )
    }
    return connection[methodName](...coords)
  }

  /**
   * Creates or returns cached actions instance for bitboard operations.
   * Subclasses should override to provide specific Actions implementation.
   * @param {Object} bb - Bitboard object
   * @returns {Object} Actions instance
   * @abstract
   */
  actions (_bb) {
    throw new Error('actions method must be implemented in derived class')
  }

  /**
   * Helper for caching actions instances based on bitboard state.
   * @param {Object} bb - Bitboard object
   * @param {Function} factory - Factory function to create new actions instance
   * @returns {Object} Cached or new actions instance
   * @private
   */
  _getCachedActions (_bb, factory) {
    if (this._actions && this._actions?.original?.bits === _bb.bits) {
      return this._actions
    }
    this._actions = factory()
    return this._actions
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
