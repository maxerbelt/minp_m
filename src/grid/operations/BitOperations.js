/**
 * BitOperations - Encapsulates bit-level operations on mask bits
 * Handles logical operations (AND, OR, SUB) and their mask-wrapped variants
 */
export class BitOperations {
  constructor (maskInstance) {
    this.mask = maskInstance
    this.store = maskInstance.store
  }

  /**
   * Logical OR: Union of two bit patterns
   */
  or (bits) {
    return this.store.bitOr(this.mask.bits, bits)
  }

  /**
   * Logical AND: Intersection of two bit patterns
   */
  and (bits) {
    return this.store.bitAnd(this.mask.bits, bits)
  }

  /**
   * Logical SUB: Difference (bits present in first but not second)
   */
  subtract (bits) {
    return this.store.bitSub(this.mask.bits, bits)
  }

  /**
   * Invert: Complement of bit pattern
   */
  invert () {
    return this.store.invertedBits(this.mask.bits)
  }

  /**
   * Create a mask from OR operation
   */
  createUnionMask (bits) {
    const result = this.mask.emptyMask
    result.bits = this.or(bits)
    return result
  }

  /**
   * Create a mask from AND operation (intersection)
   */
  createIntersectionMask (bits) {
    const result = this.mask.emptyMask
    result.bits = this.and(bits)
    return result
  }

  /**
   * Create a mask from SUB operation (difference)
   */
  createDifferenceMask (bits) {
    const result = this.mask.emptyMask
    result.bits = this.subtract(bits)
    return result
  }

  /**
   * Create a mask from inverted bits
   */
  createInvertedMask () {
    const result = this.mask.emptyMask
    result.bits = this.invert()
    return result
  }

  /**
   * XOR: Symmetric difference of two bit patterns
   */
  xor (bits) {
    return this.store.bitXor
      ? this.store.bitXor(this.mask.bits, bits)
      : this.mask.bits ^ bits
  }
}
