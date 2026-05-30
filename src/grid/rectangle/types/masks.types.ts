/**
 * Mask and Store Interface Types
 * 
 * Defines interfaces for bitboard storage, grid indexing, and mask operations.
 * These are abstractions for different storage backends (BigInt, 32-bit, etc).
 * 
 * Enables polymorphic behavior and substitutable storage implementations.
 */

import type { Coordinate, BoundingBox } from './geometry.types'

/**
 * Bitboard store interface - abstracts storage backend operations.
 * 
 * Different stores can use different bit-packing strategies:
 * - StoreBig: BigInt per dimension
 * - Store32: 32-bit words
 * - Etc.
 * 
 * Stores abstract bit manipulation operations and coordinate-to-bit conversions.
 */
export interface BitboardStore {
  /** Empty bitboard value (0 for most stores, depends on storage type) */
  readonly empty: any;
  
  /**
   * Expands rectangular bitboard to square bitboard representation.
   * Used for uniform handling of non-square grids.
   * 
   * @param bitboard - Bitboard to expand
   * @param height - Grid height
   * @param width - Grid width
   * @returns Expanded square bitboard
   */
  expandToSquare: (bitboard: any, height: number, width: number) => any;
  
  /**
   * Creates a resized copy of this store for different grid dimensions.
   * 
   * @param width - New grid width
   * @param height - New grid height
   * @returns New store instance resized to dimensions
   */
  resized: (width: number, height: number) => BitboardStore;
  
  /**
   * Normalizes bitboard to upper-left origin.
   * Removes leading zeros and shifts bitboard to start at (0, 0).
   * 
   * @param bits - Bitboard to normalize
   * @param height - Grid height
   * @param width - Grid width
   * @returns Normalized bitboard
   */
  normalizeUpLeft: (bits: any, height: number, width: number) => any;
  
  /**
   * Gets bit position for given cell index.
   * 
   * @param index - Linear cell index (0-based)
   * @returns Bit position in store representation
   */
  bitPos?: (index: number) => number;
  
  /**
   * Sets bit at given position.
   * 
   * @param bitboard - Current bitboard
   * @param pos - Bit position
   * @param value - Value to set
   * @returns Updated bitboard
   */
  setIdx?: (bitboard: any, pos: number, value?: number) => any;
  
  /**
   * Gets bit value at given position.
   * 
   * @param bitboard - Current bitboard
   * @param pos - Bit position
   * @returns Bit value (0 or 1, or color value for multi-bit stores)
   */
  getIdx?: (bitboard: any, pos: number) => number;
  
  /**
   * Checks if bit is set at position.
   * 
   * @param bitboard - Current bitboard
   * @param pos - Bit position
   * @returns True if bit is set
   */
  hasIdxSet?: (bitboard: any, pos: number) => boolean;
  
  /**
   * Shrinks bitboard to minimal bounding box.
   * 
   * @param bits - Bitboard to shrink
   * @param height - Current height
   * @param width - Current width
   * @returns Shrink result with new dimensions
   */
  shrinkToOccupied?: (bits: any, height: number, width: number) => { bitboard: any; newWidth: number; newHeight: number };
  
  /**
   * Gets bounding box of non-empty cells.
   * 
   * @param bits - Bitboard
   * @param height - Grid height
   * @param width - Grid width
   * @returns Bounding box or null if empty
   */
  boundingBox?: (bits: any, height: number, width: number) => BoundingBox | null;
}

/**
 * Grid indexer interface - converts between 2D and 1D coordinates.
 * 
 * Abstracts coordinate system differences (rectangular, hexagonal, triangular, etc).
 * Used for polymorphic grid implementations.
 */
export interface GridIndexer {
  /** Grid width in cells */
  readonly width: number;
  
  /** Grid height in cells */
  readonly height: number;
  
  /**
   * Converts 2D coordinates to 1D index.
   * 
   * @param x - X coordinate (column)
   * @param y - Y coordinate (row)
   * @returns Linear index
   */
  index: (x: number, y: number) => number;
  
