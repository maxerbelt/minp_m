import { RectCoverBase } from './RectCoverBase.js'
import { deltaAndDirection } from '../indexer.js'

export class RectSuperCover extends RectCoverBase {
  constructor (rectIndex) {
    super(rectIndex)
    const wrapperPairs = [
      ['superCoverRayIndices', 'superCoverRay'],
      ['superCoverSegmentToIndices', 'superCoverSegmentTo'],
      ['superCoverFullLineIndices', 'superCoverFullLine'],
      ['superCoverSegmentForIndices', 'superCoverSegmentFor']
    ]

    for (const [wrapperName, baseName] of wrapperPairs) {
      this[wrapperName] = this._createIndicesWrapper(baseName)
    }
  }

  /**
   * Detects and yields corner-crossing cells for super-cover algorithm.
   * Pattern: Both axes moved = diagonal step = corner was crossed.
   */
  *yieldSuperCoverCornerCells (
    moveInX,
    moveInY,
    previousX,
    stepX,
    previousY,
    stepY,
    step,
    indexer
  ) {
    const crossedCorner = moveInX & moveInY

    if (crossedCorner) {
      const extraCell1X = previousX + stepX
      const extraCell1Y = previousY

      const extraCell2X = previousX
      const extraCell2Y = previousY + stepY

      const right = this.rectIndex.validate(extraCell1X, extraCell1Y)
      if (right !== null) {
        yield indexer(right[0], right[1], step)
        step++
      }
      const down = this.rectIndex.validate(extraCell2X, extraCell2Y)
      if (down !== null) {
        yield indexer(down[0], down[1], step)
        step++
      }
    }
    return step
  }

  *superCoverLine (
    startX,
    startY,
    endX,
    endY,
    exitCondition,
    indexer,
    validate
  ) {
    indexer = this.rectIndex._ensureIndexer(indexer)
    exitCondition = this.rectIndex._ensureExitCondition(
      exitCondition,
      endX,
      endY
    )
    validate = this.rectIndex._ensureValidate(validate)
    // --------------------------------------------------
    // Delta and direction setup
    // --------------------------------------------------
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
    // --------------------------------------------------
    // Main traversal loop
    // --------------------------------------------------
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

      // Store previous position (needed for supercover extras)
      const previousX = currentX
      const previousY = currentY

      ;({ errorTerm, currentX, currentY, moveInX, moveInY } = this.stepMove(
        errorTerm,
        deltaY,
        deltaX,
        currentX,
        stepX,
        currentY,
        stepY
      ))

      // Emit extra cells when corner crossing detected
      step = yield* this.yieldSuperCoverCornerCells(
        moveInX,
        moveInY,
        previousX,
        stepX,
        previousY,
        stepY,
        step,
        indexer
      )
    }
  }

  *superCoverRay (startX, startY, endX, endY, indexer, validate) {
    // stop once the current position is outside validity to avoid endless
    // traversal.  Use the same exit condition pattern as in other generators.
    return yield* this.superCoverLine(
      startX,
      startY,
      endX,
      endY,
      this.rectIndex._createBoundaryExitCondition(),
      indexer,
      validate
    )
  }

  *superCoverSegmentTo (startX, startY, endX, endY, indexer, validate) {
    return yield* this.superCoverLine(
      startX,
      startY,
      endX,
      endY,
      null,
      indexer,
      validate
    )
  }

  *superCoverFullLine (startX, startY, endX, endY, indexer, validate) {
    const { x0, y0, x1, y1 } = this.rectIndex.intercepts(
      startX,
      startY,
      endX,
      endY
    )
    return yield* this.superCoverSegmentTo(x0, y0, x1, y1, indexer, validate)
  }

  *superCoverSegmentFor (
    startX,
    startY,
    endX,
    endY,
    distance,
    indexer,
    validate
  ) {
    return yield* this.superCoverLine(
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
