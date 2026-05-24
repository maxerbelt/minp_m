import { deltaAndDirection } from '../indexer.js'

/**
 * Function signature for coordinate validation.
 * Validates and optionally adjusts coordinates.
 * @typedef {Function} CoordinateValidator
 * Callback function that validates or transforms coordinates.
 * @param {number} x - X coordinate to validate (may be out of bounds)
 * @param {number} y - Y coordinate to validate (may be out of bounds)
 * @returns {[number, number]|null} Validated [x, y] coordinate pair, or null if validation fails
 */

/**
 * Function signature for converting coordinates to grid index.
 * Maps 2D coordinates to a 1D grid index in row-major or other ordering.
 * @typedef {Function} CoordinateIndexer
 * Callback function that converts coordinates to linear grid index.
 * @param {number} x - X coordinate in the grid (0-based column)
 * @param {number} y - Y coordinate in the grid (0-based row)
 * @param {number} step - Current step number in the line traversal sequence (1-based)
 * @returns {number} 1D grid index corresponding to (x, y) coordinates
 */

/**
 * Function signature for determining traversal exit conditions.
 * Defines when to stop iterating along a line or ray.
 * @typedef {Function} ExitCondition
 * Callback function that determines when to stop line traversal.
 * @param {number} x - Current X coordinate during traversal
 * @param {number} y - Current Y coordinate during traversal
 * @param {number} step - Current step count in the traversal sequence (1-based)
 * @returns {boolean} True to terminate traversal immediately; false to continue
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
 * @property {number} errorTerm - Updated Bresenham error accumulator for next step (signed integer)
 * @property {number} currentX - New X position after step (may have changed by stepX or 0)
 * @property {number} currentY - New Y position after step (may have changed by stepY or 0)
 * @property {number} [moveInX] - Optional: Whether step moved in X direction (0 or 1, from stepMove only)
 * @property {number} [moveInY] - Optional: Whether step moved in Y direction (0 or 1, from stepMove only)
 */

/**
 * Base class for rectangular grid line/ray/segment traversal algorithms.
 * Implements Bresenham line algorithm with template methods for customization.
 * Supports various traversal types: rays, segments, full lines, and distance-limited paths.
 *
 * Key Features:
 * - Bresenham line stepping with two variants: step() and stepMove()
 * - Template method pattern for subclass customization
 * - Configurable corner handling for super-cover and half-cover algorithms
 * - Multiple traversal modes: ray, segment, full line, distance-limited
 * - Boundary validation and loop protection (max 60 steps)
 *
 * Subclasses customize behavior by overriding template methods:
 * - `_getStepFunction()`: Select step() vs stepMove() Bresenham variant
 * - `_handleCornerCrossing()`: Define behavior at diagonal corner crossings
 * - `_shouldSkipIdenticalStartEnd()`: Control traversal when start == end
 *
 * @abstract
 * @class RectCoverBase
 */
export class RectCoverBase {
  /**
   * Initialize the cover algorithm with a rectangular index.
   *
   * Stores reference to the RectIndex instance that provides coordinate validation,
   * indexing, and boundary calculation services needed by the traversal algorithms.
   *
   * @param {Object} rectIndex - The rectangular grid indexer instance (RectIndex)
   * @param {Function} rectIndex.index - Converts (x, y) coordinates to 1D grid index
   * @param {CoordinateValidator} rectIndex.validate - Validates/transforms coordinates, returns [x, y] or null
   * @param {Function} rectIndex.intercepts - Calculates line-boundary intercepts from two points
   * @param {Function} rectIndex._ensureIndexer - Ensures valid indexer function (private)
   * @param {Function} rectIndex._ensureExitCondition - Ensures valid exit condition function (private)
   * @param {Function} rectIndex._ensureValidate - Ensures valid validation function (private)
   * @param {Function} rectIndex._createBoundaryExitCondition - Creates boundary exit condition (private)
   * @param {Function} rectIndex._createDistanceLimitExitCondition - Creates distance limit exit condition (private)
   * @throws {Error} If rectIndex is invalid or missing required methods
   */
  constructor (rectIndex) {
    /** @type {Object} The rectangular grid indexer instance */
    this.rectIndex = rectIndex
  }

