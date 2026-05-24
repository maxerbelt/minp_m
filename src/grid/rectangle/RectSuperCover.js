import { RectCoverBase } from './RectCoverBase.js'

/**
 * Coordinate validator function signature.
 * @typedef {Function} CoordinateValidator
 * @param {number} x - X coordinate to validate (may be out of bounds)
 * @param {number} y - Y coordinate to validate (may be out of bounds)
 * @returns {[number, number]|null} Validated [x, y] coordinate pair, or null if validation fails
 */

/**
 * Coordinate indexer function signature.
 * @typedef {Function} CoordinateIndexer
 * @param {number} x - X coordinate in the grid (0-based column)
 * @param {number} y - Y coordinate in the grid (0-based row)
 * @param {number} step - Current step number in the line traversal sequence (1-based)
 * @returns {number} 1D grid index corresponding to (x, y) coordinates
 */

/**
 * Direction vector with X and Y step values.
 * @typedef {Object} DirectionVector
 * @property {number} stepX - X direction multiplier: -1, 0, or +1
 * @property {number} stepY - Y direction multiplier: -1, 0, or +1
 */

/**
 * Rectangle grid index configuration and utilities.
 * Encapsulates coordinate validation, indexing, and boundary detection.
 * @typedef {Object} RectIndex
 * @property {CoordinateIndexer} index - Converts (x, y) coordinates to 1D grid index
 * @property {CoordinateValidator} validate - Validates and optionally transforms coordinates
 * @property {Function} intercepts - Calculates line-boundary intercepts for ray exit detection
 * @property {Function} _ensureIndexer - Ensures valid indexer function or throws (private)
 * @property {Function} _ensureExitCondition - Ensures valid exit condition or throws (private)
 * @property {Function} _ensureValidate - Ensures valid validation function or throws (private)
 * @property {Function} _createBoundaryExitCondition - Creates boundary exit condition factory (private)
 * @property {Function} _createDistanceLimitExitCondition - Creates distance limit exit condition factory (private)
 */

/**
 * Super-cover line algorithm for rectangle grids.
 * Detects corner crossings and emits both extra cells for complete diagonal coverage.
 * Used when complete grid coverage is required for diagonal lines.
 *
 * **Algorithm Characteristics:**
 * - Uses Bresenham stepping with movement direction tracking (stepMove variant)
 * - Detects diagonal moves (when both X and Y advance simultaneously)
 * - Emits both extra cells when corner crossing is detected
 * - Provides complete coverage of all cells touched by the line
 * - More comprehensive than normal cover but less efficient
 *
 * **Comparison with other cover algorithms:**
 * - vs Normal: Normal skips corner cells; SuperCover includes both
 * - vs HalfCover: HalfCover uses specific corner algorithm; SuperCover emits both cells
 * - vs SuperCover: This class - maximum coverage for diagonal lines
 *
 * **Wrapped convenience methods:** After construction, these methods are available:
 * - `superCoverRayIndices(startX, startY, endX, endY)` - Wrap of `ray()` with injected indexer
 * - `superCoverSegmentToIndices(startX, startY, endX, endY)` - Wrap of `segmentTo()` with injected indexer
 * - `superCoverFullLineIndices(startX, startY, endX, endY)` - Wrap of `fullLine()` with injected indexer
 * - `superCoverSegmentForIndices(startX, startY, endX, endY, distance)` - Wrap of `segmentFor()` with injected indexer
 *
 * **Alias methods:** Convenience aliases bound to base methods:
 * - `superCoverLine()` - Alias of `line()`
 * - `superCoverRay()` - Alias of `ray()`
 * - `superCoverSegmentTo()` - Alias of `segmentTo()`
 * - `superCoverFullLine()` - Alias of `fullLine()`
 * - `superCoverSegmentFor()` - Alias of `segmentFor()`
 *
 * @extends RectCoverBase
 * @class RectSuperCover
 */
