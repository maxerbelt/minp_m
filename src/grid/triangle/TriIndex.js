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
    return (r + c) & 1
  }
  neighborsEdge (r, c) {
    return this.connection['3'].neighbors(r, c)
  }

  areaEdge (r, c) {
    return this.connection['3'].area(r, c)
  }

  neighborsVertex (r, c) {
    return this.connection['3vertex'].neighbors(r, c)
  }

  areaVertex (r, c) {
    return this.connection['3vertex'].area(r, c)
  }

  neighborsExtended (r, c) {
    return this.connection['6extended'].neighbors(r, c)
  }

  areaExtended (r, c) {
    return this.connection['6extended'].area(r, c)
  }

  neighbors6 (r, c) {
    return this.connection['6'].neighbors(r, c)
  }

  area6 (r, c) {
    return this.connection['6'].area(r, c)
  }

  neighbors (r, c) {
    return this.connection['12'].neighbors(r, c)
  }

  area (r, c) {
    return this.connection['12'].area(r, c)
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

  *line (startR, startC, endR, endC, exitCondition) {
    return yield* this.cover.normal.line(
      startR,
      startC,
      endR,
      endC,
      exitCondition
    )
  }

  // ============================================================================
  // CONCEPT: Ray Casting (Start from a point, traverse until boundary)
  // ============================================================================

  /**
   * Super-cover line: emits all cells touched by the line segment.
   * Detects corner crossings and emits extra cells when both axes move simultaneously.
   */
  *superCoverLine (startR, startC, endR, endC, exitCondition) {
    return yield* this.cover.super.line(
      startR,
      startC,
      endR,
      endC,
      exitCondition
    )
  }

  /**
   * Half-cover line: emits cells with bias at corners.
   * Detects corner crossings but only emits one extra cell per corner (with bias).
   */
  *halfCoverLine (startR, startC, endR, endC, exitCondition) {
    return yield* this.cover.half.line(
      startR,
      startC,
      endR,
      endC,
      exitCondition
    )
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
    return yield* this.cover.normal.ray(startR, startC, endR, endC)
  }

  *superCoverRay (startR, startC, endR, endC) {
    return yield* this.cover.super.ray(startR, startC, endR, endC)
  }

  *halfCoverRay (startR, startC, endR, endC) {
    return yield* this.cover.half.ray(startR, startC, endR, endC)
  }

  // ============================================================================
  // CONCEPT: Shape-Specific Segment Methods (segmentTo and fullLine variants)
  // ============================================================================

  *segmentTo (startR, startC, endR, endC) {
    return yield* this.cover.normal.segmentTo(startR, startC, endR, endC)
  }

  *superCoverSegmentTo (startR, startC, endR, endC) {
    return yield* this.cover.super.segmentTo(startR, startC, endR, endC)
  }

  *halfCoverSegmentTo (startR, startC, endR, endC) {
    return yield* this.cover.half.segmentTo(startR, startC, endR, endC)
  }

  *fullLine (startR, startC, endR, endC) {
    return yield* this.cover.normal.fullLine(startR, startC, endR, endC)
  }

  *superCoverFullLine (startR, startC, endR, endC) {
    return yield* this.cover.super.fullLine(startR, startC, endR, endC)
  }

  *halfCoverFullLine (startR, startC, endR, endC) {
    return yield* this.cover.half.fullLine(startR, startC, endR, endC)
  }

  // ============================================================================
  // CONCEPT: Distance-Limited Segments (segmentFor variant)
  // ============================================================================

  *segmentFor (startR, startC, endR, endC, distance) {
    return yield* this.cover.normal.segmentFor(
      startR,
      startC,
      endR,
      endC,
      distance
    )
  }

  *superCoverSegmentFor (startR, startC, endR, endC, distance) {
    return yield* this.cover.super.segmentFor(
      startR,
      startC,
      endR,
      endC,
      distance
    )
  }

  *halfCoverSegmentFor (startR, startC, endR, endC, distance) {
    return yield* this.cover.half.segmentFor(
      startR,
      startC,
      endR,
      endC,
      distance
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
