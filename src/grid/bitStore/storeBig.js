import { StoreBase } from './storeBase.js'
import { popcountBigInt } from '../placeTools.js'
import { bitsSafeBI } from '../bitHelpers.js'
const one = 1n
const zero = 0n

export class StoreBig extends StoreBase {
  constructor (depth = 1, size = 0, bitLength, width, height) {
    super(one, zero, BigInt, depth, size, bitLength, width, height)

    // Store32-compatible properties
    this.bitsPerCell = this.bitsPerCell || 1
    this.cellsPerWord = Math.floor(256 / this.bitsPerCell) // BigInt word size is larger
    this.cpwShift = Math.log2(this.cellsPerWord)
    // wordsPerRow should divide grid width by cells-per-word
    this.wordsPerRow = width ? Math.ceil(width / this.cellsPerWord) : 0
    this.maxCellInWord = this.cellsPerWord - 1
  }

  getBitAt (bitboard, bitPosition) {
    return this.extractBit(bitboard, bitPosition) === 1n
  }

  extractBit (bitboard, bitPosition) {
    return this.extractRange(bitboard, bitPosition, 1n)
  }
  *bitsOccupied (bitboard, size = this.size) {
    return yield* bitsSafeBI(size, bitboard)
  }
  getIdx (bitboard, idx) {
    const bitPosition = idx * this.bitsPerCell
    return this.extractCell(bitboard, bitPosition)
  }
  hasIdxSet (bitboard, idx) {
    return this.getIdx(bitboard, idx) > 0n
  }

  extractCell (bitboard, bitPosition) {
    return this.extractRange(bitboard, bitPosition, this.cellMask)
  }

  setIdx (bitboard, idx, value = 1n) {
    const bitPosition = BigInt(idx * this.bitsPerCell)
    const color = BigInt(value)
    return this.setCellBitsAt(bitPosition, bitboard, color)
  }

  setCellBitsAt (bitPosition, bitboard, value) {
    const mask = this.cellMask << bitPosition
    return (bitboard & ~mask) | (this.clampToCell(value) << bitPosition)
  }

  invertedBits (bitboard) {
    if (bitboard === 0n) return this.fullBits
    return this.fullBits & ~bitboard
  }

  occupancy (bitboard) {
    return popcountBigInt(bitboard)
  }
  get isSingleBit () {
    return this.bitsPerCell === 1
  }
  get isMultiBit () {
    return this.bitsPerCell > 1
  }
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

  extractCellValue (word, cellMask) {
    return word & cellMask
  }

  setBitInBigInt (biValue, bitIndex) {
    return biValue | (1n << bitIndex)
  }

  shiftWordToCellMask (word) {
    return word >> this.bitWidth
  }

  // Bitwise operations for BigInt
  bitEqual (a, b) {
    if (a == null || b == null) return false
    return a === b
  }
  bitOr (a, b) {
    return a | b
  }

  bitAnd (a, b) {
    return a & b
  }

  bitSub (a, b) {
    return a & ~b
  }
  bitSub3 (a, b, c) {
    return a & ~b & ~c
  }
  bitSubMany (a, bs) {
    let result = a
    for (const b of bs) {
      result &= ~b
    }
    return result
  }
  clone (bb) {
    return bb
  }

  // Bit shifting operations for BigInt
  shiftBits (src, shift) {
    if (shift === 0) return src
    if (shift > 0) return src << BigInt(shift)
    return src >> BigInt(-shift)
  }

  // Template method implementations
  createEmptyBitboard (_template) {
    return 0n
  }

  empty (_size) {
    return 0n
  }

  // ============================================================================
  // Edge Mask Preparation (using base class helpers)
  // ============================================================================
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
  dilateCrossFast (bitboard, gridWidth, edgeMasks) {
    const notLeft = edgeMasks?.notLeft ?? this.fullBits
    const notRight = edgeMasks?.notRight ?? this.fullBits

    const left = (bitboard & notLeft) >> 1n
    const right = (bitboard & notRight) << 1n

    const up = bitboard >> BigInt(gridWidth)
    const down = bitboard << BigInt(gridWidth)

    return this.combineMasked(bitboard, left, right, up, down)
  }

