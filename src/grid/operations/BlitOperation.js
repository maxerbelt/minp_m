/**
 * BlitOperation - Encapsulates bitwise blitting operations
 * Handles copying/combining rectangular regions with various blend modes
 */
export class BlitOperation {
  constructor (maskInstance) {
    this.mask = maskInstance
    this.store = maskInstance.store
  }

  /**
   * Blit a source region into the mask at given destination
   * Supports multiple blend modes: copy, or, and, xor
   */
  blit (src, srcX, srcY, width, height, dstX, dstY, mode = 'copy') {
    for (let r = 0; r < height; r++) {
      const rowBits = src.sliceRow(srcY + r, srcX, srcX + width - 1)
      this.mask.bits = this.applyRowBlitOperation(
        this.mask.bits,
        rowBits,
        dstY + r,
        dstX,
        width,
        mode
      )
    }
  }

  /**
   * Apply blit operation for a single row
   */
  applyRowBlitOperation (currentBits, rowBits, dstY, dstX, width, mode) {
    const dstStart = this.store.bitPos(dstY * this.mask.width + dstX)
    return this.applyRowBlitOperationForBitPosition(
      currentBits,
      rowBits,
      dstStart,
      width,
      mode
    )
  }

  /**
   * Apply row blit operation given bit position
   */
  applyRowBlitOperationForBitPosition (
    currentBits,
    rowBits,
    dstStart,
    width,
    mode
  ) {
    return this.applyBlitMode(currentBits, rowBits, dstStart, width, mode)
  }

  /**
   * Select and apply the appropriate blend mode
   */
  applyBlitMode (currentBits, rowBits, dstStart, width, mode) {
    const shifted = rowBits << dstStart
    const mask = ((1n << BigInt(width)) - 1n) << dstStart

    switch (mode) {
      case 'copy':
        return (currentBits & ~mask) | shifted
      case 'or':
        return currentBits | shifted
      case 'and':
        return currentBits & shifted
      case 'xor':
        return currentBits ^ shifted
      default:
        return currentBits
    }
  }

  /**
   * Create a mask containing blit result
   */
  blitToMask (src, srcX, srcY, width, height, dstX, dstY, mode = 'copy') {
    const result = this.mask.clone
    this.blit(src, srcX, srcY, width, height, dstX, dstY, mode)
    return result
  }
}
