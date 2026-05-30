/**
 * Store backend type definitions for morphological operations.
 *
 * Stores handle low-level bit operations and storage. Different store
 * implementations (BigInt-based, Uint32Array-based) must implement these
 * interfaces to work with morphology operations.
 *
 * @module types/stores
 */

import type { Bitboard, BitValue, GridDimensions } from './bitboard.types.js';
import type { EdgeMaskCollection } from './masks.types.js';

/**
 * Common store interface - minimum capabilities required.
 *
 * All stores must support these core features regardless of bit representation.
 *
 * @interface BaseStore
 */
export interface BaseStore extends GridDimensions {
  /** Bits per cell (1 for single-bit, >1 for multi-bit/colored) */
  readonly bitsPerCell: number;

  /** True if this store handles multi-bit (colored) cells */
  readonly isMultiBit?: boolean;

  /** True if this store handles single-bit (occupancy-only) cells */
  readonly isSingleBit?: boolean;

  /**
   * Get cell value at linear index
   *
   * @param bits - Bitboard to read from
   * @param index - Linear cell index
   * @returns Cell value (0-based, 0 means unoccupied)
   */
  getIdx(bits: Bitboard, index: number): BitValue;

  /**
   * Set cell value at linear index
   *
   * @param bits - Bitboard to modify
   * @param index - Linear cell index
   * @param value - Value to set (0-based)
   * @returns Modified bitboard
   */
  setIdx(bits: Bitboard, index: number, value: BitValue): Bitboard;

  /**
   * Create default edge masks for this store's grid
   *
   * @returns Edge mask collection (or undefined if not needed)
   */
  _createDefaultEdgeMasks?(): EdgeMaskCollection | undefined;
}

/**
 * Single-bit store interface - occupancy-only operations.
 *
 * Optimized for 1 bit per cell (only occupancy matters, no color).
 * Uses fast bit-shift operations with edge masking.
 *
 * @interface SingleBitStore
 */
export interface SingleBitStore extends BaseStore {
  /** Always true for single-bit stores */
  readonly isSingleBit: true;

  /** Always 1 for single-bit stores */
  readonly bitsPerCell: 1;

  // ========================================================================
  // Dilation Operations - Separable Approach
  // ========================================================================

  /**
   * 1D horizontal dilation via bit shift
   *
   * @param bits - Input bitboard
   * @param radius - Number of steps (often single step)
   * @param edgeMasks - Boundary masks to prevent wrap-around
   * @returns Horizontally dilated bitboard
   */
  dilate1D_horizontal(
    bits: Bitboard,
    radius: number,
    edgeMasks?: EdgeMaskCollection
  ): Bitboard;

  /**
   * 1D vertical dilation via bit shift
   *
   * @param bits - Input bitboard
   * @param gridWidth - Grid width (for row offset calculation)
   * @param radius - Number of steps (often single step)
   * @param edgeMasks - Boundary masks to prevent wrap-around
   * @returns Vertically dilated bitboard
   */
  dilate1D_vertical(
    bits: Bitboard,
    gridWidth: number,
    radius: number,
    edgeMasks?: EdgeMaskCollection
  ): Bitboard;

  /**
   * Cross dilation - cardinal directions only (4-connectivity)
   *
   * @param bits - Input bitboard
   * @param edgeMasks - Boundary masks
   * @param gridWidth - Grid width
   * @param gridHeight - Grid height
   * @returns Cross-dilated bitboard
   */
  dilateCrossStep(
    bits: Bitboard,
    edgeMasks: EdgeMaskCollection | undefined,
    gridWidth: number,
    gridHeight: number
  ): Bitboard;

  // ========================================================================
  // Dilation Operations - Non-Separable (All Neighbors At Once)
  // ========================================================================

  /**
   * Prepare bits for left expansion (mask off right edge)
   *
   * @param bits - Input bitboard
   * @param edgeMasks - Boundary masks
   * @returns Prepared bits for left shift
   */
  prepareSrcForLeftExpansion(
    bits: Bitboard,
    edgeMasks?: EdgeMaskCollection
  ): Bitboard;

  /**
   * Prepare bits for right expansion (mask off left edge)
   *
   * @param bits - Input bitboard
   * @param edgeMasks - Boundary masks
   * @returns Prepared bits for right shift
   */
  prepareSrcForRightExpansion(
    bits: Bitboard,
    edgeMasks?: EdgeMaskCollection
  ): Bitboard;

  /**
   * Prepare bits for up expansion (mask off bottom edge)
   *
   * @param bits - Input bitboard
   * @param edgeMasks - Boundary masks
   * @returns Prepared bits for up shift
   */
  prepareSrcForUpExpansion(
    bits: Bitboard,
    edgeMasks?: EdgeMaskCollection
  ): Bitboard;

  /**
   * Prepare bits for down expansion (mask off top edge)
   *
   * @param bits - Input bitboard
   * @param edgeMasks - Boundary masks
   * @returns Prepared bits for down shift
   */
  prepareSrcForDownExpansion(
    bits: Bitboard,
    edgeMasks?: EdgeMaskCollection
  ): Bitboard;

