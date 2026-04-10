import { HexCoverBase } from './HexCoverBase.js'

export class HexNormalCover extends HexCoverBase {
  constructor (cubeIndex) {
    super(cubeIndex)
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

  *line (startQ, startR, endQ, endR, exitCondition) {
    const boundaryExit = this.cubeIndex._boundaryExitCondition
    const useBresenham = exitCondition === boundaryExit

    exitCondition = this.cubeIndex._ensureExitCondition(
      exitCondition,
      endQ,
      endR
    )
    const startS = this.cubeIndex.constructor.qrToS(startQ, startR)
    const endS = this.cubeIndex.constructor.qrToS(endQ, endR)

    if (!useBresenham) {
      const deltaQ = endQ - startQ
      const deltaR = endR - startR
      const deltaS = endS - startS
      const steps = Math.max(
        Math.abs(deltaQ),
        Math.abs(deltaR),
        Math.abs(deltaS)
      )

      if (steps === 0) {
        return
      }

      let step = 1
      for (let i = 0; i <= steps; i++) {
        const t = i / steps
        const [currentQ, currentR] = this.cubeIndex._cubeRound(
          startQ + deltaQ * t,
          startR + deltaR * t,
          startS + deltaS * t
        )

        if (!this.cubeIndex.isValid(currentQ, currentR, -currentQ - currentR)) {
          break
        }

        yield [currentQ, currentR, step]
        if (exitCondition(currentQ, currentR, step)) {
          break
        }
        step++
      }
      return
    }

    const start = [startQ, startR, startS]
    const end = [endQ, endR, endS]
    const { ordered } = this.cubeIndex.direction(start, end)
    const primary = ordered[0]
    const secondary = ordered[1]
    const deltaX = primary.magnitude
    const deltaY = secondary.magnitude

    if (deltaX === 0 && deltaY === 0) {
      return
    }

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
          `Bresenham line exceeded 60 steps, likely infinite loop.  Current position: (${currentQ}, ${currentR}), end position: (${endQ}, ${endR})`
        )
        break
      }
      yield [currentQ, currentR, step]
      step++
      if (exitCondition(currentQ, currentR, step)) break

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
      errorTerm += axis === primary ? -deltaY : deltaX
    }
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
