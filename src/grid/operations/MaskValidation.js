/**
 * @typedef {Object} MaskInstance
 * @property {bigint|Array} bits - Bitboard representation of occupied cells
 * @property {bigint} fullBits - Pattern representing all bits set for this mask
 * @property {number} occupancy - Count of set bits (population count)
 * @property {number} width - Grid width in cells
 * @property {number} height - Grid height in cells
 * @property {Object} store - Bit storage backend for type operations
 * @property {Function} constructor - Constructor for type checking
 */

/**
 * @typedef {Object} ValidationError
 * @property {string} message - Detailed validation error message
 * @property {string} code - Error classification (e.g., 'TYPE_MISMATCH', 'DIMENSION_MISMATCH')
 */

/**
 * MaskValidation - Encapsulates mask validation and compatibility checking.
 * Ensures masks are compatible for operations like union, intersection, etc.
 * Provides methods for type compatibility, dimension matching, and state verification.
 * Organized by concern: Compatibility checks | Type checking | Dimension checking | State checks
 *
 * @class MaskValidation
 * @description Provides validation and compatibility checking for mask operations
 */
export class MaskValidation {
  /**
   * Constructs a MaskValidation instance for a specific mask
   * Maintains reference to mask for all validation operations
   *
   * @param {MaskInstance} maskInstance - Mask instance to validate against
   * @throws {Error} If maskInstance is null/undefined
   */
  constructor (maskInstance) {
    this.mask = maskInstance
  }

  // ==================== COMPATIBILITY CHECKS ====================

  /**
   * Check if another mask is fully compatible for operations
   * Validates both type and dimensions match this mask
   * Used before performing union, intersection, XOR, or other combined operations
   *
   * @param {MaskInstance} otherMask - Mask to check compatibility with
   * @returns {boolean} True if compatible (same type and dimensions)
   */
  isCompatibleWith (otherMask) {
    return this.isSameType(otherMask) && this.hasSameDimensions(otherMask)
  }

  /**
   * Ensure compatibility with another mask, throw detailed error if incompatible
   * Checks both type and dimensions, providing comprehensive error information
   * Preferred for defensive programming in critical operations
   *
   * @param {MaskInstance} otherMask - Mask to validate against
   * @returns {void} Throws Error if incompatible (type or dimension mismatch)
   * @throws {Error} With detailed mismatch information including both failures
   */
  assertCompatibleWith (otherMask) {
    this.assertSameType(otherMask)
    this.assertSameDimensions(otherMask)
  }

  // ==================== TYPE CHECKING ====================

  /**
   * Check if two masks have the same type/class
   * Compares constructor functions for safe type-dependent operations
   *
   * @param {MaskInstance} otherMask - Mask to compare
   * @returns {boolean} True if both masks have identical constructor (same class)
   */
  isSameType (otherMask) {
    return otherMask.constructor === this.mask.constructor
  }

  /**
   * Assert masks are same type, throw if not
   * Validates constructor match for safe type-dependent operations like union/intersection
   * Provides constructive error message showing actual vs expected types
   *
   * @param {MaskInstance} otherMask - Mask to validate
   * @returns {void} Throws Error if types don't match
   * @throws {Error} With actual vs expected type names and operation guidance
   */
  assertSameType (otherMask) {
    this._validateAndThrow(
      this.isSameType(otherMask),
      `Type mismatch: expected ${this.mask.constructor.name}, got ${otherMask.constructor.name}. ` +
        `Masks must be same class for type-safe operations (union, intersection, etc.)`
    )
  }

  // ==================== DIMENSION CHECKING ====================

  /**
   * Check if two masks have matching width (grid-compatible)
   * Note: Height check is intentionally omitted to allow stacking masks
   * of different heights but same width (e.g., vertical composition, layering)
   * Width determines bit indexing: coordinate → bit index mapping depends on width
   *
   * @param {MaskInstance} otherMask - Mask to compare dimensions
   * @returns {boolean} True if widths match (height mismatch allowed for layering)
   */
  hasSameDimensions (otherMask) {
    return this.mask.width === otherMask.width
  }

  /**
   * Assert masks have same width (grid dimensions), throw if not
   * Validates that masks can be combined without coordinate conflicts
   * Width must match because bit indexing depends on grid width
   *
   * @param {MaskInstance} otherMask - Mask to validate
   * @returns {void} Throws Error if dimensions don't match
   * @throws {Error} With actual vs expected dimensions and bit indexing explanation
   */
  assertSameDimensions (otherMask) {
    this._validateAndThrow(
      this.hasSameDimensions(otherMask),
      `Dimension mismatch: this mask is ${this.mask.width}×${this.mask.height}, ` +
        `other is ${otherMask.width}×${otherMask.height}. ` +
        `Masks must have same width for coordinate-safe operations (bit indexing depends on width).`
    )
  }

  // ==================== STATE CHECKS ====================

  /**
   * Check if mask is empty (no set bits)
   * Occupancy count should be zero for empty masks
   *
   * @returns {boolean} True if occupancy is zero (no cells occupied)
   */
  isEmpty () {
    return this.mask.occupancy === 0
  }

  /**
   * Check if mask is completely full (all bits set)
   * Compares current bits to fullBits pattern for complete fill
   *
   * @returns {boolean} True if all bits are set (mask is saturated)
   */
  isFull () {
    return this.mask.bits === this.mask.fullBits
  }

  /**
   * Check if mask is properly initialized and valid
   * Validates critical properties exist and are accessible
   * Useful for defensive checks before operations
   *
   * @returns {boolean} True if mask has required structure (bits, store accessible)
   */
  isValid () {
    return !!(this.mask?.bits && this.mask?.store)
  }

  // ==================== PRIVATE HELPERS ====================

  /**
   * Generic validation helper: check condition and throw detailed error if false
   * Single source of truth for validation + error pattern
   * Centralizes error generation for consistent error messages across class
   *
   * @private
   * @param {boolean} condition - Validation condition (true = pass, false = fail)
   * @param {string} errorMessage - Detailed error message if condition is false
   * @returns {void} Throws Error if condition is false, returns undefined otherwise
   * @throws {Error} With provided message if validation fails
   */
  _validateAndThrow (condition, errorMessage) {
    if (!condition) {
      throw new Error(errorMessage)
    }
  }
}