  /**
   * Creates a wrapper function that calls a base method with an indexer function.
   * Wraps the method name to automatically inject the grid indexer as the last parameter.
   * Protected helper for subclasses that may use this pattern to simplify method signatures.
   *
   * @param {string} baseName - Name of the base method to wrap (e.g., 'line', 'ray')
   * @returns {Function} Wrapper function that calls the base method with injected CoordinateIndexer
   * The returned function accepts (...args) and injects a coordinate indexer that uses rectIndex.index()
   * @protected
   * @example
   * const rayWithDefaults = this._createIndicesWrapper('ray');
   * for (const idx of rayWithDefaults(startX, startY, endX, endY, validate)) { ... }
   */
  _createIndicesWrapper (baseName) {
    return (...args) =>
      this[baseName](...args, (x, y, _step) => this.rectIndex.index(x, y))
  }

  /**
   * Core Bresenham line stepping algorithm without tracking movement direction.
   * Used by standard line traversal mode (RectNormalCover). Updates position and error term.
   * Implementation note: CubeIndex and TriIndex have similar variants for their respective grids.
   *
   * Algorithm:
   * 1. Double the error term to use integer-only arithmetic
   * 2. Determine if step moves in X or Y based on error term relationship to deltas
   * 3. Update current position by multiplying movement flags by step direction
   * 4. Update error term for next iteration
   *
   * @param {number} errorTerm - Cumulative Bresenham error accumulator from previous steps (can be negative)
   * @param {number} deltaY - Absolute difference in Y coordinate (|endY - startY|, always non-negative)
   * @param {number} deltaX - Absolute difference in X coordinate (|endX - startX|, always non-negative)
   * @param {number} currentX - Current X position during line traversal
   * @param {number} stepX - X direction multiplier: -1 (left), 0 (no change), or +1 (right)
   * @param {number} currentY - Current Y position during line traversal
   * @param {number} stepY - Y direction multiplier: -1 (up), 0 (no change), or +1 (down)
   * @returns {StepResult} Result object with updated errorTerm, currentX, currentY properties
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
   * Identical logic to step() but returns movement flags (moveInX, moveInY).
   *
   * The movement flags enable detection of diagonal steps where both X and Y change.
   * This information is used by _handleCornerCrossing() to add extra cells for line coverage.
   *
   * @param {number} errorTerm - Cumulative Bresenham error accumulator from previous steps (can be negative)
   * @param {number} deltaY - Absolute difference in Y coordinate (|endY - startY|, always non-negative)
   * @param {number} deltaX - Absolute difference in X coordinate (|endX - startX|, always non-negative)
   * @param {number} currentX - Current X position during line traversal
   * @param {number} stepX - X direction multiplier: -1 (left), 0 (no change), or +1 (right)
   * @param {number} currentY - Current Y position during line traversal
   * @param {number} stepY - Y direction multiplier: -1 (up), 0 (no change), or +1 (down)
   * @returns {StepResult} Result with errorTerm, currentX, currentY, plus moveInX (0|1) and moveInY (0|1) flags
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
   * Core algorithm used by ray(), segmentTo(), fullLine(), and segmentFor().
   * Subclasses override template methods to implement different line coverage modes.
   * Includes infinite loop protection (max 60 steps) and boundary validation.
   *
   * Algorithm Flow:
   * 1. Calculate delta and direction vectors from start to end
   * 2. Initialize Bresenham error term and traversal position
   * 3. Loop: yield current index, check exit condition, step to next position
   * 4. Optional: handle corner crossings and yield extra indices if diagonal move detected
   * 5. Exit when exit condition met or boundary reached
   *
   * @param {number} startX - Starting X coordinate for traversal
   * @param {number} startY - Starting Y coordinate for traversal
   * @param {number} endX - Ending X coordinate or direction point (meaning depends on exitCondition)
   * @param {number} endY - Ending Y coordinate or direction point (meaning depends on exitCondition)
   * @param {ExitCondition|null} exitCondition - Exit condition function or null to stop at exact endpoint
   * @param {CoordinateIndexer} indexer - Function to convert (x, y, step) to grid index
   * @param {CoordinateValidator} validate - Function to validate/adjust coordinates before yielding
   * @yields {number} Grid indices along the traversal line, in order from start towards end
   * @protected
   * @throws {Error} If indexer or validate functions are invalid
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

    // Initialize traversal state
    let currentX = startX
    let currentY = startY
    let step = 1 // Step counter (1-based index along line)
    let moveInX = 0 // Whether last step moved in X direction (0 or 1)
    let moveInY = 0 // Whether last step moved in Y direction (0 or 1)

    // Main traversal loop: iterates from start towards end using Bresenham algorithm
    while (true) {
      // Validate current position (may clamp to boundary or wrap depending on rectIndex mode)
      const valid = validate(currentX, currentY)
      if (valid == null) {
        // Out of bounds: stop traversal
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
          previousY,
          { stepX, stepY },
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

  /**\n   * Template method: Returns the step function to use for this coverage algorithm.
   * Subclasses override to select step (basic) or stepMove (track direction) variant.
   * Determines whether corner crossings are detected and tracked.
   *
   * Selection guide:
   * - Use step() if no corner handling needed (normal coverage)
   * - Use stepMove() if corner crossing detection needed (super-cover, half-cover)
   *
   * @returns {Function} The step function: either this.step or this.stepMove; returns StepResult with optional moveInX/moveInY
   * @protected
   * @abstract
   * @example
   * // RectNormalCover overrides:
   * _getStepFunction() { return this.step; }
   * // RectSuperCover overrides:
   * _getStepFunction() { return this.stepMove; }
   */
  _getStepFunction () {
    return this.step
  }

