/**
 * @fileoverview Bit helper utilities for mixed number and BigInt storage.
 *
 * Provides three utility classes for low-level bit manipulation operations:
 * - Bits: Basic operations on mixed number/BigInt types
 * - BigBits: Multi-bit and color/layer encoding operations
 * - BigOne: Single-bit manipulation with multiple return formats
 *
 * These helpers are intentionally minimal wrappers around native BigInt
 * operations so that the rest of the bit store code can remain simple and efficient.
 * All methods support mixed number and BigInt input types for flexibility.
 *
 * @module grid/bitStore/helpers/bigbits
 * @typedef {number|bigint} NumericValue - Number or BigInt value
 * @typedef {bigint} BitPattern - BigInt bit pattern
 * @typedef {0n|1n} BitValue - Single bit value (0 or 1)
 */

/**
 * Utility class for basic bit manipulation operations supporting mixed number and BigInt types.
 *
 * @class Bits
 * @description Provides minimal bit manipulation operations that work with both number and BigInt types.
 * Used for fundamental bitwise operations like clearing bits from patterns.
 * @static
 */
export class Bits {
  /**
   * Clear bits from a pattern using a mask.
   *
   * Performs a bitwise AND operation with the complement of the mask to clear specified bits.
   * Clears all bits where mask has a 1, preserves all bits where mask has a 0.
   *
   * @static
   * @param {NumericValue} bits - The input bit pattern to modify (0 or positive).
   * @param {NumericValue} mask - The bit mask indicating which bits to clear (1 = clear, 0 = keep).
   * @returns {BitPattern} The result after clearing masked bits.
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
 *
 * @class BigBits
 * @description Provides methods for shifting, masking, and managing bit positions in arbitrary-precision
 * BigInt values. Designed for color/layer encoding where multiple bits represent different channels.
 * Supports both positive and negative shifts through unified shiftBits() method.
 * @static
 */
export class BigBits {
  /**
   * Create a mask for a color value at a given bit position.
   *
   * Shifts a color or layer value to occupy bits starting at the specified position.
   * This is used to encode color/layer values at specific bit offsets in a bitboard.
   *
   * @static
   * @param {NumericValue} pos - Bit position where color begins (0 or positive, typically 0-255).
   * @param {NumericValue} color - Color value or layer bits to shift into position (0-255).
   * @returns {BitPattern} The color value shifted left by pos bits, ready for OR combination.
   * @example
   * BigBits.setMask(4, 0xFF) // Returns 0xFF0n (0xFF shifted left 4 bits)
   */
  static setMask (pos, color) {
    return BigInt(color) << BigInt(pos)
  }

  /**
   * Shift BigInt bits to the right.
   *
   * Performs an arithmetic right shift operation on the source bitboard.
   * Positive shift values move bits toward less significant positions.
   * Use shiftBits() for signed shifts.
   *
   * @static
   * @param {NumericValue} src - The source bitboard to shift (0 or positive).
   * @param {NumericValue} shift - Number of bit positions to shift right (0 or positive).
   * @returns {BitPattern} The source shifted right by shift positions.
   * @example
   * BigBits.shiftRight(0x1000n, 4) // Returns 0x100n
   */
  static shiftRight (src, shift) {
    return BigInt(src) >> BigInt(shift)
  }

  /**
   * Shift BigInt bits to the left.
   *
   * Performs a left shift operation on the source bitboard.
   * Positive shift values move bits toward more significant positions.
   * Use shiftBits() for signed shifts.
   *
   * @static
   * @param {NumericValue} src - The source bitboard to shift (0 or positive).
   * @param {NumericValue} shift - Number of bit positions to shift left (0 or positive).
   * @returns {BitPattern} The source shifted left by shift positions.
   * @example
   * BigBits.shiftLeft(0x100n, 4) // Returns 0x1000n
   */
  static shiftLeft (src, shift) {
    return BigInt(src) << BigInt(shift)
  }

