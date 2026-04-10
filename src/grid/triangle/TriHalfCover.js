import { TriCoverBase, triBresenhamStepMove } from './TriCoverBase.js'
import { deltaAndDirection } from '../indexer.js'

export class TriHalfCover extends TriCoverBase {
  constructor (triIndex) {
    super(triIndex)
    const wrapperPairs = [
      ['halfCoverRayIndices', 'ray'],
      ['halfCoverSegmentToIndices', 'segmentTo'],
      ['halfCoverFullLineIndices', 'fullLine'],
      ['halfCoverSegmentForIndices', 'segmentFor']
    ]

    for (const [wrapperName, baseName] of wrapperPairs) {
      this[wrapperName] = this._createIndicesWrapper(baseName)
    }
  }

  *line (startR, startC, endR, endC, exitCondition) {
    exitCondition = this.triIndex._ensureExitCondition(
      exitCondition,
      endR,
      endC
    )
    const { deltaX, deltaY, stepX, stepY } = deltaAndDirection(
      endR,
      startR,
      endC,
      startC
    )

    if (deltaX === 0 && deltaY === 0) {
      return
    }

    let errorTerm = deltaX - deltaY

    let currentR = startR
    let currentC = startC
    let step = 1
    let moveInR = 0
    let moveInC = 0

    while (true) {
      if (!this.triIndex.isValid(currentR, currentC)) {
        break
      }
      if (step > 60) {
        break
      }
      yield [currentR, currentC, step]
      step++
      if (exitCondition(currentR, currentC, step)) break

      const previousR = currentR
      const previousC = currentC

      ;({
        errorTerm,
        currentX: currentR,
        currentY: currentC,
        moveInX: moveInR,
        moveInY: moveInC
      } = triBresenhamStepMove(
        errorTerm,
        deltaY,
        deltaX,
        currentR,
        stepX,
        currentC,
        stepY
      ))

      step = yield* this.yieldHalfCoverCornerCells(
        moveInR,
        moveInC,
        previousR,
        stepX,
        previousC,
        stepY,
        step
      )
    }
  }

  *yieldHalfCoverCornerCells (
    moveInR,
    moveInC,
    previousR,
    stepR,
    previousC,
    stepC,
    step
  ) {
    const crossedCorner = moveInR & moveInC

    if (crossedCorner) {
      const extraCell1R = previousR + stepR
      const extraCell1C = previousC

      const extraCell2R = previousR
      const extraCell2C = previousC + stepC

      const rowFirst = this.triIndex.isValid(extraCell1R, extraCell1C)
      if (rowFirst) {
        yield [extraCell1R, extraCell1C, step]
        step++
        return step
      }

      const colFirst = this.triIndex.isValid(extraCell2R, extraCell2C)
      if (colFirst) {
        yield [extraCell2R, extraCell2C, step]
        step++
      }
    }
    return step
  }

  *ray (startR, startC, endR, endC) {
    return yield* this.line(
      startR,
      startC,
      endR,
      endC,
      this.triIndex._createBoundaryExitCondition()
    )
  }

  *segmentTo (startR, startC, endR, endC) {
    return yield* this.line(
      startR,
      startC,
      endR,
      endC,
      this.triIndex._createEndpointExitCondition(endR, endC)
    )
  }

  *fullLine (startR, startC, endR, endC) {
    const { x0, y0, x1, y1 } = this.triIndex.intercepts(
      startR,
      startC,
      endR,
      endC
    )
    return yield* this.segmentTo(x0, y0, x1, y1)
  }

  *segmentFor (startR, startC, endR, endC, distance) {
    return yield* this.line(
      startR,
      startC,
      endR,
      endC,
      this.triIndex._createDistanceLimitExitCondition(distance)
    )
  }
}
