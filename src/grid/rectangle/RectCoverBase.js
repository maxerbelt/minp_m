import { deltaAndDirection } from '../indexer.js'

export class RectCoverBase {
  constructor (rectIndex) {
    this.rectIndex = rectIndex
  }

  _createIndicesWrapper (baseName) {
    return (...args) =>
      this[baseName](...args, (x, y, step) => this.rectIndex.index(x, y))
  }

  /**
   * Core Bresenham step without tracking movement direction.
   * Used by normal line algorithm.
   * Reusable: CubeIndex and TriIndex have similar implementations.
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
   * Bresenham step that tracks movement direction for corner detection.
   * Used by super-cover and half-cover algorithms that need to detect
   * when both axes move simultaneously (corner crossing).
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
   * Common Bresenham line traversal algorithm.
   * Subclasses customize behavior through template methods.
   * @param {number} startX - Starting X coordinate
   * @param {number} startY - Starting Y coordinate
   * @param {number} endX - Ending X coordinate
   * @param {number} endY - Ending Y coordinate
   * @param {Function} exitCondition - Function to determine when to stop
   * @param {Function} indexer - Function to convert coordinates to index
   * @param {Function} validate - Function to validate coordinates
   * @yields {number} Grid indices along the line
   */
  *line (startX, startY, endX, endY, exitCondition, indexer, validate) {
    // Skip if start and end are identical and subclass wants to skip
    if (
      this._shouldSkipIdenticalStartEnd &&
      this._shouldSkipIdenticalStartEnd(startX, startY, endX, endY)
    ) {
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
   * Template method: Returns the step function to use.
   * Subclasses override to choose step or stepMove.
   * @returns {Function} The step function
   * @protected
   */
  _getStepFunction () {
    return this.step
  }

  /**
   * Template method: Handles corner crossing behavior.
   * Subclasses override to implement different cover algorithms.
   * @param {number} moveInX - Whether moved in X direction
   * @param {number} moveInY - Whether moved in Y direction
   * @param {number} previousX - Previous X position
   * @param {number} stepX - X direction step
   * @param {number} previousY - Previous Y position
   * @param {number} stepY - Y direction step
   * @param {number} step - Current step count
   * @param {Function} indexer - Indexer function
   * @yields {number} Extra corner cell indices
   * @protected
   */
  *_handleCornerCrossing (
    moveInX,
    moveInY,
    previousX,
    stepX,
    previousY,
    stepY,
    step,
    indexer
  ) {
    // Default: no corner handling
  }

  /**
   * Template method: Determines if identical start/end should be skipped.
   * Subclasses override for different behaviors.
   * @param {number} startX - Start X
   * @param {number} startY - Start Y
   * @param {number} endX - End X
   * @param {number} endY - End Y
   * @returns {boolean} True if should skip
   * @protected
   */
  _shouldSkipIdenticalStartEnd (startX, startY, endX, endY) {
    return false
  }

  /**
   * Ray traversal: stops at grid boundary.
   * @param {number} startX - Starting X coordinate
   * @param {number} startY - Starting Y coordinate
   * @param {number} endX - Ending X coordinate
   * @param {number} endY - Ending Y coordinate
   * @param {Function} indexer - Function to convert coordinates to index
   * @param {Function} validate - Function to validate coordinates
   * @yields {number} Grid indices along the ray
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
   * @param {number} startX - Starting X coordinate
   * @param {number} startY - Starting Y coordinate
   * @param {number} endX - Ending X coordinate
   * @param {number} endY - Ending Y coordinate
   * @param {Function} indexer - Function to convert coordinates to index
   * @param {Function} validate - Function to validate coordinates
   * @yields {number} Grid indices along the segment
   */
  *segmentTo (startX, startY, endX, endY, indexer, validate) {
    return yield* this.line(startX, startY, endX, endY, null, indexer, validate)
  }

  /**
   * Full line traversal across entire grid.
   * @param {number} startX - Starting X coordinate
   * @param {number} startY - Starting Y coordinate
   * @param {number} endX - Ending X coordinate
   * @param {number} endY - Ending Y coordinate
   * @param {Function} indexer - Function to convert coordinates to index
   * @param {Function} validate - Function to validate coordinates
   * @yields {number} Grid indices along the full line
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
   * Segment traversal for specific distance.
   * @param {number} startX - Starting X coordinate
   * @param {number} startY - Starting Y coordinate
   * @param {number} endX - Ending X coordinate
   * @param {number} endY - Ending Y coordinate
   * @param {number} distance - Maximum distance to traverse
   * @param {Function} indexer - Function to convert coordinates to index
   * @param {Function} validate - Function to validate coordinates
   * @yields {number} Grid indices along the segment
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