  dilateHorizontalWrapStep (bitboard, gridWidth, gridHeight) {
    const leftRotated = this.rotateRowBits(bitboard, gridWidth, gridHeight, -1)
    const rightRotated = this.rotateRowBits(bitboard, gridWidth, gridHeight, 1)

    return this.combineMasked(bitboard, leftRotated, rightRotated)
  }

  // Per-cell horizontal expansion for multi-bit stores
  expandHorizontallyCellwise (bitboard) {
    const w = this.width
    let out = bitboard

    for (const [idx, val] of this.all.idxFilled(bitboard)) {
      out = this.setIdx(out, idx, val)
      const col = idx % w
      if (col > 0) out = this.setIdx(out, idx - 1, val)
      if (col < w - 1) out = this.setIdx(out, idx + 1, val)
    }
    return out
  }

  // Per-cell vertical propagation for multi-bit stores
  propagateVerticalCellwise (bitboard, gridWidth) {
    let out = bitboard
    const h = this.height
    const w = gridWidth
    for (const [idx, v] of this.all.idxFilled(bitboard)) {
      out = this.setIdx(out, idx, v)
      const row = Math.floor(idx / w)
      if (row > 0) out = this.setIdx(out, idx - w, v)
      if (row < h - 1) out = this.setIdx(out, idx + w, v)
    }
    return out
  }

  // Shift-based vertical propagation for 1-bit stores
  propagateVerticalShift (bitboard, gridWidth, edgeMasks) {
    const srcForUp = this.prepareSrcForUpExpansion(bitboard, edgeMasks)
    const srcForDown = this.prepareSrcForDownExpansion(bitboard, edgeMasks)

    const upShifted = this.shiftBits(srcForUp, -gridWidth)
    const downShifted = this.shiftBits(srcForDown, gridWidth)

    return this.combineMasked(bitboard, upShifted, downShifted)
  }

  // Per-cell horizontal erosion for multi-bit stores
  erodeHorizontalCellwise (bitboard) {
    let out = bitboard

    for (const [idx] of this.all.idxFilled(bitboard)) {
      if (!this.cellSurvivesHorizontalErosion(bitboard, idx)) {
        out = this.setIdx(out, idx, 0n)
      }
    }
    return out
  }

  // ============================================================================
  // Cell Boundary Erosion (using base class neighbor checks)
  // ============================================================================
  cellSurvivesHorizontalErosion (bitboard, idx) {
    const leftOk = this.cellHasLeftNeighbor(bitboard, idx, this.width)
    const rightOk = this.cellHasRightNeighbor(bitboard, idx, this.width)
    return leftOk && rightOk
  }

  cellSurvivesVerticalErosion (bitboard, idx, gridWidth) {
    const upOk = this.cellHasTopNeighbor(bitboard, idx, gridWidth)
    const downOk = this.cellHasBottomNeighbor(
      bitboard,
      idx,
      gridWidth,
      this.height
    )
    return upOk && downOk
  }

  // Per-cell vertical erosion for multi-bit stores
  erodeVerticalCellwise (bitboard, gridWidth) {
    const size = gridWidth * this.height
    let out = bitboard

    for (let idx = 0; idx < size; idx++) {
      const v = this.getIdx(bitboard, idx)
      if (v === 0n) continue
      if (!this.cellSurvivesVerticalErosion(bitboard, idx, gridWidth)) {
        out = this.setIdx(out, idx, 0n)
      }
    }
    return out
  }

  // Shift-based horizontal erosion for 1-bit stores
  erodeHorizontalShift (bitboard, edgeMasks) {
    if (!edgeMasks) return bitboard

    const bitShift = this.bitsPerCell
    const { leftConstraint, rightConstraint } =
      this.computeHorizontalErodeConstraints(bitboard, edgeMasks, bitShift)

    return bitboard & leftConstraint & rightConstraint
  }

