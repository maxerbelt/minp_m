import { randomElement, minMaxXY } from '../../core/utilities.js'
import { MaskBase } from '../MaskBase.js'
import { ShapeEnum } from '../shapeEnum.js'
import { BlitOperation } from '../BlitOperation.js'
import { SubMask } from '../SubMask.js'
import { SubBoard } from '../subBoard.js'
import { StoreBig } from '../bitStore/storeBig.js'

export class Mask extends MaskBase {
  constructor (width, height, bits, store, depth) {
    super(ShapeEnum.rectangle(width, height), depth, bits, store)
  }

  get _blit () {
    if (!this.__blit) this.__blit = new BlitOperation(this)
    return this.__blit
  }
  get area () {
    return this.width * this.height
  }
  emptyBitboard () {
    return 0n
  }
  defaultStore (depth) {
    return new StoreBig(depth, this.area, null, this.width, this.height)
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
  get defaultVariant () {
    const defaultBits = this.actions?.defaultVariant
    if (defaultBits) {
      this.bits = defaultBits
    } else {
      throw new Error('No default transform found for this shape')
    }
    return this
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

  // ============================================================================
  // Coordinate & Bit Position
  // ============================================================================

  /**
   * Get bit position for rectangular coordinates (x, y)
   * @private
   */
  bitPos (x, y) {
    return this.store.bitPos(this.index(x, y))
  }

  // ============================================================================
  // Cell Access - set, at, test, clear, add
  // ============================================================================

  /**
   * Set cell value at (x, y) with optional color
   */
  set (x, y, color = 1) {
    const loc = this.for(x, y)
    this.bits = loc.set(color)
    return this.bits
  }

  /**
   * Get cell value at (x, y)
   */
  at (x, y) {
    return this.for(x, y).at()
  }

  /**
   * Test if cell at (x, y) matches color value
   */
  test (x, y, color = 1) {
    return this.for(x, y).test(color)
  }

  /**
   * Add (set) a cell - alias for set
   */
  add (x, y, color = 1) {
    return this.set(x, y, color)
  }

  /**
   * Clear (zero out) a cell at (x, y)
   */
  clear (x, y) {
    return this.set(x, y, 0)
  }

  // ============================================================================
  // Random & Coordinate Conversion
  // ============================================================================

  /**
   * Get a random occupied coordinate
   */
  get randomOccupied () {
    const coords = this.toCoords
    return randomElement(coords)
  }

  /**
   * Get all occupied cells as [x, y] coordinate array
   */
  get toCoords () {
    return this._coords.bitsToCoordinates().map(a => a.slice(0, 2))
  }
  window (x, y, width, height) {
    const w = new SubMask(this, x, y, width, height)
    return w
  }
  section (x, y, width, height) {
    return SubBoard.fromMask(this, x, y, width, height)
  }
  embed (x, y) {
    return SubBoard.embed(this, x, y)
  }
  tempBoard (x = 0, y = 0, w = this.width, h = this.height) {
    return SubBoard.fromMask(this.emptyMaskOfSize(w, h), x, y, w, h)
  }
  static listFromCoords (coords) {
    if (!coords || coords.length === 0) return null
    return coords.map(c => Mask.fromCoords(c))
  }
  static listFromCoordsSquare (coords) {
    if (!coords || coords.length === 0) return null
    return coords.map(c => Mask.fromCoordsSquare(c))
  }
  static fromCoords (coords, width = null, height = null) {
    const { maxX, maxY, depth } = minMaxXY(coords)

    width = Math.max(maxX + 1, width || -Infinity)
    height = Math.max(maxY + 1, height || -Infinity)
    const msk = new Mask(width, height, null, null, depth)
    msk.fromCoords(coords)
    return msk
  }
  static fromCoordsInv (coords, width = null, height = null) {
    const inv = coords.map(c => [c[1], c[0], c[2] || 1]) // Swap x and y

    return Mask.fromCoords(inv, width, height)
  }
  emptyOfSize (newWidth, newHeight) {
    const msk = new Mask(newWidth, newHeight, null, null, this.depth)
    return msk
  }
  static fromCoordsSquare (coords, width = null) {
    // Handle empty coordinates array
    if (!coords || coords.length === 0) {
      return new Mask(1, 1, width, width, 2)
    }
    const { maxX, maxY, depth } = minMaxXY(coords)
    const size = Math.max(maxX + 1, maxY + 1, width || -Infinity)
    const msk = new Mask(size, size, null, null, depth)
    msk.fromCoords(coords)
    return msk
  }
  /**
   * Convert bits to coordinates and store in this mask
   */
  fromCoords (coords) {
    this._coords.fromCoordinates(coords)
  }

  /**
   * Convert coordinate array to bits (utility function)
   */
  bitsFromCoords (coords) {
    return this._coords.coordinatesToBits(coords)
  }

  // ============================================================================

  // ============================================================================
  // Iteration
  // ============================================================================

  /**
   * Iterate over indices of set bits
   */
  *bitsIndices () {
    yield* this.indexer.bitsIndices(this.bits)
  }
  *indices () {
    yield* this.indexer.indices(this.bits)
  }

  /**
   * Iterate over [x, y] coordinates of set bits
   */
  *bitKeys () {
    yield* this.indexer.bitKeys(this.bits)
  }

  // ============================================================================
  // Blit Operations
  // ============================================================================

  /**
   * Copy rectangular region from source mask to destination
   */
  blit (src, srcX, srcY, width, height, dstX, dstY, mode = 'copy') {
    this._blit.blit(src, srcX, srcY, width, height, dstX, dstY, mode)
  }

  /**
   * Apply blit operation for a single row
   * @private
   */
  applyBlitOperationForRow (currentBits, rowBits, dstStart, width, mode) {
    return this._blit.applyRowBlitOperationForBitPosition(
      currentBits,
      rowBits,
      dstStart,
      width,
      mode
    )
  }

  // ============================================================================
  // Flood Fill Utilities
  // ============================================================================

  /**
   * Find horizontal span boundaries from (x, y)
   * Returns [leftBound, rightBound] of continuous unset cells
   * @private
   */
  findSpanBorders (x, y) {
    let left = x
    let right = x
    while (left > 0 && !this.at(left - 1, y)) left--
    while (right + 1 < this.width && !this.at(right + 1, y)) right++
    return [left, right]
  }

  // ============================================================================
  // Dimension Manipulation
  // ============================================================================

  /**
   * Expand mask to new width, padding on right
   */
  /*
  expandBorder (borderSize, fillValue = 0) {
    const newMask = this.clone.expand(borderSize, fillValue)
    return new Mask(
      this.width + 2 * borderSize,
      this.height + 2 * borderSize,
      newMask.bits,
      newMask.store,
      this.depth
    )
  }
    */

  // ============================================================================
  // Edge Masks & Boundary Detection
  // ============================================================================
  expandBorderBits (borderSize, fillValue = 0) {
    return this.store.expandToWidthWithXYOffset(
      this.width,
      this.height,
      this.bits,
      this.width + 2 * borderSize,
      borderSize,
      borderSize,
      fillValue
    )
  }

  expandBorderMask (borderSize = 1, fillValue = 0) {
    const newBits = this.expandBorderBits(borderSize, fillValue)
    return new Mask(
      this.width + 2 * borderSize,
      this.height + 2 * borderSize,
      newBits,
      null,
      this.depth
    )
  }

  /**
   * Get edge masks for morph operations
   * Returns {left, right, top, bottom, notLeft, notRight, notTop, notBottom}
   * @private
   */
  edgeMasks () {
    const e = this.store.empty
    let left = e,
      right = e,
      top = e,
      bottom = e

    // top & bottom rows
    for (let x = 0; x < this.width; x++) {
      top = this.store.setIdx(top, this.index(x, 0), 1n)
      bottom = this.store.setIdx(bottom, this.index(x, this.height - 1), 1n)
    }

    // left & right columns
    for (let y = 0; y < this.height; y++) {
      left = this.store.setIdx(left, this.index(0, y), 1n)
      right = this.store.setIdx(right, this.index(this.width - 1, y), 1n)
    }

    const notLeft = this.store.invertedBits(left)
    const notRight = this.store.invertedBits(right)
    const notTop = this.store.invertedBits(top)
    const notBottom = this.store.invertedBits(bottom)
    return { left, right, top, bottom, notRight, notLeft, notTop, notBottom }
  }

  // ============================================================================
  // Factory Methods
  // ============================================================================

  /**
   * Create empty rectangular mask
   */
  static empty (width, height) {
    return new Mask(width, height, 0n)
  }

  /**
   * Create full (all bits set) rectangular mask
   */
  static full (width, height) {
    const mask = Mask.empty(width, height)
    mask.bits = mask.fullBits
    return mask
  }

  /**
   * Get empty mask of same dimensions
   */
  get emptyMask () {
    return Mask.empty(this.width, this.height)
  }

  /**
   * Type checking for mask operations
   * @private
   */
  checkType (bb) {
    if (!(bb instanceof Mask)) {
      throw new Error('union requires a Mask instance')
    }
  }

  static assembleColorLayersBits (colorLayers, gridWidth, gridHeight, depth) {
    const store = new StoreBig(
      depth,
      gridWidth * gridHeight,
      null,
      gridWidth,
      gridHeight
    )
    return store.assembleColorLayers(colorLayers, gridWidth, gridHeight)
  }
  static assembleColorLayers (colorLayers, gridWidth, gridHeight, depth) {
    return Mask.assembleColorLayersBits(
      colorLayers,
      gridWidth,
      gridHeight,
      depth
    ).map(bits => new Mask(gridWidth, gridHeight, bits))
  }
}
