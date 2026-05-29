/**
 * @module grid/shapebase
 * @description Abstract base class for grid shapes providing coordinate indexing and traversal.
 * Encapsulates grid metadata (width, height, total size) and delegates all coordinate
 * conversion operations to an injected indexer strategy via dependency injection.
 * Cannot be instantiated directly; subclasses must extend this abstract base.
 */

/**
 * @typedef {Object} ShapeIndexer
 * @description Strategy interface for converting between 2D coordinates and linear indices.
 * Implementations handle different grid topologies (rectangular, hexagonal, triangular, etc.).
 * @property {(x: number, y: number) => number} index - Convert 2D coordinates [x, y] to a linear index.
 * Must throw if coordinates are invalid.
 * @property {(index: number) => [number, number]} location - Convert a linear index to [x, y] coordinates.
 * Must return [x, y] pair where x is column and y is row. Throws if index is out of bounds.
 * @property {(x: number, y: number) => boolean} isValid - Validate whether coordinates [x, y] exist in this shape.
 * Returns true if x and y are within valid ranges, false otherwise. Never throws.
 */

/**
 * @typedef {Object} ShapeConfig
 * @description Configuration object for shape initialization.
 * Provides grid dimensions and the coordinate indexing strategy to use.
 * @property {ShapeIndexer} indexer - Required indexing strategy for coordinate operations.
 * @property {number} [width=0] - Grid width in cells (columns). Optional; defaults to 0.
 * @property {number} [height=0] - Grid height in cells (rows). Optional; defaults to 0.
 * @property {number} [size=0] - Total cell count in the grid. Optional; defaults to 0.
 */

/**
 * Abstract base class for grid shapes.
 * Provides core grid metadata (width, height, size) and delegates coordinate
 * operations to an injected indexer strategy. Cannot be instantiated directly.
 *
 * @abstract
 * @class ShapeBase
 * @throws {Error} If instantiated as ShapeBase directly (abstract enforcement)
 * @throws {Error} If shape configuration is missing or indexer is not provided
 */
export class ShapeBase {
  /**
   * The original shape configuration object used to initialize this instance.
   * Retained for introspection and potential reconfiguration.
   * @type {ShapeConfig}
   */
  shape

  /**
   * Grid indexer implementation used for coordinate conversions.
   * Handles conversion between 2D (x, y) and linear indices for this grid topology.
   * @type {ShapeIndexer}
   */
  indexer

  /**
   * Grid width in cells (number of columns).
   * Defines the x-axis range: valid x values are [0, width).
   * @type {number}
   */
  width = 0

  /**
   * Grid height in cells (number of rows).
   * Defines the y-axis range: valid y values are [0, height).
   * @type {number}
   */
  height = 0

  /**
   * Total number of cells in the grid.
   * Equal to width × height for rectangular grids, but may vary for other topologies.
   * Linear indices range from [0, size).
   * @type {number}
   */
  size
  /**
   * Helper to enforce abstract base class pattern.
   * Throws if attempting to instantiate an abstract class directly.
   * Subclasses call this in their constructors to prevent direct instantiation of the abstract class.
   *
   * @static
   * @param {Function} concreteClass - The concrete class being instantiated via new.target.
   * @param {Function} abstractClass - The abstract class that should not be instantiated directly.
   * @param {string} [className] - Human-readable name of the abstract class for error message.
   * Defaults to abstractClass.name if not provided.
   * @returns {void} Does not return a value; throws on violation.
   * @throws {Error} If concreteClass === abstractClass, preventing direct instantiation.
   *
   * @example
   * export class HexShape extends ShapeBase {
   *   constructor(shape) {
   *     ShapeBase.assertAbstractNotInstantiated(new.target, ShapeBase);
   *     super(shape);
   *   }
   * }
   *
   * // Throws error:
   * // new ShapeBase(...) // Error: ShapeBase is abstract and cannot be instantiated directly
   *
   * // Works fine:
   * new HexShape(...) // OK
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
   * Initializes grid metadata and coordinates indexer from a shape configuration object.
   * This constructor enforces the abstract base class pattern; subclasses must call
   * assertAbstractNotInstantiated before calling super().
   *
   * The shape configuration must provide an indexer implementation for coordinate conversions.
   * Grid dimensions (width, height, size) are extracted from the config object.
   *
   * @constructor
   * @param {ShapeConfig} shape - Shape configuration object
   * @param {ShapeIndexer} shape.indexer - Required. Indexing strategy for coordinate operations.
   * @param {number} [shape.width=0] - Grid width in cells. Defaults to 0 if not provided.
   * @param {number} [shape.height=0] - Grid height in cells. Defaults to 0 if not provided.
   * @param {number} [shape.size=0] - Total cell count. Defaults to 0 if not provided.
   * @throws {Error} If shape is null/undefined or not an object
   * @throws {Error} If shape.indexer is not provided
   * @throws {Error} If called on ShapeBase directly (abstract class enforcement)
   *
   * @example
   * // Correct usage: create subclass
   * class RectShape extends ShapeBase {
   *   constructor(config) {
   *     ShapeBase.assertAbstractNotInstantiated(new.target, ShapeBase);
   *     super(config);
   *   }
   * }
   *
   * const indexer = {
   *   index: (x, y) => y * 10 + x,
   *   location: (i) => [i % 10, Math.floor(i / 10)],
   *   isValid: (x, y) => x >= 0 && x < 10 && y >= 0 && y < 10
   * };
   *
   * const shape = new RectShape({
   *   indexer,
   *   width: 10,
   *   height: 10,
   *   size: 100
   * });
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
   * Converts 2D grid coordinates to a linear index via the indexer.
   * Delegates coordinate conversion to the indexer strategy to support arbitrary grid topologies.
   *
   * @param {number} x - Column coordinate (0-based). Valid range depends on grid width.
   * @param {number} y - Row coordinate (0-based). Valid range depends on grid height.
   * @returns {number} Linear index corresponding to the (x, y) coordinate.
   * Index range is [0, size). Exact mapping depends on indexer implementation.
   * @throws {Error} If coordinates are invalid according to the indexer's rules
   *
   * @example
   * // For a 10x10 rectangular grid with row-major indexing
   * const i = shape.index(3, 5);
   * // Returns 5 * 10 + 3 = 53
   */
  index (x, y) {
    return this.indexer.index(x, y)
  }