  // ============================================================================
  // Horizontal Erosion - Constraint Computation
  // ============================================================================
  _computeInvertedEdgeMaskBigInt (maskValue) {
    if (typeof maskValue === 'bigint') return maskValue
    return BigInt(maskValue || 0n)
  }

  _computeInvertedEdgeMask (edgeMasks, maskKey) {
    const fullMask = this.fullBits
    const maskValue = this._computeInvertedEdgeMaskBigInt(edgeMasks?.[maskKey])
    return ~maskValue & fullMask
  }

  computeInvertedLeftMask (edgeMasks) {
    return this._computeInvertedEdgeMask(edgeMasks, 'notLeft')
  }

  computeInvertedRightMask (edgeMasks) {
    return this._computeInvertedEdgeMask(edgeMasks, 'notRight')
  }

  _computeHorizontalConstraintFromShift (bitboard, bitShift, invertedMask) {
    const shiftedNeighbor = this.shiftBits(bitboard, bitShift)
    return shiftedNeighbor | invertedMask
  }

  computeHorizontalErodeConstraints (bitboard, edgeMasks, bitShift) {
    const invNotLeft = this.computeInvertedLeftMask(edgeMasks)
    const invNotRight = this.computeInvertedRightMask(edgeMasks)

    const leftConstraint = this._computeHorizontalConstraintFromShift(
      bitboard,
      bitShift,
      invNotLeft
    )
    const rightConstraint = this._computeHorizontalConstraintFromShift(
      bitboard,
      -bitShift,
      invNotRight
    )
    return { leftConstraint, rightConstraint }
  }

  // Shift-based vertical erosion for 1-bit stores
  erodeVerticalShift (bitboard, gridWidth, edgeMasks) {
    const { upConstraint, downConstraint } =
      this.computeVerticalErodeConstraints(bitboard, gridWidth, edgeMasks)
    return bitboard & upConstraint & downConstraint
  }

  // ============================================================================
  // Vertical Erosion - Constraint Computation
  // ============================================================================
  computeVerticalErodeConstraints (bitboard, gridWidth, edgeMasks) {
    const upShifted = this.shiftBits(bitboard, -gridWidth)
    const downShifted = this.shiftBits(bitboard, gridWidth)

    if (!edgeMasks) {
      return { upConstraint: upShifted, downConstraint: downShifted }
    }

    const fullMask = this.fullBits
    const notTopBig = this._computeInvertedEdgeMaskBigInt(edgeMasks.notTop)
    const notBottomBig = this._computeInvertedEdgeMaskBigInt(
      edgeMasks.notBottom
    )
    const invNotTop = ~notTopBig & fullMask
    const invNotBottom = ~notBottomBig & fullMask

    const upConstraint = downShifted | invNotTop
    const downConstraint = upShifted | invNotBottom
    return { upConstraint, downConstraint }
  }

  erodeVerticalClampStep (bitboard, gridWidth, edgeMasks) {
    // Use per-cell erosion for multi-bit stores, shift-based for 1-bit
    if (this.isMultiBit) {
      return this.erodeVerticalCellwise(bitboard, gridWidth)
    }
    return this.erodeVerticalShift(bitboard, gridWidth, edgeMasks)
  }

  erodeHorizontalClampStep (bitboard, edgeMasks) {
    // Use per-cell erosion for multi-bit stores, shift-based for 1-bit
    if (this.isMultiBit) {
      return this.erodeHorizontalCellwise(bitboard)
    }
    return this.erodeHorizontalShift(bitboard, edgeMasks)
  }

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

