import { StoreBase } from './storeBase.js'
import { Store32Morphology } from './Store32Morphology.js'
import { areArraysOrderedAndEqual } from '../../variants/normalize.js'
import { BitMath } from '../bitMath.js'
import { bitSafeArr } from '../bitHelpers.js'

const OP_AND = 0
const OP_OR = 1
const OP_XOR = 2
const OP_COPY = 3
const OP_FILL = 4
const OP_SUB = 5
const OP_OR_INTO = 6
const OP_AND_INTO = 7
const OP_INVERT = 8
const OP_SUB3 = 9
const OP_SUBMANY = 10

const one = 1 >>> 0
const zero = 0 >>> 0
function toStoreType (value) {
  return value >>> 0
}

function empty (numWords) {
  return new Uint32Array(numWords)
}

export class Store32 extends StoreBase {
  constructor (depth = 2, size = 0, bitLength, width, height) {
    const bitsPerCell = BitMath.bitsPerCell(depth, bitLength)
    const cellsPerWord = 32 / bitsPerCell
    const cpwShift = Math.log2(cellsPerWord)
    const words = Math.ceil(size / (32 / bitsPerCell))

    super(
      one,
      empty(words),
      toStoreType,
      depth,
      size,
      bitsPerCell,
      width,
      height
    )

    this.wordsPerRow = Math.ceil(width / cellsPerWord)
    this.cellsPerWord = cellsPerWord
    this.maxCellInWord = cellsPerWord - 1
    this.bitsPerWord = 32 >>> 0
    this.wordMask = 0xffffffff >>> 0
    this.words = words
    this.cpwShift = cpwShift
  }

  /**
   * Create a new zeroed Uint32Array for this store.
   * @param {number} [numWords] - Optional word count; defaults to configured word count.
   * @returns {Uint32Array}
   */
  newWords (numWords) {
    numWords = numWords || this.words
    return empty(numWords)
  }

  /**
   * Create an empty bitboard matching the store layout.
   * @returns {Uint32Array}
   */
  emptyBitboard () {
    return this.newWords()
  }

  *bitsOccupied (bitboard, size = this.size) {
    return yield* bitSafeArr(size, bitboard)
  }
  // Normalize input bitboard to a Uint32Array of length `this.words`
  /**
   * Normalize input into a Uint32Array of the configured word length.
   * Existing data is copied, missing words are zero-filled.
   * @param {Uint32Array|Array<number>|null|undefined} bitboard
   * @returns {Uint32Array}
   */
  normalizeBitboard (bitboard) {
    let src = bitboard
    if (src?.length !== this.words) {
      const tmp = this.newWords()
      if (src?.length) {
        for (let i = 0; i < Math.min(src.length, this.words); i++)
          tmp[i] = src[i]
      }
      src = tmp
    } else if (!(src instanceof Uint32Array)) {
      src = new Uint32Array(src)
    }
    return src
  }

  applyFullMask (out) {
    const fullMask = this.fullBits
    for (let i = 0; i < out.length; i++) out[i] &= fullMask[i]
    return out
  }

  // ============================================================================
  // Bit Position Calculation Helpers - Extract common bit math
  // ============================================================================
  /**
   * Get comprehensive position data for a logical cell index.
   * Calculates word index, bit shift within word, and mask for the cell.
   * @returns {{ word: number, shift: number, mask: number }}
   */
  _calculateCellPosition (idx) {
    const word = idx >>> this.cpwShift
    const shift = (idx & this.maxCellInWord) << this.bShift
    const mask = this.cellMask << shift
    return { word, shift, mask }
  }

  /**
   * Get word and bit indices from a flat bit position (0-based).
   * Used for 1-bit operations on occupancy bitboards.
   * @returns {{ wordIndex: number, bitIndex: number }}
   */
  _getBitPosition (bitPosition) {
    return {
      wordIndex: bitPosition >>> 5,
      bitIndex: bitPosition & 31
    }
  }

  /**
   * Apply a callback function to each cell in grid.
   * @param {Uint32Array} src - Source bitboard
   * @param {Function} callback - (cellIndex, cellValue) => undefined
   */
  _iterateCells (src, callback) {
    const size = this.width * this.height
    for (let idx = 0; idx < size; idx++) {
      const val = this.getIdx(src, idx)
      callback(idx, val)
    }
  }

  /**
   * Apply operation to each cell that has a value, skip zeros.
   * @param {Uint32Array} src - Source bitboard
   * @param {Uint32Array} out - Output bitboard
   * @param {Function} callback - (idx, val) => void (modifies out)
   */
  _iterateNonZeroCells (src, out, callback) {
    this._iterateCells(src, (idx, val) => {
      if (val !== 0) callback(idx, val)
    })
  }

  // ============================================================================
  // Bitwise Operation Helpers - Extract from combineArrays switch statements
  // ============================================================================
  /**
   * Apply bitwise AND operation to corresponding array elements.
   */
  _applyBitwiseAnd (a, b, out, min) {
    for (let i = 0; i < min; i++) out[i] = a[i] & b[i]
  }

  /**
   * Apply bitwise OR operation to corresponding array elements.
   */
  _applyBitwiseOr (a, b, out, min) {
    for (let i = 0; i < min; i++) out[i] = a[i] | b[i]
  }

  /**
   * Apply bitwise XOR operation to corresponding array elements.
   */
  _applyBitwiseXor (a, b, out, min) {
    for (let i = 0; i < min; i++) out[i] = a[i] ^ b[i]
  }

  /**
   * Apply bitwise subtraction (A & ~B) operation.
   */
  _applyBitSubtraction (a, b, out, min) {
    for (let i = 0; i < min; i++) out[i] = a[i] & ~b[i]
  }

  /**
   * Fill array with a specific mask value.
   */
  _applyBitFill (out, min, mask) {
    for (let i = 0; i < min; i++) out[i] = mask
  }

  /**
   * Copy operation: (A & ~mask) | B
   */
  _applyBitCopy (a, b, out, min, mask) {
    for (let i = 0; i < min; i++) out[i] = (a[i] & ~mask) | b[i]
  }

  /**
   * Invert operation: ~A
   */
  _applyBitInvert (a, out, min) {
    for (let i = 0; i < min; i++) out[i] = ~a[i]
  }

  /**
   * Three-way subtraction: A & ~B & ~C
   */
  _applyBitSub3 (a, b, mask, out, min) {
    for (let i = 0; i < min; i++) out[i] = a[i] & ~b[i] & ~mask[i]
  }

  /**
   * Multi-way subtraction: A & ~B1 & ~B2 & ...
   */
  _applyBitSubMany (a, bs, out, min) {
    for (let i = 0; i < min; i++) {
      let result = a[i]
      for (const bx of bs) {
        result &= ~bx[i]
      }
      out[i] = result
    }
  }

  /**
   * In-place OR: A |= B
   */
  _applyBitwiseOrInPlace (a, b, min) {
    for (let i = 0; i < min; i++) a[i] |= b[i]
  }

  /**
   * In-place AND: A &= B
   */
  _applyBitwiseAndInPlace (a, b, min) {
    for (let i = 0; i < min; i++) a[i] &= b[i]
  }

