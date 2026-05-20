/**
 * Bit helper utilities for mixed number and BigInt storage.
 *
 * These helpers are intentionally minimal wrappers around native BigInt
 * operations so that the rest of the bit store code can remain simple.
 * @module grid/bitStore/helpers/bigbits
 */

/**
 * Utility class for basic bit manipulation operations supporting mixed number and BigInt types.
 * @class
 */
export class Bits {
  /**
   * Clear bits from a pattern using a mask.
   * Performs a bitwise AND operation with the complement of the mask to clear specified bits.
   * @static
   * @param {number|bigint} bits - The input bit pattern to modify.
   * @param {number|bigint} mask - The bit mask indicating which bits to clear (1 = clear, 0 = keep).
   * @returns {bigint} The result after clearing masked bits.
   * @example
   * Bits.clear(0b1111, 0b0011) // Returns 0b1100n (clears rightmost 2 bits)
   */
  static clear (bits, mask) {
    const bigintBits = BigInt(bits)
    const bigintMask = BigInt(mask)
    return bigintBits & ~bigintMask
  }
}

/**
 * Utility class for BigInt bit manipulation with color/layer encoding.
 * Provides methods for shifting, masking, and managing bit positions in arbitrary-precision integers.
 * @class
 */
export class BigBits {
  /**
   * Create a mask for a color value at a given bit position.
   * Shifts a color or layer value to occupy bits starting at the specified position.
   * @static
   * @param {number|bigint} pos - Bit position where the color value should begin.
   * @param {number|bigint} color - Color value or layer bits to shift into position.
   * @returns {bigint} The color value shifted left by pos bits, ready to be combined with other masks.
   * @example
   * BigBits.setMask(4, 0xFF) // Returns 0xFF0n (0xFF shifted left 4 bits)
   */
  static setMask (pos, color) {
    return BigInt(color) << BigInt(pos)
  }

  /**
   * Shift BigInt bits to the right.
   * Performs an arithmetic right shift operation on the source bitboard.
   * @static
   * @param {bigint|number} src - The source bitboard to shift.
   * @param {number|bigint} shift - Number of bit positions to shift right.
   * @returns {bigint} The source shifted right by shift positions.
   * @throws {RangeError} If shift is negative (use shiftLeft instead).
   * @example
   * BigBits.shiftRight(0x1000n, 4) // Returns 0x100n
   */
  static shiftRight (src, shift) {
    return BigInt(src) >> BigInt(shift)
  }

  /**
   * Shift BigInt bits to the left.
   * Performs a left shift operation on the source bitboard.
   * @static
   * @param {bigint|number} src - The source bitboard to shift.
   * @param {number|bigint} shift - Number of bit positions to shift left.
   * @returns {bigint} The source shifted left by shift positions.
   * @throws {RangeError} If shift is negative (use shiftRight instead).
   * @example
   * BigBits.shiftLeft(0x100n, 4) // Returns 0x1000n
   */
  static shiftLeft (src, shift) {
    return BigInt(src) << BigInt(shift)
  }

  /**
   * Shift BigInt bits by a signed offset.
   * Automatically selects left or right shift based on the sign of the shift parameter.
   * Positive values are left shifts, negative values are right shifts.
   * Zero returns the original source unchanged, avoiding unnecessary operations.
   * @static
   * @param {bigint|number} src - The source bitboard.
   * @param {number|bigint} shift - Signed shift amount (positive = left, negative = right, 0 = no-op).
   * @returns {bigint} The shifted result.
   * @example
   * BigBits.shiftBits(0x100n, 2)   // Returns 0x400n (left shift)
   * BigBits.shiftBits(0x100n, -2)  // Returns 0x40n (right shift)
   * BigBits.shiftBits(0x100n, 0)   // Returns 0x100n (unchanged)
   */
  static shiftBits (src, shift) {
    if (shift === 0) return BigInt(src)
    if (shift > 0) return BigInt(src) << BigInt(shift)
    return BigInt(src) >> BigInt(-shift)
  }

  /**
   * Generate a mask of all bits set within a given width.
   * Creates a BigInt with all bits from position 0 to width-1 set to 1.
   * Equivalent to (2^width) - 1.
   * @static
   * @param {number|bigint} width - The number of bits to set (width >= 0).
   * @returns {bigint} A mask with width contiguous bits set to 1.
   * @example
   * BigBits.fullBitsForWidth(4) // Returns 0xFn (binary: 1111, all 4 bits set)
   * BigBits.fullBitsForWidth(8) // Returns 0xFFn (binary: 11111111)
   */
  static fullBitsForWidth (width) {
    return (1n << BigInt(width)) - 1n
  }

  /**
   * Empty BigInt value (zero).
   * Constant representing no bits set in a BigInt operation.
   * @static
   * @returns {bigint} 0n
   */
  static get empty () {
    return 0n
  }

  /**
   * One value for BigInt operations.
   * Constant representing the smallest positive BigInt value.
   * @static
   * @returns {bigint} 1n
   */
  static get one () {
    return 1n
  }
}

/**
 * Utility class for single-bit manipulation operations on BigInt values.
 * Provides methods for setting, clearing, reading, and testing individual bits within a bitboard.
 * @class
 */
export class BigOne {
  /**
   * Build a single-bit mask at a given position.
   * Creates a BigInt with only one bit set at the specified position (value = 2^pos).
   * @static
   * @param {number|bigint} pos - Bit position to activate (0 is the rightmost bit).
   * @returns {bigint} A BigInt with exactly one bit set at position pos.
   * @example
   * BigOne.bitMaskByPos(0) // Returns 1n (binary: 0001)
   * BigOne.bitMaskByPos(3) // Returns 8n (binary: 1000)
   */
  static bitMaskByPos (pos) {
    return 1n << BigInt(pos)
  }