  /**
   * Shift BigInt bits by a signed offset.
   *
   * Automatically selects left or right shift based on the sign of the shift parameter.
   * Positive values are left shifts, negative values are right shifts.
   * Zero returns the original source unchanged, avoiding unnecessary operations.
   *
   * @static
   * @param {NumericValue} src - The source bitboard (0 or positive).
   * @param {number|bigint} shift - Signed shift amount (positive = left, negative = right, 0 = no-op).
   * @returns {BitPattern} The shifted result.
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
   *
   * Creates a BigInt with all bits from position 0 to width-1 set to 1.
   * Equivalent to (2^width) - 1. Used to create width-specific bit masks.
   *
   * @static
   * @param {NumericValue} width - The number of bits to set (0 or positive, typically 1-256).
   * @returns {BitPattern} A mask with width contiguous bits set to 1.
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
   *
   * @static
   * @returns {bigint} 0n
   */
  static get empty () {
    return 0n
  }

  /**
   * One value for BigInt operations.
   * Constant representing the smallest positive BigInt value.
   *
   * @static
   * @returns {bigint} 1n
   */
  static get one () {
    return 1n
  }
}

/**
 * Utility class for single-bit manipulation operations on BigInt values.
 *
 * @class BigOne
 * @description Provides methods for setting, clearing, reading, and testing individual bits within a bitboard.
 * Supports multiple return formats (boolean, number, BigInt) for flexibility in different contexts.
 * @static
 */
export class BigOne {
  /**
   * Build a single-bit mask at a given position.
   *
   * Creates a BigInt with only one bit set at the specified position (value = 2^pos).
   * Commonly used to create masks for testing or setting individual bits.
   *
   * @static
   * @param {NumericValue} pos - Bit position to activate (0 is the rightmost bit, 0-255).
   * @returns {BitPattern} A BigInt with exactly one bit set at position pos.
   * @example
   * BigOne.bitMaskByPos(0) // Returns 1n (binary: 0001)
   * BigOne.bitMaskByPos(3) // Returns 8n (binary: 1000)
   */
  static bitMaskByPos (pos) {
    return 1n << BigInt(pos)
  }

  /**
   * Test whether a bit is set at a specific position.
   *
   * Returns true (as a boolean) if the bit at the given index is 1.
   * Useful for conditional logic and control flow based on individual bits.
   *
   * @static
   * @param {NumericValue} bitboard - The bitboard to examine (0 or positive).
   * @param {NumericValue} index - The bit position to test (0 is the rightmost bit, 0-255).
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
   *
   * Returns the raw BigInt bit value (0n or 1n) at the given position.
   * Useful for continuing BigInt chain operations without type conversion.
   * Note: Returns 0n or 1n, not boolean (use isBitSet() for boolean).
   *
   * @static
   * @param {NumericValue} bitboard - The bitboard to examine (0 or positive).
   * @param {NumericValue} pos - The bit position to read (0 is the rightmost bit, 0-255).
   * @returns {BitValue} 0n if the bit is clear, 1n if the bit is set.
   * @example
   * BigOne.getBitAtPos(0b1100n, 2) // Returns 1n
   * BigOne.getBitAtPos(0b1100n, 0) // Returns 0n
   */
  static getBitAtPos (bitboard, pos) {
    return (BigInt(bitboard) >> BigInt(pos)) & 1n
  }

  /**
   * Set a bit at a specific position to 1.
   *
   * Performs an OR operation to set the bit without affecting other bits.
   * Leaves all other bits unchanged.
   * No effect if bit already set.
   *
   * @static
   * @param {NumericValue} bitboard - The input bitboard (0 or positive).
   * @param {NumericValue} pos - The bit position to set (0 is the rightmost bit, 0-255).
   * @returns {BitPattern} The bitboard with the bit at pos set to 1.
   * @example
   * BigOne.setBitPos(0b1000n, 0) // Returns 0b1001n
   * BigOne.setBitPos(0b0000n, 2) // Returns 0b0100n
   */
  static setBitPos (bitboard, pos) {
    return BigInt(bitboard) | (1n << BigInt(pos))
  }