  /**
   * Shift bits by offset (negative = right, positive = left)
   *
   * @param bits - Input bitboard
   * @param offset - Number of positions to shift
   * @returns Shifted bitboard
   */
  shiftBits(bits: Bitboard, offset: number): Bitboard;

  /**
   * Combine shifted patterns with masking
   *
   * @param original - Original bitboard
   * @param left - Left-shifted variant
   * @param right - Right-shifted variant
   * @param up - Up-shifted variant
   * @param down - Down-shifted variant
   * @returns Combined/merged bitboard
   */
  combineMasked(
    original: Bitboard,
    left: Bitboard,
    right: Bitboard,
    up: Bitboard,
    down: Bitboard
  ): Bitboard;

  // ========================================================================
  // Erosion Operations - Constraint-Based Approach
  // ========================================================================

  /**
   * Horizontal erosion with clamping at grid boundaries
   *
   * @param bits - Input bitboard
   * @param radius - Number of erosion steps
   * @param edgeMasks - Boundary masks for clamping
   * @returns Horizontally eroded bitboard
   */
  erodeHorizontalClamp(
    bits: Bitboard,
    radius: number,
    edgeMasks?: EdgeMaskCollection
  ): Bitboard;

  /**
   * Vertical erosion with clamping at grid boundaries
   *
   * @param bits - Input bitboard
   * @param gridWidth - Grid width (for row offset)
   * @param radius - Number of erosion steps
   * @param edgeMasks - Boundary masks for clamping
   * @returns Vertically eroded bitboard
   */
  erodeVerticalClamp(
    bits: Bitboard,
    gridWidth: number,
    radius: number,
    edgeMasks?: EdgeMaskCollection
  ): Bitboard;

  /**
   * Compute left/right erosion constraint mask
   *
   * @param bits - Input bitboard
   * @param edgeMasks - Boundary masks
   * @param bitShift - Bit shift for cell boundaries
   * @returns Constraint mask for horizontal erosion
   */
  computeHorizontalErodeConstraints?(
    bits: Bitboard,
    edgeMasks: EdgeMaskCollection | undefined,
    bitShift: number
  ): Bitboard;

  /**
   * Compute up/down erosion constraint mask
   *
   * @param bits - Input bitboard
   * @param gridWidth - Grid width (for row offset)
   * @param edgeMasks - Boundary masks
   * @returns Constraint mask for vertical erosion
   */
  computeVerticalErodeConstraints?(
    bits: Bitboard,
    gridWidth: number,
    edgeMasks: EdgeMaskCollection | undefined
  ): Bitboard;
}

/**
 * Multi-bit (colored) store interface - per-cell color propagation.
 *
 * Optimized for cells with color values (depth > 1).
 * Uses per-cell iteration instead of bit shifts since colors don't
 * propagate well through bit operations.
 *
 * @interface MultiColorStore
 */
export interface MultiColorStore extends BaseStore {
  /** Always true for multi-color stores */
  readonly isMultiBit: true;

  /** Bits per cell (>1 for colored) */
  readonly bitsPerCell: number;

  // ========================================================================
  // Color Propagation - Dilation
  // ========================================================================

  /**
   * Expand cell colors horizontally (left/right neighbors)
   *
   * @param bits - Input bitboard with colors
   * @returns Horizontally expanded bitboard
   */
  expandHorizontallyCellwise?(bits: Bitboard): Bitboard;

  /**
   * Propagate cell colors vertically (up/down neighbors)
   *
   * @param bits - Input bitboard with colors
   * @param gridWidth - Grid width (for row offset)
   * @returns Vertically propagated bitboard
   */
  propagateVerticalCellwise?(bits: Bitboard, gridWidth: number): Bitboard;

  // ========================================================================
  // Color Removal - Erosion
  // ========================================================================

  /**
   * Erode colors horizontally (require left/right neighbors)
   *
   * @param bits - Input bitboard with colors
   * @returns Horizontally eroded bitboard
   */
  erodeHorizontalCellwise?(bits: Bitboard): Bitboard;

  /**
   * Erode colors vertically (require up/down neighbors)
   *
   * @param bits - Input bitboard with colors
   * @param gridWidth - Grid width (for row offset)
   * @returns Vertically eroded bitboard
   */
  erodeVerticalCellwise?(bits: Bitboard, gridWidth: number): Bitboard;
}

/**
 * Generic store interface - flexible during development.
 *
 * Allows implementations to provide custom methods beyond standard interfaces.
 * Prefer SingleBitStore or MultiColorStore in production code.
 *
 * @interface GenericStore
 */
export interface GenericStore extends BaseStore {
  /** Allow arbitrary methods for flexibility */
  [key: string]: any;
}

/**
 * Discriminated union of all store types.
 *
 * @typedef {SingleBitStore | MultiColorStore | GenericStore} AnyStore
 */
export type AnyStore = SingleBitStore | MultiColorStore | GenericStore;