  /**
   * Converts 1D index to 2D coordinates.
   * 
   * @param index - Linear index
   * @returns [x, y] coordinate pair
   */
  location: (index: number) => Coordinate;
  
  /**
   * Creates resized indexer for different grid dimensions.
   * 
   * @param width - New grid width
   * @param height - New grid height
   * @returns New indexer instance
   */
  resized: (width: number, height: number) => GridIndexer;
  
  /**
   * Validates and optionally adjusts coordinates.
   * 
   * @param x - X coordinate
   * @param y - Y coordinate
   * @returns Validated [x, y] or null if invalid
   */
  validate?: (x: number, y: number) => Coordinate | null;
  
  /**
   * Gets neighbors of a cell.
   * 
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param connectType - Connectivity type ('4', '8', '4diag', etc)
   * @returns Array of neighbor coordinates
   */
  neighbors?: (x: number, y: number, connectType?: string) => Coordinate[];
}

/**
 * Rectangular mask interface - bitboard with grid-specific operations.
 * 
 * Abstract interface for mask implementations. Concrete classes include
 * Mask, Packed, SubMask, etc.
 */
export interface RectangleMask {
  /** Bitboard storage backend */
  store?: BitboardStore;
  
  /** Grid indexer for coordinate conversion */
  indexer?: GridIndexer;
  
  /** Bitboard representation (bits) */
  bits?: any;
  
  /** Grid width in cells */
  width?: number;
  
  /** Grid height in cells */
  height?: number;
  
  /**
   * Creates empty mask of specified size.
   * 
   * @param newWidth - New mask width
   * @param newHeight - New mask height
   * @returns Empty mask instance
   */
  emptyOfSize: (newWidth: number, newHeight: number) => RectangleMask;
  
  /**
   * Gets cell value at (x, y).
   * 
   * @param x - X coordinate
   * @param y - Y coordinate
   * @returns Cell value
   */
  at: (x: number, y: number) => any;
  
  /**
   * Sets cell value at (x, y).
   * 
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param value - Value to set
   * @returns Updated bits
   */
  set: (x: number, y: number, value?: number) => any;
  
  /**
   * Tests if cell at (x, y) matches a value.
   * 
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param value - Value to test for
   * @returns True if cell matches
   */
  test: (x: number, y: number, value?: number) => boolean;
}

/**
 * Morphological operation capabilities.
 * Interface for dilate/erode and related operations.
 */
export interface MorphologicalOps {
  /**
   * Dilate mask by expanding occupied cells.
   * 
   * @param mask - Input mask
   * @returns Dilated mask
   */
  dilate: (mask: any) => any;
  
  /**
   * Erode mask by shrinking occupied cells.
   * 
   * @param mask - Input mask
   * @returns Eroded mask
   */
  erode: (mask: any) => any;
  
  /**
   * Opening - erode followed by dilate.
   * 
   * @param mask - Input mask
   * @returns Opened mask
   */
  open?: (mask: any) => any;
  
  /**
   * Closing - dilate followed by erode.
   * 
   * @param mask - Input mask
   * @returns Closed mask
   */
  close?: (mask: any) => any;
}

/**
 * Blit (block image transfer) operation interface.
 * Used for efficient bitboard copying and composition.
 */
export interface BlitOperationInterface {
  /**
   * Copies source bitboard into destination at offset.
   * 
   * @param dest - Destination bitboard
   * @param src - Source bitboard
   * @param offsetX - X offset for placement
   * @param offsetY - Y offset for placement
   * @returns Updated destination bitboard
   */
  blit: (dest: any, src: any, offsetX: number, offsetY: number) => any;
  
  /**
   * Merges bitboards with masking.
   * 
   * @param base - Base bitboard
   * @param overlay - Overlay bitboard
   * @param mask - Mask bitboard
   * @returns Merged bitboard
   */
  mask?: (base: any, overlay: any, mask: any) => any;
}
