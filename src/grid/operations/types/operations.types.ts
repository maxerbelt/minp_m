/**
 * @fileoverview Operation-specific type definitions.
 *
 * Provides type definitions for:
 * - Blit operations and configuration
 * - Grid traversal and morphology
 * - Edge masks and boundary handling
 */
 
/**
 * Source grid interface for blitting operations.
 * Defines the contract that source grids must implement for blit operations.
 *
 * @interface SourceGrid
 */
export interface SourceGrid {
  /** Extract a range of bits from a specific row */
  sliceRow(row: number, startCol: number, endCol: number): bigint | Uint32Array;
}

/**
 * Complete blit operation configuration.
 * All parameters with sensible defaults for flexible blitting.
 *
 * @interface BlitOptions
 */
export interface BlitOptions {
  /** Source grid/mask with sliceRow method */
  src: SourceGrid;

  /** Column offset in source grid (default: 0) */
  srcX?: number;

  /** Row offset in source grid (default: 0) */
  srcY?: number;

  /** Width of region to copy in cells (default: 0) */
  width?: number;

  /** Height of region to copy in cells (default: 0) */
  height?: number;

  /** Destination column in target mask (default: 0) */
  dstX?: number;

  /** Destination row in target mask (default: 0) */
  dstY?: number;

  /** Blend mode for combining source with destination */
  mode?: 'copy' | 'or' | 'and' | 'xor';
}

/**
 * Edge mask collection for boundary-aware operations.
 * Defines which cells are on grid edges (top, bottom, left, right).
 * Used by dilation/erosion to prevent expansion beyond boundaries.
 *
 * @interface EdgeMaskCollection
 */
export interface EdgeMaskCollection {
  /** Mask for top edge boundary */
  readonly top?: bigint | Uint32Array;

  /** Mask for bottom edge boundary */
  readonly bottom?: bigint | Uint32Array;

  /** Mask for left edge boundary */
  readonly left?: bigint | Uint32Array;

  /** Mask for right edge boundary */
  readonly right?: bigint | Uint32Array;

  /** Inverted top edge mask (cells NOT on top edge) */
  readonly notTop?: bigint | Uint32Array;

  /** Inverted bottom edge mask (cells NOT on bottom edge) */
  readonly notBottom?: bigint | Uint32Array;

  /** Inverted left edge mask (cells NOT on left edge) */
  readonly notLeft?: bigint | Uint32Array;

  /** Inverted right edge mask (cells NOT on right edge) */
  readonly notRight?: bigint | Uint32Array;

  [key: string]: bigint | Uint32Array | undefined;
}

/**
 * Morphological operation type enumeration.
 * Represents supported morphological transformations on bitboards.
 *
 * @typedef {('dilate' | 'erode' | 'cross')} MorphologyOperation
 */
export type MorphologyOperation = 'dilate' | 'erode' | 'cross';

/**
 * Morphology result indicating which cells were affected.
 * Used to track changes made by morphological operations.
 *
 * @interface MorphologyDiff
 */
export interface MorphologyDiff {
  /** Cells added by the operation */
  added: bigint | Uint32Array;

  /** Cells removed by the operation */
  removed: bigint | Uint32Array;

  /** Whether operation had any effect */
  changed: boolean;
}

/**
 * Morphology check result.
 * Indicates whether a morphological operation would change the mask.
 *
 * @interface MorphologyCheck
 */
export interface MorphologyCheck {
  /** Whether operation would have an effect */
  wouldChange: boolean;

  /** Which operation was checked */
  operation: MorphologyOperation;
}

/**
 * Erosion constraint structure.
 * Holds computational constraints for horizontal/vertical erosion operations.
 *
 * @interface ErosionConstraints
 */
export interface ErosionConstraints {
  /** Left erosion constraint mask */
  leftConstraint?: bigint | Uint32Array;

  /** Right erosion constraint mask */
  rightConstraint?: bigint | Uint32Array;

  /** Up erosion constraint mask */
  upShifted?: bigint | Uint32Array;

  /** Down erosion constraint mask */
  downShifted?: bigint | Uint32Array;
}

/**
 * Dilation source preparation result.
 * Holds pre-processed bitboards for expansion operations.
 *
 * @interface DilationSource
 */
export interface DilationSource {
  /** Left-expanded source bitboard */
  left?: bigint | Uint32Array;

  /** Right-expanded source bitboard */
  right?: bigint | Uint32Array;

  /** Top-expanded source bitboard */
  top?: bigint | Uint32Array;

  /** Bottom-expanded source bitboard */
  bottom?: bigint | Uint32Array;
}
