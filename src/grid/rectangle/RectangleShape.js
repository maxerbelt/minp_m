import { RectIndex } from './RectIndex.js'

/**
 * @typedef {Object} RectangleShapeConfig
 * @property {string} type - Immutable shape type identifier ('rectangle')
 * @property {number} width - Rectangle width in cells (positive integer)
 * @property {number} height - Rectangle height in cells (positive integer)
 * @property {number} size - Total cell count (width × height)
 * @property {RectIndex} indexer - Lazy-loaded indexer for coordinate-to-index conversion
 */

/**
 * Factory function that creates a rectangular grid shape configuration.
 *
 * Creates an immutable-like shape object defining a rectangular grid with fixed dimensions.
 * The indexer is lazily instantiated on first access for performance efficiency.
 *
 * **Usage Pattern:**
 * ```javascript
 * const rect = RectangleShape(8, 10);
 * // rect.width  === 8
 * // rect.height === 10
 * // rect.size   === 80
 * // rect.indexer converts (x, y) -> linear index
 * ```
 *
 * @param {number} width - Width of the rectangular grid in cells (must be positive)
 * @param {number} height - Height of the rectangular grid in cells (must be positive)
 * @returns {RectangleShapeConfig} Immutable rectangular shape configuration object
 * @throws Will create an indexer with invalid dimensions if width or height are not positive integers
 *
 * @example
 * // Standard 8×8 game board
 * const gameBoard = RectangleShape(8, 8);
 * console.log(gameBoard.size); // 64
 *
 * // Rectangular grid
 * const wideBoard = RectangleShape(16, 8);
 * const indexer = wideBoard.indexer; // RectIndex instance
 */
export const RectangleShape = (width, height) => ({
  /** @type {string} Immutable shape type identifier for rectangular grids */
  type: 'rectangle',
  /** @type {number} Grid width in cells (readonly via closure) */
  width,
  /** @type {number} Grid height in cells (readonly via closure) */
  height,
  /** @type {number} Total cell count: width × height (readonly via closure) */
  size: width * height,
  /**
   * Lazy-initialized rectangle indexer for coordinate transformation.
   * Creates a new RectIndex instance on first access using the shape's width and height.
   * Subsequent accesses create new instances (not cached).
   *
   * @type {RectIndex}
   */
  get indexer () {
    return new RectIndex(this.width, this.height)
  }
})
