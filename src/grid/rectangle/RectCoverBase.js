import { deltaAndDirection } from '../indexer.js'

/**
 * Function signature for coordinate validation.
 * Validates and optionally adjusts coordinates.
 * @typedef {Function} CoordinateValidator
 * @param {number} x - X coordinate to validate
 * @param {number} y - Y coordinate to validate
 * @returns {Array<number>|null} Validated [x, y] coordinates or null if invalid
 */

/**
 * Function signature for converting coordinates to grid index.
 * Maps 2D coordinates to a 1D grid index.
 * @typedef {Function} CoordinateIndexer
 * @param {number} x - X coordinate in the grid
 * @param {number} y - Y coordinate in the grid
 * @param {number} step - Step number in the line traversal sequence
 * @returns {number} 1D grid index corresponding to (x, y)
 */

/**
 * Function signature for determining traversal exit conditions.
 * Defines when to stop iterating along a line.
 * @typedef {Function} ExitCondition
 * @param {number} x - Current X coordinate during traversal
 * @param {number} y - Current Y coordinate during traversal
 * @param {number} step - Current step count in the traversal
 * @returns {boolean} True if the traversal should terminate immediately
 */

/**
 * Generator function for handling corner crossings during diagonal moves.
 * Yields extra cell indices when both X and Y axes move simultaneously.
 * @typedef {Function} CornerHandler
 * @yields {number} Grid indices for extra cells at corner crossings
 */

/**
 * Result object from a Bresenham line stepping operation.
 * Contains updated position and state after one step.
 * @typedef {Object} StepResult
 * @property {number} errorTerm - Updated Bresenham error accumulator for next step
 * @property {number} currentX - New X position after step
 * @property {number} currentY - New Y position after step
 * @property {number} [moveInX] - Whether step moved in X direction: 0 or 1
 * @property {number} [moveInY] - Whether step moved in Y direction: 0 or 1
 */

/**
 * Base class for rectangular grid line/ray/segment traversal algorithms.
 * Implements Bresenham line algorithm with template methods for customization.
 * Supports various traversal types: rays, segments, full lines, and distance-limited paths.
 *
 * Subclasses customize behavior through:
 * - _getStepFunction(): Choose step vs stepMove Bresenham variant
 * - _handleCornerCrossing(): Add extra cells at diagonal corners
 * - _shouldSkipIdenticalStartEnd(): Control start==end behavior
 */
export class RectCoverBase {
  /**
   * Initialize the cover algorithm with a rectangular index.
   *
   * @param {Object} rectIndex - The rectangular grid indexer instance
   * @param {Function} rectIndex.index - Converts (x, y) coordinates to 1D grid index
   * @param {Function} rectIndex.validate - Validates and optionally transforms coordinates, returns [x, y] or null
   * @param {Function} rectIndex.intercepts - Calculates line-boundary intercepts from two points
   * @param {Function} rectIndex._ensureIndexer - Ensures valid indexer function
   * @param {Function} rectIndex._ensureExitCondition - Ensures valid exit condition function
   * @param {Function} rectIndex._ensureValidate - Ensures valid validation function
   * @param {Function} rectIndex._createBoundaryExitCondition - Creates boundary exit condition function
   * @param {Function} rectIndex._createDistanceLimitExitCondition - Creates distance limit exit condition function
   */
  constructor (rectIndex) {
    this.rectIndex = rectIndex
  }

  /**
   * Creates a wrapper function that calls a base method with an indexer function.
   * Wraps the method name to automatically inject the grid indexer as the last parameter.
   * Protected helper for subclasses that may use this pattern.
   *
   * @param {string} baseName - Name of the base method to wrap
   * @returns {Function} Wrapper function that calls the base method with injected indexer
   * @protected
   */
  _createIndicesWrapper (baseName) {
    return (...args) =>
      this[baseName](...args, (x, y, _step) => this.rectIndex.index(x, y))
  }

