/**
 * @typedef {bigint|number|Uint32Array|Array<number>} Bitboard
 * Flexible bitboard representation supporting multiple storage formats:
 * - bigint: JavaScript BigInt for grids up to 256+ bits
 * - number: JavaScript Number for small grids (up to 53 bits)
 * - Uint32Array: Dense array of 32-bit words (up to 2^32 bits with tracking)
 * - Array<number>: Flexible array of 32-bit words
 */

/**
 * BitHelpers - Low-level bit manipulation utilities for bitboard operations.
 *
 * Provides efficient algorithms for iterating set bits, checking bit states,
 * and handling bitboards in multiple formats. Includes both generator-based
 * and callback-based APIs for flexibility.
 *
 * Key optimizations:
 * - BIT_INDEX lookup table (0-255) for fast LSB position detection
 * - Math.log2 fallback for large BigInt values (256+ bits)
 * - Format-aware dispatching (BigInt vs Array vs Number)
 * - Safe variants with size bounds checking
 *
 * @module bitHelpers
 * @example
 * // Iterate BigInt bitboard
 * for (const bitIndex of bits(0b1010n)) {
 *   console.log(bitIndex); // yields 1, 3
 * }
 *
 * @example
 * // Check if bit is set
 * const isBitSet = has(0b1101n, 2);  // false
 */

const BIT_INDEX = (() => {
  const index = new Map()
  for (let i = 0; i < 256; i++) index.set(1n << BigInt(i), i)
  return index
})()

/**
 * Fast LSB (Least Significant Bit) position lookup using precomputed table.
 * Optimized for bits 0-255 using O(1) map lookup.
 *
 * @param {bigint} b - Single set bit (must be power of 2): 1n, 2n, 4n, 8n, etc.
 * @returns {number|undefined} Bit position (0-255) or undefined if not in table
 * @private
 */
function lsbIndex (b) {
  return BIT_INDEX.get(b)
}

/**
 * Fallback LSB position detection using Math.log2.
 * Used for bit positions > 255 (beyond precomputed table size).
 * Slower than lsbIndex but handles arbitrary BigInt sizes.
 *
 * @param {bigint} b - Single set bit (must be power of 2)
 * @returns {number} Bit position using logarithmic calculation
 * @private
 */
function lsbIndexBig (b) {
  return Math.log2(Number(b))
}

/**
 * Iterate over set bit positions in a BigInt using LSB extraction.
 *
 * Algorithm: Repeatedly extract lowest set bit (LSB) using (b & -b),
 * look up position using precomputed table or Math.log2, then remove LSB
 * by XORing. Fast for sparse bitboards.
 *
 * Assumes bitboard fits in 256-bit range for optimal performance.
 * Use bitsBig() or bitsSafe() for larger values or mixed formats.
 *
 * @generator
 * @param {bigint} bb - Input bitboard to extract bits from
 * @yields {number} Bit position (0 to 255) for each set bit
 *
 * @example
 * for (const i of bits(0b1101n)) {
 *   console.log(i); // yields 0, 2, 3
 * }
 *
 * @performance O(popcount(bb)) - linear in number of set bits
 */
export function* bits (bb) {
  while (bb) {
    const lsb = bb & -bb
    const i = lsbIndex(lsb)
    yield i
    bb ^= lsb
  }
}
/**
 * Iterate over set bit positions in a BigInt using Math.log2.
 *
 * Similar to bits() but always uses Math.log2 for position detection.
 * Suitable for arbitrary-size BigInt values (no 256-bit limit).
 * Slightly slower than bits() due to logarithmic computation per bit.
 *
 * Use this for very large bitboards (>256 bits) or when
 * bits() performance is insufficient.
 *
 * @generator
 * @param {bigint} bb - Input bitboard to extract bits from (arbitrary size)
 * @yields {number} Bit position for each set bit
 *
 * @example
 * for (const i of bitsBig(0x10000000000000n)) {
 *   console.log(i); // yields 52
 * }
 *
 * @performance O(popcount(bb) * log(max_bit)) - logarithmic per bit
 */
export function* bitsBig (bb) {
  while (bb) {
    const lsb = bb & -bb
    const i = lsbIndexBig(lsb)
    yield i
    bb ^= lsb
  }
}

/**
 * Safely iterate over set bit positions supporting multiple bitboard formats.
 *
 * Format detection and dispatch:
 * - bigint: Delegates to bitsSafeBI() with size-based LSB optimization
 * - Array/Uint32Array: Delegates to bitSafeArr() for word-by-word iteration
 * - number: Inline LSB extraction using BIT_INDEX lookup
 * - falsy: Returns immediately (empty bitboard)
 *
 * Automatically selects appropriate algorithm based on bitboard type.
 * Includes bounds checking via size parameter for array formats.
 *
 * @generator
 * @param {Bitboard} bb - Input bitboard in any supported format
 * @param {number} [size] - Grid size in bits (used to limit array iteration)
 * @yields {number} Bit position for each set bit
 *
 * @example
 * // BigInt
 * for (const i of bitsSafe(0b1010n)) { console.log(i); }
 * // Array (with bounds)
 * for (const i of bitsSafe(new Uint32Array([0b1010, 0]), 64)) { console.log(i); }
 * // Number
 * for (const i of bitsSafe(10)) { console.log(i); }
 *
 * @performance Adapts to input format - optimal for each type
 */
