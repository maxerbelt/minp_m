/**
 * BitMath - Bit manipulation utilities for power-of-2 calculations.
 *
 * Provides low-level bit operations for optimizing bitboard layout and allocation,
 * including power-of-2 detection, bit-length computation, and color-depth mapping.
 *
 * Supported color depths form a strict set:
 * - 1 bit per cell = 2 colors (binary)
 * - 2 bits per cell = 4 colors
 * - 4 bits per cell = 16 colors
 * - 8 bits per cell = 256 colors
 *
 * All bit calculations use CLZ (count-leading-zeros) for optimal performance
 * on modern CPUs. Power-of-2 operations use single bitwise AND for detection
 * and bit shift for calculation.
 *
 * @class BitMath
 * @example
 * // Check if power of 2
 * BitMath.isPowerOf2(16); // true
 * // Find minimum bits for color depth
 * BitMath.bitsPerCell(256); // 8
 * // Map color count to standard allocation
 * BitMath.numOfColorsToBitsPerCell(8); // 4 (rounds up to nearest supported)
 */
export class BitMath {
  /**
   * Array of supported bits per cell values for color-coded grids.
   * These form the standard allocation set for BitStore implementations.
   * Each value is a power of 2 for efficient bit manipulation.
   *
   * @static
   * @type {number[]}
   * @readonly
   */
  static SUPPORTED_BITS_PER_CELL = [1, 2, 4, 8]

  /**
   * Gets supported color depths derived from bits per cell.
   * Calculates 2^bits for each supported bits-per-cell value.
   * Results: [2, 4, 16, 256] corresponding to 1, 2, 4, 8 bits respectively.
   *
   * @static
   * @returns {number[]} Array of supported color depths [2, 4, 16, 256]
   * @readonly
   */
  static get SUPPORTED_DEPTHS () {
    return this.SUPPORTED_BITS_PER_CELL.map(bits => 1 << bits)
  }

  /**
   * Gets supported color depths in reverse order (largest to smallest).
   * Useful for searching from high capacity to low capacity.
   * Returns [256, 16, 4, 2] (reverse of SUPPORTED_DEPTHS).
   *
   * @static
   * @returns {number[]} Reversed array of supported depths [256, 16, 4, 2]
   * @readonly
   */
  static get SUPPORTED_DEPTHS_REV () {
    return this.SUPPORTED_DEPTHS.reverse()
  }

  /**
   * Gets supported bits per cell in reverse order (largest to smallest).
   * Useful for searching from high precision to low precision allocations.
   * Returns [8, 4, 2, 1] (reverse of SUPPORTED_BITS_PER_CELL).
   *
   * @static
   * @returns {number[]} Reversed array [8, 4, 2, 1]
   * @readonly
   */
  static get SUPPORTED_BITS_PER_CELL_REV () {
    return this.SUPPORTED_BITS_PER_CELL.slice().reverse()
  }

  /**
   * Checks if a number is a power of 2.
   * Uses bit manipulation: (n & (n-1)) === 0 for n > 0.
   * Works by checking if exactly one bit is set.
   *
   * Algorithm: A power of 2 in binary has exactly one bit set.
   * Subtracting 1 flips all bits after the single set bit.
   * AND of these two values is 0 if and only if original was power of 2.
   *
   * @static
   * @param {number} n - Value to test
   * @returns {boolean} True if n is a power of 2 (1, 2, 4, 8, 16, ...)
   *
   * @example
   * BitMath.isPowerOf2(1)    // true
   * BitMath.isPowerOf2(8)    // true
   * BitMath.isPowerOf2(6)    // false
   * BitMath.isPowerOf2(0)    // false
   *
   * @performance O(1) - single bitwise AND operation
   */
  static isPowerOf2 (n) {
    return n > 0 && (n & (n - 1)) === 0
  }

  /**
   * Finds the next power of 2 greater than or equal to n.
   * Returns n if already a power of 2.
   *
   * Algorithm: Uses count-leading-zeros (CLZ) via Math.clz32.
   * For a 32-bit value, position of highest set bit = 31 - clz32(n-1).
   * Next power of 2 = 1 << (32 - clz32(n)).
   *
   * @static
   * @param {number} n - Input value (0-4294967295)
   * @returns {number} Smallest power of 2 ≥ n (range: 1 to 4294967296)
   *
   * @example
   * BitMath.nextPow2(1)    // 1
   * BitMath.nextPow2(5)    // 8
   * BitMath.nextPow2(8)    // 8
   * BitMath.nextPow2(256)  // 256
   * BitMath.nextPow2(257)  // 512
   *
   * @performance O(1) - CLZ operation plus bit shift
   */
  static nextPow2 (n) {
    n >>>= 0
    if (n <= 1) return 1
    if (BitMath.isPowerOf2(n)) return n
    return 1 << (32 - Math.clz32(n))
  }

  /**
   * Calculates minimum bit length needed to represent values 0 to n-1.
   * Equivalent to ceil(log2(n)) for n > 0.
   *
   * Algorithm: Uses count-leading-zeros (CLZ) on (n-1).
   * Bit position of highest set bit = 31 - clz32(n-1).
   * Bit length = position + 1.
   *
   * @static
   * @param {number} n - Maximum value to represent (exclusive, range 1-4294967296)
   * @returns {number} Bits required to represent 0 to n-1: ceil(log2(n))
   *
   * @example
   * BitMath.bitLength32(1)    // 0 (represent just 0)
   * BitMath.bitLength32(2)    // 1 (need 1 bit for 0,1)
   * BitMath.bitLength32(3)    // 2 (need 2 bits for 0,1,2)
   * BitMath.bitLength32(8)    // 3 (need 3 bits for 0-7)
   * BitMath.bitLength32(9)    // 4 (need 4 bits for 0-8)
   * BitMath.bitLength32(256)  // 8 (need 8 bits for 0-255)
   *
   * @performance O(1) - CLZ operation plus arithmetic
   */
  static bitLength32 (n) {
    return n < 3 ? 1 : 32 - Math.clz32(n - 1)
  }

