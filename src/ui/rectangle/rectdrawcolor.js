import { RectDraw } from './rectdraw.js'

/**
 * Enhanced rectangular grid drawer supporting 2, 4, 16, and 256 color depths
 * Depth parameter controls bits per cell: 2→1bit, 4→2bits, 16→4bits, 256→8bits
 * Uses this.mask from parent class to store color values
 */
export class RectDrawColor extends RectDraw {
  constructor (
    canvasId,
    width = 10,
    height = 10,
    cellSize = 25,
    offsetX = 0,
    offsetY = 0,
    depth = 2
  ) {
    super(canvasId, width, height, cellSize, offsetX, offsetY, depth)

    // Convert depth to bits per cell
    this.bitsPerCell = this._depthToBitsPerCell(depth)
    this.maxColor = (1 << this.bitsPerCell) - 1 // 2^bitsPerCell - 1
    this.colorPalette = this._buildColorPalette(this.bitsPerCell)
  }

  /**
   * Convert depth value to bits per cell
   * 2→1bit, 4→2bits, 16→4bits, 256→8bits
   * @private
   */
  _depthToBitsPerCell (depth) {
    switch (depth) {
      case 2:
        return 1
      case 4:
        return 2
      case 16:
        return 4
      case 256:
        return 8
      default:
        throw new Error(
          `Unsupported depth: ${depth}. Must be 2, 4, 16, or 256`
        )
    }
  }

  /**
   * Build color palette based on bitsPerCell
   * @private
   */
  _buildColorPalette (bitsPerCell) {
    switch (bitsPerCell) {
      case 1:
        return this._palette2Colors()
      case 2:
        return this._palette4Colors()
      case 4:
        return this._palette16Colors()
      case 8:
        return this._palette256Colors()
      default:
        throw new Error(
          `Unsupported bitsPerCell: ${bitsPerCell}. Must be 1, 2, 4, or 8`
        )
    }
  }

  /**
   * 2-color palette (black/white)
   * @private
   */
  _palette2Colors () {
    return ['#000000', '#FFFFFF']
  }

  /**
   * 4-color palette (primary colors)
   * @private
   */
  _palette4Colors () {
    return ['#000000', '#FF0000', '#00FF00', '#0000FF']
  }

  /**
   * 16-color palette (extended colors)
   * @private
   */
  _palette16Colors () {
    return [
      '#000000',
      '#FF0000',
      '#00FF00',
      '#0000FF',
      '#FFFF00',
      '#FF00FF',
      '#00FFFF',
      '#FFFFFF',
      '#808080',
      '#FF6600',
      '#9933FF',
      '#00CCFF',
      '#FF0099',
      '#99FF00',
      '#FF9900',
      '#CCCCCC'
    ]
  }

  /**
   * 256-color palette (RGB cube + grayscale)
   * @private
   */
  _palette256Colors () {
    const palette = []

    // RGB color cube: 6x6x6 = 216 colors
    for (let r = 0; r < 256; r += 51) {
      for (let g = 0; g < 256; g += 51) {
        for (let b = 0; b < 256; b += 51) {
          const hex =
            '#' +
            r.toString(16).padStart(2, '0') +
            g.toString(16).padStart(2, '0') +
            b.toString(16).padStart(2, '0')
          palette.push(hex.toUpperCase())
        }
      }
    }

    // Grayscale gradient: 40 additional colors
    for (let gray = 0; gray < 256; gray += 6) {
      const hex =
        '#' +
        gray.toString(16).padStart(2, '0') +
        gray.toString(16).padStart(2, '0') +
        gray.toString(16).padStart(2, '0')
      palette.push(hex.toUpperCase())
    }

    return palette.slice(0, 256)
  }

  /**
   * Get cell color value (0 to maxColor)
   * @private
   */
  _getCellValue (x, y) {
    return this.mask.at(x, y)
  }

  /**
   * Get hex color for a specific color value
   * @private
   */
  _getHexColor (colorValue) {
    const clamped = Math.max(
      0,
      Math.min(colorValue, this.colorPalette.length - 1)
    )
    return this.colorPalette[clamped]
  }

  /**
   * Redraw grid with color values
   * Override parent to use color values instead of binary states
   * @private
   */
  _drawGrid () {
    this._iterateGridCells((x, y) => {
      const colorValue = this._getCellValue(x, y)
      const hexColor = this._getHexColor(colorValue)
      this._drawRectCell(x, y, hexColor)
    })
  }

  /**
   * Set cell to specific color value
   */
  setColorValue (x, y, colorValue) {
    const clamped = Math.max(0, Math.min(colorValue, this.maxColor))
    this.mask.set(x, y, clamped)
  }

  /**
   * Cycle cell to next color (wraps around)
   */
  cycleColor (x, y) {
    const current = this._getCellValue(x, y)
    const next = (current + 1) % (this.maxColor + 1)
    this.setColorValue(x, y, next)
  }

  /**
   * Set entire grid to specific color
   */
  fillWithColor (colorValue) {
    const clamped = Math.max(0, Math.min(colorValue, this.maxColor))
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.setColorValue(x, y, clamped)
      }
    }
  }

  /**
   * Clear grid (set all to 0)
   */
  clear () {
    this.mask.bits = this.mask.store.empty
    this.redraw()
  }

  /**
   * Get color info as string
   */
  getColorInfo (x, y) {
    const colorValue = this._getCellValue(x, y)
    const hexColor = this._getHexColor(colorValue)
    return `Color ${colorValue}/${this.maxColor}: ${hexColor}`
  }

  /**
   * Export palette as array
   */
  getPalette () {
    return [...this.colorPalette]
  }

  /**
   * Get color histogram
   */
  getColorHistogram () {
    const histogram = new Uint32Array(this.maxColor + 1)
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const colorValue = this.mask.at(x, y)
        histogram[colorValue]++
      }
    }
    return histogram
  }
}
