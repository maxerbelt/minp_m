import { BitMath } from './bitMath.js'
import { BitGrid } from './bitgrid.js'
export class StoreBase {
  constructor (
    one,
    empty,
    storeType,
    depth = 1,
    size = 0,
    bitLength,
    width,
    height
  ) {
    this.depth = depth
    this.empty = empty
    this.one = one
    const bitsPerCell = BitMath.bitsPerCell(depth, bitLength)
    const cellMask = (1 << bitsPerCell) - 1
    const bShift = Math.log2(bitsPerCell)

    this.bitsPerCell = bitsPerCell
    this.width = width
    this.height = height
    this.all = new BitGrid(this, width, height)
    this.cellMask = storeType(cellMask)

    this.bShift = storeType(bShift)
    this.bitWidth = storeType(bitsPerCell)
    this.maxBitInCell = storeType(bitsPerCell - 1)
    this.MxC = (1 << bitsPerCell) - 1
    this.MnC = 0
    this.size = storeType(size)
    this.storeType = storeType
  }

  index (pos) {
    return Number(pos >> this.maxBitInCell)
  }
  bitPos (i) {
    return this.storeType(i) << this.maxBitInCell
  }

  bitMask (i) {
    return this.bitMaskByPos(this.bitPos(i))
  }
  bitMaskByPos (pos) {
    return this.cellMask << this.storeType(pos)
  }
  grid (width, height) {
    return new BitGrid(this, width, height)
  }
  numValue (bitboard, pos) {
    return Number(this.rightShift(bitboard, pos))
  }
  value (bitboard, pos) {
    return this.rightShift(bitboard, pos)
  }
  setMask (pos, color = 1) {
    return this.leftShift(color, pos)
  }
  clampToCell (color) {
    return this.clamp(color, this.cellMask)
  }
  clamp (color, mask) {
    return this.storeType(color) & mask
  }
  leftShift (color, shift) {
    return this.clampToCell(color) << this.storeType(shift)
  }
  rightShift (color, shift) {
    return this.clampToCell(color >> this.storeType(shift))
  }
  addBit (bitboard, i) {
    const mask = this.bitMask(i)
    const result = bitboard | mask
    return result
  }

  combineMasked (...values) {
    const fullMask = this.fullBits
    return this.combine(...values) & fullMask
  }
  combine (...values) {
    let result = this.empty
    for (const v of values) result |= this.storeType(v)
    return result
  }
  check (color = 1) {
    if (this.depth > 1 && (color < this.MnC || color > this.MxC)) {
      throw new Error(`color must be ${this.MnC}..${this.MxC}`)
    }
  }
  clearCell (bitboard) {
    return bitboard & ~this.cellMask
  }
  clearBits (bitboard, mask) {
    return bitboard & ~mask
  }
  hasBit (bitboard, pos) {
    if (pos !== undefined) {
      return this.value(bitboard, pos) !== this.empty
    }
    return false
  }

  rowMaskForWidth (w) {
    return this.rangeMaskForSizeRaw(this.bitPos(w))
  }
  extractRowAtIndex (bb, r, w, rowMask) {
    return (bb >> this.storeType(r * w)) & rowMask
  }

  ctz (x) {
    let n = 0
    while ((x & this.one) === this.empty) {
      x >>= this.one
      n++
    }
    return n
  }

  msbIndex (x) {
    let n = -1
    while (x > this.empty) {
      x >>= this.one
      n++
    }
    return n
  }
  get fullBits () {
    return this.rangeMaskForSizeRaw(this.size)
  }
  rangeMaskForSizeRaw (n) {
    return (this.one << n) - this.one
  }
  rangeMaskForSize (n) {
    return this.rangeMaskForSizeRaw(this.storeType(n))
  }

  // Common methods shared with StoreBig and Store32
  extractCellValue (word, cellMask) {
    return word & cellMask
  }

  rangeSize (startIndex, endIndex) {
    return this.bitPos(endIndex - startIndex + 1)
  }
  expandToDepth (bitboard, newDepth) {
    const newBitsPerCell = BitMath.bitsPerCell(newDepth)
    this.expandToBitsPerCell(bitboard, newBitsPerCell)
  }
  shrinkToDepth (bitboard, newDepth) {
    const newBitsPerCell = BitMath.bitsPerCell(newDepth)
    this.shrinkToBitsPerCell(bitboard, newBitsPerCell)
  }

  combineRotatedRowWithResult (accumulator, rowBits) {
    return accumulator | rowBits
  }

  // Generic method to apply a step operation multiple times for a given radius
  applyRadiusSteps (bitboard, radius, stepFn, args) {
    let result = bitboard
    for (let step = 0; step < radius; step++) {
      result = stepFn.call(this, result, ...args)
    }
    return result
  }

