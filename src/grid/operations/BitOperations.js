/**
 * BitOperations - Encapsulates bit-level operations on mask bits
 * Handles logical operations (AND, OR, SUB, XOR) and their mask-wrapped variants
 * Provides both raw bit operations and mask-creation wrappers
 */
export class BitOperations {
  /**
   * @param {Object} maskInstance - Mask instance with bits, store, emptyMask properties
   */
  constructor (maskInstance) {
    this.mask = maskInstance
    this.store = maskInstance.store
  }

  // ==================== BIT OPERATIONS (returns bits) ====================

  /**
   * Logical OR: Union of two bit patterns
   * @param {bigint} bits - Operand bits
   * @returns {bigint} Result of bitwise OR operation
   */
  or (bits) {
    return this.store.bitOr(this.mask.bits, bits)
  }

  /**
   * Logical AND: Intersection of two bit patterns
   * @param {bigint} bits - Operand bits
   * @returns {bigint} Result of bitwise AND operation (intersection)
   */
  and (bits) {
    return this.store.bitAnd(this.mask.bits, bits)
  }

  /**
   * Logical SUB: Difference (bits present in first but not second)
   * @param {bigint} bits - Operand bits to subtract
   * @returns {bigint} Result of bitwise subtraction
   */
  subtract (bits) {
    return this.store.bitSub(this.mask.bits, bits)
  }

  /**
   * XOR: Symmetric difference of two bit patterns
   * @param {bigint} bits - Operand bits
   * @returns {bigint} Result of bitwise XOR operation
   */
  xor (bits) {
    return this.store.bitXor
      ? this.store.bitXor(this.mask.bits, bits)
      : this.mask.bits ^ bits
  }

  /**
   * Invert: Complement of bit pattern
   * @returns {bigint} Bitwise complement of all bits
   */
  invert () {
    return this.store.invertedBits(this.mask.bits)
  }

  // ==================== MASK CREATION (returns Mask) ====================

  /**
   * Create a mask from OR operation
   * @param {bigint} bits - Operand bits for union
   * @returns {Object} New mask with bits = (this.bits OR bits)
   */
  createUnionMask (bits) {
    return this._createMaskFromOperation(() => this.or(bits))
  }

  /**
   * Create a mask from AND operation (intersection)
   * @param {bigint} bits - Operand bits for intersection
   * @returns {Object} New mask with bits = (this.bits AND bits)
   */
  createIntersectionMask (bits) {
    return this._createMaskFromOperation(() => this.and(bits))
  }

  /**
   * Create a mask from SUB operation (difference)
   * @param {bigint} bits - Operand bits to subtract
   * @returns {Object} New mask with bits = (this.bits - bits)
   */
  createDifferenceMask (bits) {
    return this._createMaskFromOperation(() => this.subtract(bits))
  }

  /**
   * Create a mask from inverted bits
   * @returns {Object} New mask with bits = complement(this.bits)
   */
  createInvertedMask () {
    return this._createMaskFromOperation(() => this.invert())
  }

  // ==================== PRIVATE HELPERS ====================

  /**
   * Single source of truth for mask creation from bit operations
   * Eliminates 4× duplicated mask creation pattern
   * @private
   * @param {Function} operationFn - Function returning computed bits
   *                                  Signature: () => bigint
   * @returns {Object} New mask instance with computed bits
   */
  _createMaskFromOperation (operationFn) {
    const result = this.mask.emptyMask
    result.bits = operationFn()
    return result
  }
}
