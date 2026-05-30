/**
 * @module grid/operations/BitOperations
 * @description Encapsulates bit-level operations on mask bits.
 * Handles logical operations (AND, OR, SUB, XOR) and their mask-wrapped variants.
 * Provides both raw bit operations returning bigint values and mask-creation
 * wrappers that return new mask instances with computed bits.
 */

/**
 * @typedef {Object} MaskInstance
 * @description A mask instance representing a set of grid coordinates with associated values
 * @property {Object} store - Bit store backend (BigInt-based storage with operations)
 * @property {bigint} store.one - Single bit value (1n)
 * @property {Function} store.bitOr - Bitwise OR operation: (bits1, bits2) => bigint
 * @property {Function} store.bitAnd - Bitwise AND operation: (bits1, bits2) => bigint
 * @property {Function} store.bitSub - Bitwise SUB operation: (bits1, bits2) => bigint
 * @property {Function} store.bitXor - Bitwise XOR operation: (bits1, bits2) => bigint (optional)
 * @property {Function} store.invertedBits - Bitwise NOT operation: (bits) => bigint
 * @property {bigint} bits - Current bit pattern
 * @property {Object} emptyMask - Reference to empty mask instance (factory for new masks)
 */

/**
 * BitOperations - Encapsulates bit-level operations on mask bits.
 *
 * Provides a facade for bitwise operations on mask bits, separating concerns
 * between raw bit manipulation and mask object creation. Each logical operation
 * (AND, OR, SUB, XOR, NOT) has two variants:
 * 1. Raw bit operations returning bigint results for efficiency
 * 2. Mask creation wrappers returning new mask instances for convenience
 *
 * Used to implement intersection, union, difference, and complement operations
 * on grid masks while preserving mask structure and metadata.
 *
 * @class BitOperations
 * @description Encapsulates bit-level operations on mask bits
 * @public
 */
export class BitOperations {
  /**
   * Create a BitOperations instance for a specific mask.
   *
   * Initializes bit operation handler for a given mask instance. Extracts
   * and caches the store reference for direct bit operation method access.
   *
   * @constructor
   * @param {MaskInstance} maskInstance - Mask instance to operate on.
   * Must have bits (bigint), store (backend), and emptyMask (factory) properties.
   * @throws {Error} If maskInstance is null or missing required properties
   * @public
   *
   * @example
   * const mask = new Mask(8, 8);
   * const ops = new BitOperations(mask);
   * const union = ops.createUnionMask(otherMask.bits);
   */
  constructor (maskInstance) {
    this.mask = maskInstance
    this.store = maskInstance.store
  }

  // ==================== BIT OPERATIONS (returns bits) ====================

  /**
   * Logical OR: Union of two bit patterns.
   *
   * Computes the bitwise OR of this mask's bits with provided bits,
   * resulting in a pattern containing all bits set in either operand.
   * Used to combine or merge two grid patterns.
   *
   * @param {bigint} bits - Operand bits to OR with this mask's bits.
   * Must be a valid BigInt value.
   * @returns {bigint} Result of bitwise OR operation (union of both patterns).
   * Every bit that is 1 in either operand is 1 in the result.
   * @public
   *
   * @example
   * const ops = new BitOperations(mask1);
   * const union = ops.or(mask2.bits);
   * // Result contains cells from both masks combined
   */
  or (bits) {
    return this.store.bitOr(this.mask.bits, bits)
  }

  /**
   * Logical AND: Intersection of two bit patterns.
   *
   * Computes the bitwise AND of this mask's bits with provided bits,
   * resulting in a pattern containing only bits set in both operands.
   * Used for collision detection or finding overlapping regions.
   *
   * @param {bigint} bits - Operand bits to AND with this mask's bits.
   * Must be a valid BigInt value.
   * @returns {bigint} Result of bitwise AND operation (intersection of both patterns).
   * Only bits that are 1 in both operands are 1 in the result.
   * @public
   *
   * @example
   * const ops = new BitOperations(mask1);
   * const overlap = ops.and(mask2.bits);
   * // Result contains only cells present in both masks
   */
  and (bits) {
    return this.store.bitAnd(this.mask.bits, bits)
  }

  /**
   * Logical SUB: Difference (bits present in first but not second).
   *
   * Computes the bitwise subtraction of provided bits from this mask's bits,
   * resulting in a pattern with bits removed where operand has them.
   * Used for removing obstacles, creating empty space, or exclusion operations.
   *
   * @param {bigint} bits - Operand bits to subtract from this mask's bits.
   * Must be a valid BigInt value.
   * @returns {bigint} Result of bitwise subtraction (difference of patterns).
   * Bits that are 1 in the operand are set to 0 in the result.
   * @public
   *
   * @example
   * const ops = new BitOperations(mask1);
   * const difference = ops.subtract(mask2.bits);
   * // Result contains cells from mask1 but not mask2
   */
  subtract (bits) {
    return this.store.bitSub(this.mask.bits, bits)
  }