  /**
   * Direction vector for line traversal.
   * Specifies how to move along X and Y axes during line traversal.
   * @typedef {Object} DirectionVector
   * @property {number} stepX - X direction multiplier: -1 (left), 0 (stationary), or +1 (right)
   * @property {number} stepY - Y direction multiplier: -1 (up), 0 (stationary), or +1 (down)
   */

  /**
   * Template method: Handles corner crossing behavior when both axes move simultaneously.
   * Subclasses override to implement different line coverage algorithms.
   * Base implementation yields nothing (default: no corner handling).
   * Called only when stepMove() reports both moveInX and moveInY are non-zero (diagonal move).
   *
   * Usage patterns:
   * - RectNormalCover: Overrides _getStepFunction() to return step() (no moves tracked)
   * - RectHalfCover: Uses stepMove() with corner handling for half-plane coverage
   * - RectSuperCover: Uses stepMove() with corner handling for super-coverage
   *
   * @param {number} _moveInX - Whether moved in X direction (0 or 1), available for subclass use
   * @param {number} _moveInY - Whether moved in Y direction (0 or 1), available for subclass use
   * @param {number} _previousX - Previous X position before step, available for subclass use
   * @param {number} _previousY - Previous Y position before step, available for subclass use
   * @param {DirectionVector} _direction - Direction vector with stepX and stepY components, available for subclass use
   * @param {number} _step - Current step count in traversal sequence, available for subclass use
   * @param {CoordinateIndexer} _indexer - Indexer function to convert (x, y) to grid index, available for subclass use
   * @yields {number} Grid indices for extra cells needed at corner crossing positions
   * @protected
   * @abstract
   */
  *_handleCornerCrossing (
    _moveInX,
    _moveInY,
    _previousX,
    _previousY,
    _direction,
    _step,
    _indexer
  ) {
    // Base implementation: no corner handling (used by normal coverage)
    // Subclasses override to yield extra cells for super-cover or half-cover algorithms
  }

  /**
   * Template method: Determines if identical start/end coordinates should be skipped.
   * Subclasses override for different behaviors when start equals end (same point).
   * Base implementation returns false (do not skip).
   *
   * Subclass patterns:
   * - Most implementations inherit default (false): emit at least the start point
   * - Some edge cases may override to skip zero-length traversals
   *
   * @param {number} _startX - Start X coordinate, parameter available for subclass use
   * @param {number} _startY - Start Y coordinate, parameter available for subclass use
   * @param {number} _endX - End X coordinate, parameter available for subclass use
   * @param {number} _endY - End Y coordinate, parameter available for subclass use
   * @returns {boolean} True to skip traversal entirely; false to proceed (emit start point and beyond)
   * @protected
   * @abstract
   */
  _shouldSkipIdenticalStartEnd (_startX, _startY, _endX, _endY) {
    return false
  }

