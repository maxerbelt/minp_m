/**
 * @file morphology.types.ts - Morphological operation types
 *
 * Defines data structures for dilation, erosion, and related
 * morphological operations on bitboards.
 *
 * Separate type structures for BigInt and Uint32Array implementations
 * since edge masks have different types in each case.
 */

import type { BitMask } from './bitboard.types';

/**
 * Edge masks for boundary-aware morphological operations.
 *
 * Used by BigStoreMorphology to prevent expansion beyond grid edges.
 * Each mask marks cells that should NOT be expanded in a given direction.
 *
 * @interface EdgeMasks
 */
export interface EdgeMasks {
  /**
   * Mask preventing expansion beyond top edge.
   * Masks have value 0 (no expansion) or full bits (allow expansion).
   */
  notTop?: bigint | number | null;

  /**
   * Mask preventing expansion beyond bottom edge.
   */
  notBottom?: bigint | number | null;

  /**
   * Mask preventing expansion beyond left edge.
   */
  notLeft?: bigint | number | null;

  /**
   * Mask preventing expansion beyond right edge.
   */
  notRight?: bigint | number | null;
}

/**
 * Edge masks for Uint32Array-based stores.
 *
 * Same logical structure as EdgeMasks but uses Uint32Array for mask values.
 *
 * @interface EdgeMasksArray
 */
export interface EdgeMasksArray {
  /**
   * Mask preventing expansion beyond top edge (Uint32Array format).
   */
  notTop?: Uint32Array;

  /**
   * Mask preventing expansion beyond bottom edge.
   */
  notBottom?: Uint32Array;

  /**
   * Mask preventing expansion beyond left edge.
   */
  notLeft?: Uint32Array;

  /**
   * Mask preventing expansion beyond right edge.
   */
  notRight?: Uint32Array;
}

/**
 * Horizontal erosion constraints for BigInt stores.
 *
 * Represents left and right neighbor constraints computed from shifts.
 * Used internally by erosion algorithms.
 *
 * @interface ConstraintPair
 */
export interface ConstraintPair {
  /**
   * Constraint from left neighbor (or up for vertical).
   * Marks cells that have occupied left neighbors.
   */
  leftConstraint: bigint;

  /**
   * Constraint from right neighbor (or down for vertical).
   * Marks cells that have occupied right neighbors.
   */
  rightConstraint: bigint;
}

/**
 * Horizontal erosion constraints for Uint32Array stores.
 *
 * Same structure as ConstraintPair but with Uint32Array values.
 *
 * @interface ConstraintPairArray
 */
export interface ConstraintPairArray {
  /**
   * Constraint from left neighbor (Uint32Array format).
   */
  leftConstraint: Uint32Array;

  /**
   * Constraint from right neighbor (Uint32Array format).
   */
  rightConstraint: Uint32Array;
}

/**
 * Vertical erosion constraints for BigInt stores.
 *
 * Represents up and down neighbor constraints for vertical erosion.
 * Used internally in Store32Morphology.
 *
 * @interface ErosionConstraints
 */
export interface ErosionConstraints {
  /**
   * Constraint from cells above.
   * Marks cells that have occupied neighbors above.
   */
  upConstraint: bigint;

  /**
   * Constraint from cells below.
   * Marks cells that have occupied neighbors below.
   */
  downConstraint: bigint;
}

/**
 * Vertical erosion constraints for Uint32Array stores.
 *
 * Same structure as ErosionConstraints but with Uint32Array values.
 *
 * @interface ErosionConstraintsArray
 */
export interface ErosionConstraintsArray {
  /**
   * Constraint from cells above (Uint32Array format).
   */
  upConstraint: Uint32Array;

  /**
   * Constraint from cells below (Uint32Array format).
   */
  downConstraint: Uint32Array;
}

/**
 * Vertical shift results for BigInt stores.
 *
 * Represents upward and downward shifted bitboards
 * used in vertical dilation operations.
 *
 * @interface VerticalShiftResults
 */
export interface VerticalShiftResults {
  /**
   * Bitboard shifted upward.
   */
  upShifted: bigint;

  /**
   * Bitboard shifted downward.
   */
  downShifted: bigint;

  /**
   * Original bitboard (for combining with shifts).
   */
  original: bigint;
}

/**
 * Vertical shift results for Uint32Array stores.
 *
 * Same structure as VerticalShiftResults but with Uint32Array values.
 *
 * @interface VerticalShiftResultsArray
 */
export interface VerticalShiftResultsArray {
  /**
   * Bitboard shifted upward (Uint32Array format).
   */
  upShifted: Uint32Array;

  /**
   * Bitboard shifted downward (Uint32Array format).
   */
  downShifted: Uint32Array;

  /**
   * Original bitboard (Uint32Array format).
   */
  original: Uint32Array;
}

/**
 * Configuration for morphological operations.
 *
 * Controls how dilation/erosion operations behave with respect to grid boundaries.
 *
 * @interface MorphologyOptions
 */
export interface MorphologyOptions {
  /**
   * Apply edge masks to respect grid boundaries (true by default).
   */
  respectBoundaries?: boolean;

  /**
   * Pre-computed edge masks (if available).
   */
  edgeMasks?: EdgeMasks | EdgeMasksArray;

  /**
   * Grid width in cells (used for shift calculations).
   */
  gridWidth?: number;

  /**
   * Grid height in cells (used for boundary detection).
   */
  gridHeight?: number;
}

/**
 * Result of a morphological operation.
 *
 * Contains the resulting bitboard and metadata about the operation.
 *
 * @interface MorphologyResult
 */
export interface MorphologyResult {
  /**
   * The resulting bitboard after the operation.
   */
  result: bigint | Uint32Array;

  /**
   * Type of operation applied (e.g., 'dilate', 'erode').
   */
  operation: 'dilate' | 'erode' | 'open' | 'close' | 'custom';

  /**
   * Number of cells affected by the operation.
   */
  cellsAffected?: number;

  /**
   * Optional metadata about the operation.
   */
  metadata?: Record<string, any>;
}
