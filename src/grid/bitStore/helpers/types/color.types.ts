/**
 * @file color.types.ts - Color extraction and storage types
 *
 * Defines types for color layer extraction from multi-color bitboards
 * and the storage contracts needed by color operations.
 */

import type { Bitboard, BitPosition, ColorValue, BitsPerCell } from './bitboard.types';

/**
 * Single-bit store interface used within multi-color stores.
 *
 * Represents the underlying 1-bit store used for color layer extraction
 * in multi-color bitboard implementations.
 *
 * @interface SingleBitStore
 */
export interface SingleBitStore {
  /**
   * Get single bit value at index (0n or 1n).
   * @param bitboard - Source bitboard
   * @param index - Cell index
   * @returns 0n or 1n
   */
  getIdx(bitboard: bigint, index: BitPosition): bigint;

  /**
   * Set single bit at index.
   * @param bitboard - Source bitboard
   * @param index - Cell index
   * @param value - Bit value (0n or 1n)
   * @returns Modified bitboard
   */
  setIdx(bitboard: bigint, index: BitPosition, value: bigint): bigint;

  /**
   * Bits allocated per cell (should be 1 for single-bit store).
   */
  bitsPerCell: BitsPerCell;
}

/**
 * Multi-color store interface for color layer operations.
 *
 * Represents a bitboard storage that can hold multiple color values per cell.
 * Used by BitColors for extracting individual color layers.
 *
 * @interface MultiColorStore
 */
export interface MultiColorStore {
  /**
   * Get cell value at index (may be multi-bit color value).
   * @param bitboard - Source bitboard
   * @param index - Cell index
   * @returns Cell value (color or occupancy)
   */
  getIdx(bitboard: Bitboard, index: BitPosition): ColorValue;

  /**
   * Set cell value at index.
   * @param bitboard - Source bitboard
   * @param index - Cell index
   * @param value - New value
   * @returns Modified bitboard
   */
  setIdx(bitboard: Bitboard, index: BitPosition, value: ColorValue): Bitboard;

  /**
   * Grid width in cells.
   */
  width: number;

  /**
   * Grid height in cells.
   */
  height: number;

  /**
   * Bits allocated per cell for color depth (1, 2, 4, or 8).
   */
  bitsPerCell: BitsPerCell;

  /**
   * Underlying 1-bit store for single-color extraction.
   * Used to build the single-bit result during layer extraction.
   */
  singleBitStore: SingleBitStore;
}

/**
 * Color layer mask type.
 *
 * A bitboard where set bits indicate cells containing a specific color.
 *
 * @typedef {bigint} ColorLayerMask
 */
export type ColorLayerMask = bigint;

/**
 * Color extraction context.
 *
 * Contains information needed for color layer extraction operations.
 *
 * @interface ColorExtractionContext
 */
export interface ColorExtractionContext {
  /**
   * Multi-color store to extract from.
   */
  store: MultiColorStore;

  /**
   * Source multi-color bitboard.
   */
  bitboard: Bitboard;

  /**
   * Color value to extract (0-255 depending on bits per cell).
   */
  targetColor: ColorValue;

  /**
   * Grid width in cells.
   */
  width: number;

  /**
   * Grid height in cells.
   */
  height: number;

  /**
   * Result bitboard (single-bit layer).
   */
  result?: ColorLayerMask;

  /**
   * Number of cells with the target color (optional, computed if needed).
   */
  cellCount?: number;
}

/**
 * Extracted color layer with metadata.
 *
 * Result of color extraction operation including statistics.
 *
 * @interface ExtractedColorLayer
 */
export interface ExtractedColorLayer {
  /**
   * Single-bit mask showing cells with the extracted color.
   */
  mask: ColorLayerMask;

  /**
   * Color value that was extracted.
   */
  color: ColorValue;

  /**
   * Number of cells containing this color.
   */
  cellCount: number;

  /**
   * Total cells in grid.
   */
  totalCells: number;

  /**
   * Percentage of cells with this color (0-100).
   */
  percentage: number;

  /**
   * Timestamp of extraction (optional).
   */
  extractedAt?: Date;
}

/**
 * Multi-color decomposition result.
 *
 * Result of decomposing a multi-color bitboard into individual color layers.
 *
 * @interface ColorDecomposition
 */
export interface ColorDecomposition {
  /**
   * Map of color value to extracted layer mask.
   */
  layers: Map<ColorValue, ColorLayerMask>;

  /**
   * Array of extracted layers sorted by color value or occurrence.
   */
  sortedLayers: ExtractedColorLayer[];

  /**
   * Original multi-color bitboard.
   */
  source: Bitboard;

  /**
   * Grid dimensions used for extraction.
   */
  dimensions: {
    width: number;
    height: number;
  };

  /**
   * Bits per cell in original bitboard.
   */
  bitsPerCell: BitsPerCell;
}

/**
 * Configuration for color operations.
 *
 * Controls behavior of color extraction and composition.
 *
 * @interface ColorOperationOptions
 */
export interface ColorOperationOptions {
  /**
   * Skip zero-value cells during extraction.
   * Default: true (empty cells are not included as a color).
   */
  skipEmpty?: boolean;

  /**
   * Include color frequency statistics.
   * Default: false (improves performance if not needed).
   */
  computeStatistics?: boolean;

  /**
   * Cache extracted layers for reuse.
   * Default: false.
   */
  cacheResults?: boolean;

  /**
   * Maximum number of distinct colors to extract.
   * If exceeded, operation may fail or truncate results.
   */
  maxColors?: number;
}

/**
 * Color palette derived from bitboard.
 *
 * Represents the set of distinct colors present in a bitboard.
 *
 * @interface ColorPalette
 */
export interface ColorPalette {
  /**
   * Array of distinct color values found in bitboard.
   */
  colors: ColorValue[];

  /**
   * Map from color to frequency (number of cells with that color).
   */
  frequencies: Map<ColorValue, number>;

  /**
   * Total distinct colors.
   */
  colorCount: number;

  /**
   * Most frequent color.
   */
  mostFrequentColor?: ColorValue;

  /**
   * Least frequent color.
   */
  leastFrequentColor?: ColorValue;
}
