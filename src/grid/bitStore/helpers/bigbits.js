/**
 * Bit helper utilities for mixed number and BigInt storage.
 *
 * These helpers are intentionally minimal wrappers around native BigInt
 * operations so that the rest of the bit store code can remain simple.
 * @module grid/bitStore/helpers/bigbits
 */

export class Bits {
  /**
   * Clear bits from a mask.
   * @param {number|bigint} bits - The input bit pattern.
   * @param {number|bigint} mask - The bits to clear.
   * @returns {bigint} The masked result.
   */
  static clear (bits, mask) {
    const bigintBits = BigInt(bits)
    const bigintMask = BigInt(mask)
    return bigintBits & ~bigintMask
  }
}

export class BigBits {
  /**
   * Create a mask for a color value at a given bit position.
   * @param {number|bigint} pos - Bit position to set.
   * @param {number|bigint} color - Color value or layer bits.
   * @returns {bigint} The shifted color mask.
   */
  static setMask (pos, color) {
    return BigInt(color) << BigInt(pos)
  }

  /**
   * Shift BigInt bits to the right.
   * @param {bigint|number} src - The source bitboard.
   * @param {number|bigint} shift - Number of bits to shift.
   * @returns {bigint} The shifted result.
   */
  static shiftRight (src, shift) {
    return BigInt(src) >> BigInt(shift)
  }

  /**
   * Shift BigInt bits to the left.
   * @param {bigint|number} src - The source bitboard.
   * @param {number|bigint} shift - Number of bits to shift.
   * @returns {bigint} The shifted result.
   */
  static shiftLeft (src, shift) {
    return BigInt(src) << BigInt(shift)
  }

  /**
   * Shift BigInt bits by a signed offset.
   * Positive values are left shifts, negative values are right shifts.
   * Zero returns the original source unchanged.
   * @param {bigint|number} src - The source bitboard.
   * @param {number|bigint} shift - Signed shift amount.
   * @returns {bigint} The shifted result.
   */
  static shiftBits (src, shift) {
    if (shift === 0) return BigInt(src)
    if (shift > 0) return BigInt(src) << BigInt(shift)
    return BigInt(src) >> BigInt(-shift)
  }

  /**
   * Empty BigInt value.
   * @returns {bigint}
   */
  static get empty () {
    return 0n
  }

  /**
   * One value for BigInt operations.
   * @returns {bigint}
   */
  static get one () {
    return 1n
  }
}

export class BigOne {
  /**
   * Build a single-bit mask at a given position.
   * @param {number|bigint} pos - Bit position to activate.
   * @returns {bigint} Single-bit mask.
   */
  static bitMaskByPos (pos) {
    return 1n << BigInt(pos)
  }

  static isBitSet (bitboard, index) {
    return ((bitboard >> BigInt(index)) & 1n) === 1n
  }
  static getBitAtPos (bitboard, pos) {
    return (bitboard >> BigInt(pos)) & 1n
  }
  static setBitAtPos (bitboard, pos, value) {
    return value
      ? bitboard | (1n << BigInt(pos))
      : bitboard & ~(1n << BigInt(pos))
  }
  /**
   * Read the numeric boolean value of a single bit.
   * @param {bigint|number} bits - The source bitboard.
   * @param {number|bigint} pos - Position of the bit to read.
   * @returns {number} 0 or 1.
   */
  static numValue (bits, pos) {
    return Number((BigInt(bits) >> BigInt(pos)) & 1n)
  }

  /**
   * Read the BigInt value of a single bit.
   * @param {bigint|number} bits - The source bitboard.
   * @param {number|bigint} pos - Position of the bit to read.
   * @returns {bigint} 0n or 1n.
   */
  static value (bits, pos) {
    return (BigInt(bits) >> BigInt(pos)) & 1n
  }

  /**
   * Empty BigInt value.
   * @returns {bigint}
   */
  static get empty () {
    return 0n
  }

  /**
   * One value for BigInt operations.
   * @returns {bigint}
   */
  static get one () {
    return 1n
  }
}