  // ============================================================================
  // Cell Iteration Patterns - Common morphological operation pattern
  // ============================================================================
  /**
   * Generic cell-wise expansion with neighbor propagation.
   * Applies callback to each non-zero cell and its neighbors.
   */
  _expandCellsWithCallback (src, out, neighborCallback) {
    this._iterateNonZeroCells(src, out, (idx, val) => {
      this.setAtIdx(out, idx, val)
      neighborCallback(idx, val, out)
    })
    return out
  }

  /**
   * Clear specific cells that don't meet survival criteria.
   */
  _erodeCellsWithCallback (src, out, survivalTest) {
    this._iterateNonZeroCells(src, out, (idx, val) => {
      if (!survivalTest(src, idx)) {
        const ref = this._calculateCellPosition(idx)
        out[ref.word] = this.setWordBits(out[ref.word], ref.mask, ref.shift, 0)
      }
    })
    return out
  }

  // ============================================================================
  // Mask Operation Helpers - Group related mask functions
  // ============================================================================
  /**
   * Create inverted mask for a specific direction/key.
   */
  _createInvertedMask (edgeMasks, maskKey) {
    const fullMask = this.fullBits
    const inverted = this.createEmptyBitboard(fullMask)
    for (let i = 0; i < fullMask.length; i++) {
      const maskValue = edgeMasks?.[maskKey]?.[i] >>> 0
      inverted[i] = (~maskValue & fullMask[i]) >>> 0
    }
    return inverted
  }

  /**
   * Calculate shift amount for vertical operations.
   */
  _calculateVerticalBitShift (gridWidth) {
    return gridWidth * this.bitsPerCell
  }

  // Per-cell helper: determine if cell at given index survives horizontal erosion
  // Per-cell horizontal expansion (left, self, right) respecting row bounds
  /**
   * @param {Uint32Array} src
   * @returns {Uint32Array}
   */
  expandHorizontallyCellwise (src) {
    return Store32Morphology.expandAdjacentCellsHorizontally(this, src)
  }

  // Per-cell vertical propagation for multi-bit stores
  /**
   * @param {Uint32Array} src
   * @param {number} gridWidth
   * @returns {Uint32Array}
   */
  propagateVerticalCellwise (src, gridWidth) {
    return Store32Morphology.propagateAdjacentCellsVertically(
      this,
      src,
      gridWidth
    )
  }

  // Shift-based vertical propagation for 1-bit stores (uses edge masks)
  /**
   * @param {Uint32Array} src
   * @param {number} gridWidth
   * @param {Object} edgeMasks
   * @returns {Uint32Array}
   */
  propagateVerticalShift (src, gridWidth, edgeMasks) {
    return Store32Morphology.propagateVerticalShift(
      this,
      src,
      gridWidth,
      edgeMasks
    )
  }

  // Per-cell horizontal erosion for multi-bit stores
  /**
   * @param {Uint32Array} src
   * @returns {Uint32Array}
   */
  erodeHorizontalCellwise (src) {
    return Store32Morphology.erodeHorizontalCells(this, src)
  }

  // ============================================================================
  // Horizontal Erosion - Constraint Computation
  // ============================================================================
  /**
   * @param {Object} edgeMasks
   * @returns {Uint32Array}
   */
  computeInvertedLeftMask (edgeMasks) {
    return Store32Morphology.computeInvertedEdgeMask(this, edgeMasks, 'notLeft')
  }

  /**
   * @param {Object} edgeMasks
   * @returns {Uint32Array}
   */
  computeInvertedRightMask (edgeMasks) {
    return Store32Morphology.computeInvertedEdgeMask(
      this,
      edgeMasks,
      'notRight'
    )
  }

  /**
   * @param {Uint32Array} src
   * @param {Object} edgeMasks
   * @param {number} bitShift
   * @returns {{leftConstraint: Uint32Array, rightConstraint: Uint32Array}}
   */
  computeHorizontalErodeConstraints (src, edgeMasks, bitShift) {
    return Store32Morphology.computeHorizontalErodeConstraints(
      this,
      src,
      edgeMasks,
      bitShift
    )
  }

  /**
   * @param {Uint32Array} src
   * @param {Object} edgeMasks
   * @returns {Uint32Array}
   */
  erodeHorizontalShift (src, edgeMasks) {
    return Store32Morphology.erodeHorizontalShift(this, src, edgeMasks)
  }

  // ============================================================================
  // Vertical Erosion - Constraint Computation
  // ============================================================================
  /**
   * @param {Uint32Array} src
   * @param {number} gridWidth
   * @param {Object} edgeMasks
   * @param {number} bitShift
   * @returns {{upShifted: Uint32Array, downShifted: Uint32Array}}
   */
  computeVerticalErodeConstraints (src, gridWidth, edgeMasks, bitShift) {
    return Store32Morphology.computeVerticalErodeConstraints(
      this,
      src,
      gridWidth,
      edgeMasks,
      bitShift
    )
  }

  /**
   * @param {Uint32Array} src
   * @param {number} gridWidth
   * @param {Object} edgeMasks
   * @returns {Uint32Array}
   */
  erodeVerticalShift (src, gridWidth, edgeMasks) {
    return Store32Morphology.erodeVerticalShift(this, src, gridWidth, edgeMasks)
  }

  // Per-cell vertical erosion for multi-bit stores
  /**
   * @param {Uint32Array} src
   * @param {number} gridWidth
   * @returns {Uint32Array}
   */
  erodeVerticalCellwise (src, gridWidth) {
    return Store32Morphology.erodeVerticalCells(this, src, gridWidth)
  }

  // Packed stores operate on Uint32Array bitboards; the base class
  // implementation only handles primitive bitboards (numbers or BigInt).
  // When called with an array we must set the appropriate word/bit rather
  // than performing a naive bitwise OR which would coerce the array to a
  // primitive and lose the remaining words.  This bug previously resulted in
  // edge masks collapsing to numbers when the grid required multiple words,
  // causing dilation to never propagate.  By overriding here we ensure
  // array bitboards behave correctly.
  addBit (bitboard, i) {
    if (bitboard && typeof bitboard.length === 'number') {
      // Distinguish between occupancy bitboards (1 bit per cell)
      // and packed cell bitboards (multiple cells per 32-bit word).
      const occupancyWords = Math.ceil(this.size / 32)
      if (bitboard.length === occupancyWords) {
        // occupancy representation: set single bit at position i
        this.setBitInArray(bitboard, i)
        return bitboard
      }
      // packed representation: set the cell value bits inside the word
      const { word, shift } = this.readRef(i)
      const mask = this.cellMask << shift
      bitboard[word] |= mask
      return bitboard
    }
    return super.addBit(bitboard, i)
  }

  findRowBounds (bitboard, height) {
    height = height || this.height || Number.POSITIVE_INFINITY
    let minY = height
    let maxY = -1

    let wi = 0
    for (let y = 0; y < height; y++) {
      const rowOr = this._getRowOccupancy(bitboard, wi)
      if (rowOr !== 0) {
        minY = Math.min(minY, y)
        maxY = Math.max(maxY, y)
      }
      wi += this.wordsPerRow
    }

    return minY <= maxY ? { minY, maxY } : null
  }

