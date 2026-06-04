import { StoreBase } from './storeBase.js'
import { BigStoreMorphology } from './helpers/BigStoreMorphology.js'
import { popcountBigInt } from '../placeTools.js'
import { bitsSafeBI } from './helpers/bitHelpers.js'
import { errorMsg } from '../../core/errorMsg.js'
import { BigBits } from './helpers/bigbits.js'

const one = 1n
const zero = 0n

/**
 * @typedef {Object} EdgeMasks
 * @property {bigint} [notLeft] - Mask for bits not on left edge
 * @property {bigint} [notRight] - Mask for bits not on right edge
 */

/**
 * @typedef {Object} RowBounds
 * @property {number} minY - Minimum row index with occupied cells
 * @property {number} maxY - Maximum row index with occupied cells
 */

/**
 * @typedef {Object} ColBounds
 * @property {number} minX - Minimum column index with occupied cells
 * @property {number} maxX - Maximum column index with occupied cells
 */

/**
 * @typedef {Object} BoundingBoxResult
 * @property {number} minRow - Top row of bounding box
 * @property {number} minCol - Leftmost column of bounding box
 */

/**
 * @typedef {Object} BitsAndDimensions
 * @property {bigint} bitboard - The bitboard representation
 * @property {number} newWidth - New width after operation
 * @property {number} newHeight - New height after operation
 * @property {number} minRow - Minimum row in the shifted bitboard
 * @property {number} minCol - Minimum column in the shifted bitboard
 */

/**
 * @typedef {Object.<number, StoreBig>} MultiBitStoreCache
 */

/**
 * BigInt-based bitboard store with support for multi-bit color layers.
 * Provides bit-level manipulation, morphological operations, and color layer management.
 * Extends StoreBase with BigInt-specific implementations for efficient large bitboards.
 *
 * @extends StoreBase
 * @class StoreBig
 */
export class StoreBig extends StoreBase {
  /**
   * Constructs a StoreBig instance for BigInt-based bitboard operations.
   * Initializes storage with configurable color depth, grid dimensions, and bit precision.
   *
   * @param {number} [numOfColors=2] - Number of color layers (depth of color representation)
   * @param {number} [size=0] - Total number of cells (width × height)
   * @param {number|null} [bitLength=null] - Explicit bit length per cell (auto-calculated if null)
   * @param {number} [width=0] - Grid width in cells
   * @param {number} [height=0] - Grid height in cells
   */
  constructor (
    numOfColors = 2,
    size = 0,
    bitLength = null,
    width = 0,
    height = 0
  ) {
    super(one, zero, BigInt, numOfColors, size, bitLength, width, height)

    this.bitsPerCell = this.bitsPerCell || 1

    // Store32-compatible properties
    this.cellsPerWord = Math.floor(256 / this.bitsPerCell) // BigInt word size is larger
    this.cpwShift = Math.log2(this.cellsPerWord)
    // wordsPerRow should divide grid width by cells-per-word
    this.wordsPerRow = width ? Math.ceil(width / this.cellsPerWord) : 0
    this.maxCellInWord = this.cellsPerWord - 1

    /** @type {StoreBig|null} */
    this._singleBitStoreCache = null
    /** @type {MultiBitStoreCache} */
    this._multiBitStoreCache = {}
  }

  /**
   * Get the full bits mask for this store (overrides parent with bigint return type)
   * @returns {bigint} Mask with all bits set for the store size
   * @public
   * @override
   */
  // @ts-expect-error - Intentional override: StoreBig returns bigint, StoreBase returns number
  get fullBits () {
    const size = typeof this.size === 'bigint' ? this.size : BigInt(this.size)
    return (1n << size) - 1n
  }

  /**
   * Return whether a raw bit is set in a BigInt bitboard.
   * @param {bigint} bitboard - Source bitboard
   * @param {bigint|number} bitPosition - Bit position to check
   * @returns {boolean} True if bit at position is set
   * @public
   */
  getBitAt (bitboard, bitPosition) {
    return this.extractBit(bitboard, bitPosition) === 1n
  }

  /**
   * Extract a single bit from a BigInt bitboard.
   * @param {bigint} bitboard - Source bitboard
   * @param {bigint|number} bitPosition - Bit position to extract
   * @returns {bigint} Extracted bit value (0n or 1n)
   * @public
   */
  extractBit (bitboard, bitPosition) {
    return this.extractRange(bitboard, bitPosition, 1n)
  }

  /**
   * Iterate over occupied bit indices in the bitboard
   * @param {bigint} bitboard - Source bitboard
   * @param {number} [size] - Total number of cells
   * @returns {Generator<number>} Generator yielding occupied bit indices
   * @public
   */
  *bitsOccupied (bitboard, size) {
    const sizeParam =
      size ??
      (typeof this.size === 'bigint'
        ? Number(this.size)
        : Number(this.size) || 0)
    // @ts-expect-error - sizeParam is guaranteed to be a number at runtime
    return yield* bitsSafeBI(sizeParam, bitboard)
  }

  /**
   * Read a logical cell value from the BigInt bitboard.
   * @param {bigint} bitboard - Source bitboard
   * @param {number} idx - Cell index
   * @returns {bigint} Cell value at index
   * @public
   */
  getIdx (bitboard, idx) {
    const bitPosition = idx * this.bitsPerCell
    return this.extractCell(bitboard, bitPosition)
  }
  /**
   * Check if a cell at the given index is set (non-zero)
   * @param {bigint} bitboard - Source bitboard
   * @param {number} idx - Cell index
   * @returns {boolean} True if cell value is non-zero
   * @public
   */
  hasIdxSet (bitboard, idx) {
    return this.getIdx(bitboard, idx) > 0n
  }

  /**
   * Extract a cell-sized value from the bitboard at a raw bit position.
   * @param {bigint} bitboard - Source bitboard
   * @param {bigint|number} bitPosition - Bit position to extract from
   * @returns {bigint} Extracted cell value
   * @public
   */
  extractCell (bitboard, bitPosition) {
    return this.extractRange(bitboard, bitPosition, this.cellMask)
  }

  /**
   * Set a cell value in the bitboard.
   * @param {bigint} bitboard - Source bitboard
   * @param {number} idx - Cell index to set
   * @param {bigint|number} [value=1n] - Value to set at cell
   * @returns {bigint} Updated bitboard
   * @public
   */
  setIdx (bitboard, idx, value = 1n) {
    const bitPosition = BigInt(idx * this.bitsPerCell)
    const color = BigInt(value)
    return this.setCellBitsAt(bitPosition, bitboard, color)
  }

  /**
   * Replace the bits for a specific cell in a BigInt bitboard.
   * @param {bigint|number} bitPosition - Bit position for the cell
   * @param {bigint} bitboard - Source bitboard
   * @param {bigint|number} value - Value to set at position
   * @returns {bigint} Updated bitboard
   * @public
   */
  setCellBitsAt (bitPosition, bitboard, value) {
    const pos =
      typeof bitPosition === 'bigint' ? bitPosition : BigInt(bitPosition)
    const mask = BigInt(this.cellMask) << pos
    return (bitboard & ~mask) | (BigInt(this.clampToCell(value)) << pos)
  }

  /**
   * Invert all bits in the bitboard (bitwise NOT)
   * @param {bigint} bitboard - Source bitboard
   * @returns {bigint} Inverted bitboard
   * @public
   */
  invertedBits (bitboard) {
    if (bitboard === 0n) return this.fullBits
    return this.fullBits & ~bitboard
  }

