import { ActionsTri } from './actionsTri.js'
import { Indexer, deltaAndDirection } from './indexer.js'

const neighborsEdgeUp = {
  BL: [1, 0, 1],
  BR: [1, 1, 1],
  L: [0, -1, 1]
}

const neighborsEdgeDown = {
  TL: [-1, -1, 0],
  TR: [-1, 0, 0],
  R: [0, 1, 0]
}

const neighborsVertexDown = {
  L: [0, -1, 0],
  B: [1, 0, 0],
  BR: [1, 1, 0]
}

const neighborsVertexUp = {
  R: [0, 1, 1],
  T: [-1, 0, 1],
  TL: [-1, -1, 1]
}
const neighborsExtendedDown = {
  X_TL2: [-2, -2, 1],
  X_TM2: [-2, -1, 1],
  X_TR2: [-2, 0, 1],
  X_DR: [-1, 1, 1],
  X_UL: [1, -1, 1],
  X_RR2: [0, 2, 1]
}

const neighborsExtendedUp = {
  X_BL2: [2, 0, 0],
  X_BM2: [2, 1, 0],
  X_BR2: [2, 2, 0],
  X_DL: [1, -1, 0],
  X_UR: [-1, 1, 0],
  X_LL2: [0, -2, 0]
}

function direction (endX, startX, endY, startY) {
  const dxDir = endX - startX
  const dyDir = endY - startY
  return { dxDir, dyDir }
}

