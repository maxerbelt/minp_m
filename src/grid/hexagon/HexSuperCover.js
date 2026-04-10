import { HexCoverBase } from './HexCoverBase.js'

export class HexSuperCover extends HexCoverBase {
  constructor (cubeIndex) {
    super(cubeIndex)
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

  *line (startQ, startR, endQ, endR, exitCondition) {
    exitCondition = this.cubeIndex._ensureExitCondition(
      exitCondition,
      endQ,
      endR
    )
    const startS = this.cubeIndex.constructor.qrToS(startQ, startR)
    const endS = this.cubeIndex.constructor.qrToS(endQ, endR)
    const { ordered } = this.cubeIndex.direction(
      [startQ, startR, startS],
      [endQ, endR, endS]
    )
    const primary = ordered[0]
    const secondary = ordered[1]
    const deltaX = primary.magnitude
    const deltaY = secondary.magnitude

    let errorTerm = deltaX - deltaY
    let currentQ = startQ
    let currentR = startR
    let step = 1

    while (true) {
      const s = -currentQ - currentR
      if (!this.cubeIndex.isValid(currentQ, currentR, s)) {
        break
      }
      if (step > 60) {
        console.warn(
          `Bresenham super-cover line exceeded 60 steps, likely infinite loop.  Current position: (${currentQ}, ${currentR}), end position: (${endQ}, ${endR})`
        )
        break
      }
      yield [currentQ, currentR, step]
      step++
      if (exitCondition(currentQ, currentR, step)) break

      const previousQ = currentQ
      const previousR = currentR
      const axis = errorTerm > 0 ? primary : secondary
      const [dq, dr] = this.cubeIndex._axisStepVector(
        axis.letter,
        axis.sign,
        currentQ,
        currentR,
        endQ,
        endR
      )
      currentQ += dq
      currentR += dr
      const moveInQ = +Boolean(dq)
      const moveInR = +Boolean(dr)
      errorTerm += axis === primary ? -deltaY : deltaX

      step = yield* this.yieldSuperCoverCornerCells(
        moveInQ,
        moveInR,
        previousQ,
        dq,
        previousR,
        dr,
        step
      )
    }
  }

  *yieldSuperCoverCornerCells (
    moveInQ,
    moveInR,
    previousQ,
    stepQ,
    previousR,
    stepR,
    step
  ) {
    const crossedCorner = moveInQ & moveInR

    if (crossedCorner) {
      const extraCell1Q = previousQ + stepQ
      const extraCell1R = previousR

      const extraCell2Q = previousQ
      const extraCell2R = previousR + stepR

      const s1 = -extraCell1Q - extraCell1R
      if (this.cubeIndex.isValid(extraCell1Q, extraCell1R, s1)) {
        yield [extraCell1Q, extraCell1R, step]
        step++
      }
      const s2 = -extraCell2Q - extraCell2R
      if (this.cubeIndex.isValid(extraCell2Q, extraCell2R, s2)) {
        yield [extraCell2Q, extraCell2R, step]
        step++
      }
    }
    return step
  }

  *ray (startQ, startR, endQ, endR) {
    return yield* this.line(
      startQ,
      startR,
      endQ,
      endR,
      this.cubeIndex._createBoundaryExitCondition()
    )
  }

  *segmentTo (startQ, startR, endQ, endR) {
    return yield* this.line(
      startQ,
      startR,
      endQ,
      endR,
      this.cubeIndex._createEndpointExitCondition(endQ, endR)
    )
  }

  *fullLine (startQ, startR, endQ, endR) {
    const { x0, y0, x1, y1 } = this.cubeIndex.intercepts(
      startQ,
      startR,
      endQ,
      endR
    )
    return yield* this.segmentTo(x0, y0, x1, y1)
  }

  *segmentFor (startQ, startR, endQ, endR, distance) {
    return yield* this.line(
      startQ,
      startR,
      endQ,
      endR,
      this.cubeIndex._createDistanceLimitExitCondition(distance)
    )
  }
}
