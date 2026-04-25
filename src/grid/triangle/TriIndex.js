import { ActionsTri } from './actionsTri.js'
import { Indexer } from '../indexer.js'
import { Connect3 } from './Connect3.js'
import { Connect3Vertex } from './Connect3Vertex.js'
import { TriConnect6 } from './TriConnect6.js'
import { TriConnect6Extended } from './TriConnect6Extended.js'
import { Connect12 } from './Connect12.js'
import { TriNormalCover } from './TriNormalCover.js'
import { TriHalfCover } from './TriHalfCover.js'
import { TriSuperCover } from './TriSuperCover.js'

export class TriIndex extends Indexer {
  constructor (side) {
    // pattern: row r has 2*r+1 triangles (odd counts), total size = side*side
    const size = side * side
    super(size)
    this.side = side
    // bounding dimensions for normalization: width is full base (2*side-1)
    this.width = 2 * side - 1
    this.height = side

    this._installIndexIteratorWrappers()

    this.connection = {
      3: new Connect3(this),
      '3vertex': new Connect3Vertex(this),
      6: new TriConnect6(this),
      '6extended': new TriConnect6Extended(this),
      12: new Connect12(this)
    }

    this.cover = {
      normal: new TriNormalCover(this),
      half: new TriHalfCover(this),
      super: new TriSuperCover(this)
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
    return c & 1
  }

  _gridToCube (row, col) {
    const q = col - row
    const s = -col
    return [q, row, s]
  }

  _cubeToGrid (q, r, s) {
    return [r, -s]
  }

  _roundCubeCoordinates (q, r, s) {
    let roundedQ = Math.round(q)
    let roundedR = Math.round(r)
    let roundedS = Math.round(s)

    const [qDiff, rDiff, sDiff] = this._calculateCubeDifferences(
      q,
      r,
      s,
      roundedQ,
      roundedR,
      roundedS
    )

    if (qDiff > rDiff && qDiff > sDiff) {
      roundedQ = -roundedR - roundedS
    } else if (rDiff > sDiff) {
      roundedR = -roundedQ - roundedS
    } else {
      roundedS = -roundedQ - roundedR
    }

    return [roundedQ, roundedR, roundedS]
  }

  /**
   * Calculates absolute differences between original and rounded cube coordinates.
   * @param {number} q - Original q coordinate
   * @param {number} r - Original r coordinate
   * @param {number} s - Original s coordinate
   * @param {number} roundedQ - Rounded q coordinate
   * @param {number} roundedR - Rounded r coordinate
   * @param {number} roundedS - Rounded s coordinate
   * @returns {Array<number>} [qDiff, rDiff, sDiff]
   * @private
   */
  _calculateCubeDifferences (q, r, s, roundedQ, roundedR, roundedS) {
    return [
      Math.abs(roundedQ - q),
      Math.abs(roundedR - r),
      Math.abs(roundedS - s)
    ]
  }

  _computeCubeLineDeltas (startRow, startCol, endRow, endCol) {
    const [startQ, startCubeR, startS] = this._gridToCube(startRow, startCol)
    const [endQ, endCubeR, endS] = this._gridToCube(endRow, endCol)

    return {
      startQ,
      startCubeR,
      startS,
      endQ,
      endCubeR,
      endS,
      deltaQ: endQ - startQ,
      deltaCubeR: endCubeR - startCubeR,
      deltaS: endS - startS
    }
  }

  _cubeLineStepCount (deltaQ, deltaCubeR, deltaS) {
    return Math.max(Math.abs(deltaQ), Math.abs(deltaCubeR), Math.abs(deltaS))
  }

  _calculateCubePositionAtStep (
    step,
    totalSteps,
    startQ,
    startCubeR,
    startS,
    deltaQ,
    deltaCubeR,
    deltaS
  ) {
    const progress = step / totalSteps
    return this._roundCubeCoordinates(
      startQ + deltaQ * progress,
      startCubeR + deltaCubeR * progress,
      startS + deltaS * progress
    )
  }

  _isDuplicateGridCell (currentR, currentC, previousR, previousC) {
    return currentR === previousR && currentC === previousC
  }

  *_cubeLineCoords (startR, startC, endR, endC) {
    const lineData = this._computeCubeLineDeltas(startR, startC, endR, endC)
    const steps = this._cubeLineStepCount(
      lineData.deltaQ,
      lineData.deltaCubeR,
      lineData.deltaS
    )

    if (steps === 0) {
      if (this.isValid(startR, startC)) {
        yield [startR, startC]
      }
      return
    }

    yield* this._generateCubeLinePoints(lineData, steps)
  }

  /**
   * Generates points along the cube coordinate line
   * @param {Object} lineData - Line delta data
   * @param {number} steps - Total steps in the line
   * @private
   */
  *_generateCubeLinePoints (lineData, steps) {
    let previousR = null
    let previousC = null

    for (let step = 0; step <= steps; step++) {
      const point = this._calculateCubePointAtStep(lineData, step, steps)
      if (!point) continue

      const [currentR, currentC] = point
      if (this._isDuplicateGridCell(currentR, currentC, previousR, previousC)) {
        continue
      }

      if (!this.isValid(currentR, currentC)) {
        continue
      }

      yield [currentR, currentC]
      previousR = currentR
      previousC = currentC
    }
  }

  /**
   * Calculates cube coordinates at a specific step and converts to grid coordinates
   * @param {Object} lineData - Line delta data
   * @param {number} step - Current step
   * @param {number} steps - Total steps
   * @returns {Array|null} [r, c] coordinates or null if invalid
   * @private
   */
  _calculateCubePointAtStep (lineData, step, steps) {
    const [q, cubeR, s] = this._calculateCubePositionAtStep(
      step,
      steps,
      lineData.startQ,
      lineData.startCubeR,
      lineData.startS,
      lineData.deltaQ,
      lineData.deltaCubeR,
      lineData.deltaS
    )
    return this._cubeToGrid(q, cubeR, s)
  }

  _extendLineEndToBoundary (startR, startC, endR, endC) {
    const [startQ, startCubeR, startS] = this._gridToCube(startR, startC)
    const [endQ, endCubeR, endS] = this._gridToCube(endR, endC)
    const deltaQ = endQ - startQ
    const deltaCubeR = endCubeR - startCubeR
    const deltaS = endS - startS

    if (deltaQ === 0 && deltaCubeR === 0 && deltaS === 0) {
      return [startR, startC]
    }

    const maxScale = Math.max(this.side * 3, 10)
    return this._cubeToGrid(
      startQ + deltaQ * maxScale,
      startCubeR + deltaCubeR * maxScale,
      startS + deltaS * maxScale
    )
  }

  neighborsEdge (r, c) {
    return this._getConnectionResult('3', 'neighbors', r, c)
  }

  areaEdge (r, c) {
    return this._getConnectionResult('3', 'area', r, c)
  }

  neighborsVertex (r, c) {
    return this._getConnectionResult('3vertex', 'neighbors', r, c)
  }

  areaVertex (r, c) {
    return this._getConnectionResult('3vertex', 'area', r, c)
  }

  neighborsExtended (r, c) {
    return this._getConnectionResult('6extended', 'neighbors', r, c)
  }

  areaExtended (r, c) {
    return this._getConnectionResult('6extended', 'area', r, c)
  }

  neighbors6 (r, c) {
    return this._getConnectionResult('6', 'neighbors', r, c)
  }

  area6 (r, c) {
    return this._getConnectionResult('6', 'area', r, c)
  }

  neighbors (r, c) {
    return this._getConnectionResult('12', 'neighbors', r, c)
  }

  area (r, c) {
    return this._getConnectionResult('12', 'area', r, c)
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
  *allRClocations () {
    for (const r of this.rows()) {
      for (const [, c] of this.row(r)) {
        yield [r, c]
      }
    }
  }
  // ============================================================================
  // CONCEPT: Bresenham Line Drawing (Reusable pattern across all indexers)
  // ============================================================================

  actions (bb) {
    return this._getCachedActions(bb, () => new ActionsTri(this.side, bb))
  }
}
