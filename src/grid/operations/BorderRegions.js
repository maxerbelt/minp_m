/**
 * BorderRegions - Encapsulates border and region operations on masks
 * Organizes concepts of outer borders, inner borders, and area regions
 */
export class BorderRegions {
  constructor (maskInstance) {
    this.mask = maskInstance
    this.store = maskInstance.store
  }

  // ==================== OUTER BORDER ====================

  /**
   * Get bits representing the outer border (dilation boundary)
   * = dilated region minus original region
   */
  getOuterBorderBits () {
    const dilatedBits = this.mask.dilateBits(1)
    return this.store.bitSub(dilatedBits, this.mask.bits)
  }

  /**
   * Create mask containing only the outer border
   */
  createOuterBorderMask () {
    return this._createMaskFromBits(this.getOuterBorderBits())
  }

  // ==================== OUTER AREA ====================

  /**
   * Get bits representing the outer area
   * = everything outside the dilation boundary
   */
  getOuterAreaBits () {
    return this.store.bitSub3(
      this.mask.fullBits,
      this.mask.bits,
      this.getOuterBorderBits()
    )
  }

  /**
   * Create mask containing the outer area
   */
  createOuterAreaMask () {
    return this._createMaskFromBits(this.getOuterAreaBits())
  }

  // ==================== INNER BORDER ====================

  /**
   * Get bits representing the inner border (erosion boundary)
   * = original region minus eroded region
   */
  getInnerBorderBits () {
    const erodedBits = this.mask.erodeBits(1)
    return this.store.bitSub(this.mask.bits, erodedBits)
  }

  /**
   * Create mask containing only the inner border
   */
  createInnerBorderMask () {
    return this._createMaskFromBits(this.getInnerBorderBits())
  }

  // ==================== INNER AREA ====================

  /**
   * Get bits representing the inner area
   * = original region minus inner border
   */
  getInnerAreaBits () {
    return this.store.bitSub(this.mask.bits, this.getInnerBorderBits())
  }

  /**
   * Create mask containing the inner area
   */
  createInnerAreaMask () {
    return this._createMaskFromBits(this.getInnerAreaBits())
  }

  // ==================== LOCATION TESTING ====================

  /**
   * Test if a location is on the outer border
   */
  isOnOuterBorder (x, y) {
    return this._isBitSetAtLocation(this.getOuterBorderBits(), x, y)
  }

  /**
   * Test if a location is on the inner border
   */
  isOnInnerBorder (x, y) {
    return this._isBitSetAtLocation(this.getInnerBorderBits(), x, y)
  }

  // ==================== PRIVATE HELPERS ====================

  /**
   * Create a mask instance from bit pattern
   * Single source of truth for mask creation
   * @private
   */
  _createMaskFromBits (bits) {
    const mask = this.mask.emptyMask
    mask.bits = bits
    return mask
  }

  /**
   * Test if a bit is set at the given location
   * Consolidates location testing logic
   * @private
   */
  _isBitSetAtLocation (bits, x, y) {
    const locationIndex = this.mask.index(x, y)
    return this.store.isBitSet(bits, locationIndex)
  }
}
