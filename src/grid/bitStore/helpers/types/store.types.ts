/**
 * @file store.types.ts - Bitboard store interface definitions
 *
 * Defines the contract for different bitboard storage implementations:
 * - BitStore: Generic store interface for BitGrid
 * - StoreBigInstance: BigInt-based storage for BigStoreMorphology
 * - Store32Instance: Uint32Array-based storage for Store32Morphology
 *
 * These interfaces define method signatures and properties that storage
 * implementations must provide for morphological operations.
 */

import type { Bitboard, BitPosition, BitValue, ColorValue, BitsPerCell, BitMask } from './bitboard.types';

/**
 * Generic bitboard store interface used by BitGrid.
 *
 * Defines minimal contract for bit access operations. Implementations may be
 * BigInt-based, Uint32Array-based, or other formats.
 *
 * @interface BitStore
 * @property {number} [width] - Grid width in cells (optional)
 * @property {number} [height] - Grid height in cells (optional)
 * @property {number} [bitWidth] - Bit width per cell (1 for boolean, >1 for multi-color)
 */
export interface BitStore {
  /**
   * Grid width in cells (optional - may be stored in parent context).
   */
  width?: number;

  /**
   * Grid height in cells (optional - may be stored in parent context).
   */
  height?: number;

  /**
   * Bit width per cell.
   * 1 for single-bit (boolean) cells, >1 for multi-color cells.
   */
  bitWidth?: number;

  /**
   * Get cell value at index.
   * @param bitboard - The bitboard to read from
   * @param index - Cell index (0 to width*height-1)
   * @returns Cell value as BigInt
   */
  getIdx(bitboard: Bitboard, index: BitPosition): bigint;

  /**
   * Check if bit/cell is set (non-zero) at index.
   * @param bitboard - The bitboard to check
   * @param index - Cell index
   * @returns true if cell has a non-zero value
   */
  hasIdxSet(bitboard: Bitboard, index: BitPosition): boolean;

  /**
   * Set cell value at index (returns new bitboard or modifies in-place).
   * @param bitboard - The bitboard to modify
   * @param index - Cell index
   * @param value - New cell value
   * @returns Modified bitboard (or same reference if mutating)
   */
  setIdx(bitboard: Bitboard, index: BitPosition, value: bigint): Bitboard;

  /**
   * Optional: Fast path for iterating occupied (non-zero) cell indices.
   * Provides optimization for 1-bit stores via sparse iteration.
   * @param bitboard - The bitboard to iterate
   * @param area - Total number of cells
   * @returns Generator yielding indices of occupied cells
   */
  bitsOccupied?(bitboard: Bitboard, area: number): Generator<BitPosition>;

  /**
   * Optional: Generate row mask for boundary operations.
   * Used in some morphological algorithms.
   * @param width - Row width in cells
   * @returns Mask covering one row
   */
  rowMaskForWidth?(width: number): BitMask;
}

/**
 * BigInt-based store instance used by BigStoreMorphology.
 *
 * Represents a concrete BigInt storage implementation with all methods
 * required for morphological operations (dilation, erosion, etc).
 *
 * @interface StoreBigInstance
 */
export interface StoreBigInstance {
  /**
   * Grid width in cells.
   */
  width: number;

  /**
   * Grid height in cells.
   */
  height: number;

  /**
   * Bits allocated per cell (1, 2, 4, or 8 for color depth).
   */
  bitsPerCell: BitsPerCell;

  /**
   * Mask covering all bits in the bitboard.
   * Computed as (1 << (width * height * bitsPerCell)) - 1.
   */
  fullBits: bigint;

  /**
   * Iterator object providing access to occupied cell indices and values.
   * Used for efficient iteration in morphological operations.
   */
  all: {
    occupiedIndexAndValues(
      bitboard: bigint,
    ): Generator<[BitPosition, ColorValue]>;
  };

  /**
   * Set cell value at index.
   * @param bitboard - Source bitboard
   * @param index - Cell index
   * @param value - New value
   * @returns Modified bitboard
   */
  setIdx(bitboard: bigint, index: BitPosition, value: ColorValue): bigint;

  /**
   * Get cell value at index.
   * @param bitboard - Source bitboard
   * @param index - Cell index
   * @returns Cell value
   */
  getIdx(bitboard: bigint, index: BitPosition): ColorValue;

  /**
   * Perform signed shift on bitboard (positive = left, negative = right).
   * @param bitboard - Source bitboard
   * @param shift - Shift amount (negative shifts right)
   * @returns Shifted bitboard
   */
  shiftBits(bitboard: bigint, shift: number): bigint;

  /**
   * Combine multiple masked bitboard values with OR operation.
   * Used to merge dilation results.
   * @param operands - Bitboards to combine
   * @returns Combined bitboard
   */
  combineMasked(...operands: bigint[]): bigint;

