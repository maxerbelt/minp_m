import { RectCoverBase } from './RectCoverBase.js'

/**
 * Function signature for converting coordinates to grid index.
 * Maps 2D coordinates to a 1D grid index in row-major or other ordering.
 * @typedef {Function} CoordinateIndexer
 * Callback function that converts coordinates to linear grid index.
 * @param {number} x - X coordinate in the grid (0-based column)
 * @param {number} y - Y coordinate in the grid (0-based row)
 * @param {number} step - Step number in the line traversal sequence (1-based)
 * @returns {number} 1D grid index corresponding to (x, y)
 */

/**
 * Function signature for coordinate validation.
 * Validates and optionally adjusts coordinates.
 * @typedef {Function} CoordinateValidator
 * Callback function that validates or transforms coordinates.
 * @param {number} x - X coordinate to validate (may be out of bounds)
 * @param {number} y - Y coordinate to validate (may be out of bounds)
 * @returns {[number, number]|null} Validated [x, y] coordinate pair, or null if validation fails
 */

/**
 * Direction vector for line traversal.
 * Specifies how to move along X and Y axes during line traversal.
 * @typedef {Object} DirectionVector
 * @property {number} stepX - X direction multiplier: -1 (left), 0 (stationary), or +1 (right)
 * @property {number} stepY - Y direction multiplier: -1 (up), 0 (stationary), or +1 (down)
 */

/**
 * RectIndex interface expected by line coverage algorithms.
 * Provides coordinate validation, indexing, and boundary calculation services.
 * @typedef {Object} RectIndex
 * @property {number} width - Grid width in cells (positive integer)
 * @property {number} height - Grid height in cells (positive integer)
 * @property {Function} index - Converts (x, y) to 1D array index
 * @property {CoordinateValidator} validate - Validates coordinates and applies boundary handling (clamp/wrap)
 * @property {Function} intercepts - Calculates where a line intersects grid boundaries
 * @property {Function} _ensureIndexer - Ensures valid indexer function (private)
 * @property {Function} _ensureExitCondition - Ensures valid exit condition function (private)
 * @property {Function} _ensureValidate - Ensures valid validator function (private)
 * @property {Function} _createBoundaryExitCondition - Creates boundary exit condition function (private)
 * @property {Function} _createDistanceLimitExitCondition - Creates distance limit exit condition function (private)
 */

/**
 * Half-cover line algorithm for rectangle grids.
 *
 * Extends the Bresenham line algorithm to handle corner crossings with rightward bias.
 * When a diagonal step occurs (both X and Y axes move simultaneously), emits one additional
 * cell adjacent to the corner. Uses rightward bias: prefers to emit the right-adjacent cell
 * before the down-adjacent cell. This provides coverage between the two adjacent lines in
 * a square grid, useful for vision algorithms, ray casting, and light propagation.
 *
 * Algorithm Details:
 * - Places exactly one extra cell at corners with consistent rightward bias
 * - Creates visually smooth half-plane coverage for diagonal lines
 * - Includes all cells that a straight line "touches" in the continuous plane
 * - More coverage than normal (Bresenham) but less than super-coverage
 *
 * Usage: Useful when you want to cover all diagonal transitions but avoid the extra cells
 * that super-cover produces. Commonly used for line-of-sight and visibility algorithms.
 *
 * @extends RectCoverBase
 */
export class RectHalfCover extends RectCoverBase {
  /**
   * Creates a half-cover algorithm instance with index wrapper methods.
   *
   * Initializes the RectHalfCover instance with convenience method aliases for:
   * - Index-based methods: halfCoverRayIndices, halfCoverSegmentToIndices, etc. (return 1D indices)
   * - Coordinate methods: halfCoverRay, halfCoverSegmentTo, etc. (return [x, y, step] tuples)
   *
   * These methods wrap the parent class base methods (ray, segmentTo, fullLine, segmentFor)
   * and pass the grid indexer function to convert results to either 1D indices or coordinates.
   *
   * @param {RectIndex} rectIndex - The rectangular grid indexer instance providing index(), validate(), and other services
   * @example
   * const halfCover = new RectHalfCover(gridIndex);
   * // Coordinate results: [[x, y, step], ...]
   * for (const [x, y, step] of halfCover.halfCoverRay(0, 0, 10, 10)) { ... }
   * // Index results: [index, index, ...]
   * for (const idx of halfCover.halfCoverRayIndices(0, 0, 10, 10)) { ... }
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
   * Unlike RectNormalCover which uses step(), RectHalfCover uses stepMove() to
   * detect when both X and Y change simultaneously (moveInX && moveInY), triggering
   * the _handleCornerCrossing() method to emit extra cells.
   *
   * @returns {Function} The stepMove function from parent class (tracks moveInX and moveInY)
   * @protected
   * @see RectCoverBase#stepMove
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
   * from different directions, making the algorithm deterministic regardless of
   * which adjacent line is traversed first.
   *
   * Algorithm:
   * 1. Check if both X and Y moved (crossedCorner = moveInX && moveInY)
   * 2. If corner crossed, try right-adjacent cell first (previousX + stepX, previousY)
   * 3. If right cell is valid (within bounds), yield its index and return
   * 4. Otherwise try down-adjacent cell (previousX, previousY + stepY)
   * 5. If down cell is valid, yield its index
   * 6. If both invalid, yield nothing (edge case)
   *
   * @param {number} _moveInX - Whether moved in X direction (0 or 1), 1 if x changed, 0 otherwise
   * @param {number} _moveInY - Whether moved in Y direction (0 or 1), 1 if y changed, 0 otherwise
   * @param {number} _previousX - Previous X position before step (before Bresenham step applied)
   * @param {number} _previousY - Previous Y position before step (before Bresenham step applied)
   * @param {DirectionVector} _direction - Direction vector with stepX and stepY properties
   * @param {number} _step - Current step count in traversal sequence (1-based)
   * @param {CoordinateIndexer} _indexer - Indexer function to convert coordinates to grid index
   * @yields {number} Grid index of the extra corner cell (exactly one per diagonal step, or none if out of bounds)
   * @protected
   * @override
   */
  // @ts-ignore - Compatible override: subclass yields more specific type (number) than parent (never)
  *_handleCornerCrossing (
    _moveInX,
    _moveInY,
    _previousX,
    _previousY,
    _direction,
    _step,
    _indexer
  ) {
    // Destructure for clarity
    const moveInX = _moveInX
    const moveInY = _moveInY
    const previousX = _previousX
    const previousY = _previousY
    const { stepX, stepY } = _direction
    const step = _step
    const indexer = _indexer

    // Only handle corner crossing when both axes moved simultaneously (diagonal step)
    const crossedCorner = moveInX && moveInY

    if (crossedCorner) {
      // Rightward bias: Try right-adjacent cell first (previousX + stepX, previousY)
      // This creates consistent behavior regardless of traversal direction
      const rightX = previousX + stepX
      const rightY = previousY
      const rightCell = this.rectIndex.validate(rightX, rightY)

      if (rightCell !== null) {
        // Right cell is valid - emit its index and return
        yield indexer(rightCell[0], rightCell[1], step)
        return
      }

      // Right cell is invalid (out of bounds) - try down-adjacent cell fallback
      const downX = previousX
      const downY = previousY + stepY
      const downCell = this.rectIndex.validate(downX, downY)

      if (downCell !== null) {
        // Down cell is valid - emit its index
        yield indexer(downCell[0], downCell[1], step)
      }
      // If both cells are invalid (edge case), yield nothing
    }
  }
}
