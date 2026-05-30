/**
 * @file weapons.types.ts - Weapon system and rack type definitions
 * @description Types for weapon attachment, ammunition, and firing systems
 */

import type { CoordinateKey, CoordinatePair } from "./coordinates.types.js";
import type { WeaponSystemRef } from "./interfaces.types.js";
import type { ResetCallback, AmmoChecker, AnimationCallback } from "./callbacks.types.js";

/**
 * Flexible rack input format - accepts multiple representations
 * - Set<string>: Set of "r,c" coordinate string keys
 * - Array<string>: Array of "r,c" coordinate string keys  
 * - Array<Array<number>>: Array of [row, col] numeric pairs
 * - null: No racks available
 */
export type RackInput = Set<string> | Array<string | CoordinatePair> | null;

/**
 * Weapon system positioned at specific rack location
 */
export interface PositionedWeaponSystem extends WeaponSystemRef {
  readonly row: number;
  readonly col: number;
  readonly hit?: boolean;
  readonly damaged?: boolean;
  readonly ammo?: number;
  hasAmmo?(): boolean;
  ammoRemaining?(): number;
  ammoCapacity?(): number;
  animateDetonation?: AnimationCallback;
  reset?: ResetCallback;
}

/**
 * Rack - can be either WeaponSystem or positioned variant
 */
export type Rack = WeaponSystemRef | PositionedWeaponSystem;

/**
 * Weapons indexed by coordinate key ("r,c" format)
 */
export type WeaponMap = Record<CoordinateKey, WeaponSystemRef | Rack>;

/**
 * Entry pair for weapon iteration [coordinateKey, weaponSystem]
 */
export type WeaponEntry = [key: CoordinateKey, weapon: Rack];

/**
 * Weapon at specific board position
 */
export interface WeaponAtPosition extends WeaponSystemRef {
  readonly ammo?: number;
  readonly letter?: string;
  readonly hit?: boolean;
  readonly damaged?: boolean;
  readonly weapon?: any;
  ammoRemaining?(): number;
  ammoCapacity?(): number;
  animateDetonation?: AnimationCallback;
  reset?: ResetCallback;
}

/**
 * Weapon rack configuration mapping
 */
export interface RackConfiguration {
  readonly positions: CoordinatePair[];
  readonly count: number;
}
