/**
 * @file subshape.types.ts - Sub-shape component and validation types
 * @description Types for terrain-specific ship components and sub-shape operations
 */

import type { Board } from "./geometry.types.js";
import type { SubTerrain } from "./interfaces.types.js";
import type { SubShapeValidator, BoardExpander } from "./callbacks.types.js";

/**
 * Base sub-shape configuration
 */
export interface SubShapeConfig {
  readonly validator: SubShapeValidator;
  readonly zoneDetail: number;
  readonly subterrain: SubTerrain;
  readonly faction: number;
}

/**
 * Sub-shape base class interface
 */
export interface SubShapeBase extends SubShapeConfig {
  clone(): SubShapeBase;
}

/**
 * Standard cells sub-shape with dynamic board management
 */
export interface StandardCellsSubShape extends SubShapeBase {
  readonly board: Board;
  readonly size: number;
  readonly cells: Array<[number, number]>;
  setBoardFromSecondary(occupancyBoard: Board, secondaryBoard?: Board): void;
  setCells(allCells: Array<[number, number]>, secondary: StandardCellsSubShape): void;
}

/**
 * Special cells sub-shape with immutable board
 */
export interface SpecialCellsSubShape extends SubShapeBase {
  readonly board: Board;
  readonly cells: Array<[number, number]>;
}

/**
 * Sub-shape union type
 */
export type SubShape = SubShapeBase | StandardCellsSubShape | SpecialCellsSubShape;

/**
 * Sub-shape board expansion result
 */
export interface BoardExpansionResult {
  readonly success: boolean;
  readonly expanded: boolean;
  readonly error?: string;
}

/**
 * Sub-shape dimension normalization record
 */
export interface DimensionNormalization {
  readonly originalWidth: number;
  readonly originalHeight: number;
  readonly targetWidth: number;
  readonly targetHeight: number;
  readonly expanded: boolean;
  readonly faction: number;
}
