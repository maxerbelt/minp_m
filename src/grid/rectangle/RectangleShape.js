import { RectIndex } from './RectIndex.js'

/**
 * Factory function for rectangle shape configurations.
 * Creates shape objects that define rectangular grid dimensions and provide access to indexers.
 * @param {number} width - Width of the rectangle
 * @param {number} height - Height of the rectangle
 * @returns {Object} Shape configuration object
 */
export const RectangleShape = (width, height) => ({
  /** @type {string} Shape type identifier */
  type: 'rectangle',
  /** @type {number} Rectangle width */
  width,
  /** @type {number} Rectangle height */
  height,
  /** @type {RectIndex} Lazy-loaded rectangle indexer instance */
  get indexer () {
    return new RectIndex(this.width, this.height)
  }
})
