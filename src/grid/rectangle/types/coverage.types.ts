/**
 * Line Drawing and Coverage Algorithm Types
 * 
 * Defines types for Bresenham line drawing, coverage modes, and traversal algorithms.
 * Used by RectCoverBase and its subclasses for different line coverage strategies.
 */

import type {
  CoordinateValidator,
  CoordinateIndexer,
  ExitCondition,
  CornerHandler
} from './callbacks.types'

/**
 * Result from a single Bresenham line stepping operation.
 * 
 * Contains updated position and error term after one step along a line.
 * Used by both step() and stepMove() methods with slightly different outputs.
 * 
 * @example
 * const result = coverAlgorithm.step(
 *   errorTerm, deltaY, deltaX,
 *   currentX, stepX, currentY, stepY
 * );
 * // result = { errorTerm: -5, currentX: 4, currentY: 3, moveInX: 1, moveInY: 0 }
 */
export interface StepResult {
  /** Updated Bresenham error accumulator for next step (signed integer) */
  errorTerm: number;
  
  /** New X position after step (may have changed by stepX or remained unchanged) */
  currentX: number;
  
  /** New Y position after step (may have changed by stepY or remained unchanged) */
  currentY: number;
  
  /** Optional: Whether step moved in X direction (0 or 1, only from stepMove) */
  moveInX?: 0 | 1;
  
  /** Optional: Whether step moved in Y direction (0 or 1, only from stepMove) */
  moveInY?: 0 | 1;
}

/**
 * Delta and direction information for line traversal.
 * 
 * Computed from start and end points, specifying absolute differences
 * and directional multipliers for Bresenham algorithm.
 * 
 * @example
 * const info: DeltaAndDirectionInfo = {
 *   deltaX: 5,
 *   deltaY: 3,
 *   stepX: 1,
 *   stepY: 1,
 *   isXMajor: true // X has larger delta
 * };
 */
export interface DeltaAndDirectionInfo {
  /** Absolute difference in X: |endX - startX| (always non-negative) */
  deltaX: number;
  
  /** Absolute difference in Y: |endY - startY| (always non-negative) */
  deltaY: number;
  
  /** X direction multiplier: -1 (left), 0 (no change), or +1 (right) */
  stepX: -1 | 0 | 1;
  
  /** Y direction multiplier: -1 (up), 0 (no change), or +1 (down) */
  stepY: -1 | 0 | 1;
  
  /** True if X has larger delta than Y (X-major line) */
  isXMajor: boolean;
  
  /** True if line is diagonal (deltaX === deltaY and both > 0) */
  isDiagonal?: boolean;
}

/**
 * Line traversal configuration and state.
 * 
 * Encapsulates parameters and intermediate state for line drawing algorithms.
 * Used to preserve state across stepping operations.
 */
export interface LineTraversalState {
  /** Starting X coordinate */
  startX: number;
  
  /** Starting Y coordinate */
  startY: number;
  
  /** Current X position during traversal */
  currentX: number;
  
  /** Current Y position during traversal */
  currentY: number;
  
  /** Ending X coordinate (or direction point) */
  endX: number;
  
  /** Ending Y coordinate (or direction point) */
  endY: number;
  
  /** Bresenham error accumulator (initial: 0 or calculated) */
  errorTerm: number;
  
  /** Current step count (1-based, 0 at initialization) */
  step: number;
  
  /** Delta and direction information */
  deltaInfo: DeltaAndDirectionInfo;
  
  /** Exit condition function (or null to stop at exact end point) */
  exitCondition: ExitCondition | null;
  
  /** Coordinate validator function */
  validator: CoordinateValidator;
  
  /** Coordinate indexer function */
  indexer: CoordinateIndexer;
}

/**
 * Coverage algorithm type identifier.
 * 
 * Specifies which Bresenham line variant to use:
 * - normal: Standard coverage (Bresenham)
 * - half: Half-plane coverage
 * - super: Super-coverage (all touched cells)
 */
export type CoverageMode = 'normal' | 'half' | 'super';

/**
 * Ray configuration for ray casting from a point in a direction.
 * 
 * Specifies origin, direction, and optional distance limit.
 */
export interface RayConfiguration {
  /** Starting X coordinate */
  originX: number;
  
  /** Starting Y coordinate */
  originY: number;
  
  /** Direction X (typically -1, 0, or +1) */
  directionX: number;
  
  /** Direction Y (typically -1, 0, or +1) */
  directionY: number;
  
  /** Optional maximum distance in steps (default: no limit) */
  maxDistance?: number;
}

/**
 * Segment configuration for drawing line segment between two points.
 * 
 * Specifies start and end coordinates for finite line segment.
 */
export interface SegmentConfiguration {
  /** Starting X coordinate */
  startX: number;
  
  /** Starting Y coordinate */
  startY: number;
  
  /** Ending X coordinate */
  endX: number;
  
  /** Ending Y coordinate */
  endY: number;
}

/**
 * Circle/arc arc segment configuration.
 * 
 * Used for circle drawing algorithms (not standard Bresenham, but pattern follows).
 */
export interface CircleConfiguration {
  /** Center X coordinate */
  centerX: number;
  
  /** Center Y coordinate */
  centerY: number;
  
  /** Radius in cells */
  radius: number;
  
  /** Optional arc start angle in degrees (0 = positive X axis) */
  startAngle?: number;
  
  /** Optional arc end angle in degrees */
  endAngle?: number;
}

/**
 * Polygon vertex configuration for polygon drawing.
 * 
 * Defines vertices of polygon to draw edges between.
 */
export interface PolygonConfiguration {
  /** Array of vertices as [x, y] coordinate pairs */
  vertices: Array<[x: number, y: number]>;
  
  /** Whether to close polygon (connect last to first) */
  closed: boolean;
}

/**
 * Coverage result statistics.
 * 
 * Information about computed line coverage for analysis and optimization.
 */
export interface CoverageStats {
  /** Total cells covered by line */
  cellCount: number;
  
  /** Number of cells added by corner handling (super-cover specific) */
  cornerCellsAdded: number;
  
  /** Average error term magnitude during traversal */
  avgError: number;
  
  /** Maximum error magnitude encountered */
  maxError: number;
  
  /** Whether line traversal completed fully (vs early exit) */
  completedFully: boolean;
}