  /**
   * Column stride or maximum valid column index.
   * Represents the width of a grid row in cells, used for determining row boundaries
   * and column offset calculations in coordinate transformations.
   *
   * Default implementation returns this.width; subclasses may override for different
   * stride calculations based on specific grid topologies (e.g., offset hex grids may
   * have different strides on alternating rows).
   *
   * @type {number}
   * @readonly
   * @default {number} this.width
   *
   * @example
   * // Typical rectangular grid
   * const stride = shape.columnStride; // equals shape.width
   *
   * @example
   * // Hexagonal grid with offset rows (subclass override example)
   * class HexShape extends ShapeBase {
   *   get columnStride() {
   *     // Some hex topologies have varying strides per row
   *     return this.width;
   *   }
   * }
   */
  get columnStride () {
    return this.width
  }

  /**
   * Converts a linear index back to 2D grid coordinates via the indexer.
   * Inverse operation of the index() method for coordinate conversion.
   * Delegates to the indexer strategy to support arbitrary grid topologies.
   *
   * @param {number} index - Linear index in the grid (0-based, range [0, size)).
   * @returns {Array<number>} [x, y] coordinate pair where x is column and y is row.
   * Both values are 0-based.
   * @throws {Error} If index is out of bounds or invalid according to the indexer
   *
   * @example
   * // For a 10x10 rectangular grid with row-major indexing
   * const [x, y] = shape.location(53);
   * // Returns [3, 5]
   *
   * @example
   * // Verify round-trip conversion
   * const i = shape.index(3, 5);
   * const [x, y] = shape.location(i);
   * console.assert(x === 3 && y === 5);
   */
  location (index) {
    return this.indexer.location(index)
  }

  /**
   * Validates whether 2D coordinates are within the valid grid range.
   * Uses the indexer's validation logic to support different grid topologies.
   * This method never throws; it always returns a boolean result.
   *
   * @param {number} x - Column coordinate to validate (0-based)
   * @param {number} y - Row coordinate to validate (0-based)
   * @returns {boolean} True if coordinates (x, y) are valid and exist in this grid;
   * false if either coordinate is out of bounds or invalid for this topology.
   *
   * @example
   * // For a 10x10 rectangular grid
   * shape.isValid(0, 0);   // true (top-left)
   * shape.isValid(9, 9);   // true (bottom-right)
   * shape.isValid(10, 5);  // false (x out of bounds)
   * shape.isValid(5, -1);  // false (y out of bounds)
   * shape.isValid(5, 5);   // true (middle cell)
   */
  isValid (x, y) {
    return this.indexer.isValid(x, y)
  }

  /**
   * Generator yielding all valid cell coordinates and their linear indices.
   * Iterates through all cells in the grid from index 0 to size-1.
   * Cells are yielded in linear index order; coordinate order depends on the indexer.
   *
   * Yields tuples of [x, y, index] for each valid cell in the grid.
   * The (x, y) coordinates are derived from the linear index using the indexer.
   *
   * @generator
   * @yields {Array<number>} [x, y, index] tuple for each cell:
   *   - x: column coordinate (0-based)
   *   - y: row coordinate (0-based)
   *   - index: linear index (0 to size-1)
   * @returns {Generator<Array<number>, void, undefined>} Generator that yields [x, y, index] tuples
   *
   * @example
   * // Iterate over all cells in a 3x3 grid
   * const shape = new MyShape({ indexer, width: 3, height: 3, size: 9 });
   * for (const [x, y, i] of shape.keys()) {
   *   console.log(`Cell at (${x}, ${y}) has index ${i}`);
   * }
   * // Output:
   * // Cell at (0, 0) has index 0
   * // Cell at (1, 0) has index 1
   * // Cell at (2, 0) has index 2
   * // Cell at (0, 1) has index 3
   * // ... etc
   *
   * @example
   * // Count total cells
   * let count = 0;
   * for (const [_x, _y, _i] of shape.keys()) {
   *   count++;
   * }
   * console.assert(count === shape.size);
   */
  *keys () {
    const totalCells = this.size
    for (let i = 0; i < totalCells; i++) {
      const coordinates = this.location(i)
      yield [...coordinates, i]
    }
  }
}
