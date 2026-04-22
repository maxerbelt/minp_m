/**
 * Accessor for a single cell location in a bit-packed storage system.
 *
 * Provides a convenient interface for reading and writing cell values (colors)
 * at a specific location without exposing low-level bit manipulation.
 * Maintains consistency with the backing storage through validation and delegation.
 *
 * @template Store - The bit storage backend (e.g., StoreBig)
 */
export class ForLocation {
  /**
   * Create a location accessor for a specific cell position.
   *
   * @param {number} bitPosition - The bit-level position in the storage system
   * @param {bigint} cellBits - The current cell value bits from the storage
   * @param {Store} bitStore - Reference to the backing bit storage for operations
   */
  constructor (bitPosition, cellBits, bitStore) {
    /**
     * @type {number}
     * @private
     */
    this.bitPosition = bitPosition

    /**
     * @type {bigint}
     * @private
     */
    this.cellBits = cellBits

    /**
     * @type {Store}
     * @private
     */
    this.bitStore = bitStore
  }

  /**
   * Write a color value to this cell location, updating internal bits.
   *
   * Validates the color, creates a position mask, clears the old value,
   * and sets the new value in a single atomic operation. Mutates this.cellBits
   * to reflect the update.
   *
   * @param {number} [color=1] - Color value to write (must be valid per store.check)
   * @returns {bigint} Updated cell bits after the write
   * @throws {Error} If color is invalid (from bitStore.check)
   */
  set (color = 1) {
    this.bitStore.check(color)
    this.cellBits = this._computeUpdatedBits(color)
    return this.cellBits
  }

  /**
   * Read the current color value at this cell location.
   *
   * Retrieves the color stored at this position from the cell bits
   * using the backing store's value reader.
   *
   * @returns {number} Color value (typically 0-3 depending on bit depth)
   */
  readCellValue () {
    return this._readValueFromStore()
  }

  /**
   * Clear (zero out) all bits in the provided mask within this cell.
   *
   * Delegates to the backing store to remove bits matching the mask.
   * Does not affect bits outside the mask.
   *
   * @param {bigint} maskBits - Bit mask specifying which bits to clear
   * @returns {bigint} Cell bits after clearing the masked bits
   */
  clearMaskBits (maskBits) {
    return this.bitStore.clearBits(this.cellBits, maskBits)
  }

  /**
   * Test if the cell contains a specific color value.
   *
   * Compares the current cell color against an expected value.
   * Semantic alternative to `readCellValue() === color` for clarity.
   *
   * @param {number} [color=1] - Expected color value to test for
   * @returns {boolean} True if cell contains the specified color
   */
  hasColor (color = 1) {
    return this.readCellValue() === color
  }

  /**
   * Test if this cell location contains any non-zero value (is occupied).
   *
   * Determines if the cell has a value, useful for distinguishing empty (0)
   * from occupied (non-zero) cells. Checks against the store's empty sentinel.
   *
   * @returns {boolean} True if cell is occupied (contains a value)
   */
  isOccupied () {
    return (
      this.bitStore.value(this.cellBits, this.bitPosition) !==
      this.bitStore.empty
    )
  }

  /**
   * Compute updated cell bits with new color applied at this position.
   *
   * Performs the bit manipulation: clear old value, set new value.
   * Extracted as private helper to encapsulate the bit algebra and
   * reduce duplication in the set() method.
   *
   * @private
   * @param {number} color - Color value to apply
   * @returns {bigint} Updated bits with color applied at bitPosition
   */
  _computeUpdatedBits (color) {
    const positionMask = this.bitStore.bitMaskByPos(this.bitPosition)
    const clearedBits = this.bitStore.clearBits(this.cellBits, positionMask)
    const newValueMask = this.bitStore.setMask(this.bitPosition, color)
    return clearedBits | newValueMask
  }

  /**
   * Read value from backing store using current cell bits and position.
   *
   * Extracted as private helper to eliminate repeated delegation patterns
   * and ensure consistent use of store operations throughout the class.
   *
   * @private
   * @returns {number} Color value at this position
   */
  _readValueFromStore () {
    return this.bitStore.numValue(this.cellBits, this.bitPosition)
  }

  // ============================================================================
  // Backward Compatibility Aliases
  // ============================================================================
  // These preserve the original API while the refactored code uses improved names.

  /**
   * @deprecated Use readCellValue() instead
   * @returns {number} Color value at this position
   */
  at () {
    return this.readCellValue()
  }

  /**
   * @deprecated Use hasColor() instead
   * @param {number} [color=1] Expected color value to test for
   * @returns {boolean} True if cell contains the specified color
   */
  test (color = 1) {
    return this.hasColor(color)
  }

  /**
   * @deprecated Use isOccupied() instead
   * @returns {boolean} True if cell is occupied (contains a value)
   */
  isNonZero () {
    return this.isOccupied()
  }

  /**
   * @deprecated Use clearMaskBits() instead
   * @param {bigint} mask Bit mask specifying which bits to clear
   * @returns {bigint} Cell bits after clearing the masked bits
   */
  clearBits (mask) {
    return this.clearMaskBits(mask)
  }

  /**
   * @deprecated Use cellBits property instead
   * @private
   * @type {bigint}
   */
  get bits () {
    return this.cellBits
  }

  set bits (value) {
    this.cellBits = value
  }

  /**
   * @deprecated Use bitPosition property instead (renamed for clarity)
   * @private
   * @type {number}
   */
  get pos () {
    return this.bitPosition
  }

  /**
   * @deprecated Use bitStore property instead (renamed for clarity)
   * @private
   * @type {Store}
   */
  get store () {
    return this.bitStore
  }
}
