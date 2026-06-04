import { TriCoverBase } from './TriCoverBase.js'

/**
 * @typedef {Function} ExitCondition
 * @param {number} r - Current row coordinate
 * @param {number} c - Current column coordinate
 * @param {number} step - Current step count
 * @returns {boolean} True if traversal should stop, false to continue
 */

/**
 * @typedef {Array<number>} Coordinate
 * @description [row, column, step] tuple representing a position and step count
 */

/**
 * Half-cover line traversal algorithm for triangular grids
 *
 * Extends TriCoverBase to provide half-cover line coverage algorithm that yields
 * intermediate corner cells when crossing corners diagonally. Uses cube coordinates
 * internally for efficient line calculation.
 *
 * @class TriHalfCover
 * @extends TriCoverBase
 * @example
 * const halfCover = new TriHalfCover(triIndex)
 * for (const coord of halfCover.ray(0, 0, 5, 5)) {
 *   console.log(coord) // [r, c, step]
 * }
 */
export class TriHalfCover extends TriCoverBase {
  /**
   * Initialize half-cover traversal with a triangular index
   *
   * Creates wrapper generators for index-based traversal methods by wrapping
   * coordinate-based methods with index conversion.
   *
   * @param {Object} triIndex - Triangular grid indexer instance
   * @param {Function} triIndex.index - Converts (r, c) to linear index
   * @param {Function} triIndex.isValid - Validates coordinate within grid
   * @param {Function} triIndex._ensureExitCondition - Ensures exit condition function
   * @param {Function} triIndex._cubeLineCoords - Generates cube line coordinates
   * @param {Function} triIndex._extendLineEndToBoundary - Extends line to grid boundary
   * @param {Function} triIndex._createBoundaryExitCondition - Creates boundary exit condition
   * @param {Function} triIndex._createEndpointExitCondition - Creates endpoint exit condition
   * @param {Function} triIndex._createDistanceLimitExitCondition - Creates distance limit condition
   * @param {Function} triIndex.intercepts - Calculates line-boundary intercepts
   * @param {Function} triIndex.parity - Gets cell parity (0 or 1)
   */
  constructor (triIndex) {
    super(triIndex)
    const wrapperPairs = [
      ['halfCoverRayIndices', 'ray'],
      ['halfCoverSegmentToIndices', 'segmentTo'],
      ['halfCoverFullLineIndices', 'fullLine'],
      ['halfCoverSegmentForIndices', 'segmentFor']
    ]

    for (const [wrapperName, baseName] of wrapperPairs) {
      ;/** @type {any} */ (this)[wrapperName] =
        this._createIndicesWrapper(baseName)
    }
  }

  /**
   * Traverse from start to end coordinates using half-cover line algorithm
   *
   * Yields all cells touched by line segment, including intermediate cells at
   * diagonal corners when half-cover rules require yielding both cells.
   * Traversal uses cube coordinate line calculation for accuracy.
   *
   * Algorithm:
   * 1. Convert start/end to cube coordinates via _cubeLineCoords
   * 2. Iterate through all intermediate coordinates
   * 3. Validate coordinates and limit to 60 steps max
   * 4. At each step: yield current coordinate, check exit condition
   * 5. For diagonal moves: yield corner cells per half-cover rules
   *
   * @generator
   * @param {number} startR - Starting row coordinate
   * @param {number} startC - Starting column coordinate
   * @param {number} endR - Ending row coordinate
   * @param {number} endC - Ending column coordinate
   * @param {ExitCondition|Function} exitCondition - Exit condition function(r, c, step) → boolean
   * @yields {Coordinate} [r, c, step] coordinate tuple
   * @returns {Generator<Coordinate>} Generator yielding all covered coordinates
   * @example
   * for (const [r, c, step] of halfCover.line(0, 0, 5, 5, cond)) {
   *   console.log(`Step ${step}: (${r}, ${c})`)
   * }
   */
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
        const moveInR = nextR === currentR ? 0 : 1
        const moveInC = nextC === currentC ? 0 : 1

