/**
 * @fileoverview Coordinate and spatial types for grid operations.
 *
 * Provides type definitions for representing positions and areas in grid space,
 * supporting both simple 2D coordinates and augmented coordinate tuples with values.
 */

/**
 * A 2D coordinate pair [x, y].
 * Represents a position in grid space where x is column and y is row.
 *
 * @typedef {[number, number]} CoordinatePair
 *
 * @example
 * const position: CoordinatePair = [5, 10];
 * const [x, y] = position;
 */
export type CoordinatePair = [number, number];

/**
 * A 3D coordinate tuple [x, y, value].
 * Extends 2D coordinates with an optional value or metadata at that position.
 * Used when converting bitboards to coordinate lists with cell values.
 *
 * @typedef {[number, number, number]} CoordinateWithValue
 *
 * @example
 * const cellData: CoordinateWithValue = [5, 10, 255];
 * const [x, y, colorValue] = cellData;
 */
export type CoordinateWithValue = [number, number, number];

/**
 * Flexible coordinate tuple supporting 2D or 3D representations.
 * Allows functions to accept both simple coordinates and coordinates with values.
 *
 * @typedef {CoordinatePair | CoordinateWithValue} Coordinate
 */
export type Coordinate = CoordinatePair | CoordinateWithValue;

/**
 * Bounding box defined by minimum and maximum extents.
 * Used to represent rectangular regions containing all occupied cells.
 *
 * @typedef {Object} BoundingBox
 * @property {Array<number>} min - Minimum extent coordinates [minX, minY, ...]
 * @property {Array<number>} max - Maximum extent coordinates [maxX, maxY, ...]
 *
 * @example
 * const bbox: BoundingBox = {
 *   min: [0, 0],
 *   max: [10, 20]
 * };
 */
export interface BoundingBox {
  readonly min: readonly number[];
  readonly max: readonly number[];
}

/**
 * Coordinate range representing a rectangular span on a grid.
 * Specifies the start and end positions in a linear range.
 *
 * @typedef {Object} CoordinateRange
 * @property {number} startIndex - Starting linear index (inclusive)
 * @property {number} endIndex - Ending linear index (inclusive)
 * @property {number} length - Number of cells in range (endIndex - startIndex + 1)
 */
export interface CoordinateRange {
  readonly startIndex: number;
  readonly endIndex: number;
  readonly length: number;
}

/**
 * Location range specifying a contiguous block of cells in a row.
 * Used for row-based operations where we need to process a range of columns.
 *
 * @typedef {Object} LocationRange
 * @property {number} row - Row index
 * @property {number} col0 - Column start (inclusive)
 * @property {number} col1 - Column end (exclusive)
 */
export interface LocationRange {
  readonly row: number;
  readonly col0: number;
  readonly col1: number;
}