  /**
   * Count the number of occupied (non-zero) cells in the bitboard
   * @param {bigint} bitboard - Source bitboard
   * @returns {number} Number of occupied cells
   * @public
   */
  occupancy (bitboard) {
    return popcountBigInt(bitboard)
  }
  /**
   * Process occupancy for 1-bit storage across multiple words
   * @param {bigint[]} sourceWords - Array of bitboard words
   * @param {number} gridWidth - Grid width in cells
   * @param {number} gridHeight - Grid height in cells
   * @returns {bigint} Combined occupancy bitboard
   * @public
   */
  occupancy1Bit (sourceWords, gridWidth, gridHeight) {
    const cellMask = this.cellMask
    const totalCells = gridWidth * gridHeight
    let outputBitIndex = 0n
    let outputBitboard = 0n

    for (const word of sourceWords) {
      outputBitboard = this.processWordForOccupancy(
        word,
        cellMask,
        totalCells,
        outputBitIndex,
        outputBitboard
      )
      outputBitIndex += BigInt(this.cellsPerWord)
      if (outputBitIndex >= BigInt(totalCells)) break
    }
    return outputBitboard
  }

  /**
   * Process a single word for occupancy calculation
   * @param {bigint} word - Word to process
   * @param {bigint} cellMask - Mask for cell extraction
   * @param {number} totalCells - Total cells in grid
   * @param {bigint} startBitIndex - Starting bit index in output
   * @param {bigint} accumulatedBitboard - Accumulated result bitboard
   * @returns {bigint} Updated accumulated bitboard
   * @private
   */
  processWordForOccupancy (
    word,
    cellMask,
    totalCells,
    startBitIndex,
    accumulatedBitboard
  ) {
    let currentWord = word
    let outputBitIndex = startBitIndex
    let result = accumulatedBitboard

    for (
      let cellIndex = 0;
      cellIndex < this.cellsPerWord && outputBitIndex < BigInt(totalCells);
      cellIndex++
    ) {
      const cellValue = this.extractCellValue(currentWord, cellMask)
      if (cellValue != 0n) {
        result = this.setBitInBigInt(result, outputBitIndex)
      }
      currentWord = this.shiftWordToCellMask(currentWord)
      outputBitIndex++
    }
    return result
  }

  /**
   * Extract cell value from a word (overrides StoreBase for BigInt)
   * @param {bigint} word - Source word
   * @param {bigint} cellMask - Mask to extract cell
   * @returns {bigint} Extracted cell value (not number like base class)
   * @private
   * @override
   */
  // @ts-expect-error - Intentional override: StoreBig returns bigint, StoreBase returns number
  extractCellValue (word, cellMask) {
    return BigInt(word) & BigInt(cellMask)
  }

  /**
   * Set a bit at the given index in a BigInt bitboard
   * @param {bigint} biValue - Source bitboard
   * @param {bigint|number} bitIndex - Bit index to set
   * @returns {bigint} Updated bitboard with bit set
   * @private
   */
  setBitInBigInt (biValue, bitIndex) {
    const idx = typeof bitIndex === 'bigint' ? bitIndex : BigInt(bitIndex)
    return biValue | (1n << idx)
  }

  /**
   * Shift word right by bit width (to next cell)
   * @param {bigint} word - Source word
   * @returns {bigint} Right-shifted word
   * @private
   */
  shiftWordToCellMask (word) {
    return word >> this.bitWidth
  }

  // Bitwise operations for BigInt
  /**
   * Check if two bitboards are equal
   * @param {bigint|null} a - First bitboard
   * @param {bigint|null} b - Second bitboard
   * @returns {boolean} True if bitboards are equal
   * @public
   */
  bitEqual (a, b) {
    if (a == null || b == null) return false
    return a === b
  }
  /**
   * Bitwise OR operation (union)
   * @param {bigint} a - First bitboard
   * @param {bigint} b - Second bitboard
   * @returns {bigint} Result of a | b
   * @public
   */
  bitOr (a, b) {
    return a | b
  }

  /**
   * Bitwise AND operation (intersection)
   * @param {bigint} a - First bitboard
   * @param {bigint} b - Second bitboard
   * @returns {bigint} Result of a & b
   * @public
   */
  bitAnd (a, b) {
    return a & b
  }

  /**
   * Bitwise subtraction (difference)
   * @param {bigint} a - First bitboard
   * @param {bigint} b - Second bitboard (bits to remove)
   * @returns {bigint} Result of a & ~b
   * @public
   */
  bitSub (a, b) {
    return a & ~b
  }
  /**
   * Bitwise subtraction of three bitboards
   * @param {bigint} a - First bitboard
   * @param {bigint} b - Second bitboard (bits to remove)
   * @param {bigint} c - Third bitboard (bits to remove)
   * @returns {bigint} Result of a & ~b & ~c
   * @public
   */
  bitSub3 (a, b, c) {
    return a & ~b & ~c
  }
  /**
   * Subtract multiple bitboards from a base bitboard
   * @param {bigint} a - Base bitboard
   * @param {bigint[]} bs - Array of bitboards to subtract
   * @returns {bigint} Result of a & ~b1 & ~b2 & ...
   * @public
   */
  bitSubMany (a, bs) {
    let result = a
    for (const b of bs) {
      result &= ~b
    }
    return result
  }
  /**
   * Clone a bitboard (identity for BigInt since immutable)
   * @param {bigint} bb - Bitboard to clone
   * @returns {bigint} The same bitboard
   * @public
   */
  clone (bb) {
    return bb
  }

  // Bit shifting operations for BigInt
  /**
   * Shift bits left or right
   * @param {bigint} src - Source bitboard
   * @param {number} shift - Shift amount (positive=left, negative=right)
   * @returns {bigint} Shifted bitboard
   * @public
   */
  shiftBits (src, shift) {
    if (shift === 0) return src
    if (shift > 0) return src << BigInt(shift)
    return src >> BigInt(-shift)
  }

  /**
   * Apply a mask to a bitboard then shift the result right by a number of bits.
   * Keeps types consistent and centralizes the masked-right-shift pattern.
   * @param {bigint|number} bitboard - Source bitboard
   * @param {bigint|number} mask - Mask to apply before shifting
   * @param {number} shift - Number of bits to shift right (positive integer)
   * @returns {bigint} Masked and shifted bitboard
   */
  maskedShiftRight (bitboard, mask, shift) {
    const bb = typeof bitboard === 'bigint' ? bitboard : BigInt(bitboard)
    const m = typeof mask === 'bigint' ? mask : BigInt(mask)
    return (bb & m) >> BigInt(shift)
  }

  /**
   * Apply a mask to a bitboard then shift the result left by a number of bits.
   * @param {bigint|number} bitboard - Source bitboard
   * @param {bigint|number} mask - Mask to apply before shifting
   * @param {number} shift - Number of bits to shift left (positive integer)
   * @returns {bigint} Masked and shifted bitboard
   */
  maskedShiftLeft (bitboard, mask, shift) {
    const bb = typeof bitboard === 'bigint' ? bitboard : BigInt(bitboard)
    const m = typeof mask === 'bigint' ? mask : BigInt(mask)
    return (bb & m) << BigInt(shift)
  }

  // Template method implementations
  /**
   * Create an empty bitboard template (internal use, helper for subclasses)
   * @param {*} _template - Template parameter (unused)
   * @returns {bigint} Empty bitboard (0n)
   * @private
   * @internal
   * @deprecated - Kept for potential future template pattern use
   */
  // @ts-ignore - Method may not be used, kept for template method pattern
  createEmptyBitboard (_template) {
    return 0n
  }

  /**
   * Create an empty bitboard for given size (overrides StoreBase)
   * @param {number} _size - Size parameter (unused)
   * @returns {bigint} Empty bitboard (0n)
   * @public
   * @override
   */
  // @ts-expect-error - Intentional override: StoreBig.empty() is a method, StoreBase.empty is a property
  empty (_size) {
    return 0n
  }

