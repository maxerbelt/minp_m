/**
 * @file geometry.types.ts - Board, mask, and geometric type definitions
 * @description Types for board representations, masks, and layer management
 */

/** Type reference for Mask objects (grid/rectangle/mask.js) */
export interface Mask {
  toCoords: Array<[number, number]>;
  [key: string]: any;
}

/** Type reference for SubBoard objects (grid/subBoard.js) */
export interface SubBoard {
  [key: string]: any;
}

/**
 * Board representation (can be Mask or SubBoard)
 */
export type Board = Mask | SubBoard;

/**
 * Array of layer boards for multi-bit depth storage in bitboard systems
 */
export type LayerBoards = Mask[];

/**
 * Board dimensions
 */
export interface BoardDimensions {
  readonly width: number;
  readonly height: number;
}

/**
 * Footprint metrics for board area calculations
 */
export interface BoardMetrics {
  readonly area: number;
  readonly footprint: number;
  readonly width: number;
  readonly height: number;
}
