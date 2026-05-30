/**
 * Callback function type definitions for grid operations.
 * 
 * Defines signatures for higher-order functions used in:
 * - Coordinate validation and transformation
 * - Grid iteration and filtering
 * - Line drawing algorithms
 * - Morphological operations
 * 
 * @module grid/types/callbacks
 */

import type { Coordinate, LineParameters } from './shared.types.js';

/**
 * Validates and optionally adjusts coordinates.
 * 
 * Used by drawing and iteration algorithms to handle boundary conditions:
 * - Clamp: Restrict to valid range
 * - Wrap: Modulo wrap-around
 * - Reflect: Bounce off boundaries
 * - Reject: Return null for invalid coords
 * 
 * @param x - X coordinate (may be out of bounds)
 * @param y - Y coordinate (may be out of bounds)
 * @returns Validated [x, y] pair, or null if validation fails
 */
export type CoordinateValidator = (
  x: number,
  y: number
) => Coordinate | null;

/**
 * Maps coordinates to grid index (1D array position).
 * 
 * Implements row-major, column-major, or custom coordinate-to-index mapping.
 * The step parameter provides traversal context.
 * 
 * @param x - X coordinate
 * @param y - Y coordinate
 * @param step - Step count in traversal (0 for start)
 * @returns 1D grid index
 */
export type CoordinateIndexer = (
  x: number,
  y: number,
  step: number
) => number;

/**
 * Exit condition predicate for line/ray traversal.
 * 
 * Determines when to stop iterating along a line.
 * Called on each step to decide whether to continue or terminate.
 * 
 * @param x - Current X coordinate
 * @param y - Current Y coordinate
 * @param step - Current step count (1-based)
 * @returns True to stop traversal; false to continue
 */
export type ExitCondition = (
  x: number,
  y: number,
  step: number
) => boolean;

/**
 * Transforms a coordinate pair to another coordinate pair.
 * 
 * Used for rotations, reflections, and custom transformations.
 * 
 * @param x - Source X coordinate
 * @param y - Source Y coordinate
 * @returns Transformed [x, y] coordinate
 */
export type CoordinateTransform = (
  x: number,
  y: number
) => Coordinate;

/**
 * Maps index from source to transformed space.
 * 
 * Used by transformation maps to apply symmetry operations.
 * 
 * @param sourceIndex - Original linear index
 * @returns Transformed linear index
 */
export type IndexTransformer = (sourceIndex: number) => number;

/**
 * Transforms index with associated data/context.
 * 
 * Enables transformations that need to consider metadata.
 * 
 * @param sourceIndex - Original index
 * @param data - Associated data/context
 * @returns Transformed index
 */
export type TransformWithData = (
  sourceIndex: number,
  data: unknown
) => number;

/**
 * Callback for processing cells during iteration.
 * 
 * Called for each cell in iteration with position and index.
 * 
 * @param row - Row coordinate
 * @param col - Column coordinate
 */
export type CellCallback = (row: number, col: number) => void;

/**
 * Reducer callback for accumulating cell data.
 * 
 * Processes cells and accumulates results into collection.
 * 
 * @param collection - Accumulator
 * @param row - Row coordinate
 * @param col - Column coordinate
 */
export type CellReducer<T = unknown> = (
  collection: T,
  row: number,
  col: number
) => void;

/**
 * Predicate callback for filtering cells.
 * 
 * Tests whether a cell matches criteria.
 * 
 * @param row - Row coordinate
 * @param col - Column coordinate
 * @param value - Optional cell value for context
 * @returns True if cell matches; false otherwise
 */
export type CellPredicate = (
  row: number,
  col: number,
  value?: unknown
) => boolean;

/**
 * Transforms a cell value to another value.
 * 
 * Used in grid mapping and transformation operations.
 * 
 * @param value - Source cell value
 * @returns Transformed cell value
 */
export type CellTransform<T = unknown, R = unknown> = (value: T) => R;

/**
 * Checks if coordinates are within grid bounds.
 * 
 * Used by grid operations to validate coordinates.
 * 
 * @param row - Row coordinate
 * @param col - Column coordinate
 * @returns True if in bounds; false otherwise
 */
export type InBoundsCallback = (row: number, col: number) => boolean;

/**
 * Generates additional cells for corner coverage in line drawing.
 * 
 * Called when both X and Y axes advance simultaneously.
 * Yields additional cell indices for super-cover algorithms.
 * 
 * @yields Additional grid indices for corner coverage
 */
export type CornerHandler = () => Generator<number, void, unknown>;

/**
 * Calculates line drawing parameters from endpoints.
 * 
 * Returns delta distances and step directions for Bresenham algorithm.
 * 
 * @param endX - End X coordinate
 * @param startX - Start X coordinate
 * @param endY - End Y coordinate
 * @param startY - Start Y coordinate
 * @returns LineParameters with deltaX, deltaY, stepX, stepY
 */
export type LineParametersCalculator = (
  endX: number,
  startX: number,
  endY: number,
  startY: number
) => LineParameters;

/**
 * Renders cells for pie/circle drawing.
 * 
 * Called for each cell in circular region to apply drawing operation.
 * 
 * @param canvas - Target canvas/surface
 * @param cosAngle - Cosine of angle to cell
 * @param vLen - Vector length to cell
 * @param x - X coordinate
 * @param y - Y coordinate
 */
export type PieDrawer = (
  canvas: unknown,
  cosAngle: number,
  vLen: number,
  x: number,
  y: number
) => void;

/**
 * Callback for handling shape variants.
 * 
 * Called when processing different rotations/reflections of a shape.
 * 
 * @param variantIndex - Index of variant being processed
 * @param bits - Bitboard representation of variant
 * @returns Continue processing true; false to skip
 */
export type VariantHandler = (
  variantIndex: number,
  bits: unknown
) => boolean;

/**
 * Generator yielding coordinates during traversal.
 * 
 * Used by line drawing and path algorithms.
 * 
 * @yields [x, y, stepCount] coordinate with traversal progress
 */
export type CoordinateGenerator = () => Generator<
  [x: number, y: number, step: number],
  void,
  unknown
>;