  // ============================================================================
  // Edge Mask Preparation (using base class helpers)
  // ============================================================================
  /**
   * Fast 4-neighbor dilation (no wrapping) for 1-bit bitboards.
   * Applies left/right/up/down expansion while respecting edge masks.
   * @param {bigint} bitboard - Source 1-bit bitboard
   * @param {number} gridWidth - Grid width used for vertical shifts
   * @param {Object} [edgeMasks] - Optional edge masks: { notLeft, notRight }
   * @param {bigint} [edgeMasks.notLeft] - Mask for bits not on left edge
   * @param {bigint} [edgeMasks.notRight] - Mask for bits not on right edge
   * @returns {bigint} Dilated bitboard
   * @public
   */
  dilateCrossFast (bitboard, gridWidth, edgeMasks) {
    const notLeft = edgeMasks?.notLeft ?? this.fullBits
    const notRight = edgeMasks?.notRight ?? this.fullBits

    const left = this.maskedShiftRight(bitboard, notLeft, 1)
    const right = this.maskedShiftLeft(bitboard, notRight, 1)

    const up = this.shiftBits(bitboard, -gridWidth)
    const down = this.shiftBits(bitboard, gridWidth)

    return BigInt(this.combineMasked(bitboard, left, right, up, down))
  }

  /**
   * Dilate horizontally with wrapping around row boundaries
   * @param {bigint} bitboard - Source bitboard
   * @param {number} gridWidth - Grid width
   * @param {number} gridHeight - Grid height
   * @returns {bigint} Dilated bitboard
   * @public
   */
  dilateHorizontalWrapStep (bitboard, gridWidth, gridHeight) {
    const leftRotated = this.rotateRowBits(bitboard, gridWidth, gridHeight, -1)
    const rightRotated = this.rotateRowBits(bitboard, gridWidth, gridHeight, 1)

    return BigInt(this.combineMasked(bitboard, leftRotated, rightRotated))
  }

  // Per-cell horizontal expansion for multi-bit stores
  /**
   * @param {bigint} bitboard
   * @returns {bigint}
   */
  /**
   * Per-cell horizontal expansion for multi-bit stores
   * @param {bigint} bitboard - Source bitboard
   * @returns {bigint} Horizontally expanded bitboard
   * @public
   */
  expandHorizontallyCellwise (bitboard) {
    return BigStoreMorphology.expandAdjacentCellsHorizontally(this, bitboard)
  }

  // Per-cell vertical propagation for multi-bit stores
  /**
   * Per-cell vertical propagation for multi-bit stores
   * @param {bigint} bitboard - Source bitboard
   * @param {number} gridWidth - Grid width
   * @returns {bigint} Vertically propagated bitboard
   * @public
   */
  propagateVerticalCellwise (bitboard, gridWidth) {
    return BigStoreMorphology.propagateAdjacentCellsVertically(
      this,
      bitboard,
      gridWidth
    )
  }

  // Shift-based vertical propagation for 1-bit stores
  /**
   * Shift-based vertical propagation for 1-bit stores
   * @param {bigint} bitboard - Source bitboard
   * @param {number} gridWidth - Grid width
   * @param {Object} edgeMasks - Edge masks for boundary handling
   * @param {bigint} [edgeMasks.notTop] - Mask for bits not on top edge
   * @param {bigint} [edgeMasks.notBottom] - Mask for bits not on bottom edge
   * @returns {bigint} Vertically propagated bitboard
   * @public
   */
  propagateVerticalShift (bitboard, gridWidth, edgeMasks) {
    return BigStoreMorphology.propagateVerticalShift(
      this,
      bitboard,
      gridWidth,
      edgeMasks
    )
  }

  // Per-cell horizontal erosion for multi-bit stores
  /**
   * Per-cell horizontal erosion for multi-bit stores
   * @param {bigint} bitboard - Source bitboard
   * @returns {bigint} Horizontally eroded bitboard
   * @public
   */
  erodeHorizontalCellwise (bitboard) {
    return BigStoreMorphology.erodeHorizontalCells(this, bitboard)
  }

  // ============================================================================
  // Cell Boundary Erosion (using base class neighbor checks)
  // ============================================================================

  // Per-cell vertical erosion for multi-bit stores
  /**
   * Per-cell vertical erosion for multi-bit stores
   * @param {bigint} bitboard - Source bitboard
   * @param {number} gridWidth - Grid width
   * @returns {bigint} Vertically eroded bitboard
   * @public
   */
  erodeVerticalCellwise (bitboard, gridWidth) {
    return BigStoreMorphology.erodeVerticalCells(this, bitboard, gridWidth)
  }

  // Shift-based horizontal erosion for 1-bit stores
  /**
   * Shift-based horizontal erosion for 1-bit stores
   * @param {bigint} bitboard - Source bitboard
   * @param {Object} edgeMasks - Edge masks for boundary handling
   * @param {bigint} [edgeMasks.notLeft] - Mask for bits not on left edge
   * @param {bigint} [edgeMasks.notRight] - Mask for bits not on right edge
   * @returns {bigint} Horizontally eroded bitboard
   * @public
   */
  erodeHorizontalShift (bitboard, edgeMasks) {
    return BigStoreMorphology.erodeHorizontalShift(this, bitboard, edgeMasks)
  }

  // ============================================================================
  // Horizontal Erosion - Constraint Computation
  // ============================================================================
  /**
   * Compute inverted left edge mask
   * @param {Object} edgeMasks - Edge mask configuration
   * @param {bigint} [edgeMasks.notLeft] - Mask for bits not on left edge
   * @returns {bigint} Inverted left edge mask
   * @public
   */
  computeInvertedLeftMask (edgeMasks) {
    return BigStoreMorphology.computeInvertedEdgeMask(
      this,
      edgeMasks,
      'notLeft'
    )
  }

  /**
   * Compute inverted right edge mask
   * @param {Object} edgeMasks - Edge mask configuration
   * @param {bigint} [edgeMasks.notRight] - Mask for bits not on right edge
   * @returns {bigint} Inverted right edge mask
   * @public
   */
  computeInvertedRightMask (edgeMasks) {
    return BigStoreMorphology.computeInvertedEdgeMask(
      this,
      edgeMasks,
      'notRight'
    )
  }

  /**
   * Compute horizontal erosion constraints
   * @param {bigint} bitboard - Source bitboard
   * @param {Object} edgeMasks - Edge mask configuration
   * @param {bigint} [edgeMasks.notLeft] - Mask for bits not on left edge
   * @param {bigint} [edgeMasks.notRight] - Mask for bits not on right edge
   * @param {number} bitShift - Bit shift amount
   * @returns {{leftConstraint: bigint, rightConstraint: bigint}} Erosion constraints
   * @public
   */
  computeHorizontalErodeConstraints (bitboard, edgeMasks, bitShift) {
    return BigStoreMorphology.computeHorizontalErodeConstraints(
      this,
      bitboard,
      edgeMasks,
      bitShift
    )
  }

  // Shift-based vertical erosion for 1-bit stores
  /**
   * Shift-based vertical erosion for 1-bit stores
   * @param {bigint} bitboard - Source bitboard
   * @param {number} gridWidth - Grid width
   * @param {Object} edgeMasks - Edge masks for boundary handling
   * @param {bigint} [edgeMasks.notTop] - Mask for bits not on top edge
   * @param {bigint} [edgeMasks.notBottom] - Mask for bits not on bottom edge
   * @returns {bigint} Vertically eroded bitboard
   * @public
   */
  erodeVerticalShift (bitboard, gridWidth, edgeMasks) {
    return BigStoreMorphology.erodeVerticalShift(
      this,
      bitboard,
      gridWidth,
      edgeMasks
    )
  }

