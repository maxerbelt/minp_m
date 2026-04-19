import { TriCoverBase } from './TriCoverBase.js'

export class TriSuperCover extends TriCoverBase {
  constructor (triIndex) {
    super(triIndex)
    const wrapperPairs = [
      ['superCoverRayIndices', 'ray'],
      ['superCoverSegmentToIndices', 'segmentTo'],
      ['superCoverFullLineIndices', 'fullLine'],
      ['superCoverSegmentForIndices', 'segmentFor']
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

    const coordinates = Array.from(
      this.triIndex._cubeLineCoords(startR, startC, endR, endC)
    )
    let step = 1

    for (let index = 0; index < coordinates.length; index++) {
      const [currentR, currentC] = coordinates[index]

      if (!this.triIndex.isValid(currentR, currentC)) {
        break
      }
      if (step > 60) {
        break
      }

      yield [currentR, currentC, step]
      step++
      if (exitCondition(currentR, currentC, step)) break

      if (index + 1 < coordinates.length) {
        const [nextR, nextC] = coordinates[index + 1]
        const moveInR = nextR !== currentR ? 1 : 0
        const moveInC = nextC !== currentC ? 1 : 0

        step = yield* this.yieldSuperCoverCornerCells(
          moveInR,
          moveInC,
          currentR,
          nextR - currentR,
          currentC,
          nextC - currentC,
          step
        )
      }
    }
  }

  *yieldSuperCoverCornerCells (
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

      if (this.triIndex.isValid(extraCell1R, extraCell1C)) {
        yield [extraCell1R, extraCell1C, step]
        step++
      }
      if (this.triIndex.isValid(extraCell2R, extraCell2C)) {
        yield [extraCell2R, extraCell2C, step]
        step++
      }
    }
    return step
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