  // Orchestration methods that delegate to subclass step implementations
  dilate1D_horizontal (bitboard, radius, edgeMasks) {
    const masks = edgeMasks || this._createDefaultEdgeMasks()
    return this.applyRadiusSteps(bitboard, radius, this.dilateHorizontalStep, [
      masks
    ])
  }

  dilate1D_vertical (bitboard, gridWidth, radius, edgeMasks) {
    const masks = edgeMasks || this._createDefaultEdgeMasks()
    return this.applyRadiusSteps(bitboard, radius, this.dilateVerticalStep, [
      gridWidth,
      masks
    ])
  }

  /**
   * Create default edge masks that allow expansion everywhere (no clamping)
   * Subclasses should override if they need different defaults
   */
  _createDefaultEdgeMasks () {
    // Default: all bits can expand (no clipping)
    return {
      left: this.empty,
      right: this.empty,
      top: this.empty,
      bottom: this.empty,
      notLeft: ~this.empty,
      notRight: ~this.empty,
      notTop: ~this.empty,
      notBottom: ~this.empty
    }
  }

  dilateSeparable (bitboard, gridWidth, radius, edgeMasks) {
    const horizontalDilated = this.dilate1D_horizontal(
      bitboard,
      radius,
      edgeMasks
    )
    const horizontalAndVerticalDilated = this.dilate1D_vertical(
      horizontalDilated,
      gridWidth,
      radius,
      edgeMasks
    )
    return horizontalAndVerticalDilated
  }

  dilate1D_horizontal_wrap (bitboard, gridWidth, gridHeight, radius) {
    return this.applyRadiusSteps(
      bitboard,
      radius,
      this.dilateHorizontalWrapStep,
      [gridWidth, gridHeight]
    )
  }

