import { RectDraw } from './rectdraw.js'
import { BitMath } from '../../grid/bitStore/helpers/bitMath.js'

/**
 * @typedef {Object} ColorInfo
 * @property {number} colorValue - Numeric color value (0 to maxColor)
 * @property {string} hexColor - Hex color string (e.g., '#FF0000')
 * @property {number} index - Index in color palette
 */

/**
 * Enhanced rectangular grid drawer supporting 2, 4, 16, and 256 color depths.
 *
 * Provides multi-color rendering capabilities with automatic palette generation.
 * Depth parameter controls bits per cell and color count:
 * - 2 colors: 1 bit per cell (binary)
 * - 4 colors: 2 bits per cell (2x2)
 * - 16 colors: 4 bits per cell (extended palette)
 * - 256 colors: 8 bits per cell (RGB cube + grayscale)
 *
 * Inherits grid rendering and interaction from RectDraw parent class.
 * Uses this.mask from parent to store multi-bit color values.
 * Supports color cycling, filling, and histogram operations.
 *
 * @extends RectDraw
 * @class RectDrawColor
 *
 * @example
 * const drawer = new RectDrawColor('canvas-id', 20, 20, 30, 0, 0, 256);
 * drawer.setColorValue(5, 5, 128); // Set cell to color 128
 * drawer.redraw();
 */
export class RectDrawColor extends RectDraw {
  // ============================================================================
  // Constants
  // ============================================================================

  /**
   * RGB color cube step size for 256-color palette.
   * Divides RGB space into 6x6x6 cube for color generation.
   * @type {number}
   * @static
   */
  static get RGB_CUBE_STEP () {
    return 51
  }

  /**
   * Grayscale step size for 256-color palette.
   * Creates 40+ shades of gray for extended palette.
   * @type {number}
   * @static
   */
  static get GRAYSCALE_STEP () {
    return 6
  }

  /**
   * Maximum RGB component value (highest color channel).
   * @type {number}
   * @static
   */
  static get MAX_RGB_VALUE () {
    return 255
  }

  /**
   * Hex color prefix for color strings.
   * All colors formatted as `#RRGGBB`.
   * @type {string}
   * @static
   */
  static get HEX_PREFIX () {
    return '#'
  }

  /**
   * Hex color component length in characters.
   * Each RGB component is 2 hex digits (00-FF).
   * @type {number}
   * @static
   */
  static get HEX_COMPONENT_LENGTH () {
    return 2
  }

  /**
   * Minimum color value (empty/unset state).
   * @type {number}
   * @static
   */
  static get MIN_COLOR_VALUE () {
    return 0
  }

  /**
   * Create a new RectDrawColor instance with specified canvas and dimensions.
   *
   * Initializes a color-capable rectangular grid drawer. Automatically computes
   * bits per cell from depth and generates an appropriate color palette.
   * Validates depth parameter and throws error if unsupported.
   *
   * @param {string} canvasId - ID of the canvas DOM element to render into
   * @param {number} [width=10] - Grid width in cells (must be positive)
   * @param {number} [height=10] - Grid height in cells (must be positive)
   * @param {number} [cellSize=25] - Size of each cell in pixels (minimum 2)
   * @param {number} [offsetX=0] - X offset for grid positioning
   * @param {number} [offsetY=0] - Y offset for grid positioning
   * @param {number} [depth=2] - Color depth: 2, 4, 16, or 256 colors
   * @throws {Error} If depth is not in [2, 4, 16, 256]
   *
   * @example
   * const drawer = new RectDrawColor('myCanvas', 20, 20, 30, 10, 10, 16);
   * // Creates 20x20 grid with 16 colors, 30px cells, offset by (10,10)
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
    try {
      this.bitsPerCell = BitMath.maxColorsToBitsPerCell(depth)
    } catch (error) {
      throw new Error(`Unsupported depth: ${depth} - ${error.message} `)
    }
    this.maxColor = (1 << this.bitsPerCell) - 1 // 2^bitsPerCell - 1
    this.colorPalette = this._buildColorPalette(this.bitsPerCell)
  }

  /**
   * Build color palette appropriate for the given bits-per-cell depth.
   *
   * Selects and generates a palette based on color depth:
   * - 1 bit: 2-color (black/white)
   * - 2 bits: 4-color (primary colors)
   * - 4 bits: 16-color (extended palette)
   * - 8 bits: 256-color (RGB cube + grayscale)
   *
   * @param {number} bitsPerCell - Bits per cell (1, 2, 4, or 8)
   * @returns {string[]} Array of hex color strings indexed by color value
   * @throws {Error} If bitsPerCell is not in [1, 2, 4, 8]
   * @private
   *
   * @example
   * const palette = this._buildColorPalette(4); // 16 colors
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
   * Generate 2-color palette (black and white).
   *
   * Minimal palette for binary (1-bit) displays.
   * Suitable for simple occupied/unoccupied visualization.
   *
   * @returns {string[]} Array of 2 hex color strings [black, white]
   * @private
   */
  _palette2Colors () {
    return ['#000000', '#FFFFFF']
  }

