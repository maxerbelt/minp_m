import { CanvasGrid } from './canvasGrid.js'

/**
 * Grid entry tuple containing cell coordinates, value, and context.
 * @typedef {[number, number, *, number, GridBase]} GridEntry
 * @property {number} 0 - Column coordinate (x)
 * @property {number} 1 - Row coordinate (y)
 * @property {*} 2 - Cell value at this position
 * @property {number} 3 - Linear index in row-major order
 * @property {GridBase} 4 - Reference to the grid itself
 */

/**
 * Grid coordinates pair.
 * @typedef {[number, number]} GridCoordinates
 * @property {number} 0 - Column coordinate (x)
 * @property {number} 1 - Row coordinate (y)
 */

/**
 * Abstract base class for readable grids.
 *
 * Provides iterator methods for traversing grid contents: entries() and values().
 * Implements the iterable protocol to allow grids to be used in for...of loops.
 * Subclasses must implement the abstract `at()` method for cell access.
 *
 * Serves as the foundation for grid implementations by providing common traversal
 * semantics across different coordinate systems (rectangular, hexagonal, triangular).
 * Derived classes handle storage, coordinate mapping, and shape-specific logic.
 *
 * Cannot be instantiated directly - must be extended by concrete subclasses.
 *
 * @abstract
 * @class GridBase
 * @extends CanvasGrid
 *
 * @example
 * // Concrete subclass implementation
 * class MyGrid extends GridBase {
 *   at(x, y) {
 *     return this.getValue(x, y);
 *   }
 * }
 *
 * @example
 * // Using the grid in iteration
 * for (const [x, y, value] of grid.entries()) {
 *   if (value > 0) {
 *     processCell(x, y, value);
 *   }
 * }
 */

/**
 * Shape configuration object for grid initialization.
 * @typedef {Object} ShapeConfig
 * @property {number} width - Grid width in cells
 * @property {number} height - Grid height in cells
 */
export class GridBase extends CanvasGrid {
  /**
   * Static helper to enforce abstract base class pattern.
   *
   * Checks if the constructor was called on the abstract class itself (rather than
   * a subclass) and throws an error to prevent direct instantiation. Uses the new.target
   * intrinsic to determine the actual class being instantiated.
   *
   * This is a private static method used internally during construction.
   *
   * @private
   * @static
   * @access private
   * @param {Function} abstractClass - The abstract class that should not be instantiated
   * @param {string} [className] - Name to use in error message (defaults to abstractClass.name)
   * @throws {Error} If new.target === abstractClass, indicating direct instantiation attempt
   *
   * @example
   * // Called automatically in constructor - not meant for external use
   * GridBase.#assertAbstractNotInstantiated(GridBase);
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
   * Initializes grid base infrastructure.
   *
   * Calls parent constructor to set up canvas grid functionality, then enforces
   * the abstract base class constraint by preventing direct instantiation.
   * Must be called by subclass constructors via super().
   *
   * The abstract check occurs after parent initialization, ensuring all parent
   * setup is complete before validating instantiation rules.
   *
   * @constructor
   * @protected
   * @param {ShapeConfig} shape - Shape configuration object defining grid dimensions
   *                               (width, height, and any shape-specific parameters)
   * @throws {Error} If instantiated as GridBase directly (abstract check)
   * @throws {Error} If shape parameter is invalid or missing
   *
   * @example
   * // In a concrete subclass
   * class RectGrid extends GridBase {
   *   constructor(width, height) {
   *     super({ width, height });
   *   }
   * }
   */
  constructor (shape) {
    super(shape)
    GridBase.#assertAbstractNotInstantiated(GridBase)
  }

  /**
   * Abstract method for retrieving a cell value at given coordinates.
   *
   * Must be implemented by derived classes. Returns the value stored at the specified
   * grid coordinates. The actual return type and value semantics depend on the concrete
   * grid implementation (could be colors, states, boolean flags, etc.).
   *
   * This method is called by the iterator methods (entries(), values()) and by any
   * external code accessing grid contents. Performance-critical code may call this
   * frequently, so implementations should be optimized.
   *
   * @abstract
   * @method at
   * @param {number} _x - Column coordinate (0-based, left to right)
   * @param {number} _y - Row coordinate (0-based, top to bottom)
   * @returns {*} The cell value at (x, y) - type depends on grid implementation
   * @throws {Error} If not overridden in derived class (default implementation throws)
   *
   * @example
   * // Concrete implementation in subclass
   * at(x, y) {
   *   return this.store.getValue(x, y);
   * }
   */
  at (_x, _y) {
    throw new Error('at method in derived class must be implemented')
  }

  /**
   * Generator yielding [x, y, value, index, grid] tuples for all cells.
   *
   * Provides complete context for each cell during traversal, making it the preferred
   * method when coordinate information or grid reference is needed. Yields entries
   * in row-major order (left-to-right, top-to-bottom).
   *
   * The generator delegates to this.keys() for coordinate generation and this.at(x, y)
   * for value retrieval. Performance depends on these implementations.
   *
   * @generator
   * @yields {GridEntry} [x, y, cellValue, linearIndex, gridReference]
   * @returns {Generator<GridEntry, void, void>} Generator of grid entries
   *
   * @example
   * // Iterate with coordinates and values
   * for (const [x, y, value, idx, grid] of grid.entries()) {
   *   if (value > 0) {
   *     console.log(`Set cell at (${x}, ${y}): ${value}`);
   *   }
   * }
   *
   * @example
   * // Convert to array for analysis
   * const allEntries = [...grid.entries()];
   * const filledCells = allEntries.filter(([, , value]) => value !== 0);
   */
  *entries () {
    for (const [x, y, i] of this.keys()) {
      yield [x, y, this.at(x, y), i, this]
    }
  }

  /**
   * Generator yielding cell values for all cells.
   *
   * Provides minimal output - only the cell values themselves. Use entries() when
   * you need coordinate information or the grid reference. Yields values in
   * row-major order (left-to-right, top-to-bottom).
   *
   * The generator delegates to this.keys() for coordinate enumeration and this.at(x, y)
   * for value retrieval. Useful for aggregate operations like summing or finding min/max.
   *
   * @generator
   * @yields {*} Cell value at each position in row-major order
   * @returns {Generator<*, void, void>} Generator of cell values
   *
   * @example
   * // Sum all cell values
   * for (const value of grid.values()) {
   *   sum += value;
   * }
   *
   * @example
   * // Create array of non-zero values
   * const nonZero = [...grid.values()].filter(v => v !== 0);
   */
  *values () {
    for (const [x, y] of this.keys()) {
      yield this.at(x, y)
    }
  }
}
