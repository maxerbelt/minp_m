/**
 * Placement-related types for ship and weapon placement validation.
 * Defines interfaces for placement data, constraints, and validation.
 */

import type { Board, PlacedShip, ShipCellGrid } from './domain.types';

/**
 * Placement data for validation and board information.
 * Provides occupancy grid and constraint checking for drop locations.
 */
export interface PlacementData {
  /** Board containing occupiedLocations() method returning iterator of occupied [column, row] cells */
  board: Board;
  /** Grid containing cells with terrain/placement constraints; values > 0 indicate warnings */
  notGood: ShipCellGrid;
  /** Validates placement against ship cell grid; returns true if valid */
  canPlace(grid: ShipCellGrid): boolean;
  /** Returns reason string describing why placement is invalid */
  cantPlaceReason(): string;
}

/**
 * Model interface representing game state.
 * Provides access to ship cell grid for placement validation and collision detection.
 */
export interface Model {
  /** Multi-bit grid storing ship cell occupancy; used for placement validation */
  shipCellGrid: ShipCellGrid;
  /** Array of Ship objects available in current game */
  ships: Array<Record<string, unknown>>;
  /** Initializes weapon systems on game board; optional map parameter */
  armWeapons(map?: object): void;
}

/**
 * Weapon object interface for drag operations and tray management.
 * Used during drag operations for weapon placement and ammo tracking.
 */
export interface Weapon {
  /** Weapon letter identifier (A, B, C, etc.) for display and tracking */
  letter: string;
  /** Tooltip text describing weapon attack effect and stats */
  tip: string;
  /** Current ammunition count; decremented on placement, incremented on removal */
  ammo: number;
}

/**
 * Placement constraints for a specific location on the board.
 * Indicates where ships can or cannot be placed.
 */
export interface PlacementConstraint {
  /** Grid cell row coordinate */
  row: number;
  /** Grid cell column coordinate */
  col: number;
  /** Constraint level (0=allowed, >0=warning, <0=forbidden) */
  level: number;
  /** Reason for constraint if applicable */
  reason?: string;
}
