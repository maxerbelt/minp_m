/**
 * @module BlitOperation
 * @description Encapsulates bitwise blitting operations for rectangular region copying/combining.
 * Provides efficient bit-level transfer and blending of rectangular regions from source to
 * destination using various blend modes. Core functionality for grid-based spatial operations.
 * Supports blend modes: 'copy' (replace), 'or' (union), 'and' (intersect), 'xor' (toggle).
 */

/**
 * @typedef {Object} MaskInstance
 * @description A mask instance representing a set of grid coordinates with associated values
 * @property {bigint} bits - Current bit pattern
 * @property {Object} store - Bit store backend (BigInt-based storage with operations)
 * @property {Function} store.bitPos - Convert linear position to bit position: (pos) => number
 * @property {number} width - Grid width in cells
 * @property {Function} clone - Clone the mask: () => MaskInstance
 */

/**
 * @typedef {Object} SourceGrid
 * @description A source grid providing row extraction for blitting operations
 * @property {Function} sliceRow - Extract row bits: (row, startCol, endCol) => bigint
 */

/**
 * @typedef {Object} BlitOptions
 * @description Configuration for blit operations
 * @property {SourceGrid} src - Source grid to blit from
 * @property {number} [srcX=0] - Source X coordinate (column) to start reading from
 * @property {number} [srcY=0] - Source Y coordinate (row) to start reading from
 * @property {number} [width=0] - Width of region to blit (number of columns)
 * @property {number} [height=0] - Height of region to blit (number of rows)
 * @property {number} [dstX=0] - Destination X coordinate (column) to write to
 * @property {number} [dstY=0] - Destination Y coordinate (row) to write to
 * @property {string} [mode='copy'] - Blend mode: 'copy'|'or'|'and'|'xor'
 */

/**
 * BlitOperation - Encapsulates bitwise blitting operations.
 * Handles copying/combining rectangular regions with various blend modes.
 * Provides both destructive (blit) and non-destructive (blitToMask) operations.
 * @class BlitOperation
 * @description Bitwise blitting operations for rectangular region copying/combining
 * @public
 */
export class BlitOperation {
  /**
   * Constructor - Initialize blitter with target mask.
   *
   * Sets up the BlitOperation facade around a specific mask instance,
   * caching the store reference for efficient row blitting operations.
   * All blit operations will modify this mask's bits in-place or create
   * new masks derived from it.
   *
   * @param {MaskInstance} maskInstance - Target mask for blitting operations.
   * Must have bits (bigint), store (backend), width (number), and clone method.
   * @throws {TypeError} If maskInstance lacks required properties.
   * @public
   *
   * @example
   * const blitter = new BlitOperation(targetMask);
   * // Now ready to perform blit operations on targetMask
   */
  constructor (maskInstance) {
    this.mask = maskInstance
    this.store = maskInstance.store
  }

  // ==================== PUBLIC BLIT OPERATIONS ====================

