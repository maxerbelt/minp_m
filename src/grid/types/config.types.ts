/**
 * Configuration object type definitions for grid initialization.
 * 
 * These types define the contract for objects passed to constructors
 * and factory functions. They specify what configuration is expected
 * and what initialization parameters are available.
 * 
 * @module grid/types/config
 */

import type { GridIndexer, CubeHelper, BitboardStore, MaskLike } from './interfaces.types.js';

/**
 * Shape configuration object for grid initialization.
 * 
 * Common base interface for all shape configurations.
 * Provides grid dimensions and coordinate conversion strategy.
 * 
 * Different shape types extend this with type-specific properties.
 */
export interface ShapeConfig {
  /** Shape type identifier ('rectangle', 'hexagon', 'triangle', etc.) */
  readonly type?: string;
  
  /** Grid width in cells (columns) */
  readonly width: number;
  
  /** Grid height in cells (rows) */
  readonly height: number;
  
  /** Total cell count (width × height or shape-specific) */
  readonly size?: number;
}

/**
 * Shape indexer strategy interface.
 * 
 * Implements coordinate-to-index conversion for a specific grid topology.
 * Injected into ShapeBase via dependency injection.
 */
export interface ShapeIndexer {
  /**
   * Convert 2D coordinates to 1D index
   * @param x - X coordinate
   * @param y - Y coordinate
   * @returns Linear index
   */
  index(x: number, y: number): number;

  /**
   * Convert 1D index to 2D coordinates
   * @param index - Linear index
   * @returns [x, y] coordinate pair
   */
  location(index: number): [number, number];

  /**
   * Check if coordinates are valid
   * @param x - X coordinate
   * @param y - Y coordinate
   * @returns True if coordinates are within grid bounds
   */
  isValid(x: number, y: number): boolean;
}

/**
 * Rectangle shape configuration.
 * 
 * Specifies a rectangular grid with row-major indexing.
 */
export interface RectangleShapeConfig extends ShapeConfig {
  readonly type: 'rectangle';
  readonly indexer: GridIndexer;
}

/**
 * Hexagon shape configuration.
 * 
 * Specifies a hexagonal grid with cube-coordinate or axial indexing.
 */
export interface HexagonShapeConfig extends ShapeConfig {
  readonly type: 'hexagon';
  readonly indexer?: GridIndexer;
  readonly cube?: CubeHelper;
}

/**
 * Triangle shape configuration.
 * 
 * Specifies a triangular grid.
 */
export interface TriangleShapeConfig extends ShapeConfig {
  readonly type: 'triangle';
  readonly indexer: GridIndexer;
}

/**
 * Triangle-Rectangle hybrid configuration.
 * 
 * Combines triangular and rectangular indexing for complex topologies.
 */
export interface TriangleRectConfig extends ShapeConfig {
  readonly type: 'triangle-rect';
  readonly indexer?: GridIndexer;
}

/**
 * Mask configuration object for MaskBase initialization.
 * 
 * Specifies storage backend, grid dimensions, and optional bitboard data.
 */
export interface MaskConfig extends ShapeConfig {
  /** Bitboard storage backend implementation */
  store?: BitboardStore;
  
  /** Initial bitboard state (optional) */
  bits?: unknown;
  
  /** Color depth - bits per cell (default 1) */
  depth?: number;
  
  /** Coordinate indexer strategy */
  indexer?: GridIndexer;
  
  /** Alternative cube-based indexer */
  cube?: CubeHelper;
}

/**
 * Actions (symmetry/transformation) configuration.
 * 
 * Specifies how to handle transformations and variants for a mask.
 */
export interface ActionsConfig {
  /** Reference mask with store/indexer/bits */
  mask?: MaskLike;
  
  /** Tags for rotation transformations (e.g., ['r90', 'r180']) */
  rotateTags?: string[];
  
  /** Tags for reflection transformations (e.g., ['fx', 'fy']) */
  flipTags?: string[];
}

/**
 * Placement constraint configuration.
 * 
 * Specifies forbidden/mandatory cells and dimension constraints for placement algorithms.
 */
export interface PlacementConstraints {
  /** Forbidden cells (bitboard mask) */
  forbidden?: unknown;
  
  /** Mandatory cells that must be covered (bitboard mask) */
  mandatory?: unknown;
  
  /** Shape width in cells */
  shapeWidth: number;
  
  /** Shape height in cells */
  shapeHeight: number;
  
  /** Grid width in cells */
  gridWidth: number;
  
  /** Grid height in cells */
  gridHeight: number;
}

/**
 * Canvas drawing configuration.
 * 
 * Specifies canvas target and drawing parameters.
 */
export interface CanvasDrawConfig {
  /** Target canvas object (must have set(x, y, color) method) */
  canvas: unknown;
  
  /** Color value to draw with (default 1) */
  color?: number;
  
  /** Optional: line drawing algorithm variant */
  algorithm?: 'bresenham' | 'supercover' | 'halfcover';
}

/**
 * SubMask window configuration.
 * 
 * Defines a rectangular viewport into a larger mask.
 */
export interface SubMaskConfig {
  /** Parent mask to create window into */
  mask: unknown;
  
  /** X coordinate of window's top-left corner in parent mask */
  offsetX: number;
  
  /** Y coordinate of window's top-left corner in parent mask */
  offsetY: number;
  
  /** Window width in cells */
  windowWidth: number;
  
  /** Window height in cells */
  windowHeight: number;
}

/**
 * SubBoard configuration extending SubMask.
 * 
 * Adds world-coordinate mapping on top of window view.
 */
export interface SubBoardConfig extends SubMaskConfig {
  /** Whether to maintain world-relative coordinate system */
  useWorldCoordinates?: boolean;
}
