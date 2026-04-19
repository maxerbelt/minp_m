import { GridBase } from '../gridBase.js'
import { RectangleShape } from './RectangleShape.js'
import { AsciiRepresentation } from '../AsciiRepresentation.js'

export class AsciiGrid extends GridBase {
  constructor (width, height, ascii, fillChar = '.') {
    super(RectangleShape(width, height))
    this.fillChar = fillChar
    this.string = ascii || fill(fillChar, width, height)
  }

  index (x, y) {
    return y * (this.width + 1) + x
  }

  at (x, y) {
    const idx = this.index(x, y)
    return this.string.charAt(idx)
  }

  set (x, y, color = 1) {
    const idx = this.index(x, y)
    const newString =
      this.string.substring(0, idx) +
      (color ? '#' : this.fillChar) +
      this.string.substring(idx + 1)
    this.string = newString
  }

  get empty () {
    const grid = new AsciiGrid(this.width, this.height, null, this.fillChar)
    grid.string = fill('.', this.width, this.height)
    return grid
  }

  get full () {
    const grid = new AsciiGrid(this.width, this.height, null, this.fillChar)
    grid.string = fill('#', this.width, this.height)
    return grid
  }

  /**
   * Convert to ASCII string using AsciiRepresentation
   * Symbols map: '.' for fillChar, '#' for set cells (color=1)
   */
  get toAscii () {
    return this.string
  }

  /**
   * Convert to ASCII with custom symbols using AsciiRepresentation
   */
  toAsciiWith (symbols = AsciiRepresentation.defaultSymbols) {
    const repr = new AsciiRepresentation(this)
    return repr.toAsciiWith(symbols)
  }

  get occupancy () {
    return this.string.split('').filter(c => c !== this.fillChar && c !== '\n')
      .length
  }

  get indexMax () {
    return (this.width + 1) * this.height - 1
  }

  get rowMax () {
    return this.width + 1
  }
  static fromMask (mask, fillChar = '.') {
    const grid = new AsciiGrid(mask.width, mask.height, null, fillChar)
    for (const [x, y] of mask.locations()) {
      const color = mask.at(x, y)
      grid.set(x, y, color)
    }
    return grid
  }
}

/**
 * Helper function to fill a grid with repeating pattern
 */
function fill (fillChar, width, height) {
  const row = fillChar.repeat(width)
  return Array(height).fill(row).join('\n')
}