  /**
   * Core Bresenham line stepping algorithm without tracking movement direction.
   * Used by standard line traversal mode. Updates position and error term.
   * Reusable implementation pattern: CubeIndex and TriIndex have similar variants.
   *
   * @param {number} errorTerm - Cumulative Bresenham error from previous steps
   * @param {number} deltaY - Absolute difference in Y coordinate (|endY - startY|)
   * @param {number} deltaX - Absolute difference in X coordinate (|endX - startX|)
   * @param {number} currentX - Current X position in traversal
   * @param {number} stepX - X direction multiplier: -1, 0, or +1
   * @param {number} currentY - Current Y position in traversal
   * @param {number} stepY - Y direction multiplier: -1, 0, or +1
   * @returns {StepResult} Result object with updated errorTerm, currentX, currentY
   */
  step (errorTerm, deltaY, deltaX, currentX, stepX, currentY, stepY) {
    const doubledError = errorTerm << 1
    const moveInX = +(doubledError > -deltaY)
    const moveInY = +(doubledError < deltaX)
    currentX += moveInX * stepX
    currentY += moveInY * stepY
    errorTerm -= moveInX * deltaY
    errorTerm += moveInY * deltaX
    return { errorTerm, currentX, currentY }
  }

  /**
   * Bresenham line step that tracks movement direction for corner detection.
   * Used by super-cover and half-cover algorithms that need to detect
   * diagonal moves (when both X and Y axes advance simultaneously).
   * Returns movement flags (moveInX, moveInY) for corner handling.
   *
   * @param {number} errorTerm - Cumulative Bresenham error from previous steps
   * @param {number} deltaY - Absolute difference in Y coordinate (|endY - startY|)
   * @param {number} deltaX - Absolute difference in X coordinate (|endX - startX|)
   * @param {number} currentX - Current X position in traversal
   * @param {number} stepX - X direction multiplier: -1, 0, or +1
   * @param {number} currentY - Current Y position in traversal
   * @param {number} stepY - Y direction multiplier: -1, 0, or +1
   * @returns {StepResult} Result with errorTerm, currentX, currentY, moveInX, moveInY
   */
  stepMove (errorTerm, deltaY, deltaX, currentX, stepX, currentY, stepY) {
    const doubledError = errorTerm << 1
    const moveInX = +(doubledError > -deltaY)
    const moveInY = +(doubledError < deltaX)
    currentX += moveInX * stepX
    currentY += moveInY * stepY
    errorTerm -= moveInX * deltaY
    errorTerm += moveInY * deltaX
    return { errorTerm, currentX, currentY, moveInX, moveInY }
  }