function bresenhamStep (
  errorTerm,
  deltaY,
  deltaX,
  currentX,
  stepX,
  currentY,
  stepY
) {
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
function bresenhamStepMove (
  errorTerm,
  deltaY,
  deltaX,
  currentX,
  stepX,
  currentY,
  stepY
) {
  const doubledError = errorTerm << 1
  const moveInX = +(doubledError > -deltaY)
  const moveInY = +(doubledError < deltaX)
  currentX += moveInX * stepX
  currentY += moveInY * stepY
  errorTerm -= moveInX * deltaY
  errorTerm += moveInY * deltaX
  return { errorTerm, currentX, currentY, moveInX, moveInY }
}
export class TriIndex extends Indexer {
  constructor (side) {
    // pattern: row r has 2*r+1 triangles (odd counts), total size = side*side
    const size = side * side
    super(size)
    this.side = side
    // bounding dimensions for normalization: width is full base (2*side-1)
    this.width = 2 * side - 1
    this.height = side

    // ============================================================================
    // CONCEPT: Automatically generate Indices wrappers from base methods
    // ============================================================================
    // Each wrapper appends this.index as the indexer parameter to the base method.
    // This eliminates nearly-identical manual wrapper method implementations.
    const wrapperPairs = [
      ['rayIndices', 'ray'],
      ['superCoverRayIndices', 'superCoverRay'],
      ['halfCoverRayIndices', 'halfCoverRay'],
      ['segmentToIndices', 'segmentTo'],
      ['superCoverSegmentToIndices', 'superCoverSegmentTo'],
      ['halfCoverSegmentToIndices', 'halfCoverSegmentTo'],
      ['fullLineIndices', 'fullLine'],
      ['superCoverFullLineIndices', 'superCoverFullLine'],
      ['halfCoverFullLineIndices', 'halfCoverFullLine'],
      ['segmentForIndices', 'segmentFor'],
      ['superCoverSegmentForIndices', 'superCoverSegmentFor'],
      ['halfCoverSegmentForIndices', 'halfCoverSegmentFor']
    ]

    for (const [wrapperName, baseName] of wrapperPairs) {
      this[wrapperName] = this._createIndicesWrapper(baseName)
    }
  }
  index (r, c) {
    if (!this.isValid(r, c)) return undefined
    // base index for row r is r^2
    return r * r + c
  }

  location (i) {
    if (i < 0 || i >= this.size) return undefined
    const r = Math.floor(Math.sqrt(i))
    const c = i - r * r
    return [r, c]
  }

  isValid (r, c) {
    return r >= 0 && r < this.side && c >= 0 && c <= 2 * r
  }
  parity (r, c) {
    return (r + c) & 1
  }
  neighborsEdge (r, c) {
    const neighbors =
      this.parity(r, c) === 0 ? neighborsEdgeUp : neighborsEdgeDown
    const neighborValues = Object.values(neighbors)
    return neighborValues.map(([dr, dc, bit]) => [r + dr, c + dc, bit])
  }
  areaEdge (r, c) {
    return [[r, c, this.parity(r, c)], ...this.neighborsEdge(r, c)]
  }
  neighborsVertex (r, c) {
    const neighbors =
      this.parity(r, c) === 0 ? neighborsVertexUp : neighborsVertexDown
    const neighborValues = Object.values(neighbors)
    return neighborValues.map(([dr, dc, bit]) => [r + dr, c + dc, bit])
  }
  areaVertex (r, c) {
    return [[r, c, this.parity(r, c)], ...this.neighborsVertex(r, c)]
  }
  neighborsExtended (r, c) {
    const neighbors =
      this.parity(r, c) === 0 ? neighborsExtendedUp : neighborsExtendedDown
    const neighborValues = Object.values(neighbors)
    return neighborValues.map(([dr, dc, bit]) => [r + dr, c + dc, bit])
  }
  areaExtended (r, c) {
    return [[r, c, this.parity(r, c)], ...this.neighborsExtended(r, c)]
  }
  neighbors6 (r, c) {
    return [...this.neighborsEdge(r, c), ...this.neighborsVertex(r, c)]
  }
  area6 (r, c) {
    return [[r, c, this.parity(r, c)], ...this.neighbors(r, c)]
  }
  neighbors (r, c) {
    return [
      ...this.neighborsEdge(r, c),
      ...this.neighborsVertex(r, c),
      ...this.neighborsExtended(r, c)
    ]
  }
  area (r, c) {
    return [[r, c, this.parity(r, c)], ...this.neighbors(r, c)]
  }
  *rows () {
    for (let r = 0; r < this.side; r++) {
      yield r
    }
  }
  rowPadding (r) {
    return ' '.repeat(this.side - r - 1)
  }
  cellPadding () {
    return ' '
  }
  *row (r) {
    for (let c = 0; c <= 2 * r; c++) {
      yield [r, c]
    }
  }
  *cells () {
    for (const r of this.rows()) {
      for (const [, c] of this.row(r)) {
        yield [r, c]
      }
    }
  }
  // ============================================================================
  // CONCEPT: Bresenham Line Drawing (Reusable pattern across all indexers)
  // ============================================================================

  *line (startR, startC, endR, endC, exitCondition) {
    exitCondition = this._ensureExitCondition(exitCondition, endR, endC)
    // Delta and direction setup
    const { deltaX, deltaY, stepX, stepY } = deltaAndDirection(
      endR,
      startR,
      endC,
      startC
    )

    // Special case: start == end, return empty (no line segment to draw)
    if (deltaX === 0 && deltaY === 0) {
      return
    }

    // Bresenham error accumulator
    let errorTerm = deltaX - deltaY

    // Current traversal position
    let currentR = startR
    let currentC = startC
    let step = 1
    // Main traversal loop
    while (true) {
      if (!this.isValid(currentR, currentC)) {
        console.log(
          '   [DBG line] !isValid, trying to advance without yielding'
        )
        // Position is invalid - try to move there anyway to find the next valid position
        // by repeatedly calling bresenhamStep
        for (let attempts = 0; attempts < 10; attempts++) {
          ;({
            errorTerm,
            currentX: currentR,
            currentY: currentC
          } = bresenhamStep(
            errorTerm,
            deltaY,
            deltaX,
            currentR,
            stepX,
            currentC,
            stepY
          ))
          if (this.isValid(currentR, currentC)) {
            break
          }
        }
        if (!this.isValid(currentR, currentC)) {
          break
        }
        // Now continue to the yield logic below
      }
      if (step > 60) {
        console.warn(
          `Bresenham line exceeded 60 steps, likely infinite loop.  Current position: (${currentR}, ${currentC}), end position: (${endR}, ${endC})`
        )
        break
      }
      console.log(
        '   [DBG line] yielding [',
        currentR,
        ',',
        currentC,
        ',',
        step,
        ']'
      )
      yield [currentR, currentC, step]
      step++
      if (exitCondition(currentR, currentC, step)) {
        break
      }
      ;({
        errorTerm,
        currentX: currentR,
        currentY: currentC
      } = bresenhamStep(
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

  // ============================================================================
  // CONCEPT: Ray Casting (Start from a point, traverse until boundary)
  // ============================================================================

  /**
   * Super-cover line: emits all cells touched by the line segment.
   * Detects corner crossings and emits extra cells when both axes move simultaneously.
   */
  *superCoverLine (startR, startC, endR, endC, exitCondition) {
    exitCondition = this._ensureExitCondition(exitCondition, endR, endC)
    // Delta and direction setup
    const { deltaX, deltaY, stepX, stepY } = deltaAndDirection(
      endR,
      startR,
      endC,
      startC
    )

    // Special case: start == end, return empty
    if (deltaX === 0 && deltaY === 0) {
      return
    }

    // Bresenham error accumulator
    let errorTerm = deltaX - deltaY

    // Current traversal position
    let currentR = startR
    let currentC = startC
    let step = 1
    let moveInR = 0
    let moveInC = 0

    while (true) {
      if (!this.isValid(currentR, currentC)) {
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
      } = bresenhamStepMove(
        errorTerm,
        deltaY,
        deltaX,
        currentR,
        stepX,
        currentC,
        stepY
      ))

      // Emit extra cells when corner crossing detected
      step = yield* this.yieldSuperCoverCornerCells(
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

  /**
   * Half-cover line: emits cells with bias at corners.
   * Detects corner crossings but only emits one extra cell per corner (with bias).
   */
  *halfCoverLine (startR, startC, endR, endC, exitCondition) {
    exitCondition = this._ensureExitCondition(exitCondition, endR, endC)

    // Delta and direction setup
    const { deltaX, deltaY, stepX, stepY } = deltaAndDirection(
      endR,
      startR,
      endC,
      startC
    )

    // Special case: start == end
    if (deltaX === 0 && deltaY === 0) {
      return
    }

    // Bresenham error accumulator
    let errorTerm = deltaX - deltaY

    // Current traversal position
    let currentR = startR
    let currentC = startC
    let step = 1
    let moveInR = 0
    let moveInC = 0

    while (true) {
      if (!this.isValid(currentR, currentC)) {
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
      } = bresenhamStepMove(
        errorTerm,
        deltaY,
        deltaX,
        currentR,
        stepX,
        currentC,
        stepY
      ))

      // Emit extra cells when corner crossing detected (max 1 cell for half-cover)
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

  /**
   * Detects and yields corner-crossing cells for super-cover algorithm.
   * Pattern: Both axes moved = diagonal step = corner was crossed.
   */
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

      if (this.isValid(extraCell1R, extraCell1C)) {
        yield [extraCell1R, extraCell1C, step]
        step++
      }
      if (this.isValid(extraCell2R, extraCell2C)) {
        yield [extraCell2R, extraCell2C, step]
        step++
      }
    }
    return step
  }

  /**
   * Detects and yields corner-crossing cells for half-cover algorithm.
   * Half-cover only emits one extra cell (with row-direction bias).
   */
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

      const rowFirst = this.isValid(extraCell1R, extraCell1C)
      if (rowFirst) {
        yield [extraCell1R, extraCell1C, step]
        step++
        return step
      }

      const colFirst = this.isValid(extraCell2R, extraCell2C)
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
      this._createBoundaryExitCondition()
    )
  }

  *superCoverRay (startR, startC, endR, endC) {
    return yield* this.superCoverLine(
      startR,
      startC,
      endR,
      endC,
      this._createBoundaryExitCondition()
    )
  }

  *halfCoverRay (startR, startC, endR, endC) {
    return yield* this.halfCoverLine(
      startR,
      startC,
      endR,
      endC,
      this._createBoundaryExitCondition()
    )
  }

  // ============================================================================
  // CONCEPT: Shape-Specific Segment Methods (segmentTo and fullLine variants)
  // ============================================================================

  *segmentTo (startR, startC, endR, endC) {
    return yield* this.line(
      startR,
      startC,
      endR,
      endC,
      this._createEndpointExitCondition(endR, endC)
    )
  }

  *superCoverSegmentTo (startR, startC, endR, endC) {
    return yield* this.superCoverLine(
      startR,
      startC,
      endR,
      endC,
      this._createEndpointExitCondition(endR, endC)
    )
  }

  *halfCoverSegmentTo (startR, startC, endR, endC) {
    return yield* this.halfCoverLine(
      startR,
      startC,
      endR,
      endC,
      this._createEndpointExitCondition(endR, endC)
    )
  }

  *fullLine (startR, startC, endR, endC) {
    const { x0, y0, x1, y1 } = this.intercepts(startR, startC, endR, endC)
    return yield* this.segmentTo(x0, y0, x1, y1)
  }

  *superCoverFullLine (startR, startC, endR, endC) {
    const { x0, y0, x1, y1 } = this.intercepts(startR, startC, endR, endC)
    return yield* this.superCoverSegmentTo(x0, y0, x1, y1)
  }

  *halfCoverFullLine (startR, startC, endR, endC) {
    const { x0, y0, x1, y1 } = this.intercepts(startR, startC, endR, endC)
    return yield* this.halfCoverSegmentTo(x0, y0, x1, y1)
  }

  // ============================================================================
  // CONCEPT: Distance-Limited Segments (segmentFor variant)
  // ============================================================================

  *segmentFor (startR, startC, endR, endC, distance) {
    return yield* this.line(
      startR,
      startC,
      endR,
      endC,
      this._createDistanceLimitExitCondition(distance)
    )
  }

  *superCoverSegmentFor (startR, startC, endR, endC, distance) {
    return yield* this.superCoverLine(
      startR,
      startC,
      endR,
      endC,
      this._createDistanceLimitExitCondition(distance)
    )
  }

  *halfCoverSegmentFor (startR, startC, endR, endC, distance) {
    return yield* this.halfCoverLine(
      startR,
      startC,
      endR,
      endC,
      this._createDistanceLimitExitCondition(distance)
    )
  }

  intercept (startR, startC, endR, endC) {
    let mr = startR
    let mc = startC

    for (const [r, c] of this.ray(startR, startC, endR, endC)) {
      mr = r
      mc = c
    }
    return [mr, mc]
  }

  intercepts (startR, startC, endR, endC) {
    const [r1, c1] = this.intercept(startR, startC, endR, endC)
    const [r0, c0] = this.intercept(endR, endC, startR, startC)
    return { x0: r0, y0: c0, x1: r1, y1: c1 }
  }
  actions (bb) {
    if (this._actions && this._actions?.original?.bits === bb.bits) {
      return this._actions
    }
    // triangles use specialized actions class
    this._actions = new ActionsTri(this.side, bb)
    return this._actions
  }
}
