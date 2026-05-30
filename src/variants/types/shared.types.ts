/**
 * @fileoverview Shared utility types and re-exports for the variants system.
 * Provides convenient consolidated exports and utility types used across multiple modules.
 */

import type { Mask } from '../grid/rectangle/mask.js'

/**
 * Mask type re-export from the grid module.
 * Represents a bitboard-based grid structure used throughout the variant system.
 * Encapsulates occupied cells as a bitmask for efficient storage and operations.
 * External type imported from grid/rectangle/mask.js.
 *
 * @typedef {import('../grid/rectangle/mask.js').Mask} MaskType
 */
export type MaskType = Mask

/**
 * SubBoard type re-export from grid module.
 * Represents a sub-region of a larger board with coordinate transformation.
 * Used for embedded placement calculations and bounds management.
 * External type imported from grid/subBoard.js.
 *
 * @typedef {import('../grid/subBoard.js').SubBoard} SubBoardType
 */
export type SubBoardType = any // Would be imported from ../grid/subBoard.js if exported

/**
 * Array of coordinate pairs in 2D space.
 * Represents a list of [row, column] positions.
 * Used for specifying cell locations in local or world coordinate space.
 *
 * @typedef {Array<[number, number]>} Coordinates2D
 */
export type Coordinates2D = Array<[number, number]>

/**
 * Array of coordinate triples with occupancy values.
 * Represents [row, column, value] tuples for cells with occupancy information.
 * Used when iterating over boards with cell occupancy/depth information.
 *
 * @typedef {Array<[number, number, number]>} CoordinatesWithValues
 */
export type CoordinatesWithValues = Array<[number, number, number]>

/**
 * Rectangle dimension interface - width and height.
 * Used for specifying or querying rectangular areas in grid coordinates.
 *
 * @interface Dimensions
 */
export interface Dimensions {
  /**
   * Width in grid cells (columns).
   *
   * @type {number}
   */
  width: number

  /**
   * Height in grid cells (rows).
   *
   * @type {number}
   */
  height: number
}

/**
 * Rectangle position interface - row and column coordinates.
 * Used for specifying positions in grid space (0-indexed from top-left).
 *
 * @interface Position
 */
export interface Position {
  /**
   * Row coordinate (y-axis, 0-indexed from top).
   *
   * @type {number}
   */
  row: number

  /**
   * Column coordinate (x-axis, 0-indexed from left).
   *
   * @type {number}
   */
  col: number
}

/**
 * Rectangle area interface - position and dimensions combined.
 * Represents a rectangular region in grid space with location and size.
 *
 * @interface Rectangle
 * @extends {Position}
 * @extends {Dimensions}
 */
export interface Rectangle extends Position, Dimensions {}

/**
 * Result interface for operations that may succeed or fail.
 * Generic container for operation results with status, data, and optional error.
 * Used for error handling and result propagation.
 *
 * @interface OperationResult
 * @template T
 */
export interface OperationResult<T> {
  /**
   * Whether the operation succeeded.
   *
   * @type {boolean}
   */
  success: boolean

  /**
   * Result data if operation succeeded.
   *
   * @type {T}
   * @optional
   */
  data?: T

  /**
   * Error message if operation failed.
   *
   * @type {string}
   * @optional
   */
  error?: string
}

/**
 * Map/dictionary type for flexible key-value storage.
 * Generic container for string-keyed objects with any values.
 * Used for flexible configuration and data storage patterns.
 *
 * @typedef {Record<string, any>} StringMap
 */
export type StringMap = Record<string, any>

/**
 * Nullable type utility - makes any type potentially null.
 * Used to express optional nullable values in type signatures.
 *
 * @typedef {T | null} Nullable
 * @template T
 */
export type Nullable<T> = T | null

/**
 * Optional type utility - makes any type potentially undefined.
 * Used to express optional values that might not be present.
 *
 * @typedef {T | undefined} Optional
 * @template T
 */
export type Optional<T> = T | undefined

/**
 * Constructor type utility - represents a class constructor.
 * Used for generic patterns that need to instantiate classes.
 *
 * @typedef {new (...args: any[]) => T} Constructor
 * @template T
 */
export type Constructor<T> = new (...args: any[]) => T
