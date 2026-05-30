/**
 * Callback Function Signatures
 * 
 * Type definitions for callback functions used in grid operations:
 * coordinate validation, indexing, iteration, predicates, etc.
 * 
 * Enables type-safe higher-order functions and algorithm implementations.
 */

import type { Coordinate } from './geometry.types'

/**
 * Validates and optionally adjusts coordinates.
 * 
 * Returns validated [x, y] pair or null if validation fails.
 * Used for boundary checking (clamp, wrap, reflect, etc).
 * 
 * @param x - X coordinate to validate (may be out of bounds)
 * @param y - Y coordinate to validate (may be out of bounds)
 * @returns Validated [x, y] coordinate pair, or null if validation fails
 * 
 * @example
 * // Clamping validator
 * const clamp: CoordinateValidator = (x, y) => {
 *   return [Math.max(0, Math.min(x, width-1)), Math.max(0, Math.min(y, height-1))];
 * };
 * 
 * // Wrapping validator
 * const wrap: CoordinateValidator = (x, y) => {
 *   return [((x % width) + width) % width, ((y % height) + height) % height];
 * };
 */
export type CoordinateValidator = (
  x: number,
  y: number
) => Coordinate | null;

/**
 * Converts coordinates to grid index (1D array position).
 * 
 * Maps 2D coordinates to a 1D grid index in row-major, column-major,
 * or other ordering. The step parameter provides context about traversal progression.
 * 
 * @param x - X coordinate in the grid (0-based column)
 * @param y - Y coordinate in the grid (0-based row)
 * @param step - Step number in traversal sequence (1-based, 0 for initial)
 * @returns 1D grid index corresponding to (x, y)
 * 
 * @example
 * // Row-major indexer (standard)
 * const rowMajor: CoordinateIndexer = (x, y, _step) => y * width + x;
 * 
 * // Column-major indexer
 * const colMajor: CoordinateIndexer = (x, y, _step) => x * height + y;
 */
export type CoordinateIndexer = (
  x: number,
  y: number,
  step: number
) => number;

/**
 * Determines when to stop iterating along a line or ray.
 * 
 * Exit conditions control traversal termination for rays, rays with distance limits,
 * and boundary-aware line segments.
 * 
 * @param x - Current X coordinate during traversal
 * @param y - Current Y coordinate during traversal
 * @param step - Current step count in traversal sequence (1-based)
 * @returns True to terminate traversal; false to continue
 * 
 * @example
 * // Stop at boundary
 * const atBoundary: ExitCondition = (x, y, _step) => x < 0 || x >= width || y < 0 || y >= height;
 * 
 * // Stop after distance
 * const distance5: ExitCondition = (_x, _y, step) => step > 5;
 */
export type ExitCondition = (
  x: number,
  y: number,
  step: number
) => boolean;

/**
 * Generator function for handling corner crossings during diagonal moves.
 * 
 * Called when both X and Y axes advance simultaneously (diagonal step).
 * Yields extra cell indices for super-cover and half-cover algorithms.
 * 
 * @yields Grid indices for cells covered by corner crossing
 * 
 * @example
 * function* handleCorner() {
 *   yield cellAbove;
 *   yield cellLeft;
 * }
 */
export type CornerHandler = () => Generator<number, void, unknown>;

/**
 * Iterates over grid cells, applying a callback to each.
 * 
 * Called for each cell in a grid iteration with cell data and position.
 * Used by grid traversal methods to apply operations to cells.
 * 
 * @param cell - Cell data at current position
 * @param rowIndex - Current row index (0-based)
 * @param colIndex - Current column index (0-based)
 * 
 * @example
 * const sum: CellIteratorCallback = (cell, _row, _col) => {
 *   total += cell.value;
 * };
 */
export type CellIteratorCallback<T> = (
  cell: T,
  rowIndex: number,
  colIndex: number
) => void;

/**
 * Predicate function for filtering cells.
 * 
 * Tests whether a cell matches some criteria.
 * Used by find, filter, and search operations on grids.
 * 
 * @param cell - Cell to test
 * @returns True if cell matches criteria; false otherwise
 * 
 * @example
 * const isOccupied: CellPredicateCallback = (cell) => cell !== null;
 * const hasAmmo: CellPredicateCallback = (cell) => cell?.ammo > 0;
 */
export type CellPredicateCallback<T> = (cell: T) => boolean;

/**
 * Transforms a coordinate pair into another coordinate pair.
 * 
 * Used for rotations, flips, and other coordinate transformations.
 * 
 * @param x - Source X coordinate
 * @param y - Source Y coordinate
 * @returns Transformed [x, y] coordinate pair
 */
export type CoordinateTransform = (
  x: number,
  y: number
) => Coordinate;

/**
 * Maps indices between coordinate systems or transformation spaces.
 * 
 * Returns the target index corresponding to source index under a transformation.
 * Used by transform maps to apply symmetry operations.
 * 
 * @param sourceIndex - Source linear index
 * @returns Transformed linear index
 */
export type IndexTransformer = (sourceIndex: number) => number;

/**
 * Calculates transformed index using transformation data.
 * 
 * Generic transform function that uses auxiliary data (e.g., transform maps)
 * to compute transformed indices.
 * 
 * @param index - Source index
 * @param transformData - Transformation-specific auxiliary data
 * @returns Transformed index
 */
export type TransformWithData = (
  index: number,
  transformData: any
) => number;