  /**
   * Get OR of all words in a row to check for occupancy.
   */
  _getRowOccupancy (bitboard, rowStartWordIndex) {
    let rowOr = 0
    for (let i = 0; i < this.wordsPerRow; i++) {
      rowOr |= bitboard[rowStartWordIndex + i]
    }
    return rowOr
  }

  findColBounds (bitboard, minY, maxY, width) {
    width = width || this.width || Number.POSITIVE_INFINITY
    let minX = width
    let maxX = -1

    for (let y = minY; y <= maxY; y++) {
      const rowBase = y * this.wordsPerRow
      for (let w = 0; w < this.wordsPerRow; w++) {
        const { minBit, maxBit } = this._findBitBoundsInWord(
          bitboard[rowBase + w],
          w
        )
        if (minBit !== null) {
          minX = Math.min(minX, minBit)
          maxX = Math.max(maxX, maxBit)
        }
      }
    }

    return minX <= maxX ? { minX, maxX } : null
  }

  /**
   * Scan word for set bits and return min/max cell indices.
   */
  _findBitBoundsInWord (word, wordIndex) {
    if (!word) return { minBit: null, maxBit: null }

    let minCol = null
    let maxCol = null
    let workingWord = word

    while (workingWord) {
      const bit = workingWord & -workingWord // lowest set bit
      const cell =
        (wordIndex << this.cpwShift) +
        (this.countTrailingZeros(bit) >> this.bShift)
      if (minCol === null) minCol = cell
      maxCol = cell
      workingWord ^= bit
    }

    return { minBit: minCol, maxBit: maxCol }
  }

  normalize (bitboard, width, height) {
    const rows = this.findRowBounds(bitboard, height)
    if (!rows) return this.newWords()
    const cols = this.findColBounds(bitboard, rows.minY, rows.maxY, width)

    const nw = cols.maxX - cols.minX + 1
    const nh = rows.maxY - rows.minY + 1

    let out = this.newWords()

    for (let y = 0; y < nh; y++) {
      for (let x = 0; x < nw; x++) {
        const sourceIdx = (rows.minY + y) * width + (cols.minX + x)
        const targetIdx = y * nw + x
        const value = this.getIdx(bitboard, sourceIdx)
        out = this.setIdx(out, targetIdx, value)
      }
    }

    return out
  }

  getRef (bitboard, word, shift) {
    return this.rightShift(bitboard?.[word], shift)
  }

  /**
   * Read a logical cell value from the bitboard.
   * @param {Uint32Array} bitboard
   * @param {number} i
   * @returns {number}
   */
  getIdx (bitboard, i) {
    const ref = this.readRef(i)
    return this.getRef(bitboard, ref.word, ref.shift)
  }

  /**
   * Write a logical cell value into the bitboard and return the modified array.
   * @param {Uint32Array} bitboard
   * @param {number} i
   * @param {number} color
   * @returns {Uint32Array}
   */
  setIdx (bitboard, i, color) {
    this.setAtIdx(bitboard, i, color)
    return bitboard
  }

  setAtIdx (bitboard, i, color) {
    const ref = this.ref(i)
    bitboard[ref.word] = this.setWordBits(
      bitboard[ref.word],
      ref.mask,
      ref.shift,
      color
    )
  }

  isNonZero (bitboard, i) {
    const { word, shift } = this.readRef(i)
    return this.rightShift(bitboard?.[word], shift) !== 0
  }

  /**
   * Return the mask for a cell at the given bit shift.
   * @param {number} shift - Bit shift within a 32-bit word
   * @returns {number}
   */
  getMaskAtShift (shift) {
    return this.cellMask << shift
  }

  /**
   * Backward-compatible alias for getMaskAtShift.
   * @param {number} shift
   * @returns {number}
   */
  gettingMask (shift) {
    return this.getMaskAtShift(shift)
  }

  ref (idx) {
    return this._calculateCellPosition(idx)
  }

  readRef (idx) {
    const word = idx >>> this.cpwShift
    const shift = (idx & this.maxCellInWord) << this.bShift
    return { word, shift }
  }

  setWordBits (bw, mask, shift, color) {
    return this.clearBits(bw, mask) | this.leftShift(color, shift)
  }
  partialRowMask (numBits) {
    return (1 << numBits) - 1
  }
  rowCellMask (numCells) {
    // mask for `cells` contiguous cells starting at bit 0
    const bits = numCells * this.bitsPerCell
    return bits === 32 ? 0xffffffff : this.partialRowMask(bits)
  }

  setRange (bb, i0, i1, color) {
    if (i0 >= i1) return bb
    color &= this.cellMask

    const { word: startWord, shift: startPos } = this.readRef(i0) // bounds check
    const startCell = startPos >> this.bShift

    const { word: endWord, shift: endPos } = this.readRef(i1)
    const endCell = endPos >> this.bShift

    // ---- single word case ----
    if (startWord === endWord) {
      return this.setRangeToWord(bb, startWord, startCell, endCell, color)
    }

    // ---- first partial word ----

    bb = this.setRangeToWord(
      bb,
      startWord,
      startCell,
      this.maxCellInWord,
      color
    )

    // ---- full words ----
    if (color === 0) {
      for (let w = startWord + 1; w < endWord; w++) {
        bb[w] = 0
      }
    } else {
      // replicate value across a full word
      let full = 0
      for (let i = 0; i < this.cellsPerWord; i++) {
        full |= color << this.cellShiftLeft(i)
      }

      for (let w = startWord + 1; w < endWord; w++) {
        bb[w] = full
      }
    }

    // ---- last partial word ----

    bb = this.setRangeToWord(bb, endWord, 0, endCell + 1, color)

    return bb
  }

  setRangeToWord (bb, word, startCell, endCell, color) {
    bb[word] = this.setRangeInWord(startCell, endCell, color, bb[word])
    return bb
  }

  setRangeInWord (startCell, endCell, color, word) {
    const numCells = endCell - startCell + 1
    const cellsSelectBMask = this.cellsSelectMask(startCell, numCells)
    const setMask = this.cellsSetMask(cellsSelectBMask, color)
    return (word & ~cellsSelectBMask) | setMask
  }
  cellsSetMask (cellsSelectBMask, color) {
    if (color === 0) return 0
    const unsigned = cellsSelectBMask >>> 0

    const oneRepeatMask = unsigned / this.cellMask
    const colorRepeatMask = oneRepeatMask * color
    // replicate value
    const setMask = colorRepeatMask & cellsSelectBMask
    return setMask
  }

  cellsSelectMask (startCell, numCells) {
    const shift = this.cellShiftLeft(startCell)
    const cellsSelectBMask = this.rowCellMask(numCells) << shift
    return cellsSelectBMask
  }

  cellShiftLeft (startCell) {
    return startCell << this.bShift
  }

  wordMasked (x0) {
    return x0 & this.maxCellInWord
  }

  wordShift (x0) {
    return x0 >>> this.cpwShift
  }

  clearBoardBits (bitboard, word, mask) {
    return bitboard[word] & ~mask
  }

