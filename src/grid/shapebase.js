/**
 * Abstract base class for grid shapes.
 * Provides core grid metadata (width, height, size) and delegates coordinate
 * operations to an injected indexer strategy. Cannot be instantiated directly.
 *
 * @abstract
 * @class ShapeBase
 */
export class ShapeBase {
  /**
   * Helper to enforce abstract base class pattern.
   * Throws if attempting to instantiate an abstract class directly.
   *
   * @private
   * @param {Function} abstractClass - The class that should not be instantiated
   * @param {string} [className] - Name of the abstract class for error message
   * @throws {Error} If new.target === abstractClass
   */
  static #assertAbstractNotInstantiated (
    abstractClass,
    className = abstractClass.name
  ) {
    if (new.target === abstractClass) {
      throw new Error(
        `${className} is abstract and cannot be instantiated directly. Please extend it.`
      )
    }
  }

  /**
   * Initializes grid metadata from a shape object.
   * The shape object must provide an indexer for coordinate operations.
   *
   * @param {Object} shape - Shape configuration object
   * @param {Object} shape.indexer - Indexing strategy (implements index/location)
   * @param {number} [shape.width=0] - Grid width in cells
   * @param {number} [shape.height=0] - Grid height in cells
   * @param {number} [shape.size=0] - Total cell count
   * @throws {Error} If instantiated as ShapeBase directly
   */
  constructor (shape) {
    ShapeBase.#assertAbstractNotInstantiated(ShapeBase)

    this.shape = shape
    this.indexer = shape.indexer
    this.width = shape.width || 0
    this.height = shape.height || 0
    this.size = shape.size || 0
  }

  /**
   * Converts 2D coordinates to a linear index via the indexer.
   *
   * @param {number} x - Column coordinate
   * @param {number} y - Row coordinate
   * @returns {number} Linear index in the grid
   */
  index (x, y) {
    return this.indexer.index(x, y)
  }

  /**
   * Maximum valid row index or width-related dimension.
   * Default is width; subclasses may override for different stride calculations.
   *
   * @type {number}
   */
  get rowMax () {
    return this.width
  }

  /**
   * Converts a linear index back to 2D coordinates via the indexer.
   *
   * @param {number} index - Linear index in the grid
   * @returns {Array<number>} [x, y] coordinate pair
   */
  location (index) {
    return this.indexer.location(index)
  }

  /**
   * Validates coordinates using the indexer's validation logic.
   *
   * @param {...*} args - Arguments to pass to indexer.isValid
   * @returns {boolean} True if coordinates are valid
   */
  isValid (...args) {
    return this.indexer.isValid(...args)
  }

  /**
   * Generator yielding all cell coordinates and indices.
   * Format: [x, y, index] for each cell in size order.
   *
   * @generator
   * @yields {Array} [x, y, index] tuples
   *
   * @example
   * for (const [x, y, i] of grid.keys()) {
   *   console.log(`Cell at (${x}, ${y}) has index ${i}`);
   * }
   */
  *keys () {
    const n = this.size
    for (let i = 0; i < n; i++) {
      const lc = this.location(i)
      yield [...lc, i]
    }
  }
}
