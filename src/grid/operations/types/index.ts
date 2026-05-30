/**
 * @fileoverview Barrel export for grid operations types.
 *
 * Central export point for all type definitions used throughout
 * the grid operations module. Enables clean, single-import syntax
 * for dependent code.
 *
 * @example
 * // Instead of:
 * import type { MaskInstance } from '../types/mask-instance.types.js';
 * import type { BlitOptions } from '../types/operations.types.js';
 *
 * // Use:
 * import type { MaskInstance, BlitOptions } from '../types/index.js';
 */

// Coordinate and spatial types
export type { Coordinate, CoordinatePair, CoordinateWithValue, BoundingBox, CoordinateRange, LocationRange } from './coordinates.types.js';

// Mask instance interface definitions
export type {
  BaseMask,
  DimensionedMask,
  OccupancyMask,
  IndexedMask,
  MorphologyMask,
  CompleteMask,
  MaskLike,
  MaskInstance,
} from './mask-instance.types.js';

// Operation-specific types
export type {
  SourceGrid,
  BlitOptions,
  EdgeMaskCollection,
  MorphologyOperation,
  MorphologyDiff,
  MorphologyCheck,
  ErosionConstraints,
  DilationSource,
} from './operations.types.js';

// Validation and error types
export type {
  ValidationError,
  ValidationResult,
  ValidationResultWithData,
  CompatibilityCheck,
  StateValidation,
  DimensionValidation,
  ValidationType,
  ValidationContext,
} from './validation.types.js';

// Shared utility types
export type {
  StoreLike,
  CloneSource,
  CellCallback,
  CellReducer,
  CellPredicate,
  CellTransform,
  InBoundsCallback,
  OperationResult,
  BitIndicesIterable,
  ErosionConstraint,
  NeighborhoodPattern,
  RowRange,
} from './shared.types.js';
