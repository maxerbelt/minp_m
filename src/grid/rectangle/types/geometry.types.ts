/**
 * Geometry Types for Rectangle Grid
 * 
 * Defines fundamental coordinate and directional types used across
 * the rectangle grid module. These types are widely shared and referenced
 * by connectivity, line drawing, and transformation algorithms.
 */

/**
 * Absolute grid coordinate representing a cell's position.
 * Format: [x, y] where x is column (0-based) and y is row (0-based).
 * 
 * @example
 * const pos: Location = [3, 5];
 * // Column 3, Row 5
 */
export type Location = [x: number, y: number];

/**
 * Alias for coordinate pair - used interchangeably with Location.
 * Format: [x, y] representing grid position
 */
export type Coordinate = [x: number, y: number];

/**
 * Validated coordinate pair or null if validation failed.
 * Used as return type for coordinate validation functions.
 */
export type ValidatedCoordinates = Coordinate | null;

/**
 * Coordinate with associated value (color, z-index, etc).
 * Format: [x, y, value]
 * 
 * @example
 * const cell: CoordinateWithValue = [2, 3, 1]; // Cell at (2,3) with color 1
 */
export type CoordinateWithValue = [x: number, y: number, value: number];

/**
 * Relative coordinate offset representing displacement from a reference cell.
 * Format: [deltaX, deltaY]
 * 
 * Used for neighbor definitions, transformations, and directional movements.
 * 
 * @example
 * const right: NeighborOffset = [1, 0];   // Cell directly to the right
 * const down: NeighborOffset = [0, 1];    // Cell directly below
 * const diagonal: NeighborOffset = [1, 1]; // Cell down-right
 */
export type NeighborOffset = [deltaX: number, deltaY: number];

/**
 * Direction vector indicating movement along X and Y axes.
 * Each component is -1 (backwards), 0 (no movement), or +1 (forwards).
 * 
 * Used for line drawing algorithms and pathfinding calculations.
 * 
 * @example
 * const right: DirectionVector = { stepX: 1, stepY: 0 };
 * const diagonal: DirectionVector = { stepX: 1, stepY: 1 };
 */
export interface DirectionVector {
  /** X direction: -1 (left), 0 (no change), or +1 (right) */
  stepX: -1 | 0 | 1;
  
  /** Y direction: -1 (up), 0 (no change), or +1 (down) */
  stepY: -1 | 0 | 1;
}

/**
 * Grid dimensions specifying rows and columns.
 * Both components are positive integers.
 * 
 * @example
 * const dims: GridDimensions = { rows: 8, cols: 8 }; // Chess board
 */
export interface GridDimensions {
  /** Number of rows in the grid (height in cells) */
  readonly rows: number;
  
  /** Number of columns in the grid (width in cells) */
  readonly cols: number;
}

/**
 * Bounding box defining rectangular area with min/max coordinates.
 * Used for region queries and collision detection.
 * 
 * Coordinates are inclusive: cells from (minX, minY) to (maxX, maxY) are included.
 */
export interface BoundingBox {
  /** Minimum X coordinate (leftmost column) */
  minX: number;
  
  /** Minimum Y coordinate (topmost row) */
  minY: number;
  
  /** Maximum X coordinate (rightmost column) */
  maxX: number;
  
  /** Maximum Y coordinate (bottommost row) */
  maxY: number;
}

/**
 * Result from bounding box shrink operation.
 * Returned by bitboard shrinking algorithms that normalize sparse grids.
 */
export interface BoundingBoxResult {
  /** Bitboard representation of shrunk polyomino or shape */
  bitboard: bigint | any;
  
  /** New width after shrinking to occupied cells */
  newWidth: number;
  
  /** New height after shrinking to occupied cells */
  newHeight: number;
}