    return this.combineMasked(bitboard, leftShifted, rightShifted)
  }

  dilateVerticalStep (bitboard, gridWidth, edgeMasks) {
    // Use per-cell propagation for multi-bit stores, shift-based for 1-bit
    if (this.isMultiBit) {
      return this.propagateVerticalCellwise(bitboard, gridWidth)
    }
    return this.propagateVerticalShift(bitboard, gridWidth, edgeMasks)
  }

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
  isEmpty (bitboard) {
    return bitboard === 0n
  }

  isCellOccupied (word) {
    return this.clampToCell(word) != 0n
  }
  extractRange (bitboard, bitPosition, rangeMask) {
    const pos =
      typeof bitPosition === 'bigint' ? bitPosition : BigInt(bitPosition)
    const bb = typeof bitboard === 'bigint' ? bitboard : BigInt(bitboard)
    const mask = typeof rangeMask === 'bigint' ? rangeMask : BigInt(rangeMask)
    return (bb >> pos) & mask
  }
  extractRowAtIndex (bitboard, rowIndex, gridWidth, rowMaskForWidth) {
    const rowStart = this.bitPos(Number(rowIndex) * Number(gridWidth))
    return this.extractRange(bitboard, rowStart, rowMaskForWidth)
  }

  expandToSquare (bits, gridHeight, gridWidth) {
    if (gridHeight === gridWidth) return bits
    const N = Math.max(gridHeight, gridWidth)
    return this.expandToWidth(gridWidth, gridHeight, bits, N)
  }

  mapRows (bits, width, height, newWidth, transform) {
    let result = 0n
    const minWidth = Math.min(width, newWidth)
    const grid = this.grid(minWidth, height)
    const rowMask = grid.rowMask()

    for (const row of grid.rows()) {
      const rowBits = this.extractRowAtIndex(bits, row, width, rowMask)
      const newRow = transform(rowBits, row)
      result |= newRow << this.bitPos(row * newWidth)
    }

    return result
  }
  expandToWidth (gridWidth, gridHeight, bits, newWidth) {
    return this.mapRows(bits, gridWidth, gridHeight, newWidth, row => row)
  }

  shrinkTo (gridWidth, bits, newWidth, newHeight) {
    return this.mapRows(bits, gridWidth, newHeight, newWidth, row => row)
  }

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
      out |= row << this.bitPos(rowIndex * newWidth + offsetBits)
    }
    return out
  }

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
    const rowMaskForWidth = grid.rowMask()

    for (const rowIndex of grid.rows()) {
      const row = this.extractRowAtIndex(
        bits,
        rowIndex,
        gridWidth,
        rowMaskForWidth
      )
      out |= row << this.bitPos(rowIndex * newWidth + offsetX)
    }
    return out << this.bitPos(offsetY * newWidth)
  }

  expandToBitsPerCell (bitboard, newBitsPerCell) {
    const oldBitsPerCell = this.bitsPerCell

    if (oldBitsPerCell === newBitsPerCell) return bitboard
    if (newBitsPerCell < oldBitsPerCell) {
      return this.shrinkToBitsPerCell(bitboard, newBitsPerCell)
    }
    const newStore = this.storeWith(newBitsPerCell)
    let output = 0n

    for (const [i, cellValue] of this.all.idxCells(bitboard)) {
      output = newStore.setIdx(output, i, cellValue)
    }

    return output
  }

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

    for (const [i, value] of this.all.idxCells(bitboard)) {
      const cellValue = value & newCellMask
      output = newStore.setIdx(output, i, cellValue)
    }
    return output
  }

  //(bitboard >> BigInt(bitPosition)) & rangeMask
  findRowBounds (bitboard, gridHeight) {
    gridHeight = gridHeight || this.height || Number.POSITIVE_INFINITY
    let minRowIndex = gridHeight
    let maxRowIndex = -1

    for (let rowIndex = 0; rowIndex < gridHeight; rowIndex++) {
      const rowOccupancyMask = this.extractRowOccupancy(bitboard, rowIndex)

      if (rowOccupancyMask !== 0n) {
        minRowIndex = Math.min(minRowIndex, rowIndex)
        maxRowIndex = Math.max(maxRowIndex, rowIndex)
      }
    }

    return minRowIndex <= maxRowIndex
      ? { minY: minRowIndex, maxY: maxRowIndex }
      : null
  }

  extractRowOccupancy (bitboard, rowIndex) {
    // Extract the contiguous row bits for the given row index using a row mask
    const rowMaskForWidth = this.all.rowMask()
    return this.extractRowAtIndex(
      bitboard,
      rowIndex,
      this.width,
      rowMaskForWidth
    )
  }

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

  isBitSet (bitboard, bitPosition) {
    return this.extractBit(bitboard, bitPosition) === 1n
  }

  msbIndex (value) {
    let mostSignificantBitIndex = -1
    let currentValue = value

    while (currentValue > zero) {
      currentValue >>= one
      mostSignificantBitIndex++
    }
    return mostSignificantBitIndex
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
      if (rowBits === zero) continue

      minRowIndex = Math.min(minRowIndex, rowIndex)
      const colPosOfFirstBit = this.countTrailingZeros(rowBits)
      const colIndexOfFirstBit = Math.floor(colPosOfFirstBit / this.bitsPerCell)
      minColIndex = Math.min(minColIndex, colIndexOfFirstBit)
    }
    return { minRow: minRowIndex, minCol: minColIndex }
  }

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

  rangeMask (startIndex, endIndex) {
    const size = this.rangeSize(startIndex, endIndex)
    return this.rangeMaskForSize(size)
  }

  rangeMaskForSize (size) {
    return (one << BigInt(size)) - one
  }

  rowRangeMask (rowIndex, startColumn, endColumn) {
    const startBitPosition = this.bitPos(rowIndex + startColumn)
    const rangeForColumns = this.rangeMask(startColumn, endColumn)
    return rangeForColumns << BigInt(startBitPosition)
  }

  setRange (bitboard, rowIndex, startColumn, endColumn) {
    const rangeToSet = this.rowRangeMask(rowIndex, startColumn, endColumn)
    return bitboard | rangeToSet
  }

  clearRange (bitboard, rowIndex, startColumn, endColumn) {
    const rangeToClear = this.rowRangeMask(rowIndex, startColumn, endColumn)
    return bitboard & ~rangeToClear
  }

  rowMask (gridWidth) {
    const widthInBits = this.bitPos(gridWidth)
    return this.rangeMaskForSize(widthInBits)
  }

  countTrailingZeros (value) {
    let trailingZeroCount = 0
    let currentValue = value

    while ((currentValue & one) === zero) {
      currentValue >>= one
      trailingZeroCount++
    }
    return trailingZeroCount
  }

  shiftTo (gridWidth, minRowIndex, gridHeight, bitboard, minColIndex) {
    if (minRowIndex === 0 && minColIndex === 0) return bitboard
    let resultBitboard = zero
    let destinationRowIndex = 0
    const rowMaskForWidth = this.rowMaskForWidth(gridWidth)

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
  shiftRowBitsLeftByColumns (rowBits, columnShift) {
    return rowBits >> BigInt(this.bitPos(columnShift))
  }

  placeRowAtDestination (accumulator, rowBits, gridWidth, destinationRowIndex) {
    const destinationBitPosition = BigInt(
      this.bitPos(destinationRowIndex * gridWidth)
    )
    return accumulator | (rowBits << destinationBitPosition)
  }

  shrinkToOccupied (bitboard, gridWidth, gridHeight) {
    // Find the bounding box of occupied cells
    const rowBounds = this.findRowBounds(bitboard, gridHeight)
    if (!rowBounds) {
      // No occupied cells
      return {
        bitboard: zero,
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
        bitboard: zero,
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

  shiftBitboardToOrigin (
    bitboard,
    gridWidth,
    minRowIndex,
    minColIndex,
    maxRowIndex
  ) {
    let resultBitboard = zero
    let destinationRowIndex = 0
    const rowMaskForWidth = this.rowMaskForWidth(gridWidth)

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
  storeWith (bitsPerCell) {
    if (this.bitsPerCell === bitsPerCell) return this
    if (bitsPerCell === 1) return this.singleBitStore
    if (!this._multiBitStoreCache) {
      this._multiBitStoreCache = {}
    }
    if (this._multiBitStoreCache[bitsPerCell])
      return this._multiBitStoreCache[bitsPerCell]
    const bitWidth = BigInt(bitsPerCell)
    this._multiBitStoreCache[bitsPerCell] = new StoreBig(
      2n ** bitWidth,
      this.width * this.height,
      bitsPerCell,
      this.width,
      this.height
    )
    return this._multiBitStoreCache[bitsPerCell]
  }
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
   */
  extractColorLayers (bitboard, gridWidth, gridHeight) {
    const numColors = this.grid(gridWidth, gridHeight).maxNumber(bitboard)

    // Create array of bitboards for each non-zero color (1 to maxColor)

    const colorLayers = new Array(numColors).fill(0n)

    // For each cell with non-zero color, set a marker in the appropriate color bitboard
    // Use this store (which preserves bitsPerCell) to ensure consistent cell layout
    for (const [i, color] of this.grid(gridWidth, gridHeight).idxFilled(
      bitboard
    )) {
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
   */
  extractColorLayer (bitboard, color, gridWidth, gridHeight) {
    const layerColor = BigInt(color)
    let resultBitboard = 0n
    const singleBitStore = this.singleBitStore
    for (const [i] of this.grid(gridWidth, gridHeight).idxFilledWith(
      bitboard,
      layerColor
    )) {
      resultBitboard = singleBitStore.setIdx(resultBitboard, i, 1n)
    }

    return resultBitboard
  }

  setOverlay (baseBitboard, overlayLayer, color) {
    if (this.isSingleBit) return baseBitboard | overlayLayer
    const baseBits = this.singleBitStore.expandToBitsPerCell(overlayLayer) // Validate overlay is 1-bit
    const colorValue = BigInt(color)
    const coloredOverlay = baseBits * colorValue
    return this.bitOr(baseBitboard, coloredOverlay)
  }
  clearOverlay (baseBitboard, overlayLayer, color) {
    if (this.isSingleBit) return baseBitboard & ~overlayLayer
    const baseBits = this.singleBitStore.expandToBitsPerCell(overlayLayer) // Validate overlay is 1-bit
    const colorValue = BigInt(color)
    const coloredOverlay = baseBits * colorValue
    return this.bitAnd(baseBitboard, ~coloredOverlay)
  }
  toggleOverlay (baseBitboard, overlayLayer, color) {
    if (this.isSingleBit) return baseBitboard ^ overlayLayer
    const baseBits = this.singleBitStore.expandToBitsPerCell(overlayLayer) // Validate overlay is 1-bit
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
        .idxFilled(colorLayer)) {
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
        .idxFilled(colorLayer)) {
        resultBitboard = this.setIdx(resultBitboard, i, color)
      }
    }

    return resultBitboard
  }
  /**
   * Create a 1-bit bitboard representing occupancy of non-zero colors.
   * Each cell with a non-zero color value becomes a 1-bit, others become 0-bits.
   * @param {bigint} bitboard - Multi-color bitboard
   * @param {number} gridWidth - Grid width
   * @param {number} gridHeight - Grid height
   * @returns {bigint} 1-bit bitboard showing which cells have non-zero colors
   */
  occupancyLayer (bitboard, gridWidth, gridHeight) {
    let resultBitboard = 0n
    const singleBitStore = this.singleBitStore
    // Create a 1-bit bitboard with one bit per occupied cell
    // Each occupied cell maps to exactly 1 bit in the output
    for (const [i] of this.grid(gridWidth, gridHeight).idxFilled(bitboard)) {
      resultBitboard = singleBitStore.setIdx(resultBitboard, i)
    }
    return resultBitboard
  }
}
