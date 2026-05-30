/**
 * Grid Configuration and Shape Types
 * 
 * Defines configuration objects and shape specifications for rectangular grids.
 * These types are used for grid initialization and shape-based operations.
 */

import type { GridIndexer } from './masks.types'

/**
 * Rectangle shape configuration object.
 * Immutable specification of a rectangular grid with lazy-loaded indexer.
 * 
 * @example
 * const rect: RectangleShapeConfig = {
 *   type: 'rectangle',
 *   width: 8,
 *   height: 10,
 *   size: 80,
 *   indexer: rectIndexInstance
 * };
 */
export interface RectangleShapeConfig {
  /** Immutable shape type identifier - always 'rectangle' */
  readonly type: 'rectangle';
  
  /** Rectangle width in cells (positive integer, immutable after construction) */
  readonly width: number;
  
  /** Rectangle height in cells (positive integer, immutable after construction) */
  readonly height: number;
  
  /** Total cell count: width × height (immutable, pre-computed) */
  readonly size: number;
  
  /** Lazy-loaded rectangle indexer for coordinate transformation */
  readonly indexer: GridIndexer;
}

/**
 * Battle map configuration with game-specific properties.
 * Used for initializing game boards with terrain, obstacles, etc.
 * 
 * @example
 * const map: BattleMap = {
 *   cols: 16,
 *   rows: 8,
 *   terrain: TerrainData,
 *   obstacles: ObstacleData
 * };
 */
export interface BattleMap {
  /** Map width in cells */
  cols: number;
  
  /** Map height in cells */
  rows: number;
  
  /** Additional map properties (terrain, obstacles, etc) */
  [key: string]: any;
}

/**
 * Coordinate tuple representing a cell with optional value.
 * Used for coordinate lists and data transfer.
 * 
 * Format: [x, y] or [x, y, color/value]
 * 
 * @example
 * const simple: CoordinateTuple = [3, 5];
 * const withColor: CoordinateTuple = [3, 5, 2];
 */
export type CoordinateTuple = [x: number, y: number] | [x: number, y: number, value: number];

/**
 * Symbol representation mapping for ASCII grid display.
 * Maps numeric cell values to single-character representations.
 * 
 * @example
 * const binary: SymbolMap = ['.', '#'];          // Empty, Full
 * const intensity: SymbolMap = ['·', 'o', 'O', '●']; // 4 intensity levels
 */
export type SymbolMap = string[];

/**
 * Mask-like object interface for grid compatibility.
 * Any object implementing these properties can be used as a grid-compatible mask.
 * 
 * @example
 * const maskLike: MaskLike = {
 *   width: 5,
 *   height: 3,
 *   *occupiedLocationsAndValues() {
 *     yield [1, 0, 1];
 *     yield [2, 1, 1];
 *   }
 * };
 */
export interface MaskLike {
  /** Grid width in cells (positive integer, immutable) */
  readonly width: number;
  
  /** Grid height in cells (positive integer, immutable) */
  readonly height: number;
  
  /**
   * Generator yielding occupied cell locations and their values.
   * Each yield returns [x, y, color] where:
   * - x: column (0 to width-1)
   * - y: row (0 to height-1)
   * - color: truthy for occupied, falsy for empty
   */
  occupiedLocationsAndValues: () => Generator<[x: number, y: number, color: number], void, unknown>;
}

/**
 * Coverage algorithm types available for line drawing.
 * Each type represents a different Bresenham line variant.
 * 
 * Keyed by algorithm name for runtime selection.
 */
export interface CoverTypes {
  /** Normal/full coverage - standard Bresenham line */
  normal: any;
  
  /** Half-plane coverage - covers half the diagonal cells */
  half: any;
  
  /** Super-coverage - covers all cells touched by the line */
  super: any;
}

/**
 * Connectivity topology options for neighbor queries.
 * Each key maps to a connectivity object supporting neighbor lookups.
 * 
 * @example
 * const connections: ConnectionTypes = {
 *   '4': orthogonalConnectivity,
 *   '4diag': diagonalConnectivity,
 *   '8': kingConnectivity
 * };
 */
export interface ConnectionTypes {
  /**
   * Orthogonal (4-connected) neighbors.
   * Only cells sharing an edge (up, down, left, right).
   */
  '4'?: any;
  
  /**
   * Diagonal connectivity.
   * Only cells sharing a corner (NE, SE, SW, NW).
   */
  '4diag'?: any;
  
  /**
   * King-connected (8-connected) neighbors.
   * Cells sharing either an edge or corner.
   */
  '8'?: any;
}

/**
 * Transformation capabilities indicating which symmetries a shape supports.
 * Each boolean indicates whether the corresponding transformation is available.
 * 
 * Used for shape classification and orbit calculation.
 */
export interface TransformCapabilities {
  /** Can rotate 90° clockwise */
  canRotateCW?: boolean;
  
  /** Can rotate 90° counter-clockwise */
  canRotateCCW?: boolean;
  
  /** Can flip horizontally (reflect across vertical axis) */
  canFlipH?: boolean;
  
  /** Can flip vertically (reflect across horizontal axis) */
  canFlipV?: boolean;
}
