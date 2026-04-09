/**
 * BorderRegions - Encapsulates border and region operations on masks
 * Organizes concepts of outer borders, inner borders, and area regions
 */
export class BorderRegions {
  constructor (maskInstance) {
    this.mask = maskInstance
    this.store = maskInstance.store
  }

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
    const mask = this.mask.emptyMask
    mask.bits = this.getOuterBorderBits()
    return mask
  }

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
    const mask = this.mask.emptyMask
    mask.bits = this.getOuterAreaBits()
    return mask
  }

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
    const mask = this.mask.emptyMask
    mask.bits = this.getInnerBorderBits()
    return mask
  }

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
    const mask = this.mask.emptyMask
    mask.bits = this.getInnerAreaBits()
    return mask
  }

  /**
   * Test if a location is on the outer border
   */
  isOnOuterBorder (x, y) {
    const outerBorderBits = this.getOuterBorderBits()
    return this.mask.store.isBitSet(outerBorderBits, this.mask.index(x, y))
  }

  /**
   * Test if a location is on the inner border
   */
  isOnInnerBorder (x, y) {
    const innerBorderBits = this.getInnerBorderBits()
    return this.mask.store.isBitSet(innerBorderBits, this.mask.index(x, y))
  }
}
