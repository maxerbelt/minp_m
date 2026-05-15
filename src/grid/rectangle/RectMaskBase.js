import { MaskBase } from '../MaskBase.js'
import { RectangleShape } from './RectangleShape.js'
import { Random } from '../../core/Random.js'

/**
 * @typedef {[number, number]} Coordinate
 * @typedef {[number, number, number]} CoordinateWithValue
 * @typedef {*} BitRepresentation
 * @typedef {Object} TransformCapabilities
 */

/**
 * Base class for rectangular grid masks providing common functionality
 * for 2D grid operations, transformations, and coordinate conversions.
 */
export class RectMaskBase extends MaskBase {
  /**
   * Transformation method configurations
   * @private
   * @type {Object<string, string>}
   */
  static _transformationConfigs = {
    rotate: 'No non-symmetric rotation found for this shape',
    r90Map: 'No 90-degree rotation found for this shape',
    r180Map: 'No 180-degree rotation found for this shape',
    r270Map: 'No 270-degree rotation found for this shape',
    fxMap: 'No horizontal flip found for this shape',
    fyMap: 'No vertical flip found for this shape',
    rotateFlip: 'No rotate-flip transformation found for this shape',
    rotateCCW: 'No counter-clockwise rotation found for this shape',
    flip: 'No non-symmetric flip found for this shape'
  }
  /**
   * Create a new rectangular mask base
   * @param {number} width - Width of the grid
   * @param {number} height - Height of the grid
   * @param {BitRepresentation} bits - Bit representation of the mask data
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
   * @returns {BitRepresentation} Bit position in the store
   */
  bitPos (x, y) {
    return this.store.bitPos(this.index(x, y))
  }

  /**
   * Get bit position for XY coordinates (alias for bitPos)
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {BitRepresentation} Bit position
   */
  bitPosXY (x, y) {
    return this.bitPos(x, y)
  }

  /**
   * Get bit position for row/column coordinates
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   * @returns {BitRepresentation} Bit position
   */
  bitPosRC (r, c) {
    return this.bitPos(c, r)
  }

  // ============================================================================
  // Cell Access - at, set, testFor, isOccupied
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
   * @returns {BitRepresentation} Updated bits
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
   * @returns {BitRepresentation} Updated bits
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
  isOccupied (x, y) {
    const idx = this.index(x, y)
    return this.store.isOccupied(this.bits, idx)
  }

  /**
   * Get transformation capabilities for this mask
   * @returns {TransformCapabilities} Object with capability flags like canRotate, canFlip
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
    const transformed = this.actions?.[actionMethod]?.(this.bits)
    if (transformed !== undefined) {
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
      RectMaskBase._transformationConfigs.rotate
    )
  }

  /**
   * Rotate the mask 90 degrees clockwise
   * @returns {RectMaskBase} This instance for chaining
   */
  r90 () {
    return this._applyTransformation(
      'r90Map',
      RectMaskBase._transformationConfigs.r90Map
    )
  }

  /**
   * Rotate the mask 180 degrees
   * @returns {RectMaskBase} This instance for chaining
   */
  r180 () {
    return this._applyTransformation(
      'r180Map',
      RectMaskBase._transformationConfigs.r180Map
    )
  }

  /**
   * Rotate the mask 270 degrees clockwise (90 degrees counter-clockwise)
   * @returns {RectMaskBase} This instance for chaining
   */
  r270 () {
    return this._applyTransformation(
      'r270Map',
      RectMaskBase._transformationConfigs.r270Map
    )
  }

  /**
   * Flip the mask horizontally
   * @returns {RectMaskBase} This instance for chaining
   */
  fx () {
    return this._applyTransformation(
      'fxMap',
      RectMaskBase._transformationConfigs.fxMap
    )
  }

  /**
   * Flip the mask vertically
   * @returns {RectMaskBase} This instance for chaining
   */
  fy () {
    return this._applyTransformation(
      'fyMap',
      RectMaskBase._transformationConfigs.fyMap
    )
  }

  /**
   * Rotate and flip the mask
   * @returns {RectMaskBase} This instance for chaining
   */
  rotateFlip () {
    return this._applyTransformation(
      'rotateFlip',
      RectMaskBase._transformationConfigs.rotateFlip
    )
  }

  /**
   * Rotate the mask counter-clockwise
   * @returns {RectMaskBase} This instance for chaining
   */
  rotateCCW () {
    return this._applyTransformation(
      'rotateCCW',
      RectMaskBase._transformationConfigs.rotateCCW
    )
  }

  /**
   * Flip the mask (non-specific direction)
   * @returns {RectMaskBase} This instance for chaining
   */
  flip () {
    return this._applyTransformation(
      'flip',
      RectMaskBase._transformationConfigs.flip
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
   * Load coordinates
   * @param {Coordinate[]} coords - Array of coordinates
   */
  fromCoords (coords) {
    this._coords.fromCoordinates(coords)
  }

  /**
   * Convert coordinates to bits
   * @param {Coordinate[]} coords - Array of coordinates
   * @returns {BitRepresentation} Bit representation
   */
  bitsFromCoords (coords) {
    return this._coords.coordinatesToBits(coords)
  }

  /**
   * Get random occupied coordinate
   * @returns {Coordinate} Random occupied coordinate
   */
  get randomOccupied () {
    return Random.element(this.toCoords)
  }

  /**
   * Get all occupied coordinates
   * @returns {Coordinate[]} Array of coordinates
   */
  get toCoords () {
    return this._coords.bitsToCoordinates().map(a => a.slice(0, 2))
  }
  /**
   * Invert coordinates by swapping x and y values
   * @param {Coordinate[]} coords - Array of [x, y] or [x, y, value] coordinates
   * @returns {Coordinate[]} Coordinates with x and y swapped
   */
  static invertCoords (coords) {
    return coords.map(c => RectMaskBase.invertCoord(c))
  }

  /**
   * Invert a single coordinate by swapping x and y
   * @param {CoordinateWithValue} coord - [x, y] or [x, y, value] coordinate
   * @returns {CoordinateWithValue} Coordinate with x and y swapped
   */
  static invertCoord (coord) {
    return [coord[1], coord[0], coord[2] || 1]
  }
  // ============================================================================
  // Coordinate Conversion
  // ============================================================================
}
