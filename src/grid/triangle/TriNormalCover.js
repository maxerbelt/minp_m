import { TriCoverBase } from './TriCoverBase.js'

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

    let step = 1

    for (const [currentR, currentC] of this.triIndex._cubeLineCoords(
      startR,
      startC,
      endR,
      endC
    )) {
      if (step > 60) {
        console.warn(
          `Triangle line exceeded 60 steps, likely infinite loop. Current position: (${currentR}, ${currentC}), end position: (${endR}, ${endC})`
        )
        break
      }

      yield [currentR, currentC, step]
      if (exitCondition(currentR, currentC, step)) {
        break
      }
      step++
    }
  }

  *ray (startR, startC, endR, endC) {
    const [boundaryR, boundaryC] = this.triIndex._extendLineEndToBoundary(
      startR,
      startC,
      endR,
      endC
    )
    return yield* this.line(
      startR,
      startC,
      boundaryR,
      boundaryC,
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
