import { bh } from '../../terrains/all/js/bh.js'
import { RectangleShape } from './RectangleShape.js'
import { ListCanvas } from '../listCanvas.js'

/**
 * Rectangle-specific list canvas implementation.
 * Extends ListCanvas with rectangle shape configuration and provides factory methods for common use cases.
 */
export class RectListCanvas extends ListCanvas {
  /**
   * Create a rectangle list canvas.
   * @param {number} width - Rectangle width
   * @param {number} height - Rectangle height
   * @param {Array<Array<number>>} list - List of [x, y, color] coordinates
   */
  constructor (width, height, list) {
    super(RectangleShape(width, height), list || [])
  }

  /**
   * Create a rectangle list canvas from a battle map.
   * @param {Object} map - Battle map object with cols and rows
   * @returns {RectListCanvas} New canvas instance
   */
  static BhMapList (map) {
    return new RectListCanvas(map.cols, map.rows, [])
  }
}
