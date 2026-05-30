/**
 * @fileoverview Shared utility types used across operations.
 *
 * Provides common type definitions for:
 * - Store backend abstractions
 * - Callbacks and predicates
 * - Generic utility types
 */

/**
 * Bitboard store interface.
 * Defines the contract that bit storage backends must implement.
 * Used by all operation classes to abstract away storage details.
 *
 * @interface StoreLike
 */
export interface StoreLike {
  /** Empty bitboard representation */
  readonly empty: bigint | Uint32Array;

  /** Single set bit representation */
  readonly one: bigint | number;

  /** Full grid bitboard (all bits set) */
  readonly fullBits?: bigint | Uint32Array;

  /** Convert value to store's native type */
  storeType?(value: number): bigint | number | Uint32Array;

  /** Bitwise OR operation */
  bitOr(a: unknown, b: unknown): unknown;

  /** Bitwise AND operation */
  bitAnd(a: unknown, b: unknown): unknown;

  /** Bitwise subtraction (AND NOT) operation */
  bitSub(a: unknown, b: unknown): unknown;

  /** Convert coordinates to bit position */
  bitPos?(x: number, y: number): number;

  /** Check if bit at position is set */
  isBitSet?(bits: unknown, position: number): boolean;

  /** Shift bits left/right */
  shiftBits?(bits: unknown, shift: number): unknown;

  /** Clone bitboard */
  clone?(bits: unknown): unknown;

  /** Create bit mask at position */
  bitMaskByPos?(position: number): bigint;
}

/**
 * Source for cloning operations.
 * Defines what objects can be cloned from.
 *
 * @interface CloneSource
 */
export interface CloneSource {
  /** Create a copy of this object */
  clone(): CloneSource;
}

/**
 * Callback signature for cell processing.
 * Used in grid iteration and cell traversal operations.
 *
 * @typedef {(row: number, col: number) => void} CellCallback
 */
export type CellCallback = (row: number, col: number) => void;

/**
 * Reducer callback for accumulating cell data.
 * Processes cells and accumulates results into a collection.
 *
 * @typedef {(collection: any, row: number, col: number) => void} CellReducer
 */
export type CellReducer<T = unknown> = (collection: T, row: number, col: number) => void;

/**
 * Predicate for testing cell conditions.
 * Returns true if cell passes the test, false otherwise.
 *
 * @typedef {(row: number, col: number, value?: any) => boolean} CellPredicate
 */
export type CellPredicate = (row: number, col: number, value?: unknown) => boolean;

/**
 * Transform function for cell values.
 * Maps one value to another during grid operations.
 *
 * @typedef {(value: any) => any} CellTransform
 */
export type CellTransform<T = unknown, R = unknown> = (value: T) => R;

/**
 * Boundary check callback.
 * Validates if coordinates are within grid bounds.
 *
 * @typedef {(row: number, col: number) => boolean} InBoundsCallback
 */
export type InBoundsCallback = (row: number, col: number) => boolean;

/**
 * Result of a shape-based operation.
 * Contains the result shape and associated metadata.
 *
 * @interface OperationResult
 * @template T
 */
export interface OperationResult<T = unknown> {
  /** Operation succeeded */
  success: boolean;

  /** Result shape or data */
  shape?: T;

  /** Error message if operation failed */
  error?: string;

  /** Additional metadata from operation */
  metadata?: Record<string, unknown>;
}

/**
 * Iterable of bitboard indices.
 * Supports lazy iteration over set bits without creating arrays.
 *
 * @interface BitIndicesIterable
 */
export interface BitIndicesIterable {
  [Symbol.iterator](): Iterator<number>;
}

/**
 * Constraint specification for erosion operations.
 * Defines which cells must survive erosion based on neighborhoods.
 *
 * @interface ErosionConstraint
 */
export interface ErosionConstraint {
  /** Horizontal erosion constraint */
  horizontal?: bigint | Uint32Array;

  /** Vertical erosion constraint */
  vertical?: bigint | Uint32Array;

  /** Combined constraint for multi-directional erosion */
  combined?: bigint | Uint32Array;
}

/**
 * Expansion neighborhood definition.
 * Specifies which neighbors are included in dilation.
 *
 * @interface NeighborhoodPattern
 */
export interface NeighborhoodPattern {
  /** Cardinal directions (up, down, left, right) */
  cardinal?: boolean;

  /** Diagonal directions (corners) */
  diagonal?: boolean;

  /** Maximum distance for expansion */
  radius?: number;

  /** Custom neighbor offsets */
  offsets?: Array<[number, number]>;
}

/**
 * Row range information.
 * Specifies a contiguous range of columns in a row.
 *
 * @interface RowRange
 */
export interface RowRange {
  readonly row: number;
  readonly startCol: number;
  readonly endCol: number;
  readonly length: number;
}
