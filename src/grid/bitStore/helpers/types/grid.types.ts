/**
 * @file grid.types.ts - Grid and coordinate types
 *
 * Defines coordinate and grid-related types used by BitGrid
 * and other grid iteration utilities.
 */

import type { Bitboard, BitPosition, CoordinateGenerator, CoordinateValueGenerator } from './bitboard.types';
import type { BitStore } from './store.types';

/**
 * 2D coordinate in grid space.
 *
 * Represents a position in a grid using column (x) and row (y) indices.
 * Row-major ordering is assumed: index = y * width + x.
 *
 * @interface Coordinate
 */
export interface Coordinate {
  /**
   * Column index (0 to width-1).
   */
  x: number;

  /**
   * Row index (0 to height-1).
   */
  y: number;
}

/**
 * 3D coordinate with value (used for color/occupancy data).
 *
 * Extends Coordinate with a cell value, typically used when
 * iterating cells with their associated values (colors).
 *
 * @interface CoordinateWithValue
 */
export interface CoordinateWithValue extends Coordinate {
  /**
   * Cell value at this coordinate (color, occupancy, or other data).
   */
  value: bigint;
}

/**
 * Grid configuration and state.
 *
 * Represents the dimensions and bounds of a grid used in bitboard operations.
 *
 * @interface GridDimensions
 */
export interface GridDimensions {
  /**
   * Grid width in cells.
   */
  width: number;

  /**
   * Grid height in cells.
   */
  height: number;

  /**
   * Total number of cells (width × height).
   * Computed property, typically cached.
   */
  area?: number;
}

/**
 * Bounds region within a grid.
 *
 * Defines a rectangular region using top-left and bottom-right corners.
 * Used for partial grid operations and boundary checks.
 *
 * @interface GridBounds
 */
export interface GridBounds {
  /**
   * Top-left corner x coordinate (column index).
   */
  minX: number;

  /**
   * Top-left corner y coordinate (row index).
   */
  minY: number;

  /**
   * Bottom-right corner x coordinate (inclusive).
   */
  maxX: number;

  /**
   * Bottom-right corner y coordinate (inclusive).
   */
  maxY: number;
}

/**
 * Conversion utility between index and coordinate representations.
 *
 * Used by BitGrid and related utilities to convert between linear
 * array indices and 2D grid coordinates.
 *
 * @interface IndexCoordinateConverter
 */
export interface IndexCoordinateConverter {
  /**
   * Convert linear index to coordinate.
   * @param index - Linear index in row-major order
   * @param width - Grid width (used for calculation)
   * @returns Coordinate [x, y]
   */
  indexToCoordinate(index: BitPosition, width: number): Coordinate;

  /**
   * Convert coordinate to linear index.
   * @param coord - 2D coordinate
   * @param width - Grid width (used for calculation)
   * @returns Linear index
   */
  coordinateToIndex(coord: Coordinate, width: number): BitPosition;
}

/**
 * Options for BitGrid initialization and operation.
 *
 * Controls behavior of BitGrid iteration and cell access.
 *
 * @interface BitGridOptions
 */
export interface BitGridOptions {
  /**
   * Enable fast path optimization for 1-bit stores.
   * Requires store.bitsOccupied() method to be available.
   * Default: false.
   */
  fast?: boolean;

  /**
   * Override grid width (defaults to store.width if available).
   * Optional - can be provided per-grid.
   */
  width?: number;

  /**
   * Override grid height (defaults to store.height if available).
   * Optional - can be provided per-grid.
   */
  height?: number;

  /**
   * Cache dimensions for performance.
   * If true, precompute and cache dimensions.
   * Default: false.
   */
  cacheDimensions?: boolean;
}

/**
 * Iteration context for grid operations.
 *
 * Provides methods for iterating over grid cells in various ways.
 *
 * @interface GridIterationContext
 */
export interface GridIterationContext {
  /**
   * Store implementation providing cell access.
   */
  store: BitStore;

  /**
   * Grid dimensions.
   */
  dimensions: GridDimensions;

  /**
   * Source bitboard being iterated.
   */
  bitboard: Bitboard;

  /**
   * Whether to use fast path optimization.
   */
  useFastPath: boolean;

  /**
   * Optional filter predicate for cells.
   */
  filter?: (index: BitPosition) => boolean;
}

/**
 * Callback for grid iteration with coordinates.
 *
 * Invoked for each cell during coordinate-based iteration.
 *
 * @callback GridIterationCallback
 * @param {Coordinate} coord - Cell coordinate [x, y]
 * @param {BitPosition} index - Linear index
 * @param {bigint} value - Cell value (if available)
 * @returns {void}
 */
export type GridIterationCallback = (
  coord: Coordinate,
  index: BitPosition,
  value?: bigint,
) => void;

/**
 * Predicate for filtering grid cells.
 *
 * Used to select specific cells based on properties.
 *
 * @callback GridCellPredicate
 * @param {BitPosition} index - Cell index
 * @param {Coordinate} coord - Cell coordinate
 * @param {bigint} value - Cell value
 * @returns {boolean} true if cell should be included
 */
export type GridCellPredicate = (
  index: BitPosition,
  coord: Coordinate,
  value: bigint,
) => boolean;

/**
 * Grid statistics computed from a bitboard.
 *
 * Summary information about the occupied/non-zero cells in a grid.
 *
 * @interface GridStatistics
 */
export interface GridStatistics {
  /**
   * Number of non-zero (occupied) cells.
   */
  occupiedCells: number;

  /**
   * Number of zero (empty) cells.
   */
  emptyCells: number;

  /**
   * Total cells in grid (occupiedCells + emptyCells).
   */
  totalCells: number;

  /**
   * Percentage of cells that are occupied (0-100).
   */
  occupancyPercentage: number;

  /**
   * Minimum x coordinate of occupied cells (if any).
   */
  minX?: number;

  /**
   * Maximum x coordinate of occupied cells (if any).
   */
  maxX?: number;

  /**
   * Minimum y coordinate of occupied cells (if any).
   */
  minY?: number;

  /**
   * Maximum y coordinate of occupied cells (if any).
   */
  maxY?: number;

  /**
   * Minimum cell value in occupied cells (if any).
   */
  minValue?: bigint;

  /**
   * Maximum cell value in occupied cells (if any).
   */
  maxValue?: bigint;
}
