/**
 * Shared coordinate and geometry types for grid module.
 * 
 * These types are foundational and used across grid operations:
 * - Coordinate systems and representations
 * - Bounding box calculations
 * - Grid entry tuples
 * 
 * Extracted to avoid duplication and enable consistent typing across
 * different grid shape implementations (rectangular, hexagonal, triangular).
 * 
 * @module grid/types/shared
 */

/**
 * Absolute grid coordinate representing a cell's position.
 * Format: [x, y] where x is column (0-based) and y is row (0-based).
 * 
 * Used throughout the grid system for identifying cells.
 */
export type Coordinate = [x: number, y: number];

/**
 * Grid location - alias for Coordinate pair used interchangeably.
 */
export type Location = [x: number, y: number];

/**
 * Coordinate with associated value (color, depth, etc).
 * Format: [x, y, value]
 * 
 * Used for coordinate lists and data transfer in masks and grids.
 */
export type CoordinateWithValue = [x: number, y: number, value: number];

/**
 * Coordinate tuple with linear grid index.
 * Format: [x, y, index]
 * 
 * Useful when both coordinate and index representations are needed.
 */
export type CoordinateWithIndex = [x: number, y: number, index: number];

/**
 * Grid entry tuple: complete cell information with context.
 * Format: [x, y, value, index, gridReference]
 * 
 * Returned by grid iteration methods like entries(). Includes both
 * coordinate and index representations, plus the grid itself for context.
 */
export type GridEntry = [
  x: number,
  y: number,
  value: unknown,
  index: number,
  grid: unknown
];

/**
 * Relative coordinate offset from a reference cell.
 * Format: [deltaX, deltaY]
 * 
 * Used for neighbor definitions and directional movements.
 * Example: [1, 0] = right neighbor, [1, 1] = diagonal down-right
 */
export type NeighborOffset = [deltaX: number, deltaY: number];

/**
 * Direction vector with +1/-1/0 components for each axis.
 * 
 * Used in line drawing and pathfinding algorithms.
 * Each component independently specifies direction: -1 (backwards), 0 (no move), +1 (forwards)
 */
export interface DirectionVector {
  /** X direction: -1 (left), 0 (no movement), +1 (right) */
  readonly stepX: -1 | 0 | 1;
  
  /** Y direction: -1 (up), 0 (no movement), +1 (down) */
  readonly stepY: -1 | 0 | 1;
}

/**
 * Grid dimensions specifying width and height.
 */
export interface GridDimensions {
  /** Number of columns (x-axis range) */
  readonly width: number;
  
  /** Number of rows (y-axis range) */
  readonly height: number;
}

/**
 * Bounding box defining rectangular area with min/max coordinates.
 * 
 * Coordinates are inclusive: cells from (minX, minY) to (maxX, maxY) are included.
 * Used for region queries, collision detection, and bounds validation.
 */
export interface BoundingBox {
  /** Minimum X coordinate (leftmost column) */
  minX: number;
  
  /** Minimum Y coordinate (topmost row) */
  minY: number;
  
  /** Maximum X coordinate (rightmost column, inclusive) */
  maxX: number;
  
  /** Maximum Y coordinate (bottommost row, inclusive) */
  maxY: number;
  
  /** Derived: Width of bounding box */
  readonly width?: number;
  
  /** Derived: Height of bounding box */
  readonly height?: number;
}

/**
 * Result from bitboard shrinking/normalization operation.
 * 
 * Returned by algorithms that normalize sparse grids to minimal bounding boxes
 * containing only occupied cells.
 */
export interface BoundingBoxResult {
  /** Bitboard representation (bitboard value, BigInt or Uint32Array) */
  bitboard: bigint;
  
  /** New width after normalization */
  newWidth: number;
  
  /** New height after normalization */
  newHeight: number;
  
  /** Optional: minimum x offset in original grid */
  minX?: number;
  
  /** Optional: minimum y offset in original grid */
  minY?: number;
}

/**
 * Line drawing parameters calculated for Bresenham algorithm.
 * 
 * Contains delta distances and step directions needed for line drawing.
 */
export interface LineParameters {
  /** Absolute horizontal distance */
  deltaX: number;
  
  /** Absolute vertical distance */
  deltaY: number;
  
  /** Horizontal step direction: +1 or -1 */
  stepX: number;
  
  /** Vertical step direction: +1 or -1 */
  stepY: number;
}

/**
 * Result of ray-boundary intersection calculation.
 * 
 * Contains start and end points where a ray exits the grid boundaries.
 */
export interface InterceptResult {
  /** Start intercept X coordinate */
  x0: number;
  
  /** Start intercept Y coordinate */
  y0: number;
  
  /** End intercept X coordinate */
  x1: number;
  
  /** End intercept Y coordinate */
  y1: number;
}

/**
 * Represents a valid placement position for a shape on a grid.
 * 
 * Used by placement algorithms to return valid offset positions.
 */
export interface PlacementPosition {
  /** Column offset for placement anchor (0 <= x < gridWidth) */
  x: number;
  
  /** Row offset for placement anchor (0 <= y < gridHeight) */
  y: number;
  
  /** Optional: variant/rotation index used */
  variant?: number;
  
  /** Optional: score or priority for this placement */
  score?: number;
}

/**
 * Validated coordinate or null if validation failed.
 * 
 * Returned by coordinate validation functions.
 */
export type ValidatedCoordinate = Coordinate | null;

/**
 * Coordinate list - array of coordinate pairs.
 * 
 * Used for shape definitions, collision lists, etc.
 */
export type CoordinateList = Coordinate[];

/**
 * Coordinate list with values - array of [x, y, value] tuples.
 * 
 * Used for colored grids, occupancy masks with depth values, etc.
 */
export type CoordinateValueList = CoordinateWithValue[];