        step = yield* this.yieldHalfCoverCornerCells(
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

  /**
   * Yield corner cells when crossing diagonal boundaries in half-cover mode
   *
   * When a move crosses a corner (both moveInR and moveInC are 1), yields the
   * appropriate corner cells according to half-cover rules. Checks validity and
   * priority of corner cells, yielding only valid cells.
   *
   * @generator
   * @param {number} moveInR - Whether move includes row change (0 or 1)
   * @param {number} moveInC - Whether move includes column change (0 or 1)
   * @param {number} previousR - Row of previous/current position
   * @param {number} stepR - Row delta for next position (±1 or 0)
   * @param {number} previousC - Column of previous/current position
   * @param {number} stepC - Column delta for next position (±1 or 0)
   * @param {number} step - Current step count
   * @yields {Coordinate} [r, c, step] coordinate tuple for corner cells
   * @returns {Generator<Coordinate, number>} Generator yielding corner cells with final step count
   * @example
   * const newStep = yield* halfCover.yieldHalfCoverCornerCells(1, 1, 2, 1, 3, 1, 5)
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

  /**
   * Traverse from start in direction of end point to grid boundary
   *
   * Extends the line segment from start towards end point until it reaches
   * or crosses the grid boundary. Uses half-cover algorithm for coverage.
   *
   * @generator
   * @param {number} startR - Starting row coordinate
   * @param {number} startC - Starting column coordinate
   * @param {number} endR - Direction point row (extended to boundary)
   * @param {number} endC - Direction point column (extended to boundary)
   * @yields {Coordinate} [r, c, step] coordinate tuples along ray
   * @returns {Generator<Coordinate>} Generator yielding ray coordinates until boundary
   * @example
   * for (const [r, c, step] of halfCover.ray(0, 0, 5, 5)) {
   *   console.log(`Ray step ${step}: (${r}, ${c})`)
   * }
   */
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

  /**
   * Traverse from start to exact endpoint
   *
   * Traverses line segment from start to exact endpoint coordinates.
   * Stops precisely at the endpoint when reached.
   *
   * @generator
   * @param {number} startR - Starting row coordinate
   * @param {number} startC - Starting column coordinate
   * @param {number} endR - Exact ending row coordinate
   * @param {number} endC - Exact ending column coordinate
   * @yields {Coordinate} [r, c, step] coordinate tuples along segment
   * @returns {Generator<Coordinate>} Generator yielding segment coordinates to exact endpoint
   * @example
   * for (const [r, c, step] of halfCover.segmentTo(0, 0, 5, 5)) {
   *   console.log(`Segment step ${step}: (${r}, ${c})`)
   * }
   */
  *segmentTo (startR, startC, endR, endC) {
    return yield* this.line(
      startR,
      startC,
      endR,
      endC,
      this.triIndex._createEndpointExitCondition(endR, endC)
    )
  }

  /**
   * Traverse full line through grid boundaries in both directions
   *
   * Calculates where line through start and end points intersects grid boundaries,
   * then traverses the segment between those intercepts. Covers the full extent
   * of the line within grid boundaries.
   *
   * @generator
   * @param {number} startR - First point row coordinate
   * @param {number} startC - First point column coordinate
   * @param {number} endR - Second point row coordinate (direction reference)
   * @param {number} endC - Second point column coordinate (direction reference)
   * @yields {Coordinate} [r, c, step] coordinate tuples along full line
   * @returns {Generator<Coordinate>} Generator yielding full line coordinates within boundaries
   * @example
   * for (const [r, c, step] of halfCover.fullLine(2, 3, 8, 7)) {
   *   console.log(`Full line step ${step}: (${r}, ${c})`)
   * }
   */
  *fullLine (startR, startC, endR, endC) {
    const { x0, y0, x1, y1 } = this.triIndex.intercepts(
      startR,
      startC,
      endR,
      endC
    )
    return yield* this.segmentTo(x0, y0, x1, y1)
  }

  /**
   * Traverse line segment limited by maximum distance
   *
   * Traverses from start towards end point, but limits traversal to a maximum
   * distance. Useful for ranged queries, weapon range checks, or limited sight.
   *
   * @generator
   * @param {number} startR - Starting row coordinate
   * @param {number} startC - Starting column coordinate
   * @param {number} endR - Direction endpoint row coordinate
   * @param {number} endC - Direction endpoint column coordinate
   * @param {number} distance - Maximum distance to traverse (in steps)
   * @yields {Coordinate} [r, c, step] coordinate tuples up to distance limit
   * @returns {Generator<Coordinate>} Generator yielding segment coordinates within distance
   * @example
   * for (const [r, c, step] of halfCover.segmentFor(0, 0, 10, 10, 5)) {
   *   console.log(`Within range ${step}: (${r}, ${c})`)
   * }
   */
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