  /**
   * Calculates bits per cell needed for a given color depth.
   * Returns the next power of 2 after the bit length required to represent
   * the specified depth. Ensures allocation aligns to power-of-2 boundaries
   * for efficient BitStore operations.
   *
   * Algorithm:
   * 1. Calculate bit length needed: bitLength32(depth)
   * 2. Round up to next power of 2: nextPow2(bitLength)
   * 3. Result is always in {1, 2, 4, 8, ...}
   *
   * @static
   * @param {number} [depth=2] - Number of distinct colors/values to represent (default: 2)
   * @param {number|null} [bitLength=null] - Override automatic calculation with explicit bit count (optional)
   * @returns {number} Power-of-2 bit allocation per cell (1, 2, 4, 8, 16, ...)
   *
   * @example
   * BitMath.bitsPerCell()       // 1 (default depth 2, needs 1 bit)
   * BitMath.bitsPerCell(2)      // 1 (2 colors = 2^1)
   * BitMath.bitsPerCell(3)      // 2 (needs 2 bits for 3 colors)
   * BitMath.bitsPerCell(8)      // 4 (needs 3 bits, round to 2^2=4)
   * BitMath.bitsPerCell(256)    // 8 (256 colors = 2^8)
   * BitMath.bitsPerCell(300)    // 16 (needs 9 bits, round to 2^4=16)
   * BitMath.bitsPerCell(100, 7) // 8 (explicit 7-bit override, round to 2^3=8)
   *
   * @performance O(1) - CLZ + bit shift operations
   */
  static bitsPerCell (depth = 2, bitLength = null) {
    const effectiveBitLength = bitLength ?? BitMath.bitLength32(depth)
    return BitMath.nextPow2(effectiveBitLength)
  }

  /**
   * Convert number of colors to supported bits per cell.
   *
   * Maps a color count to the minimum supported bits per cell that can
   * represent that many colors. Searches supported values in reverse order
   * (high to low) for efficiency. Automatically rounds up to the next
   * supported allocation if exact match not found.
   *
   * Supported mappings:
   * - colors 2: bits 1
   * - colors 3-4: bits 2
   * - colors 5-16: bits 4
   * - colors 17-256: bits 8
   * - colors >256: throws Error
   *
   * @static
   * @param {number} numOfColors - Number of distinct colors to represent (1-256)
   * @returns {number} Bits per cell required from SUPPORTED_BITS_PER_CELL
   * @throws {Error} If numOfColors > 256 (exceeds maximum supported depth)
   *
   * @example
   * BitMath.numOfColorsToBitsPerCell(2)   // 1
   * BitMath.numOfColorsToBitsPerCell(3)   // 2 (rounds up)
   * BitMath.numOfColorsToBitsPerCell(4)   // 2
   * BitMath.numOfColorsToBitsPerCell(8)   // 4
   * BitMath.numOfColorsToBitsPerCell(256) // 8
   * BitMath.numOfColorsToBitsPerCell(257) // throws Error
   *
   * @performance O(1) - fixed iteration over 4 supported values
   */
  static numOfColorsToBitsPerCell (numOfColors) {
    for (const bits of BitMath.SUPPORTED_BITS_PER_CELL_REV) {
      const maxColors = 1 << bits
      if (numOfColors <= maxColors) {
        return bits
      }
    }
    throw new Error(
      `Unsupported number of colors: ${numOfColors}. Supported numbers: ${BitMath.SUPPORTED_DEPTHS.join(
        ', '
      )}`
    )
  }

  /**
   * Convert maximum colors to supported bits per cell (exact match only).
   *
   * Maps a specific maximum color count to bits per cell, requiring
   * an exact match with a supported depth (2, 4, 16, or 256 colors).
   * Unlike numOfColorsToBitsPerCell(), this does NOT round up - it
   * requires exact alignment to supported depths.
   *
   * Supported mappings (exact):
   * - 2 colors: 1 bit
   * - 4 colors: 2 bits
   * - 16 colors: 4 bits
   * - 256 colors: 8 bits
   *
   * @static
   * @param {number} maxColors - Exact number of colors (must be in SUPPORTED_DEPTHS)
   * @returns {number} Bits per cell for the specified color count
   * @throws {Error} If maxColors is not an exactly supported depth
   *
   * @example
   * BitMath.maxColorsToBitsPerCell(2)   // 1
   * BitMath.maxColorsToBitsPerCell(4)   // 2
   * BitMath.maxColorsToBitsPerCell(16)  // 4
   * BitMath.maxColorsToBitsPerCell(256) // 8
   * BitMath.maxColorsToBitsPerCell(8)   // throws Error (not exactly 2, 4, 16, or 256)
   *
   * @performance O(1) - fixed iteration over 4 supported values
   */
  static maxColorsToBitsPerCell (maxColors) {
    for (const bits of BitMath.SUPPORTED_BITS_PER_CELL_REV) {
      const colors = 1 << bits
      if (maxColors === colors) {
        return bits
      }
    }
    throw new Error(
      `Unsupported number of colors: ${maxColors}. Supported numbers upto 256`
    )
  }
}
