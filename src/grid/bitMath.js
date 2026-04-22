/**
 * Bit manipulation utilities for power-of-2 calculations and bit-length computation.
 * Provides low-level operations for optimizing bitboard layout and allocation.
 *
 * @class BitMath
 */
export class BitMath {
  /**
   * Checks if a number is a power of 2.
   * Uses bit manipulation: (n & (n-1)) === 0 for n > 0.
   *
   * @static
   * @param {number} n - Value to test
   * @returns {boolean} True if n is a power of 2 (1, 2, 4, 8, 16, ...)
   *
   * @example
   * BitMath.isPowerOf2(8)   // true
   * BitMath.isPowerOf2(6)   // false
   */
  static isPowerOf2 (n) {
    return n > 0 && (n & (n - 1)) === 0
  }

  /**
   * Finds the next power of 2 greater than or equal to n.
   * Returns n if already a power of 2.
   *
   * @static
   * @param {number} n - Input value
   * @returns {number} Smallest power of 2 ≥ n
   *
   * @example
   * BitMath.nextPow2(5)   // 8
   * BitMath.nextPow2(8)   // 8
   * BitMath.nextPow2(1)   // 1
   */
  static nextPow2 (n) {
    n >>>= 0
    if (n <= 1) return 1
    if (BitMath.isPowerOf2(n)) return n
    return 1 << (32 - Math.clz32(n))
  }

  /**
   * Calculates minimum bit length needed to represent values 0 to n-1.
   * Uses count-leading-zeros for efficiency.
   *
   * @static
   * @param {number} n - Maximum value to represent (exclusive)
   * @returns {number} Bits required: ceil(log2(n))
   *
   * @example
   * BitMath.bitLength32(2)    // 1 (need 1 bit for 0,1)
   * BitMath.bitLength32(8)    // 3 (need 3 bits for 0-7)
   * BitMath.bitLength32(9)    // 4 (need 4 bits for 0-8)
   */
  static bitLength32 (n) {
    return n < 3 ? 1 : 32 - Math.clz32(n - 1)
  }

  /**
   * Calculates bits per cell for a given color depth.
   * Returns the next power of 2 after the bit length needed.
   * Ensures allocation aligns to power-of-2 boundaries for efficiency.
   *
   * @static
   * @param {number} [depth=2] - Number of distinct colors to represent
   * @param {number} [bitLength=null] - Override automatic calculation with explicit bit count
   * @returns {number} Power-of-2 bit allocation per cell
   *
   * @example
   * BitMath.bitsPerCell(2)    // 1 (need 1 bit for 2 colors)
   * BitMath.bitsPerCell(8)    // 4 (need 3 bits, round to 4)
   * BitMath.bitsPerCell(3, 2) // 2 (explicit override: use 2 bits)
   */
  static bitsPerCell (depth = 2, bitLength = null) {
    const effectiveBitLength =
      bitLength !== null ? bitLength : BitMath.bitLength32(depth)
    return BitMath.nextPow2(effectiveBitLength)
  }
}
