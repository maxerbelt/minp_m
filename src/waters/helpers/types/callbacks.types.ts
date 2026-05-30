/**
 * @module waters/helpers/types/callbacks
 * Callback signatures and functional contracts used across helper modules.
 *
 * Defines callback types for:
 * - Grid and ship cell operations
 * - Weapon and displacement calculations
 * - UI element iteration and adaptation
 * - Navigation and movement direction handling
 */

import type {
  Weapon,
  WeaponSlot,
  ShipShape,
  Ship,
  WeaponSystem
} from './domain.types'

/**
 * Callback signature for getting a weapon slot at ship coordinates.
 * Called during cell display to determine if a weapon occupies this position.
 *
 * @param column - Column coordinate on ship's grid (0-based)
 * @param row - Row coordinate on ship's grid (0-based)
 * @returns WeaponSlot if weapon present, null or undefined otherwise
 */
export type RackAtCallback = (
  column: number,
  row: number
) => WeaponSlot | null | undefined

/**
 * Callback signature for getting cell rotation/orientation state.
 * Returns directional indicator for visual rotation display.
 *
 * @param row - Row coordinate on ship's grid (0-based)
 * @param column - Column coordinate on ship's grid (0-based)
 * @returns Orientation string (e.g., 'turn2', 'turn3', 'turn4') or null
 */
export type GetTurnCallback = (
  row: number,
  column: number
) => string | null | undefined

/**
 * Callback signature for generating key identifiers for weapon effects.
 * Used to identify affected cells in weapon area-of-effect calculations.
 *
 * @returns String or array of strings identifying affected cells
 */
export type MakeKeyIdsCallback = () => string | string[]

/**
 * Callback signature for retrieving the primary weapon system.
 * Returns the main/default weapon when no specific position is queried.
 *
 * @returns Weapon if found, null or undefined if ship has no primary weapon
 */
export type GetPrimaryWeaponCallback = () => Weapon | null | undefined

/**
 * Callback signature for calculating displacement for a subterrain.
 * Used to analyze ship placement distribution across terrain types.
 *
 * @param subterrain - The terrain type to calculate displacement for
 * @returns Displacement amount (area) for this terrain type
 */
export type DisplacementForCallback = (subterrain: unknown) => number

/**
 * Callback signature for getting a ship's shape.
 * Returns shape and displacement information used in board analysis.
 *
 * @returns ShipShape object with displacement and terrain properties
 */
export type ShapeCallback = () => ShipShape

/**
 * Callback signature for boundary checking on grid maps.
 * Validates if a coordinate is within valid grid bounds.
 *
 * @param row - Row coordinate to check
 * @param col - Column coordinate to check
 * @returns true if coordinate is in bounds, false otherwise
 */
export type InBoundsCallback = (row: number, col: number) => boolean

/**
 * Generic callback for processing cell coordinates.
 * Used in grid iteration and neighbor collection operations.
 *
 * @param row - Row coordinate
 * @param col - Column coordinate
 */
export type CellCallback = (row: number, col: number) => void

/**
 * Generic reducer callback for accumulating cell data.
 * Used in generic collection patterns for neighboring cells.
 *
 * @param collection - Accumulator collection being populated
 * @param row - Row coordinate of current cell
 * @param col - Column coordinate of current cell
 */
export type CellReducer = (
  collection: unknown,
  row: number,
  col: number
) => void

/**
 * Callback for zone size recalculation.
 * Called when map state changes and zone sizes need updating.
 *
 * @param map - Optional map object with current grid dimensions
 */
export type ZoneRecalcCallback = (map?: unknown) => void

/**
 * Callback for querying zone size metrics.
 * Returns calculated size information for display in UI.
 *
 * @returns Object with total, margin, core size properties
 */
export type ZoneSizesCallback = () => {
  total: number
  margin: number
  core: number
}