  /**
   * Common Bresenham line traversal algorithm with customizable behavior via template methods.
   * Subclasses override template methods to implement different line coverage modes.
   * Includes infinite loop protection (max 60 steps) and boundary validation.
   *
   * @param {number} startX - Starting X coordinate for traversal
   * @param {number} startY - Starting Y coordinate for traversal
   * @param {number} endX - Ending X coordinate or direction point
   * @param {number} endY - Ending Y coordinate or direction point
   * @param {ExitCondition|null} exitCondition - Exit condition function or null for exact endpoint
   * @param {CoordinateIndexer} indexer - Function to convert (x, y, step) to grid index
   * @param {CoordinateValidator} validate - Function to validate/adjust coordinates
   * @yields {number} Grid indices along the traversal line
   */
  *line (startX, startY, endX, endY, exitCondition, indexer, validate) {
    // Skip if start and end are identical and subclass wants to skip
    if (this._shouldSkipIdenticalStartEnd?.(startX, startY, endX, endY)) {
      return
    }

    indexer = this.rectIndex._ensureIndexer(indexer)
    exitCondition = this.rectIndex._ensureExitCondition(
      exitCondition,
      endX,
      endY
    )
    validate = this.rectIndex._ensureValidate(validate)

    // Get delta and direction
    const { deltaX, deltaY, stepX, stepY } = deltaAndDirection(
      endX,
      startX,
      endY,
      startY
    )

    // Bresenham error accumulator
    let errorTerm = deltaX - deltaY

    // Current traversal position
    let currentX = startX
    let currentY = startY
    let step = 1
    let moveInX = 0
    let moveInY = 0

    // Main traversal loop
    while (true) {
      const valid = validate(currentX, currentY)
      if (valid == null) {
        break
      }
      ;[currentX, currentY] = valid
      if (step > 60) {
        console.warn(
          `Bresenham line exceeded 60 steps, likely infinite loop.  Current position: (${currentX}, ${currentY}), end position: (${endX}, ${endY})`
        )
        break
      }
      yield indexer(currentX, currentY, step)
      step++

      // Exit condition
      if (exitCondition(currentX, currentY, step)) break

      // Store previous position for corner crossing detection
      const previousX = currentX
      const previousY = currentY

      // Get step function from subclass
      const stepFunction = this._getStepFunction()
      const stepResult = stepFunction(
        errorTerm,
        deltaY,
        deltaX,
        currentX,
        stepX,
        currentY,
        stepY
      )

      errorTerm = stepResult.errorTerm
      currentX = stepResult.currentX
      currentY = stepResult.currentY
      moveInX = stepResult.moveInX || 0
      moveInY = stepResult.moveInY || 0

      // Handle corner crossing if needed
      if (this._handleCornerCrossing) {
        const cornerGenerator = this._handleCornerCrossing(
          moveInX,
          moveInY,
          previousX,
          stepX,
          previousY,
          stepY,
          step,
          indexer
        )
        for (const extraIndex of cornerGenerator) {
          yield extraIndex
          step++
        }
      }
    }
  }

  /**
   * Template method: Returns the step function to use for this coverage algorithm.
   * Subclasses override to select step (basic) or stepMove (track direction) variant.
   * Determines whether corner crossings are detected and tracked.
   *
   * @returns {Function} The step function: either step() or stepMove()
   * @protected
   */
  _getStepFunction () {
    return this.step
  }

  /**
   * Template method: Handles corner crossing behavior when both axes move simultaneously.
   * Subclasses override to implement different line coverage algorithms.
   * Base implementation yields nothing (default: no corner handling).
   * Called only when stepMove() reports both moveInX and moveInY are non-zero.
   *
   * @param {number} _moveInX - Whether moved in X (0 or 1), parameter available for subclass use
   * @param {number} _moveInY - Whether moved in Y (0 or 1), parameter available for subclass use
   * @param {number} _previousX - Previous X position before step, parameter available for subclass use
   * @param {number} _stepX - X direction: -1, 0, or +1, parameter available for subclass use
   * @param {number} _previousY - Previous Y position before step, parameter available for subclass use
   * @param {number} _stepY - Y direction: -1, 0, or +1, parameter available for subclass use
   * @param {number} _step - Current step count in traversal, parameter available for subclass use
   * @param {CoordinateIndexer} _indexer - Indexer function, parameter available for subclass use
   * @yields {number} Extra corner cell grid indices to include in traversal
   * @protected
   */
  *_handleCornerCrossing (
    _moveInX,
    _moveInY,
    _previousX,
    _stepX,
    _previousY,
    _stepY,
    _step,
    _indexer
  ) {
    // Default: no corner handling
  }

  /**
   * Template method: Determines if identical start/end coordinates should be skipped.
   * Subclasses override for different behaviors when start equals end (same point).
   * Base implementation returns false (do not skip).
   *
   * @param {number} _startX - Start X coordinate, parameter available for subclass use
   * @param {number} _startY - Start Y coordinate, parameter available for subclass use
   * @param {number} _endX - End X coordinate, parameter available for subclass use
   * @param {number} _endY - End Y coordinate, parameter available for subclass use
   * @returns {boolean} True if this traversal should be skipped; false to proceed
   * @protected
   */
  _shouldSkipIdenticalStartEnd (_startX, _startY, _endX, _endY) {
    return false
  }