  /**
   * XOR: Symmetric difference of two bit patterns.
   *
   * Computes the bitwise XOR of this mask's bits with provided bits,
   * resulting in a pattern with bits set where operands differ.
   * Used for finding differences or toggling regions.
   *
   * @param {bigint} bits - Operand bits to XOR with this mask's bits.
   * Must be a valid BigInt value.
   * @returns {bigint} Result of bitwise XOR operation (symmetric difference).
   * Bits that differ between operands are 1 in the result;
   * bits that are the same are 0.
   * @public
   *
   * @example
   * const ops = new BitOperations(mask1);
   * const diff = ops.xor(mask2.bits);
   * // Result contains cells that differ between the two masks
   */
  xor (bits) {
    return this.store.bitXor
      ? this.store.bitXor(this.mask.bits, bits)
      : this.mask.bits ^ bits
  }

  /**
   * Invert: Complement of bit pattern.
   *
   * Computes the bitwise complement of this mask's bits, resulting in
   * a pattern with all bits flipped (1→0, 0→1). Used for negation,
   * finding empty cells, or inverting constraints.
   *
   * @returns {bigint} Bitwise complement of all bits in this mask.
   * Every 1 bit becomes 0 and every 0 bit becomes 1 (within grid bounds).
   * @public
   *
   * @example
   * const ops = new BitOperations(mask);
   * const inverted = ops.invert();
   * // Result contains all empty cells (inverse of occupied cells)
   */
  invert () {
    return this.store.invertedBits(this.mask.bits)
  }

  // ==================== MASK CREATION (returns Mask) ====================

  /**
   * Create a mask from OR operation (union).
   *
   * Creates a new mask instance with bits computed from OR operation.
   * The new mask contains all cells occupied in either this mask or the operand.
   * Useful for combining multiple grid patterns while preserving mask structure.
   *
   * @param {bigint} bits - Operand bits for union operation.
   * Must be a valid BigInt value, typically from another mask.bits.
   * @returns {MaskInstance} New mask instance with bits = (this.bits OR bits).
   * Same dimensions and structure as this mask, but with combined occupancy.
   * @public
   *
   * @example
   * const ops = new BitOperations(mask1);
   * const unionMask = ops.createUnionMask(mask2.bits);
   * // unionMask contains cells from both masks
   */
  createUnionMask (bits) {
    return this._createMaskFromOperation(() => this.or(bits))
  }

  /**
   * Create a mask from AND operation (intersection).
   *
   * Creates a new mask instance with bits computed from AND operation.
   * The new mask contains only cells occupied in both this mask and the operand.
   * Useful for finding overlapping regions or collision detection.
   *
   * @param {bigint} bits - Operand bits for intersection operation.
   * Must be a valid BigInt value, typically from another mask.bits.
   * @returns {MaskInstance} New mask instance with bits = (this.bits AND bits).
   * Same dimensions and structure as this mask, but with only overlapping cells.
   * @public
   *
   * @example
   * const ops = new BitOperations(mask1);
   * const intersectionMask = ops.createIntersectionMask(mask2.bits);
   * // intersectionMask contains only cells in both masks
   */
  createIntersectionMask (bits) {
    return this._createMaskFromOperation(() => this.and(bits))
  }

  /**
   * Create a mask from SUB operation (difference).
   *
   * Creates a new mask instance with bits computed from subtraction operation.
   * The new mask contains cells occupied in this mask but not in the operand.
   * Useful for removing obstacles, creating exclusion zones, or set difference.
   *
   * @param {bigint} bits - Operand bits to subtract from this mask.
   * Must be a valid BigInt value, typically from another mask.bits.
   * @returns {MaskInstance} New mask instance with bits = (this.bits - bits).
   * Same dimensions and structure as this mask, but with operand cells removed.
   * @public
   *
   * @example
   * const ops = new BitOperations(mask1);
   * const differenceMask = ops.createDifferenceMask(mask2.bits);
   * // differenceMask contains cells from mask1 but not mask2
   */
  createDifferenceMask (bits) {
    return this._createMaskFromOperation(() => this.subtract(bits))
  }

  /**
   * Create a mask from inverted bits (complement).
   *
   * Creates a new mask instance with bits computed from inversion operation.
   * The new mask contains all unoccupied cells (inverse of current occupancy).
   * Useful for finding empty space, negating constraints, or creating inverse masks.
   *
   * @returns {MaskInstance} New mask instance with bits = complement(this.bits).
   * Same dimensions and structure as this mask, but with all cells flipped.
   * @public
   *
   * @example
   * const ops = new BitOperations(mask);
   * const invertedMask = ops.createInvertedMask();
   * // invertedMask contains all empty cells from the original mask
   */
  createInvertedMask () {
    return this._createMaskFromOperation(() => this.invert())
  }

  // ==================== PRIVATE HELPERS ====================

  /**
   * Single source of truth for mask creation from bit operations.
   *
   * Eliminates duplicate mask creation pattern across all mask-creation methods.
   * Provides a consistent factory pattern for wrapping computed bits into
   * new mask instances. Internal abstraction that ensures all mask-creation
   * methods use identical initialization logic.
   *
   * @private
   * @param {Function} operationFn - Function computing the result bits.
   * Must be a synchronous function with no parameters.
   * Signature: () => bigint. Should return the computed bit pattern.
   * @returns {MaskInstance} New mask instance with bits set to operation result.
   * Inherits dimensions and structure from this mask via emptyMask.
   * @throws {TypeError} If operationFn is not a function or returns non-bigint
   *
   * @example
   * // Internal usage in createUnionMask
   * return this._createMaskFromOperation(() => this.or(bits))
   */
  _createMaskFromOperation (operationFn) {
    const result = this.mask.emptyMask
    result.bits = operationFn()
    return result
  }
}
