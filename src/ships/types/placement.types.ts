/**
 * @file placement.types.ts - Placement configuration and hit result types
 * @description Types for ship placement, hit tracking, and result reporting
 */

import type { CoordinatePair, CoordinateKey } from "./coordinates.types.js";
import type { Board, Mask } from "./geometry.types.js";
import type { Rack } from "./weapons.types.js";

/**
 * Placement configuration for a ship variant
 */
export interface Placement {
  readonly board: Board;
  readonly weapons?: Record<CoordinateKey, Rack>;
  readonly variant?: number;
}

/**
 * Individual hit record at a cell location
 */
export interface CellHitRecord {
  readonly key: CoordinateKey;
  readonly cell: CoordinatePair;
  readonly damaged: string;
}

/**
 * Result of a hit on the ship
 */
export interface HitResult {
  readonly letter: string;
  readonly info: string | null;
  readonly damaged: string | null;
  readonly list: CellHitRecord[];
  readonly misses: CellHitRecord[];
}

/**
 * Result of damage processing on the ship
 */
export interface DamageResult {
  readonly hits: CellHitRecord[];
  readonly misses: CellHitRecord[];
  readonly dtaps: number; // Double taps - cells already hit
}

/**
 * Result of magazine/ammo hit processing
 */
export interface MagazineHitResult {
  readonly damaged: string;
  readonly info: string | null;
  readonly hits: CellHitRecord[];
  readonly misses: CellHitRecord[];
}

/**
 * Hit coordinate with damage tracking
 */
export interface HitCoordinate {
  readonly row: number;
  readonly col: number;
  readonly damaged?: string;
}

/**
 * Placement validation result
 */
export interface PlacementValidation {
  readonly valid: boolean;
  readonly errors?: string[];
}

/**
 * Ship placement record for tracking on board
 */
export interface ShipPlacementRecord {
  readonly shipId: number;
  readonly letter: string;
  readonly placement: Placement;
  readonly placed: boolean;
  readonly sunk: boolean;
}
