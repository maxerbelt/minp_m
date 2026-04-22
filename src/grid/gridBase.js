import { CanvasGrid } from './canvasGrid.js'

/**
 * Abstract base class for readable grids.
 * Provides iterator methods for traversing grid contents: entries(), values().
 * Subclasses must implement the abstract `at()` method for cell access.
 * Cannot be instantiated directly.
 *
 * @abstract
 * @extends CanvasGrid
 * @class GridBase
 */
export class GridBase extends CanvasGrid {
  /**
   * Helper to enforce abstract base class pattern.
   * @param {Function} abstractClass - The class that should not be instantiated
   * @param {string} [className] - Name for error message
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
   * Initializes grid base.
   * Enforces abstract class constraint.
   *
   * @param {Object} shape - Shape configuration object (see ShapeBase)
   * @throws {Error} If instantiated as GridBase directly
   */
  constructor (shape) {
    super(shape)
    GridBase.#assertAbstractNotInstantiated(GridBase)
  }

  /**
   * Abstract method for retrieving a cell value at coordinates.
   * Must be implemented by derived classes.
   *
   * @abstract
   * @param {number} _x - Column coordinate
   * @param {number} _y - Row coordinate
   * @returns {*} The cell value (type depends on grid implementation)
   * @throws {Error} If not implemented in derived class
   */
  at (_x, _y) {
    throw new Error('at method in derived class must be implemented')
  }

  /**
   * Generator yielding [x, y, value, index, grid] tuples for all cells.
   * Includes full context for each cell traversal.
   *
   * @generator
   * @yields {Array} [x, y, cellValue, linearIndex, gridReference]
   *
   * @example
   * for (const [x, y, value, idx, grid] of grid.entries()) {
   *   if (value > 0) console.log(`Set cell at (${x}, ${y})`);
   * }
   */
  *entries () {
    for (const [x, y, i] of this.keys()) {
      yield [x, y, this.at(x, y), i, this]
    }
  }

  /**
   * Generator yielding cell values for all cells.
   * Minimal output; use entries() for coordinate context.
   *
   * @generator
   * @yields {*} Cell value at each position
   *
   * @example
   * for (const value of grid.values()) {
   *   sum += value;
   * }
   */
  *values () {
    for (const [x, y] of this.keys()) {
      yield this.at(x, y)
    }
  }
}