  // Build edge masks for horizontal cross expansion (left/right boundaries)
  buildHorizontalEdgeMasks (bitboard, gridWidth, gridHeight) {
    let notLeftMask = this.createEmptyBitboard(bitboard)
    let notRightMask = this.createEmptyBitboard(bitboard)
    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        const idx = y * gridWidth + x
        if (x !== 0) notLeftMask = this.addBit(notLeftMask, idx)
        if (x !== gridWidth - 1) notRightMask = this.addBit(notRightMask, idx)
      }
    }
    return { notLeftMask, notRightMask }
  }

  // Get or create horizontal edge masks based on available context
  getHorizontalEdgeMasks (edgeMasks, bitboard, gridWidth, gridHeight) {
    if (edgeMasks?.notLeft && edgeMasks?.notRight) {
      return {
        notLeftMask: edgeMasks.notLeft,
        notRightMask: edgeMasks.notRight
      }
    }
    if (typeof gridWidth === 'number' && typeof gridHeight === 'number') {
      return this.buildHorizontalEdgeMasks(bitboard, gridWidth, gridHeight)
    }
    // Fallback: allow all expansion (identity masks)
    return { notLeftMask: bitboard, notRightMask: bitboard }
  }

  // Apply horizontal expansion to source bits (left and right shifts)
  expandHorizontalWithMasks (bitboard, srcForLeft, srcForRight) {
    const leftShifted = this.shiftBits(srcForLeft, -1)
    const rightShifted = this.shiftBits(srcForRight, 1)
    return { leftShifted, rightShifted }
  }

  dilateCrossStep (bitboard, gridWidth, gridHeight = this.height, edgeMasks) {
    // Vertical: simple shifts by grid width
    const upShifted = this.shiftBits(bitboard, -gridWidth)
    const downShifted = this.shiftBits(bitboard, gridWidth)

    // Horizontal: respect row boundaries using edge masks
    const { notLeftMask, notRightMask } = this.getHorizontalEdgeMasks(
      edgeMasks,
      bitboard,
      gridWidth,
      gridHeight
    )
    const srcForLeft = this.bitAnd(bitboard, notLeftMask)
    const srcForRight = this.bitAnd(bitboard, notRightMask)
    const { leftShifted, rightShifted } = this.expandHorizontalWithMasks(
      bitboard,
      srcForLeft,
      srcForRight
    )

    return this.combineMasked(
      bitboard,
      upShifted,
      downShifted,
      leftShifted,
      rightShifted
    )
  }

  erodeHorizontalClamp (bitboard, radius, edgeMasks) {
    return this.applyRadiusSteps(
      bitboard,
      radius,
      this.erodeHorizontalClampStep,
      [edgeMasks]
    )
  }

  erodeVerticalClamp (bitboard, gridWidth, radius, edgeMasks) {
    return this.applyRadiusSteps(
      bitboard,
      radius,
      this.erodeVerticalClampStep,
      [gridWidth, edgeMasks]
    )
  }

  rotateRowBits (sourceBitboard, gridWidth, gridHeight, shiftAmount) {
    let resultBitboard = this.createEmptyBitboard(sourceBitboard)
    this._applyToEachRow(gridWidth, gridHeight, rowIndex => {
      const rotatedRowBits = this.rotateRowBitsForSingleRow(
        sourceBitboard,
        gridWidth,
        rowIndex,
        shiftAmount
      )
      resultBitboard = this.combineRotatedRowWithResult(
        resultBitboard,
        rotatedRowBits
      )
    })
    return resultBitboard
  }

  // ============================================================================
  // Row Iteration Helper
  // ============================================================================
  _applyToEachRow (gridWidth, gridHeight, callback) {
    for (let rowIndex = 0; rowIndex < gridHeight; rowIndex++) {
      callback(rowIndex)
    }
  }

  // ============================================================================
  // Edge Mask Preparation Helpers
  // ============================================================================
  _prepareSrcWithEdgeMask (bitboard, edgeMasks, maskKey) {
    if (edgeMasks?.[maskKey]) return this.bitAnd(bitboard, edgeMasks[maskKey])
    return bitboard
  }
  prepareSrcForLeftExpansion (bitboard, edgeMasks) {
    return this._prepareSrcWithEdgeMask(bitboard, edgeMasks, 'notLeft')
  }
  prepareSrcForRightExpansion (bitboard, edgeMasks) {
    return this._prepareSrcWithEdgeMask(bitboard, edgeMasks, 'notRight')
  }
  prepareSrcForUpExpansion (bitboard, edgeMasks) {
    return this._prepareSrcWithEdgeMask(bitboard, edgeMasks, 'notTop')
  }
  prepareSrcForDownExpansion (bitboard, edgeMasks) {
    return this._prepareSrcWithEdgeMask(bitboard, edgeMasks, 'notBottom')
  }

  // ============================================================================
  // Cell Boundary Detection Helpers
  // ============================================================================
  _getCoordinates (idx, gridWidth) {
    return {
      x: idx % gridWidth,
      row: Math.floor(idx / gridWidth)
    }
  }
  _isAtBoundary (coordinate, limit) {
    return coordinate === 0 || coordinate === limit - 1
  }
  _hasNeighbor (bitboard, neighborIdx) {
    return this.getIdx(bitboard, neighborIdx) !== 0
  }
  _checkBoundaryOrNeighbor (isAtBoundary, hasNeighbor) {
    return isAtBoundary || hasNeighbor
  }

  cellHasLeftNeighbor (bitboard, idx, gridWidth) {
    const { x } = this._getCoordinates(idx, gridWidth)
    const isAtLeft = x === 0
    const hasNeighbor = this._hasNeighbor(bitboard, idx - 1)
    return this._checkBoundaryOrNeighbor(isAtLeft, hasNeighbor)
  }

  cellHasRightNeighbor (bitboard, idx, gridWidth) {
    const { x } = this._getCoordinates(idx, gridWidth)
    const isAtRight = x === gridWidth - 1
    const hasNeighbor = this._hasNeighbor(bitboard, idx + 1)
    return this._checkBoundaryOrNeighbor(isAtRight, hasNeighbor)
  }

  cellHasTopNeighbor (bitboard, idx, gridWidth) {
    const { row } = this._getCoordinates(idx, gridWidth)
    const isAtTop = row === 0
    const hasNeighbor = this._hasNeighbor(bitboard, idx - gridWidth)
    return this._checkBoundaryOrNeighbor(isAtTop, hasNeighbor)
  }

  cellHasBottomNeighbor (bitboard, idx, gridWidth, gridHeight) {
    const { row } = this._getCoordinates(idx, gridWidth)
    const isAtBottom = row === gridHeight - 1
    const hasNeighbor = this._hasNeighbor(bitboard, idx + gridWidth)
    return this._checkBoundaryOrNeighbor(isAtBottom, hasNeighbor)
  }

  // Abstract/Template methods - must be implemented by subclasses
  dilateHorizontalStep (bitboard, edgeMasks) {
    throw new Error('dilateHorizontalStep must be implemented by subclass')
  }

  dilateVerticalStep (bitboard, gridWidth, edgeMasks) {
    throw new Error('dilateVerticalStep must be implemented by subclass')
  }

  dilateHorizontalWrapStep (bitboard, gridWidth, gridHeight) {
    throw new Error('dilateHorizontalWrapStep must be implemented by subclass')
  }

  erodeHorizontalClampStep (bitboard, edgeMasks) {
    throw new Error('erodeHorizontalClampStep must be implemented by subclass')
  }

  erodeVerticalClampStep (bitboard, gridWidth, edgeMasks) {
    throw new Error('erodeVerticalClampStep must be implemented by subclass')
  }

  rotateRowBitsForSingleRow (sourceBitboard, gridWidth, rowIndex, shiftAmount) {
    throw new Error('rotateRowBitsForSingleRow must be implemented by subclass')
  }

  shiftBits (src, shift) {
    throw new Error('shiftBits must be implemented by subclass')
  }

  createEmptyBitboard (template) {
    throw new Error('createEmptyBitboard must be implemented by subclass')
  }
}
