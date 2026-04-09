/**
 * MorphologicalOps - Encapsulates morphological operations (dilate, erode)
 * These operations expand or shrink bit regions using structural elements
 */
export class MorphologicalOps {
  constructor (maskInstance) {
    this.mask = maskInstance
    this.store = maskInstance.store
  }

  /**
   * Expand the set bits by the given radius
   * Mutates this.mask.bits and returns the mask for chaining
   */
  dilate (radius = 1) {
    this.mask.bits = this.dilateBits(radius)
    return this.mask
  }

  /**
   * Get dilated bits without mutation
   */
  dilateBits (radius = 1) {
    const edges = this.mask.edgeMasks()
    return this.store.dilateSeparable(
      this.mask.bits,
      this.mask.width,
      this.store.storeType(radius),
      edges
    )
  }

  /**
   * Perform cross (cardinal directions) dilation
   * Mutates bits and returns this mask for chaining
   */
  dilateCross () {
    this.mask.bits = this.dilateCrossBits()
    return this.mask
  }

  /**
   * Get cross-dilated bits without mutation
   */
  dilateCrossBits () {
    const edges = this.mask.edgeMasks()
    return this.store.dilateCrossStep(
      this.mask.bits,
      edges,
      this.mask.width,
      this.mask.height
    )
  }

  /**
   * Shrink the set bits by the given radius (clamped at edges)
   * Like morphological erosion. Mutates bits and returns mask for chaining
   */
  erode (radius = 1) {
    this.mask.bits = this.erodeBits(radius)
    return this.mask
  }

  /**
   * Get eroded bits without mutation
   */
  erodeBits (radius = 1) {
    const edges = this.mask.edgeMasks()
    // Horizontal then vertical clamp erosion is the separable counterpart
    const horiz = this.store.erodeHorizontalClamp(
      this.mask.bits,
      this.store.storeType(radius),
      edges
    )
    const horizVert = this.store.erodeVerticalClamp(
      horiz,
      this.mask.width,
      this.store.storeType(radius),
      edges
    )
    return horizVert
  }

  /**
   * Test whether mask would be empty after erosion
   */
  wouldBeEmptyAfterEroding (radius = 1) {
    return this.erodeBits(radius) === this.store.empty
  }

  /**
   * Test whether mask would be different after dilation
   */
  changesWithDilation (radius = 1) {
    return this.dilateBits(radius) !== this.mask.bits
  }
}
