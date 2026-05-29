/**
 * Type definitions for the core module.
 *
 * This barrel export aggregates all type definitions from the types folder
 * for convenient centralized importing. Use individual type files directly
 * for more granular type-only imports to minimize dependencies.
 *
 * @example
 * // Using barrel export
 * import type { Position, GridMask } from './types/index.js'
 *
 * @example
 * // Direct import (preferred for smaller dependencies)
 * import type { Position } from './types/common.types.js'
 * import type { GridMask } from './types/grid.types.js'
 */

// Common/shared types
export type {
  Coordinate,
  Position,
  MinMaxBounds,
  StringifyOptions,
  Bitboard,
  TypeString,
  Pair,
  Tuple,
} from './common.types.js';

// Animation types
export type {
  AnimationState,
  AnimationElements,
  AnimationConfig,
  AnimationResult,
  AnimationTarget,
  AnimationEndCallback,
  AnimationClass,
  AnimationTiming,
} from './animation.types.js';

// Audio types
export type {
  PlaybackOptions,
  AudioNodes,
  AudioBufferEntry,
  LazyAudioConfig,
  AudioPlaybackResult,
  AudioLoadStatus,
  AudioPlaybackState,
} from './audio.types.js';

// Async/Delay types
export type {
  CancellationCheck,
  CancellationCallback,
  ErrorCallback,
  CompletionCallback,
  IterationTask,
  LoopConfig,
  LoopResult,
  TimingConfig,
  DelayRange,
} from './async.types.js';

// Grid/Morphology types
export type {
  MorphologyOperation,
  MorphologyCapabilities,
  TransformCapabilities,
  TransformActions,
  GridMask,
  MaskLike,
  PackedLike,
  StoreLike,
  CloneSource,
  MorphologyMask,
  MorphologyDiff,
  GridIndexer,
  MorphologyCheck,
} from './grid.types.js';

// Utility types
export type {
  RandomSelector,
  SortedCoordinates,
  DistanceInfo,
  ShuffleResult,
  CSVParseOptions,
  CSVRow,
  CSVData,
  LazyProperty,
  LazyPropertyEntry,
  KeyCoordPair,
  CoordinateRange,
  StringCase,
  TextAlignment,
  Padding,
} from './utility.types.js';
