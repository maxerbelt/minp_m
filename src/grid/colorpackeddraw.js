import { PackedDraw } from './packeddraw.js'

/**
 * Extends PackedDraw with custom color mapping
 * 0: blue (empty), 1: green, 2: yellow, 3: khaki
 */
export class ColorPackedDraw extends PackedDraw {
  /**
   * Convert cell value to specific color
   * @private
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