  /**
   * Blit a source region into the mask at given destination (destructive).
   *
   * Performs in-place modification of this.mask.bits by copying/blending a rectangular
   * region from the source grid. Processes the region row-by-row, applying the selected
   * blend mode (copy, or, and, xor) for each row. Efficient for direct mask manipulation.
   *
   * Blend modes:
   *   - 'copy': Replace destination with source (clear then set)
   *   - 'or': Set destination bits where source is set (union)
   *   - 'and': Keep destination bits only where source is set (intersect)
   *   - 'xor': Toggle destination bits where source is set (symmetric difference)
   *
   * Use cases: Grid composition, obstacle placement, mask updates, combined terrain.
   *
   * @param {BlitOptions} options - Complete blit configuration.
   * Defaults: srcX=0, srcY=0, width=0, height=0, dstX=0, dstY=0, mode='copy'.
   * @returns {void} Modifies this.mask.bits in-place; no return value.
   * @public
   *
   * @example
   * // Copy 5x5 region from source at (0,0) to destination at (10, 10)
   * blitter.blit({
   *   src: sourceGrid,
   *   srcX: 0, srcY: 0, width: 5, height: 5,
   *   dstX: 10, dstY: 10,
   *   mode: 'copy'
   * });
   *
   * @example
   * // Union blit: merge source pattern into destination
   * blitter.blit({
   *   src: sourceGrid,
   *   srcX: 0, srcY: 0, width: 3, height: 3,
   *   dstX: 5, dstY: 5,
   *   mode: 'or'
   * });
   */
  blit ({
    src,
    srcX = 0,
    srcY = 0,
    width = 0,
    height = 0,
    dstX = 0,
    dstY = 0,
    mode = 'copy'
  } = {}) {
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
   * Create a mask containing blit result (non-destructive).
   *
   * Performs blit operation on a cloned copy of this mask, leaving the original
   * unchanged. Returns a new mask with the blitted region applied. Useful for
   * non-destructive operations, previewing blits, or building composite masks.
   *
   * Process: Clone mask → Apply blit to clone → Return cloned result.
   * Use cases: Preview operations, mask composition, conditional blitting.
   *
   * @param {SourceGrid} src - Source grid/mask with sliceRow method.
   * Must provide sliceRow(row, startCol, endCol) => bigint for row extraction.
   * @param {BlitOptions} [opts] - Optional blit parameters.
   * Defaults: srcX=0, srcY=0, width=0, height=0, dstX=0, dstY=0, mode='copy'.
   * @returns {MaskInstance} New mask instance with blit operation applied.
   * Original this.mask remains unchanged.
   * @public
   *
   * @example
   * // Create a composite mask without modifying original
   * const resultMask = blitter.blitToMask(sourceGrid, {
   *   srcX: 0, srcY: 0, width: 4, height: 4,
   *   dstX: 8, dstY: 8,
   *   mode: 'or'
   * });
   * // resultMask has the union applied; original mask unchanged
   */
  blitToMask (src, opts = {}) {
    const {
      srcX = 0,
      srcY = 0,
      width = 0,
      height = 0,
      dstX = 0,
      dstY = 0,
      mode = 'copy'
    } = opts
    const resultMask = this.mask.clone
    // Apply blit to a temporary BlitOperation instance on the cloned mask
    new BlitOperation(resultMask).blit({
      src,
      srcX,
      srcY,
      width,
      height,
      dstX,
      dstY,
      mode
    })
    return resultMask
  }

  // ==================== PRIVATE HELPERS ====================

  /**
   * Apply blend mode to a single row, accounting for destination position (private).
   *
   * Intermediate step between blit() and _applyBlitMode().
   * Transforms 2D destination coordinates (dstY, dstX) into a linear bit position,
   * then delegates to _applyBlitMode for the actual blend operation.
   *
   * Coordinate transformation: bitPos = store.bitPos(dstY * mask.width + dstX)
   * This linearizes the 2D grid coordinates into the 1D bitboard index.
   *
   * @private
   * @param {bigint} currentBits - Current bit pattern (mask state before blend).
   * @param {bigint} rowBits - Bits extracted from source row.
   * @param {number} dstY - Destination row index (0-based from grid origin).
   * @param {number} dstX - Destination column index (0-based from grid origin).
   * @param {number} width - Number of bits in the row to blend.
   * @param {string} mode - Blend mode: 'copy'|'or'|'and'|'xor'.
   * @returns {bigint} Result bits after blend operation applied to that row.
   * @throws {TypeError} If parameters are malformed
   *
   * @example
   * // Apply blend to row 5, starting at column 3, width 8
   * const result = this._applyRowBlitMode(
   *   currentBits, rowBits, 5, 3, 8, 'or'
   * );
   */
  _applyRowBlitMode (currentBits, rowBits, dstY, dstX, width, mode) {
    const bitPosition = this.store.bitPos(dstY * this.mask.width + dstX)
    return this._applyBlitMode(currentBits, rowBits, bitPosition, width, mode)
  }

  /**
   * Apply blend mode given pre-computed bit position (private core operation).
   *
   * Core blitting engine. Shifts row bits to the destination bit position,
   * computes the blend mask, and applies the selected blend mode.
   *
   * Bit operations:
   *   1. Shift source bits: rowBits << bitPosition (align to destination)
   *   2. Create blend mask: ((1n << width) - 1n) << bitPosition (region to affect)
   *   3. Apply blend mode using bitwise operations
   *
   * Blend modes:
   *   - 'copy': (currentBits & ~blitMask) | shiftedBits
   *     Clear destination region, then set source bits (replace)
   *   - 'or': currentBits | shiftedBits
   *     Set destination bits where source is set (union)
   *   - 'and': currentBits & shiftedBits
   *     Keep destination bits only where source is set (intersect)
   *   - 'xor': currentBits ^ shiftedBits
   *     Toggle destination bits where source is set (symmetric difference)
   *
   * @private
   * @param {bigint} currentBits - Current bit pattern (mask state before blend).
   * @param {bigint} rowBits - Source row bits (0-based, not shifted).
   * @param {number} bitPosition - Pre-calculated destination bit position in mask.
   * Computed from 2D coords via store.bitPos().
   * @param {number} width - Number of bits in the row to blend (1-based width).
   * @param {string} mode - Blend mode name: 'copy'|'or'|'and'|'xor'.
   * Default behavior for unknown modes: return unchanged currentBits (no-op).
   * @returns {bigint} Result bits after blend operation.
   * Same size as currentBits with the blitted row applied.
   * @throws {TypeError} If parameters are malformed or mode is invalid
   *
   * @example
   * // Blit 8-bit row at bit position 1024 using 'or' mode
   * const result = this._applyBlitMode(
   *   currentBits,
   *   0xFFn,  // 8 bits set
   *   1024,   // destination bit position
   *   8,      // width
   *   'or'    // union blend
   * );
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
