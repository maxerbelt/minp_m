/**
 * Mask and indexer type definitions for grid morphology.
 *
 * Masks represent grid state with their storage backend, dimensions, and operations.
 * Indexers convert between coordinate systems and handle grid-specific neighbor calculations.
 *
 * @module types/masks
 */

import type { Bitboard, GridDimensions, GridCoordinate, CellWithValue } from './bitboard.types.js';

/**
 * Edge mask collection - boundary cell masks for preventing wrap-around.
 *
 * Used during dilation/erosion to prevent expansion beyond grid boundaries.
 * Marks cells at each edge that should not expand in that direction.
 *
 * @interface EdgeMaskCollection
 */
export interface EdgeMaskCollection {
  /** Mask for top edge (boundary cells) */
  readonly top?: Bitboard;

  /** Mask for bottom edge (boundary cells) */
  readonly bottom?: Bitboard;

  /** Mask for left edge (boundary cells) */
  readonly left?: Bitboard;

  /** Mask for right edge (boundary cells) */
  readonly right?: Bitboard;
}

/**
 * Coordinate-to-index converter for grid addressing.
 *
 * Converts between (x, y) coordinates and linear indices into bitboard storage.
 * Implementations vary by grid shape (rectangular, hexagonal, triangular, etc.).
 *
 * @interface GridIndexer
 */
export interface GridIndexer {
  /**
   * Convert coordinate to linear index
   *
   * @param x - X coordinate (column)
   * @param y - Y coordinate (row)
   * @returns Linear index into bitboard
   */
  toIndex(x: number, y: number): number;

  /**
   * Convert linear index to coordinate
   *
   * @param index - Linear index
   * @returns [x, y] coordinate pair
   */
  toCoordinate(index: number): [number, number];

  /**
   * Check if coordinate is valid within grid bounds
   *
   * @param x - X coordinate
   * @param y - Y coordinate
   * @returns True if coordinate is within bounds
   */
  isValid(x: number, y: number): boolean;
}

/**
 * Hex-specific indexer with morphological helper methods.
 *
 * Extends GridIndexer with dilation/erosion operations that respect hexagonal
 * 6-neighbor connectivity instead of rectangular 8-neighbor or 4-neighbor.
 *
 * @interface HexIndexer
 */
export interface HexIndexer extends GridIndexer {
  /**
   * Dilate hexagonal mask
   *
   * @param bits - Input bitboard
   * @param radius - Number of dilation steps
   * @param store - Store backend for bit operations
   * @returns Dilated bitboard
   */
  dilate(bits: Bitboard, radius: number, store: any): Bitboard;

  /**
   * Erode hexagonal mask
   *
   * @param bits - Input bitboard
   * @param radius - Number of erosion steps
   * @param store - Store backend for bit operations
   * @returns Eroded bitboard
   */
  erode(bits: Bitboard, radius: number, store: any): Bitboard;
}

/**
 * Base mask interface for all grid types.
 *
 * Masks represent grid state with both the bitboard data and metadata
 * needed for morphological operations. Different grid shapes (rectangular,
 * hexagonal, etc.) implement this interface.
 *
 * @interface BaseMask
 */
export interface BaseMask extends GridDimensions {
  /** Current bitboard state */
  bits: Bitboard;

  /** Bit depth - bits per cell (1 for single-bit, >1 for colored) */
  readonly depth: number;

  /** Storage backend handling bit operations */
  readonly store: any;

  /** Coordinate-to-index converter */
  readonly indexer: GridIndexer;

  /**
   * Create an empty mask of given dimensions
   *
   * @param width - New grid width
   * @param height - New grid height
   * @param depth - New color depth (defaults to current depth)
   * @returns New empty mask
   */
  emptyMaskOfSize(width: number, height: number, depth?: number): BaseMask;

  /**
   * Check if coordinate is valid in this mask
   *
   * @param x - X coordinate
   * @param y - Y coordinate
   * @returns True if within grid bounds
   */
  isValid(x: number, y: number): boolean;

  /**
   * Get value at coordinate
   *
   * @param x - X coordinate
   * @param y - Y coordinate
   * @returns Bit value at location (0 if unoccupied)
   */
  get(x: number, y: number): number;

  /**
   * Set value at coordinate
   *
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param value - Bit value to set
   * @returns This mask (for chaining)
   */
  set(x: number, y: number, value: number): BaseMask;

  /**
   * Iterate over occupied cells with their values
   *
   * @returns Iterator of [x, y, value] tuples
   */
  *occupiedLocationsAndValues(): Generator<CellWithValue>;
}

/**
 * Rectangular grid mask - standard grid shape.
 *
 * Used by RectMorphologyOps and related classes. Supports both single-bit
 * (occupancy-only) and multi-bit (colored) operations.
 *
 * @interface RectMask
 */
export interface RectMask extends BaseMask {
  /** Always 'rect' for type discrimination */
  readonly type?: 'rect';
}

/**
 * Hexagonal grid mask - 6-neighbor connectivity.
 *
 * Used by HexMorphologyOps. Each cell has 6 neighbors instead of 4 or 8.
 * Requires HexIndexer for proper coordinate conversion and neighbor calculations.
 *
 * @interface HexMask
 */
export interface HexMask extends BaseMask {
  /** Always 'hex' for type discrimination */
  readonly type?: 'hex';

  /** Hex-specific indexer with dilate/erode methods */
  readonly indexer: HexIndexer;

  /** Method to get edge masks for boundary operations */
  edgeMasks?(): EdgeMaskCollection;
}

/**
 * Generic mask - allows any grid type during development.
 *
 * Provides maximum flexibility for testing and experimental code.
 * Prefer specific mask types (RectMask, HexMask) in production code.
 *
 * @interface GenericMask
 */
export interface GenericMask extends BaseMask {
  /** Arbitrary grid type identifier */
  readonly type?: string;
}

/**
 * Discriminated union type for all mask types.
 *
 * Enables type-safe pattern matching on mask types.
 *
 * @typedef {RectMask | HexMask | GenericMask} AnyMask
 */
export type AnyMask = RectMask | HexMask | GenericMask;