  // ============================================================================
  // Vertical Erosion - Constraint Computation
  // ============================================================================
  /**
   * Compute vertical erosion constraints
   * @param {bigint} bitboard - Source bitboard
   * @param {number} gridWidth - Grid width
   * @param {Object} edgeMasks - Edge mask configuration
   * @param {bigint} [edgeMasks.notTop] - Mask for bits not on top edge
   * @param {bigint} [edgeMasks.notBottom] - Mask for bits not on bottom edge
   * @returns {{upConstraint: bigint, downConstraint: bigint}} Erosion constraints
   * @public
   */
  computeVerticalErodeConstraints (bitboard, gridWidth, edgeMasks) {
    return BigStoreMorphology.computeVerticalErodeConstraints(
      this,
      bitboard,
      gridWidth,
      edgeMasks
    )
  }

  /**
   * Vertical erosion step with clamping
   * @param {bigint} bitboard - Source bitboard
   * @param {number} gridWidth - Grid width
   * @param {Object} edgeMasks - Edge masks for boundary handling
   * @returns {bigint} Eroded bitboard
   * @public
   */
  erodeVerticalClampStep (bitboard, gridWidth, edgeMasks) {
    // Use per-cell erosion for multi-bit stores, shift-based for 1-bit
    if (this.isMultiBit) {
      return this.erodeVerticalCellwise(bitboard, gridWidth)
    }
    return this.erodeVerticalShift(bitboard, gridWidth, edgeMasks)
  }

  /**
   * Horizontal erosion step with clamping
   * @param {bigint} bitboard - Source bitboard
   * @param {Object} edgeMasks - Edge masks for boundary handling
   * @returns {bigint} Eroded bitboard
   * @public
   */
  erodeHorizontalClampStep (bitboard, edgeMasks) {
    // Use per-cell erosion for multi-bit stores, shift-based for 1-bit
    if (this.isMultiBit) {
      return this.erodeHorizontalCellwise(bitboard)
    }
    return this.erodeHorizontalShift(bitboard, edgeMasks)
  }

  /**
   * Horizontal dilation step with edge masking
   * @param {bigint} bitboard - Source bitboard
   * @param {Object} edgeMasks - Edge masks for boundary handling
   * @returns {bigint} Dilated bitboard
   * @public
   */
  dilateHorizontalStep (bitboard, edgeMasks) {
    // Use per-cell expansion for multi-bit stores, shift-based for 1-bit
    if (this.isMultiBit) {
      return this.expandHorizontallyCellwise(bitboard)
    }
    // Mask source bits before shifting to avoid wrap-around
    const srcForLeft = this.prepareSrcForLeftExpansion(bitboard, edgeMasks)
    const srcForRight = this.prepareSrcForRightExpansion(bitboard, edgeMasks)

    const leftShifted = this.shiftBits(srcForLeft, -1)
    const rightShifted = this.shiftBits(srcForRight, 1)

    return BigInt(this.combineMasked(bitboard, leftShifted, rightShifted))
  }

  /**
   * Vertical dilation step with edge masking
   * @param {bigint} bitboard - Source bitboard
   * @param {number} gridWidth - Grid width
   * @param {Object} edgeMasks - Edge masks for boundary handling
   * @returns {bigint} Dilated bitboard
   * @public
   */
  dilateVerticalStep (bitboard, gridWidth, edgeMasks) {
    // Use per-cell propagation for multi-bit stores, shift-based for 1-bit
    if (this.isMultiBit) {
      return this.propagateVerticalCellwise(bitboard, gridWidth)
    }
    return this.propagateVerticalShift(bitboard, gridWidth, edgeMasks)
  }

  /**
   * Rotate bits in a single row (helper for internal use, may be used in future optimizations)
   * @param {bigint} sourceBitboard - Source bitboard
   * @param {number} gridWidth - Grid width
   * @param {number} rowIndex - Row to rotate
   * @param {number} shiftAmount - Rotation amount (positive=right, negative=left)
   * @returns {bigint} Rotated row within bitboard
   * @private
   * @internal
   * @deprecated - Kept for potential future row rotation optimizations
   */
  // @ts-ignore - Method may not be used, kept for row rotation pattern
  rotateRowBitsForSingleRow (sourceBitboard, gridWidth, rowIndex, shiftAmount) {
    let rotatedRow = 0n
    const rowStart = BigInt(rowIndex) * BigInt(gridWidth)
    const normalizedShift = ((shiftAmount % gridWidth) + gridWidth) % gridWidth

    for (let colIndex = 0n; colIndex < BigInt(gridWidth); colIndex++) {
      const sourceColIndex =
        (colIndex - BigInt(normalizedShift) + BigInt(gridWidth)) %
        BigInt(gridWidth)
      const sourceBitPosition = rowStart + sourceColIndex
      const destinationBitPosition = rowStart + colIndex

      if (this.getBitAt(sourceBitboard, sourceBitPosition)) {
        rotatedRow = this.setBitInBigInt(rotatedRow, destinationBitPosition)
      }
    }
    return rotatedRow
  }

  // Bit helpers for individual bit access

  // Utility functions
  /**
   * Check if bitboard is empty (all zeros)
   * @param {bigint} bitboard - Bitboard to check
   * @returns {boolean} True if bitboard is empty
   * @public
   */
  isEmpty (bitboard) {
    return bitboard === 0n
  }

  /**
   * Check if a cell in a word is occupied (non-zero)
   * @param {bigint} word - Word to check
   * @returns {boolean} True if cell value is non-zero
   * @public
   */
  isCellOccupied (word) {
    return BigInt(this.clampToCell(word)) !== 0n
  }
  /**
   * Extract a range of bits from a bitboard
   * @param {bigint|number} bitboard - Source bitboard
   * @param {bigint|number} bitPosition - Starting bit position
   * @param {bigint|number} rangeMask - Mask for range
   * @returns {bigint} Extracted range
   * @throws {Error} If extraction fails
   * @public
   */
  extractRange (bitboard, bitPosition, rangeMask) {
    try {
      const pos =
        typeof bitPosition === 'bigint' ? bitPosition : BigInt(bitPosition)
      const bb = typeof bitboard === 'bigint' ? bitboard : BigInt(bitboard)
      const mask = typeof rangeMask === 'bigint' ? rangeMask : BigInt(rangeMask)
      return (bb >> pos) & mask
    } catch (error) {
      throw new Error(
        errorMsg('Error in extractRange', {
          bitboard,
          bitPosition,
          rangeMask,
          error
        })
      )
    }
  }
  /**
   * Extract row at a specific index from bitboard (overrides StoreBase for BigInt)
   * @param {bigint} bitboard - Source bitboard
   * @param {number} rowIndex - Row index
   * @param {number} gridWidth - Grid width
   * @param {bigint} rowMaskForWidth - Row mask
   * @returns {bigint} Row bits (not number like base class)
   * @private
   * @override
   */
  // @ts-expect-error - Intentional override: StoreBig returns bigint, StoreBase returns number
  extractRowAtIndex (bitboard, rowIndex, gridWidth, rowMaskForWidth) {
    const rowStart = this.bitPos(Number(rowIndex) * Number(gridWidth))
    return this.extractRange(bitboard, rowStart, rowMaskForWidth)
  }

  /**
   * Expand bitboard to a square grid if needed
   * @param {bigint} bits - Source bitboard
   * @param {number} gridHeight - Current grid height
   * @param {number} gridWidth - Current grid width
   * @returns {bigint} Expanded square bitboard
   * @public
   */
  expandToSquare (bits, gridHeight, gridWidth) {
    if (gridHeight === gridWidth) return bits
    const N = Math.max(gridHeight, gridWidth)
    return this.expandToWidth(gridWidth, gridHeight, bits, N)
  }