  /**
   * Ray traversal: traverses from start point towards endpoint, stopping at grid boundary.
   * Does not guarantee reaching the endpoint; stops when hitting grid edges.
   * Direction is determined by the vector from start to endpoint.
   *
   * @param {number} startX - Starting X coordinate
   * @param {number} startY - Starting Y coordinate
   * @param {number} endX - Ray direction target X coordinate
   * @param {number} endY - Ray direction target Y coordinate
   * @param {CoordinateIndexer} indexer - Function to convert (x, y, step) to grid index
   * @param {CoordinateValidator} validate - Function to validate and adjust coordinates
   * @yields {number} Grid indices along the ray from start towards endpoint
   */
  *ray (startX, startY, endX, endY, indexer, validate) {
    return yield* this.line(
      startX,
      startY,
      endX,
      endY,
      this.rectIndex._createBoundaryExitCondition(),
      indexer,
      validate
    )
  }

  /**
   * Segment traversal to exact endpoint.
   * Traverses from start to end coordinates, terminating at the exact endpoint.
   * Applies subclass-specific line coverage algorithm.
   *
   * @param {number} startX - Starting X coordinate
   * @param {number} startY - Starting Y coordinate
   * @param {number} endX - Exact ending X coordinate (traversal terminates here)
   * @param {number} endY - Exact ending Y coordinate (traversal terminates here)
   * @param {CoordinateIndexer} indexer - Function to convert (x, y, step) to grid index
   * @param {CoordinateValidator} validate - Function to validate and adjust coordinates
   * @yields {number} Grid indices along the segment from start to end
   */
  *segmentTo (startX, startY, endX, endY, indexer, validate) {
    return yield* this.line(startX, startY, endX, endY, null, indexer, validate)
  }

  /**
   * Full line traversal across entire grid through both endpoints.
   * Extends the line defined by start and end points to intersect grid boundaries on both sides.
   * Useful for infinite line queries or grid-spanning visibility checks.
   *
   * @param {number} startX - Starting X coordinate on the line
   * @param {number} startY - Starting Y coordinate on the line
   * @param {number} endX - Ending X coordinate on the line
   * @param {number} endY - Ending Y coordinate on the line
   * @param {CoordinateIndexer} indexer - Function to convert (x, y, step) to grid index
   * @param {CoordinateValidator} validate - Function to validate and adjust coordinates
   * @yields {number} Grid indices along the extended line from boundary to boundary
   */
  *fullLine (startX, startY, endX, endY, indexer, validate) {
    const { x0, y0, x1, y1 } = this.rectIndex.intercepts(
      startX,
      startY,
      endX,
      endY
    )
    return yield* this.segmentTo(x0, y0, x1, y1, indexer, validate)
  }

  /**
   * Limited-distance segment traversal from start towards end.
   * Traverses from start in the direction of the endpoint but stops after reaching max distance.
   * Useful for bounded line-of-sight or ranged queries.
   *
   * @param {number} startX - Starting X coordinate
   * @param {number} startY - Starting Y coordinate
   * @param {number} endX - Direction target X coordinate
   * @param {number} endY - Direction target Y coordinate
   * @param {number} distance - Maximum distance to traverse (step limit)
   * @param {CoordinateIndexer} indexer - Function to convert (x, y, step) to grid index
   * @param {CoordinateValidator} validate - Function to validate and adjust coordinates
   * @yields {number} Grid indices along segment up to distance limit
   */
  *segmentFor (startX, startY, endX, endY, distance, indexer, validate) {
    return yield* this.line(
      startX,
      startY,
      endX,
      endY,
      this.rectIndex._createDistanceLimitExitCondition(distance),
      indexer,
      validate
    )
  }
}
