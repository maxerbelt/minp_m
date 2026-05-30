/**
 * Geometry and canvas types
 * Types for canvas-based calculations and line geometry
 */

/**
 * Line intercept points
 * Canvas coordinates where a line segment intersects canvas bounds
 */
export type LineIntercepts = {
  readonly x0: number
  readonly y0: number
  readonly x1: number
  readonly y1: number
}

/**
 * Line segment
 * Representation of a line with start and end points
 */
export type LineSegment = {
  readonly startX: number
  readonly startY: number
  readonly endX: number
  readonly endY: number
}

/**
 * Angle and distance
 * Polar coordinate representation
 */
export type PolarCoord = {
  readonly angle: number
  readonly distance: number
}

/**
 * Bounding rectangle
 * Canvas bounds for clipping or area checks
 */
export type BoundingRect = {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
  readonly left: number
  readonly right: number
  readonly top: number
  readonly bottom: number
}

/**
 * Pie segment parameters
 * Configuration for pie/sector calculations
 */
export type PieSegmentParams = {
  readonly centerX: number
  readonly centerY: number
  readonly targetX: number
  readonly targetY: number
  readonly radius: number
  readonly spreadDeg: number
}

/**
 * Rotation angle (in degrees)
 */
export type RotationAngle = number & { readonly __brand: 'RotationAngle' }

/**
 * Scale factor for size calculations
 */
export type ScaleFactor = number & { readonly __brand: 'ScaleFactor' }

/**
 * Canvas drawing context interface
 * Minimal interface for canvas operations
 */
export interface CanvasContext {
  readonly canvas: HTMLCanvasElement
  getContext(contextType: '2d'): CanvasRenderingContext2D | null
}

/**
 * Vector calculation result
 * Result of vector operations
 */
export type VectorResult = {
  readonly dx: number
  readonly dy: number
  readonly magnitude: number
  readonly angle: number
}
