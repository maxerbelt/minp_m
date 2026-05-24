import { RectCoverBase } from './RectCoverBase.js'

/**
 * Rectangle grid index configuration and utilities.
 * Encapsulates coordinate validation, indexing, and boundary detection.
 * @typedef {Object} RectIndex
 * @property {CoordinateIndexer} index - Converts (x, y) coordinates to 1D grid index
 * @property {CoordinateValidator} validate - Validates and optionally transforms coordinates
 * @property {Function} intercepts - Calculates line-boundary intercepts for ray exit detection
 * @property {Function} _ensureIndexer - Ensures valid indexer function or throws
 * @property {Function} _ensureExitCondition - Ensures valid exit condition or throws
 * @property {Function} _ensureValidate - Ensures valid validation function or throws
 * @property {Function} _createBoundaryExitCondition - Creates boundary exit condition factory
 * @property {Function} _createDistanceLimitExitCondition - Creates distance limit exit condition factory
 */

/**
 * Function signature for coordinate validation.
 * Validates and optionally adjusts coordinates.
 * @typedef {Function} CoordinateValidator
 * @param {number} x - X coordinate to validate (may be out of bounds)
 * @param {number} y - Y coordinate to validate (may be out of bounds)
 * @returns {[number, number]|null} Validated [x, y] coordinate pair, or null if validation fails
 */

/**
 * Function signature for converting coordinates to grid index.
 * Maps 2D coordinates to a 1D grid index in row-major or other ordering.
 * @typedef {Function} CoordinateIndexer
 * @param {number} x - X coordinate in the grid (0-based column)
 * @param {number} y - Y coordinate in the grid (0-based row)
 * @param {number} step - Current step number in the line traversal sequence (1-based)
 * @returns {number} 1D grid index corresponding to (x, y) coordinates
 */

/**
 * Normal line cover algorithm for rectangle grids.
 * Implements standard Bresenham algorithm without corner cell handling or movement tracking.
 * Returns empty generator when start and end points are identical.
 *
 * **Algorithm Characteristics:**
 * - Uses basic Bresenham stepping without movement direction tracking
 * - Does not add extra cells at diagonal corner crossings
 * - Skips traversal entirely when start and end points are the same
 * - More efficient than super-cover or half-cover algorithms
 * - Suitable for standard line-of-sight and ray-casting operations
 *
 * **Comparison with other cover algorithms:**
 * - vs SuperCover: SuperCover includes corner crossing cells; Normal does not
 * - vs HalfCover: HalfCover has specific corner handling; Normal skips all
 * - vs Normal: This class - optimal for standard grid traversal
 *
 * **Wrapped convenience methods:** After construction, these methods are available:
 * - `rayIndices(startX, startY, endX, endY)` - Wrap of `ray()` with injected indexer
 * - `segmentToIndices(startX, startY, endX, endY)` - Wrap of `segmentTo()` with injected indexer
 * - `fullLineIndices(startX, startY, endX, endY)` - Wrap of `fullLine()` with injected indexer
 * - `segmentForIndices(startX, startY, endX, endY, distance)` - Wrap of `segmentFor()` with injected indexer
 *
 * @extends RectCoverBase
 * @class RectNormalCover
 */
export class RectNormalCover extends RectCoverBase {
  /**
   * Creates a normal cover algorithm instance for rectangular grid line traversal.
   * Initializes wrapper methods for convenient access to the base line-generation functions.
   * These wrappers automatically inject the grid indexer as the final parameter.
   *
   * **Initialization Process:**
   * 1. Calls parent constructor with rectIndex configuration
   * 2. Creates wrapper method pairs that bind the indexer function
   * 3. Attaches wrapped methods as instance properties for direct access
   *
   * **Wrapped Methods Created:**
   * - `rayIndices(startX, startY, endX, endY)` - Wraps `ray()` base method
   * - `segmentToIndices(startX, startY, endX, endY)` - Wraps `segmentTo()` base method
   * - `fullLineIndices(startX, startY, endX, endY)` - Wraps `fullLine()` base method
   * - `segmentForIndices(startX, startY, endX, endY, distance)` - Wraps `segmentFor()` base method
   *
   * **Example Usage:**
   * ```javascript
   * const cover = new RectNormalCover(rectIndex);
   * const lineIndices = cover.rayIndices(0, 0, 10, 10);
   * for (const index of lineIndices) {
   *   console.log(index);
   * }
   * ```
   *
   * @constructor
   * @param {RectIndex} rectIndex - The rectangle index instance containing coordinate validation,
   *                                 indexing functions, and boundary/distance limit helpers
   * @throws {TypeError} If rectIndex is null, undefined, or missing required functions
   */
  constructor (rectIndex) {
    super(rectIndex)

    // Create index wrapper methods for convenient access to base functions
    // These wrappers inject the grid indexer function automatically
    const wrapperPairs = [
      ['rayIndices', 'ray'],
      ['segmentToIndices', 'segmentTo'],
      ['fullLineIndices', 'fullLine'],
      ['segmentForIndices', 'segmentFor']
    ]

    for (const [wrapperName, baseName] of wrapperPairs) {
      this[wrapperName] = this._createIndicesWrapper(baseName)
    }
  }

  /**
   * Returns the step function used for normal line coverage traversal.
   * Normal cover uses the basic `step()` function that does not track movement direction.
   * This avoids the overhead of detecting diagonal moves, which normal cover doesn't need.
   *
   * **Why normal cover uses step() over stepMove():**
   * - `step()` - Fast Bresenham without movement direction tracking (returns {errorTerm, currentX, currentY})
   * - `stepMove()` - Returns moveInX/moveInY flags for corner detection (used by SuperCover/HalfCover)
   *
   * **Return Function Signature:**
   * `(errorTerm, deltaY, deltaX, currentX, stepX, currentY, stepY) => StepResult`
   *
   * @returns {Function} The step function for Bresenham line generation without movement tracking.
   *                    Returns StepResult with {errorTerm, currentX, currentY}
   * @protected
   */
  _getStepFunction () {
    return this.step
  }

  /**
   * Indicates whether normal cover should skip traversal when start and end points are identical.
   * Normal cover returns an empty generator (no cells) when start == end.
   * This is the standard behavior for line-of-sight calculations.
   *
   * **Behavior Comparison:**
   * - Normal cover: Skip identical points (returns empty generator)
   * - SuperCover: May include the single cell even for identical points
   * - HalfCover: May include the single cell even for identical points
   *
   * **Why this matters:**
   * - In line-of-sight calculations, identical start/end typically means no visible path
   * - Prevents unnecessary computation for zero-length lines
   * - Maintains consistency with standard grid traversal semantics
   *
   * @param {number} startX - Starting X coordinate (0-based column, validated by caller)
   * @param {number} startY - Starting Y coordinate (0-based row, validated by caller)
   * @param {number} endX - Ending X coordinate (0-based column, validated by caller)
   * @param {number} endY - Ending Y coordinate (0-based row, validated by caller)
   * @returns {boolean} True if traversal should be skipped (returns empty generator);
   *                   false if traversal should proceed even with identical points
   * @protected
   */
  _shouldSkipIdenticalStartEnd (startX, startY, endX, endY) {
    return startX === endX && startY === endY
  }
}
