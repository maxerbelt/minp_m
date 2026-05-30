/**
 * Area-of-effect (AOE) types for damage calculation
 * Handles damage pattern representation and queries
 */

import type { Coord } from './coordinates.types'

/**
 * An area-of-effect cell [row, column, power]
 * Represents a single cell affected by weapon damage with power level
 * @readonly
 */
export type AoeCell = readonly [row: number, col: number, power: number]

/**
 * Array of area-of-effect cells
 * Complete damage pattern for a weapon effect
 * @readonly
 */
export type AoePattern = readonly AoeCell[]

/**
 * Area-of-effect calculation result
 * Contains affected cells and optional metadata
 */
export type AoeResult = {
  readonly affectedArea: AoePattern
  readonly options?: Record<string, any>
}

/**
 * Splash effect configuration
 * Parameters for calculating secondary/splash damage
 */
export type SplashConfig = {
  readonly map: any
  readonly center: Coord
  readonly power: number
  readonly terrainCheck?: ((row: number, col: number) => boolean) | null
}

/**
 * Line-based AOE parameters
 * Configuration for line-of-sight damage calculations
 */
export type LineAoeConfig = {
  readonly coords: readonly Coord[]
  readonly power?: number
  readonly terrainFilter?: ((row: number, col: number) => boolean) | null
  readonly penetration?: number
}

/**
 * AOE calculation options
 * Extended parameters for advanced effect patterns
 */
export type AoeOptions = {
  readonly terrainCheck?: ((row: number, col: number) => boolean) | null
  readonly radius?: number
  readonly power?: number
  readonly filter?: (cell: AoeCell) => boolean
}
