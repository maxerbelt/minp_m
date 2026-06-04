import { CanvasGrid } from './canvasGrid.js'
import { ForLocation } from './ForLocation.js'
import { StoreBig } from './bitStore/storeBig.js'
import { BitOperations } from './operations/BitOperations.js'
import { BorderRegions } from './operations/BorderRegions.js'
import { MorphologicalOps } from './operations/MorphologicalOps.js'
import { MaskValidation } from './operations/MaskValidation.js'
import { AsciiRepresentation } from './AsciiRepresentation.js'
import { CoordinateConversion } from './operations/CoordinateConversion.js'
import { BigOne } from './bitStore/helpers/bigbits.js'

/**
 * @typedef {Object} CoordinatePair
 * @property {number} x - X coordinate
 * @property {number} y - Y coordinate
 */

/**
 * @typedef {number[]} CoordinateTuple
 */

/**
 * @typedef {Object} ShapeConfig
 * @property {number} width - Shape width in cells
 * @property {number} height - Shape height in cells
 */

/**
 * @typedef {Object} BitsAndDimensions
 * @property {bigint} bitboard - The bitboard representation
 * @property {number} newWidth - New width after operation
 * @property {number} newHeight - New height after operation
 */

/**
 * @typedef {Object} LocationRange
 * @property {number} row - Row index
 * @property {number} col0 - Column start (inclusive)
 * @property {number} col1 - Column end (exclusive)
 */

/**
 * Base class for multi-bit masks with storage and morphological operations.
 * Provides bit-level manipulation, color layer support, and lazy-loaded helper instances.
 * Extends CanvasGrid with additional bitboard storage and advanced grid operations.
 *
 * @abstract
 * @extends CanvasGrid
 * @class MaskBase
 */
export class MaskBase extends CanvasGrid {
  /**
   * Constructs a MaskBase instance with optional bits and storage backend.
   * Initializes lazy-loaded helper instances for bitwise, morphological, and validation operations.
   *
   * @param {ShapeConfig|number} shape - Shape configuration object with width/height properties or numeric shape
   * @param {bigint} [bits] - Initial bitboard bits (optional)
   * @param {StoreBig} [store] - Custom storage backend (optional, defaults to StoreBig)
   * @param {number} [depth=1] - Number of color layers (must be last parameter)
   */
  constructor (shape, bits, store, depth = 1) {
    super(shape)
    // Pass width and height to StoreBig so it can compute row/word layout
    this.store =
      store ||
      new StoreBig(depth, this._totalArea, undefined, this.width, this.height)
    // Use bits if provided (even if falsy like 0n), otherwise use empty
    this.bits = bits !== null && bits !== undefined ? bits : this.store.empty
    this.depth = depth
  }

  /**
   * Create a default store for this mask type with given depth
   * Subclasses can override to use different store types (e.g., Store32 for Packed)
   * @param {number} depth - Color depth (number of color layers)
   * @returns {StoreBig} Default BigInt-based store instance
   * @protected
   */
  defaultStore (depth) {
    return new StoreBig(
      depth,
      this._totalArea,
      undefined,
      this.width,
      this.height
    )
  }

  /**
   * Minimum grid dimension (smallest of width/height)
   * @type {number}
   * @public
   */
  get minSize () {
    return Math.min(this.height, this.width)
  }

  /**
   * Maximum grid dimension (largest of width/height)
   * @type {number}
   * @public
   */
  get maxSize () {
    return Math.max(this.height, this.width)
  }

  /**
   * Whether the grid is taller than it is wide
   * @type {boolean}
   * @public
   */
  get isTall () {
    return this.height > this.width
  }

  /**
   * Whether the grid is wider than it is tall
   * @type {boolean}
   * @public
   */
  get isWide () {
    return this.width > this.height
  }

  /**
   * Whether the grid has equal width and height
   * @type {boolean}
   * @public
   */
  get isSquare () {
    return this.width === this.height
  }