  /**
   * Test whether a bit is set at a specific position.
   * Returns true (as a boolean) if the bit at the given index is 1.
   * @static
   * @param {bigint|number} bitboard - The bitboard to examine.
   * @param {number|bigint} index - The bit position to test (0 is the rightmost bit).
   * @returns {boolean} true if the bit at index is set, false otherwise.
   * @example
   * BigOne.isBitSet(0b1100n, 2) // Returns true
   * BigOne.isBitSet(0b1100n, 0) // Returns false
   */
  static isBitSet (bitboard, index) {
    return ((BigInt(bitboard) >> BigInt(index)) & 1n) === 1n
  }

  /**
   * Get the bit value at a specific position.
   * Returns the raw BigInt bit value (0n or 1n) at the given position.
   * @static
   * @param {bigint|number} bitboard - The bitboard to examine.
   * @param {number|bigint} pos - The bit position to read (0 is the rightmost bit).
   * @returns {bigint} 0n if the bit is clear, 1n if the bit is set.
   * @example
   * BigOne.getBitAtPos(0b1100n, 2) // Returns 1n
   * BigOne.getBitAtPos(0b1100n, 0) // Returns 0n
   */
  static getBitAtPos (bitboard, pos) {
    return (BigInt(bitboard) >> BigInt(pos)) & 1n
  }

  /**
   * Set a bit at a specific position to 1.
   * Performs an OR operation to set the bit without affecting other bits.
   * @static
   * @param {bigint|number} bitboard - The input bitboard.
   * @param {number|bigint} pos - The bit position to set (0 is the rightmost bit).
   * @returns {bigint} The bitboard with the bit at pos set to 1.
   * @example
   * BigOne.setBitPos(0b1000n, 0) // Returns 0b1001n
   * BigOne.setBitPos(0b0000n, 2) // Returns 0b0100n
   */
  static setBitPos (bitboard, pos) {
    return BigInt(bitboard) | (1n << BigInt(pos))
  }
  static toggleBitPos (bitboard, pos) {
    return BigInt(bitboard) ^ (1n << BigInt(pos))
  }

  /**
   * Set or clear a bit at a specific position based on a value.
   * If value is truthy, sets the bit to 1; if falsy, clears the bit to 0.
   * @static
   * @param {bigint|number} bitboard - The input bitboard.
   * @param {number|bigint} pos - The bit position to modify (0 is the rightmost bit).
   * @param {bigint|number} [value=1n] - The value to set (truthy to set, falsy to clear).
   * @returns {bigint} The modified bitboard.
   * @example
   * BigOne.setBitAtPos(0b0000n, 2, 1n) // Returns 0b0100n (sets bit)
   * BigOne.setBitAtPos(0b1100n, 2, 0n) // Returns 0b1000n (clears bit)
   */
  static setBitAtPos (bitboard, pos, value = 1n) {
    return value
      ? this.setBitPos(bitboard, pos)
      : this.clearBitAtPos(bitboard, pos)
  }

  /**
   * Clear a bit at a specific position, setting it to 0.
   * Performs an AND operation with the complement of a single-bit mask.
   * @static
   * @param {bigint|number} bitboard - The input bitboard.
   * @param {number|bigint} pos - The bit position to clear (0 is the rightmost bit).
   * @returns {bigint} The bitboard with the bit at pos set to 0.
   * @example
   * BigOne.clearBitAtPos(0b1101n, 0) // Returns 0b1100n
   * BigOne.clearBitAtPos(0b1100n, 2) // Returns 0b1000n
   */
  static clearBitAtPos (bitboard, pos) {
    return BigInt(bitboard) & ~(1n << BigInt(pos))
  }

  /**
   * Read the numeric boolean value of a single bit.
   * Extracts a single bit and returns it as a JavaScript number (0 or 1).
   * Useful for conditions or arithmetic operations requiring a number type.
   * @static
   * @param {bigint|number} bits - The source bitboard.
   * @param {number|bigint} pos - Position of the bit to read (0 is the rightmost bit).
   * @returns {number} 0 if the bit is clear, 1 if the bit is set.
   * @example
   * BigOne.numValue(0b1100n, 2) // Returns 1
   * BigOne.numValue(0b1100n, 0) // Returns 0
   */
  static numValue (bits, pos) {
    return Number((BigInt(bits) >> BigInt(pos)) & 1n)
  }

  /**
   * Read the BigInt value of a single bit.
   * Extracts a single bit and returns it as a BigInt (0n or 1n).
   * Useful when continuing BigInt operations without type conversion overhead.
   * @static
   * @param {bigint|number} bits - The source bitboard.
   * @param {number|bigint} pos - Position of the bit to read (0 is the rightmost bit).
   * @returns {bigint} 0n if the bit is clear, 1n if the bit is set.
   * @example
   * BigOne.value(0b1100n, 2) // Returns 1n
   * BigOne.value(0b1100n, 0) // Returns 0n
   */
  static value (bits, pos) {
    return (BigInt(bits) >> BigInt(pos)) & 1n
  }

  /**
   * Empty BigInt value (zero).
   * Constant representing no bits set in a BigInt operation.
   * @static
   * @returns {bigint} 0n
   */
  static get empty () {
    return 0n
  }

  /**
   * One value for BigInt operations.
   * Constant representing the smallest positive BigInt value.
   * @static
   * @returns {bigint} 1n
   */
  static get one () {
    return 1n
  }
}
