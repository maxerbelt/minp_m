import { MaskBase } from '../MaskBase.js'
import { RectangleShape } from './RectangleShape.js'

/**
 * Base class for rectangular grid masks providing common functionality
 * for 2D grid operations, transformations, and coordinate conversions.
 */
export class RectMaskBase extends MaskBase {
  /**
   * Create a new rectangular mask base
   * @param {number} width - Width of the grid
   * @param {number} height - Height of the grid
   * @param {*} bits - Bit representation of the mask data
   * @param {Object} store - Bit storage implementation
   * @param {number} [depth=1] - Color depth (number of possible values per cell)
   */
  constructor (width, height, bits, store, depth) {
    super(RectangleShape(width, height), depth, bits, store)
  }

  /**
   * Get the total area of the grid
   * @returns {number} Total number of cells (width * height)
   */
  get area () {
    return this.width * this.height
  }

  // ============================================================================
  // Indexing & Bit Positioning
  // ============================================================================

  /**
   * Convert rectangular (x, y) coordinates to linear index
   * @param {number} x - X coordinate (column)
   * @param {number} y - Y coordinate (row)
   * @returns {number} Linear index for the cell
   */
  index (x, y) {
    return y * this.width + x
  }

  /**
   * Convert XY coordinates to linear index (alias for index)
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {number} Linear index
   */
  indexXY (x, y) {
    return this.index(x, y)
  }

  /**
   * Convert row/column coordinates to linear index
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   * @returns {number} Linear index
   */
  indexRC (r, c) {
    return this.index(c, r)
  }

  /**
   * Get bit position in store for rectangular coordinates
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {*} Bit position in the store
   */
  bitPos (x, y) {
    return this.store.bitPos(this.index(x, y))
  }

  /**
   * Get bit position for XY coordinates (alias for bitPos)
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {*} Bit position
   */
  bitPosXY (x, y) {
    return this.bitPos(x, y)
  }

  /**
   * Get bit position for row/column coordinates
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   * @returns {*} Bit position
   */
  bitPosRC (r, c) {
    return this.bitPos(c, r)
  }

  // ============================================================================
  // Cell Access - at, set, testFor, isNonZero
  // ============================================================================

  /**
   * Get cell value at (x, y) coordinates
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {*} Cell value at the specified coordinates
   */
  at (x, y) {
    const idx = this.index(x, y)
    return this.store.getIdx(this.bits, idx)
  }

  /**
   * Set cell value at (x, y) coordinates
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} [color=1] - Value to set
   * @returns {*} Updated bits
   */
  set (x, y, color = 1) {
    this.bits = this.store.setIdx(this.bits, this.index(x, y), color)
    return this.bits
  }

  /**
   * Test if cell at (x, y) matches specified color
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} [color=1] - Color value to test for
   * @returns {boolean} True if cell matches the color
   */
  test (x, y, color = 1) {
    return this.at(x, y) === color
  }

  /**
   * Test if cell at (x, y) matches specified color (legacy alias)
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} [color=1] - Color value to test for
   * @returns {boolean} True if cell matches the color
   * @deprecated Use test() instead
   */
  testFor (x, y, color = 1) {
    return this.test(x, y, color)
  }

  /**
   * Clear (zero out) a cell at (x, y)
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {*} Updated bits
   */
  clear (x, y) {
    return this.set(x, y, 0)
  }

  /**
   * Check if cell at (x, y) has non-zero value
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {boolean} True if cell has non-zero value
   */
  isNonZero (x, y) {
    const idx = this.index(x, y)
    return this.store.isNonZero(this.bits, idx)
  }

  /**
   * Get transformation capabilities for this mask
   * @returns {Object} Object with capability flags like canRotate, canFlip
   */
  getTransformCapabilities () {
    return this.indexer?.getTransformCapabilities(this) || {}
  }

  /**
   * Apply a transformation using the specified action method
   * @param {string} actionMethod - The name of the action method to call
   * @param {string} errorMessage - Error message if transformation fails
   * @returns {RectMaskBase} This instance for chaining
   * @private
   */
  _applyTransformation (actionMethod, errorMessage) {
    const transformed = this.actions?.[actionMethod](this.bits)
    if (transformed) {
      this.bits = transformed
      return this
    }
    throw new Error(errorMessage)
  }

  /**
   * Check if a transformation capability is available
   * @param {string} capability - The capability to check
   * @returns {boolean} True if the capability is available
   * @private
   */
  _hasTransformCapability (capability) {
    const capabilities = this.getTransformCapabilities()
    return capabilities[capability] || false
  }

  /**
   * Check if this mask can be rotated
   * @returns {boolean} True if rotation is supported
   */
  canRotate () {
    return this._hasTransformCapability('canRotate')
  }

  /**
   * Check if this mask can be flipped
   * @returns {boolean} True if flipping is supported
   */
  canFlip () {
    return this._hasTransformCapability('canFlip')
  }

  /**
   * Rotate the mask to a non-symmetric orientation
   * @returns {RectMaskBase} This instance for chaining
   */
  rotate () {
    return this._applyTransformation(
      'rotate',
      'No non-symmetric rotation found for this shape'
    )
  }