  /**
   * Map rows from one width to another with transformation
   * @param {bigint} bits - Source bitboard
   * @param {number} width - Current width
   * @param {number} height - Height
   * @param {number} newWidth - Target width
   * @param {function} transform - Transformation function taking (rowBits: bigint, rowIndex: number): bigint
   * @returns {bigint} Transformed bitboard
   * @private
   */
  mapRows (bits, width, height, newWidth, transform) {
    let result = 0n
    const minWidth = Math.min(width, newWidth)
    const grid = this.grid(minWidth, height)
    const rowMask = BigInt(grid.rowMask())

    for (const row of grid.rows()) {
      const rowBits = this.extractRowAtIndex(bits, row, width, rowMask)
      /** @type {bigint} */
      const newRow = transform(rowBits, row)
      result |= BigInt(newRow) << BigInt(this.bitPos(row * newWidth))
    }

    return result
  }
  /**
   * Expand bitboard to new width
   * @param {number} gridWidth - Current grid width
   * @param {number} gridHeight - Grid height
   * @param {bigint} bits - Source bitboard
   * @param {number} newWidth - Target width
   * @returns {bigint} Expanded bitboard
   * @public
   */
  expandToWidth (gridWidth, gridHeight, bits, newWidth) {
    /** @param {bigint} row */
    const transform = row => row
    return this.mapRows(bits, gridWidth, gridHeight, newWidth, transform)
  }

  /**
   * Shrink bitboard to new width
   * @param {number} gridWidth - Current grid width
   * @param {bigint} bits - Source bitboard
   * @param {number} newWidth - Target width
   * @param {number} newHeight - Target height
   * @returns {bigint} Shrunk bitboard
   * @public
   */
  shrinkTo (gridWidth, bits, newWidth, newHeight) {
    /** @param {bigint} row */
    const transform = row => row
    return this.mapRows(bits, gridWidth, newHeight, newWidth, transform)
  }

  /**
   * Expand bitboard to new width with column offset
   * @param {number} gridWidth - Current grid width
   * @param {number} gridHeight - Grid height
   * @param {bigint} bits - Source bitboard
   * @param {number} newWidth - Target width
   * @param {number} [offsetBits=0] - Bit offset in columns
   * @returns {bigint} Expanded bitboard with offset
   * @public
   */
  expandToWidthWithOffset (
    gridWidth,
    gridHeight,
    bits,
    newWidth,
    offsetBits = 0
  ) {
    let out = 0n
    const grid = this.grid(gridWidth, gridHeight)
    const rowMaskForWidth = grid.rowMask()

    for (const rowIndex of grid.rows()) {
      const row = this.extractRowAtIndex(
        bits,
        rowIndex,
        gridWidth,
        rowMaskForWidth
      )
      out |=
        BigInt(row) << BigInt(this.bitPos(rowIndex * newWidth + offsetBits))
    }
    return out
  }

  /**
   * Expand bitboard with X and Y coordinate offsets
   * @param {number} gridWidth - Current grid width
   * @param {number} gridHeight - Grid height
   * @param {bigint} bits - Source bitboard
   * @param {number} newWidth - Target width
   * @param {number} [offsetX=0] - X offset in columns
   * @param {number} [offsetY=0] - Y offset in rows
   * @returns {bigint} Expanded bitboard with offsets
   * @public
   */
  expandToWidthWithXYOffset (
    gridWidth,
    gridHeight,
    bits,
    newWidth,
    offsetX = 0,
    offsetY = 0
  ) {
    let out = 0n
    const grid = this.grid(gridWidth, gridHeight)
    const rowMaskForWidth = BigInt(grid.rowMask())

    for (const rowIndex of grid.rows()) {
      const row = this.extractRowAtIndex(
        bits,
        rowIndex,
        gridWidth,
        rowMaskForWidth
      )
      out |= BigInt(row) << BigInt(this.bitPos(rowIndex * newWidth + offsetX))
    }
    return out << BigInt(this.bitPos(offsetY * newWidth))
  }

  /**
   * Expand bitboard to higher bits per cell
   * @param {bigint} bitboard - Source bitboard
   * @param {number} newBitsPerCell - Target bits per cell (number of bits to expand to)
   * @returns {bigint} Expanded bitboard
   * @public
   */
  expandToBitsPerCell (bitboard, newBitsPerCell) {
    const oldBitsPerCell = this.bitsPerCell

    if (oldBitsPerCell === newBitsPerCell) return bitboard
    if (newBitsPerCell < oldBitsPerCell) {
      return this.shrinkToBitsPerCell(bitboard, newBitsPerCell)
    }
    const newStore = this.storeWith(newBitsPerCell)
    let output = 0n

    for (const [i, cellValue] of this.all.indexAndValues(bitboard)) {
      output = newStore.setIdx(output, i, cellValue)
    }

    return output
  }

  /**
   * Shrink bitboard to lower bits per cell
   * @param {bigint} bitboard - Source bitboard
   * @param {number} newDepth - Target bits per cell
   * @returns {bigint} Shrunk bitboard
   * @public
   */
  shrinkToBitsPerCell (bitboard, newDepth) {
    const oldBitsPerCell = this.bitsPerCell
    const newBitsPerCell = newDepth

    if (oldBitsPerCell === newBitsPerCell) return bitboard
    if (newBitsPerCell > oldBitsPerCell) {
      return this.expandToBitsPerCell(bitboard, newBitsPerCell)
    }

    const newCellMask = this.rangeMaskForSize(newBitsPerCell)
    let output = 0n
    const newStore = this.storeWith(newBitsPerCell)

    for (const [i, value] of this.all.indexAndValues(bitboard)) {
      const cellValue = value & newCellMask
      output = newStore.setIdx(output, i, cellValue)
    }
    return output
  }
  /**
   * Create a 1-bit bitboard representing occupancy of non-zero colors.
   * Each cell with a non-zero color value becomes a 1-bit, others become 0-bits.
   * @param {bigint} bitboard - Multi-color bitboard
   * @returns {bigint} 1-bit bitboard showing which cells have non-zero colors
   * @public
   */
  occupancyLayer (bitboard) {
    const oldBitsPerCell = this.bitsPerCell
    const newBitsPerCell = 1

    if (oldBitsPerCell === newBitsPerCell) return bitboard

    let output = 0n
    const newStore = this.singleBitStore

    for (const i of this.all.occupiedIndices(bitboard)) {
      output = newStore.setIdx(output, i, 1n)
    }
    return output
  }

  /**
   * Create a 1-bit bitboard representing occupancy within grid dimensions.
   * Each cell with a non-zero color value becomes a 1-bit, others become 0-bits.
   * @param {bigint} bitboard - Multi-color bitboard
   * @param {number} gridWidth - Grid width
   * @param {number} gridHeight - Grid height
   * @returns {bigint} 1-bit bitboard showing which cells have non-zero colors
   * @public
   */
  occupancyLayerOfSize (bitboard, gridWidth, gridHeight) {
    let resultBitboard = 0n
    const singleBitStore = this.singleBitStore
    // Create a 1-bit bitboard with one bit per occupied cell
    // Each occupied cell maps to exactly 1 bit in the output
    for (const i of this.grid(gridWidth, gridHeight).occupiedIndices(
      bitboard
    )) {
      resultBitboard = singleBitStore.setIdx(resultBitboard, i)
    }
    return resultBitboard
  }
  //(bitboard >> BigInt(bitPosition)) & rangeMask
  /**
   * Find minimum and maximum row indices with occupied cells
   * @param {bigint} bitboard - Source bitboard
   * @param {number} gridHeight - Grid height
   * @param {number} gridWidth - Grid width
   * @returns {RowBounds|null} Row bounds or null if empty
   * @public
   */
  findRowBounds (bitboard, gridHeight, gridWidth) {
    gridHeight = gridHeight || this.height || Number.POSITIVE_INFINITY
    gridWidth = gridWidth || this.width || Number.POSITIVE_INFINITY
    let minRowIndex = gridHeight
    let maxRowIndex = -1

    for (let rowIndex = 0; rowIndex < gridHeight; rowIndex++) {
      const rowOccupancyMask = this.extractRowOccupancy(
        bitboard,
        rowIndex,
        gridWidth
      )

      if (rowOccupancyMask !== 0n) {
        minRowIndex = Math.min(minRowIndex, rowIndex)
        maxRowIndex = Math.max(maxRowIndex, rowIndex)
      }
    }

    return minRowIndex <= maxRowIndex
      ? { minY: minRowIndex, maxY: maxRowIndex }
      : null
  }

