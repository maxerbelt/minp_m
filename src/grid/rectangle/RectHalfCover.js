import { RectCoverBase } from './RectCoverBase.js'

/**
 * RectIndex interface expected by line coverage algorithms.
 * @typedef {Object} RectIndex
 * @property {number} width - Grid width in cells
 * @property {number} height - Grid height in cells
 * @property {Function} index - Converts (x, y) to 1D array index
 * @property {Function} validate - Validates coordinates and applies boundary handling (clamp/wrap)
 * @property {Function} intercepts - Calculates where a line intersects grid boundaries
 * @property {Function} _ensureIndexer - Ensures valid indexer function
 * @property {Function} _ensureExitCondition - Ensures valid exit condition function
 * @property {Function} _ensureValidate - Ensures valid validator function
 * @property {Function} _createBoundaryExitCondition - Creates boundary exit condition function
 * @property {Function} _createDistanceLimitExitCondition - Creates distance limit exit condition function
 */

/**
 * Half-cover line algorithm for rectangle grids.
 *
 *
 * Extends the Bresenham line algorithm to handle corner crossings with rightward bias.
 * When a diagonal step occurs (both X and Y axes move), emits one additional cell adjacent
 * to the corner, preferring right before down. This provides coverage between the two
 * adjacent lines in a square grid.
 *
 * Algorithm: Places exactly one extra cell at corners with consistent rightward bias,
 * creating a visually smooth half-plane coverage for diagonal lines.
 *
 * Useful for: Vision algorithms, ray casting, light propagation where you want to cover
 * all diagonal transitions but avoid the extra cells that super-cover produces.
 */
export class RectHalfCover extends RectCoverBase {
  /**
   * Creates a half-cover algorithm instance with index wrapper methods.
   *
   * Sets up convenience methods that delegate to parent class methods via indexer wrapper.
   * Creates both generic indices methods (e.g., halfCoverRayIndices) that return 1D indices
   * and coordinate methods (e.g., halfCoverRay) that return [x, y, step] tuples.
   *
   * @param {RectIndex} rectIndex - The rectangular grid indexer instance
   */
  constructor (rectIndex) {
    super(rectIndex)

    // Create index wrapper methods that return 1D indices instead of coordinates
    const wrapperPairs = [
      ['halfCoverRayIndices', 'ray'],
      ['halfCoverSegmentToIndices', 'segmentTo'],
      ['halfCoverFullLineIndices', 'fullLine'],
      ['halfCoverSegmentForIndices', 'segmentFor']
    ]

    for (const [wrapperName, baseName] of wrapperPairs) {
      this[wrapperName] = this._createIndicesWrapper(baseName)
    }

    // Alias methods for convenience (return [x, y, step] tuples)
    this.halfCoverLine = this.line.bind(this)
    this.halfCoverRay = this.ray.bind(this)
    this.halfCoverSegmentTo = this.segmentTo.bind(this)
    this.halfCoverFullLine = this.fullLine.bind(this)
    this.halfCoverSegmentFor = this.segmentFor.bind(this)
  }

  /**
   * Template method: Returns the step function for half-cover algorithm.
   *
   * Half-cover requires corner detection (diagonal moves), so uses stepMove
   * which tracks whether X and Y axes moved independently. This enables
   * identification of corner crossings for the extra cell insertion.
   *
   * @returns {Function} The stepMove function (tracks moveInX and moveInY)
   * @protected
   */
  _getStepFunction () {
    return this.stepMove
  }

  /**
   * Template method: Handles corner crossing behavior for half-cover algorithm.
   *
   * Implements the half-plane coverage strategy by emitting exactly one extra cell
   * when both X and Y axes move simultaneously (diagonal step). Uses rightward bias:
   * tries to emit the right-adjacent cell first, falling back to down-adjacent if
   * right is out of bounds.
   *
   * Rightward bias ensures consistent, deterministic results for equivalent lines
   * from different directions.
   *
   * @param {number} _moveInX - Whether moved in X direction (0 or 1)
   * @param {number} _moveInY - Whether moved in Y direction (0 or 1)
   * @param {number} _previousX - Previous X position before step
   * @param {number} _stepX - X direction: -1, 0, or +1
   * @param {number} _previousY - Previous Y position before step
   * @param {number} _stepY - Y direction: -1, 0, or +1
   * @param {number} _step - Current step count in traversal
   * @param {Function} _indexer - Indexer function to convert coordinates to grid index
   * @yields {number} Grid index of the extra corner cell (if any valid cell exists)
   * @protected
   */
  *_handleCornerCrossing (
    _moveInX,
    _moveInY,
    _previousX,
    _stepX,
    _previousY,
    _stepY,
    _step,
    _indexer
  ) {
    // Use non-underscore versions for clarity within the method
    const moveInX = _moveInX
    const moveInY = _moveInY
    const previousX = _previousX
    const stepX = _stepX
    const previousY = _previousY
    const stepY = _stepY
    const step = _step
    const indexer = _indexer

    const crossedCorner = moveInX && moveInY

    if (crossedCorner) {
      // Try right cell first (rightward bias)
      const extraCell1X = previousX + stepX
      const extraCell1Y = previousY
      const right = this.rectIndex.validate(extraCell1X, extraCell1Y)

      if (right !== null) {
        yield indexer(right[0], right[1], step)
        return
      }

      // If right is invalid, try down cell
      const extraCell2X = previousX
      const extraCell2Y = previousY + stepY
      const down = this.rectIndex.validate(extraCell2X, extraCell2Y)

      if (down !== null) {
        yield indexer(down[0], down[1], step)
      }
    }
  }
}
