/**
 * @fileoverview Mask instance interface definitions and related types.
 *
 * Defines the contract for mask objects used throughout grid operations.
 * These interfaces describe the properties and methods that operation classes
 * expect from mask instances.
 */

import type { Coordinate } from './coordinates.types.js';

/**
 * Base mask interface for grid storage and bit representation.
 * Minimal contract that all mask types must implement.
 * Used by operations that only need basic bits and store access.
 *
 * @interface BaseMask
 */
export interface BaseMask {
  /** Bitboard storage (BigInt or Uint32Array depending on store type) */
  bits: bigint | Uint32Array;

  /** Bit storage backend providing bit operations */
  store: unknown; // Would be StoreBig or Store32 in runtime
}

/**
 * Extended mask interface with grid dimensions.
 * Used by operations that need to validate or work with grid coordinates.
 *
 * @interface DimensionedMask
 * @extends BaseMask
 */
export interface DimensionedMask extends BaseMask {
  /** Grid width in cells (columns) */
  readonly width: number;

  /** Grid height in cells (rows) */
  readonly height: number;

  /** Total number of cells (width × height) */
  readonly size?: number;
}

/**
 * Mask interface with occupancy information.
 * Used for validation and state checking.
 *
 * @interface OccupancyMask
 * @extends DimensionedMask
 */
export interface OccupancyMask extends DimensionedMask {
  /** Number of set bits (population count) */
  readonly occupancy: number;

  /** Pattern representing all bits set for this mask */
  readonly fullBits: bigint | Uint32Array;
}

/**
 * Mask interface with indexer for coordinate conversion.
 * Used by operations that need to convert between coordinates and linear indices.
 *
 * @interface IndexedMask
 * @extends DimensionedMask
 */
export interface IndexedMask extends DimensionedMask {
  /** Indexer for coordinate-to-index conversion */
  readonly indexer: {
    isValid(...args: number[]): boolean;
    index(...args: number[]): number;
    location(index: number): number[];
    bitsToCoords(bits: unknown): Coordinate[];
  };

  /** Method to compute linear index from coordinates */
  index(...args: number[]): number;
}

/**
 * Mask interface with morphological operation capabilities.
 * Used by operations that perform dilation, erosion, and other morphological transformations.
 *
 * @interface MorphologyMask
 * @extends OccupancyMask
 */
export interface MorphologyMask extends OccupancyMask {
  /** Clone this mask (non-destructive copy) */
  clone(): MorphologyMask | BaseMask;

  /** Get empty mask of same dimensions */
  readonly emptyMask: MorphologyMask | BaseMask;

  /** Dilate bits by radius (non-mutating) */
  dilateBits(radius?: number): bigint | Uint32Array;

  /** Erode bits by radius (non-mutating) */
  erodeBits(radius?: number): bigint | Uint32Array;

  /** Get edge masks for boundary operations */
  edgeMasks?(): Record<string, bigint | Uint32Array> | null;
}

/**
 * Complete mask interface with all capabilities.
 * Used when operation needs full access to mask features.
 *
 * @interface CompleteMask
 * @extends MorphologyMask, IndexedMask
 */
export interface CompleteMask extends MorphologyMask, IndexedMask {
  /** Constructor for runtime type checking */
  readonly constructor: Function;
}

/**
 * Mask-like interface for generic morphology operations.
 * Minimal interface for operations that work with any mask type.
 * Used to provide polymorphic support for different mask implementations.
 *
 * @interface MaskLike
 */
export interface MaskLike {
  bits: bigint | Uint32Array;
  width?: number;
  height?: number;
  store?: unknown;
  index?(...args: number[]): number;
  clone?(): unknown;
  emptyMask?: unknown;
  fullBits?: unknown;
  occupancy?: number;
}

/**
 * Generic mask instance parameter.
 * Used when a function accepts any mask-like object.
 * More flexible than strict MaskLike interface.
 *
 * @typedef {Object} MaskInstance
 * Used throughout operation classes for dependency injection.
 *
 * @example
 * function processMask(maskInstance: MaskInstance) {
 *   const blitter = new BlitOperation(maskInstance);
 *   blitter.blit({...});
 * }
 */
export type MaskInstance = CompleteMask | MorphologyMask | DimensionedMask | BaseMask | MaskLike;
