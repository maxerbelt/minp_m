/**
 * Accessor for a single cell location in a bit-packed storage system.
 *
 * Provides a convenient interface for reading and writing cell values (colors)
 * at a specific location without exposing low-level bit manipulation.
 * Maintains consistency with the backing storage through validation and delegation.
 *
 * This class acts as a lightweight wrapper around a cell's bit representation,
 * delegating all bit manipulation to the backing store for consistency and
 * separation of concerns.
 *
 * @template Store - The bit storage backend (e.g., StoreBig)
 *
 * @example
 * // Reading a cell value
 * const value = accessor.readCellValue();
 *
 * @example
 * // Writing a color to a cell
 * accessor.set(2);
 */

/**
 * Type definition for the bit storage backend interface.
 *
 * Specifies all operations required by ForLocation to interact with
 * underlying bit-packed storage.
 *
 * @typedef {object} Store
 * @property {function(number): void} check - Validates that a color value is valid
 * @property {function(bigint, bigint): bigint} clearBits - Clears bits matching a mask from a value
 * @property {function(bigint, number): bigint} value - Extracts bit value at position
 * @property {function(bigint, number): number} numValue - Extracts numeric value at position
 * @property {function(number): bigint} bitMaskByPos - Creates bit mask for a position
 * @property {function(number, number): bigint} setMask - Creates value mask for position and color
 * @property {bigint} empty - Sentinel value representing empty/zero state
 */
export class ForLocation {
  /**
   * Create a location accessor for a specific cell position.
   *
   * Initializes a new accessor instance with the current cell bits and
   * a reference to the backing storage. The accessor uses delegation to
   * defer all bit manipulation to the store.
   *
   * @param {number} bitPosition - The bit-level position in the storage system (0-based index)
   * @param {bigint} cellBits - The current cell value bits from the storage (may be empty)
   * @param {Store} bitStore - Reference to the backing bit storage for operations
   *
   * @example
   * const accessor = new ForLocation(42, 0n, store);
   * accessor.set(2);
   */
  constructor (bitPosition, cellBits, bitStore) {
    /**
     * The bit-level position in the storage system.
     * @type {number}
     * @readonly
     */
    this.bitPosition = bitPosition

    /**
     * The current cell value bits from the storage.
     * @type {bigint}
     */
    this.cellBits = cellBits

    /**
     * Reference to the backing bit storage for operations.
     * @type {Store}
     * @private
     * @access private
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
   * The operation is performed in three steps:
   * 1. Validate the color value via store.check()
   * 2. Clear existing bits at this position
   * 3. Set new bits with the provided color value
   *
   * @param {number} [color=1] - Color value to write (must be valid per store.check)
   * @returns {bigint} Updated cell bits after the write (also stored in this.cellBits)
   * @throws {Error} If color is invalid (from bitStore.check)
   *
   * @example
   * accessor.set(2); // Write color 2 to cell
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
   * using the backing store's value reader. Does not modify any state.
   *
   * @returns {number} Color value (typically 0-3 depending on bit depth, never negative)
   *
   * @example
   * const color = accessor.readCellValue(); // e.g., 2
   */
  readCellValue () {
    return this._readValueFromStore()
  }

  /**
   * Clear (zero out) all bits in the provided mask within this cell.
   *
   * Delegates to the backing store to remove bits matching the mask.
   * Does not affect bits outside the mask. Note: Does NOT update this.cellBits,
   * the returned value must be assigned back if persistence is desired.
   *
   * @param {bigint} maskBits - Bit mask specifying which bits to clear (non-zero bits = clear)
   * @returns {bigint} Cell bits after clearing the masked bits (not automatically stored)
   *
   * @example
   * const result = accessor.clearMaskBits(0b111000n); // Clear specific bits
   */
  clearMaskBits (maskBits) {
    return this.bitStore.clearBits(this.cellBits, maskBits)
  }

  /**
   * Test if the cell contains a specific color value.
   *
   * Compares the current cell color against an expected value.
   * Semantic alternative to `readCellValue() === color` for clarity and readability.
   * Does not modify any state.
   *
   * @param {number} [color=1] - Expected color value to test for (must be valid)
   * @returns {boolean} True if cell contains the specified color, false otherwise
   *
   * @example
   * if (accessor.hasColor(2)) { // cell is red
   */
  hasColor (color = 1) {
    return this.readCellValue() === color
  }

  /**
   * Test if this cell location contains any non-zero value (is occupied).
   *
   * Determines if the cell has a value, useful for distinguishing empty (0)
   * from occupied (non-zero) cells. Checks against the store's empty sentinel.
   * Does not modify any state.
   *
   * @returns {boolean} True if cell is occupied (contains a value), false if empty
   *
   * @example
   * if (accessor.isOccupied()) { // cell has a value
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
   * Algorithm:
   * 1. Get position mask for this cell location
   * 2. Clear all bits at that position
   * 3. Create new value mask with the provided color
   * 4. Combine cleared bits with new value mask
   *
   * @private
   * @access private
   * @param {number} color - Color value to apply (must be validated)
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
   * This method provides a single point for all value reads.
   *
   * @private
   * @access private
   * @returns {number} Color value at this position (typically 0-3)
   */
  _readValueFromStore () {
    return this.bitStore.numValue(this.cellBits, this.bitPosition)
  }

  // ============================================================================
  // Backward Compatibility Aliases
  // ============================================================================
  // These preserve the original API while the refactored code uses improved names.
  // Marked as @deprecated to encourage migration to new method names.

  /**
   * @deprecated Use readCellValue() instead - provides more explicit naming
   * @returns {number} Color value at this position
   */
  at () {
    return this.readCellValue()
  }

  /**
   * @deprecated Use hasColor() instead - provides more explicit naming
   * @param {number} [color=1] Expected color value to test for
   * @returns {boolean} True if cell contains the specified color
   */
  test (color = 1) {
    return this.hasColor(color)
  }

  /**
   * Alias to bitStore property for backward compatibility.
   * @deprecated Access bitStore directly instead (marked private for encapsulation)
   * @private
   * @access private
   * @type {Store}
   */
  get store () {
    return this.bitStore
  }
}