  /**
   * Generate 4-color palette (primary colors: black, red, green, blue).
   *
   * Basic palette for 2-bit displays. Provides three primary color options
   * plus black (empty). Suitable for simple state distinction.
   *
   * @returns {string[]} Array of 4 hex color strings [black, red, green, blue]
   * @private
   */
  _palette4Colors () {
    return ['#000000', '#FF0000', '#00FF00', '#0000FF']
  }

  /**
   * Generate 16-color palette (extended colors including standard VGA palette).
   *
   * Extended palette for 4-bit displays. Combines primary colors, secondary
   * colors (cyan, magenta, yellow), neutral grays, and derived colors.
   * Based on standard VGA 16-color scheme.
   *
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
   * Generate 256-color palette (6x6x6 RGB cube + 40 grayscale ramp).
   *
   * Full-featured palette for 8-bit displays. Combines a 6x6x6 RGB color cube
   * (216 colors, step=51 per channel) with an extended grayscale gradient
   * (40 additional shades) for smooth monochrome representation.
   *
   * Total: 216 + 40 = 256 unique colors.
   *
   * @returns {string[]} Array of 256 hex color strings indexed by color value
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
   * Add RGB color cube colors to palette (6x6x6 = 216 colors).
   *
   * Generates colors by iterating R, G, B in steps of RGB_CUBE_STEP (51).
   * Creates a uniform color space covering most of the visible spectrum.
   * Mutates the palette array by pushing new colors.
   *
   * @param {string[]} palette - Palette array to modify (mutated in place)
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
   * Add grayscale colors to palette (40+ shades of gray).
   *
   * Generates monochrome colors from black to white in steps of GRAYSCALE_STEP (6).
   * Provides smooth gradient for grayscale representation.
   * Mutates the palette array by pushing new colors.
   *
   * @param {string[]} palette - Palette array to modify (mutated in place)
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
   * Convert RGB component values to hex color string.
   *
   * Converts numeric RGB values (0-255) to a hex color string in format #RRGGBB.
   * Each component is padded to 2 hex digits with leading zeros.
   * Values outside [0, 255] will be formatted as-is (no clamping).
   *
   * @param {number} r - Red component (0-255)
   * @param {number} g - Green component (0-255)
   * @param {number} b - Blue component (0-255)
   * @returns {string} Hex color string in format #RRGGBB
   * @private
   *
   * @example
   * this._rgbToHex(255, 128, 0); // Returns '#ff8000'
   * this._rgbToHex(0, 0, 0);     // Returns '#000000'
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
   * Get the numeric color value stored at a cell (0 to maxColor).
   *
   * Retrieves the color value from the underlying mask at the specified
   * coordinates. The value range depends on the bits per cell depth.
   *
   * @param {number} x - X coordinate (column)
   * @param {number} y - Y coordinate (row)
   * @returns {number} Color value at the cell (0 to maxColor)
   * @private
   */
  _getCellValue (x, y) {
    return this.mask.at(x, y)
  }

  /**
   * Get the hex color string for a numeric color value.
   *
   * Clamps the color value to the valid palette range and returns
   * the corresponding hex color string. Invalid values are silently
   * clamped to nearest valid color.
   *
   * @param {number} colorValue - Numeric color value to convert
   * @returns {string} Hex color string from palette
   * @private
   *
   * @example
   * const hex = this._getHexColor(5); // Returns palette[5]
   */
  _getHexColor (colorValue) {
    const clamped = Math.max(
      RectDrawColor.MIN_COLOR_VALUE,
      Math.min(colorValue, this.colorPalette.length - 1)
    )
    return this.colorPalette[clamped]
  }

