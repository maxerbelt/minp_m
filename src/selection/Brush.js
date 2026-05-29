/**
 * @typedef {Object} BrushObject
 * @property {number} size - The size of the brush
 * @property {*} subterrain - The subterrain associated with the brush
 */

/**
 * Represents a brush for terrain selection and manipulation.
 * A brush combines a size parameter with a subterrain type for use in terrain operations.
 *
 * @class Brush
 */
export class Brush {
  /**
   * Creates a new Brush instance.
   *
   * @param {number} size - The size of the brush (e.g., radius or area measurement)
   * @param {*} subterrain - The subterrain type or configuration associated with this brush
   */
  constructor (size, subterrain) {
    /**
     * The size of the brush.
     *
     * @type {number}
     */
    this.size = size

    /**
     * The subterrain associated with the brush.
     *
     * @type {*}
     */
    this.subterrain = subterrain
  }

  /**
   * Converts the brush to a plain object representation.
   *
   * @returns {BrushObject} A plain object containing the brush's size and subterrain
   */
  toObject () {
    return { size: this.size, subterrain: this.subterrain }
  }
}
