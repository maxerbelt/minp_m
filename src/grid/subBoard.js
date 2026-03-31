import { SubMask } from './SubMask.js'
import { minMaxXY } from '../utilities.js'

export class SubBoard extends SubMask {
  constructor (offsetX, offsetY, width, height, base, template, depth) {
    base = base || template.emptyMaskOfSize(width, height, depth)
    super(base, offsetX, offsetY, width, height)
  }
  /**
   * Private helper: Apply offset to world-relative coordinates
   * @protected
   */
  _applyOffset (x, y) {
    return [x - this.offsetX, y - this.offsetY]
  }
  _removeOffset (x, y) {
    return [x + this.offsetX, y + this.offsetY]
  }

  *locations () {
    for (const [x, y] of this.mask.locations()) {
      yield this._removeOffset(x, y)
    }
  }
  /**
  /**
   * Private helper: Check if coordinates are within window bounds
   * @protected
   */
  _isInWindow (x, y) {
    return (
      x >= this.offsetX &&
      x < this.fullWidth &&
      y >= this.offsetY &&
      y < this.fullHeight
    )
  }
  get occupancy () {
    return this.mask.occupancy
  }
  get toAscii () {
    return this.mask.toAscii
  }
  toAsciiWith (symbols) {
    return this.mask.toAsciiWith(symbols)
  }

  copyFromMask (largeMask) {
    for (let y = 0; y < this.windowHeight; y++) {
      for (let x = 0; x < this.windowWidth; x++) {
        const [worldX, worldY] = this._removeOffset(x, y)
        const value = largeMask.at(worldX, worldY)
        if (value > 0) {
          this.mask.set(x, y, value)
        }
      }
    }
  }
  copyToMask (largeMask) {
    for (let y = 0; y < this.windowHeight; y++) {
      for (let x = 0; x < this.windowWidth; x++) {
        const value = this.mask.at(x, y)
        if (value > 0) {
          const [worldX, worldY] = this._removeOffset(x, y)
          largeMask.set(worldX, worldY, value)
        }
      }
    }
  }
  toMask (newWidth, newHeight) {
    const newMask = this.mask.emptyMaskOfSize(newWidth, newHeight)
    this.copyToMask(newMask)
    return newMask
  }

  /**
   * Get all occupied cells as [x, y] coordinate array
   * Returns window-relative coordinates (0 to width-1, 0 to height-1)
   */
  get toCoords () {
    const coords = []
    const isMultiBit = this.store.bitsPerCell > 0
    for (let y = 0; y < this.windowHeight; y++) {
      for (let x = 0; x < this.windowWidth; x++) {
        const value = this.mask.at(x, y)
        if (value > 0) {
          const [worldX, worldY] = this._removeOffset(x, y)
          if (isMultiBit) {
            coords.push([worldX, worldY, value])
          } else {
            coords.push([worldX, worldY])
          }
        }
      }
    }
    return coords
  }
  static emptyFromTemplate (
    temp,
    width = temp.width,
    height = temp.height,
    offsetX = 0,
    offsetY = 0
  ) {
    return new SubBoard(offsetX, offsetY, width, height, null, temp)
  }
  dilateExpand (borderSize = 1, fillValue = 0) {
    const dilated = this.mask.dilateExpand(borderSize, fillValue)
    return new SubBoard(
      this.offsetX - borderSize,
      this.offsetY - borderSize,
      this.windowWidth + 2 * borderSize,
      this.windowHeight + 2 * borderSize,
      dilated
    )
  }
  dilate () {
    return this.dilateExpand(1, 0)
  }
  get emptyMask () {
    return SubBoard.emptyFromTemplate(
      this.mask,
      this.windowWidth,
      this.windowHeight,
      this.offsetX,
      this.offsetY
    )
  }
  emptyMaskOfSize (w, h) {
    return SubBoard.emptyFromTemplate(
      this.mask,
      w,
      h,
      this.offsetX,
      this.offsetY
    )
  }
  extractColorLayer (color) {
    const layer = this.mask.extractColorLayer(color)
    this.shiftToThis(
      layer,
      this.offsetX,
      this.offsetY,
      this.windowWidth,
      this.windowHeight
    )
  }
  extractColorLayers () {
    return this.mask
      .extractColorLayers()
      .map(layer =>
        this.shiftToThis(
          layer,
          this.offsetX,
          this.offsetY,
          this.windowWidth,
          this.windowHeight
        )
      )
  }
  static fromCoords (coords, base, template, offsetX = 0, offsetY = 0) {
    const { minX, maxX, minY, maxY, depth, hasColor } = minMaxXY(coords)
    const sb = new SubBoard(
      minX + offsetX,
      minY + offsetY,
      maxX - minX + 1,
      maxY - minY + 1,
      base,
      template,
      hasColor ? depth : template?.depth
    )
    sb.copyFromCoords(coords)
    return sb
  }
  static fromCoordsSquare (coords, base, template) {
    const { minX, maxX, minY, maxY, depth, hasColor } = minMaxXY(coords)
    const size = Math.max(maxX - minX + 1, maxY - minY + 1)
    const sb = new SubBoard(
      minX,
      minY,
      size,
      size,
      base,
      template,
      hasColor ? depth : template?.depth
    )
    sb.copyFromCoords(coords)
    return sb
  }

  get minSize () {
    return this.mask.minSize
  }
  get maxSize () {
    return this.mask.maxSize
  }
  get isTall () {
    return this.mask.isTall
  }
  get isWide () {
    return this.mask.isWide
  }
  get isSquare () {
    return this.mask.isSquare
  }
  shrinkToOccupied () {
    const newMask = this.mask.shrinkToOccupied()
    const sb = new SubBoard(
      this.offsetX,
      this.offsetY,
      newMask.width,
      newMask.height,
      null,
      newMask
    )
    sb.copyFromMask(newMask)
    return sb
  }
  static fromMask (mask, offsetX, offsetY, width, height) {
    const sb = new SubBoard(offsetX, offsetY, width, height, null, mask)
    sb.copyFromMask(mask)
    return sb
  }
  shiftToThis (mask) {
    return SubBoard.fromMask(
      mask,
      this.offsetX,
      this.offsetY,
      this.windowWidth,
      this.windowHeight
    )
  }
  static embed (mask, offsetX, offsetY) {
    const sb = new SubBoard(
      offsetX,
      offsetY,
      mask.width,
      mask.height,
      mask.clone
    )
    return sb
  }
}