  /**
   * Rotate the mask 90 degrees clockwise
   * @returns {RectMaskBase} This instance for chaining
   */
  r90 () {
    return this._applyTransformation(
      'r90Map',
      'No 90-degree rotation found for this shape'
    )
  }

  /**
   * Rotate the mask 180 degrees
   * @returns {RectMaskBase} This instance for chaining
   */
  r180 () {
    return this._applyTransformation(
      'r180Map',
      'No 180-degree rotation found for this shape'
    )
  }

  /**
   * Rotate the mask 270 degrees clockwise (90 degrees counter-clockwise)
   * @returns {RectMaskBase} This instance for chaining
   */
  r270 () {
    return this._applyTransformation(
      'r270Map',
      'No 270-degree rotation found for this shape'
    )
  }

  /**
   * Flip the mask horizontally
   * @returns {RectMaskBase} This instance for chaining
   */
  fx () {
    return this._applyTransformation(
      'fxMap',
      'No horizontal flip found for this shape'
    )
  }

  /**
   * Flip the mask vertically
   * @returns {RectMaskBase} This instance for chaining
   */
  fy () {
    return this._applyTransformation(
      'fyMap',
      'No vertical flip found for this shape'
    )
  }

  /**
   * Rotate and flip the mask
   * @returns {RectMaskBase} This instance for chaining
   */
  rotateFlip () {
    return this._applyTransformation(
      'rotateFlip',
      'No rotate-flip transformation found for this shape'
    )
  }

  /**
   * Rotate the mask counter-clockwise
   * @returns {RectMaskBase} This instance for chaining
   */
  rotateCCW () {
    return this._applyTransformation(
      'rotateCCW',
      'No counter-clockwise rotation found for this shape'
    )
  }

  /**
   * Flip the mask (non-specific direction)
   * @returns {RectMaskBase} This instance for chaining
   */
  flip () {
    return this._applyTransformation(
      'flip',
      'No non-symmetric flip found for this shape'
    )
  }
  /**
   * Get the cached actions instance for transformations
   * @returns {Object|null} The actions instance or null if not available
   */
  get actions () {
    if (
      !this._actions ||
      !this.store.bitEqual(this._actions?.original?.bits, this.bits)
    ) {
      this._actions = this.indexer?.actions(this)
    }
    return this._actions
  }

  /**
   * Invert coordinates by swapping x and y values
   * @param {Array<Array<number>>} coords - Array of [x, y] or [x, y, value] coordinates
   * @returns {Array<Array<number>>} Coordinates with x and y swapped
   */
  static invertCoords (coords) {
    return coords.map(c => RectMaskBase.invertCoord(c))
  }

  /**
   * Invert a single coordinate by swapping x and y
   * @param {Array<number>} coord - [x, y] or [x, y, value] coordinate
   * @returns {Array<number>} Coordinate with x and y swapped
   */
  static invertCoord (coord) {
    return [coord[1], coord[0], coord[2] || 1]
  }
  // ============================================================================
  // Coordinate Conversion
  // ============================================================================

  /**
   * Load coordinates in XY format (x, y)
   * @param {Array<Array<number>>} coords - Array of [x, y] or [x, y, value] coordinates
   */
  fromXYcoords (coords) {
    this.fromCoords(coords)
  }

  /**
   * Load coordinates in RC format (row, column) - swaps to XY internally
   * @param {Array<Array<number>>} coords - Array of [row, col] or [row, col, value] coordinates
   */
  fromRCcoords (coords) {
    this.fromCoords(RectMaskBase.invertCoords(coords)) // Swap x and y
  }

  /**
   * Convert XY coordinates to bits
   * @param {Array<Array<number>>} coords - Array of [x, y] or [x, y, value] coordinates
   * @returns {*} Bit representation of the coordinates
   */
  bitsFromXYcoords (coords) {
    return this.bitsFromCoords(coords)
  }

  /**
   * Convert RC coordinates to bits (swaps to XY internally)
   * @param {Array<Array<number>>} coords - Array of [row, col] or [row, col, value] coordinates
   * @returns {*} Bit representation of the coordinates
   */
  bitsFromRCcoords (coords) {
    return this.bitsFromCoords(RectMaskBase.invertCoords(coords))
  }
  // ============================================================================
  // Random & Coordinate Conversion
  // ============================================================================

  /**
   * Get a random occupied coordinate in XY format
   * @returns {Array<number>} [x, y] coordinate of a random occupied cell
   */
  get randomXYoccupied () {
    return this.randomOccupied
  }

  /**
   * Get a random occupied coordinate in RC format (row, column)
   * @returns {Array<number>} [row, col] coordinate of a random occupied cell
   */
  get randomRCoccupied () {
    return RectMaskBase.invertCoord(this.randomOccupied)
  }

  /**
   * Get all occupied cells as [x, y] coordinate array
   * @returns {Array<Array<number>>} Array of [x, y] coordinates
   */
  get toXYcoords () {
    return this.toCoords
  }

  /**
   * Get all occupied cells as [row, col] coordinate array
   * @returns {Array<Array<number>>} Array of [row, col] coordinates
   */
  get toRCcoords () {
    return RectMaskBase.invertCoords(this.toCoords)
  }
}
