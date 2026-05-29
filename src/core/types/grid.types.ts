/**
 * Grid, bitboard, and morphological operation types for mask manipulation and cell-based grids.
 */

import type { Bitboard } from './common.types.js';

/**
 * Morphological operation type.
 * - `dilate`: Expand mask (add boundary cells)
 * - `erode`: Shrink mask (remove boundary cells)
 * - `cross`: Erosion followed by dilation
 */
export type MorphologyOperation = 'dilate' | 'erode' | 'cross';

/**
 * Capabilities indicating which morphological operations would have an effect.
 */
export interface MorphologyCapabilities {
  /** Whether dilate operation would expand the mask */
  canDilate: boolean;
  /** Whether erode operation would shrink the mask */
  canErode: boolean;
  /** Whether cross operation would change the mask */
  canCross: boolean;
}

/**
 * Capabilities indicating which geometric transforms would have an effect.
 */
export interface TransformCapabilities {
  /** Whether 90° clockwise rotation would change mask */
  canRotateCW: boolean;
  /** Whether 90° counter-clockwise rotation would change mask */
  canRotateCCW: boolean;
  /** Whether horizontal flip (mirror across Y axis) would change mask */
  canFlipH: boolean;
  /** Whether vertical flip (mirror across X axis) would change mask */
  canFlipV: boolean;
}

/**
 * Transform maps and methods for symmetry operations.
 * Used by GridState to apply geometric transformations.
 */
export interface TransformActions {
  /** Transformation maps indexed by transform type (e.g., 'r90', 'r270', 'fx', 'fy') */
  transformMaps: Record<string, any>;
  /** Template bitboard used for transform comparison */
  template: Bitboard;
  /** Function to apply a transform map and return result bitboard */
  applyMap?: (map: any) => Bitboard;
  /** Function returning symmetry classification (e.g., 'C4', 'D2') */
  classifyOrbitType?: () => string;
}

/**
 * Complete mask object with bitboard representation and metadata.
 * Used throughout grid operations for storing cell occupancy and state.
 */
export interface GridMask {
  /** Bitboard representing current mask state */
  bits: Bitboard;
  /** Optional full mask bitboard for capacity checking */
  fullMask?: Bitboard;
  /** Optional empty mask bitboard for comparison */
  emptyMask?: Bitboard;
  /** Optional actions object with transform maps and methods */
  actions?: TransformActions | null;
  /** Optional pre-computed clone for non-mutating operations */
  clone?: Bitboard;
}

/**
 * Mask-like object for morphology operations.
 * Combines bits with grid dimensions and optional helpers.
 */
export interface MaskLike {
  /** Bitboard state */
  bits: Bitboard;
  /** Grid width in cells */
  width: number;
  /** Grid height in cells */
  height: number;
  /** Optional depth/color layers for multi-bit masks */
  depth?: number;
  /** Optional store for advanced bitboard operations */
  store?: StoreLike;
  /** Optional grid indexer (rect, hex, etc.) */
  indexer?: any;
  /** Optional pre-allocated clone for mutation */
  clone?: Bitboard;
}

/**
 * Packed grid object with per-cell access methods.
 * Extends MaskLike with accessor functions.
 */
export interface PackedLike extends MaskLike {
  /** Function to get cell value at (x, y) */
  at?: (x: number, y: number) => any;
  /** Function to set cell value at (x, y) */
  set?: (x: number, y: number, value: any) => void;
}

/**
 * Store object providing bitboard manipulation operations.
 * Used by grid structures for efficient bit-level operations.
 */
export interface StoreLike {
  /** Creates new word array for this store type */
  newWords: (count: number) => any;
  /** Clones a bitboard value */
  clone: (bits: Bitboard) => Bitboard;
  /** Bitwise subtraction (remove bits) */
  bitSub: (a: Bitboard, b: Bitboard) => Bitboard;
  /** Optional function to set value at index */
  setIdx?: (bits: Bitboard, index: number, value: any) => void;
  /** Gets value from store */
  value: (bits: Bitboard) => any;
  /** Optional word count for this store's bitboards */
  words?: number;
  /** Optional function to set value in store */
  set?: (bits: Bitboard, value: any) => void;
  /** Optional function to get value at index */
  getIdx?: (bits: Bitboard, index: number) => any;
}

/**
 * Source object that may provide cloning helpers for bitboards.
 */
export interface CloneSource {
  /** Bitboard to clone */
  bits: Bitboard;
  /** Optional pre-cloned value */
  clone?: Bitboard;
  /** Optional pre-cloned bitboard copy */
  cloneBits?: Bitboard;
  /** Optional store with clone method */
  store?: StoreLike;
}

/**
 * Mask object specifically for morphology operations.
 * Combines bits with clone for non-mutating transformations.
 */
export interface MorphologyMask extends CloneSource {
  /** Current bitboard state */
  bits: Bitboard;
  /** Optional store for operations */
  store?: StoreLike;
  /** Optional grid indexer */
  indexer?: any;
}

/**
 * Result of morphology operation comparison.
 * Indicates which cells were added or removed.
 */
export interface MorphologyDiff {
  /** Cells added by the operation */
  added: Bitboard;
  /** Cells removed by the operation */
  removed: Bitboard;
  /** Whether the mask was changed */
  changed: boolean;
}

/**
 * Grid indexing strategy for coordinate conversion.
 */
export interface GridIndexer {
  /** Convert (x, y) to bit index */
  indexOf: (x: number, y: number) => number;
  /** Convert bit index to (x, y) */
  coordsOf: (index: number) => [number, number];
  /** Get grid width */
  width?: number;
  /** Get grid height */
  height?: number;
}

/**
 * Morphology check result indicating if operation would change mask.
 */
export interface MorphologyCheck {
  /** Whether operation would have an effect */
  wouldChange: boolean;
  /** Which operation was checked */
  operation: MorphologyOperation;
}