  /**
   * Prepare source bitboard for upward expansion (apply edge masks if needed).
   * @param bitboard - Source bitboard
   * @param edgeMasks - Optional edge masks
   * @returns Prepared bitboard
   */
  prepareSrcForUpExpansion(
    bitboard: bigint,
    edgeMasks?: any,
  ): bigint;

  /**
   * Prepare source bitboard for downward expansion.
   * @param bitboard - Source bitboard
   * @param edgeMasks - Optional edge masks
   * @returns Prepared bitboard
   */
  prepareSrcForDownExpansion(
    bitboard: bigint,
    edgeMasks?: any,
  ): bigint;

  /**
   * Test if cell survives horizontal erosion (has both left and right neighbors).
   * @param bitboard - Source bitboard
   * @param idx - Cell index
   * @returns true if cell survives
   */
  cellSurvivesHorizontalErosion(
    bitboard: bigint,
    idx: BitPosition,
  ): boolean;

  /**
   * Test if cell survives vertical erosion (has both top and bottom neighbors).
   * @param bitboard - Source bitboard
   * @param idx - Cell index
   * @returns true if cell survives
   */
  cellSurvivesVerticalErosion(
    bitboard: bigint,
    idx: BitPosition,
  ): boolean;
}

/**
 * Uint32Array-based store instance used by Store32Morphology.
 *
 * Represents a Uint32Array storage implementation for large grids
 * with all methods required for morphological operations.
 *
 * @interface Store32Instance
 */
export interface Store32Instance {
  /**
   * Grid width in cells.
   */
  width: number;

  /**
   * Grid height in cells.
   */
  height: number;

  /**
   * Total grid size (width × height).
   */
  size: number;

  /**
   * Bits allocated per cell (1, 2, 4, or 8).
   */
  bitsPerCell: BitsPerCell;

  /**
   * Mask array covering all bits in the bitboard.
   * Each word contains 32 bits.
   */
  fullBits: Uint32Array;

  /**
   * Get cell value at index.
   * @param bitboard - Source bitboard
   * @param index - Cell index
   * @returns Cell value
   */
  getIdx(bitboard: Uint32Array, index: BitPosition): ColorValue;

  /**
   * Set cell value at index (mutating operation).
   * @param bitboard - Source bitboard (modified in-place)
   * @param index - Cell index
   * @param value - New value
   * @returns Same bitboard reference (after modification)
   */
  setAtIdx(bitboard: Uint32Array, index: BitPosition, value: ColorValue): Uint32Array;

  /**
   * Perform signed shift on bitboard array.
   * @param bitboard - Source bitboard
   * @param shift - Shift amount
   * @returns Shifted bitboard (may be new array or same reference)
   */
  shiftBits(bitboard: Uint32Array, shift: number): Uint32Array;

  /**
   * Bitwise AND operation on arrays.
   * @param a - First bitboard
   * @param b - Second bitboard
   * @returns Result of a & b
   */
  bitAnd(a: Uint32Array, b: Uint32Array): Uint32Array;

  /**
   * Bitwise OR operation on arrays.
   * @param a - First bitboard
   * @param b - Second bitboard
   * @returns Result of a | b
   */
  bitOr(a: Uint32Array, b: Uint32Array): Uint32Array;

  /**
   * Create an empty (zeroed) bitboard array.
   * @returns New Uint32Array with all zeros
   */
  createEmptyBitboard(): Uint32Array;

  /**
   * Test if cell survives horizontal erosion.
   * @param bitboard - Source bitboard
   * @param idx - Cell index
   * @returns true if cell survives
   */
  cellSurvivesHorizontalErosion(
    bitboard: Uint32Array,
    idx: BitPosition,
  ): boolean;

  /**
   * Test if cell survives vertical erosion.
   * @param bitboard - Source bitboard
   * @param idx - Cell index
   * @returns true if cell survives
   */
  cellSurvivesVerticalErosion(
    bitboard: Uint32Array,
    idx: BitPosition,
  ): boolean;

  /**
   * Internal helper: Create inverted edge mask.
   * @param edgeMasks - Edge masks config
   * @param maskKey - Mask key to invert
   * @returns Inverted mask
   */
  _createInvertedMask(
    edgeMasks: any | undefined,
    maskKey: string,
  ): Uint32Array;

  /**
   * Internal helper: Compute vertical constraint from shift.
   * @param bitboard - Source bitboard
   * @param bitShift - Shift amount
   * @param invertedMask - Inverted edge mask
   * @returns Constraint bitboard
   */
  _computeVerticalConstraintFromShift(
    bitboard: Uint32Array,
    bitShift: number,
    invertedMask: Uint32Array,
  ): Uint32Array;

  /**
   * Internal helper: Calculate vertical bit shift from grid width.
   * @param gridWidth - Grid width in cells
   * @returns Bit shift amount for vertical operations
   */
  _calculateVerticalBitShift(gridWidth: number): number;
}
