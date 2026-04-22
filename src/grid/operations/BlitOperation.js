/**
 * BlitOperation - Encapsulates bitwise blitting operations
 * Handles copying/combining rectangular regions with various blend modes
 * Supports blend modes: 'copy' (replace), 'or' (union), 'and' (intersect), 'xor' (toggle)
 */
export class BlitOperation {
  /**
   * @param {Object} maskInstance - Mask instance with bits, store, width, emptyMask properties
   */
  constructor (maskInstance) {
    this.mask = maskInstance
    this.store = maskInstance.store
  }

  // ==================== PUBLIC BLIT OPERATIONS ====================

  /**
   * Blit a source region into the mask at given destination
   * Modifies this.mask.bits in-place by applying blend mode row-by-row
   * @param {Object} src - Source mask/grid with sliceRow method
   * @param {number} srcX - Source region left edge (x-coordinate)
   * @param {number} srcY - Source region top edge (y-coordinate)
   * @param {number} width - Region width in cells
   * @param {number} height - Region height in cells
   * @param {number} dstX - Destination left edge (x-coordinate)
   * @param {number} dstY - Destination top edge (y-coordinate)
   * @param {string} [mode='copy'] - Blend mode: 'copy'|'or'|'and'|'xor'
   * @returns {void} Updates this.mask.bits in-place
   */
  blit (src, srcX, srcY, width, height, dstX, dstY, mode = 'copy') {
    for (let rowIndex = 0; rowIndex < height; rowIndex++) {
      const sourceRowBits = src.sliceRow(
        srcY + rowIndex,
        srcX,
        srcX + width - 1
      )
      this.mask.bits = this._applyRowBlitMode(
        this.mask.bits,
        sourceRowBits,
        dstY + rowIndex,
        dstX,
        width,
        mode
      )
    }
  }

  /**
   * Create a mask containing blit result (non-destructive)
   * Returns a new mask with the blitted region; original unchanged
   * @param {Object} src - Source mask/grid with sliceRow method
   * @param {number} srcX - Source region left edge
   * @param {number} srcY - Source region top edge
   * @param {number} width - Region width in cells
   * @param {number} height - Region height in cells
   * @param {number} dstX - Destination left edge
   * @param {number} dstY - Destination top edge
   * @param {string} [mode='copy'] - Blend mode: 'copy'|'or'|'and'|'xor'
   * @returns {Object} New mask with blit operation applied
   */
  blitToMask (src, srcX, srcY, width, height, dstX, dstY, mode = 'copy') {
    const resultMask = this.mask.clone
    // Apply blit to a temporary BlitOperation instance on the cloned mask
    new BlitOperation(resultMask).blit(
      src,
      srcX,
      srcY,
      width,
      height,
      dstX,
      dstY,
      mode
    )
    return resultMask
  }

  // ==================== PRIVATE HELPERS ====================

  /**
   * Apply blend mode to a single row, accounting for destination position
   * Transforms 2D destination coords (dstY, dstX) to bit position and applies blend
   * @private
   * @param {bigint} currentBits - Current bit pattern
   * @param {bigint} rowBits - Bits from source row
   * @param {number} dstY - Destination row index
   * @param {number} dstX - Destination column index
   * @param {number} width - Row width in bits
   * @param {string} mode - Blend mode name
   * @returns {bigint} Result bits after blend operation
   */
  _applyRowBlitMode (currentBits, rowBits, dstY, dstX, width, mode) {
    const bitPosition = this.store.bitPos(dstY * this.mask.width + dstX)
    return this._applyBlitMode(currentBits, rowBits, bitPosition, width, mode)
  }

  /**
   * Apply blend mode given pre-computed bit position
   * Shifts row bits to destination and applies selected blend operation
   * Blend modes:
   *   - 'copy': Replace destination with source (clear then set)
   *   - 'or': Set destination bits where source is set (union)
   *   - 'and': Keep destination bits only where source is set (intersect)
   *   - 'xor': Toggle destination bits where source is set (symmetric diff)
   * @private
   * @param {bigint} currentBits - Current bit pattern
   * @param {bigint} rowBits - Source row bits
   * @param {number} bitPosition - Pre-calculated bit position in mask
   * @param {number} width - Row width in bits
   * @param {string} mode - Blend mode: 'copy'|'or'|'and'|'xor'
   * @returns {bigint} Result bits after blend operation
   */
  _applyBlitMode (currentBits, rowBits, bitPosition, width, mode) {
    const shiftedBits = rowBits << BigInt(bitPosition)
    const blitMask = ((1n << BigInt(width)) - 1n) << BigInt(bitPosition)

    switch (mode) {
      case 'copy':
        // Clear destination region, then set source bits
        return (currentBits & ~blitMask) | shiftedBits
      case 'or':
        // Union: set bits where source is set
        return currentBits | shiftedBits
      case 'and':
        // Intersect: keep bits only where source is set
        return currentBits & shiftedBits
      case 'xor':
        // Symmetric difference: toggle where source is set
        return currentBits ^ shiftedBits
      default:
        // Unknown mode; no-op
        return currentBits
    }
  }
}
