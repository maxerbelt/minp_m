/**
 * Core interface definitions for grid backends.
 * 
 * These interfaces abstract storage and indexing operations, enabling:
 * - Polymorphic storage backends (BigInt, Uint32Array, etc.)
 * - Pluggable coordinate systems (rectangular, hexagonal, triangular)
 * - Flexible mask implementations (single-bit, multi-bit, compressed)
 * 
 * @module grid/types/interfaces
 */

import type {
  Coordinate,
  BoundingBox,
  LineParameters,
  InterceptResult,
  GridDimensions
} from './shared.types.js';

/**
 * Bitboard store interface - abstracts storage backend operations.
 * 
 * Different stores use different bit-packing strategies:
 * - StoreBig: BigInt per dimension
 * - Store32: 32-bit words
 * - Packed: Compressed storage
 * 
 * Stores abstract bit manipulation and coordinate-to-bit conversions.
 */
export interface BitboardStore {
  /** Empty bitboard value (0 for most stores) */
  readonly empty: unknown;
  
  /** Single set bit representation (1 for most stores) */
  readonly one?: unknown;
  
  /** Full bitboard (all bits set) - optional */
  readonly fullBits?: unknown;

  /**
   * Check if bit is occupied at index
   * @param bitboard - Bitboard to check
   * @param index - Cell index
   * @returns True if bit is set
   */
  isOccupied?(bitboard: unknown, index: number): boolean;

  /**
   * Get bit value at index
   * @param bitboard - Bitboard to read
   * @param index - Cell index
   * @returns Bit value (0 or color)
   */
  getIdx?(bitboard: unknown, index: number): number;

  /**
   * Set bit value at index
   * @param bitboard - Bitboard to modify
   * @param index - Cell index
   * @param color - Value to set
   * @returns Updated bitboard
   */
  setIdx?(bitboard: unknown, index: number, color?: number): unknown;

  /**
   * Clear bits at index
   * @param bitboard - Bitboard to modify
   * @param mask - Bits to clear
   * @returns Updated bitboard
   */
  clearBits?(bitboard: unknown, mask: unknown): unknown;

  /**
   * Normalize bitboard to upper-left origin
   * @param bits - Bitboard to normalize
   * @param height - Grid height
   * @param width - Grid width
   * @returns Normalized bitboard
   */
  normalizeUpLeft?(bits: unknown, height: number, width: number): unknown;

  /**
   * Shrink bitboard to minimal bounding box
   * @param bits - Bitboard to shrink
   * @param height - Current height
   * @param width - Current width
   * @returns Result with shrunk bitboard and new dimensions
   */
  shrinkToOccupied?(
    bits: unknown,
    height: number,
    width: number
  ): { bitboard: unknown; newWidth: number; newHeight: number };

  /**
   * Get bounding box of occupied cells
   * @param bits - Bitboard to analyze
   * @param height - Grid height
   * @param width - Grid width
   * @returns Bounding box or null if empty
   */
  boundingBox?(bits: unknown, height: number, width: number): BoundingBox | null;

  /**
   * Expand to square representation
   * @param bits - Bitboard to expand
   * @param height - Current height
   * @param width - Current width
   * @returns Expanded bitboard
   */
  expandToSquare?(bits: unknown, height: number, width: number): unknown;

  /**
   * Get bit mask at position
   * @param index - Position index
   * @returns Bit mask
   */
  bitMaskByPos?(index: number): unknown;

  /**
   * Additional operations/methods store may provide
   */
  [method: string]: unknown;
}

/**
 * Grid indexer interface - converts between 2D and 1D coordinates.
 * 
 * Abstracts coordinate system differences:
 * - Rectangular: row-major or column-major
 * - Hexagonal: axial, offset, cube coordinates
 * - Triangular: triangular indexing
 * 
 * Used for polymorphic grid implementations.
 */
export interface GridIndexer {
  /** Grid width in cells */
  readonly width?: number;
  
  /** Grid height in cells */
  readonly height?: number;
  
  /** Total cells in grid */
  readonly size?: number;

  /**
   * Convert 2D coordinates to 1D index
   * @param x - X coordinate (column)
   * @param y - Y coordinate (row)
   * @returns Linear index
   */
  index(x: number, y: number): number;

  /**
   * Convert 1D index to 2D coordinates
   * @param index - Linear index
   * @returns [x, y] coordinate pair
   */
  location(index: number): Coordinate;

  /**
   * Check if coordinate is valid within grid bounds
   * @param x - X coordinate
   * @param y - Y coordinate
   * @returns True if within bounds
   */
  isValid?(x: number, y: number): boolean;

  /**
   * Generator yielding all cell indices
   * @param bitboard - Optional: only iterate set bits if provided
   * @yields Cell index
   */
  *indices?(bitboard?: unknown): Generator<number>;

  /**
   * Generator yielding only set bit indices
   * @param bitboard - Bitboard to iterate
   * @yields Index of set bit
   */
  *bitsIndices?(bitboard: unknown): Generator<number>;

  /**
   * Transformation maps for rotations/reflections
   * Maps old index to new index under transformation
   */
  transformMaps?: TransformMaps;

  /**
   * Additional indexer capabilities/methods
   */
  [method: string]: unknown;
}

/**
 * Cube helper for hexagonal and complex indexing.
 * 
 * Alternative to GridIndexer, preferred when available.
 * Used by hexagonal and cube-coordinate systems.
 */
export interface CubeHelper {
  /** Total cells */
  readonly size?: number;

  /**
   * Iterate all cell indices
   * @param bitboard - Optional filter
   * @yields Cell index
   */
  *indices?(bitboard?: unknown): Generator<number>;

  /**
   * Iterate set bits
   * @param bitboard - Bitboard to iterate
   * @yields Set bit index
   */
  *bitsIndices?(bitboard: unknown): Generator<number>;

  /**
   * Additional cube helper methods
   */
  [method: string]: unknown;
}

/**
 * Transform map - index mapping under a transformation.
 * 
 * Array where index i maps to array[i] under the transformation.
 * Used by Actions classes for rotation/reflection variants.
 */
export type TransformMap = number[];

/**
 * Object mapping transformation names to their index maps.
 * 
 * Example: { id: [...], r90: [...], r180: [...], f: [...] }
 */
export interface TransformMapObject {
  [transformName: string]: number[];
}

/**
 * Transformation maps - either object-based or array-based format.
 */
export type TransformMaps = TransformMapObject | TransformMap[][];

/**
 * Mask-like object usable as a grid.
 * 
 * Any object with these properties can be treated as a grid by grid operations.
 */
export interface MaskLike extends GridDimensions {
  /** Bitboard value (depends on store) */
  bits?: unknown;

  /** Bit depth - bits per cell (1 for single-bit) */
  depth?: number;

  /**
   * Get value at coordinate
   * @param x - X coordinate
   * @param y - Y coordinate
   * @returns Cell value
   */
  at?(x: number, y: number): unknown;

  /**
   * Set value at coordinate
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param value - Value to set
   */
  set?(x: number, y: number, value: unknown): void;

  /**
   * Iterate coordinates with values
   * @yields [x, y, value] tuples
   */
  *occupiedLocationsAndValues?(): Generator<[number, number, unknown]>;
}

/**
 * Canvas surface for drawing operations.
 * 
 * Target for drawing algorithms (Bresenham, ray casting, etc).
 */
export interface CanvasSurface {
  /** Canvas width in cells */
  width: number;
  
  /** Canvas height in cells */
  height: number;

  /**
   * Set cell value
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param color - Value to set
   */
  set(x: number, y: number, color: unknown): void;
}
