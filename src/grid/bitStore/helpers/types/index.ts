/**
 * @file types/index.ts - Barrel export for all bitStore helper types
 *
 * Central export point for TypeScript type definitions used by the
 * bitStore helper modules. This enables clean imports:
 *
 * @example
 * // Instead of:
 * import type { Bitboard } from './types/bitboard.types'
 * import type { BitStore } from './types/store.types'
 *
 * // You can use:
 * import type { Bitboard, BitStore } from './types'
 */

// Core bitboard types
export type {
  Bitboard,
  BitPosition,
  BitValue,
  BitPositionGenerator,
  BitIterationCallback,
  CoordinateGenerator,
  CoordinateValueGenerator,
  BitMask,
  ColorValue,
  BitsPerCell,
  SupportedColorDepth,
} from './bitboard.types';

// Store interface definitions
export type {
  BitStore,
  StoreBigInstance,
  Store32Instance,
} from './store.types';

// Morphology operation types
export type {
  EdgeMasks,
  EdgeMasksArray,
  ConstraintPair,
  ConstraintPairArray,
  ErosionConstraints,
  ErosionConstraintsArray,
  VerticalShiftResults,
  VerticalShiftResultsArray,
  MorphologyOptions,
  MorphologyResult,
} from './morphology.types';

// Grid and coordinate types
export type {
  Coordinate,
  CoordinateWithValue,
  GridDimensions,
  GridBounds,
  IndexCoordinateConverter,
  BitGridOptions,
  GridIterationContext,
  GridIterationCallback,
  GridCellPredicate,
  GridStatistics,
} from './grid.types';

// Color extraction and storage types
export type {
  SingleBitStore,
  MultiColorStore,
  ColorLayerMask,
  ColorExtractionContext,
  ExtractedColorLayer,
  ColorDecomposition,
  ColorOperationOptions,
  ColorPalette,
} from './color.types';
