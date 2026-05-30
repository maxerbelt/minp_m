/**
 * @file coordinates.types.ts - Coordinate and position type definitions
 * @description Foundational coordinate types used throughout the ships module
 */

/**
 * Coordinate pair representing grid position [row, column]
 * @example
 * const pos: CoordinatePair = [3, 5]; // Row 3, column 5
 */
export type CoordinatePair = [row: number, col: number];

/**
 * Coordinate pair alias for consistency
 * @example
 * const cell: CoordPair = [0, 0];
 */
export type CoordPair = [x: number, y: number];

/**
 * Array of coordinate pairs defining a shape's cell occupancy
 */
export type CellCoordinates = CoordinatePair[];

/**
 * Coordinate string key format used for indexing ("row,col")
 * @example
 * const key: CoordinateKey = "3,5";
 */
export type CoordinateKey = string & { readonly __brand: "CoordinateKey" };

/**
 * Helper to create a branded coordinate key
 */
export const makeCoordinateKey = (row: number, col: number): CoordinateKey =>
  `${row},${col}` as CoordinateKey;

/**
 * Parse a coordinate key back into [row, col]
 */
export const parseCoordinateKey = (key: CoordinateKey): CoordinatePair => {
  const [row, col] = key.split(",").map(Number);
  return [row, col];
};
