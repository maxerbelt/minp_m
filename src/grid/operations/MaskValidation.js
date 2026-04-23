/**
 * MaskValidation - Encapsulates mask validation and compatibility checking
 * Ensures masks are compatible for operations like union, intersection, etc.
 * Organized by concern: Compatibility checks | State checks | Internal validation
 */
export class MaskValidation {
  /**
   * @param {Object} maskInstance - Mask instance to validate
   */
  constructor (maskInstance) {
    this.mask = maskInstance
  }

  // ==================== COMPATIBILITY CHECKS ====================

  /**
   * Check if another mask is fully compatible for operations
   * Validates both type and dimensions match this mask
   * @param {Object} otherMask - Mask to check compatibility with
   * @returns {boolean} True if compatible (same type and dimensions)
   */
  isCompatibleWith (otherMask) {
    return this.isSameType(otherMask) && this.hasSameDimensions(otherMask)
  }

  /**
   * Ensure compatibility with another mask, throw detailed error if incompatible
   * Checks both type and dimensions
   * @param {Object} otherMask - Mask to validate against
   * @returns {void} Throws Error if incompatible
   * @throws {Error} With detailed mismatch information
   */
  assertCompatibleWith (otherMask) {
    this.assertSameType(otherMask)
    this.assertSameDimensions(otherMask)
  }

  // ==================== TYPE CHECKING ====================

  /**
   * Check if two masks have the same type/class
   * @param {Object} otherMask - Mask to compare
   * @returns {boolean} True if both masks are same class
   */
  isSameType (otherMask) {
    return otherMask.constructor === this.mask.constructor
  }

  /**
   * Assert masks are same type, throw if not
   * Validates constructor match for safe type-dependent operations
   * @param {Object} otherMask - Mask to validate
   * @returns {void} Throws Error if types don't match
   * @throws {Error} With actual vs expected type names
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
   * of different heights but same width (e.g., vertical composition)
   * @param {Object} otherMask - Mask to compare dimensions
   * @returns {boolean} True if widths match
   */
  hasSameDimensions (otherMask) {
    return this.mask.width === otherMask.width
  }

  /**
   * Assert masks have same width (grid dimensions), throw if not
   * Validates that masks can be combined without coordinate conflicts
   * @param {Object} otherMask - Mask to validate
   * @returns {void} Throws Error if dimensions don't match
   * @throws {Error} With actual vs expected dimensions
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
   * @returns {boolean} True if occupancy is zero
   */
  isEmpty () {
    return this.mask.occupancy === 0
  }

  /**
   * Check if mask is completely full (all bits set)
   * Compares to fullBits pattern
   * @returns {boolean} True if all bits are set
   */
  isFull () {
    return this.mask.bits === this.mask.fullBits
  }

  /**
   * Check if mask is properly initialized and valid
   * Validates critical properties exist and aren't null
   * @returns {boolean} True if mask has required structure
   */
  isValid () {
    return (
      this.mask.bits !== undefined &&
      this.mask.bits !== null &&
      this.mask.store !== undefined
    )
  }

  // ==================== PRIVATE HELPERS ====================

  /**
   * Generic validation helper: check condition and throw detailed error if false
   * Single source of truth for validation + error pattern
   * @private
   * @param {boolean} condition - Validation condition (true = pass, false = fail)
   * @param {string} errorMessage - Detailed error message if condition is false
   * @returns {void} Throws Error if condition is false
   * @throws {Error} With provided message if validation fails
   */
  _validateAndThrow (condition, errorMessage) {
    if (!condition) {
      throw new Error(errorMessage)
    }
  }
}
