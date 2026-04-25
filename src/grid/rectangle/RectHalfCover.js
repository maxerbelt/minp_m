import { RectCoverBase } from './RectCoverBase.js'

/**
 * Half-cover line algorithm for rectangle grids.
 * Detects corner crossings and emits one extra cell with rightward bias.
 * Used when you want to cover diagonal lines with minimal extra cells.
 */
export class RectHalfCover extends RectCoverBase {
  /**
   * Creates a half-cover algorithm instance.
   * @param {RectIndex} rectIndex - The rectangle index instance
   */
  constructor (rectIndex) {
    super(rectIndex)

    // Create index wrapper methods
    const wrapperPairs = [
      ['halfCoverRayIndices', 'ray'],
      ['halfCoverSegmentToIndices', 'segmentTo'],
      ['halfCoverFullLineIndices', 'fullLine'],
      ['halfCoverSegmentForIndices', 'segmentFor']
    ]

    for (const [wrapperName, baseName] of wrapperPairs) {
      this[wrapperName] = this._createIndicesWrapper(baseName)
    }

    // Alias methods for convenience
    this.halfCoverLine = this.line.bind(this)
    this.halfCoverRay = this.ray.bind(this)
    this.halfCoverSegmentTo = this.segmentTo.bind(this)
    this.halfCoverFullLine = this.fullLine.bind(this)
    this.halfCoverSegmentFor = this.segmentFor.bind(this)
  }

  /**
   * Returns the step function for half-cover (with movement tracking).
   * @returns {Function} The stepMove function
   * @protected
   */
  _getStepFunction () {
    return this.stepMove
  }

  /**
   * Handles corner crossing for half-cover algorithm.
   * Emits one extra cell with rightward bias when corner is crossed.
   * @param {number} moveInX - Whether moved in X direction
   * @param {number} moveInY - Whether moved in Y direction
   * @param {number} previousX - Previous X position
   * @param {number} stepX - X direction step
   * @param {number} previousY - Previous Y position
   * @param {number} stepY - Y direction step
   * @param {number} step - Current step count
   * @param {Function} indexer - Indexer function
   * @yields {number} Extra corner cell index
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
      // Try right cell first (rightward bias)
      const extraCell1X = previousX + stepX
      const extraCell1Y = previousY
      const right = this.rectIndex.validate(extraCell1X, extraCell1Y)

      if (right !== null) {
        yield indexer(right[0], right[1], step)
        step++
        return step
      }

      // If right is invalid, try down cell
      const extraCell2X = previousX
      const extraCell2Y = previousY + stepY
      const down = this.rectIndex.validate(extraCell2X, extraCell2Y)

      if (down !== null) {
        yield indexer(down[0], down[1], step)
        step++
      }
    }
    return step
  }
}
