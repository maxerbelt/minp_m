import { RectCoverBase } from './RectCoverBase.js'
import { deltaAndDirection } from '../indexer.js'

export class RectNormalCover extends RectCoverBase {
  constructor (rectIndex) {
    super(rectIndex)
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

  *line (startX, startY, endX, endY, exitCondition, indexer, validate) {
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

    // Special case: start == end, return empty (no line segment to draw)
    if (deltaX === 0 && deltaY === 0) {
      return
    }

    // Bresenham error accumulator
    let errorTerm = deltaX - deltaY

    // Current traversal position
    let currentX = startX
    let currentY = startY
    let step = 1
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
      ;({ errorTerm, currentX, currentY } = this.step(
        errorTerm,
        deltaY,
        deltaX,
        currentX,
        stepX,
        currentY,
        stepY
      ))
    }
  }

  *ray (startX, startY, endX, endY, indexer, validate) {
    // stop once the current position is outside validity to avoid endless
    // traversal.  Use the same exit condition pattern as in other generators.
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

  *segmentTo (startX, startY, endX, endY, indexer, validate) {
    return yield* this.line(startX, startY, endX, endY, null, indexer, validate)
  }

  *fullLine (startX, startY, endX, endY, indexer, validate) {
    const { x0, y0, x1, y1 } = this.rectIndex.intercepts(
      startX,
      startY,
      endX,
      endY
    )
    return yield* this.segmentTo(x0, y0, x1, y1, indexer, validate)
  }

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