  // Occupancy and conversion functions
  occupancyFast (bb) {
    let count = 0
    for (const word of bb) {
      count += this.popcount32(word)
    }
    return count
  }
  // Occupancy and conversion functions
  occupancy (bb) {
    if (this.bitsPerCell === 1) return this.occupancyFast(bb)
    let count = 0
    for (const word of bb) {
      for (let shift = 0; shift < 32; shift += this.bitsPerCell) {
        count += this.rightShift(word, shift) > 0 ? 1 : 0
      }
    }
    return count
  }
  popcount32 (x) {
    x -= (x >>> 1) & 0x55555555
    x = (x & 0x33333333) + ((x >>> 2) & 0x33333333)
    return (((x + (x >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24
  }

  /**
   * Iterate efficiently through occupancy, processing one cell per iteration.
   */
  _iterateOccupancyCells (sourceWords, gridWidth, gridHeight, callback) {
    const cellsPerWord = 32 / this.bitsPerCell
    const cellMask = (1 << this.bitsPerCell) - 1
    const totalCells = gridWidth * gridHeight

    let outputBitIndex = 0
    for (const sourceWord of sourceWords) {
      let currentWord = sourceWord
      for (
        let cellIndex = 0;
        cellIndex < cellsPerWord && outputBitIndex < totalCells;
        cellIndex++
      ) {
        const cellValue = this.extractCellValue(currentWord, cellMask)
        callback(outputBitIndex, cellValue)
        currentWord >>>= this.bitsPerCell
        outputBitIndex++
      }
    }
  }

  occupancy1Bit (sourceWords, gridWidth, gridHeight) {
    const totalCells = gridWidth * gridHeight
    const outputWordCount = Math.ceil(totalCells / 32)
    const outputBitboard = this.empty(outputWordCount)

    this._iterateOccupancyCells(
      sourceWords,
      gridWidth,
      gridHeight,
      (idx, val) => {
        if (val !== 0) {
          this.setBitInArray(outputBitboard, idx)
        }
      }
    )
    return outputBitboard
  }

  processWordForOccupancy (
    word,
    cellMask,
    totalCells,
    startBitIndex,
    accumulatedBitboard
  ) {
    let currentWord = word
    let outputBitIndex = startBitIndex

    for (
      let cellIndex = 0;
      cellIndex < 32 / this.bitsPerCell && outputBitIndex < totalCells;
      cellIndex++
    ) {
      const cellValue = this.extractCellValue(currentWord, cellMask)
      if (cellValue !== 0) {
        this.setBitInArray(accumulatedBitboard, outputBitIndex)
      }
      currentWord >>>= this.bitsPerCell
      outputBitIndex++
    }
    return accumulatedBitboard
  }

  combineArrays (a, b, out, op, mask) {
    let lenA = a?.length
    let lenB = b?.length
    let b0

    if (op === OP_SUBMANY) {
      b0 = b?.[0]
      lenB = b0?.length
    }
    let min = 0
    if (lenA == null || lenB == null) {
      if (lenA == null && lenB == null) {
        throw new Error('At least one of a or b must be an array')
      } else if (lenA == null) {
        min = lenB
        lenA = lenB
      } else {
        min = lenA
      }
    } else {
      min = lenA < lenB ? lenA : lenB
    }

    // Delegate to specific operation handlers
    switch (op) {
      case OP_AND:
        this._applyBitwiseAnd(a, b, out, min)
        break
      case OP_OR:
        this._applyBitwiseOr(a, b, out, min)
        break
      case OP_FILL:
        this._applyBitFill(out, min, mask)
        break
      case OP_COPY:
        this._applyBitCopy(a, b, out, min, mask)
        break
      case OP_XOR:
        this._applyBitwiseXor(a, b, out, min)
        break
      case OP_SUB:
        this._applyBitSubtraction(a, b, out, min)
        break
      case OP_SUB3:
        if (
          mask == null ||
          b == null ||
          a == null ||
          mask.length !== a.length ||
          b.length !== a.length
        ) {
          throw new Error(
            'sub 3 requires all of a, b, and mask arrays of the same length'
          )
        }
        this._applyBitSub3(a, b, mask, out, min)
        break
      case OP_SUBMANY:
        if (b0 == null || b == null || a == null || b.length !== a.length) {
          throw new Error(
            'sub many requires all of a, b  arrays of the same length'
          )
        }
        this._applyBitSubMany(a, b, out, min)
        break
      case OP_OR_INTO:
        this._applyBitwiseOrInPlace(a, b, min)
        return a
      case OP_AND_INTO:
        this._applyBitwiseAndInPlace(a, b, min)
        return a
      case OP_INVERT:
        this._applyBitInvert(a, out, min)
        return out
      default:
        throw new Error('Unknown op')
    }

    // If b shorter → copy remainder of a
    for (let i = min; i < lenA; i++) {
      out[i] = a[i]
    }

    return out
  }

  combineArraysOffset (a, b, out, op, offset, mask) {
    const lenA = a.length
    const lenB = b?.length

    // copy entire a first (fast memcpy)
    out.set(a)

    if (offset >= lenA) return out

    const max = lenB ? offset + lenB : lenA
    const end = max < lenA ? max : lenA

    let ai = offset
    let bi = 0

    // Delegate to specific operation handlers with offset
    switch (op) {
      case OP_AND:
        for (; ai < end; ai++, bi++) out[ai] = a[ai] & b[bi]
        break
      case OP_OR:
        for (; ai < end; ai++, bi++) out[ai] = a[ai] | b[bi]
        break
      case OP_XOR:
        for (; ai < end; ai++, bi++) out[ai] = a[ai] ^ b[bi]
        break
      case OP_FILL:
        for (; ai < end; ai++) out[ai] = mask
        break
      case OP_COPY:
        for (; ai < end; ai++, bi++) out[ai] = (a[ai] & ~mask) | b[bi]
        break
      case OP_SUB:
        for (; ai < end; ai++, bi++) out[ai] = a[ai] & ~b[bi]
        break
      case OP_OR_INTO:
        for (; ai < end; ai++, bi++) a[ai] |= b[bi]
        return a
      case OP_AND_INTO:
        for (; ai < end; ai++, bi++) a[ai] &= b[bi]
        return a
      case OP_INVERT:
        for (; ai < end; ai++) out[ai] = ~a[ai]
        break
      default:
        throw new Error('Unknown op')
    }
    return out
  }

  // Bitwise operations on arrays
  bitEqual (a, b) {
    if (a == null || b == null) return false
    return areArraysOrderedAndEqual(a, b)
  }
  bitOr (a, b) {
    const out = this.emptyBits
    return this.combineArrays(a, b, out, OP_OR)
  }
  bitOrInto (a, b) {
    return this.combineArrays(a, b, a, OP_OR_INTO)
  }

  bitAnd (a, b) {
    const out = this.emptyBits
    return this.combineArrays(a, b, out, OP_AND)
  }
  bitAndInto (a, b) {
    return this.combineArrays(a, b, a, OP_AND_INTO)
  }

  bitSub (a, b) {
    const out = this.emptyBits
    return this.combineArrays(a, b, out, OP_SUB)
  }
  bitSub3 (a, b, c) {
    const out = this.emptyBits
    return this.combineArrays(a, b, out, OP_SUB3, c)
  }
  bitSubMany (a, bs) {
    const out = this.emptyBits
    return this.combineArrays(a, bs, out, OP_SUBMANY)
  }
  invertedBits (bitboard) {
    const out = this.emptyBits
    return this.combineArrays(bitboard, null, out, OP_INVERT)
  }
  get fullBits () {
    const out = this.emptyBits
    return this.combineArrays(out, null, out, OP_FILL, this.wordMask)
  }
  clone (bitboard) {
    return bitboard.slice()
  }
  // Bit shifting operations
  shiftBits (src, shift) {
    if (shift === 0) return src.slice()

    const words = src.length
    const out = new Uint32Array(words)

    // Normalize shift into word and bit components
    let total = Number(shift)
    // Compute wordShift as trunc toward zero
    let wordShift = Math.trunc(total / 32)
    let bitShift = total - wordShift * 32
    if (bitShift < 0) {
      bitShift += 32
      wordShift -= 1
    }

    if (total > 0) {
      // shift left by total bits
      for (let i = words - 1; i >= 0; i--) {
        let v = 0
        const s = i - wordShift
        if (s >= 0 && s < words) {
          v = (src[s] << bitShift) >>> 0
          if (bitShift && s - 1 >= 0) v |= src[s - 1] >>> (32 - bitShift)
        }
        out[i] = v >>> 0
      }
    } else {
      // shift right by -total bits
      const positive = -total
      let wShift = Math.trunc(positive / 32)
      let bShift = positive - wShift * 32
      if (bShift < 0) {
        bShift += 32
        wShift -= 1
      }
      for (let i = 0; i < words; i++) {
        let v = 0
        const s = i + wShift
        if (s >= 0 && s < words) {
          v = src[s] >>> bShift
          if (bShift && s + 1 < words) v |= (src[s + 1] << (32 - bShift)) >>> 0
        }
        out[i] = v >>> 0
      }
    }
    return out
  }

  shiftBitBwd (wordShift, shift, words, src, out) {
    const wShift = -wordShift
    const bShift = -shift & 31
    this.shiftBitFwd(words, wShift, src, bShift, out)
  }

  shiftBitFwd (words, wordShift, src, bitShift, out) {
    for (let i = words - 1; i >= 0; i--) {
      let v = 0
      const s = i - wordShift
      if (s >= 0) {
        v = src[s] << bitShift
        if (bitShift && s - 1 >= 0) v |= src[s - 1] >>> (32 - bitShift)
      }
      out[i] = v
    }
  }

  // Template method implementations
  createEmptyBitboard (template) {
    return empty(template.length)
  }
  get emptyBits () {
    return empty(this.words)
  }
  /**
   * Create default edge masks (all 1s in array form)
   * Used when dilation is called without explicit edge masks
   */
  _createDefaultEdgeMasks () {
    const allOnes = new Uint32Array(this.words)
    for (let i = 0; i < this.words; i++) {
      allOnes[i] = 0xffffffff
    }
    return {
      left: allOnes,
      right: allOnes,
      top: allOnes,
      bottom: allOnes,
      notLeft: allOnes,
      notRight: allOnes,
      notTop: allOnes,
      notBottom: allOnes
    }
  }
  combineElement (idx, ...values) {
    let result = 0 >>> 0
    for (const v of values) result |= v[idx] >>> 0
    return result
  }
  combineMasked (...values) {
    const result = this.createEmptyBitboard(values[0])

    for (let i = 0; i < result.length; i++) {
      result[i] = this.combineElement(i, ...values)
    }

    return result
  }

  dilateHorizontalStep (bitboard, edgeMasks) {
    const src = this.normalizeBitboard(bitboard)
    return this.expandHorizontallyCellwise(src)
  }

  dilateVerticalStep (bitboard, gridWidth, edgeMasks) {
    const src = this.normalizeBitboard(bitboard)
    if (this.bitsPerCell > 1)
      return this.propagateVerticalCellwise(src, gridWidth)
    return this.propagateVerticalShift(src, gridWidth, edgeMasks)
  }

  dilateHorizontalWrapStep (bitboard, gridWidth, gridHeight) {
    const src = this.normalizeBitboard(bitboard)
    const leftRotated = this.rotateRowBits(src, gridWidth, gridHeight, -1)
    const rightRotated = this.rotateRowBits(src, gridWidth, gridHeight, 1)
    const result = this.createEmptyBitboard(src)
    for (let i = 0; i < src.length; i++)
      result[i] = src[i] | leftRotated[i] | rightRotated[i]
    return result
  }

  erodeHorizontalClampStep (bitboard, edgeMasks) {
    const src = this.normalizeBitboard(bitboard)
    // Store32 always uses per-cell erosion to correctly respect grid boundaries
    return this.erodeHorizontalCellwise(src)
  }

  erodeVerticalClampStep (bitboard, gridWidth, edgeMasks) {
    const src = this.normalizeBitboard(bitboard)
    // Store32 always uses per-cell erosion to correctly respect grid boundaries
    return this.erodeVerticalCellwise(src, gridWidth)
  }

  rotateRowBits (sourceBitboard, gridWidth, gridHeight, shiftAmount) {
    const resultBitboard = this.createEmptyBitboard(sourceBitboard)

    for (let rowIndex = 0; rowIndex < gridHeight; rowIndex++) {
      const rotatedRowBits = this.rotateRowBitsForSingleRow(
        sourceBitboard,
        gridWidth,
        rowIndex,
        shiftAmount
      )
      for (let i = 0; i < rotatedRowBits.length; i++) {
        resultBitboard[i] = this.combineRotatedRowWithResult(
          resultBitboard[i],
          rotatedRowBits[i]
        )
      }
    }
    return resultBitboard
  }

  rotateRowBitsForSingleRow (sourceBitboard, gridWidth, rowIndex, shiftAmount) {
    const rotatedRowBitboard = this.createEmptyBitboard(sourceBitboard)
    const rowStart = rowIndex * gridWidth
    const normalizedShift = ((shiftAmount % gridWidth) + gridWidth) % gridWidth

    for (let colIndex = 0; colIndex < gridWidth; colIndex++) {
      const sourceColIndex =
        (colIndex - normalizedShift + gridWidth) % gridWidth
      const sourceBitPosition = rowStart + sourceColIndex
      const destinationBitPosition = rowStart + colIndex

      if (this.getBitFromArray(sourceBitboard, sourceBitPosition)) {
        this.setBitInArray(rotatedRowBitboard, destinationBitPosition)
      }
    }
    return rotatedRowBitboard
  }

  // Bit helpers for array-backed bitboards
  getBitFromArray (bitboard, bitPosition) {
    const { wordIndex, bitIndex } = this._getBitPosition(bitPosition)
    return ((bitboard[wordIndex] >>> bitIndex) & 1) === 1
  }

  setBitInArray (outArray, bitPosition) {
    const { wordIndex, bitIndex } = this._getBitPosition(bitPosition)
    outArray[wordIndex] |= 1 << bitIndex
  }

  // Utility functions
  isBitSet (bitboard, bitPosition) {
    return this.getBitFromArray(bitboard, bitPosition)
  }

  isCellOccupied (word) {
    return (word & this.cellMask) !== 0
  }

  msbIndex (value) {
    let mostSignificantBitIndex = -1

    while (value > 0) {
      value >>>= 1
      mostSignificantBitIndex++
    }
    return mostSignificantBitIndex
  }

  countTrailingZeros (value) {
    // Math.ctz32 is not available in all environments; provide simple fallback
    if (value === 0) return 32
    let count = 0
    // use unsigned shift to iterate
    while ((value & 1) === 0) {
      value >>>= 1
      count++
    }
    return count
  }

  boundingBox (gridWidth, gridHeight, bitboard) {
    const rowMaskForWidth = this.rowMaskForWidth(gridWidth)
    let minRowIndex = gridHeight
    let minColIndex = gridWidth

    for (let rowIndex = 0; rowIndex < gridHeight; rowIndex++) {
      const rowBits = this.extractRowAtIndex(
        bitboard,
        rowIndex,
        gridWidth,
        rowMaskForWidth
      )
      if (rowBits === 0) continue

      minRowIndex = Math.min(minRowIndex, rowIndex)
      const colIndexOfFirstBit = this.countTrailingZeros(rowBits)
      minColIndex = Math.min(minColIndex, colIndexOfFirstBit)
    }
    return { minRow: minRowIndex, minCol: minColIndex }
  }

  extractRowOccupancy (bitboard, rowIndex) {
    const rowStart = rowIndex * this.wordsPerRow
    let rowOccupancyMask = 0

    for (let wordIndex = 0; wordIndex < this.wordsPerRow; wordIndex++) {
      if (rowStart + wordIndex < bitboard.length) {
        rowOccupancyMask |= bitboard[rowStart + wordIndex]
      }
    }
    return rowOccupancyMask
  }

  normalizeUpLeft (bitboard, gridHeight, gridWidth) {
    const hasAnyBit = !this.isEmpty(bitboard)
    if (!hasAnyBit) return this.newWords()

    const boundingBoxResult = this.boundingBox(gridWidth, gridHeight, bitboard)
    return this.shiftTo(
      gridWidth,
      boundingBoxResult.minRow,
      gridHeight,
      bitboard,
      boundingBoxResult.minCol
    )
  }

  rangeMask (startIndex, endIndex) {
    const size = this.rangeSize(startIndex, endIndex)
    return (1 << size) - 1
  }

  rowRangeMask (rowIndex, startColumn, endColumn) {
    const startBitPosition = this.bitPos(rowIndex + startColumn)
    const rangeForColumns = this.rangeMask(startColumn, endColumn)
    return rangeForColumns << startBitPosition
  }

  setRow (bitboard, rowIndex, gridWidth, rowMaskForWidth) {
    const rowWordIndex = rowIndex * this.wordsPerRow
    if (rowWordIndex >= bitboard.length) return 0
    return bitboard[rowWordIndex] & rowMaskForWidth
  }

  extractRowAtIndex (bitboard, rowIndex, gridWidth, rowMaskForWidth) {
    const rowStart = rowIndex * Math.ceil(gridWidth / 32)
    let rowValue = 0

    for (let i = 0; i < Math.ceil(gridWidth / 32); i++) {
      if (rowStart + i < bitboard.length) {
        rowValue |= bitboard[rowStart + i]
      }
    }
    return rowValue & rowMaskForWidth
  }
  clearRange (bitboard, rowIndex, startColumn, endColumn) {
    const rangeToClear = this.rowRangeMask(rowIndex, startColumn, endColumn)
    const result = bitboard.slice()

    const startWordIndex = rowIndex * this.wordsPerRow
    if (startWordIndex < result.length) {
      result[startWordIndex] &= ~rangeToClear
    }
    return result
  }

  shiftTo (gridWidth, minRowIndex, gridHeight, bitboard, minColIndex) {
    let resultBitboard = this.newWords()
    let destinationRowIndex = 0
    const rowMaskForWidth = this.rowMaskForWidth(gridWidth)

    for (
      let sourceRowIndex = minRowIndex;
      sourceRowIndex < gridHeight;
      sourceRowIndex++
    ) {
      const sourceRow = this.setRow(
        bitboard,
        sourceRowIndex,
        gridWidth,
        rowMaskForWidth
      )
      if (sourceRow === 0) continue

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

  shiftRowBitsLeftByColumns (rowBits, columnShift) {
    return rowBits >> (columnShift * this.bitsPerCell)
  }

  placeRowAtDestination (accumulator, rowBits, gridWidth, destinationRowIndex) {
    const result = accumulator.slice()
    const destinationWordIndex =
      this._calculateRowWordIndex(destinationRowIndex)
    if (destinationWordIndex < result.length) {
      result[destinationWordIndex] |= rowBits
    }
    return result
  }

  /**
   * Calculate starting word index for a given row.
   */
  _calculateRowWordIndex (rowIndex) {
    return rowIndex * this.wordsPerRow
  }

  isEmpty (board) {
    return this._checkAllWords(board, word => word === 0)
  }

  /**
   * Check if a condition is true for all words in the bitboard.
   */
  _checkAllWords (board, predicate) {
    for (let i = 0; i < board.length; i++) {
      if (!predicate(board[i])) return false
    }
    return true
  }

  // Row width expansion with single bit offset
  expandToWidthWithOffset (
    gridWidth,
    gridHeight,
    bits,
    newWidth,
    offsetBits = 0
  ) {
    const out = this.newWords()
    const rowMaskForWidth = this.rowMaskForWidth(gridWidth)
    const wordsPerSourceRow = Math.ceil(gridWidth / 32)
    const wordsPerDestRow = Math.ceil(newWidth / 32)

    for (let rowIndex = 0; rowIndex < gridHeight; rowIndex++) {
      const sourceRowStart = rowIndex * wordsPerSourceRow
      const destRowStart = rowIndex * wordsPerDestRow

      // Extract source row
      let rowBits = 0
      for (
        let i = 0;
        i < wordsPerSourceRow && sourceRowStart + i < bits.length;
        i++
      ) {
        rowBits |=
          bits[sourceRowStart + i] & (i === 0 ? rowMaskForWidth : 0xffffffff)
      }

      // Place in destination with offset
      const destWordOffset = Math.floor(offsetBits / 32)
      const bitOffset = offsetBits % 32
      if (bitOffset === 0) {
        out[destRowStart + destWordOffset] |= rowBits
      } else {
        out[destRowStart + destWordOffset] |= rowBits << bitOffset
        if (destRowStart + destWordOffset + 1 < out.length) {
          out[destRowStart + destWordOffset + 1] |= rowBits >>> (32 - bitOffset)
        }
      }
    }
    return out
  }

  // Row width expansion with X and Y offsets
  expandToWidthWithXYOffset (
    gridWidth,
    gridHeight,
    bits,
    newWidth,
    offsetX = 0,
    offsetY = 0
  ) {
    const out = this.newWords()
    const rowMaskForWidth = this.rowMaskForWidth(gridWidth)
    const wordsPerSourceRow = Math.ceil(gridWidth / 32)
    const wordsPerDestRow = Math.ceil(newWidth / 32)

    for (let rowIndex = 0; rowIndex < gridHeight; rowIndex++) {
      const sourceRowStart = rowIndex * wordsPerSourceRow
      const destRowIndex = rowIndex + offsetY
      const destRowStart = destRowIndex * wordsPerDestRow

      if (destRowIndex < 0 || destRowIndex >= gridHeight) continue

      // Extract source row
      let rowBits = 0
      for (
        let i = 0;
        i < wordsPerSourceRow && sourceRowStart + i < bits.length;
        i++
      ) {
        rowBits |=
          bits[sourceRowStart + i] & (i === 0 ? rowMaskForWidth : 0xffffffff)
      }

      // Place in destination with offset
      const destWordOffset = Math.floor(offsetX / 32)
      const bitOffset = offsetX % 32
      if (bitOffset === 0) {
        if (destRowStart + destWordOffset < out.length) {
          out[destRowStart + destWordOffset] |= rowBits
        }
      } else {
        if (destRowStart + destWordOffset < out.length) {
          out[destRowStart + destWordOffset] |= rowBits << bitOffset
        }
        if (destRowStart + destWordOffset + 1 < out.length) {
          out[destRowStart + destWordOffset + 1] |= rowBits >>> (32 - bitOffset)
        }
      }
    }
    return out
  }

  // Expand bitboard to larger bit depth
  expandToBitsPerCell (bitboard, newDepth) {
    const oldBitsPerCell = this.bitsPerCell
    const newBitsPerCell = newDepth

    if (oldBitsPerCell === newBitsPerCell) return bitboard.slice()
    if (newBitsPerCell < oldBitsPerCell) {
      return this.shrinkToBitsPerCell(bitboard, newBitsPerCell)
    }

    const oldCellMask = (1 << oldBitsPerCell) - 1
    const output = this.newWords()
    const totalCells = (this.width || 0) * (this.height || 0)

    for (let i = 0; i < totalCells; i++) {
      const oldBitPos = i * oldBitsPerCell
      const newBitPos = i * newBitsPerCell

      const oldWordIdx = Math.floor(oldBitPos / 32)
      const oldBitIdx = oldBitPos % 32

      const cellValue = (bitboard[oldWordIdx] >>> oldBitIdx) & oldCellMask

      const newWordIdx = Math.floor(newBitPos / 32)
      const newBitIdx = newBitPos % 32

      output[newWordIdx] |= cellValue << newBitIdx
    }

    return output
  }

  // Shrink bitboard to smaller bit depth
  shrinkToBitsPerCell (bitboard, newDepth) {
    const oldBitsPerCell = this.bitsPerCell
    const newBitsPerCell = newDepth

    if (oldBitsPerCell === newBitsPerCell) return bitboard.slice()
    if (newBitsPerCell > oldBitsPerCell) {
      return this.expandToBitsPerCell(bitboard, newBitsPerCell)
    }

    const oldCellMask = (1 << oldBitsPerCell) - 1
    const newCellMask = (1 << newBitsPerCell) - 1
    const output = this.newWords()
    const totalCells = (this.width || 0) * (this.height || 0)

    for (let i = 0; i < totalCells; i++) {
      const oldBitPos = i * oldBitsPerCell
      const newBitPos = i * newBitsPerCell

      const oldWordIdx = Math.floor(oldBitPos / 32)
      const oldBitIdx = oldBitPos % 32

      const cellValue = (bitboard[oldWordIdx] >>> oldBitIdx) & oldCellMask
      const cappedValue = cellValue & newCellMask

      const newWordIdx = Math.floor(newBitPos / 32)
      const newBitIdx = newBitPos % 32

      output[newWordIdx] |= cappedValue << newBitIdx
    }

    return output
  }

  expandToSquare (bits, gridHeight, gridWidth) {
    if (gridHeight === gridWidth) return Array.from(bits)
    const N = Math.max(gridHeight, gridWidth)
    return this.expandToWidth(gridWidth, gridHeight, bits, N)
  }

  expandToWidth (gridWidth, gridHeight, bits, newWidth) {
    const out = this.newWords()
    const rowMaskForWidth = this.rowMaskForWidth(gridWidth)
    const wordsPerSourceRow = Math.ceil(gridWidth / 32)
    const wordsPerDestRow = Math.ceil(newWidth / 32)

    for (let rowIndex = 0; rowIndex < gridHeight; rowIndex++) {
      const sourceRowStart = rowIndex * wordsPerSourceRow
      const destRowStart = rowIndex * wordsPerDestRow

      // Extract source row
      let rowBits0 = 0,
        rowBits1 = 0
      for (
        let i = 0;
        i < wordsPerSourceRow && sourceRowStart + i < bits.length;
        i++
      ) {
        if (i === 0) {
          rowBits0 = bits[sourceRowStart + i] & rowMaskForWidth
        } else if (i === 1) {
          rowBits1 = bits[sourceRowStart + i]
        } else {
          break // For simplicity, handle up to 2 words per row
        }
      }

      // Place in destination
      if (destRowStart < out.length) {
        out[destRowStart] |= rowBits0
      }
      if (wordsPerSourceRow > 1 && destRowStart + 1 < out.length) {
        out[destRowStart + 1] |= rowBits1
      }
    }
    return out
  }

  shrinkToOccupied (bitboard, gridWidth, gridHeight) {
    // Find the bounding box of occupied cells
    const rowBounds = this.findRowBounds(bitboard, gridHeight)
    if (!rowBounds) {
      // No occupied cells
      return {
        bitboard: this.newWords(),
        newWidth: 0,
        newHeight: 0,
        minRow: 0,
        minCol: 0
      }
    }

    const colBounds = this.findColBounds(
      bitboard,
      rowBounds.minY,
      rowBounds.maxY,
      gridWidth
    )
    if (!colBounds) {
      // No occupied cells in columns
      return {
        bitboard: this.newWords(),
        newWidth: 0,
        newHeight: 0,
        minRow: 0,
        minCol: 0
      }
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

    return {
      bitboard: shiftedBitboard,
      newWidth,
      newHeight,
      minRow: rowBounds.minY,
      minCol: colBounds.minX
    }
  }

  shiftBitboardToOrigin (
    bitboard,
    gridWidth,
    minRowIndex,
    minColIndex,
    maxRowIndex
  ) {
    let resultBitboard = this.newWords()
    let destinationRowIndex = 0
    const rowMaskForWidth = this.rowMaskForWidth(gridWidth)
    const wordsPerRow = Math.ceil(gridWidth / 32)

    for (
      let sourceRowIndex = minRowIndex;
      sourceRowIndex <= maxRowIndex;
      sourceRowIndex++
    ) {
      const sourceRowStart = sourceRowIndex * wordsPerRow
      let rowBits = 0

      // Extract row bits
      for (
        let i = 0;
        i < wordsPerRow && sourceRowStart + i < bitboard.length;
        i++
      ) {
        rowBits |=
          bitboard[sourceRowStart + i] &
          (i === 0 ? rowMaskForWidth : 0xffffffff)
      }

      if (rowBits === 0) continue

      const shiftedRow = this.shiftRowBitsLeftByColumns(rowBits, minColIndex)
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
   * Decompose a multi-color bitboard into an array of 1-bit bitboards.
   * Each array index represents a non-zero color, with a 1-bit bitboard showing where that color appears.
   * @param {Uint32Array} bitboard - Multi-color bitboard (may have depth > 1)
   * @param {number} gridWidth - Grid width
   * @param {number} gridHeight - Grid height
   * @returns {Uint32Array[]} Array of 1-bit bitboards, indexed by color (1 to maxColor)
   */
  extractColorLayers (bitboard, gridWidth, gridHeight) {
    const totalCells = gridWidth * gridHeight
    let maxColor = 0
    const one = this.one
    // Find the maximum color value
    for (let i = 0; i < totalCells; i++) {
      const color = this.getIdx(bitboard, i)
      if (color > maxColor) {
        maxColor = color
      }
    }

    // Create array of bitboards for each non-zero color (1 to maxColor)
    const colorLayers = new Array(maxColor)
    for (let i = 0; i < maxColor; i++) {
      colorLayers[i] = this.newWords()
    }

    // For each cell with non-zero color, set the bit in the appropriate color bitboard
    for (let i = 0; i < totalCells; i++) {
      const color = this.getIdx(bitboard, i)
      if (color !== 0) {
        const idx = color - 1
        // Set value 1 at this cell position in the color layer
        this.singleBitStore.setAtIdx(colorLayers[idx], i, one)
      }
    }

    return colorLayers
  }

  /**
   * Extract a single color layer from a bitboard.
   * Creates a 1-bit bitboard where cells containing the specified color have bit 1, others have bit 0.
   * @param {Uint32Array} bitboard - The multi-color bitboard
   * @param {number} color - The specific color to extract (1 to maxColor)
   * @param {number} gridWidth - Grid width
   * @param {number} gridHeight - Grid height
   * @returns {Uint32Array} 1-bit bitboard with the specified color extracted
   */
  extractColorLayer (bitboard, color, gridWidth, gridHeight) {
    const totalCells = gridWidth * gridHeight
    const resultBitboard = this.newWords()
    const one = this.one
    // For each cell, if it has the target color, set one bit in the result
    // (no depth scaling - this is a 1-bit representation)
    for (let i = 0; i < totalCells; i++) {
      if (this.getIdx(bitboard, i) === color) {
        this.singleBitStore.setAtIdx(resultBitboard, i, one)
      }
    }

    return resultBitboard
  }

  /**
   * Extract a 1-bit occupancy layer from the bitboard.
   * @param {Uint32Array} bitboard
   * @param {number} gridWidth
   * @param {number} gridHeight
   * @returns {Uint32Array}
   */
  extractOccupancyLayer (bitboard, gridWidth, gridHeight) {
    const totalCells = gridWidth * gridHeight
    const resultBitboard = this.newWords()
    const one = this.one
    for (let i = 0; i < totalCells; i++) {
      if (this.getIdx(bitboard, i) !== 0) {
        this.singleBitStore.setAtIdx(resultBitboard, i, one)
      }
    }

    return resultBitboard
  }

  /**
   * Backward-compatible alias for extractOccupancyLayer.
   */
  extractOccuppancyLayer (bitboard, gridWidth, gridHeight) {
    return this.extractOccupancyLayer(bitboard, gridWidth, gridHeight)
  }

  resized (newWidth, newHeight) {
    return new Store32(
      this.depth,
      newWidth * newHeight,
      this.bitsPerCell,
      newWidth,
      newHeight
    )
  }

  get singleBitStore () {
    if (this.bitsPerCell === 1) return this
    if (this._singleBitStoreCache) return this._singleBitStoreCache
    this._singleBitStoreCache = new Store32(
      1,
      this.width * this.height,
      1,
      this.width,
      this.height
    )
    return this._singleBitStoreCache
  }
  /**
   * Reconstruct a multi-color bitboard from an array of 1-bit color layers.
   * Array indices represent non-zero colors: array[0] = color 1, array[1] = color 2, etc.
   * @param {Uint32Array[]} colorLayers - Array of 1-bit bitboards, indexed by color-1
   * @param {number} gridWidth - Grid width
   * @param {number} gridHeight - Grid height
   * @returns {Uint32Array} Multi-bit bitboard reconstructed from color layers
   */
  assembleColorLayers (colorLayers, gridWidth, gridHeight) {
    const resultBitboard = this.newWords()

    // For each color layer, merge its bits into the result at the appropriate color depth
    for (let colorIdx = 0; colorIdx < colorLayers.length; colorIdx++) {
      const color = colorIdx + 1 // Color 1 is at index 0, color 2 at index 1, etc.
      const colorLayer = colorLayers[colorIdx]

      // For each cell in the color layer, set the color in the result bitboard
      for (const { index: i, value } of this.singleBitIndexAndValue(
        colorLayer,
        gridWidth,
        gridHeight
      )) {
        if (value !== 0) {
          this.setAtIdx(resultBitboard, i, color)
        }
      }
    }

    return resultBitboard
  }

  /**
   * Reconstruct a multi-color bitboard from an array of 1-bit color layers with background.
   * Array indices represent all colors: array[0] = color 0, array[1] = color 1, etc.
   * @param {Uint32Array[]} colorLayers - Array of 1-bit bitboards, indexed by color
   * @param {number} gridWidth - Grid width
   * @param {number} gridHeight - Grid height
   * @returns {Uint32Array} Multi-bit bitboard reconstructed from color layers
   */
  assembleColorLayersWithBackground (colorLayers, gridWidth, gridHeight) {
    const totalCells = gridWidth * gridHeight
    const resultBitboard = this.newWords()

    // For each color layer, merge its bits into the result at the appropriate color depth
    for (let colorIdx = 0; colorIdx < colorLayers.length; colorIdx++) {
      const color = colorIdx // Color 0 is at index 0, color 1 at index 1, etc.
      const colorLayer = colorLayers[colorIdx]

      // For each cell in the color layer, set the color in the result bitboard
      for (const { index: i, value } of this.singleBitIndexAndValue(
        colorLayer,
        gridWidth,
        gridHeight
      )) {
        if (value !== 0) {
          this.setAtIdx(resultBitboard, i, color)
        }
      }
    }
    return resultBitboard
  }
  *indexAndValue (bitboard, gridWidth, gridHeight) {
    const totalCells = gridWidth * gridHeight
    for (let i = 0; i < totalCells; i++) {
      const value = this.getIdx(bitboard, i)
      yield { index: i, value }
    }
  }
  *singleBitIndexAndValue (bitboard, gridWidth, gridHeight) {
    const totalCells = gridWidth * gridHeight
    for (let i = 0; i < totalCells; i++) {
      const value = this.singleBitStore.getIdx(bitboard, i)
      yield { index: i, value }
    }
  }
  /**
   * Create a 1-bit bitboard representing occupancy of non-zero colors.
   * Each cell with a non-zero color value becomes a 1-bit, others become 0-bits.
   * @param {Uint32Array} bitboard - Multi-color bitboard
   * @param {number} gridWidth - Grid width
   * @param {number} gridHeight - Grid height
   * @returns {Uint32Array} 1-bit bitboard showing which cells have non-zero colors
   */
  occupancyLayerOfSize (bitboard, gridWidth, gridHeight) {
    const resultBitboard = this.newWords()

    // Create a 1-bit bitboard with one bit per occupied cell
    // Each occupied cell maps to exactly 1 bit in the output
    for (const { index: i, value } of this.indexAndValue(
      bitboard,
      gridWidth,
      gridHeight
    )) {
      if (value !== 0) {
        // Set one bit for this occupied cell (no depth scaling)
        this.singleBitStore.setAtIdx(resultBitboard, i, 1)
      }
    }

    return resultBitboard
  }
}