  /**
   * Toggle a bit at a specific position.
   *
   * Performs an XOR operation to flip the bit state (0 becomes 1, 1 becomes 0).
   * All other bits remain unchanged.
   *
   * @static
   * @param {NumericValue} bitboard - The input bitboard (0 or positive).
   * @param {NumericValue} pos - The bit position to toggle (0 is the rightmost bit, 0-255).
   * @returns {BitPattern} The bitboard with the bit at pos toggled.
   * @example
   * BigOne.toggleBitPos(0b1100n, 0) // Returns 0b1101n
   * BigOne.toggleBitPos(0b1100n, 2) // Returns 0b1000n
   */
  static toggleBitPos (bitboard, pos) {
    return BigInt(bitboard) ^ (1n << BigInt(pos))
  }

  /**
   * Set or clear a bit at a specific position based on a value.
   *
   * If value is truthy, sets the bit to 1; if falsy, clears the bit to 0.
   * Allows conditional bit manipulation without branching in calling code.
   *
   * @static
   * @param {NumericValue} bitboard - The input bitboard (0 or positive).
   * @param {NumericValue} pos - The bit position to modify (0 is the rightmost bit, 0-255).
   * @param {NumericValue} [value=1n] - The value to set (truthy to set, falsy to clear).
   * @returns {BitPattern} The modified bitboard.
   * @example
   * BigOne.setBitAtPos(0b0000n, 2, 1n) // Returns 0b0100n (sets bit)
   * BigOne.setBitAtPos(0b1100n, 2, 0n) // Returns 0b1000n (clears bit)
   */
  static setBitAtPos (bitboard, pos, value) {
    return value
      ? this.setBitPos(bitboard, pos)
      : this.clearBitAtPos(bitboard, pos)
  }

  /**
   * Clear a bit at a specific position, setting it to 0.
   *
   * Performs an AND operation with the complement of a single-bit mask.
   * All other bits remain unchanged.
   * No effect if bit already clear.
   *
   * @static
   * @param {NumericValue} bitboard - The input bitboard (0 or positive).
   * @param {NumericValue} pos - The bit position to clear (0 is the rightmost bit, 0-255).
   * @returns {BitPattern} The bitboard with the bit at pos set to 0.
   * @example
   * BigOne.clearBitAtPos(0b1101n, 0) // Returns 0b1100n
   * BigOne.clearBitAtPos(0b1100n, 2) // Returns 0b1000n
   */
  static clearBitAtPos (bitboard, pos) {
    return BigInt(bitboard) & ~(1n << BigInt(pos))
  }

  /**
   * Read the numeric (0 or 1) value of a single bit.
   *
   * Extracts a single bit and returns it as a JavaScript number (0 or 1).
   * Useful for conditions or arithmetic operations requiring a number type.
   * Avoids type coercion overhead of boolean checks.
   *
   * @static
   * @param {NumericValue} bits - The source bitboard (0 or positive).
   * @param {NumericValue} pos - Position of the bit to read (0 is the rightmost bit, 0-255).
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
   *
   * Extracts a single bit and returns it as a BigInt (0n or 1n).
   * Useful when continuing BigInt operations without type conversion overhead.
   * Preferred for chaining BigInt calculations.
   *
   * @static
   * @param {NumericValue} bits - The source bitboard (0 or positive).
   * @param {NumericValue} pos - Position of the bit to read (0 is the rightmost bit, 0-255).
   * @returns {BitValue} 0n if the bit is clear, 1n if the bit is set.
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
   *
   * @static
   * @returns {bigint} 0n
   */
  static get empty () {
    return 0n
  }

  /**
   * One value for BigInt operations.
   * Constant representing the smallest positive BigInt value.
   *
   * @static
   * @returns {bigint} 1n
   */
  static get one () {
    return 1n
  }
}
