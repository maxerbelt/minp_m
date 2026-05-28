import { PackedDraw } from './packeddraw.js'

/**
 * @typedef {0|1|2|3} CellValue
 */

/**
 * @typedef {Object.<CellValue, string>} ColorMap
 */

/**
 * ColorPackedDraw - Extends PackedDraw with custom color mapping for packed grid cells
 *
 * Maps cell values to specific colors for visual representation:
 * - 0: blue (#2196F3) - empty cell
 * - 1: green (#4caf50) - first state
 * - 2: yellow (#d1ff3b) - second state
 * - 3: khaki (#fff200) - third state
 *
 * @class ColorPackedDraw
 * @extends {PackedDraw}
 * @example
 *   const drawer = new ColorPackedDraw(canvas)
 *   drawer.draw() // Uses color mapping for cell rendering
 */
export class ColorPackedDraw extends PackedDraw {
  /**
   * Convert cell value to specific color
   * Maps numeric cell values to their hex color representation
   * @private
   * @param {CellValue} value - Cell value (0-3)
   * @returns {string} Hex color code for the value
   */
  _valueToColor (value) {
    const colorMap = {
      0: '#2196F3', // blue
      1: '#4caf50', // green
      2: '#d1ff3b',
      3: '#fff200'
    }
    return colorMap[value] || '#2196F3'
  }
}
