import { RectCoverBase } from './RectCoverBase.js'

/**
 * @typedef {Object} RectIndex
 * @property {Function} index - Converts (x, y) coordinates to 1D grid index
 * @property {Function} validate - Validates and optionally transforms coordinates
 * @property {Function} intercepts - Calculates line-boundary intercepts
 * @property {Function} _ensureIndexer - Ensures valid indexer function
 * @property {Function} _ensureExitCondition - Ensures valid exit condition
 * @property {Function} _ensureValidate - Ensures valid validation function
 * @property {Function} _createBoundaryExitCondition - Creates boundary exit condition
 * @property {Function} _createDistanceLimitExitCondition - Creates distance limit exit condition
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
 * @extends RectCoverBase
 * @class RectNormalCover
 */
export class RectNormalCover extends RectCoverBase {
  /**
   * Creates a normal cover algorithm instance for rectangular grid line traversal.
   * Initializes wrapper methods for convenient access to the base line-generation functions.
   * These wrappers automatically inject the grid indexer as the final parameter.
   *
   * **Wrapped Methods:**
   * - `rayIndices(startX, startY, endX, endY)` - Wrap of `ray()`
   * - `segmentToIndices(startX, startY, endX, endY)` - Wrap of `segmentTo()`
   * - `fullLineIndices(startX, startY, endX, endY)` - Wrap of `fullLine()`
   * - `segmentForIndices(startX, startY, endX, endY, distance)` - Wrap of `segmentFor()`
   *
   * @param {RectIndex} rectIndex - The rectangle index instance containing coordinate validation,
   *                                 indexing functions, and boundary/distance limit helpers
   * @throws {TypeError} If rectIndex is null or undefined
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
   * - `step()` - Fast Bresenham without movement direction tracking
   * - `stepMove()` - Returns moveInX/moveInY flags for corner detection (used by SuperCover/HalfCover)
   *
   * @returns {Function} The step function: `step(errorTerm, deltaY, deltaX, currentX, stepX, currentY, stepY)`
   *                    Returns object with {errorTerm, currentX, currentY}
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
   * **Comparison:**
   * - Normal cover: Skip identical points (returns empty)
   * - SuperCover: May include the single cell even for identical points
   * - HalfCover: May include the single cell even for identical points
   *
   * @param {number} startX - Starting X coordinate (0-based column)
   * @param {number} startY - Starting Y coordinate (0-based row)
   * @param {number} endX - Ending X coordinate (0-based column)
   * @param {number} endY - Ending Y coordinate (0-based row)
   * @returns {boolean} True to skip traversal when start point equals end point,
   *                   returning an empty generator
   * @protected
   */
  _shouldSkipIdenticalStartEnd (startX, startY, endX, endY) {
    return startX === endX && startY === endY
  }
}