  /**
   * Ray traversal: traverses from start point towards endpoint, stopping at grid boundary.
   * Does not guarantee reaching the endpoint; stops when hitting grid edges.
   * Direction is determined by the vector from start to endpoint.
   *
   * Use cases:
   * - Line-of-sight checks (stop at first obstacle)
   * - Visibility or shadow calculations
   * - Queries along a direction until boundary hit
   *
   * @param {number} startX - Starting X coordinate (0-based column)
   * @param {number} startY - Starting Y coordinate (0-based row)
   * @param {number} endX - Ray direction target X coordinate (not necessarily reached)
   * @param {number} endY - Ray direction target Y coordinate (not necessarily reached)
   * @param {CoordinateIndexer} indexer - Function to convert (x, y, step) to grid index
   * @param {CoordinateValidator} validate - Function to validate and adjust coordinates
   * @yields {number} Grid indices along the ray from start towards endpoint, until boundary hit
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
   * Applies subclass-specific line coverage algorithm (normal, super, or half-cover).
   *
   * Use cases:
   * - Targeting a specific point from a source
   * - Line drawing between two exact grid positions
   * - Path segments or ranged attack queries
   *
   * @param {number} startX - Starting X coordinate (0-based column)
   * @param {number} startY - Starting Y coordinate (0-based row)
   * @param {number} endX - Exact ending X coordinate (traversal terminates here)
   * @param {number} endY - Exact ending Y coordinate (traversal terminates here)
   * @param {CoordinateIndexer} indexer - Function to convert (x, y, step) to grid index
   * @param {CoordinateValidator} validate - Function to validate and adjust coordinates
   * @yields {number} Grid indices along the segment from start to end (inclusive)
   */
  *segmentTo (startX, startY, endX, endY, indexer, validate) {
    return yield* this.line(startX, startY, endX, endY, null, indexer, validate)
  }

  /**
   * Full line traversal across entire grid through both endpoints.
   * Extends the line defined by start and end points to intersect grid boundaries on both sides.
   * Useful for infinite line queries or grid-spanning visibility checks.
   *
   * Algorithm:
   * 1. Calculate line-boundary intersection points using rectIndex.intercepts()
   * 2. Traverse from one boundary intercept to the other using segmentTo()
   *
   * Use cases:
   * - Full grid scanning along a direction
   * - Wall detection or obstacle queries across entire grid
   * - Global visibility or beam effects
   *
   * @param {number} startX - Any X coordinate on the line (0-based column)
   * @param {number} startY - Any Y coordinate on the line (0-based row)
   * @param {number} endX - Another X coordinate on the line (defines direction)
   * @param {number} endY - Another Y coordinate on the line (defines direction)
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
   * Useful for bounded line-of-sight or ranged queries with maximum range.
   *
   * Algorithm:
   * 1. Calls line() with distance-limit exit condition from rectIndex._createDistanceLimitExitCondition()
   * 2. Stops when step count exceeds the distance parameter
   *
   * Use cases:
   * - Ranged weapon or visibility queries (max range)
   * - Bounded line-of-sight calculations
   * - Area-of-effect radius queries along a direction
   *
   * @param {number} startX - Starting X coordinate (0-based column)
   * @param {number} startY - Starting Y coordinate (0-based row)
   * @param {number} endX - Direction target X coordinate (may not be reached due to distance limit)
   * @param {number} endY - Direction target Y coordinate (may not be reached due to distance limit)
   * @param {number} distance - Maximum number of steps to traverse (step limit, 1-based)
   * @param {CoordinateIndexer} indexer - Function to convert (x, y, step) to grid index
   * @param {CoordinateValidator} validate - Function to validate and adjust coordinates
   * @yields {number} Grid indices along segment from start, up to and including the distance-th step
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
