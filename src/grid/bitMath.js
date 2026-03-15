export class BitMath {
  static isPowerOf2 (n) {
    return n > 0 && (n & (n - 1)) === 0
  }
  static nextPow2 (n) {
    n >>>= 0
    if (n <= 1) return 1
    if (BitMath.isPowerOf2(n)) return n
    return 1 << (32 - Math.clz32(n))
  }

  static bitLength32 (n) {
    return n < 3 ? 1 : 32 - Math.clz32(n - 1)
  }
  static bitsPerCell (depth = 2, bitLength = null) {
    return BitMath.nextPow2(bitLength || BitMath.bitLength32(depth))
  }
}
