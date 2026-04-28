import { SubMask } from './SubMask.js'
import { minMaxXY } from '../core/utilities.js'

export class SubBoard extends SubMask {
  constructor (offsetX, offsetY, width, height, base, template, depth) {
    base = base || template.emptyMaskOfSize(width, height, depth)
    super(base, offsetX, offsetY, width, height)
  }

  /**
   * Convert world coordinates to local mask coordinates
   * @protected
   * @param {number} worldX - World X coordinate
   * @param {number} worldY - World Y coordinate
   * @returns {Array<number>} [localX, localY] coordinates
   */
  _worldToLocal (worldX, worldY) {
    return [worldX - this.offsetX, worldY - this.offsetY]
  }

  /**
   * Convert local mask coordinates to world coordinates
   * @protected
   * @param {number} localX - Local mask X coordinate
   * @param {number} localY - Local mask Y coordinate
   * @returns {Array<number>} [worldX, worldY] coordinates
   */
  _localToWorld (localX, localY) {
    return [localX + this.offsetX, localY + this.offsetY]
  }

  /**
   * Override SubMask's _applyOffset to convert world-relative to window-relative
   * @protected
   * @param {number} worldX - World X coordinate
   * @param {number} worldY - World Y coordinate
   * @returns {Array<number>} [windowX, windowY] coordinates
   */
  _applyOffset (worldX, worldY) {
    return this._worldToLocal(worldX, worldY)
  }

  /**
   * Override SubMask's _removeOffset to convert window-relative to world-relative
   * @param {number} winX - Window-relative X coordinate
   * @param {number} winY - Window-relative Y coordinate
   * @returns {Array<number>} [worldX, worldY] coordinates
   */
  _removeOffset (winX, winY) {
    return this._localToWorld(winX, winY)
  }

  /**
   * Check if world coordinates are within this SubBoard's bounds
   * @protected
   * @param {number} worldX - World X coordinate
   * @param {number} worldY - World Y coordinate
   * @returns {boolean} True if coordinates are within bounds
   */
  _isInWorldBounds (worldX, worldY) {
    return (
      worldX >= this.offsetX &&
      worldX < this.offsetX + this.windowWidth &&
      worldY >= this.offsetY &&
      worldY < this.offsetY + this.windowHeight
    )
  }

  /**
   * Generator yielding occupied locations in world coordinates
   * @yields {Array<number>} [worldX, worldY] coordinates
   */
  *occupiedLocations () {
    for (const [localX, localY] of this.mask.occupiedLocations()) {
      yield this._localToWorld(localX, localY)
    }
  }

  /**
   * Override SubMask's _isInWindow to check world-relative coordinates
   * @protected
   * @param {number} worldX - World X coordinate
   * @param {number} worldY - World Y coordinate
   * @returns {boolean} True if coordinates are within bounds
   */
  _isInWindow (worldX, worldY) {
    return this._isInWorldBounds(worldX, worldY)
  }

  /**
   * Set value at world-relative coordinates
   * @param {number} worldX - World X coordinate
   * @param {number} worldY - World Y coordinate
   * @param {number} [color=1] - Color value to set
   * @throws {Error} If coordinates are out of world bounds
   */
  set (worldX, worldY, color = 1) {
    if (!this._isInWorldBounds(worldX, worldY)) {
      throw new Error(
        `Coordinates (${worldX}, ${worldY}) out of window bounds [${
          this.offsetX
        }, ${this.offsetX + this.windowWidth - 1}] x [${this.offsetY}, ${
          this.offsetY + this.windowHeight - 1
        }]`
      )
    }
    const [localX, localY] = this._worldToLocal(worldX, worldY)
    return this.mask.set(localX, localY, color)
  }

  /**
   * Generator yielding occupied locations and values in world coordinates
   * @yields {Array<number>} [worldX, worldY, value] tuples
   */
  *occupiedLocationsAndValues () {
    for (const [
      localX,
      localY,
      value
    ] of this.mask.occupiedLocationsAndValues()) {
      yield [...this._localToWorld(localX, localY), value]
    }
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
    for (let localY = 0; localY < this.windowHeight; localY++) {
      for (let localX = 0; localX < this.windowWidth; localX++) {
        const [worldX, worldY] = this._localToWorld(localX, localY)
        const value = largeMask.at(worldX, worldY)
        if (value > 0) {
          this.mask.set(localX, localY, value)
        }
      }
    }
  }

  copyToMask (largeMask) {
    for (let localY = 0; localY < this.windowHeight; localY++) {
      for (let localX = 0; localX < this.windowWidth; localX++) {
        const value = this.mask.at(localX, localY)
        if (value > 0) {
          const [worldX, worldY] = this._localToWorld(localX, localY)
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

  toMaskMatching (otherMask) {
    const newMask = otherMask.emptyMaskOfSize(
      this.windowWidth,
      this.windowHeight
    )
    this.copyToMask(newMask)
    return newMask
  }
  /**
   * Load window contents from a list of world-relative [x, y, value] coordinates
   * @param {Array<Array>} coords - List of world-relative [x, y, value] tuples
   */
  copyFromCoords (coords) {
    for (const [worldX, worldY, value] of coords) {
      if (this.isValid(worldX, worldY)) {
        this.set(worldX, worldY, value)
      }
    }
  }

  /**
   * Get all occupied cells as [x, y] coordinate array in world coordinates
   * @returns {Array<Array<number>>} Array of [worldX, worldY] or [worldX, worldY, value] coordinates
   */
  get toCoords () {
    const coords = []
    const isMultiBit = this.store.bitsPerCell > 0

    for (const [
      localX,
      localY,
      value
    ] of this.mask.occupiedLocationsAndValues()) {
      const [worldX, worldY] = this._localToWorld(localX, localY)
      coords.push(isMultiBit ? [worldX, worldY, value] : [worldX, worldY])
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
    // Convert world coordinates to window-relative coordinates
    const windowCoords = coords.map(([x, y, value]) => [
      x - sb.offsetX,
      y - sb.offsetY,
      value || 1
    ])
    // Set directly on the underlying mask (window-relative coordinates)
    for (const [x, y, value] of windowCoords) {
      if (x >= 0 && x < sb.windowWidth && y >= 0 && y < sb.windowHeight) {
        sb.mask.set(x, y, value)
      }
    }
    return sb
  }
  fromXYcoords (coords, base, template, offsetX = 0, offsetY = 0) {
    return SubBoard.fromCoords(coords, base, template, offsetX, offsetY)
  }

  fromRCcoords (coords, base, template, offsetX = 0, offsetY = 0) {
    const xyCoords = coords.map(c => [c[1], c[0], c[2] || 1])
    return SubBoard.fromCoords(xyCoords, base, template, offsetX, offsetY)
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
    // Convert world coordinates to window-relative coordinates
    const windowCoords = coords.map(([x, y, value]) => [
      x - sb.offsetX,
      y - sb.offsetY,
      value || 1
    ])
    // Set directly on the underlying mask (window-relative coordinates)
    for (const [x, y, value] of windowCoords) {
      if (x >= 0 && x < sb.windowWidth && y >= 0 && y < sb.windowHeight) {
        sb.mask.set(x, y, value)
      }
    }
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
