import { PackedHexDraw } from './packedHexDraw.js'

/**
 * Extends PackedHexDraw with custom color mapping
 * 0: blue (empty), 1: green, 2: yellow, 3: khaki
 */
export class ColorPackedHexDraw extends PackedHexDraw {
  /**
   * Convert cell value to specific color
   * @private
   */
  _valueToColor (value) {
    const colorMap = {
      0: '#2196F3', // blue
      1: '#4caf50', // green
      2: '#FFEB3B', // yellow
      3: '#F0E68C' // khaki
    }
    return colorMap[value] || '#2196F3'
  }
}
