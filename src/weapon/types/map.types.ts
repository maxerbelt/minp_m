/**
 * Map and terrain-related types
 * Interfaces for game map interaction and terrain validation
 */

import type { Coord } from './coordinates.types'

/**
 * Terrain validation function
 * Checks if a grid cell meets terrain criteria
 * Returns true if terrain matches the validation requirement
 */
export type TerrainCheck = (row: number, col: number) => boolean

/**
 * Game map interface
 * Minimal interface that weapons use to query map state
 * Allows for different map implementations without tight coupling
 */
export interface MapLike {
  /**
   * Check if coordinates are within map bounds
   */
  inBounds(row: number, col: number): boolean

  /**
   * Optional: Check if cell is land (for water-based weapons)
   */
  isLand?(row: number, col: number): boolean

  /**
   * Optional: Get random edge cell for projectile origin
   */
  randomEdge?(...target: number[]): Coord

  /**
   * Optional: Get terrain/substrate tag for styling
   */
  subTerrainTagFromCell?(cell: HTMLElement): string
}

/**
 * Terrain type identifier
 * String tag representing terrain type for explosion effects
 * Examples: 'sea', 'land', 'space', 'air'
 */
export type TerrainType = string

/**
 * Map bounds verification result
 */
export type BoundsCheckResult = {
  readonly inBounds: boolean
  readonly cell: Coord
}

/**
 * Terrain check combined with optional radius
 */
export type TerrainCheckWithRadius = {
  readonly check: TerrainCheck | null
  readonly radius?: number
}