export class RectSuperCover extends RectCoverBase {
  /**
   * Creates a super-cover algorithm instance for rectangular grid line traversal.
   * Initializes wrapper methods and aliases for convenient access to base line-generation functions.
   * Sets up the corner crossing handler for diagonal move detection.
   *
   * **Initialization Process:**
   * 1. Calls parent constructor with rectIndex configuration
   * 2. Creates wrapper method pairs that bind the indexer function
   * 3. Creates alias methods for base methods (bound with .bind())
   * 4. Sets up test wrapper for corner cell yielding
   *
   * **Wrapped Methods Created:**
   * - `superCoverRayIndices()` - Wraps `ray()` base method
   * - `superCoverSegmentToIndices()` - Wraps `segmentTo()` base method
   * - `superCoverFullLineIndices()` - Wraps `fullLine()` base method
   * - `superCoverSegmentForIndices()` - Wraps `segmentFor()` base method
   *
   * **Alias Methods Created:**
   * - `superCoverLine` - Bound reference to `line()` method
   * - `superCoverRay` - Bound reference to `ray()` method
   * - `superCoverSegmentTo` - Bound reference to `segmentTo()` method
   * - `superCoverFullLine` - Bound reference to `fullLine()` method
   * - `superCoverSegmentFor` - Bound reference to `segmentFor()` method
   *
   * **Example Usage:**
   * ```javascript
   * const cover = new RectSuperCover(rectIndex);
   * const lineIndices = cover.superCoverRayIndices(0, 0, 10, 10);
   * for (const index of lineIndices) {
   *   console.log(index);
   * }
   * ```
   *
   * @constructor
   * @param {RectIndex} rectIndex - The rectangle index instance containing coordinate validation,
   *                                indexing functions, and boundary/distance limit helpers
   * @throws {TypeError} If rectIndex is null, undefined, or missing required functions
   */
  constructor (rectIndex) {
    super(rectIndex)

    // Create index wrapper methods
    const wrapperPairs = [
      ['superCoverRayIndices', 'ray'],
      ['superCoverSegmentToIndices', 'segmentTo'],
      ['superCoverFullLineIndices', 'fullLine'],
      ['superCoverSegmentForIndices', 'segmentFor']
    ]

    for (const [wrapperName, baseName] of wrapperPairs) {
      this[wrapperName] = this._createIndicesWrapper(baseName)
    }

    // Alias methods for convenience
    this.superCoverLine = this.line.bind(this)
    this.superCoverRay = this.ray.bind(this)
    this.superCoverSegmentTo = this.segmentTo.bind(this)
    this.superCoverFullLine = this.fullLine.bind(this)
    this.superCoverSegmentFor = this.segmentFor.bind(this)

    // Test wrapper for yieldSuperCoverCornerCells - converts test signature to implementation signature
    // Intentional: needs 8 parameters to match test calling convention
    // Refactored with rest parameters to meet TypeScript's 7-parameter limit
    // @ts-ignore - Rest params used for test compatibility
    this.yieldSuperCoverCornerCells = function yieldSuperCoverCornerCells (
      ...args
    ) {
      const [
        moveInX,
        moveInY,
        previousX,
        stepX,
        previousY,
        stepY,
        step,
        indexer
      ] = args
      return this._handleCornerCrossing(
        moveInX,
        moveInY,
        previousX,
        previousY,
        { stepX, stepY },
        step,
        indexer
      )
    }.bind(this)
  }

  /**
   * Returns the step function for super-cover line coverage traversal.
   * Super-cover uses the stepMove() variant that tracks movement direction.
   * This enables detection of diagonal moves for corner crossing handling.
   *
   * **Why super-cover uses stepMove() over step():**
   * - `stepMove()` - Includes moveInX/moveInY flags for corner detection (used by SuperCover/HalfCover)
   * - `step()` - Fast Bresenham without movement tracking (used by NormalCover)
   *
   * **Return Function Signature:**
   * `(errorTerm, deltaY, deltaX, currentX, stepX, currentY, stepY) => StepResult`
   *
   * @returns {Function} The stepMove function for Bresenham line generation with movement tracking.
   *                    Returns StepResult with {errorTerm, currentX, currentY, moveInX, moveInY}
   * @protected
   */
  _getStepFunction () {
    return this.stepMove
  }

  /**
   * Handles corner crossing for super-cover algorithm.
   * Yields both extra cells when a diagonal corner crossing is detected.
   * Super-cover algorithm includes all cells touched by a line for complete coverage.
   *
   * **Corner Crossing Detection:**
   * When both moveInX and moveInY are true (non-zero), a corner crossing occurred.
   * In this case, both extra cells are yielded for complete coverage.
   *
   * **Cells Yielded for Corner Crossing:**
   * 1. Right cell: (previousX + stepX, previousY)
   * 2. Down cell: (previousX, previousY + stepY)
   *
   * Both cells are validated through rectIndex.validate() before yielding.
   * Invalid cells (outside bounds or failed validation) are skipped.
   *
   * **Algorithm Behavior:**
   * - Detects diagonal moves when both axes advance simultaneously
   * - Validates both extra cells before yielding to ensure they're in bounds
   * - Returns early if no corner crossing detected (no cells yielded)
   * - Called during line traversal when stepMove detected a move in both directions
   *
   * @generator
   * @param {number} moveInX - Whether stepped in X direction (0 or 1 from stepMove)
   * @param {number} moveInY - Whether stepped in Y direction (0 or 1 from stepMove)
   * @param {number} previousX - Previous X position before step (0-based column, validated by caller)
   * @param {number} previousY - Previous Y position before step (0-based row, validated by caller)
   * @param {DirectionVector} direction - Direction object with stepX and stepY properties
   * @param {number} step - Current step count in the traversal sequence (1-based, for indexing)
   * @param {CoordinateIndexer} indexer - Indexer function to convert validated coords to 1D grid index
   * @yields {number} Grid indices for extra corner cells (both right and down if corner crossed)
   * @returns {Generator<number, void, unknown>} Generator yielding grid indices for corner cells
   * @protected
   * @override
   * @ts-ignore - Override changes yield type from never to number for subclass implementation
   */
  // @ts-ignore
  *_handleCornerCrossing (
    moveInX,
    moveInY,
    previousX,
    previousY,
    direction,
    step,
    indexer
  ) {
    const { stepX, stepY } = direction
    const crossedCorner = moveInX && moveInY

    if (crossedCorner) {
      // Yield both extra cells for complete coverage
      const extraCell1X = previousX + stepX
      const extraCell1Y = previousY
      const right = this.rectIndex.validate(extraCell1X, extraCell1Y)

      if (right !== null) {
        yield indexer(right[0], right[1], step)
      }

      const extraCell2X = previousX
      const extraCell2Y = previousY + stepY
      const down = this.rectIndex.validate(extraCell2X, extraCell2Y)

      if (down !== null) {
        yield indexer(down[0], down[1], step)
      }
    }
  }
}
