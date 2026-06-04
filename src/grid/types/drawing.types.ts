/**
 * Drawing and shape-related type definitions.
 * 
 * Types used by canvas drawing, shape representation, and
 * geometric algorithms like Bresenham line drawing.
 * 
 * @module grid/types/drawing
 */

import type { Coordinate,  InterceptResult } from './shared.types.js';

/**
 * Canvas surface interface for drawing operations.
 * 
 * Objects implementing this interface can be targets for drawing algorithms.
 */
export interface CanvasSurface {
  /** Canvas width in cells */
  width: number;
  
  /** Canvas height in cells */
  height: number;

  /**
   * Set cell value at coordinate
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param color - Value to set
   */
  set(x: number, y: number, color: unknown): void;
}

/**
 * Configuration for pie/sector drawing.
 * 
 * Specifies radius, angle, and center for circular sector rendering.
 */
export interface PieDrawConfig {
  /** Center X coordinate */
  centerX: number;
  
  /** Center Y coordinate */
  centerY: number;
  
  /** Radius in cells */
  radius: number;
  
  /** Starting angle in degrees */
  startAngle?: number;
  
  /** Ending angle in degrees */
  endAngle?: number;
  
  /** Angle spread/width in degrees (for narrow vs wide pie) */
  angleSpread?: number;
  
  /** Color value to draw with */
  color?: number;
}

/**
 * Configuration for ray drawing.
 * 
 * Specifies origin, direction, and optional distance limit.
 */
export interface RayDrawConfig {
  /** Ray origin X coordinate */
  originX: number;
  
  /** Ray origin Y coordinate */
  originY: number;
  
  /** Direction target X coordinate (determines direction) */
  directionX: number;
  
  /** Direction target Y coordinate (determines direction) */
  directionY: number;
  
  /** Optional maximum distance to draw */
  maxDistance?: number;
  
  /** Color value to draw with */
  color?: number;
}

/**
 * Configuration for line segment drawing.
 * 
 * Specifies start and end points.
 */
export interface LineDrawConfig {
  /** Start X coordinate */
  x0: number;
  
  /** Start Y coordinate */
  y0: number;
  
  /** End X coordinate */
  x1: number;
  
  /** End Y coordinate */
  y1: number;
  
  /** Color value to draw with */
  color?: number;
}

/**
 * Bresenham line algorithm state.
 * 
 * Tracks progress during line drawing iteration.
 */
export interface BresenhamState {
  /** Current X coordinate */
  x: number;
  
  /** Current Y coordinate */
  y: number;
  
  /** Error accumulator */
  error: number;
  
  /** Step count */
  step: number;
}

/**
 * Result of line drawing operation.
 * 
 * Contains all cells that were drawn by the algorithm.
 */
export interface LineDrawResult {
  /** Array of coordinates that were drawn */
  coordinates: Coordinate[];
  
  /** Number of cells drawn */
  count: number;
  
  /** Whether drawing reached the canvas boundary */
  boundaryReached: boolean;
}

/**
 * Shape representation in coordinate form.
 * 
 * A shape is simply a collection of cells relative to origin.
 */
export type Shape = Coordinate[];

/**
 * Shape variant with metadata.
 * 
 * Represents one rotation/reflection of a shape.
 */
export interface ShapeVariant {
  /** Coordinates of this variant */
  coordinates: Coordinate[];
  
  /** Variant index (0=identity, 1=90°, etc.) */
  index: number;
  
  /** Rotation angle in degrees */
  rotation?: number;
  
  /** Whether this variant is flipped */
  isFlipped?: boolean;
  
  /** Bounding box width */
  width: number;
  
  /** Bounding box height */
  height: number;
}

/**
 * Complete shape information with all variants.
 * 
 * Contains all rotations/reflections of a shape.
 */
export interface ShapeInfo {
  /** Base/default shape coordinates */
  base: Coordinate[];
  
  /** All variants (rotations and reflections) */
  variants: ShapeVariant[];
  
  /** Minimum bounding box dimension */
  minDim: number;
  
  /** Maximum bounding box dimension */
  maxDim: number;
  
  /** Unique variants (excluding symmetric duplicates) */
  uniqueVariants: ShapeVariant[];
}

/**
 * Polyomino representation - shape made of unit cells.
 * 
 * Array of coordinates representing connected unit cells.
 */
export type Polyomino = Coordinate[];

/**
 * Polyomino with size information.
 * 
 * Used by polyomino generation algorithms.
 */
export interface PolyominoInfo {
  /** Cells making up the polyomino */
  cells: Coordinate[];
  
  /** Size (number of cells) */
  size: number;
  
  /** Bounding box width */
  width: number;
  
  /** Bounding box height */
  height: number;
  
  /** Canonical form for deduplication */
  canonicalForm?: string;
  
  /** Symmetry group order (1, 2, 4, or 8) */
  symmetryOrder?: number;
}

/**
 * Boundary intercept information.
 * 
 * Where a ray exits the grid boundaries.
 */
export interface BoundaryIntercept extends InterceptResult {
  /** Whether hit left boundary */
  hitLeft?: boolean;
  
  /** Whether hit right boundary */
  hitRight?: boolean;
  
  /** Whether hit top boundary */
  hitTop?: boolean;
  
  /** Whether hit bottom boundary */
  hitBottom?: boolean;
}

/**
 * Asymptotic line drawing helper functions.
 * 
 * Used for infinite line algorithms.
 */
export interface AsymptoticLineHelper {
  /**
   * Calculate intercepts where line exits grid
   * @param x0 - Line point 1 X
   * @param y0 - Line point 1 Y
   * @param x1 - Line point 2 X
   * @param y1 - Line point 2 Y
   * @returns Boundary intercepts
   */
  getIntercepts(x0: number, y0: number, x1: number, y1: number): BoundaryIntercept;
  
  /**
   * Draw line along intercepts
   * @param intercepts - Boundary intercepts
   * @param canvas - Target canvas
   * @param color - Draw color
   */
  drawAlongIntercepts(
    intercepts: BoundaryIntercept,
    canvas: CanvasSurface,
    color: number
  ): void;
}
