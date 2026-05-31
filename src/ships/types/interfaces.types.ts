/**
 * @file interfaces.types.ts - External interface contracts and dependencies
 * @description Interfaces for external modules and cross-cutting concerns
 */

import type { CoordinatePair } from "./coordinates.types.js";

/**
 * Reference to external SubTerrain type from terrains module
 * Represents a specific terrain type (water, asteroid, land, etc.)
 */
export interface SubTerrain {
  readonly name: string;
  readonly terrain: unknown;
}

/**
 * Weapon system interface contract
 * Represents a weapon equipped on a ship
 */
export interface WeaponSystemRef {
  readonly id: number;
  readonly weapon: unknown;
  readonly [key: string]: unknown;
}

/**
 * Game grid interface for placement validation
 */
export interface GameGrid {
  isLand(row: number, col: number): boolean;
  inBounds(row: number, col: number): boolean;
  surround(row: number, col: number): CoordinatePair[];
}

/**
 * Cell grid tracking for ship placement
 */
export interface ShipCellGridInterface {
  hasRC(row: number, col: number): boolean;
  setCell(row: number, col: number, cell: any): void;
  isAreaClearAroundXY(row: number, col: number, inBoundsFn: (r: number, c: number) => boolean): boolean;
}

/**
 * UI view model for game display
 */
export interface UIViewModelInterface {
  gridCellAt(row: number, col: number): any;
  useAmmoInCell(cell: any, damaged: string): void;
  cellSize(): number;
}

/**
 * Game model interface for accessing core systems
 */
export interface GameModelInterface {
  UI: UIViewModelInterface;
  loadOut: any;
  opponent?: Ship | null;
  updateUI(): void;
}

/**
 * Ship interface for type contracts
 */
export interface Ship {
  readonly id: number;
  readonly letter: string;
  readonly symmetry: string;
  readonly size: number;
  readonly placed: boolean;
  readonly sunk: boolean;
  readonly variant: number;
  readonly hits: any;
}

/**
 * Shape/variant factory interface
 */
export interface VariantFactory {
  boardFor(index: number): any;
  numVariants(): number;
  placeables(): any[];
  shrunkUnder(cellHeight: number): any;
}