  /**
   * Get or create a lazy-loaded helper instance
   * Caches helper instances for efficient reuse across operations
   *
   * @template T
   * @param {string} name - Name of the helper property (without underscore)
   * @param {Function} Constructor - Constructor function for the helper
   * @returns {T} The helper instance
   */
  #getHelper (name, Constructor) {
    const propName = `__${name}`
    if (!this[propName]) {
      this[propName] = new Constructor(this)
    }
    return this[propName]
  }

  // Lazy-loaded helper instances
  get _bitOps () {
    return this.#getHelper('bitOps', BitOperations)
  }

  get _borderRegions () {
    return this.#getHelper('borderRegions', BorderRegions)
  }

  get _morphOps () {
    return this.#getHelper('morphOps', MorphologicalOps)
  }

  get _validation () {
    return this.#getHelper('validation', MaskValidation)
  }

  get _ascii () {
    return this.#getHelper('ascii', AsciiRepresentation)
  }

  get _coords () {
    return this.#getHelper('coords', CoordinateConversion)
  }

  /**
   * Convert x,y coordinates to a linear index using the shape's indexer
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {number} Linear index
   * @public
   */
  index (x, y) {
    return this.indexer.index(x, y)
  }

  /**
   * Convert coordinates to a bit position in the storage backend
   * Combines indexing with store bit position calculation
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {number} Bit position in the store
   * @public
   */
  bitPos (x, y) {
    return this.store.bitPos(this.index(x, y))
  }

  // ============================================================================
  // Cell Access - set, at, test, clear, add
  // ============================================================================

  /**
   * Set cell value at (x, y) with optional color.
   * Updates the internal bits and returns the modified bitboard for chaining.
   * Implements the abstract method from CanvasGrid.
   *
   * @param {number} x - Column coordinate
   * @param {number} y - Row coordinate
   * @param {number} [color=1] - Color value to set (0 clears the cell)
   * @returns {bigint} Updated bitboard
   * @public
   */
  set (x, y, color = 1) {
    const loc = this.for(x, y)
    this.bits = loc.set(color)
    return this.bits
  }

  /**
   * Test if cell at (x, y) has the specified color value
   * @param {number} x - Column coordinate
   * @param {number} y - Row coordinate
   * @param {number} [color=1] - Color value to test
   * @returns {boolean} True if cell matches color
   * @public
   */
  test (x, y, color = 1) {
    return this.for(x, y).hasColor(color)
  }

  /**
   * Add (set) a cell value. Alias for set() for convenience.
   * @param {number} x - Column coordinate
   * @param {number} y - Row coordinate
   * @param {number} [color=1] - Color value to set
   * @returns {bigint} Updated bitboard
   * @public
   */
  add (x, y, color = 1) {
    return this.set(x, y, color)
  }

  /**
   * Clear (zero out) a cell at (x, y)
   * Equivalent to set(x, y, 0)
   * @param {number} x - Column coordinate
   * @param {number} y - Row coordinate
   * @returns {bigint} Updated bitboard
   * @public
   */
  clear (x, y) {
    return this.set(x, y, 0)
  }

  /**
   * Get cell value at (x, y)
   * @param {number} x - Column coordinate
   * @param {number} y - Row coordinate
   * @returns {number|bigint} Cell value
   * @public
   */
  at (x, y) {
    return this.for(x, y).readCellValue()
  }

  /**
   * Create a ForLocation helper for the specified coordinates
   * Encapsulates bit position and provides location-specific operations
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {ForLocation} Location helper object
   * @private
   */
  for (x, y) {
    const pos = this.bitPos(x, y)
    return new ForLocation(pos, this.bits, this.store)
  }
  /**
   * Count of occupied (non-zero) cells in the bitboard
   * @type {number}
   * @public
   */
  get occupancy () {
    return this.store.occupancy(this.bits)
  }

  /**
   * Size of the grid - returns number of occupied cells (occupancy)
   * Overrides ShapeBase.size property which returns total area
   * Stores total area in _totalArea for reference
   * @type {number}
   * @public
   */
  get size () {
    return this.occupancy
  }

  /**
   * Set the total area (called by ShapeBase constructor)
   * @param {number} value - Total area (width * height)
   * @private
   */
  set size (value) {
    this._totalArea = value
  }

  // ============================================================================
  // Bit Manipulation - Common patterns for concrete classes
  // ============================================================================

  /**
   * Add a bit at the given store-level index
   * Called by cell-coordinate specific methods
   *
   * @param {bigint} bits - Current bitboard
   * @param {number} index - Store-level index
   * @returns {bigint} Updated bitboard with bit set
   * @protected
   */
  _addBitAtIndex (bits, index) {
    return this.store.addBit(bits, index)
  }

  /**
   * Get bit mask for a cell at given store index
   * Used to create cell-specific bit masks for multi-value operations
   *
   * @param {number} index - Cell index in store
   * @returns {bigint} Bit mask for the cell
   * @protected
   */
  _getBitMaskForIndex (index) {
    if (this.store.bitMaskByPos) {
      return this.store.bitMaskByPos(this.store.bitPos(index))
    }
    return BigOne.bitMaskByPos(index)
  }

  /**
   * Check if a specific bit position is set in the bits
   * @param {bigint} bits - Bitboard to check
   * @param {number} index - Cell index to test
   * @returns {boolean} True if bit is set
   * @protected
   */
  _isBitSetAtIndex (bits, index) {
    const bitPosition = this.store.bitPos(index)
    return this.store.value(bits, bitPosition) !== 0
  }

  // ============================================================================
  // Mask Creation & Factory Methods
  // ============================================================================

  /**
   * Create a new instance of this mask class
   * Factory method for creating masks of the same type
   *
   * @param {number} [width=this.width] - Mask width
   * @param {number} [height=this.height] - Mask height
   * @param {number} [depth=this.depth] - Optional depth override
   * @returns {MaskBase} New mask instance
   * @private
   */
  #createMaskInstance (
    width = this.width,
    height = this.height,
    depth = this.depth
  ) {
    // @ts-ignore - this.constructor is dynamically constructable
    const Ctor = this.constructor
    return new Ctor(width, height, null, null, depth)
  }

  /**
   * Create empty mask of same shape and depth
   * Must be implemented or overridden in subclasses that use non-standard constructors
   *
   * @returns {MaskBase} Empty mask instance
   * @public
   */
  get emptyMask () {
    // Default implementation for rectangular masks
    return this.#createMaskInstance()
  }

  /**
   * Expand mask to a square grid if needed
   * If already square, returns a clone
   *
   * @returns {MaskBase} Square mask
   * @public
   */
  get square () {
    if (this.width === this.height) return this.clone
    const size = Math.max(this.width, this.height)
    const mask = this.#createMaskInstance(size, size)
    mask.bits = this.store.expandToSquare(this.bits, this.height, this.width)
    return mask
  }

  /**
   * Expand bits to a square grid
   * Helper used by square property
   *
   * @param {number} gridHeight - Current grid height
   * @param {number} gridWidth - Current grid width
   * @returns {bigint} Expanded bits for square grid
   * @public
   */
  expandToSquare (gridHeight, gridWidth) {
    if (gridHeight === gridWidth) return this.bits
    const N = Math.max(gridHeight, gridWidth)
    return this.store.expandToWidth(gridWidth, gridHeight, this.bits, N)
  }

  /**
   * Create empty mask of specified dimensions
   * Must be implemented or overridden in subclasses that use non-standard constructors
   *
   * @param {number} [width=this.width] - Mask width
   * @param {number} [height=this.height] - Mask height
   * @param {number} [depth=this.depth] - Color depth
   * @returns {MaskBase} Empty mask instance
   * @public
   */
  emptyMaskOfSize (
    width = this.width,
    height = this.height,
    depth = this.depth
  ) {
    // Default implementation for rectangular masks
    return this.#createMaskInstance(width, height, depth)
  }

  /**
   * Create mask with specific bits
   * Factory for creating derived masks from bitboards
   *
   * @param {bigint} bits - Bits to set on the mask
   * @returns {MaskBase} New mask instance with the specified bits
   * @private
   */
  _createMaskWithBits (bits) {
    const mask = this.emptyMask
    mask.bits = bits
    return mask
  }

  /**
   * Create full (all bits set) mask of same shape
   * Represents all cells occupied
   *
   * @returns {MaskBase} Full mask
   * @public
   */
  get fullMask () {
    return this._createMaskWithBits(this.fullBits)
  }

  /**
   * Create inverted mask of same shape
   * Represents the complement of current occupancy
   *
   * @returns {MaskBase} Inverted mask
   * @public
   */
  get invertedMask () {
    return this._createMaskWithBits(this.invertedBits)
  }

  /**
   * Clone this mask with identical bits and depth
   * Preserves depth which may differ from default value
   *
   * @returns {MaskBase} Cloned mask
   * @public
   */
  get clone () {
    // create a new instance of the same class with identical dimensions
    // and depth.  Using emptyMask previously defaulted to depth=4 which
    // broke occupancy clones used by rectcolor compute (depth=1) – see
    // updateButtonStates2 BigInt test failures.
    const mask = this.#createMaskInstance()
    mask.bits = this.cloneBits
    return mask
  }

  /**
   * Clone the internal bits
   * @returns {bigint} Cloned bitboard
   * @public
   */
  get cloneBits () {
    return this.store.clone(this.bits)
  }
  // ============================================================================
  // Range Operations Helper
  // ============================================================================

  /**
   * Apply an operation to each range in a list
   * Helper for range-based batch operations
   *
   * @param {LocationRange[]} ranges - Array of [row, col0, col1] ranges
   * @param {Function} operation - Operation to apply to each range
   * @returns {void}
   * @private
   */
  _applyRangeOperation (ranges, operation) {
    for (const [r, c0, c1] of ranges) {
      operation.call(this, r, c0, c1)
    }
  }

  /**
   * Set all cells in range to 1 (occupied)
   * @param {number} r - Row index
   * @param {number} c0 - Column start (inclusive)
   * @param {number} c1 - Column end (exclusive)
   * @returns {void}
   * @public
   */
  setRange (r, c0, c1) {
    this.bits = this.store.setRange(this.bits, this.index(0, r), c0, c1)
  }

  /**
   * Set multiple ranges of cells
   * @param {LocationRange[]} ranges - Array of [row, col0, col1] ranges
   * @returns {void}
   * @public
   */
  setRanges (ranges) {
    this._applyRangeOperation(ranges, this.setRange)
  }

  /**
   * Clear (zero) all cells in range
   * @param {number} r - Row index
   * @param {number} c0 - Column start (inclusive)
   * @param {number} c1 - Column end (exclusive)
   * @returns {void}
   * @public
   */
  clearRange (r, c0, c1) {
    this.bits = this.store.clearRange(this.bits, this.index(0, r), c0, c1)
  }

  /**
   * Clear multiple ranges of cells
   * @param {LocationRange[]} ranges - Array of [row, col0, col1] ranges
   * @returns {void}
   * @public
   */
  clearRanges (ranges) {
    this._applyRangeOperation(ranges, this.clearRange)
  }

  /**
   * All bits set (maximum value for the depth)
   * @type {bigint}
   * @public
   */
  get fullBits () {
    return this.store.fullBits
  }

  /**
   * Bitwise inverse of current bits
   * @type {bigint}
   * @public
   */
  get invertedBits () {
    return this.store.invertedBits(this.bits)
  }

  /**
   * Apply a coordinate transformation mapping
   * Transforms the bitboard using an index-to-index map
   *
   * @param {Object} bbc - Bitboard container with store property
   * @param {number[]} map - Index transformation map
   * @returns {bigint} Transformed bits
   * @public
   */
  applyTransform (bbc, map) {
    let out = bbc.store.empty
    for (const i of this.store.all.occupiedIndices(bbc.bits)) {
      out = bbc.store.setIdx(out, map[i], 1n)
    }
    return out
  }

  /**
   * Get ASCII representation of the mask
   * Renders the grid with symbols for visualization
   *
   * @type {string}
   * @public
   */
  get toAscii () {
    return this._ascii.toAscii()
  }

  /**
   * Get ASCII representation with custom symbols
   * @param {string[]} [symbols=['.',  '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f']] - Symbol array
   * @returns {string} ASCII representation
   * @public
   */
  toAsciiWith (
    symbols = [
      '.',
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
      'a',
      'b',
      'c',
      'd',
      'e',
      'f'
    ]
  ) {
    return this._ascii.toAsciiWith(symbols)
  }
  // ============================================================================
  // Bitwise Operations (delegated to BitOperations helper)
  // ============================================================================

  /**
   * Bitwise OR with another bitboard
   * Union of occupied cells
   *
   * @param {bigint} bits - Bitboard to OR with
   * @returns {MaskBase|bigint} Result mask for chaining
   * @public
   */
  bitOr (bits) {
    return this._bitOps.or(bits)
  }

  /**
   * Create union mask from bits
   * @param {bigint} bits - Bits to union
   * @returns {MaskBase} Union mask
   * @public
   */
  joinFromBits (bits) {
    return this._bitOps.createUnionMask(bits)
  }

  /**
   * Join (union) with another mask
   * Modifies this mask to include cells from the other mask
   *
   * @param {MaskBase|Object} bb - Mask to join with
   * @returns {void}
   * @public
   */
  joinWith (bb) {
    if (typeof bb?.toMaskMatching === 'function') {
      bb = bb.toMaskMatching(this)
    }
    if (bb instanceof MaskBase) {
      this._validation.assertCompatibleWith(bb)
      this.joinWithBits(bb.bits)
    }
  }

  /**
   * Overlap (AND) with bits
   * Modifies this mask to only include cells present in both
   *
   * @param {bigint} bits - Bits to AND with
   * @returns {void}
   * @public
   */
  overlapWithBits (bits) {
    this.bits = this._bitOps.and(bits)
  }

  /**
   * Overlap (AND) with another mask
   * @param {MaskBase|Object} bb - Mask to overlap with
   * @returns {void}
   * @public
   */
  overlapWith (bb) {
    if (typeof bb?.toMaskMatching === 'function') {
      bb = bb.toMaskMatching(this)
    }
    if (bb instanceof MaskBase) {
      this._validation.assertCompatibleWith(bb)
      this.overlapWithBits(bb.bits)
    }
  }

  /**
   * Join (OR) with bits
   * Modifies this mask to include cells from the bits
   *
   * @param {bigint} bits - Bits to OR with
   * @returns {void}
   * @public
   */
  joinWithBits (bits) {
    this.bits = this._bitOps.or(bits)
  }

  /**
   * Bitwise AND with another bitboard
   * Intersection of occupied cells
   *
   * @param {bigint} bits - Bitboard to AND with
   * @returns {MaskBase|bigint} Result mask for chaining
   * @public
   */
  bitSub (bits) {
    return this._bitOps.subtract(bits)
  }

  /**
   * Bitwise AND operation
   * @param {bigint} bits - Bitboard to AND with
   * @returns {MaskBase|bigint} Result mask for chaining
   * @public
   */
  bitAnd (bits) {
    return this._bitOps.and(bits)
  }

  /**
   * Create intersection mask from bits
   * @param {bigint} bits - Bits to intersect
   * @returns {MaskBase} Intersection mask
   * @public
   */
  overlapFromBits (bits) {
    return this._bitOps.createIntersectionMask(bits)
  }

  /**
   * Create intersection with another mask
   * @param {MaskBase|Object} bb - Mask to overlap with
   * @returns {MaskBase} Intersection mask
   * @public
   */
  overlap (bb) {
    if (typeof bb?.toMaskMatching === 'function') {
      bb = bb.toMaskMatching(this)
    }
    this._validation.assertCompatibleWith(bb)
    return this.overlapFromBits(bb.bits)
  }

  /**
   * Create difference mask from bits
   * @param {bigint} bits - Bits to subtract
   * @returns {MaskBase} Difference mask
   * @public
   */
  takeFromBits (bits) {
    return this._bitOps.createDifferenceMask(bits)
  }

  /**
   * Create difference with another mask
   * @param {MaskBase|Object} bb - Mask to subtract
   * @returns {MaskBase} Difference mask
   * @public
   */
  take (bb) {
    if (typeof bb?.toMaskMatching === 'function') {
      bb = bb.toMaskMatching(this)
    }
    this._validation.assertCompatibleWith(bb)
    return this.takeFromBits(bb.bits)
  }

  /**
   * Subtract many bitboards from bits
   * @param {bigint} bits - Starting bits
   * @param {MaskBase[]} bbs - Masks to subtract
   * @returns {bigint} Result bits
   * @public
   */
  takeManyFromBits (bits, bbs) {
    for (const bb of bbs) {
      this._validation.assertCompatibleWith(bb)
    }
    return this.store.bitSubMany(
      bits,
      bbs.map(bb => bb.bits)
    )
  }

  /**
   * Create result mask from many subtractions
   * @param {MaskBase[]} bbs - Masks to subtract
   * @returns {MaskBase} Result mask
   * @public
   */
  takeMany (bbs) {
    const result = this.emptyMask
    result.bits = this.takeManyFromBits(this.bits, bbs)
    return result
  }

  /**
   * Create union mask with another mask
   * @param {MaskBase|Object} bb - Mask to join
   * @returns {MaskBase} Union mask
   * @public
   */
  join (bb) {
    if (typeof bb?.toMaskMatching === 'function') {
      bb = bb.toMaskMatching(this)
    }
    this._validation.assertCompatibleWith(bb)
    return this.joinFromBits(bb.bits)
  }

  /**
   * Iterate over occupied bit indices
   * @returns {Generator<number>} Generator yielding occupied bit indices
   * @public
   */
  *bitsOccupied () {
    return yield* this.store.bitsOccupied(this.bits)
  }

  /**
   * Iterate over empty bit indices
   * @returns {Generator<number>} Generator yielding empty bit indices
   * @public
   */
  *bitsEmpty () {
    return yield* this.store.bitsOccupied(this.invertedBits)
  }

  /**
   * Get bits for outer border region
   * @type {bigint}
   * @public
   */
  get outerBorderBits () {
    return this._borderRegions.getOuterBorderBits()
  }

  /**
   * Create outer border mask
   * @type {MaskBase}
   * @public
   */
  get outerBorderMask () {
    return this._borderRegions.createOuterBorderMask()
  }

  /**
   * Get bits for outer area (border plus interior)
   * @type {bigint}
   * @public
   */
  get outerAreaBits () {
    return this._borderRegions.getOuterAreaBits()
  }

  /**
   * Create outer area mask
   * @type {MaskBase}
   * @public
   */
  get outerAreaMask () {
    return this._borderRegions.createOuterAreaMask()
  }

  /**
   * Get bits for inner border region
   * @type {bigint}
   * @public
   */
  get innerBorderBits () {
    return this._borderRegions.getInnerBorderBits()
  }

  /**
   * Create inner border mask
   * @type {MaskBase}
   * @public
   */
  get innerBorderMask () {
    return this._borderRegions.createInnerBorderMask()
  }

  /**
   * Create inner area mask
   * @type {MaskBase}
   * @public
   */
  get innerAreaMask () {
    return this._borderRegions.createInnerAreaMask()
  }

  /**
   * Normalize bits to upper-left position
   * Removes leading zeros/empty space
   *
   * @returns {void}
   * @public
   */
  normalize () {
    this.bits = this.store.normalizeUpLeft(this.bits, this.width, this.height)
  }

  /**
   * Shrink mask to fit occupied cells
   * Creates new mask with only occupied region
   *
   * @returns {MaskBase} Shrunk mask
   * @public
   */
  shrinkToOccupied () {
    const { bitboard, newWidth, newHeight } = this.store.shrinkToOccupied(
      this.bits,
      this.width,
      this.height
    )
    const result = this.emptyMaskOfSize(newWidth, newHeight, this.depth)
    result.bits = bitboard
    result.width = newWidth
    result.height = newHeight
    return result
  }

  /**
   * Iterate over occupied cell locations
   * @generator
   * @yields {[number, number]} [x, y] coordinate tuples
   * @public
   */
  *occupiedLocations () {
    const all = this.store.all
    return yield* all.locations(this.bits)
  }

  /**
   * Iterate over all grid locations
   * @returns {Generator<[number, number]>} Generator yielding [row, col] tuples
   * @public
   */
  *allXYlocations () {
    const all = this.store.all
    return yield* all.locations()
  }
  // ============================================================================
  // Color Layer Operations
  // ============================================================================

  /**
   * Create single-bit mask from bits
   * @param {bigint} bits - Bits to wrap
   * @returns {MaskBase} Single-bit mask
   * @private
   */
  _createSingleBitMaskFromBits (bits) {
    const mask = this.emptyMaskOfSize(this.width, this.height, 1)
    mask.bits = bits
    return mask
  }

  /**
   * Create mask from bits with current depth
   * @param {bigint} bits - Bits to wrap
   * @returns {MaskBase} Mask with current depth
   * @private
   */
  _createMaskFromBits (bits) {
    const mask = this.emptyMaskOfSize(this.width, this.height, this.depth)
    mask.bits = bits
    return mask
  }

  /**
   * Extract bits for a specific color layer
   * @param {number} color - Color layer to extract
   * @returns {bigint} Color layer bits
   * @public
   */
  extractColorLayerBits (color) {
    return this.store.extractColorLayer(
      this.bits,
      color,
      this.width,
      this.height
    )
  }

  /**
   * Extract a color layer as a new mask
   * @param {number} color - Color layer to extract
   * @returns {MaskBase} Single-bit mask for the color
   * @public
   */
  extractColorLayer (color) {
    return this._createSingleBitMaskFromBits(this.extractColorLayerBits(color))
  }

  /**
   * Extract bits for all color layers
   * @returns {bigint[]} Array of color layer bits
   * @public
   */
  extractColorLayersBits () {
    return this.store.extractColorLayers(this.bits, this.width, this.height)
  }

  /**
   * Extract all color layers as masks
   * @returns {MaskBase[]} Array of single-bit masks
   * @public
   */
  extractColorLayers () {
    return this.extractColorLayersBits().map(bits =>
      this._createSingleBitMaskFromBits(bits)
    )
  }

  /**
   * Extract occupancy layer (which cells are occupied)
   * @returns {bigint} Occupancy layer bits
   * @public
   */
  occupancyLayerBits () {
    return this.store.occupancyLayer(this.bits)
  }

  /**
   * Create occupancy layer mask
   * @returns {MaskBase} Single-bit occupancy mask
   * @public
   */
  occupancyLayer () {
    return this._createSingleBitMaskFromBits(this.occupancyLayerBits())
  }
  // ============================================================================
  // Width/Dimension Expansion
  // ============================================================================

  /**
   * Expand bits to a wider width
   * @param {number} newWidth - Target width
   * @returns {bigint} Expanded bits
   * @public
   */
  expandBits (newWidth) {
    return this.store.expandToWidth(
      this.width,
      this.height,
      this.bits,
      newWidth
    )
  }

  /**
   * Expand mask to new dimensions
   * @param {number} newWidth - New width
   * @param {number} newHeight - New height
   * @returns {MaskBase} Expanded mask
   * @public
   */
  expand (newWidth, newHeight) {
    const bits = this.expandBits(newWidth)
    const m = this.emptyMaskOfSize(newWidth, newHeight, this.depth)
    m.bits = bits
    return m
  }

  // ============================================================================
  // Layer Composition Operations
  // ============================================================================

  /**
   * Expand layers to current width
   * Helper for layer composition operations
   *
   * @param {(bigint|Object)[]} layers - Layers to expand
   * @returns {bigint[]} Expanded layer bits
   * @private
   */
  _expandLayersToWidth (layers) {
    return layers.map(layer => {
      if (typeof layer?.expandBits === 'function') {
        return layer.expandBits(this.width)
      }
      // If it's just bits (bigint), expand them
      return this.store.expandToWidth(
        this.width,
        this.height,
        layer,
        this.width
      )
    })
  }

  /**
   * Compute background layer from mask layers
   * Background is all bits minus the provided layers
   *
   * @param {bigint[]} expandedLayers - Already-expanded layer bits
   * @returns {bigint} Background layer bits
   * @private
   */
  _computeBackgroundLayerFromMasks (expandedLayers) {
    let backgroundBits = this.cloneBits
    return this.store.bitSubMany(backgroundBits, expandedLayers)
  }

  /**
   * Add layers as new color layers to this mask
   * Returns bits for: [background, ...layers]
   *
   * @param {MaskBase[]} layers - Layers to add
   * @returns {bigint[]} Updated layer bits
   * @public
   */
  addToLayersBits (layers) {
    const expandedLayers = this._expandLayersToWidth(layers)
    const backgroundLayer =
      this._computeBackgroundLayerFromMasks(expandedLayers)
    return [backgroundLayer, ...expandedLayers]
  }

  /**
   * Add layers as new color layers, returning masks
   * @param {MaskBase[]} layers - Layers to add
   * @returns {MaskBase[]} Updated layer masks
   * @public
   */
  addToLayers (layers) {
    return this.addToLayersBits(layers).map(bits =>
      this._createSingleBitMaskFromBits(bits)
    )
  }

  /**
   * Compose layers into multi-color bitboard
   * @param {(bigint|Object)[]} layers - Layers to compose
   * @returns {bigint} Composed bits
   * @public
   */
  addLayersBits (layers) {
    const expandedLayers = this._expandLayersToWidth(layers)
    return this.store.assembleColorLayers(
      expandedLayers,
      this.width,
      this.height
    )
  }

  /**
   * Add layers and update this mask's depth and bits
   * MODIFIES THIS MASK - increases depth to accommodate new layers
   *
   * @param {MaskBase[]} layers - Layers to add
   * @returns {void}
   * @public
   */
  addLayers (layers) {
    const oldBits = this.cloneBits
    const newDepth = layers.length + 2
    this.depth = newDepth
    this.store = this.defaultStore(newDepth)
    const bitss = [...layers].map(layer => layer.bits)
    this.bits = this.addLayersBits([oldBits, ...bitss])
  }

  // ============================================================================
  // Morphological Operations (delegated to MorphologicalOps helper)
  // ============================================================================

  /**
   * Dilate (expand) the set bits by the given radius.
   * Mutates `this.bits` and returns the mask for chaining.
   *
   * @param {number} [radius=1] - Dilation radius
   * @returns {MaskBase} This mask for chaining
   * @public
   */
  dilate (radius = 1) {
    return this._morphOps.dilate(radius)
  }

  /**
   * Dilate bits by the given radius
   * @param {number} [radius=1] - Dilation radius
   * @returns {bigint} Dilated bits
   * @public
   */
  dilateBits (radius = 1) {
    return this._morphOps.dilateBits(radius)
  }

  /**
   * Dilate with border expansion
   * Creates larger grid and dilates into expanded area
   *
   * @param {number} [borderSize=1] - Border size to expand
   * @param {number} [fillValue=0] - Fill value for border
   * @returns {MaskBase} Dilated mask
   * @public
   */
  dilateExpand (borderSize = 1, fillValue = 0) {
    const newMask = this.expandBorderMask(borderSize, fillValue) || this
    const dilated = newMask.dilate()
    return dilated
  }

  /**
   * Flatten to occupancy and dilate
   * @returns {MaskBase} Dilated occupancy mask
   * @public
   */
  flatDilate () {
    const newMask = this.occupancyLayer()
    const dilated = newMask.dilate()
    return dilated
  }

  /**
   * Flatten, expand with border, then dilate
   * @param {number} [borderSize=1] - Border size to expand
   * @returns {MaskBase} Dilated mask
   * @public
   */
  flatDilateExpand (borderSize = 1) {
    const newMask = this.flattenExpandMask(borderSize) || this
    const dilated = newMask.dilate()
    return dilated
  }

  /**
   * Perform a cross (cardinal directions) dilation.
   * Mutates bits and returns `this` so callers can chain operations.
   *
   * @returns {MaskBase} This mask for chaining
   * @public
   */
  dilateCross () {
    return this._morphOps.dilateCross()
  }

  /**
   * Cross dilate bits (cardinal directions only)
   * @returns {bigint} Cross-dilated bits
   * @public
   */
  dilateCrossBits () {
    return this._morphOps.dilateCrossBits()
  }

  /**
   * Shrink the set bits by the given radius (clamped at the edges).
   * Like a morphological erosion.
   * Mutates `this.bits` and returns the mask for chaining.
   *
   * @param {number} [radius=1] - Erosion radius
   * @returns {MaskBase} This mask for chaining
   * @public
   */
  erode (radius = 1) {
    return this._morphOps.erode(radius)
  }

  /**
   * Erode bits by the given radius
   * @param {number} [radius=1] - Erosion radius
   * @returns {bigint} Eroded bits
   * @public
   */
  erodeBits (radius = 1) {
    return this._morphOps.erodeBits(radius)
  }

  /**
   * Expand mask with border (should be implemented by subclasses)
   * Creates larger mask with border fill value
   *
   * @param {number} _borderSize - Size of border to add
   * @param {number} _fillValue - Value to fill border with
   * @returns {MaskBase|null} Expanded mask or null if not implemented
   * @protected
   */
  expandBorderMask (_borderSize, _fillValue) {
    // Subclasses should implement this method if needed
    return null
  }

  /**
   * Flatten to occupancy and expand with border
   * Should be implemented by subclasses
   *
   * @param {number} _borderSize - Size of border to add
   * @returns {MaskBase|null} Flattened expanded mask or null if not implemented
   * @protected
   */
  flattenExpandMask (_borderSize) {
    // Subclasses should implement this method if needed
    return null
  }
}
