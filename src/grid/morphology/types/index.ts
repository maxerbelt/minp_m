/**
 * Morphology type definitions - barrel export.
 *
 * Provides a single entry point for all type definitions used in morphological
 * operations. Enables clean imports: `import type { ... } from './types'`
 *
 * @module types/index
 */

// ============================================================================
// Core Bitboard Types
// ============================================================================
export type {
  Bitboard,
  BitValue,
  BitShiftOffset,
  MorphologyRadius,
  GridDimensions,
  GridCoordinate,
  CellWithValue,
  OperationResult,
} from './bitboard.types.js';

// ============================================================================
// Mask & Indexer Types
// ============================================================================
export type {
  EdgeMaskCollection,
  GridIndexer,
  HexIndexer,
  BaseMask,
  RectMask,
  HexMask,
  GenericMask,
  AnyMask,
} from './masks.types.js';

// ============================================================================
// Store Backend Types
// ============================================================================
export type {
  BaseStore,
  SingleBitStore,
  MultiColorStore,
  GenericStore,
  AnyStore,
} from './stores.types.js';

// ============================================================================
// Operation Types
// ============================================================================
export type {
  MorphologyOptions,
  DilationOptions,
  ErosionOptions,
  MorphologyResult,
  MaskOperationResult,
  DilationMutating,
  DilationNonMutating,
  ErosionMutating,
  ErosionNonMutating,
  CrossDilationMutating,
  CrossDilationNonMutating,
  MorphologyOperations,
  FluentMorphology,
} from './operations.types.js';

// ============================================================================
// Strategy Pattern Types
// ============================================================================
export type {
  MorphologyStrategy,
  RectangularMorphologyStrategy,
  HexagonalMorphologyStrategy,
  StoreMorphologyStrategy,
  MorphologyFactory,
  MorphologyAdapter,
  MorphologyConfig,
  MorphologyContext,
} from './strategies.types.js';
