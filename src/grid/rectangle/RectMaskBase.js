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
   * The shape is automatically created from width and height using RectangleShape().
   *
   * @param {number} width - Width of the grid in cells (must be positive)
   * @param {number} height - Height of the grid in cells (must be positive)
   * @param {bigint} [bits] - Initial bitboard bits (optional, defaults to 0n if omitted)
   * @param {Object} [store] - Custom bit storage backend (optional, defaults to StoreBig)
   * @param {number} [depth=1] - Number of color layers; must be last parameter for variadic compatibility
   */
  constructor (width, height, bits, store, depth) {
    super(RectangleShape(width, height), bits, store, depth)
  }

  /**
   * Get the total area of the grid
   * Calculates the total number of cells in the grid by multiplying width and height.
   *
   * @type {number}
   */
  get area () {
    return this.width * this.height
  }

  // ============================================================================
  // Indexing & Bit Positioning
  // ============================================================================

  /**
   * Convert rectangular (x, y) coordinates to linear index
   * Transforms 2D grid coordinates into a 1D array index using row-major order.
   * Formula: index = y * width + x
   *
   * @param {number} x - X coordinate (column, 0-based)
   * @param {number} y - Y coordinate (row, 0-based)
   * @returns {number} Linear index for the cell in row-major order
   */
  index (x, y) {
    return y * this.width + x
  }

  /**
   * Convert XY coordinates to linear index (alias for index)
   * Provides alternative method name for converting 2D coordinates to 1D index.
   * Functionally identical to the index() method.
   *
   * @param {number} x - X coordinate (column, 0-based)
   * @param {number} y - Y coordinate (row, 0-based)
   * @returns {number} Linear index in row-major order
   */
  indexXY (x, y) {
    return this.index(x, y)
  }

  /**
   * Convert row/column coordinates to linear index
   * Transforms row-column coordinates into a linear index by converting (r,c) to (c,r) and calling index().
   * Useful for row-major interpretation of grid coordinates.
   *
   * @param {number} r - Row coordinate (0-based)
   * @param {number} c - Column coordinate (0-based)
   * @returns {number} Linear index for the cell
   */
  indexRC (r, c) {
    return this.index(c, r)
  }

  /**
   * Get bit position in store for rectangular coordinates
   * Converts 2D grid coordinates to the bit position in the underlying bitboard store.
   * Combines index calculation with store-specific bit positioning logic.
   *
   * @param {number} x - X coordinate (column, 0-based)
   * @param {number} y - Y coordinate (row, 0-based)
   * @returns {number} Bit position in the bitboard store
   */
  bitPos (x, y) {
    return this.store.bitPos(this.index(x, y))
  }

  /**
   * Get bit position for XY coordinates (alias for bitPos)
   * Provides alternative method name for bit position calculation.
   * Functionally identical to the bitPos() method.
   *
   * @param {number} x - X coordinate (column, 0-based)
   * @param {number} y - Y coordinate (row, 0-based)
   * @returns {number} Bit position in the store
   */
  bitPosXY (x, y) {
    return this.bitPos(x, y)
  }

  /**
   * Get bit position for row/column coordinates
   * Converts row-column coordinates to bit position by converting (r,c) to (c,r) and calling bitPos().
   *
   * @param {number} r - Row coordinate (0-based)
   * @param {number} c - Column coordinate (0-based)
   * @returns {number} Bit position in the store
   */
  bitPosRC (r, c) {
    return this.bitPos(c, r)
  }

  // ============================================================================
  // Cell Access - at, set, testFor, isOccupied
  // ============================================================================

  /**
   * Get cell value at (x, y) coordinates
   * Retrieves the current color/value stored at the specified rectangular coordinates.
   * Uses the underlying store's multi-bit color layer system (depth parameter).
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
   * Updates the color/value at the given rectangular coordinates and synchronizes this.bits.
   * Modifies the internal bitboard representation to reflect the new cell value.
   *
   * @param {number} x - X coordinate (column, 0-based)
   * @param {number} y - Y coordinate (row, 0-based)
   * @param {number} [color=1] - Value to set (default 1 for occupied); 0 to clear the cell
   * @returns {bigint} Updated bitboard representation after setting the cell
   */
  set (x, y, color = 1) {
    // @ts-ignore - bitboard type inference sees union but is always bigint at runtime
    this.bits = this.store.setIdx(this.bits, this.index(x, y), color)
    return this.bits
  }

  /**
   * Test if cell at (x, y) matches specified color
   * Compares the value at the given coordinates with the provided color value.
   * Returns true only if the cell contains an exact match to the color parameter.
   *
   * @param {number} x - X coordinate (column, 0-based)
   * @param {number} y - Y coordinate (row, 0-based)
   * @param {number} [color=1] - Color value to test for (default 1)
   * @returns {boolean} True if cell value equals the specified color
   */
  test (x, y, color = 1) {
    return this.at(x, y) === BigInt(color)
  }

  /**
   * Test if cell at (x, y) matches specified color (legacy alias)
   * Deprecated method name for test(). Provided for backward compatibility.
   * Functionally identical to test() but use test() for new code.
   *
   * @param {number} x - X coordinate (column, 0-based)
   * @param {number} y - Y coordinate (row, 0-based)
   * @param {number} [color=1] - Color value to test for (default 1)
   * @returns {boolean} True if cell value equals the specified color
   * @deprecated Use test() instead
   */
  testFor (x, y, color = 1) {
    return this.test(x, y, color)
  }

  /**
   * Clear (zero out) a cell at (x, y)
   * Sets the cell value to 0 (unoccupied), effectively clearing any color or marking.
   * Equivalent to calling set(x, y, 0).
   *
   * @param {number} x - X coordinate (column, 0-based)
   * @param {number} y - Y coordinate (row, 0-based)
   * @returns {BitRepresentation} Updated bitboard representation
   */
  clear (x, y) {
    return this.set(x, y, 0)
  }

  /**
   * Check if cell at (x, y) has non-zero value
   * Tests whether the cell at the given coordinates contains an occupied (non-zero) value.
   * Returns true for any non-zero cell value, regardless of the specific color.
   *
   * @param {number} x - X coordinate (column, 0-based)
   * @param {number} y - Y coordinate (row, 0-based)
   * @returns {boolean} True if cell has non-zero value (occupied)
   */
  isOccupied (x, y) {
    const idx = this.index(x, y)
    // @ts-ignore - bitboard type inference sees union but is always bigint at runtime
    return this.store.hasIdxSet(this.bits, idx)
  }

  /**
   * Get transformation capabilities for this mask
   * Analyzes the current bitboard state and determines which symmetry operations
   * (rotation, flip) will produce a different result than the identity transformation.
   * Used to check if transformations are meaningful for the current grid state.
   *
   * @returns {TransformCapabilities} Object with boolean flags indicating available transformations
   */
  getTransformCapabilities () {
    // @ts-ignore - ShapeIndexer subclasses implement this method
    return this.indexer?.getTransformCapabilities?.(this) || {}
  }

  /**
   * Apply a transformation using the specified action method
   * Internal helper that applies a named transformation from the actions object.
   * Updates this.bits with the transformed result and supports method chaining.
   * Throws an error if the transformation is not available for this mask type.
   *
   * @param {string} actionMethod - Name of the action method to call (e.g., 'r90Map', 'fxMap')
   * @param {string} errorMessage - Descriptive error message if transformation unavailable
   * @returns {RectMaskBase} This instance for method chaining
   * @throws {Error} If transformation method is not available on the actions object
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
   * Check if this mask can be rotated
   * Tests if any rotation transformation will change the current bitboard state.
   * Returns true only if canRotateCW or canRotateCCW is available.
   *
   * @returns {boolean} True if rotation transformations are supported for this mask
   * @deprecated Use specific rotation checks (canRotateCW, canRotateCCW) instead
   */
  canRotate () {
    const caps = this.getTransformCapabilities()
    return caps.canRotateCW || caps.canRotateCCW || false
  }

  /**
   * Check if this mask can be flipped
   * Tests if any flip transformation will change the current bitboard state.
   * Returns true only if canFlipH or canFlipV is available.
   *
   * @returns {boolean} True if flip transformations are supported for this mask
   * @deprecated Use specific flip checks (canFlipH, canFlipV) instead
   */
  canFlip () {
    const caps = this.getTransformCapabilities()
    return caps.canFlipH || caps.canFlipV || false
  }

  /**
   * Rotate the mask to a non-symmetric orientation
   * Applies a rotation transformation that produces a different bitboard state.
   * Supports method chaining for fluent transformation API.
   *
   * @returns {RectMaskBase} This instance for method chaining
   * @throws {Error} If no rotation transformation is available for this shape
   */
  rotate () {
    return this._applyTransformation(
      'rotate',
      RectMaskBase._transformationConfigs.rotate
    )
  }

  /**
   * Rotate the mask 90 degrees clockwise
   * Applies a 90° clockwise rotation transformation to the bitboard.
   * Supports method chaining for fluent transformation API.
   *
   * @returns {RectMaskBase} This instance for method chaining
   * @throws {Error} If 90° rotation is not available for this shape
   */
  r90 () {
    return this._applyTransformation(
      'r90Map',
      RectMaskBase._transformationConfigs.r90Map
    )
  }

  /**
   * Rotate the mask 180 degrees
   * Applies a 180° rotation transformation to the bitboard.
   * Supports method chaining for fluent transformation API.
   *
   * @returns {RectMaskBase} This instance for method chaining
   * @throws {Error} If 180° rotation is not available for this shape
   */
  r180 () {
    return this._applyTransformation(
      'r180Map',
      RectMaskBase._transformationConfigs.r180Map
    )
  }

  /**
   * Rotate the mask 270 degrees clockwise
   * Applies a 270° clockwise rotation (equivalent to 90° counter-clockwise) transformation.
   * Supports method chaining for fluent transformation API.
   *
   * @returns {RectMaskBase} This instance for method chaining
   * @throws {Error} If 270° rotation is not available for this shape
   */
  r270 () {
    return this._applyTransformation(
      'r270Map',
      RectMaskBase._transformationConfigs.r270Map
    )
  }

  /**
   * Flip the mask horizontally
   * Applies a horizontal (left-right) flip transformation to the bitboard.
   * Supports method chaining for fluent transformation API.
   *
   * @returns {RectMaskBase} This instance for method chaining
   * @throws {Error} If horizontal flip is not available for this shape
   */
  fx () {
    return this._applyTransformation(
      'fxMap',
      RectMaskBase._transformationConfigs.fxMap
    )
  }

  /**
   * Flip the mask vertically
   * Applies a vertical (top-bottom) flip transformation to the bitboard.
   * Supports method chaining for fluent transformation API.
   *
   * @returns {RectMaskBase} This instance for method chaining
   * @throws {Error} If vertical flip is not available for this shape
   */
  fy () {
    return this._applyTransformation(
      'fyMap',
      RectMaskBase._transformationConfigs.fyMap
    )
  }

  /**
   * Rotate and flip the mask
   * Applies a combined rotation and flip transformation to the bitboard.
   * Supports method chaining for fluent transformation API.
   *
   * @returns {RectMaskBase} This instance for method chaining
   * @throws {Error} If rotate-flip transformation is not available for this shape
   */
  rotateFlip () {
    return this._applyTransformation(
      'rotateFlip',
      RectMaskBase._transformationConfigs.rotateFlip
    )
  }

  /**
   * Rotate the mask counter-clockwise
   * Applies a counter-clockwise rotation transformation to the bitboard.
   * Supports method chaining for fluent transformation API.
   *
   * @returns {RectMaskBase} This instance for method chaining
   * @throws {Error} If counter-clockwise rotation is not available for this shape
   */
  rotateCCW () {
    return this._applyTransformation(
      'rotateCCW',
      RectMaskBase._transformationConfigs.rotateCCW
    )
  }

  /**
   * Flip the mask (non-specific direction)
   * Applies a flip transformation (direction determined by indexer/actions).
   * Supports method chaining for fluent transformation API.
   *
   * @returns {RectMaskBase} This instance for method chaining
   * @throws {Error} If flip transformation is not available for this shape
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
   * Returns null if no indexer is available for this mask.
   *
   * @type {Object|null}
   */
  get actions () {
    const cachedBits = this._actions?.original?.bits
    // Check if cache is valid: _actions exists, cached bits is a bigint, and equals current bits
    const isValidCache =
      this._actions &&
      typeof cachedBits === 'bigint' &&
      // @ts-ignore - bitboard type inference sees union but runtime guarantees bigint
      this.store.bitEqual(cachedBits, this.bits)

    if (!isValidCache) {
      // @ts-ignore - ShapeIndexer subclasses implement this method
      this._actions = this.indexer?.actions?.(this)
    }
    return this._actions
  }

  /**
   * Load coordinates into the internal coordinate converter
   * Initializes the internal coordinate conversion helper with a list of [x, y] coordinates.
   * These coordinates become the active set for coordinate-to-bit conversions and vice versa.
   *
   * @param {Coordinate[]} coords - Array of [x, y] coordinates to load into the converter
   * @returns {void}
   */
  fromCoords (coords) {
    this._coords.fromCoordinates(coords)
  }

  /**
   * Convert an array of coordinates to a bitboard representation
   * Takes a list of [x, y] coordinates and creates a BigInt bitboard with those cells marked as occupied.
   * Each coordinate's index is calculated and the corresponding bit is set in the returned bitboard.
   *
   * @param {Coordinate[]} coords - Array of [x, y] coordinates to convert (0-based indices)
   * @returns {bigint} Bitboard representation with marked cells
   */
  bitsFromCoords (coords) {
    return this._coords.coordinatesToBits(coords)
  }

  /**
   * Get a random occupied coordinate from the mask
   * Selects a random coordinate from all currently occupied cells in the bitboard.
   * Returns a random [x, y] coordinate tuple from all occupied cells.
   *
   * @type {Coordinate}
   * @throws {RangeError} If no occupied cells exist in the mask
   */
  get randomOccupied () {
    return Random.element(this.toCoords)
  }

  /**
   * Get all occupied coordinates as an array
   * Converts the bitboard representation to a list of all occupied [x, y] coordinates.
   * Coordinates are returned in order of their linear index (row-major order).
   * Each coordinate is a [x, y] tuple with 0-based indices.
   *
   * @type {Coordinate[]}
   */
  get toCoords () {
    return this._coords.bitsToCoordinates().map(a => a.slice(0, 2))
  }
  /**
   * Invert an array of coordinates by swapping x and y values
   * Transposes a list of coordinates by swapping their x and y components.
   * Useful for converting between row-major and column-major representations.
   * Preserves value component if present in the coordinate tuple.
   *
   * @param {CoordinateWithValue[]} coords - Array of [x, y] or [x, y, value] coordinate tuples to invert
   * @returns {CoordinateWithValue[]} New array of inverted coordinates with x and y swapped
   * @static
   */
  static invertCoords (coords) {
    return coords.map(c => RectMaskBase.invertCoord(c))
  }

  /**
   * Invert a single coordinate by swapping x and y
   * Swaps the x and y components of a coordinate tuple, preserving the optional value component.
   * If value is not present in the input coordinate, defaults to 1 (indicating occupied).
   *
   * @param {CoordinateWithValue} coord - Input coordinate as [x, y] or [x, y, value] tuple
   * @returns {CoordinateWithValue} Inverted coordinate as [y, x, value] tuple
   * @static
   */
  static invertCoord (coord) {
    return [coord[1], coord[0], coord[2] || 1]
  }
  // ============================================================================
  // Coordinate Conversion
  // ============================================================================
}