  /**
   * Extract occupancy of a single row
   * @param {bigint} bitboard - Source bitboard
   * @param {number} rowIndex - Row index to extract
   * @param {number} gridWidth - Grid width
   * @returns {bigint} Row occupancy bitboard
   * @public
   */
  extractRowOccupancy (bitboard, rowIndex, gridWidth) {
    // Extract the contiguous row bits for the given row index using a row mask
    gridWidth = gridWidth || this.width
    const rowMaskForWidth = BigInt(this.rowMaskForWidth(gridWidth))
    return this.extractRowAtIndex(
      bitboard,
      rowIndex,
      gridWidth,
      rowMaskForWidth
    )
  }

  /**
   * Find minimum and maximum column indices with occupied cells
   * @param {bigint} bitboard - Source bitboard
   * @param {number} minRowIndex - Minimum row to check
   * @param {number} maxRowIndex - Maximum row to check
   * @param {number} gridWidth - Grid width
   * @returns {ColBounds|null} Column bounds or null if empty
   * @public
   */
  findColBounds (bitboard, minRowIndex, maxRowIndex, gridWidth) {
    gridWidth = gridWidth || this.width || Number.POSITIVE_INFINITY
    let minColIndex = gridWidth
    let maxColIndex = -1

    for (let rowIndex = minRowIndex; rowIndex <= maxRowIndex; rowIndex++) {
      const rowStart = rowIndex * gridWidth

      for (let colIndex = 0; colIndex < gridWidth; colIndex++) {
        const idx = rowStart + colIndex
        if (this.hasIdxSet(bitboard, idx)) {
          minColIndex = Math.min(minColIndex, colIndex)
          maxColIndex = Math.max(maxColIndex, colIndex)
        }
      }
    }

    return minColIndex <= maxColIndex
      ? { minX: minColIndex, maxX: maxColIndex }
      : null
  }

  /**
   * Check if a specific bit position is set
   * @param {bigint} bitboard - Source bitboard
   * @param {bigint|number} bitPosition - Bit position to check
   * @returns {boolean} True if bit is set
   * @public
   */
  isBitSet (bitboard, bitPosition) {
    return this.extractBit(bitboard, bitPosition) === 1n
  }

  /**
   * Find the most significant bit index
   * @param {bigint} value - Value to check
   * @returns {number} Index of most significant bit (-1 if zero)
   * @public
   */
  msbIndex (value) {
    let mostSignificantBitIndex = -1
    let currentValue = value

    while (currentValue > zero) {
      currentValue >>= one
      mostSignificantBitIndex++
    }
    return mostSignificantBitIndex
  }

  /**
   * Find the bounding box of occupied cells
   * @param {number} gridWidth - Grid width
   * @param {number} gridHeight - Grid height
   * @param {bigint} bitboard - Source bitboard
   * @returns {BoundingBoxResult} Bounding box with minRow and minCol
   * @public
   */
  boundingBox (gridWidth, gridHeight, bitboard) {
    const rowMaskForWidth = BigInt(this.rowMaskForWidth(gridWidth))
    let minRowIndex = gridHeight
    let minColIndex = gridWidth

    for (let rowIndex = 0; rowIndex < gridHeight; rowIndex++) {
      const rowBits = this.extractRowAtIndex(
        bitboard,
        rowIndex,
        gridWidth,
        rowMaskForWidth
      )
      if (rowBits === zero) continue

      minRowIndex = Math.min(minRowIndex, rowIndex)
      const colPosOfFirstBit = this.countTrailingZeros(rowBits)
      const colIndexOfFirstBit = Math.floor(colPosOfFirstBit / this.bitsPerCell)
      minColIndex = Math.min(minColIndex, colIndexOfFirstBit)
    }
    return { minRow: minRowIndex, minCol: minColIndex }
  }

  /**
   * Normalize bitboard to upper-left corner (remove leading zeros)
   * @param {bigint} bitboard - Source bitboard
   * @param {number} gridHeight - Grid height
   * @param {number} gridWidth - Grid width
   * @returns {bigint} Normalized bitboard
   * @public
   */
  normalizeUpLeft (bitboard, gridHeight, gridWidth) {
    if (bitboard === zero) return bitboard
    const { minRow: minRowIndex, minCol: minColIndex } = this.boundingBox(
      gridWidth,
      gridHeight,
      bitboard
    )
    return this.shiftTo(
      gridWidth,
      minRowIndex,
      gridHeight,
      bitboard,
      minColIndex
    )
  }

  /**
   * Compute a mask for a bit range
   * @param {number} startIndex - Start index (inclusive)
   * @param {number} endIndex - End index (exclusive)
   * @returns {bigint} Mask for the range
   * @public
   */
  rangeMask (startIndex, endIndex) {
    const size = this.rangeSize(startIndex, endIndex)
    // Convert size (which may be BigInt from bitPos) to number for shift operation
    let sizeNum = size
    if (typeof size === 'bigint') {
      sizeNum = Number(size)
    }
    // Double-check sizeNum is a valid number
    if (typeof sizeNum !== 'number' || Number.isNaN(sizeNum)) {
      sizeNum = 0
    }
    return BigBits.fullBitsForWidth(sizeNum)
  }

  /**
   * Create a mask for a given bit count (overrides StoreBase for BigInt)
   * @param {number} size - Number of bits in mask
   * @returns {bigint} Mask with 'size' bits set (not number like base class)
   * @public
   * @override
   */
  // @ts-expect-error - Intentional override: StoreBig returns bigint, StoreBase returns number
  rangeMaskForSize (size) {
    // This method is called by parent class; size should be a number here
    const sizeNum = typeof size === 'bigint' ? Number(size) : size
    if (sizeNum === 0) return 0n
    return BigBits.fullBitsForWidth(sizeNum)
  }

  /**
   * Create a mask for a row range
   * @param {number} rowIndex - Row index
   * @param {number} startColumn - Start column (inclusive)
   * @param {number} endColumn - End column (exclusive)
   * @returns {bigint} Row range mask
   * @public
   */
  rowRangeMask (rowIndex, startColumn, endColumn) {
    const startBitPosition = this.bitPos(rowIndex + startColumn)
    const rangeForColumns = this.rangeMask(startColumn, endColumn)
    return rangeForColumns << BigInt(startBitPosition)
  }

  /**
   * Set all bits in a row range
   * @param {bigint} bitboard - Source bitboard
   * @param {number} rowIndex - Row index
   * @param {number} startColumn - Start column (inclusive)
   * @param {number} endColumn - End column (exclusive)
   * @returns {bigint} Updated bitboard
   * @public
   */
  setRange (bitboard, rowIndex, startColumn, endColumn) {
    const rangeToSet = this.rowRangeMask(rowIndex, startColumn, endColumn)
    return bitboard | rangeToSet
  }

  /**
   * Clear all bits in a row range
   * @param {bigint} bitboard - Source bitboard
   * @param {number} rowIndex - Row index
   * @param {number} startColumn - Start column (inclusive)
   * @param {number} endColumn - End column (exclusive)
   * @returns {bigint} Updated bitboard
   * @public
   */
  clearRange (bitboard, rowIndex, startColumn, endColumn) {
    const rangeToClear = this.rowRangeMask(rowIndex, startColumn, endColumn)
    return bitboard & ~rangeToClear
  }

