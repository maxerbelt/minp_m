import { bh } from '../../terrains/all/js/bh.js'
import { RectangleShape } from './RectangleShape.js'
import { ListCanvas } from '../listCanvas.js'

/**
 * @typedef {Object} BattleMap
 * @property {number} cols - Map width in cells
 * @property {number} rows - Map height in cells
 * @property {*} [extraProps] - Additional map properties (e.g., terrain, obstacles)
 */

/**
 * @typedef {Array<number>} CoordinateTuple
 * - Index 0: x coordinate (column)
 * - Index 1: y coordinate (row)
 * - Index 2: (optional) color value or cell data
 */

/**
 * Rectangle-specific list canvas implementation.
 *
 * Extends ListCanvas with rectangle shape configuration and provides factory methods
 * for creating canvases from battle maps. This class specializes in coordinate-based
 * rendering within rectangular grid boundaries.
 *
 * **Key Features:**
 * - Rectangular grid bounded by width and height
 * - Coordinate list storage: [x, y] or [x, y, color]
 * - Factory method for creating from battle maps
 * - Inherits drawing operations from ListCanvas (rays, segments, pies, etc.)
 *
 * **Usage Pattern:**
 * ```javascript
 * // Direct instantiation
 * const canvas = new RectListCanvas(10, 10, []);
 * canvas.set(5, 5, 3); // Set color value
 *
 * // From battle map
 * const mapCanvas = RectListCanvas.BhMapList(battleMap);
 * ```
 */
export class RectListCanvas extends ListCanvas {
  /**
   * Create a rectangle list canvas with fixed dimensions.
   *
   * Initializes a rectangular grid canvas with a coordinate list. The grid
   * dimensions are immutable after creation and define the valid coordinate range.
   * Coordinates outside the rectangle are considered invalid by inherited isValid() method.
   *
   * @param {number} width - Rectangle width in cells (positive integer, defines valid x range [0, width))
   * @param {number} height - Rectangle height in cells (positive integer, defines valid y range [0, height))
   * @param {Array<CoordinateTuple>} [list] - Initial list of [x, y, color] coordinates (defaults to empty array)
   *
   * @throws Will not validate dimensions here; RectIndex instantiation will fail for non-positive values
   *
   * @example
   * // 8×8 grid (typical chess/game board)
   * const canvas = new RectListCanvas(8, 8, []);
   * canvas.set(4, 4, 1); // Set cell (4,4) to color 1
   *
   * // Populate with initial coordinates
   * const initialized = new RectListCanvas(16, 16, [[0, 0, 5], [1, 1, 3]]);
   */
  constructor (width, height, list) {
    super(RectangleShape(width, height), list || [])
  }

  /**
   * Create a rectangle list canvas from a battle map.
   *
   * Factory method that creates a RectListCanvas with dimensions matching a battle map object.
   * Useful for initializing rendering canvases from game map definitions. Falls back to
   * the global battle map (bh.map) if no explicit map parameter is provided.
   *
   * **Intended Use:**
   * - Initialize visibility/render canvas from game map
   * - Create temporary draw buffers matching active map dimensions
   * - Support rendering operations on map-sized grids
   *
   * **Error Handling:**
   * - Throws if both parameters and bh.map are unavailable (no map source)
   * - Throws if provided map lacks cols/rows properties
   *
   * @param {BattleMap} [map] - Battle map with cols and rows properties.
   *                             If not provided, attempts to use bh.map (global battle map).
   *                             Must have numeric cols and rows properties.
   *
   * @returns {RectListCanvas} New canvas instance with dimensions matching map.cols × map.rows
   *
   * @throws {Error} 'No map available for BhMapList' - when no map parameter provided and bh.map unavailable
   *
   * @example
   * // Using global battle map
   * const canvas = RectListCanvas.BhMapList();
   * // canvas.shape.width === bh.map.cols
   * // canvas.shape.height === bh.map.rows
   *
   * // Using explicit map
   * const customMap = { cols: 12, rows: 10, terrain: [] };
   * const customCanvas = RectListCanvas.BhMapList(customMap);
   * // customCanvas.shape.width === 12
   * // customCanvas.shape.height === 10
   */
  static BhMapList (map) {
    const targetMap = map || bh.map
    if (!targetMap) {
      throw new Error('No map available for BhMapList')
    }
    return new RectListCanvas(targetMap.cols, targetMap.rows, [])
  }
}