export function* bitsSafe (bb, size) {
  // Handle BigInt bitboards
  if (typeof bb === 'bigint') {
    return yield* bitsSafeBI(size, bb)
  }

  // Handle array-backed bitboards (Uint32Array or Array)
  if (bb && typeof bb.length === 'number') {
    return yield* bitSafeArr(bb, size)
  }

  // Fallback: numeric bitboard (Number)
  if (!bb) return
  let tmpNum = bb
  const lsbIdxNum = lsbIndex
  while (tmpNum) {
    const lsb = tmpNum & -tmpNum
    const i = lsbIdxNum(lsb)
    yield i
    tmpNum ^= lsb
  }
}
/**
 * Iterate over set bit positions in a BigInt with callback (non-generator variant).
 *
 * Callback-based alternative to bitsSafeBI() for use cases that don't require
 * generators. Supports all BigInt sizes with automatic LSB algorithm selection
 * (table lookup for 0-255, Math.log2 for larger).
 *
 * More efficient than generator variant when immediate processing is needed.
 *
 * @param {bigint} bb - Input bitboard to extract bits from
 * @param {number} size - Grid size in bits (determines LSB algorithm selection)
 * @param {(index: number) => void} fn - Callback invoked for each set bit index
 * @returns {void}
 *
 * @example
 * forEachBitSafeBI(0b1101n, 64, (i) => {
 *   console.log(`Bit ${i} is set`);
 * });
 */
export function forEachBitSafeBI (bb, size, fn) {
  const lsbIdx = size > 256 ? lsbIndexBig : lsbIndex
  let tmp = bb
  while (tmp) {
    const lsb = tmp & -tmp
    const i = lsbIdx(lsb)
    fn(i)
    tmp ^= lsb
  }
}
/**
 * Iterate over set bit positions in an array-backed bitboard.
 *
 * Algorithm: Word-by-word iteration (32-bit chunks) with bit-within-word
 * extraction using shift and mask operations.
 *
 * Works with Uint32Array or Array<number>. If size is specified,
 * limits iteration to that many bits; otherwise uses array.length * 32.
 *
 * @generator
 * @param {Uint32Array|Array<number>} bb - Array of 32-bit words
 * @param {number} [size] - Optional bit limit (default: bb.length * 32)
 * @yields {number} Bit position for each set bit
 *
 * @example
 * const words = new Uint32Array([0b1010, 0b1100]);
 * for (const i of bitSafeArr(words, 64)) {
 *   console.log(i); // yields 1, 3, 34, 35
 * }
 *
 * @performance O(total_size) - scans all bits, yields only set ones
 */
export function* bitSafeArr (bb, size) {
  const words = bb.length
  const total = size || words * 32
  for (let i = 0; i < total; i++) {
    const w = bb[i >>> 5] || 0
    if (((w >>> (i & 31)) & 1) === 1) yield i
  }
}
/**
 * Iterate over set bit positions in an array-backed bitboard with callback.
 *
 * Callback-based alternative to bitSafeArr() for non-generator use cases.
 * Same word-by-word algorithm with bit extraction via shift and mask.
 *
 * More efficient than generator variant for immediate processing.
 *
 * @param {Uint32Array|Array<number>} bb - Array of 32-bit words
 * @param {number} [size] - Optional bit limit (default: bb.length * 32)
 * @param {(index: number) => void} fn - Callback invoked for each set bit index
 * @returns {void}
 *
 * @example
 * const words = new Uint32Array([0b1010, 0b1100]);
 * forEachBitSafeArr(words, 64, (i) => {
 *   console.log(`Bit ${i} is set`);
 * });
 */
export function forEachBitSafeArr (bb, size, fn) {
  const words = bb.length
  const total = size || words * 32
  for (let i = 0; i < total; i++) {
    const w = bb[i >>> 5] || 0
    if (((w >>> (i & 31)) & 1) === 1) fn(i)
  }
}

/**
 * Iterate over set bit positions in a BigInt with automatic LSB optimization.
 *
 * Selects LSB algorithm based on grid size:
 * - size <= 256: Uses BIT_INDEX lookup table (faster)
 * - size > 256: Uses Math.log2 for larger values
 *
 * @generator
 * @param {number} size - Grid size in bits (determines LSB algorithm)
 * @param {bigint} bb - Input bitboard to extract bits from
 * @yields {number} Bit position for each set bit
 *
 * @example
 * for (const i of bitsSafeBI(64, 0b1010n)) {
 *   console.log(i); // yields 1, 3
 * }
 *
 * @performance O(popcount(bb)) with algorithm selection based on size
 * @private
 */
export function* bitsSafeBI (size, bb) {
  const lsbIdx = size > 256 ? lsbIndexBig : lsbIndex
  let tmp = bb
  while (tmp) {
    const lsb = tmp & -tmp
    const i = lsbIdx(lsb)
    yield i
    tmp ^= lsb
  }
}

/**
 * Check if a specific bit position is set in a BigInt bitboard.
 *
 * Performs single-bit test using right shift and bitwise AND.
 * Returns 0n or 1n (as BigInt) for consistency with bitboard operations.
 *
 * @param {bigint} bb - Input bitboard
 * @param {number} i - Bit position to test (0-based)
 * @returns {bigint} 1n if bit is set, 0n if clear
 *
 * @example
 * const bit0 = has(0b1101n, 0); // 1n (set)
 * const bit1 = has(0b1101n, 1); // 0n (clear)
 * const bit2 = has(0b1101n, 2); // 1n (set)
 *
 * @performance O(1) - single shift and AND operation
 */
export function has (bb, i) {
  return (bb >> BigInt(i)) & 1n
}
