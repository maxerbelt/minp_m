/**
 * Abstract base class for grid shapes.
 * Provides core grid metadata (width, height, size) and delegates coordinate
 * operations to an injected indexer strategy. Cannot be instantiated directly.
 *
 * @typedef {Object} ShapeIndexer
 * @property {(x: number, y: number) => number} index - Convert x/y coordinates to a linear index.
 * @property {(index: number) => [number, number]} location - Convert a linear index to x/y coordinates.
 * @property {(x: number, y: number) => boolean} isValid - Validate whether x/y coordinates are within bounds.
 *
 * @typedef {Object} ShapeConfig
 * @property {ShapeIndexer} indexer - Indexing strategy implementation.
 * @property {number} [width] - Grid width in cells.
 * @property {number} [height] - Grid height in cells.
 * @property {number} [size] - Total cell count.
 *
 * @abstract
 * @class ShapeBase
 */
export class ShapeBase {
  /**
   * The original shape configuration object.
   * @type {ShapeConfig}
   */
  shape

  /**
   * Grid indexer implementation used for coordinate conversions.
   * @type {ShapeIndexer}
   */
  indexer

  /**
   * Grid width in cells.
   * @type {number}
   */
  width = 0

  /**
   * Grid height in cells.
   * @type {number}
   */
  height = 0

  /**
   * Total number of cells in the grid.
   * @type {number}
   */
  // `size` is intentionally not initialized here when subclasses may override
  // it with an accessor. Initialization occurs in ShapeBase constructor.
  /**
   * Helper to enforce abstract base class pattern.
   * Throws if attempting to instantiate an abstract class directly.
   *
   * @param {Function} concreteClass - The concrete class being instantiated
   * @param {Function} abstractClass - The abstract class that should not be instantiated
   * @param {string} [className] - Name of the abstract class for error message
   * @throws {Error} If concreteClass === abstractClass
   */
  static assertAbstractNotInstantiated (
    concreteClass,
    abstractClass,
    className = abstractClass.name
  ) {
    if (concreteClass === abstractClass) {
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
    ShapeBase.assertAbstractNotInstantiated(new.target, ShapeBase)

    if (!shape || typeof shape !== 'object') {
      throw new Error('Shape configuration object is required')
    }
    if (!shape.indexer) {
      throw new Error('Shape must provide an indexer for coordinate operations')
    }

    this.shape = shape
    this.indexer = shape.indexer
    this.width = shape.width || 0
    this.height = shape.height || 0
    this.size = shape.size || 0
  }

  /**
   * Converts 2D coordinates to a linear index via the indexer.
   *
   * @param {number} x - Column coordinate (0-based)
   * @param {number} y - Row coordinate (0-based)
   * @returns {number} Linear index in the grid
   * @throws {Error} If coordinates are invalid according to indexer
   */
  index (x, y) {
    return this.indexer.index(x, y)
  }

  /**
   * Column stride or maximum valid column index.
   * Default is width; subclasses may override for different stride calculations.
   * Used for determining the maximum column value in coordinate calculations.
   *
   * @type {number}
   */
  get columnStride () {
    return this.width
  }

  /**
   * Converts a linear index back to 2D coordinates via the indexer.
   *
   * @param {number} index - Linear index in the grid (0-based)
   * @returns {Array<number>} [x, y] coordinate pair
   * @throws {Error} If index is out of bounds
   */
  location (index) {
    return this.indexer.location(index)
  }

  /**
   * Validates coordinates using the indexer's validation logic.
   *
   * @param {number} x - Column coordinate to validate
   * @param {number} y - Row coordinate to validate
   * @returns {boolean} True if coordinates are valid for this shape
   */
  isValid (x, y) {
    return this.indexer.isValid(x, y)
  }

  /**
   * Generator yielding all valid cell coordinates and their indices.
   * Iterates through all cells in the grid in index order.
   * Format: [x, y, index] for each cell.
   *
   * @generator
   * @yields {Array<number>} [x, y, index] tuples for each valid cell
   *
   * @example
   * for (const [x, y, i] of grid.keys()) {
   *   console.log(`Cell at (${x}, ${y}) has index ${i}`);
   * }
   */
  *keys () {
    const totalCells = this.size
    for (let i = 0; i < totalCells; i++) {
      const coordinates = this.location(i)
      yield [...coordinates, i]
    }
  }
}
