/**
 * @module waters/helpers/types/domain
 * Game domain types for ships, weapons, displacement, and terrain.
 *
 * Shared data structures used across multiple helper modules:
 * - Ship and weapon definitions with game state
 * - Displacement calculations and terrain analysis
 * - Weapon systems with ammo tracking
 * - Terrain groupings and classifications
 */

/**
 * Represents a single weapon with identifier and cursor feedback.
 * Used in weapon racks and tally displays.
 */
export interface Weapon {
  /** Single character representing the weapon (e.g., 'B', 'L', 'T') */
  letter: string

  /** Whether the weapon has limited ammo capacity (vs unlimited) */
  isLimited: boolean

  /** CSS class name for styling weapon elements */
  classname: string

  /** Optional cursor style when weapon is active/launching */
  launchCursor?: string
}

/**
 * Weapon slot at a specific grid position on a ship.
 * Used to query armed weapons at ship cell coordinates.
 */
export interface WeaponSlot {
  /** The weapon object defining properties and behavior */
  weapon: Weapon

  /** Current ammo count available in this slot */
  ammo: number

  /** Unique identifier for this specific weapon slot */
  id: string | number
}

/**
 * Weapon system with full state tracking (ammo, damage, hit status).
 * Represents a complete weapon configuration on a ship.
 */
export interface WeaponSystem {
  /** The weapon object */
  weapon: Weapon

  /** Whether this weapon has hit a target this turn/round */
  hit: boolean

  /** Whether this weapon is damaged/non-functional */
  damaged: boolean

  /** Unique identifier for this weapon system */
  id: string | number

  /** Returns the maximum ammo capacity for this weapon */
  ammoCapacity(): number

  /** Returns the amount of ammo already used/fired */
  ammoUsed(): number

  /** Returns the count of unattached ammo rounds */
  ammoUnattached(): number

  /** Returns array of leaf weapons (for weapon hierarchies) */
  getLeafWeapons(): Weapon[]
}

/**
 * Represents a ship's shape with size and terrain properties.
 * Used in displacement calculations and terrain analysis.
 */
export interface ShipShape {
  /** Total displacement/area of this shape in grid cells */
  displacement: number

  /** The primary terrain type this shape occupies */
  subterrain: unknown // Terrain enum or type from terrains module

  /** Calculates displacement for a specific subterrain type */
  displacementFor(subterrain: unknown): number
}

/**
 * Core ship definition with properties and methods.
 * Used across display, placement, and tally modules.
 *
 * @remarks Multiple versions exist with slight variations
 * This is the comprehensive version combining all properties.
 */
export interface Ship {
  /** Unique identifier for this ship */
  id: string | number

  /** Single letter identifying this ship (A, B, C, etc.) */
  letter: string

  /** Variant/type indicator for ship appearance and behavior */
  variant: number

  /** Whether this ship has armed/active weapons */
  hasWeapon: boolean

  /** Whether this ship has been sunk */
  sunk?: boolean

  /**
   * Gets the shape and displacement characteristics of this ship.
   * Called during placement phase and displacement calculations.
   */
  shape(): ShipShape

  /**
   * Gets the weapon slot at a specific grid position on this ship.
   * Used during armed combat display to show weapons at coordinates.
   *
   * @param column - Column coordinate on ship's grid (0-based)
   * @param row - Row coordinate on ship's grid (0-based)
   * @returns WeaponSlot if weapon occupies this position, null/undefined otherwise
   */
  rackAt(column: number, row: number): WeaponSlot | null | undefined

  /**
   * Returns array of key identifiers for this ship's weapon effects.
   * Used for animation and area-of-effect calculations.
   */
  makeKeyIds(): string | string[]

  /**
   * Gets the primary/main weapon system for this ship.
   * Used as fallback when querying specific weapon slots.
   */
  getPrimaryWeapon(): Weapon | null | undefined

  /**
   * Gets the rotation/turn state at a grid position on this ship.
   * Returns orientation indicator or null if position is empty.
   *
   * @param row - Row coordinate on ship's grid (0-based)
   * @param column - Column coordinate on ship's grid (0-based)
   * @returns Orientation string (e.g., 'turn2', 'turn3') or null
   */
  getTurn(row: number, column: number): string | null | undefined
}

/**
 * Displacement threshold for categorizing board tightness.
 * Maps displacement ratios to human-readable descriptions.
 */
export interface DisplacementThreshold {
  /** Upper bound ratio for this density level (0.0-1.0) */
  limit: number

  /** Human-readable description (e.g., 'sparse', 'crowded', 'empty') */
  desc: string
}

/**
 * Terrain group classification with CSS styling.
 * Used to organize ships by their primary terrain type.
 */
export interface TerrainGroup {
  /** Single-character terrain identifier (S=Sea, G=Ground/Land, A=Air, X=Special) */
  id: string

  /** CSS class for styling terrain-grouped UI elements */
  class: string
}

/**
 * Tally counter for ship counts across terrains.
 * Used to balance tally display between columns.
 */
export interface TallyCount {
  /** Count of ships in sea/water terrain */
  s: number

  /** Count of ships in ground/land terrain */
  g: number
}

/**
 * Color mapping configuration for visual styling.
 * Maps ship/weapon letters to colors for UI rendering.
 */
export interface ColorMaps {
  /** Maps ship letter to background color for ship boxes */
  shipColors: Record<string, string>

  /** Maps ship letter to text color for ship boxes */
  shipLetterColors: Record<string, string>
}

/**
 * Weapon color maps for tally and display rendering.
 * Extended color configuration for weapon-specific styling.
 */
export interface WeaponMaps extends ColorMaps {
  // Inherits shipColors and shipLetterColors from ColorMaps
}
