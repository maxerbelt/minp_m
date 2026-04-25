import { RectCoverBase } from './RectCoverBase.js'

/**
 * Normal line cover algorithm for rectangle grids.
 * Uses standard Bresenham algorithm without corner cell handling.
 * Returns empty generator for identical start/end points.
 */
export class RectNormalCover extends RectCoverBase {
  /**
   * Creates a normal cover algorithm instance.
   * @param {RectIndex} rectIndex - The rectangle index instance
   */
  constructor (rectIndex) {
    super(rectIndex)

    // Create index wrapper methods
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

  /**
   * Returns the step function for normal cover (no movement tracking).
   * @returns {Function} The step function
   * @protected
   */
  _getStepFunction () {
    return this.step
  }

  /**
   * Indicates that normal cover should skip identical start/end points.
   * @param {number} startX - Start X
   * @param {number} startY - Start Y
   * @param {number} endX - End X
   * @param {number} endY - End Y
   * @returns {boolean} True if should skip identical points
   * @protected
   */
  _shouldSkipIdenticalStartEnd (startX, startY, endX, endY) {
    return startX === endX && startY === endY
  }
}
