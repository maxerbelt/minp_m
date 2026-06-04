/**
 * Morphological operation type definitions.
 *
 * Defines parameters, options, and patterns for dilation, erosion, and
 * related morphological operations on grid structures.
 *
 * @module types/operations
 */

import type { Bitboard, MorphologyRadius } from './bitboard.types.js';
import type { BaseMask, AnyMask } from './masks.types.js';

/**
 * Parameters for morphological operations.
 *
 * @interface MorphologyOptions
 */
export interface MorphologyOptions {
  /** Number of expansion/contraction steps */
  radius?: MorphologyRadius;

  /** Whether to mutate the original mask or return new bits */
  mutate?: boolean;

  /** Whether to preserve the original state for rollback */
  preserveOriginal?: boolean;
}

/**
 * Dilation-specific options.
 *
 * @interface DilationOptions
 */
export interface DilationOptions extends MorphologyOptions {
  /** Type of dilation: 'separable' (fast), 'non-separable' (all 8 neighbors), or 'cross' (4 neighbors) */
  dilationType?: 'separable' | 'non-separable' | 'cross';

  /** Whether to use edge masking to prevent wrap-around */
  respectBoundaries?: boolean;
}

/**
 * Erosion-specific options.
 *
 * @interface ErosionOptions
 */
export interface ErosionOptions extends MorphologyOptions {
  /** Type of erosion: 'constrained' (requires all neighbors) or 'fast' (bit-shift based) */
  erosionType?: 'constrained' | 'fast';

  /** Whether to clamp at boundaries instead of extending erosion beyond grid */
  clampToBoundaries?: boolean;
}

/**
 * Result of a morphological operation.
 *
 * Tracks both the output and metadata about the operation.
 *
 * @interface MorphologyResult
 */
export interface MorphologyResult {
  /** Resulting bitboard after operation */
  readonly bits: Bitboard;

  /** Whether operation succeeded */
  readonly success: boolean;

  /** Original bitboard (if preserved) */
  readonly original?: Bitboard;

  /** Diagnostic message (errors, warnings, etc.) */
  readonly message?: string;

  /** Duration of operation in milliseconds (if timing enabled) */
  readonly durationMs?: number;
}

/**
 * Mutation-capable operation result.
 *
 * @interface MaskOperationResult
 */
export interface MaskOperationResult {
  /** Modified mask instance */
  readonly mask: BaseMask;

  /** Operation succeeded */
  readonly success: boolean;

  /** Diagnostic message */
  readonly message?: string;
}

/**
 * Dilation operation signature - mutating variant.
 *
 * @interface DilationMutating
 */
/**
   * Dilate mask in-place and return for chaining
   *
   * @param radius - Number of expansion steps
   * @returns This mask (mutated)
   */
export type DilationMutating = (radius?: MorphologyRadius) => BaseMask;

/**
 * Dilation operation signature - non-mutating variant.
 *
 * @interface DilationNonMutating
 */
/**
   * Dilate and return new bits without mutation
   *
   * @param radius - Number of expansion steps
   * @returns New dilated bitboard
   */
export type DilationNonMutating = (radius?: MorphologyRadius) => Bitboard;

/**
 * Erosion operation signature - mutating variant.
 *
 * @interface ErosionMutating
 */
/**
   * Erode mask in-place and return for chaining
   *
   * @param radius - Number of contraction steps
   * @returns This mask (mutated)
   */
export type ErosionMutating = (radius?: MorphologyRadius) => BaseMask;

/**
 * Erosion operation signature - non-mutating variant.
 *
 * @interface ErosionNonMutating
 */
/**
   * Erode and return new bits without mutation
   *
   * @param radius - Number of contraction steps
   * @returns New eroded bitboard
   */
export type ErosionNonMutating = (radius?: MorphologyRadius) => Bitboard;

/**
 * Cross dilation operation signature - mutating variant.
 *
 * Cross dilation expands in cardinal directions (4-connectivity) only,
 * excluding diagonal neighbors.
 *
 * @interface CrossDilationMutating
 */
/**
   * Apply cross dilation in-place
   *
   * @returns This mask (mutated)
   */
export type CrossDilationMutating = () => BaseMask;

/**
 * Cross dilation operation signature - non-mutating variant.
 *
 * @interface CrossDilationNonMutating
 */
/**
   * Apply cross dilation and return new bits
   *
   * @returns New cross-dilated bitboard
   */
export type CrossDilationNonMutating = () => Bitboard;

/**
 * Morphology operation class contract.
 *
 * All morphology operation classes (HexMorphologyOps, RectMorphologyOps, etc.)
 * follow this interface pattern.
 *
 * @interface MorphologyOperations
 */
export interface MorphologyOperations {
  /** Reference to the mask being operated on */
  readonly mask: AnyMask;

  /** Reference to the storage backend */
  readonly store: any;

  /** Current bitboard state */
  readonly bits: Bitboard;

  // ========================================================================
  // Dilation
  // ========================================================================

  /**
   * Dilate (mutating variant)
   *
   * @param radius - Number of expansion steps
   * @returns This mask (mutated)
   */
  dilate(radius?: MorphologyRadius): AnyMask;

  /**
   * Dilate (non-mutating variant)
   *
   * @param radius - Number of expansion steps
   * @returns New dilated bitboard
   */
  dilateBits(radius?: MorphologyRadius): Bitboard;

  // ========================================================================
  // Erosion
  // ========================================================================

  /**
   * Erode (mutating variant)
   *
   * @param radius - Number of contraction steps
   * @returns This mask (mutated)
   */
  erode(radius?: MorphologyRadius): AnyMask;

  /**
   * Erode (non-mutating variant)
   *
   * @param radius - Number of contraction steps
   * @returns New eroded bitboard
   */
  erodeBits(radius?: MorphologyRadius): Bitboard;
}

/**
 * Morphology operation chain - fluent interface support.
 *
 * Enables chaining operations: `ops.dilate(2).erode(1).dilate(1)`
 *
 * @interface FluentMorphology
 */
export interface FluentMorphology {
  /** Current mask state */
  readonly current: BaseMask;

  /**
   * Apply dilation and continue chain
   *
   * @param radius - Number of expansion steps
   * @returns This (for chaining)
   */
  then(op: 'dilate', radius?: MorphologyRadius): FluentMorphology;

  /**
   * Apply erosion and continue chain
   *
   * @param radius - Number of contraction steps
   * @returns This (for chaining)
   */
  then(op: 'erode', radius?: MorphologyRadius): FluentMorphology;

  /**
   * Get final result and break chain
   *
   * @returns Final mask
   */
  done(): BaseMask;
}
