import { MaskBase } from '../MaskBase.js'
import { ShapeEnum } from '../shapeEnum.js'

export class RectMaskBase extends MaskBase {
  constructor (width, height, bits, store, depth) {
    super(ShapeEnum.rectangle(width, height), depth, bits, store)
  }
  get area () {
    return this.width * this.height
  }

  // ============================================================================
  // Indexing & Bit Positioning
  // ============================================================================
  /**
   * Convert rectangular (x, y) to linear index
   */
  index (x, y) {
    return y * this.width + x
  }
  indexXY (x, y) {
    return this.index(x, y)
  }
  indexRC (r, c) {
    return this.index(c, r)
  }

  /**
   * Get bit position in store for rectangular coordinates
   */
  bitPos (x, y) {
    return this.store.bitPos(this.index(x, y))
  }
  bitPosXY (x, y) {
    return this.bitPos(x, y)
  }
  bitPosRC (r, c) {
    return this.bitPos(c, r)
  }

  // ============================================================================
  // Cell Access - at, set, testFor, isNonZero
  // ============================================================================

  /**
   * Get cell value at (x, y)
   */
  at (x, y) {
    const idx = this.index(x, y)
    return this.store.getIdx(this.bits, idx)
  }

  /**
   * Set cell value at (x, y) to specified color
   */
  set (x, y, color = 1) {
    this.bits = this.store.setIdx(this.bits, this.index(x, y), color)
    return this.bits
  }

  /**
   * Test if cell at (x, y) matches specified color
   * Standard interface - use instead of testFor
   */
  test (x, y, color = 1) {
    return this.at(x, y) === color
  }

  /**
   * Test if cell at (x, y) matches specified color (legacy alias)
   */
  testFor (x, y, color = 1) {
    return this.test(x, y, color)
  }

  /**
   * Clear (zero out) a cell at (x, y)
   */
  clear (x, y) {
    return this.set(x, y, 0)
  }

  /**
   * Check if cell at (x, y) has non-zero value
   */
  isNonZero (x, y) {
    const idx = this.index(x, y)
    return this.store.isNonZero(this.bits, idx)
  }

  getTransformCapabilities () {
    return this.indexer?.getTransformCapabilities(this) || {}
  }

  canRotate () {
    const capabilities = this.getTransformCapabilities()
    return capabilities.canRotate || false
  }
  canFlip () {
    const capabilities = this.getTransformCapabilities()
    return capabilities.canFlip || false
  }

  rotate () {
    const rotated = this.actions?.rotate(this.bits)
    if (rotated) {
      this.bits = rotated
    } else {
      throw new Error('No non-symmetric rotation found for this shape')
    }
    return this
  }
  r90 () {
    const rotated = this.actions?.r90Map(this.bits)
    if (rotated) {
      this.bits = rotated
    } else {
      throw new Error('No 90-degree rotation found for this shape')
    }
    return this
  }
  r180 () {
    const rotated = this.actions?.r180Map(this.bits)
    if (rotated) {
      this.bits = rotated
    } else {
      throw new Error('No 180-degree rotation found for this shape')
    }
    return this
  }
  r270 () {
    const rotated = this.actions?.r270Map(this.bits)
    if (rotated) {
      this.bits = rotated
    } else {
      throw new Error('No 270-degree rotation found for this shape')
    }
    return this
  }
  fx () {
    const flipped = this.actions?.fxMap(this.bits)
    if (flipped) {
      this.bits = flipped
    } else {
      throw new Error('No horizontal flip found for this shape')
    }
    return this
  }
  fy () {
    const flipped = this.actions?.fyMap(this.bits)
    if (flipped) {
      this.bits = flipped
    } else {
      throw new Error('No vertical flip found for this shape')
    }
    return this
  }
  rotateFlip () {
    const rotated = this.actions?.rotateFlip(this.bits)
    if (rotated) {
      this.bits = rotated
    } else {
      throw new Error('No non-symmetric rotation found for this shape')
    }
    return this
  }
  rotateCCW () {
    const rotated = this.actions?.rotateCCW(this.bits)
    if (rotated) {
      this.bits = rotated
    } else {
      throw new Error('No non-symmetric rotation found for this shape')
    }
    return this
  }
  flip () {
    const flipped = this.actions?.flip(this.bits)
    if (flipped) {
      this.bits = flipped
    } else {
      throw new Error('No non-symmetric flip found for this shape')
    }
    return this
  }
  get actions () {
    if (
      !this._actions ||
      !this.store.bitEqual(this._actions?.original?.bits, this.bits)
    ) {
      this._actions = this.indexer?.actions(this)
    }
    return this._actions
  }

  static invertCoords (coords) {
    return coords.map(c => RectMaskBase.invertCoord(c))
  }

  static invertCoord (coord) {
    return [coord[1], coord[0], coord[2] || 1]
  }
  // ============================================================================
  // Coordinate Conversion
  // ============================================================================
  fromXYcoords (coords) {
    this.fromCoords(coords)
  }
  fromRCcoords (coords) {
    this.fromCoords(RectMaskBase.invertCoords(coords)) // Swap x and y
  }

  bitsFromXYcoords (coords) {
    return this.bitsFromCoords(coords)
  }
  bitsFromRCcoords (coords) {
    return this.bitsFromCoords(RectMaskBase.invertCoords(coords))
  }
  // ============================================================================
  // Random & Coordinate Conversion
  // ============================================================================

  /**
   * Get a random occupied coordinate
   */
  get randomXYoccupied () {
    return this.randomOccupied
  }
  get randomRCoccupied () {
    return RectMaskBase.invertCoord(this.randomOccupied)
  }

  /**
   * Get all occupied cells as [x, y] coordinate array
   */
  get toXYcoords () {
    return this.toCoords
  }
  get toRCcoords () {
    return RectMaskBase.invertCoords(this.toCoords)
  }
}
