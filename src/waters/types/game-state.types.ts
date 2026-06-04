/**
 * @module waters/types/game-state
 * Game state, results, and targeting resolution types.
 *
 * Defines types for:
 * - Weapon firing results and effects
 * - Target resolution and damage calculation
 * - Hit/miss detection results
 * - Ship placement state
 */

import type { Weapon,  Ship } from './domain.types'
 

/**
 * Result of a weapon firing action.
 * Returned by weapon launch methods to communicate game impact.
 */
export interface WeaponResult {
  /** Number of direct hits scored */
  hits: number

  /** Number of double-tap events (reshot same cell) */
  dtaps: number

  /** Number or letter of sunk ships */
  sunk: number | string

  /** Number of cells revealed (by scan/reveal weapons) */
  reveals: number

  /** Total number of shots fired (including multi-hit weapons) */
  shots: number

  /** Additional contextual information about the result */
  info: string
}

/**
 * Weapon selection state during targeting.
 * Tracks the player's current weapon selection and aim.
 */
export interface WeaponSelection {
  /** Launch row coordinate (null if not selected) */
  launchR: number | null

  /** Launch column coordinate (null if not selected) */
  launchC: number | null

  /** Weapon system ID (null if not selected) */
  weaponId: number | null

  /** Hint row coordinate (null if no hint) */
  hintR: number | null

  /** Hint column coordinate (null if no hint) */
  hintC: number | null
}

/**
 * Ship placement configuration snapshot.
 * Represents the complete fleet placement state for a player.
 */
export interface ShipPlacement {
  /** Array of placed ships with positions */
  ships: Ship[]

  /** 2D grid representation of ship cell occupancy */
  shipCellGrid: Array<any>

  /** Map title identifier for this placement */
  map: string
}

/**
 * Result of a weapon hit on the opponent's board.
 * Describes damage, affected cells, and ship impact.
 */
export interface HitResult {
  /** Ship letter identifier (e.g., 'A', 'S', 'M') */
  letter: string

  /** Human-readable hit information message */
  info: string

  /** Whether any ship cell was damaged by this hit */
  damaged: boolean

  /** List of hit cell coordinates [r, c] */
  list: Array<[number, number]>

  /** List of miss cell coordinates [r, c] */
  misses: Array<[number, number]>
}

/**
 * Context information for weapon target resolution.
 * Contains all parameters needed to resolve a weapon's effects.
 */
export interface TargetResolutionContext {
  /** The weapon being fired */
  weapon: Weapon

  /** Target row coordinate */
  r: number

  /** Target column coordinate */
  c: number

  /** Weapon power level (splash damage intensity) */
  power: number

  /** Additional firing context/options */
  options: Record<string, any>
}

/**
 * Result of normalizing weapon effect coordinates.
 * Validates and processes area-of-effect coordinate sets.
 */
export interface EffectNormalizationResult {
  /** Normalized [r, c, power] coordinate triples */
  normalized: Array<[number, number, number]>

  /** Whether the effect format was valid */
  isValid: boolean

  /** Filtered entries with exactly 3+ elements */
  filtered: Array<Array<number>>
}

/**
 * Bitmask object reference for board region operations.
 * Used in morphological operations and area calculations.
 */
export interface Mask {
  /** Number of occupied cells */
  occupancy: number

  /** Test if cell is set */
  test(x: number, y: number): boolean

  /** Set cell in mask */
  set(x: number, y: number): void

  /** Union with another mask */
  join(other: Mask): Mask

  /** Get intersection with another mask */
  take(other: Mask): Mask

  /** Clone this mask */
  clone(): Mask

  /** Dilate by n cells */
  dilate(n: number): Mask

  /** Dilate in orthogonal cross pattern */
  dilateCross(n: number): Mask

  /** Convert to coordinate array */
  toCoords(): Array<[number, number]>
}

/**
 * Map information with grid dimensions and terrain.
 * Provides spatial query methods for board operations.
 */
export interface MapInfo {
  /** Number of rows in the grid */
  rows: number

  /** Number of columns in the grid */
  cols: number

  /** Full playable area mask */
  fullMask: Mask

  /** Blank/empty mask */
  blankMask: Mask

  /** Check if coordinates are within bounds */
  inBounds(r: number, c: number): boolean
}

/**
 * Scope for autonomous AI seeking behavior.
 * Maintains state during the seeking/targeting loop.
 */
export interface SeekLoopContext {
  /** Whether to continue seeking */
  continue: boolean

  /** Locations not yet attempted */
  untried: Mask

  /** Current game score tracking */
  score: any // Score type - circular ref
}

/**
 * Configuration constants for weapon effect calculations.
 * Defines impact levels and attempt thresholds for seeking algorithms.
 */
export interface EffectConstantsConfig {
  /** Minimum impact level for bomb search */
  IMPACT_MIN: number

  /** Starting impact level for bomb search */
  IMPACT_START: number

  /** Attempts per impact level in bomb search */
  BOMB_ATTEMPTS: number

  /** Maximum search attempts overall */
  SEEK_MAX_ATTEMPTS: number

  /** Delay between seek steps in milliseconds */
  SEEK_DELAY_MS: number
}
