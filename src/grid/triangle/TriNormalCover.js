import { TriCoverBase, triBresenhamStep } from './TriCoverBase.js'
import { deltaAndDirection } from '../indexer.js'

export class TriNormalCover extends TriCoverBase {
  constructor (triIndex) {
    super(triIndex)
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

    while (true) {
      if (!this.triIndex.isValid(currentR, currentC)) {
        for (let attempts = 0; attempts < 10; attempts++) {
          ;({
            errorTerm,
            currentX: currentR,
            currentY: currentC
          } = triBresenhamStep(
            errorTerm,
            deltaY,
            deltaX,
            currentR,
            stepX,
            currentC,
            stepY
          ))
          if (this.triIndex.isValid(currentR, currentC)) {
            break
          }
        }
        if (!this.triIndex.isValid(currentR, currentC)) {
          break
        }
      }

      if (step > 60) {
        console.warn(
          `Bresenham line exceeded 60 steps, likely infinite loop.  Current position: (${currentR}, ${currentC}), end position: (${endR}, ${endC})`
        )
        break
      }

      yield [currentR, currentC, step]
      step++
      if (exitCondition(currentR, currentC, step)) {
        break
      }
      ;({
        errorTerm,
        currentX: currentR,
        currentY: currentC
      } = triBresenhamStep(
        errorTerm,
        deltaY,
        deltaX,
        currentR,
        stepX,
        currentC,
        stepY
      ))
    }
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