  /**
   * Create a mask for an entire row
   * @param {number} gridWidth - Grid width
   * @returns {bigint} Row mask
   * @public
   */
  rowMask (gridWidth) {
    const widthInBits = this.bitPos(gridWidth)
    // Convert to number for shift operation, then back to BigInt
    const widthNum =
      typeof widthInBits === 'bigint' ? Number(widthInBits) : widthInBits
    return (1n << BigInt(widthNum)) - 1n
  }

  /**
   * Count trailing zero bits
   * @param {bigint} value - Value to check
   * @returns {number} Number of trailing zeros
   * @public
   */
  countTrailingZeros (value) {
    let trailingZeroCount = 0
    let currentValue = value

    while ((currentValue & one) === zero) {
      currentValue >>= one
      trailingZeroCount++
    }
    return trailingZeroCount
  }

  /**
   * Shift bitboard to origin (0, 0)
   * @param {number} gridWidth - Grid width
   * @param {number} minRowIndex - Minimum row to shift from
   * @param {number} gridHeight - Grid height
   * @param {bigint} bitboard - Source bitboard
   * @param {number} minColIndex - Minimum column to shift from
   * @returns {bigint} Shifted bitboard
   * @public
   */
  shiftTo (gridWidth, minRowIndex, gridHeight, bitboard, minColIndex) {
    if (minRowIndex === 0 && minColIndex === 0) return bitboard
    let resultBitboard = zero
    let destinationRowIndex = 0
    const rowMaskForWidth = BigInt(this.rowMaskForWidth(gridWidth))

    for (
      let sourceRowIndex = minRowIndex;
      sourceRowIndex < gridHeight;
      sourceRowIndex++
    ) {
      const sourceRow = this.extractRowAtIndex(
        bitboard,
        sourceRowIndex,
        gridWidth,
        rowMaskForWidth
      )
      if (sourceRow === zero) continue

      const shiftedRow = this.shiftRowBitsLeftByColumns(sourceRow, minColIndex)
      resultBitboard = this.placeRowAtDestination(
        resultBitboard,
        shiftedRow,
        gridWidth,
        destinationRowIndex
      )
      destinationRowIndex++
    }
    return resultBitboard
  }
  /**
   * Shift row bits left by a column count
   * @param {bigint} rowBits - Row bits to shift
   * @param {number} columnShift - Number of columns to shift
   * @returns {bigint} Shifted row
   * @private
   */
  shiftRowBitsLeftByColumns (rowBits, columnShift) {
    return rowBits >> BigInt(this.bitPos(columnShift))
  }

  /**
   * Place row bits at destination in accumulator
   * @param {bigint} accumulator - Accumulator bitboard
   * @param {bigint} rowBits - Row bits to place
   * @param {number} gridWidth - Grid width
   * @param {number} destinationRowIndex - Destination row index
   * @returns {bigint} Updated accumulator
   * @private
   */
  placeRowAtDestination (accumulator, rowBits, gridWidth, destinationRowIndex) {
    const destinationBitPosition = BigInt(
      this.bitPos(destinationRowIndex * gridWidth)
    )
    return accumulator | (rowBits << destinationBitPosition)
  }

  /**
   * Shrink bitboard to its occupied region
   * @param {bigint} bitboard - Source bitboard
   * @param {number} gridWidth - Grid width
   * @param {number} gridHeight - Grid height
   * @returns {BitsAndDimensions} Shrunk bitboard with new dimensions
   * @public
   */
  shrinkToOccupied (bitboard, gridWidth, gridHeight) {
    // Find the bounding box of occupied cells
    const rowBounds = this.findRowBounds(bitboard, gridHeight, gridWidth)
    if (!rowBounds) {
      // No occupied cells
      return StoreBig.emptyBoundingBox()
    }

    const colBounds = this.findColBounds(
      bitboard,
      rowBounds.minY,
      rowBounds.maxY,
      gridWidth
    )
    if (!colBounds) {
      // No occupied cells in columns
      return StoreBig.emptyBoundingBox()
    }

    // Calculate new dimensions
    const newHeight = rowBounds.maxY - rowBounds.minY + 1
    const newWidth = colBounds.maxX - colBounds.minX + 1

    // Shift bitboard to origin (0, 0)
    const shiftedBitboard = this.shiftBitboardToOrigin(
      bitboard,
      gridWidth,
      rowBounds.minY,
      colBounds.minX,
      rowBounds.maxY
    )
    const shrunk = this.shrinkTo(
      gridWidth,
      shiftedBitboard,
      newWidth,
      newHeight
    )
    return {
      bitboard: shrunk,
      newWidth,
      newHeight,
      minRow: rowBounds.minY,
      minCol: colBounds.minX
    }
  }
  /**
   * Bitwise XOR operation (symmetric difference)
   * @param {bigint} a - First bitboard
   * @param {bigint} b - Second bitboard
   * @returns {bigint} Result of a ^ b
   * @public
   */
  bitXor (a, b) {
    return a ^ b
  }
  /**
   * Return empty bounding box result
   * @returns {BitsAndDimensions} Empty bounding box with zero dimensions
   * @static
   * @public
   */
  emptyBoundingBox () {
    return StoreBig.emptyBoundingBox()
  }
  /**
   * Create empty bounding box static result
   * @returns {BitsAndDimensions} Empty bounding box with zero dimensions
   * @static
   * @public
   */
  static emptyBoundingBox () {
    return {
      bitboard: zero,
      newWidth: 0,
      newHeight: 0,
      minRow: 0,
      minCol: 0
    }
  }

  /**
   * Shift bitboard to origin (0, 0) from bounding box
   * @param {bigint} bitboard - Source bitboard
   * @param {number} gridWidth - Grid width
   * @param {number} minRowIndex - Minimum row
   * @param {number} minColIndex - Minimum column
   * @param {number} maxRowIndex - Maximum row
   * @returns {bigint} Shifted bitboard
   * @private
   */
  shiftBitboardToOrigin (
    bitboard,
    gridWidth,
    minRowIndex,
    minColIndex,
    maxRowIndex
  ) {
    let resultBitboard = zero
    let destinationRowIndex = 0
    const rowMaskForWidth = BigInt(this.rowMaskForWidth(gridWidth))

    for (
      let sourceRowIndex = minRowIndex;
      sourceRowIndex <= maxRowIndex;
      sourceRowIndex++
    ) {
      const sourceRow = this.extractRowAtIndex(
        bitboard,
        sourceRowIndex,
        gridWidth,
        rowMaskForWidth
      )
      if (sourceRow === zero) continue

      const shiftedRow = this.shiftRowBitsLeftByColumns(sourceRow, minColIndex)
      resultBitboard = this.placeRowAtDestination(
        resultBitboard,
        shiftedRow,
        gridWidth,
        destinationRowIndex
      )
      destinationRowIndex++
    }
    return resultBitboard
  }

  /**
   * Returns a single-bit store for this instance.
   * @returns {StoreBig} A new StoreBig instance with bitsPerCell = 1
   */
  /**
   * Get or create a single-bit store for this instance
   * @returns {StoreBig} A StoreBig instance with bitsPerCell = 1
   * @public
   */
  get singleBitStore () {
    if (this.isSingleBit) return this
    if (this._singleBitStoreCache) return this._singleBitStoreCache
    this._singleBitStoreCache = new StoreBig(
      1,
      this.width * this.height,
      1,
      this.width,
      this.height
    )
    return this._singleBitStoreCache
  }
  /**
   * Get or create a store with specific bits per cell
   * @param {number} bitsPerCell - Bits per cell in the store
   * @returns {StoreBig} A StoreBig instance with specified bitsPerCell
   * @public
   */
  storeWith (bitsPerCell) {
    if (this.bitsPerCell === bitsPerCell) return this
    if (bitsPerCell === 1) return this.singleBitStore
    if (!this._multiBitStoreCache) {
      this._multiBitStoreCache = {}
    }
    if (this._multiBitStoreCache[bitsPerCell]) {
      return this._multiBitStoreCache[bitsPerCell]
    }
    const bitWidth = BigInt(bitsPerCell)
    const numOfColors = Number(2n ** bitWidth)
    this._multiBitStoreCache[bitsPerCell] = new StoreBig(
      numOfColors,
      this.width * this.height,
      bitsPerCell,
      this.width,
      this.height
    )
    return this._multiBitStoreCache[bitsPerCell]
  }
  /**
   * Create a resized store with new dimensions
   * @param {number} newWidth - New width
   * @param {number} newHeight - New height
   * @returns {StoreBig} Resized store instance
   * @public
   */
  resized (newWidth, newHeight) {
    return new StoreBig(
      this.depth,
      newWidth * newHeight,
      this.bitsPerCell,
      newWidth,
      newHeight
    )
  }

