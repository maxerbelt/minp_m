/**
 * MaskValidation - Encapsulates mask validation and compatibility checking
 * Ensures masks are compatible for operations like union, intersection, etc.
 */
export class MaskValidation {
  constructor (maskInstance) {
    this.mask = maskInstance
  }

  /**
   * Check if another mask is fully compatible for operations
   * Validates both type and dimensions
   */
  isCompatibleWith (otherMask) {
    return this.isSameType(otherMask) && this.hasSameDimensions(otherMask)
  }

  /**
   * Ensure compatibility, throw if not compatible
   */
  assertCompatibleWith (otherMask) {
    this.assertSameType(otherMask)
    this.assertSameDimensions(otherMask)
  }

  /**
   * Check if two masks have the same type
   */
  isSameType (otherMask) {
    return otherMask.constructor === this.mask.constructor
  }

  /**
   * Assert masks are same type, throw if not
   */
  assertSameType (otherMask) {
    if (!this.isSameType(otherMask)) {
      throw new Error(
        `Type mismatch: expected ${this.mask.constructor.name}, got ${otherMask.constructor.name}`
      )
    }
  }

  /**
   * Check if two masks have matching dimensions
   * Note: Only checks width (height check is intentionally omitted
   * to allow combining masks of different heights but same width)
   */
  hasSameDimensions (otherMask) {
    return this.mask.width === otherMask.width
  }

  /**
   * Assert masks have same dimensions, throw if not
   */
  assertSameDimensions (otherMask) {
    if (!this.hasSameDimensions(otherMask)) {
      throw new Error(
        `Dimension mismatch: this ${this.mask.width}x${this.mask.height}, other ${otherMask.width}x${otherMask.height}`
      )
    }
  }

  /**
   * Check if mask is empty
   */
  isEmpty () {
    return this.mask.occupancy === 0
  }

  /**
   * Check if mask is full
   */
  isFull () {
    return this.mask.bits === this.mask.fullBits
  }

  /**
   * Check if mask is valid (non-null, properly initialized)
   */
  isValid () {
    return (
      this.mask.bits !== undefined &&
      this.mask.bits !== null &&
      this.mask.store !== undefined
    )
  }
}
