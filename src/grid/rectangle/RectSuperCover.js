import { RectCoverBase } from './RectCoverBase.js'

/**
 * Super-cover line algorithm for rectangle grids.
 * Detects corner crossings and emits both extra cells.
 * Used when you want complete coverage of diagonal lines.
 */
export class RectSuperCover extends RectCoverBase {
  /**
   * Creates a super-cover algorithm instance.
   * @param {RectIndex} rectIndex - The rectangle index instance
   */
  constructor (rectIndex) {
    super(rectIndex)

    // Create index wrapper methods
    const wrapperPairs = [
      ['superCoverRayIndices', 'ray'],
      ['superCoverSegmentToIndices', 'segmentTo'],
      ['superCoverFullLineIndices', 'fullLine'],
      ['superCoverSegmentForIndices', 'segmentFor']
    ]

    for (const [wrapperName, baseName] of wrapperPairs) {
      this[wrapperName] = this._createIndicesWrapper(baseName)
    }

    // Alias methods for convenience
    this.superCoverLine = this.line.bind(this)
    this.superCoverRay = this.ray.bind(this)
    this.superCoverSegmentTo = this.segmentTo.bind(this)
    this.superCoverFullLine = this.fullLine.bind(this)
    this.superCoverSegmentFor = this.segmentFor.bind(this)

    // Expose corner crossing method for testing
    this.yieldSuperCoverCornerCells = this._handleCornerCrossing.bind(this)
  }

  /**
   * Returns the step function for super-cover (with movement tracking).
   * @returns {Function} The stepMove function
   * @protected
   */
  _getStepFunction () {
    return this.stepMove
  }

  /**
   * Handles corner crossing for super-cover algorithm.
   * Emits both extra cells when corner is crossed.
   * @param {number} moveInX - Whether moved in X direction
   * @param {number} moveInY - Whether moved in Y direction
   * @param {number} previousX - Previous X position
   * @param {number} stepX - X direction step
   * @param {number} previousY - Previous Y position
   * @param {number} stepY - Y direction step
   * @param {number} step - Current step count
   * @param {Function} indexer - Indexer function
   * @yields {number} Extra corner cell indices
   * @protected
   */
  *_handleCornerCrossing (
    moveInX,
    moveInY,
    previousX,
    stepX,
    previousY,
    stepY,
    step,
    indexer
  ) {
    const crossedCorner = moveInX && moveInY

    if (crossedCorner) {
      // Yield both extra cells for complete coverage
      const extraCell1X = previousX + stepX
      const extraCell1Y = previousY
      const right = this.rectIndex.validate(extraCell1X, extraCell1Y)

      if (right !== null) {
        yield indexer(right[0], right[1], step)
      }

      const extraCell2X = previousX
      const extraCell2Y = previousY + stepY
      const down = this.rectIndex.validate(extraCell2X, extraCell2Y)

      if (down !== null) {
        yield indexer(down[0], down[1], step)
      }
    }
  }
}
