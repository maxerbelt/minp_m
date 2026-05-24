import { MaskBase } from '../MaskBase.js'
import { RectangleShape } from './RectangleShape.js'
import { Random } from '../../core/Random.js'

/**
 * @typedef {[number, number]} Coordinate
 * @typedef {[number, number, number]} CoordinateWithValue
 * @typedef {bigint} BitRepresentation
 * @typedef {Object} TransformCapabilities
 * @property {boolean} [canRotateCW] - Can rotate 90° clockwise
 * @property {boolean} [canRotateCCW] - Can rotate 90° counter-clockwise
 * @property {boolean} [canFlipH] - Can flip horizontally
 * @property {boolean} [canFlipV] - Can flip vertically
 * @typedef {Object} TransformMaps
 * @property {*} [r90] - 90° rotation map
 * @property {*} [r180] - 180° rotation map
 * @property {*} [r270] - 270° rotation map
 * @property {*} [fx] - Horizontal flip map
 * @property {*} [fy] - Vertical flip map
 */

/**
 * Base class for rectangular grid masks providing common functionality
 * for 2D grid operations, transformations, and coordinate conversions.
 * Extends MaskBase with rectangular grid-specific coordinate conversion,
 * indexing, and symmetry transformation capabilities.
 *
 * @extends MaskBase
 * @class RectMaskBase
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
   * Initializes a rectangular grid mask with optional bitboard data and storage backend.
   * Parameters are passed in the correct order to the parent MaskBase constructor.
   *
   * @param {number} width - Width of the grid in cells
   * @param {number} height - Height of the grid in cells
   * @param {bigint} [bits] - Initial bitboard bits (optional)
   * @param {Object} [store] - Custom bit storage backend (optional, defaults to StoreBig)
   * @param {number} [depth=1] - Number of color layers (must be last parameter for variadic compatibility)
   */
  constructor (width, height, bits, store, depth) {
    super(RectangleShape(width, height), bits, store, depth)
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
   * Returns the bit position corresponding to the given (x, y) cell coordinates.
   *
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {number} Bit position in the store
   */
  bitPos (x, y) {
    return this.store.bitPos(this.index(x, y))
  }

  /**
   * Get bit position for XY coordinates (alias for bitPos)
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {number} Bit position
   */
  bitPosXY (x, y) {
    return this.bitPos(x, y)
  }

  /**
   * Get bit position for row/column coordinates
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   * @returns {number} Bit position
   */
  bitPosRC (r, c) {
    return this.bitPos(c, r)
  }

  // ============================================================================
  // Cell Access - at, set, testFor, isOccupied
  // ============================================================================

  /**
   * Get cell value at (x, y) coordinates
   * Retrieves the color/value stored at the given rectangular coordinates.
   *
   * @param {number} x - X coordinate (column, 0-based)
   * @param {number} y - Y coordinate (row, 0-based)
   * @returns {bigint} Cell value at the specified coordinates
   */
  at (x, y) {
    const idx = this.index(x, y)
    // @ts-ignore - bitboard type inference sees union but is always bigint at runtime
    return this.store.getIdx(this.bits, idx)
  }

  /**
   * Set cell value at (x, y) coordinates
   * Updates the color/value at the given rectangular coordinates and updates this.bits.
   *
   * @param {number} x - X coordinate (column, 0-based)
   * @param {number} y - Y coordinate (row, 0-based)
   * @param {number} [color=1] - Value to set (default 1 for occupied)
   * @returns {bigint} Updated bitboard representation
   */
  set (x, y, color = 1) {
    // @ts-ignore - bitboard type inference sees union but is always bigint at runtime
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
    return this.at(x, y) === BigInt(color)
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
   * Tests whether the cell at the given coordinates contains an occupied (non-zero) value.
   *
   * @param {number} x - X coordinate (column, 0-based)
   * @param {number} y - Y coordinate (row, 0-based)
   * @returns {boolean} True if cell has non-zero value
   */
  isOccupied (x, y) {
    const idx = this.index(x, y)
    // @ts-ignore - bitboard type inference sees union but is always bigint at runtime
    return this.store.hasIdxSet(this.bits, idx)
  }

  /**
   * Get transformation capabilities for this mask
   * Determines which symmetry operations (rotation, flip) will produce a different result
   * than the identity transformation for the current bitboard state.
   *
   * @returns {TransformCapabilities} Object with boolean flags for rotation/flip capabilities
   */
  getTransformCapabilities () {
    // @ts-ignore - ShapeIndexer subclasses implement this method
    return this.indexer?.getTransformCapabilities?.(this) || {}
  }

  /**
   * Apply a transformation using the specified action method
   * Internal helper that applies a named transformation from the actions object.
   * Updates this.bits with the transformed result and supports method chaining.
   *
   * @param {string} actionMethod - The name of the action method to call (e.g., 'r90Map', 'fxMap')
   * @param {string} errorMessage - Error message to throw if transformation is not available
   * @returns {RectMaskBase} This instance for chaining
   * @throws {Error} If transformation method is not available on actions
   * @private
   */
  _applyTransformation (actionMethod, errorMessage) {
    // @ts-ignore - bitboard type inference sees union but is always bigint at runtime
    const transformed = this.actions?.[actionMethod]?.(this.bits)
    if (transformed !== undefined) {
      this.bits = transformed
      return this
    }
    throw new Error(errorMessage)
  }

  /**
   * Check if a transformation capability is available
   * Internal helper method to query transformation capabilities by name.
   * Primarily used internally; consider using getTransformCapabilities() for direct queries.
   *
   * @param {string} _capability - The capability name to check (e.g., 'canRotateCW', 'canFlipH')
   * @returns {boolean} True if the capability is available
   * @private
   */
  _hasTransformCapability (_capability) {
    const capabilities = this.getTransformCapabilities()
    return capabilities[_capability] || false
  }

  /**
   * Check if this mask can be rotated
   * Tests if any rotation transformation will change the current bitboard state.
   *
   * @returns {boolean} True if rotation is supported
   * @deprecated Use specific rotation checks instead
   */
  canRotate () {
    const caps = this.getTransformCapabilities()
    return caps.canRotateCW || caps.canRotateCCW || false
  }

  /**
   * Check if this mask can be flipped
   * Tests if any flip transformation will change the current bitboard state.
   *
   * @returns {boolean} True if flipping is supported
   * @deprecated Use specific flip checks instead
   */
  canFlip () {
    const caps = this.getTransformCapabilities()
    return caps.canFlipH || caps.canFlipV || false
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
   * Lazily creates and caches an Actions instance for the current bitboard state.
   * Cache is invalidated whenever this.bits changes (detected by bitEqual check).
   *
   * @type {Object|null}
   * @returns {Object} Actions instance with transformation methods, or null if indexer unavailable
   */
  get actions () {
    // @ts-ignore - bitEqual expects bigint but type inference sees union type
    if (
      !this._actions ||
      !this.store.bitEqual(this._actions?.original?.bits, this.bits)
    ) {
      // @ts-ignore - ShapeIndexer subclasses implement this method
      this._actions = this.indexer?.actions?.(this)
    }
    return this._actions
  }

  /**
   * Load coordinates into the internal coordinate converter
   * Provides access to the lazy-loaded CoordinateConversion helper for this mask.
   *
   * @param {Coordinate[]} coords - Array of [x, y] coordinates to load
   * @returns {void}
   */
  fromCoords (coords) {
    this._coords.fromCoordinates(coords)
  }

  /**
   * Convert an array of coordinates to a bitboard representation
   * Takes a list of [x, y] coordinates and creates a bitboard with those cells marked as occupied.
   *
   * @param {Coordinate[]} coords - Array of [x, y] coordinates
   * @returns {bigint} Bitboard representation with marked cells
   */
  bitsFromCoords (coords) {
    return this._coords.coordinatesToBits(coords)
  }

  /**
   * Get a random occupied coordinate from the mask
   * Selects a random coordinate from all currently occupied cells.
   * Throws error if no occupied cells exist.
   *
   * @type {Coordinate}
   * @returns {Coordinate} A random [x, y] coordinate from occupied cells
   * @throws {RangeError} If no occupied cells exist in the mask
   */
  get randomOccupied () {
    return Random.element(this.toCoords)
  }

  /**
   * Get all occupied coordinates as an array
   * Converts the bitboard representation to a list of all occupied [x, y] coordinates.
   * Returns coordinates in order of their linear index.
   *
   * @type {Coordinate[]}
   * @returns {Coordinate[]} Array of [x, y] coordinates for all occupied cells
   */
  get toCoords () {
    return this._coords.bitsToCoordinates().map(a => a.slice(0, 2))
  }
  /**
   * Invert an array of coordinates by swapping x and y values
   * Transposes a list of coordinates by swapping their x and y components.
   * Useful for converting between row-major and column-major representations.
   *
   * @param {CoordinateWithValue[]} coords - Array of [x, y] or [x, y, value] coordinates
   * @returns {CoordinateWithValue[]} Coordinates with x and y swapped
   * @static
   */
  static invertCoords (coords) {
    return coords.map(c => RectMaskBase.invertCoord(c))
  }

  /**
   * Invert a single coordinate by swapping x and y
   * Swaps the x and y components of a coordinate, preserving the value component if present.
   * If value is omitted, defaults to 1 (occupied).
   *
   * @param {CoordinateWithValue} coord - [x, y] or [x, y, value] coordinate tuple
   * @returns {CoordinateWithValue} Inverted [y, x, value] coordinate
   * @static
   */
  static invertCoord (coord) {
    return [coord[1], coord[0], coord[2] || 1]
  }
  // ============================================================================
  // Coordinate Conversion
  // ============================================================================
}