  /**
   * Decompose a multi-color bitboard into an array of 1-bit bitboards.
   * Each array index represents a non-zero color, with a 1-bit bitboard showing where that color appears.
   * @param {bigint} bitboard - Multi-color bitboard (may have depth > 1)
   * @param {number} gridWidth - Grid width
   * @param {number} gridHeight - Grid height
   * @returns {bigint[]} Array of 1-bit bitboards, indexed by color (1 to maxColor)
   * @public
   */
  extractColorLayers (bitboard, gridWidth, gridHeight) {
    const numColors = this.grid(gridWidth, gridHeight).maxNumber(bitboard)

    // Create array of bitboards for each non-zero color (1 to maxColor)

    const colorLayers = new Array(numColors).fill(0n)

    // For each cell with non-zero color, set a marker in the appropriate color bitboard
    // Use this store (which preserves bitsPerCell) to ensure consistent cell layout
    for (const [i, color] of this.grid(
      gridWidth,
      gridHeight
    ).occupiedIndexAndValues(bitboard)) {
      const layerIdx = Number(color) - 1
      // Set value 1 at this cell position in the color layer
      colorLayers[layerIdx] = this.singleBitStore.setIdx(
        colorLayers[layerIdx],
        i,
        1n
      )
    }

    return colorLayers
  }
  /**
   * Extract a single color layer from a bitboard.
   * Creates a 1-bit bitboard where cells containing the specified color have bit 1, others have bit 0.
   * @param {bigint} bitboard - The multi-color bitboard
   * @param {number|bigint} color - The specific color to extract (1 to maxColor)
   * @param {number} gridWidth - Grid width
   * @param {number} gridHeight - Grid height
   * @returns {bigint} 1-bit bitboard with the specified color extracted
   * @public
   */
  extractColorLayer (bitboard, color, gridWidth, gridHeight) {
    const layerColor = BigInt(color)
    let resultBitboard = 0n
    const singleBitStore = this.singleBitStore
    for (const [i] of this.grid(gridWidth, gridHeight).indicesMatching(
      bitboard,
      layerColor
    )) {
      resultBitboard = singleBitStore.setIdx(resultBitboard, i, 1n)
    }

    return resultBitboard
  }

  /**
   * Set color overlay on a base bitboard
   * @param {bigint} baseBitboard - Base bitboard
   * @param {bigint} overlayLayer - 1-bit overlay layer
   * @param {number|bigint} color - Color value for overlay
   * @returns {bigint} Bitboard with overlay applied
   * @public
   */
  setOverlay (baseBitboard, overlayLayer, color) {
    if (this.isSingleBit) return baseBitboard | overlayLayer
    const baseBits = this.singleBitStore.expandToBitsPerCell(
      overlayLayer,
      this.width * this.height
    ) // Validate overlay is 1-bit
    const colorValue = BigInt(color)
    const coloredOverlay = baseBits * colorValue
    return this.bitOr(baseBitboard, coloredOverlay)
  }
  /**
   * Clear color overlay from a base bitboard
   * @param {bigint} baseBitboard - Base bitboard
   * @param {bigint} overlayLayer - 1-bit overlay layer to clear
   * @param {number|bigint} color - Color value to clear
   * @returns {bigint} Bitboard with overlay cleared
   * @public
   */
  clearOverlay (baseBitboard, overlayLayer, color) {
    if (this.isSingleBit) return baseBitboard & ~overlayLayer
    const baseBits = this.singleBitStore.expandToBitsPerCell(
      overlayLayer,
      this.width * this.height
    ) // Validate overlay is 1-bit
    const colorValue = BigInt(color)
    const coloredOverlay = baseBits * colorValue
    return this.bitAnd(baseBitboard, ~coloredOverlay)
  }
  /**
   * Toggle color overlay on a base bitboard
   * @param {bigint} baseBitboard - Base bitboard
   * @param {bigint} overlayLayer - 1-bit overlay layer to toggle
   * @param {number|bigint} color - Color value to toggle
   * @returns {bigint} Bitboard with overlay toggled
   * @public
   */
  toggleOverlay (baseBitboard, overlayLayer, color) {
    if (this.isSingleBit) return baseBitboard ^ overlayLayer
    const baseBits = this.singleBitStore.expandToBitsPerCell(
      overlayLayer,
      this.width * this.height
    ) // Validate overlay is 1-bit
    const colorValue = BigInt(color)
    const coloredOverlay = baseBits * colorValue
    return this.bitXor(baseBitboard, coloredOverlay)
  }
  /**
   * Reconstruct a multi-color bitboard from an array of 1-bit color layers.
   * Array indices represent non-zero colors: array[0] = color 1, array[1] = color 2, etc.
   * @param {bigint[]} colorLayers - Array of 1-bit bitboards, indexed by color-1
   * @param {number} gridWidth - Grid width
   * @param {number} gridHeight - Grid height
   * @returns {bigint} Multi-bit bitboard reconstructed from color layers
   * @public
   */
  assembleColorLayers (colorLayers, gridWidth, gridHeight) {
    let resultBitboard = 0n
    const singleBitStore = this.singleBitStore

    // For each color layer, merge its bits into the result at the appropriate color depth
    for (let colorIdx = 0; colorIdx < colorLayers.length; colorIdx++) {
      const color = BigInt(colorIdx + 1) // Color 1 is at index 0, color 2 at index 1, etc.
      const colorLayer = colorLayers[colorIdx]

      // For each cell in the color layer, set the color in the result bitboard
      for (const [i] of singleBitStore
        .grid(gridWidth, gridHeight)
        .occupiedIndexAndValues(colorLayer)) {
        resultBitboard = this.setIdx(resultBitboard, i, color)
      }
    }

    return resultBitboard
  }

  /**
   * Reconstruct a multi-color bitboard from an array of 1-bit color layers with background.
   * Array indices represent all colors: array[0] = color 0, array[1] = color 1, etc.
   * @param {bigint[]} colorLayers - Array of 1-bit bitboards, indexed by color
   * @param {number} gridWidth - Grid width
   * @param {number} gridHeight - Grid height
   * @returns {bigint} Multi-bit bitboard reconstructed from color layers
   * @public
   */
  assembleColorLayersWithBackground (colorLayers, gridWidth, gridHeight) {
    let resultBitboard = 0n
    const singleBitStore = this.singleBitStore
    // For each color layer, merge its bits into the result at the appropriate color depth
    for (let colorIdx = 0; colorIdx < colorLayers.length; colorIdx++) {
      const color = BigInt(colorIdx) // Color 0 is at index 0, color 1 at index 1, etc.
      const colorLayer = colorLayers[colorIdx]

      // For each cell in the color layer, set the color in the result bitboard
      for (const [i] of singleBitStore
        .grid(gridWidth, gridHeight)
        .occupiedIndexAndValues(colorLayer)) {
        resultBitboard = this.setIdx(resultBitboard, i, color)
      }
    }

    return resultBitboard
  }
}
