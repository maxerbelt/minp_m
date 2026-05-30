/**
 * Core bitboard type definitions for grid morphology.
 *
 * Bitboards are efficient bit-packed representations of grid state where each
 * bit (or group of bits) represents a cell. This module defines the fundamental
 * bitboard types used across all morphological operations.
 *
 * @module types/bitboard
 */

/**
 * Bitboard representation - core bit storage type.
 *
 * Can be either a JavaScript BigInt (for arbitrary precision) or Uint32Array
 * (for fixed-size, high-performance packed storage). The choice depends on
 * grid size and performance requirements.
 *
 * @typedef {bigint | Uint32Array} Bitboard
 */
export type Bitboard = bigint | Uint32Array;

/**
 * Bit value representing occupancy or color depth.
 *
 * For single-bit grids: 0 (unoccupied) or non-zero (occupied)
 * For multi-bit grids: any value from 0 to (2^depth - 1)
 *
 * @typedef {number} BitValue
 */
export type BitValue = number;

/**
 * Bit shift offset for operations like dilation and erosion.
 *
 * Typically calculated from grid width or specific neighbor offsets.
 * Negative values shift right, positive shift left.
 *
 * @typedef {number} BitShiftOffset
 */
export type BitShiftOffset = number;

/**
 * Radius parameter for morphological operations.
 *
 * Determines how many expansion/contraction steps to perform.
 * Must be non-negative; typically 0, 1, 2, or higher.
 *
 * @typedef {number} MorphologyRadius
 */
export type MorphologyRadius = number;

/**
 * Grid dimensions for bitboard operations.
 *
 * @interface GridDimensions
 */
export interface GridDimensions {
  /** Grid width in cells */
  readonly width: number;

  /** Grid height in cells */
  readonly height: number;
}

/**
 * Location within a grid cell.
 *
 * @interface GridCoordinate
 */
export interface GridCoordinate {
  /** X coordinate (column) */
  readonly x: number;

  /** Y coordinate (row) */
  readonly y: number;
}

/**
 * Located value in grid - coordinate with associated cell value.
 *
 * @interface CellWithValue
 */
export interface CellWithValue extends GridCoordinate {
  /** Value stored at this cell */
  readonly value: BitValue;
}

/**
 * Operation result - bitboard with optional status information.
 *
 * @interface OperationResult
 */
export interface OperationResult {
  /** Resulting bitboard after operation */
  readonly bits: Bitboard;

  /** Operation was successful (no errors) */
  readonly success: boolean;

  /** Optional diagnostic message */
  readonly message?: string;
}
