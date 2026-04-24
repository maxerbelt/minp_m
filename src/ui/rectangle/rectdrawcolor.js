import { RectDraw } from './rectdraw.js'

/**
 * Enhanced rectangular grid drawer supporting 2, 4, 16, and 256 color depths
 * Depth parameter controls bits per cell: 2→1bit, 4→2bits, 16→4bits, 256→8bits
 * Uses this.mask from parent class to store color values
 */
export class RectDrawColor extends RectDraw {
  // ============================================================================
  // Constants
  // ============================================================================

  /** Supported depth values */
  static get SUPPORTED_DEPTHS () {
    return [2, 4, 16, 256]
  }

  /** RGB color cube step size for 256-color palette */
  static get RGB_CUBE_STEP () {
    return 51
  }

  /** Grayscale step size for 256-color palette */
  static get GRAYSCALE_STEP () {
    return 6
  }

  /** Maximum RGB component value */
  static get MAX_RGB_VALUE () {
    return 255
  }

  /** Hex color prefix */
  static get HEX_PREFIX () {
    return '#'
  }

  /** Hex color component length */
  static get HEX_COMPONENT_LENGTH () {
    return 2
  }

  /** Minimum color value */
  static get MIN_COLOR_VALUE () {
    return 0
  }

  /**
   * Create a new RectDrawColor instance
   * @param {string} canvasId - ID of the canvas element
   * @param {number} [width=10] - Grid width in cells
   * @param {number} [height=10] - Grid height in cells
   * @param {number} [cellSize=25] - Size of each cell in pixels
   * @param {number} [offsetX=0] - X offset for drawing
   * @param {number} [offsetY=0] - Y offset for drawing
   * @param {number} [depth=2] - Color depth (2, 4, 16, or 256 colors)
   */
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
   * Convert color depth to bits per cell
   * @param {number} depth - Color depth (2, 4, 16, or 256)
   * @returns {number} Bits per cell
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
          `Unsupported depth: ${depth}. Supported depths: ${RectDrawColor.SUPPORTED_DEPTHS.join(
            ', '
          )}`
        )
    }
  }

  /**
   * Build color palette based on bits per cell
   * @param {number} bitsPerCell - Bits per cell (1, 2, 4, or 8)
   * @returns {string[]} Array of hex color strings
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
          `Unsupported bitsPerCell: ${bitsPerCell}. Supported values: 1, 2, 4, 8`
        )
    }
  }

  /**
   * Generate 2-color palette (black/white)
   * @returns {string[]} Array of 2 hex color strings
   * @private
   */
  _palette2Colors () {
    return ['#000000', '#FFFFFF']
  }

  /**
   * Generate 4-color palette (primary colors)
   * @returns {string[]} Array of 4 hex color strings
   * @private
   */
  _palette4Colors () {
    return ['#000000', '#FF0000', '#00FF00', '#0000FF']
  }

  /**
   * Generate 16-color palette (extended colors)
   * @returns {string[]} Array of 16 hex color strings
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
   * Generate 256-color palette (RGB cube + grayscale)
   * @returns {string[]} Array of 256 hex color strings
   * @private
   */
  _palette256Colors () {
    const palette = []

    // RGB color cube: 6x6x6 = 216 colors
    this._addRgbCubeColors(palette)

    // Grayscale gradient: 40 additional colors
    this._addGrayscaleColors(palette)

    return palette.slice(0, 256)
  }

  /**
   * Add RGB color cube colors to palette
   * @param {string[]} palette - Palette array to modify
   * @private
   */
  _addRgbCubeColors (palette) {
    for (
      let r = 0;
      r <= RectDrawColor.MAX_RGB_VALUE;
      r += RectDrawColor.RGB_CUBE_STEP
    ) {
      for (
        let g = 0;
        g <= RectDrawColor.MAX_RGB_VALUE;
        g += RectDrawColor.RGB_CUBE_STEP
      ) {
        for (
          let b = 0;
          b <= RectDrawColor.MAX_RGB_VALUE;
          b += RectDrawColor.RGB_CUBE_STEP
        ) {
          palette.push(this._rgbToHex(r, g, b))
        }
      }
    }
  }

  /**
   * Add grayscale colors to palette
   * @param {string[]} palette - Palette array to modify
   * @private
   */
  _addGrayscaleColors (palette) {
    for (
      let gray = 0;
      gray <= RectDrawColor.MAX_RGB_VALUE;
      gray += RectDrawColor.GRAYSCALE_STEP
    ) {
      palette.push(this._rgbToHex(gray, gray, gray))
    }
  }

  /**
   * Convert RGB values to hex color string
   * @param {number} r - Red component (0-255)
   * @param {number} g - Green component (0-255)
   * @param {number} b - Blue component (0-255)
   * @returns {string} Hex color string
   * @private
   */
  _rgbToHex (r, g, b) {
    return (
      RectDrawColor.HEX_PREFIX +
      r.toString(16).padStart(RectDrawColor.HEX_COMPONENT_LENGTH, '0') +
      g.toString(16).padStart(RectDrawColor.HEX_COMPONENT_LENGTH, '0') +
      b.toString(16).padStart(RectDrawColor.HEX_COMPONENT_LENGTH, '0')
    )
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
   * @param {number} colorValue - Color value to convert
   * @returns {string} Hex color string
   * @private
   */
  _getHexColor (colorValue) {
    const clamped = Math.max(
      RectDrawColor.MIN_COLOR_VALUE,
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
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} colorValue - Color value to set
   */
  setColorValue (x, y, colorValue) {
    const clamped = Math.max(
      RectDrawColor.MIN_COLOR_VALUE,
      Math.min(colorValue, this.maxColor)
    )
    this.mask.set(x, y, clamped)
  }

  /**
   * Cycle cell to next color (wraps around)
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   */
  cycleColor (x, y) {
    const current = this._getCellValue(x, y)
    const next = (current + 1) % (this.maxColor + 1)
    this.setColorValue(x, y, next)
  }

  /**
   * Set entire grid to specific color
   * @param {number} colorValue - Color value to fill with
   */
  fillWithColor (colorValue) {
    const clamped = Math.max(
      RectDrawColor.MIN_COLOR_VALUE,
      Math.min(colorValue, this.maxColor)
    )
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.setColorValue(x, y, clamped)
      }
    }
  }

  /**
   * Clear grid (set all cells to 0)
   */
  clear () {
    this.mask.bits = this.mask.store.empty
    this.redraw()
  }

  /**
   * Get color info as string
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {string} Color information string
   */
  getColorInfo (x, y) {
    const colorValue = this._getCellValue(x, y)
    const hexColor = this._getHexColor(colorValue)
    return `Color ${colorValue}/${this.maxColor}: ${hexColor}`
  }

  /**
   * Export palette as array
   * @returns {string[]} Copy of the color palette
   */
  getPalette () {
    return [...this.colorPalette]
  }

  /**
   * Get color histogram
   * @returns {Uint32Array} Array where index is color value and value is count
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
