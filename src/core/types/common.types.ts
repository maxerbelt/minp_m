/**
 * Common primitive and basic types used across the core module.
 *
 * These types are used by multiple other type files and represent
 * fundamental data structures shared across the codebase.
 */

/**
 * 2D coordinate as a tuple with optional depth/color component.
 * Used for grid positions, element locations, and spatial data.
 *
 * @example
 * const pos: Coordinate = [0, 5]        // row, col
 * const colored: Coordinate = [0, 5, 2] // row, col, depth
 */
export type Coordinate = [number | bigint, number | bigint, (number | bigint)?];

/**
 * 2D position with explicit x and y pixel coordinates.
 * Used for DOM element positioning and animation targets.
 */
export interface Position {
  /** X coordinate in pixels */
  x: number;
  /** Y coordinate in pixels */
  y: number;
}

/**
 * Bounding box information computed from coordinates.
 * Provides min/max bounds and color/depth information for a set of points.
 */
export interface MinMaxBounds {
  /** Minimum x (column) across all points */
  minX: number;
  /** Maximum x (column) across all points */
  maxX: number;
  /** Minimum y (row) across all points */
  minY: number;
  /** Maximum y (row) across all points */
  maxY: number;
  /** Maximum z-value + 1, or 2 if no z-values present */
  depth: number;
  /** True if any coordinate contained a z-value/color */
  hasColor: boolean;
}

/**
 * Configuration options for JSON stringification with special value handling.
 */
export interface StringifyOptions {
  /** Number of spaces for indentation (0 for compact, default: 2) */
  space?: number;
  /** Maximum recursion depth for objects (default: Infinity) */
  depth?: number;
}

/**
 * Flexible bitboard representation supporting multiple formats.
 * Enables efficient grid representation for up to thousands of cells
 * using scalar or array-based word storage.
 */
export type Bitboard =
  | bigint
  | number
  | number[]
  | Uint32Array
  | Uint16Array
  | Uint8Array
  | Int32Array;

/**
 * Comprehensive type identification string for runtime type checking.
 * Covers all JavaScript types including primitives, built-ins, and typed arrays.
 */
export type TypeString =
  | 'null'
  | 'undefined'
  | 'array'
  | 'object'
  | 'map'
  | 'set'
  | 'date'
  | 'regexp'
  | 'error'
  | 'weakmap'
  | 'weakset'
  | 'promise'
  | 'arraybuffer'
  | 'dataview'
  | 'string'
  | 'number'
  | 'nan'
  | 'boolean'
  | 'function'
  | 'bigint'
  | 'symbol'
  | 'uint8array'
  | 'float32array';

/**
 * Binary tuple for pairing operations.
 */
export type Pair = [any, any];

/**
 * Variable-length tuple for N-ary zipping operations.
 */
export type Tuple = any[];