  /**
   * Redraw the entire grid with color values.
   *
   * Iterates through all grid cells, retrieves their color values,
   * and renders each cell with the corresponding palette color.
   * Called when the grid state changes or when redraw is requested.
   *
   * Overrides parent RectDraw._drawGrid() to use color values
   * instead of binary set/unset states.
   *
   * @override
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
   * Set a cell to a specific color value.
   *
   * Clamps the color value to the valid range [0, maxColor] before setting.
   * Updates the mask at the specified coordinates and does NOT automatically
   * redraw. Call redraw() after multiple updates for efficiency.
   *
   * @param {number} x - X coordinate (column)
   * @param {number} y - Y coordinate (row)
   * @param {number} colorValue - Color value to set (will be clamped)
   *
   * @example
   * drawer.setColorValue(5, 5, 128);
   * drawer.redraw();
   */
  setColorValue (x, y, colorValue) {
    const clamped = Math.max(
      RectDrawColor.MIN_COLOR_VALUE,
      Math.min(colorValue, this.maxColor)
    )
    this.mask.set(x, y, clamped)
  }

  /**
   * Cycle a cell to the next color value (wraps around at maxColor).
   *
   * Increments the cell color and wraps back to 0 after reaching maxColor.
   * Useful for interactive toggling through color options. Does NOT
   * automatically redraw. Call redraw() after cycling for efficiency.
   *
   * @param {number} x - X coordinate (column)
   * @param {number} y - Y coordinate (row)
   *
   * @example
   * drawer.cycleColor(5, 5); // Advance cell to next color
   * drawer.redraw();
   */
  cycleColor (x, y) {
    const current = this._getCellValue(x, y)
    const next = (current + 1) % (this.maxColor + 1)
    this.setColorValue(x, y, next)
  }

  /**
   * Fill the entire grid with a specific color value.
   *
   * Sets every cell to the same color. The color value is clamped to
   * the valid range [0, maxColor]. Does NOT automatically redraw.
   * Call redraw() after filling.
   *
   * @param {number} colorValue - Color value to fill with (will be clamped)
   *
   * @example
   * drawer.fillWithColor(0); // Clear all cells
   * drawer.redraw();
   *
   * drawer.fillWithColor(5); // Fill with color 5
   * drawer.redraw();
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
   * Clear the entire grid to empty state (all cells to 0).
   *
   * Resets all cells to the minimum color value (0, typically black/empty).
   * Automatically calls redraw() to update the display.
   * Faster than fillWithColor(0) + redraw() for bulk clearing.
   *
   * @example
   * drawer.clear(); // Clear and redraw automatically
   */
  clear () {
    this.mask.bits = this.mask.store.empty
    this.redraw()
  }

  /**
   * Get human-readable color information for a cell.
   *
   * Returns a formatted string describing the color at the specified cell,
   * including the numeric color value, maximum color value, and hex color.
   * Useful for debugging and display purposes.
   *
   * @param {number} x - X coordinate (column)
   * @param {number} y - Y coordinate (row)
   * @returns {string} Color info in format \"Color N/M: #RRGGBB\"
   *
   * @example
   * const info = drawer.getColorInfo(5, 5);
   * console.log(info); // \"Color 128/255: #808080\"
   */
  getColorInfo (x, y) {
    const colorValue = this._getCellValue(x, y)
    const hexColor = this._getHexColor(colorValue)
    return `Color ${colorValue}/${this.maxColor}: ${hexColor}`
  }

  /**
   * Get a copy of the current color palette.
   *
   * Returns a defensive copy of the color palette array to prevent
   * accidental modification. The copy is a shallow copy (string references).
   * Palette is indexed by color value (0 = first color, etc.).
   *
   * @returns {string[]} Copy of the color palette array (hex color strings)
   *
   * @example
   * const palette = drawer.getPalette();
   * console.log(palette[5]); // Get hex color for value 5
   */
  getPalette () {
    return [...this.colorPalette]
  }

  /**
   * Get a histogram of color usage across the grid.
   *
   * Returns a Uint32Array where the index is the color value (0 to maxColor)
   * and the value is the count of cells with that color.
   * Useful for analyzing color distribution and detecting unused colors.
   *
   * Total of histogram values equals width × height (total cells).
   * Indices beyond the used color range will contain 0.
   *
   * @returns {Uint32Array} Histogram array [0..maxColor] with color counts
   *
   * @example
   * const hist = drawer.getColorHistogram();
   * console.log(hist[0]); // Number of cells with color 0
   * const totalRed = hist[1]; // Cells with primary red color
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
